/**
 * NODUS Projects UI
 * Interface do tab Projetos no dashboard
 * Version: 1.0.0
 */

const NodusProjectsUI = {
  _activeProject: '__general__',
  _initialized: false,

  /**
   * Inicializar a view de projetos
   */
  async init() {

    // Inicializar data layer
    if (window.NodusProjects) {
      await window.NodusProjects.init();
    }

    const container = document.getElementById('nodus-dashboard-content');
    if (!container) return;

    container.innerHTML = '<div class="nodus-projects-view" id="projects-view"></div>';
    await this.render();
    this._setupEventListeners();
    this._initialized = true;
  },

  /**
   * Renderizar view completa
   */
  async render() {
    const view = document.getElementById('projects-view');
    if (!view) return;

    const projects = await window.NodusProjects.getAllProjects();
    const counts = await window.NodusProjects.getProjectCounts();

    view.innerHTML = `
      ${this._renderSidebar(projects, counts)}
      <div class="nodus-projects-content" id="projects-content">
        <!-- Conteudo sera carregado por selectProject -->
      </div>
    `;

    // Carregar conteudo do projeto ativo
    await this.selectProject(this._activeProject);
  },

  /**
   * Renderizar sidebar de projetos
   */
  _renderSidebar(projects, counts) {
    const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
    const generalCount = counts['__general__'] || 0;
    const noProjectCount = counts['__no_project__'] || 0;

    const projectItems = projects.map(p => {
      const count = counts[p.id] || 0;
      const isActive = this._activeProject === p.id;
      return `
        <div class="nodus-project-item ${isActive ? 'active' : ''}" data-project-id="${p.id}">
          <div class="nodus-project-item-dot" style="background:${p.color}"></div>
          <div class="nodus-project-item-name">${this._escapeHtml(p.name)}</div>
          <span class="nodus-project-item-count">${count}</span>
          <div class="nodus-project-item-actions">
            <button class="nodus-project-action-btn edit" data-edit-id="${p.id}" title="${_t('btn.edit', 'Edit')}">✏️</button>
            <button class="nodus-project-action-btn delete" data-delete-id="${p.id}" title="${_t('btn.delete', 'Delete')}">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="nodus-projects-sidebar">
        <div class="nodus-projects-sidebar-header">
          📂 ${_t('project.projects', 'Projects')}
        </div>

        <!-- Geral -->
        <div class="nodus-project-item special ${this._activeProject === '__general__' ? 'active' : ''}" data-project-id="__general__">
          <div class="nodus-project-item-dot" style="background:#facc15"></div>
          <div class="nodus-project-item-name">${_t('project.general', 'General')}</div>
          <span class="nodus-project-item-count">${generalCount}</span>
        </div>

        <!-- Sem Projeto -->
        <div class="nodus-project-item special ${this._activeProject === '__no_project__' ? 'active' : ''}" data-project-id="__no_project__">
          <div class="nodus-project-item-dot" style="background:#64748b"></div>
          <div class="nodus-project-item-name">${_t('project.noproj', 'No Project')}</div>
          <span class="nodus-project-item-count">${noProjectCount}</span>
        </div>

        <!-- Projetos customizados -->
        ${projectItems}

        <!-- Botao novo projeto -->
        <button class="nodus-project-new-btn" id="newProjectBtn">
          ➕ ${_t('project.new', 'New Project')}
        </button>
      </div>
    `;
  },

  /**
   * Selecionar projeto e mostrar conteudo
   */
  async selectProject(projectId) {
    this._activeProject = projectId;

    // Setar projeto ativo globalmente (afeta Cartoes e Cadeias)
    if (window.NodusProjects) {
      await window.NodusProjects.setActiveProject(projectId);
    }

    // Atualizar visual da sidebar
    document.querySelectorAll('.nodus-project-item').forEach(el => {
      el.classList.toggle('active', el.dataset.projectId === projectId);
    });

    // Carregar conteudo
    const content = document.getElementById('projects-content');
    if (!content) return;

    const project = await window.NodusProjects.getProject(projectId);
    const ideas = await window.NodusProjects.getIdeasByProject(projectId);
    const chains = await window.NodusProjects.getChainsByProject(projectId);

    const projectName = project ? project.name : 'Projeto';
    const projectColor = project && project.color ? project.color : '#facc15';
    const totalItems = ideas.length + chains.length;

    if (totalItems === 0) {
      content.innerHTML = `
        <div class="nodus-projects-content-header">
          <div class="nodus-projects-content-title">
            <span style="color:${projectColor}">●</span> ${this._escapeHtml(projectName)}
          </div>
        </div>
        <div class="nodus-projects-empty">
          <div class="nodus-projects-empty-icon">📭</div>
          <div class="nodus-projects-empty-text">Nenhum item neste projeto</div>
          <div class="nodus-projects-empty-sub">Salve cards ou cadeias para organiza-los aqui</div>
        </div>
      `;
      return;
    }

    // Renderizar items
    let itemsHtml = '';

    // Chains primeiro
    chains.forEach(chain => {
      const nodeCount = chain.nodes ? chain.nodes.length : 0;
      const firstNode = chain.nodes && chain.nodes[0];
      const previewQ = this._escapeHtml((firstNode && (firstNode.title || firstNode.question) || '').substring(0, 140));
      const previewA = this._escapeHtml((firstNode && firstNode.answer || '').substring(0, 140));
      itemsHtml += `
        <div class="nodus-project-idea-card" draggable="true" data-drag-type="chain" data-drag-id="${chain.id}"
             data-preview-q="${previewQ}" data-preview-a="${previewA}"
             style="border-left-color:#8b5cf6; cursor:grab;">
          <div class="nodus-project-idea-header">
            <span class="nodus-project-idea-platform">🔗 Cadeia · ${nodeCount} nodos</span>
            <span class="nodus-project-idea-date">${this._formatDate(chain.created_at)}</span>
          </div>
          <div class="nodus-project-idea-title">${this._escapeHtml(chain.name)}</div>
        </div>
      `;
    });

    // Depois ideas
    ideas.forEach(idea => {
      const platform = idea.platform || idea.source || 'Unknown';
      const queueColor = (idea._queueKey || '').includes('quick') ? '#facc15' :
                         (idea._queueKey || '').includes('default') ? '#3b82f6' :
                         (idea._queueKey || '').includes('fullchat') ? '#8b5cf6' : '#10b981';
      const previewQ = this._escapeHtml((idea.question || idea.title || '').substring(0, 140));
      const previewA = this._escapeHtml((idea.answer || '').substring(0, 140));
      itemsHtml += `
        <div class="nodus-project-idea-card" draggable="true" data-drag-type="idea" data-drag-id="${idea.id}" data-drag-queue="${idea._queueKey || ''}"
             data-preview-q="${previewQ}" data-preview-a="${previewA}"
             style="border-left-color:${queueColor}; cursor:grab;">
          <div class="nodus-project-idea-header">
            <span class="nodus-project-idea-platform">🤖 ${this._escapeHtml(platform)}</span>
            <span class="nodus-project-idea-date">${this._formatDate(idea.date)}</span>
          </div>
          <div class="nodus-project-idea-title">${this._escapeHtml(idea.title || idea.question || 'Sem titulo')}</div>
          <div class="nodus-project-idea-type">${idea.captureMethod === 'fullchat' ? '📚 Full Chat' : '💡 Card'}</div>
        </div>
      `;
    });

    content.innerHTML = `
      <div class="nodus-projects-content-header">
        <div class="nodus-projects-content-title">
          <span style="color:${projectColor}">●</span> ${this._escapeHtml(projectName)}
        </div>
        <span class="nodus-projects-content-count">${totalItems} item(s)</span>
      </div>
      ${itemsHtml}
    `;
  },

  /**
   * Mostrar modal de criar/editar projeto
   */
  showProjectModal(editProject) {
    // Remover modal existente
    const existing = document.getElementById('nodus-project-modal-overlay');
    if (existing) existing.remove();

    const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
    const isEdit = !!editProject;
    const title = isEdit ? _t('project.edit', 'Edit Project') : _t('project.new', 'New Project');
    const name = isEdit ? editProject.name : '';
    const selectedColor = isEdit ? editProject.color : window.NodusProjects.PRESET_COLORS[0];

    const colorsHtml = window.NodusProjects.PRESET_COLORS.map(color => `
      <div class="nodus-project-color-option ${color === selectedColor ? 'selected' : ''}"
           data-color="${color}" style="background:${color}">
        ${color === selectedColor ? '✓' : ''}
      </div>
    `).join('');

    const overlay = document.createElement('div');
    overlay.id = 'nodus-project-modal-overlay';
    overlay.className = 'nodus-project-modal-overlay';
    overlay.innerHTML = `
      <div class="nodus-project-modal">
        <div class="nodus-project-modal-header">
          📂 ${title}
        </div>
        <div class="nodus-project-modal-body">
          <div>
            <div class="nodus-project-modal-label">${_t('project.name', 'Project Name')}</div>
            <input type="text" class="nodus-project-modal-input" id="projectNameInput"
                   placeholder="${_t('project.name.placeholder', 'Ex: Work, Studies...')}" value="${this._escapeHtml(name)}" maxlength="50">
          </div>
          <div>
            <div class="nodus-project-modal-label">${_t('project.color', 'Color')}</div>
            <div class="nodus-project-modal-colors" id="projectColorPicker">
              ${colorsHtml}
            </div>
          </div>
        </div>
        <div class="nodus-project-modal-footer">
          <button class="nodus-project-modal-btn cancel" id="projectModalCancel">${_t('btn.cancel', 'Cancel')}</button>
          <button class="nodus-project-modal-btn confirm" id="projectModalConfirm"
                  data-edit-id="${isEdit ? editProject.id : ''}">${isEdit ? _t('btn.save', 'Save') : _t('project.create', 'Create Project')}</button>
        </div>
      </div>
    `;

    // Scope overlay to panel area only (not full page)
    const nodusModalEl = document.querySelector('.nodus-dashboard-modal');
    if (nodusModalEl) {
      const rect = nodusModalEl.getBoundingClientRect();
      overlay.style.left = rect.left + 'px';
      overlay.style.right = '0';
      overlay.style.top = '0';
      overlay.style.bottom = '0';
      overlay.style.width = 'auto';
    }
    document.body.appendChild(overlay);

    // Hide hover tooltip while modal is open
    const hoverTooltip = document.getElementById('nodus-project-tooltip');
    if (hoverTooltip) hoverTooltip.style.display = 'none';

    const _closeOverlay = () => {
      overlay.remove();
      if (hoverTooltip) hoverTooltip.style.display = '';
    };

    // Focus no input
    setTimeout(() => document.getElementById('projectNameInput')?.focus(), 100);

    // Eventos do modal
    overlay.querySelector('#projectModalCancel').onclick = _closeOverlay;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _closeOverlay();
    });

    // Color picker
    overlay.querySelectorAll('.nodus-project-color-option').forEach(opt => {
      opt.onclick = () => {
        overlay.querySelectorAll('.nodus-project-color-option').forEach(o => {
          o.classList.remove('selected');
          o.textContent = '';
        });
        opt.classList.add('selected');
        opt.textContent = '✓';
      };
    });

    // Enter no input
    overlay.querySelector('#projectNameInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') overlay.querySelector('#projectModalConfirm').click();
    });

    // Confirmar
    overlay.querySelector('#projectModalConfirm').onclick = async () => {
      const nameInput = document.getElementById('projectNameInput');
      const projectName = nameInput.value.trim();
      if (!projectName) {
        nameInput.style.borderColor = '#ef4444';
        return;
      }

      const selectedColorEl = overlay.querySelector('.nodus-project-color-option.selected');
      const color = selectedColorEl ? selectedColorEl.dataset.color : window.NodusProjects.PRESET_COLORS[0];
      const editId = overlay.querySelector('#projectModalConfirm').dataset.editId;

      if (editId) {
        await window.NodusProjects.updateProject(editId, { name: projectName, color });
      } else {
        await window.NodusProjects.createProject(projectName, color);
      }

      _closeOverlay();
      await this.render();

      if (window.NODUS_UI) {
        window.NODUS_UI.showToast(editId ? '✅ Projeto atualizado' : '✅ Projeto criado', 'success');
      }
    };
  },

  /**
   * Setup event listeners (delegacao)
   */
  _setupEventListeners() {
    const view = document.getElementById('projects-view');
    if (!view) return;

    // ── Hover preview tooltip ──────────────────────────────────────────────
    let tooltip = document.getElementById('nodus-project-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'nodus-project-tooltip';
      tooltip.style.cssText = [
        'position:fixed', 'z-index:999999', 'max-width:260px',
        'background:#1a1f29', 'border:1px solid #3b82f6', 'border-radius:8px',
        'padding:12px', 'font-size:11px', 'color:#e2e8f0',
        'box-shadow:0 4px 20px rgba(0,0,0,0.7)', 'pointer-events:none',
        'display:none', 'line-height:1.5'
      ].join(';');
      document.body.appendChild(tooltip);
    }

    view.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.nodus-project-idea-card');
      if (!card) return;
      const q = card.dataset.previewQ || '';
      const a = card.dataset.previewA || '';
      if (!q && !a) return;
      const title = card.querySelector('.nodus-project-idea-title')?.textContent?.trim() || '';
      let html = `<div style="font-weight:700;margin-bottom:8px;color:#facc15;font-size:12px;">${title}</div>`;
      if (q) html += `<div style="color:#60a5fa;font-size:9px;font-weight:700;margin-bottom:3px;">❓ QUESTÃO</div><div style="margin-bottom:8px;opacity:0.9;">${q}${q.length >= 140 ? '…' : ''}</div>`;
      if (a) html += `<div style="color:#34d399;font-size:9px;font-weight:700;margin-bottom:3px;">💬 RESPOSTA</div><div style="opacity:0.9;">${a}${a.length >= 140 ? '…' : ''}</div>`;
      tooltip.innerHTML = html;
      // Position to the left of the panel
      const rect = card.getBoundingClientRect();
      const tW = 268;
      const left = Math.max(8, rect.left - tW - 10);
      const top = Math.min(rect.top, window.innerHeight - tooltip.offsetHeight - 8);
      tooltip.style.left = left + 'px';
      tooltip.style.top = Math.max(8, top) + 'px';
      tooltip.style.display = 'block';
    });

    view.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.nodus-project-idea-card');
      if (card && !card.contains(e.relatedTarget)) {
        tooltip.style.display = 'none';
      }
    });
    // ──────────────────────────────────────────────────────────────────────

    view.addEventListener('click', async (e) => {
      // Selecionar projeto
      const projectItem = e.target.closest('.nodus-project-item');
      if (projectItem && !e.target.closest('.nodus-project-action-btn')) {
        const projectId = projectItem.dataset.projectId;
        if (projectId) await this.selectProject(projectId);
        return;
      }

      // Editar projeto
      const editBtn = e.target.closest('[data-edit-id]');
      if (editBtn && editBtn.classList.contains('nodus-project-action-btn')) {
        const project = await window.NodusProjects.getProject(editBtn.dataset.editId);
        if (project) this.showProjectModal(project);
        return;
      }

      // Deletar projeto
      const deleteBtn = e.target.closest('[data-delete-id]');
      if (deleteBtn && deleteBtn.classList.contains('delete')) {
        const projectId = deleteBtn.dataset.deleteId;
        const project = await window.NodusProjects.getProject(projectId);
        const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
        if (!project) return;
        const confirmMsg = _t('project.delete.confirm', `Delete project "${project.name}"?\n\nCards and chains will be moved to "No Project".`).replace('{name}', project.name);
        if (!confirm(confirmMsg)) return;
        await window.NodusProjects.deleteProject(projectId);
        if (this._activeProject === projectId) {
          this._activeProject = '__general__';
        }
        await this.render();
        if (window.NODUS_UI) {
          window.NODUS_UI.showToast('🗑️ Projeto excluido', 'success');
        }
        return;
      }

      // Novo projeto
      if (e.target.closest('#newProjectBtn')) {
        const canCreate = await window.NodusProjects.canCreateProject();
        if (!canCreate) {
          if (window.NodusLicense && window.NodusLicense.showPaywall) {
            window.NodusLicense.showPaywall('unlimited_projects');
          } else if (window.NODUS_UI) {
            window.NODUS_UI.showToast('🔒 Limite de 3 projetos no plano Free', 'warning');
          }
          return;
        }
        this.showProjectModal(null);
        return;
      }
    });

    // ── Drag & Drop: cards/chains → sidebar de projetos ──

    // Drag start nos items da listagem
    view.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.nodus-project-idea-card[draggable]');
      if (!card) return;

      const dragType = card.dataset.dragType;
      const dragId = card.dataset.dragId;
      const dragQueue = card.dataset.dragQueue || '';

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-nodus-project-drag', JSON.stringify({
        type: dragType,
        id: dragId,
        queue: dragQueue
      }));

      card.style.opacity = '0.4';
    });

    view.addEventListener('dragend', (e) => {
      const card = e.target.closest('.nodus-project-idea-card[draggable]');
      if (card) card.style.opacity = '1';

      // Limpar highlights
      document.querySelectorAll('.nodus-project-item.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    });

    // Drop zone nos items da sidebar
    view.addEventListener('dragover', (e) => {
      const projectItem = e.target.closest('.nodus-project-item');
      if (!projectItem) return;

      // Nao permitir drop em "Geral" (Geral mostra tudo, nao e um destino)
      if (projectItem.dataset.projectId === '__general__') return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Highlight visual
      document.querySelectorAll('.nodus-project-item.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
      projectItem.classList.add('drag-over');
    });

    view.addEventListener('dragleave', (e) => {
      const projectItem = e.target.closest('.nodus-project-item');
      if (projectItem) {
        projectItem.classList.remove('drag-over');
      }
    });

    view.addEventListener('drop', async (e) => {
      e.preventDefault();
      const projectItem = e.target.closest('.nodus-project-item');
      if (!projectItem) return;

      projectItem.classList.remove('drag-over');

      const targetProjectId = projectItem.dataset.projectId;
      if (!targetProjectId || targetProjectId === '__general__') return;

      const dataStr = e.dataTransfer.getData('application/x-nodus-project-drag');
      if (!dataStr) return;

      try {
        const data = JSON.parse(dataStr);

        if (data.type === 'chain') {
          await window.NodusProjects.moveChainToProject(data.id, targetProjectId);
        } else if (data.type === 'idea') {
          await window.NodusProjects.moveIdeaToProject(data.id, data.queue, targetProjectId);
        }

        // Atualizar view
        await this.render();

        const targetProject = await window.NodusProjects.getProject(targetProjectId);
        const targetName = targetProject ? targetProject.name : targetProjectId;

        if (window.NODUS_UI) {
          window.NODUS_UI.showToast(`📂 Movido para "${targetName}"`, 'success');
        }
      } catch (err) {
        console.error('[ProjectsUI] Drop error:', err);
      }
    });
  },

  /**
   * Formatar data
   */
  _formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / 3600000);

    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atras`;
    if (hours < 48) return 'Ontem';

    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  },

  /**
   * Escapar HTML
   */
  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export
window.NodusProjectsUI = NodusProjectsUI;
