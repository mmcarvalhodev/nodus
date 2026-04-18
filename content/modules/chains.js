// ═══════════════════════════════════════════════════════════
// NODUS v3.3.0 - Chains Manager
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'nodus_chains';
const INDEX_KEY = 'chains_index';

const NodusChains = {
  
  async createChain(name, color = '#facc15') {
    const chains = await this.getAllChains();
    const newChain = {
      id: 'chain_' + Date.now(),
      name: name,
      color: color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      nodes: [],
      notes: '', // 📝 Notes da chain inteira
      attachments: [] // 📎 Array de { fileName, fileSize, uploadedAt }
    };
    chains.push(newChain);
    await this._saveChains(chains);
    return newChain;
  },
  
  async getAllChains() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  },
  
  async getChain(chainId) {
    const chains = await this.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    
    // Fallback para chains antigas sem notes/attachments
    if (chain) {
      if (!chain.notes) chain.notes = '';
      if (!chain.attachments) chain.attachments = [];
    }
    
    return chain;
  },
  
  async deleteChain(chainId) {
    const chains = await this.getAllChains();
    const index = chains.findIndex(c => c.id === chainId);
    if (index === -1) return false;
    chains.splice(index, 1);
    await this._saveChains(chains);
    return true;
  },
  
  async renameChain(chainId, newName) {
    const chains = await this.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    if (!chain) throw new Error('Chain not found');
    chain.name = newName;
    chain.updated_at = new Date().toISOString();
    await this._saveChains(chains);
    return chain;
  },
  
  async updateChainColor(chainId, newColor) {
    const chains = await this.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    if (!chain) throw new Error('Chain not found');
    chain.color = newColor;
    chain.updated_at = new Date().toISOString();
    await this._saveChains(chains);
    return chain;
  },
  
  async addNodeToChain(chainId, nodeOrIdeaId, display = 'both') {
    const chains = await this.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    if (!chain) throw new Error('Chain not found');
    
    let newNode;
    
    // Detectar se é um node standalone (objeto) ou ideaId (string)
    if (typeof nodeOrIdeaId === 'object' && nodeOrIdeaId.type === 'standalone') {
      // NODE STANDALONE (Full Chat)
      newNode = {
        ...nodeOrIdeaId,
        order: chain.nodes.length,
        display: display
      };
    } else {
      // NODE LINKED (ideaId)
      const ideaId = nodeOrIdeaId;
      const exists = chain.nodes.find(n => n.idea_id === ideaId);
      if (exists) return chain;
      
      newNode = {
        type: 'linked',
        idea_id: ideaId, // CORREÇÃO: usar idea_id com underscore!
        order: chain.nodes.length,
        display: display
      };
    }
    
    chain.nodes.push(newNode);
    chain.updatedAt = Date.now();
    await this._saveChains(chains);
    return chain;
  },
  
  async removeNodeFromChain(chainId, ideaId) {
    const chains = await this.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    if (!chain) throw new Error('Chain not found');
    
    // Procurar com idea_id (padrão atual)
    let index = chain.nodes.findIndex(n => n.idea_id === ideaId);
    
    // FALLBACK: tentar ideaId (sem underscore) para chains antigas
    if (index === -1) {
      index = chain.nodes.findIndex(n => n.ideaId === ideaId);
    }
    
    if (index === -1) return chain;
    
    chain.nodes.splice(index, 1);
    
    // Renumerar
    chain.nodes.forEach((node, idx) => {
      node.order = idx + 1;
    });
    
    chain.updated_at = new Date().toISOString();
    await this._saveChains(chains);
    return chain;
  },
  
  async reorderNodes(chainId, newOrder) {
    const chains = await this.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    if (!chain) throw new Error('Chain not found');
    
    const reordered = newOrder.map((ideaId, index) => {
      const node = chain.nodes.find(n => n.idea_id === ideaId || n.id === ideaId);
      if (node) {
        node.order = index + 1;
        return node;
      }
    }).filter(Boolean);
    
    chain.nodes = reordered;
    chain.updated_at = new Date().toISOString();
    await this._saveChains(chains);
    return chain;
  },
  
  async updateNodeDisplay(chainId, ideaId, display) {
    const chains = await this.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    if (!chain) throw new Error('Chain not found');
    
    const node = chain.nodes.find(n => n.idea_id === ideaId);
    if (!node) throw new Error('Node not found');
    
    node.display = display;
    chain.updated_at = new Date().toISOString();
    await this._saveChains(chains);
    return chain;
  },
  
  async getChainWithIdeas(chainId) {
    const chain = await this.getChain(chainId);
    if (!chain) return null;
    
    const allIdeas = await this._getAllIdeas();
    
    // Mapear nodes com ideas (suporta tanto ideaId quanto idea_id)
    chain.nodes = chain.nodes.map(node => {
      const ideaId = node.ideaId || node.idea_id; // Compatibilidade
      const idea = allIdeas.find(i => i.id === ideaId);
      
      return {
        ...node,
        idea: idea,
        id: node.id || `node_${Date.now()}_${Math.random()}` // Garantir id único
      };
    }).filter(n => n.idea || n.type === 'standalone'); // Manter standalones também
    
    return chain;
  },
  
  async _getAllIdeas() {
    // Filas normais + filas virtuais (Full Chat)
    const queues = [
      'ideas_queue_quick', 
      'ideas_queue_default', 
      'ideas_queue_q1',
      'fullchat_chatgpt',
      'fullchat_claude',
      'fullchat_gemini',
      'fullchat_perplexity',
      'fullchat_copilot',
      'fullchat_grok',
      'fullchat_deepseek'
    ];
    let allIdeas = [];
    
    for (const queue of queues) {
      const result = await chrome.storage.local.get(queue);
      const ideas = result[queue] || [];
      allIdeas = allIdeas.concat(ideas.map(idea => ({...idea, queue})));
    }
    
    return allIdeas;
  },
  
  async _saveChains(chains) {
    await chrome.storage.local.set({ [STORAGE_KEY]: chains });
  },
  
  _generateId() {
    return 'chain_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },
  
  // ═══════════════════════════════════════════════════════════
  // NOTES & ATTACHMENTS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Atualiza as notes de uma chain
   */
  async updateChainNotes(chainId, notes) {
    const chains = await this.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    if (!chain) throw new Error('Chain not found');
    
    chain.notes = notes;
    chain.updated_at = new Date().toISOString();
    await this._saveChains(chains);
    
    return chain;
  },
  
  /**
   * Adiciona attachment à chain (só metadata)
   * O arquivo real fica no IndexedDB com chave: chain_${chainId}_${fileName}
   */
  async addChainAttachment(chainId, fileName, fileSize) {
    const chains = await this.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    if (!chain) throw new Error('Chain not found');
    
    if (!chain.attachments) chain.attachments = [];
    
    // Verificar duplicata
    const exists = chain.attachments.find(a => a.fileName === fileName);
    if (exists) {
      throw new Error('Attachment with this name already exists');
    }
    
    chain.attachments.push({
      fileName,
      fileSize,
      uploadedAt: new Date().toISOString()
    });
    
    chain.updated_at = new Date().toISOString();
    await this._saveChains(chains);
    
    return chain;
  },
  
  /**
   * Remove attachment da chain (metadata + arquivo do IndexedDB)
   */
  async removeChainAttachment(chainId, fileName) {
    const chains = await this.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    if (!chain) throw new Error('Chain not found');
    
    if (!chain.attachments) chain.attachments = [];
    
    const index = chain.attachments.findIndex(a => a.fileName === fileName);
    if (index !== -1) {
      chain.attachments.splice(index, 1);
      chain.updated_at = new Date().toISOString();
      await this._saveChains(chains);
      
      // Deletar arquivo do IndexedDB
      const dbKey = `chain_${chainId}_${fileName}`;
      if (window.NodusAttachmentsDB) {
        try {
          await window.NodusAttachmentsDB.deleteFile(dbKey);
        } catch (err) {
          console.error('[Chains] Error deleting file from IndexedDB:', err);
        }
      }
    }
    
    return chain;
  }
};

if (typeof window !== 'undefined') {
  window.NodusChains = NodusChains;
}
