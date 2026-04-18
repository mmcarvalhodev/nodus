// ═══════════════════════════════════════════════════════════
// NODUS v3.2.0 - Telemetry Storage Manager
// ═══════════════════════════════════════════════════════════
// Gerenciador de storage para telemetria
// Suporta os 3 modos: Off, Local, Expanded
// ═══════════════════════════════════════════════════════════

import { TELEMETRY_CONFIG, debug, isValidMode } from './telemetry.config.js';

const KEYS = TELEMETRY_CONFIG.STORAGE_KEYS;

/**
 * Gerenciador de storage da telemetria
 */
export class TelemetryStorage {
  
  // ═══════════════════════════════════════════════════════════
  // ENABLED/DISABLED
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Verifica se telemetria está habilitada
   */
  async isEnabled() {
    // ✅ Ler de settings.telemetryMode (chave usada pelo dashboard)
    const result = await chrome.storage.local.get('settings');
    const mode = result.settings?.telemetryMode;
    
    // Se não configurado, default é ON (1)
    if (mode === undefined) {
      return true;
    }
    
    // 0 = OFF, 1 = ON
    return mode > 0;
  }
  
  /**
   * Habilita/desabilita telemetria
   */
  async setEnabled(enabled) {
    // ✅ Salvar em settings.telemetryMode (chave usada pelo dashboard)
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || {};
    
    settings.telemetryMode = enabled ? 1 : 0;
    await chrome.storage.local.set({ settings });
    
    debug(`Telemetry ${enabled ? 'enabled' : 'disabled'}`);
    
    // Se desabilitar, limpar fila (mas manter stats para exibir histórico)
    if (!enabled) {
      await this.clearQueue();
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // EVENT QUEUE
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Adiciona evento à fila
   */
  async addToQueue(event) {
    const queue = await this.getQueue();
    queue.push(event);
    
    // Limitar tamanho da fila
    if (queue.length > TELEMETRY_CONFIG.BATCH.MAX_QUEUE_SIZE) {
      queue.shift(); // Remove o mais antigo
    }
    
    await chrome.storage.local.set({ [KEYS.EVENT_QUEUE]: queue });
  }
  
  /**
   * Obtém fila de eventos
   */
  async getQueue() {
    const result = await chrome.storage.local.get(KEYS.EVENT_QUEUE);
    return result[KEYS.EVENT_QUEUE] || [];
  }
  
  /**
   * Limpa fila de eventos
   */
  async clearQueue() {
    await chrome.storage.local.set({ [KEYS.EVENT_QUEUE]: [] });
  }
  
  /**
   * Obtém timestamp do último envio
   */
  async getLastSent() {
    const result = await chrome.storage.local.get(KEYS.LAST_SENT);
    return result[KEYS.LAST_SENT] || 0;
  }
  
  /**
   * Atualiza timestamp do último envio
   */
  async setLastSent(timestamp) {
    await chrome.storage.local.set({ [KEYS.LAST_SENT]: timestamp });
  }
  
  // ═══════════════════════════════════════════════════════════
  // MODO DE TELEMETRIA (COMPATIBILIDADE)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Obtém o modo atual (compatibilidade)
   */
  async getMode() {
    const enabled = await this.isEnabled();
    return enabled ? TELEMETRY_CONFIG.MODES.ON : TELEMETRY_CONFIG.MODES.OFF;
  }
  
  /**
   * Define o modo de telemetria (compatibilidade)
   */
  async setMode(mode) {
    const enabled = mode === TELEMETRY_CONFIG.MODES.ON;
    await this.setEnabled(enabled);
  }
  
  // ═══════════════════════════════════════════════════════════
  // ESTATÍSTICAS LOCAIS (Modo 1 e 2)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Obtém estatísticas locais
   */
  async getLocalStats() {
    const result = await chrome.storage.local.get(KEYS.LOCAL_STATS);
    return result[KEYS.LOCAL_STATS] || this.getEmptyStats();
  }
  
  /**
   * Atualiza estatísticas locais
   */
  async updateLocalStats(eventType, eventData) {
    const stats = await this.getLocalStats();
    
    // Incrementar contadores por tipo de evento
    if (!stats.events[eventType]) {
      stats.events[eventType] = 0;
    }
    stats.events[eventType]++;
    
    // Incrementar contador por content_type
    if (eventData.content_type) {
      if (!stats.contentTypes[eventData.content_type]) {
        stats.contentTypes[eventData.content_type] = 0;
      }
      stats.contentTypes[eventData.content_type]++;
    }
    
    // Incrementar contador por plataforma
    if (eventData.platform_origin) {
      if (!stats.platforms[eventData.platform_origin]) {
        stats.platforms[eventData.platform_origin] = 0;
      }
      stats.platforms[eventData.platform_origin]++;
    }
    
    // Atualizar totais
    stats.totalEvents++;
    stats.lastUpdated = new Date().toISOString();
    
    await chrome.storage.local.set({ [KEYS.LOCAL_STATS]: stats });
    debug('Local stats updated:', stats);
  }
  
  /**
   * Retorna estrutura vazia de stats
   */
  getEmptyStats() {
    return {
      totalEvents: 0,
      events: {},
      contentTypes: {},
      platforms: {},
      lastUpdated: null
    };
  }
  
  // ═══════════════════════════════════════════════════════════
  // EVENT LOG (Modo 2 apenas)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Adiciona evento ao log (Modo 2)
   */
  async addEventToLog(event) {
    debug('[addEventToLog] Iniciando...', event);
    // Coleta local SEMPRE — independente do modo ON/OFF
    // Quando OFF: dados ficam no storage mas não são exibidos no dashboard
    
    const result = await chrome.storage.local.get(KEYS.EVENT_LOG);
    const eventLog = result[KEYS.EVENT_LOG] || [];
    debug('[addEventToLog] Event log atual tem', eventLog.length, 'eventos');
    
    // Adicionar evento
    eventLog.unshift({
      ...event,
      id: this.generateEventId(),
      timestamp: event.timestamp || new Date().toISOString()  // Preservar timestamp se já existir
    });
    debug('[addEventToLog] Evento adicionado, total agora:', eventLog.length);
    
    // Limitar tamanho (últimos 1000 eventos)
    if (eventLog.length > 1000) {
      eventLog.pop();
    }
    
    await chrome.storage.local.set({ [KEYS.EVENT_LOG]: eventLog });
    debug('[addEventToLog] ✅ Salvou no storage, KEYS.EVENT_LOG:', KEYS.EVENT_LOG);
  }
  
  /**
   * Obtém event log
   */
  async getEventLog(filters = {}) {
    const result = await chrome.storage.local.get(KEYS.EVENT_LOG);
    let eventLog = result[KEYS.EVENT_LOG] || [];
    
    // Aplicar filtros
    if (filters.eventType) {
      eventLog = eventLog.filter(e => e.event_type === filters.eventType);
    }
    
    if (filters.startDate) {
      eventLog = eventLog.filter(e => new Date(e.timestamp) >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      eventLog = eventLog.filter(e => new Date(e.timestamp) <= new Date(filters.endDate));
    }
    
    return eventLog;
  }
  
  /**
   * Limpa eventos antigos (> 90 dias)
   */
  async cleanupOldEvents() {
    const result = await chrome.storage.local.get(KEYS.EVENT_LOG);
    const eventLog = result[KEYS.EVENT_LOG] || [];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TELEMETRY_CONFIG.RETENTION.EVENT_LOG_DAYS);
    
    const cleanedLog = eventLog.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate > cutoffDate;
    });
    
    await chrome.storage.local.set({
      [KEYS.EVENT_LOG]: cleanedLog,
      [KEYS.EVENT_LOG_LAST_CLEANUP]: new Date().toISOString()
    });
    
    debug(`Cleanup: removed ${eventLog.length - cleanedLog.length} old events`);
  }
  
  // ═══════════════════════════════════════════════════════════
  // BATCH QUEUE (para envio ao servidor em Modo 2)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Adiciona evento à fila de batch
   */
  async addToBatchQueue(event) {
    const result = await chrome.storage.local.get(KEYS.BATCH_QUEUE);
    const queue = result[KEYS.BATCH_QUEUE] || [];
    
    queue.push(event);
    
    // Limitar tamanho
    if (queue.length > TELEMETRY_CONFIG.RETENTION.BATCH_QUEUE_MAX_SIZE) {
      queue.shift(); // Remove mais antigo
    }
    
    await chrome.storage.local.set({ [KEYS.BATCH_QUEUE]: queue });
  }
  
  /**
   * Obtém fila de batch
   */
  async getBatchQueue() {
    const result = await chrome.storage.local.get(KEYS.BATCH_QUEUE);
    return result[KEYS.BATCH_QUEUE] || [];
  }
  
  /**
   * Limpa fila de batch
   */
  async clearBatchQueue() {
    await chrome.storage.local.set({ [KEYS.BATCH_QUEUE]: [] });
  }
  
  /**
   * Obtém e limpa fila de batch
   */
  async flushBatchQueue() {
    const result = await chrome.storage.local.get(KEYS.BATCH_QUEUE);
    const queue = result[KEYS.BATCH_QUEUE] || [];
    
    // Limpar fila
    await chrome.storage.local.set({ [KEYS.BATCH_QUEUE]: [] });
    
    return queue;
  }
  
  // ═══════════════════════════════════════════════════════════
  // FEEDBACK DE CLASSIFICAÇÃO
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Salva feedback de correção de tipo
   */
  async saveFeedback(originalType, correctedType) {
    const result = await chrome.storage.local.get(KEYS.CLASSIFICATION_FEEDBACK);
    const feedback = result[KEYS.CLASSIFICATION_FEEDBACK] || [];
    
    feedback.push({
      original: originalType,
      corrected: correctedType,
      timestamp: new Date().toISOString()
    });
    
    // Limita a 100 feedbacks
    if (feedback.length > TELEMETRY_CONFIG.RETENTION.FEEDBACK_MAX_COUNT) {
      feedback.shift();
    }
    
    await chrome.storage.local.set({ [KEYS.CLASSIFICATION_FEEDBACK]: feedback });
    
    debug('Feedback saved:', { originalType, correctedType });
  }
  
  /**
   * Obtém feedbacks de classificação
   */
  async getFeedback() {
    const result = await chrome.storage.local.get(KEYS.CLASSIFICATION_FEEDBACK);
    return result[KEYS.CLASSIFICATION_FEEDBACK] || [];
  }
  
  // ═══════════════════════════════════════════════════════════
  // SERVER SYNC (Modo 2 opcional)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Verifica se sync com servidor está habilitado
   */
  async isServerSyncEnabled() {
    const result = await chrome.storage.local.get(KEYS.SERVER_SYNC_ENABLED);
    return result[KEYS.SERVER_SYNC_ENABLED] === true;
  }
  
  /**
   * Habilita/desabilita sync com servidor
   */
  async setServerSync(enabled) {
    await chrome.storage.local.set({ [KEYS.SERVER_SYNC_ENABLED]: enabled });
    debug(`Server sync ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // ═══════════════════════════════════════════════════════════
  // LIMPEZA
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Limpa todos os dados de telemetria
   */
  async clearAll() {
    await chrome.storage.local.set({
      [KEYS.LOCAL_STATS]: this.getEmptyStats(),
      [KEYS.EVENT_LOG]: [],
      [KEYS.BATCH_QUEUE]: [],
      [KEYS.CLASSIFICATION_FEEDBACK]: [],
      [KEYS.SERVER_SYNC_ENABLED]: false
    });
    
    debug('All telemetry data cleared');
  }
  
  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Gera ID único para eventos
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default TelemetryStorage;
