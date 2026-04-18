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

      // Classificar conteúdo se texto presente
      if (eventData.text) {
        const classification = classifyContentType(eventData.text);
        eventData.content_type = classification.type;
        eventData.content_type_confidence = classification.confidence;
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
   * Verifica se deve enviar batch (100 eventos OU 24h)
   */
  async checkAndSendBatch(force = false) {
    const queue = await this.storage.getQueue();
    const lastSent = await this.storage.getLastSent();
    const now = Date.now();
    
    const hasEnoughEvents = queue.length >= TELEMETRY_CONFIG.BATCH.MIN_EVENTS;
    const hasEnoughTime = (now - lastSent) >= TELEMETRY_CONFIG.BATCH.MAX_TIME_MS;
    
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

      const payload = {
        user_hash: await this.security.getAnonId(),
        aggregated,
        timestamp: new Date().toISOString(),
        event_count: queue.length
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
   * Rastreia evento de save
   */
  async trackSave(ideaData) {
    return await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.SAVE, {
      platform_origin: ideaData.platform,
      content_type: ideaData.content_type,
      text: ideaData.text,
      tags_count: ideaData.tags?.length || 0,
      queue: ideaData.queue,
      capture_method: ideaData.captureMethod || 'manual'
    });
  }
  
  /**
   * Rastreia evento de inject
   */
  async trackInject(injectData) {
    return await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.INJECT, {
      platform_from: injectData.platform_from,
      platform_to: injectData.platform_to,
      inject_type: injectData.inject_type,
      text_length: injectData.text?.length || 0,
      success: injectData.success
    });
  }
  
  /**
   * Rastreia evento de export
   */
  async trackExport(exportData) {
    return await this.trackEvent(TELEMETRY_CONFIG.EVENT_TYPES.EXPORT, {
      format: exportData.format,
      ideas_count: exportData.ideas_count,
      queue: exportData.queue
    });
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
