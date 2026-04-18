/**
 * NODUS Dashboard Modal Controller
 * Manages the dashboard overlay, PIN system, tabs, and view switching
 * Version: 1.0.0 - FREE (Cards + Chains tabs active, Mind Map locked)
 */


const NodusDashboard = {
    // State
    isOpen: false,
    isPinned: false,
    activeTab: 'cards', // 'cards', 'chains', 'mindmap'
    
    // DOM Elements
    overlay: null,
    modal: null,
    
    // Zoom compensation
    _zoomLevel: 1,
    _resizeTimer: null,

    /**
     * Initialize the dashboard system
     */
    init() {
        this.createDashboardDOM();
        this.loadPinnedState();
        this.attachEventListeners();
        this._setupZoomListener();
    },
    
    /**
     * Create the dashboard modal DOM structure
     */
    createDashboardDOM() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'nodus-dashboard-overlay';
        this.overlay.className = 'nodus-dashboard-overlay';
        this.overlay.style.display = 'none';
        
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.id = 'nodus-dashboard-modal';
        this.modal.className = 'nodus-dashboard-modal';
        
        // ✅ Verificar licença para o badge
        const isPro = window.NodusLicense && window.NodusLicense.isPro();
        const licenseBadge = isPro 
            ? '<span id="nodus-license-badge" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 8px; text-transform: uppercase;">PRO</span>'
            : '<span id="nodus-license-badge" style="background: rgba(100, 116, 139, 0.3); color: #94a3b8; font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-left: 8px; text-transform: uppercase;">FREE</span>';
        
        // ✅ Obter URL do ícone da extensão
        const logoUrl = chrome.runtime.getURL('icons/logo.png');
        
        // Header
        const header = document.createElement('div');
        header.className = 'nodus-dashboard-header';
        header.innerHTML = `
            <div class="nodus-dashboard-title" style="flex: 1;">
                <img src="${logoUrl}" alt="NODUS" class="nodus-logo-img" style="width: 44px; height: 44px; margin-right: 12px;">
                <div style="display: flex; flex-direction: column; line-height: 1.2;">
                    <div style="display: flex; align-items: center;">
                        <strong style="font-size: 16px; color: #e2e8f0;">NODUS</strong>
                        ${licenseBadge}
                    </div>
                    <span style="font-size: 11px; color: #64748b; font-weight: 500;">Painel</span>
                </div>
            </div>
            <div class="nodus-dashboard-controls">
                <button id="nodus-dashboard-pin" class="nodus-dashboard-btn" title="Fixar painel">
                    📌
                </button>
                <button id="nodus-dashboard-settings" class="nodus-dashboard-btn" title="Configurações">
                    ⚙️
                </button>
                <button id="nodus-dashboard-close" class="nodus-dashboard-btn" title="Fechar">
                    ✕
                </button>
            </div>
        `;
        
        // Tabs
        const tabs = document.createElement('div');
        tabs.className = 'nodus-dashboard-tabs';
        const i18n = typeof NodusI18n !== 'undefined' ? NodusI18n : null;
        tabs.innerHTML = `
            <button class="nodus-tab-btn active" data-tab="cards">
                <span class="tab-icon">📇</span>
                <span class="tab-label">${i18n ? i18n.t('dashboard.cards') : 'Cards'}</span>
            </button>
            <button class="nodus-tab-btn" data-tab="chains">
                <span class="tab-icon">🔗</span>
                <span class="tab-label">${i18n ? i18n.t('dashboard.chains') : 'Chains'}</span>
            </button>
            <button class="nodus-tab-btn" data-tab="mindmap">
                <span class="tab-icon">📁</span>
                <span class="tab-label">${i18n ? i18n.t('dashboard.mindmap') : 'Projetos'}</span>
            </button>
        `;
        
        // Content area (will be populated by specific modules)
        const content = document.createElement('div');
        content.id = 'nodus-dashboard-content';
        content.className = 'nodus-dashboard-content';
        
        // Sidebar (EXTERNA ao modal, irmã)
        const sidebar = document.createElement('div');
        sidebar.id = 'nodus-sidebar-external';
        sidebar.className = 'nodus-sidebar-external';
        sidebar.style.display = 'none'; // Inicialmente oculta
        
        // Assemble modal
        this.modal.appendChild(header);
        this.modal.appendChild(tabs);
        this.modal.appendChild(content);
        
        // Append sidebar E modal ao overlay (irmãos)
        this.overlay.appendChild(sidebar);
        this.overlay.appendChild(this.modal);
        
        // Append to body
        document.body.appendChild(this.overlay);
        
    },
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button
        const closeBtn = document.getElementById('nodus-dashboard-close');
        closeBtn?.addEventListener('click', () => this.close());
        
        // Pin button
        const pinBtn = document.getElementById('nodus-dashboard-pin');
        pinBtn?.addEventListener('click', () => this.togglePin());
        
        // Settings button
        const settingsBtn = document.getElementById('nodus-dashboard-settings');
        settingsBtn?.addEventListener('click', () => this.openSettings());
        
        // Tab buttons
        const tabButtons = document.querySelectorAll('.nodus-tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.dataset.tab;
                if (!btn.classList.contains('locked')) {
                    this.switchTab(tab);
                } else {
                    this.showPremiumMessage();
                }
            });
        });
        
        // Click outside to close (only if not pinned)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay && !this.isPinned) {
                this.close();
            }
        });
        
        // ESC key to close (only if not pinned)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen && !this.isPinned) {
                this.close();
            }
        });
        
        // ✅ Listener de mudança de licença — atualiza badge sem reload
        window.addEventListener('nodus-license-changed', (e) => {
            this.updateLicenseBadge(e.detail.status === 'pro');
            if (this.isOpen) {
                this.switchTab(this.currentTab);
            }
        });
        
    },
    
    /**
     * Update license badge in header
     */
    updateLicenseBadge(isPro) {
        const badge = document.getElementById('nodus-license-badge');
        if (badge) {
            if (isPro) {
                badge.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                badge.style.color = 'white';
                badge.textContent = 'PRO';
            } else {
                badge.style.background = 'rgba(100, 116, 139, 0.3)';
                badge.style.color = '#94a3b8';
                badge.textContent = 'FREE';
            }
        }
    },
    
    /**
     * Open the dashboard
     */
    async open(initialTab = 'cards') {
        
        this.isOpen = true;
        this.overlay.style.display = 'flex';

        // Load saved column layout FIRST so cols class is set before zoom compensation
        const data = await chrome.storage.local.get('dashboard_column_layout');
        const columns = data.dashboard_column_layout || 1;
        this.updateModalWidth(columns);

        // Apply zoom compensation AFTER width is set — updateBodyMargin() reads
        // getBoundingClientRect() which needs the cols class to return the correct width
        this.applyZoomCompensation();

        // If was pinned before, restore pinned overlay class (layout already pushed by updateBodyMargin)
        if (this.isPinned) {
            this.overlay.classList.add('pinned');
            this.updateBodyMargin();
        }
        
        // Refresh tab labels with correct language — NodusI18n.init() is async so
        // the DOM may have been built with the default lang before storage was read.
        this.refreshTabLabels();

        // Switch to initial tab
        this.switchTab(initialTab);

        // Trigger animation
        setTimeout(() => {
            this.overlay.classList.add('active');
            this.modal.classList.add('active');
        }, 10);
        
        // Send message to background (for analytics/tracking)
        try {
            chrome.runtime.sendMessage({
                action: 'dashboard_opened',
                tab: initialTab
            });
        } catch (error) {
            // Extension context invalidated - ignore
        }
    },
    
    /**
     * Close the dashboard
     */
    close() {

        // Close File Tray if open
        if (window.NodusChainsUI && window.NodusChainsUI._fileTrayOpen) {
            window.NodusChainsUI.closeFileTray();
        }

        this.overlay.classList.remove('active');
        this.modal.classList.remove('active');

        // Clean up pinned state and restore page layout
        this.overlay.classList.remove('pinned');
        this.overlay.style.left = '';
        this.overlay.style.width = '';
        this._restorePlatformLayout();

        setTimeout(() => {
            this.overlay.style.display = 'none';
            this.isOpen = false;
        }, 300);
        
        // Send message to background
        try {
            chrome.runtime.sendMessage({
                action: 'dashboard_closed'
            });
        } catch (error) {
            // Extension context invalidated - ignore
        }
    },
    
    /**
     * Toggle PIN state
     */
    togglePin() {
        this.isPinned = !this.isPinned;
        
        const pinBtn = document.getElementById('nodus-dashboard-pin');
        
        if (this.isPinned) {
            pinBtn.classList.add('pinned');
            pinBtn.innerHTML = '📍';
            pinBtn.title = 'Desafixar painel';

            // Pinned mode: overlay transparent + push page content
            this.overlay.classList.add('pinned');
            this.updateBodyMargin();

        } else {
            pinBtn.classList.remove('pinned');
            pinBtn.innerHTML = '📌';
            pinBtn.title = 'Fixar painel';

            // Remove pinned mode
            this.overlay.classList.remove('pinned');
            this.overlay.style.left = '';
            this.overlay.style.width = '';
            this._restorePlatformLayout();

        }

        // Save state
        chrome.storage.local.set({ dashboard_pinned: this.isPinned });

        // Show toast
        if (window.NODUS_UI) {
            window.NODUS_UI.showToast(
                this.isPinned ? 'Dashboard fixado' : 'Dashboard solto',
                'success'
            );
        }
    },
    
    /**
     * Update body margin when pinned (based on column count)
     * Uses BASE_WIDTHS + cols class — never getBoundingClientRect(), which returns
     * the constrained visual width when the overlay itself is already too narrow.
     */
    updateBodyMargin() {
        if (!this.isPinned) return;
        const BASE_WIDTHS = { 1: 340, 2: 560, 3: 780, 4: 1000 };
        let colCount = 1;
        for (let c = 1; c <= 4; c++) {
            if (this.modal.classList.contains(`cols-${c}`)) { colCount = c; break; }
        }
        const visualWidth = BASE_WIDTHS[colCount] || 340;
        this.overlay.style.left = 'auto';
        this.overlay.style.width = visualWidth + 'px';
        this._pushPlatformLayout(visualWidth);
    },
    
    /**
     * Remove all column classes from body
     */
    removeBodyColumnClasses() {
        document.body.classList.remove('cols-1', 'cols-2', 'cols-3', 'cols-4');
    },
    
    /**
     * Load pinned state from storage
     */
    async loadPinnedState() {
        const data = await chrome.storage.local.get('dashboard_pinned');
        if (data.dashboard_pinned) {
            this.isPinned = true;
            const pinBtn = document.getElementById('nodus-dashboard-pin');
            if (pinBtn) {
                pinBtn.classList.add('pinned');
                pinBtn.innerHTML = '📍';
                pinBtn.title = 'Desafixar painel';
            }
        }
    },
    
    /**
     * Switch active tab
     */
    switchTab(tabName) {
        
        this.activeTab = tabName;
        
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.nodus-tab-btn');
        tabButtons.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Load content for the tab
        const contentArea = document.getElementById('nodus-dashboard-content');
        
        switch(tabName) {
            case 'cards':
                // FIX: Remover estilos inline deixados pelo Chains antes de renderizar Cards
                const inlineStyles = contentArea.querySelectorAll('style');
                inlineStyles.forEach(style => style.remove());
                
                // FIX CRÍTICO: Remover chains-view completamente e forçar reflow do CSS
                const chainsView = document.getElementById('chains-view');
                if (chainsView) {
                    chainsView.remove();
                }
                
                // Forçar reflow para resetar :has() selector
                contentArea.style.display = 'none';
                void contentArea.offsetHeight; // Trigger reflow
                contentArea.style.display = '';
                
                if (window.NodusDashboardCards) {
                    window.NodusDashboardCards.render(contentArea);
                    // Sync modal width to Cards column layout (may differ from previous tab)
                    this.updateModalWidth(window.NodusDashboardCards.columnLayout || 1);
                }
                break;
            case 'chains':
                // Chains-view dentro do content (sidebar é externa)
                let chainsViewChains = document.getElementById('chains-view');
                
                if (!chainsViewChains) {
                    contentArea.innerHTML = '<div id="chains-view"></div>';
                    chainsViewChains = document.getElementById('chains-view');
                }
                
                if (window.NodusChainsUI) {
                    window.NodusChainsUI.init();
                    // Sync modal width to Chains current grid layout
                    this.updateModalWidth(window.NodusChainsUI.currentGrid || 1);
                } else {
                    console.error('[Dashboard] NodusChainsUI não encontrado!');
                    // NÃO apagar o chains-view, só mostrar erro dentro dele
                    if (chainsViewChains) {
                        chainsViewChains.innerHTML = '<div class="coming-soon" style="text-align:center; padding:60px 20px; color:#a0aec0;">🔗 Chains view coming soon...</div>';
                    }
                }
                break;
            case 'mindmap':
                // Projetos — fixed at Grid II width (sidebar + list needs the space)
                this.updateModalWidth(2);
                if (window.NodusProjectsUI) {
                    window.NodusProjectsUI.init();
                } else {
                    contentArea.innerHTML = '<div style="text-align:center; padding:60px 20px; color:#a0aec0;">📁 Projetos - Carregando...</div>';
                }
                break;
        }
        
        // Save last active tab
        chrome.storage.local.set({ dashboard_last_tab: tabName });
    },
    
    /**
     * Update modal width based on column count
     */
    /**
     * Detect browser zoom level
     */
    _getZoomLevel() {
        if (window.outerWidth && window.innerWidth) {
            const ratio = window.outerWidth / window.innerWidth;
            return Math.round(ratio * 100) / 100;
        }
        return 1;
    },

    /**
     * Apply zoom compensation to the dashboard modal
     * Uses CSS zoom property to inversely scale when browser zoom > 100%
     */
    applyZoomCompensation() {
        const zoom = this._getZoomLevel();
        this._zoomLevel = zoom;

        if (zoom > 1.05) {
            const compensation = 1 / zoom;
            // CSS zoom on the modal scales ALL content (fonts, padding, borders, icons)
            // proportionally - this is the simplest and most complete fix
            this.modal.style.zoom = String(compensation);
            // Compensate height: zoom shrinks 100vh visually, so scale it back up
            this.modal.style.height = `${Math.round(zoom * 100)}vh`;
            // Compensate width: get the CSS class width and scale it up
            this._adjustWidthForZoom();
        } else {
            this.modal.style.zoom = '';
            this.modal.style.height = '';
            this.modal.style.removeProperty('width');
        }

        // Recalculate body margin if pinned
        if (this.isPinned) {
            this.updateBodyMargin();
        }
    },

    /**
     * Adjust modal width to compensate for CSS zoom
     */
    _adjustWidthForZoom() {
        if (this._zoomLevel <= 1.05) return;
        const widths = { 1: 340, 2: 560, 3: 780, 4: 1000 };
        // Detect current cols class
        for (let c = 1; c <= 4; c++) {
            if (this.modal.classList.contains(`cols-${c}`)) {
                // Scale up width so that after CSS zoom shrinks it, it matches the original visual size
                const scaledWidth = Math.round(widths[c] * this._zoomLevel);
                this.modal.style.width = scaledWidth + 'px';
                return;
            }
        }
    },


    /**
     * Get the main content container of the current AI platform
     */
    _getPlatformContainer() {
        const hostname = location.hostname;

        // ChatGPT: the flex column that holds the conversation
        if (hostname.includes('chatgpt') || hostname.includes('chat.openai')) {
            return document.querySelector('.flex.h-svh.w-screen') ||
                   document.querySelector('#__next > div > div');
        }
        // Claude
        if (hostname.includes('claude.ai')) {
            return document.querySelector('main') ||
                   document.querySelector('[class*="layout"]');
        }
        // Gemini
        if (hostname.includes('gemini.google')) {
            return document.querySelector('main') ||
                   document.querySelector('.conversation-container');
        }
        // Perplexity
        if (hostname.includes('perplexity.ai')) {
            return document.querySelector('main') ||
                   document.querySelector('#__next > div');
        }
        // Copilot
        if (hostname.includes('copilot.microsoft')) {
            return document.querySelector('main') ||
                   document.querySelector('#app');
        }
        // Grok
        if (hostname.includes('grok.com') || hostname.includes('x.com')) {
            return document.querySelector('main');
        }
        // DeepSeek
        if (hostname.includes('chat.deepseek')) {
            return document.querySelector('main') ||
                   document.querySelector('#root > div');
        }

        return null;
    },

    /**
     * Push platform layout to make room for pinned dashboard
     * Uses a <style> tag to override platform CSS without breaking flex layouts
     */
    _pushPlatformLayout(width) {
        this._restorePlatformLayout(); // Clean previous

        // Shrink overlay to just the sidebar area
        if (this.overlay) {
            this.overlay.style.left = 'auto';
            this.overlay.style.width = width + 'px';
        }

        // Direct approach: walk from <main> up and shrink ALL containers
        const mainEl = document.querySelector('main');
        if (mainEl) {
            let el = mainEl;
            while (el && el !== document.body) {
                el.dataset.nodusPinned = 'true';
                el.style.setProperty('max-width', `calc(100vw - ${width}px)`, 'important');
                el = el.parentElement;
            }
        }

        const style = document.createElement('style');
        style.id = 'nodus-pin-override';
        const w = width;
        style.textContent = `
            html, body { overflow-x: hidden !important; }

            /* All pinned containers */
            [data-nodus-pinned="true"] {
                max-width: calc(100vw - ${w}px) !important;
            }

            /* Claude: main content area */
            div[class*="threads-container"],
            main[class*="h-full"] {
                max-width: calc(100vw - ${w}px) !important;
            }

            /* Gemini */
            chat-window, .chat-container {
                max-width: calc(100vw - ${w}px) !important;
            }

            /* Perplexity */
            main[class*="flex"] {
                max-width: calc(100vw - ${w}px) !important;
            }

            /* Copilot */
            #app main, cib-serp {
                max-width: calc(100vw - ${w}px) !important;
            }

            /* Grok / DeepSeek / Generic */
            main {
                max-width: calc(100vw - ${w}px) !important;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Restore platform layout when unpinning
     */
    _restorePlatformLayout() {
        // Remove style tag
        const style = document.getElementById('nodus-pin-override');
        if (style) style.remove();

        // Restore all pinned containers
        document.querySelectorAll('[data-nodus-pinned="true"]').forEach(el => {
            el.style.removeProperty('max-width');
            delete el.dataset.nodusPinned;
        });

    },

    /**
     * Listen for window resize to detect zoom changes
     */
    _setupZoomListener() {
        window.addEventListener('resize', () => {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => {
                if (this.isOpen) {
                    this.applyZoomCompensation();
                }
            }, 200);
        });
    },

    updateModalWidth(columns) {

        const BASE_WIDTHS = { 1: 340, 2: 560, 3: 780, 4: 1000 };
        const baseWidth = BASE_WIDTHS[columns] || 340;

        // Remove all column classes, add new one (drives card grid layout)
        this.modal.classList.remove('cols-1', 'cols-2', 'cols-3', 'cols-4');
        this.modal.classList.add(`cols-${columns}`);

        // Set modal width directly in JS — CSS class alone unreliable when
        // zoom compensation previously set an inline style.width
        const zoom = this._getZoomLevel();
        this._zoomLevel = zoom;
        if (zoom > 1.05) {
            // Scale up so CSS zoom shrinks it back to baseWidth visually
            this.modal.style.width = Math.round(baseWidth * zoom) + 'px';
        } else {
            this.modal.style.width = baseWidth + 'px';
        }


        // If pinned, update overlay/body margin to match new width
        if (this.isPinned) {
            this.updateBodyMargin();
        }
    },
    
    /**
     * Show premium message for locked features
     */
    showPremiumMessage() {
        if (window.NODUS_UI) {
            window.NODUS_UI.showToast(
                '🔒 Projetos é um recurso premium',
                'info'
            );
        }
    },
    
    /**
     * Open settings (placeholder)
     */
    async openSettings() {
        
        // Helper para tradução
        const t = (key) => {
            if (typeof NodusI18n !== 'undefined') {
                return NodusI18n.t(key);
            }
            // Fallback em PT
            const fallbacks = {
                'settings.title': 'Configurações',
                'settings.injection': 'Injeção de Ideias',
                'settings.crossplatform': 'Cross-Platform Inject',
                'settings.crossplatform.desc': 'Permite injetar ideias em sites diferentes da origem',
                'settings.buttons': 'Botões no DOM',
                'settings.showbuttons': 'Exibir Botões Automáticos',
                'settings.showbuttons.desc': 'Mostra botão 💡 Save nas respostas automaticamente',
                'settings.showbuttons.note': 'Alterações nos botões requerem recarregar a página.',
                'settings.animation': 'Animação de Cards',
                'settings.animation.desc': 'Animação ao adicionar novos cards',
                'settings.animation.choose': 'Escolha como novos cards aparecem no dashboard',
                'settings.telemetry': 'Telemetria & Estatísticas',
                'settings.telemetry.warning': 'Desativar telemetria remove acesso às suas estatísticas pessoais',
                'settings.telemetry.mode0': 'Modo 0: Desligado',
                'settings.telemetry.mode0.desc': 'Sem telemetria, sem estatísticas',
                'settings.telemetry.mode1': 'Modo 1: Analytics Pessoal',
                'settings.telemetry.mode1.desc': '100% anônimo (SHA-256) + Veja suas estatísticas',
                'settings.telemetry.mode1.recommended': 'RECOMENDADO • Você nos ajuda, você ganha insights!',
                'settings.telemetry.viewstats': 'Ver Minhas Estatísticas',
                'settings.logs': 'Logs de Atividade',
                'settings.logs.desc': 'Últimas atividades registradas',
                'settings.logs.refresh': 'Atualizar',
                'settings.logs.clear': 'Limpar Todos os Logs',
                'settings.logs.loading': 'Carregando...',
                'settings.support': 'Apoie o NODUS',
                'settings.support.thanks': 'Obrigado por usar o NODUS!',
                'settings.support.message': 'O NODUS é feito com amor e café ☕. Se você acha útil, considere apoiar o desenvolvimento!',
                'settings.support.kofi': 'Ko-fi',
                'settings.support.kofi.desc': 'Compre um café para o desenvolvedor',
                'settings.support.github': 'GitHub Sponsors',
                'settings.support.github.desc': 'Apoio recorrente no GitHub',
                'settings.support.benefits': 'Seu apoio ajuda a:',
                'settings.support.benefit1': 'Manter o desenvolvimento ativo',
                'settings.support.benefit2': 'Adicionar novas funcionalidades',
                'settings.support.benefit3': 'Garantir privacidade e open source',
                'settings.support.benefit4': 'Suporte dedicado para apoiadores',
                'settings.support.note': 'Doações são voluntárias. O NODUS FREE é e sempre será funcional!',
                'settings.language': 'Idioma',
                'settings.language.auto': 'Detectar automaticamente',
                'settings.save': 'Salvar',
                'settings.cancel': 'Cancelar',
                'settings.saved': 'Configurações salvas!',
                'toast.telemetrydisabled': 'Telemetria desativada. Estatísticas não estarão disponíveis.',
                'settings.saveerror': 'Erro ao salvar configurações',
                'pro.feature': 'Feature PRO',
                'settings.help': 'Ajuda & Tour',
                'settings.onboarding.btn': '🎯 Ver Tour de Apresentação',
                'settings.onboarding.desc': 'Reveja o tutorial inicial com as funcionalidades do NODUS',
                'settings.onboarding.success': '✅ Tour reiniciado! Recarregue a página para ver.'
            };
            return fallbacks[key] || key;
        };
        
        // Load current settings
        const data = await chrome.storage.local.get(['settings', 'telemetry_stats', 'anon_id', 'nodus_language']);
        const settings = data.settings || {
            crossPlatformInject: false,
            showAutoButtons: true,
            showButtonsPlatforms: {
                chatgpt: true,
                claude: true,
                gemini: true,
                perplexity: true,
                copilot: true,
                grok: true,
                deepseek: true
            },
            cardAnimation: 'glow',
            telemetryMode: 1
        };
        
        // Remove any existing settings modal
        const existing = document.getElementById('nodus-settings-modal-container');
        if (existing) existing.remove();
        
        // Create modal container (z-index above dashboard)
        const modalContainer = document.createElement('div');
        modalContainer.id = 'nodus-settings-modal-container';
        modalContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(4px);
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            animation: fadeIn 0.2s ease-out;
        `;
        
        // Create modal (sidebar style like save modal)
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, #1e293b 0%, #1a1f29 100%);
            width: min(420px, 92vw);
            height: 100vh;
            box-shadow: -10px 0 40px rgba(0, 0, 0, 0.8);
            overflow-y: auto;
            animation: slideInRight 0.3s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        
        modal.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .accordion-section {
                    margin-bottom: 12px;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }
                .accordion-header {
                    padding: 14px 16px;
                    background: rgba(59, 130, 246, 0.1);
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.2s;
                    user-select: none;
                }
                .accordion-header:hover {
                    background: rgba(59, 130, 246, 0.15);
                }
                .accordion-header.active {
                    background: rgba(59, 130, 246, 0.2);
                }
                .accordion-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 600;
                    color: #e2e8f0;
                    font-size: 14px;
                }
                .accordion-icon {
                    color: #60a5fa;
                    font-size: 14px;
                    transition: transform 0.3s ease;
                }
                .accordion-icon.open {
                    transform: rotate(90deg);
                }
                .accordion-content {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease;
                    background: rgba(0, 0, 0, 0.2);
                }
                .accordion-content.open {
                    max-height: 1000px;
                }
                .accordion-inner {
                    padding: 16px;
                }
                
                /* Toggle Switch */
                #telemetryEnabled:checked + .toggle-slider-settings {
                    background-color: #10b981;
                }
                #telemetryEnabled:checked ~ .toggle-slider-dot {
                    transform: translateX(24px);
                }
            </style>
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 20px; border-bottom: 2px solid #3b82f6; position: sticky; top: 0; z-index: 10;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">⚙️</span>
                        <span style="font-size: 18px; font-weight: 700; color: #60a5fa;">${t('settings.title')}</span>
                    </div>
                    <button id="nodus-settings-close" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 24px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">×</button>
                </div>
            </div>
            
            <div style="padding: 20px;">
                
                <!-- Account & Plan (PRIMEIRO) -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="account">
                        <div class="accordion-title">
                            <span>👤</span>
                            <span>${t('settings.account')}</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="account">
                        <div class="accordion-inner" id="accountSection">
                            <!-- Conteúdo será preenchido dinamicamente -->
                        </div>
                    </div>
                </div>
                
                <!-- Injeção de Ideias -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="inject">
                        <div class="accordion-title">
                            <span>💉</span>
                            <span>${t('settings.injection')}</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="inject">
                        <div class="accordion-inner">
                            <label style="display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; cursor: pointer;">
                                <input type="checkbox" id="crossPlatformInject" ${settings.crossPlatformInject ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #e2e8f0; font-size: 13px;">${t('settings.crossplatform')}</div>
                                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${t('settings.crossplatform.desc')}</div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Botões no DOM -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="buttons">
                        <div class="accordion-title">
                            <span>💡</span>
                            <span>${t('settings.buttons')}</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="buttons">
                        <div class="accordion-inner">
                            <!-- Master Toggle -->
                            <label style="display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; cursor: pointer; margin-bottom: 16px;">
                                <input type="checkbox" id="showAutoButtons" ${settings.showAutoButtons ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #e2e8f0; font-size: 13px;">${t('settings.showbuttons')}</div>
                                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${t('settings.showbuttons.desc')}</div>
                                </div>
                            </label>
                            
                            <!-- Platform Controls -->
                            <div style="padding: 16px; background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 8px;">
                                <div style="font-weight: 600; color: #e2e8f0; font-size: 13px; margin-bottom: 12px;">🎯 Controle por Plataforma:</div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                    <!-- ChatGPT -->
                                    <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; cursor: pointer;">
                                        <input type="checkbox" id="showButtons_chatgpt" ${settings.showButtonsPlatforms?.chatgpt !== false ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                                        <span style="font-size: 12px; color: #e2e8f0;">💬 ChatGPT</span>
                                    </label>
                                    
                                    <!-- Claude -->
                                    <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(217, 119, 6, 0.1); border: 1px solid rgba(217, 119, 6, 0.3); border-radius: 6px; cursor: pointer;">
                                        <input type="checkbox" id="showButtons_claude" ${settings.showButtonsPlatforms?.claude !== false ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                                        <span style="font-size: 12px; color: #e2e8f0;">🧠 Claude</span>
                                    </label>
                                    
                                    <!-- Gemini -->
                                    <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; cursor: pointer;">
                                        <input type="checkbox" id="showButtons_gemini" ${settings.showButtonsPlatforms?.gemini !== false ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                                        <span style="font-size: 12px; color: #e2e8f0;">✨ Gemini</span>
                                    </label>
                                    
                                    <!-- Perplexity -->
                                    <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 6px; cursor: pointer;">
                                        <input type="checkbox" id="showButtons_perplexity" ${settings.showButtonsPlatforms?.perplexity !== false ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                                        <span style="font-size: 12px; color: #e2e8f0;">🔍 Perplexity</span>
                                    </label>
                                    
                                    <!-- Copilot -->
                                    <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 6px; cursor: pointer;">
                                        <input type="checkbox" id="showButtons_copilot" ${settings.showButtonsPlatforms?.copilot !== false ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                                        <span style="font-size: 12px; color: #e2e8f0;">🤖 Copilot</span>
                                    </label>
                                    
                                    <!-- Grok -->
                                    <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 6px; cursor: pointer;">
                                        <input type="checkbox" id="showButtons_grok" ${settings.showButtonsPlatforms?.grok !== false ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                                        <span style="font-size: 12px; color: #e2e8f0;">⚡ Grok</span>
                                    </label>
                                    
                                    <!-- DeepSeek -->
                                    <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; cursor: pointer;">
                                        <input type="checkbox" id="showButtons_deepseek" ${settings.showButtonsPlatforms?.deepseek !== false ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                                        <span style="font-size: 12px; color: #e2e8f0;">🌊 DeepSeek</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div style="margin-top: 10px; padding: 10px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 6px; font-size: 11px; color: #94a3b8;">
                                <strong style="color: #60a5fa;">ℹ️ Nota:</strong> ${t('settings.showbuttons.note')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Animação de Cards -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="animation">
                        <div class="accordion-title">
                            <span>✨</span>
                            <span>${t('settings.animation')}</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="animation">
                        <div class="accordion-inner">
                            <div style="padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;">
                                <div style="font-weight: 600; color: #e2e8f0; font-size: 13px; margin-bottom: 8px;">${t('settings.animation.desc')}</div>
                                <select id="cardAnimation" style="width: 100%; padding: 8px 12px; background: #1e293b; border: 1px solid #475569; border-radius: 6px; color: #e2e8f0; font-size: 13px; cursor: pointer;">
                                    <option value="glow" ${settings.cardAnimation === 'glow' || !settings.cardAnimation ? 'selected' : ''}>✨ Glow Pulse</option>
                                    <option value="slide" ${settings.cardAnimation === 'slide' ? 'selected' : ''}>📥 Slide + Fade</option>
                                    <option value="pop" ${settings.cardAnimation === 'pop' ? 'selected' : ''}>🎈 Pop + Bounce</option>
                                    <option value="flip" ${settings.cardAnimation === 'flip' ? 'selected' : ''}>🔄 Flip 3D</option>
                                    <option value="slide-right" ${settings.cardAnimation === 'slide-right' ? 'selected' : ''}>➡️ Slide from Right</option>
                                </select>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">${t('settings.animation.choose')}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Telemetria & Estatísticas -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="telemetry">
                        <div class="accordion-title">
                            <span>📊</span>
                            <span>${t('settings.telemetry')}</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="telemetry">
                        <div class="accordion-inner">
                            <div style="padding: 10px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; margin-bottom: 16px; font-size: 11px; color: #60a5fa; line-height: 1.5;">
                                <strong>ℹ️ Como funciona:</strong> Eventos são acumulados localmente e enviados em batch a cada <strong>100 eventos</strong> OU <strong>24 horas</strong> (o que vier primeiro).
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <!-- Toggle ON/OFF -->
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: #1e293b; border: 1px solid #334155; border-radius: 8px;">
                                    <div>
                                        <div style="font-weight: 600; color: #e2e8f0; font-size: 13px;">Telemetria</div>
                                        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Coleta estatísticas de uso</div>
                                    </div>
                                    <label style="position: relative; display: inline-block; width: 50px; height: 26px;">
                                        <input type="checkbox" id="telemetryEnabled" ${settings.telemetryMode === 1 || settings.telemetryMode === undefined ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                                        <span class="toggle-slider-settings" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4a5568; transition: 0.3s; border-radius: 26px;"></span>
                                        <span class="toggle-slider-dot" style="position: absolute; content: ''; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%;"></span>
                                    </label>
                                </div>
                                
                                <!-- Stats quando ON -->
                                <div id="telemetryStatsSection" style="display: ${settings.telemetryMode === 0 ? 'none' : 'block'};">
                                    <div style="padding: 14px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px;">
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                            <div>
                                                <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">📦 Events in queue</div>
                                                <div style="font-size: 16px; font-weight: 700; color: #10b981;" id="telemetry-queue-count">0</div>
                                            </div>
                                            <div>
                                                <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">🕐 Last sent</div>
                                                <div style="font-size: 12px; font-weight: 600; color: #e2e8f0;" id="telemetry-last-sent">Never</div>
                                            </div>
                                        </div>
                                        
                                        <div style="margin-bottom: 12px;">
                                            <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">📡 Next auto-send</div>
                                            <div style="font-size: 12px; font-weight: 600; color: #e2e8f0;" id="telemetry-next-send">in 24h</div>
                                        </div>
                                        
                                        <div style="height: 1px; background: rgba(34, 197, 94, 0.3); margin: 12px 0;"></div>
                                        
                                        <button id="btnSendTelemetryNow" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; color: white; font-weight: 700; border-radius: 8px; cursor: pointer; font-size: 12px; transition: all 0.2s;">
                                            🧪 Send Now (<span id="telemetry-send-count">0</span> events)
                                        </button>
                                        
                                        <div style="font-size: 9px; color: #64748b; text-align: center; margin-top: 8px; line-height: 1.4;">
                                            Batch sent every 100 events OR 24h
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Mensagem quando OFF -->
                                <div id="telemetryDisabledSection" style="display: ${settings.telemetryMode === 0 ? 'block' : 'none'}; padding: 20px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;">📊</div>
                                    <div style="font-weight: 600; color: #ef4444; font-size: 13px; margin-bottom: 4px;">Telemetria desativada</div>
                                    <div style="font-size: 11px; color: #94a3b8;">Ative para ver estatísticas e logs</div>
                                </div>
                            </div>
                            
                            <!-- Botão Ver Estatísticas -->
                            <button id="btnViewTelemetryStats" style="width: 100%; padding: 12px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #10b981; font-weight: 600; border-radius: 8px; cursor: pointer; margin-top: 12px; display: ${settings.telemetryMode === 0 ? 'none' : 'block'}; transition: all 0.2s;">
                                📊 ${t('settings.telemetry.viewstats')}
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Logs de Atividade -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="logs">
                        <div class="accordion-title">
                            <span>📝</span>
                            <span>${t('settings.logs')}</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="logs">
                        <div class="accordion-inner">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <span style="font-size: 12px; color: #94a3b8;">${t('settings.logs.desc')}</span>
                                <button id="btnRefreshLogs" style="padding: 6px 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; font-size: 11px; border-radius: 6px; cursor: pointer;">
                                    🔄 ${t('settings.logs.refresh')}
                                </button>
                            </div>
                            <div id="logsContainer" style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
                                <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
                                    ${t('settings.logs.loading')}
                                </div>
                            </div>
                            <div style="margin-top: 12px; padding: 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px;">
                                <button id="btnClearLogs" style="width: 100%; padding: 10px; background: transparent; border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                                    🗑️ ${t('settings.logs.clear')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Backup & Restore (PRO) -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="backup">
                        <div class="accordion-title">
                            <span>🔐</span>
                            <span>Backup & Restore</span>
                            <span style="font-size: 10px; padding: 2px 6px; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); border-radius: 4px; margin-left: 6px;">💎 PRO</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="backup">
                        <div class="accordion-inner" id="backupSection">
                            <!-- Conteúdo será preenchido dinamicamente -->
                        </div>
                    </div>
                </div>
                
                <!-- Idioma -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="language">
                        <div class="accordion-title">
                            <span>🌐</span>
                            <span>${t('settings.language')} / Language</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="language">
                        <div class="accordion-inner">
                            <div style="padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;">
                                <div style="font-weight: 600; color: #e2e8f0; font-size: 13px; margin-bottom: 8px;">Select interface language</div>
                                <select id="languageSelect" style="width: 100%; padding: 10px 12px; background: #1e293b; border: 1px solid #475569; border-radius: 6px; color: #e2e8f0; font-size: 13px; cursor: pointer;">
                                    <option value="auto">🔄 ${t('settings.language.auto')}</option>
                                    <option value="pt">🇧🇷 Português</option>
                                    <option value="en">🇺🇸 English</option>
                                    <option value="es">🇪🇸 Español</option>
                                    <option value="fr">🇫🇷 Français</option>
                                    <option value="de">🇩🇪 Deutsch</option>
                                    <option value="ja">🇯🇵 日本語</option>
                                    <option value="it">🇮🇹 Italiano</option>
                                    <option value="zh">🇨🇳 中文</option>
                                    <option value="ko">🇰🇷 한국어</option>
                                    <option value="hi">🇮🇳 हिन्दी</option>
                                </select>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                                    Language changes will be applied after page reload.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Ajuda & Tour -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="help">
                        <div class="accordion-title">
                            <span>🎯</span>
                            <span>${t('settings.help')}</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="help">
                        <div class="accordion-inner">
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                                    ${t('settings.onboarding.desc')}
                                </div>
                                <button id="nodus-settings-onboarding-btn"
                                    style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: linear-gradient(135deg, rgba(250,204,21,0.12) 0%, rgba(250,204,21,0.06) 100%); border: 1px solid rgba(250,204,21,0.3); border-radius: 8px; color: #facc15; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; font-family: inherit;">
                                    ${t('settings.onboarding.btn')}
                                </button>
                                <div id="nodus-settings-onboarding-msg" style="display: none; font-size: 12px; color: #4ade80; text-align: center; padding: 8px; background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.2); border-radius: 6px;">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════════ -->
                <!-- APOIE O NODUS -->
                <!-- ═══════════════════════════════════════════════════════════════ -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="support">
                        <div class="accordion-title">
                            <span>💝</span>
                            <span>${t('settings.support')}</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="support">
                        <div class="accordion-inner">
                            <!-- Mensagem de agradecimento -->
                            <div style="padding: 14px; background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 8px; margin-bottom: 16px;">
                                <div style="font-weight: 600; color: #f9a8d4; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                                    <span>💖</span>
                                    <span>${t('settings.support.thanks')}</span>
                                </div>
                                <div style="font-size: 12px; color: #fbbf24; line-height: 1.6;">
                                    ${t('settings.support.message')}
                                </div>
                            </div>
                            
                            <!-- Links de doação -->
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <!-- Ko-fi -->
                                <a href="https://ko-fi.com/mmcarvalho" target="_blank" style="display: flex; align-items: center; gap: 12px; padding: 14px; background: linear-gradient(135deg, rgba(255, 94, 94, 0.15) 0%, rgba(255, 61, 0, 0.15) 100%); border: 1px solid rgba(255, 94, 94, 0.4); border-radius: 8px; color: #ff5e5e; text-decoration: none; font-weight: 600; transition: all 0.2s;">
                                    <span style="font-size: 24px;">☕</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 14px; margin-bottom: 2px;">${t('settings.support.kofi')}</div>
                                        <div style="font-size: 11px; color: #fca5a5; font-weight: 400;">${t('settings.support.kofi.desc')}</div>
                                    </div>
                                    <span style="font-size: 16px;">→</span>
                                </a>
                                
                                <!-- GitHub Sponsors -->
                                <a href="https://github.com/sponsors/mmcarvalhodev" target="_blank" style="display: flex; align-items: center; gap: 12px; padding: 14px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 8px; color: #a78bfa; text-decoration: none; font-weight: 600; transition: all 0.2s;">
                                    <span style="font-size: 24px;">💜</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 14px; margin-bottom: 2px;">${t('settings.support.github')}</div>
                                        <div style="font-size: 11px; color: #c4b5fd; font-weight: 400;">${t('settings.support.github.desc')}</div>
                                    </div>
                                    <span style="font-size: 16px;">→</span>
                                </a>
                            </div>
                            
                            <!-- Benefícios para apoiadores -->
                            <div style="margin-top: 16px; padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 6px;">
                                <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                                    <div style="font-weight: 600; color: #60a5fa; margin-bottom: 8px;">✨ ${t('settings.support.benefits')}</div>
                                    <div style="margin-bottom: 4px;">🔹 ${t('settings.support.benefit1')}</div>
                                    <div style="margin-bottom: 4px;">🔹 ${t('settings.support.benefit2')}</div>
                                    <div style="margin-bottom: 4px;">🔹 ${t('settings.support.benefit3')}</div>
                                    <div>🔹 ${t('settings.support.benefit4')}</div>
                                </div>
                            </div>
                            
                            <!-- Nota sobre PRO -->
                            <div style="margin-top: 12px; font-size: 11px; color: #64748b; text-align: center; font-style: italic;">
                                💡 ${t('settings.support.note')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- About NODUS & Privacy -->
                <div class="accordion-section">
                    <div class="accordion-header" data-section="about">
                        <div class="accordion-title">
                            <span>📖</span>
                            <span>About NODUS & OpenCore</span>
                        </div>
                        <span class="accordion-icon">▶</span>
                    </div>
                    <div class="accordion-content" data-content="about">
                        <div class="accordion-inner">
                            <div style="padding: 14px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;">
                                <div style="font-weight: 600; color: #e2e8f0; font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                    <span>🔓</span>
                                    <span>Privacy-First | Open Core</span>
                                </div>
                                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 16px; line-height: 1.6;">
                                    NODUS is built on radical transparency. Our core capture system is 100% open source (MIT License) and auditable. Your data never leaves your device.
                                </div>
                                
                                <!-- Links importantes -->
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    <a href="https://github.com/mmcarvalhodev/nodus-core" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; color: #60a5fa; text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.2s;">
                                        <span>🔍</span>
                                        <span>GitHub Repository (Verify Code)</span>
                                    </a>
                                    
                                    <a href="https://github.com/mmcarvalhodev/nodus-core/blob/docs/docs/manifesto.md" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; color: #60a5fa; text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.2s;">
                                        <span>📖</span>
                                        <span>OpenCore Manifesto</span>
                                    </a>
                                    
                                    <a href="https://github.com/mmcarvalhodev/nodus-core/blob/docs/docs/faq.md" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; color: #60a5fa; text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.2s;">
                                        <span>❓</span>
                                        <span>FAQ (Hard Questions Answered)</span>
                                    </a>
                                    
                                    <a href="https://mmcarvalhodev.github.io/github.io/" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; color: #60a5fa; text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.2s;">
                                        <span>🌐</span>
                                        <span>Official Website</span>
                                    </a>
                                    
                                    <a href="mailto:mmcarvalho.dev@gmail.com" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; color: #60a5fa; text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.2s;">
                                        <span>✉️</span>
                                        <span>Contact Developer</span>
                                    </a>
                                </div>
                                
                                <!-- Versão e license -->
                                <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(100, 116, 139, 0.2); font-size: 11px; color: #64748b; text-align: center;">
                                    <div style="margin-bottom: 4px;">NODUS v4.168.0</div>
                                    <div>Core: MIT License | PRO: Commercial License</div>
                                    <div style="margin-top: 6px;">© 2025 M. M. Carvalho</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Botões de ação -->
                <div style="display: flex; gap: 10px; position: sticky; bottom: 0; background: #1a1f29; padding: 16px 0; border-top: 1px solid #2d3748;">
                    <button id="nodus-settings-save" style="flex: 1; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        ✅ ${t('settings.save')}
                    </button>
                    <button id="nodus-settings-cancel" style="background: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        ${t('settings.cancel')}
                    </button>
                </div>
            </div>
        `;
        
        modalContainer.appendChild(modal);
        document.body.appendChild(modalContainer);
        
        // ═══════════════════════════════════════════════════════════
        // INICIALIZAR SEÇÕES DINÂMICAS
        // ═══════════════════════════════════════════════════════════
        this.initializeAccountSection();
        this.initializeBackupSection();
        
        // ═══════════════════════════════════════════════════════════
        // ACCORDION LOGIC
        // ═══════════════════════════════════════════════════════════
        const accordionHeaders = modalContainer.querySelectorAll('.accordion-header');
        
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const section = header.dataset.section;
                const content = modalContainer.querySelector(`[data-content="${section}"]`);
                const icon = header.querySelector('.accordion-icon');
                const isOpen = content.classList.contains('open');
                
                // Close all sections
                modalContainer.querySelectorAll('.accordion-content').forEach(c => {
                    c.classList.remove('open');
                });
                modalContainer.querySelectorAll('.accordion-icon').forEach(i => {
                    i.classList.remove('open');
                });
                modalContainer.querySelectorAll('.accordion-header').forEach(h => {
                    h.classList.remove('active');
                });
                
                // Toggle current section (if it wasn't open)
                if (!isOpen) {
                    content.classList.add('open');
                    icon.classList.add('open');
                    header.classList.add('active');
                }
            });
        });
        
        // Event listeners
        const closeModal = () => modalContainer.remove();
        
        document.getElementById('nodus-settings-close').addEventListener('click', closeModal);
        document.getElementById('nodus-settings-cancel').addEventListener('click', closeModal);

        // Botão onboarding — limpa a flag e exibe mensagem de confirmação
        document.getElementById('nodus-settings-onboarding-btn').addEventListener('click', async () => {
            const btn = document.getElementById('nodus-settings-onboarding-btn');
            const msg = document.getElementById('nodus-settings-onboarding-msg');
            try {
                await chrome.storage.local.remove('nodus_onboarding_done');
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'default';
                msg.textContent = t('settings.onboarding.success');
                msg.style.display = 'block';
            } catch (e) {
                console.error('[Settings] Erro ao resetar onboarding:', e);
            }
        });
        
        // Telemetry toggle change
        const telemetryToggle = document.getElementById('telemetryEnabled');
        const telemetryStatsSection = document.getElementById('telemetryStatsSection');
        const telemetryDisabledSection = document.getElementById('telemetryDisabledSection');
        const btnViewStats = document.getElementById('btnViewTelemetryStats');
        
        // Atualizar contadores de telemetria
        const updateTelemetryCounters = async () => {
            try {
                const KEYS = {
                    EVENT_QUEUE: 'telemetry_event_queue',
                    LAST_SENT: 'telemetry_last_sent'
                };
                
                const storage = await chrome.storage.local.get([KEYS.EVENT_QUEUE, KEYS.LAST_SENT]);
                const queue = storage[KEYS.EVENT_QUEUE] || [];
                const lastSent = storage[KEYS.LAST_SENT] || 0;
                
                // Atualizar contadores
                document.getElementById('telemetry-queue-count').textContent = queue.length;
                document.getElementById('telemetry-send-count').textContent = queue.length;
                
                // Last sent
                if (lastSent > 0) {
                    const timeSince = Date.now() - lastSent;
                    const hoursSince = Math.floor(timeSince / (1000 * 60 * 60));
                    const minutesSince = Math.floor((timeSince % (1000 * 60 * 60)) / (1000 * 60));
                    
                    if (hoursSince > 0) {
                        document.getElementById('telemetry-last-sent').textContent = `${hoursSince}h ago`;
                    } else {
                        document.getElementById('telemetry-last-sent').textContent = `${minutesSince}m ago`;
                    }
                } else {
                    document.getElementById('telemetry-last-sent').textContent = 'Never';
                }
                
                // Next send
                const timeUntilSend = 24 * 60 * 60 * 1000 - (Date.now() - lastSent);
                const hoursUntil = Math.floor(timeUntilSend / (1000 * 60 * 60));
                
                if (queue.length >= 100) {
                    document.getElementById('telemetry-next-send').textContent = 'Now (100 events)';
                } else {
                    document.getElementById('telemetry-next-send').textContent = `in ${hoursUntil}h`;
                }
                
                // Desabilitar botão se fila vazia
                const btnSend = document.getElementById('btnSendTelemetryNow');
                btnSend.disabled = queue.length === 0;
                
            } catch (error) {
                console.error('[Settings] Error updating telemetry counters:', error);
            }
        };
        
        // Atualizar contadores ao abrir
        if (telemetryToggle.checked) {
            updateTelemetryCounters();
        }
        
        telemetryToggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            
            // Atualizar UI
            telemetryStatsSection.style.display = enabled ? 'block' : 'none';
            telemetryDisabledSection.style.display = enabled ? 'none' : 'block';
            btnViewStats.style.display = enabled ? 'block' : 'none';
            
            // Salvar no storage — sincronizar as duas chaves
            const settingsData = await chrome.storage.local.get('settings');
            const currentSettings = settingsData.settings || {};
            currentSettings.telemetryMode = enabled ? 1 : 0;
            await chrome.storage.local.set({ telemetry_enabled: enabled, settings: currentSettings });

            
            // Atualizar contadores se ativado
            if (enabled) {
                await updateTelemetryCounters();
            }
        });
        
        // Botão Send Now
        document.getElementById('btnSendTelemetryNow').addEventListener('click', async () => {
            
            const btn = document.getElementById('btnSendTelemetryNow');
            btn.disabled = true;
            btn.innerHTML = '⏳ Sending...';
            
            
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'SEND_TELEMETRY_NOW'
                });
                
                
                if (response && response.ok) {
                    btn.innerHTML = `✅ Sent ${response.sent} events!`;
                    setTimeout(async () => {
                        await updateTelemetryCounters();
                        btn.innerHTML = '🧪 Send Now (<span id="telemetry-send-count">0</span> events)';
                    }, 2000);
                } else {
                    console.error('[Settings] Send failed:', response);
                    btn.innerHTML = '❌ Error sending';
                    setTimeout(() => {
                        btn.innerHTML = '🧪 Send Now (<span id="telemetry-send-count">0</span> events)';
                        btn.disabled = false;
                    }, 2000);
                }
            } catch (error) {
                console.error('[Settings] Error sending telemetry:', error);
                btn.innerHTML = '❌ Error';
                setTimeout(() => {
                    btn.innerHTML = '🧪 Send Now (<span id="telemetry-send-count">0</span> events)';
                    btn.disabled = false;
                }, 2000);
            }
        });
        
        // View stats button
        document.getElementById('btnViewTelemetryStats').addEventListener('click', () => {
            this.showTelemetryStats(data);
        });
        
        // Logs functionality
        this.loadActivityLogs();
        
        document.getElementById('btnRefreshLogs').addEventListener('click', () => {
            this.loadActivityLogs();
        });
        
        document.getElementById('btnClearLogs').addEventListener('click', async () => {
            if (confirm('Tem certeza que deseja limpar todos os logs?')) {
                await this.clearActivityLogs();
            }
        });
        
        // Language setup
        const languageSelect = document.getElementById('languageSelect');
        const savedLang = data.nodus_language || 'auto';
        languageSelect.value = savedLang;
        
        // Save button
        document.getElementById('nodus-settings-save').addEventListener('click', async () => {
            try {
                const telemetryEnabled = document.getElementById('telemetryEnabled')?.checked;
                const selectedLanguage = document.getElementById('languageSelect')?.value || 'auto';
                
                const newSettings = {
                    crossPlatformInject: document.getElementById('crossPlatformInject')?.checked || false,
                    showAutoButtons: document.getElementById('showAutoButtons')?.checked || true,
                    showButtonsPlatforms: {
                        chatgpt: document.getElementById('showButtons_chatgpt')?.checked !== false,
                        claude: document.getElementById('showButtons_claude')?.checked !== false,
                        gemini: document.getElementById('showButtons_gemini')?.checked !== false,
                        perplexity: document.getElementById('showButtons_perplexity')?.checked !== false,
                        copilot: document.getElementById('showButtons_copilot')?.checked !== false,
                        grok: document.getElementById('showButtons_grok')?.checked !== false,
                        deepseek: document.getElementById('showButtons_deepseek')?.checked !== false
                    },
                    cardAnimation: document.getElementById('cardAnimation')?.value || 'glow',
                    telemetryMode: telemetryEnabled ? 1 : 0
                };
                
                await chrome.storage.local.set({ 
                    settings: newSettings,
                    nodus_language: selectedLanguage
                });
                
                // Atualizar i18n se disponível
                if (typeof NodusI18n !== 'undefined') {
                    await NodusI18n.setLanguage(selectedLanguage);
                    // Atualizar tab labels no DOM (criados uma vez no init)
                    NodusDashboard.refreshTabLabels();
                    // Re-renderizar tab atual com novo idioma
                    NodusDashboard.refreshCurrentTab();
                }
                
                if (window.NODUS_UI) {
                    if (newSettings.telemetryMode === 0) {
                        window.NODUS_UI.showToast('⚠️ Telemetria desativada. Estatísticas não estarão disponíveis.', 'warning');
                    } else {
                        window.NODUS_UI.showToast('✅ Configurações salvas!', 'success');
                    }
                }
                
                closeModal();
                
            } catch (error) {
                console.error('[Settings] Error saving:', error);
                if (window.NODUS_UI) {
                    window.NODUS_UI.showToast('❌ Erro ao salvar configurações', 'error');
                }
            }
        });
        
        // Click outside to close
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                closeModal();
            }
        });
    },
    
    // ═══════════════════════════════════════════════════════════════
    // LOGS DE ATIVIDADE
    // ═══════════════════════════════════════════════════════════════
    
    async loadActivityLogs() {
        const container = document.getElementById('logsContainer');
        if (!container) return;
        
        // 🔒 Verificar se telemetria está habilitada
        const { settings } = await chrome.storage.local.get('settings');
        if (settings?.telemetryMode === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px 20px; color: #64748b;">
                    <div style="font-size: 32px; margin-bottom: 12px;">🔒</div>
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 6px;">Logs Desabilitados</div>
                    <div style="font-size: 11px; color: #94a3b8;">Ative a telemetria para visualizar logs de atividade</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">Carregando...</div>';
        
        try {
            const logs = [];
            
            const platformLabels = {
                'chatgpt': 'ChatGPT',
                'claude': 'Claude',
                'gemini': 'Gemini',
                'perplexity': 'Perplexity',
                'copilot': 'Copilot',
                'grok': 'Grok',
                'deepseek': 'DeepSeek'
            };
            
            // Buscar eventos de telemetria (inject, create, delete, capture)
            try {
                const telemetryData = await chrome.storage.local.get('telemetry_event_log');
                const telemetryLogs = telemetryData.telemetry_event_log || [];
                
                telemetryLogs.forEach(event => {
                    const date = new Date(event.timestamp);
                    
                    // ✨ INJECT (injeção)
                    if (event.event_type === 'inject') {
                        const from = platformLabels[event.event_data?.platform_from] || event.event_data?.platform_from || '?';
                        const to = platformLabels[event.event_data?.platform_to] || event.event_data?.platform_to || '?';
                        
                        logs.push({
                            date,
                            type: 'inject',
                            icon: '💉',
                            text: `Injeção: ${from} → ${to}`,
                            platform: to,
                            originUrl: event.event_data?.url_origin || '',      // ✨ URL origem
                            preview: event.event_data?.url_destination || '-',  // ✨ URL destino
                            extra: `Tipo: ${event.event_data?.inject_type || 'full'}`
                        });
                    }
                    
                    // ✨ SAVE (captura/salvamento)
                    if (event.event_type === 'save') {
                        const platform = platformLabels[event.event_data?.platform_origin] || event.event_data?.platform_origin || '?';
                        const isQuick = event.event_data?.capture_method === 'quick';
                        
                        logs.push({
                            date,
                            type: isQuick ? 'quick_save' : 'save',
                            icon: isQuick ? '⚡' : '💾',
                            text: isQuick ? `Quick Save · ${platform}` : `Captura · ${platform}`,  // ✅ Plataforma adicionada
                            platform: platform,
                            preview: event.event_data?.url_origin || '-',
                            extra: event.event_data?.queue || 'default'
                        });
                    }
                    
                    // Chain create
                    if (event.event_type === 'chain_create') {
                        logs.push({
                            date,
                            type: 'chain_create',
                            icon: '📚',
                            text: `Chain criada (${event.metadata?.node_count || '?'} nodes)`,
                            platform: platformLabels[event.platform_origin] || event.platform_origin || '-',
                            preview: event.metadata?.chain_name || 'Chain',
                            extra: event.url_origin || '-'
                        });
                    }
                    
                    // Chain/Idea delete
                    if (event.event_type === 'delete') {
                        const isChain = event.content_type === 'chain';
                        logs.push({
                            date,
                            type: isChain ? 'chain_delete' : 'idea_delete',
                            icon: '🗑️',
                            text: isChain ? `Chain deletada (${event.metadata?.node_count || '?'})` : 'Ideia deletada',
                            platform: platformLabels[event.platform_origin] || event.platform_origin || '-',
                            preview: event.metadata?.chain_name || event.metadata?.queue_name || '-',
                            extra: event.url_origin || ''
                        });
                    }
                });
            } catch (e) {
                console.warn('[Settings] Erro ao buscar telemetria:', e);
            }
            
            // Ordenar por data (mais recentes primeiro)
            logs.sort((a, b) => b.date.getTime() - a.date.getTime());
            
            if (logs.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">Nenhum log encontrado</div>';
                return;
            }
            
            // Renderizar logs (máximo 50)
            container.innerHTML = logs.slice(0, 50).map(log => {
                const timeStr = log.date.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                // Criar badges de URL com hover e click
                let urlSection = '';
                if (log.type === 'inject') {
                    // Inject tem origem e destino
                    const originUrl = log.originUrl || '';
                    const destUrl = log.preview || '';
                    
                    urlSection = `
                        <div style="display: flex; gap: 6px; font-size: 10px; margin-bottom: 2px;">
                            ${originUrl ? `
                                <span class="url-badge" data-url="${originUrl}" title="${originUrl}"
                                      style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 2px 6px; border-radius: 4px; cursor: pointer; border: 1px solid rgba(59, 130, 246, 0.3);">
                                    📍 Origem
                                </span>
                            ` : ''}
                            ${destUrl && destUrl !== '-' ? `
                                <span class="url-badge" data-url="${destUrl}" title="${destUrl}"
                                      style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 6px; border-radius: 4px; cursor: pointer; border: 1px solid rgba(16, 185, 129, 0.3);">
                                    🎯 Destino
                                </span>
                            ` : ''}
                        </div>
                    `;
                } else if (log.preview && log.preview !== '-') {
                    // Save/outros têm apenas uma URL
                    urlSection = `
                        <div style="display: flex; gap: 6px; font-size: 10px; margin-bottom: 2px;">
                            <span class="url-badge" data-url="${log.preview}" title="${log.preview}"
                                  style="background: rgba(139, 92, 246, 0.2); color: #a78bfa; padding: 2px 6px; border-radius: 4px; cursor: pointer; border: 1px solid rgba(139, 92, 246, 0.3);">
                                🔗 URL
                            </span>
                        </div>
                    `;
                }
                
                return `
                    <div style="display: flex; align-items: flex-start; gap: 10px; padding: 10px; background: rgba(0, 0, 0, 0.2); border-radius: 6px; font-size: 12px;">
                        <span style="font-size: 16px; margin-top: 2px;">${log.icon}</span>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="color: #e2e8f0; font-weight: 600; font-size: 12px;">${log.text}</span>
                                <span style="color: #64748b; font-size: 10px; white-space: nowrap; margin-left: 8px;">${timeStr}</span>
                            </div>
                            ${urlSection}
                            ${log.extra ? `<div style="font-size: 10px; color: #64748b;">ℹ️ ${log.extra}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            // Adicionar event listeners para copiar URL ao clicar
            container.querySelectorAll('.url-badge').forEach(badge => {
                badge.addEventListener('click', async (e) => {
                    const url = e.target.getAttribute('data-url');
                    try {
                        await navigator.clipboard.writeText(url);
                        const originalBg = e.target.style.background;
                        const originalText = e.target.textContent;
                        e.target.style.background = 'rgba(16, 185, 129, 0.3)';
                        e.target.textContent = '✓ Copiado!';
                        setTimeout(() => {
                            e.target.style.background = originalBg;
                            e.target.textContent = originalText;
                        }, 1500);
                    } catch (err) {
                        console.error('Erro ao copiar URL:', err);
                    }
                });
            });
            
        } catch (error) {
            console.error('[Settings] Erro ao carregar logs:', error);
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444; font-size: 12px;">Erro ao carregar logs</div>';
        }
    },
    
    async clearActivityLogs() {
        try {
            // 1. Buscar logs atuais
            const data = await chrome.storage.local.get('telemetry_event_log');
            const currentLogs = data.telemetry_event_log || [];
            
            if (currentLogs.length === 0) {
                window.NODUS_UI?.showToast('ℹ️ Nenhum log para limpar', 'info');
                return;
            }
            
            // 2. BACKUP SILENCIOSO (só para recovery/suporte)
            await chrome.storage.local.set({
                telemetry_event_log_backup: currentLogs,
                telemetry_event_log_backup_date: new Date().toISOString()
            });
            
            // 3. Limpar logs visíveis
            await chrome.storage.local.set({ telemetry_event_log: [] });
            
            // 4. Atualizar UI
            const logsContainer = document.getElementById('activityLogsContainer');
            if (logsContainer) {
                logsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b;">Nenhum log encontrado</div>';
            }
            
            // 5. Feedback ao usuário
            window.NODUS_UI?.showToast('🗑️ Logs limpos', 'success');
            
            
        } catch (error) {
            console.error('[Settings] Erro ao limpar logs:', error);
            window.NODUS_UI?.showToast('❌ Erro ao limpar logs', 'error');
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ACCOUNT & PLAN
    // ═══════════════════════════════════════════════════════════════
    
    async initializeAccountSection() {
        const accountSection = document.getElementById('accountSection');
        if (!accountSection) return;
        
        // Buscar dados da licença
        const licenseData = await chrome.storage.local.get('nodus_license');
        const license = licenseData.nodus_license || {};
        const isPro = license.status === 'pro';
        const hasLicenseData = !!(license.email || license.expiresAt); // Teve/tem licença
        
        if (!hasLicenseData) {
            // FREE USER (nunca teve PRO)
            const t = (key) => window.NodusI18n ? window.NodusI18n.t(key) : key;
            
            accountSection.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <!-- Account Info -->
                    <div style="padding: 16px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 8px;">
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px;">📧</span>
                                <div>
                                    <div style="font-size: 11px; color: #94a3b8;">${t('account.email')}</div>
                                    <div style="font-size: 13px; color: #e2e8f0; font-weight: 600;">${t('account.notconnected')}</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px;">📦</span>
                                <div>
                                    <div style="font-size: 11px; color: #94a3b8;">${t('account.plan')}</div>
                                    <div style="font-size: 13px; color: #64748b; font-weight: 600;">${t('account.free')}</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px;">📅</span>
                                <div>
                                    <div style="font-size: 11px; color: #94a3b8;">${t('account.membersince')}</div>
                                    <div style="font-size: 13px; color: #e2e8f0;">December 2024</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Upgrade Card -->
                    <div style="padding: 20px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%); border: 2px solid rgba(251, 191, 36, 0.3); border-radius: 12px;">
                        <div style="text-align: center; margin-bottom: 16px;">
                            <div style="font-size: 24px; margin-bottom: 8px;">🚀</div>
                            <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 4px;">${t('account.upgradetitle')}</div>
                            <div style="font-size: 12px; color: #94a3b8;">${t('account.upgradesubtitle')}</div>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #e2e8f0;">
                                <span style="color: #10b981;">✓</span>
                                <span>${t('account.feature.queues')}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #e2e8f0;">
                                <span style="color: #10b981;">✓</span>
                                <span>${t('account.feature.export')}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #e2e8f0;">
                                <span style="color: #10b981;">✓</span>
                                <span>${t('account.feature.chains')}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #e2e8f0;">
                                <span style="color: #10b981;">✓</span>
                                <span>${t('account.feature.stats')}</span>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 8px;">
                            <button id="btnActivatePro" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); border: none; color: #000; font-weight: 700; font-size: 13px; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                ✉️ ${t('account.activateemail')}
                            </button>
                            <a href="https://nodus-ai.app/checkout.html" target="_blank" style="flex: 1; padding: 12px; background: rgba(251, 191, 36, 0.2); border: 2px solid rgba(251, 191, 36, 0.4); color: #fbbf24; font-weight: 700; font-size: 13px; border-radius: 8px; cursor: pointer; transition: all 0.2s; text-decoration: none; display: flex; align-items: center; justify-content: center;">
                                💳 ${t('account.buynow')}
                            </a>
                        </div>
                        
                        <div style="margin-top: 12px; text-align: center; font-size: 11px; color: #94a3b8;">
                            ${t('account.pricing')}
                        </div>
                    </div>
                </div>
            `;
            
            // Event listener para ativar PRO
            document.getElementById('btnActivatePro').addEventListener('click', () => {
                // Fechar Settings primeiro
                const settingsModal = document.getElementById('nodus-settings-modal-container');
                if (settingsModal) {
                    settingsModal.remove();
                }
                
                // Pequeno delay para garantir que Settings fechou
                setTimeout(() => {
                    if (window.NodusLicense) {
                        window.NodusLicense.showActivationModal();
                    }
                }, 200);
            });
            
        } else {
            // PRO USER ou EXPIRED (mostra dados em ambos os casos)
            const email = license.email || 'Not available';
            const plan = license.plan || 'Unknown';
            const activatedAt = license.activatedAt ? new Date(license.activatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Unknown';
            
            // Calcular dias ativos
            const activeDays = license.activatedAt 
                ? Math.floor((Date.now() - license.activatedAt) / (1000 * 60 * 60 * 24))
                : 0;
            
            // Determinar status e data de expiração/renovação
            let statusHTML = '';
            const expiresAt = license.expiresAt;
            const renewsAt = license.renewsAt;
            
            
            if (renewsAt) {
                // Subscription ativa
                const renewDate = new Date(renewsAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                statusHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 18px;">🔄</span>
                        <div>
                            <div style="font-size: 11px; color: #94a3b8;">Renews</div>
                            <div style="font-size: 13px; color: #10b981; font-weight: 600;">${renewDate}</div>
                        </div>
                    </div>
                `;
            } else if (expiresAt) {
                // Trial ou cancelado
                const expireDate = new Date(expiresAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const isExpired = Date.now() > expiresAt;
                statusHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 18px;">${isExpired ? '⚠️' : '📆'}</span>
                        <div>
                            <div style="font-size: 11px; color: #94a3b8;">${isExpired ? 'EXPIRED' : 'Expires'}</div>
                            <div style="font-size: 13px; color: ${isExpired ? '#ef4444' : '#fbbf24'}; font-weight: 600;">${expireDate}</div>
                        </div>
                    </div>
                `;
            }
            
            accountSection.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <!-- Account Info -->
                    <div style="padding: 16px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%); border: 2px solid rgba(251, 191, 36, 0.3); border-radius: 8px;">
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px;">📧</span>
                                <div>
                                    <div style="font-size: 11px; color: #94a3b8;">Email</div>
                                    <div style="font-size: 13px; color: #e2e8f0; font-weight: 600;">${email}</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px;">${isPro ? '👑' : '📦'}</span>
                                <div>
                                    <div style="font-size: 11px; color: #94a3b8;">Plan</div>
                                    <div style="font-size: 13px; color: ${isPro ? '#fbbf24' : '#ef4444'}; font-weight: 700;">${isPro ? `PRO (${plan})` : `FREE (expired ${plan})`}</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px;">📅</span>
                                <div>
                                    <div style="font-size: 11px; color: #94a3b8;">Activated</div>
                                    <div style="font-size: 13px; color: #e2e8f0;">${activatedAt}</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px;">⏱️</span>
                                <div>
                                    <div style="font-size: 11px; color: #94a3b8;">Active for</div>
                                    <div style="font-size: 13px; color: #e2e8f0;">${activeDays} day${activeDays !== 1 ? 's' : ''}</div>
                                </div>
                            </div>
                            ${statusHTML}
                        </div>
                    </div>
                    
                    <!-- Status Message -->
                    ${expiresAt && Date.now() > expiresAt ? `
                        <div style="padding: 12px; background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; border-radius: 8px; text-align: center;">
                            <div style="font-size: 16px; color: #ef4444; font-weight: 700; margin-bottom: 4px;">⚠️ LICENSE EXPIRED</div>
                            <div style="font-size: 12px; color: #fca5a5;">Your trial or subscription has ended. Renew to keep PRO features.</div>
                        </div>
                    ` : `
                        <div style="padding: 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; text-align: center;">
                            <div style="font-size: 14px; color: #10b981; font-weight: 600;">✅ All PRO features unlocked</div>
                        </div>
                    `}
                    
                    <!-- Disconnect Confirmation (hidden by default) -->
                    <div id="disconnectConfirmation" style="display: none; padding: 16px; background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 8px; margin-top: 16px;">
                        <div style="font-size: 14px; color: #ef4444; font-weight: 600; margin-bottom: 8px;">
                            ⚠️ Disconnect Account?
                        </div>
                        <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 12px; line-height: 1.5;">
                            You will need to re-enter your email and license key to reconnect.
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button id="btnConfirmDisconnect" style="flex: 1; padding: 10px; background: #ef4444; border: none; color: white; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer;">
                                Yes, Disconnect
                            </button>
                            <button id="btnCancelDisconnect" style="flex: 1; padding: 10px; background: rgba(100, 116, 139, 0.3); border: none; color: #cbd5e1; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer;">
                                Cancel
                            </button>
                        </div>
                    </div>
                    
                    <!-- Disconnect Account Button -->
                    <button id="btnDisconnectAccount" style="width: 100%; padding: 12px; margin-top: 16px; background: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        🚪 Disconnect Account
                    </button>
                    
                    <!-- Debug: Revert to FREE -->
                    <button id="btnRevertToFree" style="width: 100%; padding: 10px; margin-top: 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        🔓 Revert to FREE (debug)
                    </button>
                </div>
            `;
            
            // Event listener para mostrar confirmação
            document.getElementById('btnDisconnectAccount')?.addEventListener('click', () => {
                const confirmBox = document.getElementById('disconnectConfirmation');
                const btn = document.getElementById('btnDisconnectAccount');
                if (confirmBox.style.display === 'none') {
                    confirmBox.style.display = 'block';
                    btn.style.background = 'rgba(239, 68, 68, 0.2)';
                    btn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                } else {
                    confirmBox.style.display = 'none';
                    btn.style.background = 'rgba(100, 116, 139, 0.2)';
                    btn.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                }
            });
            
            // Event listener para confirmar disconnect
            document.getElementById('btnConfirmDisconnect')?.addEventListener('click', async () => {
                if (window.NodusLicense) {
                    await window.NodusLicense.setFree();
                    // Fechar settings e recarregar dashboard
                    const settingsModal = document.getElementById('nodus-settings-modal-container');
                    if (settingsModal) settingsModal.remove();
                }
            });
            
            // Event listener para cancelar
            document.getElementById('btnCancelDisconnect')?.addEventListener('click', () => {
                const confirmBox = document.getElementById('disconnectConfirmation');
                const btn = document.getElementById('btnDisconnectAccount');
                confirmBox.style.display = 'none';
                btn.style.background = 'rgba(100, 116, 139, 0.2)';
                btn.style.borderColor = 'rgba(100, 116, 139, 0.3)';
            });
            
            // Event listener para reverter FREE
            document.getElementById('btnRevertToFree')?.addEventListener('click', async () => {
                if (confirm('Are you sure you want to revert to FREE plan?')) {
                    if (window.NodusLicense) {
                        await window.NodusLicense.setFree();
                    }
                }
            });
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // BACKUP & RESTORE (PRO)
    // ═══════════════════════════════════════════════════════════════
    
    async initializeBackupSection() {
        const backupSection = document.getElementById('backupSection');
        if (!backupSection) return;
        
        // Verificar licença
        const licenseData = await chrome.storage.local.get('nodus_license');
        const license = licenseData.nodus_license || {};
        const isPro = license.status === 'pro';
        
        // 💾 Mudar ícone do header para BACKUP se PRO (sem cadeado)
        const backupHeader = document.querySelector('[data-section="backup"] .accordion-title span:first-child');
        if (backupHeader && isPro) {
            backupHeader.textContent = '💾';
        }
        
        backupSection.innerHTML = `
            ${!isPro ? `
                <div style="padding: 12px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 13px; color: #a855f7; font-weight: 600; margin-bottom: 6px;">
                        🔒 Feature PRO
                    </div>
                    <div style="font-size: 11px; color: #94a3b8;">
                        Backup criptografado com AES-256-GCM está disponível apenas para usuários PRO.
                    </div>
                </div>
            ` : ''}
            
            <div style="padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; margin-bottom: 12px; ${!isPro ? 'opacity: 0.5;' : ''}">
                <div style="font-weight: 600; color: #e2e8f0; font-size: 13px; margin-bottom: 8px;">
                    🔐 Backup Criptografado
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">
                    Todos os seus dados protegidos com criptografia AES-256-GCM
                </div>
                
                <!-- Password Input -->
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">
                        Senha de proteção (mín. 8 caracteres)
                    </label>
                    <div style="display: flex; gap: 6px;">
                        <input 
                            type="password" 
                            id="backupPassword" 
                            placeholder="Digite sua senha"
                            ${!isPro ? 'disabled' : ''}
                            style="flex: 1; padding: 8px 10px; background: #1e293b; border: 1px solid #475569; border-radius: 6px; color: #e2e8f0; font-size: 12px;"
                        />
                        <button 
                            id="toggleBackupPassword" 
                            ${!isPro ? 'disabled' : ''}
                            style="padding: 8px 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; border-radius: 6px; cursor: pointer; font-size: 14px;">
                            👁️
                        </button>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 8px;">
                    <button 
                        id="btnExportBackup" 
                        ${!isPro ? 'disabled' : ''}
                        style="flex: 1; padding: 10px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #10b981; font-weight: 600; border-radius: 6px; cursor: ${isPro ? 'pointer' : 'not-allowed'}; font-size: 12px; transition: all 0.2s;">
                        📥 Export Backup
                    </button>
                    <button 
                        id="btnImportBackup" 
                        ${!isPro ? 'disabled' : ''}
                        style="flex: 1; padding: 10px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; font-weight: 600; border-radius: 6px; cursor: ${isPro ? 'pointer' : 'not-allowed'}; font-size: 12px; transition: all 0.2s;">
                        📤 Import Backup
                    </button>
                </div>
                
                <!-- File input (hidden) -->
                <input type="file" id="backupFileInput" accept=".nodus.encrypted" style="display: none;">
            </div>
            
            <!-- Security Info -->
            <div style="padding: 10px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 6px; font-size: 10px; color: #10b981;">
                <strong>🔒 Segurança:</strong> Seus dados são criptografados com AES-256-GCM (padrão militar) usando PBKDF2 com 100,000 iterações. Apenas você tem acesso com sua senha.
            </div>
            
            <!-- Warning -->
            <div style="margin-top: 10px; padding: 10px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 6px; font-size: 10px; color: #fbbf24;">
                <strong>⚠️ Importante:</strong> Guarde sua senha! Não é possível recuperar dados sem ela. O backup sobrescreve todos os dados ao importar.
            </div>
        `;
        
        if (!isPro) return;
        
        
        // Event Listeners
        const togglePasswordBtn = document.getElementById('toggleBackupPassword');
        const passwordInput = document.getElementById('backupPassword');
        const exportBtn = document.getElementById('btnExportBackup');
        const importBtn = document.getElementById('btnImportBackup');
        const fileInput = document.getElementById('backupFileInput');
        
        console.log('[Backup] Elements:', {
            togglePasswordBtn: !!togglePasswordBtn,
            passwordInput: !!passwordInput,
            exportBtn: !!exportBtn,
            importBtn: !!importBtn,
            fileInput: !!fileInput
        });
        
        // Toggle password visibility
        togglePasswordBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePasswordBtn.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                togglePasswordBtn.textContent = '👁️';
            }
        });
        
        // Export backup
        exportBtn.addEventListener('click', () => {
            this.exportEncryptedBackup();
        });
        
        
        // Import backup
        importBtn.addEventListener('click', () => {
            
            // Verificar senha ANTES de abrir file picker
            const password = passwordInput.value;
            
            if (!password || password.length < 8) {
                
                // HIGHLIGHT + SHAKE no input para chamar atenção
                passwordInput.style.animation = 'none';
                passwordInput.style.border = '2px solid #ef4444';
                passwordInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.3)';
                
                setTimeout(() => {
                    passwordInput.style.animation = 'shake 0.5s ease-in-out';
                }, 10);
                
                // Focus no input
                passwordInput.focus();
                
                // Remover destaque após 2s
                setTimeout(() => {
                    passwordInput.style.border = '1px solid #475569';
                    passwordInput.style.boxShadow = 'none';
                    passwordInput.style.animation = 'none';
                }, 2000);
                
                window.NODUS_UI?.showToast('⚠️ Digite a senha do backup primeiro (mín. 8 caracteres)', 'warning');
                return;
            }
            
            // Senha OK - abrir file picker
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => this.importEncryptedBackup(e));
    },
    
    async exportEncryptedBackup() {
        
        // Verificar licença PRO
        const licenseData = await chrome.storage.local.get('nodus_license');
        const license = licenseData.nodus_license || {};
        
        if (license.status !== 'pro') {
            window.NODUS_UI?.showToast('🔒 Backup criptografado é uma feature PRO', 'warning');
            return;
        }
        
        const passwordInput = document.getElementById('backupPassword');
        const password = passwordInput?.value;
        
        
        if (!password || password.length < 8) {
            
            // HIGHLIGHT + SHAKE no input para chamar atenção
            passwordInput.style.animation = 'none';
            passwordInput.style.border = '2px solid #ef4444';
            passwordInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.3)';
            
            setTimeout(() => {
                passwordInput.style.animation = 'shake 0.5s ease-in-out';
            }, 10);
            
            // Focus no input
            passwordInput.focus();
            
            // Remover destaque após 2s
            setTimeout(() => {
                passwordInput.style.border = '1px solid #475569';
                passwordInput.style.boxShadow = 'none';
                passwordInput.style.animation = 'none';
            }, 2000);
            
            window.NODUS_UI?.showToast('⚠️ Senha deve ter pelo menos 8 caracteres', 'warning');
            return;
        }
        
        try {
            window.NODUS_UI?.showToast('🔐 Criando backup criptografado...', 'info');
            
            // Get all data
            const data = await chrome.storage.local.get(null);
            const dataStr = JSON.stringify(data);
            
            // Encrypt
            const encrypted = await this.encryptData(dataStr, password);
            
            const backup = {
                version: '1.0',
                app: 'NODUS',
                timestamp: Date.now(),
                salt: encrypted.salt,
                iv: encrypted.iv,
                data: encrypted.data
            };
            
            // Download
            const blob = new Blob([JSON.stringify(backup)], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nodus_backup_${Date.now()}.nodus.encrypted`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            window.NODUS_UI?.showToast('✅ Backup criado com sucesso!', 'success');
            
            
        } catch (error) {
            console.error('[Backup] ❌ Erro ao criar backup:', error);
            console.error('[Backup] Stack:', error.stack);
            window.NODUS_UI?.showToast('❌ Erro ao criar backup', 'error');
        }
    },
    
    async importEncryptedBackup(event) {
        // Verificar licença PRO
        const licenseData = await chrome.storage.local.get('nodus_license');
        const license = licenseData.nodus_license || {};
        if (license.status !== 'pro') {
            window.NODUS_UI?.showToast('🔒 Backup criptografado é uma feature PRO', 'warning');
            event.target.value = '';
            return;
        }
        
        const file = event.target.files[0];
        if (!file) return;
        
        const passwordInput = document.getElementById('backupPassword');
        const password = passwordInput.value;
        
        if (!password) {
            window.NODUS_UI?.showToast('⚠️ Digite a senha do backup', 'warning');
            event.target.value = '';
            return;
        }
        
        try {
            window.NODUS_UI?.showToast('🔓 Descriptografando backup...', 'info');
            
            const text = await file.text();
            
            const backup = JSON.parse(text);
            
            // Decrypt
            const decrypted = await this.decryptData(backup.data, password, backup.salt, backup.iv);
            
            const data = JSON.parse(decrypted);
            
            
            // Modal de escolha: Limpo vs Sobrepor
            this.showRestoreModal(data, passwordInput);
            
        } catch (error) {
            // Determinar tipo de erro PRIMEIRO (antes de logar)
            const isWrongPassword = error.name === 'OperationError' || 
                                   error.message?.includes('decrypt') ||
                                   error.message?.includes('password');
            
            // Log informativo SEM stack trace
            if (isWrongPassword) {
            } else {
                console.warn('[Backup] ⚠️ Erro ao importar backup:', error.message || 'arquivo inválido');
            }
            
            if (isWrongPassword) {
                
                // FECHAR SETTINGS MODAL para toast ficar visível
                const settingsModal = document.getElementById('nodus-settings-modal-container');
                if (settingsModal) {
                    settingsModal.remove();
                }
                
                // Toast com delay para garantir que modal foi fechado
                setTimeout(() => {
                    window.NODUS_UI?.showToast('🔐 Senha incorreta! Verifique e tente novamente.', 'error');
                }, 200);
                
            } else {
                // Outro tipo de erro (arquivo corrompido, etc)
                
                // Fechar modal para toast ficar visível
                const settingsModal = document.getElementById('nodus-settings-modal-container');
                if (settingsModal) {
                    settingsModal.remove();
                }
                
                setTimeout(() => {
                    window.NODUS_UI?.showToast('❌ Erro ao importar backup - arquivo inválido?', 'error');
                }, 200);
            }
        }
        
        event.target.value = '';
    },
    
    showRestoreModal(backupData, passwordInput) {
        // Remove modal existente
        const existing = document.getElementById('nodus-restore-modal');
        if (existing) existing.remove();
        
        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'nodus-restore-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 2147483648;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease-out;
        `;
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.8); max-width: 500px; width: 90%; padding: 0; overflow: hidden; animation: slideUp 0.3s ease-out;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 24px; border-bottom: 2px solid #60a5fa;">
                    <div style="font-size: 24px; font-weight: 700; color: white; margin-bottom: 8px;">
                        🔓 Restaurar Backup
                    </div>
                    <div style="font-size: 13px; color: rgba(255,255,255,0.8);">
                        Escolha como deseja restaurar seus dados
                    </div>
                </div>
                
                <!-- Content -->
                <div style="padding: 24px;">
                    <!-- Opção 1: Restore Limpo -->
                    <button id="btnRestoreClean" style="width: 100%; margin-bottom: 16px; padding: 20px; background: rgba(34, 197, 94, 0.15); border: 2px solid rgba(34, 197, 94, 0.4); border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                            <span style="font-size: 28px;">🧹</span>
                            <span style="font-size: 16px; font-weight: 700; color: #10b981;">Restore Limpo</span>
                        </div>
                        <div style="font-size: 13px; color: #94a3b8; line-height: 1.6; padding-left: 40px;">
                            <strong style="color: #10b981;">Recomendado:</strong> Apaga TUDO e restaura apenas os dados do backup.<br>
                            ✅ Limpo e seguro<br>
                            ✅ Remove dados corrompidos
                        </div>
                    </button>
                    
                    <!-- Opção 2: Sobrepor -->
                    <button id="btnRestoreOverwrite" style="width: 100%; margin-bottom: 16px; padding: 20px; background: rgba(251, 191, 36, 0.15); border: 2px solid rgba(251, 191, 36, 0.4); border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                            <span style="font-size: 28px;">📝</span>
                            <span style="font-size: 16px; font-weight: 700; color: #fbbf24;">Sobrepor Dados</span>
                        </div>
                        <div style="font-size: 13px; color: #94a3b8; line-height: 1.6; padding-left: 40px;">
                            <strong style="color: #fbbf24;">Avançado:</strong> Mantém dados atuais e sobrepõe com o backup.<br>
                            ⚠️  Pode causar conflitos<br>
                            ⚠️  Dados duplicados possíveis
                        </div>
                    </button>
                    
                    <!-- Cancelar -->
                    <button id="btnRestoreCancel" style="width: 100%; padding: 14px; background: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 8px; color: #cbd5e1; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        Cancelar
                    </button>
                </div>
            </div>
            
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                #btnRestoreClean:hover {
                    background: rgba(34, 197, 94, 0.25);
                    border-color: rgba(34, 197, 94, 0.6);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
                }
                #btnRestoreOverwrite:hover {
                    background: rgba(251, 191, 36, 0.25);
                    border-color: rgba(251, 191, 36, 0.6);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(251, 191, 36, 0.3);
                }
                #btnRestoreCancel:hover {
                    background: rgba(100, 116, 139, 0.3);
                }
            </style>
        `;
        
        document.body.appendChild(modal);
        
        // Event Listeners
        const btnClean = document.getElementById('btnRestoreClean');
        const btnOverwrite = document.getElementById('btnRestoreOverwrite');
        const btnCancel = document.getElementById('btnRestoreCancel');
        
        btnClean.addEventListener('click', () => {
            modal.remove();
            this.executeRestore(backupData, passwordInput, 'clean');
        });
        
        btnOverwrite.addEventListener('click', () => {
            modal.remove();
            this.executeRestore(backupData, passwordInput, 'overwrite');
        });
        
        btnCancel.addEventListener('click', () => {
            modal.remove();
            window.NODUS_UI?.showToast('❌ Restore cancelado', 'info');
        });
        
        // Click outside to cancel
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                window.NODUS_UI?.showToast('❌ Restore cancelado', 'info');
            }
        });
    },
    
    async executeRestore(backupData, passwordInput, mode) {
        try {
            
            if (mode === 'clean') {
                // Restore Limpo - apaga tudo primeiro
                window.NODUS_UI?.showToast('🧹 Limpando dados atuais...', 'info');
                await chrome.storage.local.clear();
                
                // Restaura backup
                window.NODUS_UI?.showToast('📥 Restaurando backup...', 'info');
                await chrome.storage.local.set(backupData);
                
                window.NODUS_UI?.showToast('✅ Restore limpo concluído! Recarregando...', 'success');
                
            } else {
                // Sobrepor - mantém dados atuais e sobrepõe
                window.NODUS_UI?.showToast('📝 Sobrepondo dados...', 'info');
                await chrome.storage.local.set(backupData);
                
                window.NODUS_UI?.showToast('✅ Dados sobrescritos! Recarregando...', 'success');
            }
            
            // Limpar senha SOMENTE após restore bem-sucedido
            if (passwordInput) {
                passwordInput.value = '';
            }
            
            setTimeout(() => location.reload(), 1500);
            
        } catch (error) {
            console.error('[Backup] Restore error:', error);
            window.NODUS_UI?.showToast('❌ Erro ao restaurar backup', 'error');
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ENCRYPTION UTILITIES (AES-256-GCM)
    // ═══════════════════════════════════════════════════════════════
    
    async encryptData(data, password) {
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Derive key from password
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        
        // Encrypt
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(data)
        );
        
        return {
            salt: this.arrayBufferToBase64(salt),
            iv: this.arrayBufferToBase64(iv),
            data: this.arrayBufferToBase64(encrypted)
        };
    },
    
    async decryptData(encryptedBase64, password, saltBase64, ivBase64) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        const salt = this.base64ToArrayBuffer(saltBase64);
        const iv = this.base64ToArrayBuffer(ivBase64);
        const encrypted = this.base64ToArrayBuffer(encryptedBase64);
        
        // Derive key from password
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        
        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );
        
        return decoder.decode(decrypted);
    },
    
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },
    
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    },
    
    async showTelemetryStats(data) {
        const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;

        // Carregar dados de telemetria
        const result = await chrome.storage.local.get('telemetry_local_stats');
        const stats = result.telemetry_local_stats || {};
        
        // Remover modal existente
        const existing = document.getElementById('nodus-telemetry-stats-modal');
        if (existing) existing.remove();
        
        // Criar modal container
        const modalContainer = document.createElement('div');
        modalContainer.id = 'nodus-telemetry-stats-modal';
        modalContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(8px);
            z-index: 2147483648;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 20px;
        `;
        
        // Criar modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #0f172a;
            width: 100%;
            max-width: 520px;
            max-height: 82vh;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
            overflow: hidden;
            animation: slideUpModal 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 14px 18px;
            background: linear-gradient(135deg, #1a1f29 0%, #0f172a 100%);
            border-bottom: 2px solid #facc15;
        `;
        header.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <h2 style="margin: 0 0 2px 0; font-size: 15px; color: #facc15; display: flex; align-items: center; gap: 8px; font-weight: 700;">
                        <span>📊</span>
                        <span>${_t('metrics.title', 'Your Personal Metrics')}</span>
                    </h2>
                    <p style="margin: 0; font-size: 11px; color: #64748b;">${_t('metrics.subtitle', 'Last 90 days • 100% Local')}</p>
                </div>
                <button id="closeStatsModal" style="background: rgba(100, 116, 139, 0.2); border: none; color: #cbd5e1; font-size: 20px; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;">
                    ×
                </button>
            </div>
        `;

        // Content
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 14px;
            max-height: calc(82vh - 100px);
            overflow-y: auto;
            background: #0f172a;
        `;
        
        const totalEvents = stats.totalEvents || 0;
        const platforms = stats.platforms || {};
        const methods = stats.captureMethod || {};
        const contentTypes = stats.contentTypes || {};
        const events = stats.events || {};
        
        content.innerHTML = `
            <!-- Summary Cards Row -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 12px 14px; color: white; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; right: -10px; font-size: 48px; opacity: 0.1;">📦</div>
                    <div style="position: relative; z-index: 1;">
                        <div style="font-size: 24px; font-weight: 700; margin-bottom: 2px;">${totalEvents}</div>
                        <div style="font-size: 10px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">${_t('metrics.totalevents', 'Total Events')}</div>
                    </div>
                </div>
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 10px; padding: 12px 14px; color: white; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; right: -10px; font-size: 48px; opacity: 0.1;">💾</div>
                    <div style="position: relative; z-index: 1;">
                        <div style="font-size: 24px; font-weight: 700; margin-bottom: 2px;">${events.save || 0}</div>
                        <div style="font-size: 10px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">${_t('metrics.saved', 'Saved Ideas')}</div>
                    </div>
                </div>
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 10px; padding: 12px 14px; color: white; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; right: -10px; font-size: 48px; opacity: 0.1;">🔄</div>
                    <div style="position: relative; z-index: 1;">
                        <div style="font-size: 24px; font-weight: 700; margin-bottom: 2px;">${events.inject || 0}</div>
                        <div style="font-size: 10px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">${_t('metrics.reuses', 'Reuses')}</div>
                    </div>
                </div>
                <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); border-radius: 10px; padding: 12px 14px; color: white; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; right: -10px; font-size: 48px; opacity: 0.1;">📤</div>
                    <div style="position: relative; z-index: 1;">
                        <div style="font-size: 24px; font-weight: 700; margin-bottom: 2px;">${Math.round((events.inject || 0) / (events.save || 1) * 100)}%</div>
                        <div style="font-size: 10px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">${_t('metrics.reuserate', 'Reuse Rate')}</div>
                    </div>
                </div>
            </div>

            <!-- Charts Grid -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px;">

                <!-- Platforms Card -->
                <div style="background: #1a1f29; border: 1px solid #2d3748; border-radius: 10px; padding: 12px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #e2e8f0; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                        <span>🤖</span><span>${_t('metrics.platforms', 'Platform Usage')}</span>
                    </h3>
                    <div id="platform-bars-container">
                        ${this.renderPlatformBarsHTML(platforms)}
                    </div>
                </div>

                <!-- Methods Card -->
                <div style="background: #1a1f29; border: 1px solid #2d3748; border-radius: 10px; padding: 12px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #e2e8f0; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                        <span>💡</span><span>${_t('metrics.methods', 'Capture Methods')}</span>
                    </h3>
                    <div id="method-bars-container">
                        ${this.renderMethodBarsHTML(methods)}
                    </div>
                </div>

            </div>

            <!-- Content Types Full Width -->
            <div style="background: #1a1f29; border: 1px solid #2d3748; border-radius: 10px; padding: 12px; margin-bottom: 10px;">
                <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #e2e8f0; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                    <span>📝</span><span>${_t('metrics.contenttypes', 'Content Types')}</span>
                </h3>
                <div id="content-bars-container">
                    ${this.renderContentBarsHTML(contentTypes)}
                </div>
                ${this.renderContentInsight(contentTypes)}
            </div>

            <!-- Footer Info -->
            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 12px; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 11px; color: #cbd5e1; line-height: 1.5;">
                    🔒 ${_t('metrics.footer', 'Data calculated <strong>locally</strong> • last 90 days.<br>Aggregated and anonymous versions (k=10) are shared to improve NODUS.')}
                </p>
                <button id="exportMetricsBtn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; color: white; padding: 8px 18px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                    📥 ${_t('metrics.export', 'Export Data (JSON)')}
                </button>
            </div>
        `;
        
        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(content);
        modalContainer.appendChild(modal);
        document.body.appendChild(modalContainer);
        
        // Event listeners
        document.getElementById('closeStatsModal').addEventListener('click', () => {
            modalContainer.remove();
        });
        
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.remove();
            }
        });
        
        // Export button
        document.getElementById('exportMetricsBtn').addEventListener('click', () => {
            this.exportTelemetryData(stats);
        });
        
        // Hover effects
        document.getElementById('closeStatsModal').addEventListener('mouseenter', (e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.2)';
            e.target.style.color = '#ef4444';
        });
        document.getElementById('closeStatsModal').addEventListener('mouseleave', (e) => {
            e.target.style.background = 'rgba(100, 116, 139, 0.2)';
            e.target.style.color = '#cbd5e1';
        });
    },
    
    renderContentInsight(contentTypes) {
        if (Object.keys(contentTypes).length === 0) return '';
        const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;

        const total = Object.values(contentTypes).reduce((sum, val) => sum + val, 0);
        const topType = Object.entries(contentTypes).sort((a, b) => b[1] - a[1])[0];

        if (!topType) return '';

        const [type, count] = topType;
        const percentage = Math.round((count / total) * 100);

        const typeLabel = _t(`metrics.type.${type}`, type);
        const insightText = _t('metrics.insight', 'You mainly use AI for <strong>{type}</strong> ({pct}%)')
            .replace('{type}', typeLabel)
            .replace('{pct}', percentage);

        return `
            <div style="margin-top: 10px; padding: 10px 12px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px;">
                <p style="margin: 0; font-size: 11px; color: #10b981; display: flex; align-items: center; gap: 8px;">
                    <span>💡</span>
                    <span>${insightText}</span>
                </p>
            </div>
        `;
    },
    
    exportTelemetryData(stats) {
        const data = {
            exported_at: new Date().toISOString(),
            version: '1.0',
            telemetry_mode: 1,
            stats: stats
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nodus-metrics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Show feedback
        const btn = document.getElementById('exportMetricsBtn');
        const originalText = btn.innerHTML;
        const _t2 = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
        btn.innerHTML = `✅ ${_t2('metrics.exported', 'Exported!')}`;
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    },
    
    renderPlatformBarsHTML(platforms) {
        const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
        if (Object.keys(platforms).length === 0) {
            return `<div style="text-align:center;color:#475569;font-size:12px;padding:20px;">${_t('metrics.nodata', 'No data')}</div>`;
        }
        
        const total = Object.values(platforms).reduce((sum, val) => sum + val, 0);
        const colors = {
            chatgpt: '#10a37f',
            claude: '#cc785c',
            gemini: '#4285f4',
            perplexity: '#20808d',
            copilot: '#0078d4',
            grok: '#1da1f2',
            deepseek: '#8b5cf6'
        };
        
        return Object.entries(platforms)
            .sort((a, b) => b[1] - a[1])
            .map(([platform, count]) => {
                const percentage = ((count / total) * 100).toFixed(1);
                const color = colors[platform.toLowerCase()] || '#64748b';
                
                return `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                            <span style="color: #cbd5e1; font-weight: 500;">${platform}</span>
                            <span style="color: #64748b;">${count} (${percentage}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; background: ${color}; border-radius: 4px; width: ${percentage}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                `;
            }).join('');
    },
    
    renderMethodBarsHTML(methods) {
        const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
        if (Object.keys(methods).length === 0) {
            return `<div style="text-align:center;color:#475569;font-size:12px;padding:20px;">${_t('metrics.nodata', 'No data')}</div>`;
        }
        
        const total = Object.values(methods).reduce((sum, val) => sum + val, 0);
        const colors = {
            quick: '#ef4444',
            auto: '#10b981',
            manual: '#3b82f6'
        };
        const icons = {
            quick: '⚡',
            auto: '⭕',
            manual: '💡'
        };
        
        return Object.entries(methods)
            .sort((a, b) => b[1] - a[1])
            .map(([method, count]) => {
                const percentage = ((count / total) * 100).toFixed(1);
                const color = colors[method] || '#64748b';
                const icon = icons[method] || '📦';
                
                return `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                            <span style="color: #cbd5e1; font-weight: 500;">${icon} ${method}</span>
                            <span style="color: #64748b;">${count} (${percentage}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; background: ${color}; border-radius: 4px; width: ${percentage}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                `;
            }).join('');
    },
    
    renderContentBarsHTML(contentTypes) {
        const _t = (key, fb) => window.NodusI18n ? window.NodusI18n.t(key) : fb;
        if (Object.keys(contentTypes).length === 0) {
            return `<div style="text-align:center;color:#475569;font-size:12px;padding:20px;">${_t('metrics.nodata', 'No data')}</div>`;
        }
        
        const total = Object.values(contentTypes).reduce((sum, val) => sum + val, 0);
        const icons = {
            code: '💻',
            technical_explanation: '🔧',
            narrative: '📖',
            list: '📝',
            summary: '📄',
            brainstorm: '💭',
            answer: '✅',
            other: '📦'
        };
        
        return Object.entries(contentTypes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([type, count]) => {
                const percentage = ((count / total) * 100).toFixed(1);
                const icon = icons[type] || '📦';
                
                return `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                            <span style="color: #cbd5e1; font-weight: 500;">${icon} ${type}</span>
                            <span style="color: #64748b;">${count} (${percentage}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; background: #6366f1; border-radius: 4px; width: ${percentage}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                `;
            }).join('');
    },

    /**
     * Refresh tab labels after language change
     * Tabs are created once in createDashboardDOM() and must be updated manually
     */
    refreshTabLabels() {
        if (typeof NodusI18n === 'undefined' || !this.modal) return;
        const tabBtns = this.modal.querySelectorAll('.nodus-tab-btn');
        const keys = ['dashboard.cards', 'dashboard.chains', 'dashboard.mindmap'];
        tabBtns.forEach((btn, i) => {
            const label = btn.querySelector('.tab-label');
            if (label && keys[i]) label.textContent = NodusI18n.t(keys[i]);
        });
    },

    /**
     * Re-renders the current active tab after language change
     */
    refreshCurrentTab() {
        const contentArea = document.getElementById('nodus-dashboard-content');
        if (!contentArea) return;
        const tab = this.activeTab || 'cards';
        if (tab === 'cards' && window.NodusDashboardCards) {
            window.NodusDashboardCards.render(contentArea);
        } else if (tab === 'chains' && window.NodusChainsUI) {
            window.NodusChainsUI.init();
        } else if (tab === 'mindmap' && window.NodusProjectsUI) {
            window.NodusProjectsUI.init();
        }
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NodusDashboard.init());
} else {
    NodusDashboard.init();
}

// Expose globally
window.NodusDashboard = NodusDashboard;

