// ═══════════════════════════════════════════════════════════════
// NODUS - Tab Tracker (Estado Persistente)
// ═══════════════════════════════════════════════════════════════
// Mantém registro de todas as abas com NODUS ativo
// Sincroniza entre todas as abas via chrome.storage.onChanged
// ═══════════════════════════════════════════════════════════════

const NodusTabTracker = {
  STORAGE_KEY: 'nodus_active_tabs',
  currentTabId: null,
  currentPlatform: null,
  heartbeatInterval: null,
  
  // ─────────────────────────────────────────────────────────────
  // DETECTAR PLATAFORMA ATUAL
  // ─────────────────────────────────────────────────────────────
  detectPlatform() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
      return 'ChatGPT';
    } else if (hostname.includes('claude.ai')) {
      return 'Claude';
    } else if (hostname.includes('gemini.google.com')) {
      return 'Gemini';
    } else if (hostname.includes('perplexity.ai')) {
      return 'Perplexity';
    } else if (hostname.includes('copilot.microsoft.com')) {
      return 'Copilot';
    } else if (hostname.includes('grok')) {
      return 'Grok';
    }
    
    return 'Unknown';
  },
  
  // ─────────────────────────────────────────────────────────────
  // REGISTRAR ABA ATUAL
  // ─────────────────────────────────────────────────────────────
  async registerTab() {
    try {
      // Verificar se o contexto ainda é válido
      if (!chrome.storage) {
        return null;
      }
      
      this.currentPlatform = this.detectPlatform();
      
      // Gerar ID único para esta aba
      this.currentTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Buscar abas existentes
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const activeTabs = result[this.STORAGE_KEY] || {};
      
      // Adicionar esta aba
      activeTabs[this.currentTabId] = {
        platform: this.currentPlatform,
        url: window.location.href,
        timestamp: Date.now(),
        title: document.title || this.currentPlatform
      };
      
      // Salvar
      await chrome.storage.local.set({ [this.STORAGE_KEY]: activeTabs });
      
      
      // Limpar abas antigas periodicamente
      this.cleanupOldTabs();
      
      return this.currentTabId;
    } catch (error) {
      // Silenciar erro de contexto invalidado
      if (error.message && error.message.includes('Extension context invalidated')) {
        return null;
      }
      console.error('[TabTracker] Erro ao registrar aba:', error);
      return null;
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // ATUALIZAR HEARTBEAT (ABA AINDA ATIVA)
  // ─────────────────────────────────────────────────────────────
  async updateHeartbeat() {
    try {
      if (!this.currentTabId) return;
      
      // Verificar se o contexto ainda é válido
      if (!chrome.storage) {
        // Contexto foi invalidado (extensão recarregada)
        this.stopHeartbeat();
        return;
      }
      
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const activeTabs = result[this.STORAGE_KEY] || {};
      
      if (activeTabs[this.currentTabId]) {
        activeTabs[this.currentTabId].timestamp = Date.now();
        activeTabs[this.currentTabId].title = document.title || this.currentPlatform;
        await chrome.storage.local.set({ [this.STORAGE_KEY]: activeTabs });
      }
    } catch (error) {
      // Se erro é "Extension context invalidated", parar heartbeat silenciosamente
      if (error.message && error.message.includes('Extension context invalidated')) {
        this.stopHeartbeat();
        return;
      }
      console.error('[TabTracker] Erro ao atualizar heartbeat:', error);
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // REMOVER ABA AO FECHAR
  // ─────────────────────────────────────────────────────────────
  async unregisterTab() {
    try {
      if (!this.currentTabId) return;
      
      // Verificar se o contexto ainda é válido
      if (!chrome.storage) {
        return;
      }
      
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const activeTabs = result[this.STORAGE_KEY] || {};
      
      delete activeTabs[this.currentTabId];
      
      await chrome.storage.local.set({ [this.STORAGE_KEY]: activeTabs });
    } catch (error) {
      // Silenciar erro de contexto invalidado
      if (error.message && error.message.includes('Extension context invalidated')) {
        return;
      }
      console.error('[TabTracker] Erro ao remover aba:', error);
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // LIMPAR ABAS ANTIGAS (>5 minutos sem heartbeat)
  // ─────────────────────────────────────────────────────────────
  async cleanupOldTabs() {
    try {
      // Verificar se o contexto ainda é válido
      if (!chrome.storage) {
        return;
      }
      
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const activeTabs = result[this.STORAGE_KEY] || {};
      
      const now = Date.now();
      const TIMEOUT = 5 * 60 * 1000; // 5 minutos
      
      let cleaned = false;
      for (const tabId in activeTabs) {
        if (now - activeTabs[tabId].timestamp > TIMEOUT) {
          delete activeTabs[tabId];
          cleaned = true;
        }
      }
      
      if (cleaned) {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: activeTabs });
      }
    } catch (error) {
      // Silenciar erro de contexto invalidado
      if (error.message && error.message.includes('Extension context invalidated')) {
        return;
      }
      console.error('[TabTracker] Erro ao limpar abas:', error);
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // BUSCAR TODAS ABAS ATIVAS
  // ─────────────────────────────────────────────────────────────
  async getActiveTabs() {
    try {
      // Verificar se o contexto ainda é válido
      if (!chrome.storage) {
        return {};
      }
      
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const activeTabs = result[this.STORAGE_KEY] || {};
      
      // Limpar abas antigas primeiro
      const now = Date.now();
      const TIMEOUT = 5 * 60 * 1000;
      const filtered = {};
      
      for (const tabId in activeTabs) {
        if (now - activeTabs[tabId].timestamp <= TIMEOUT) {
          filtered[tabId] = activeTabs[tabId];
        }
      }
      
      return filtered;
    } catch (error) {
      // Silenciar erro de contexto invalidado
      if (error.message && error.message.includes('Extension context invalidated')) {
        return {};
      }
      console.error('[TabTracker] Erro ao buscar abas:', error);
      return {};
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // PARAR HEARTBEAT (quando contexto é invalidado)
  // ─────────────────────────────────────────────────────────────
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  },
  
  // ─────────────────────────────────────────────────────────────
  // INICIALIZAR
  // ─────────────────────────────────────────────────────────────
  async init() {
    // Registrar aba
    await this.registerTab();
    
    // Heartbeat a cada 30 segundos (salvar referência para poder parar depois)
    this.heartbeatInterval = setInterval(() => this.updateHeartbeat(), 30000);
    
    // Cleanup a cada 2 minutos
    setInterval(() => this.cleanupOldTabs(), 120000);
    
    // Remover ao fechar
    window.addEventListener('beforeunload', () => this.unregisterTab());
    
  }
};

// Exportar
if (typeof window !== 'undefined') {
  window.NodusTabTracker = NodusTabTracker;
}
