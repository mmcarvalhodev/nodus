/**
 * NODUS Dashboard - Cards View Module
 * Enhanced version of popup with column layout (1-4 columns), bulk operations, and advanced features
 * Version: 1.0.0 - FREE
 */

// Helper de tradução
const _t = (key) => {
    // Fallback em PT (prioridade para garantir que sempre funciona)
    const fallbacks = {
        'filter.search': 'Buscar ideias...',
        'filter.filters': 'Filtros',
        'filter.platform': 'Plataforma',
        'filter.allplatforms': 'Todas as Plataformas',
        'filter.daterange': 'Período',
        'filter.alltime': 'Todo o período',
        'filter.today': 'Hoje',
        'filter.thisweek': 'Esta semana',
        'filter.thismonth': 'Este mês',
        'filter.tags': 'Tags',
        'filter.notags': 'Sem tags ainda',
        'filter.clear': 'Limpar Filtros',
        'queue.clearqueue': 'Limpar Fila',
        'queue.showing': 'Mostrando',
        'queue.ideas': 'ideias',
        'card.copy': 'Copiar',
        'card.inject': 'Injetar',
        'card.edit': 'Editar',
        'card.delete': 'Deletar',
        'card.addtochain': 'Add to Chain',
        'card.noquestion': 'Sem pergunta',
        'card.question': '💬 Pergunta:',
        'card.answer': '📝 Resposta:',
        'card.seemore': 'Ver mais',
        'card.seeless': 'Ver menos',
        'toast.copied': 'Copiado!',
        'toast.deleted': 'Deletado!',
        'toast.injected': 'Injetado!',
        'toast.saved': 'Salvo!',
        'confirm.delete': 'Tem certeza que deseja deletar esta ideia?',
        'confirm.clearqueue': 'Tem certeza que deseja limpar toda a fila?',
        // Tooltips
        'tooltip.column1': '1 coluna',
        'tooltip.column2': '2 colunas',
        'tooltip.column3': '3 colunas',
        'tooltip.injectedtimes': 'Injetado {n} vezes',
        'tooltip.opensource': 'Abrir origem',
        'tooltip.manageattachments': 'Gerenciar anexos',
        'tooltip.filedetected': 'Arquivo detectado na resposta',
        'tooltip.addnotes': 'Adicionar notas',
        'tooltip.injectfull': 'Injetar pergunta + resposta',
        'tooltip.injectanswer': 'Injetar só resposta',
        'tooltip.copytoclipboard': 'Copiar para área de transferência',
        'tooltip.editidea': 'Editar ideia',
        'tooltip.deleteidea': 'Deletar ideia',
        'tooltip.confirmdelete': 'Confirmar exclusão',
        'tooltip.cancel': 'Cancelar',
        'tooltip.changequeue': 'Mudar fila',
        'tooltip.canceledit': 'Cancelar edição',
        'tooltip.savechanges': 'Salvar alterações',
        'tooltip.download': 'Baixar',
        'tooltip.delete': 'Deletar',
        // Settings reusados
        'settings.cancel': 'Cancelar',
        'settings.save': 'Salvar'
    };
    
    // Tentar NodusI18n global se disponível e inicializado
    try {
        if (window.NodusI18n && window.NodusI18n.currentLang && typeof window.NodusI18n.t === 'function') {
            const translated = window.NodusI18n.t(key);
            if (translated && translated !== key) {
                return translated;
            }
        }
    } catch (e) {
        // Silently fail
    }
    
    return fallbacks[key] || key;
};

const NodusDashboardCards = {
    // State
    currentQueue: 'default', // 'quick', 'default', 'custom1', etc.
    columnLayout: 1, // 1, 2, 3, or 4 columns (default: 1)
    cardAnimation: 'glow', // 'glow', 'slide', 'pop', 'flip', 'slide-right'
    searchQuery: '',
    selectedCards: new Set(),
    allIdeas: {},
    previousIdeaIds: new Set(), // Track previous idea IDs to detect new ones
    
    // Filters
    filters: {
        platform: 'all', // 'all', 'claude', 'chatgpt', 'gemini', etc
        tags: [],
        dateRange: 'all' // 'all', 'today', 'week', 'month'
    },
    filtersVisible: false,
    
    /**
     * Initialize the cards view
     */
    async init() {
        await this.loadColumnLayout();
        await this.loadCardAnimation();
        await this.loadInjectMode(); // Load inject mode preference (silently)
        await this.loadIdeas();
        this._autoSelectQueue(); // Select first non-empty queue so grid never opens blank
        this.setupStorageListener();
        this.setupAttachmentListener();
        this.setupStateSyncListener();
        this.setupLicenseChangeListener(); // Escutar mudanças de licença
    },

    /**
     * Auto-select the first non-empty queue on open.
     * Quick takes priority (main capture queue), then Default, then custom queues.
     * If no queue has content, stays on 'default'.
     */
    _autoSelectQueue() {
        const priority = ['quick', 'default', 'custom1', 'custom2', 'custom3', 'custom4'];
        const first = priority.find(q => this.allIdeas[q] && this.allIdeas[q].length > 0);
        if (first) {
            this.currentQueue = first;
        }
    },
    
    /**
     * Setup license change listener - DESATIVADO (reload resolve)
     */
    setupLicenseChangeListener() {
        // ❌ DESATIVADO: O reload da página já atualiza tudo
        // Listeners causavam erro ao tentar render() sem container
    },
    
    /**
     * Setup state sync listener (cross-tab synchronization)
     */
    setupStateSyncListener() {
        if (typeof window.NodusStateSync === 'undefined') {
            // StateSync opcional - silently skip if not available
            return;
        }
        
        
        // Sincronizar quando QUICK queue mudar
        window.NodusStateSync.subscribe('ideas_queue_quick', async (newValue) => {
            if (this.currentQueue === 'quick') {
                await this.loadIdeas();
            }
        });
        
        // Sincronizar quando DEFAULT queue mudar
        window.NodusStateSync.subscribe('ideas_queue_default', async (newValue) => {
            if (this.currentQueue === 'default') {
                await this.loadIdeas();
            }
        });
        
        // Sincronizar quando AUTOMATIC queue mudar
        window.NodusStateSync.subscribe('ideas_queue_automatic', async (newValue) => {
            if (this.currentQueue === 'automatic') {
                await this.loadIdeas();
            }
        });
        
    },
    
    /**
     * Setup attachment update listener
     */
    setupAttachmentListener() {
        const self = this;
        window.addEventListener('nodus-attachment-updated', async (e) => {
            const { ideaId, action } = e.detail;
            
            // Atualizar contador do botão
            const card = document.querySelector(`[data-idea-id="${ideaId}"]`);
            if (card) {
                const btn = card.querySelector('.card-attachment-btn');
                if (btn) {
                    const count = await self.getAttachmentCount(ideaId);
                    btn.textContent = `📎 ${count}x`;
                    btn.dataset.attachmentCount = count;
                    
                    // Atualizar tooltip com lista de arquivos
                    if (count > 0 && window.NodusAttachmentsDB) {
                        const attachments = await window.NodusAttachmentsDB.getAttachmentsByIdeaId(ideaId);
                        const fileList = attachments.map(att => `• ${att.fileName}`).join('\n');
                        btn.title = `Attachments (${count}):\n${fileList}`;
                        btn.classList.add('has-files');
                        btn.classList.remove('has-alert');
                        self.animateAttachmentButton(ideaId);
                    } else {
                        btn.title = 'Manage attachments';
                        btn.classList.remove('has-files');
                    }
                }
            }
        });
    },
    
    /**
     * Load column layout preference from storage
     */
    async loadColumnLayout() {
        const data = await chrome.storage.local.get('dashboard_column_layout');
        if (data.dashboard_column_layout) {
            this.columnLayout = data.dashboard_column_layout;
        }
    },
    
    /**
     * Load card animation preference from storage
     */
    async loadCardAnimation() {
        const data = await chrome.storage.local.get('settings');
        if (data.settings && data.settings.cardAnimation) {
            this.cardAnimation = data.settings.cardAnimation;
        }
    },
    
    /**
     * Save column layout preference
     */
    async saveColumnLayout(columns) {
        this.columnLayout = columns;
        await chrome.storage.local.set({ dashboard_column_layout: columns });

        // Update modal width — do it directly on the DOM element so it works
        // regardless of whether window.NodusDashboard is available
        const modal = document.getElementById('nodus-dashboard-modal');
        if (modal) {
            const WIDTHS = { 1: 340, 2: 560, 3: 780, 4: 1000 };
            [1, 2, 3, 4].forEach(c => modal.classList.remove(`cols-${c}`));
            modal.classList.add(`cols-${columns}`);
            modal.style.width = (WIDTHS[columns] || 340) + 'px';
        } else {
            console.warn('[Dashboard Cards] Modal element not found!');
        }

        // Also notify NodusDashboard if available (for pinned mode body margin etc.)
        if (window.NodusDashboard) {
            window.NodusDashboard.updateModalWidth(columns);
        }
    },
    
    /**
     * Load all ideas from storage
     */
    async loadIdeas() {
        const data = await chrome.storage.local.get([
            'ideas_queue_quick',
            'ideas_queue_default',
            'ideas_queue_custom1',
            'ideas_queue_custom2',
            'ideas_queue_custom3',
            'ideas_queue_custom4'
        ]);
        
        // Filtrar por projeto ativo (se NodusProjects disponivel)
        const pFilter = window.NodusProjects ? (arr) => window.NodusProjects.filterByActiveProject(arr) : (arr) => arr;

        this.allIdeas = {
            quick: pFilter(data.ideas_queue_quick || []),
            default: pFilter(data.ideas_queue_default || []),
            custom1: pFilter(data.ideas_queue_custom1 || []),
            custom2: pFilter(data.ideas_queue_custom2 || []),
            custom3: pFilter(data.ideas_queue_custom3 || []),
            custom4: pFilter(data.ideas_queue_custom4 || [])
        };
        
        console.log('[Dashboard Cards] Ideas loaded:', {
            quick: this.allIdeas.quick.length,
            default: this.allIdeas.default.length,
            custom1: this.allIdeas.custom1.length,
            custom2: this.allIdeas.custom2.length,
            custom3: this.allIdeas.custom3.length,
            custom4: this.allIdeas.custom4.length
        });
    },
    
    /**
     * Setup storage listener to detect new ideas in real-time
     */
    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            
            // Check if any queue was updated
            const queueKeys = [
                'ideas_queue_quick', 
                'ideas_queue_default', 
                'ideas_queue_custom1',
                'ideas_queue_custom2',
                'ideas_queue_custom3',
                'ideas_queue_custom4'
            ];
            const queueChanged = queueKeys.some(key => key in changes);
            
            if (queueChanged) {
                
                // 🔥 NÃO mudar view se estiver em Chains e for uma promoção
                const currentTab = window.NodusDashboard?.activeTab;
                const isPromoting = window._nodusIsPromoting === true;
                
                console.log('[Dashboard Cards] Storage check:', {
                    currentTab,
                    isPromoting,
                    willSkipRefresh: currentTab === 'chains' && isPromoting
                });
                
                if (currentTab === 'chains' && isPromoting) {
                    window._nodusIsPromoting = false; // Reset flag
                    return; // Não refresh, mantém em Chains
                }
                
                this.refreshView();
            }
        });
    },
    
    /**
     * Render the cards view
     */
    async render(container) {
        
        await this.loadIdeas();
        
        // ✅ NÃO RESETAR - permitir visualização com overlay PRO
        
        container.innerHTML = '';
        container.className = 'nodus-cards-view';
        
        // Search bar
        const searchBar = this.createSearchBar();
        container.appendChild(searchBar);
        
        // Queue tabs
        const queueTabs = this.createQueueTabs();
        container.appendChild(queueTabs);
        
        // Toolbar (column selector, view options, bulk actions)
        const toolbar = this.createToolbar();
        container.appendChild(toolbar);
        
        // Cards grid (await porque agora é async)
        const cardsGrid = await this.createCardsGrid();
        container.appendChild(cardsGrid);
        
        // Attach event listeners
        this.attachEventListeners(container);
    },
    
    /**
     * Create search bar
     */
    createSearchBar() {
        const wrapper = document.createElement('div');
        
        const searchBar = document.createElement('div');
        searchBar.className = 'nodus-search-bar';
        searchBar.innerHTML = `
            <div class="search-input-wrapper">
                <span class="search-icon">🔍</span>
                <input 
                    type="text" 
                    id="nodus-cards-search" 
                    class="nodus-search-input" 
                    placeholder="${_t('filter.search')}"
                    value="${this.searchQuery}"
                />
            </div>
            <button class="filter-btn ${this.filtersVisible ? 'active' : ''}" id="nodus-filters-btn">
                <span>${this.filtersVisible ? '🔼' : '🔽'}</span> ${_t('filter.filters')}
            </button>
        `;
        
        // Filter panel
        const filterPanel = this.createFilterPanel();
        
        wrapper.appendChild(searchBar);
        wrapper.appendChild(filterPanel);
        
        return wrapper;
    },
    
    /**
     * Create filter panel
     */
    createFilterPanel() {
        const panel = document.createElement('div');
        panel.className = `nodus-filter-panel ${this.filtersVisible ? 'visible' : ''}`;
        panel.id = 'nodus-filter-panel';
        
        // Get all unique platforms and tags
        const platforms = this.getUniquePlatforms();
        const tags = this.getUniqueTags();
        
        panel.innerHTML = `
            <div class="filter-section">
                <label class="filter-label">Platform:</label>
                <select class="filter-select" id="filter-platform">
                    <option value="all" ${this.filters.platform === 'all' ? 'selected' : ''}>${_t('filter.allplatforms')}</option>
                    ${platforms.map(p => `
                        <option value="${p}" ${this.filters.platform === p ? 'selected' : ''}>
                            ${p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div class="filter-section">
                <label class="filter-label">Date Range:</label>
                <select class="filter-select" id="filter-date">
                    <option value="all" ${this.filters.dateRange === 'all' ? 'selected' : ''}>${_t('filter.alltime')}</option>
                    <option value="today" ${this.filters.dateRange === 'today' ? 'selected' : ''}>${_t('filter.today')}</option>
                    <option value="week" ${this.filters.dateRange === 'week' ? 'selected' : ''}>${_t('filter.thisweek')}</option>
                    <option value="month" ${this.filters.dateRange === 'month' ? 'selected' : ''}>${_t('filter.thismonth')}</option>
                </select>
            </div>
            
            <div class="filter-section filter-tags">
                <label class="filter-label">Tags:</label>
                <div class="filter-tags-list" id="filter-tags-list">
                    ${tags.length > 0 ? tags.map(tag => `
                        <label class="filter-tag-item">
                            <input type="checkbox" value="${tag}" ${this.filters.tags.includes(tag) ? 'checked' : ''}>
                            <span style="background: ${this.getTagColor(tag)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${tag}</span>
                        </label>
                    `).join('') : `<span class="no-tags">${_t('filter.notags')}</span>`}
                </div>
            </div>
            
            <div class="filter-actions">
                <button class="filter-clear-btn" id="filter-clear">${_t('filter.clear')}</button>
            </div>
        `;
        
        return panel;
    },
    
    /**
     * Create queue tabs - Dynamic based on column layout
     */
    createQueueTabs() {
        const queueCounts = {
            quick: this.allIdeas.quick.length,
            default: this.allIdeas.default.length,
            custom1: this.allIdeas.custom1.length,
            custom2: this.allIdeas.custom2?.length || 0,
            custom3: this.allIdeas.custom3?.length || 0,
            custom4: this.allIdeas.custom4?.length || 0
        };
        
        const t = (key) => window.NodusI18n ? window.NodusI18n.t(key) : key;
        
        const allQueues = [
            { key: 'quick', name: t('queue.quick'), color: '#fbbf24', count: queueCounts.quick, tier: 'free' },
            { key: 'default', name: t('queue.default'), color: '#10b981', count: queueCounts.default, tier: 'free' },
            { key: 'custom1', name: t('queue.f1'), color: '#3b82f6', count: queueCounts.custom1, tier: 'free' },
            { key: 'custom2', name: t('queue.f2'), color: '#8b5cf6', count: queueCounts.custom2 || 0, tier: 'pro' },
            { key: 'custom3', name: t('queue.f3'), color: '#ec4899', count: queueCounts.custom3 || 0, tier: 'pro' },
            { key: 'custom4', name: t('queue.f4'), color: '#f97316', count: queueCounts.custom4 || 0, tier: 'pro' }
        ];
        
        // ✅ NOVO SELETOR DE FILAS - IGUAL AO PROTÓTIPO HTML
        const isPro = window.NodusLicense && window.NodusLicense.isPro();
        const availableQueues = allQueues;
        
        // Container principal
        const container = document.createElement('div');
        container.className = 'queue-selector-container-new';
        
        // Seletor de filas
        const selector = document.createElement('div');
        selector.className = 'queue-selector-new';
        
        // Determinar quantas filas ativar baseado no grid (igual ao HTML)
        const filasParaAtivar = this.columnLayout;
        
        // Filtrar filas disponíveis baseado na licença
        const botoesDisponiveis = availableQueues.filter((queue, index) => {
            if (!isPro && index >= 3) return false;
            return true;
        });
        
        // Encontrar índice da fila atual entre os disponíveis
        const indiceBotaoAtual = botoesDisponiveis.findIndex(q => q.key === this.currentQueue);
        const indiceValido = indiceBotaoAtual >= 0 ? indiceBotaoAtual : 0;
        
        // Calcular seleção múltipla (igual ao HTML)
        const maxBotoesDisponiveis = botoesDisponiveis.length;
        const botoesParaAtivar = Math.min(filasParaAtivar, maxBotoesDisponiveis);
        
        let startIndex = Math.max(0, indiceValido - Math.floor((botoesParaAtivar - 1) / 2));
        let endIndex = startIndex + botoesParaAtivar - 1;
        
        if (endIndex >= maxBotoesDisponiveis) {
            endIndex = maxBotoesDisponiveis - 1;
            startIndex = Math.max(0, endIndex - botoesParaAtivar + 1);
        }
        
        // HTML com setas de navegação
        let html = `
            <button class="queue-nav-btn" id="queue-prev-btn">‹</button>
            <div class="queue-buttons-new" id="queueButtonsNew">
        `;
        
        // Criar TODOS os botões (sem diamantes!)
        availableQueues.forEach((queue, index) => {
            const isDisabled = !isPro && index >= 3;
            
            // Verificar se está no range ativo (baseado no grid)
            const indexNosDisponiveis = botoesDisponiveis.findIndex(q => q.key === queue.key);
            const isActive = !isDisabled && indexNosDisponiveis >= startIndex && indexNosDisponiveis <= endIndex;
            
            // Cores do protótipo
            let queueColor = queue.color;
            if (queue.key === 'quick') queueColor = '#fbbf24';
            else if (queue.key === 'default') queueColor = '#3b82f6';
            else if (queue.key === 'custom1') queueColor = '#10b981';
            else if (queue.key === 'custom2') queueColor = '#8b5cf6';
            else if (queue.key === 'custom3') queueColor = '#f59e0b';
            else if (queue.key === 'custom4') queueColor = '#ef4444';
            
            // SEM DIAMANTE - apenas 🔒 para desabilitados
            html += `
                <button class="queue-button-new ${isActive ? 'active' : ''}" 
                        data-queue="${queue.key}" 
                        data-color="${queueColor}"
                        data-index="${index}"
                        ${isDisabled ? 'disabled' : ''}>
                    ${queue.name}${isDisabled ? ' 🔒' : ''}
                </button>
            `;
        });
        
        html += `
                <div class="queue-selection-indicator-new" id="indicatorNew"></div>
            </div>
            <button class="queue-nav-btn" id="queue-next-btn">›</button>
        `;
        
        selector.innerHTML = html;
        container.appendChild(selector);
        
        // Aplicar estilos dinâmicos aos botões
        setTimeout(() => {
            const buttons = container.querySelectorAll('.queue-button-new');
            buttons.forEach((btn, idx) => {
                const color = btn.dataset.color;
                
                if (btn.disabled) {
                    // Cores escuras para filas desabilitadas
                    let darkColor = '#4a4d5a';
                    if (color === '#fbbf24') darkColor = '#78532b';
                    else if (color === '#3b82f6') darkColor = '#1e3a66';
                    else if (color === '#10b981') darkColor = '#0d5b47';
                    else if (color === '#8b5cf6') darkColor = '#4c2970';
                    else if (color === '#f59e0b') darkColor = '#7a4d0f';
                    else if (color === '#ef4444') darkColor = '#7a1f1f';
                    
                    btn.style.background = `linear-gradient(135deg, ${darkColor} 0%, ${darkColor}dd 100%)`;
                    btn.style.borderColor = `${darkColor}50`;
                } else {
                    // Cores vibrantes para filas habilitadas
                    const darkerColor = this.darkenColor(color, 20);
                    btn.style.background = `linear-gradient(135deg, ${color} 0%, ${darkerColor} 100%)`;
                    btn.style.borderColor = `${color}50`;
                    
                    if (btn.classList.contains('active')) {
                        const pressedColor = this.darkenColor(color, 40);
                        btn.style.background = `linear-gradient(135deg, ${pressedColor} 0%, ${this.darkenColor(pressedColor, 20)} 100%)`;
                        btn.style.transform = 'translateY(1px)';
                        btn.style.boxShadow = `inset 0 2px 4px rgba(0, 0, 0, 0.5)`;
                    }
                }
            });
            
            this.updateShadowIndicator(container);
        }, 50);
        
        // Event handlers - usar referência global para evitar perda de contexto
        container.addEventListener('click', async (e) => {
            const button = e.target.closest('.queue-button-new');
            const prevBtn = e.target.closest('#queue-prev-btn');
            const nextBtn = e.target.closest('#queue-next-btn');
            
            if (button && !button.disabled) {
                const queueKey = button.dataset.queue;
                NodusDashboardCards.currentQueue = queueKey;
                await NodusDashboardCards.loadIdeas();
                const contentContainer = document.getElementById('nodus-dashboard-content');
                if (contentContainer) {
                    await NodusDashboardCards.render(contentContainer);
                }
            }
            
            // Navegação com setas
            if (prevBtn || nextBtn) {
                const botoesHabilitados = Array.from(container.querySelectorAll('.queue-button-new:not(:disabled)'));
                const botaoAtual = container.querySelector('.queue-button-new.active');
                
                if (botoesHabilitados.length === 0) return;
                
                let indexAtual = botoesHabilitados.indexOf(botaoAtual);
                if (indexAtual === -1) indexAtual = 0;
                
                let novoIndex;
                if (prevBtn) {
                    novoIndex = indexAtual > 0 ? indexAtual - 1 : botoesHabilitados.length - 1;
                } else {
                    novoIndex = indexAtual < botoesHabilitados.length - 1 ? indexAtual + 1 : 0;
                }
                
                const novoBotao = botoesHabilitados[novoIndex];
                if (novoBotao) {
                    const queueKey = novoBotao.dataset.queue;
                    NodusDashboardCards.currentQueue = queueKey;
                    await NodusDashboardCards.loadIdeas();
                    const contentContainer = document.getElementById('nodus-dashboard-content');
                    if (contentContainer) {
                        await NodusDashboardCards.render(contentContainer);
                    }
                }
            }
        });
        
        return container;
    },
    
    /**
     * Create toolbar with column selector and bulk actions
     */
    createToolbar() {
        const filteredCount = this.getFilteredIdeas().length;
        
        const toolbar = document.createElement('div');
        toolbar.className = 'nodus-toolbar';
        toolbar.innerHTML = `
            <div class="toolbar-center" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="flex: 1;"></div>
                <div class="column-selector">
                    <span class="grid-label">⊞ ${_t('grid.label')}</span>
                    <button class="column-btn ${this.columnLayout === 1 ? 'active' : ''}" data-columns="1" title="${_t('tooltip.column1')}">
                        <span class="col-icon">▐</span>
                    </button>
                    <button class="column-btn ${this.columnLayout === 2 ? 'active' : ''}" data-columns="2" title="${_t('tooltip.column2')}">
                        <span class="col-icon">▐▐</span>
                    </button>
                    <button class="column-btn ${this.columnLayout === 3 ? 'active' : ''}" data-columns="3" title="${_t('tooltip.column3')}">
                        <span class="col-icon">▐▐▐</span>
                    </button>
                </div>
                <div style="flex: 1; display: flex; justify-content: flex-end;">
                    ${!window.NodusLicense?.isPro() ? `
                    <button id="header-upgrade-btn" title="Abrir Conta e Plano" style="
                        padding: 4px 8px;
                        background: rgba(251, 191, 36, 0.1);
                        border: 1px solid rgba(251, 191, 36, 0.3);
                        border-radius: 4px;
                        color: #fbbf24;
                        font-size: 10px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        PRO
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Adicionar linha separada para "Showing" com indicador de capacidade
        const showingBar = document.createElement('div');
        showingBar.className = 'nodus-showing-bar';
        
        // Calcular cor do contador baseado na capacidade (apenas para Quick Queue)
        let countColor = '#9ca3af'; // cinza padrão
        let warningMessage = '';
        
        if (this.currentQueue === 'quick') {
            if (filteredCount >= 50) {
                countColor = '#ef4444'; // vermelho
                warningMessage = '⚠️ Limite atingido! Novas ideias vão sobrescrever as mais antigas';
            } else if (filteredCount >= 45) {
                countColor = '#fbbf24'; // amarelo
                warningMessage = '⚠️ Perto do limite! Ideias serão sobrescritas em breve';
            }
        }
        
        showingBar.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span class="showing-text" style="color: ${countColor};">
                    ${_t('queue.showing')}: ${this.getQueueDisplayName()} (${filteredCount} ${_t('queue.ideas')})
                </span>
                <button 
                    id="clear-queue-btn" 
                    class="clear-queue-btn" 
                    title="${_t('queue.clearqueue')}"
                    style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; gap: 6px;">
                    🗑️ ${_t('queue.clearqueue')}
                </button>
            </div>
            ${warningMessage ? `
                <div style="margin-top: 8px; padding: 8px 12px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 6px; font-size: 12px; color: #fbbf24; display: flex; align-items: center; gap: 8px;">
                    <span>${warningMessage}</span>
                </div>
            ` : ''}
        `;
        
        const wrapper = document.createElement('div');
        wrapper.appendChild(toolbar);
        wrapper.appendChild(showingBar);
        return wrapper;
    },
    
    /**
     * Create cards grid
     */
    async createCardsGrid() {
        const grid = document.createElement('div');
        grid.className = `nodus-cards-grid columns-${this.columnLayout}`;
        grid.id = 'nodus-cards-grid';
        
        // ✅ VERIFICAR SE É QUEUE PRO E USUÁRIO É FREE
        const proQueues = ['custom2', 'custom3', 'custom4'];
        const isPro = window.NodusLicense && window.NodusLicense.isPro();
        
        if (!isPro && proQueues.includes(this.currentQueue)) {
            // Mostrar overlay PRO em vez dos cards
            grid.innerHTML = this.createProOverlay();
            return grid;
        }
        
        const ideas = this.getFilteredIdeas();
        
        // Load tag bindings once for all cards
        const { tagQueueBindings = {} } = await chrome.storage.local.get('tagQueueBindings');
        this.tagQueueBindings = tagQueueBindings;
        
        if (ideas.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div class="empty-title">${_t('empty.title')}</div>
                    <div class="empty-text">
                        ${this.searchQuery ? _t('empty.trydifferent') : _t('empty.subtitle')}
                    </div>
                </div>
            `;
        } else {
            // ✨ IMPORTANTE: Atualizar tracking ANTES de renderizar
            // para que apenas cards REALMENTE NOVOS animem
            const currentIds = new Set(ideas.map(idea => idea.id));
            
            // Renderizar cards
            ideas.forEach(idea => {
                const card = this.createIdeaCard(idea);
                grid.appendChild(card);
            });
            
            // Atualizar tracking para próxima renderização
            this.previousIdeaIds = currentIds;
            
            // Setup interactive tags after rendering
            setTimeout(() => this.setupInteractiveTags(), 10);
            
            // Atualizar contadores de attachments de forma assíncrona
            const self = this; // Preservar contexto para setTimeout
            setTimeout(async () => {
                const buttons = grid.querySelectorAll('.card-attachment-btn');
                for (const btn of buttons) {
                    const card = btn.closest('[data-idea-id]');
                    if (card) {
                        const ideaId = card.dataset.ideaId;
                        const count = await self.getAttachmentCount(ideaId);
                        btn.textContent = `📎 ${count}x`;
                        btn.dataset.attachmentCount = count;
                        
                        // Atualizar tooltip com lista de arquivos
                        if (count > 0 && window.NodusAttachmentsDB) {
                            const attachments = await window.NodusAttachmentsDB.getAttachmentsByIdeaId(ideaId);
                            const fileList = attachments.map(att => `• ${att.fileName}`).join('\n');
                            btn.title = `Attachments (${count}):\n${fileList}`;
                            btn.classList.add('has-files');
                            btn.classList.remove('has-alert');
                        } else {
                            btn.title = 'Manage attachments';
                            btn.classList.remove('has-files');
                        }
                    }
                }
            }, 100);
        }
        
        return grid;
    },
    
    /**
     * Create PRO overlay for locked queues
     */
    createProOverlay() {
        const _t = (key) => window.NodusI18n?.t(key) || key;
        
        const queueNames = {
            'custom2': 'Q2',
            'custom3': 'Q3', 
            'custom4': 'Q4'
        };
        
        const queueColors = {
            'custom2': '#8b5cf6',
            'custom3': '#ec4899',
            'custom4': '#f97316'
        };
        
        const queueName = queueNames[this.currentQueue] || this.currentQueue;
        const queueColor = queueColors[this.currentQueue] || '#8b5cf6';
        
        return `
            <div class="pro-overlay" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 24px 20px;
                text-align: center;
                min-height: 280px;
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%);
                border: 1px dashed rgba(139, 92, 246, 0.3);
                border-radius: 12px;
                margin: 10px;
            ">
                <div style="font-size: 36px; margin-bottom: 10px;">👑</div>
                <h2 style="
                    color: ${queueColor};
                    font-size: 18px;
                    font-weight: 700;
                    margin: 0 0 6px 0;
                ">
                    ${queueName} - PRO Queue
                </h2>
                <p style="
                    color: #94a3b8;
                    font-size: 12px;
                    margin: 0 0 16px 0;
                    max-width: 280px;
                    line-height: 1.5;
                ">
                    Unlock additional queues to organize your ideas better. PRO users get 6 queues instead of 3!
                </p>
                
                <div style="
                    background: rgba(30, 41, 59, 0.6);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-bottom: 16px;
                    text-align: left;
                    width: 100%;
                    max-width: 240px;
                ">
                    <div style="color: #10b981; font-weight: 600; margin-bottom: 8px; font-size: 11px;">
                        ✨ PRO Benefits:
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #e2e8f0;">
                        <div>✅ 6 queues (instead of 3)</div>
                        <div>✅ Unlimited chains</div>
                        <div>✅ Export to HTML & DOCX</div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
                    <button id="pro-overlay-upgrade" style="
                        padding: 10px 20px;
                        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                        border: none;
                        border-radius: 6px;
                        color: white;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                    ">
                        👑 Upgrade to PRO
                    </button>
                    <button id="pro-overlay-activate" style="
                        padding: 10px 16px;
                        background: rgba(59, 130, 246, 0.15);
                        border: 1px solid rgba(59, 130, 246, 0.3);
                        border-radius: 6px;
                        color: #60a5fa;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                    ">
                        ✉️ Activate with Email
                    </button>
                </div>
                
                <div style="
                    margin-top: 12px;
                    font-size: 11px;
                    color: #fbbf24;
                ">
                    💡 $4/mo or $25/year
                </div>
            </div>
        `;
    },
    
    /**
     * Create individual idea card
     */
    createIdeaCard(idea) {
        const card = document.createElement('div');
        
        // Check if this is a new card (not in previous render)
        const isNewCard = !this.previousIdeaIds.has(idea.id);
        
        // Determinar fila atual do card
        const queueName = idea.queue ? idea.queue.replace('ideas_queue_', '') : 'default';
        
        // Base classes: captureMethod E queue
        card.className = `nodus-idea-card card-${idea.captureMethod || 'manual'} card-queue-${queueName}`;
        
        // Add animation class if it's a new card
        if (isNewCard) {
            card.classList.add(`card-animation-${this.cardAnimation}`);
        }
        
        card.dataset.ideaId = idea.id;
        card.dataset.queue = idea.queue;
        
        // Grid II/III/IV: Posicionar cards por fila usando grid-column com wrap
        if (this.columnLayout > 1) {
            const queueColumnMap = {
                'quick': 1,
                'default': 2,
                'custom1': 3,
                'custom2': 4,
                'custom3': 5,
                'custom4': 6
            };
            const baseColumn = queueColumnMap[queueName] || 2;
            // Faz wrap para respeitar o número de colunas do grid atual
            const columnIndex = ((baseColumn - 1) % this.columnLayout) + 1;
            card.style.gridColumn = columnIndex;
        }
        
        // Platform icon
        const platformIcons = {
            'ChatGPT': '🤖',
            'Claude': '🤖',
            'Gemini': '🤖',
            'Perplexity': '🤖',
            'Copilot': '🤖',
            'Grok': '🤖'
        };
        
        const platformIcon = platformIcons[idea.source] || '🤖';
        
        // Format date
        const date = new Date(idea.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        // Renderizar Markdown como HTML
        const questionHtml = this.markdownToHtml(idea.question || 'No question');
        const answerHtml = this.markdownToHtml(idea.text || 'No answer');
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-platform">
                    <span class="platform-icon">${platformIcon}</span>
                    <span class="platform-name">${idea.source}</span>
                </div>
                <div class="card-date">${formattedDate}</div>
            </div>
            
            <div class="card-title">${this.escapeHtml(idea.title)}</div>
            
            <div class="card-content-scrollable collapsed" data-idea-id="${idea.id}">
                <div class="card-question-full">
                    <div class="section-label">${_t('card.question')}</div>
                    <div class="markdown-content">${questionHtml}</div>
                </div>
                ${(idea.images && idea.images.length > 0) ? `
                <div class="card-images-section">
                    <div class="section-label">🖼️ Imagens</div>
                    <div class="card-images-grid">
                        ${idea.images.map(src => `<a href="${this.escapeHtml(src)}" target="_blank" rel="noopener"><img src="${this.escapeHtml(src)}" class="card-image-thumb" loading="lazy" onerror="this.closest('a').style.display='none'" /></a>`).join('')}
                    </div>
                </div>` : ''}
                <div class="card-answer-full">
                    <div class="section-label">${_t('card.answer')}</div>
                    <div class="markdown-content">${answerHtml}</div>
                </div>
                <div class="expand-fade"></div>
            </div>

            <button class="card-expand-btn" data-action="toggle-expand" data-idea-id="${idea.id}">
                <span class="expand-icon">▼</span> ${_t('card.seemore')}
            </button>
            
            <div class="card-tags" data-card-id="${idea.id}">
                ${this.renderCardTags(idea.tags, idea.id, this.tagQueueBindings || {})}
            </div>
            
            <div class="card-meta">
                <span class="injection-count" title="${_t('tooltip.injectedtimes').replace('{n}', idea.injectionCount || 0)}">
                    💉 ${idea.injectionCount || 0}x
                </span>
                <a href="${idea.sourceUrl}" target="_blank" class="source-link" title="${_t('tooltip.opensource')}">
                    🔗 src
                </a>
                <button class="card-attachment-btn ${idea.hasAttachment ? 'has-files' : ''} ${idea.hasGeneratedFile && !idea.hasAttachment ? 'has-alert' : ''}" 
                        data-action="attachments"
                        data-attachment-count="0"
                        data-idea-id="${idea.id}"
                        title="${idea.hasGeneratedFile && !idea.hasAttachment ? _t('tooltip.filedetected') : _t('tooltip.manageattachments')}">
                    📎 0x
                </button>
                <button class="card-note-btn ${idea.notes ? 'has-notes' : ''}" 
                        data-action="notes"
                        title="${idea.notes ? this.escapeHtml(idea.notes) : _t('tooltip.addnotes')}">
                    📝
                </button>
            </div>
            
            <div class="card-actions">
                <div class="card-actions-row-1">
                    <div class="inject-btn inject-btn-with-menu">
                        <button class="inject-btn-main" data-action="inject-full" title="${_t('tooltip.injectfull')}">
                            <span class="inject-emoji">▶️</span>
                            <span class="inject-text">${_t('button.injectfull')}</span>
                        </button>
                        <div class="inject-btn-divider"></div>
                        <button class="inject-btn-mode" data-action="toggle-inject-mode" title="${_t('tooltip.toggleinjectmode')}">
                            <span class="inject-mode-arrow">▼</span>
                            <span class="inject-mode-number">1</span>
                        </button>
                        
                        <!-- Inject Mode Dropdown Menu -->
                        <div class="inject-mode-menu" id="inject-mode-menu-${idea.id}" style="display: none;">
                            <div class="mode-option active" data-mode="formatted">
                                <span class="mode-number">1</span>
                                <span class="mode-icon">🎨</span>
                                <div class="mode-info">
                                    <div class="mode-name">Formatted HTML</div>
                                    <div class="mode-desc">Headers, bold, tree structure</div>
                                </div>
                                <span class="mode-check">✓</span>
                            </div>
                            
                            <div class="mode-option" data-mode="markdown">
                                <span class="mode-number">2</span>
                                <span class="mode-icon">📝</span>
                                <div class="mode-info">
                                    <div class="mode-name">Markdown</div>
                                    <div class="mode-desc">Mantém sintaxe #, **, \`</div>
                                </div>
                                <span class="mode-check"></span>
                            </div>
                            
                            <div class="mode-option" data-mode="plaintext">
                                <span class="mode-number">3</span>
                                <span class="mode-icon">📄</span>
                                <div class="mode-info">
                                    <div class="mode-name">Plain Text</div>
                                    <div class="mode-desc">Remove toda formatação</div>
                                </div>
                                <span class="mode-check"></span>
                            </div>
                        </div>
                    </div>
                    <div class="inject-btn">
                        <button class="inject-btn-main" data-action="inject-answer" title="${_t('tooltip.injectanswer')}">
                            <span class="inject-emoji">📝</span>
                            <span class="inject-text">${_t('button.injectanswer')}</span>
                        </button>
                        <div class="inject-btn-divider"></div>
                        <button class="inject-btn-mode" data-action="toggle-inject-mode" title="${_t('tooltip.toggleinjectmode')}">
                            <span class="inject-mode-arrow">▼</span>
                            <span class="inject-mode-number">1</span>
                        </button>
                    </div>
                </div>
                
                <div class="card-actions-row-2">
                    <button class="card-action-btn" data-action="copy" title="${_t('tooltip.copytoclipboard')}">
                        📋 ${_t('chain.copy')}
                    </button>
                    <button class="card-action-btn" data-action="edit" title="${_t('tooltip.editidea')}">
                        ✏️ ${_t('btn.edit')}
                    </button>
                    <button class="card-action-btn-confirm danger" data-action="delete-confirm" title="${_t('tooltip.confirmdelete')}" style="display: none;">
                        ✓
                    </button>
                    <button class="card-action-btn-cancel" data-action="delete-cancel" title="${_t('tooltip.cancel')}" style="display: none;">
                        ✗
                    </button>
                    <button class="card-action-btn danger" data-action="delete" title="${_t('tooltip.deleteidea')}">
                        🗑️ ${_t('btn.delete')}
                    </button>
                </div>
            </div>
        `;
        
        return card;
    },
    
    /**
     * Convert Markdown to HTML for rendering in cards
     */
    markdownToHtml(markdown) {
        if (!markdown) return '';
        
        // Escapar HTML primeiro
        let html = markdown
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code inline
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Horizontal rules
        html = html.replace(/^---$/gim, '<hr>');
        
        // Listas não ordenadas (tree structure) - método seguro
        // Processar linha por linha para evitar regex Unicode
        html = html.split('\n').map(line => {
            if (line.startsWith('├─ ') || line.startsWith('└─ ')) {
                const content = line.substring(3);
                return `<li class="tree-item">${content}</li>`;
            }
            return line;
        }).join('\n');
        
        // Wrap tree items em <ul>
        html = html.replace(/(<li class="tree-item">.*<\/li>\n?)+/g, '<ul class="tree-list">$&</ul>');
        
        // Quebras de linha — usar <br> em vez de </p><p> para evitar
        // HTML inválido quando há elementos de bloco (h2, pre, ul) dentro
        html = html.replace(/\n\n/g, '<br><br>');
        html = html.replace(/\n/g, '<br>');

        // Limpar <br> redundantes logo após/antes de elementos de bloco
        html = html.replace(/(<\/(?:h[1-4]|pre|ul|ol|li|hr)>)<br>/g, '$1');
        html = html.replace(/<br>(<(?:h[1-4]|pre|ul|ol|li|hr)[^>]*>)/g, '$1');
        
        return html;
    },
    
    /**
     * Get attachment count for an idea
     */
    async getAttachmentCount(ideaId) {
        try {
            if (!window.NodusAttachmentsDB) return 0;
            const attachments = await window.NodusAttachmentsDB.getAttachmentsByIdeaId(ideaId);
            return attachments.length;
        } catch (error) {
            console.error('[Dashboard] Error getting attachment count:', error);
            return 0;
        }
    },
    
    /**
     * Strip Markdown formatting to plain text
     * For inject mode 3 (Plain Text)
     */
    stripMarkdown(markdown) {
        if (!markdown) return '';
        
        let text = markdown;
        
        // Remove code blocks
        text = text.replace(/```[\s\S]*?```/g, (match) => {
            return match.replace(/```/g, '').trim();
        });
        
        // Remove headers
        text = text.replace(/^#{1,6}\s+/gm, '');
        
        // Remove bold/italic
        text = text.replace(/\*\*\*/g, '');
        text = text.replace(/\*\*/g, '');
        text = text.replace(/\*/g, '');
        text = text.replace(/___/g, '');
        text = text.replace(/__/g, '');
        text = text.replace(/_/g, '');
        
        // Remove code inline
        text = text.replace(/`([^`]+)`/g, '$1');
        
        // Remove horizontal rules
        text = text.replace(/^---$/gm, '');
        
        // Remove list markers (mantém tree structure se existir)
        text = text.replace(/^[*+-]\s+/gm, '');
        text = text.replace(/^\d+\.\s+/gm, '');
        
        // Limpar múltiplas quebras de linha
        text = text.replace(/\n{3,}/g, '\n\n');
        
        return text.trim();
    },
    
    /**
     * Get filtered ideas based on current queue and search
     */
    getFilteredIdeas() {
        
        let ideas = [];
        
        // NOVA LÓGICA: Grid I mostra 1 fila, Grid II+ mostra múltiplas
        if (this.columnLayout === 1) {
            // Grid I: Mostrar apenas fila selecionada
            ideas = this.allIdeas[this.currentQueue]?.map(i => ({...i, queue: `ideas_queue_${this.currentQueue}`})) || [];
        } else {
            // Grid II/III/IV: Mostrar múltiplas filas CENTRALIZADAS no currentQueue
            const queues = ['quick', 'default', 'custom1', 'custom2', 'custom3', 'custom4'];
            
            // Encontrar índice da fila atual
            let currentIndex = queues.indexOf(this.currentQueue);
            if (currentIndex === -1) currentIndex = 0;
            
            // Calcular quantas filas mostrar
            const visibleQueuesCount = this.columnLayout === 2 ? 2 : this.columnLayout === 3 ? 3 : 6;
            
            // Calcular range centralizado no currentQueue
            let startIndex = Math.max(0, currentIndex - Math.floor((visibleQueuesCount - 1) / 2));
            let endIndex = startIndex + visibleQueuesCount;
            
            // Ajustar se passar do limite
            if (endIndex > queues.length) {
                endIndex = queues.length;
                startIndex = Math.max(0, endIndex - visibleQueuesCount);
            }
            
            const visibleQueues = queues.slice(startIndex, endIndex);
            
            
            // Coletar ideas de todas as filas visíveis
            visibleQueues.forEach(queueKey => {
                const queueIdeas = this.allIdeas[queueKey]?.map(i => ({
                    ...i,
                    queue: `ideas_queue_${queueKey}`,
                    _queueKey: queueKey  // Para sorting
                })) || [];
                ideas = ideas.concat(queueIdeas);
            });
        }
        
        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            ideas = ideas.filter(idea => 
                idea.title?.toLowerCase().includes(query) ||
                idea.text?.toLowerCase().includes(query) ||
                idea.question?.toLowerCase().includes(query) ||
                idea.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }
        
        // Apply platform filter
        if (this.filters.platform !== 'all') {
            ideas = ideas.filter(idea => idea.platform === this.filters.platform);
        }
        
        // Apply tags filter
        if (this.filters.tags.length > 0) {
            ideas = ideas.filter(idea => 
                idea.tags?.some(tag => this.filters.tags.includes(tag))
            );
        }
        
        // Apply date range filter
        if (this.filters.dateRange !== 'all') {
            const now = new Date();
            const startOfToday = new Date(now.setHours(0, 0, 0, 0));
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            ideas = ideas.filter(idea => {
                const ideaDate = new Date(idea.date);
                switch(this.filters.dateRange) {
                    case 'today':
                        return ideaDate >= startOfToday;
                    case 'week':
                        return ideaDate >= startOfWeek;
                    case 'month':
                        return ideaDate >= startOfMonth;
                    default:
                        return true;
                }
            });
        }
        
        // Sort: primeiro por fila, depois por data
        ideas.sort((a, b) => {
            // Em multi-queue (Grid II+), ordenar por fila primeiro
            if (this.columnLayout > 1 && a._queueKey && b._queueKey) {
                const queueOrder = ['quick', 'default', 'custom1', 'custom2', 'custom3', 'custom4'];
                const queueDiff = queueOrder.indexOf(a._queueKey) - queueOrder.indexOf(b._queueKey);
                if (queueDiff !== 0) return queueDiff;
            }
            // Dentro da mesma fila, ordenar por data (newest first)
            return new Date(b.date) - new Date(a.date);
        });
        
        return ideas;
    },
    
    /**
     * Get queue display name
     */
    getQueueDisplayName() {
        const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
        const names = {
            all:     _t('queue.all',     'All Queues'),
            quick:   _t('queue.quick',   'Quick'),
            default: _t('queue.default', 'Default'),
            custom1: 'Q1',
            custom2: 'Q2',
            custom3: 'Q3',
            custom4: 'Q4'
        };
        return names[this.currentQueue] || this.currentQueue;
    },

    /**
     * Custom confirm dialog (replaces native confirm() which uses OS language)
     */
    showCustomConfirm(message) {
        return new Promise((resolve) => {
            const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
            overlay.innerHTML = `
                <div style="background:#1a1f29;border:1px solid #2d3748;border-radius:12px;padding:24px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                    <div style="color:#e2e8f0;font-size:14px;line-height:1.6;margin-bottom:20px;white-space:pre-line;">${message}</div>
                    <div style="display:flex;gap:8px;justify-content:flex-end;">
                        <button id="nodus-confirm-cancel" style="padding:8px 16px;background:#374151;border:none;border-radius:6px;color:#9ca3af;font-size:13px;font-weight:600;cursor:pointer;">${_t('btn.cancel', 'Cancel')}</button>
                        <button id="nodus-confirm-ok" style="padding:8px 16px;background:#ef4444;border:none;border-radius:6px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#nodus-confirm-ok').addEventListener('click', () => { overlay.remove(); resolve(true); });
            overlay.querySelector('#nodus-confirm-cancel').addEventListener('click', () => { overlay.remove(); resolve(false); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
        });
    },
    
    /**
     * Get unique platforms from all ideas
     */
    getUniquePlatforms() {
        const platforms = new Set();
        Object.values(this.allIdeas).forEach(queue => {
            queue.forEach(idea => {
                if (idea.platform) platforms.add(idea.platform);
            });
        });
        return Array.from(platforms).sort();
    },
    
    /**
     * Get unique tags from all ideas
     */
    getUniqueTags() {
        const tags = new Set();
        Object.values(this.allIdeas).forEach(queue => {
            queue.forEach(idea => {
                if (idea.tags) {
                    idea.tags.forEach(tag => tags.add(tag));
                }
            });
        });
        return Array.from(tags).sort();
    },
    
    /**
     * Attach event listeners
     */
    attachEventListeners(container) {
        // Search input
        const searchInput = container.querySelector('#nodus-cards-search');
        searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.refreshGrid();
        });
        
        // Filters button
        const filtersBtn = container.querySelector('#nodus-filters-btn');
        filtersBtn?.addEventListener('click', () => {
            this.filtersVisible = !this.filtersVisible;
            const panel = container.querySelector('#nodus-filter-panel');
            const icon = filtersBtn.querySelector('span');
            
            if (this.filtersVisible) {
                panel?.classList.add('visible');
                filtersBtn.classList.add('active');
                icon.textContent = '🔼';
            } else {
                panel?.classList.remove('visible');
                filtersBtn.classList.remove('active');
                icon.textContent = '🔽';
            }
        });
        
        // Filter selects
        const platformSelect = container.querySelector('#filter-platform');
        platformSelect?.addEventListener('change', (e) => {
            this.filters.platform = e.target.value;
            this.refreshGrid();
        });
        
        const dateSelect = container.querySelector('#filter-date');
        dateSelect?.addEventListener('change', (e) => {
            this.filters.dateRange = e.target.value;
            this.refreshGrid();
        });
        
        // Filter tags checkboxes
        const tagCheckboxes = container.querySelectorAll('#filter-tags-list input[type="checkbox"]');
        tagCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const tag = e.target.value;
                if (e.target.checked) {
                    if (!this.filters.tags.includes(tag)) {
                        this.filters.tags.push(tag);
                    }
                } else {
                    this.filters.tags = this.filters.tags.filter(t => t !== tag);
                }
                this.refreshGrid();
            });
        });
        
        // Clear filters button
        const clearBtn = container.querySelector('#filter-clear');
        clearBtn?.addEventListener('click', () => {
            this.filters.platform = 'all';
            this.filters.tags = [];
            this.filters.dateRange = 'all';
            this.refreshView();
        });
        
        // Queue arrow navigation
        const prevBtn = container.querySelector('#queue-prev');
        const nextBtn = container.querySelector('#queue-next');
        
        const queues = ['quick', 'default', 'custom1', 'custom2', 'custom3', 'custom4'];
        const proQueues = ['custom2', 'custom3', 'custom4'];
        
        prevBtn?.addEventListener('click', () => {
            const currentIndex = queues.indexOf(this.currentQueue);
            if (currentIndex > 0) {
                this.currentQueue = queues[currentIndex - 1];
                this.refreshView();
            }
        });
        
        nextBtn?.addEventListener('click', () => {
            const isPro = window.NodusLicense && window.NodusLicense.isPro();
            const currentIndex = queues.indexOf(this.currentQueue);
            const nextQueue = queues[currentIndex + 1];
            
            // ✅ PERMITIR NAVEGAÇÃO - O OVERLAY INLINE SERÁ MOSTRADO NO GRID
            if (currentIndex < queues.length - 1) {
                this.currentQueue = nextQueue;
                this.refreshView();
            }
        });
        
        // Queue display buttons (clickable queue selectors)
        const queueDisplayBtns = container.querySelectorAll('.queue-display[data-queue]');
        queueDisplayBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const queueKey = btn.dataset.queue;
                if (queueKey && queueKey !== this.currentQueue) {
                    // ✅ VERIFICAR SE É QUEUE PRO E USUÁRIO É FREE
                    const proQueues = ['custom2', 'custom3', 'custom4'];
                    const isPro = window.NodusLicense && window.NodusLicense.isPro();
                    
                    if (!isPro && proQueues.includes(queueKey)) {
                        // Mostrar paywall mas ainda assim mudar para a tab (para mostrar overlay)
                        this.currentQueue = queueKey;
                        this.refreshView();
                        return;
                    }
                    
                    this.currentQueue = queueKey;
                    this.refreshView();
                }
            });
        });
        
        // ✅ PRO header button - abre Settings → Account
        const headerUpgradeBtn = container.querySelector('#header-upgrade-btn');
        if (headerUpgradeBtn) {
            headerUpgradeBtn.addEventListener('click', () => {
                if (window.NodusDashboard) {
                    window.NodusDashboard.openSettings();
                    setTimeout(() => {
                        const accountHeader = document.querySelector('[data-section="account"]');
                        if (accountHeader) accountHeader.click();
                    }, 300);
                }
            });
        }
        
        // ✅ PRO overlay buttons (filas Q2-Q4 bloqueadas)
        const proUpgradeBtn = container.querySelector('#pro-overlay-upgrade');
        if (proUpgradeBtn) {
            proUpgradeBtn.addEventListener('click', () => {
                // Abrir Settings → Account & Plan
                if (window.NodusDashboard) {
                    window.NodusDashboard.openSettings();
                    // Pequeno delay para abrir a seção Account
                    setTimeout(() => {
                        const accountHeader = document.querySelector('[data-section="account"]');
                        if (accountHeader) accountHeader.click();
                    }, 300);
                }
            });
        }
        
        const proActivateBtn = container.querySelector('#pro-overlay-activate');
        if (proActivateBtn) {
            proActivateBtn.addEventListener('click', () => {
                // Abrir Settings → Account & Plan
                if (window.NodusDashboard) {
                    window.NodusDashboard.openSettings();
                    setTimeout(() => {
                        const accountHeader = document.querySelector('[data-section="account"]');
                        if (accountHeader) accountHeader.click();
                    }, 300);
                }
            });
        }
        
        // Column selector
        const columnBtns = container.querySelectorAll('.column-btn');
        columnBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const columns = parseInt(btn.dataset.columns);
                await this.saveColumnLayout(columns);
                this.refreshView();
            });
        });
        
        // Clear queue button
        const clearQueueBtn = container.querySelector('#clear-queue-btn');
        if (clearQueueBtn) {
            clearQueueBtn.addEventListener('click', () => this.clearCurrentQueue());
        }
        
        // Card actions (só no Cards mode, não no Chains)
        // IMPORTANTE: Usar event delegation no container - só adicionar listener UMA VEZ
        if (!this._cardActionsListenerAdded) {
            
            container.addEventListener('click', (e) => {
                // Se estiver em chains-view, ignorar
                if (e.target.closest('#chains-view')) {
                    return;
                }
                
                // IMPORTANTE: Ignorar cliques em inline-attachment-item (tem listener próprio)
                if (e.target.closest('.inline-attachment-item')) {
                    return;
                }
                
                
                // Check if clicked on mode number
                const modeNumber = e.target.closest('.inject-mode-number');
                if (modeNumber) {
                    this.toggleInjectMode();
                    return;
                }
                
                const actionBtn = e.target.closest('.card-action-btn, .card-action-btn-confirm, .card-action-btn-cancel, .card-attachment-btn, .card-note-btn, .card-expand-btn, .inject-btn-main, .inject-btn-mode');
                
                
                if (actionBtn) {
                    const card = actionBtn.closest('.nodus-idea-card');
                    const ideaId = card.dataset.ideaId;
                    const queue = card.dataset.queue;
                    const action = actionBtn.dataset.action;
                    
                    
                    this.handleCardAction(action, ideaId, queue);
                } else {
                }
            });
            
            this._cardActionsListenerAdded = true;
        } else {
        }
    },
    
    /**
     * Handle card actions
     */
    async handleCardAction(action, ideaId, queue) {
        
        // Extrair nome da fila (queue vem como "ideas_queue_default")
        const queueName = queue ? queue.replace('ideas_queue_', '') : 'default';
        
        let idea = this.allIdeas[queueName]?.find(i => i.id === ideaId);
        
        // Se não encontrou na fila esperada, buscar em todas as filas
        if (!idea) {
            console.warn('[Dashboard] Idea not in expected queue, searching all queues...');
            for (const [qName, ideas] of Object.entries(this.allIdeas)) {
                idea = ideas.find(i => i.id === ideaId);
                if (idea) {
                    // Atualizar queueName para a fila correta
                    const actualQueueName = qName;
                    
                    // Executar ação com queueName correto
                    await this.executeCardAction(action, idea, actualQueueName);
                    return;
                }
            }
            
            console.error('[Dashboard] Idea not found in any queue:', ideaId);
            return;
        }
        
        await this.executeCardAction(action, idea, queueName);
    },
    
    /**
     * Execute card action
     */
    async executeCardAction(action, idea, queueName) {
        
        if (!idea) {
            console.error('[Dashboard Cards] ❌ Idea is null/undefined!');
            return;
        }
        
        switch(action) {
            case 'toggle-inject-mode':
                this.toggleInjectModeMenu(idea.id);
                break;
            case 'toggle-expand':
                this.toggleCardExpand(idea.id);
                break;
            case 'inject-full':
                await this.injectIdea(idea, 'full');
                break;
            case 'inject-answer':
                await this.injectIdea(idea, 'answer');
                break;
            case 'copy':
                await this.copyToClipboard(idea);
                break;
            case 'edit':
                this.editIdea(idea, queueName);
                break;
            case 'attachments':
                this.openAttachments(idea.id, queueName);
                break;
            case 'notes':
                this.editNotes(idea, queueName);
                break;
            case 'delete':
                this.showDeleteConfirmation(idea.id);
                break;
            case 'delete-confirm':
                await this.deleteIdea(idea.id, queueName);
                this.hideDeleteConfirmation(idea.id);
                break;
            case 'delete-cancel':
                this.hideDeleteConfirmation(idea.id);
                break;
            default:
                console.warn('[Dashboard Cards] ⚠️ Unknown action:', action);
        }
    },
    
    /**
     * Toggle inject mode dropdown menu
     */
    toggleInjectModeMenu(ideaId) {
        const menu = document.querySelector(`#inject-mode-menu-${ideaId}`);
        if (!menu) return;
        
        // Fechar todos os outros menus abertos
        document.querySelectorAll('.inject-mode-menu').forEach(m => {
            if (m.id !== `inject-mode-menu-${ideaId}`) {
                m.style.display = 'none';
            }
        });
        
        // Toggle este menu
        if (menu.style.display === 'none' || !menu.style.display) {
            // IMPORTANTE: Mover menu para o body para escapar do overflow do card
            if (menu.parentElement !== document.body) {
                document.body.appendChild(menu);
            }
            
            // Função para posicionar o menu
            const positionMenu = () => {
                const card = document.querySelector(`[data-idea-id="${ideaId}"]`);
                const button = card ? card.querySelector('.inject-btn-mode') : null;
                
                if (button) {
                    const rect = button.getBoundingClientRect();
                    
                    // Posicionar menu abaixo do botão
                    menu.style.position = 'fixed';
                    menu.style.top = `${rect.bottom + 4}px`;
                    menu.style.left = `${rect.left}px`;
                    menu.style.zIndex = '999999';
                } else {
                    // Se o botão não existe mais, fechar menu
                    menu.style.display = 'none';
                }
            };
            
            // Posicionar inicialmente
            positionMenu();
            
            menu.style.display = 'block';
            
            // Reposicionar quando o dashboard rolar
            const dashboardGrid = document.querySelector('.nodus-cards-grid');
            const onScroll = () => positionMenu();
            if (dashboardGrid) {
                dashboardGrid.addEventListener('scroll', onScroll);
            }
            
            // Adicionar listener para fechar ao clicar fora
            setTimeout(() => {
                const closeMenu = (e) => {
                    if (!menu.contains(e.target) && !e.target.closest('.inject-btn-mode')) {
                        menu.style.display = 'none';
                        document.removeEventListener('click', closeMenu);
                        // Remover listener de scroll
                        if (dashboardGrid) {
                            dashboardGrid.removeEventListener('scroll', onScroll);
                        }
                    }
                };
                document.addEventListener('click', closeMenu);
            }, 0);
            
            // Adicionar listeners nos mode-options se ainda não existem
            if (!menu.dataset.listenersAdded) {
                menu.querySelectorAll('.mode-option').forEach(option => {
                    option.addEventListener('click', async () => {
                        const mode = option.dataset.mode;
                        await this.setInjectMode(mode);
                        menu.style.display = 'none';
                        // Remover listener de scroll
                        if (dashboardGrid) {
                            dashboardGrid.removeEventListener('scroll', onScroll);
                        }
                    });
                });
                menu.dataset.listenersAdded = 'true';
            }
        } else {
            menu.style.display = 'none';
        }
    },
    
    /**
     * Set inject mode and update UI
     * @param {string} mode - 'formatted', 'markdown', or 'plaintext'
     * @param {boolean} showToast - Whether to show confirmation toast (default: true)
     */
    async setInjectMode(mode, showToast = true) {
        const modeMap = {
            'formatted': 1,
            'markdown': 2,
            'plaintext': 3
        };
        
        // Salvar no storage
        await chrome.storage.local.set({ injectMode: mode });
        
        
        // Atualizar todos os indicadores
        document.querySelectorAll('.inject-mode-number').forEach(indicator => {
            indicator.textContent = modeMap[mode];
        });
        
        // Atualizar checkmarks em todos os menus
        document.querySelectorAll('.inject-mode-menu').forEach(menu => {
            menu.querySelectorAll('.mode-option').forEach(option => {
                if (option.dataset.mode === mode) {
                    option.classList.add('active');
                    option.querySelector('.mode-check').textContent = '✓';
                } else {
                    option.classList.remove('active');
                    option.querySelector('.mode-check').textContent = '';
                }
            });
        });
        
        // Toast de confirmação (só quando usuário muda manualmente)
        if (showToast && window.NODUS_UI) {
            const modeNames = {
                'formatted': 'Formatted HTML',
                'markdown': 'Markdown',
                'plaintext': 'Plain Text'
            };
            window.NODUS_UI.showToast(`Inject mode: ${modeNames[mode]}`, 'success');
        }
    },
    
    /**
     * Load inject mode from storage and update UI
     */
    async loadInjectMode() {
        const { injectMode = 'formatted' } = await chrome.storage.local.get('injectMode');
        await this.setInjectMode(injectMode, false); // false = não mostrar toast ao carregar
    },
    
    /**
     * Toggle card expand/collapse
     */
    toggleCardExpand(ideaId) {
        const card = document.querySelector(`[data-idea-id="${ideaId}"]`);
        if (!card) return;
        
        const scrollableArea = card.querySelector('.card-content-scrollable');
        const expandBtn = card.querySelector('.card-expand-btn');
        const expandIcon = expandBtn?.querySelector('.expand-icon');
        
        if (!scrollableArea || !expandBtn) return;
        
        const isCollapsed = scrollableArea.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expandir
            scrollableArea.classList.remove('collapsed');
            scrollableArea.classList.add('expanded');
            expandIcon.textContent = '▲';
            expandBtn.querySelector('span:last-child').textContent = _t('card.seeless');
        } else {
            // Colapsar
            scrollableArea.classList.add('collapsed');
            scrollableArea.classList.remove('expanded');
            expandIcon.textContent = '▼';
            expandBtn.querySelector('span:last-child').textContent = _t('card.seemore');
        }
    },
    
    /**
     * Show inline delete confirmation buttons
     */
    showDeleteConfirmation(ideaId) {
        const card = document.querySelector(`[data-idea-id="${ideaId}"]`);
        if (!card) return;
        
        const btnDelete = card.querySelector('[data-action="delete"]');
        const btnConfirm = card.querySelector('[data-action="delete-confirm"]');
        const btnCancel = card.querySelector('[data-action="delete-cancel"]');
        
        if (btnDelete && btnConfirm && btnCancel) {
            btnDelete.style.display = 'none';
            btnConfirm.style.display = 'inline-flex';
            btnCancel.style.display = 'inline-flex';
        }
    },
    
    /**
     * Hide inline delete confirmation buttons
     */
    hideDeleteConfirmation(ideaId) {
        const card = document.querySelector(`[data-idea-id="${ideaId}"]`);
        if (!card) return;
        
        const btnDelete = card.querySelector('[data-action="delete"]');
        const btnConfirm = card.querySelector('[data-action="delete-confirm"]');
        const btnCancel = card.querySelector('[data-action="delete-cancel"]');
        
        if (btnDelete && btnConfirm && btnCancel) {
            btnDelete.style.display = 'inline-flex';
            btnConfirm.style.display = 'none';
            btnCancel.style.display = 'none';
        }
    },
    
    /**
     * Inject idea into current page
     */
    
    /**
     * Strip Markdown formatting from text (Mode 3: Plain Text)
     * Remove ALL Markdown syntax, leaving only clean text
     */
    stripMarkdown(text) {
        if (!text) return '';
        
        let plain = text;
        
        // Remove code blocks
        plain = plain.replace(/```[\s\S]*?```/g, (match) => {
            // Extrair código sem backticks
            return match.replace(/```/g, '').trim();
        });
        
        // Remove headers (# ## ###)
        plain = plain.replace(/^#{1,6}\s+/gm, '');
        
        // Remove bold (**text** ou __text__)
        plain = plain.replace(/\*\*(.+?)\*\*/g, '$1');
        plain = plain.replace(/__(.+?)__/g, '$1');
        
        // Remove italic (*text* ou _text_)
        plain = plain.replace(/\*(.+?)\*/g, '$1');
        plain = plain.replace(/_(.+?)_/g, '$1');
        
        // Remove inline code (`text`)
        plain = plain.replace(/`([^`]+)`/g, '$1');
        
        // Remove horizontal rules
        plain = plain.replace(/^---$/gm, '');
        
        // Remove list markers (mantém conteúdo)
        // Tree structure - remover com string literal ao invés de regex
        plain = plain.split('\n').map(line => {
            // Remover ├─ ou └─ do início da linha
            if (line.startsWith('├─ ') || line.startsWith('└─ ')) {
                return line.substring(3); // Remove primeiros 3 chars
            }
            return line;
        }).join('\n');
        plain = plain.replace(/^[-*+]\s+/gm, ''); // Unordered lists
        plain = plain.replace(/^\d+\.\s+/gm, ''); // Ordered lists
        
        // Remove links [text](url) - mantém text
        plain = plain.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        
        // Remove images ![alt](url)
        plain = plain.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
        
        // Remove blockquotes
        plain = plain.replace(/^>\s+/gm, '');
        
        // Remove excessive line breaks (max 2)
        plain = plain.replace(/\n{3,}/g, '\n\n');
        
        // Trim
        plain = plain.trim();
        
        return plain;
    },
    
    /**
     * Detect current platform based on URL
     */
    detectPlatform() {
        const url = window.location.href;
        if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'chatgpt';
        if (url.includes('claude.ai')) return 'claude';
        if (url.includes('gemini.google.com')) return 'gemini';
        if (url.includes('perplexity.ai')) return 'perplexity';
        if (url.includes('copilot.microsoft.com')) return 'copilot';
        if (url.includes('grok.x.com') || url.includes('x.com/i/grok')) return 'grok';
        if (url.includes('chat.deepseek.com')) return 'deepseek';
        return 'unknown';
    },
    
    async injectIdea(idea, mode) {
        // Get inject mode and settings from storage
        const storageData = await chrome.storage.local.get(['injectMode', 'settings']);
        const injectMode = storageData.injectMode || 'formatted';
        const settings = storageData.settings || { crossPlatformInject: false };
        
        // 🔒 VALIDAÇÃO CROSS-PLATFORM
        // Se crossPlatformInject está DESABILITADO, verificar se origem === destino
        if (!settings.crossPlatformInject) {
            // Pegar plataforma atual
            const currentPlatform = this.detectPlatform();
            const ideaPlatform = idea.platform;
            
            if (currentPlatform !== ideaPlatform) {
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast(
                        `🔒 Cross-Platform Inject desabilitado\nOrigem: ${ideaPlatform} → Destino: ${currentPlatform}\nHabilite nas Configurações ⚙️`,
                        'error'
                    );
                }
                return; // BLOQUEIA injeção
            }
        }
        
        // Preparar texto base (full ou answer only)
        let baseText = mode === 'full' 
            ? `${idea.question}\n\n${idea.text}`
            : idea.text;
        
        // Aplicar conversão baseada no inject mode
        let text;
        switch(injectMode) {
            case 'formatted':
                // Modo 1: Formatted HTML (v4.2.1)
                text = baseText; // Será convertido no content.js
                break;
            case 'markdown':
                // Modo 2: Markdown puro (raw)
                text = baseText;
                break;
            case 'plaintext':
                // Modo 3: Plain text (strip Markdown)
                text = this.stripMarkdown(baseText);
                break;
            default:
                text = baseText;
        }
        
        try {
            // Send message to background to inject in current tab
            await chrome.runtime.sendMessage({
                action: 'inject_text_in_current_tab',
                text: text,
                injectMode: injectMode // Enviar modo para content.js decidir
            });

            // Update injection count
            idea.injectionCount = (idea.injectionCount || 0) + 1;
            await this.saveIdea(idea);

            if (window.NODUS_UI) {
                window.NODUS_UI.showToast('Idea injected!', 'success');
            }

            await this.refreshGrid();
        } catch (error) {
            console.error('[Dashboard] Injection error:', error);
            if (window.NODUS_UI) {
                if (error && error.message && error.message.includes('Extension context invalidated')) {
                    window.NODUS_UI.showToast('⚠️ NODUS desconectado — recarregue a página (F5)', 'error');
                } else {
                    window.NODUS_UI.showToast('Failed to inject. Make sure you are on a supported page.', 'error');
                }
            }
        }
    },
    
    /**
     * Copy idea to clipboard
     */
    async copyToClipboard(idea) {

        try {

        // 🔒 VALIDAÇÃO CROSS-PLATFORM
        const storageData = await chrome.storage.local.get('settings');
        const settings = storageData.settings || { crossPlatformInject: false };
        
        
        if (!settings.crossPlatformInject) {
            // Detectar plataforma atual
            const currentPlatform = this.detectPlatform();
            const ideaPlatform = idea.platform;
            
            if (currentPlatform !== ideaPlatform) {
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast(
                        `🔒 Cross-Platform Inject desabilitado\nOrigem: ${ideaPlatform} → Destino: ${currentPlatform}\nHabilite nas Configurações ⚙️`,
                        'error'
                    );
                }
                return; // BLOQUEIA cópia
            }
        }
        
        // ✨ CLEANUP: Remover escapes literais do texto salvo
        const cleanText = (txt) => {
            if (!txt) return txt;
            return txt
                .replace(/\\n/g, '\n')      // \\n → quebra real
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
        
        const text = `${cleanText(idea.question)}\n\n${cleanText(idea.text)}`;

        let copied = false;
        try {
            await navigator.clipboard.writeText(text);
            copied = true;
        } catch (clipErr) {
            // Fallback: execCommand funciona mesmo sem foco no documento (ex: DevTools aberto)
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                copied = document.execCommand('copy');
                document.body.removeChild(ta);
            } catch (_) { /* ignore */ }
        }

        if (window.NODUS_UI) {
            window.NODUS_UI.showToast(copied ? 'Copied to clipboard!' : 'Failed to copy to clipboard.', copied ? 'success' : 'error');
        }

        } catch (error) {
            console.error('[Dashboard] Copy error:', error);
            if (window.NODUS_UI) {
                if (error && error.message && error.message.includes('Extension context invalidated')) {
                    window.NODUS_UI.showToast('⚠️ NODUS desconectado — recarregue a página (F5)', 'error');
                } else {
                    window.NODUS_UI.showToast('Failed to copy to clipboard.', 'error');
                }
            }
        }
    },
    
    /**
     * Edit idea - inline editing within the card itself
     */
    async editIdea(idea, queue) {
        
        const card = document.querySelector(`[data-idea-id="${idea.id}"]`);
        if (!card) return;
        
        // Check if already editing
        if (card.classList.contains('editing')) return;
        
        // Add editing class (red border)
        card.classList.add('editing');
        
        // Store original content
        const titleEl = card.querySelector('.card-title');
        const tagsEl = card.querySelector('.card-tags');
        const actionsEl = card.querySelector('.card-actions');
        
        const originalTitle = titleEl.innerHTML;
        const originalTags = tagsEl.innerHTML;
        const originalActions = actionsEl.innerHTML;
        const originalQueue = queue;
        
        // Get all available tags and bindings
        const allTags = this.getUniqueTags();
        let currentTags = [...idea.tags];
        const originalTagsSnapshot = idea.tags.filter(t => t !== '__quick__').sort().join(',');
        const MAX_TAGS = 4;
        
        // Carregar vinculações do storage
        const { tagQueueBindings = {} } = await chrome.storage.local.get('tagQueueBindings');
        
        // Replace title with input
        titleEl.innerHTML = `
            <input type="text" class="edit-title-input" value="${this.escapeHtml(idea.title)}" placeholder="Enter title...">
        `;
        
        // Replace tags with editable version (visual do modal save)
        const renderEditTags = async () => {
            const tagsHTML = await Promise.all(currentTags.map(async (tag, index) => {
                const tagLower = tag.toLowerCase();
                const queueKey = tagQueueBindings[tagLower] || 'ideas_queue_default';
                const queueInfo = this.getQueueInfo(queueKey);
                const tagColor = this.getTagColor(tag);
                
                return `
                    <span class="nq-edit-tag" draggable="true" data-tag="${this.escapeHtml(tag)}" data-index="${index}" style="
                        background: ${tagColor};
                        color: white;
                        padding: 6px 10px;
                        border-radius: 6px;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        cursor: move;
                        user-select: none;
                        transition: all 0.2s;
                    ">
                        <button class="nq-edit-tag-dot" data-tag="${this.escapeHtml(tag)}" style="
                            width: 8px;
                            height: 8px;
                            padding: 0;
                            border: none;
                            border-radius: 50%;
                            background: radial-gradient(circle at 30% 30%, ${queueInfo.color}, ${queueInfo.color} 60%, rgba(0,0,0,0.4));
                            box-shadow: 0 0 6px ${queueInfo.color};
                            cursor: pointer;
                            flex-shrink: 0;
                        " title="${_t('tooltip.changequeue')}"></button>
                        <span>${this.escapeHtml(tag)}</span>
                        <button class="nq-edit-tag-remove" style="
                            background: none;
                            border: none;
                            color: #ef4444;
                            cursor: pointer;
                            padding: 0;
                            font-size: 14px;
                            line-height: 1;
                            font-weight: bold;
                        ">×</button>
                    </span>
                `;
            }));
            
            tagsEl.innerHTML = `
                <div class="edit-tags-inline">
                    <div class="tag-limit-info" style="font-size: 11px; color: #9ca3af; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span>Tags: <span style="color: ${currentTags.length >= MAX_TAGS ? '#ef4444' : '#60a5fa'}">${currentTags.length}/${MAX_TAGS}</span></span>
                        <button class="edit-tag-add-btn tag-add" data-idea-id="${idea.id}" style="
                            width: 22px;
                            height: 18px;
                            padding: 0;
                            background: rgba(100, 116, 139, 0.3);
                            border: 2px dashed #475569;
                            color: #94a3b8;
                            font-size: 14px;
                            border-radius: 3px;
                            cursor: pointer;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                        ">+</button>
                    </div>
                    <div class="edit-tags-list-inline" id="edit-tags-${idea.id}" style="
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                        margin-bottom: 10px;
                        min-height: 32px;
                    ">
                        ${tagsHTML.join('')}
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" class="edit-tag-input-inline" placeholder="Add tag (max ${MAX_TAGS})..." 
                            ${currentTags.length >= MAX_TAGS ? 'disabled' : ''}
                            style="
                                flex: 1;
                                padding: 8px;
                                background: rgba(30, 41, 59, 0.5);
                                border: 1px solid #334155;
                                border-radius: 6px;
                                color: white;
                                font-size: 12px;
                            ">
                        <button class="edit-tag-confirm-btn" data-idea-id="${idea.id}" style="
                            width: 32px;
                            height: 32px;
                            padding: 0;
                            background: rgba(59, 130, 246, 0.2);
                            border: 1px solid rgba(59, 130, 246, 0.4);
                            color: #60a5fa;
                            font-size: 18px;
                            border-radius: 6px;
                            cursor: pointer;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                        ">+</button>
                    </div>
                </div>
            `;
            
            // Setup drag & drop
            this.setupTagsDragDrop(card, currentTags, renderEditTags);
            
            // Setup queue picker on dot click
            card.querySelectorAll('.nq-edit-tag-dot').forEach(dotBtn => {
                dotBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tagName = dotBtn.dataset.tag;
                    this.openQueuePickerForTag(dotBtn, tagName, tagQueueBindings, renderEditTags);
                });
            });
            
            // Setup remove buttons
            card.querySelectorAll('.nq-edit-tag-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tag = btn.closest('.nq-edit-tag').dataset.tag;
                    const index = currentTags.indexOf(tag);
                    if (index > -1) {
                        currentTags.splice(index, 1);
                        renderEditTags();
                    }
                });
            });
        };
        
        await renderEditTags();
        
        // Add notes textarea after tags
        const notesSection = document.createElement('div');
        notesSection.className = 'edit-notes-section';
        notesSection.innerHTML = `
            <textarea class="edit-notes-textarea" placeholder="Add notes..." rows="3" style="
                width: 100%;
                padding: 10px;
                background: rgba(30, 41, 59, 0.5);
                border: 1px solid #334155;
                border-radius: 6px;
                color: white;
                font-size: 13px;
                resize: vertical;
                font-family: inherit;
            ">${this.escapeHtml(idea.notes || '')}</textarea>
        `;
        tagsEl.after(notesSection);
        
        // Replace actions with save/cancel
        actionsEl.innerHTML = `
            <button class="card-action-btn cancel-edit-btn" title="${_t('tooltip.canceledit')}">
                ❌ ${_t('settings.cancel')}
            </button>
            <button class="card-action-btn save-edit-btn" title="${_t('tooltip.savechanges')}">
                ✅ ${_t('settings.save')}
            </button>
        `;
        
        // Focus title
        const titleInput = card.querySelector('.edit-title-input');
        titleInput.focus();
        titleInput.select();
        
        // Store data for save/cancel
        card.dataset.editMode = 'true';
        card.dataset.originalQueue = originalQueue;
        
        // Event: Add tag com Enter ou botão +
        const tagInput = card.querySelector('.edit-tag-input-inline');
        const confirmBtn = card.querySelector('.edit-tag-confirm-btn');
        
        const addTagFromInput = async () => {
            if (!tagInput.value.trim()) return;
            
            if (currentTags.length >= MAX_TAGS) {
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast(`Max ${MAX_TAGS} tags reached`, 'error');
                }
                return;
            }
            
            const newTag = tagInput.value.trim().toUpperCase();
            if (!currentTags.includes(newTag)) {
                currentTags.push(newTag);
                tagInput.value = '';
                await renderEditTags();
            }
        };
        
        tagInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await addTagFromInput();
            }
        });
        
        confirmBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await addTagFromInput();
        });
        
        // Handle cancel button click
        const cancelBtn = card.querySelector('.cancel-edit-btn');
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            card.classList.remove('editing');
            delete card.dataset.editMode;
            delete card.dataset.originalQueue;
            
            titleEl.innerHTML = originalTitle;
            tagsEl.innerHTML = originalTags;
            actionsEl.innerHTML = originalActions;
            notesSection.remove();
        });
        
        // Handle save button click
        const saveBtn = card.querySelector('.save-edit-btn');
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const newTitle = card.querySelector('.edit-title-input')?.value.trim();
            const newNotes = card.querySelector('.edit-notes-textarea')?.value.trim();
            
            if (!newTitle) {
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast('Title cannot be empty', 'error');
                }
                return;
            }
            
            // Update idea
            idea.title = newTitle;
            idea.notes = newNotes;

            // Sincronizar QUICK com __quick__
            const hasQUICK = currentTags.includes('QUICK');
            const has__quick__ = currentTags.includes('__quick__');

            if (hasQUICK && !has__quick__) {
                // Se tem QUICK mas não tem __quick__, adicionar
                currentTags.push('__quick__');
            } else if (!hasQUICK && has__quick__) {
                // Se não tem QUICK mas tem __quick__, remover __quick__
                currentTags = currentTags.filter(t => t !== '__quick__');
            }

            idea.tags = currentTags;

            // Só re-rotear se as tags foram alteradas pelo utilizador
            const currentTagsKey = currentTags.filter(t => t !== '__quick__').sort().join(',');
            const tagsActuallyChanged = originalTagsSnapshot !== currentTagsKey;
            const newQueue = tagsActuallyChanged
                ? await this.detectQueueFromTags(currentTags, tagQueueBindings)
                : originalQueue;

            // Se mudou de fila, mover entre filas
            if (newQueue !== originalQueue) {
                await this.moveIdeaBetweenQueues(idea, originalQueue, newQueue);
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast(`Idea moved to ${this.getQueueInfo(newQueue).name}!`, 'success');
                }
            } else {
                // Salvar na mesma fila
                const storageKey = `ideas_queue_${originalQueue}`;
                const data = await chrome.storage.local.get(storageKey);
                const ideas = data[storageKey] || [];
                const index = ideas.findIndex(i => i.id === idea.id);
                
                if (index !== -1) {
                    ideas[index] = idea;
                    await chrome.storage.local.set({ [storageKey]: ideas });
                    
                    if (this.allIdeas[originalQueue]) {
                        const cacheIndex = this.allIdeas[originalQueue].findIndex(i => i.id === idea.id);
                        if (cacheIndex !== -1) {
                            this.allIdeas[originalQueue][cacheIndex] = idea;
                        }
                    }
                    
                    if (window.NODUS_UI) {
                        window.NODUS_UI.showToast('Idea updated!', 'success');
                    }
                }
            }
            
            // Refresh grid
            await this.refreshGrid();
        });
    },
    
    /**
     * Add to chain (placeholder)
     */
    addToChain(idea) {
        if (window.NODUS_UI) {
            window.NODUS_UI.showToast('Chain feature available in Chains tab', 'info');
        }
    },
    
    /**
     * Open attachments inline (no card)
     */
    async openAttachments(ideaId, queueName) {
        
        const card = document.querySelector(`[data-idea-id="${ideaId}"]`);
        if (!card) {
            console.error('[Dashboard Cards] Card not found');
            return;
        }
        
        // Check if already showing attachments
        if (card.classList.contains('showing-attachments')) {
            this.closeAttachments(ideaId);
            return;
        }
        
        // Get idea
        const idea = await this.getIdeaById(ideaId, queueName);
        if (!idea) {
            console.error('[Dashboard Cards] Idea not found');
            return;
        }
        
        // Load attachments
        const attachments = await window.NodusAttachmentsDB.getAttachmentsByIdeaId(ideaId);
        
        // Add showing-attachments class
        card.classList.add('showing-attachments');
        
        // Find or create attachments section
        let attachSection = card.querySelector('.card-attachments-section');
        if (!attachSection) {
            attachSection = document.createElement('div');
            attachSection.className = 'card-attachments-section';
            
            // Insert before actions
            const actionsEl = card.querySelector('.card-actions');
            actionsEl.parentNode.insertBefore(attachSection, actionsEl);
        }
        
        // Render attachments UI
        attachSection.innerHTML = `
            <div class="attachments-header">
                <h4>📎 Attachments (${attachments.length})</h4>
                <button class="attachments-close-btn" data-idea-id="${ideaId}">✕</button>
            </div>
            
            <div class="attachments-list">
                ${attachments.length === 0 ? 
                    '<div class="attachments-empty">No attachments yet</div>' : 
                    attachments.map(att => `
                        <div class="attachment-item inline-attachment-item" 
                             data-attachment-id="${att.id}"
                             data-file-name="${this.escapeHtml(att.fileName)}"
                             data-file-size="${att.fileSize}"
                             data-file-type="${att.fileType}">
                            <div class="attachment-checkbox">
                                <span class="checkbox-icon">☐</span>
                                <span class="checkbox-icon-checked">☑</span>
                            </div>
                            <div class="attachment-info">
                                <span class="attachment-icon">${this.getFileIcon(att.fileType)}</span>
                                <div class="attachment-details">
                                    <div class="attachment-name">${this.escapeHtml(att.fileName)}</div>
                                    <div class="attachment-size">${this.formatBytes(att.fileSize)}</div>
                                </div>
                            </div>
                            <div class="attachment-actions">
                                <button class="attachment-download-btn" data-attachment-id="${att.id}" title="${_t('tooltip.download')}">
                                    ⬇️
                                </button>
                                <button class="attachment-delete-btn" data-attachment-id="${att.id}" title="${_t('tooltip.delete')}">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            
            <div class="attachments-actions">
                <input type="file" id="attach-file-${ideaId}" multiple style="display: none;">
                <button class="attachments-add-btn" data-idea-id="${ideaId}">
                    📎 Add File
                </button>
            </div>
        `;
        
        // Setup event listeners
        this.setupAttachmentsListeners(card, ideaId, queueName);
    },
    
    /**
     * Close attachments inline section
     */
    closeAttachments(ideaId) {
        const card = document.querySelector(`[data-idea-id="${ideaId}"]`);
        if (!card) return;
        
        card.classList.remove('showing-attachments');
        const attachSection = card.querySelector('.card-attachments-section');
        if (attachSection) {
            attachSection.remove();
        }
    },
    
    /**
     * Setup attachments event listeners
     */
    setupAttachmentsListeners(card, ideaId, queueName) {
        
        // =============================================
        // SELEÇÃO DE ATTACHMENTS (CLIQUE)
        // =============================================
        const items = card.querySelectorAll('.inline-attachment-item');
        
        if (items.length === 0) {
            console.error('[Dashboard Cards] ❌ NO ITEMS FOUND! Checking alternatives...');
            const allItems = card.querySelectorAll('.attachment-item');
        }
        
        items.forEach((item, index) => {
            
            // IMPORTANTE: Cursor pointer
            item.style.cursor = 'pointer';
            
            // Click to select
            const clickHandler = (e) => {
                
                // Ignorar se clicou em botão de download/delete
                const isDownloadBtn = e.target.closest('.attachment-download-btn');
                const isDeleteBtn = e.target.closest('.attachment-delete-btn');
                
                
                if (isDownloadBtn || isDeleteBtn) {
                    return;
                }
                
                // Toggle seleção
                const wasSelected = item.classList.contains('selected');
                item.classList.toggle('selected');
                const isSelected = item.classList.contains('selected');
                
                
                // APLICAR ESTILOS INLINE (CSS não está carregando)
                if (isSelected) {
                    // SELECIONADO
                    item.style.border = '3px solid #3b82f6';
                    item.style.background = 'rgba(59, 130, 246, 0.067)';
                    item.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2) inset, 0 4px 12px rgba(59, 130, 246, 0.3)';
                    item.style.transform = 'scale(1.02)';
                    
                    // Checkbox
                    const checkNormal = item.querySelector('.checkbox-icon');
                    const checkSelected = item.querySelector('.checkbox-icon-checked');
                    if (checkNormal) checkNormal.style.display = 'none';
                    if (checkSelected) checkSelected.style.display = 'block';
                    
                } else {
                    // DESSELECIONADO
                    item.style.border = '2px dashed #2a2a2a';
                    item.style.background = '#141414';
                    item.style.boxShadow = 'none';
                    item.style.transform = 'none';
                    
                    // Checkbox
                    const checkNormal = item.querySelector('.checkbox-icon');
                    const checkSelected = item.querySelector('.checkbox-icon-checked');
                    if (checkNormal) checkNormal.style.display = 'block';
                    if (checkSelected) checkSelected.style.display = 'none';
                    
                }
                
                
                // ATUALIZAR DRAG BAR
                this.updateInlineDragBar(card);
                
            };
            
            item.addEventListener('click', clickHandler);
        });
        
        
        // =============================================
        // INICIALIZAR DRAG BAR
        // =============================================
        if (window.NodusAttachmentsDragBar) {
            window.NodusAttachmentsDragBar.init();
        } else {
            console.warn('[Dashboard Cards] NodusAttachmentsDragBar not available');
        }
        
        // =============================================
        // BOTÕES ORIGINAIS
        // =============================================
        
        // Close button
        const closeBtn = card.querySelector('.attachments-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeAttachments(ideaId));
        }
        
        // Add file button
        const addBtn = card.querySelector('.attachments-add-btn');
        const fileInput = card.querySelector(`#attach-file-${ideaId}`);
        
        if (addBtn && fileInput) {
            addBtn.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;
                
                
                for (const file of files) {
                    try {
                        await window.NodusAttachmentsDB.addFile(ideaId, file);
                    } catch (error) {
                        console.error('[Dashboard Cards] Error adding file:', error);
                        if (window.NODUS_UI) {
                            window.NODUS_UI.showToast('Error: ' + error.message, 'error');
                        }
                    }
                }
                
                // Refresh attachments view
                this.closeAttachments(ideaId);
                await this.openAttachments(ideaId, queueName);
                
                // Update counter
                const attachBtn = card.querySelector('.card-attachment-btn');
                if (attachBtn) {
                    const count = await this.getAttachmentCount(ideaId);
                    attachBtn.textContent = `📎 ${count}x`;
                    attachBtn.classList.add('has-files');
                    attachBtn.classList.add('added');
                    setTimeout(() => attachBtn.classList.remove('added'), 400);
                }
                
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast(`${files.length} file(s) added!`, 'success');
                }
            });
        }
        
        // Download buttons
        card.querySelectorAll('.attachment-download-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const attachmentId = btn.dataset.attachmentId;
                try {
                    await window.NodusAttachmentsDB.downloadFile(attachmentId);
                } catch (error) {
                    console.error('[Dashboard Cards] Error downloading:', error);
                }
            });
        });
        
        // Delete buttons
        card.querySelectorAll('.attachment-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const attachmentId = btn.dataset.attachmentId;
                if (!confirm('Deletar este anexo?')) return;
                
                try {
                    await window.NodusAttachmentsDB.deleteFile(attachmentId);
                    
                    // Refresh view
                    this.closeAttachments(ideaId);
                    await this.openAttachments(ideaId, queueName);
                    
                    // Update counter
                    const attachBtn = card.querySelector('.card-attachment-btn');
                    if (attachBtn) {
                        const count = await this.getAttachmentCount(ideaId);
                        attachBtn.textContent = `📎 ${count}x`;
                        if (count === 0) {
                            attachBtn.classList.remove('has-files');
                        }
                    }
                    
                    if (window.NODUS_UI) {
                        window.NODUS_UI.showToast('Attachment deleted', 'success');
                    }
                } catch (error) {
                    console.error('[Dashboard Cards] Error deleting:', error);
                }
            });
        });
    },
    
    /**
     * Get idea by ID
     */
    async getIdeaById(ideaId, queueName) {
        const storageKey = `ideas_queue_${queueName}`;
        const data = await chrome.storage.local.get(storageKey);
        const queue = data[storageKey] || [];
        return queue.find(i => i.id === ideaId);
    },
    
    /**
     * Get file icon based on type
     */
    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return '🖼️';
        if (fileType.startsWith('video/')) return '🎥';
        if (fileType.startsWith('audio/')) return '🎵';
        if (fileType.includes('pdf')) return '📄';
        if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
        if (fileType.includes('text') || fileType.includes('json')) return '📝';
        return '📎';
    },
    
    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    /**
     * Edit notes for an idea
     */
    async editNotes(idea, queueName) {
        
        const card = document.querySelector(`[data-idea-id="${idea.id}"]`);
        if (!card) {
            console.error('[Dashboard Cards] Card not found');
            return;
        }
        
        // Check if already showing notes
        if (card.classList.contains('showing-notes')) {
            this.closeNotes(idea.id);
            return;
        }
        
        // Add showing-notes class
        card.classList.add('showing-notes');
        
        // Find or create notes section
        let notesSection = card.querySelector('.card-notes-section');
        if (!notesSection) {
            notesSection = document.createElement('div');
            notesSection.className = 'card-notes-section';
            
            // Insert before actions
            const actionsEl = card.querySelector('.card-actions');
            actionsEl.parentNode.insertBefore(notesSection, actionsEl);
        }
        
        // Render notes UI
        const currentNotes = idea.notes || '';
        notesSection.innerHTML = `
            <div class="notes-header">
                <h4>📝 Notes</h4>
                <button class="notes-close-btn" data-idea-id="${idea.id}">✕</button>
            </div>
            
            <textarea class="notes-textarea" placeholder="Add notes for this idea..." rows="4">${this.escapeHtml(currentNotes)}</textarea>
            
            <div class="notes-actions">
                <button class="notes-save-btn" data-idea-id="${idea.id}">
                    💾 Save
                </button>
                <button class="notes-clear-btn" data-idea-id="${idea.id}">
                    🗑️ Clear
                </button>
            </div>
        `;
        
        // Setup event listeners
        this.setupNotesListeners(card, idea, queueName);
        
        // Focus textarea
        const textarea = notesSection.querySelector('.notes-textarea');
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    },
    
    /**
     * Close notes inline section
     */
    closeNotes(ideaId) {
        const card = document.querySelector(`[data-idea-id="${ideaId}"]`);
        if (!card) return;
        
        card.classList.remove('showing-notes');
        const notesSection = card.querySelector('.card-notes-section');
        if (notesSection) {
            notesSection.remove();
        }
    },
    
    /**
     * Setup notes event listeners
     */
    setupNotesListeners(card, idea, queueName) {
        const notesSection = card.querySelector('.card-notes-section');
        if (!notesSection) return;
        
        const textarea = notesSection.querySelector('.notes-textarea');
        const saveBtn = notesSection.querySelector('.notes-save-btn');
        const clearBtn = notesSection.querySelector('.notes-clear-btn');
        const closeBtn = notesSection.querySelector('.notes-close-btn');
        
        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeNotes(idea.id));
        }
        
        // Save button
        if (saveBtn && textarea) {
            saveBtn.addEventListener('click', async () => {
                const newNotes = textarea.value.trim();
                idea.notes = newNotes;
                await this.saveIdea(idea);
                
                // Update button
                const noteBtn = card.querySelector('.card-note-btn');
                if (noteBtn) {
                    noteBtn.textContent = newNotes ? '📝 Notes' : '📝';
                    noteBtn.title = newNotes || 'Add notes';
                    if (newNotes) {
                        noteBtn.classList.add('has-notes');
                    } else {
                        noteBtn.classList.remove('has-notes');
                    }
                }
                
                this.closeNotes(idea.id);
                
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast('📝 Notes saved!', 'success');
                }
            });
        }
        
        // Clear button
        if (clearBtn && textarea) {
            clearBtn.addEventListener('click', async () => {
                if (!confirm('Clear all notes?')) return;
                
                textarea.value = '';
                idea.notes = '';
                await this.saveIdea(idea);
                
                // Update button
                const noteBtn = card.querySelector('.card-note-btn');
                if (noteBtn) {
                    noteBtn.textContent = '📝';
                    noteBtn.title = 'Add notes';
                    noteBtn.classList.remove('has-notes');
                }
                
                this.closeNotes(idea.id);
                
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast('📝 Notes cleared', 'success');
                }
            });
        }
    },
    
    /**
     * Animate attachment button when file is added
     */
    animateAttachmentButton(ideaId) {
        const card = document.querySelector(`[data-idea-id="${ideaId}"]`);
        if (!card) return;
        
        const btn = card.querySelector('.card-attachment-btn');
        if (!btn) return;
        
        btn.classList.add('added');
        setTimeout(() => {
            btn.classList.remove('added');
        }, 400);
    },
    
    /**
     * Delete idea (chamado após confirmação inline)
     */
    async deleteIdea(ideaId, queue) {
        // Remove from local state
        this.allIdeas[queue] = this.allIdeas[queue].filter(i => i.id !== ideaId);
        
        // Save to storage
        const storageKey = `ideas_queue_${queue}`;
        await chrome.storage.local.set({ [storageKey]: this.allIdeas[queue] });
        
        if (window.NODUS_UI) {
            window.NODUS_UI.showToast('Idea deleted', 'success');
        }
        
        this.refreshGrid();
    },
    
    /**
     * Save idea to storage
     */
    async saveIdea(idea) {
        // Find which queue it belongs to
        for (const [queueName, ideas] of Object.entries(this.allIdeas)) {
            const index = ideas.findIndex(i => i.id === idea.id);
            if (index !== -1) {
                ideas[index] = idea;
                const storageKey = `ideas_queue_${queueName}`;
                await chrome.storage.local.set({ [storageKey]: ideas });
                break;
            }
        }
    },
    
    /**
     * Refresh only the grid (keeps toolbar/search)
     */
    async refreshGrid() {
        const grid = document.getElementById('nodus-cards-grid');
        if (!grid || !grid.parentNode) {
            console.warn('[Dashboard] Grid or parent not found, refreshing entire view');
            await this.refreshView();
            return;
        }
        
        try {
            const newGrid = await this.createCardsGrid();
            if (grid.parentNode) {  // Double check antes do replace
                grid.parentNode.replaceChild(newGrid, grid);
            }
        } catch (error) {
            console.error('[Dashboard] Error refreshing grid:', error);
            await this.refreshView();
        }
    },
    
    /**
     * Refresh entire view
     */
    async refreshView() {
        const container = document.getElementById('nodus-dashboard-content');
        if (container) {
            await this.render(container);
        }
    },
    
    /**
     * Escape HTML to prevent XSS
     */
    /**
     * Get tag color (same system as modal save)
     */
    getTagColor(tagName) {
        const predefinedColors = {
            'CLAUDE': '#a855f7',    // purple
            'CHATGPT': '#10b981',   // green
            'COPILOT': '#3b82f6',   // blue
            'GEMINI': '#8b5cf6',    // violet
            'PERPLEXITY': '#06b6d4', // cyan
            'GROK': '#f59e0b',      // amber
            'TECH': '#6366f1',      // indigo
            'BOOK': '#ec4899',      // pink
            'WRITING': '#ef4444',   // red
            'FITNESS': '#14b8a6',   // teal
            'NEWS': '#f97316'       // orange
        };

        const upperTag = tagName.toUpperCase();
        if (predefinedColors[upperTag]) {
            return predefinedColors[upperTag];
        }

        // Generate color from tag name hash
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) {
            hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1'];
        return colors[Math.abs(hash) % colors.length];
    },

    /**
     * Get queue info for a tag (if bound)
     */
    async getTagQueueBinding(tagName) {
        try {
            // Buscar suggestedTagsQueueState do storage ou de window.NodusPanelNQ
            if (window.NodusPanelNQ && window.NodusPanelNQ.suggestedTagsQueueState) {
                const queueKey = window.NodusPanelNQ.suggestedTagsQueueState[tagName];
                if (queueKey) {
                    return this.getQueueInfo(queueKey);
                }
            }
            return null;
        } catch (error) {
            console.error('[Dashboard] Error getting tag binding:', error);
            return null;
        }
    },

    /**
     * Get queue display info
     */
    getQueueInfo(queueKey) {
        const queueConfig = {
            'ideas_queue_quick': { name: 'Quick', color: '#fbbf24', emoji: '⚡' },
            'ideas_queue_default': { name: 'Default', color: '#10b981', emoji: '🟢' },
            'ideas_queue_custom1': { name: 'Q1', color: '#3b82f6', emoji: '🔵' },
            'ideas_queue_custom2': { name: 'Q2', color: '#8b5cf6', emoji: '🟣' },
            'ideas_queue_custom3': { name: 'Q3', color: '#ec4899', emoji: '🌸' },
            'ideas_queue_custom4': { name: 'Q4', color: '#f97316', emoji: '🟠' }
        };
        return queueConfig[queueKey] || { name: 'Unknown', color: '#64748b', emoji: '❓' };
    },

    /**
     * Setup drag & drop for tags reordering
     */
    setupTagsDragDrop(card, currentTags, renderCallback) {
        const tagsList = card.querySelector('.edit-tags-list-inline');
        let draggedElement = null;
        let draggedIndex = null;

        tagsList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('nq-edit-tag')) {
                draggedElement = e.target;
                draggedIndex = parseInt(e.target.dataset.index);
                e.target.style.opacity = '0.5';
            }
        });

        tagsList.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('nq-edit-tag')) {
                e.target.style.opacity = '1';
            }
        });

        tagsList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(tagsList, e.clientX);
            const draggable = draggedElement;
            
            if (afterElement == null) {
                tagsList.appendChild(draggable);
            } else {
                tagsList.insertBefore(draggable, afterElement);
            }
        });

        tagsList.addEventListener('drop', async (e) => {
            e.preventDefault();
            
            // Reordenar array baseado na nova posição DOM
            const newOrder = [];
            tagsList.querySelectorAll('.nq-edit-tag').forEach(tagEl => {
                newOrder.push(tagEl.dataset.tag);
            });
            
            currentTags.splice(0, currentTags.length, ...newOrder);
            await renderCallback();
        });
    },

    /**
     * Get element after drag position
     */
    getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.nq-edit-tag:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    /**
     * Open queue picker for a tag
     */
    openQueuePickerForTag(dotElement, tagName, tagQueueBindings, renderCallback) {
        // Remove picker existente
        const existingPicker = document.getElementById('nq-queue-picker');
        if (existingPicker) existingPicker.remove();

        const picker = document.createElement('div');
        picker.id = 'nq-queue-picker';
        picker.style.cssText = `
            position: fixed;
            background: #1e293b;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 1000000;
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 120px;
        `;

        const rect = dotElement.getBoundingClientRect();
        picker.style.left = `${rect.left}px`;
        picker.style.top = `${rect.bottom + 5}px`;

        const queues = [
            { key: 'ideas_queue_default', name: 'Default', color: '#10b981', emoji: '🟢' },
            { key: 'ideas_queue_custom1', name: 'Queue 1', color: '#3b82f6', emoji: '🔵' }
        ];

        queues.forEach(queue => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                padding: 8px 12px;
                background: ${queue.color};
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: transform 0.2s, box-shadow 0.2s;
            `;
            btn.innerHTML = `
                <span style="font-size: 14px;">${queue.emoji}</span>
                <span>${queue.name}</span>
            `;

            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.05)';
                btn.style.boxShadow = `0 0 12px ${queue.color}`;
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            });

            btn.addEventListener('click', async () => {
                // Salvar vinculação
                tagQueueBindings[tagName.toLowerCase()] = queue.key;
                await chrome.storage.local.set({ tagQueueBindings });
                
                // Re-renderizar
                await renderCallback();
                
                picker.remove();
                
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast(`${tagName} → ${queue.name}`, 'success');
                }
            });

            picker.appendChild(btn);
        });

        document.body.appendChild(picker);

        // Fechar ao clicar fora
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!picker.contains(e.target) && e.target !== dotElement) {
                    picker.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    },

    /**
     * Detect queue from tags based on bindings
     */
    async detectQueueFromTags(tags, tagQueueBindings) {
        // Filtrar tags válidas (remover __quick__ mas manter QUICK)
        const realTags = tags.filter(t => t !== '__quick__');
        
        if (realTags.length === 0) {
            return 'default';
        }
        
        // A PRIMEIRA tag define a fila
        const firstTag = realTags[0];
        
        // Se primeira tag é QUICK, vai para Quick Queue
        if (firstTag === 'QUICK') {
            return 'quick';
        }
        
        // Verificar se primeira tag tem vínculo
        const queueKey = tagQueueBindings[firstTag.toLowerCase()];
        if (queueKey) {
            return queueKey.replace('ideas_queue_', '');
        }
        
        // Se primeira tag não tem vínculo, vai para Default
        return 'default';
    },

    /**
     * Move idea between queues
     */
    async moveIdeaBetweenQueues(idea, fromQueue, toQueue) {

        // Atualizar queue do objeto idea
        idea.queue = `ideas_queue_${toQueue}`;

        // Remove from old queue
        const fromKey = `ideas_queue_${fromQueue}`;
        const fromData = await chrome.storage.local.get(fromKey);
        const fromIdeas = fromData[fromKey] || [];
        const filteredFrom = fromIdeas.filter(i => i.id !== idea.id);
        await chrome.storage.local.set({ [fromKey]: filteredFrom });

        // Add to new queue
        const toKey = `ideas_queue_${toQueue}`;
        const toData = await chrome.storage.local.get(toKey);
        const toIdeas = toData[toKey] || [];
        toIdeas.push(idea);
        await chrome.storage.local.set({ [toKey]: toIdeas });

        // Update cache
        if (this.allIdeas[fromQueue]) {
            this.allIdeas[fromQueue] = filteredFrom;
        }
        if (this.allIdeas[toQueue]) {
            this.allIdeas[toQueue] = toIdeas;
        }

    },

    /**
     * Render card tags with interactive features (click to manage, drag to reorder)
     */
    renderCardTags(tags, ideaId, tagQueueBindings = {}) {
        if (!tags || tags.length === 0) {
            return '<div class="tag tag-add" data-idea-id="' + ideaId + '">+</div>';
        }
        
        // Processar tags: remover __ das tags especiais e converter para display
        let displayTags = tags.map(tag => {
            // Remove __ do início e fim da tag
            if (tag.startsWith('__') && tag.endsWith('__')) {
                return tag.slice(2, -2).toUpperCase(); // __auto__ -> AUTO
            }
            return tag;
        });
        
        const tagsHTML = displayTags.map((tag, index) => {
            const tagLower = tag.toLowerCase();
            
            // Tag QUICK tem configuração especial
            const isQuickTag = tag === 'QUICK';
            let queueKey, queueInfo, tagColor;
            
            if (isQuickTag) {
                queueKey = 'ideas_queue_quick';
                queueInfo = { color: '#fbbf24', name: 'Quick' }; // Bolinha amarela
                tagColor = '#fbbf24';
            } else {
                queueKey = tagQueueBindings[tagLower] || 'ideas_queue_default';
                queueInfo = this.getQueueInfo(queueKey);
                tagColor = this.getTagColor(tag);
            }
            
            // Proteção: se queueInfo for null/undefined, usar default
            if (!queueInfo || !queueInfo.color) {
                queueInfo = { name: 'Default', color: '#10b981', emoji: '🟢' };
            }
            
            const isFirst = index === 0;
            
            return `
                <span class="nodus-card-tag ${isFirst ? 'first-tag' : ''} ${isQuickTag ? 'quick-tag' : ''}" 
                      draggable="true" 
                      data-tag="${this.escapeHtml(tag)}" 
                      data-idea-id="${ideaId}"
                      style="background: ${tagColor}; ${isQuickTag ? 'color: #000; font-weight: 600;' : ''}">
                    <span class="tag-dot" style="--queue-color: ${queueInfo.color};"></span>
                    <span class="tag-name">${this.escapeHtml(tag)}</span>
                </span>
            `;
        }).join('');
        
        return tagsHTML + '<div class="tag tag-add" data-idea-id="' + ideaId + '">+</div>';
    },

    /**
     * Setup interactive tags (drag&drop + click handlers)
     */
    setupInteractiveTags() {
        
        // Setup drag & drop for all card tags
        document.querySelectorAll('.card-tags').forEach(cardTags => {
            this.setupTagsDragDrop(cardTags);
        });

        // USAR DELEGAÇÃO DE EVENTOS em vez de listeners diretos
        // Remove listener anterior se existir
        if (this._tagClickHandler) {
            document.removeEventListener('click', this._tagClickHandler);
        }
        
        // Criar handler delegado
        this._tagClickHandler = async (e) => {
            // Click em tag-add
            const addBtn = e.target.closest('.tag-add');
            if (addBtn) {
                e.stopPropagation();
                e.preventDefault();
                
                const ideaId = addBtn.dataset.ideaId;
                
                this.closeAllTagMenus();
                this.openAddTagPopup(addBtn, ideaId);
                return;
            }
            
            // Click em nodus-card-tag
            const tag = e.target.closest('.nodus-card-tag');
            if (tag) {
                e.stopPropagation();
                e.preventDefault();
                
                const tagName = tag.dataset.tag;
                const ideaId = tag.dataset.ideaId;
                
                this.closeAllTagMenus();
                await this.openTagMenu(tag, tagName, ideaId);
                return;
            }
            
            // Click fora fecha menus
            if (!e.target.closest('.nodus-tag-menu') && 
                !e.target.closest('.nodus-add-tag-popup')) {
                this.closeAllTagMenus();
            }
        };
        
        // Adicionar listener delegado
        document.addEventListener('click', this._tagClickHandler);
        
    },

    /**
     * Setup drag & drop for tags reordering
     */
    setupTagsDragDrop(cardTags) {
        let draggedElement = null;

        const tags = cardTags.querySelectorAll('.nodus-card-tag');
        tags.forEach(tag => {
            tag.addEventListener('dragstart', function(e) {
                draggedElement = this;
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            tag.addEventListener('dragend', function(e) {
                this.classList.remove('dragging');
                draggedElement = null;
            });
        });

        cardTags.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (!draggedElement) return;
            
            const afterElement = NodusDashboardCards.getDragAfterElement(cardTags, e.clientX);
            
            if (afterElement == null) {
                const addBtn = cardTags.querySelector('.tag-add');
                if (addBtn && draggedElement) {
                    cardTags.insertBefore(draggedElement, addBtn);
                }
            } else if (afterElement !== draggedElement) {
                cardTags.insertBefore(draggedElement, afterElement);
            }
        });

        cardTags.addEventListener('drop', async function(e) {
            e.preventDefault();
            await NodusDashboardCards.updateTagOrderInStorage(cardTags);
            NodusDashboardCards.updateFirstTagIndicator(cardTags);
        });
    },

    /**
     * Get element after drag position
     */
    getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.nodus-card-tag:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    /**
     * Update first tag indicator
     */
    updateFirstTagIndicator(cardTags) {
        cardTags.querySelectorAll('.nodus-card-tag').forEach((tag, index) => {
            if (index === 0) {
                tag.classList.add('first-tag');
            } else {
                tag.classList.remove('first-tag');
            }
        });
    },

    /**
     * Update tag order in storage after drag
     */
    async updateTagOrderInStorage(cardTags) {
        const ideaId = cardTags.dataset.cardId;
        if (!ideaId) return;

        // Get new order
        const newOrder = [];
        cardTags.querySelectorAll('.nodus-card-tag').forEach(tagEl => {
            newOrder.push(tagEl.dataset.tag);
        });

        // Find and update idea
        for (const [queueName, ideas] of Object.entries(this.allIdeas)) {
            const idea = ideas.find(i => i.id === ideaId);
            if (idea) {
                // IMPORTANTE: Se QUICK não é mais a primeira tag, removê-la
                const quickIndex = newOrder.indexOf('QUICK');
                if (quickIndex > 0) {
                    // QUICK foi movida para posição diferente de primeira
                    newOrder.splice(quickIndex, 1); // Remove QUICK
                    // Também remover __quick__ oculta
                    idea.tags = idea.tags.filter(t => t !== '__quick__');
                    
                    
                    if (window.NODUS_UI) {
                        window.NODUS_UI.showToast('QUICK tag removed - moving to new queue...', 'info');
                    }
                }
                
                idea.tags = newOrder;
                
                // Save to storage
                const storageKey = `ideas_queue_${queueName}`;
                await chrome.storage.local.set({ [storageKey]: ideas });
                
                
                // Check if need to move between queues
                await this.checkAndMoveIdeaByTags(idea, queueName);
                break;
            }
        }
    },

    /**
     * Check if idea should move to another queue based on first tag binding
     */
    async checkAndMoveIdeaByTags(idea, currentQueue) {
        if (!idea.tags || idea.tags.length === 0) return;

        const { tagQueueBindings = {} } = await chrome.storage.local.get('tagQueueBindings');
        
        // Filtrar __quick__ e QUICK para verificar primeira tag real
        const realTags = idea.tags.filter(t => t !== '__quick__' && t !== 'QUICK');
        if (realTags.length === 0) return;
        
        const firstTag = realTags[0].toLowerCase();
        
        // REGRA: Tag sem vínculo explícito = Default Queue (padrão do sistema)
        const boundQueue = tagQueueBindings[firstTag] || 'ideas_queue_default';
        const targetQueueName = boundQueue.replace('ideas_queue_', '');

        // Se a fila destino é diferente da atual, mover
        if (boundQueue !== `ideas_queue_${currentQueue}`) {
            // Limpar tags QUICK antes de mover
            idea.tags = idea.tags.filter(t => t !== 'QUICK' && t !== '__quick__');
            
            
            await this.moveIdeaBetweenQueues(idea, currentQueue, targetQueueName);
            
            if (window.NODUS_UI) {
                window.NODUS_UI.showToast(`Idea moved to ${this.getQueueInfo(boundQueue).name}!`, 'success');
            }
            
            await this.refreshGrid();
        }
    },

    /**
     * Open tag menu (change queue binding or remove)
     */
    async openTagMenu(tagElement, tagName, ideaId) {
        const { tagQueueBindings = {} } = await chrome.storage.local.get('tagQueueBindings');
        
        const menu = document.createElement('div');
        menu.className = 'nodus-tag-menu';
        menu.innerHTML = `
            <div class="tag-menu-section">
                <div class="tag-menu-label">ALTERAR VÍNCULO DE FILA</div>
                <button class="tag-menu-btn queue-btn" data-queue="ideas_queue_default" style="--queue-color: #10b981;">
                    <span>🟢</span>
                    <span>Fila Padrão</span>
                </button>
                <button class="tag-menu-btn queue-btn" data-queue="ideas_queue_custom1" style="--queue-color: #3b82f6;">
                    <span>🔵</span>
                    <span>Fila 1</span>
                </button>
            </div>
            <div class="tag-menu-section">
                <button class="tag-menu-btn remove-btn">
                    <span>❌</span>
                    <span>Remover Tag</span>
                </button>
            </div>
        `;

        tagElement.style.position = 'relative';
        tagElement.appendChild(menu);
        setTimeout(() => menu.classList.add('active'), 10);

        // Queue button handlers
        menu.querySelectorAll('.queue-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const queueKey = btn.dataset.queue;
                
                // Save binding
                tagQueueBindings[tagName.toLowerCase()] = queueKey;
                await chrome.storage.local.set({ tagQueueBindings });
                
                // Update dot color
                const dot = tagElement.querySelector('.tag-dot');
                const queueColor = btn.style.getPropertyValue('--queue-color');
                dot.style.setProperty('--queue-color', queueColor);
                
                this.closeAllTagMenus();
                
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast(`${tagName} → ${this.getQueueInfo(queueKey).name}`, 'success');
                }

                // Check if idea should move
                await this.checkAndMoveIdeaByTagBinding(ideaId, tagName, queueKey);
            });
        });

        // Remove button handler
        menu.querySelector('.remove-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.removeTagFromCard(tagElement, ideaId, tagName);
            this.closeAllTagMenus();
        });
    },

    /**
     * Check and move idea when tag binding changes
     */
    async checkAndMoveIdeaByTagBinding(ideaId, tagName, newQueueKey) {
        for (const [queueName, ideas] of Object.entries(this.allIdeas)) {
            const idea = ideas.find(i => i.id === ideaId);
            if (idea && idea.tags && idea.tags[0] === tagName) {
                // First tag changed binding
                const newQueue = newQueueKey.replace('ideas_queue_', '');
                if (newQueue !== queueName) {
                    await this.moveIdeaBetweenQueues(idea, queueName, newQueue);
                    await this.refreshGrid();
                }
                break;
            }
        }
    },

    /**
     * Remove tag from card
     */
    async removeTagFromCard(tagElement, ideaId, tagName) {
        // Find and update idea
        for (const [queueName, ideas] of Object.entries(this.allIdeas)) {
            const idea = ideas.find(i => i.id === ideaId);
            if (idea) {
                // Se removeu tag QUICK, remover também __quick__ oculta
                if (tagName === 'QUICK') {
                    idea.tags = idea.tags.filter(t => t !== tagName && t !== '__quick__');
                } else {
                    idea.tags = idea.tags.filter(t => t !== tagName);
                }
                
                // Save to storage
                const storageKey = `ideas_queue_${queueName}`;
                await chrome.storage.local.set({ [storageKey]: ideas });
                
                // Remove from DOM with animation
                tagElement.style.transform = 'scale(0)';
                setTimeout(() => {
                    tagElement.remove();
                    const cardTags = document.querySelector(`.card-tags[data-card-id="${ideaId}"]`);
                    if (cardTags) this.updateFirstTagIndicator(cardTags);
                }, 200);
                
                // Check if need to move to another queue (after tag removal)
                await this.checkAndMoveIdeaByTags(idea, queueName);
                
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast(`Tag "${tagName}" removed`, 'success');
                }
                break;
            }
        }
    },

    /**
     * Open add tag popup
     */
    openAddTagPopup(addBtn, ideaId) {
        
        // Pegar TODAS as tags existentes, EXCETO tags especiais do sistema
        const existingTags = this.getUniqueTags().filter(tag => 
            !tag.startsWith('__') || !tag.endsWith('__')
        );
        
        // Tags sugeridas fixas (caso não haja tags criadas ainda)
        const defaultSuggestions = ['CHATGPT', 'CLAUDE', 'GEMINI', 'COPILOT', 'GROK', 'PERPLEXITY', 
                               'CODE', 'WRITING', 'IDEAS', 'TECH', 'FITNESS', 'NEWS'];
        
        // Combinar: todas as tags existentes + sugestões que não existem ainda
        const allTagsToShow = [...new Set([...existingTags, ...defaultSuggestions])];
        
        const suggestedHTML = allTagsToShow.map(tag => 
            `<span class="nodus-suggested-tag" style="background: ${this.getTagColor(tag)};" data-tag="${tag}">${tag}</span>`
        ).join('');
        
        const popup = document.createElement('div');
        popup.className = 'nodus-add-tag-popup';
        popup.innerHTML = `
            <input type="text" class="add-tag-input" placeholder="Type tag name..." />
            <div class="tag-menu-label">${existingTags.length > 0 ? 'ALL TAGS' : 'SUGGESTED TAGS'}</div>
            <div class="suggested-tags">
                ${suggestedHTML}
            </div>
        `;

        document.body.appendChild(popup);
        
        // Calculate position (centered above the card)
        const card = addBtn.closest('.nodus-idea-card');
        if (!card) {
            console.error('[Dashboard] Card not found!');
            return;
        }
        
        const cardRect = card.getBoundingClientRect();
        const addBtnRect = addBtn.getBoundingClientRect();
        
        
        // Position above the + button, centered on card
        const left = cardRect.left + (cardRect.width / 2);
        const top = addBtnRect.top - 10;
        
        
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        popup.style.transform = 'translateX(-50%) translateY(-100%)';
        
        setTimeout(() => {
            popup.classList.add('active');
            const input = popup.querySelector('.add-tag-input');
            input.focus();
            
            // Prevent closing when clicking inside popup
            popup.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }, 10);

        // Input handler
        const input = popup.querySelector('.add-tag-input');
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                await this.addTagToCard(ideaId, input.value.trim().toUpperCase());
                input.value = '';
            }
        });

        // Suggested tags handler
        popup.querySelectorAll('.nodus-suggested-tag').forEach(sugTag => {
            sugTag.addEventListener('click', async (e) => {
                e.stopPropagation();
                const tagName = sugTag.dataset.tag;
                await this.addTagToCard(ideaId, tagName);
            });
        });
    },

    /**
     * Add tag to card
     */
    async addTagToCard(ideaId, tagName) {
        // Find idea
        for (const [queueName, ideas] of Object.entries(this.allIdeas)) {
            const idea = ideas.find(i => i.id === ideaId);
            if (idea) {
                // Check if tag already exists
                if (idea.tags && idea.tags.includes(tagName)) {
                    if (window.NODUS_UI) {
                        window.NODUS_UI.showToast(`Tag "${tagName}" already exists!`, 'warning');
                    }
                    return;
                }

                // Check limit
                if (idea.tags && idea.tags.length >= 4) {
                    if (window.NODUS_UI) {
                        window.NODUS_UI.showToast('Maximum 4 tags per card!', 'error');
                    }
                    return;
                }

                // Add tag ao FINAL (não muda a primeira tag)
                if (!idea.tags) idea.tags = [];
                idea.tags.push(tagName);

                // Save to storage
                const storageKey = `ideas_queue_${queueName}`;
                await chrome.storage.local.set({ [storageKey]: ideas });

                // Refresh to show new tag
                await this.refreshGrid();

                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast(`Tag "${tagName}" added!`, 'success');
                }

                // NOVO: Fechar popup automaticamente após adicionar tag
                this.closeAllTagMenus();

                // NÃO chamar checkAndMoveIdeaByTags aqui!
                // A tag foi adicionada ao FINAL, não alterou a primeira tag
                // O movimento só deve acontecer quando o usuário REORDENA as tags manualmente
                
                break;
            }
        }
    },

    /**
     * Close all tag menus and popups
     */

    /**
     * Close all tag menus and popups
     */
    closeAllTagMenus() {
        document.querySelectorAll('.nodus-tag-menu, .nodus-add-tag-popup').forEach(menu => {
            menu.classList.remove('active');
            setTimeout(() => menu.remove(), 300);
        });
    },
    
    /**
     * Clear all ideas from current queue
     */
    async clearCurrentQueue() {
        const queueName = this.getQueueDisplayName();
        const ideasCount = this.allIdeas[this.currentQueue]?.length || 0;
        
        if (ideasCount === 0) {
            if (window.NODUS_UI) {
                window.NODUS_UI.showToast('Queue is already empty', 'info');
            }
            return;
        }
        
        const message = window.NodusI18n
            ? window.NodusI18n.t('confirm.clearqueue', { count: ideasCount, queue: queueName })
            : `⚠️ Are you sure you want to clear ALL ${ideasCount} ideas from ${queueName} queue?\n\nThis action cannot be undone!`;
        const confirmed = await this.showCustomConfirm(message);

        if (!confirmed) return;
        
        try {
            const queueKey = `ideas_queue_${this.currentQueue}`;
            await chrome.storage.local.set({ [queueKey]: [] });
            
            
            if (window.NODUS_UI) {
                window.NODUS_UI.showToast(`🗑️ ${queueName} queue cleared successfully!`, 'success');
            }
            
            // Refresh view
            await this.loadIdeas();
            this.refreshView();
            
        } catch (error) {
            console.error('[Dashboard Cards] Error clearing queue:', error);
            if (window.NODUS_UI) {
                window.NODUS_UI.showToast('❌ Error clearing queue', 'error');
            }
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // ═════════════════════════════════════════════════════════════════
    // FUNÇÕES AUXILIARES PARA O NOVO SELETOR DE FILAS 3D
    // ═════════════════════════════════════════════════════════════════
    
    /**
     * Escurece uma cor em uma porcentagem
     */
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    },
    
    /**
     * Atualiza a sombra indicadora baseada nos botões ativos
     */
    updateShadowIndicator(container) {
        const activeButtons = container.querySelectorAll('.queue-button-new.active:not(:disabled)');
        const indicator = container.querySelector('#indicatorNew');
        const buttonsContainer = container.querySelector('#queueButtonsNew');
        
        if (activeButtons.length === 0 || !indicator || !buttonsContainer) return;
        
        const containerRect = buttonsContainer.getBoundingClientRect();
        
        if (containerRect.width === 0) {
            // Container ainda não está visível, tentar novamente em breve
            setTimeout(() => this.updateShadowIndicator(container), 100);
            return;
        }
        
        const firstActiveButton = activeButtons[0];
        const lastActiveButton = activeButtons[activeButtons.length - 1];
        
        const firstRect = firstActiveButton.getBoundingClientRect();
        const lastRect = lastActiveButton.getBoundingClientRect();
        
        const left = firstRect.left - containerRect.left;
        const width = (lastRect.right - firstRect.left);
        
        indicator.style.left = `${left}px`;
        indicator.style.width = `${width}px`;
        indicator.style.opacity = '1';
    },
    
    /**
     * Update inline drag bar
     */
    updateInlineDragBar(card) {
        const selectedItems = card.querySelectorAll('.inline-attachment-item.selected');
        const selectedFiles = Array.from(selectedItems).map(item => ({
            id: item.dataset.attachmentId,
            fileName: item.dataset.fileName,
            fileSize: item.dataset.fileSize,
            fileType: item.dataset.fileType
        }));
        
        
        if (window.NodusAttachmentsDragBar) {
            window.NodusAttachmentsDragBar.updateSelection(selectedFiles);
        } else {
            console.warn('[Dashboard Cards] NodusAttachmentsDragBar not available');
        }
    },
    
    /**
     * Update inline action buttons state
     */
    updateInlineActionButtons(card) {
        const selectedItems = card.querySelectorAll('.inline-attachment-item.selected');
        const count = selectedItems.length;
        
        
        const injectBtn = card.querySelector('.action-btn-inline[data-action="inject"]');
        const copyBtn = card.querySelector('.action-btn-inline[data-action="copy"]');
        const downloadBtn = card.querySelector('.action-btn-inline[data-action="download"]');
        const counters = card.querySelectorAll('.selected-count-inline');
        
        if (count > 0) {
            if (injectBtn) {
                injectBtn.disabled = false;
                injectBtn.classList.add('active');
            }
            if (copyBtn) {
                copyBtn.disabled = false;
                copyBtn.classList.add('active');
            }
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.classList.add('active');
            }
            counters.forEach(c => c.textContent = count);
        } else {
            if (injectBtn) {
                injectBtn.disabled = true;
                injectBtn.classList.remove('active');
            }
            if (copyBtn) {
                copyBtn.disabled = true;
                copyBtn.classList.remove('active');
            }
            if (downloadBtn) {
                downloadBtn.disabled = true;
                downloadBtn.classList.remove('active');
            }
            counters.forEach(c => c.textContent = '0');
        }
    },
    
    /**
     * Get selected files from inline
     */
    getSelectedInline(card) {
        const selectedItems = card.querySelectorAll('.inline-attachment-item.selected');
        return Array.from(selectedItems).map(item => ({
            id: item.dataset.attachmentId,
            fileName: item.dataset.fileName,
            fileSize: item.dataset.fileSize,
            fileType: item.dataset.fileType
        }));
    },
    
    /**
     * Inject selected files inline
     */
    async injectSelectedInline(card) {
        const selected = this.getSelectedInline(card);
        if (selected.length === 0) return;
        
        
        try {
            if (window.NodusDropHandler) {
                window.NodusDropHandler.currentFiles = selected;
                await window.NodusDropHandler.injectAsText();
                
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast('✅ Arquivos injetados!', 'success');
                }
            }
        } catch (error) {
            console.error('[Dashboard Cards] Error injecting:', error);
        }
    },
    
    /**
     * Copy selected files inline
     */
    async copySelectedInline(card) {
        const selected = this.getSelectedInline(card);
        if (selected.length === 0) return;
        
        
        try {
            let text = `📎 Arquivos (${selected.length}):\n\n`;
            for (const file of selected) {
                text += `• ${file.fileName} (${file.fileSize})\n`;
            }
            
            await navigator.clipboard.writeText(text);
            
            if (window.NODUS_UI) {
                window.NODUS_UI.showToast('✅ Info copiada!', 'success');
            }
        } catch (error) {
            console.error('[Dashboard Cards] Error copying:', error);
        }
    },
    
    /**
     * Download selected files inline
     */
    async downloadSelectedInline(card) {
        const selected = this.getSelectedInline(card);
        if (selected.length === 0) return;
        
        
        for (const file of selected) {
            try {
                await window.NodusAttachmentsDB.downloadFile(file.id);
            } catch (error) {
                console.error('[Dashboard Cards] Error downloading:', file.fileName, error);
            }
        }
        
        if (window.NODUS_UI) {
            window.NODUS_UI.showToast(`✅ ${selected.length} arquivo(s) baixado(s)!`, 'success');
        }
    }

};

// Initialize
NodusDashboardCards.init();

// Expose globally
window.NodusDashboardCards = NodusDashboardCards;

