/**
 * ============================================================================
 * NODUS - State Synchronization Module
 * ============================================================================
 * 
 * Mantém o estado da dashboard sincronizado entre todas as abas abertas.
 * Usa chrome.storage.onChanged para detectar mudanças e atualizar em tempo real.
 * 
 * FUNCIONALIDADES:
 * - Sincronização automática de cards, chains e queues
 * - Notificações de mudanças entre tabs
 * - Estado persistente e consistente
 * - NODUS como ponte central entre IAs
 * 
 * @module StateSync
 * @version 1.0.0
 */

window.NodusStateSync = {
  
  // ============================================================================
  // CONFIGURAÇÃO
  // ============================================================================
  
  listeners: [],
  isInitialized: false,
  
  // Chaves monitoradas
  WATCHED_KEYS: [
    'ideas_queue_quick',
    'ideas_queue_default',
    'ideas_queue_automatic',
    'nodus_chains',
    'nodus_cards'
  ],
  
  // ============================================================================
  // INICIALIZAÇÃO
  // ============================================================================
  
  /**
   * Inicializa o sistema de sincronização de estado
   */
  init() {
    if (this.isInitialized) {
      return;
    }
    
    
    // Listener global para mudanças no storage
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      
      
      // Processar cada mudança
      for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (this.WATCHED_KEYS.includes(key)) {
          this.notifyChange(key, newValue, oldValue);
        }
      }
    });
    
    this.isInitialized = true;
  },
  
  // ============================================================================
  // SUBSCRIPTION SYSTEM
  // ============================================================================
  
  /**
   * Registra um callback para receber notificações de mudanças
   * 
   * @param {string} key - Chave a monitorar (ex: 'nodus_chains')
   * @param {Function} callback - Função a ser chamada quando houver mudança
   * @returns {Function} Função para cancelar a inscrição
   * 
   * @example
   * const unsubscribe = NodusStateSync.subscribe('nodus_chains', (newValue, oldValue) => {
   *   console.log('Chains atualizadas!', newValue);
   *   renderChains(newValue);
   * });
   */
  subscribe(key, callback) {
    const listener = { key, callback };
    this.listeners.push(listener);
    
    
    // Retorna função para cancelar inscrição
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  },
  
  /**
   * Notifica todos os listeners sobre uma mudança
   */
  notifyChange(key, newValue, oldValue) {
    const relevantListeners = this.listeners.filter(l => l.key === key);
    
    if (relevantListeners.length === 0) {
      return;
    }
    
    
    relevantListeners.forEach(listener => {
      try {
        listener.callback(newValue, oldValue);
      } catch (error) {
        console.error(`[StateSync] ❌ Erro no callback de ${key}:`, error);
      }
    });
  },
  
  // ============================================================================
  // HELPERS PARA DASHBOARD
  // ============================================================================
  
  /**
   * Configura sincronização automática para o Dashboard de Cards
   */
  syncCardsView() {
    return this.subscribe('ideas_queue_quick', async (newValue) => {
      
      // Se o dashboard de cards estiver aberto, recarregar
      if (window.NodusDashboardCards && window.NodusDashboardCards.isOpen) {
        await window.NodusDashboardCards.render();
      }
    });
  },
  
  /**
   * Configura sincronização automática para o Dashboard de Chains
   */
  syncChainsView() {
    return this.subscribe('nodus_chains', async (newValue) => {
      
      // Se o dashboard de chains estiver aberto, recarregar
      if (window.NodusDashboardChains && window.NodusDashboardChains.isOpen) {
        await window.NodusDashboardChains.render();
      }
    });
  },
  
  /**
   * Configura sincronização automática para todas as queues
   */
  syncQueues() {
    const unsubscribers = [];
    
    ['ideas_queue_quick', 'ideas_queue_default', 'ideas_queue_automatic'].forEach(queueKey => {
      const unsubscribe = this.subscribe(queueKey, async (newValue) => {
        
        // Atualizar contador de badges
        if (window.NodusDashboardCards) {
          await window.NodusDashboardCards.updateQueueBadges();
        }
      });
      
      unsubscribers.push(unsubscribe);
    });
    
    // Retorna função que cancela todas as inscrições
    return () => unsubscribers.forEach(fn => fn());
  },
  
  // ============================================================================
  // CROSS-TAB MESSAGING
  // ============================================================================
  
  /**
   * Envia uma mensagem para todas as outras abas abertas
   * Útil para sincronizar ações que não passam pelo storage
   * 
   * @param {string} action - Ação a ser executada
   * @param {Object} data - Dados adicionais
   * 
   * @example
   * NodusStateSync.broadcastToTabs('dashboard_opened', { tab: 'chains' });
   */
  async broadcastToTabs(action, data = {}) {
    try {
      const tabs = await chrome.tabs.query({});
      
      
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'state_sync_broadcast',
          syncAction: action,
          data: data
        }).catch(() => {
          // Ignorar erros de tabs que não têm content script
        });
      });
    } catch (error) {
      console.error('[StateSync] ❌ Erro ao fazer broadcast:', error);
    }
  },
  
  /**
   * Configura listener para receber broadcasts de outras tabs
   * 
   * @param {Function} callback - Função chamada quando receber broadcast
   * @returns {Function} Função para remover o listener
   * 
   * @example
   * const unregister = NodusStateSync.onBroadcast((action, data) => {
   *   if (action === 'dashboard_opened') {
   *     console.log('Dashboard foi aberto em outra tab');
   *   }
   * });
   */
  onBroadcast(callback) {
    const listener = (message) => {
      if (message.action === 'state_sync_broadcast') {
        callback(message.syncAction, message.data);
      }
    };
    
    chrome.runtime.onMessage.addListener(listener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  },
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  /**
   * Força atualização de uma chave específica
   * Útil para quando você altera o storage e quer garantir que todos sejam notificados
   */
  async forceSync(key) {
    
    const result = await chrome.storage.local.get(key);
    this.notifyChange(key, result[key], undefined);
  },
  
  /**
   * Obtém estatísticas do sistema de sincronização
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      listenersCount: this.listeners.length,
      watchedKeys: this.WATCHED_KEYS,
      activeListeners: this.listeners.map(l => l.key)
    };
  }
};

// Auto-inicializar quando o módulo for carregado
if (typeof chrome !== 'undefined' && chrome.storage) {
  window.NodusStateSync.init();
}

