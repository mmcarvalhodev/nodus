// ═══════════════════════════════════════════════════════════
// NODUS v3.3.0 - Dashboard Chains UI (COMPLETO)
// ═══════════════════════════════════════════════════════════

// Telemetry tracker (carrega async)
let telemetryTracker = null;
(async () => {
  try {
    const module = await import(chrome.runtime.getURL('telemetry/telemetry.tracker.js'));
    telemetryTracker = module.getTelemetryTracker();
  } catch (error) {
    console.warn('[Chains UI] ⚠️ Telemetry not available:', error);
  }
})();

const NodusChainsUI = {
  currentChainIndex: 0,
  currentGrid: 1,
  viewMode: 'graph', // 'grid' ou 'graph'
  graphExpanded: false, // Expand ativo no Graph Mode
  sidebarOpen: false,
  selectedIdeaIds: new Set(),
  allIdeas: [],
  currentQueueIndex: 0, // 0=todas, 1=quick, 2=default, 3=q1, 4=q2, 5=q3, 6=q4
  sidebarGrid: 1, // 1 ou 2 colunas na sidebar
  searchQuery: '', // busca de ideias
  draggedNodeId: null, // Para reordenação dentro da chain
  draggedFromChainId: null, // Chain ID de origem no drag (graph mode)
  draggedFromSidebar: false, // Flag para distinguir origem do drag
  showingChainInput: false, // Flag para input inline
  chainInputMode: null, // 'create' ou 'rename'
  selectedChainColor: '#facc15', // Cor selecionada no seletor
  fullChatIncludeImages: false, // Flag: guardar imagens na cadeia no Full Chat
  lastDragPosition: { x: 0, y: 0 }, // Última posição do mouse durante drag
  
  async init() {
    
    // Event delegation global
    if (!document._chainsEventsAttached) {
      this.attachEventsGlobal();
      document._chainsEventsAttached = true;
    }
    
    // Listener para mudança de licença (recarregar UI)
    if (!document._licenseChangeListenerAttached) {
      window.addEventListener('nodus-license-changed', async (e) => {
        await this.render(); // Re-render para atualizar badges PRO
      });
      document._licenseChangeListenerAttached = true;
    }
    
    await this.loadAllIdeas();
    await this.render();
    this.setupStateSyncListener();
  },
  
  /**
   * Setup state sync listener (cross-tab synchronization)
   */
  setupStateSyncListener() {
    if (typeof window.NodusStateSync === 'undefined') {
      console.warn('[Chains UI] StateSync não disponível');
      return;
    }
    
    
    // Sincronizar quando chains mudarem
    window.NodusStateSync.subscribe('nodus_chains', async (newValue) => {
      await this.render();
    });
    
    // Sincronizar quando qualquer queue mudar (afeta sidebar de ideias)
    ['ideas_queue_quick', 'ideas_queue_default', 'ideas_queue_automatic', 
     'ideas_queue_q1', 'ideas_queue_custom2', 'ideas_queue_custom3', 'ideas_queue_custom4'].forEach(queueKey => {
      window.NodusStateSync.subscribe(queueKey, async (newValue) => {
        await this.loadAllIdeas();
        // Não recarregar tudo, só atualizar sidebar se estiver aberta
        if (this.sidebarOpen) {
          await this.render();
        }
      });
    });
    
  },
  
  async loadAllIdeas() {
    
    // Carregar das 6 filas normais (FREE + PRO)
    const queues = [
      'ideas_queue_quick', 
      'ideas_queue_default', 
      'ideas_queue_q1',
      'ideas_queue_custom2',  // Q2 - PRO
      'ideas_queue_custom3',  // Q3 - PRO
      'ideas_queue_custom4'   // Q4 - PRO
    ];
    
    // Adicionar filas virtuais de Full Chat
    const virtualQueues = [
      'fullchat_chatgpt',
      'fullchat_claude',
      'fullchat_gemini',
      'fullchat_perplexity',
      'fullchat_copilot',
      'fullchat_grok',
      'fullchat_deepseek'
    ];
    
    this.allIdeas = [];
    
    // Carregar filas normais
    for (const queueKey of queues) {
      const result = await chrome.storage.local.get(queueKey);
      const ideas = result[queueKey] || [];
      ideas.forEach(idea => {
        idea.queue = queueKey; // Marcar de qual fila veio
      });
      this.allIdeas.push(...ideas);
    }
    
    // Carregar filas virtuais (Full Chat)
    for (const queueKey of virtualQueues) {
      const result = await chrome.storage.local.get(queueKey);
      const ideas = result[queueKey] || [];
      ideas.forEach(idea => {
        idea.queue = queueKey; // Marcar de qual fila veio
        idea.status = 'virtual'; // Marcar como virtual
      });
      this.allIdeas.push(...ideas);
    }
    
  },
  
  attachEventsGlobal() {
    
    // Input de busca (delegado)
    document.addEventListener('input', (e) => {
      if (e.target.id === 'sidebarSearch') {
        this.searchQuery = e.target.value.toLowerCase();
        this.render();
      }
    });
    
    // Enter no input inline de chain
    document.addEventListener('keypress', (e) => {
      if (e.target.id === 'chainNameInputInline' && e.key === 'Enter') {
        e.preventDefault();
        const btn = document.getElementById('confirmChainNameInline');
        if (btn) btn.click();
      }
    });
    
    document.addEventListener('click', async (e) => {
      const chainsView = e.target.closest('#chains-view');
      const sidebar = e.target.closest('#nodus-sidebar-external');
      const deleteConfirm = e.target.closest('#nodus-delete-confirm');
      const removeNodeConfirm = e.target.closest('#nodus-remove-node-confirm');
      const exportSubmenu = e.target.closest('.export-submenu');

      // Aceitar clicks no chains-view, sidebar, confirmações e submenu de export
      if (!chainsView && !sidebar && !deleteConfirm && !removeNodeConfirm && !exportSubmenu) {
        // Fechar submenu de export se clicar fora
        const sub = document.querySelector('.export-submenu');
        if (sub) sub.remove();
        return;
      }
      
      const target = e.target;
      
      console.log('🔍 [Chains] Click capturado:', {
        id: target.id,
        className: target.className,
        tagName: target.tagName
      });
      
      // Nova chain - mostrar input inline
      if (target.id === 'newChainBtn' || target.id === 'newChainWelcome') {
        e.preventDefault();
        e.stopPropagation();
        this.showInlineChainInput('create');
        return;
      }
      
      // Add Node - abrir sidebar
      if (target.id === 'addNodeBtn') {
        e.preventDefault();
        e.stopPropagation();
        this.sidebarOpen = true;
        await this.render();
        return;
      }

      // Fechar sidebar
      if (target.id === 'closeSidebarBtn') {
        e.preventDefault();
        e.stopPropagation();
        this.sidebarOpen = false;
        this.selectedIdeaIds.clear();
        await this.render();
        return;
      }

      // File Tray toggle
      if (target.id === 'toggleFileTrayBtn' || target.closest('#toggleFileTrayBtn')) {
        e.preventDefault();
        e.stopPropagation();
        await this.toggleFileTray();
        return;
      }
      
      // Full Chat - capturar chat completo
      if (target.id === 'fullChatBtn') {
        e.preventDefault();
        e.stopPropagation();
        await this.handleFullChatCapture();
        return;
      }
      
      // Renomear chain
      if (target.classList.contains('chain-name-edit')) {
        e.preventDefault();
        e.stopPropagation();
        this.showInlineChainInput('rename');
        return;
      }
      
      // Seletor de cor da chain
      if (target.classList.contains('chain-color-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const newColor = target.dataset.color;
        this.selectedChainColor = newColor;
        
        // Atualizar visual dos botões de cor
        document.querySelectorAll('.chain-color-btn').forEach(btn => {
          const isSelected = btn.dataset.color === newColor;
          btn.style.border = isSelected ? '2px solid #fff' : '2px solid transparent';
          btn.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';
        });
        
        // Atualizar cor da borda do container e do botão de salvar
        const container = target.closest('div[style*="border:2px solid"]');
        if (container) {
          container.style.borderColor = newColor;
          const title = container.querySelector('div[style*="font-weight:600"]');
          if (title) title.style.color = newColor;
        }
        const saveBtn = document.getElementById('confirmChainNameInline');
        if (saveBtn) {
          saveBtn.style.background = newColor;
          saveBtn.style.color = newColor === '#facc15' ? '#0e1117' : '#fff';
        }
        
        return;
      }
      
      // Confirmar nome da chain (inline)
      if (target.id === 'confirmChainNameInline') {
        e.preventDefault();
        e.stopPropagation();
        await this.handleInlineChainNameConfirm();
        return;
      }
      
      // Cancelar input inline
      if (target.id === 'cancelChainNameInline') {
        e.preventDefault();
        e.stopPropagation();
        this.hideInlineChainInput();
        return;
      }
      
      // === CHAIN ACTIONS MENU ===
      // Fechar menus ao clicar fora
      if (!target.closest('.chain-actions-wrapper') && !target.closest('.chain-actions-wrapper-header')) {
        document.querySelectorAll('.chain-actions-menu, .chain-actions-menu-header').forEach(m => m.style.display = 'none');
      }
      
      // Toggle menu Actions (grid columns E header)
      if (target.classList.contains('chain-actions-btn') || target.closest('.chain-actions-btn') ||
          target.classList.contains('chain-actions-btn-header') || target.closest('.chain-actions-btn-header')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = target.classList.contains('chain-actions-btn') || target.classList.contains('chain-actions-btn-header') 
          ? target 
          : target.closest('.chain-actions-btn') || target.closest('.chain-actions-btn-header');
        const menu = btn.nextElementSibling;
        const isOpen = menu.style.display === 'block';
        
        // Fechar todos os menus
        document.querySelectorAll('.chain-actions-menu, .chain-actions-menu-header').forEach(m => m.style.display = 'none');
        
        // Toggle do atual
        if (!isOpen) {
          menu.style.display = 'block';
        }
        return;
      }
      
      // Copy chain
      if (target.classList.contains('chain-action-copy')) {
        e.preventDefault();
        e.stopPropagation();
        const chainId = target.dataset.chainId;
        document.querySelectorAll('.chain-actions-menu, .chain-actions-menu-header').forEach(m => m.style.display = 'none');
        await this.copyChain(chainId);
        return;
      }
      
      // Export chain - abrir submenu (guard contra handler duplicado)
      if (target.classList.contains('chain-action-export') || target.closest('.chain-action-export')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = target.classList.contains('chain-action-export') ? target : target.closest('.chain-action-export');
        const chainId = btn.dataset.chainId;
        const now = Date.now();
        if (btn._lastExportOpen && now - btn._lastExportOpen < 300) return; // debounce
        btn._lastExportOpen = now;
        this.showExportSubmenu(btn, chainId);
        return;
      }
      
      // Export TXT
      if (target.classList.contains('export-format-txt')) {
        e.preventDefault();
        e.stopPropagation();
        const chainId = target.dataset.chainId;
        await this.exportChainTXT(chainId);
        const submenu = document.querySelector('.export-submenu');
        if (submenu) submenu.remove();
        return;
      }
      
      // Export HTML
      if (target.classList.contains('export-format-html')) {
        e.preventDefault();
        e.stopPropagation();
        const chainId = target.dataset.chainId;
        await this.exportChainHTML(chainId);
        const submenu = document.querySelector('.export-submenu');
        if (submenu) submenu.remove();
        return;
      }
      
      // Export DOCX
      if (target.classList.contains('export-format-docx')) {
        e.preventDefault();
        e.stopPropagation();
        const chainId = target.dataset.chainId;
        await this.exportChainDOCX(chainId);
        const submenu = document.querySelector('.export-submenu');
        if (submenu) submenu.remove();
        return;
      }

      // Export MD
      if (target.classList.contains('export-format-md')) {
        e.preventDefault();
        e.stopPropagation();
        const chainId = target.dataset.chainId;
        await this.exportChainMD(chainId);
        const submenu = document.querySelector('.export-submenu');
        if (submenu) submenu.remove();
        return;
      }

      // Inject chain
      if (target.classList.contains('chain-action-inject')) {
        e.preventDefault();
        e.stopPropagation();
        const chainId = target.dataset.chainId;
        document.querySelectorAll('.chain-actions-menu').forEach(m => m.classList.remove('show'));
        await this.injectChain(chainId);
        return;
      }
      
      // Delete chain
      if (target.classList.contains('chain-action-delete') || target.closest('.chain-action-delete')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = target.classList.contains('chain-action-delete') ? target : target.closest('.chain-action-delete');
        const chainId = btn.dataset.chainId;
        document.querySelectorAll('.chain-actions-menu').forEach(m => m.classList.remove('show'));
        await this.deleteChain(chainId);
        return;
      }
      
      // Attachments
      if (target.classList.contains('chain-action-attachments') || target.closest('.chain-action-attachments')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = target.classList.contains('chain-action-attachments') ? target : target.closest('.chain-action-attachments');
        const chainId = btn.dataset.chainId;
        document.querySelectorAll('.chain-actions-menu, .chain-actions-menu-header').forEach(m => m.style.display = 'none');
        await this.openAttachmentsSidebar(chainId);
        return;
      }
      
      // Notes
      if (target.classList.contains('chain-action-notes') || target.closest('.chain-action-notes')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = target.classList.contains('chain-action-notes') ? target : target.closest('.chain-action-notes');
        const chainId = btn.dataset.chainId;
        document.querySelectorAll('.chain-actions-menu, .chain-actions-menu-header').forEach(m => m.style.display = 'none');
        await this.openNotesSidebar(chainId);
        return;
      }
      
      // Confirmar delete
      if (target.id === 'confirmDeleteChain') {
        e.preventDefault();
        e.stopPropagation();
        const chainId = target.dataset.chainId;
        await this.executeDeleteChain(chainId);
        return;
      }
      
      // Cancelar delete
      if (target.id === 'cancelDeleteChain') {
        e.preventDefault();
        e.stopPropagation();
        const confirmEl = document.getElementById('nodus-delete-confirm');
        if (confirmEl) confirmEl.remove();
        return;
      }
      
      // Toggle sidebar
      if (target.id === 'openSidebarBtn') {
        e.preventDefault();
        e.stopPropagation();
        this.sidebarOpen = !this.sidebarOpen;
        await this.render();
        
        // CRÍTICO: Aplicar margin quando sidebar abre/fecha
        this.applySidebarMargin();
        
        return;
      }
      
      // Click no card da sidebar (toggle seleção)
      const sidebarCard = target.closest('.sidebar-card');
      
      if (sidebarCard) {
        e.preventDefault();
        e.stopPropagation();
        const ideaId = sidebarCard.dataset.ideaId;
        
        if (this.selectedIdeaIds.has(ideaId)) {
          this.selectedIdeaIds.delete(ideaId);
        } else {
          this.selectedIdeaIds.add(ideaId);
        }
        
        await this.render();
        return;
      }
      
      // Queue navigation
      
      if (target.id === 'prevQueueBtn') {
        e.preventDefault();
        e.stopPropagation();
        if (this.currentQueueIndex > 0) {
          this.currentQueueIndex--;
          await this.render();
        }
        return;
      }
      
      if (target.id === 'nextQueueBtn') {
        e.preventDefault();
        e.stopPropagation();
        
        
        if (this.currentQueueIndex < 6) {
          this.currentQueueIndex++;
          await this.render();
        } else {
        }
        return;
      }
      
      // Sidebar grid
      if (target.classList.contains('sidebar-grid-btn')) {
        e.preventDefault();
        e.stopPropagation();
        this.sidebarGrid = parseInt(target.dataset.cols);
        await this.render();
        
        // CRÍTICO: Aplicar margin quando grid muda (I → II ou II → I)
        this.applySidebarMargin();
        
        return;
      }
      
      // Checkbox de idea (REMOVER - substituído por card click)
      /*
      if (target.classList.contains('idea-checkbox')) {
        e.stopPropagation();
        const ideaId = target.dataset.ideaId;
        if (target.checked) {
          this.selectedIdeaIds.add(ideaId);
        } else {
          this.selectedIdeaIds.delete(ideaId);
        }
        this.updateSelectionCount();
        return;
      }
      */
      
      // Adicionar selecionados
      if (target.id === 'addSelectedBtn') {
        e.preventDefault();
        e.stopPropagation();
        await this.addSelectedToChain();
        return;
      }
      
      // Limpar seleção
      if (target.id === 'clearSelectionBtn') {
        e.preventDefault();
        e.stopPropagation();
        this.selectedIdeaIds.clear();
        await this.render();
        return;
      }
      
      // Grid
      if (target.classList.contains('grid-btn')) {
        e.preventDefault();
        e.stopPropagation();
        this.viewMode = 'grid';
        this.graphExpanded = false; // Reset expand ao sair do Graph
        this.currentGrid = parseInt(target.dataset.cols);
        
        // CRÍTICO: Atualizar largura da modal como Cards faz
        if (window.NodusDashboard) {
          window.NodusDashboard.updateModalWidth(this.currentGrid);
        }
        
        await this.render();
        return;
      }
      
      // Graph Mode
      if (target.id === 'graphModeBtn') {
        e.preventDefault();
        e.stopPropagation();
        this.viewMode = 'graph';
        this.graphExpanded = false; // Reset expand ao entrar no Graph
        await this.render();
        return;
      }
      
      // Expand Graph Mode
      if (target.id === 'expandGraphBtn') {
        e.preventDefault();
        e.stopPropagation();
        if (this.viewMode === 'graph') {
          this.graphExpanded = !this.graphExpanded;
          
          // Sincronizar sidebar com expansão
          if (this.graphExpanded && this.sidebarOpen) {
            this.sidebarGrid = 2; // Sidebar também expande
          } else if (!this.graphExpanded) {
            this.sidebarGrid = 1; // Sidebar volta ao normal
          }
          
          // CRÍTICO: Atualizar largura da modal igual ao Grid II
          if (window.NodusDashboard) {
            window.NodusDashboard.updateModalWidth(this.graphExpanded ? 2 : 1);
          }
          
          await this.render();
          
          // CRÍTICO: Aplicar margin quando graph expande/contrai
          this.applySidebarMargin();
        }
        return;
      }
      
      // Chain tabs
      if (target.classList.contains('chain-tab')) {
        e.preventDefault();
        e.stopPropagation();
        
        const clickedIndex = parseInt(target.dataset.index);
        
        // Se Grid II/III, ajustar para início do bloco
        if (this.currentGrid > 1 && this.viewMode === 'grid') {
          // Encontrar o início do bloco que contém o index clicado
          const blockSize = this.currentGrid;
          const blockStart = Math.floor(clickedIndex / blockSize) * blockSize;
          this.currentChainIndex = blockStart;
        } else {
          // Grid I ou Graph: navegação normal
          this.currentChainIndex = clickedIndex;
        }
        
        await this.render();
        return;
      }
      
      // Toggle display
      if (target.classList.contains('toggle-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const ideaId = target.dataset.ideaId;
        const chainId = target.dataset.chainId;
        const current = target.dataset.state;
        const next = current === 'both' ? 'question' : current === 'question' ? 'answer' : 'both';
        await window.NodusChains.updateNodeDisplay(chainId, ideaId, next);
        await this.renderNodes();
        return;
      }
      
      // Remover node
      if (target.classList.contains('remove-node-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const nodeId = target.dataset.nodeId;
        const chainId = target.dataset.chainId;
        this.showRemoveNodeConfirmation(chainId, nodeId);
        return;
      }
      
      // Confirmar remoção de node
      if (target.id === 'confirmRemoveNode') {
        e.preventDefault();
        e.stopPropagation();
        const chainId = target.dataset.chainId;
        const nodeId = target.dataset.nodeId;
        await this.executeRemoveNode(chainId, nodeId);
        return;
      }
      
      // Cancelar remoção de node
      if (target.id === 'cancelRemoveNode') {
        e.preventDefault();
        e.stopPropagation();
        const confirmEl = document.getElementById('nodus-remove-node-confirm');
        if (confirmEl) confirmEl.remove();
        return;
      }
      
      // Promover node (idea virtual → fila real)
      if (target.classList.contains('promote-node-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const ideaId = target.dataset.ideaId;
        await this.showPromoteModal(ideaId);
        return;
      }
      
      // Navegação
      if (target.id === 'prevChainBtn') {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.currentChainIndex > 0) {
          // Grid II/III: Avançar em blocos
          if (this.currentGrid > 1 && this.viewMode === 'grid') {
            this.currentChainIndex = Math.max(0, this.currentChainIndex - this.currentGrid);
          } else {
            // Grid I: Avançar 1
            this.currentChainIndex--;
          }
          await this.render();
        }
        return;
      }
      
      if (target.id === 'nextChainBtn') {
        e.preventDefault();
        e.stopPropagation();
        const chains = await window.NodusChains.getAllChains();
        
        // Grid II/III: Avançar em blocos
        if (this.currentGrid > 1 && this.viewMode === 'grid') {
          const nextIndex = this.currentChainIndex + this.currentGrid;
          if (nextIndex < chains.length) {
            this.currentChainIndex = nextIndex;
            await this.render();
          }
        } else {
          // Grid I: Avançar 1
          if (this.currentChainIndex < chains.length - 1) {
            this.currentChainIndex++;
            await this.render();
          }
        }
        return;
      }
    });
  },
  
  updateSelectionCount() {
    const countEl = document.getElementById('selectionCount');
    if (countEl) {
      countEl.textContent = `${this.selectedIdeaIds.size} selecionado(s)`;
    }
  },
  
  async addSelectedToChain() {
    if (this.selectedIdeaIds.size === 0) {
      if (window.NODUS_UI) { window.NODUS_UI.showToast('Selecione pelo menos uma ideia', 'warning'); }
      return;
    }
    
    const chains = await window.NodusChains.getAllChains();
    if (chains.length === 0) {
      if (window.NODUS_UI) { window.NODUS_UI.showToast('Crie uma chain primeiro', 'warning'); }
      return;
    }
    
    const chain = chains[this.currentChainIndex];
    
    for (const ideaId of this.selectedIdeaIds) {
      await window.NodusChains.addNodeToChain(chain.id, ideaId, 'both');
    }
    
    
    this.selectedIdeaIds.clear();
    this.sidebarOpen = false;
    await this.render();
  },
  
  async render(providedChains = null) {
    
    // BUSCAR CHAINS (usar providedChains se disponível para evitar race condition)
    let chains = providedChains !== null ? providedChains : await window.NodusChains.getAllChains();

    // Filtrar por projeto ativo
    if (window.NodusProjects) {
      chains = window.NodusProjects.filterChainsByActiveProject(chains);
    }
    
    // VALIDAR currentChainIndex PREVENTIVAMENTE (ANTES de qualquer uso)
    // Corrigir índice fora dos limites (ex: delete, full chat, etc)
    if (chains.length > 0 && this.currentChainIndex >= chains.length) {
      const oldIndex = this.currentChainIndex;
      this.currentChainIndex = chains.length - 1; // Último válido
    }
    
    // Se não há chains E não está em modo Full Chat, resetar para 0
    if (chains.length === 0 && !this.isFullChatMode) {
      this.currentChainIndex = 0;
    }
    
    const container = document.getElementById('chains-view');
    const sidebar = document.getElementById('nodus-sidebar-external');
    const overlay = document.getElementById('nodus-dashboard-overlay');
    
    // Se container não existe, dashboard não está em Chains - retornar silenciosamente
    if (!container) {
      return;
    }
    
    // Se sidebar não existe, criar depois - não é crítico
    if (!sidebar) {
      return;
    }
    
    // CRIAR HOVER CARD GLOBAL NO OVERLAY (fora de todos os overflow:hidden)
    if (!document.getElementById('globalGraphHoverCard')) {
      const hoverCard = document.createElement('div');
      hoverCard.id = 'globalGraphHoverCard';
      hoverCard.className = 'graph-hover-card';
      hoverCard.style.cssText = 'display:none; position:fixed; z-index:999999; width:220px; background:#1a1f29; border:2px solid #3b82f6; border-radius:6px; padding:10px; box-shadow:0 8px 24px rgba(0,0,0,0.8); pointer-events:none; transition:all 0.15s ease-out;';
      hoverCard.innerHTML = `
        <div id="hoverCardTitle" style="font-size:11px; font-weight:600; margin-bottom:6px; line-height:1.2;"></div>
        <div style="display:flex; align-items:center; gap:5px; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #2d3748;">
          <span id="hoverCardIcon" style="font-size:12px;"></span>
          <span id="hoverCardPlatform" style="color:#a0aec0; font-size:10px;"></span>
          <span id="hoverCardBadge" style="padding:2px 5px; border-radius:3px; font-size:9px; font-weight:bold; margin-left:auto;"></span>
        </div>
        <div style="margin-bottom:6px;">
          <div id="hoverCardQuestionLabel" style="color:#3b82f6; font-size:9px; font-weight:600; margin-bottom:2px;">❓ PERGUNTA</div>
          <div id="hoverCardQuestion" style="color:#e2e8f0; font-size:10px; line-height:1.3;"></div>
        </div>
        <div>
          <div id="hoverCardAnswerLabel" style="color:#10b981; font-size:9px; font-weight:600; margin-bottom:2px;">💬 RESPOSTA</div>
          <div id="hoverCardAnswer" style="color:#e2e8f0; font-size:10px; line-height:1.3;"></div>
        </div>
      `;
      overlay.appendChild(hoverCard);
    }
    
    
    // Fix CSS do content (chains apenas)
    const dashboardContent = document.getElementById('nodus-dashboard-content');
    if (dashboardContent) {
      dashboardContent.style.display = 'flex';
      dashboardContent.style.flexDirection = 'column';
      dashboardContent.style.height = '100%';
      dashboardContent.style.minHeight = '600px';
      dashboardContent.style.overflow = 'hidden'; // CRÍTICO: hidden para scroll nos filhos
    }
    
    // Aplicar estilos no chains-view
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';
    container.style.minHeight = '600px';
    container.style.width = '100%';
    container.style.overflow = 'hidden'; // CRÍTICO: hidden para permitir scroll nos filhos
    
    // Modal NÃO deve ter estilos inline de posicionamento - deixar CSS controlar
    const modal = document.getElementById('nodus-dashboard-modal');
    // NÃO aplicar nenhum estilo inline no modal relacionado a posicionamento
    
    // SIDEBAR - position fixed à esquerda do modal
    if (this.sidebarOpen) {
      const modal = document.getElementById('nodus-dashboard-modal');
      const modalHeight = modal ? modal.offsetHeight : 600;
      const modalRect = modal ? modal.getBoundingClientRect() : null;
      const sidebarWidth = this.sidebarGrid === 1 ? 320 : 640;
      
      sidebar.style.display = 'flex';
      sidebar.style.flexDirection = 'column';
      sidebar.style.width = `${sidebarWidth}px`;
      sidebar.style.height = `${modalHeight}px`;
      sidebar.style.position = 'fixed';
      
      // Posicionar à ESQUERDA do modal (posição final)
      if (modalRect) {
        const finalLeft = modalRect.left - sidebarWidth - 15;
        sidebar.style.left = `${finalLeft}px`;
        sidebar.style.top = `${modalRect.top}px`;
      }
      
      sidebar.style.background = '#1a1f29';
      sidebar.style.border = '2px solid #2d3748';
      sidebar.style.borderRadius = '8px';
      sidebar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
      sidebar.style.overflow = 'hidden';
      sidebar.style.zIndex = '999997'; // ABAIXO do modal (modal é 999999)
      
      // ANIMAÇÃO: Começar COLADA NO MODAL (direita) e deslizar para ESQUERDA
      if (sidebar.dataset.firstOpen !== 'false') {
        // INÍCIO: Colada no modal (translateX positivo = mais à direita)
        sidebar.style.transform = `translateX(${sidebarWidth + 15}px)`;
        sidebar.style.opacity = '0';
        sidebar.dataset.firstOpen = 'false';
        
        // Forçar reflow
        sidebar.offsetHeight;
        
        // DESTINO: Posição final (translateX 0)
        requestAnimationFrame(() => {
          sidebar.style.transform = 'translateX(0)';
          sidebar.style.opacity = '1';
          sidebar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        });
      } else {
        // Já estava visível, manter posição
        sidebar.style.transform = 'translateX(0)';
        sidebar.style.opacity = '1';
        sidebar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      }
      
      // Se pinado, adicionar classe no body para empurrar conteúdo
      if (overlay && overlay.classList.contains('pinned')) {
        const gridClass = this.sidebarGrid === 1 ? 'sidebar-grid-1' : 'sidebar-grid-2';
        document.body.classList.add('nodus-sidebar-open', gridClass);
        
        // SOLUÇÃO ESPECÍFICA PARA CLAUDE: Aplicar APENAS o margin adicional da sidebar
        // (o dashboard já empurra via CSS do body)
        this.applySidebarMargin(); // Aplicar margin para sidebar
      }
    } else {
      // FECHAR: deslizar para DIREITA (volta para baixo do modal)
      const modal = document.getElementById('nodus-dashboard-modal');
      const modalRect = modal ? modal.getBoundingClientRect() : null;
      const sidebarWidth = this.sidebarGrid === 1 ? 320 : 640;
      
      if (sidebar.style.display === 'none') {
        // Já está fechado
        sidebar.style.display = 'none';
      } else {
        // Manter posição
        if (modalRect) {
          const finalLeft = modalRect.left - sidebarWidth - 15;
          sidebar.style.left = `${finalLeft}px`;
          sidebar.style.top = `${modalRect.top}px`;
        }
        
        // Deslizar para DIREITA (volta colada no modal)
        sidebar.style.transform = `translateX(${sidebarWidth + 15}px)`;
        sidebar.style.opacity = '0';
        sidebar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        
        // Após animação, esconder
        setTimeout(() => {
          if (!this.sidebarOpen) {
            sidebar.style.display = 'none';
            sidebar.dataset.firstOpen = 'true';
          }
        }, 300);
      }
      
      // Remover classes de sidebar aberta
      if (overlay && overlay.classList.contains('pinned')) {
        document.body.classList.remove('nodus-sidebar-open', 'sidebar-grid-1', 'sidebar-grid-2');
        this.removePlatformSpecificMargin(); // Remover margin específico da plataforma
      }
    }
    
    const visibleIndexes = this.getVisibleChainIndexes(chains.length);
    
    // Renderizar SIDEBAR
    sidebar.innerHTML = `
      <style>
        #sidebarCardsGrid::-webkit-scrollbar {
          width: 6px;
        }
        #sidebarCardsGrid::-webkit-scrollbar-track {
          background: transparent;
        }
        #sidebarCardsGrid::-webkit-scrollbar-thumb {
          background: #2d3748;
          border-radius: 3px;
        }
        #sidebarCardsGrid::-webkit-scrollbar-thumb:hover {
          background: #4a5568;
        }
      </style>
      
      <!-- Header -->
      <div style="padding:12px 15px; border-bottom:1px solid #2d3748; display:flex; align-items:center; gap:8px;">
        <input type="text" id="sidebarSearch" placeholder="🔍 Buscar ideias..." style="flex:1; padding:8px 12px; background:#262b36; border:1px solid #2d3748; border-radius:6px; color:#e2e8f0; font-size:13px;">
        <button id="closeSidebarBtn" title="Fechar" style="width:30px; height:30px; flex-shrink:0; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:6px; color:#ef4444; cursor:pointer; font-size:20px; display:flex; align-items:center; justify-content:center; line-height:1; transition:all 0.2s;">×</button>
      </div>
      
      <!-- Queue Selector -->
      <!-- Queue Selector -->
      <div class="sidebar-queue-selector">
        ${(() => {
          return '';
        })()}
        <button id="prevQueueBtn" class="queue-nav-arrow" ${this.currentQueueIndex === 0 ? 'disabled' : ''}>&lt;</button>
        <div class="current-queue">
          ${['Todas', 'Quick', 'Default', 'Q1', 'Q2', 'Q3', 'Q4'][this.currentQueueIndex] || 'Q1'}
        </div>
        <button id="nextQueueBtn" class="queue-nav-arrow" ${this.currentQueueIndex >= 6 ? 'disabled' : ''}>&gt;</button>
      </div>
      
      <!-- Grid Controls -->
      <div class="sidebar-grid-controls">
        <span>Grade:</span>
        ${[1, 2].map(cols => `
          <button class="sidebar-grid-btn ${cols === this.sidebarGrid ? 'active' : ''}" data-cols="${cols}">
            ${'I'.repeat(cols)}
          </button>
        `).join('')}
      </div>
      
      <!-- Cards Grid -->
      <div id="sidebarCardsGrid" class="sidebar-cards-grid cols-${this.sidebarGrid}" style="flex:1; overflow-y:auto; padding:15px; align-content:start;">
        ${this.renderSidebarIdeas()}
      </div>
      
      <!-- Footer de Seleção -->
      ${this.selectedIdeaIds.size > 0 ? `
        <div class="sidebar-footer show">
          <div class="selection-info">
            ${this.selectedIdeaIds.size} selecionado(s)
          </div>
          <div class="selection-actions">
            <button id="clearSelectionBtn" class="selection-btn clear">
              ✕ Limpar
            </button>
            <button id="addSelectedBtn" class="selection-btn add">
              ➕ Adicionar
            </button>
          </div>
        </div>
      ` : ''}
    `;
    
    // Renderizar CHAINS-VIEW
    container.innerHTML = `
      <style>
        .node-card.dragging {
          opacity: 0.5;
          cursor: grabbing;
          transform: scale(0.98);
        }
        
        .graph-node {
          transition: all 0.2s ease;
        }
        
        .graph-node:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        
        .graph-node.dragging {
          opacity: 0.5;
          cursor: grabbing;
          transform: scale(0.95);
        }
        
        .graph-sphere {
          transition: transform 0.2s ease;
        }
        
        .graph-sphere:hover {
          transform: scale(1.3);
        }
        
        /* Info tooltip hover */
        .info-btn-container:hover .info-tooltip {
          display: block !important;
        }
        
        .info-node-btn:hover {
          background: #3a4255 !important;
          border-color: #facc15 !important;
        }
        
        /* Scrollbar do nodesGrid - SEMPRE VISÍVEL */
        #nodesGrid::-webkit-scrollbar {
          width: 18px;
        }
        #nodesGrid::-webkit-scrollbar-track {
          background: #0e1117;
          border-left: 1px solid #2d3748;
        }
        #nodesGrid::-webkit-scrollbar-thumb {
          background: #4a5568;
          border-radius: 9px;
          border: 4px solid #0e1117;
        }
        #nodesGrid::-webkit-scrollbar-thumb:hover {
          background: #5a6578;
        }
      </style>
      
      <div style="padding:15px 0; flex:1; height:0; display:flex; flex-direction:column; overflow:hidden;">
        
        <!-- Chain Controls Bar - Layout Correto -->
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px; padding:12px; background:#1a1f29; border-radius:8px;">
          
          <!-- ROW 1: Node + Navigation + New Chain -->
          <div style="display:flex; align-items:center; justify-content:center; gap:10px;">
            
            <button id="addNodeBtn" style="padding:6px 12px; background:#334155; border:1px solid #475569; border-radius:5px; color:#e2e8f0; cursor:pointer; font-size:12px; font-weight:500; transition:all 0.2s;" title="${window.NodusI18n ? window.NodusI18n.t('btn.addnode') : 'Node'}">
              ➕ ${window.NodusI18n ? window.NodusI18n.t('btn.addnode') : 'Node'}
            </button>
            
            <!-- Previous Chain -->
            <button id="prevChainBtn" style="width:32px; height:32px; background:#334155; border:1px solid #475569; border-radius:6px; color:${this.currentChainIndex > 0 ? '#e2e8f0' : '#4a5568'}; font-size:16px; cursor:${this.currentChainIndex > 0 ? 'pointer' : 'not-allowed'}; transition:all 0.2s;" ${this.currentChainIndex === 0 ? 'disabled' : ''}>
              ‹
            </button>
            
            <!-- Chain Selector / Tabs -->
            <div style="display:flex; gap:6px; align-items:center; overflow-x:auto; max-width:320px; scrollbar-width:none; -ms-overflow-style:none; flex-shrink:1; padding-bottom:1px;">
              ${(() => {
                if (chains.length === 0) {
                  return '<span style="color:#94a3b8; font-size:13px;">No chains</span>';
                }

                // Graph mode: título interativo fica direto nas colunas — mostrar só nome da chain ativa
                if (this.viewMode === 'graph') {
                  const currentChain = chains[this.currentChainIndex];
                  const tabColor = currentChain?.color || '#facc15';
                  const textColor = (tabColor === '#facc15' || tabColor === '#fbbf24') ? '#0e1117' : '#fff';
                  return `<span style="padding:4px 10px; background:${tabColor}; border-radius:5px; color:${textColor}; font-size:11px; font-weight:700; white-space:nowrap; opacity:0.85;">
                    ${this.escapeHtml(currentChain?.name || '')}
                  </span>
                  <span style="font-size:11px; color:#64748b; white-space:nowrap;">— clique no título da cadeia para selecionar</span>`;
                }

                if (this.currentGrid > 1 && this.viewMode === 'grid') {
                  const visibleIndexes = this.getVisibleChainIndexes(chains.length);
                  return visibleIndexes.map(idx => {
                    const tabColor = chains[idx].color || '#facc15';
                    const isActive = idx === this.currentChainIndex;
                    const textColor = tabColor === '#facc15' ? '#0e1117' : '#fff';
                    const chainName = chains[idx].name.length > 20 ? chains[idx].name.substring(0, 20) + '...' : chains[idx].name;
                    return `
                      <div class="chain-tab" data-index="${idx}" style="padding:5px 10px; background:${isActive ? tabColor : '#334155'}; border:1px solid ${isActive ? tabColor : '#475569'}; border-radius:5px; color:${isActive ? textColor : '#cbd5e1'}; cursor:pointer; font-size:11px; font-weight:500; white-space:nowrap; transition:all 0.2s;">
                        ${this.escapeHtml(chainName)}
                      </div>
                    `;
                  }).join('');
                }
                
                const currentChain = chains[this.currentChainIndex];
                const tabColor = currentChain.color || '#facc15';
                const textColor = tabColor === '#facc15' ? '#0e1117' : '#fff';
                const chainName = currentChain.name.length > 30 ? currentChain.name.substring(0, 30) + '...' : currentChain.name;
                return `<div class="chain-tab" data-index="${this.currentChainIndex}" style="padding:6px 12px; background:${tabColor}; border:1px solid ${tabColor}; border-radius:6px; color:${textColor}; cursor:pointer; font-size:12px; font-weight:600; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                  <span>${this.escapeHtml(chainName)}</span>
                  <span class="chain-name-edit" style="font-size:11px; opacity:0.7; cursor:pointer;" title="Rename">✏️</span>
                </div>`;
              })()}
            </div>
            
            <!-- Next Chain -->
            <button id="nextChainBtn" style="width:32px; height:32px; background:#334155; border:1px solid #475569; border-radius:6px; color:${this.currentChainIndex < chains.length - 1 ? '#e2e8f0' : '#4a5568'}; font-size:16px; cursor:${this.currentChainIndex < chains.length - 1 ? 'pointer' : 'not-allowed'}; transition:all 0.2s;" ${this.currentChainIndex >= chains.length - 1 ? 'disabled' : ''}>
              ›
            </button>
            
            <button id="newChainBtn" style="padding:6px 12px; background:#334155; border:1px solid #475569; border-radius:5px; color:#e2e8f0; cursor:pointer; font-size:12px; font-weight:500; transition:all 0.2s;" title="${window.NodusI18n ? window.NodusI18n.t('btn.newchain') : 'New'}">
              🔗 ${window.NodusI18n ? window.NodusI18n.t('btn.newchain') : 'New'}
            </button>
          </div>
          
          <!-- ROW 2: Full Chat Button (oculto no modo Grafo) -->
          ${this.viewMode !== 'graph' ? `
          <div style="display:flex; justify-content:center;">
            <button id="fullChatBtn" style="padding:8px 20px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); border:1px solid #059669; border-radius:6px; color:white; font-weight:600; font-size:13px; cursor:pointer; transition:all 0.2s; box-shadow:0 2px 4px rgba(16, 185, 129, 0.2);" title="${window.NodusI18n ? window.NodusI18n.t('btn.fullchat') : 'Capturar Chat'}">
              📚 ${window.NodusI18n ? window.NodusI18n.t('btn.fullchat') : 'Capturar Chat'}
            </button>
          </div>
          ` : ''}
        </div>
        
        ${this.showingChainInput ? await this.renderInlineChainInput() : ''}
        
        <!-- Grid Controls -->
        <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:5px;">
          <span style="color:#a0aec0; font-size:13px; font-weight:600;">Grade:</span>
          ${[1, 2, 3].map(cols => `
            <button class="grid-btn" data-cols="${cols}" style="padding:5px 12px; background:${cols === this.currentGrid && this.viewMode === 'grid' ? '#2a3140' : '#262b36'}; border:1px solid ${cols === this.currentGrid && this.viewMode === 'grid' ? '#facc15' : '#2d3748'}; border-radius:4px; color:${cols === this.currentGrid && this.viewMode === 'grid' ? '#facc15' : '#a0aec0'}; cursor:pointer; font-size:12px; font-weight:600;">
              ${'I'.repeat(cols)}
            </button>
          `).join('')}
          <!-- Botão Graph + Expand combinado -->
          <div style="display:flex; border-radius:4px; overflow:hidden; border:1px solid ${this.viewMode === 'graph' ? '#facc15' : '#2d3748'};">
            <button id="graphModeBtn" style="padding:5px 12px; background:${this.viewMode === 'graph' ? '#2a3140' : '#262b36'}; border:none; color:${this.viewMode === 'graph' ? '#facc15' : '#a0aec0'}; cursor:pointer; font-size:12px; font-weight:600;">
              ⭕ Grafo
            </button>
            <button id="expandGraphBtn" style="padding:5px 8px; background:${this.viewMode === 'graph' && this.graphExpanded ? '#facc15' : (this.viewMode === 'graph' ? '#2a3140' : '#262b36')}; border:none; border-left:1px solid ${this.viewMode === 'graph' ? '#facc15' : '#2d3748'}; color:${this.viewMode === 'graph' && this.graphExpanded ? '#000' : (this.viewMode === 'graph' ? '#facc15' : '#4a5568')}; cursor:${this.viewMode === 'graph' ? 'pointer' : 'not-allowed'}; font-size:12px; font-weight:600; opacity:${this.viewMode === 'graph' ? '1' : '0.5'};" ${this.viewMode !== 'graph' ? 'disabled' : ''} title="Expandir">
              ↔
            </button>
          </div>
        </div>
        
        <!-- Botão Arquivos -->
        <div class="nodus-files-bar">
          <button class="nodus-files-toggle-btn" id="toggleFileTrayBtn">
            📂 Arquivos <span class="nodus-files-badge" id="filesTrayBadge">${chains[this.currentChainIndex] && chains[this.currentChainIndex].attachments ? chains[this.currentChainIndex].attachments.length : 0}</span>
          </button>
        </div>

        <!-- Nodes Grid - estilos serão aplicados por renderNodes() -->
        <div id="nodesGrid" style="flex:1; width:100%; overflow-y:scroll; display:flex; justify-content:center; scroll-behavior:smooth;">
          ${chains.length === 0 ? `
            <div style="text-align:center; padding:60px 20px; color:#a0aec0;">
              <h2 style="color:#e2e8f0; margin-bottom:10px;">🔗 Chains Mode</h2>
              <p>Organize ideias em sequências</p>
              <button id="newChainWelcome" style="margin-top:20px; padding:10px 20px; background:#facc15; border:none; border-radius:8px; color:#0e1117; font-weight:600; cursor:pointer;">
                ➕ Criar Nova Chain
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    
    if (chains.length > 0) {
      await this.renderNodes();
    }
    
    
    // Focus no input inline se estiver visível
    if (this.showingChainInput) {
      setTimeout(() => {
        const input = document.getElementById('chainNameInputInline');
        if (input) {
          input.focus();
          input.select();
        }
      }, 100);
    }
    
    // Inicializar drag & drop após render
    setTimeout(() => this.initDragAndDrop(), 100);
    
    // CRÍTICO: Aplicar margin específico para Claude.ai quando sidebar aberta
    this.applySidebarMargin();
  },
  
  showInlineChainInput(mode) {
    this.showingChainInput = true;
    this.chainInputMode = mode;
    this.render();
  },
  
  hideInlineChainInput() {
    this.showingChainInput = false;
    this.chainInputMode = null;
    this.render();
  },
  
  async renderInlineChainInput() {
    const chains = await window.NodusChains.getAllChains();
    let defaultName = '';
    let currentColor = '#facc15'; // Amarelo padrão
    
    if (this.chainInputMode === 'create') {
      defaultName = `Chain ${chains.length + 1}`;
    } else if (this.chainInputMode === 'rename') {
      const chain = chains[this.currentChainIndex];
      defaultName = chain ? chain.name : '';
      currentColor = chain?.color || '#facc15';
    }
    
    // Atualizar cor selecionada
    this.selectedChainColor = currentColor;
    
    // Cores disponíveis para chains
    const chainColors = [
      { color: '#facc15', name: 'Amarelo' },
      { color: '#10b981', name: 'Verde' },
      { color: '#3b82f6', name: 'Azul' },
      { color: '#ef4444', name: 'Vermelho' },
      { color: '#8b5cf6', name: 'Roxo' },
      { color: '#f97316', name: 'Laranja' },
      { color: '#ec4899', name: 'Rosa' },
      { color: '#06b6d4', name: 'Ciano' }
    ];
    
    return `
      <div style="margin:15px auto; padding:12px; background:#262b36; border:2px solid ${currentColor}; border-radius:8px; max-width:280px;">
        <div style="color:${currentColor}; font-size:12px; font-weight:600; margin-bottom:8px;">
          ${this.chainInputMode === 'create' ? '➕ Nova Chain' : '✏️ Renomear Chain'}
        </div>
        <input type="text" id="chainNameInputInline" value="${this.escapeHtml(defaultName)}" 
          style="width:100%; box-sizing:border-box; padding:8px 10px; background:#1a1f29; border:1px solid #2d3748; border-radius:6px; color:#e2e8f0; font-size:13px; margin-bottom:10px;"
          placeholder="Nome da chain...">
        
        <!-- Seletor de Cor -->
        <div style="margin-bottom:10px;">
          <div style="color:#a0aec0; font-size:11px; margin-bottom:6px;">🎨 Cor da Chain:</div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${chainColors.map(c => `
              <button class="chain-color-btn" data-color="${c.color}" title="${c.name}"
                style="width:24px; height:24px; border-radius:50%; background:${c.color}; border:2px solid ${c.color === currentColor ? '#fff' : 'transparent'}; cursor:pointer; transition:all 0.2s; ${c.color === currentColor ? 'transform:scale(1.15);' : ''}">
              </button>
            `).join('')}
          </div>
        </div>
        
        ${(() => {
          // Checkbox de imagens: só aparece no modo Full Chat se houver imagens
          if (!this.isFullChatMode) return '';
          const totalImgs = (this.pendingFullChatNodes || []).reduce((s, n) => s + (n.images?.length || 0), 0);
          if (totalImgs === 0) return '';
          return `
            <div style="margin-bottom:10px; padding:8px 10px; background:#1a1a2e; border:1px solid rgba(167,139,250,0.25); border-radius:6px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none;">
                <input type="checkbox" id="includeImagesChk" ${this.fullChatIncludeImages ? 'checked' : ''}
                  style="width:14px; height:14px; accent-color:#a78bfa; cursor:pointer; flex-shrink:0;">
                <span style="color:#c4b5fd; font-size:12px; font-weight:500;">📷 Guardar imagens na cadeia <span style="color:#6b7280;">(${totalImgs} imagem${totalImgs !== 1 ? 's' : ''})</span></span>
              </label>
            </div>
          `;
        })()}

        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button id="cancelChainNameInline" style="padding:6px 14px; background:#374151; border:none; border-radius:6px; color:#9ca3af; font-size:12px; font-weight:600; cursor:pointer;">
            ${window.NodusI18n ? window.NodusI18n.t('btn.cancel') : 'Cancel'}
          </button>
          <button id="confirmChainNameInline" style="padding:6px 14px; background:${currentColor}; border:none; border-radius:6px; color:${currentColor === '#facc15' ? '#0e1117' : '#fff'}; font-size:12px; font-weight:600; cursor:pointer;">
            ${this.chainInputMode === 'create' ? (window.NodusI18n ? window.NodusI18n.t('btn.create') : 'Create') : (window.NodusI18n ? window.NodusI18n.t('btn.save') : 'Save')}
          </button>
        </div>
      </div>
    `;
  },
  
  async handleInlineChainNameConfirm() {
    const input = document.getElementById('chainNameInputInline');
    if (!input) return;

    const name = input.value.trim();
    if (!name) {
      if (window.NODUS_UI) { window.NODUS_UI.showToast('Nome nao pode ser vazio', 'warning'); }
      return;
    }

    // MODO FULL CHAT: Processar criação com nodes capturados
    if (this.isFullChatMode) {
      // Ler checkbox de imagens antes de renderizar
      const imagesChk = document.getElementById('includeImagesChk');
      this.fullChatIncludeImages = imagesChk ? imagesChk.checked : false;
      await this.processFullChatCreation(name);
      return;
    }

    // MODO NORMAL: Criar/renomear chain vazia
    const color = this.selectedChainColor || '#facc15';

    try {
      if (this.chainInputMode === 'create') {
        await window.NodusChains.createChain(name, color);
        const chains = await window.NodusChains.getAllChains();
        this.currentChainIndex = chains.length - 1;
      } else if (this.chainInputMode === 'rename') {
        const chains = await window.NodusChains.getAllChains();
        const chain = chains[this.currentChainIndex];
        if (chain) {
          // Atualizar nome se mudou
          if (name !== chain.name) {
            await window.NodusChains.renameChain(chain.id, name);
          }
          // Atualizar cor se mudou
          if (color !== chain.color) {
            await window.NodusChains.updateChainColor(chain.id, color);
          }
        }
      }

      this.hideInlineChainInput();
    } catch (err) {
      console.error('[Chains] ❌ Erro ao salvar chain:', err);
      this.showToast('❌ Erro ao salvar: ' + (err.message || 'Tente novamente'), 'error');
      // Manter input aberto para o usuário tentar de novo
    }
  },
  
  initDragAndDrop() {
    const sidebarCards = document.querySelectorAll('.sidebar-card[draggable="true"]');
    const nodeCards = document.querySelectorAll('.node-card[draggable="true"]');
    const graphNodes = document.querySelectorAll('.graph-node[draggable="true"]');
    const nodesGrid = document.getElementById('nodesGrid');
    
    if (!nodesGrid) return;
    
    
    // Event listeners nos cards da sidebar
    sidebarCards.forEach(card => {
      card.ondragstart = (e) => this.handleSidebarDragStart(e, card);
      card.ondragend = (e) => this.handleDragEnd(e);
    });
    
    // Event listeners nos nós da chain (reordenação) - GRID MODE
    nodeCards.forEach(card => {
      card.ondragstart = (e) => this.handleNodeDragStart(e, card);
      card.ondragend = (e) => this.handleDragEnd(e);
      card.ondragover = (e) => this.handleNodeDragOver(e, card);
    });
    
    // Event listeners nos nós do grafo (reordenação) - GRAPH MODE
    graphNodes.forEach(node => {
      node.ondragstart = (e) => this.handleNodeDragStart(e, node);
      node.ondragend = (e) => this.handleDragEnd(e);
      node.ondragover = (e) => this.handleNodeDragOver(e, node);
    });
    
    // Drop zone no grid de chains (para cards da sidebar)
    nodesGrid.ondragover = (e) => this.handleChainDragOver(e);
    nodesGrid.ondrop = (e) => this.handleChainDrop(e);
    nodesGrid.ondragleave = (e) => this.handleDragLeave(e);
  },
  
  handleSidebarDragStart(e, card) {
    this.draggedFromSidebar = true;
    const ideaId = card.dataset.ideaId;
    
    // Se o card está selecionado, arrastar todos os selecionados
    let draggedIds;
    if (this.selectedIdeaIds.has(ideaId)) {
      draggedIds = Array.from(this.selectedIdeaIds);
      // Adicionar classe dragging em todos
      this.selectedIdeaIds.forEach(id => {
        const c = document.querySelector(`.sidebar-card[data-idea-id="${id}"]`);
        if (c) c.style.opacity = '0.5';
      });
    } else {
      draggedIds = [ideaId];
      card.style.opacity = '0.5';
    }
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(draggedIds));
  },
  
  handleNodeDragStart(e, card) {
    this.draggedFromSidebar = false;
    this.draggedNodeId = card.dataset.ideaId;
    
    card.style.opacity = '0.5';
    card.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.draggedNodeId);
  },
  
  handleDragEnd(e) {
    // Restaurar opacidade em todos os cards
    document.querySelectorAll('.sidebar-card').forEach(c => c.style.opacity = '1');
    document.querySelectorAll('.node-card').forEach(c => {
      c.style.opacity = '1';
      c.classList.remove('dragging');
    });
    
    // Limpar flags
    this.draggedNodeId = null;
    this.draggedFromSidebar = false;
  },
  
  handleChainDragOver(e) {
    // Só aceita drop de cards da sidebar
    if (!this.draggedFromSidebar) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Salvar posição do mouse
    this.lastDragPosition = { x: e.clientX, y: e.clientY };
    
    const nodesGrid = document.getElementById('nodesGrid');
    if (nodesGrid) {
      nodesGrid.style.background = 'rgba(250, 204, 21, 0.05)';
      nodesGrid.style.border = '2px dashed #facc15';
      nodesGrid.style.borderRadius = '8px';
    }
  },
  
  handleNodeDragOver(e, targetCard) {
    // Só aceita reordenação de nós
    if (this.draggedFromSidebar || !this.draggedNodeId) return;
    if (this.currentGrid !== 1) return; // Só Grid I permite reordenação
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const draggingCard = document.querySelector('.node-card.dragging');
    if (!draggingCard || draggingCard === targetCard) return;
    
    // Calcular posição do mouse em relação ao card target
    const rect = targetCard.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    
    // Inserir antes ou depois
    const container = targetCard.parentElement;
    if (e.clientY < midPoint) {
      container.insertBefore(draggingCard, targetCard);
    } else {
      container.insertBefore(draggingCard, targetCard.nextSibling);
    }
  },
  
  handleDragLeave(e) {
    const nodesGrid = document.getElementById('nodesGrid');
    if (nodesGrid) {
      nodesGrid.style.background = '';
      nodesGrid.style.border = '';
    }
  },
  
  async handleChainDrop(e) {
    e.preventDefault();
    const nodesGrid = document.getElementById('nodesGrid');
    if (nodesGrid) {
      nodesGrid.style.background = '';
      nodesGrid.style.border = '';
    }
    
    // Se for reordenação de nós
    if (!this.draggedFromSidebar && this.draggedNodeId) {
      
      const chains = await window.NodusChains.getAllChains();
      const chain = chains[this.currentChainIndex];
      
      // Coletar nova ordem baseado no DOM
      const nodeCards = document.querySelectorAll('.node-card[data-idea-id]');
      const newOrder = Array.from(nodeCards).map(card => card.dataset.ideaId);
      
      
      // Atualizar no storage
      await window.NodusChains.reorderNodes(chain.id, newOrder);
      
      // Re-renderizar para atualizar números
      await this.renderNodes();
      return;
    }
    
    // Se for drop de cards da sidebar
    if (this.draggedFromSidebar) {
      try {
        const draggedIds = JSON.parse(e.dataTransfer.getData('text/plain'));
        
        const chains = await window.NodusChains.getAllChains();
        if (chains.length === 0) {
          if (window.NODUS_UI) { window.NODUS_UI.showToast('Crie uma chain primeiro!', 'warning'); }
          return;
        }
        
        // CRÍTICO: Detectar em qual chain foi feito o drop (Grid II/III ou Graph Mode)
        let targetChainIndex = this.currentChainIndex;
        
        if (this.currentGrid > 1 && this.viewMode === 'grid') {
          // Grid II/III: detectar chain pelo elemento .chain-column mais próximo
          // Usar lastDragPosition (salvo no dragover) em vez de e.clientX/Y
          const target = document.elementFromPoint(this.lastDragPosition.x, this.lastDragPosition.y);
          const chainColumn = target ? target.closest('.chain-column') : null;
          
          console.log('[Chains UI] 🔍 Detectando chain:', {
            mouseX: this.lastDragPosition.x,
            mouseY: this.lastDragPosition.y,
            target: target?.className,
            chainColumn: chainColumn?.dataset.chainIndex
          });
          
          if (chainColumn && chainColumn.dataset.chainIndex) {
            targetChainIndex = parseInt(chainColumn.dataset.chainIndex);
          } else {
            // Fallback: calcular pela posição X
            const nodesGrid = document.getElementById('nodesGrid');
            const rect = nodesGrid.getBoundingClientRect();
            const relativeX = this.lastDragPosition.x - rect.left;
            const columnWidth = rect.width / this.currentGrid;
            const columnIndex = Math.floor(relativeX / columnWidth);
            targetChainIndex = this.currentChainIndex + columnIndex;
            
:', {
              relativeX,
              columnWidth,
              columnIndex,
              targetChainIndex
            });
          }
          
          // Validar se o index é válido
          if (targetChainIndex >= chains.length) {
            targetChainIndex = chains.length - 1;
          }
        } else if (this.viewMode === 'graph') {
          // Graph Mode: detectar chain pelo elemento mais próximo
          const target = document.elementFromPoint(this.lastDragPosition.x, this.lastDragPosition.y);
          const chainElement = target ? target.closest('[data-chain-index]') : null;
          
          if (chainElement && chainElement.dataset.chainIndex !== undefined) {
            targetChainIndex = parseInt(chainElement.dataset.chainIndex);
          } else {
            // Fallback: cálculo por posição
            const nodesGrid = document.getElementById('nodesGrid');
            const rect = nodesGrid.getBoundingClientRect();
            const scrollLeft = nodesGrid.scrollLeft || 0;
            const relativeX = this.lastDragPosition.x - rect.left + scrollLeft;
            
            // Largura aproximada de cada chain: 100px (min-width) + 10px (gap) = 110px
            const chainWidth = 110;
            const chainIndex = Math.floor(relativeX / chainWidth);
            
            targetChainIndex = Math.max(0, Math.min(chainIndex, chains.length - 1));
            
:', {
              mouseX: this.lastDragPosition.x,
              scrollLeft: scrollLeft,
              relativeX: relativeX,
              chainWidth: chainWidth,
              chainIndex: chainIndex,
              targetChainIndex: targetChainIndex
            });
          }
        }
        
        const chainId = chains[targetChainIndex].id;
        
        // Adicionar cada ideia como nó
        for (const ideaId of draggedIds) {
          await window.NodusChains.addNodeToChain(chainId, ideaId, 'both');
        }
        
        // Limpar seleção e re-renderizar
        this.selectedIdeaIds.clear();
        await this.render();
        
      } catch (err) {
        console.error('[Chains UI] ❌ Erro no drop:', err);
      }
    }
  },
  
  renderSidebarIdeas() {
    
    // FILTRAR FILAS VIRTUAIS (não devem aparecer na sidebar)
    const nonVirtualIdeas = this.allIdeas.filter(idea => {
      const isVirtual = idea.queue && idea.queue.startsWith('fullchat_');
      if (isVirtual) {
      }
      return !isVirtual;
    });
    
    
    // Filtrar por fila se não for "todas"
    const queues = [
      'todas', 
      'ideas_queue_quick', 
      'ideas_queue_default', 
      'ideas_queue_q1',
      'ideas_queue_custom2',  // Q2 - PRO
      'ideas_queue_custom3',  // Q3 - PRO
      'ideas_queue_custom4'   // Q4 - PRO
    ];
    const currentQueue = queues[this.currentQueueIndex];
    let filteredIdeas = currentQueue === 'todas' ? 
      nonVirtualIdeas : 
      nonVirtualIdeas.filter(idea => idea.queue === currentQueue);
    
    // Filtrar por busca
    if (this.searchQuery) {
      filteredIdeas = filteredIdeas.filter(idea => 
        (idea.title || '').toLowerCase().includes(this.searchQuery) ||
        (idea.question || '').toLowerCase().includes(this.searchQuery) ||
        (idea.text || '').toLowerCase().includes(this.searchQuery)
      );
    }
    
    if (filteredIdeas.length === 0) {
      return '<div style="text-align:center; padding:40px 20px; color:#64748b;"><p style="font-size:13px;">Nenhuma ideia encontrada</p></div>';
    }
    
    return filteredIdeas.map(idea => {
      // Mapear queue para nome e cor
      const queueMap = {
        'ideas_queue_quick': { name: 'quick', color: '#fbbf24' },
        'ideas_queue_default': { name: 'default', color: '#10b981' },
        'ideas_queue_q1': { name: 'q1', color: '#3b82f6' },
        'ideas_queue_custom2': { name: 'q2', color: '#8b5cf6' },
        'ideas_queue_custom3': { name: 'q3', color: '#ec4899' },
        'ideas_queue_custom4': { name: 'q4', color: '#f97316' }
      };
      
      const queueInfo = queueMap[idea.queue] || { name: 'q1', color: '#3b82f6' };
      const queueName = queueInfo.name;
      const isSelected = this.selectedIdeaIds.has(idea.id);
      
      return `
        <div class="sidebar-card queue-${queueName} ${isSelected ? 'selected' : ''}" 
             data-idea-id="${idea.id}" 
             draggable="true">
          
          <span class="sidebar-card-check">✓</span>
          
          <div class="sidebar-card-title">
            ${this.escapeHtml(idea.title || 'Sem título')}
          </div>
          
          <div class="sidebar-card-meta">
            <span>🤖 ${idea.platform || 'Unknown'}</span>
            <span>📅 ${new Date(idea.date || Date.now()).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      `;
    }).join('');
  },
  
  getVisibleChainIndexes(totalChains) {
    if (totalChains === 0) return [];
    const indexes = [];
    for (let i = 0; i < this.currentGrid && this.currentChainIndex + i < totalChains; i++) {
      indexes.push(this.currentChainIndex + i);
    }
    return indexes;
  },
  
  async renderNodes() {
    const chains = await window.NodusChains.getAllChains();
    if (chains.length === 0) return;
    
    const nodesGrid = document.getElementById('nodesGrid');
    if (!nodesGrid) return;
    
    
    // Graph Mode: SEMPRE renderizar todas as chains horizontalmente
    if (this.viewMode === 'graph') {
      await this.renderGraphModeAllChains(chains, nodesGrid);
      return;
    }
    
    // Grid II/III: Renderizar múltiplas chains lado a lado (SE tiver mais de 1 chain)
    if (this.currentGrid > 1 && this.viewMode === 'grid') {
      if (chains.length > 1) {
        await this.renderMultipleChains(chains, nodesGrid);
        return;
      } else {
        // Continua para renderização normal
      }
    }
    
    // Grid I: Renderizar apenas uma chain
    const chain = await window.NodusChains.getChainWithIdeas(chains[this.currentChainIndex].id);
    if (!chain) return;
    
    if (chain.nodes.length === 0) {
      nodesGrid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#a0aec0;">
          <div style="font-size:48px; margin-bottom:15px;">🔗</div>
          <div style="font-size:16px; color:#e2e8f0; margin-bottom:8px;">Esta chain está vazia</div>
          <p style="font-size:13px;">Arraste cards da sidebar ou clique em "➕ Add Node"</p>
        </div>
      `;
      return;
    }
    
    // Grid Mode normal (Grid I)
    await this.renderGridMode(chain, nodesGrid);
  },
  
  async renderGraphMode(chain, nodesGrid) {
    
    // Mudar layout para vertical centralizado
    nodesGrid.style.display = 'flex';
    nodesGrid.style.flexDirection = 'column';
    nodesGrid.style.alignItems = 'center';
    nodesGrid.style.gap = '0';
    nodesGrid.style.padding = '20px';
    nodesGrid.style.overflowY = 'scroll'; // Scrollbar sempre visível
    nodesGrid.style.overflowX = 'hidden';
    nodesGrid.style.height = '0';
    nodesGrid.style.flex = '1';
    
    const chainColor = chain.color || '#facc15';
    let html = '';
    
    chain.nodes.forEach((node, i) => {
      // SISTEMA DUAL: Detectar tipo de node
      let queueColor, textColor, tooltipText, nodeId;
      
      if (node.type === 'standalone') {
        // NODE STANDALONE (Full Chat) - usa dados diretos
        queueColor = '#8b5cf6'; // Roxo para standalone
        textColor = '#fff';
        tooltipText = `${node.title || 'Sem título'}\n${node.question || 'Sem pergunta'}`;
        nodeId = node.id;
      } else {
        // NODE LINKED (Manual) - usa idea
        const idea = node.idea;
        if (!idea) return;
        
        queueColor = idea.queue === 'ideas_queue_quick' ? '#facc15' : 
                           idea.queue === 'ideas_queue_default' ? '#10b981' : '#3b82f6';
        textColor = queueColor === '#facc15' ? '#000' : '#fff';
        tooltipText = `${idea.title || 'Sem título'}\n${idea.question || 'Sem pergunta'}`;
        nodeId = idea.id;
      }
      
      // Container do node inteiro - CENTRALIZADO
      html += `
        <div style="display:flex; align-items:center; justify-content:center; position:relative; margin-bottom:${i < chain.nodes.length - 1 ? '0' : '20px'};">
          
          <!-- Círculo TRANSPARENTE com borda grossa (indica chain) -->
          <div class="graph-node" data-node-id="${node.id}" data-chain-id="${chain.id}" draggable="true"
            style="position:relative; width:55px; height:55px; background:transparent; border:4px solid ${chainColor}; border-radius:50%; cursor:move; transition:all 0.2s; display:flex; align-items:center; justify-content:center;">
            
            <!-- Esfera colorida com NÚMERO CENTRALIZADO -->
            <div class="graph-sphere" 
              title="${this.escapeHtml(tooltipText)}"
              style="width:38px; height:38px; background:${queueColor}; border-radius:50%; cursor:pointer; transition:transform 0.2s; display:flex; align-items:center; justify-content:center; color:${textColor}; font-size:16px; font-weight:700;">
              ${i + 1}
            </div>
          </div>
        </div>
      `;
      
      // Linha conectora (exceto último) - CENTRALIZADA
      if (i < chain.nodes.length - 1) {
        html += `
          <div style="width:2px; height:18px; background:${chainColor}; opacity:0.6; margin:0;"></div>
        `;
      }
    });
    
    nodesGrid.innerHTML = html;
  },
  
  async renderGraphModeAllChains(allChains, nodesGrid) {
    
    // Layout HORIZONTAL com scroll horizontal NO TOPO
    nodesGrid.style.display = 'block';
    nodesGrid.style.padding = '0';
    nodesGrid.style.overflowX = 'hidden';
    nodesGrid.style.overflowY = 'auto';
    nodesGrid.style.height = '0';
    nodesGrid.style.flex = '1';
    nodesGrid.style.width = '100%';
    nodesGrid.style.position = 'relative'; // Para hover absolute funcionar
    
    // Container com scroll horizontal no topo (scrollbar menor)
    let html = `
      <style>
        .graph-scroll-container::-webkit-scrollbar { height: 6px; }
        .graph-scroll-container::-webkit-scrollbar-track { background: #1a1f29; }
        .graph-scroll-container::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 3px; }
        .graph-scroll-container::-webkit-scrollbar-thumb:hover { background: #facc15; }
        
        /* Hover Card - POSICIONADO 100% VIA JAVASCRIPT */
        .graph-hover-card {
          display: none;
          position: fixed;
          /* left e top serão definidos via JS */
          z-index: 10000;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
          pointer-events: none;
          transition: all 0.15s ease-out;
        }
      </style>
      <div class="graph-scroll-container" style="width:100%; overflow-x:auto; transform:rotateX(180deg);">
        <div style="display:flex; flex-direction:row; align-items:start; gap:10px; padding:5px 15px 10px 15px; transform:rotateX(180deg);">
    `;
    
    // Renderizar cada chain como uma coluna vertical
    for (let chainIdx = 0; chainIdx < allChains.length; chainIdx++) {
      const chainMeta = allChains[chainIdx];
      const chain = await window.NodusChains.getChainWithIdeas(chainMeta.id);
      if (!chain) continue;
      
      const chainColor = chain.color || '#facc15';
      const textColor = (chainColor === '#facc15' || chainColor === '#fbbf24') ? '#000' : '#fff';
      
      const isSelected = chainIdx === this.currentChainIndex;
      const colGlow = isSelected
        ? `box-shadow:0 0 0 2px ${chainColor}, 0 0 18px 2px ${chainColor}33;`
        : '';

      // Container de cada chain (coluna vertical) - COM data-chain-index
      html += `
        <div data-chain-index="${chainIdx}" style="display:flex; flex-direction:column; align-items:center; min-width:100px; flex-shrink:0; border-radius:12px; padding:8px 6px; transition:all 0.2s; ${colGlow}">

          <!-- Nome da Chain no topo - CLICÁVEL -->
          <div class="graph-chain-header" data-chain-index="${chainIdx}" data-chain-id="${chain.id}" data-chain-name="${this.escapeHtml(chain.name)}"
            style="margin-bottom:15px; padding:6px 14px; background:${chainColor}; border-radius:6px; border:2px solid ${isSelected ? '#fff' : chainColor}; cursor:pointer; user-select:none; transition:all 0.15s; position:relative;"
            title="Clique para selecionar • Duplo clique para renomear">
            <div style="color:${textColor}; font-size:13px; font-weight:600; text-align:center; white-space:nowrap;">
              ${this.escapeHtml(chain.name)}
            </div>
          </div>

          <!-- Nodes verticais -->
          <div style="display:flex; flex-direction:column; align-items:center; gap:0;">
      `;
      
      // Se chain vazia, mostrar indicador
      if (chain.nodes.length === 0) {
        html += `
          <div style="width:55px; height:55px; border:2px dashed ${chainColor}; border-radius:50%; display:flex; align-items:center; justify-content:center; opacity:0.5;">
            <span style="color:${chainColor}; font-size:20px;">+</span>
          </div>
        `;
      }
      
      // Renderizar cada node
      chain.nodes.forEach((node, i) => {
        // SISTEMA DUAL: Detectar tipo de node
        let queueColor, textColor, platformIcon, titlePreview, questionPreview, answerPreview, queueLabel, nodeId, platform;
        let graphNodeImages = [];

        const _tg = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
        if (node.type === 'standalone') {
          // NODE STANDALONE (Full Chat) - usa dados diretos
          queueColor = '#8b5cf6'; // Roxo para standalone
          textColor = '#fff';
          platform = node.platform || 'Unknown';
          platformIcon = platform === 'ChatGPT' ? '🤖' :
                         platform === 'Claude' ? '🤖' :
                         platform === 'Gemini' ? '🤖' :
                         platform === 'Perplexity' ? '🔍' :
                         platform === 'Copilot' ? '🤖' : '🤖';
          titlePreview = (node.title || _tg('card.notitle', 'No title')).substring(0, 50) + ((node.title || '').length > 50 ? '...' : '');
          questionPreview = (node.question || _tg('card.noquestion', 'No question')).substring(0, 80) + ((node.question || '').length > 80 ? '...' : '');
          answerPreview = (node.answer || _tg('card.noanswer', 'No answer')).substring(0, 80) + ((node.answer || '').length > 80 ? '...' : '');
          queueLabel = 'FC'; // Full Chat
          nodeId = node.id;
          graphNodeImages = node.images || [];
        } else {
          // NODE LINKED (Manual) - usa idea
          const idea = node.idea;
          if (!idea) return;

          queueColor = idea.queue === 'ideas_queue_quick' ? '#facc15' :
                             idea.queue === 'ideas_queue_default' ? '#10b981' : '#3b82f6';
          textColor = queueColor === '#facc15' ? '#000' : '#fff';
          platform = idea.platform || 'Unknown';
          platformIcon = platform === 'ChatGPT' ? '🤖' :
                         platform === 'Claude' ? '🤖' :
                         platform === 'Gemini' ? '🤖' :
                         platform === 'Perplexity' ? '🔍' :
                         platform === 'Copilot' ? '🤖' : '🤖';
          titlePreview = (idea.title || _tg('card.notitle', 'No title')).substring(0, 50) + ((idea.title || '').length > 50 ? '...' : '');
          questionPreview = (idea.question || _tg('card.noquestion', 'No question')).substring(0, 80) + ((idea.question || '').length > 80 ? '...' : '');
          answerPreview = (idea.answer || idea.text || _tg('card.noanswer', 'No answer')).substring(0, 80) + ((idea.answer || idea.text || '').length > 80 ? '...' : '');
          queueLabel = idea.queue === 'ideas_queue_quick' ? 'Q' :
                       idea.queue === 'ideas_queue_default' ? 'D' : 'Q1';
          nodeId = idea.id;
          graphNodeImages = idea.images || [];
        }
        
        // Node com hover card - ESTRUTURA IGUAL AO TESTE
        html += `
          <div class="node-wrapper" style="position:relative; display:flex; flex-direction:column; align-items:center;">
            <div class="graph-node" data-node-id="${node.id}" data-idea-id="${node.idea_id || node.id}" data-chain-id="${chain.id}" draggable="true"
              data-title="${this.escapeHtml(titlePreview)}"
              data-platform="${platform}"
              data-platform-icon="${platformIcon}"
              data-queue-label="${queueLabel}"
              data-queue-color="${queueColor}"
              data-text-color="${textColor}"
              data-question="${this.escapeHtml(questionPreview)}"
              data-answer="${this.escapeHtml(answerPreview)}"
              style="width:55px; height:55px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:move; transition:transform 0.2s; position:relative;">
              
              <div style="position:absolute; inset:-4px; border-radius:50%; border:4px solid ${chainColor};"></div>
              
              <div class="graph-sphere"
                style="width:38px; height:38px; background:${queueColor}; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; color:${textColor}; font-size:16px; font-weight:700; z-index:1;">
                ${i + 1}
              </div>
              ${graphNodeImages.length > 0 ? `
                <div style="position:absolute; top:-4px; right:-4px; background:#a78bfa; color:#fff; font-size:9px; font-weight:700; width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:2; border:2px solid #14142a;">
                  ${graphNodeImages.length > 9 ? '9+' : graphNodeImages.length}
                </div>
              ` : ''}
            </div>
          </div>
        `;

        // Linha conectora
        if (i < chain.nodes.length - 1) {
          html += `<div style="width:2px; height:18px; background:${chainColor}; opacity:0.6; margin:0;"></div>`;
        }
      });
      
      html += `
          </div>
        </div>
      `;
    }
    
    // Fechar containers do scroll invertido
    html += `
        </div>
      </div>
    `;
    
    nodesGrid.innerHTML = html;

    // ── INTERAÇÃO NOS TÍTULOS DAS COLUNAS (selecionar / renomear) ──
    nodesGrid.querySelectorAll('.graph-chain-header').forEach(header => {
      let clickTimer = null;

      // Clique simples → selecionar chain
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        if (clickTimer) return; // ignora se vai ser dblclick
        clickTimer = setTimeout(async () => {
          clickTimer = null;
          const idx = parseInt(header.dataset.chainIndex);
          if (!isNaN(idx)) {
            this.currentChainIndex = idx;
            await this.renderNodes();
          }
        }, 220);
      });

      // Duplo clique → editar nome inline
      header.addEventListener('dblclick', async (e) => {
        e.stopPropagation();
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }

        const chainId   = header.dataset.chainId;
        const chainName = header.dataset.chainName;
        const chainColor = header.style.background;
        const textDiv   = header.querySelector('div');

        // Substituir texto por input
        const input = document.createElement('input');
        input.value = chainName;
        input.style.cssText = `
          background: transparent; border: none; outline: none;
          color: ${textDiv.style.color}; font-size: 13px; font-weight: 600;
          text-align: center; width: ${Math.max(80, chainName.length * 9)}px;
          font-family: inherit;
        `;
        textDiv.innerHTML = '';
        textDiv.appendChild(input);
        input.focus();
        input.select();

        const save = async () => {
          const newName = input.value.trim();
          if (newName && newName !== chainName) {
            await window.NodusChains.renameChain(chainId, newName);
          }
          await this.renderNodes();
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
          if (ev.key === 'Escape') { input.value = chainName; input.blur(); }
        });
      });

      // Hover visual
      header.addEventListener('mouseenter', () => {
        header.style.transform = 'scale(1.05)';
        header.style.filter = 'brightness(1.15)';
      });
      header.addEventListener('mouseleave', () => {
        header.style.transform = 'scale(1)';
        header.style.filter = '';
      });
    });

    // ── DRAG-TO-REORDER nos nós do Graph Mode ──────────────────
    nodesGrid.querySelectorAll('.graph-node[data-idea-id]').forEach(graphNode => {
      graphNode.addEventListener('dragstart', (e) => {
        this.draggedFromSidebar = false;
        this.draggedNodeId = graphNode.dataset.ideaId;
        this.draggedFromChainId = graphNode.dataset.chainId;
        graphNode.style.opacity = '0.35';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', graphNode.dataset.nodeId);
      });

      graphNode.addEventListener('dragend', () => {
        graphNode.style.opacity = '1';
        graphNode.style.transform = 'scale(1)';
      });

      graphNode.addEventListener('dragover', (e) => {
        if (this.draggedFromSidebar) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (graphNode.dataset.ideaId !== this.draggedNodeId) {
          graphNode.style.transform = 'scale(1.18)';
        }
      });

      graphNode.addEventListener('dragleave', () => {
        graphNode.style.transform = 'scale(1)';
      });

      graphNode.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        graphNode.style.transform = 'scale(1)';

        if (this.draggedFromSidebar || !this.draggedNodeId) return;

        const targetNodeId = graphNode.dataset.ideaId;
        const targetChainId = graphNode.dataset.chainId;

        // Só reordena na mesma chain e em posição diferente
        if (targetChainId !== this.draggedFromChainId || targetNodeId === this.draggedNodeId) return;

        // Coletar ordem atual dos nós nesta chain via DOM
        const chainCol = graphNode.closest('[data-chain-index]');
        if (!chainCol) return;
        const allNodes = Array.from(chainCol.querySelectorAll('.graph-node[data-idea-id]'));
        const currentOrder = allNodes.map(n => n.dataset.ideaId);

        // Mover dragged para a posição do target
        const fromIdx = currentOrder.indexOf(this.draggedNodeId);
        const toIdx   = currentOrder.indexOf(targetNodeId);
        if (fromIdx < 0 || toIdx < 0) return;

        const newOrder = [...currentOrder];
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, this.draggedNodeId);

        await window.NodusChains.reorderNodes(targetChainId, newOrder);
        this.draggedNodeId = null;
        this.draggedFromChainId = null;
        await this.renderNodes();
      });
    });

    // POSICIONAMENTO INTELIGENTE COM HOVER CARD GLOBAL
    requestAnimationFrame(() => {
      const nodeWrappers = nodesGrid.querySelectorAll('.node-wrapper');
      const hoverCard = document.getElementById('globalGraphHoverCard');
      
      if (!hoverCard) {
        console.error('[Graph] Hover card global não encontrado!');
        return;
      }
      
      nodeWrappers.forEach(wrapper => {
        const graphNode = wrapper.querySelector('.graph-node');
        if (!graphNode) return;
        
        graphNode.addEventListener('mouseenter', () => {
          const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
          // Pegar dados do nó
          const title = graphNode.dataset.title || _t('card.notitle', 'No title');
          const platform = graphNode.dataset.platform || 'Unknown';
          const platformIcon = graphNode.dataset.platformIcon || '🤖';
          const queueLabel = graphNode.dataset.queueLabel || 'Q';
          const queueColor = graphNode.dataset.queueColor || '#3b82f6';
          const textColor = graphNode.dataset.textColor || '#fff';
          const question = graphNode.dataset.question || _t('card.noquestion', 'No question');
          const answer = graphNode.dataset.answer || _t('card.noanswer', 'No answer');

          // Popular hover card (labels via i18n)
          document.getElementById('hoverCardQuestionLabel').textContent = _t('card.question', '❓ QUESTION');
          document.getElementById('hoverCardAnswerLabel').textContent = _t('card.answer', '💬 ANSWER');
          document.getElementById('hoverCardTitle').textContent = title;
          document.getElementById('hoverCardTitle').style.color = queueColor;
          document.getElementById('hoverCardIcon').textContent = platformIcon;
          document.getElementById('hoverCardPlatform').textContent = platform;
          document.getElementById('hoverCardBadge').textContent = queueLabel;
          document.getElementById('hoverCardBadge').style.background = queueColor;
          document.getElementById('hoverCardBadge').style.color = textColor;
          document.getElementById('hoverCardQuestion').textContent = question;
          document.getElementById('hoverCardAnswer').textContent = answer;
          hoverCard.style.borderColor = queueColor;
          
          // Pegar posição do círculo na viewport
          const rect = graphNode.getBoundingClientRect();
          const circleY = rect.top + (rect.height / 2);
          const circleX = rect.left + rect.width;
          const circleCenterX = rect.left + (rect.width / 2);
          
          // Dimensões do hover card
          hoverCard.style.display = 'block';
          const cardHeight = hoverCard.offsetHeight || 200;
          const cardWidth = hoverCard.offsetWidth || 220;
          
          const windowHeight = window.innerHeight;
          const windowWidth = window.innerWidth;
          
          let idealTop;
          let idealLeft;
          
          // POSIÇÃO VERTICAL: Centralizar com o círculo
          idealTop = circleY - (cardHeight / 2);
          
          if (idealTop < 20) idealTop = 20;
          else if (idealTop + cardHeight > windowHeight - 20) {
            idealTop = windowHeight - cardHeight - 20;
          }
          
          // POSIÇÃO HORIZONTAL: Estratégia inteligente
          const spaceLeft = rect.left;
          const spaceRight = windowWidth - circleX;
          
          if (spaceRight >= cardWidth + 30) {
            idealLeft = circleX + 20;
          } else if (spaceLeft >= cardWidth + 30) {
            idealLeft = rect.left - cardWidth - 20;
          } else {
            idealLeft = circleCenterX - (cardWidth / 2);
            if (idealLeft < 20) idealLeft = 20;
            if (idealLeft + cardWidth > windowWidth - 20) {
              idealLeft = windowWidth - cardWidth - 20;
            }
          }
          
          // Aplicar posição
          hoverCard.style.top = `${idealTop}px`;
          hoverCard.style.left = `${idealLeft}px`;
          
          console.log('[Graph Hover] Card exibido:', {
            top: Math.round(idealTop),
            left: Math.round(idealLeft)
          });
        });
        
        graphNode.addEventListener('mouseleave', () => {
          hoverCard.style.display = 'none';
        });
      });
    });
  },
  
  async renderGridMode(chain, nodesGrid) {
    
    // Cor da chain (padrão amarelo se não definida)
    const chainColor = chain.color || '#facc15';
    
    // Renderizar nodes com linhas conectoras - LARGURA FIXA COMO CARDS  
    let html = `<div style="display:flex; flex-direction:column; align-items:center; width:100%; padding:15px; padding-bottom:100px;">

      <!-- Chain Header: Nome + Contador + Actions NA MESMA LINHA -->
      <div style="display:flex; align-items:center; justify-content:space-between; width:100%; max-width:400px; margin-bottom:10px; gap:10px;">
        <!-- Nome + Contador (ESQUERDA) -->
        <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">
          <span style="font-size:14px;">📚</span>
          <div style="flex:1; min-width:0;">
            <div style="color:#e5e7eb; font-size:11px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${this.escapeHtml(chain.name)}
            </div>
            <div style="color:#9ca3af; font-size:9px; font-weight:400;">
              ${chain.nodes.length} ${chain.nodes.length === 1 ? 'item' : 'itens'}
            </div>
          </div>
        </div>
        
        <!-- Actions (DIREITA) -->
        <div class="chain-actions-wrapper" style="position:relative; flex-shrink:0;">
          <button class="chain-actions-btn" style="padding:4px 8px; background:#2d3748; border:1px solid #4a5568; border-radius:5px; color:#a0aec0; cursor:pointer; font-size:10px; display:flex; align-items:center; gap:4px; white-space:nowrap;">
            ⚙️ ${window.NodusI18n ? window.NodusI18n.t('chain.actions') : 'Ações'} <span style="font-size:8px;">▼</span>
          </button>
          <div class="chain-actions-menu" style="position:absolute; top:100%; right:0; margin-top:4px; background:#1a1f29; border:1px solid #4a5568; border-radius:8px; min-width:150px; box-shadow:0 4px 12px rgba(0,0,0,0.4); z-index:100; display:none;">
            <button class="chain-action-inject" data-chain-id="${chain.id}" style="width:100%; background:none; border:none; color:#10b981; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px; border-radius:8px 8px 0 0;">
              💉 ${window.NodusI18n ? window.NodusI18n.t('chain.inject') : 'Inject chain'}
            </button>
            <button class="chain-action-export" data-chain-id="${chain.id}" style="width:100%; background:none; border:none; color:#e2e8f0; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px;">
              📥 ${window.NodusI18n ? window.NodusI18n.t('chain.export') : 'Export'}
            </button>
            <button class="chain-action-delete" data-chain-id="${chain.id}" style="width:100%; background:none; border:none; color:#f87171; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px;">
              🗑️ ${window.NodusI18n ? window.NodusI18n.t('chain.delete') : 'Delete chain'}
            </button>
            <div style="height:1px; background:#4a5568; margin:6px 0;"></div>
            <button class="chain-action-attachments" data-chain-id="${chain.id}" style="width:100%; background:none; border:none; color:#e2e8f0; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:space-between;">
              <span style="display:flex; align-items:center; gap:8px;">📎 ${window.NodusI18n ? window.NodusI18n.t('chain.attachments') : 'Attachments'}</span>
              <span style="background:#4a5568; color:#e2e8f0; padding:2px 6px; border-radius:10px; font-size:10px;">${(chain.attachments || []).length}</span>
            </button>
            <button class="chain-action-notes" data-chain-id="${chain.id}" style="width:100%; background:none; border:none; color:#e2e8f0; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px; border-radius:0 0 8px 8px;">
              ${chain.notes ? '📄' : '📝'} ${window.NodusI18n ? window.NodusI18n.t('chain.notes') : 'Notes'}
            </button>
          </div>
        </div>
      </div>
    `;
    
    chain.nodes.forEach((node, i) => {
      // SISTEMA DUAL + VIRTUAL: Detectar tipo de node
      let queueColor, queueLabel, platform, title, question, answer, notes, attachments, nodeId, hasIdea, isVirtual;
      
      let nodeImages = [];

      if (node.type === 'standalone') {
        // NODE STANDALONE (Full Chat antigo - não deve mais existir)
        queueColor = '#8b5cf6';
        queueLabel = 'FC';
        platform = node.platform || 'Unknown';
        title = node.title || 'Sem título';
        question = node.question || 'Sem pergunta';
        answer = node.answer || 'Sem resposta';
        notes = null;
        attachments = null;
        nodeId = node.id;
        hasIdea = false;
        isVirtual = false;
        nodeImages = node.images || [];
      } else {
        // NODE LINKED - usa idea
        const idea = node.idea;
        if (!idea) return;

        // Detectar se é IDEA VIRTUAL (Full Chat)
        isVirtual = idea.status === 'virtual' || idea.queue?.startsWith('fullchat_');

        if (isVirtual) {
          // IDEA VIRTUAL (Full Chat) - cor roxa
          queueColor = '#8b5cf6';
          queueLabel = 'FC';
        } else {
          // IDEA NORMAL (Manual)
          queueColor = idea.queue === 'ideas_queue_quick' ? '#facc15' :
                             idea.queue === 'ideas_queue_default' ? '#10b981' : '#3b82f6';
          queueLabel = idea.queue === 'ideas_queue_quick' ? 'Q' :
                             idea.queue === 'ideas_queue_default' ? 'D' : 'Q1';
        }

        platform = idea.platform || 'Unknown';
        title = idea.title || 'Sem título';
        question = idea.question || 'Sem pergunta';
        answer = idea.answer || idea.text || 'Sem resposta';
        notes = idea.notes;
        attachments = idea.attachments;
        nodeId = idea.id;
        hasIdea = true;
        nodeImages = idea.images || [];
      }
      
      // Labels do toggle (3 estados)
      const toggleStates = {
        'both': { label: '📝 Q + A', color: '#facc15' },
        'question': { label: '❓ Pergunta', color: '#3b82f6' },
        'answer': { label: '💬 Resposta', color: '#10b981' }
      };
      const toggle = toggleStates[node.display] || toggleStates['both'];
      
      html += `
        <div class="node-card" data-node-id="${node.id}" data-chain-id="${chain.id}" draggable="true"
          style="background:#1a1f29; border:2px solid ${chainColor}; border-left:5px solid ${queueColor}; border-radius:8px; padding:16px; transition:all 0.3s ease-out; cursor:move; position:relative; width:100%; max-width:400px; box-sizing:border-box; opacity:0; transform:translateY(-10px);">
          
          <!-- Header -->
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <span style="color:#4a5568; font-size:16px; cursor:grab;">☰</span>
            <div style="background:#2d3748; color:#a0aec0; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; flex-shrink:0;">
              ${i + 1}
            </div>
            <div style="flex:1; min-width:0;">
              <!-- Título -->
              <div style="color:${chainColor}; font-size:14px; font-weight:600; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                ${this.escapeHtml(title)}
              </div>
            </div>
          </div>
          
          <!-- Meta -->
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
            <span style="padding:3px 8px; background:${queueColor}; color:${queueColor === '#facc15' ? '#000' : '#fff'}; border-radius:4px; font-size:11px; font-weight:bold;">
              ${queueLabel}
            </span>
            <span style="padding:3px 8px; background:#2d3748; color:#a0aec0; border-radius:4px; font-size:11px;">
              🤖 ${platform}
            </span>
          </div>
          
          <!-- Toggle Display -->
          <div style="margin-bottom:12px;">
            <button class="toggle-btn" data-node-id="${node.id}" data-state="${node.display}" data-chain-id="${chain.id}"
              style="padding:8px 12px; border:none; border-radius:6px; background:${toggle.color}; color:${toggle.color === '#facc15' ? '#000' : '#fff'}; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;">
              ${toggle.label}
            </button>
          </div>
          
          <!-- Content (Pergunta/Resposta) -->
          <div style="margin-bottom:12px; padding:12px; background:#0e1117; border-radius:6px; max-height:200px; overflow-y:auto;">
            ${node.display === 'both' || node.display === 'question' ? `
              <div style="margin-bottom:${node.display === 'both' ? '12px' : '0'};">
                <div style="color:#3b82f6; font-size:11px; font-weight:600; margin-bottom:4px;">❓ PERGUNTA</div>
                <div style="color:#e2e8f0; font-size:12px; line-height:1.5;">${this._mdToHtml(question, true)}</div>
              </div>
            ` : ''}
            ${node.display === 'both' || node.display === 'answer' ? `
              <div>
                <div style="color:#10b981; font-size:11px; font-weight:600; margin-bottom:4px;">💬 RESPOSTA</div>
                <div style="color:#e2e8f0; font-size:12px; line-height:1.5;">${this._mdToHtml(answer, true)}</div>
              </div>
            ` : ''}
          </div>

          <!-- Imagens capturadas (Full Chat) -->
          ${nodeImages.length > 0 ? `
            <div style="margin-bottom:12px;">
              <div style="color:#a78bfa; font-size:11px; font-weight:600; margin-bottom:6px;">📷 IMAGENS (${nodeImages.length})</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${nodeImages.map(src => src.startsWith('idb:') ? `
                  <img data-idb-src="${this.escapeHtml(src.slice(4))}"
                    style="width:72px; height:52px; object-fit:cover; border-radius:5px; border:1px solid rgba(167,139,250,0.3); background:#2d3748;">
                ` : `
                  <a href="${this.escapeHtml(src)}" target="_blank" rel="noopener noreferrer" title="Abrir imagem" style="display:block; flex-shrink:0;">
                    <img src="${this.escapeHtml(src)}" referrerpolicy="no-referrer"
                      style="width:72px; height:52px; object-fit:cover; border-radius:5px; border:1px solid rgba(167,139,250,0.3); cursor:pointer; transition:transform 0.15s;"
                      onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'"
                      onerror="this.parentElement.style.display='none'">
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Actions -->
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${isVirtual ? `
              <!-- Botão PROMOVER (idea virtual) -->
              <button class="promote-node-btn" data-idea-id="${nodeId}" data-node-id="${node.id}" data-chain-id="${chain.id}"
                style="flex:1; padding:8px 12px; background:#8b5cf6; border:none; border-radius:6px; color:#fff; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s; min-width:100px;">
                📤 Promover
              </button>
            ` : (hasIdea ? `
              <!-- Botão INFO (idea normal) -->
              <div class="info-btn-container" style="flex:1; position:relative;">
                <button class="info-node-btn" data-idea-id="${nodeId}"
                  style="width:100%; padding:8px 12px; background:#262b36; border:1px solid #3a4255; border-radius:6px; color:#e2e8f0; font-size:12px; cursor:pointer; transition:all 0.2s;">
                  ℹ️ Info
                </button>
                <div class="info-tooltip" style="display:none; position:absolute; bottom:100%; left:0; right:0; margin-bottom:8px; padding:12px; background:#1a1f29; border:1px solid #4a5568; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.4); z-index:100; min-width:200px;">
                  <div style="color:#a0aec0; font-size:11px; margin-bottom:8px;">
                    <span style="color:#facc15; font-weight:600;">📝 Notas:</span>
                    <div style="color:#e2e8f0; margin-top:4px; font-size:12px; line-height:1.4;">
                      ${notes ? this.escapeHtml(notes.substring(0, 150)) + (notes.length > 150 ? '...' : '') : '<em style="color:#64748b;">Sem notas</em>'}
                    </div>
                  </div>
                  <div style="color:#a0aec0; font-size:11px; border-top:1px solid #2d3748; padding-top:8px;">
                    <span style="color:#facc15; font-weight:600;">📎 Anexos:</span>
                    <div style="color:#e2e8f0; margin-top:4px; font-size:12px;">
                      ${attachments && attachments.length > 0 ? attachments.length + ' arquivo(s)' : '<em style="color:#64748b;">Sem anexos</em>'}
                    </div>
                  </div>
                </div>
              </div>
            ` : `
              <div style="flex:1; padding:8px 12px; background:#262b36; border:1px solid #4a5568; border-radius:6px; color:#64748b; font-size:11px; text-align:center;">
                📚 Nodo Chat Completo
              </div>
            `)}
            <button class="remove-node-btn" data-node-id="${nodeId}" data-chain-id="${chain.id}"
              style="flex:1; padding:8px 12px; background:#262b36; border:1px solid #ef4444; border-radius:6px; color:#ef4444; font-size:12px; cursor:pointer; transition:all 0.2s;">
              ❌ Remover
            </button>
          </div>
        </div>
      `;
      
      // Linha conectora (sempre mostrar em chain única) - USA COR DA CHAIN
      if (i < chain.nodes.length - 1) {
        html += `
          <div class="chain-connector" style="width:3px; height:40px; background:${chainColor}; margin:8px 0 8px 138px; border-radius:2px; opacity:0.8;"></div>
        `;
      }
    });
    
    html += `</div>`; // Fechar container centralizado
    nodesGrid.innerHTML = html;
    
    // ANIMAÇÃO PROGRESSIVA COM ACELERAÇÃO (350ms → 200ms)
    // APENAS na primeira vez após Full Chat Capture
    if (this.justCapturedFullChat) {
      this.justCapturedFullChat = false; // Resetar flag
      
      requestAnimationFrame(() => {
        const cards = nodesGrid.querySelectorAll('.node-card');
        
        if (cards.length === 0) return;
        
        // Calcular delays com aceleração progressiva
        const startSpeed = 350;  // Velocidade inicial (devagar)
        const endSpeed = 200;    // Velocidade final (rápido)
        let accumulatedDelay = 0;
        const delays = [0]; // Primeiro card instantâneo
        
        for (let i = 1; i < cards.length; i++) {
          const progress = (i - 1) / (cards.length - 2); // 0.0 a 1.0
          const intervalDelay = startSpeed - (progress * (startSpeed - endSpeed));
          accumulatedDelay += intervalDelay;
          delays.push(accumulatedDelay);
        }
        
        
        // Scroll para o topo antes de começar (exceto após deleção de nó, onde preservamos posição)
        const preserveScroll = this._preserveScrollTop != null && this._preserveScrollTop > 0;
        nodesGrid.scrollTop = preserveScroll ? this._preserveScrollTop : 0;

        // Animar cards progressivamente
        cards.forEach((card, index) => {
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';

            // AUTO-SCROLL: só rola automaticamente quando não estamos preservando posição
            if (!preserveScroll) {
              setTimeout(() => {
                card.scrollIntoView({
                  behavior: 'smooth',
                  block: 'end',
                  inline: 'nearest'
                });
              }, 100);
            }
          }, delays[index]);
        });
      });
    } else {
      // Visualização normal: mostrar cards instantaneamente
      requestAnimationFrame(() => {
        const cards = nodesGrid.querySelectorAll('.node-card');
        cards.forEach(card => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
          card.style.transition = 'none'; // Sem transição
        });
      });
    }

    // Carregar imagens IndexedDB nos cards (async, após DOM pronto)
    setTimeout(() => this._loadIdbImages(), 100);
  },

  async renderMultipleChains(allChains, nodesGrid) {
    
    // Resetar para grid layout com múltiplas colunas
    nodesGrid.style.flex = '1'; // Ocupar todo espaço vertical disponível
    nodesGrid.style.display = 'grid';
    nodesGrid.style.gap = '20px';
    nodesGrid.style.gridTemplateColumns = this.currentGrid === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)';
    nodesGrid.style.padding = '15px';
    nodesGrid.style.paddingBottom = '100px'; // Espaço extra no final
    nodesGrid.style.justifyItems = 'stretch';
    nodesGrid.style.alignItems = 'start';
    nodesGrid.style.alignContent = 'start';
    nodesGrid.style.overflowY = 'auto'; // CRÍTICO: Permitir scroll
    nodesGrid.style.overflowX = 'hidden';
    nodesGrid.style.height = '0'; // Truque flexbox para scroll
    
    // Determinar quais chains mostrar
    const visibleIndexes = this.getVisibleChainIndexes(allChains.length);
    
    let html = '';
    
    for (const chainIndex of visibleIndexes) {
      const chain = await window.NodusChains.getChainWithIdeas(allChains[chainIndex].id);
      if (!chain) continue;
      
      // Cor da chain (padrão amarelo se não definida)
      const chainColor = chain.color || '#facc15';
      
      // Container de cada chain (ocupa 1 coluna)
      html += `
        <div class="chain-column" data-chain-index="${chainIndex}" style="display:flex; flex-direction:column; gap:10px; min-width:0; width:100%;">
          <!-- Chain Header: Nome + Contador + Actions NA MESMA LINHA -->
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <!-- Nome + Contador (ESQUERDA) -->
            <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">
              <span style="font-size:14px;">📚</span>
              <div style="flex:1; min-width:0;">
                <div style="color:#e5e7eb; font-size:11px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${this.escapeHtml(chain.name)}
                </div>
                <div style="color:#9ca3af; font-size:9px; font-weight:400;">
                  ${chain.nodes.length} ${chain.nodes.length === 1 ? 'item' : 'itens'}
                </div>
              </div>
            </div>
            
            <!-- Actions (DIREITA) -->
            <div class="chain-actions-wrapper" style="position:relative; flex-shrink:0;">
              <button class="chain-actions-btn" style="padding:4px 8px; background:#2d3748; border:1px solid #4a5568; border-radius:5px; color:#a0aec0; cursor:pointer; font-size:10px; display:flex; align-items:center; gap:4px; white-space:nowrap;">
                ⚙️ ${window.NodusI18n ? window.NodusI18n.t('chain.actions') : 'Ações'} <span style="font-size:8px;">▼</span>
              </button>
              <div class="chain-actions-menu" style="position:absolute; top:100%; right:0; margin-top:4px; background:#1a1f29; border:1px solid #4a5568; border-radius:8px; min-width:150px; box-shadow:0 4px 12px rgba(0,0,0,0.4); z-index:100; display:none;">
                <button class="chain-action-inject" data-chain-id="${chain.id}" style="width:100%; background:none; border:none; color:#10b981; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px; border-radius:8px 8px 0 0;">
                  💉 ${window.NodusI18n ? window.NodusI18n.t('chain.inject') : 'Inject chain'}
                </button>
                <button class="chain-action-export" data-chain-id="${chain.id}" style="width:100%; background:none; border:none; color:#e2e8f0; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px;">
                  📥 ${window.NodusI18n ? window.NodusI18n.t('chain.export') : 'Export'}
                </button>
                <button class="chain-action-delete" data-chain-id="${chain.id}" style="width:100%; background:none; border:none; color:#f87171; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px;">
                  🗑️ ${window.NodusI18n ? window.NodusI18n.t('chain.delete') : 'Delete chain'}
                </button>
                <div style="height:1px; background:#4a5568; margin:6px 0;"></div>
                <button class="chain-action-attachments" data-chain-id="${chain.id}" style="width:100%; background:none; border:none; color:#e2e8f0; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:space-between;">
                  <span style="display:flex; align-items:center; gap:8px;">📎 ${window.NodusI18n ? window.NodusI18n.t('chain.attachments') : 'Attachments'}</span>
                  <span style="background:#4a5568; color:#e2e8f0; padding:2px 6px; border-radius:10px; font-size:10px;">${(chain.attachments || []).length}</span>
                </button>
                <button class="chain-action-notes" data-chain-id="${chain.id}" style="width:100%; background:none; border:none; color:#e2e8f0; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px; border-radius:0 0 8px 8px;">
                  ${chain.notes ? '📄' : '📝'} ${window.NodusI18n ? window.NodusI18n.t('chain.notes') : 'Notes'}
                </button>
              </div>
            </div>
          </div>
          
          <!-- Nodes da Chain -->
          <div style="display:flex; flex-direction:column; gap:0; min-width:0;">
      `;
      
      if (chain.nodes.length === 0) {
        html += `
            <div style="text-align:center; padding:30px 10px; color:#4a5568; font-size:12px;">
              Chain vazia
            </div>
        `;
      } else {
        chain.nodes.forEach((node, i) => {
          // SISTEMA DUAL + VIRTUAL: Detectar tipo de node
          let queueColor, queueLabel, platform, title, question, answer, notes, attachments, nodeId, hasIdea, isVirtual;
          let nodeImages2 = [];

          if (node.type === 'standalone') {
            // NODE STANDALONE (Full Chat antigo - não deve mais existir)
            queueColor = '#8b5cf6';
            queueLabel = 'FC';
            platform = node.platform || 'Unknown';
            title = node.title || 'Sem título';
            question = node.question || 'Sem pergunta';
            answer = node.answer || 'Sem resposta';
            notes = null;
            attachments = null;
            nodeId = node.id;
            hasIdea = false;
            isVirtual = false;
            nodeImages2 = node.images || [];
          } else {
            // NODE LINKED - usa idea
            const idea = node.idea;
            if (!idea) return;

            // Detectar se é IDEA VIRTUAL (Full Chat)
            isVirtual = idea.status === 'virtual' || idea.queue?.startsWith('fullchat_');

            if (isVirtual) {
              // IDEA VIRTUAL (Full Chat) - cor roxa
              queueColor = '#8b5cf6';
              queueLabel = 'FC';
            } else {
              // IDEA NORMAL (Manual)
              queueColor = idea.queue === 'ideas_queue_quick' ? '#facc15' :
                                 idea.queue === 'ideas_queue_default' ? '#10b981' : '#3b82f6';
              queueLabel = idea.queue === 'ideas_queue_quick' ? 'Q' :
                                 idea.queue === 'ideas_queue_default' ? 'D' : 'Q1';
            }

            platform = idea.platform || 'Unknown';
            title = idea.title || 'Sem título';
            question = idea.question || 'Sem pergunta';
            answer = idea.answer || idea.text || 'Sem resposta';
            notes = idea.notes;
            attachments = idea.attachments;
            nodeId = idea.id;
            hasIdea = true;
            nodeImages2 = idea.images || [];
          }
          
          // Labels do toggle (3 estados) - IGUAL AO GRID I
          const toggleStates = {
            'both': { label: '📝 Q + A', color: '#facc15' },
            'question': { label: '❓ Pergunta', color: '#3b82f6' },
            'answer': { label: '💬 Resposta', color: '#10b981' }
          };
          const toggle = toggleStates[node.display] || toggleStates['both'];
          
          html += `
            <div class="node-card" data-node-id="${node.id}" data-chain-id="${chain.id}" draggable="true"
              style="background:#1a1f29; border:2px solid ${chainColor}; border-left:5px solid ${queueColor}; border-radius:8px; padding:16px; transition:all 0.3s ease-out; cursor:move; position:relative; width:100%; box-sizing:border-box; opacity:0; transform:translateY(-10px);">
              
              <!-- Header -->
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                <span style="color:#4a5568; font-size:16px; cursor:grab;">☰</span>
                <div style="background:#2d3748; color:#a0aec0; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; flex-shrink:0;">
                  ${i + 1}
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="color:${chainColor}; font-size:14px; font-weight:600; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                    ${this.escapeHtml(title)}
                  </div>
                </div>
              </div>
              
              <!-- Meta -->
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
                <span style="padding:3px 8px; background:${queueColor}; color:${queueColor === '#facc15' ? '#000' : '#fff'}; border-radius:4px; font-size:11px; font-weight:bold;">
                  ${queueLabel}
                </span>
                <span style="padding:3px 8px; background:#2d3748; color:#a0aec0; border-radius:4px; font-size:11px;">
                  🤖 ${platform}
                </span>
              </div>
              
              <!-- Toggle Display -->
              <div style="margin-bottom:12px;">
                <button class="toggle-btn" data-node-id="${node.id}" data-state="${node.display}" data-chain-id="${chain.id}"
                  style="padding:8px 12px; border:none; border-radius:6px; background:${toggle.color}; color:${toggle.color === '#facc15' ? '#000' : '#fff'}; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;">
                  ${toggle.label}
                </button>
              </div>
              
              <!-- Content (Pergunta/Resposta) -->
              <div style="margin-bottom:12px; padding:12px; background:#0e1117; border-radius:6px; max-height:200px; overflow-y:auto;">
                ${(node.display === 'both' || node.display === 'question') ? `
                  <div style="margin-bottom:${node.display === 'both' ? '12px' : '0'};">
                    <div style="color:#3b82f6; font-size:11px; font-weight:600; margin-bottom:4px;">❓ PERGUNTA</div>
                    <div style="color:#e2e8f0; font-size:12px; line-height:1.5;">${this._mdToHtml(question, true)}</div>
                  </div>
                ` : ''}
                ${(node.display === 'both' || node.display === 'answer') ? `
                  <div>
                    <div style="color:#10b981; font-size:11px; font-weight:600; margin-bottom:4px;">💬 RESPOSTA</div>
                    <div style="color:#e2e8f0; font-size:12px; line-height:1.5;">${this._mdToHtml(answer, true)}</div>
                  </div>
                ` : ''}
              </div>

              <!-- Imagens capturadas (Full Chat) -->
              ${nodeImages2.length > 0 ? `
                <div style="margin-bottom:12px;">
                  <div style="color:#a78bfa; font-size:11px; font-weight:600; margin-bottom:6px;">📷 IMAGENS (${nodeImages2.length})</div>
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    ${nodeImages2.map(src => src.startsWith('idb:') ? `
                      <img data-idb-src="${this.escapeHtml(src.slice(4))}"
                        style="width:72px; height:52px; object-fit:cover; border-radius:5px; border:1px solid rgba(167,139,250,0.3); background:#2d3748;">
                    ` : `
                      <a href="${this.escapeHtml(src)}" target="_blank" rel="noopener noreferrer" title="Abrir imagem" style="display:block; flex-shrink:0;">
                        <img src="${this.escapeHtml(src)}" referrerpolicy="no-referrer"
                          style="width:72px; height:52px; object-fit:cover; border-radius:5px; border:1px solid rgba(167,139,250,0.3); cursor:pointer; transition:transform 0.15s;"
                          onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'"
                          onerror="this.parentElement.style.display='none'">
                      </a>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Actions -->
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${isVirtual ? `
                  <!-- Botão PROMOVER (idea virtual) -->
                  <button class="promote-node-btn" data-idea-id="${nodeId}" data-node-id="${node.id}" data-chain-id="${chain.id}"
                    style="flex:1; padding:8px 12px; background:#8b5cf6; border:none; border-radius:6px; color:#fff; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s; min-width:100px;">
                    📤 Promover
                  </button>
                ` : (hasIdea ? `
                  <!-- Botão INFO (idea normal) -->
                  <div class="info-btn-container" style="flex:1; position:relative;">
                    <button class="info-node-btn" data-idea-id="${nodeId}"
                      style="width:100%; padding:8px 12px; background:#262b36; border:1px solid #3a4255; border-radius:6px; color:#e2e8f0; font-size:12px; cursor:pointer; transition:all 0.2s;">
                      ℹ️ Info
                    </button>
                    <div class="info-tooltip" style="display:none; position:absolute; bottom:100%; left:0; right:0; margin-bottom:8px; padding:12px; background:#1a1f29; border:1px solid #4a5568; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.4); z-index:100; min-width:200px;">
                      <div style="color:#a0aec0; font-size:11px; margin-bottom:8px;">
                        <span style="color:#facc15; font-weight:600;">📝 Notas:</span>
                        <div style="color:#e2e8f0; margin-top:4px; font-size:12px; line-height:1.4;">
                          ${notes ? this.escapeHtml(notes.substring(0, 150)) + (notes.length > 150 ? '...' : '') : '<em style="color:#64748b;">Sem notas</em>'}
                        </div>
                      </div>
                      <div style="color:#a0aec0; font-size:11px; border-top:1px solid #2d3748; padding-top:8px;">
                        <span style="color:#facc15; font-weight:600;">📎 Anexos:</span>
                        <div style="color:#e2e8f0; margin-top:4px; font-size:12px;">
                          ${attachments && attachments.length > 0 ? attachments.length + ' arquivo(s)' : '<em style="color:#64748b;">Sem anexos</em>'}
                        </div>
                      </div>
                    </div>
                  </div>
                ` : `
                  <div style="flex:1; padding:8px 12px; background:#262b36; border:1px solid #4a5568; border-radius:6px; color:#64748b; font-size:11px; text-align:center;">
                    📚 Nodo Chat Completo
                  </div>
                `)}
                <button class="remove-node-btn" data-node-id="${nodeId}" data-chain-id="${chain.id}"
                  style="flex:1; padding:8px 12px; background:#262b36; border:1px solid #ef4444; border-radius:6px; color:#ef4444; font-size:12px; cursor:pointer; transition:all 0.2s;">
                  ❌ Remover
                </button>
              </div>
            </div>
          `;
          
          // Linha conectora (exceto último node) - USA COR DA CHAIN
          if (i < chain.nodes.length - 1) {
            html += `
              <div style="width:3px; height:40px; background:${chainColor}; margin:8px 0 8px 50%; transform:translateX(-50%); border-radius:2px; opacity:0.8;"></div>
            `;
          }
        });
      }
      
      html += `
          </div>
        </div>
      `;
    }
    
    nodesGrid.innerHTML = html;
    
    // ANIMAÇÃO PROGRESSIVA COM ACELERAÇÃO (350ms → 200ms) - Grid II/III
    // APENAS na primeira vez após Full Chat Capture
    if (this.justCapturedFullChat) {
      
      requestAnimationFrame(() => {
        const cards = nodesGrid.querySelectorAll('.node-card');
        
        if (cards.length === 0) return;
        
        // Calcular delays com aceleração progressiva
        const startSpeed = 350;  // Velocidade inicial (devagar)
        const endSpeed = 200;    // Velocidade final (rápido)
        let accumulatedDelay = 0;
        const delays = [0]; // Primeiro card instantâneo
        
        for (let i = 1; i < cards.length; i++) {
          const progress = (i - 1) / (cards.length - 2); // 0.0 a 1.0
          const intervalDelay = startSpeed - (progress * (startSpeed - endSpeed));
          accumulatedDelay += intervalDelay;
          delays.push(accumulatedDelay);
        }
        
        
        // Scroll para o topo antes de começar (exceto após deleção de nó, onde preservamos posição)
        const preserveScrollMulti = this._preserveScrollTop != null && this._preserveScrollTop > 0;
        nodesGrid.scrollTop = preserveScrollMulti ? this._preserveScrollTop : 0;

        // Animar cards progressivamente
        cards.forEach((card, index) => {
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';

            // AUTO-SCROLL: só rola automaticamente quando não estamos preservando posição
            if (!preserveScrollMulti) {
              setTimeout(() => {
                card.scrollIntoView({
                  behavior: 'smooth',
                  block: 'end',
                  inline: 'nearest'
                });
              }, 100);
            }
          }, delays[index]);
        });
      });
    } else {
      // Visualização normal: mostrar cards instantaneamente
      requestAnimationFrame(() => {
        const cards = nodesGrid.querySelectorAll('.node-card');
        cards.forEach(card => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
          card.style.transition = 'none'; // Sem transição
        });
      });
    }

    // Carregar imagens IndexedDB nos cards (async, após DOM pronto)
    setTimeout(() => this._loadIdbImages(), 100);
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Resolve uma referência de imagem para data URI base64.
   * Suporta:
   *   "idb:<key>"   → busca do IndexedDB (imagens salvas no capture)
   *   "http(s)://…" → fetch com credenciais de sessão (fallback, pode expirar)
   */
  async _fetchImageAsDataUrl(url) {
    if (!url) return null;
    try {
      // 1. Referência IndexedDB — fonte primária e confiável
      if (url.startsWith('idb:') && window.NodusAttachmentsDB) {
        const key = url.slice(4);
        const record = await window.NodusAttachmentsDB.getFile(key);
        if (!record || !record.fileData) return null;
        const blob = new Blob([record.fileData], { type: record.fileType || 'image/jpeg' });
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }

      // 2. URL HTTP — pedir ao background (sem CORS, tem host_permissions)
      if (url.startsWith('http')) {
        const result = await chrome.runtime.sendMessage({ action: 'fetchImageAsBase64', url });
        if (result && result.ok && result.base64) {
          return `data:${result.mimeType};base64,${result.base64}`;
        }
        return null;
      }
    } catch (e) {
      // silently skip
    }
    return null;
  },
  
  /**
   * Aplica ou remove margin baseado no estado da sidebar
   */
  applySidebarMargin() {
    const sidebarWidth = this.sidebarGrid === 1 ? 320 : 640;
    const gap = 15;
    
    if (this.sidebarOpen) {
      // Sidebar aberta: aplicar margin
      this.applyPlatformSpecificMargin(sidebarWidth + gap);
    } else {
      // Sidebar fechada: remover margin
      this.removePlatformSpecificMargin();
    }
  },
  
  /**
   * Aplica margin específico para Claude.ai e ChatGPT quando sidebar está aberta
   * Detecta automaticamente o container correto e aplica inline style
   */
  applyPlatformSpecificMargin(marginValue) {
    const hostname = window.location.hostname;
    
    // Limpar qualquer margin anterior
    this.removePlatformSpecificMargin();
    
    // CLAUDE.AI
    if (hostname.includes('claude.ai')) {
      
      const strategies = [
        () => document.querySelector('#root > div:first-child'),
        () => {
          const children = Array.from(document.querySelectorAll('#root > div'));
          return children.find(el => el.offsetHeight > 200);
        },
        () => document.querySelector('main'),
        () => {
          const elements = Array.from(document.querySelectorAll('[class*="relative"]'));
          return elements.find(el => el.offsetHeight > 200 && el.offsetWidth > 500);
        },
        () => {
          const divs = Array.from(document.querySelectorAll('body > div'));
          return divs.find(el => el.offsetHeight > 400);
        }
      ];
      
      for (let i = 0; i < strategies.length; i++) {
        try {
          const element = strategies[i]();
          if (element && element.offsetHeight > 100) {
            element.style.marginRight = `${marginValue}px`;
            element.style.transition = 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            element.dataset.nodusMarginApplied = 'true';
            return;
          }
        } catch (e) {
          console.warn(`[Chains] ⚠️ Estratégia ${i + 1} falhou:`, e.message);
        }
      }
    }
    
    // CHATGPT
    else if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
      
      // ChatGPT JÁ TEM margin-right no <main>!
      // Precisamos REMOVER o dele e aplicar o nosso
      const main = document.querySelector('main');
      if (main) {
        // Guardar margin original do ChatGPT para restaurar depois
        if (!main.dataset.originalMarginRight) {
          const currentMargin = window.getComputedStyle(main).marginRight;
          main.dataset.originalMarginRight = currentMargin;
        }
        
        // Aplicar nosso margin (que já inclui o espaço do dashboard)
        main.style.marginRight = `${marginValue}px`;
        main.style.transition = 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        main.dataset.nodusMarginApplied = 'true';
        return;
      }
      
      console.warn('[Chains] ⚠️ Main do ChatGPT não encontrado');
    }
    
    else {
    }
  },
  
  /**
   * Remove margin específico aplicado
   */
  removePlatformSpecificMargin() {
    const hostname = window.location.hostname;
    
    const elementsWithMargin = document.querySelectorAll('[data-nodus-margin-applied="true"]');
    if (elementsWithMargin.length > 0) {
      elementsWithMargin.forEach(el => {
        // ChatGPT: restaurar margin original
        if ((hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) && 
            el.dataset.originalMarginRight) {
          el.style.marginRight = el.dataset.originalMarginRight;
          delete el.dataset.originalMarginRight;
        } else {
          el.style.marginRight = '';
        }
        el.style.transition = '';
        delete el.dataset.nodusMarginApplied;
      });
    }
  },

  /**
   * Copia conteúdo da chain para clipboard respeitando toggle de cada node
   */
  async copyChain(chainId) {
    
    // 🔒 VALIDAÇÃO CROSS-PLATFORM
    const storageData = await chrome.storage.local.get('settings');
    const settings = storageData.settings || { crossPlatformInject: false };
    
    if (!settings.crossPlatformInject) {
      // Detectar plataforma atual
      const url = window.location.href;
      let currentPlatform = 'unknown';
      if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) currentPlatform = 'chatgpt';
      else if (url.includes('claude.ai')) currentPlatform = 'claude';
      else if (url.includes('gemini.google.com')) currentPlatform = 'gemini';
      else if (url.includes('perplexity.ai')) currentPlatform = 'perplexity';
      else if (url.includes('copilot.microsoft.com')) currentPlatform = 'copilot';
      else if (url.includes('grok.x.com') || url.includes('x.com/i/grok')) currentPlatform = 'grok';
      else if (url.includes('chat.deepseek.com')) currentPlatform = 'deepseek';
      
      // Verificar se algum nó tem plataforma diferente
      const chain = await window.NodusChains.getChainWithIdeas(chainId);
      if (chain && chain.nodes) {
        const differentPlatforms = chain.nodes.some(node => 
          node.idea && node.idea.platform && node.idea.platform !== currentPlatform
        );
        
        if (differentPlatforms) {
          this.showToast(
            `🔒 Cross-Platform Inject desabilitado\nChain contém ideias de outra plataforma.\nHabilite nas Configurações ⚙️`,
            'error'
          );
          return; // BLOQUEIA cópia
        }
      }
    }
    
    const chain = await window.NodusChains.getChainWithIdeas(chainId);
    if (!chain) {
      this.showToast('❌ Chain não encontrada', 'error');
      return;
    }
    
    let text = `📌 ${chain.name}\n`;
    text += `${'═'.repeat(40)}\n\n`;
    
    chain.nodes.forEach((node, i) => {
      const idea = node.idea;
      if (!idea) return;
      
      // ✨ CLEANUP: Remover escapes desnecessários
      const cleanText = (txt) => {
        if (!txt) return txt;
        return txt
          .replace(/\\n/g, '\n')      // \\n → \n real
          .replace(/\\t/g, '\t')      // \\t → tab real
          .replace(/\\\./g, '.')      // \\. → .
          .replace(/\\\(/g, '(')      // \\( → (
          .replace(/\\\)/g, ')')      // \\) → )
          .replace(/\\\[/g, '[')      // \\[ → [
          .replace(/\\\]/g, ']')      // \\] → ]
          .replace(/\\\*/g, '*')      // \\* → *
          .replace(/\\\$/g, '$')      // \\$ → $
          .replace(/\\\#/g, '#')      // \\# → #
          .replace(/\\\>/g, '>')      // \\> → >
          .replace(/\\\-/g, '-')      // \\- → -
          .replace(/\\\"/g, '"')      // \\" → "
          .replace(/\\\'/g, "'")      // \\' → '
          .replace(/\\\\/g, '\\');    // \\\\ → \
      };
      
      text += `[${i + 1}] ${idea.title || 'Sem título'}\n`;
      text += `🤖 ${idea.platform || 'Unknown'} | 📅 ${new Date(idea.timestamp || Date.now()).toLocaleDateString('pt-BR')}\n`;
      text += `${'-'.repeat(30)}\n`;
      
      // Respeitar toggle display
      if (node.display === 'both' || node.display === 'question') {
        text += `❓ PERGUNTA:\n${cleanText(idea.question) || 'Sem pergunta'}\n\n`;
      }
      if (node.display === 'both' || node.display === 'answer') {
        text += `💬 RESPOSTA:\n${cleanText(idea.answer || idea.text) || 'Sem resposta'}\n`;
      }
      
      text += `\n${'─'.repeat(40)}\n\n`;
    });
    
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(`📋 Chain "${chain.name}" copiada!`, 'success');
    } catch (err) {
      console.error('[Chains] Erro ao copiar:', err);
      this.showToast('❌ Erro ao copiar', 'error');
    }
  },

  /**
   * Exporta chain como arquivo .txt estruturado
   */
  async exportChainTXT(chainId) {
    
    const chain = await window.NodusChains.getChainWithIdeas(chainId);
    if (!chain) {
      this.showToast('❌ Chain não encontrada', 'error');
      return;
    }
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    let text = `╔${'═'.repeat(50)}╗\n`;
    text += `║  NODUS - Chain Export\n`;
    text += `║  ${chain.name}\n`;
    text += `║  ${dateStr} ${timeStr}\n`;
    text += `║  ${chain.nodes.length} node(s)\n`;
    text += `╚${'═'.repeat(50)}╝\n\n`;
    
    chain.nodes.forEach((node, i) => {
      const idea = node.idea;
      if (!idea) return;
      
      text += `┌${'─'.repeat(48)}┐\n`;
      text += `│ NODE ${i + 1}: ${(idea.title || 'Sem título').substring(0, 35)}\n`;
      text += `│ 🤖 ${idea.platform || 'Unknown'} | 📅 ${new Date(idea.timestamp || Date.now()).toLocaleDateString('pt-BR')}\n`;
      text += `└${'─'.repeat(48)}┘\n\n`;
      
      // Respeitar toggle display
      if (node.display === 'both' || node.display === 'question') {
        text += `❓ PERGUNTA:\n`;
        text += `${idea.question || 'Sem pergunta'}\n\n`;
      }
      if (node.display === 'both' || node.display === 'answer') {
        text += `💬 RESPOSTA:\n`;
        text += `${idea.answer || idea.text || 'Sem resposta'}\n`;
      }
      
      text += `\n${'═'.repeat(50)}\n\n`;
    });
    
    text += `\n── Exportado por NODUS v3.3.1 ──\n`;
    
    // Criar e baixar arquivo
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nodus_chain_${chain.name.replace(/[^a-zA-Z0-9]/g, '_')}_${now.toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showToast(`📄 Chain "${chain.name}" exportada!`, 'success');
    
    // ✨ TRACK: Evento de Export
    if (telemetryTracker) {
      telemetryTracker.trackExport({
        format: 'txt',
        ideas_count: chain.nodes.length,
        chain_id: chainId
      }).catch(err => console.warn('[Telemetry] Track failed:', err));
    }
  },
  
  /**
   * Export MD estruturado (PRO feature)
   */
  async exportChainMD(chainId) {

    const isPro = window.NodusLicense && window.NodusLicense.isPro();
    if (!isPro) {
      this.showToast('🔒 MD Export é uma feature PRO', 'warning');
      return;
    }

    const chain = await window.NodusChains.getChainWithIdeas(chainId);
    if (!chain) {
      this.showToast('❌ Chain não encontrada', 'error');
      return;
    }

    const md = this.generateMarkdownWithMermaid(chain);
    const now = new Date();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nodus_chain_${chain.name.replace(/[^a-zA-Z0-9]/g, '_')}_${now.toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast(`📝 Chain "${chain.name}" exportada como MD!`, 'success');

    if (telemetryTracker) {
      telemetryTracker.trackExport({
        format: 'md',
        ideas_count: chain.nodes.length,
        chain_id: chainId
      }).catch(err => console.warn('[Telemetry] Track failed:', err));
    }
  },

  /**
   * Mostra submenu de formatos de export INLINE ABAIXO do botão
   */
  showExportSubmenu(buttonElement, chainId) {
    // Remover qualquer submenu existente (sem toggle — o handler dispara múltiplas vezes)
    document.querySelectorAll('.export-submenu').forEach(s => s.remove());
    
    // Verificar licença usando método padrão (consistente com resto do código)
    const isPro = window.NodusLicense && window.NodusLicense.isPro();
    
    
    // Criar submenu
    const submenu = document.createElement('div');
    submenu.className = 'export-submenu';
    submenu.style.cssText = `
      position: fixed;
      background: #1a1f29;
      border: 1px solid #4a5568;
      border-radius: 6px;
      min-width: 140px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 1000010;
      padding: 4px 0;
    `;
    
    submenu.innerHTML = `
      <button class="export-format-txt" data-chain-id="${chainId}" style="width:100%; background:none; border:none; color:#e2e8f0; padding:10px 14px; text-align:left; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:8px; transition:background 0.2s;" onmouseover="this.style.background='#2d3748'" onmouseout="this.style.background='none'">
        <span>📄</span> TXT
      </button>
      <button class="export-format-html ${!isPro ? 'locked' : ''}" data-chain-id="${chainId}" style="width:100%; background:none; border:none; color:${isPro ? '#e2e8f0' : '#6b7280'}; padding:10px 14px; text-align:left; cursor:${isPro ? 'pointer' : 'not-allowed'}; font-size:12px; display:flex; align-items:center; justify-content:space-between; transition:background 0.2s;" onmouseover="this.style.background='${isPro ? '#2d3748' : 'none'}'" onmouseout="this.style.background='none'">
        <span style="display:flex; align-items:center; gap:8px;"><span>🌐</span> HTML</span>
        ${!isPro ? '<span style="font-size:10px; color:#f59e0b;">🔒 PRO</span>' : ''}
      </button>
      <button class="export-format-docx ${!isPro ? 'locked' : ''}" data-chain-id="${chainId}" style="width:100%; background:none; border:none; color:${isPro ? '#e2e8f0' : '#6b7280'}; padding:10px 14px; text-align:left; cursor:${isPro ? 'pointer' : 'not-allowed'}; font-size:12px; display:flex; align-items:center; justify-content:space-between; transition:background 0.2s;" onmouseover="this.style.background='${isPro ? '#2d3748' : 'none'}'" onmouseout="this.style.background='none'">
        <span style="display:flex; align-items:center; gap:8px;"><span>📘</span> DOC (Word)</span>
        ${!isPro ? '<span style="font-size:10px; color:#f59e0b;">🔒 PRO</span>' : ''}
      </button>
      <button class="export-format-md ${!isPro ? 'locked' : ''}" data-chain-id="${chainId}" style="width:100%; background:none; border:none; color:${isPro ? '#e2e8f0' : '#6b7280'}; padding:10px 14px; text-align:left; cursor:${isPro ? 'pointer' : 'not-allowed'}; font-size:12px; display:flex; align-items:center; justify-content:space-between; transition:background 0.2s;" onmouseover="this.style.background='${isPro ? '#2d3748' : 'none'}'" onmouseout="this.style.background='none'">
        <span style="display:flex; align-items:center; gap:8px;"><span>📝</span> Markdown</span>
        ${!isPro ? '<span style="font-size:10px; color:#f59e0b;">🔒 PRO</span>' : ''}
      </button>
    `;
    
    // Posicionar baseado no rect do botão
    const rect = buttonElement.getBoundingClientRect();
    submenu.style.left = rect.left + 'px';
    submenu.style.width = Math.max(rect.width, 160) + 'px';
    submenu.style.top = (rect.bottom + 4) + 'px';
    document.body.appendChild(submenu);

    // Flip up se o submenu sair da borda inferior da tela
    const submenuRect = submenu.getBoundingClientRect();
    if (submenuRect.bottom > window.innerHeight - 8) {
      submenu.style.top = Math.max(4, rect.top - submenuRect.height - 4) + 'px';
    }
    
    // Adicionar listeners aos botões do submenu
    const txtBtn  = submenu.querySelector('.export-format-txt');
    const htmlBtn = submenu.querySelector('.export-format-html');
    const docxBtn = submenu.querySelector('.export-format-docx');
    const mdBtn   = submenu.querySelector('.export-format-md');

    const closeAll = () => {
      submenu.remove();
      document.querySelectorAll('.chain-actions-menu, .chain-actions-menu-header').forEach(m => m.style.display = 'none');
    };

    txtBtn.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      await this.exportChainTXT(chainId);
      closeAll();
    };

    if (isPro) {
      htmlBtn.onclick = async (e) => {
        e.preventDefault(); e.stopPropagation();
        await this.exportChainHTML(chainId);
        closeAll();
      };

      docxBtn.onclick = async (e) => {
        e.preventDefault(); e.stopPropagation();
        await this.exportChainDOCX(chainId);
        closeAll();
      };

      mdBtn.onclick = async (e) => {
        e.preventDefault(); e.stopPropagation();
        await this.exportChainMD(chainId);
        closeAll();
      };
    } else {
      const proMsg = (e) => {
        e.preventDefault(); e.stopPropagation();
        this.showToast('🔒 Feature PRO - Faça upgrade!', 'warning');
        closeAll();
      };
      htmlBtn.onclick = proMsg;
      docxBtn.onclick = proMsg;
      mdBtn.onclick   = proMsg;
    }
    
    // Fechar submenu ao clicar em QUALQUER lugar fora (incluindo o menu principal)
    const closeHandler = (e) => {
      // Se clicou fora do submenu E fora do botão Export
      if (!submenu.contains(e.target) && !buttonElement.contains(e.target)) {
        submenu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    
    // Adicionar listener após um pequeno delay para evitar fechar imediatamente
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 50);
  },
  
  /**
   * Export HTML (PRO feature)
   */
  /**
   * Converte markdown básico para HTML para uso no export
   */
  _mdToHtml(text, dark = false) {
    if (!text) return '';

    // 1. Remover markdown de imagens (![alt](url)) — são mostradas na seção de imagens
    text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

    // 2. Escapar entidades HTML antes de processar
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // Cores dependentes do tema
    const h1c = dark ? '#f1f5f9' : '#1e293b';
    const h2c = dark ? '#e2e8f0' : '#1e293b';
    const h3c = dark ? '#cbd5e1' : '#1e293b';
    const h4c = dark ? '#94a3b8'  : '#374151';
    const hrC = dark ? '#334155'  : '#e2e8f0';
    const codeInlineBg = dark ? '#0f172a' : '#f1f5f9';
    const codeInlineC  = dark ? '#a78bfa' : '#7c3aed';

    // 3. Blocos de código (``` ... ```) — processar antes de tudo
    const codeBlocks = [];
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre style="background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.6;margin:12px 0;"><code>${esc(code.trim())}</code></pre>`);
      return `\x00CODE${idx}\x00`;
    });

    // 4. Código inline (`code`)
    text = text.replace(/`([^`]+)`/g, (_, c) => `<code style="background:${codeInlineBg};color:${codeInlineC};padding:2px 6px;border-radius:4px;font-size:0.9em;">${esc(c)}</code>`);

    // 5. Linhas por linha para estruturas de bloco
    const lines = text.split('\n');
    const out = [];
    let inUL = false, inOL = false, inP = false;

    const closeList = () => {
      if (inUL) { out.push('</ul>'); inUL = false; }
      if (inOL) { out.push('</ol>'); inOL = false; }
    };
    const closeP = () => {
      if (inP) { out.push('</p>'); inP = false; }
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Código placeholder
      if (/\x00CODE\d+\x00/.test(line)) {
        closeList(); closeP();
        out.push(line.replace(/\x00CODE(\d+)\x00/g, (_, idx) => codeBlocks[idx]));
        continue;
      }

      // Headings
      const h4 = line.match(/^####\s+(.+)/);
      const h3 = line.match(/^###\s+(.+)/);
      const h2 = line.match(/^##\s+(.+)/);
      const h1 = line.match(/^#\s+(.+)/);
      if (h4) { closeList(); closeP(); out.push(`<h4 style="font-size:14px;font-weight:700;color:${h4c};margin:14px 0 6px;">${esc(h4[1])}</h4>`); continue; }
      if (h3) { closeList(); closeP(); out.push(`<h3 style="font-size:16px;font-weight:700;color:${h3c};margin:16px 0 8px;">${esc(h3[1])}</h3>`); continue; }
      if (h2) { closeList(); closeP(); out.push(`<h2 style="font-size:19px;font-weight:700;color:${h2c};margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid ${hrC};">${esc(h2[1])}</h2>`); continue; }
      if (h1) { closeList(); closeP(); out.push(`<h1 style="font-size:22px;font-weight:700;color:${h1c};margin:22px 0 12px;">${esc(h1[1])}</h1>`); continue; }

      // HR
      if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
        closeList(); closeP();
        out.push(`<hr style="border:none;border-top:1px solid ${hrC};margin:16px 0;">`);
        continue;
      }

      // Listas não ordenadas
      const ulMatch = line.match(/^(\s*)[*\-+]\s+(.+)/);
      if (ulMatch) {
        closeP();
        if (!inUL) { out.push('<ul style="padding-left:20px;margin:8px 0;">'); inUL = true; }
        if (inOL) { out.push('</ol>'); inOL = false; }
        out.push(`<li style="margin-bottom:4px;">${this._inlineMd(ulMatch[2], esc)}</li>`);
        continue;
      }

      // Listas ordenadas
      const olMatch = line.match(/^\d+\.\s+(.+)/);
      if (olMatch) {
        closeP();
        if (!inOL) { out.push('<ol style="padding-left:20px;margin:8px 0;">'); inOL = true; }
        if (inUL) { out.push('</ul>'); inUL = false; }
        out.push(`<li style="margin-bottom:4px;">${this._inlineMd(olMatch[1], esc)}</li>`);
        continue;
      }

      closeList();

      // Linha em branco → fecha parágrafo
      if (line.trim() === '') {
        closeP();
        continue;
      }

      // Texto normal
      const rendered = this._inlineMd(line, esc);
      if (!inP) { out.push('<p style="margin:8px 0;line-height:1.7;">'); inP = true; }
      else out.push('<br>');
      out.push(rendered);
    }

    closeList();
    closeP();

    // Restaurar code blocks
    return out.join('\n');
  },

  /**
   * Processa inline markdown: bold, italic, links
   */
  _inlineMd(text, esc) {
    // Extrair links [text](url) antes de qualquer escaping
    const links = [];
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, url) => {
      const idx = links.length;
      links.push(`<a href="${url}" target="_blank" rel="noopener" style="color:#667eea;">${esc(label)}</a>`);
      return `\x00LINK${idx}\x00`;
    });

    // Escape HTML nas partes normais
    text = esc(text);

    // Bold+italic
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // Restaurar links
    text = text.replace(/\x00LINK(\d+)\x00/g, (_, idx) => links[idx]);

    return text;
  },

  // ── PROGRESS OVERLAY ────────────────────────────────────────
  _showExportProgress(message) {
    let overlay = document.getElementById('nodus-export-progress');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'nodus-export-progress';
      overlay.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
        'background:rgba(0,0,0,0.72)', 'z-index:1000020',
        'display:flex', 'align-items:center', 'justify-content:center',
        'flex-direction:column'
      ].join(';');
      overlay.innerHTML = `
        <div style="background:#1a1f29;border:1px solid #4a5568;border-radius:12px;padding:28px 36px;text-align:center;min-width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
          <div style="font-size:28px;margin-bottom:14px;">⏳</div>
          <div id="nodus-export-progress-msg" style="color:#e2e8f0;font-size:14px;font-weight:500;line-height:1.5;"></div>
          <div style="margin-top:18px;background:#2d3748;border-radius:4px;overflow:hidden;height:5px;width:100%;">
            <div id="nodus-export-progress-bar" style="height:100%;background:linear-gradient(90deg,#667eea,#764ba2);width:0%;transition:width 0.3s ease;"></div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    const msg = document.getElementById('nodus-export-progress-msg');
    if (msg) msg.textContent = message;
  },

  _updateExportProgress(current, total, message) {
    const msg = document.getElementById('nodus-export-progress-msg');
    const bar = document.getElementById('nodus-export-progress-bar');
    if (msg) msg.textContent = message != null ? message : `Processando... (${current}/${total})`;
    if (bar && total > 0) bar.style.width = Math.round((current / total) * 100) + '%';
  },

  _hideExportProgress() {
    const overlay = document.getElementById('nodus-export-progress');
    if (overlay) overlay.remove();
  },
  // ────────────────────────────────────────────────────────────

  async exportChainHTML(chainId) {
    
    // Verificar licença usando método padrão (consistente com resto do código)
    const isPro = window.NodusLicense && window.NodusLicense.isPro();
    if (!isPro) {
      this.showToast('🔒 HTML Export é uma feature PRO', 'warning');
      return;
    }
    
    const chain = await window.NodusChains.getChainWithIdeas(chainId);
    if (!chain) {
      this.showToast('❌ Chain não encontrada', 'error');
      return;
    }
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Contar total de imagens para barra de progresso
    const totalImages = chain.nodes.reduce((acc, node) => {
      const src = node.idea || node;
      return acc + (src.images || []).filter(u => u && (u.startsWith('http') || u.startsWith('idb:'))).length;
    }, 0);
    const totalNodes = chain.nodes.length;
    let imagesProcessed = 0;

    this._showExportProgress(`Preparando export HTML... (0/${totalNodes} nodes)`);

    try {

    // Construir nodes de forma assíncrona para poder buscar imagens
    let nodesHtml = '';
    for (let i = 0; i < chain.nodes.length; i++) {
      const node = chain.nodes[i];
      const idea = node.idea;
      const isStandalone = node.type === 'standalone';
      if (!idea && !isStandalone) continue;

      this._updateExportProgress(i, totalNodes, `Processando node ${i + 1}/${totalNodes}...`);

      const src = idea || node;
      const nodeImages = (src.images || []).filter(u => u && (u.startsWith('http') || u.startsWith('idb:')));

      // Resolver imagens como base64 para embeddar no HTML (funciona offline)
      let imagesSection = '';
      if (nodeImages.length > 0) {
        const imgTags = [];
        for (const url of nodeImages) {
          imagesProcessed++;
          this._updateExportProgress(imagesProcessed, Math.max(totalImages, 1),
            `Carregando imagem ${imagesProcessed}/${totalImages}...`);
          const dataUrl = await this._fetchImageAsDataUrl(url);
          if (dataUrl) {
            imgTags.push(`<a href="${dataUrl}" target="_blank" title="Abrir imagem"><img src="${dataUrl}" alt="Imagem do node" onerror="this.parentElement.style.display='none'"></a>`);
          }
        }
        if (imgTags.length > 0) {
          imagesSection = `
            <div class="node-images">
              <div class="node-images-label">🖼️ IMAGENS (${imgTags.length}/${nodeImages.length})</div>
              <div class="node-images-grid">${imgTags.join('')}</div>
            </div>`;
        }
      }

      nodesHtml += `
        <div class="node-card">
          <div class="node-header">
            <div class="node-number">NODE ${i + 1}</div>
            <div class="node-meta">
              <span>🤖 ${this.escapeHtml((src.platform) || 'Unknown')}</span>
              <span>📅 ${new Date(src.timestamp || Date.now()).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <div class="node-title">${this.escapeHtml(src.title || 'Sem título')}</div>
          ${(node.display === 'both' || node.display === 'question') ? `
            <div class="question-section">
              <div class="section-label">❓ PERGUNTA</div>
              <div class="section-content">${this._mdToHtml(src.question || 'Sem pergunta')}</div>
            </div>` : ''}
          ${(node.display === 'both' || node.display === 'answer') ? `
            <div class="answer-section">
              <div class="section-label">💬 RESPOSTA</div>
              <div class="section-content">${this._mdToHtml(src.answer || src.text || 'Sem resposta')}</div>
            </div>` : ''}
          ${imagesSection}
        </div>`;
    }

    this._updateExportProgress(totalNodes, totalNodes, 'Gerando arquivo HTML...');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NODUS Chain - ${this.escapeHtml(chain.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      min-height: 100vh;
    }
    .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
    .header h1 { font-size: 32px; margin-bottom: 12px; font-weight: 700; }
    .header-info { opacity: 0.9; font-size: 14px; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
    .content { padding: 40px; }
    .node-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .node-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
    .node-number { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 14px; }
    .node-meta { display: flex; gap: 12px; font-size: 12px; color: #64748b; }
    .node-title { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
    .question-section, .answer-section { margin-bottom: 16px; }
    .section-label { font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; }
    .section-content { font-size: 15px; line-height: 1.7; color: #334155; background: white; padding: 16px; border-radius: 8px; border-left: 3px solid #667eea; }
    .node-images { margin-top: 16px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
    .node-images-label { font-size: 12px; font-weight: 600; color: #7c3aed; margin-bottom: 10px; }
    .node-images-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .node-images-grid a { display: block; border-radius: 8px; overflow: hidden; border: 1px solid #ddd6fe; }
    .node-images-grid img { width: 200px; height: 140px; object-fit: cover; display: block; }
    .footer { text-align: center; padding: 30px; color: #64748b; font-size: 13px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    @media (max-width: 768px) { body { padding: 20px 10px; } .header { padding: 30px 20px; } .header h1 { font-size: 24px; } .content { padding: 20px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔗 ${this.escapeHtml(chain.name)}</h1>
      <div class="header-info">
        <span>📅 ${dateStr} ${timeStr}</span>
        <span>📊 ${chain.nodes.length} node${chain.nodes.length !== 1 ? 's' : ''}</span>
        <span>🚀 Exportado por NODUS</span>
      </div>
    </div>
    <div class="content">${nodesHtml}</div>
    <div class="footer">Exportado por <strong>NODUS v4.24.2</strong> • ${new Date().toLocaleDateString('pt-BR')}</div>
  </div>
</body>
</html>`;

    // Criar e baixar arquivo
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nodus_chain_${chain.name.replace(/[^a-zA-Z0-9]/g, '_')}_${now.toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this._hideExportProgress();

    this.showToast(`🌐 Chain "${chain.name}" exportada em HTML!`, 'success');

    // ✨ TRACK: Evento de Export
    if (telemetryTracker) {
      telemetryTracker.trackExport({
        format: 'html',
        ideas_count: chain.nodes.length,
        chain_id: chainId
      }).catch(err => console.warn('[Telemetry] Track failed:', err));
    }
    } catch (err) {
      this._hideExportProgress();
      console.error('[Chains] ❌ Erro no export HTML:', err);
      this.showToast('❌ Erro ao exportar HTML: ' + (err.message || 'Tente novamente'), 'error');
    }
  },

  /**
   * Export DOCX (PRO feature) - placeholder
   */
  async exportChainDOCX(chainId) {
    
    // Verificar licença usando método padrão (consistente com resto do código)
    const isPro = window.NodusLicense && window.NodusLicense.isPro();
    if (!isPro) {
      this.showToast('🔒 DOC Export é uma feature PRO', 'warning');
      return;
    }
    
    const chain = await window.NodusChains.getChainWithIdeas(chainId);
    if (!chain) {
      this.showToast('❌ Chain não encontrada', 'error');
      return;
    }
    
    // DOCX real requer ZIP - usamos HTML com metadados Office (Word abre como DOCX)
    await this.exportChainAsWordHTML(chainId);
  },
  
  /**
   * Export HTML otimizado para Microsoft Word (compatível DOCX)
   * Word lê HTML com metadados Office e salva diretamente como .docx
   */
  async exportChainAsWordHTML(chainId) {
    const chain = await window.NodusChains.getChainWithIdeas(chainId);
    if (!chain) return;

    // Contar total de imagens para barra de progresso
    const totalImagesDoc = chain.nodes.reduce((acc, node) => {
      const src = node.idea || node;
      return acc + (src.images || []).filter(u => u && (u.startsWith('http') || u.startsWith('idb:'))).length;
    }, 0);
    const totalNodesDoc = chain.nodes.length;
    let imagesProcessedDoc = 0;

    this._showExportProgress(`Preparando export DOC... (0/${totalNodesDoc} nodes)`);

    try {
    let bodyContent = '';

    // Header
    bodyContent += `
      <div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #e2e8f0; padding-bottom:20px;">
        <h1 style="color:#667eea; font-size:32px; margin-bottom:10px;">🔗 ${this.escapeHtml(chain.name)}</h1>
        <p style="color:#64748b; font-size:14px;">
          📅 ${new Date(chain.createdAt).toLocaleDateString('pt-BR')} •
          📊 ${chain.nodes.length} nodes •
          🚀 Exportado por NODUS
        </p>
      </div>`;

    // Nodes
    for (let index = 0; index < chain.nodes.length; index++) {
      const node = chain.nodes[index];
      const idea = node.idea;
      const isStandalone = node.type === 'standalone';
      if (!idea && !isStandalone) continue;

      this._updateExportProgress(index, totalNodesDoc, `Processando node ${index + 1}/${totalNodesDoc}...`);

      const src = idea || node;
      const platform = src.platform || 'AI';
      const date = new Date(src.timestamp || Date.now()).toLocaleDateString('pt-BR');
      const title = src.title || src.text?.slice(0, 60) || 'Sem título';
      const nodeImages = (src.images || []).filter(u => u && (u.startsWith('http') || u.startsWith('idb:')));

      bodyContent += `
        <div style="margin-bottom:30px; page-break-inside:avoid;">
          <div style="border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:15px;">
            <h2 style="color:#667eea; font-size:20px; display:inline-block; margin-right:20px;">NODE ${index + 1}</h2>
            <span style="color:#64748b; font-size:12px; font-style:italic;">🤖 ${this.escapeHtml(platform)} • 📅 ${this.escapeHtml(date)}</span>
          </div>

          <h3 style="font-size:18px; margin-bottom:15px;">${this.escapeHtml(title)}</h3>`;

      // Pergunta
      const questionText = src.question || src.text;
      if (questionText) {
        bodyContent += `
          <div style="margin-bottom:15px;">
            <p style="font-weight:bold; color:#667eea; margin-bottom:8px;">❓ PERGUNTA</p>
            <div style="padding:15px; background:#f8fafc; border-left:3px solid #667eea; font-size:14px; line-height:1.7;">
              ${this._mdToHtml(questionText)}
            </div>
          </div>`;
      }

      // Resposta
      const answerText = src.answer || src.response || src.text;
      if (answerText && answerText !== questionText) {
        bodyContent += `
          <div style="margin-bottom:15px;">
            <p style="font-weight:bold; color:#667eea; margin-bottom:8px;">💬 RESPOSTA</p>
            <div style="padding:15px; background:#f8fafc; border-left:3px solid #667eea; font-size:14px; line-height:1.7;">
              ${this._mdToHtml(answerText)}
            </div>
          </div>`;
      }

      // Imagens — buscar como base64 para embeddar (URLs expiram; Word não tem sessão)
      if (nodeImages.length > 0) {
        const imgTags = [];
        for (const url of nodeImages) {
          imagesProcessedDoc++;
          this._updateExportProgress(imagesProcessedDoc, Math.max(totalImagesDoc, 1),
            `Carregando imagem ${imagesProcessedDoc}/${totalImagesDoc}...`);
          const dataUrl = await this._fetchImageAsDataUrl(url);
          if (dataUrl) {
            // Word respeita atributo width HTML mas ignora CSS max-width — usar width fixo
            imgTags.push(`<img src="${dataUrl}" width="380" style="width:380px;max-width:380px;height:auto;display:block;border-radius:4px;border:1px solid #ddd6fe;margin-bottom:4px;">`);
          }
        }
        if (imgTags.length > 0) {
          bodyContent += `
          <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e2e8f0;">
            <p style="font-weight:bold; color:#7c3aed; font-size:12px; margin-bottom:8px;">🖼️ IMAGENS (${imgTags.length}/${nodeImages.length})</p>
            <div style="display:block;">
              ${imgTags.join('<br>')}
            </div>
          </div>`;
        }
      }

      bodyContent += `</div>`;

      if (index < chain.nodes.length - 1) {
        bodyContent += `<hr style="border:none; border-bottom:1px solid #e2e8f0; margin:30px 0;">`;
      }
    }
    
    // Footer
    bodyContent += `
      <div style="margin-top:50px; text-align:center; color:#64748b; font-size:12px; font-style:italic; border-top:1px solid #e2e8f0; padding-top:20px;">
        Exportado por NODUS v4.24.2 • ${new Date().toLocaleDateString('pt-BR')}
      </div>`;
    
    // HTML completo compatível com Word
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="UTF-8">
  <title>NODUS Chain - ${this.escapeHtml(chain.name)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      line-height: 1.6;
      max-width: 210mm;
      margin: 20mm auto;
      padding: 0 20mm;
      color: #1e293b;
    }
    @page {
      margin: 2.5cm;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
    
    this._updateExportProgress(totalNodesDoc, totalNodesDoc, 'Gerando arquivo DOC...');

    // Download como .doc (HTML-Word format - mais compatível que tentar .docx)
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nodus_chain_${chain.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this._hideExportProgress();

    this.showToast(`📘 Chain exportada! (Formato: Word .doc)`, 'success');

    // ✨ TRACK: Evento de Export
    if (telemetryTracker) {
      telemetryTracker.trackExport({
        format: 'docx',
        ideas_count: chain.nodes.length,
        chain_id: chainId
      }).catch(err => console.warn('[Telemetry] Track failed:', err));
    }
    } catch (err) {
      this._hideExportProgress();
      console.error('[Chains] ❌ Erro no export DOC:', err);
      this.showToast('❌ Erro ao exportar DOC: ' + (err.message || 'Tente novamente'), 'error');
    }
  },
  
  /**
   * Gera o XML do documento (word/document.xml)
   */
  /**
   * Injeta chain na plataforma atual (texto estruturado ou arquivo MD)
   */
  async injectChain(chainId) {
    
    const chain = await window.NodusChains.getChainWithIdeas(chainId);
    if (!chain) {
      this.showToast('❌ Chain não encontrada', 'error');
      return;
    }
    
    if (chain.nodes.length === 0) {
      this.showToast('⚠️ Chain vazia', 'warning');
      return;
    }
    
    // Detectar plataforma atual
    const platform = this.detectCurrentPlatform();
    if (!platform) {
      this.showToast('❌ Plataforma não detectada', 'error');
      return;
    }
    
    // Analisar cadeia (tamanho, blocos necessários)
    const analysis = this.analyzeChain(chain, platform);
    
    // Mostrar modal de escolha
    this.showInjectModal(chain, platform, analysis);
  },

  /**
   * Detecta plataforma AI atual
   */
  detectCurrentPlatform() {
    const url = window.location.href;
    if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai')) return 'claude';
    if (url.includes('gemini.google.com')) return 'gemini';
    if (url.includes('perplexity.ai')) return 'perplexity';
    if (url.includes('copilot.microsoft.com')) return 'copilot';
    if (url.includes('x.com/i/grok')) return 'grok';
    if (url.includes('deepseek.com')) return 'deepseek';
    return null;
  },

  /**
   * Analisa chain e calcula limites/blocos
   */
  analyzeChain(chain, platform) {
    const limits = {
      chatgpt: 8000,
      claude: 6000,
      gemini: 30000,
      perplexity: 4000,
      copilot: 4000,
      grok: 4000
    };
    
    const limit = limits[platform] || 4000;
    
    // Calcular tamanho total
    let totalChars = 0;
    chain.nodes.forEach(node => {
      const idea = node.idea;
      if (!idea) return;
      
      const questionSize = (idea.question || '').length;
      const answerSize = (idea.answer || idea.text || '').length;
      totalChars += questionSize + answerSize + 200; // margem para formatação
    });
    
    const needsSplit = totalChars > limit;
    const blocks = Math.ceil(totalChars / limit);
    
    return {
      totalChars,
      limit,
      needsSplit,
      blocks,
      recommendMD: totalChars > 6000 || chain.nodes.length > 8
    };
  },

  /**
   * Mostra modal de escolha: Texto vs Arquivo MD
   */
  showInjectModal(chain, platform, analysis) {
    // Remover modal existente
    const existing = document.getElementById('nodus-inject-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'nodus-inject-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      animation: fadeIn 0.2s ease;
    `;
    
    const formatSize = (bytes) => {
      if (bytes < 1000) return bytes + ' chars';
      return (bytes / 1000).toFixed(1) + 'k chars';
    };
    
    const platformNames = {
      chatgpt: 'ChatGPT',
      claude: 'Claude',
      gemini: 'Gemini',
      perplexity: 'Perplexity',
      copilot: 'Copilot',
      grok: 'Grok'
    };
    
    modal.innerHTML = `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .inject-option {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .inject-option:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }
      </style>
      <div style="background:#1a1f29; border:2px solid #4a5568; border-radius:12px; max-width:520px; width:90%; animation:slideUp 0.3s ease;">
        <!-- Header -->
        <div style="padding:20px; border-bottom:1px solid #4a5568;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="color:#10b981; font-size:18px; font-weight:700; margin-bottom:4px;">
                🚀 Injetar Cadeia
              </div>
              <div style="color:#a0aec0; font-size:13px;">
                ${chain.nodes.length} cards • ${formatSize(analysis.totalChars)} • ${platformNames[platform] || platform}
              </div>
            </div>
            <button id="closeInjectModal" style="background:none; border:none; color:#718096; font-size:24px; cursor:pointer; padding:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
              ×
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div style="padding:24px; display:flex; flex-direction:column; gap:16px;">
          
          <!-- Opção 1: Texto Estruturado -->
          <div class="inject-option" data-method="text" style="padding:20px; background:#262b36; border:2px solid #3a4255; border-radius:10px;">
            <div style="display:flex; align-items:flex-start; gap:14px;">
              <div style="font-size:32px; line-height:1;">⚡</div>
              <div style="flex:1;">
                <div style="color:#e2e8f0; font-size:15px; font-weight:600; margin-bottom:6px;">
                  Texto Estruturado
                </div>
                <div style="color:#a0aec0; font-size:13px; line-height:1.5; margin-bottom:8px;">
                  Cola diretamente no chat ${analysis.needsSplit ? `• Quebra em ${analysis.blocks} blocos` : ''}
                  <br>Você revisa antes de enviar
                </div>
                ${analysis.needsSplit ? `
                  <div style="color:#fbbf24; font-size:12px; margin-bottom:8px;">
                    ⚡ Injeção automática: até 3 blocos. ${analysis.blocks > 3 ? `Blocos 4–${analysis.blocks} serão copiados para clipboard.` : `Todos os ${analysis.blocks} blocos serão injetados automaticamente.`}
                  </div>
                ` : ''}
                ${!analysis.recommendMD ? `
                  <div style="display:inline-block; padding:4px 10px; background:#10b98133; border:1px solid #10b981; border-radius:6px; color:#10b981; font-size:11px; font-weight:600;">
                    ✓ RECOMENDADO
                  </div>
                ` : `
                  <div style="color:#fbbf24; font-size:12px;">
                    ⚠️ Cadeia longa - considere usar MD
                  </div>
                `}
              </div>
            </div>
          </div>
          
          <!-- Opção 2: Anexo Markdown -->
          <div class="inject-option" data-method="markdown" style="padding:20px; background:#262b36; border:2px solid #3a4255; border-radius:10px;">
            <div style="display:flex; align-items:flex-start; gap:14px;">
              <div style="font-size:32px; line-height:1;">📎</div>
              <div style="flex:1;">
                <div style="color:#e2e8f0; font-size:15px; font-weight:600; margin-bottom:6px;">
                  Anexo Markdown (.md)
                </div>
                <div style="color:#a0aec0; font-size:13px; line-height:1.5; margin-bottom:8px;">
                  Gera arquivo nodus_chain.md • Upload automático
                  <br>Sem limite de tamanho • Estrutura semântica
                </div>
                ${analysis.recommendMD ? `
                  <div style="display:inline-block; padding:4px 10px; background:#10b98133; border:1px solid #10b981; border-radius:6px; color:#10b981; font-size:11px; font-weight:600;">
                    ✓ RECOMENDADO
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="padding:16px 24px; border-top:1px solid #4a5568; display:flex; justify-content:flex-end;">
          <button id="cancelInjectModal" style="padding:10px 20px; background:#2d3748; border:1px solid #4a5568; border-radius:8px; color:#e2e8f0; cursor:pointer; font-size:13px; font-weight:500;">
            ${window.NodusI18n ? window.NodusI18n.t('btn.cancel') : 'Cancel'}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('#closeInjectModal').onclick = () => modal.remove();
    modal.querySelector('#cancelInjectModal').onclick = () => modal.remove();
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
    
    // Click nas opções
    modal.querySelectorAll('.inject-option').forEach(option => {
      option.onclick = async () => {
        const method = option.dataset.method;
        modal.remove();
        
        if (method === 'text') {
          await this.injectAsText(chain, platform, analysis);
        } else if (method === 'markdown') {
          await this.injectAsMarkdown(chain, platform);
        }
      };
    });
  },

  /**
   * Injeta como texto estruturado (com quebra automática)
   */
  async injectAsText(chain, platform, analysis) {

    const MAX_AUTO_BLOCKS = 3;

    const blocks = this.splitChainIntoBlocks(chain, analysis.limit);

    if (blocks.length === 0) {
      this.showToast('❌ Erro ao processar chain', 'error');
      return;
    }

    // Formatar cada bloco
    const formattedBlocks = blocks.map((blockCards, blockIndex) =>
      this.formatTextBlock(blockCards, blockIndex, blocks.length, chain.name)
    );

    const autoBlocks = formattedBlocks.slice(0, MAX_AUTO_BLOCKS);
    const remainingBlocks = formattedBlocks.slice(MAX_AUTO_BLOCKS);

    // Injetar primeiro bloco
    const success = await this.injectTextIntoInput(autoBlocks[0], platform);
    if (!success) {
      this.showToast('❌ Erro ao injetar', 'error');
      return;
    }

    if (autoBlocks.length === 1) {
      this.showToast('✅ Cadeia injetada!', 'success');
      return;
    }

    // Sequência automática para blocos 2 e 3
    this._startSequentialInjection(autoBlocks, remainingBlocks, platform, chain.name);
  },

  /**
   * Gerencia injeção sequencial automática
   * Detecta quando a IA terminou de responder via MutationObserver
   * Máximo de MAX_AUTO_BLOCKS (3) injeções automáticas
   */
  _startSequentialInjection(autoBlocks, remainingBlocks, platform, chainName) {
    const totalBlocks = autoBlocks.length + remainingBlocks.length;
    let currentBlock = 1; // bloco 0 já foi injetado
    let observer = null;
    let timeoutId = null;
    const DETECTION_TIMEOUT_MS = 90000; // 90s timeout

    // Seletores de resposta por plataforma (mesmo padrão dos engines)
    const responseSelectors = {
      chatgpt: 'div[data-message-author-role="assistant"]',
      claude: 'div[data-is-streaming]',
      gemini: 'message-content',
      grok: 'div[data-testid="conversation-turn"]',
      copilot: 'div[data-testid="response-message-content"]',
      deepseek: 'div.ds-markdown',
      perplexity: 'div[data-testid="answer"]'
    };

    const responseSelector = responseSelectors[platform] || 'div[data-message-author-role="assistant"]';

    // Criar indicador flutuante
    const indicator = document.createElement('div');
    indicator.id = 'nodus-seq-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(59,130,246,0.4);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: #e2e8f0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      min-width: 240px;
    `;
    indicator.innerHTML = `
      <div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;animation:nodus-pulse 1.2s infinite;flex-shrink:0;"></div>
      <span id="nodus-seq-label">Sequência ativa: bloco 1/${autoBlocks.length}</span>
      <button id="nodus-seq-cancel" style="margin-left:auto;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;font-weight:600;">✕</button>
    `;

    // Injetar keyframe de pulse se ainda não existe
    if (!document.getElementById('nodus-seq-style')) {
      const style = document.createElement('style');
      style.id = 'nodus-seq-style';
      style.textContent = `@keyframes nodus-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`;
      document.head.appendChild(style);
    }

    document.body.appendChild(indicator);

    const cleanup = () => {
      if (observer) { observer.disconnect(); observer = null; }
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      const el = document.getElementById('nodus-seq-indicator');
      if (el) el.remove();
    };

    const abort = (reason) => {
      cleanup();
      // Copiar blocos restantes para clipboard como fallback
      const allRemaining = [...autoBlocks.slice(currentBlock), ...remainingBlocks];
      if (allRemaining.length > 0) {
        navigator.clipboard.writeText(allRemaining.join('\n\n---\n\n')).catch(() => {});
      }
      this.showToast(`⚠️ ${reason} Blocos restantes na clipboard.`, 'error');
    };

    document.getElementById('nodus-seq-cancel').onclick = () => {
      abort('Sequência cancelada.');
    };

    const waitForResponse = () => {
      // Contar respostas atuais antes de injetar o próximo bloco
      const countBefore = document.querySelectorAll(responseSelector).length;

      timeoutId = setTimeout(() => {
        abort('Tempo limite atingido — a IA não respondeu em 90s.');
      }, DETECTION_TIMEOUT_MS);

      observer = new MutationObserver(() => {
        const countNow = document.querySelectorAll(responseSelector).length;
        if (countNow > countBefore) {
          // Nova resposta detectada — aguardar estabilização
          observer.disconnect();
          clearTimeout(timeoutId);

          setTimeout(async () => {
            if (currentBlock >= autoBlocks.length) {
              // Todos os blocos automáticos injetados
              cleanup();
              if (remainingBlocks.length > 0) {
                await navigator.clipboard.writeText(remainingBlocks.join('\n\n---\n\n')).catch(() => {});
                this.showToast(`✅ ${autoBlocks.length} blocos injetados. ${remainingBlocks.length} restante(s) na clipboard.`, 'success');
              } else {
                this.showToast(`✅ Cadeia completa injetada em ${autoBlocks.length} blocos!`, 'success');
              }
              return;
            }

            // Injetar próximo bloco
            const label = document.getElementById('nodus-seq-label');
            if (label) label.textContent = `Sequência ativa: bloco ${currentBlock + 1}/${autoBlocks.length}`;

            const ok = await this.injectTextIntoInput(autoBlocks[currentBlock], platform);
            if (!ok) {
              abort('Falha ao injetar bloco ' + (currentBlock + 1) + '.');
              return;
            }

            currentBlock++;

            if (currentBlock < autoBlocks.length) {
              // Ainda há mais blocos automáticos — aguardar próxima resposta
              waitForResponse();
            } else {
              // Último bloco automático foi injetado — aguardar resposta final
              waitForResponse();
            }
          }, 1500); // buffer para render completo da resposta
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    };

    waitForResponse();
  },

  /**
   * Quebra chain em blocos respeitando limite de chars
   */
  splitChainIntoBlocks(chain, maxChars) {
    const blocks = [];
    let currentBlock = [];
    let currentSize = 0;
    
    chain.nodes.forEach(node => {
      const idea = node.idea;
      if (!idea) return;
      
      const cardSize = (idea.question || '').length + (idea.answer || idea.text || '').length + 200;
      
      if (currentSize + cardSize > maxChars && currentBlock.length > 0) {
        // Fechar bloco atual
        blocks.push(currentBlock);
        currentBlock = [node];
        currentSize = cardSize;
      } else {
        currentBlock.push(node);
        currentSize += cardSize;
      }
    });
    
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }
    
    return blocks;
  },

  /**
   * Formata bloco de texto estruturado
   */
  formatTextBlock(nodes, blockIndex, totalBlocks, chainName) {
    let text = '';
    
    if (blockIndex === 0) {
      text += `📋 CONTEXTO: Cadeia "${chainName}" do NODUS\n`;
      if (totalBlocks > 1) {
        text += `Total: ${totalBlocks} blocos\n`;
      }
      text += `\n`;
    }
    
    if (totalBlocks > 1) {
      text += `─── BLOCO ${blockIndex + 1}/${totalBlocks} ───\n\n`;
    }
    
    nodes.forEach((node, i) => {
      const idea = node.idea;
      if (!idea) return;
      
      text += `💡 IDEIA ${blockIndex === 0 ? i + 1 : ''}:\n`;
      text += `Título: ${idea.title || 'Sem título'}\n\n`;
      
      if (node.display === 'both' || node.display === 'question') {
        text += `❓ PERGUNTA:\n${idea.question || 'Sem pergunta'}\n\n`;
      }
      
      if (node.display === 'both' || node.display === 'answer') {
        text += `💬 RESPOSTA:\n${idea.answer || idea.text || 'Sem resposta'}\n`;
      }
      
      text += `\n${'─'.repeat(40)}\n\n`;
    });
    
    if (blockIndex < totalBlocks - 1) {
      text += '⏭️ Aguardando próximo bloco...\n';
    } else {
      text += '✅ Fim da injeção.\n';
    }
    
    return text;
  },

  /**
   * Injeta texto no input da plataforma
   */
  async injectTextIntoInput(text, platform) {
    try {
      const selectors = {
        chatgpt: '#prompt-textarea',
        claude: 'div[contenteditable="true"][data-testid="chat-input"], div.ProseMirror[contenteditable="true"]',
        gemini: 'rich-textarea[placeholder*="Enter"], div[contenteditable="true"]',
        perplexity: 'textarea[placeholder*="Ask"], div[contenteditable="true"]',
        copilot: 'textarea.textarea, div[contenteditable="true"]',
        grok: 'div[contenteditable="true"][data-testid="tweetTextarea"]'
      };
      
      const selector = selectors[platform];
      if (!selector) return false;
      
      const input = document.querySelector(selector);
      if (!input) {
        console.error('[Chains] Input não encontrado:', selector);
        return false;
      }
      
      input.focus();
      
      if (input.isContentEditable) {
        // ContentEditable (Claude, alguns outros)
        input.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = text;
        input.appendChild(p);
        
        // Posicionar cursor no final
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(p);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Textarea (ChatGPT, etc)
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      return true;
    } catch (err) {
      console.error('[Chains] Erro ao injetar texto:', err);
      return false;
    }
  },

  /**
   * Injeta como arquivo Markdown com diagrama Mermaid
   */
  async injectAsMarkdown(chain, platform) {

    const markdown = this.generateMarkdownWithMermaid(chain);
    const filename = `nodus_chain_${chain.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.md`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const file = new File([blob], filename, { type: 'text/markdown' });

    // Tenta upload automático primeiro
    const success = await this.uploadFileToplatform(file, platform);
    if (success) {
      this.showToast('✅ Arquivo MD anexado!', 'success');
      return;
    }

    // Fallback: painel flutuante para arrastar ao chat
    this._showDraggableFilePanel(file, blob);
  },

  /**
   * Mostra painel flutuante com opções para enviar arquivo ao chat
   */
  _showDraggableFilePanel(file, blob) {
    const existing = document.getElementById('nodus-drag-file-panel');
    if (existing) existing.remove();

    const sizeStr = blob.size < 1024 ? blob.size + ' B'
      : blob.size < 1048576 ? (blob.size / 1024).toFixed(1) + ' KB'
      : (blob.size / 1048576).toFixed(1) + ' MB';

    const panel = document.createElement('div');
    panel.id = 'nodus-drag-file-panel';
    panel.style.cssText = `
      position:fixed; bottom:90px; right:20px; z-index:2147483646;
      background:#1a1f29; border:2px solid #a78bfa;
      border-radius:12px; padding:14px 16px; width:280px;
      box-shadow:0 8px 32px rgba(0,0,0,0.6);
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      transform:translateY(20px); opacity:0; transition:transform 0.2s ease-out,opacity 0.2s ease-out;
    `;
    panel.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
        <span style="color:#a78bfa; font-size:12px; font-weight:700;">📄 ${this.escapeHtml(file.name)}</span>
        <button id="nodus-drag-panel-close" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:16px;line-height:1;padding:0;">✕</button>
      </div>
      <div style="color:#6b7280; font-size:11px; margin-bottom:12px;">${sizeStr} · Markdown</div>

      <button id="nodus-panel-btn-inject" style="width:100%; padding:10px; margin-bottom:8px;
        background:#10b981; border:none; border-radius:8px; color:#fff;
        font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
        ⚡ Injetar no chat
      </button>
      <button id="nodus-panel-btn-copy" style="width:100%; padding:10px; margin-bottom:8px;
        background:#2d3748; border:1px solid #4a5568; border-radius:8px; color:#e2e8f0;
        font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
        📋 Copiar texto
      </button>
      <button id="nodus-panel-btn-download" style="width:100%; padding:10px;
        background:#2d3748; border:1px solid #4a5568; border-radius:8px; color:#a0aec0;
        font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
        ⬇️ Baixar e arrastar da barra de downloads
      </button>
    `;

    document.body.appendChild(panel);
    requestAnimationFrame(() => {
      panel.style.transform = 'translateY(0)';
      panel.style.opacity = '1';
    });

    const close = () => { panel.remove(); };

    document.getElementById('nodus-drag-panel-close').onclick = close;

    // ⚡ Tentar injetar via file input
    document.getElementById('nodus-panel-btn-inject').onclick = async () => {
      const btn = document.getElementById('nodus-panel-btn-inject');
      btn.textContent = '⏳ Procurando input...';
      btn.disabled = true;
      const platform = this.detectCurrentPlatform() || 'chatgpt';
      const success = await this.uploadFileToplatform(file, platform);
      if (success) {
        this.showToast('✅ Arquivo injetado!', 'success');
        close();
      } else {
        btn.textContent = '❌ Não encontrado — tente Copiar texto';
        btn.style.background = '#7f1d1d';
        setTimeout(() => {
          btn.textContent = '⚡ Injetar no chat';
          btn.style.background = '#10b981';
          btn.disabled = false;
        }, 3000);
      }
    };

    // 📋 Copiar texto markdown para clipboard
    document.getElementById('nodus-panel-btn-copy').onclick = async () => {
      try {
        const text = await blob.text();
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById('nodus-panel-btn-copy');
        btn.textContent = '✅ Copiado! Cole no chat (Ctrl+V)';
        btn.style.background = '#10b98133';
        btn.style.borderColor = '#10b981';
        btn.style.color = '#10b981';
      } catch (err) {
        this.showToast('❌ Erro ao copiar', 'error');
      }
    };

    // ⬇️ Download
    document.getElementById('nodus-panel-btn-download').onclick = () => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      const btn = document.getElementById('nodus-panel-btn-download');
      btn.textContent = '✅ Baixado! Arraste da barra de downloads';
      btn.style.color = '#10b981';
    };

    // Auto-close após 90s
    setTimeout(() => {
      if (document.getElementById('nodus-drag-file-panel')) panel.remove();
    }, 90000);
  },

  /**
   * Converte headings markdown no conteúdo em negrito para não quebrar a hierarquia do documento.
   * Ex: "# Título" → "**Título**", "## Sub" → "**Sub**"
   */
  _normalizeContentHeadings(text) {
    if (!text) return text;
    return text.replace(/^#{1,6}\s+(.+)$/gm, (_, content) => {
      // Remove ** existentes para evitar duplo-bold: **🎯 **texto**** → **🎯 texto**
      const cleaned = content.trim().replace(/\*\*/g, '');
      return `**${cleaned}**`;
    });
  },

  /**
   * Gera Markdown estruturado com diagrama Mermaid (ou índice para cadeias grandes).
   * Usado tanto pelo export (exportChainMD) quanto pelo inject-as-file (injectAsMarkdown).
   */
  generateMarkdownWithMermaid(chain) {
    const MERMAID_MAX_NODES = 20; // acima disso usa índice numerado em vez de diagrama
    const now = new Date();
    const version = (typeof document !== 'undefined' && document.documentElement.dataset.nodusVersion)
      || 'NODUS';

    let md = `# 🔗 ${chain.name}\n\n`;

    md += `> **Criada em:** ${new Date(chain.created_at || Date.now()).toLocaleDateString('pt-BR')}  \n`;
    md += `> **Exportado em:** ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}  \n`;
    md += `> **Nodes:** ${chain.nodes.length}  \n`;
    md += `> **Exportado por:** NODUS v${version}\n\n`;

    // Notas da chain
    if (chain.notes && chain.notes.trim()) {
      md += `---\n\n`;
      md += `## 📝 Notas da Cadeia\n\n`;
      md += `${chain.notes.trim()}\n\n`;
    }

    md += `---\n\n`;

    // Estrutura: Mermaid para cadeias pequenas, índice numerado para cadeias grandes
    const validNodes = chain.nodes.filter(n => n.idea || n.type === 'standalone');
    md += `## 🗺️ Índice da Cadeia\n\n`;

    if (validNodes.length <= MERMAID_MAX_NODES) {
      // Diagrama Mermaid (só para cadeias pequenas)
      md += `\`\`\`mermaid\n`;
      md += `graph TD\n`;
      validNodes.forEach((node, i) => {
        const src = node.idea || node;
        const title = (src.title || (node.type === 'standalone' ? 'Full Chat' : 'Sem título'))
          .substring(0, 30).replace(/["\n]/g, '');
        md += `    Node_${i + 1}["${i + 1}. ${title}"]\n`;
      });
      for (let i = 0; i < validNodes.length - 1; i++) {
        md += `    Node_${i + 1} --> Node_${i + 2}\n`;
      }
      const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
      validNodes.forEach((node, i) => {
        md += `    style Node_${i + 1} fill:${colors[i % colors.length]}\n`;
      });
      md += `\`\`\`\n\n`;
    } else {
      // Índice numerado simples (para cadeias grandes)
      validNodes.forEach((node, i) => {
        const src = node.idea || node;
        const title = src.title || (node.type === 'standalone' ? 'Full Chat' : 'Sem título');
        const platform = src.platform ? ` *(${src.platform})*` : '';
        md += `${i + 1}. ${title}${platform}\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;

    // Detalhes dos nodes
    md += `## 💡 Detalhes dos Nodes\n\n`;

    chain.nodes.forEach((node, i) => {
      const isStandalone = node.type === 'standalone';
      const idea = node.idea;
      if (!idea && !isStandalone) return;

      const src = idea || node;

      if (isStandalone) {
        md += `### Node ${i + 1}: Full Chat — ${src.platform || 'Unknown'}\n\n`;
        md += `**📅 Data:** ${new Date(src.timestamp || Date.now()).toLocaleDateString('pt-BR')}  \n\n`;
        if (src.text) {
          md += `${this._normalizeContentHeadings(src.text)}\n\n`;
        }
      } else {
        md += `### Node ${i + 1}: ${idea.title || 'Sem título'}\n\n`;
        md += `**🤖 Plataforma:** ${idea.platform || 'Unknown'}  \n`;
        md += `**📅 Data:** ${new Date(idea.timestamp || Date.now()).toLocaleDateString('pt-BR')}  \n`;
        if (idea.tags && idea.tags.length > 0) {
          md += `**🏷️ Tags:** ${idea.tags.map(t => `\`${t}\``).join(' ')}  \n`;
        }
        if (idea.source) {
          md += `**🔗 Fonte:** ${idea.source}  \n`;
        }
        md += `\n`;

        if (node.display === 'both' || node.display === 'question') {
          md += `#### ❓ Pergunta\n\n`;
          md += `${this._normalizeContentHeadings(idea.question || 'Sem pergunta')}\n\n`;
        }

        if (node.display === 'both' || node.display === 'answer') {
          md += `#### 💬 Resposta\n\n`;
          md += `${this._normalizeContentHeadings(idea.answer || idea.text || 'Sem resposta')}\n\n`;
        }

        const imgs = (idea.images || node.images || []).filter(u => u && u.startsWith('http'));
        if (imgs.length > 0) {
          md += `#### 🖼️ Imagens (${imgs.length})\n\n`;
          imgs.forEach((url, idx) => {
            md += `![Imagem ${idx + 1}](${url})\n\n`;
          });
        }
      }

      md += `---\n\n`;
    });

    md += `*Exportado por NODUS v${version}*\n`;

    return md;
  },

  /**
   * Upload automático de arquivo para plataforma
   */
  async uploadFileToplatform(file, platform) {
    try {
      // Tentar encontrar file input diretamente
      let input = document.querySelector('input[type="file"]');

      // Para ChatGPT: tentar clicar no botão de anexo para revelar file input
      if (!input && platform === 'chatgpt') {
        const attachBtn = document.querySelector(
          'button[aria-label*="ttach"], button[aria-label*="nexo"], ' +
          'button[data-testid*="attach"], button[aria-label*="ile"], ' +
          'button[aria-label*="Upload"]'
        );
        if (attachBtn) {
          attachBtn.click();
          await new Promise(r => setTimeout(r, 400));
          input = document.querySelector('input[type="file"]');
        }
      }

      if (!input) {
        console.warn('[Chains] File input não encontrado');
        return false;
      }

      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));

      return true;
    } catch (err) {
      console.error('[Chains] Erro ao fazer upload:', err);
      return false;
    }
  },

  /**
   * Deleta chain com confirmação inline
   */
  async deleteChain(chainId) {
    
    const chains = await window.NodusChains.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    
    if (!chain) {
      this.showToast('❌ Chain não encontrada', 'error');
      return;
    }
    
    // Mostrar confirmação inline
    this.showDeleteConfirmation(chainId, chain.name);
  },

  /**
   * Mostra confirmação inline para delete
   */
  showDeleteConfirmation(chainId, chainName) {
    // Remover confirmação existente
    const existing = document.getElementById('nodus-delete-confirm');
    if (existing) existing.remove();
    
    const confirm = document.createElement('div');
    confirm.id = 'nodus-delete-confirm';
    confirm.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 16px 20px;
      background: #1a1f29;
      border: 2px solid #f87171;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      z-index: 999999;
      max-width: 320px;
    `;
    
    confirm.innerHTML = `
      <div style="color:#f87171; font-size:14px; font-weight:600; margin-bottom:8px;">
        🗑️ Deletar chain?
      </div>
      <div style="color:#a0aec0; font-size:13px; margin-bottom:12px;">
        "${chainName}" será removida permanentemente.
      </div>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button id="cancelDeleteChain" style="padding:8px 16px; background:#2d3748; border:1px solid #4a5568; border-radius:6px; color:#e2e8f0; cursor:pointer; font-size:12px; font-weight:500;">
          ${window.NodusI18n ? window.NodusI18n.t('btn.cancel') : 'Cancel'}
        </button>
        <button id="confirmDeleteChain" data-chain-id="${chainId}" style="padding:8px 16px; background:#dc2626; border:none; border-radius:6px; color:#fff; cursor:pointer; font-size:12px; font-weight:600;">
          ${window.NodusI18n ? window.NodusI18n.t('btn.delete') : 'Delete'}
        </button>
      </div>
    `;
    
    document.body.appendChild(confirm);
    
    // Focus no botão cancelar
    document.getElementById('cancelDeleteChain').focus();
  },

  /**
   * Executa delete após confirmação
   */
  async executeDeleteChain(chainId) {
    const chains = await window.NodusChains.getAllChains();
    const chain = chains.find(c => c.id === chainId);
    const chainName = chain ? chain.name : 'Chain';
    const nodeCount = chain ? (chain.nodes || []).length : 0;
    
    await window.NodusChains.deleteChain(chainId);
    
    // ✨ REGISTRAR DELETE NO TELEMETRIA
    try {
      console.log('[Chains] 📊 Registrando delete na telemetria...', {
        chainId,
        chainName,
        nodeCount,
        platform: chain.platform
      });
      
      // Enviar mensagem para background registrar telemetria
      const response = await chrome.runtime.sendMessage({
        action: 'trackChainDelete',
        data: {
          chainId: chainId,
          chainName: chainName,
          nodeCount: nodeCount,
          platform: chain.platform || 'unknown'
        }
      });
      
      if (response && response.ok) {
      } else {
        console.warn('[Chains] ⚠️ Telemetria: resposta inválida', response);
      }
    } catch (telemetryError) {
      console.error('[Chains] ❌ Telemetria falhou:', telemetryError);
    }
    
    // Ajustar índice se necessário
    const remainingChains = await window.NodusChains.getAllChains();
    if (this.currentChainIndex >= remainingChains.length) {
      this.currentChainIndex = Math.max(0, remainingChains.length - 1);
    }
    
    // Remover confirmação
    const confirmEl = document.getElementById('nodus-delete-confirm');
    if (confirmEl) confirmEl.remove();
    
    this.showToast(`🗑️ Chain "${chainName}" deletada!`, 'success');
    await this.render();
  },

  /**
   * Mostra confirmação inline para remover node
   */
  showRemoveNodeConfirmation(chainId, nodeId) {
    
    // Remover confirmação existente
    const existing = document.getElementById('nodus-remove-node-confirm');
    if (existing) existing.remove();
    
    const confirm = document.createElement('div');
    confirm.id = 'nodus-remove-node-confirm';
    confirm.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 16px 20px;
      background: #1a1f29;
      border: 2px solid #f97316;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      z-index: 999999;
      max-width: 320px;
    `;
    
    confirm.innerHTML = `
      <div style="color:#f97316; font-size:14px; font-weight:600; margin-bottom:8px;">
        ❌ Remover nó?
      </div>
      <div style="color:#a0aec0; font-size:13px; margin-bottom:12px;">
        Este nó será removido da chain permanentemente.
      </div>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button id="cancelRemoveNode" style="padding:8px 16px; background:#2d3748; border:1px solid #4a5568; border-radius:6px; color:#e2e8f0; cursor:pointer; font-size:12px; font-weight:500;">
          ${window.NodusI18n ? window.NodusI18n.t('btn.cancel') : 'Cancel'}
        </button>
        <button id="confirmRemoveNode" data-chain-id="${chainId}" data-node-id="${nodeId}" style="padding:8px 16px; background:#f97316; border:none; border-radius:6px; color:#fff; cursor:pointer; font-size:12px; font-weight:600;">
          ${window.NodusI18n ? window.NodusI18n.t('btn.delete') : 'Delete'}
        </button>
      </div>
    `;
    
    document.body.appendChild(confirm);
    
    // Focus no botão cancelar
    document.getElementById('cancelRemoveNode').focus();
  },

  /**
   * Executa remoção do node após confirmação
   */
  async executeRemoveNode(chainId, nodeId) {
    
    // Remover confirmação IMEDIATAMENTE
    const confirmEl = document.getElementById('nodus-remove-node-confirm');
    if (confirmEl) {
      confirmEl.remove();
    }
    
    try {
      // Buscar chain atual
      const chains = await window.NodusChains.getAllChains();
      const chain = chains.find(c => c.id === chainId);
      
      if (!chain) {
        console.error('[RemoveNode] ❌ Chain não encontrada!');
        this.showToast('❌ Chain não encontrada', 'error');
        return;
      }
      
      
      // DEBUG: Mostrar estrutura dos nodes
      chain.nodes.forEach((node, idx) => {
        console.log(`[RemoveNode]   Node ${idx}:`, {
          id: node.id,
          idea_id: node.idea_id,
          order: node.order,
          display: node.display
        });
      });
      
      // IMPORTANTE: O nodeId QUE RECEBEMOS É O idea_id!
      // Procurar pelo idea_id, NÃO pelo node.id
      // ⚠️ FALLBACK para ideaId (sem underscore) em chains antigas!
      let nodeIndex = chain.nodes.findIndex(n => n.idea_id === nodeId);
      
      // FALLBACK: Se não encontrou, tentar ideaId (sem underscore) - chains antigas
      if (nodeIndex === -1) {
        nodeIndex = chain.nodes.findIndex(n => n.ideaId === nodeId);
      }
      
      if (nodeIndex === -1) {
        console.error('[RemoveNode] ❌ Node não encontrado!');
        console.error('[RemoveNode] nodeId procurado:', nodeId);
        console.error('[RemoveNode] IDs disponíveis (idea_id):',  chain.nodes.map(n => n.idea_id));
        this.showToast('❌ Nó não encontrado', 'error');
        return;
      }
      
      const nodeToRemove = chain.nodes[nodeIndex];
      console.log('[RemoveNode] Node a ser removido:', {
        id: nodeToRemove.id,
        idea_id: nodeToRemove.idea_id,
        order: nodeToRemove.order
      });
      
      // Chamar API do chains.js para remover
      
      await window.NodusChains.removeNodeFromChain(chainId, nodeId);
      
      
      // Verificar se realmente foi removido
      const chainsAfter = await window.NodusChains.getAllChains();
      const chainAfter = chainsAfter.find(c => c.id === chainId);
      
      if (chainAfter.nodes.length === chain.nodes.length) {
        console.error('[RemoveNode] ⚠️ ALERTA: Quantidade de nodes NÃO mudou!');
        console.error('[RemoveNode] Parece que o node não foi removido de verdade!');
      }
      
      this.showToast('✅ Nó removido!', 'success');

      // Salvar posição de scroll antes do re-render para não perder a posição na cadeia
      const nodesGridEl = document.getElementById('nodesGrid');
      this._preserveScrollTop = nodesGridEl ? nodesGridEl.scrollTop : 0;

      // Re-render
      await this.render();

      // Restaurar posição de scroll (caso o render não tenha conseguido preservar via flag)
      if (this._preserveScrollTop) {
        const restoredGrid = document.getElementById('nodesGrid');
        if (restoredGrid) restoredGrid.scrollTop = this._preserveScrollTop;
      }
      this._preserveScrollTop = null;
      
      
    } catch (error) {
      console.error('[RemoveNode] ❌ ERRO CRÍTICO:', error);
      console.error('[RemoveNode] Stack:', error.stack);
      this.showToast('❌ Erro ao remover', 'error');
    }
  },

  /**
   * Mostra toast de feedback
   */
  showToast(message, type = 'success') {
    // Remover toast existente
    const existing = document.getElementById('nodus-chain-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.id = 'nodus-chain-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 999999;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animar entrada
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    
    // Remover após 2.5s
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  },

  /**
   * Toggle do menu Actions
   */
  toggleActionsMenu(btn) {
    const menu = btn.nextElementSibling;
    const wasOpen = menu.classList.contains('show');
    
    // Fechar todos os menus
    document.querySelectorAll('.chain-actions-menu').forEach(m => m.classList.remove('show'));
    
    // Toggle do atual
    if (!wasOpen) {
      menu.classList.add('show');
    }
  },

  /**
   * Capturar chat completo da aba atual
   */
  async handleFullChatCapture() {
    try {
      
      // Detectar plataforma pela URL atual
      const url = window.location.href;
      let platform = null;
      if (url.includes('chatgpt.com') || url.includes('chat.openai')) platform = 'ChatGPT';
      else if (url.includes('claude.ai')) platform = 'Claude';
      else if (url.includes('gemini.google.com')) platform = 'Gemini';
      else if (url.includes('perplexity.ai')) platform = 'Perplexity';
      else if (url.includes('copilot.microsoft.com')) platform = 'Copilot';
      else if (url.includes('grok')) platform = 'Grok';
      else if (url.includes('deepseek.com')) platform = 'DeepSeek';
      
      if (!platform) {
        this.showToast(window.NodusI18n?.t('toast.platformnotsupported') || 'Platform not supported', 'error');
        return;
      }
      
      
      // Verificar se engine está carregado
      if (!window.NodusEngine || !window.NodusEngine.captureFullChat) {
        console.error('[FullChat] Engine not loaded or captureFullChat not available');
        this.showToast('Engine not loaded', 'error');
        return;
      }
      
      // ✨ GATE DE CONTROLE - Verificar limite Full Chat Capture
      const canCapture = await this.checkFullChatLimit();
      if (!canCapture) {
        return; // Gate já mostrou paywall se necessário
      }
      
      // ✨ ESCUTAR EVENTO CUSTOMIZADO (modal do Copilot)
      const handleCaptureEvent = async (event) => {
        window.removeEventListener('nodus-fullchat-captured', handleCaptureEvent);
        
        const captureResult = event.detail;
        
        // Incrementar contador se captura bem-sucedida
        if (captureResult.ok) {
          await this.incrementFullChatCounter();
        }
        
        await this.processFullChatResult(captureResult, platform);
      };
      
      window.addEventListener('nodus-fullchat-captured', handleCaptureEvent);
      
      // Mostrar feedback visual
      if (window.NODUS_UI) { window.NODUS_UI.showToast('📚 Capturando conversa...', 'info'); }

      // Yield ao main thread antes de captura pesada
      await new Promise(r => setTimeout(r, 100));

      // Executar captura LOCALMENTE (mesma página)
      const captureResult = await window.NodusEngine.captureFullChat(platform);

      // Yield novamente apos captura
      await new Promise(r => setTimeout(r, 50));
      
      
      // Se pending (modal aberto), aguardar evento
      if (captureResult.pending) {
        return; // Evento vai lidar
      }
      
      // Se retornou direto (outras plataformas), incrementar contador se sucesso
      if (captureResult.ok) {
        await this.incrementFullChatCounter();
      }
      
      // Se retornou direto (outras plataformas), processar
      await this.processFullChatResult(captureResult, platform);
      
    } catch (error) {
      console.error('[FullChat] Error:', error);
      this.showToast(window.NodusI18n?.t('toast.fullchaterror') || 'Error capturing', 'error');
    }
  },
  
  /**
   * Processar resultado da captura (compartilhado entre modal e captura direta)
   */
  async processFullChatResult(captureResult, platform) {
    // Log detalhado do resultado
    
    if (!captureResult.ok || !captureResult.nodes || captureResult.nodes.length === 0) {
      console.error('[FullChat] ❌ FALHA NA CAPTURA');
      console.error('[FullChat] Detalhes:', {
        ok: captureResult.ok,
        error: captureResult.error,
        nodesLength: captureResult.nodes?.length || 0
      });
      
      // Mostrar erro específico se disponível
      const errorMsg = captureResult.error || 
                      window.NodusI18n?.t('toast.nochatstocapture') || 
                      'No messages found';
      
      this.showToast(`❌ ${errorMsg}`, 'error');
      return;
    }
    
    
    // ARMAZENAR nodes temporariamente
    this.pendingFullChatNodes = captureResult.nodes;
    this.pendingFullChatPlatform = platform;
    
    // GERAR NOME AUTOMÁTICO com contador
    const allChains = await window.NodusChains.getAllChains();
    
    // Contar quantas chains dessa plataforma já existem
    const platformChains = allChains.filter(c => 
      c.name?.toLowerCase().startsWith(platform.toLowerCase()) || 
      c.platform === platform
    );
    const nextNumber = platformChains.length + 1;
    
    const autoName = `${platform} ${nextNumber}`;
    
    // MOSTRAR INPUT INLINE para nome da chain
    this.showingChainInput = true;
    this.isFullChatMode = true; // Flag especial
    this.fullChatSuggestedName = autoName;
    
    await this.render();
    
    // Focus no input INLINE (ID correto!)
    setTimeout(() => {
      const input = document.getElementById('chainNameInputInline');
      if (input) {
        input.value = this.fullChatSuggestedName;
        input.focus();
        input.select();
      }
    }, 100);
  },
  
  /**
   * Processar criação da chain após user digitar nome
   */
  async processFullChatCreation(chainName) {
    try {
      
      if (!this.pendingFullChatNodes || this.pendingFullChatNodes.length === 0) {
        console.error('[FullChat] ERRO: Nenhum node pendente!');
        this.showToast('No nodes to insert', 'error');
        return;
      }
      
      const nodes = this.pendingFullChatNodes;
      const platform = this.pendingFullChatPlatform;
      const selectedColor = this.selectedChainColor; // Pegar cor selecionada

      // ── SALVAR IMAGENS NO IndexedDB ANTES DE ENVIAR AO BACKGROUND ──
      // O content script tem cookies de sessão; o background não.
      // Para cada imagem de cada node, fazemos fetch aqui e guardamos
      // no IndexedDB com chave "nodeimg_<ts>_<n>". A URL original é
      // substituída pela referência "idb:nodeimg_<ts>_<n>".
      if (window.NodusAttachmentsDB) {
        let imgCounter = 0;
        for (const node of nodes) {
          if (!node.images || node.images.length === 0) continue;
          const resolvedImages = [];
          for (const url of node.images) {
            if (!url || !url.startsWith('http')) { resolvedImages.push(url); continue; }
            try {
              // Usar background para buscar (bypass CORS — host_permissions)
              const result = await chrome.runtime.sendMessage({ action: 'fetchImageAsBase64', url });
              if (!result || !result.ok) throw new Error(result?.error || 'fetch failed');
              // Decodificar base64 → Uint8Array
              const binary = atob(result.base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const idbKey = `nodeimg_${Date.now()}_${imgCounter++}`;
              await window.NodusAttachmentsDB.putFile(idbKey, {
                fileData: bytes,
                fileType: result.mimeType || 'image/jpeg',
                fileName: idbKey,
                originalUrl: url
              });
              resolvedImages.push('idb:' + idbKey);
            } catch (err) {
              console.warn('[FullChat] ⚠️ Não foi possível salvar imagem:', url, err.message);
              resolvedImages.push(url); // manter URL como fallback
            }
          }
          node.images = resolvedImages;
        }
      }

      console.log('[FullChat] Enviando para background:', {
        nodes: nodes.length,
        chainTitle: chainName,
        platform: platform,
        selectedColor: selectedColor
      });

      // Criar chain com nodes (background salva como ideas em fila virtual)
      const createResult = await chrome.runtime.sendMessage({
        action: 'captureFullChat',
        data: {
          nodes: nodes,
          chainTitle: chainName,
          platform: platform,
          selectedColor: selectedColor, // Enviar cor selecionada
          sourceUrl: window.location.href, // URL da página atual
          includeImages: this.fullChatIncludeImages || false // Flag: guardar imagens na chain
        }
      });
      
      
      if (!createResult.ok) {
        console.error('[FullChat] ERRO ao criar chain:', createResult);
        
        // Tratamento especial para duplicata
        if (createResult.error === 'duplicate') {
          const msg = window.NodusI18n 
            ? `Chat já capturado: "${createResult.existingChainName}"`
            : `Chat already captured: "${createResult.existingChainName}"`;
          this.showToast(msg, 'warning');
          
          // Navegar para a chain existente
          const chains = await window.NodusChains.getAllChains();
          const existingIndex = chains.findIndex(c => c.id === createResult.existingChainId);
          if (existingIndex !== -1) {
            this.currentChainIndex = existingIndex;
            await this.render();
          }
        } else {
          this.showToast("Error: " + (createResult.message || createResult.error || "Unknown"), "error");
        }
        return;
      }
      
      const chainId = createResult.chain.id;
      const ideasCount = createResult.ideasCount || nodes.length;
      
      // ESTRATÉGIA DE RETRY: Buscar diretamente do storage até encontrar
      
      let chains = null;
      let newChainIndex = -1;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        await new Promise(resolve => setTimeout(resolve, attempt * 300)); // 300ms, 600ms, 900ms
        
        // Buscar DIRETAMENTE do storage (bypass cache)
        const storageResult = await chrome.storage.local.get(['nodus_chains']);
        chains = storageResult.nodus_chains || [];
        
        
        // Procurar a chain
        newChainIndex = chains.findIndex(c => c.id === chainId);
        
        if (newChainIndex !== -1) {
          break;
        }
        
      }
      
      if (newChainIndex === -1) {
        console.error('[FullChat] ❌ ERRO CRÍTICO: Chain não encontrada após 3 tentativas!');
        console.error('[FullChat] IDs disponíveis:', chains.map(c => c.id));
        console.error('[FullChat] ID procurado:', chainId);
        this.showToast('⚠️ Chain criada mas não sincronizada. Recarregue a página.', 'error');
        // Usar última chain como fallback
        this.currentChainIndex = Math.max(0, chains.length - 1);
      } else {
        this.currentChainIndex = newChainIndex;
      }
      
      
      // Limpar flags
      this.pendingFullChatNodes = null;
      this.pendingFullChatPlatform = null;
      this.isFullChatMode = false;
      this.showingChainInput = false;
      this.fullChatIncludeImages = false;
      
      // Recarregar ideas (CRÍTICO para incluir ideas virtuais)
      await this.loadAllIdeas();
      
      // Toast final
      this.showToast(`✅ ${ideasCount} mensagens capturadas! (Fila Virtual)`, 'success');
      
      console.log('[FullChat] Estado antes render:', {
        currentChainIndex: this.currentChainIndex,
        totalChains: chains.length,
        totalIdeas: this.allIdeas.length,
        showingChainInput: this.showingChainInput,
        sidebarOpen: this.sidebarOpen
      });
      
      // FLAG: Indicar que acabou de capturar (para disparar animação)
      this.justCapturedFullChat = true;
      
      // IMPORTANTE: Passar chains como parâmetro para evitar race condition
      await this.render(chains);
      
      
    } catch (error) {
      console.error('[FullChat] ERRO CRÍTICO:', error);
      console.error('[FullChat] Stack:', error.stack);
      this.showToast('Error: ' + error.message, 'error');
    }
  },

  /**
   * Promover idea virtual para fila real usando NodusPanelNQ
   */
  async showPromoteModal(ideaId) {
    
    // Buscar idea em todas as filas (reais + virtuais)
    const allQueues = [
      'ideas_queue_quick',
      'ideas_queue_default', 
      'ideas_queue_q1',
      'ideas_queue_custom2',
      'ideas_queue_custom3',
      'ideas_queue_custom4',
      'fullchat_chatgpt',
      'fullchat_claude',
      'fullchat_gemini',
      'fullchat_perplexity',
      'fullchat_copilot',
      'fullchat_grok',
      'fullchat_deepseek'
    ];
    
    const storageData = await chrome.storage.local.get(allQueues);
    
    let foundIdea = null;
    let foundQueue = null;
    
    // Procurar idea
    for (const queueKey of allQueues) {
      const ideas = storageData[queueKey] || [];
      const idea = ideas.find(i => i.id === ideaId);
      if (idea) {
        foundIdea = idea;
        foundQueue = queueKey;
        break;
      }
    }
    
    if (!foundIdea) {
      console.error('[Promote] ❌ Idea não encontrada:', ideaId);
      this.showToast('❌ Idea não encontrada', 'error');
      return;
    }
    
    console.log('[Promote] Dados:', {
      title: foundIdea.title,
      platform: foundIdea.platform,
      tags: foundIdea.tags,
      question: foundIdea.question?.substring(0, 50),
      answer: foundIdea.answer?.substring(0, 50)
    });
    
    // Preparar dados para o NodusPanelNQ
    const ideaData = {
      title: foundIdea.title || 'Sem título',
      question: foundIdea.question || '',
      text: foundIdea.answer || foundIdea.text || '', // NodusPanelNQ usa "text"
      answer: foundIdea.answer || foundIdea.text || '', // Algumas partes usam "answer"
      platform: foundIdea.platform || 'Unknown',
      tags: foundIdea.tags || [],
      notes: foundIdea.notes || '',
      attachments: foundIdea.attachments || [],
      // Metadados extras para rastreamento
      _sourceQueue: foundQueue,
      _sourceId: ideaId,
      _isPromotion: true // Flag especial indicando que é promoção
    };
    
    
    // 🔥 SETAR FLAG para evitar mudança de view
    window._nodusIsPromoting = true;
    
    // Abrir NodusPanelNQ (o Save modal)
    if (window.NodusPanelNQ && typeof window.NodusPanelNQ.open === 'function') {
      window.NodusPanelNQ.open(ideaData);
    } else {
      console.error('[Promote] ❌ NodusPanelNQ não disponível!');
      window._nodusIsPromoting = false; // Reset se falhar
      this.showToast('❌ Sistema de save não disponível', 'error');
    }
    
    // Nota: Após user salvar no NodusPanelNQ, a idea será movida automaticamente
    // da fila virtual para a fila real escolhida pelo usuário
  },

  /**
   * Executar promoção da idea
   */
  async executePromote(ideaId, sourceQueue, targetQueue) {
    
    try {
      // Buscar ideas das duas filas
      const storageData = await chrome.storage.local.get([sourceQueue, targetQueue]);
      const sourceIdeas = storageData[sourceQueue] || [];
      const targetIdeas = storageData[targetQueue] || [];
      
      // Encontrar idea
      const ideaIndex = sourceIdeas.findIndex(i => i.id === ideaId);
      if (ideaIndex === -1) {
        throw new Error('Idea não encontrada na fila de origem');
      }
      
      const idea = sourceIdeas[ideaIndex];
      
      // Atualizar idea
      idea.queue = targetQueue;
      idea.status = 'active'; // Remover status virtual
      idea.promotedAt = Date.now();
      
      // Remover da fila de origem
      sourceIdeas.splice(ideaIndex, 1);
      
      // Adicionar na fila de destino
      targetIdeas.push(idea);
      
      // Salvar ambas as filas
      await chrome.storage.local.set({
        [sourceQueue]: sourceIdeas,
        [targetQueue]: targetIdeas
      });
      
      
      // Atualizar allIdeas
      await this.loadAllIdeas();
      
      // Toast de sucesso
      const queueNames = {
        'ideas_queue_quick': 'Quick',
        'ideas_queue_default': 'Default',
        'ideas_queue_q1': 'Q1',
        'ideas_queue_custom2': 'Q2',
        'ideas_queue_custom3': 'Q3',
        'ideas_queue_custom4': 'Q4'
      };
      
      this.showToast(`✅ Promovida para ${queueNames[targetQueue]}!`, 'success');
      
      // Re-render
      await this.render();
      
    } catch (error) {
      console.error('[Promote] Erro ao promover:', error);
      this.showToast('❌ Erro ao promover: ' + error.message, 'error');
    }
  },
  
  // ═══════════════════════════════════════════════════════════
  // ATTACHMENTS SIDEBAR
  // ═══════════════════════════════════════════════════════════
  
  async openAttachmentsSidebar(chainId) {
    
    const chain = await window.NodusChains.getChain(chainId);
    if (!chain) {
      this.showToast('❌ Chain não encontrada', 'error');
      return;
    }
    
    // Criar sidebar
    let sidebar = document.getElementById('nodus-attachments-sidebar');
    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = 'nodus-attachments-sidebar';
      document.body.appendChild(sidebar);
    }
    
    const attachments = chain.attachments || [];
    
    sidebar.innerHTML = `
      <div style="position:fixed; top:0; right:0; width:350px; height:100vh; background:#1a1f29; border-left:1px solid #4a5568; z-index:999999; display:flex; flex-direction:column; box-shadow:-4px 0 20px rgba(0,0,0,0.3);">
        <!-- Header -->
        <div style="padding:16px 20px; border-bottom:1px solid #4a5568; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:18px;">📎</span>
            <div>
              <div style="color:#e2e8f0; font-weight:600; font-size:14px;">Attachments</div>
              <div style="color:#a0aec0; font-size:11px;">${chain.name}</div>
            </div>
          </div>
          <button id="closeAttachmentsSidebar" style="background:none; border:none; color:#a0aec0; cursor:pointer; font-size:20px; padding:4px 8px; border-radius:4px; transition:all 0.2s;">
            ✕
          </button>
        </div>
        
        <!-- Upload Button -->
        <div style="padding:16px 20px; border-bottom:1px solid #4a5568;">
          <input type="file" id="attachmentFileInput" style="display:none;" multiple />
          <button id="uploadAttachmentBtn" style="width:100%; padding:10px; background:#3b82f6; border:none; border-radius:6px; color:#fff; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px;">
            📤 Upload Files
          </button>
        </div>
        
        <!-- Attachments List -->
        <div style="flex:1; overflow-y:auto; padding:16px 20px;" id="chain-attachments-list">
          ${attachments.length === 0 ? `
            <div style="text-align:center; padding:40px 20px; color:#4a5568; font-size:13px;">
              <div style="font-size:32px; margin-bottom:12px;">📎</div>
              <div>Nenhum attachment</div>
              <div style="font-size:11px; margin-top:4px;">Clique em Upload para adicionar</div>
            </div>
          ` : `
            <div style="background:#3b82f611; border:1px solid #3b82f633; border-radius:8px; padding:12px; margin-bottom:16px; text-align:center; color:#94a3b8; font-size:12px; line-height:1.5;">
              💡 <strong style="color:#60a5fa;">Dica:</strong> Clique nos arquivos para selecionar múltiplos e arrastar para a plataforma AI.
            </div>
            ${attachments.map(att => {
              // Attachment de imagem URL (capturado do Full Chat)
              if (att.fileType === 'image/url' && att.url) {
                return `
                  <div class="chain-attachment-item"
                       data-attachment-id="${att.id || att.fileName}"
                       data-file-name="${att.fileName}"
                       data-file-size="0"
                       data-file-type="image/url"
                       style="background:#1e1b33; border:1px solid rgba(167,139,250,0.2); border-radius:8px; padding:8px; margin-bottom:8px; display:flex; align-items:center; gap:10px;">
                    <a href="${this.escapeHtml(att.url)}" target="_blank" rel="noopener noreferrer" style="flex-shrink:0; display:block;">
                      <img src="${this.escapeHtml(att.url)}" referrerpolicy="no-referrer"
                        style="width:64px; height:46px; object-fit:cover; border-radius:5px; border:1px solid rgba(167,139,250,0.3);"
                        onerror="this.style.display='none'">
                    </a>
                    <div style="flex:1; min-width:0;">
                      <div style="color:#c4b5fd; font-size:12px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(att.url)}">${this.escapeHtml(att.fileName)}</div>
                      <div style="color:#6b7280; font-size:10px; margin-top:2px;">📷 Imagem • ${new Date(att.uploadedAt).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <a href="${this.escapeHtml(att.url)}" target="_blank" rel="noopener noreferrer"
                      style="background:#8b5cf6; border:none; border-radius:4px; color:#fff; cursor:pointer; padding:6px 10px; font-size:11px; text-decoration:none; flex-shrink:0;">
                      🔗
                    </a>
                  </div>
                `;
              }
              // Attachment de arquivo normal
              return `
                <div class="chain-attachment-item"
                     data-attachment-id="${att.id || att.fileName}"
                     data-file-name="${att.fileName}"
                     data-file-size="${att.fileSize}"
                     data-file-type="${att.fileType || 'application/octet-stream'}"
                     draggable="true"
                     style="background:#2d3748; border:2px solid transparent; border-radius:6px; padding:12px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:10px; cursor:pointer; transition:all 0.2s;">
                  <div style="flex:1; min-width:0;">
                    <div style="color:#e2e8f0; font-size:13px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${att.fileName}</div>
                    <div style="color:#a0aec0; font-size:11px; margin-top:2px;">${this.formatFileSize(att.fileSize)} • ${new Date(att.uploadedAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div style="display:flex; gap:6px; flex-shrink:0;">
                    <button class="download-attachment-btn" data-chain-id="${chainId}" data-file-name="${att.fileName}" style="background:#3b82f6; border:none; border-radius:4px; color:#fff; cursor:pointer; padding:6px 10px; font-size:11px;">
                      📥
                    </button>
                    <button class="delete-attachment-btn" data-chain-id="${chainId}" data-file-name="${att.fileName}" style="background:#dc2626; border:none; border-radius:4px; color:#fff; cursor:pointer; padding:6px 10px; font-size:11px;">
                      🗑️
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          `}
        </div>
      </div>
    `;
    
    // Event Listeners
    document.getElementById('closeAttachmentsSidebar').onclick = () => {
      sidebar.remove();
      // Clear drag bar
      if (window.NodusAttachmentsDragBar) {
        window.NodusAttachmentsDragBar.destroy();
      }
    };
    
    document.getElementById('uploadAttachmentBtn').onclick = () => {
      document.getElementById('attachmentFileInput').click();
    };
    
    document.getElementById('attachmentFileInput').onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      for (const file of files) {
        await this.uploadChainAttachment(chainId, file);
      }
      
      // Reabrir sidebar atualizada
      await this.openAttachmentsSidebar(chainId);
    };
    
    // Download attachments
    document.querySelectorAll('.download-attachment-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation(); // Prevenir seleção
        const fileName = btn.dataset.fileName;
        await this.downloadChainAttachment(chainId, fileName);
      };
    });
    
    // Delete attachments
    document.querySelectorAll('.delete-attachment-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation(); // Prevenir seleção
        const fileName = btn.dataset.fileName;
        if (confirm(`Deletar "${fileName}"?`)) {
          await this.deleteChainAttachment(chainId, fileName);
          await this.openAttachmentsSidebar(chainId);
        }
      };
    });
    
    // Setup drag-and-drop with drag bar
    this.setupChainAttachmentsDragBar();
  },
  
  /**
   * Setup drag bar for chain attachments
   */
  setupChainAttachmentsDragBar() {
    // Initialize drag bar
    if (window.NodusAttachmentsDragBar) {
      window.NodusAttachmentsDragBar.init();
    }
    
    const items = document.querySelectorAll('.chain-attachment-item[draggable="true"]');
    
    items.forEach(item => {
      // Click to select
      item.addEventListener('click', (e) => {
        // Ignorar clique nos botões
        if (e.target.closest('.download-attachment-btn') || e.target.closest('.delete-attachment-btn')) {
          return;
        }
        
        item.classList.toggle('selected');
        this.updateChainDragBarSelection();
      });
      
      // Drag start
      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
      });
      
      // Drag end
      item.addEventListener('dragend', (e) => {
        item.classList.remove('dragging');
      });
    });
  },
  
  /**
   * Update drag bar with selected chain attachments
   */
  updateChainDragBarSelection() {
    const selectedItems = document.querySelectorAll('.chain-attachment-item.selected');
    const selectedFiles = Array.from(selectedItems).map(item => ({
      id: item.dataset.attachmentId,
      fileName: item.dataset.fileName,
      fileSize: item.dataset.fileSize,
      fileType: item.dataset.fileType
    }));

    if (window.NodusAttachmentsDragBar) {
      window.NodusAttachmentsDragBar.updateSelection(selectedFiles);
    }

  },
  
  // ═══════════════════════════════════════════════════════════
  // NOTES SIDEBAR
  // ═══════════════════════════════════════════════════════════
  
  async openNotesSidebar(chainId) {
    
    const chain = await window.NodusChains.getChain(chainId);
    if (!chain) {
      this.showToast('❌ Chain não encontrada', 'error');
      return;
    }
    
    // Criar sidebar
    let sidebar = document.getElementById('nodus-notes-sidebar');
    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = 'nodus-notes-sidebar';
      document.body.appendChild(sidebar);
    }
    
    sidebar.innerHTML = `
      <div style="position:fixed; top:0; right:0; width:400px; height:100vh; background:#1a1f29; border-left:1px solid #4a5568; z-index:999999; display:flex; flex-direction:column; box-shadow:-4px 0 20px rgba(0,0,0,0.3);">
        <!-- Header -->
        <div style="padding:16px 20px; border-bottom:1px solid #4a5568; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:18px;">${chain.notes ? '📄' : '📝'}</span>
            <div>
              <div style="color:#e2e8f0; font-weight:600; font-size:14px;">Notes</div>
              <div style="color:#a0aec0; font-size:11px;">${chain.name}</div>
            </div>
          </div>
          <button id="closeNotesSidebar" style="background:none; border:none; color:#a0aec0; cursor:pointer; font-size:20px; padding:4px 8px; border-radius:4px; transition:all 0.2s;">
            ✕
          </button>
        </div>
        
        <!-- Textarea -->
        <div style="flex:1; display:flex; flex-direction:column; padding:16px 20px; gap:12px;">
          <textarea id="chainNotesTextarea" placeholder="Escreva suas notas sobre esta chain..." style="flex:1; width:100%; padding:12px; background:#2d3748; border:1px solid #4a5568; border-radius:6px; color:#e2e8f0; font-size:13px; font-family:inherit; resize:none;">${chain.notes || ''}</textarea>
          
          <button id="saveNotesBtn" style="padding:10px; background:#10b981; border:none; border-radius:6px; color:#fff; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px;">
            💾 Salvar Notes
          </button>
        </div>
      </div>
    `;
    
    // Event Listeners
    document.getElementById('closeNotesSidebar').onclick = () => {
      sidebar.remove();
    };
    
    document.getElementById('saveNotesBtn').onclick = async () => {
      const notes = document.getElementById('chainNotesTextarea').value;
      await window.NodusChains.updateChainNotes(chainId, notes);
      this.showToast('✅ Notes salvas!', 'success');
      sidebar.remove();
      await this.render(); // Atualizar ícone no menu
    };
  },
  
  // ═══════════════════════════════════════════════════════════
  // ATTACHMENT HELPERS
  // ═══════════════════════════════════════════════════════════
  
  async uploadChainAttachment(chainId, file) {
    try {
      // Salvar no IndexedDB com chave especial
      const dbKey = `chain_${chainId}_${file.name}`;
      
      if (!window.NodusAttachmentsDB) {
        throw new Error('NodusAttachmentsDB não disponível');
      }
      
      await window.NodusAttachmentsDB.addFile(dbKey, file);
      
      // Atualizar metadata na chain
      await window.NodusChains.addChainAttachment(chainId, file.name, file.size);
      
      this.showToast(`✅ "${file.name}" anexado!`, 'success');
      
    } catch (error) {
      console.error('[Chains] Erro ao fazer upload:', error);
      this.showToast('❌ Erro ao anexar: ' + error.message, 'error');
    }
  },
  
  async downloadChainAttachment(chainId, fileName) {
    try {
      const dbKey = `chain_${chainId}_${fileName}`;
      
      if (!window.NodusAttachmentsDB) {
        throw new Error('NodusAttachmentsDB não disponível');
      }
      
      const fileData = await window.NodusAttachmentsDB.getFile(dbKey);
      
      if (!fileData) {
        throw new Error('Arquivo não encontrado');
      }
      
      // Criar blob e baixar
      const blob = new Blob([fileData.data], { type: fileData.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showToast(`📥 "${fileName}" baixado!`, 'success');
      
    } catch (error) {
      console.error('[Chains] Erro ao baixar:', error);
      this.showToast('❌ Erro ao baixar: ' + error.message, 'error');
    }
  },
  
  async deleteChainAttachment(chainId, fileName) {
    try {
      await window.NodusChains.removeChainAttachment(chainId, fileName);
      this.showToast(`🗑️ "${fileName}" removido!`, 'success');
      await this.render();
    } catch (error) {
      console.error('[Chains] Erro ao deletar:', error);
      this.showToast('❌ Erro ao deletar: ' + error.message, 'error');
    }
  },
  
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },
  
  // ═══════════════════════════════════════════════════════════════
  // FULL CHAT CAPTURE - GATE DE CONTROLE (ilimitado em todos os planos)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Gate: Full Chat Capture ilimitado para todos os planos
   * Mantido para compatibilidade com chamadas existentes
   */
  async checkFullChatLimit() {
    return true;
  },
  
  /**
   * Incrementar contador de Full Chat Capture (só FREE)
   */
  async incrementFullChatCounter() {
    const isPro = window.NodusLicense && window.NodusLicense.isPro();
    
    if (isPro) {
      // PRO não conta
      this.showToast('✅ Chat capturado! (💎 PRO = Ilimitado)', 'success');
      return;
    }
    
    // FREE: incrementar contador
    const counter = await this.getFullChatCounter();
    counter.count++;
    
    await chrome.storage.local.set({
      nodus_fullchat_count: counter
    });
    
    const remaining = counter.limit - counter.count;
    
    // Toast com contador restante
    if (remaining > 0) {
      this.showToast(`✅ Chat capturado! (${remaining} captures restantes este mês)`, 'success');
    } else {
      this.showToast(`✅ Chat capturado! (0 restantes - Upgrade para ilimitado!)`, 'warning');
    }
  },
  
  /**
   * Obter contador atual de Full Chat Capture
   */
  async getFullChatCounter() {
    const data = await chrome.storage.local.get('nodus_fullchat_count');
    
    if (!data.nodus_fullchat_count) {
      // Inicializar contador
      const initial = {
        count: 0,
        lastReset: new Date().toISOString().slice(0, 10),
        limit: 10
      };
      await chrome.storage.local.set({ nodus_fullchat_count: initial });
      return initial;
    }
    
    return data.nodus_fullchat_count;
  },
  
  /**
   * Verificar e executar reset mensal do contador
   */
  async checkMonthlyReset(counter) {
    const now = new Date();
    const lastReset = new Date(counter.lastReset);
    
    // Se mudou o mês OU o ano, resetar
    if (now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
      
      
      const resetCounter = {
        count: 0,
        lastReset: now.toISOString().slice(0, 10),
        limit: 10
      };
      
      await chrome.storage.local.set({
        nodus_fullchat_count: resetCounter
      });
      
    }
  },

  // ═══════════════════════════════════════════════════════════
  // FILE TRAY - Bandeja de arquivos na base da sidebar
  // ═══════════════════════════════════════════════════════════

  _fileTrayOpen: false,
  _fileTrayChainId: null,
  _fileTrayMaxFiles: 10,

  /**
   * Toggle File Tray visibility
   */
  async toggleFileTray() {
    if (this._fileTrayOpen) {
      this.closeFileTray();
    } else {
      await this.openFileTray();
    }
  },

  /**
   * Open File Tray for current chain
   */
  async openFileTray() {
    const chains = await window.NodusChains.getAllChains();
    const chain = chains[this.currentChainIndex];
    if (!chain) return;

    this._fileTrayChainId = chain.id;
    this._fileTrayOpen = true;

    const btn = document.getElementById('toggleFileTrayBtn');
    if (btn) btn.classList.add('active');

    await this.renderFileTray(chain);
  },

  /**
   * Close File Tray
   */
  closeFileTray() {
    this._fileTrayOpen = false;
    this._fileTrayChainId = null;

    const tray = document.getElementById('nodus-file-tray');
    if (tray) {
      tray.classList.remove('visible');
      setTimeout(() => tray.remove(), 350);
    }

    const btn = document.getElementById('toggleFileTrayBtn');
    if (btn) btn.classList.remove('active');

  },

  /**
   * Render File Tray DOM
   */
  async renderFileTray(chain) {
    // Remove existing
    const existing = document.getElementById('nodus-file-tray');
    if (existing) existing.remove();

    const attachments = chain.attachments || [];
    const totalSize = attachments.reduce((sum, a) => sum + (a.fileSize || 0), 0);
    const totalSizeStr = totalSize < 1024 ? totalSize + ' B'
      : totalSize < 1048576 ? (totalSize / 1024).toFixed(1) + ' KB'
      : (totalSize / 1048576).toFixed(1) + ' MB';

    // Get modal width to match tray width
    const modal = document.getElementById('nodus-dashboard-modal');
    const modalWidth = modal ? modal.getBoundingClientRect().width : 340;

    const tray = document.createElement('div');
    tray.id = 'nodus-file-tray';
    tray.className = 'nodus-file-tray';
    tray.style.width = modalWidth + 'px';

    if (attachments.length === 0) {
      tray.innerHTML = `
        <div class="nodus-tray-header">
          <div class="nodus-tray-header-left">
            <span class="nodus-tray-icon">📂</span>
            <span class="nodus-tray-title">Arquivos</span>
            <span class="nodus-tray-badge">0</span>
          </div>
          <button class="nodus-tray-close" id="closeTrayBtn">✕</button>
        </div>
        <div class="nodus-tray-empty">
          <div class="nodus-tray-empty-icon">📭</div>
          Nenhum arquivo nesta chain
        </div>
      `;
    } else {
      const chipsHTML = attachments.map((att, i) => {
        const shortName = att.fileName.length > 12 ? att.fileName.substring(0, 10) + '...' : att.fileName;

        // Imagem capturada de URL (Full Chat)
        if (att.fileType === 'image/url' && att.url) {
          return `
            <div class="nodus-tray-chip" data-index="${i}" data-filename="${this.escapeHtml(att.fileName)}" data-filesize="0" data-filetype="image/url" data-url="${this.escapeHtml(att.url)}" draggable="true">
              <span class="nodus-tray-chip-check">✓</span>
              <a href="${this.escapeHtml(att.url)}" target="_blank" rel="noopener noreferrer" style="display:block; flex-shrink:0; border-radius:4px; overflow:hidden; width:40px; height:40px;">
                <img src="${this.escapeHtml(att.url)}" referrerpolicy="no-referrer"
                  style="width:40px; height:40px; object-fit:cover; display:block;"
                  onerror="this.parentElement.style.display='none'; this.parentElement.nextElementSibling.style.display='';">
              </a>
              <span style="display:none; font-size:20px; flex-shrink:0;">🖼️</span>
              <div class="nodus-tray-chip-info">
                <div class="nodus-tray-chip-name" title="${this.escapeHtml(att.fileName)}">${this.escapeHtml(shortName)}</div>
                <div class="nodus-tray-chip-size" style="color:#a78bfa;">URL</div>
              </div>
              <div class="nodus-tray-chip-grip">⠿</div>
            </div>
          `;
        }

        const icon = this._getFileTypeIcon(att.fileType || att.fileName);
        const typeClass = this._getFileTypeClass(att.fileType || att.fileName);
        const isImageFile = typeClass.includes('t-img');
        const sizeStr = att.fileSize < 1024 ? att.fileSize + ' B'
          : att.fileSize < 1048576 ? (att.fileSize / 1024).toFixed(1) + ' KB'
          : (att.fileSize / 1048576).toFixed(1) + ' MB';

        return `
          <div class="nodus-tray-chip" data-index="${i}" data-filename="${this.escapeHtml(att.fileName)}" data-filesize="${att.fileSize}" data-filetype="${att.fileType || ''}" draggable="true" ${isImageFile ? 'data-needs-thumb="true"' : ''}>
            <span class="nodus-tray-chip-check">✓</span>
            ${isImageFile ? `
              <div class="nodus-tray-chip-thumb" style="width:40px;height:40px;border-radius:4px;overflow:hidden;flex-shrink:0;background:#374151;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;">🖼️</div>
            ` : `
              <div class="nodus-tray-chip-icon ${typeClass}">${icon}</div>
            `}
            <div class="nodus-tray-chip-info">
              <div class="nodus-tray-chip-name" title="${this.escapeHtml(att.fileName)}">${this.escapeHtml(shortName)}</div>
              <div class="nodus-tray-chip-size">${sizeStr}</div>
            </div>
            <div class="nodus-tray-chip-grip">⠿</div>
          </div>
        `;
      }).join('');

      tray.innerHTML = `
        <div class="nodus-tray-header">
          <div class="nodus-tray-header-left">
            <span class="nodus-tray-icon">📂</span>
            <span class="nodus-tray-title">Arquivos</span>
            <span class="nodus-tray-badge">${attachments.length}</span>
          </div>
          <button class="nodus-tray-close" id="closeTrayBtn">✕</button>
        </div>
        <div class="nodus-tray-toolbar">
          <button class="nodus-tray-select-all" id="traySelectAllBtn">☐ Selecionar todos</button>
          <div class="nodus-tray-selection-info">
            <span><span class="nodus-tray-sel-count" id="traySelCount">0</span> selecionado(s)</span>
            <span class="nodus-tray-limit-warn" id="trayLimitWarn">⚠ Limite: ${this._fileTrayMaxFiles}</span>
            <button class="nodus-tray-deselect" id="trayDeselectBtn">✕</button>
          </div>
        </div>
        <div class="nodus-tray-files-wrapper">
          <button class="nodus-tray-scroll-btn" id="trayScrollLeft">◂</button>
          <div class="nodus-tray-files" id="trayFilesScroll">
            ${chipsHTML}
          </div>
          <button class="nodus-tray-scroll-btn" id="trayScrollRight">▸</button>
        </div>
        <div class="nodus-tray-footer">
          <div>
            <span class="nodus-tray-footer-info">${attachments.length} arquivos · ${totalSizeStr}</span>
            <span class="nodus-tray-drag-hint" id="trayDragHint">← arraste para o chat</span>
          </div>
          <button class="nodus-tray-inject-btn" id="trayInjectBtn" disabled>⚡ Injetar selecionados</button>
        </div>
      `;
    }

    document.body.appendChild(tray);

    // Animate in
    requestAnimationFrame(() => {
      tray.classList.add('visible');
    });

    // Setup events
    this._setupFileTrayEvents();

    // Load image thumbnails async (after DOM is ready)
    if (attachments.length > 0) {
      setTimeout(() => this._loadTrayThumbnails(chain.id), 50);
    }
  },

  /**
   * Setup File Tray event listeners
   */
  _setupFileTrayEvents() {
    // Close button
    const closeBtn = document.getElementById('closeTrayBtn');
    if (closeBtn) closeBtn.onclick = () => this.closeFileTray();

    // Scroll buttons
    const scrollLeft = document.getElementById('trayScrollLeft');
    const scrollRight = document.getElementById('trayScrollRight');
    const scrollContainer = document.getElementById('trayFilesScroll');
    if (scrollLeft) scrollLeft.onclick = () => scrollContainer?.scrollBy({ left: -120, behavior: 'smooth' });
    if (scrollRight) scrollRight.onclick = () => scrollContainer?.scrollBy({ left: 120, behavior: 'smooth' });

    // Select all
    const selectAllBtn = document.getElementById('traySelectAllBtn');
    if (selectAllBtn) selectAllBtn.onclick = () => this._trayToggleSelectAll();

    // Deselect
    const deselectBtn = document.getElementById('trayDeselectBtn');
    if (deselectBtn) deselectBtn.onclick = () => this._trayDeselectAll();

    // Inject
    const injectBtn = document.getElementById('trayInjectBtn');
    if (injectBtn) injectBtn.onclick = () => this._trayInjectSelected();

    // Chip click, drag, and image hover preview
    document.querySelectorAll('.nodus-tray-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        if (e.target.closest('.nodus-tray-chip-grip')) return; // grip is for drag only
        if (e.target.closest('a')) return; // let links through
        this._trayToggleChip(chip);
      });

      chip.addEventListener('dragstart', (e) => this._trayHandleDragStart(e, chip));
      chip.addEventListener('dragend', () => this._trayHandleDragEnd());

      // Hover preview for image/url chips (instant — URL is already known)
      if (chip.dataset.filetype === 'image/url' && chip.dataset.url) {
        chip.dataset.hoverReady = 'true';
        chip.addEventListener('mouseenter', (e) => this._trayShowImgPreview(e, chip));
        chip.addEventListener('mouseleave', () => this._trayHideImgPreview());
      }
    });
  },

  /**
   * Show floating image preview on chip hover
   */
  _trayShowImgPreview(e, chip) {
    this._trayHideImgPreview();

    // Get image src
    let src = null;
    if (chip.dataset.filetype === 'image/url' && chip.dataset.url) {
      src = chip.dataset.url;
    } else {
      const thumbImg = chip.querySelector('.nodus-tray-chip-thumb img');
      if (thumbImg) src = thumbImg.src;
    }
    if (!src) return;

    const preview = document.createElement('div');
    preview.id = 'nodus-tray-img-preview';
    preview.style.cssText = `
      position:fixed; z-index:2147483647; pointer-events:none;
      background:#1a1f29; border:1px solid rgba(167,139,250,0.4);
      border-radius:8px; padding:6px; box-shadow:0 8px 24px rgba(0,0,0,0.6);
      transition:opacity 0.15s; opacity:0;
    `;
    const img = document.createElement('img');
    img.src = src;
    img.referrerPolicy = 'no-referrer';
    img.style.cssText = 'width:220px; height:160px; object-fit:contain; display:block; border-radius:4px;';
    img.onerror = () => preview.remove();
    preview.appendChild(img);
    document.body.appendChild(preview);

    // Position near cursor
    const rect = chip.getBoundingClientRect();
    const previewW = 232;
    const previewH = 172;
    let left = rect.left;
    let top = rect.top - previewH - 8;
    if (top < 8) top = rect.bottom + 8;
    if (left + previewW > window.innerWidth - 8) left = window.innerWidth - previewW - 8;
    preview.style.left = left + 'px';
    preview.style.top = top + 'px';

    requestAnimationFrame(() => { preview.style.opacity = '1'; });
  },

  _trayHideImgPreview() {
    const prev = document.getElementById('nodus-tray-img-preview');
    if (prev) prev.remove();
  },

  /**
   * Resolve [data-idb-src] placeholders nos cards de nodes.
   * Chamado após renderGridMode — substitui placeholders por blob URLs.
   */
  async _loadIdbImages() {
    if (!window.NodusAttachmentsDB) return;
    const imgs = document.querySelectorAll('img[data-idb-src]');
    for (const img of imgs) {
      const key = img.dataset.idbSrc;
      if (!key) continue;
      try {
        const record = await window.NodusAttachmentsDB.getFile(key);
        if (record && record.fileData) {
          const blob = new Blob([record.fileData], { type: record.fileType || 'image/jpeg' });
          img.src = URL.createObjectURL(blob);
          img.removeAttribute('data-idb-src');
        }
      } catch (e) {
        // silently skip missing records
      }
    }
  },

  /**
   * Load image thumbnails from IndexedDB into chip thumb containers
   */
  async _loadTrayThumbnails(chainId) {
    const chips = document.querySelectorAll('.nodus-tray-chip[data-needs-thumb="true"]');
    for (const chip of chips) {
      const fileName = chip.dataset.filename;
      const fileType = chip.dataset.filetype;
      if (!fileName || !window.NodusAttachmentsDB) continue;

      try {
        const dbKey = `chain_${chainId}_${fileName}`;
        const fileData = await window.NodusAttachmentsDB.getFile(dbKey);
        if (fileData && fileData.fileData) {
          const blob = new Blob([fileData.fileData], { type: fileType || 'image/*' });
          const url = URL.createObjectURL(blob);
          chip.dataset.blobUrl = url;

          const thumbContainer = chip.querySelector('.nodus-tray-chip-thumb');
          if (thumbContainer) {
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            img.onerror = () => { thumbContainer.textContent = '🖼️'; };
            thumbContainer.innerHTML = '';
            thumbContainer.appendChild(img);

            // Enable hover preview now that we have the blob url (only if not already set)
            if (!chip.dataset.hoverReady) {
              chip.dataset.hoverReady = 'true';
              chip.addEventListener('mouseenter', (e) => this._trayShowImgPreview(e, chip));
              chip.addEventListener('mouseleave', () => this._trayHideImgPreview());
            }
          }
        }
      } catch (err) {
        // keep emoji placeholder
      }
    }
  },

  /**
   * Toggle chip selection
   */
  _trayToggleChip(chip) {
    const selected = document.querySelectorAll('.nodus-tray-chip.selected');

    if (!chip.classList.contains('selected') && selected.length >= this._fileTrayMaxFiles) {
      const warn = document.getElementById('trayLimitWarn');
      if (warn) warn.classList.add('visible');
      return;
    }

    chip.classList.toggle('selected');
    this._trayUpdateSelectionUI();
  },

  /**
   * Toggle select all
   */
  _trayToggleSelectAll() {
    const chips = document.querySelectorAll('.nodus-tray-chip');
    const selected = document.querySelectorAll('.nodus-tray-chip.selected');

    if (selected.length === chips.length || selected.length >= this._fileTrayMaxFiles) {
      this._trayDeselectAll();
    } else {
      let count = 0;
      chips.forEach(c => {
        if (count < this._fileTrayMaxFiles) {
          c.classList.add('selected');
          count++;
        }
      });
      if (chips.length > this._fileTrayMaxFiles) {
        const warn = document.getElementById('trayLimitWarn');
        if (warn) warn.classList.add('visible');
      }
      this._trayUpdateSelectionUI();
    }
  },

  /**
   * Deselect all
   */
  _trayDeselectAll() {
    document.querySelectorAll('.nodus-tray-chip.selected').forEach(c => c.classList.remove('selected'));
    const warn = document.getElementById('trayLimitWarn');
    if (warn) warn.classList.remove('visible');
    this._trayUpdateSelectionUI();
  },

  /**
   * Update selection UI
   */
  _trayUpdateSelectionUI() {
    const selected = document.querySelectorAll('.nodus-tray-chip.selected');
    const total = document.querySelectorAll('.nodus-tray-chip').length;
    const count = selected.length;

    const selCount = document.getElementById('traySelCount');
    if (selCount) selCount.textContent = count;

    const selectAllBtn = document.getElementById('traySelectAllBtn');
    if (selectAllBtn) {
      if (count === total || count >= this._fileTrayMaxFiles) {
        selectAllBtn.classList.add('active');
        selectAllBtn.textContent = '☑ Todos selecionados';
      } else {
        selectAllBtn.classList.remove('active');
        selectAllBtn.textContent = '☐ Selecionar todos';
      }
    }

    const deselectBtn = document.getElementById('trayDeselectBtn');
    if (deselectBtn) deselectBtn.classList.toggle('visible', count > 0);

    const injectBtn = document.getElementById('trayInjectBtn');
    if (injectBtn) {
      injectBtn.disabled = count === 0;
      injectBtn.textContent = count > 0 ? `⚡ Injetar ${count} arquivo(s)` : '⚡ Injetar selecionados';
    }

    const dragHint = document.getElementById('trayDragHint');
    if (dragHint) dragHint.classList.toggle('visible', count > 0);

    if (count >= this._fileTrayMaxFiles) {
      const warn = document.getElementById('trayLimitWarn');
      if (warn) warn.classList.add('visible');
    } else {
      const warn = document.getElementById('trayLimitWarn');
      if (warn) warn.classList.remove('visible');
    }
  },

  /**
   * Handle drag start - loads files from IndexedDB
   */
  async _trayHandleDragStart(e, chip) {
    // Auto-select if not selected
    if (!chip.classList.contains('selected')) {
      chip.classList.add('selected');
      this._trayUpdateSelectionUI();
    }

    // Mark all selected as dragging
    document.querySelectorAll('.nodus-tray-chip.selected').forEach(c => c.classList.add('dragging'));

    const selectedChips = document.querySelectorAll('.nodus-tray-chip.selected');
    const fileNames = Array.from(selectedChips).map(c => c.dataset.filename);

    e.dataTransfer.effectAllowed = 'copy';

    // Try to load real File objects from IndexedDB (skip image/url entries — use URL directly)
    try {
      const chainId = this._fileTrayChainId;
      const urlLines = [];
      for (const chip of selectedChips) {
        const fileType = chip.dataset.filetype;
        const url = chip.dataset.url;
        if (fileType === 'image/url' && url) {
          urlLines.push(url);
          continue;
        }
        const fileName = chip.dataset.filename;
        const dbKey = `chain_${chainId}_${fileName}`;
        const fileData = await window.NodusAttachmentsDB.getFile(dbKey);
        if (fileData && fileData.fileData) {
          const blob = new Blob([fileData.fileData], { type: fileData.fileType || 'application/octet-stream' });
          const file = new File([blob], fileName, { type: fileData.fileType || 'application/octet-stream', lastModified: Date.now() });
          e.dataTransfer.items.add(file);
        }
      }
      if (urlLines.length > 0) {
        e.dataTransfer.setData('text/uri-list', urlLines.join('\r\n'));
      }
    } catch (err) {
      console.warn('[FileTray] Failed to load files, using fallback:', err);
      // Fallback: send as JSON
      e.dataTransfer.setData('application/x-nodus-attachments', JSON.stringify({
        files: Array.from(selectedChips).map(c => ({
          fileName: c.dataset.filename,
          fileSize: c.dataset.filesize,
          fileType: c.dataset.filetype,
          url: c.dataset.url || undefined
        })),
        chainId: this._fileTrayChainId,
        source: 'nodus-file-tray'
      }));
    }

    // Also set plain text as final fallback
    e.dataTransfer.setData('text/plain', fileNames.join(', '));

  },

  /**
   * Handle drag end
   */
  _trayHandleDragEnd() {
    document.querySelectorAll('.nodus-tray-chip.dragging').forEach(c => c.classList.remove('dragging'));
  },

  /**
   * Inject selected files as text
   */
  async _trayInjectSelected() {
    const selectedChips = document.querySelectorAll('.nodus-tray-chip.selected');
    if (selectedChips.length === 0) return;

    const chainId = this._fileTrayChainId;
    let text = `📎 Arquivos Anexados (${selectedChips.length}):\n\n`;

    for (const chip of selectedChips) {
      const fileName = chip.dataset.filename;
      const fileType = chip.dataset.filetype;
      const url = chip.dataset.url;

      // Imagem URL (Full Chat capture)
      if (fileType === 'image/url' && url) {
        text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `🖼️ ${fileName}\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        text += `${url}\n\n`;
        continue;
      }

      const fileSize = chip.dataset.filesize;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📄 ${fileName} (${fileSize < 1024 ? fileSize + ' B' : fileSize < 1048576 ? (fileSize / 1024).toFixed(1) + ' KB' : (fileSize / 1048576).toFixed(1) + ' MB'})\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      // Try to read text content
      try {
        const dbKey = `chain_${chainId}_${fileName}`;
        if (window.NodusAttachmentsDB && window.NodusAttachmentsDB.isTextFile(fileType)) {
          const content = await window.NodusAttachmentsDB.getFileAsText(dbKey);
          text += `\`\`\`\n${content}\n\`\`\`\n\n`;
        } else {
          text += `[Arquivo binario - tipo: ${fileType || 'desconhecido'}]\n\n`;
        }
      } catch (err) {
        text += `[Erro ao ler: ${err.message}]\n\n`;
      }
    }

    // Inject via message to content script
    try {
      chrome.runtime.sendMessage({
        action: 'inject_text_in_current_tab',
        text: text,
        injectMode: 'plaintext'
      });
      if (window.NODUS_UI) {
        window.NODUS_UI.showToast(`✅ ${selectedChips.length} arquivo(s) injetado(s)`, 'success');
      }
    } catch (err) {
      console.error('[FileTray] Inject error:', err);
    }
  },

  /**
   * Get file type icon emoji
   */
  _getFileTypeIcon(fileTypeOrName) {
    const s = (fileTypeOrName || '').toLowerCase();
    if (s.includes('pdf')) return '📄';
    if (s.includes('image') || s.includes('png') || s.includes('jpg') || s.includes('jpeg') || s.includes('svg') || s.includes('gif')) return '🖼️';
    if (s.includes('spreadsheet') || s.includes('excel') || s.includes('xlsx') || s.includes('csv')) return '📊';
    if (s.includes('presentation') || s.includes('pptx')) return '📽️';
    if (s.includes('word') || s.includes('docx') || s.includes('doc')) return '📝';
    if (s.includes('zip') || s.includes('rar') || s.includes('tar') || s.includes('gz')) return '📦';
    if (s.includes('video') || s.includes('mp4')) return '🎬';
    if (s.includes('audio') || s.includes('mp3')) return '🎵';
    if (s.includes('text') || s.includes('txt') || s.includes('md')) return '📝';
    if (s.includes('javascript') || s.includes('.js') || s.includes('python') || s.includes('.py') || s.includes('json') || s.includes('html') || s.includes('css') || s.includes('code')) return '💻';
    return '📎';
  },

  /**
   * Get file type CSS class
   */
  _getFileTypeClass(fileTypeOrName) {
    const s = (fileTypeOrName || '').toLowerCase();
    if (s.includes('image') || s.includes('png') || s.includes('jpg') || s.includes('jpeg') || s.includes('svg') || s.includes('gif')) return 'nodus-tray-chip-icon t-img';
    if (s.includes('pdf')) return 'nodus-tray-chip-icon t-pdf';
    if (s.includes('javascript') || s.includes('.js') || s.includes('python') || s.includes('.py') || s.includes('json') || s.includes('html') || s.includes('css') || s.includes('code')) return 'nodus-tray-chip-icon t-code';
    if (s.includes('word') || s.includes('docx') || s.includes('doc')) return 'nodus-tray-chip-icon t-doc';
    if (s.includes('spreadsheet') || s.includes('excel') || s.includes('xlsx') || s.includes('csv')) return 'nodus-tray-chip-icon t-csv';
    if (s.includes('zip') || s.includes('rar') || s.includes('tar') || s.includes('gz')) return 'nodus-tray-chip-icon t-zip';
    return 'nodus-tray-chip-icon t-generic';
  }
};

if (typeof window !== 'undefined') {
  window.NodusChainsUI = NodusChainsUI;
}

