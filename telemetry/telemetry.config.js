// ═══════════════════════════════════════════════════════════
// NODUS v3.2.0 - Telemetry Configuration
// ═══════════════════════════════════════════════════════════
// Sistema de Telemetria Ética com 3 Modos
// - Modo 0: Desligado (máxima privacidade)
// - Modo 1: Logs Locais (padrão recomendado)
// - Modo 2: Auditoria Expandida (compliance)
// ═══════════════════════════════════════════════════════════

export const TELEMETRY_CONFIG = {
  
  // ═══════════════════════════════════════════════════════════
  // VERSÃO
  // ═══════════════════════════════════════════════════════════
  VERSION: '2.0.0',
  
  // ═══════════════════════════════════════════════════════════
  // MODOS DE TELEMETRIA
  // ═══════════════════════════════════════════════════════════
  MODES: {
    OFF: 0,       // Desligado - sem stats, sem logs, sem envio
    ON: 1         // Ligado - stats visíveis + envio batch automático
  },
  
  DEFAULT_MODE: 1,    // Modo padrão: Ligado (opt-out) — coleta local sempre ativa
  
  // ═══════════════════════════════════════════════════════════
  // BATCH CONFIGURATION
  // ═══════════════════════════════════════════════════════════
  BATCH: {
    MIN_EVENTS: 100,                    // Envia quando atingir 100 eventos
    MAX_TIME_MS: 24 * 60 * 60 * 1000,   // OU a cada 24 horas (o que vier primeiro)
    MAX_QUEUE_SIZE: 500                 // Limite máximo da fila (prevenir overflow)
  },
  
  // ═══════════════════════════════════════════════════════════
  // STORAGE KEYS
  // ═══════════════════════════════════════════════════════════
  STORAGE_KEYS: {
    TELEMETRY_ENABLED: 'telemetry_enabled',                    // Boolean: ON/OFF
    EVENT_QUEUE: 'telemetry_event_queue',                      // Array: eventos acumulados
    EVENT_LOG: 'telemetry_event_log',                          // Array: histórico de eventos (para UI)
    LAST_SENT: 'telemetry_last_sent',                          // Timestamp: último envio
    LOCAL_STATS: 'telemetry_local_stats',                      // Object: estatísticas agregadas
    ANON_ID: 'telemetry_anon_id',                              // String: ID anônimo do usuário
    BATCH_QUEUE: 'telemetry_batch_queue',                      // Array: fila de batch para envio
    CLASSIFICATION_FEEDBACK: 'telemetry_classification_feedback', // Array: feedbacks de classificação
    SERVER_SYNC_ENABLED: 'telemetry_server_sync_enabled',      // Boolean: sync com servidor
    EVENT_LOG_LAST_CLEANUP: 'telemetry_event_log_last_cleanup' // Timestamp: última limpeza
  },
  
  // ═══════════════════════════════════════════════════════════
  // CONTENT TYPES (Classificação de Conteúdo)
  // ═══════════════════════════════════════════════════════════
  CONTENT_TYPES: {
    CODE: 'code',
    TECHNICAL_EXPLANATION: 'technical_explanation',
    NARRATIVE: 'narrative',
    LIST: 'list',
    SUMMARY: 'summary',
    BRAINSTORM: 'brainstorm',
    ANSWER: 'answer',
    OTHER: 'other'
  },
  
  CONTENT_TYPE_LABELS: {
    'code': '💻 Código',
    'technical_explanation': '🔧 Explicação Técnica',
    'narrative': '📖 Narrativa',
    'list': '📝 Lista',
    'summary': '📄 Resumo',
    'brainstorm': '💭 Brainstorm',
    'answer': '✅ Resposta',
    'other': '📦 Outro'
  },
  
  // ═══════════════════════════════════════════════════════════
  // TIPOS DE EVENTOS
  // ═══════════════════════════════════════════════════════════
  EVENT_TYPES: {
    SAVE: 'save',
    INJECT: 'inject',
    EXPORT: 'export',
    DELETE: 'delete',
    UPDATE: 'update',
    SESSION: 'session',
    UPGRADE_CLICK: 'upgrade_click',
    CLASSIFICATION_FEEDBACK: 'classification_feedback'
  },
  
  // ═══════════════════════════════════════════════════════════
  // RETENÇÃO DE DADOS
  // ═══════════════════════════════════════════════════════════
  RETENTION: {
    EVENT_LOG_DAYS: 90,          // Modo 2: manter eventos por 90 dias
    BATCH_QUEUE_MAX_SIZE: 100,   // Máximo de eventos na fila de batch
    FEEDBACK_MAX_COUNT: 100,     // Máximo de feedbacks de classificação
    CLEANUP_INTERVAL_DAYS: 7     // Executar limpeza a cada 7 dias
  },
  
  // ═══════════════════════════════════════════════════════════
  // ENDPOINT (Cloudflare Worker)
  // ═══════════════════════════════════════════════════════════
  ENDPOINT: 'https://nodus-worker.mmcarvalho-dev.workers.dev/telemetry/batch',
  
  // ═══════════════════════════════════════════════════════════
  // CONFIGURAÇÕES DE UI
  // ═══════════════════════════════════════════════════════════
  UI: {
    CLASSIFICATION_PANEL_AUTO_HIDE_MS: 5000,  // 5 segundos
    TOAST_DURATION_MS: 3000                     // 3 segundos
  },
  
  // ═══════════════════════════════════════════════════════════
  // DEBUG
  // ═══════════════════════════════════════════════════════════
  DEBUG: {
    ENABLED: false,
    PREFIX: '[NODUS Telemetry]'
  }
};

// ═══════════════════════════════════════════════════════════
// FUNÇÕES HELPER
// ═══════════════════════════════════════════════════════════

/**
 * Retorna o nome amigável do modo
 */
export function getModeName(enabled) {
  return enabled ? 'Enabled' : 'Disabled';
}

/**
 * Retorna o label amigável do content type
 */
export function getContentTypeLabel(contentType) {
  return TELEMETRY_CONFIG.CONTENT_TYPE_LABELS[contentType] || '📦 Geral';
}

/**
 * Valida se o modo é válido
 */
export function isValidMode(mode) {
  return [0, 1].includes(mode);
}

/**
 * Retorna o endpoint de telemetria
 */
export function getEndpoint() {
  return TELEMETRY_CONFIG.ENDPOINT;
}

/**
 * Log de debug condicional
 */
export function debug(...args) {
  if (TELEMETRY_CONFIG.DEBUG.ENABLED) {
  }
}

export default TELEMETRY_CONFIG;
