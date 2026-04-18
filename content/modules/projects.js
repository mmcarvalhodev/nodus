/**
 * NODUS Projects - Data Layer
 * Gerencia projetos para organizar cards e chains
 * Version: 1.0.0
 */

const NodusProjects = {
  STORAGE_KEY: 'nodus_projects',
  MIGRATION_FLAG: 'projects_migration_done',

  // Estado global: projeto ativo (usado por Cards e Chains para filtrar)
  _activeProjectId: '__general__',

  /**
   * Obter projeto ativo
   */
  getActiveProjectId() {
    return this._activeProjectId;
  },

  /**
   * Setar projeto ativo e atualizar a tab no dashboard
   */
  async setActiveProject(projectId) {
    this._activeProjectId = projectId;
    // Atualizar label da tab Projetos no dashboard
    this._updateProjectTabLabel(projectId);
  },

  /**
   * Atualizar o label da tab Projetos no header do dashboard
   */
  async _updateProjectTabLabel(projectId) {
    const tabBtn = document.querySelector('[data-tab="mindmap"] .tab-label');
    if (!tabBtn) return;

    if (projectId === '__general__') {
      tabBtn.textContent = window.NodusI18n ? window.NodusI18n.t('dashboard.mindmap') : 'Projetos';
    } else {
      const project = await this.getProject(projectId);
      const name = project ? project.name : 'Projeto';
      tabBtn.textContent = name;
    }
  },

  /**
   * Filtrar array de ideas pelo projeto ativo
   */
  filterByActiveProject(ideas) {
    const pid = this._activeProjectId;
    if (pid === '__general__') return ideas;
    return ideas.filter(idea =>
      idea.projectId === pid || (!idea.projectId && pid === '__no_project__')
    );
  },

  /**
   * Filtrar array de chains pelo projeto ativo
   */
  filterChainsByActiveProject(chains) {
    const pid = this._activeProjectId;
    if (pid === '__general__') return chains;
    return chains.filter(chain =>
      chain.projectId === pid || (!chain.projectId && pid === '__no_project__')
    );
  },

  SPECIAL_PROJECTS: {
    GENERAL: { id: '__general__', name: 'Geral', icon: '📊', isSpecial: true },
    NO_PROJECT: { id: '__no_project__', name: 'Sem Projeto', icon: '📭', isSpecial: true }
  },

  PRESET_COLORS: [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
    '#8b5cf6', '#f97316', '#06b6d4', '#ec4899',
    '#84cc16', '#64748b'
  ],

  QUEUE_KEYS: [
    'ideas_queue_quick', 'ideas_queue_default',
    'ideas_queue_custom1', 'ideas_queue_custom2',
    'ideas_queue_custom3', 'ideas_queue_custom4'
  ],

  VIRTUAL_QUEUE_KEYS: [
    'fullchat_chatgpt', 'fullchat_claude', 'fullchat_gemini',
    'fullchat_perplexity', 'fullchat_copilot', 'fullchat_grok',
    'fullchat_deepseek'
  ],

  /**
   * Inicializar - roda migration se necessario
   */
  async init() {
    await this.migrateExistingData();
  },

  /**
   * Obter todos os projetos customizados
   */
  async getAllProjects() {
    const data = await chrome.storage.local.get(this.STORAGE_KEY);
    const projects = data[this.STORAGE_KEY] || [];
    return projects.sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  /**
   * Obter projeto por ID
   */
  async getProject(projectId) {
    if (projectId === '__general__') return this.SPECIAL_PROJECTS.GENERAL;
    if (projectId === '__no_project__') return this.SPECIAL_PROJECTS.NO_PROJECT;

    const projects = await this.getAllProjects();
    return projects.find(p => p.id === projectId) || null;
  },

  /**
   * Criar novo projeto
   */
  async createProject(name, color) {
    const projects = await this.getAllProjects();

    const project = {
      id: `proj_${Date.now()}`,
      name: name.trim(),
      color: color || this.PRESET_COLORS[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      order: projects.length
    };

    projects.push(project);
    await chrome.storage.local.set({ [this.STORAGE_KEY]: projects });

    return project;
  },

  /**
   * Atualizar projeto
   */
  async updateProject(projectId, updates) {
    const projects = await this.getAllProjects();
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;

    Object.assign(projects[idx], updates, { updatedAt: Date.now() });
    await chrome.storage.local.set({ [this.STORAGE_KEY]: projects });

    return projects[idx];
  },

  /**
   * Deletar projeto - move items para 'Sem Projeto'
   */
  async deleteProject(projectId) {
    // Mover ideas deste projeto para '__no_project__'
    const allQueueKeys = [...this.QUEUE_KEYS, ...this.VIRTUAL_QUEUE_KEYS];
    const data = await chrome.storage.local.get(allQueueKeys);

    const updates = {};
    for (const key of allQueueKeys) {
      const queue = data[key];
      if (!Array.isArray(queue)) continue;

      let changed = false;
      queue.forEach(idea => {
        if (idea.projectId === projectId) {
          idea.projectId = '__no_project__';
          changed = true;
        }
      });

      if (changed) {
        updates[key] = queue;
      }
    }

    // Mover chains deste projeto
    const chainsData = await chrome.storage.local.get('nodus_chains');
    const chains = chainsData.nodus_chains || [];
    let chainsChanged = false;
    chains.forEach(chain => {
      if (chain.projectId === projectId) {
        chain.projectId = '__no_project__';
        chainsChanged = true;
      }
    });
    if (chainsChanged) {
      updates.nodus_chains = chains;
    }

    // Remover projeto da lista
    const projects = await this.getAllProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    updates[this.STORAGE_KEY] = filtered;

    await chrome.storage.local.set(updates);
  },

  /**
   * Contar items por projeto
   */
  async getProjectCounts() {
    const allQueueKeys = [...this.QUEUE_KEYS, ...this.VIRTUAL_QUEUE_KEYS];
    const keysToGet = [...allQueueKeys, 'nodus_chains'];
    const data = await chrome.storage.local.get(keysToGet);

    const counts = {};
    let total = 0;

    // Contar ideas
    for (const key of allQueueKeys) {
      const queue = data[key];
      if (!Array.isArray(queue)) continue;
      queue.forEach(idea => {
        total++;
        const pid = idea.projectId || '__no_project__';
        counts[pid] = (counts[pid] || 0) + 1;
      });
    }

    // Contar chains
    const chains = data.nodus_chains || [];
    chains.forEach(chain => {
      total++;
      const pid = chain.projectId || '__no_project__';
      counts[pid] = (counts[pid] || 0) + 1;
    });

    counts['__general__'] = total;
    return counts;
  },

  /**
   * Mover idea para projeto
   */
  async moveIdeaToProject(ideaId, queueKey, projectId) {
    const data = await chrome.storage.local.get(queueKey);
    const queue = data[queueKey] || [];
    const idx = queue.findIndex(i => i.id === ideaId);
    if (idx === -1) return false;

    queue[idx].projectId = projectId;
    await chrome.storage.local.set({ [queueKey]: queue });
    return true;
  },

  /**
   * Mover chain para projeto
   */
  async moveChainToProject(chainId, projectId) {
    const data = await chrome.storage.local.get('nodus_chains');
    const chains = data.nodus_chains || [];
    const idx = chains.findIndex(c => c.id === chainId);
    if (idx === -1) return false;

    chains[idx].projectId = projectId;
    await chrome.storage.local.set({ nodus_chains: chains });
    return true;
  },

  /**
   * Obter ideas filtradas por projeto
   */
  async getIdeasByProject(projectId) {
    const allQueueKeys = [...this.QUEUE_KEYS, ...this.VIRTUAL_QUEUE_KEYS];
    const data = await chrome.storage.local.get(allQueueKeys);
    const ideas = [];

    for (const key of allQueueKeys) {
      const queue = data[key];
      if (!Array.isArray(queue)) continue;
      queue.forEach(idea => {
        idea._queueKey = key;
        if (projectId === '__general__' || idea.projectId === projectId || (!idea.projectId && projectId === '__no_project__')) {
          ideas.push(idea);
        }
      });
    }

    return ideas.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  },

  /**
   * Obter chains filtradas por projeto
   */
  async getChainsByProject(projectId) {
    const data = await chrome.storage.local.get('nodus_chains');
    const chains = data.nodus_chains || [];

    if (projectId === '__general__') return chains;

    return chains.filter(c =>
      c.projectId === projectId || (!c.projectId && projectId === '__no_project__')
    );
  },

  /**
   * Verificar se pode criar projeto (limite definido em license.js)
   */
  async canCreateProject() {
    if (window.NodusLicense && window.NodusLicense.isPro()) {
      return true;
    }
    const maxProjects = window.NodusLicense?.FREE_LIMITS?.maxProjects ?? 3;
    const projects = await this.getAllProjects();
    return projects.length < maxProjects;
  },

  /**
   * Migration de dados existentes
   */
  async migrateExistingData() {
    const flagData = await chrome.storage.local.get(this.MIGRATION_FLAG);
    if (flagData[this.MIGRATION_FLAG]) return;


    const allQueueKeys = [...this.QUEUE_KEYS, ...this.VIRTUAL_QUEUE_KEYS];
    const keysToGet = [...allQueueKeys, 'nodus_chains'];
    const data = await chrome.storage.local.get(keysToGet);
    const updates = {};

    // Migrar ideas
    for (const key of allQueueKeys) {
      const queue = data[key];
      if (!Array.isArray(queue)) continue;
      let changed = false;
      queue.forEach(idea => {
        if (!idea.projectId) {
          idea.projectId = '__no_project__';
          changed = true;
        }
      });
      if (changed) updates[key] = queue;
    }

    // Migrar chains
    const chains = data.nodus_chains || [];
    let chainsChanged = false;
    chains.forEach(chain => {
      if (!chain.projectId) {
        chain.projectId = '__no_project__';
        chainsChanged = true;
      }
    });
    if (chainsChanged) updates.nodus_chains = chains;

    updates[this.MIGRATION_FLAG] = true;
    await chrome.storage.local.set(updates);
  }
};

// Export
window.NodusProjects = NodusProjects;
