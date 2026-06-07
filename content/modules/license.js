// ═══════════════════════════════════════════════════════════════
// NODUS - License Module v1.0.0
// Sistema de licenciamento FREE/PRO
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// SAFE FALLBACK — usado quando o servidor está inacessível.
// FAIL-CLOSED: na ausência de capabilities frescas, tratamos como FREE
// com features mínimas. Gates específicos (export, queue) ficam off.
// Lista de features permitidas é deliberadamente conservadora — server
// é a única fonte de verdade pra dizer o que está liberado.
// ═══════════════════════════════════════════════════════════════
const SAFE_FALLBACK_CAPABILITIES = Object.freeze({
  plan: 'free',
  features: Object.freeze(['save', 'queue_default', 'queue_quick', 'export_txt']),
  limits: Object.freeze({
    maxQueues: 3,
    maxChains: null,
    maxNodesPerChain: null,
    maxProjects: 3,
    exportFormats: ['txt'],
    hasFullChatCapture: true,
    hasEncryptedBackup: false
  }),
  issued_at: 0,
  ttl_seconds: 0,
  _fallback: true
});

const NodusLicense = {
  // ═══════════════════════════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════════════════════════

  license: {
    status: 'free',          // 'free' | 'pro'  (derivado de capabilities.plan)
    plan: null,              // 'monthly' | 'yearly' | null
    expiresAt: null,         // timestamp ou null
    renewsAt: null,          // timestamp ou null
    email: null,             // email do usuário PRO
    licenseKey: null,        // chave de licença
    activatedAt: null,       // quando foi ativado
    deviceFingerprint: null  // fingerprint único do device
  },

  // Capabilities = blob server-authoritative {plan, features, limits, ttl_seconds, issued_at}
  // Carregado do chrome.storage por loadCapabilities(); fetch real é feito pelo background.
  // Cliente NUNCA inventa esse blob — só lê.
  capabilities: null,


  // ═══════════════════════════════════════════════════════════════
  // DEVICE FINGERPRINT
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Gera fingerprint único do device
   */
  async generateDeviceFingerprint() {
    try {
      // Coletar dados do device
      const data = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: navigator.deviceMemory || 0
      };
      
      // Gerar hash SHA-256
      const encoder = new TextEncoder();
      const dataStr = JSON.stringify(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataStr));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('[License] 🔐 Device fingerprint:', fingerprint.substring(0, 16) + '...');
      return fingerprint;
    } catch (e) {
      console.error('[License] Error generating fingerprint:', e);
      // Fallback: gerar UUID aleatório
      return crypto.randomUUID();
    }
  },
  
  // ═══════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO
  // ═══════════════════════════════════════════════════════════════
  
  async init() {
    console.log('[License] Inicializando...');
    await this.loadLicense();
    await this.loadCapabilities();

    // ATENÇÃO: o atalho `_devLicense: true` no manifest foi REMOVIDO.
    // Plano PRO local em dev é concedido pelo SERVIDOR (local-server)
    // quando rodando com env LOCAL_DEV_GRANT_PRO=1. Assim, o código
    // público da extensão não embute mais nenhum bypass de licença.

    // Gerar/verificar fingerprint do device
    if (!this.license.deviceFingerprint) {
      this.license.deviceFingerprint = await this.generateDeviceFingerprint();
      await this.saveLicense();
      console.log('[License] 🆕 New device fingerprint saved');
    }

    // Iniciar heartbeat se PRO (derivado de capabilities)
    if (this.isPro()) {
      this.startHeartbeat();
    }

    console.log('[License] Status:', this.isPro() ? 'pro' : 'free', this.capabilities?._fallback ? '(fallback — server unreachable)' : '');
    return this.license;
  },

  /**
   * Carrega capabilities do storage (populado pelo background).
   * Se o blob estiver ausente OU expirado (ttl excedido), usa fallback FREE seguro.
   */
  async loadCapabilities() {
    try {
      const data = await chrome.storage.local.get('nodus_capabilities');
      const blob = data && data.nodus_capabilities;
      if (this._isCapabilitiesValid(blob)) {
        this.capabilities = blob;
        // Reflete plano em this.license (legacy compat)
        this.license.status = blob.plan === 'pro' ? 'pro' : 'free';
        return;
      }
      // Sem blob fresco: fail-closed em FREE.
      console.log('[License] ⚠️ capabilities ausentes/expiradas — usando fallback FREE seguro');
      this.capabilities = SAFE_FALLBACK_CAPABILITIES;
      this.license.status = 'free';
    } catch (e) {
      console.error('[License] erro lendo capabilities:', e);
      this.capabilities = SAFE_FALLBACK_CAPABILITIES;
      this.license.status = 'free';
    }
  },

  /**
   * Verifica formato + frescor do blob de capabilities.
   * TTL é checado contra issued_at. ttl_seconds=0 ou ausente é tratado como inválido.
   */
  _isCapabilitiesValid(blob) {
    if (!blob || typeof blob !== 'object') return false;
    if (typeof blob.plan !== 'string') return false;
    if (!Array.isArray(blob.features)) return false;
    if (!blob.limits || typeof blob.limits !== 'object') return false;
    if (typeof blob.issued_at !== 'number' || typeof blob.ttl_seconds !== 'number') return false;
    if (blob.ttl_seconds <= 0) return false;
    const ageSec = (Date.now() - blob.issued_at) / 1000;
    if (ageSec > blob.ttl_seconds) return false;
    return true;
  },

  /**
   * Recarrega capabilities (chamado quando background notifica via message).
   */
  async refreshCapabilities() {
    await this.loadCapabilities();
    // Re-emit para a UI atualizar
    window.dispatchEvent(new CustomEvent('nodus-license-changed', {
      detail: { status: this.isPro() ? 'pro' : 'free', license: this.license }
    }));
  },
  
  // ═══════════════════════════════════════════════════════════════
  // HEARTBEAT - Validação periódica
  // ═══════════════════════════════════════════════════════════════
  
  heartbeatInterval: null,
  
  /**
   * Inicia heartbeat (30 segundos para PRO)
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      console.log('[License] ⚠️ Heartbeat already running');
      return;
    }
    
    console.log('[License] ❤️ Starting heartbeat (30s interval)');
    
    this.heartbeatInterval = setInterval(async () => {
      await this.validateWithServer();
    }, 5 * 60 * 1000); // 5 minutos

    // Primeira validação após 30 segundos (dar tempo para sincronizar)
    setTimeout(() => {
      this.validateWithServer();
    }, 30000);
  },
  
  /**
   * Para heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('[License] 💔 Heartbeat stopped');
    }
  },
  
  /**
   * Valida licença com servidor
   */
  async validateWithServer() {
    if (this.license.status !== 'pro') {
      this.stopHeartbeat();
      return;
    }

    // Skip server validation for local/test licenses (email @nodus.local)
    if (this.license.email?.endsWith('@nodus.local')) {
      console.log('[License] ❤️ Heartbeat: ✅ Local test license — skipping server validation');
      return;
    }

    try {
      const WORKER_URL = 'https://nodus-worker.mmcarvalho-dev.workers.dev';
      const params = new URLSearchParams({
        email: this.license.email,
        fingerprint: this.license.deviceFingerprint
      });
      
      const response = await fetch(`${WORKER_URL}/auth/status?${params}`);
      const data = await response.json();
      
      console.log('[License] ❤️ Heartbeat:', data.pro ? '✅ Active' : '❌ Inactive');
      
      // Se não está mais PRO, desativar
      if (!data.pro) {
        console.warn('[License] ⚠️ License invalid - reverting to FREE');
        await this.setFree();
        this.stopHeartbeat();
        
        // Notificar usuário
        if (typeof chrome !== 'undefined' && chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/nodus-128.png'),
            title: 'NODUS License Deactivated',
            message: data.error || 'Your license is no longer active on this device.'
          });
        }
      }
    } catch (error) {
      console.error('[License] Heartbeat error:', error);
    }
  },
  
  async loadLicense() {
    try {
      const data = await chrome.storage.local.get('nodus_license');
      if (data.nodus_license) {
        this.license = { ...this.license, ...data.nodus_license };
        
        // Converter datas de string para timestamp se necessário
        if (this.license.expiresAt && typeof this.license.expiresAt === 'string') {
          this.license.expiresAt = new Date(this.license.expiresAt).getTime();
        }
        if (this.license.renewsAt && typeof this.license.renewsAt === 'string') {
          this.license.renewsAt = new Date(this.license.renewsAt).getTime();
        }
        
        // Verificar se expirou (mas NÃO apagar dados)
        if (this.license.expiresAt && Date.now() > this.license.expiresAt) {
          console.log('[License] ⚠️ License expired - keeping data but changing status to FREE');
          console.log('[License] 📅 Current time:', new Date(Date.now()).toISOString());
          console.log('[License] 📅 Expires at:', new Date(this.license.expiresAt).toISOString());
          // Manter email, plan, datas - só mudar status
          this.license.status = 'free';
          await this.saveLicense();
        } else if (this.license.expiresAt) {
          console.log('[License] ✅ License valid until:', new Date(this.license.expiresAt).toISOString());
        }
      }
    } catch (e) {
      console.error('[License] Erro ao carregar:', e);
    }
  },
  
  async saveLicense() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ nodus_license: this.license }, () => {
        if (chrome.runtime.lastError) {
          console.error('[License] Erro ao salvar:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        console.log('[License] License saved');
        resolve();
      });
    });
  },
  
  // ═══════════════════════════════════════════════════════════════
  // VERIFICAÇÕES
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Capabilities sempre garantido (fallback se ainda não carregou).
   * Internal — não exponha o objeto bruto.
   */
  _caps() {
    return this.capabilities || SAFE_FALLBACK_CAPABILITIES;
  },

  /**
   * Verifica se usuário é PRO. Fonte: capabilities.plan (server-authoritative).
   * Mesmo que `this.license.status === 'pro'` localmente, se o blob expirou
   * sem renovação ou plano voltou pra free no server, retorna false.
   */
  isPro() {
    return this._caps().plan === 'pro';
  },

  /**
   * Verifica se usuário já teve/tem licença PRO (mesmo se expirada).
   * Usado pra UI mostrar "License expired on [data]" ao invés de "Upgrade now".
   */
  hasLicenseHistory() {
    return !!(this.license.email || this.license.expiresAt);
  },

  isFree() {
    return !this.isPro();
  },

  /**
   * Verifica se uma feature está disponível. featureId vem da lista
   * canônica que o servidor controla — código público não enumera mais.
   *
   * Convenções: feature flags são granulares ('queue_q2', 'export_html',
   * 'encrypted_backup') e checadas pelo nome no array do server.
   */
  hasFeature(featureId) {
    if (!featureId || typeof featureId !== 'string') return false;
    const list = this._caps().features;
    return Array.isArray(list) && list.includes(featureId);
  },

  /**
   * Verifica se pode criar mais chains. Limit vem do server.
   */
  canCreateChain(currentCount) {
    const limit = this._caps().limits?.maxChains;
    if (limit === null || limit === undefined) return true;
    return currentCount < limit;
  },

  /**
   * Verifica se pode usar uma fila. A lista de filas PRO-only não está mais
   * hardcoded aqui — derivamos das feature flags ('queue_q2', 'queue_q3', 'queue_q4').
   * Filas básicas (default, quick, q1) são checadas pela feature equivalente.
   */
  canUseQueue(queueKey) {
    if (!queueKey) return false;
    // Mapping de chave de storage pra feature flag
    const featureForQueue = {
      'ideas_queue':         'queue_default',
      'ideas_queue_quick':   'queue_quick',
      'ideas_queue_custom1': 'queue_q1',
      'ideas_queue_custom2': 'queue_q2',
      'ideas_queue_custom3': 'queue_q3',
      'ideas_queue_custom4': 'queue_q4'
    };
    const feature = featureForQueue[queueKey];
    if (!feature) return true; // chaves desconhecidas (custom user-defined) não bloqueia
    return this.hasFeature(feature);
  },

  /**
   * Verifica formato de export. Lista vem do server (limits.exportFormats).
   */
  canExportFormat(format) {
    if (!format) return false;
    const allowed = this._caps().limits?.exportFormats || [];
    return allowed.includes(String(format).toLowerCase());
  },

  /**
   * Retorna os limits atuais (do blob server). Read-only — código que muta
   * isso quebra a invariante "server é fonte de verdade".
   */
  getLimits() {
    return this._caps().limits;
  },
  
  /**
   * Retorna dias restantes da licença PRO
   */
  getDaysRemaining() {
    if (!this.isPro() || !this.license.expiresAt) return 0;
    const remaining = this.license.expiresAt - Date.now();
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
  },
  
  // ═══════════════════════════════════════════════════════════════
  // ATIVAÇÃO / DESATIVAÇÃO
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Ativa licença PRO
   */
  async activatePro(licenseData) {
    const { email, licenseKey, plan, expiresAt, renewsAt } = licenseData;
    
    this.license = {
      status: 'pro',
      plan: plan || 'monthly',
      expiresAt: expiresAt || null,
      renewsAt: renewsAt || null,
      email: email || null,
      licenseKey: licenseKey || null,
      activatedAt: Date.now()
    };
    
    await this.saveLicense();
    console.log('[License] PRO ativado!', this.license);
    
    // Iniciar heartbeat
    this.startHeartbeat();
    
    // Disparar evento para atualizar UI local
    window.dispatchEvent(new CustomEvent('nodus-license-changed', { 
      detail: { status: 'pro', license: this.license }
    }));
    
    // ✅ Notificar background para propagar para outras tabs
    try {
      await chrome.runtime.sendMessage({
        action: 'LICENSE_CHANGED',
        status: 'pro'
      });
      console.log('[License] Notificação enviada para outras tabs');
    } catch (e) {
      console.log('[License] Erro ao notificar background:', e);
    }
    
    return true;
  },
  
  /**
   * Reverte para FREE (mas mantém dados de conta)
   */
  async setFree() {
    // Parar heartbeat
    this.stopHeartbeat();
    
    // Manter email e dados de expiração, apenas mudar status
    this.license.status = 'free';
    // Não apagar: email, expiresAt, activatedAt
    // Isso permite mostrar "License expired on [data]" na UI
    
    await this.saveLicense();
    console.log('[License] Revertido para FREE (mantendo dados da conta)');
    
    // Disparar evento local
    window.dispatchEvent(new CustomEvent('nodus-license-changed', { 
      detail: { status: 'free', license: this.license }
    }));
    
    // ✅ Notificar background para propagar para outras tabs
    try {
      await chrome.runtime.sendMessage({
        action: 'LICENSE_CHANGED',
        status: 'free'
      });
      console.log('[License] Notificação enviada para outras tabs');
    } catch (e) {
      console.log('[License] Erro ao notificar background:', e);
    }
    
    // 🔄 Reload página para remover features PRO
    if (window.NodusUI?.showToast) {
      window.NodusUI.showToast('📋 Reverted to FREE. Reloading...', 'info');
    }
    
    setTimeout(() => {
      location.reload();
    }, 1000);
    
    return true;
  },
  
  /**
   * Valida email via Cloudflare Worker (consulta KV do Lemon Squeezy)
   */
  async validateByEmail(email, token = null) {
    const WORKER_URL = 'https://nodus-worker.mmcarvalho-dev.workers.dev/auth/status';
    
    console.log('[License] 🔍 Iniciando validação...');

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        valid: false,
        error: 'Invalid email format'
      };
    }

    // Gerar fingerprint do device
    const deviceFingerprint = await this.generateDeviceFingerprint();

    // Enviar credenciais via POST (body JSON, nunca em URL/query string)
    const payload = { email: email.toLowerCase(), fingerprint: deviceFingerprint };
    if (token) payload.token = token;

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('[License] 📊 Status:', response.status);

      const data = await response.json();

      // Verificar se precisa de token (device change) — pode vir com status 200
      if (data.requiresToken) {
        console.log('[License] 🔑 Token required for device change');
        return {
          valid: false,
          requiresToken: true,
          error: data.error || 'Device change detected. Please enter your license key.'
        };
      }

      if (!response.ok) {
        console.log('[License] ❌ Response not OK');
        return {
          valid: false,
          error: data.error || 'Failed to validate email'
        };
      }

      // Se usuário não está no sistema ou é free
      if (!data.pro) {
        console.log('[License] ⚠️ User não é PRO');
        return {
          valid: false,
          error: data.error || 'No active PRO subscription found for this email'
        };
      }

      // Calcular timestamp de expiração e renovação
      let expiresAt = null;
      let renewsAt = null;
      
      if (data.expiresAt) {
        expiresAt = new Date(data.expiresAt).getTime();
      }
      
      if (data.renewsAt) {
        renewsAt = new Date(data.renewsAt).getTime();
      }

      console.log('[License] 🎉 Validação bem-sucedida!');
      
      const result = {
        valid: true,
        plan: data.plan || 'pro',
        expiresAt: expiresAt,
        renewsAt: renewsAt,
        email: data.email,
        status: data.status
      };
      
      console.log('[License] 📦 Retornando resultado:', result);
      return result;

    } catch (error) {
      console.error('[License] ❌ ERRO NO CATCH:', error);
      console.error('[License] ❌ Error name:', error.name);
      console.error('[License] ❌ Error message:', error.message);
      console.error('[License] ❌ Error stack:', error.stack);
      return { 
        valid: false, 
        error: 'Failed to validate email. Please check your internet connection.' 
      };
    }
  },
  
  // ═══════════════════════════════════════════════════════════════
  // PAYWALL UI
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Mostra modal de paywall
   */
  showPaywall(featureId, options = {}) {
    console.log('[License] Mostrando paywall para:', featureId);
    
    // Traduções
    const _t = (key) => {
      const texts = {
        'paywall.title': {
          pt: 'Recurso PRO',
          en: 'PRO Feature',
          es: 'Función PRO'
        },
        'paywall.subtitle': {
          pt: 'Faça upgrade para desbloquear',
          en: 'Upgrade to unlock',
          es: 'Mejora para desbloquear'
        },
        'paywall.feature.export_html': {
          pt: 'Exportar em HTML',
          en: 'Export to HTML',
          es: 'Exportar a HTML'
        },
        'paywall.feature.export_docx': {
          pt: 'Exportar em DOCX',
          en: 'Export to DOCX',
          es: 'Exportar a DOCX'
        },
        'paywall.feature.unlimited_chains': {
          pt: 'Chains Ilimitadas',
          en: 'Unlimited Chains',
          es: 'Chains Ilimitadas'
        },
        'paywall.feature.queue_q2': {
          pt: 'Fila Q2',
          en: 'Queue Q2',
          es: 'Cola Q2'
        },
        'paywall.feature.full_chat_capture': {
          pt: 'Captura de Chat Completo',
          en: 'Full Chat Capture',
          es: 'Captura de Chat Completo'
        },
        'paywall.feature.encrypted_backup': {
          pt: 'Backup Criptografado',
          en: 'Encrypted Backup',
          es: 'Backup Encriptado'
        },
        'paywall.benefits': {
          pt: 'Benefícios PRO',
          en: 'PRO Benefits',
          es: 'Beneficios PRO'
        },
        'paywall.benefit1': {
          pt: '6 filas de armazenamento',
          en: '6 storage queues',
          es: '6 colas de almacenamiento'
        },
        'paywall.benefit2': {
          pt: 'Chains ilimitadas',
          en: 'Unlimited chains',
          es: 'Chains ilimitadas'
        },
        'paywall.benefit3': {
          pt: 'Export HTML e DOCX',
          en: 'HTML and DOCX export',
          es: 'Exportación HTML y DOCX'
        },
        'paywall.benefit4': {
          pt: 'Backup criptografado',
          en: 'Encrypted backup',
          es: 'Backup encriptado'
        },
        'paywall.price.monthly': {
          pt: '$4.50/mês',
          en: '$4.50/month',
          es: '$4.50/mes'
        },
        'paywall.price.yearly': {
          pt: '$30/ano (economize 44%)',
          en: '$30/year (save 44%)',
          es: '$30/año (ahorra 44%)'
        },
        'paywall.btn.upgrade': {
          pt: 'Fazer Upgrade',
          en: 'Upgrade Now',
          es: 'Mejorar Ahora'
        },
        'paywall.btn.activate': {
          pt: 'Já tenho uma chave',
          en: 'I have a key',
          es: 'Ya tengo una clave'
        },
        'paywall.btn.later': {
          pt: 'Depois',
          en: 'Later',
          es: 'Después'
        }
      };
      
      const lang = window.NodusI18n?.currentLang || 'pt';
      return texts[key]?.[lang] || texts[key]?.['pt'] || key;
    };
    
    // Remover modal existente
    const existing = document.getElementById('nodus-paywall-modal');
    if (existing) existing.remove();
    
    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'nodus-paywall-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1f29 0%, #0f172a 100%);
        border: 2px solid #f59e0b;
        border-radius: 16px;
        padding: 32px;
        max-width: 420px;
        width: 90%;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      ">
        <!-- Header -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">👑</div>
          <h2 style="color: #f59e0b; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
            ${_t('paywall.title')}
          </h2>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">
            ${_t('paywall.subtitle')}
          </p>
        </div>
        
        <!-- Feature bloqueada -->
        <div style="
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 24px;
        ">
          <span style="color: #f59e0b; font-weight: 600;">
            🔒 ${_t('paywall.feature.' + featureId) || featureId}
          </span>
        </div>
        
        <!-- Benefícios -->
        <div style="
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: left;
        ">
          <div style="color: #10b981; font-weight: 600; margin-bottom: 12px; font-size: 13px;">
            ✨ ${_t('paywall.benefits')}
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #e2e8f0;">
            <div>✅ ${_t('paywall.benefit1')}</div>
            <div>✅ ${_t('paywall.benefit2')}</div>
            <div>✅ ${_t('paywall.benefit3')}</div>
            <div>✅ ${_t('paywall.benefit4')}</div>
          </div>
        </div>
        
        <!-- Preços -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
          <div style="
            flex: 1;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            padding: 12px;
          ">
            <div style="color: #60a5fa; font-size: 18px; font-weight: 700;">${_t('paywall.price.monthly')}</div>
          </div>
          <div style="
            flex: 1;
            background: rgba(34, 197, 94, 0.15);
            border: 2px solid rgba(34, 197, 94, 0.5);
            border-radius: 8px;
            padding: 12px;
            position: relative;
          ">
            <div style="
              position: absolute;
              top: -8px;
              right: 8px;
              background: #10b981;
              color: white;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 4px;
              font-weight: 600;
            ">BEST</div>
            <div style="color: #10b981; font-size: 18px; font-weight: 700;">${_t('paywall.price.yearly')}</div>
          </div>
        </div>
        
        <!-- Botões -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button id="paywall-upgrade-btn" style="
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
          ">
            👑 ${_t('paywall.btn.upgrade')}
          </button>
          <button id="paywall-activate-btn" style="
            width: 100%;
            padding: 12px;
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            color: #60a5fa;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">
            🔑 ${_t('paywall.btn.activate')}
          </button>
          <button id="paywall-close-btn" style="
            width: 100%;
            padding: 10px;
            background: transparent;
            border: none;
            color: #64748b;
            font-size: 13px;
            cursor: pointer;
          ">
            ${_t('paywall.btn.later')}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('#paywall-close-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    modal.querySelector('#paywall-upgrade-btn').addEventListener('click', () => {
      // TODO: Redirecionar para página de compra (LemonSqueezy)
      window.open('https://nodus.app/pro', '_blank');
    });
    
    modal.querySelector('#paywall-activate-btn').addEventListener('click', () => {
      modal.remove();
      this.showActivationModal();
    });
  },
  
  /**
   * Mostra modal de ativação de chave
   */
  showActivationModal() {
    const _t = (key) => {
      const texts = {
        'activate.title': { pt: 'Ativar Licença PRO', en: 'Activate PRO License', es: 'Activar Licencia PRO' },
        'activate.placeholder': { pt: 'NODUS-XXXX-XXXX-XXXX', en: 'NODUS-XXXX-XXXX-XXXX', es: 'NODUS-XXXX-XXXX-XXXX' },
        'activate.btn': { pt: 'Ativar', en: 'Activate', es: 'Activar' },
        'activate.cancel': { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
        'activate.success': { pt: 'Licença ativada com sucesso!', en: 'License activated successfully!', es: '¡Licencia activada con éxito!' },
        'activate.error': { pt: 'Chave inválida ou expirada', en: 'Invalid or expired key', es: 'Clave inválida o expirada' },
        // Erros do Worker
        'error.expired': { pt: 'Licença expirada', en: 'License expired', es: 'Licencia caducada' },
        'error.notfound': { pt: 'Nenhuma assinatura PRO ativa encontrada', en: 'No active PRO subscription found', es: 'No se encontró suscripción PRO activa' },
        'error.token_required': { pt: 'Troca de dispositivo detectada. Insira sua chave de licença.', en: 'Device change detected. Please enter your license key.', es: 'Cambio de dispositivo detectado. Ingrese su clave de licencia.' },
        'error.invalid_token': { pt: 'Token de ativação inválido', en: 'Invalid activation token', es: 'Token de activación inválido' },
        'error.email_required': { pt: 'Por favor, insira seu email', en: 'Please enter your email address', es: 'Por favor ingrese su correo electrónico' },
        'error.token_field_required': { pt: 'Por favor, insira sua chave de licença', en: 'Please enter your license key', es: 'Por favor ingrese su clave de licencia' },
        'error.save_failed': { pt: 'Falha ao salvar licença. Tente novamente.', en: 'Failed to save license. Please try again.', es: 'Error al guardar licencia. Inténtelo de nuevo.' },
        'error.validation_failed': { pt: 'Falha ao validar email', en: 'Failed to validate email', es: 'Error al validar correo electrónico' }
      };
      const lang = window.NodusI18n?.currentLang || 'pt';
      return texts[key]?.[lang] || texts[key]?.['pt'] || key;
    };
    
    // Traduzir erros do Worker
    const translateWorkerError = (error) => {
      if (!error) return _t('error.validation_failed');
      
      if (error.includes('expired')) return _t('error.expired');
      if (error.includes('not found')) return _t('error.notfound');
      if (error.includes('Token required')) return _t('error.token_required');
      if (error.includes('Invalid')) return _t('error.invalid_token');
      
      // Se não encontrou tradução específica, retorna o erro original
      return error;
    };
    
    const modal = document.createElement('div');
    modal.id = 'nodus-activation-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1f29 0%, #0f172a 100%);
        border: 2px solid #3b82f6;
        border-radius: 16px;
        padding: 32px;
        max-width: 420px;
        width: 90%;
        text-align: center;
      ">
        <div style="font-size: 36px; margin-bottom: 16px;">✉️</div>
        <h2 style="color: #60a5fa; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">
          Activate NODUS PRO
        </h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
          Enter the email address you used when purchasing NODUS PRO
        </p>
        
        <input type="email" id="email-input" placeholder="your@email.com" style="
          width: 100%;
          padding: 14px;
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 15px;
          text-align: center;
          margin-bottom: 8px;
          box-sizing: border-box;
        ">
        
        <div id="token-container" style="display: none; margin-top: 12px;">
          <p style="color: #fbbf24; font-size: 12px; margin: 0 0 8px 0; font-weight: 600;">
            ⚠️ Device change detected - License Key required
          </p>
          <input type="text" id="token-input" placeholder="NODUS-XXXX-XXXX-XXXX" style="
            width: 100%;
            padding: 14px;
            background: #1e293b;
            border: 2px solid #fbbf24;
            border-radius: 8px;
            color: #e2e8f0;
            font-size: 14px;
            text-align: center;
            font-family: monospace;
            box-sizing: border-box;
            text-transform: uppercase;
          ">
          <p style="color: #94a3b8; font-size: 11px; margin: 6px 0 0 0;">
            Check your purchase confirmation email
          </p>
        </div>
        
        <div id="activation-error" style="
          color: #ef4444;
          font-size: 13px;
          margin-bottom: 16px;
          display: none;
        "></div>
        
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <button id="activation-cancel-btn" style="
            flex: 1;
            padding: 12px;
            background: rgba(100, 116, 139, 0.2);
            border: 1px solid rgba(100, 116, 139, 0.3);
            border-radius: 8px;
            color: #94a3b8;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          ">
            Cancel
          </button>
          <button id="activation-submit-btn" style="
            flex: 1;
            padding: 12px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          ">
            Activate
          </button>
        </div>
        
        <div style="
          padding-top: 20px;
          border-top: 1px solid rgba(100, 116, 139, 0.2);
        ">
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 12px 0;">
            Don't have NODUS PRO yet?
          </p>
          <button id="buy-pro-btn" style="
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            border: none;
            border-radius: 8px;
            color: #1a1f29;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          ">
            💳 Buy NODUS PRO
          </button>
          <p style="color: #64748b; font-size: 11px; margin: 8px 0 0 0;">
            $4.50/month or $30/year
          </p>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = modal.querySelector('#email-input');
    const errorDiv = modal.querySelector('#activation-error');
    
    modal.querySelector('#activation-cancel-btn').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#activation-submit-btn').addEventListener('click', async () => {
      const email = input.value.trim().toLowerCase();
      const tokenInput = modal.querySelector('#token-input');
      const token = tokenInput?.value?.trim()?.toUpperCase() || null;
      const tokenContainer = modal.querySelector('#token-container');
      
      if (!email) {
        errorDiv.textContent = _t('error.email_required');
        errorDiv.style.display = 'block';
        return;
      }
      
      // Se token container está visível mas token vazio
      if (tokenContainer.style.display !== 'none' && !token) {
        errorDiv.textContent = _t('error.token_field_required');
        errorDiv.style.display = 'block';
        return;
      }
      
      // Mostrar loading
      const submitBtn = modal.querySelector('#activation-submit-btn');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Validating...';
      submitBtn.disabled = true;
      
      const result = await this.validateByEmail(email, token);
      
      // Se precisa de token mas ainda não mostrou o campo
      if (result.requiresToken && tokenContainer.style.display === 'none') {
        console.log('[License] 🔑 Token required - showing token field');
        tokenContainer.style.display = 'block';
        errorDiv.textContent = translateWorkerError(result.error);
        errorDiv.style.display = 'block';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        tokenInput.focus();
        return;
      }
      
      if (result.valid) {
        console.log('[License] ✅ Validação OK, ativando PRO...');
        
        await this.activatePro({
          email: result.email,
          plan: result.plan,
          expiresAt: result.expiresAt,
          renewsAt: result.renewsAt,
          status: result.status
        });
        
        console.log('[License] ✅ activatePro() completo');
        
        // Verificar se realmente salvou
        const verify = await chrome.storage.local.get('nodus_license');
        console.log('[License] 🔍 Verificação final:', verify.nodus_license);
        
        if (!verify.nodus_license || verify.nodus_license.status !== 'pro') {
          console.error('[License] ❌ ERRO: License não foi salva corretamente!');
          errorDiv.textContent = _t('error.save_failed');
          errorDiv.style.display = 'block';
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          return;
        }
        
        modal.remove();
        
        if (window.NodusUI?.showToast) {
          window.NodusUI.showToast('👑 PRO activated! Reloading...', 'success');
        }
        
        // 🔄 Reload página para aplicar mudanças
        console.log('[License] 🔄 Reloading em 2 segundos...');
        setTimeout(() => {
          location.reload();
        }, 2000);
      } else {
        errorDiv.textContent = translateWorkerError(result.error);
        errorDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
    
    // Botão de compra
    modal.querySelector('#buy-pro-btn').addEventListener('click', () => {
      window.open('https://nodus.lemonsqueezy.com/checkout/buy/ac91806f-faea-41f2-aaba-fedb68d78cbb', '_blank');
    });
    
    // Enter para submeter
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        modal.querySelector('#activation-submit-btn').click();
      }
    });
    
    input.focus();
  }
};

// Expor globalmente
window.NodusLicense = NodusLicense;

// Inicializar automaticamente (aguardar carregamento do storage)
(async () => {
  await NodusLicense.init();
  console.log('[License] ✅ Inicialização completa');

  // Notificar dashboard para atualizar badge após license carregar do storage
  window.dispatchEvent(new CustomEvent('nodus-license-changed', {
    detail: { status: NodusLicense.license.status, license: NodusLicense.license }
  }));
})();

// ✅ Listener para receber atualização de licença de outras tabs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Aceitar tanto LICENSE_UPDATED quanto LICENSE_CHANGED (compatibilidade)
  if (message.type === 'LICENSE_UPDATED' || message.action === 'LICENSE_CHANGED') {
    console.log('[License] Recebida atualização de outra tab:', message.status);

    // Recarregar licença + capabilities do storage
    Promise.all([NodusLicense.loadLicense(), NodusLicense.loadCapabilities()]).then(() => {
      // Disparar evento local para atualizar UI
      window.dispatchEvent(new CustomEvent('nodus-license-changed', {
        detail: { status: message.status, license: NodusLicense.license }
      }));

      // Recarregar dashboard chains (forçar re-render)
      if (window.NodusChainsUI) {
        console.log('[License] 🔄 Recarregando Chains UI após mudança de licença');
        window.NodusChainsUI.render();
      }

      // Mostrar toast de confirmação
      if (window.NodusUI?.showToast) {
        const msg = message.status === 'pro'
          ? '👑 License activated!'
          : '📋 License updated';
        window.NodusUI.showToast(msg, 'success');
      }
    });

    sendResponse({ ok: true });
    return true;
  }

  // ✅ Background avisou que capabilities mudou (refresh do server).
  // Re-puxa do storage e re-emite evento — UI atualiza affordances PRO.
  if (message.action === 'CAPABILITIES_UPDATED') {
    console.log('[License] capabilities atualizadas pelo background:', message.plan);
    NodusLicense.refreshCapabilities().then(() => {
      if (window.NodusChainsUI?.render) window.NodusChainsUI.render();
    });
    sendResponse({ ok: true });
    return true;
  }

  return true; // Manter canal aberto para resposta assíncrona
});

// ═══════════════════════════════════════════════════════════════
// Expor NodusLicense globalmente para acesso via console/debug
// ═══════════════════════════════════════════════════════════════
window.NodusLicense = NodusLicense;
