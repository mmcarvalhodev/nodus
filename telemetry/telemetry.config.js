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
  // Valores antigos (100 events / 24h) faziam ~67% dos installs novos
  // virarem fantasmas — instalavam, faziam 2-3 cliques, desinstalavam
  // ANTES do primeiro batch sair. Resultado: dashboards cegos pra
  // activation/churn. Valores novos pegam funil real de novos users.
  BATCH: {
    MIN_EVENTS: 5,                      // 5 eventos OU
    MAX_TIME_MS: 5 * 60 * 1000,         // 5 minutos (o que vier primeiro)
    MAX_QUEUE_SIZE: 500,                // Limite da fila (prevenir overflow)
    FLUSH_ON_SUSPEND: true,             // Flush em chrome.runtime.onSuspend
    FLUSH_ALARM_MINUTES: 1              // Alarm de backup a cada 1 min (cobre SW dormindo)
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
    // Originais
    CODE: 'code',
    TECHNICAL_EXPLANATION: 'technical_explanation',
    NARRATIVE: 'narrative',
    LIST: 'list',
    SUMMARY: 'summary',
    BRAINSTORM: 'brainstorm',
    ANSWER: 'answer',
    OTHER: 'other',
    // Novas (v2 classifier — multilingual)
    QUESTION: 'question',
    INSTRUCTION: 'instruction',
    TUTORIAL: 'tutorial',
    ERROR_DEBUG: 'error_debug',
    COMPARISON: 'comparison',
    DEFINITION: 'definition'
  },

  CONTENT_TYPE_LABELS: {
    'code': '💻 Código',
    'technical_explanation': '🔧 Explicação Técnica',
    'narrative': '📖 Narrativa',
    'list': '📝 Lista',
    'summary': '📄 Resumo',
    'brainstorm': '💭 Brainstorm',
    'answer': '✅ Resposta',
    'other': '📦 Outro',
    'question': '❓ Pergunta',
    'instruction': '👉 Instrução',
    'tutorial': '📚 Tutorial',
    'error_debug': '🐛 Erro/Debug',
    'comparison': '⚖️ Comparação',
    'definition': '📖 Definição'
  },

  // ─── Idiomas detectados pelo classifier ─────────────────────
  CONTENT_LANGUAGES: ['pt', 'en', 'es', 'fr', 'other'],
  
  // ═══════════════════════════════════════════════════════════
  // TIPOS DE EVENTOS
  // ═══════════════════════════════════════════════════════════
  EVENT_TYPES: {
    // ── Ações do usuário (legacy, mantidos) ──
    SAVE: 'save',
    INJECT: 'inject',
    EXPORT: 'export',
    DELETE: 'delete',
    UPDATE: 'update',
    SESSION: 'session',
    UPGRADE_CLICK: 'upgrade_click',
    CLASSIFICATION_FEEDBACK: 'classification_feedback',

    // ── Detection passiva (já existe) ──
    // RESPONSE_GENERATED: dispara quando NODUS detecta resposta nova da IA
    // (= injectButtons rodou pra um anchor inédito). Combinado com SAVE,
    // permite calcular taxa de captura: % de respostas que viram cards.
    // Privacidade: NUNCA inclui texto da resposta — só platform e bucket
    // de tamanho aproximado pra entender comportamento por plataforma.
    RESPONSE_GENERATED: 'response_generated',

    // ── Lifecycle (novos, v5.0.0 telemetria-v2) ──
    // Visibilidade do funil de instalação até primeiro uso. Antes esses
    // eventos não existiam — install só era detectado quando user fazia
    // 100 ações, então 67% dos installs viravam fantasmas.
    EXTENSION_INSTALLED: 'extension_installed',  // chrome.runtime.onInstalled reason='install'
    EXTENSION_UPDATED:   'extension_updated',    // chrome.runtime.onInstalled reason='update'
    POPUP_OPENED:        'popup_opened',         // popup carregou
    DASHBOARD_OPENED:    'dashboard_opened',     // dashboard modal abriu
    AI_PAGE_DETECTED:    'ai_page_detected',     // runtime carregou em plataforma de IA
    BUTTONS_INJECTED:    'buttons_injected',     // botões NODUS injetados num answer node
    BUTTON_RENDER_FAILED:'button_render_failed', // injectButtons threw ou anchor não bate

    // ── Aha moments (first-time events, 1x por install) ──
    // Critical pra activation funnel — quantos dias até primeiro save/inject/export
    FIRST_SAVE:            'first_save',
    FIRST_INJECT:          'first_inject',
    FIRST_EXPORT:          'first_export',
    FIRST_CHAIN:           'first_chain',
    FIRST_DASHBOARD_OPEN:  'first_dashboard_open',

    // ── Opt-out tracking ──
    // TELEMETRY_DISABLED é enviado IMEDIATAMENTE (flush forçado) ANTES da
    // flag ser persistida — é literalmente o último evento que o user vai
    // mandar. Sem isso, opt-out vira "fantasma": o user some sem deixar
    // pegada e a gente perde a métrica "% que desliga telemetria".
    // TELEMETRY_ENABLED rastreia quem religa (raro mas importante pra UX).
    TELEMETRY_DISABLED: 'telemetry_disabled',
    TELEMETRY_ENABLED:  'telemetry_enabled_event'  // _event suffix pra não colidir com a flag de storage
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
    console.log(TELEMETRY_CONFIG.DEBUG.PREFIX, ...args);
  }
}

export default TELEMETRY_CONFIG;
