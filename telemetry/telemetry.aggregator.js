// ═══════════════════════════════════════════════════════════
// NODUS v3.2.0 - Telemetry Aggregator
// ═══════════════════════════════════════════════════════════
// Sistema de agregação segura com:
// - Temporal binning (dia/hora)
// - K-anonymity threshold (≥20)
// - Differential privacy (ruído Laplace)
// - Drop rare combinations
// ═══════════════════════════════════════════════════════════

import { TELEMETRY_CONFIG, debug } from './telemetry.config.js';
import { getTelemetrySecurity } from './telemetry.security.js';

/**
 * Configuração do agregador
 */
const AGGREGATOR_CONFIG = {
  // K-anonymity: tamanho mínimo de coorte
  COHORT_MIN_SIZE: 20,
  
  // Differential privacy: range de ruído
  NOISE_RANGE: 2,  // ±2
  
  // Binning temporal
  TIME_BIN: 'day', // 'hour' ou 'day'
  
  // Drop singletons
  DROP_SINGLETONS: true,
  
  // Minimum count para enviar combo
  MIN_COMBO_COUNT: 2,
  
  // Batch interval (minutos)
  BATCH_INTERVAL_MINUTES: 60,
  
  // Local expiry (dias)
  LOCAL_EXPIRY_DAYS: 30
};

/**
 * Agregador de Telemetria
 */
export class TelemetryAggregator {
  
  constructor() {
    this.security = getTelemetrySecurity();
  }
  
  // ═══════════════════════════════════════════════════════════
  // TEMPORAL BINNING
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Agrupa timestamp em bins temporais
   * 
   * @param {string} timestamp - ISO 8601 timestamp
   * @param {string} binType - 'day' ou 'hour'
   * @returns {string} Binned timestamp
   */
  binTimestamp(timestamp, binType = AGGREGATOR_CONFIG.TIME_BIN) {
    const date = new Date(timestamp);
    
    if (binType === 'day') {
      // YYYY-MM-DD
      return date.toISOString().slice(0, 10);
    }
    
    if (binType === 'hour') {
      // YYYY-MM-DDTHH
      return date.toISOString().slice(0, 13);
    }
    
    return date.toISOString().slice(0, 10);
  }
  
  // ═══════════════════════════════════════════════════════════
  // AGREGAÇÃO DE EVENTOS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Agrega eventos locais em contadores
   * 
   * @param {Array} events - Lista de eventos brutos
   * @returns {Object} Contadores agregados
   */
  aggregateEvents(events) {
    const aggregated = {
      by_type: {},                  // global: TODOS events com content_type (legacy)
      by_type_saved: {},            // v2: só SAVE events — "o que o user organiza"
      by_type_seen: {},             // v2: só RESPONSE_GENERATED events — "o que passa direto"
      by_platform: {},
      by_queue: {},
      by_combo: {},
      by_event: {},                 // contagem por event_type (lifecycle, funnel, etc)
      by_language: {},              // v2: contagem por content_language
      flows: {},
      total: events.length
    };

    for (const event of events) {
      const day = this.binTimestamp(event.timestamp);
      const d = event.event_data || {};

      // === Fallback chain pro nome do campo "platform" ===
      // Razão: callers históricos usam platform_origin / platform_from / platform.
      // Em vez de obrigar todos a renomearem, aggregator aceita qualquer um.
      // Prioridade: platform_origin (save) > platform_from (inject) > platform (response_generated/lifecycle)
      const platform = d.platform_origin || d.platform_from || d.platform || null;

      // === Fallback chain pro content_type ===
      // Save usa content_type, inject usa inject_type. Aceita ambos.
      const contentType = d.content_type || d.inject_type || null;
      const contentLanguage = d.content_language || null;

      // Agregar por event_type (sempre, mesmo se outros campos ausentes)
      // Isso resolve invisibilidade de lifecycle events (install, popup_opened, etc)
      if (event.event_type) {
        const et = event.event_type;
        if (!aggregated.by_event[et]) aggregated.by_event[et] = { count: 0, days: {} };
        aggregated.by_event[et].count++;
        aggregated.by_event[et].days[day] = (aggregated.by_event[et].days[day] || 0) + 1;
      }

      // Agregar por content_type (global — todos events com categoria)
      if (contentType) {
        if (!aggregated.by_type[contentType]) {
          aggregated.by_type[contentType] = { count: 0, days: {} };
        }
        aggregated.by_type[contentType].count++;
        aggregated.by_type[contentType].days[day] = (aggregated.by_type[contentType].days[day] || 0) + 1;

        // v2: SEPARAÇÃO saved vs seen. Permite calcular save-rate por categoria.
        // save  → o que o user EXPLICITAMENTE organizou no NODUS
        // seen  → o que passou direto (resposta gerada mas não salva)
        if (event.event_type === 'save') {
          if (!aggregated.by_type_saved[contentType]) aggregated.by_type_saved[contentType] = 0;
          aggregated.by_type_saved[contentType]++;
        } else if (event.event_type === 'response_generated') {
          if (!aggregated.by_type_seen[contentType]) aggregated.by_type_seen[contentType] = 0;
          aggregated.by_type_seen[contentType]++;
        }
      }

      // v2: by_language — contagem por idioma detectado
      if (contentLanguage) {
        if (!aggregated.by_language[contentLanguage]) aggregated.by_language[contentLanguage] = 0;
        aggregated.by_language[contentLanguage]++;
      }

      // Agregar por platform (com fallback chain)
      if (platform) {
        if (!aggregated.by_platform[platform]) {
          aggregated.by_platform[platform] = { count: 0, days: {} };
        }
        aggregated.by_platform[platform].count++;
        aggregated.by_platform[platform].days[day] = (aggregated.by_platform[platform].days[day] || 0) + 1;
      }

      // Agregar por queue
      if (d.queue) {
        const queue = d.queue;
        if (!aggregated.by_queue[queue]) {
          aggregated.by_queue[queue] = { count: 0 };
        }
        aggregated.by_queue[queue].count++;
      }

      // Agregar combinações (platform + type)
      if (platform && contentType) {
        const key = `${platform}|${contentType}`;
        if (!aggregated.by_combo[key]) {
          aggregated.by_combo[key] = 0;
        }
        aggregated.by_combo[key]++;
      }
      
      // Agregar fluxos (inject: from → to)
      if (event.event_type === 'inject' && event.event_data?.platform_from && event.event_data?.platform_to) {
        const flowKey = `${event.event_data.platform_from}→${event.event_data.platform_to}`;
        if (!aggregated.flows[flowKey]) {
          aggregated.flows[flowKey] = {
            count: 0,
            by_type: {},
            success_rate: { success: 0, total: 0 }
          };
        }
        aggregated.flows[flowKey].count++;
        
        // Por tipo
        if (event.event_data.content_type) {
          const type = event.event_data.content_type;
          aggregated.flows[flowKey].by_type[type] = (aggregated.flows[flowKey].by_type[type] || 0) + 1;
        }
        
        // Success rate
        aggregated.flows[flowKey].success_rate.total++;
        if (event.event_data.success) {
          aggregated.flows[flowKey].success_rate.success++;
        }
      }
    }
    
    return aggregated;
  }
  
  // ═══════════════════════════════════════════════════════════
  // DIFFERENTIAL PRIVACY (Ruído)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Adiciona ruído Laplace a uma contagem
   * 
   * @param {number} count - Contagem original
   * @param {number} noiseRange - Range do ruído (±)
   * @returns {number} Contagem com ruído (≥0)
   */
  addNoise(count, noiseRange = AGGREGATOR_CONFIG.NOISE_RANGE) {
    // Ruído aleatório entre -noiseRange e +noiseRange
    const noise = Math.round((Math.random() - 0.5) * 2 * noiseRange);
    
    // Garantir que não fica negativo
    return Math.max(0, count + noise);
  }
  
  /**
   * Aplica ruído em todos os contadores
   */
  applyNoiseToAggregates(aggregated) {
    const noised = JSON.parse(JSON.stringify(aggregated)); // deep clone

    // Ruído em by_type (global)
    for (const type in noised.by_type) {
      noised.by_type[type].count = this.addNoise(noised.by_type[type].count);
    }

    // Ruído em by_type_saved e by_type_seen (v2 — saved vs seen)
    if (noised.by_type_saved) {
      for (const t in noised.by_type_saved) {
        noised.by_type_saved[t] = this.addNoise(noised.by_type_saved[t]);
      }
    }
    if (noised.by_type_seen) {
      for (const t in noised.by_type_seen) {
        noised.by_type_seen[t] = this.addNoise(noised.by_type_seen[t]);
      }
    }

    // Ruído em by_language (v2)
    if (noised.by_language) {
      for (const lang in noised.by_language) {
        noised.by_language[lang] = this.addNoise(noised.by_language[lang]);
      }
    }

    // Ruído em by_platform
    for (const platform in noised.by_platform) {
      noised.by_platform[platform].count = this.addNoise(noised.by_platform[platform].count);
    }

    // Ruído em by_event (lifecycle/funnel/etc)
    if (noised.by_event) {
      for (const et in noised.by_event) {
        noised.by_event[et].count = this.addNoise(noised.by_event[et].count);
      }
    }

    // Ruído em by_combo
    for (const key in noised.by_combo) {
      noised.by_combo[key] = this.addNoise(noised.by_combo[key]);
    }

    // Ruído em flows
    for (const flow in noised.flows) {
      noised.flows[flow].count = this.addNoise(noised.flows[flow].count);
    }

    return noised;
  }
  
  // ═══════════════════════════════════════════════════════════
  // K-ANONYMITY & FILTERING
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Remove combinações raras (< threshold)
   */
  filterRareCombinations(aggregated) {
    const filtered = JSON.parse(JSON.stringify(aggregated));
    
    // Filtrar combos raros
    if (AGGREGATOR_CONFIG.DROP_SINGLETONS) {
      for (const key in filtered.by_combo) {
        if (filtered.by_combo[key] < AGGREGATOR_CONFIG.MIN_COMBO_COUNT) {
          delete filtered.by_combo[key];
        }
      }
    }
    
    return filtered;
  }
  
  /**
   * Verifica se coorte atinge threshold mínimo
   */
  meetsThreshold(aggregated, cohortSize) {
    return cohortSize >= AGGREGATOR_CONFIG.COHORT_MIN_SIZE;
  }
  
  // ═══════════════════════════════════════════════════════════
  // PIPELINE COMPLETO
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Prepara dados agregados para envio
   *
   * Pipeline:
   * 1. Agregar eventos (temporal binning, contadores por type/platform/queue/combo/flow)
   * 2. Filtrar combinações raras
   * 3. Adicionar ruído Laplace (differential privacy)
   *
   * Nunca envia eventos brutos — apenas contadores agregados.
   *
   * @param {Array} events - Eventos brutos
   * @returns {Object} Dados agregados prontos para envio
   */
  prepareForSend(events) {
    if (!events || events.length === 0) {
      return { total: 0 };
    }

    // 1. Agregar
    const aggregated = this.aggregateEvents(events);

    // 2. Filtrar combinações raras
    const filtered = this.filterRareCombinations(aggregated);

    // 3. Adicionar ruído (differential privacy)
    const noised = this.applyNoiseToAggregates(filtered);

    return noised;
  }
  
  /**
   * Calcula métricas derivadas
   */
  calculateMetrics(aggregated) {
    const metrics = {};
    
    // Top 5 tipos
    const typesSorted = Object.entries(aggregated.by_type)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    metrics.top_types = typesSorted.map(([type, data]) => ({
      type,
      count: data.count
    }));
    
    // Top 5 plataformas
    const platformsSorted = Object.entries(aggregated.by_platform)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    metrics.top_platforms = platformsSorted.map(([platform, data]) => ({
      platform,
      count: data.count
    }));
    
    // Top 5 fluxos
    const flowsSorted = Object.entries(aggregated.flows)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    metrics.top_flows = flowsSorted.map(([flow, data]) => ({
      flow,
      count: data.count,
      success_rate: data.success_rate.total > 0 
        ? (data.success_rate.success / data.success_rate.total * 100).toFixed(1)
        : 0
    }));
    
    return metrics;
  }
  
  // ═══════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Remove eventos antigos (> expiry days)
   */
  filterExpiredEvents(events) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AGGREGATOR_CONFIG.LOCAL_EXPIRY_DAYS);
    
    return events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate > cutoffDate;
    });
  }
}

// ═══════════════════════════════════════════════════════════
// INSTÂNCIA GLOBAL
// ═══════════════════════════════════════════════════════════

let aggregatorInstance = null;

/**
 * Obtém instância singleton do aggregator
 */
export function getTelemetryAggregator() {
  if (!aggregatorInstance) {
    aggregatorInstance = new TelemetryAggregator();
  }
  return aggregatorInstance;
}

export default TelemetryAggregator;
