// ═══════════════════════════════════════════════════════════════
// NODUS v3.0 - All Modules (Bundled)
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// NODUS - Sistema de Debug Centralizado
// ═══════════════════════════════════════════════════════════════
// Objetivo: Logging estruturado, rastreável e desligável
// ═══════════════════════════════════════════════════════════════

window.NodusDebug = {
  // ─────────────────────────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────────────────────────
  enabled: true, // Toggle geral (pode ser controlado via storage)
  levels: {
    ERROR: { enabled: true, emoji: '🔴', style: 'color: #ef4444; font-weight: bold' },
    WARN:  { enabled: true, emoji: '⚠️', style: 'color: #f59e0b; font-weight: bold' },
    INFO:  { enabled: true, emoji: 'ℹ️', style: 'color: #3b82f6' },
    DEBUG: { enabled: true, emoji: '🔍', style: 'color: #6b7280' },
    SUCCESS: { enabled: true, emoji: '✅', style: 'color: #10b981; font-weight: bold' },
    CRITICAL: { enabled: true, emoji: '💥', style: 'color: #dc2626; font-weight: bold; font-size: 14px' }
  },

  // ─────────────────────────────────────────────────────────────
  // MÉTODOS PRINCIPAIS
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Log genérico estruturado
   * @param {string} level - Nível do log (ERROR, WARN, INFO, DEBUG, SUCCESS, CRITICAL)
   * @param {string} module - Nome do módulo (ex: 'Gate', 'Capture', 'Storage')
   * @param {string} message - Mensagem principal
   * @param {*} data - Dados adicionais (opcional)
   */
  log(level, module, message, data = null) {
    if (!this.enabled) return;
    
    const levelConfig = this.levels[level];
    if (!levelConfig || !levelConfig.enabled) return;

    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.mmm
    const prefix = `${levelConfig.emoji} [${timestamp}] [${module}]`;
    
    if (data !== null) {
    } else {
    }
  },

  // ─────────────────────────────────────────────────────────────
  // ATALHOS DE CONVENIÊNCIA
  // ─────────────────────────────────────────────────────────────
  error(module, message, data) { this.log('ERROR', module, message, data); },
  warn(module, message, data) { this.log('WARN', module, message, data); },
  info(module, message, data) { this.log('INFO', module, message, data); },
  debug(module, message, data) { this.log('DEBUG', module, message, data); },
  success(module, message, data) { this.log('SUCCESS', module, message, data); },
  critical(module, message, data) { this.log('CRITICAL', module, message, data); },

  // ─────────────────────────────────────────────────────────────
  // MÉTODOS AUXILIARES
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Agrupa logs relacionados
   */
  group(module, title) {
    if (!this.enabled) return;
    console.group(`🔹 [${module}] ${title}`);
  },

  groupEnd() {
    if (!this.enabled) return;
    console.groupEnd();
  },

  /**
   * Mede tempo de execução
   */
  time(label) {
    if (!this.enabled) return;
    console.time(`⏱️ ${label}`);
  },

  timeEnd(label) {
    if (!this.enabled) return;
    console.timeEnd(`⏱️ ${label}`);
  },

  /**
   * Tabela de dados
   */
  table(module, title, data) {
    if (!this.enabled) return;
    console.table(data);
  },

  /**
   * Alerta visual no console (para debugging crítico)
   */
  banner(message) {
    if (!this.enabled) return;
    const line = '═'.repeat(60);
  },

  /**
   * Habilita/desabilita debug dinamicamente
   */
  async toggleDebug(enable) {
    this.enabled = enable;
    await chrome.storage.local.set({ nodus_debug_enabled: enable });
    this.info('Debug', `Debug ${enable ? 'HABILITADO' : 'DESABILITADO'}`);
  },

  /**
   * Carrega estado do debug (sempre habilitado em dev)
   */
  loadDebugState() {
    this.enabled = true;
  }
};



// ═══════════════════════════════════════════════════════════════
// NODUS - Storage Core
// ═══════════════════════════════════════════════════════════════
// Objetivo: Gerenciar todas operações de armazenamento
// ═══════════════════════════════════════════════════════════════

window.NodusStorage = {
  // ─────────────────────────────────────────────────────────────
  // DEFINIÇÃO DAS FILAS
  // ─────────────────────────────────────────────────────────────
  QUEUES: {
    QUICK: 'ideas_queue_quick',      // Lixeira temporária (FIFO 50)
    DEFAULT: 'ideas_queue_default',  // Fila padrão
    CUSTOM1: 'ideas_queue_custom1',  // Q1 - FREE
    CUSTOM2: 'ideas_queue_custom2',  // Q2 - PRO
    CUSTOM3: 'ideas_queue_custom3',  // Q3 - PRO
    CUSTOM4: 'ideas_queue_custom4'   // Q4 - PRO
  },

  // Limite FIFO para Quick Queue
  QUICK_QUEUE_LIMIT: 50,

  // ─────────────────────────────────────────────────────────────
  // INICIALIZAÇÃO
  // ─────────────────────────────────────────────────────────────
  async initialize() {
    NodusDebug.time('Storage.initialize');
    
    try {
      const queueKeys = Object.values(this.QUEUES);
      const stored = await chrome.storage.local.get(queueKeys);
      const updates = {};

      // Inicializar filas vazias se não existirem
      for (const key of queueKeys) {
        if (!Array.isArray(stored[key])) {
          updates[key] = [];
          NodusDebug.debug('Storage', `Fila criada: ${key}`);
        }
      }

      if (Object.keys(updates).length > 0) {
        await chrome.storage.local.set(updates);
        NodusDebug.success('Storage', 'Filas inicializadas', updates);
      } else {
        NodusDebug.info('Storage', 'Filas já existem');
      }

      NodusDebug.timeEnd('Storage.initialize');
      return true;
    } catch (error) {
      NodusDebug.error('Storage', 'Erro na inicialização', error);
      return false;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // SALVAR IDEIA
  // ─────────────────────────────────────────────────────────────
  async saveIdea(idea) {
    NodusDebug.time('Storage.saveIdea');
    NodusDebug.group('Storage', 'Salvando ideia');

    try {
      // Validação básica
      if (!idea || typeof idea !== 'object') {
        throw new Error('Ideia inválida');
      }

      // Garantir campos obrigatórios
      idea.id = idea.id || `idea_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      idea.date = idea.date || new Date().toISOString();
      idea.lastModified = new Date().toISOString();
      idea.tags = Array.isArray(idea.tags) ? idea.tags : [];

      // Determinar fila de destino
      let queueKey = idea.queue || this.QUEUES.DEFAULT;
      
      // Se não for uma fila válida, usar DEFAULT
      if (!Object.values(this.QUEUES).includes(queueKey)) {
        NodusDebug.warn('Storage', `Fila inválida "${queueKey}", usando DEFAULT`);
        queueKey = this.QUEUES.DEFAULT;
      }

      // ✅ VERIFICAR LICENÇA PARA QUEUES PRO (Q2, Q3, Q4)
      const proOnlyQueues = [
        this.QUEUES.CUSTOM2, 
        this.QUEUES.CUSTOM3, 
        this.QUEUES.CUSTOM4
      ];
      
      if (proOnlyQueues.includes(queueKey)) {
        if (!window.NodusLicense || !window.NodusLicense.isPro()) {
          NodusDebug.warn('Storage', `⚠️ Queue PRO bloqueada: ${queueKey}`);
          NodusDebug.groupEnd();
          NodusDebug.timeEnd('Storage.saveIdea');
          
          // Mostrar paywall
          const featureMap = {
            'ideas_queue_custom2': 'queue_q2',
            'ideas_queue_custom3': 'queue_q3',
            'ideas_queue_custom4': 'queue_q4'
          };
          
          if (window.NodusLicense) {
            window.NodusLicense.showPaywall(featureMap[queueKey]);
          }
          
          return {
            ok: false,
            requiresPro: true,
            message: 'This queue requires PRO license',
            queue: queueKey
          };
        }
      }

      NodusDebug.debug('Storage', `Destino: ${queueKey}`);

      // Buscar fila atual
      const stored = await chrome.storage.local.get(queueKey);
      let queue = stored[queueKey] || [];

      // ✨ VERIFICAR DUPLICATA
      const contentHash = this._generateContentHash(idea);
      const isDuplicate = queue.some(existingIdea => {
        const existingHash = this._generateContentHash(existingIdea);
        return existingHash === contentHash;
      });

      if (isDuplicate) {
        NodusDebug.warn('Storage', '⚠️ Ideia duplicada detectada!', {
          title: idea.title,
          queue: queueKey
        });
        NodusDebug.groupEnd();
        NodusDebug.timeEnd('Storage.saveIdea');
        
        return { 
          ok: false, 
          duplicate: true, 
          message: 'This idea is already saved in this queue',
          queueKey 
        };
      }

      // Se for Quick Queue, aplicar limite FIFO
      if (queueKey === this.QUEUES.QUICK && queue.length >= this.QUICK_QUEUE_LIMIT) {
        const removed = queue.shift(); // Remove o mais antigo
        NodusDebug.warn('Storage', `Quick Queue cheia, removido:`, removed);
      }

      // Adicionar ideia
      queue.push(idea);

      // Salvar
      await chrome.storage.local.set({ [queueKey]: queue });

      NodusDebug.success('Storage', `Ideia salva em ${queueKey}`, {
        id: idea.id,
        title: idea.title,
        queueSize: queue.length
      });

      NodusDebug.groupEnd();
      NodusDebug.timeEnd('Storage.saveIdea');

      return { ok: true, idea, queueKey };
    } catch (error) {
      NodusDebug.error('Storage', 'Erro ao salvar ideia', error);
      NodusDebug.groupEnd();
      NodusDebug.timeEnd('Storage.saveIdea');
      return { ok: false, error: error.message };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // BUSCAR IDEIAS DE UMA FILA
  // ─────────────────────────────────────────────────────────────
  async getIdeas(queueKey) {
    try {
      if (!Object.values(this.QUEUES).includes(queueKey)) {
        NodusDebug.warn('Storage', `Fila inválida: ${queueKey}`);
        return [];
      }

      const stored = await chrome.storage.local.get(queueKey);
      const ideas = stored[queueKey] || [];

      NodusDebug.debug('Storage', `Recuperadas ${ideas.length} ideias de ${queueKey}`);
      return ideas;
    } catch (error) {
      NodusDebug.error('Storage', 'Erro ao buscar ideias', error);
      return [];
    }
  },

  // ─────────────────────────────────────────────────────────────
  // BUSCAR TODAS IDEIAS (DE TODAS FILAS)
  // ─────────────────────────────────────────────────────────────
  async getAllIdeas() {
    try {
      const queueKeys = Object.values(this.QUEUES);
      const stored = await chrome.storage.local.get(queueKeys);
      
      let allIdeas = [];
      for (const key of queueKeys) {
        const ideas = stored[key] || [];
        allIdeas.push(...ideas);
      }

      // Ordenar por data (mais recente primeiro)
      allIdeas.sort((a, b) => new Date(b.date) - new Date(a.date));

      NodusDebug.debug('Storage', `Total de ideias: ${allIdeas.length}`);
      return allIdeas;
    } catch (error) {
      NodusDebug.error('Storage', 'Erro ao buscar todas ideias', error);
      return [];
    }
  },

  // ─────────────────────────────────────────────────────────────
  // BUSCAR ÚLTIMA IDEIA SALVA
  // ─────────────────────────────────────────────────────────────
  async getLastIdea() {
    try {
      const allIdeas = await this.getAllIdeas();
      const lastIdea = allIdeas[0] || null;

      if (lastIdea) {
        NodusDebug.debug('Storage', 'Última ideia:', lastIdea);
      } else {
        NodusDebug.info('Storage', 'Nenhuma ideia salva ainda');
      }

      return lastIdea;
    } catch (error) {
      NodusDebug.error('Storage', 'Erro ao buscar última ideia', error);
      return null;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // DELETAR IDEIA
  // ─────────────────────────────────────────────────────────────
  async deleteIdea(ideaId, queueKey) {
    try {
      if (!Object.values(this.QUEUES).includes(queueKey)) {
        throw new Error(`Fila inválida: ${queueKey}`);
      }

      const stored = await chrome.storage.local.get(queueKey);
      let queue = stored[queueKey] || [];

      const initialLength = queue.length;
      queue = queue.filter(idea => idea.id !== ideaId);

      if (queue.length === initialLength) {
        NodusDebug.warn('Storage', `Ideia ${ideaId} não encontrada em ${queueKey}`);
        return { ok: false, error: 'Ideia não encontrada' };
      }

      await chrome.storage.local.set({ [queueKey]: queue });

      NodusDebug.success('Storage', `Ideia ${ideaId} deletada de ${queueKey}`);
      return { ok: true };
    } catch (error) {
      NodusDebug.error('Storage', 'Erro ao deletar ideia', error);
      return { ok: false, error: error.message };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // LIMPAR FILA COMPLETA (cuidado!)
  // ─────────────────────────────────────────────────────────────
  async clearQueue(queueKey) {
    try {
      if (!Object.values(this.QUEUES).includes(queueKey)) {
        throw new Error(`Fila inválida: ${queueKey}`);
      }

      await chrome.storage.local.set({ [queueKey]: [] });
      NodusDebug.warn('Storage', `Fila ${queueKey} limpa completamente`);
      return { ok: true };
    } catch (error) {
      NodusDebug.error('Storage', 'Erro ao limpar fila', error);
      return { ok: false, error: error.message };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // ESTATÍSTICAS
  // ─────────────────────────────────────────────────────────────
  async getStats() {
    try {
      const queueKeys = Object.values(this.QUEUES);
      const stored = await chrome.storage.local.get(queueKeys);
      
      const stats = {};
      for (const [name, key] of Object.entries(this.QUEUES)) {
        const ideas = stored[key] || [];
        stats[name] = {
          key,
          count: ideas.length,
          oldest: ideas[0]?.date || null,
          newest: ideas[ideas.length - 1]?.date || null
        };
      }

      NodusDebug.table('Storage', 'Estatísticas', stats);
      return stats;
    } catch (error) {
      NodusDebug.error('Storage', 'Erro ao obter estatísticas', error);
      return {};
    }
  },

  // ─────────────────────────────────────────────────────────────
  // HELPER: GERAR HASH DE CONTEÚDO
  // ─────────────────────────────────────────────────────────────
  _generateContentHash(idea) {
    // Gerar hash simples baseado no conteúdo principal
    const content = [
      (idea.question || '').trim(),
      (idea.text || '').trim(),
      idea.platform,
      idea.source
    ].join('|').toLowerCase();
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════
if (typeof self !== 'undefined') {
  self.NodusStorage = NodusStorage;
}

NodusDebug.success('Storage', 'Módulo Storage v3.0 inicializado');

// ═══════════════════════════════════════════════════════════════
// NODUS - Router (Roteamento de Filas)
// ═══════════════════════════════════════════════════════════════
// Objetivo: Decidir em qual fila uma ideia deve ser salva
// Baseado em: tags, captureMethod, e regras configuráveis
// ═══════════════════════════════════════════════════════════════

window.NodusRouter = {
  // ─────────────────────────────────────────────────────────────
  // CONFIGURAÇÃO DE TAGS → FILAS
  // ─────────────────────────────────────────────────────────────
  tagRules: {
    // Tags especiais que forçam roteamento para Quick
    '__quick__': 'QUICK',
    'quick': 'QUICK',
    
    // Tags que direcionam para Custom1 (exemplos configuráveis)
    'importante': 'CUSTOM1',
    'favorite': 'CUSTOM1',
    'star': 'CUSTOM1',
    'priority': 'CUSTOM1',
    
    // Adicione mais regras conforme necessário
    // 'projeto-x': 'CUSTOM1',
    // 'estudo': 'CUSTOM1',
  },

  // ─────────────────────────────────────────────────────────────
  // ROTEAMENTO PRINCIPAL
  // ─────────────────────────────────────────────────────────────
  /**
   * Determina a fila de destino baseado nas características da ideia
   * @param {Object} idea - Objeto da ideia
   * @returns {string} - Chave da fila (QUEUES.XXX)
   */
  route(idea) {
    NodusDebug.group('Router', 'Roteando ideia');

    try {
      // 1. Se a fila já foi especificada manualmente, respeitar
      if (idea.queue && this.isValidQueue(idea.queue)) {
        NodusDebug.info('Router', `Roteamento MANUAL: ${idea.queue}`);
        NodusDebug.groupEnd();
        return idea.queue;
      }

      // 2. Se captureMethod é 'quick', sempre vai para Quick Queue
      if (idea.captureMethod === 'quick') {
        NodusDebug.info('Router', 'Roteamento por captureMethod: QUICK');
        NodusDebug.groupEnd();
        return NodusStorage.QUEUES.QUICK;
      }

      // 3. Verificar tags (prioridade)
      const tags = Array.isArray(idea.tags) ? idea.tags : [];
      for (const tag of tags) {
        const normalizedTag = tag.toLowerCase().trim();
        const queueName = this.tagRules[normalizedTag];
        
        if (queueName && NodusStorage.QUEUES[queueName]) {
          const queueKey = NodusStorage.QUEUES[queueName];
          NodusDebug.info('Router', `Roteamento por tag "${tag}": ${queueKey}`);
          NodusDebug.groupEnd();
          return queueKey;
        }
      }

      // 4. Fallback: DEFAULT
      NodusDebug.info('Router', 'Roteamento padrão: DEFAULT');
      NodusDebug.groupEnd();
      return NodusStorage.QUEUES.DEFAULT;

    } catch (error) {
      NodusDebug.error('Router', 'Erro no roteamento, usando DEFAULT', error);
      NodusDebug.groupEnd();
      return NodusStorage.QUEUES.DEFAULT;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // VALIDAÇÃO DE FILA
  // ─────────────────────────────────────────────────────────────
  isValidQueue(queueKey) {
    return Object.values(NodusStorage.QUEUES).includes(queueKey);
  },

  // ─────────────────────────────────────────────────────────────
  // ADICIONAR REGRA DE TAG DINAMICAMENTE
  // ─────────────────────────────────────────────────────────────
  addTagRule(tag, queueName) {
    if (!NodusStorage.QUEUES[queueName]) {
      NodusDebug.error('Router', `Fila inválida: ${queueName}`);
      return false;
    }

    this.tagRules[tag.toLowerCase()] = queueName;
    NodusDebug.success('Router', `Regra adicionada: "${tag}" → ${queueName}`);
    return true;
  },

  // ─────────────────────────────────────────────────────────────
  // REMOVER REGRA DE TAG
  // ─────────────────────────────────────────────────────────────
  removeTagRule(tag) {
    const normalizedTag = tag.toLowerCase();
    if (this.tagRules[normalizedTag]) {
      delete this.tagRules[normalizedTag];
      NodusDebug.success('Router', `Regra removida: "${tag}"`);
      return true;
    }
    NodusDebug.warn('Router', `Regra não encontrada: "${tag}"`);
    return false;
  },

  // ─────────────────────────────────────────────────────────────
  // LISTAR REGRAS ATUAIS
  // ─────────────────────────────────────────────────────────────
  listRules() {
    NodusDebug.group('Router', 'Regras de Roteamento');
    console.table(this.tagRules);
    NodusDebug.groupEnd();
    return this.tagRules;
  },

  // ─────────────────────────────────────────────────────────────
  // PROCESSAR IDEIA COMPLETA (route + save)
  // ─────────────────────────────────────────────────────────────
  async processIdea(idea) {
    NodusDebug.time('Router.processIdea');

    try {
      // 1. Determinar fila
      const queueKey = this.route(idea);
      idea.queue = queueKey;

      // 2. Salvar usando Storage
      const result = await NodusStorage.saveIdea(idea);

      NodusDebug.timeEnd('Router.processIdea');
      return result;

    } catch (error) {
      NodusDebug.error('Router', 'Erro ao processar ideia', error);
      NodusDebug.timeEnd('Router.processIdea');
      return { ok: false, error: error.message };
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════
if (typeof self !== 'undefined') {
  self.NodusRouter = NodusRouter;
}

NodusDebug.success('Router', 'Módulo Router v3.0 inicializado');

// ═══════════════════════════════════════════════════════════════
// NODUS - UI Module (Toast e Feedback Visual)
// ═══════════════════════════════════════════════════════════════
// Objetivo: Feedback visual não-bloqueante para o usuário
// ═══════════════════════════════════════════════════════════════

window.NodusUI = {
  // ─────────────────────────────────────────────────────────────
  // CONFIGURAÇÕES
  // ─────────────────────────────────────────────────────────────
  TOAST_DURATION: 3000, // 3 segundos
  TOAST_CONTAINER_ID: 'nodus-toast-container',
  
  toastQueue: [], // Fila de toasts ativos

  // ─────────────────────────────────────────────────────────────
  // TIPOS DE TOAST
  // ─────────────────────────────────────────────────────────────
  TOAST_TYPES: {
    success: {
      bgColor: '#10b981',
      icon: '✅',
      textColor: '#ffffff'
    },
    error: {
      bgColor: '#ef4444',
      icon: '❌',
      textColor: '#ffffff'
    },
    warning: {
      bgColor: '#f59e0b',
      icon: '⚠️',
      textColor: '#ffffff'
    },
    info: {
      bgColor: '#3b82f6',
      icon: 'ℹ️',
      textColor: '#ffffff'
    }
  },

  // ─────────────────────────────────────────────────────────────
  // CRIAR CONTAINER DE TOASTS (se não existe)
  // ─────────────────────────────────────────────────────────────
  ensureContainer() {
    let container = document.getElementById(this.TOAST_CONTAINER_ID);
    
    if (!container) {
      container = document.createElement('div');
      container.id = this.TOAST_CONTAINER_ID;
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
      NodusDebug.debug('UI', 'Container de toasts criado');
    }
    
    return container;
  },

  // ─────────────────────────────────────────────────────────────
  // MOSTRAR TOAST
  // ─────────────────────────────────────────────────────────────
  showToast(message, type = 'info') {
    NodusDebug.info('UI', `Toast [${type}]: ${message}`);

    try {
      // Validar tipo
      if (!this.TOAST_TYPES[type]) {
        NodusDebug.warn('UI', `Tipo de toast inválido: ${type}, usando 'info'`);
        type = 'info';
      }

      const config = this.TOAST_TYPES[type];
      const container = this.ensureContainer();

      // Criar elemento do toast
      const toast = document.createElement('div');
      toast.className = 'nodus-toast';
      toast.style.cssText = `
        background: ${config.bgColor};
        color: ${config.textColor};
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 200px;
        max-width: 400px;
        pointer-events: auto;
        cursor: pointer;
        animation: slideIn 0.3s ease;
      `;

      // Adicionar animação CSS
      if (!document.getElementById('nodus-toast-animations')) {
        const style = document.createElement('style');
        style.id = 'nodus-toast-animations';
        style.textContent = `
          @keyframes slideIn {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(400px);
              opacity: 0;
            }
          }
          .nodus-toast:hover {
            transform: scale(1.02);
            transition: transform 0.2s;
          }
        `;
        document.head.appendChild(style);
      }

      // Conteúdo do toast
      toast.innerHTML = `
        <span style="font-size: 18px;">${config.icon}</span>
        <span style="flex: 1;">${message}</span>
      `;

      // Adicionar ao container
      container.appendChild(toast);
      this.toastQueue.push(toast);

      // Clicar para remover
      toast.addEventListener('click', () => {
        this.removeToast(toast);
      });

      // Auto-remover após duração
      setTimeout(() => {
        this.removeToast(toast);
      }, this.TOAST_DURATION);

      NodusDebug.success('UI', 'Toast exibido', { message, type });
      return toast;

    } catch (error) {
      NodusDebug.error('UI', 'Erro ao mostrar toast', error);
      return null;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // REMOVER TOAST
  // ─────────────────────────────────────────────────────────────
  removeToast(toast) {
    if (!toast || !toast.parentNode) return;

    try {
      // Animação de saída
      toast.style.animation = 'slideOut 0.3s ease';
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        
        // Remover da fila
        const index = this.toastQueue.indexOf(toast);
        if (index > -1) {
          this.toastQueue.splice(index, 1);
        }

        NodusDebug.debug('UI', 'Toast removido');
      }, 300);

    } catch (error) {
      NodusDebug.error('UI', 'Erro ao remover toast', error);
    }
  },

  // ─────────────────────────────────────────────────────────────
  // LIMPAR TODOS OS TOASTS
  // ─────────────────────────────────────────────────────────────
  clearAllToasts() {
    const container = document.getElementById(this.TOAST_CONTAINER_ID);
    if (container) {
      container.innerHTML = '';
    }
    this.toastQueue = [];
    NodusDebug.info('UI', 'Todos os toasts removidos');
  },

  // ─────────────────────────────────────────────────────────────
  // ATALHOS DE CONVENIÊNCIA
  // ─────────────────────────────────────────────────────────────
  success(message) {
    return this.showToast(message, 'success');
  },

  error(message) {
    return this.showToast(message, 'error');
  },

  warning(message) {
    return this.showToast(message, 'warning');
  },

  info(message) {
    return this.showToast(message, 'info');
  },

  // ─────────────────────────────────────────────────────────────
  // TOAST COM AÇÃO (botão de ação)
  // ─────────────────────────────────────────────────────────────
  showActionToast(message, type, actionText, actionCallback) {
    const toast = this.showToast(message, type);
    
    if (toast && actionText && actionCallback) {
      const actionBtn = document.createElement('button');
      actionBtn.textContent = actionText;
      actionBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      `;
      
      actionBtn.addEventListener('mouseenter', () => {
        actionBtn.style.background = 'rgba(255, 255, 255, 0.3)';
      });
      
      actionBtn.addEventListener('mouseleave', () => {
        actionBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      });
      
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actionCallback();
        this.removeToast(toast);
      });
      
      toast.appendChild(actionBtn);
    }
    
    return toast;
  },

  // ─────────────────────────────────────────────────────────────
  // ESTATÍSTICAS
  // ─────────────────────────────────────────────────────────────
  getStats() {
    return {
      activeToasts: this.toastQueue.length,
      types: Object.keys(this.TOAST_TYPES)
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════
if (typeof self !== 'undefined') {
  self.NodusUI = NodusUI;
}

NodusDebug.success('UI', 'Módulo UI v3.0 inicializado');

// ═══════════════════════════════════════════════════════════════
// NODUS - Panel NQ (Modal Save Complexo)
// ═══════════════════════════════════════════════════════════════
// Objetivo: Modal lateral para edição completa de ideias
// Features: Título, Pergunta, Resposta, Tags (máx 4), Bolinhas
// ═══════════════════════════════════════════════════════════════

window.NodusPanelNQ = {
  // ─────────────────────────────────────────────────────────────
  // CONFIGURAÇÕES
  // ─────────────────────────────────────────────────────────────
  PANEL_ID: 'nodus-panel-nq',
  OVERLAY_ID: 'nodus-panel-overlay',
  PICKER_ID: 'nq-queue-picker',
  MAX_TAGS: 4,
  
  currentIdeaData: null,
  currentTags: [], // Array de objetos: { name: string, queueKey: string }
  attachmentsToUpload: [], // Array temporário para arquivos a serem anexados
  
  // Estado temporário das bolinhas de sugestão
  suggestedTagsQueueState: {}, // { tagName: queueKey }

  // ─────────────────────────────────────────────────────────────
  // TAGS SUGERIDAS (com cores próprias)
  // ─────────────────────────────────────────────────────────────
  SUGGESTED_TAGS: [
    { name: 'CHATGPT', color: '#10b981' },     // Verde
    { name: 'CLAUDE', color: '#8b5cf6' },      // Roxo
    { name: 'GEMINI', color: '#f59e0b' },      // Laranja
    { name: 'COPILOT', color: '#3b82f6' },     // Azul
    { name: 'GROK', color: '#ec4899' },        // Rosa
    { name: 'PERPLEXITY', color: '#06b6d4' },  // Ciano
    { name: 'NEWS', color: '#ef4444' },        // Vermelho
    { name: 'TECH', color: '#6366f1' },        // Indigo
    { name: 'FITNESS', color: '#14b8a6' },     // Teal
    { name: 'BOOK', color: '#f97316' },        // Laranja escuro
    { name: 'WRITING', color: '#a855f7' }      // Roxo claro
  ],
  
  // Persistência da escolha de fila
  defaultQueue: 'ideas_queue_default', // Fila padrão persistente

  // ─────────────────────────────────────────────────────────────
  // FILAS DISPONÍVEIS (cores e nomes)
  // ─────────────────────────────────────────────────────────────
  QUEUE_CONFIG: {
    'ideas_queue_quick': {
      name: 'QUICK',
      color: '#fbbf24',      // Amarelo
      priority: 1
    },
    'ideas_queue_default': {
      name: 'DEFAULT',
      color: '#10b981',      // Verde
      priority: 2
    },
    'ideas_queue_custom1': {
      name: 'QUEUE 1',
      color: '#3b82f6',      // Azul
      priority: 3,
      tier: 'free'           // FREE
    },
    'ideas_queue_custom2': {
      name: 'QUEUE 2',
      color: '#8b5cf6',      // Roxo
      priority: 4,
      tier: 'pro'            // PRO
    },
    'ideas_queue_custom3': {
      name: 'QUEUE 3',
      color: '#ec4899',      // Rosa
      priority: 5,
      tier: 'pro'            // PRO
    },
    'ideas_queue_custom4': {
      name: 'QUEUE 4',
      color: '#f97316',      // Laranja
      priority: 6,
      tier: 'pro'            // PRO
    }
  },

  // ─────────────────────────────────────────────────────────────
  // ABRIR MODAL
  // ─────────────────────────────────────────────────────────────
  open(ideaData) {
    NodusDebug.group('PanelNQ', 'Abrindo modal');
    NodusDebug.info('PanelNQ', 'IdeaData recebida', ideaData);

    try {
      if (!ideaData || typeof ideaData !== 'object') {
        throw new Error('IdeaData inválida');
      }

      this.close();

      this.currentIdeaData = { ...ideaData };
      
      // Inicializar tags com fila default E cor
      this.currentTags = (ideaData.tags || []).map(tagName => {
        const suggestedTag = this.SUGGESTED_TAGS.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        return {
          name: tagName,
          queueKey: 'ideas_queue_default',
          color: suggestedTag ? suggestedTag.color : '#6b7280' // Usa cor da tag sugerida ou cinza
        };
      });
      
      // Resetar estado das bolinhas de sugestão
      this.suggestedTagsQueueState = {};

      this.createOverlay();
      this.createPanel();
      this.fillFields();
      this.renderTags();
      this.renderSuggestedTags();
      this.updateQueuePreview();

      NodusDebug.success('PanelNQ', 'Modal aberto');
      NodusDebug.groupEnd();

    } catch (error) {
      NodusDebug.error('PanelNQ', 'Erro ao abrir modal', error);
      NodusDebug.groupEnd();
      NodusUI.showToast('❌ Erro ao abrir modal', 'error');
    }
  },

  // ─────────────────────────────────────────────────────────────
  // CRIAR OVERLAY
  // ─────────────────────────────────────────────────────────────
  createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = this.OVERLAY_ID;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 999998;
      backdrop-filter: blur(2px);
      animation: fadeIn 0.3s ease;
    `;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    document.body.appendChild(overlay);
  },

  // ─────────────────────────────────────────────────────────────
  // CRIAR PAINEL
  // ─────────────────────────────────────────────────────────────
  createPanel() {
    const _t = (key, fb) => (window.NodusI18n ? window.NodusI18n.t(key) : fb);
    const panel = document.createElement('div');
    panel.id = this.PANEL_ID;
    panel.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      height: 100%;
      background: #0e1117;
      color: #e2e8f0;
      z-index: 999999;
      box-shadow: -4px 0 32px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      border-left: 1px solid #262b36;
    `;

    // Adicionar animações
    if (!document.getElementById('nodus-panel-animations')) {
      const style = document.createElement('style');
      style.id = 'nodus-panel-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @keyframes pulse-led {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }

    panel.innerHTML = `
      <!-- CABEÇALHO -->
      <div style="
        padding: 24px;
        border-bottom: 1px solid #262b36;
        background: linear-gradient(135deg, #1a1f29 0%, #0e1117 100%);
      ">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
          <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #facc15 0%, #f59e0b 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          ">💡</div>
          <div>
            <div style="font-size: 20px; font-weight: 700; color: #facc15;">NODUS</div>
            <div style="font-size: 12px; color: #64748b;">${_t('save.title', 'SAVE IDEA')}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #64748b;">
          <span id="nq-platform-name">Platform</span>
          <span>•</span>
          <span id="nq-timestamp">--:--</span>
          <a 
            id="nq-source-link" 
            href="#" 
            target="_blank" 
            title="Open original URL"
            style="color: #64748b; text-decoration: none; display: inline-flex; align-items: center; margin-left: 4px;"
          >🔗</a>
        </div>
      </div>

      <!-- FILE DETECTION ALERT -->
      <div id="nq-file-alert" style="display: none; background: linear-gradient(135deg, #ff8c00 0%, #ffa500 100%); color: #000; padding: 12px 16px; margin: 0 20px 16px 20px; border-radius: 8px; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 500; animation: slideDown 0.3s ease-out;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>⚠️</span>
          <span id="nq-file-alert-text">${_t('save.fileAlert', 'This response seems to contain a file')}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="nq-attach-file-btn" style="background: rgba(0, 0, 0, 0.2); border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; color: #000; display: flex; align-items: center; gap: 4px;">
            ${_t('save.attachFile', '⬆️ Attach file')}
          </button>
          <button id="nq-dismiss-alert-btn" style="background: rgba(0, 0, 0, 0.2); border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; color: #000;">
            ${_t('save.dismiss', '❌ Dismiss')}
          </button>
        </div>
      </div>
      <input type="file" id="nq-file-input" multiple style="display: none;">

      <!-- CONTEÚDO ROLÁVEL -->
      <div style="
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      ">
        <!-- Título -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">
            ${_t('save.fieldTitle', 'Title')}
          </label>
          <input
            id="nq-title-input"
            type="text"
            placeholder="${_t('save.titlePlaceholder', 'Enter a title...')}"
            style="
              width: 100%;
              padding: 8px 12px;
              background: #1a1f29;
              border: 1px solid #262b36;
              border-radius: 6px;
              color: #e2e8f0;
              font-size: 13px;
              box-sizing: border-box;
              transition: border-color 0.2s;
            "
          />
        </div>

        <!-- Pergunta (readonly) -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">
            ${_t('save.fieldQuestion', 'Question')}
          </label>
          <textarea 
            id="nq-question-textarea" 
            readonly
            style="
              width: 100%;
              min-height: 40px;
              padding: 8px 12px;
              background: #1a1f29;
              border: 1px solid #262b36;
              border-radius: 6px;
              color: #94a3b8;
              font-size: 12px;
              resize: vertical;
              box-sizing: border-box;
            "
          ></textarea>
        </div>

        <!-- Resposta -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">
            ${_t('save.fieldAnswer', 'Answer')}
          </label>
          <textarea
            id="nq-response-textarea"
            placeholder="${_t('save.responsePlaceholder', 'Edit the response...')}"
            style="
              width: 100%;
              min-height: 80px;
              padding: 8px 12px;
              background: #1a1f29;
              border: 1px solid #262b36;
              border-radius: 6px;
              color: #e2e8f0;
              font-size: 12px;
              line-height: 1.5;
              resize: vertical;
              box-sizing: border-box;
            "
          ></textarea>
        </div>

        <!-- Tags Adicionadas -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">
            ${_t('save.fieldTags', 'Tags (max 4)')}
          </label>
          <div id="nq-tags-display" style="
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            min-height: 26px;
            padding: 5px;
            background: transparent;
            border: 1px solid #262b36;
            border-radius: 6px;
          "></div>
        </div>

        <!-- Preview de Destino -->
        <div style="
          margin-bottom: 16px;
          padding: 10px 14px;
          background: rgba(59, 130, 246, 0.08);
          border-left: 3px solid #3b82f6;
          border-radius: 6px;
          font-size: 12px;
          color: #94a3b8;
        ">
          <strong style="color: #60a5fa;">${_t('save.destination', 'DEST:')}</strong>
          <span id="nq-queue-preview" style="color: #e2e8f0; margin-left: 8px;">DEFAULT</span>
        </div>

        <!-- Adicionar Tags -->
        <div style="
          padding: 16px;
          background: rgba(59, 130, 246, 0.03);
          border: 1px solid #262b36;
          border-radius: 8px;
        ">
          <div style="
            margin-bottom: 10px;
            font-size: 11px;
            font-weight: 600;
            color: #94a3b8;
            text-transform: uppercase;
          ">
            ${_t('save.addTags', 'Add Tags')}
          </div>
          
          <!-- Tags Sugeridas -->
          <div id="nq-suggested-tags" style="
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 12px;
          "></div>

          <!-- Input Nova Tag -->
          <div style="display: flex; gap: 6px;">
            <input 
              id="nq-new-tag-input" 
              type="text" 
              placeholder="${_t('save.tagPlaceholder', 'New tag...')}"
              style="
                flex: 1;
                padding: 6px 10px;
                background: #1a1f29;
                border: 1px solid #262b36;
                border-radius: 5px;
                color: #e2e8f0;
                font-size: 12px;
              "
            />
            <button id="nq-add-tag-btn" style="
              padding: 6px 14px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 5px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s;
            ">
              ${_t('save.addTagBtn', 'ADD')}
            </button>
          </div>
        </div>
      </div>

      <!-- RODAPÉ -->
      <div style="
        padding: 16px 20px;
        border-top: 1px solid #262b36;
        display: flex;
        gap: 10px;
        background: #0e1117;
      ">
        <button id="nq-cancel-btn" style="
          flex: 1;
          padding: 10px;
          background: #374151;
          color: #e5e7eb;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">
          ❌ ${_t('save.cancel', 'CANCEL')}
        </button>
        <button id="nq-save-btn" style="
          flex: 1;
          padding: 10px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ✅ ${_t('save.save', 'SAVE')}
        </button>
      </div>

      <!-- Queue Picker (popup temporário) -->
      <div id="nq-queue-picker" style="
        display: none;
        position: absolute;
        background: #1e293b;
        border: 1px solid #3b82f6;
        border-radius: 8px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10;
      "></div>
    `;

    document.body.appendChild(panel);

    // Adicionar event listeners
    this.attachEventListeners();

    // Renderizar tags sugeridas
    this.renderSuggestedTags();
  },

  // ─────────────────────────────────────────────────────────────
  // PREENCHER CAMPOS
  // ─────────────────────────────────────────────────────────────
  fillFields() {
    const data = this.currentIdeaData;

    // Cabeçalho
    document.getElementById('nq-platform-name').textContent = data.source || 'Platform';
    const date = new Date(data.date);
    document.getElementById('nq-timestamp').textContent = 
      `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    // Link de origem
    const sourceLink = document.getElementById('nq-source-link');
    if (sourceLink && data.sourceUrl) {
      sourceLink.href = data.sourceUrl;
      sourceLink.title = data.sourceUrl;
    }

    // Campos
    document.getElementById('nq-title-input').value = data.title || '';
    document.getElementById('nq-question-textarea').value = data.question || '';
    document.getElementById('nq-response-textarea').value = this._cleanAnswerText(data.text || '');

    // Renderizar tags
    this.renderTags();
  },

  // Strip markdown noise from captured answer before showing in textarea
  _cleanAnswerText(text) {
    if (!text) return '';
    let s = text;
    // Remove images ![alt](url) entirely — useless in plain text
    s = s.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    // Remove reference-style image lines: [id]: url "title"
    s = s.replace(/^\[[^\]]+\]:\s*https?:\/\/\S+.*$/gm, '');
    // Remove links [text](url) → keep text
    s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remove headers (# ## ###)
    s = s.replace(/^#{1,6}\s+/gm, '');
    // Remove bold/italic (**text**, *text*, __text__, _text_)
    s = s.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1');
    s = s.replace(/_{1,2}([^_]+)_{1,2}/g, '$1');
    // Remove inline code
    s = s.replace(/`([^`]+)`/g, '$1');
    // Remove blockquotes
    s = s.replace(/^>\s*/gm, '');
    // Collapse excessive blank lines
    s = s.replace(/\n{3,}/g, '\n\n');
    return s.trim();
  },

  // ─────────────────────────────────────────────────────────────
  // RENDERIZAR TAGS ADICIONADAS
  // ─────────────────────────────────────────────────────────────
  renderTags() {
    const container = document.getElementById('nq-tags-display');
    container.innerHTML = '';

    this.currentTags.forEach(tag => {
      const tagEl = this.createTagElement(tag);
      container.appendChild(tagEl);
    });

    NodusDebug.debug('PanelNQ', 'Tags renderizadas', this.currentTags);
  },

  // ─────────────────────────────────────────────────────────────
  // CRIAR ELEMENTO DE TAG (com bolinha colorida)
  // ─────────────────────────────────────────────────────────────
  createTagElement(tagObj) {
    const { name, queueKey, color: tagColor } = tagObj;
    const queueColor = this.QUEUE_CONFIG[queueKey].color;
    
    NodusDebug.debug('PanelNQ', `Criando tag "${name}" - queueKey: ${queueKey}, queueColor: ${queueColor}, tagColor: ${tagColor}`);
    
    const tag = document.createElement('div');
    tag.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: ${tagColor};
      border: 1px solid ${tagColor};
      border-radius: 12px;
      font-size: 10px;
      color: white;
      text-transform: uppercase;
      font-weight: 700;
      transition: all 0.2s;
      line-height: 1.4;
    `;

    // Bolinha LED (indica fila) - CLICÁVEL para mudar fila
    const dot = document.createElement('button');
    dot.textContent = '●';
    dot.className = 'nq-added-tag-queue-dot';
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, ${queueColor}, ${queueColor} 60%, rgba(0,0,0,0.4));
      color: transparent;
      display: inline-block;
      flex-shrink: 0;
      box-shadow: 0 0 6px ${queueColor}, 0 0 10px ${queueColor}, inset 0 0 2px rgba(255,255,255,0.5);
      animation: pulse-led 2s ease-in-out infinite;
      cursor: pointer;
      transition: transform 0.2s;
    `;
    
    // Hover na bolinha
    dot.addEventListener('mouseenter', () => {
      dot.style.transform = 'scale(1.3)';
    });
    
    dot.addEventListener('mouseleave', () => {
      dot.style.transform = 'scale(1)';
    });
    
    // Clique na bolinha abre picker para mudar fila
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      NodusDebug.info('PanelNQ', `🔘 Clicou no LED da tag: "${name}"`);
      NodusDebug.info('PanelNQ', `   currentTags disponíveis:`, this.currentTags.map(t => t.name));
      this.openQueuePickerForAddedTag(dot, name);
    });

    // Nome da tag
    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    nameSpan.style.fontWeight = '500';

    // Botão remover
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.dataset.tag = name;
    removeBtn.style.cssText = `
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      padding: 0;
      margin-left: 2px;
      font-size: 12px;
      line-height: 1;
      transition: color 0.2s;
    `;
    
    removeBtn.addEventListener('mouseenter', () => {
      removeBtn.style.color = '#dc2626';
    });
    
    removeBtn.addEventListener('mouseleave', () => {
      removeBtn.style.color = '#ef4444';
    });
    
    removeBtn.addEventListener('click', () => {
      this.removeTag(name);
    });

    tag.appendChild(dot);
    tag.appendChild(nameSpan);
    tag.appendChild(removeBtn);

    // Hover effect
    tag.addEventListener('mouseenter', () => {
      tag.style.transform = 'scale(1.05)';
      tag.style.boxShadow = `0 0 10px ${tagColor}`;
      tag.style.opacity = '0.9';
    });
    
    tag.addEventListener('mouseleave', () => {
      tag.style.transform = 'scale(1)';
      tag.style.boxShadow = 'none';
      tag.style.opacity = '1';
    });

    return tag;
  },

  // ─────────────────────────────────────────────────────────────
  // RENDERIZAR TAGS SUGERIDAS (com bolinhas)
  // ─────────────────────────────────────────────────────────────
  renderSuggestedTags() {
    const container = document.getElementById('nq-suggested-tags');
    container.innerHTML = '';
    
    this.SUGGESTED_TAGS.forEach(tagConfig => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        display: flex;
        align-items: center;
        gap: 3px;
      `;

      // Botão da tag
      const btn = document.createElement('button');
      btn.textContent = `+${tagConfig.name}`;
      btn.style.cssText = `
        padding: 2px 8px;
        background: ${tagConfig.color};
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        line-height: 1.4;
      `;
      
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = `0 0 8px ${tagConfig.color}`;
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = 'none';
      });
      
      btn.addEventListener('click', () => {
        // Usar a fila específica desta tag OU defaultQueue
        const queueKey = this.suggestedTagsQueueState[tagConfig.name] || this.defaultQueue;
        this.addTag(tagConfig.name, queueKey, tagConfig.color);
      });

      // Bolinha LED [º]
      const dot = document.createElement('button');
      dot.textContent = '●';
      dot.className = 'nq-suggest-tag-queue-dot';
      dot.dataset.tagName = tagConfig.name;
      
      // Pegar cor da fila específica desta tag OU defaultQueue
      const currentQueue = this.suggestedTagsQueueState[tagConfig.name] || this.defaultQueue;
      const dotColor = this.QUEUE_CONFIG[currentQueue].color;
      
      dot.style.cssText = `
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, ${dotColor}, ${dotColor} 60%, rgba(0,0,0,0.4));
        border: none;
        color: ${dotColor};
        font-size: 8px;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 6px ${dotColor}, 0 0 12px ${dotColor}, inset 0 0 3px rgba(255,255,255,0.3);
        animation: pulse-led 2s ease-in-out infinite;
      `;
      
      dot.addEventListener('mouseenter', () => {
        dot.style.transform = 'scale(1.15)';
        const hoverQueue = this.suggestedTagsQueueState[tagConfig.name] || this.defaultQueue;
        const hoverColor = this.QUEUE_CONFIG[hoverQueue].color;
        dot.style.boxShadow = `0 0 8px ${hoverColor}, 0 0 16px ${hoverColor}, inset 0 0 4px rgba(255,255,255,0.5)`;
      });
      
      dot.addEventListener('mouseleave', () => {
        dot.style.transform = 'scale(1)';
        const leaveQueue = this.suggestedTagsQueueState[tagConfig.name] || this.defaultQueue;
        const leaveColor = this.QUEUE_CONFIG[leaveQueue].color;
        dot.style.boxShadow = `0 0 6px ${leaveColor}, 0 0 12px ${leaveColor}, inset 0 0 3px rgba(255,255,255,0.3)`;
      });
      
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openQueuePicker(dot, tagConfig.name);
      });

      wrapper.appendChild(btn);
      wrapper.appendChild(dot);
      container.appendChild(wrapper);
    });
    
    NodusDebug.debug('PanelNQ', 'Tags sugeridas renderizadas com bolinhas');
  },

  // ─────────────────────────────────────────────────────────────
  // ATUALIZAR COR DA BOLINHA
  // ─────────────────────────────────────────────────────────────
  updateDotColor(dotElement, queueKey) {
    const color = this.QUEUE_CONFIG[queueKey].color;
    dotElement.style.background = `radial-gradient(circle at 30% 30%, ${color}, ${color} 60%, rgba(0,0,0,0.4))`;
    dotElement.style.color = color;
    dotElement.style.boxShadow = `0 0 6px ${color}, 0 0 12px ${color}, inset 0 0 3px rgba(255,255,255,0.3)`;
  },

  // ─────────────────────────────────────────────────────────────
  // ABRIR SELETOR DE FILAS (popup)
  // ─────────────────────────────────────────────────────────────
  openQueuePicker(dotElement, tagName) {
    NodusDebug.debug('PanelNQ', `Abrindo queue picker para: ${tagName}`);
    
    // Fechar picker existente
    this.closeQueuePicker();
    
    // Criar picker
    const picker = document.createElement('div');
    picker.id = this.PICKER_ID;
    picker.style.cssText = `
      position: absolute;
      background: #1e293b;
      border: 1px solid #3b82f6;
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 110px;
    `;
    
    // Posicionar perto da bolinha
    const rect = dotElement.getBoundingClientRect();
    picker.style.left = `${rect.left}px`;
    picker.style.top = `${rect.bottom + 5}px`;
    
    // Criar botões para cada fila (EXCETO QUICK - ela é automática)
    Object.entries(this.QUEUE_CONFIG).forEach(([queueKey, config]) => {
      // Pular a fila Quick (é exclusiva do botão Quick/Automatic)
      if (queueKey === 'ideas_queue_quick') return;
      
      // ✅ VERIFICAR SE É FILA PRO E USUÁRIO É FREE
      const proQueues = ['ideas_queue_custom2', 'ideas_queue_custom3', 'ideas_queue_custom4'];
      const isPro = window.NodusLicense && window.NodusLicense.isPro();
      const isProQueue = proQueues.includes(queueKey);
      const isLocked = isProQueue && !isPro;
      
      const queueBtn = document.createElement('button');
      queueBtn.style.cssText = `
        padding: 6px 10px;
        background: ${isLocked ? 'rgba(100, 116, 139, 0.3)' : config.color};
        color: ${isLocked ? '#64748b' : 'white'};
        border: none;
        border-radius: 5px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        cursor: ${isLocked ? 'not-allowed' : 'pointer'};
        text-align: left;
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: ${isLocked ? '0.6' : '1'};
      `;
      
      queueBtn.innerHTML = `
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${isLocked ? '#64748b' : 'radial-gradient(circle at 30% 30%, white, rgba(255,255,255,0.8) 60%, rgba(255,255,255,0.3))'};
          display: inline-block;
          box-shadow: ${isLocked ? 'none' : '0 0 4px white, 0 0 8px white, inset 0 0 2px rgba(255,255,255,0.5)'};
        "></span>
        ${config.name}${isLocked ? ' 🔒' : ''}
      `;
      
      // Tooltip para PRO locked
      if (isLocked) {
        queueBtn.title = 'PRO feature - Upgrade to unlock';
      }
      
      queueBtn.addEventListener('mouseenter', () => {
        if (!isLocked) {
          queueBtn.style.transform = 'scale(1.05)';
          queueBtn.style.boxShadow = `0 0 12px ${config.color}`;
        }
      });
      
      queueBtn.addEventListener('mouseleave', () => {
        if (!isLocked) {
          queueBtn.style.transform = 'scale(1)';
          queueBtn.style.boxShadow = 'none';
        }
      });
      
      queueBtn.addEventListener('click', async () => {
        // ✅ BLOQUEAR CLIQUE EM FILAS PRO
        if (isLocked) {
          this.closeQueuePicker();
          if (window.NodusLicense) {
            window.NodusLicense.showPaywall('queue_q2');
          }
          return;
        }
        
        // Atualizar estado APENAS desta tag específica
        this.suggestedTagsQueueState[tagName] = queueKey;
        
        // 💾 SALVAR vinculação no storage
        try {
          const { tagQueueBindings = {} } = await chrome.storage.local.get('tagQueueBindings');
          tagQueueBindings[tagName.toLowerCase()] = queueKey;
          await chrome.storage.local.set({ tagQueueBindings });
          NodusDebug.success('PanelNQ', `💾 Vinculação salva: ${tagName} → ${config.name}`);
        } catch (error) {
          NodusDebug.error('PanelNQ', 'Erro ao salvar vinculação:', error);
        }
        
        // Atualizar cor APENAS da bolinha clicada
        this.updateDotColor(dotElement, queueKey);
        
        // ✅ NOVO: Sincronizar com tag já adicionada (se existir)
        const addedTagIndex = this.currentTags.findIndex(t => 
          t.name.toLowerCase() === tagName.toLowerCase()
        );
        
        if (addedTagIndex !== -1) {
          NodusDebug.info('PanelNQ', `🔄 Sincronizando tag adicionada "${tagName}" com nova fila`);
          this.currentTags[addedTagIndex].queueKey = queueKey;
          this.renderTags();
          this.updateQueuePreview();
        }
        
        // Fechar picker
        this.closeQueuePicker();
        
        NodusDebug.success('PanelNQ', `Fila da tag sugerida "${tagName}" alterada para: ${config.name}`);
      });
      
      picker.appendChild(queueBtn);
    });
    
    document.body.appendChild(picker);
    
    // Fechar ao clicar fora
    setTimeout(() => {
      document.addEventListener('click', this.closeQueuePickerHandler);
    }, 100);
  },

  // ─────────────────────────────────────────────────────────────
  // FECHAR SELETOR DE FILAS
  // ─────────────────────────────────────────────────────────────
  closeQueuePicker() {
    const picker = document.getElementById(this.PICKER_ID);
    if (picker) {
      picker.remove();
      document.removeEventListener('click', this.closeQueuePickerHandler);
    }
  },
  
  closeQueuePickerHandler: function(e) {
    const picker = document.getElementById(NodusPanelNQ.PICKER_ID);
    // Não fechar se clicar em qualquer bolinha (sugerida OU adicionada)
    if (picker && 
        !picker.contains(e.target) && 
        !e.target.classList.contains('nq-suggest-tag-queue-dot') &&
        !e.target.classList.contains('nq-added-tag-queue-dot')) {
      NodusPanelNQ.closeQueuePicker();
    }
  },

  // ─────────────────────────────────────────────────────────────
  // ABRIR PICKER PARA TAG JÁ ADICIONADA
  // ─────────────────────────────────────────────────────────────
  openQueuePickerForAddedTag(dotElement, tagName) {
    NodusDebug.debug('PanelNQ', `Abrindo queue picker para tag adicionada: ${tagName}`);
    
    // Fechar picker existente
    this.closeQueuePicker();
    
    // Criar picker
    const picker = document.createElement('div');
    picker.id = this.PICKER_ID;
    picker.style.cssText = `
      position: absolute;
      background: #1e293b;
      border: 1px solid #3b82f6;
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 110px;
    `;
    
    // Posicionar perto da bolinha
    const rect = dotElement.getBoundingClientRect();
    picker.style.left = `${rect.left}px`;
    picker.style.top = `${rect.bottom + 5}px`;
    
    // Criar botões para cada fila (EXCETO QUICK)
    const proQueues = ['ideas_queue_custom2', 'ideas_queue_custom3', 'ideas_queue_custom4'];
    const isPro = window.NodusLicense && window.NodusLicense.isPro();

    Object.entries(this.QUEUE_CONFIG).forEach(([queueKey, config]) => {
      if (queueKey === 'ideas_queue_quick') return;

      const isLocked = proQueues.includes(queueKey) && !isPro;

      const queueBtn = document.createElement('button');
      queueBtn.style.cssText = `
        padding: 6px 10px;
        background: ${isLocked ? 'rgba(100, 116, 139, 0.3)' : config.color};
        color: ${isLocked ? '#64748b' : 'white'};
        border: none;
        border-radius: 5px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        cursor: ${isLocked ? 'not-allowed' : 'pointer'};
        text-align: left;
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: ${isLocked ? '0.6' : '1'};
      `;
      if (isLocked) queueBtn.title = 'PRO feature - Upgrade to unlock';

      queueBtn.innerHTML = `
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${isLocked ? '#64748b' : 'radial-gradient(circle at 30% 30%, white, rgba(255,255,255,0.8) 60%, rgba(255,255,255,0.3))'};
          display: inline-block;
          box-shadow: ${isLocked ? 'none' : '0 0 4px white, 0 0 8px white, inset 0 0 2px rgba(255,255,255,0.5)'};
        "></span>
        ${config.name}${isLocked ? ' 🔒' : ''}
      `;

      if (!isLocked) {
        queueBtn.addEventListener('mouseenter', () => {
          queueBtn.style.transform = 'scale(1.05)';
          queueBtn.style.boxShadow = `0 0 12px ${config.color}`;
        });
        queueBtn.addEventListener('mouseleave', () => {
          queueBtn.style.transform = 'scale(1)';
          queueBtn.style.boxShadow = 'none';
        });
      }

      queueBtn.addEventListener('click', async () => {
        if (isLocked) {
          if (window.NodusLicense) window.NodusLicense.showPaywall('queue_q2');
          return;
        }
        NodusDebug.group('PanelNQ', `Tentando alterar fila da tag "${tagName}"`);
        NodusDebug.info('PanelNQ', 'currentTags antes da busca:', JSON.parse(JSON.stringify(this.currentTags)));
        
        // Encontrar tag com comparação case-insensitive
        const tagIndex = this.currentTags.findIndex(t => t.name.toLowerCase() === tagName.toLowerCase());
        
        NodusDebug.info('PanelNQ', `Procurando por: "${tagName}"`);
        NodusDebug.info('PanelNQ', `Index encontrado: ${tagIndex}`);
        
        if (tagIndex !== -1) {
          const oldQueueKey = this.currentTags[tagIndex].queueKey;
          this.currentTags[tagIndex].queueKey = queueKey;
          
          // 💾 SALVAR vinculação no storage
          try {
            const { tagQueueBindings = {} } = await chrome.storage.local.get('tagQueueBindings');
            tagQueueBindings[tagName.toLowerCase()] = queueKey;
            await chrome.storage.local.set({ tagQueueBindings });
            NodusDebug.success('PanelNQ', `💾 Vinculação salva: ${tagName} → ${config.name}`);
          } catch (error) {
            NodusDebug.error('PanelNQ', 'Erro ao salvar vinculação:', error);
          }
          
          NodusDebug.success('PanelNQ', `✅ Tag "${tagName}" alterada!`);
          NodusDebug.info('PanelNQ', `   ANTES: ${oldQueueKey} → ${this.QUEUE_CONFIG[oldQueueKey].name}`);
          NodusDebug.info('PanelNQ', `   DEPOIS: ${queueKey} → ${config.name}`);
          NodusDebug.info('PanelNQ', 'currentTags após mudança:', JSON.parse(JSON.stringify(this.currentTags)));
          
          // Re-renderizar tags
          this.renderTags();
          this.updateQueuePreview();
        } else {
          NodusDebug.error('PanelNQ', `❌ Tag "${tagName}" NÃO ENCONTRADA no array!`);
        }
        
        NodusDebug.groupEnd();
        
        // Fechar picker
        this.closeQueuePicker();
      });
      
      picker.appendChild(queueBtn);
    });
    
    document.body.appendChild(picker);
    
    // Fechar ao clicar fora
    setTimeout(() => {
      document.addEventListener('click', this.closeQueuePickerHandler);
    }, 100);
  },

  // ─────────────────────────────────────────────────────────────
  // ADICIONAR TAG
  // ─────────────────────────────────────────────────────────────
  addTag(tagName, queueKey = 'ideas_queue_default', tagColor = null) {
    tagName = tagName.trim().toLowerCase();

    // Validações
    if (!tagName) {
      NodusUI.showToast('⚠️ Empty tag', 'warning');
      return;
    }

    if (this.currentTags.length >= this.MAX_TAGS) {
      NodusUI.showToast(`⚠️ Max ${this.MAX_TAGS} tags reached`, 'warning');
      return;
    }

    if (this.currentTags.find(t => t.name === tagName)) {
      NodusUI.showToast('⚠️ Tag already added', 'warning');
      return;
    }

    // Se não passou cor, tenta encontrar nos SUGGESTED_TAGS
    if (!tagColor) {
      const suggestedTag = this.SUGGESTED_TAGS.find(t => t.name.toLowerCase() === tagName);
      tagColor = suggestedTag ? suggestedTag.color : '#6b7280'; // Cinza se não encontrar
    }

    // Adicionar tag com fila E cor
    this.currentTags.push({ name: tagName, queueKey, color: tagColor });
    this.renderTags();
    this.updateQueuePreview();

    NodusDebug.success('PanelNQ', `Tag adicionada: ${tagName} → ${this.QUEUE_CONFIG[queueKey].name}`);
  },

  // ─────────────────────────────────────────────────────────────
  // REMOVER TAG
  // ─────────────────────────────────────────────────────────────
  removeTag(tagName) {
    const index = this.currentTags.findIndex(t => t.name === tagName);
    if (index > -1) {
      this.currentTags.splice(index, 1);
      this.renderTags();
      this.updateQueuePreview();
      NodusDebug.info('PanelNQ', `Tag removida: ${tagName}`);
    }
  },

  // ─────────────────────────────────────────────────────────────
  // ATUALIZAR PREVIEW DE DESTINO
  // ─────────────────────────────────────────────────────────────
  updateQueuePreview() {
    // Se não tem tags, vai para Default
    if (this.currentTags.length === 0) {
      document.getElementById('nq-queue-preview').textContent = 'Default';
      return;
    }

    // Encontrar tag com maior prioridade
    let highestPriorityQueue = 'ideas_queue_default';
    let highestPriority = 999;

    this.currentTags.forEach(tagObj => {
      const config = this.QUEUE_CONFIG[tagObj.queueKey];
      if (config && config.priority < highestPriority) {
        highestPriority = config.priority;
        highestPriorityQueue = tagObj.queueKey;
      }
    });

    const queueName = this.QUEUE_CONFIG[highestPriorityQueue].name;
    document.getElementById('nq-queue-preview').textContent = queueName;
    
    NodusDebug.debug('PanelNQ', 'Preview atualizado', { 
      queueKey: highestPriorityQueue, 
      queueName,
      priority: highestPriority 
    });
  },

  // ─────────────────────────────────────────────────────────────
  // ADICIONAR EVENT LISTENERS
  // ─────────────────────────────────────────────────────────────
  attachEventListeners() {
    // Cancelar
    const cancelBtn = document.getElementById('nq-cancel-btn');
    cancelBtn.addEventListener('click', () => {
      this.close();
    });
    
    // Hover cancelar
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = '#4b5563';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = '#374151';
    });

    // Salvar
    const saveBtn = document.getElementById('nq-save-btn');
    saveBtn.addEventListener('click', () => {
      this.save();
    });
    
    // Hover salvar
    saveBtn.addEventListener('mouseenter', () => {
      saveBtn.style.transform = 'scale(1.02)';
    });
    saveBtn.addEventListener('mouseleave', () => {
      saveBtn.style.transform = 'scale(1)';
    });

    // Add tag (input + Enter)
    const tagInput = document.getElementById('nq-new-tag-input');
    const addBtn = document.getElementById('nq-add-tag-btn');

    addBtn.addEventListener('click', () => {
      const tagName = tagInput.value;
      if (tagName) {
        this.addTag(tagName);
        tagInput.value = '';
      }
    });
    
    // Hover add button
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.background = '#2563eb';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.background = '#3b82f6';
    });

    tagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });
    
    // File Alert Event Listeners
    this.setupFileAlertListeners();
  },
  
  // ─────────────────────────────────────────────────────────────
  // FILE ALERT LISTENERS
  // ─────────────────────────────────────────────────────────────
  setupFileAlertListeners() {
    const attachBtn = document.getElementById('nq-attach-file-btn');
    const dismissBtn = document.getElementById('nq-dismiss-alert-btn');
    const fileInput = document.getElementById('nq-file-input');
    const alert = document.getElementById('nq-file-alert');

    if (attachBtn && fileInput) {
      attachBtn.addEventListener('click', () => {
        fileInput.click();
      });
    }

    if (dismissBtn && alert) {
      dismissBtn.addEventListener('click', () => {
        alert.style.display = 'none';
        this.currentIdeaData.hasGeneratedFile = false;
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Armazenar arquivos temporariamente
        if (!this.attachmentsToUpload) {
          this.attachmentsToUpload = [];
        }
        this.attachmentsToUpload.push(...files);

        // Feedback visual
        if (alert) {
          const alertText = document.getElementById('nq-file-alert-text');
          if (alertText) {
            alertText.textContent = `✅ ${files.length} arquivo(s) selecionado(s) - será anexado ao salvar`;
          }
          alert.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        }

        // Reset input
        e.target.value = '';
      });
    }
    
    // Mostrar alert se hasGeneratedFile
    if (this.currentIdeaData.hasGeneratedFile && alert) {
      alert.style.display = 'flex';
    }
  },

  // ─────────────────────────────────────────────────────────────
  // SALVAR IDEIA
  // ─────────────────────────────────────────────────────────────
  async save() {
    NodusDebug.group('PanelNQ', 'Salvando ideia');

    try {
      // Coletar dados do formulário
      const title = document.getElementById('nq-title-input').value.trim();
      const text = document.getElementById('nq-response-textarea').value.trim();

      // Validações
      if (!title) {
        NodusUI.showToast('⚠️ Título obrigatório', 'warning');
        return;
      }

      if (!text || text.length < 10) {
        NodusUI.showToast('⚠️ Answer too short', 'warning');
        return;
      }

      // Extrair apenas nomes das tags
      const tagNames = this.currentTags.map(t => t.name);
      
      // Determinar fila final baseado na tag de maior prioridade
      let finalQueueKey = 'ideas_queue_default';
      let highestPriority = 999;

      this.currentTags.forEach(tagObj => {
        const config = this.QUEUE_CONFIG[tagObj.queueKey];
        if (config && config.priority < highestPriority) {
          highestPriority = config.priority;
          finalQueueKey = tagObj.queueKey;
        }
      });

      // Montar objeto final
      const finalIdea = {
        ...this.currentIdeaData,
        title,
        text,
        tags: tagNames,  // Apenas nomes das tags
        queue: finalQueueKey,  // Fila já determinada
        captureMethod: 'manual',
        lastModified: new Date().toISOString()
      };

      NodusDebug.info('PanelNQ', 'Enviando para background', {
        ...finalIdea,
        queueName: this.QUEUE_CONFIG[finalQueueKey].name
      });

      // Enviar para background
      chrome.runtime.sendMessage(
        { action: 'saveIdea', idea: finalIdea },
        async (response) => {
          if (response?.ok) {
            // Upload de attachments se existirem
            if (this.attachmentsToUpload && 
                this.attachmentsToUpload.length > 0 &&
                window.NodusAttachmentsDB) {
              
              try {
                for (const file of this.attachmentsToUpload) {
                  await window.NodusAttachmentsDB.addFile(finalIdea.id, file);
                }
                
                // Atualizar ideia no storage para marcar que tem attachments
                const queueName = finalQueueKey.replace('ideas_queue_', '');
                const storageKey = `ideas_queue_${queueName}`;
                const data = await chrome.storage.local.get(storageKey);
                const queue = data[storageKey] || [];
                const ideaIndex = queue.findIndex(i => i.id === finalIdea.id);
                
                if (ideaIndex !== -1) {
                  queue[ideaIndex].hasAttachment = true;
                  queue[ideaIndex].hasGeneratedFile = false;
                  await chrome.storage.local.set({ [storageKey]: queue });
                }
                
                NodusDebug.success('PanelNQ', `${this.attachmentsToUpload.length} arquivo(s) anexado(s)`);
              } catch (error) {
                NodusDebug.error('PanelNQ', 'Erro ao anexar arquivos', error);
                NodusUI.showToast('⚠️ Ideia salva, mas erro ao anexar arquivos', 'warn');
              }
            }
            
            NodusUI.showToast('✅ Idea saved!', 'success');
            this.close();
            NodusDebug.success('PanelNQ', 'Idea saved successfully');
          } else if (response?.duplicate) {
            NodusUI.showToast('⚠️ Idea already saved', 'warning');
            NodusDebug.warn('PanelNQ', 'Duplicate idea blocked');
          } else {
            NodusUI.showToast('❌ Error saving', 'error');
            NodusDebug.error('PanelNQ', 'Error saving', response);
          }
        }
      );

      NodusDebug.groupEnd();

    } catch (error) {
      NodusDebug.error('PanelNQ', 'Error saving', error);
      NodusDebug.groupEnd();
      NodusUI.showToast('❌ Error saving', 'error');
    }
  },

  // ─────────────────────────────────────────────────────────────
  // FECHAR MODAL
  // ─────────────────────────────────────────────────────────────
  close() {
    const panel = document.getElementById(this.PANEL_ID);
    const overlay = document.getElementById(this.OVERLAY_ID);

    if (panel) {
      panel.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => panel.remove(), 300);
    }

    if (overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => overlay.remove(), 300);
    }

    this.currentIdeaData = null;
    this.currentTags = [];
    this.attachmentsToUpload = []; // Limpar attachments temporários

    NodusDebug.info('PanelNQ', 'Modal fechado');
  }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════
if (typeof self !== 'undefined') {
  self.NodusPanelNQ = NodusPanelNQ;
}

NodusDebug.success('PanelNQ', 'Módulo Panel NQ v3.0 inicializado');

// ═══════════════════════════════════════════════════════════════
// NODUS - Ethical Gate v3.0
// ═══════════════════════════════════════════════════════════════

const NodusGate = {
  ACCEPTANCE_KEY: 'nodus_terms_accepted',
  ACCEPTANCE_DATA_KEY: 'nodus_acceptance_data',
  MODAL_ID: 'nodus-welcome-overlay',

  async hasAcceptedTerms() {
    try {
      const result = await chrome.storage.local.get(this.ACCEPTANCE_KEY);
      return !!result[this.ACCEPTANCE_KEY];
    } catch (e) {
      // Extension context invalidated - silently return false
      if (e.message && e.message.includes('Extension context invalidated')) {
        return false;
      }
      console.error('[Gate] Error checking acceptance:', e);
      return false;
    }
  },

  async saveAcceptanceAndCloseModal() {
    const acceptanceData = {
      accepted: true,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      date: new Date().toLocaleString('en-US')
    };
    
    await chrome.storage.local.set({ 
      [this.ACCEPTANCE_KEY]: true,
      [this.ACCEPTANCE_DATA_KEY]: acceptanceData
    });
    
    const modal = document.getElementById(this.MODAL_ID);
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    }
    
    window.NodusUI.showToast(`✅ ${window.NodusI18n.t('ethicalGate.title')}!`, 'success');
  },

  closeModalWithoutAccepting() {
    const modal = document.getElementById(this.MODAL_ID);
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    }
    window.NodusUI.showToast('❌ NODUS disabled', 'error');
  },

  showWelcomeModal() {
    
    if (document.getElementById(this.MODAL_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = this.MODAL_ID;
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.95);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    overlay.innerHTML = `
      <div class="nodus-welcome-modal" style="
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        color: #e2e8f0;
        border-radius: 12px;
        padding: 28px;
        max-width: 420px;
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(59, 130, 246, 0.2);
        transform: scale(0.9);
        transition: transform 0.3s ease;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.1) transparent;
      ">
        <!-- Header -->
        <div style="display: flex; align-items: center; gap: 17px; margin-bottom: 20px;">
          <div style="
            width: 56px;
            height: 56px;
            flex-shrink: 0;
            background: url('${chrome.runtime.getURL('icons/logo.png')}') center/contain no-repeat;
          "></div>
          <div style="text-align: left; flex: 1;">
            <h1 style="
              font-size: 1.6em;
              margin: 0 0 5px;
              font-weight: 700;
              background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            ">${window.NodusI18n.t('ethicalGate.title')}</h1>
            <p style="
              color: #94a3b8;
              margin: 0;
              font-size: 0.85em;
              font-weight: 400;
            ">${window.NodusI18n.t('ethicalGate.subtitle')}</p>
          </div>
        </div>

        <!-- Description -->
        <p style="
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 17px;
          text-align: center;
          font-size: 0.82em;
        ">
          ${window.NodusI18n.t('ethicalGate.description')}
        </p>

        <p style="
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 17px;
          text-align: center;
          font-size: 0.78em;
        ">
          ${window.NodusI18n.t('ethicalGate.privacy')}<br>
          <strong style="color: #e2e8f0;">${window.NodusI18n.t('ethicalGate.control')}</strong>
        </p>

        <!-- Technical Summary -->
        <div style="
          background: rgba(59, 130, 246, 0.1);
          border-left: 3px solid #3b82f6;
          padding: 14px;
          border-radius: 6px;
          margin-bottom: 17px;
        ">
          <h3 style="
            color: #3b82f6;
            margin: 0 0 8px;
            font-size: 0.82em;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span>⚖️</span> ${window.NodusI18n.t('ethicalGate.summaryTitle')}
          </h3>
          <ul style="
            list-style: none;
            padding: 0;
            margin: 0;
            font-size: 0.78em;
            color: #cbd5e1;
            line-height: 1.7;
          ">
            <li>✅ ${window.NodusI18n.t('ethicalGate.point1')}</li>
            <li>✅ ${window.NodusI18n.t('ethicalGate.point2')}</li>
            <li>✅ ${window.NodusI18n.t('ethicalGate.point3')}</li>
            <li>✅ ${window.NodusI18n.t('ethicalGate.point4')}</li>
            <li>✅ ${window.NodusI18n.t('ethicalGate.point5')}</li>
          </ul>
        </div>

        <!-- Checkbox -->
        <div style="margin-bottom: 17px;">
          <label style="
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 0.82em;
            color: #e2e8f0;
            gap: 10px;
          ">
            <input
              type="checkbox"
              id="nodus-accept-checkbox"
              style="
                width: 14px;
                height: 14px;
                accent-color: #3b82f6;
                cursor: pointer;
              "
            >
            <span>${window.NodusI18n.t('ethicalGate.acceptTerms')}</span>
          </label>
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 8px;">
          <button id="nodus-cancel-btn" style="
            flex: 1;
            padding: 10px 14px;
            border-radius: 6px;
            background: rgba(100, 116, 139, 0.2);
            color: #94a3b8;
            border: 1px solid rgba(100, 116, 139, 0.3);
            cursor: pointer;
            font-size: 0.85em;
            font-weight: 600;
            transition: all 0.2s;
          ">
            ${window.NodusI18n.t('ethicalGate.cancel')}
          </button>
          <button id="nodus-accept-btn" disabled style="
            flex: 2;
            padding: 10px 14px;
            border-radius: 6px;
            background: #4b5563;
            color: white;
            border: none;
            font-weight: 600;
            font-size: 0.85em;
            cursor: not-allowed;
            transition: all 0.2s;
          ">
            ✅ ${window.NodusI18n.t('ethicalGate.accept')}
          </button>
        </div>

        <!-- Links -->
        <div style="
          margin-top: 17px;
          padding-top: 14px;
          border-top: 1px solid rgba(100, 116, 139, 0.2);
          text-align: center;
          font-size: 0.72em;
        ">
          <a href="https://mmcarvalhodev.github.io/github.io/" target="_blank" style="color: #60a5fa; text-decoration: none; margin: 0 7px;">🌐 ${window.NodusI18n.t('ethicalGate.projectPage')}</a>
          <a href="https://github.com/mmcarvalhodev/nodus-core" target="_blank" style="color: #60a5fa; text-decoration: none; margin: 0 7px;">🔍 ${window.NodusI18n.t('ethicalGate.github')}</a>
          <a href="https://github.com/mmcarvalhodev/nodus-core/blob/docs/docs/manifesto.md" target="_blank" style="color: #60a5fa; text-decoration: none; margin: 0 7px;">📖 OpenCore Manifesto</a>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Compensação de zoom (igual ao dashboard)
    const zoom = window.outerWidth && window.innerWidth
      ? Math.round((window.outerWidth / window.innerWidth) * 100) / 100
      : 1;
    if (zoom > 1.05) {
      const modalEl = overlay.querySelector('.nodus-welcome-modal');
      if (modalEl) modalEl.style.zoom = String(1 / zoom);
    }

    // Animação de entrada
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const modal = overlay.querySelector('.nodus-welcome-modal');
        if (modal) modal.style.transform = 'scale(1)';
      });
    });

    // Event listeners
    const checkbox = overlay.querySelector('#nodus-accept-checkbox');
    const acceptBtn = overlay.querySelector('#nodus-accept-btn');
    const cancelBtn = overlay.querySelector('#nodus-cancel-btn');

    checkbox.addEventListener('change', () => {
      acceptBtn.disabled = !checkbox.checked;
      acceptBtn.style.backgroundColor = checkbox.checked ? '#3b82f6' : '#4b5563';
      acceptBtn.style.cursor = checkbox.checked ? 'pointer' : 'not-allowed';
      
      if (checkbox.checked) {
        acceptBtn.onmouseenter = () => {
          acceptBtn.style.backgroundColor = '#2563eb';
          acceptBtn.style.transform = 'translateY(-1px)';
        };
        acceptBtn.onmouseleave = () => {
          acceptBtn.style.backgroundColor = '#3b82f6';
          acceptBtn.style.transform = 'translateY(0)';
        };
      } else {
        acceptBtn.onmouseenter = null;
        acceptBtn.onmouseleave = null;
      }
    });

    cancelBtn.onmouseenter = () => {
      cancelBtn.style.backgroundColor = 'rgba(100, 116, 139, 0.3)';
    };
    cancelBtn.onmouseleave = () => {
      cancelBtn.style.backgroundColor = 'rgba(100, 116, 139, 0.2)';
    };

    acceptBtn.addEventListener('click', () => {
      if (!acceptBtn.disabled) {
        this.saveAcceptanceAndCloseModal();
      }
    });
    
    cancelBtn.addEventListener('click', () => this.closeModalWithoutAccepting());
  },

  async checkAcceptanceAndProceed(callback) {
    const accepted = await this.hasAcceptedTerms();
    
    if (accepted) {
      callback();
    } else {
      this.showWelcomeModal();
    }
  }
};

window.NodusGate = NodusGate;


// ═══════════════════════════════════════════════════════════════
// EXPORTAR PARA WINDOW.NODUS_UI (compatível com engines)
// ═══════════════════════════════════════════════════════════════

window.NODUS_UI = {
  showToast: window.NodusUI.showToast.bind(window.NodusUI),
  openPanelNQModal: window.NodusPanelNQ.open.bind(window.NodusPanelNQ),
  checkAcceptanceAndProceed: window.NodusGate.checkAcceptanceAndProceed.bind(window.NodusGate)
};



// ═══════════════════════════════════════════════════════════════
// 🧪 FUNÇÃO DE TESTE PARA DEBUG
// ═══════════════════════════════════════════════════════════════
window.NODUS_TEST_CHANGE_QUEUE = (tagName, queueKey) => {
  const panel = window.NodusPanelNQ;
  if (!panel || !panel.currentTags) {
    console.error("❌ Panel não encontrado ou não tem currentTags");
    return;
  }
  
  const tagIndex = panel.currentTags.findIndex(t => t.name.toLowerCase() === tagName.toLowerCase());
  
  if (tagIndex !== -1) {
    const oldQueue = panel.currentTags[tagIndex].queueKey;
    panel.currentTags[tagIndex].queueKey = queueKey;
    panel.renderTags();
    panel.updateQueuePreview();
  } else {
    console.error(`   ❌ Tag não encontrada!`);
  }
};


// ═══════════════════════════════════════════════════════════════
// FUNÇÕES DE TESTE PARA LICENCIAMENTO
// ═══════════════════════════════════════════════════════════════

// Aguardar NodusLicense estar disponível antes de definir as funções
const initTestFunctions = () => {
  window.NODUS_TEST_PAYWALL = (featureId = 'export_html') => {
    if (window.NodusLicense) {
      window.NodusLicense.showPaywall(featureId);
    } else {
      console.error('NodusLicense não disponível');
    }
  };

  window.NODUS_TEST_ACTIVATE = () => {
    if (window.NodusLicense) {
      window.NodusLicense.showActivationModal();
    } else {
      console.error('NodusLicense não disponível');
    }
  };

  window.NODUS_LICENSE_STATUS = () => {
    if (window.NodusLicense) {
      return window.NodusLicense.license;
    } else {
      console.error('NodusLicense não disponível');
    }
  };

  window.NODUS_SET_FREE = async () => {
    if (window.NodusLicense) {
      await window.NodusLicense.setFree();
    }
  };

  
  // Função de debug de telemetria
  window.NODUS_DEBUG_TELEMETRY = async () => {
    
    const settings = await chrome.storage.local.get('settings');
    const eventLog = await chrome.storage.local.get('telemetry_event_log');
    const stats = await chrome.storage.local.get('telemetry_stats');
    
    
    if (eventLog.telemetry_event_log && eventLog.telemetry_event_log.length > 0) {
      eventLog.telemetry_event_log.slice(0, 10).forEach((event, i) => {
      });
    } else {
    }
    
    
    return {
      settings: settings.settings,
      eventLog: eventLog.telemetry_event_log,
      stats: stats.telemetry_stats
    };
  };
  
};

// Verificar se NodusLicense já está disponível, senão aguardar
if (window.NodusLicense) {
  initTestFunctions();
} else {
  // Aguardar até 3 segundos para NodusLicense estar disponível
  let attempts = 0;
  const checkInterval = setInterval(() => {
    attempts++;
    if (window.NodusLicense) {
      initTestFunctions();
      clearInterval(checkInterval);
    } else if (attempts > 30) { // 30 * 100ms = 3s
      console.error('⚠️ NodusLicense não foi carregado a tempo');
      clearInterval(checkInterval);
    }
  }, 100);
}
