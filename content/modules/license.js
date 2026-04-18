// ═══════════════════════════════════════════════════════════════
// NODUS - License Module v1.0.0
// Sistema de licenciamento FREE/PRO
// ═══════════════════════════════════════════════════════════════

const NodusLicense = {
  // ═══════════════════════════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════════════════════════
  
  license: {
    status: 'free',          // 'free' | 'pro'
    plan: null,              // 'monthly' | 'yearly' | null
    expiresAt: null,         // timestamp ou null
    renewsAt: null,          // timestamp ou null
    email: null,             // email do usuário PRO
    licenseKey: null,        // chave de licença
    activatedAt: null,       // quando foi ativado
    deviceFingerprint: null  // fingerprint único do device
  },
  
  // Limites FREE
  FREE_LIMITS: {
    maxQueues: 3,           // Quick, Default, Q1
    maxChains: null,        // ilimitado em todos os planos
    maxNodesPerChain: null, // ilimitado
    maxProjects: 3,         // projetos customizados FREE
    exportFormats: ['txt'], // só TXT
    hasFullChatCapture: true,  // ilimitado em todos os planos — adoção
    hasEncryptedBackup: false
    // advanced_stats: gate é telemetria ON/OFF, não o plano
  },

  // Limites PRO
  PRO_LIMITS: {
    maxQueues: 6,           // Quick, Default, Q1-Q4
    maxChains: null,        // ilimitado
    maxNodesPerChain: null, // ilimitado
    maxProjects: null,      // ilimitado
    exportFormats: ['txt', 'html', 'docx'],
    hasFullChatCapture: true,
    hasEncryptedBackup: true
  },

  // Features que requerem PRO
  PRO_FEATURES: [
    'export_html',
    'export_docx',
    'queue_q2',
    'queue_q3',
    'queue_q4',
    // full_chat_capture: ilimitado em todos os planos — adoção
    'encrypted_backup',
    'unlimited_projects'
    // advanced_stats: gate é telemetria ON/OFF, não o plano
  ],
  
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
    await this.loadLicense();

    // Dev build: ativa PRO local sem chamadas de rede
    try {
      const manifest = chrome.runtime.getManifest();
      if (manifest._devLicense && this.license.status !== 'pro') {
        this.license.status      = 'pro';
        this.license.plan        = 'yearly';
        this.license.email       = 'dev@nodus.local'; // heartbeat ignora @nodus.local
        this.license.licenseKey  = 'local-dev';
        this.license.expiresAt   = null;              // nunca expira
        this.license.activatedAt = this.license.activatedAt || Date.now();
        await this.saveLicense();
      }
    } catch (e) { /* ignore — getManifest pode falhar em contextos não-extensão */ }

    // Gerar/verificar fingerprint do device
    if (!this.license.deviceFingerprint) {
      this.license.deviceFingerprint = await this.generateDeviceFingerprint();
      await this.saveLicense();
    }

    // Iniciar heartbeat se PRO
    if (this.license.status === 'pro') {
      this.startHeartbeat();
    }

    return this.license;
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
      return;
    }
    
    
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
          // Manter email, plan, datas - só mudar status
          this.license.status = 'free';
          await this.saveLicense();
        } else if (this.license.expiresAt) {
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
        resolve();
      });
    });
  },
  
  // ═══════════════════════════════════════════════════════════════
  // VERIFICAÇÕES
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Verifica se usuário é PRO
   */
  isPro() {
    if (this.license.status !== 'pro') return false;
    if (this.license.expiresAt && Date.now() > this.license.expiresAt) return false;
    return true;
  },
  
  /**
   * Verifica se usuário já teve/tem licença PRO (mesmo se expirada)
   */
  hasLicenseHistory() {
    // Se tem email OU expiresAt, significa que já teve PRO
    return !!(this.license.email || this.license.expiresAt);
  },
  
  /**
   * Verifica se usuário é FREE
   */
  isFree() {
    return !this.isPro();
  },
  
  /**
   * Verifica se uma feature específica está disponível
   */
  hasFeature(featureId) {
    // Features FREE sempre disponíveis
    if (!this.PRO_FEATURES.includes(featureId)) return true;
    
    // Features PRO requerem licença
    return this.isPro();
  },
  
  /**
   * Verifica se pode criar mais chains
   */
  canCreateChain(currentCount) {
    const limit = this.isPro() ? this.PRO_LIMITS.maxChains : this.FREE_LIMITS.maxChains;
    if (limit === null) return true; // ilimitado
    return currentCount < limit;
  },
  
  /**
   * Verifica se pode usar uma fila específica
   */
  canUseQueue(queueKey) {
    const proOnlyQueues = ['ideas_queue_custom2', 'ideas_queue_custom3', 'ideas_queue_custom4'];
    if (proOnlyQueues.includes(queueKey)) {
      return this.isPro();
    }
    return true;
  },
  
  /**
   * Verifica se pode exportar em um formato específico
   */
  canExportFormat(format) {
    const allowedFormats = this.isPro() ? this.PRO_LIMITS.exportFormats : this.FREE_LIMITS.exportFormats;
    return allowedFormats.includes(format.toLowerCase());
  },
  
  /**
   * Retorna os limites atuais baseado no status
   */
  getLimits() {
    return this.isPro() ? this.PRO_LIMITS : this.FREE_LIMITS;
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
    } catch (e) {
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
    } catch (e) {
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


      const data = await response.json();

      // Verificar se precisa de token (device change) — pode vir com status 200
      if (data.requiresToken) {
        return {
          valid: false,
          requiresToken: true,
          error: data.error || 'Device change detected. Please enter your license key.'
        };
      }

      if (!response.ok) {
        return {
          valid: false,
          error: data.error || 'Failed to validate email'
        };
      }

      // Se usuário não está no sistema ou é free
      if (!data.pro) {
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

      
      const result = {
        valid: true,
        plan: data.plan || 'pro',
        expiresAt: expiresAt,
        renewsAt: renewsAt,
        email: data.email,
        status: data.status
      };
      
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
        tokenContainer.style.display = 'block';
        errorDiv.textContent = translateWorkerError(result.error);
        errorDiv.style.display = 'block';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        tokenInput.focus();
        return;
      }
      
      if (result.valid) {
        
        await this.activatePro({
          email: result.email,
          plan: result.plan,
          expiresAt: result.expiresAt,
          renewsAt: result.renewsAt,
          status: result.status
        });
        
        
        // Verificar se realmente salvou
        const verify = await chrome.storage.local.get('nodus_license');
        
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

  // Notificar dashboard para atualizar badge após license carregar do storage
  window.dispatchEvent(new CustomEvent('nodus-license-changed', {
    detail: { status: NodusLicense.license.status, license: NodusLicense.license }
  }));
})();

// ✅ Listener para receber atualização de licença de outras tabs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Aceitar tanto LICENSE_UPDATED quanto LICENSE_CHANGED (compatibilidade)
  if (message.type === 'LICENSE_UPDATED' || message.action === 'LICENSE_CHANGED') {
    
    // Recarregar licença do storage
    NodusLicense.loadLicense().then(() => {
      // Disparar evento local para atualizar UI
      window.dispatchEvent(new CustomEvent('nodus-license-changed', { 
        detail: { status: message.status, license: NodusLicense.license }
      }));
      
      // Recarregar dashboard chains (forçar re-render)
      if (window.NodusChainsUI) {
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
  }
  return true; // Manter canal aberto para resposta assíncrona
});

// ═══════════════════════════════════════════════════════════════
// Expor NodusLicense globalmente para acesso via console/debug
// ═══════════════════════════════════════════════════════════════
window.NodusLicense = NodusLicense;
