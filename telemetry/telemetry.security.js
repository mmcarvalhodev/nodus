// ═══════════════════════════════════════════════════════════
// NODUS v3.2.0 - Telemetry Security & Anonymization
// ═══════════════════════════════════════════════════════════
// Sistema de identificação anônima com SHA-256
// Compliance: LGPD Art. 5º + GDPR Recital 26
// "Identificação sem Identidade"
// ═══════════════════════════════════════════════════════════

import { debug } from './telemetry.config.js';

const STORAGE_KEY = 'nodus_anon_id';
const SALT = 'NODUS_SALT_v3.2.0_ETHICAL_UBA'; // Salt fixo interno

/**
 * Gerenciador de Identidade Anônima
 */
export class TelemetrySecurity {
  
  // ═══════════════════════════════════════════════════════════
  // ANONYMOUS ID (SHA-256 + Salt)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Obtém ou gera ID anônimo
   * 
   * Este ID é:
   * - 🔐 Não reversível (SHA-256)
   * - 💾 Persistente por instalação
   * - ⚡ Gerado localmente
   * - 🧱 Sem dados pessoais
   * - ✅ LGPD/GDPR compliant
   * 
   * @returns {Promise<string>} Hash SHA-256 (hex)
   */
  async getAnonId() {
    try {
      // Verificar se já existe
      const result = await chrome.storage.local.get(STORAGE_KEY);
      
      if (result[STORAGE_KEY]) {
        debug('Using existing anon_id');
        return result[STORAGE_KEY];
      }
      
      // Gerar novo ID
      debug('Generating new anon_id');
      const anonId = await this.generateAnonId();
      
      // Salvar localmente (NUNCA no sync)
      await chrome.storage.local.set({ [STORAGE_KEY]: anonId });
      
      debug('Anon_id generated and saved:', anonId.substring(0, 16) + '...');
      
      return anonId;
      
    } catch (error) {
      console.error('[Telemetry Security] Error getting anon_id:', error);
      throw error;
    }
  }
  
  /**
   * Gera novo ID anônimo
   * 
   * Processo:
   * 1. Gera UUID v4 aleatório
   * 2. Combina com salt fixo
   * 3. Aplica SHA-256
   * 4. Retorna hash em hexadecimal
   */
  async generateAnonId() {
    try {
      // 1. UUID aleatório (crypto.randomUUID é Web Crypto API)
      const rawId = crypto.randomUUID();
      
      // 2. Combinar com salt
      const combined = rawId + SALT;
      
      // 3. Aplicar SHA-256
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // 4. Converter para hexadecimal
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
      
    } catch (error) {
      console.error('[Telemetry Security] Error generating hash:', error);
      
      // Fallback para navegadores sem crypto.subtle
      return this.generateFallbackId();
    }
  }
  
  /**
   * Fallback para ambientes sem Web Crypto API
   */
  generateFallbackId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const random2 = Math.random().toString(36).substring(2, 15);
    
    return `fallback_${timestamp}_${random}${random2}`;
  }
  
  // ═══════════════════════════════════════════════════════════
  // ID ROTATION (Opcional - reduz janela de correlação)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Rotaciona ID por versão
   * 
   * Chamado quando versão maior muda (ex: 3.x → 4.x)
   * Isso limita janela de correlação temporal
   */
  async rotateIdForVersion(currentVersion) {
    try {
      const result = await chrome.storage.local.get('nodus_anon_id_version');
      const savedVersion = result.nodus_anon_id_version;
      
      // Extrair versão maior (ex: "3.2.0" → "3")
      const currentMajor = currentVersion.split('.')[0];
      const savedMajor = savedVersion ? savedVersion.split('.')[0] : null;
      
      // Se versão maior mudou, rotacionar
      if (savedMajor && currentMajor !== savedMajor) {
        debug(`Version major changed: ${savedMajor} → ${currentMajor}, rotating ID`);
        
        // Gerar novo ID
        const newId = await this.generateAnonId();
        
        await chrome.storage.local.set({
          [STORAGE_KEY]: newId,
          nodus_anon_id_version: currentVersion
        });
        
        return newId;
      }
      
      // Salvar versão atual
      if (!savedVersion) {
        await chrome.storage.local.set({ nodus_anon_id_version: currentVersion });
      }
      
      return await this.getAnonId();
      
    } catch (error) {
      console.error('[Telemetry Security] Error rotating ID:', error);
      return await this.getAnonId();
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // DATA SANITIZATION
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Remove dados pessoais de um evento
   * 
   * Remove:
   * - Texto completo
   * - Títulos
   * - Tags personalizadas
   * - IDs de usuário
   * - Dados de navegação
   */
  sanitizeEvent(event) {
    const sanitized = { ...event };
    
    // Remover campos sensíveis
    const sensitiveFields = [
      'text',
      'title',
      'question',
      'answer',
      'tags',
      'userId',
      'email',
      'ip',
      'userAgent',
      'url',
      'url_origin',
      'url_destination',
      'prompt'
    ];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        // Manter apenas metadados (length, count, etc)
        if (typeof sanitized[field] === 'string') {
          sanitized[`${field}_length`] = sanitized[field].length;
        } else if (Array.isArray(sanitized[field])) {
          sanitized[`${field}_count`] = sanitized[field].length;
        }
        
        delete sanitized[field];
      }
    });
    
    return sanitized;
  }
  
  /**
   * Valida se evento está anonimizado
   */
  isEventAnonymized(event) {
    const forbiddenFields = [
      'text', 'title', 'question', 'answer', 
      'userId', 'email', 'ip'
    ];
    
    return !forbiddenFields.some(field => field in event);
  }
  
  // ═══════════════════════════════════════════════════════════
  // COMPLIANCE HELPERS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Gera relatório de compliance
   */
  async getComplianceReport() {
    const anonId = await this.getAnonId();
    
    return {
      anonymization: {
        method: 'SHA-256 + Salt',
        reversible: false,
        personal_data: false,
        compliance: 'LGPD Art. 5º + GDPR Recital 26'
      },
      id: {
        type: 'Anonymous hash',
        format: 'SHA-256 hexadecimal',
        sample: anonId.substring(0, 16) + '...',
        storage: 'chrome.storage.local (device only)',
        sync: false
      },
      data_collection: {
        text_content: false,
        personal_info: false,
        metadata_only: true,
        aggregated: true
      }
    };
  }
  
  /**
   * Limpa ID e dados (GDPR "Right to be forgotten")
   */
  async clearAnonId() {
    await chrome.storage.local.remove([STORAGE_KEY, 'nodus_anon_id_version']);
    debug('Anon_id cleared (right to be forgotten)');
  }
}

// ═══════════════════════════════════════════════════════════
// INSTÂNCIA GLOBAL
// ═══════════════════════════════════════════════════════════

let securityInstance = null;

/**
 * Obtém instância singleton do security manager
 */
export function getTelemetrySecurity() {
  if (!securityInstance) {
    securityInstance = new TelemetrySecurity();
  }
  return securityInstance;
}

export default TelemetrySecurity;
