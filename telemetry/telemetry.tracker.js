// ═══════════════════════════════════════════════════════════
// NODUS v3.2.0 - Telemetry Tracker
// ═══════════════════════════════════════════════════════════
// Rastreador principal de eventos
// Implementa os 3 modos de telemetria
// ═══════════════════════════════════════════════════════════

import { TELEMETRY_CONFIG, debug, getEndpoint } from './telemetry.config.js';
import { TelemetryStorage } from './telemetry.storage.js';
import { classifyContentType } from './telemetry.classifier.js';
import { getTelemetrySecurity } from './telemetry.security.js';
import { getTelemetryAggregator } from './telemetry.aggregator.js';

/**
 * Rastreador de eventos com suporte aos 3 modos
 */
export class TelemetryTracker {
  
  constructor() {
    this.storage = new TelemetryStorage();
    this.security = getTelemetrySecurity();
    this.aggregator = getTelemetryAggregator();
  }
  
  // ═══════════════════════════════════════════════════════════
  // TRACK EVENT (Método Principal)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Rastreia um evento baseado no modo atual
   * 
   * @param {string} eventType - Tipo do evento (save, inject, etc)
   * @param {object} eventData - Dados do evento
   * @returns {Promise<object>} Resultado do tracking
   */
  async trackEvent(eventType, eventData = {}) {
    try {
      debug(`Tracking event: ${eventType}`);

      // Classificar conteúdo se texto presente.
      // Classifier v2: retorna { type, confidence, language }.
      // Texto NUNCA é persistido — só a categoria final + idioma.
      // sanitizeEventData() abaixo remove o campo `text` antes de salvar.
      if (eventData.text) {
        const classification = classifyContentType(eventData.text);
        eventData.content_type = classification.type;
        eventData.content_type_confidence = classification.confidence;
        eventData.content_language = classification.language;
      }

      // Preparar evento
      const event = {
        event_type: eventType,
        event_data: this.sanitizeEventData(eventData),
        timestamp: new Date().toISOString()
      };

      debug('[trackEvent] Evento preparado:', event);

      // SEMPRE: salvar no log local (visível no dashboard só quando ON)
      try {
        debug('[trackEvent] Chamando addEventToLog...');
        await this.storage.addEventToLog(event);
        debug('[trackEvent] ✅ addEventToLog completado');
      } catch (err) {
        console.error('[trackEvent] ❌ Erro em addEventToLog:', err);
      }

      // SEMPRE: adicionar à fila local e atualizar stats locais
      await this.storage.addToQueue(event);
      await this.storage.updateLocalStats(eventType, eventData);

      // SÓ SE ON: verificar se deve enviar batch para o servidor
      const enabled = await this.storage.isEnabled();
      if (enabled) {
        await this.checkAndSendBatch();
      }

      return { ok: true, tracked: true };

    } catch (error) {
      console.error('[Telemetry] Error tracking event:', error);
      return { ok: false, error: error.message };
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // BATCH SENDING
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Lê batch_config do blob de capabilities (cacheado pelo background.js).
   * Server pode ajustar dinâmicamente sem release de extensão (TTL 1h).
   * Fallback pro TELEMETRY_CONFIG hardcoded se capabilities ausente.
   */
  async getBatchConfig() {
    try {
      const data = await chrome.storage.local.get('nodus_capabilities');
      const caps = data?.nodus_capabilities;
      const cfg = caps?.batch_config;
      if (cfg && typeof cfg.min_events === 'number' && typeof cfg.max_time_minutes === 'number') {
        return {
          min_events: cfg.min_events,
          max_time_ms: cfg.max_time_minutes * 60 * 1000,
          force_flush_on_install: cfg.force_flush_on_install !== false,
          force_flush_on_suspend: cfg.force_flush_on_suspend !== false
        };
      }
    } catch (_) { /* fallback */ }
    // Fallback pro hardcoded (conservador) se capabilities indisponível
    return {
      min_events: TELEMETRY_CONFIG.BATCH.MIN_EVENTS,
      max_time_ms: TELEMETRY_CONFIG.BATCH.MAX_TIME_MS,
      force_flush_on_install: !!TELEMETRY_CONFIG.BATCH.FLUSH_ON_SUSPEND,
      force_flush_on_suspend: !!TELEMETRY_CONFIG.BATCH.FLUSH_ON_SUSPEND
    };
  }

  /**
   * Verifica se deve enviar batch.
   * Limiares (min_events / max_time) vêm do batch_config dinâmico
   * (server-side via /auth/capabilities, cached pelo background).
   */
  async checkAndSendBatch(force = false) {
    const queue = await this.storage.getQueue();
    const lastSent = await this.storage.getLastSent();
    const now = Date.now();
    const cfg = await this.getBatchConfig();

    const hasEnoughEvents = queue.length >= cfg.min_events;
    const hasEnoughTime = (now - lastSent) >= cfg.max_time_ms;

    if (force || hasEnoughEvents || hasEnoughTime) {
      await this.sendBatch(queue);
      return true;
    }

    return false;
  }
  
  /**
   * Envia batch de eventos para Cloudflare
   */
  async sendBatch(queue) {
    if (!queue || queue.length === 0) {
      debug('No events to send');
      return { ok: true, sent: 0 };
    }
    
    try {
      // Preparar payload com agregação e k-anonymity
      const aggregated = this.aggregator.prepareForSend(queue);

      if (!aggregated || typeof aggregated !== 'object') {
        throw new Error(`Aggregator returned invalid data: ${typeof aggregated}`);
      }

      // ui_language: idioma da UI do NODUS escolhido pelo user.
      // Diferente de content_language do classifier (idioma do TEXTO da IA).
      //
      // Ordem de preferência:
      //   1. nodus_language no storage (se user trocou explicitamente)
      //   2. fallback: chrome.i18n.getUILanguage() (idioma do browser)
      // Normalizado pra 2 chars: 'pt-BR' → 'pt', 'en-US' → 'en'.
      //
      // Útil pra entender mix: "75% dos installs estão em PT mas 60% conversa
      // com IA em EN" — informa decisões de mercado e localização.
      let uiLanguage = null;
      try {
        const langData = await chrome.storage.local.get('nodus_language');
        let raw = langData?.nodus_language;
        if (!raw || raw === 'auto') {
          // Fallback: i18n.getUILanguage retorna 'pt-BR', 'en-US', etc
          try { raw = chrome.i18n?.getUILanguage?.() || null; } catch (_) {}
        }
        if (raw && typeof raw === 'string') {
          uiLanguage = raw.toLowerCase().split('-')[0]; // 'pt-BR' → 'pt'
        }
      } catch (_) { /* sem storage? null */ }

      const payload = {
        user_hash: await this.security.getAnonId(),
        aggregated,
        timestamp: new Date().toISOString(),
        event_count: queue.length,
        ui_language: uiLanguage
      };

      debug(`Sending batch: ${queue.length} events`);

      // Enviar para Cloudflare Worker
      const response = await fetch(TELEMETRY_CONFIG.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      // Limpar fila e atualizar last_sent
      await this.storage.clearQueue();
      await this.storage.setLastSent(Date.now());
      
      debug(`✅ Batch sent successfully: ${queue.length} events`);
      
      return { ok: true, sent: queue.length };
      
    } catch (error) {
      console.error('[Telemetry] Error sending batch:', error);
      return { ok: false, error: error.message };
    }
  }
  
  /**
   * Envia batch manualmente (botão de teste)
   */
  async sendNow() {
    const queue = await this.storage.getQueue();
    return await this.sendBatch(queue);
  }
  
  // ═══════════════════════════════════════════════════════════
  // ATALHOS PARA EVENTOS COMUNS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Rastreia evento de save.
   *
   * Aceita platform via `ideaData.platform` (legacy) ou `ideaData.platform_origin`
   * (schema unificado). Normaliza pra `platform_origin` no event_data.
   */
  async trackSave(ideaData) {
    const platform = ideaData.platform_origin || ideaData.platform || null;
    const result = await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.SAVE, {
      platform_origin: platform,
      content_type: ideaData.content_type,
      text: ideaData.text,
      tags_count: ideaData.tags?.length || 0,
      queue: ideaData.queue,
      capture_method: ideaData.captureMethod || 'manual'
    });
    // Dispara first_save de forma idempotente — primeira save por install
    // chega ao backend como evento dedicado, simplifica activation analytics
    this.trackFirstEvent('first_save', { platform_origin: platform }).catch(() => {});
    return result;
  }
  
  /**
   * Rastreia geração de resposta detectada pelo NODUS.
   *
   * Combinada com trackSave/trackQuickSave/trackAutoCapture, permite calcular
   * a "taxa de captura" — quantas respostas o usuário deixa passar sem salvar.
   * Útil pra entender padrões de uso por plataforma E pra ajustar a UX
   * (se save-rate muito baixo, talvez os botões não estejam visíveis o suficiente).
   *
   * PRIVACIDADE: este evento é puramente PASSIVO (dispara sem ação do usuário).
   * Por isso NÃO incluímos texto, conversation_id, ou qualquer conteúdo. Só:
   *   - platform (ex: 'chatgpt')
   *   - length_bucket (faixa aproximada do tamanho, anônimo)
   *
   * @param {Object} data
   * @param {string} data.platform - Nome da plataforma (chatgpt/claude/etc.)
   * @param {number} [data.length] - Comprimento aproximado em chars (será bucketizado)
   */
  async trackResponseGenerated(data) {
    // Bucketiza tamanho pra reduzir granularidade (priva. de identificação)
    let lengthBucket = 'unknown';
    if (typeof data.length === 'number') {
      if (data.length < 100)       lengthBucket = 'short';      // bullet, frase
      else if (data.length < 500)  lengthBucket = 'medium';     // parágrafo
      else if (data.length < 2000) lengthBucket = 'long';       // resposta padrão
      else if (data.length < 8000) lengthBucket = 'very_long';  // explicação detalhada
      else                          lengthBucket = 'huge';      // código/análise
    }
    // v2: aceita content_type + content_language opcionais.
    // O runtime classifica localmente o texto da resposta (innerText) e
    // descarta o texto IMEDIATAMENTE — só passa a categoria pra cá.
    // Combinado com SAVE events permite calcular save-rate por categoria:
    //   "user salva 42% das respostas 'code', só 25% das 'narrative'"
    return await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.RESPONSE_GENERATED, {
      platform_origin: data.platform,
      platform: data.platform,   // alias legacy
      length_bucket: lengthBucket,
      content_type: data.content_type || null,
      content_language: data.content_language || null
    });
  }

  /**
   * Rastreia opt-out / opt-in da telemetria.
   *
   * CRÍTICO: quando user DESABILITA telemetria, esse é o ÚLTIMO evento que
   * vai ser enviado. Por isso fazemos:
   *   1. Adiciona evento `telemetry_disabled` na fila
   *   2. Força flush IMEDIATO (bypassa checkAndSendBatch normal)
   *   3. SÓ DEPOIS o caller pode marcar telemetry_enabled=false no storage
   *
   * Se invertêssemos a ordem (marca off → tenta enviar), o `sendBatch` ia
   * abortar porque a flag está off. Resultado: opt-out vira "fantasma" — o
   * user some sem deixar pegada e a gente perde a métrica.
   *
   * Quando user RE-HABILITA, manda evento normal (já tá ON, próximo batch
   * leva ele).
   *
   * @param {boolean} enabled - novo estado (false = desabilitou, true = habilitou)
   * @param {string} [source] - 'popup' ou 'dashboard' pra entender onde user clicou
   */
  async trackTelemetryToggle(enabled, source = 'unknown') {
    const eventType = enabled
      ? TELEMETRY_CONFIG.EVENT_TYPES.TELEMETRY_ENABLED
      : TELEMETRY_CONFIG.EVENT_TYPES.TELEMETRY_DISABLED;

    // Privacidade: NADA de texto, conversation_id, nem identificador além
    // do source da UI (popup/dashboard). É só "alguém apertou o toggle".
    const event = {
      event_type: eventType,
      event_data: { source, new_state: enabled ? 'on' : 'off' },
      timestamp: new Date().toISOString()
    };

    try {
      // 1. Salva no log local sempre (visível no dashboard)
      await this.storage.addEventToLog(event);
      await this.storage.addToQueue(event);
      await this.storage.updateLocalStats(eventType, event.event_data);
    } catch (err) {
      console.error('[Telemetry] trackTelemetryToggle: erro local:', err);
    }

    // 2. Se DESABILITANDO: força flush AGORA, independente de min_events/timer.
    //    Esse é o último envio possível antes do user cortar telemetria.
    //    Se HABILITANDO: também força flush pra registrar evento no mesmo batch
    //    do session (não espera N eventos pra subir).
    try {
      const queue = await this.storage.getQueue();
      if (queue.length > 0) {
        await this.sendBatch(queue);
      }
    } catch (err) {
      console.warn('[Telemetry] trackTelemetryToggle: flush forçado falhou:', err?.message);
    }

    return { ok: true };
  }

  /**
   * Rastreia evento de inject.
   *
   * Aceita platform_from/platform_to (legacy) ou platform_origin/platform_target
   * (schema unificado). Normaliza pra schema unificado.
   */
  async trackInject(injectData) {
    const origin = injectData.platform_origin || injectData.platform_from || null;
    const target = injectData.platform_target || injectData.platform_to || null;
    const result = await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.INJECT, {
      platform_origin: origin,
      platform_target: target,
      // Mantém aliases legacy só pro aggregator de `flows` que ainda usa platform_from/to
      // (flows é um índice cross-platform: origem→destino, semântica diferente de by_platform)
      platform_from: origin,
      platform_to: target,
      content_type: injectData.content_type || injectData.inject_type || null,
      inject_type: injectData.inject_type,
      text_length: injectData.text?.length || 0,
      success: injectData.success
    });
    this.trackFirstEvent('first_inject', { platform_origin: origin, platform_target: target }).catch(() => {});
    return result;
  }
  
  /**
   * Rastreia evento de export
   */
  async trackExport(exportData) {
    const result = await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.EXPORT, {
      format: exportData.format,
      ideas_count: exportData.ideas_count,
      queue: exportData.queue
    });
    this.trackFirstEvent('first_export', { format: exportData.format }).catch(() => {});
    return result;
  }
  
  /**
   * Rastreia evento de delete
   */
  async trackDelete(deleteData) {
    return await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.DELETE, {
      queue: deleteData.queue,
      bulk: deleteData.bulk || false
    });
  }
  
  // ═══════════════════════════════════════════════════════════
  // LIFECYCLE & FUNNEL EVENTS (v2 telemetria — visibilidade dia-1)
  // ═══════════════════════════════════════════════════════════

  /**
   * Rastreia install/update da extensão. Chamado de chrome.runtime.onInstalled.
   * É o ponto-zero do funil — sem isso, install fica invisível por 24h+.
   */
  async trackInstall(details) {
    const reason = details?.reason || 'unknown';
    const isUpdate = reason === 'update';
    const eventType = isUpdate
      ? TELEMETRY_CONFIG.EVENT_TYPES.EXTENSION_UPDATED
      : TELEMETRY_CONFIG.EVENT_TYPES.EXTENSION_INSTALLED;

    // Persiste install timestamp pra calcular days_since_install em first_* events
    try {
      const existing = await chrome.storage.local.get('nodus_install_ts');
      if (!existing.nodus_install_ts) {
        await chrome.storage.local.set({ nodus_install_ts: Date.now() });
      }
    } catch (_) { /* SW context; chrome.storage pode não estar disponível em alguns paths */ }

    return await this.trackEvent(eventType, {
      reason,
      previous_version: details?.previousVersion || null
    });
  }

  /**
   * Detecta plataforma de IA carregando. Chamado do runtime.js quando spec
   * é aplicada com sucesso na page (= é uma página de IA suportada).
   */
  async trackAiPageDetected(platform) {
    return await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.AI_PAGE_DETECTED, {
      platform_origin: platform,
      platform
    });
  }

  /**
   * Botões NODUS injetados num answer node. Chamado de injectButtons() do runtime.
   */
  async trackButtonsInjected(platform) {
    return await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.BUTTONS_INJECTED, {
      platform_origin: platform,
      platform
    });
  }

  /**
   * Popup do NODUS abriu. Chamado do popup.js no DOMContentLoaded.
   */
  async trackPopupOpened(context) {
    return await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.POPUP_OPENED, {
      context: context || 'icon'
    });
  }

  /**
   * "first_*" event helper — garante que dispara UMA vez por install.
   * Usa chrome.storage.local.nodus_first_events como marca.
   *
   * @param {string} firstEventType - 'first_save' / 'first_inject' / ...
   * @param {object} payload - dados anônimos do evento
   * @returns {boolean} true se foi a primeira vez (e disparou), false se já foi disparado antes
   */
  async trackFirstEvent(firstEventType, payload = {}) {
    try {
      const data = await chrome.storage.local.get(['nodus_first_events', 'nodus_install_ts']);
      const fired = data.nodus_first_events || {};
      if (fired[firstEventType]) return false; // já disparou — silencioso

      fired[firstEventType] = Date.now();
      await chrome.storage.local.set({ nodus_first_events: fired });

      // Calcula days_since_install (anônimo, só dia)
      const installTs = data.nodus_install_ts || Date.now();
      const daysSinceInstall = Math.floor((Date.now() - installTs) / (24 * 3600 * 1000));

      await this.trackEvent(firstEventType, {
        ...payload,
        days_since_install: daysSinceInstall
      });
      return true;
    } catch (e) {
      console.warn('[Telemetry] trackFirstEvent failed:', e.message);
      return false;
    }
  }

  /**
   * Rastreia feedback de classificação
   */
  async trackClassificationFeedback(originalType, correctedType) {
    // Salvar feedback no storage
    await this.storage.saveFeedback(originalType, correctedType);
    
    // Rastrear evento
    return await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.CLASSIFICATION_FEEDBACK, {
      original_type: originalType,
      corrected_type: correctedType
    });
  }
  
  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Remove dados sensíveis do evento
   */
  sanitizeEventData(data) {
    return this.security.sanitizeEvent(data);
  }
  
  /**
   * Obtém estatísticas locais
   */
  async getStats() {
    return await this.storage.getLocalStats();
  }
  
  /**
   * Obtém event log (Modo 2)
   */
  async getEventLog(filters) {
    return await this.storage.getEventLog(filters);
  }
  
  /**
   * Exporta dados agregados para auditoria
   */
  async exportAuditData(format = 'json') {
    const mode = await this.storage.getMode();
    const stats = await this.storage.getLocalStats();
    const eventLog = mode === TELEMETRY_CONFIG.MODES.ON
      ? await this.storage.getEventLog()
      : [];
    
    // Preparar dados agregados
    const aggregated = eventLog.length > 0 
      ? this.aggregator.prepareForSend(eventLog, 1) // cohort size 1 para local
      : null;
    
    const auditData = {
      version: TELEMETRY_CONFIG.VERSION,
      mode: mode,
      exported_at: new Date().toISOString(),
      stats: stats,
      event_log_count: eventLog.length,
      aggregated: aggregated,
      compliance: await this.security.getComplianceReport()
    };
    
    if (format === 'json') {
      return JSON.stringify(auditData, null, 2);
    }
    
    // TODO: Implementar CSV e PDF
    return auditData;
  }
  
}

// ═══════════════════════════════════════════════════════════
// INSTÂNCIA GLOBAL
// ═══════════════════════════════════════════════════════════

let trackerInstance = null;

/**
 * Obtém instância singleton do tracker
 */
export function getTelemetryTracker() {
  if (!trackerInstance) {
    trackerInstance = new TelemetryTracker();
  }
  return trackerInstance;
}

export default TelemetryTracker;
