// ═══════════════════════════════════════════════════════════════
// NODUS Health Contracts
// Cada contrato = { ação disparada → resultado esperado no DOM }
// Se o resultado não aparecer dentro do timeout → falha silenciosa
// ═══════════════════════════════════════════════════════════════

const NodusHealthContracts = {

  // ─────────────────────────────────────────────────────────────
  // NÍVEIS: critical | important | accessory
  // CONTEXTO: content (precisa de DOM da página AI) | popup | background
  // ─────────────────────────────────────────────────────────────

  // ══════════════════════════════════════════════════════════════
  // CARTÃO — ações e resultados esperados
  // ══════════════════════════════════════════════════════════════
  card: [

    // ── Cleanup: fechar dashboard de run anterior se ainda estiver aberto ──
    {
      name: 'card_setup_cleanup',
      level: 'accessory',
      description: 'Fecha o dashboard se estiver aberto (limpeza de estado anterior)',
      action: { selector: '#nodus-dashboard-close', type: 'click-if-exists' },
      verify: { selector: '.nodus-dashboard-modal', condition: 'not-visible' },
      timeout: 1500,
    },

    // ── Setup: salvar ideia de teste + abrir dashboard ──────────
    {
      name: 'card_setup_save_idea',
      level: 'critical',
      description: 'Salva uma ideia via ⚡ Rápido para garantir que haverá cartão',
      action: { selector: '[data-nodus-action="quick"]', type: 'click' },
      verify: { selector: '.nodus-toast', condition: 'exists' },
      timeout: 3000,
    },

    {
      name: 'card_setup_open_dashboard',
      level: 'critical',
      description: 'Abre o dashboard via botão Dash na página',
      preDelay: 500,
      action: { selector: '[data-nodus-action="dashboard"]', type: 'click' },
      verify: { selector: '.nodus-dashboard-modal', condition: 'exists' },
      timeout: 3000,
    },

    {
      name: 'card_setup_switch_tab',
      level: 'critical',
      description: 'Muda para aba Cartões no dashboard',
      action: { selector: '[data-tab="cards"]', type: 'click' },
      verify: { selector: '[data-tab="cards"]', condition: 'has-class', value: 'active' },
      timeout: 1000,
    },

    {
      // A ideia de teste é salva na fila Quick — o dashboard abre na Default
      name: 'card_setup_switch_queue',
      level: 'critical',
      description: 'Muda para fila Quick onde a ideia de teste foi salva',
      preDelay: 300,
      action: { selector: '.queue-button-new[data-queue="quick"]', type: 'click' },
      verify: { selector: '.queue-button-new[data-queue="quick"]', condition: 'has-class', value: 'active' },
      timeout: 1500,
    },

    {
      name: 'cards_loaded',
      level: 'critical',
      description: 'Pelo menos um cartão NODUS está renderizado',
      action: { selector: '.nodus-idea-card', type: 'check-attr', value: 'data-idea-id' },
      verify: { selector: '.nodus-idea-card', condition: 'has-attr', value: 'data-idea-id' },
      timeout: 2000,
      preDelay: 500,
    },
    // ────────────────────────────────────────────────────────────

    {
      name: 'card_expand',
      level: 'critical',
      description: 'Botão "Ver mais" expande o conteúdo do cartão',
      action: { selector: '.card-expand-btn', type: 'click' },
      verify: { selector: '.card-content-scrollable', condition: 'has-class', value: 'expanded' },
      timeout: 1500,
    },

    {
      name: 'card_collapse',
      level: 'important',
      description: 'Botão "Ver menos" colapsa o conteúdo do cartão',
      setup: 'card_expand', // precisa expandir primeiro
      action: { selector: '.card-expand-btn', type: 'click' },
      verify: { selector: '.card-content-scrollable', condition: 'not-has-class', value: 'expanded' },
      timeout: 1500,
    },

    {
      name: 'notes_button',
      level: 'critical',
      description: 'Botão Notas abre o painel de notas inline',
      action: { selector: '.card-note-btn[data-action="notes"]', type: 'click' },
      verify: { selector: '.card-notes-section', condition: 'exists' },
      timeout: 2000,
    },

    {
      name: 'attachments_open',
      level: 'important',
      description: 'Botão Anexos abre a seção de anexos',
      action: { selector: '.card-attachment-btn[data-action="attachments"]', type: 'click' },
      verify: { selector: '.card-attachments-section', condition: 'exists' },
      timeout: 2000,
    },

    {
      name: 'attachments_close',
      level: 'important',
      description: 'Botão fechar da seção de anexos fecha a seção',
      setup: 'attachments_open',
      action: { selector: '.attachments-close-btn', type: 'click' },
      verify: { selector: '.card-attachments-section', condition: 'not-exists' },
      timeout: 1500,
    },

    {
      name: 'inject_full',
      level: 'critical',
      description: 'Injetar Full dispara toast de confirmação',
      action: { selector: '.inject-btn-main[data-action="inject-full"]', type: 'click' },
      verify: { selector: '.nodus-toast', condition: 'exists' },
      timeout: 3000,
    },

    {
      // inject_full dispara re-render (salva injectionCount) → esperar antes do próximo
      name: 'inject_answer',
      level: 'critical',
      description: 'Injetar Resposta dispara toast de confirmação',
      preDelay: 700,
      action: { selector: '.inject-btn-main[data-action="inject-answer"]', type: 'click' },
      verify: { selector: '.nodus-toast', condition: 'exists' },
      timeout: 3000,
    },

    {
      // inject_answer também dispara re-render → esperar antes do próximo
      name: 'inject_mode_menu',
      level: 'important',
      description: 'Botão ▼ abre menu de modos de injeção',
      preDelay: 700,
      action: { selector: '.inject-btn-mode[data-action="toggle-inject-mode"]', type: 'click' },
      verify: { selector: '.inject-mode-menu', condition: 'not-hidden' },
      timeout: 1000,
    },

    {
      name: 'inject_mode_select',
      level: 'important',
      description: 'Selecionar modo Markdown atualiza o número do modo',
      action: { selector: '.mode-option[data-mode="markdown"]', type: 'click' },
      verify: { selector: '.inject-mode-number', condition: 'has-text', value: '2' },
      timeout: 1000,
    },

    {
      name: 'copy_button',
      level: 'critical',
      description: 'Copiar exibe toast de feedback',
      action: { selector: '.card-action-btn[data-action="copy"]', type: 'click' },
      verify: { selector: '.nodus-toast', condition: 'exists' },
      timeout: 2000,
    },

    {
      name: 'edit_mode_enter',
      level: 'critical',
      description: 'Editar coloca o cartão em modo de edição',
      action: { selector: '.card-action-btn[data-action="edit"]', type: 'click' },
      verify: { selector: '.nodus-idea-card', condition: 'has-class', value: 'editing' },
      timeout: 1500,
    },

    {
      name: 'edit_mode_save',
      level: 'critical',
      description: 'Salvar edição sai do modo e mostra toast',
      preDelay: 500,
      action: { selector: '.save-edit-btn', type: 'click' },
      verify: { selector: '.nodus-toast', condition: 'exists' },
      timeout: 2000,
    },

    {
      // Re-entra em edit para poder testar o cancel
      name: 'edit_reenter',
      level: 'critical',
      description: 'Re-entra em modo de edição para testar o cancel',
      preDelay: 300,
      action: { selector: '.card-action-btn[data-action="edit"]', type: 'click' },
      verify: { selector: '.nodus-idea-card', condition: 'has-class', value: 'editing' },
      timeout: 1500,
    },

    {
      name: 'edit_mode_cancel',
      level: 'critical',
      description: 'Cancelar edição sai do modo de edição',
      preDelay: 500,
      action: { selector: '.cancel-edit-btn', type: 'click' },
      verify: { selector: '.nodus-idea-card', condition: 'not-has-class', value: 'editing' },
      timeout: 1500,
    },

    {
      name: 'add_tag_popup',
      level: 'important',
      description: 'Botão + abre popup de adicionar tag',
      action: { selector: '.tag-add', type: 'click' },
      verify: { selector: '.nodus-add-tag-popup', condition: 'has-class', value: 'active' },
      timeout: 1000,
    },

    {
      // Cria tag "HEALTH" para garantir que .nodus-card-tag existe antes de tag_click_menu
      name: 'add_tag_type',
      level: 'important',
      description: 'Digitar "HEALTH" + Enter cria a tag no cartão',
      preDelay: 200,
      action: { selector: '.add-tag-input', type: 'type-enter', value: 'HEALTH' },
      verify: { selector: '.nodus-card-tag', condition: 'exists' },
      timeout: 2000,
    },

    {
      name: 'tag_click_menu',
      level: 'important',
      description: 'Clicar em tag abre menu de vínculo',
      preDelay: 500,
      action: { selector: '.nodus-card-tag', type: 'click' },
      verify: { selector: '.nodus-tag-menu', condition: 'exists' },
      timeout: 1500,
    },

    {
      name: 'source_link',
      level: 'accessory',
      description: 'Link 🔗 src tem atributo href válido',
      action: { selector: '.source-link', type: 'check-attr', value: 'href' },
      verify: { selector: '.source-link', condition: 'has-attr', value: 'href' },
      timeout: 500,
    },

    // ── Delete — deve ser o ÚLTIMO teste (apaga o cartão do DOM) ──
    {
      name: 'delete_show_confirm',
      level: 'critical',
      description: 'Excluir exibe botões de confirmação',
      action: { selector: '.card-action-btn[data-action="delete"]', type: 'click' },
      verify: { selector: '.card-action-btn-confirm[data-action="delete-confirm"]', condition: 'visible' },
      timeout: 1000,
    },

    {
      name: 'delete_cancel',
      level: 'important',
      description: 'Cancelar exclusão esconde confirmação',
      action: { selector: '.card-action-btn-cancel[data-action="delete-cancel"]', type: 'click' },
      verify: { selector: '.card-action-btn[data-action="delete"]', condition: 'visible' },
      timeout: 1000,
    },

    {
      name: 'delete_confirm',
      level: 'critical',
      description: 'Confirmar exclusão remove o cartão do DOM',
      setup: 'delete_show_confirm',
      action: { selector: '.card-action-btn-confirm[data-action="delete-confirm"]', type: 'click' },
      // Verifica que o botão de confirmação sumiu — o card inteiro (com todos os filhos) foi removido
      // Não usa not-exists em .nodus-idea-card porque pode haver outros cards além do deletado
      verify: { selector: '.card-action-btn-confirm[data-action="delete-confirm"]', condition: 'not-exists' },
      timeout: 2000,
    },

  ],

  // ══════════════════════════════════════════════════════════════
  // POPUP — ações e resultados esperados
  //
  // ⚠️  CONTEXTO SEPARADO: o popup roda em popup.html, não na página.
  //     NodusHealth.run('popup') deve ser executado do DevTools do popup:
  //       Chrome → extensão → "Inspect popup" → Console
  //     Os cards expandem via CSS :hover — não via click handler.
  //     Apenas os elementos abaixo têm handlers JS testáveis por aqui.
  // ══════════════════════════════════════════════════════════════
  popup: [

    {
      name: 'popup_btn_dashboard_exists',
      level: 'critical',
      description: 'Botão Dashboard (#btn-dashboard) existe no popup',
      action: { selector: '#btn-dashboard', type: 'check-attr', value: 'id' },
      verify: { selector: '#btn-dashboard', condition: 'exists' },
      timeout: 500,
    },

    {
      name: 'popup_btn_config_exists',
      level: 'important',
      description: 'Botão Config (#btn-config) existe no popup',
      action: { selector: '#btn-config', type: 'check-attr', value: 'id' },
      verify: { selector: '#btn-config', condition: 'exists' },
      timeout: 500,
    },

    {
      name: 'popup_capturas_elem_exists',
      level: 'important',
      description: 'Elemento #capturas-hoje existe no popup',
      action: { selector: '#capturas-hoje', type: 'check-attr', value: 'id' },
      verify: { selector: '#capturas-hoje', condition: 'exists' },
      timeout: 500,
    },

    {
      name: 'popup_total_ideias_elem_exists',
      level: 'important',
      description: 'Elemento #total-ideias existe no popup',
      action: { selector: '#total-ideias', type: 'check-attr', value: 'id' },
      verify: { selector: '#total-ideias', condition: 'exists' },
      timeout: 500,
    },

    {
      name: 'popup_telemetry_toggle_exists',
      level: 'important',
      description: 'Toggle #telemetry-toggle existe no popup',
      action: { selector: '#telemetry-toggle', type: 'check-attr', value: 'id' },
      verify: { selector: '#telemetry-toggle', condition: 'exists' },
      timeout: 500,
    },

    // Setup determinístico: força telemetria para ON antes do teste de toggle
    // (sem isso o verify fica não-determinístico dependendo do estado salvo do usuário)
    {
      name: 'popup_telemetry_force_on',
      level: 'accessory',
      description: 'Setup: força #telemetry-toggle para ON (determinismo p/ próximo teste)',
      preDelay: 200,
      action: { selector: '#telemetry-toggle', type: 'set-checked', value: true },
      verify: { selector: '#telemetry-status', condition: 'has-text', value: 'ON' },
      timeout: 1000,
    },

    {
      name: 'popup_telemetry_toggle_click',
      level: 'important',
      description: 'Clicar no toggle muda #telemetry-status de ON para OFF',
      preDelay: 300,
      action: { selector: '#telemetry-toggle', type: 'click' },
      verify: { selector: '#telemetry-status', condition: 'has-text', value: 'OFF' },
      timeout: 1500,
    },

  ],

  // ══════════════════════════════════════════════════════════════
  // DASHBOARD MODAL
  // ══════════════════════════════════════════════════════════════
  dashboard: [

    {
      name: 'dashboard_open',
      level: 'critical',
      description: 'Dashboard abre ao clicar no botão Dash',
      action: { selector: '[data-nodus-action="dashboard"]', type: 'click' },
      verify: { selector: '.nodus-dashboard-modal', condition: 'exists' },
      timeout: 3000,
    },

    {
      name: 'dashboard_tab_chains',
      level: 'important',
      description: 'Tab Cadeias ativa a view de chains',
      setup: 'dashboard_open',
      action: { selector: '[data-tab="chains"]', type: 'click' },
      verify: { selector: '[data-tab="chains"]', condition: 'has-class', value: 'active' },
      timeout: 1000,
    },

    {
      name: 'dashboard_tab_projects',
      level: 'important',
      description: 'Tab Projetos ativa a view de projetos',
      setup: 'dashboard_open',
      action: { selector: '[data-tab="mindmap"]', type: 'click' },
      verify: { selector: '[data-tab="mindmap"]', condition: 'has-class', value: 'active' },
      timeout: 1000,
    },

    {
      name: 'dashboard_tab_cards',
      level: 'important',
      description: 'Tab Cartões ativa a view de cartões',
      setup: 'dashboard_open',
      action: { selector: '[data-tab="cards"]', type: 'click' },
      verify: { selector: '[data-tab="cards"]', condition: 'has-class', value: 'active' },
      timeout: 1000,
    },

    {
      name: 'dashboard_setup_unpin',
      level: 'accessory',
      description: 'Garante que o dashboard está solto antes de testar pin (estado limpo)',
      action: { selector: '#nodus-dashboard-pin', type: 'click-if-has-class', className: 'pinned', classSelector: '.nodus-dashboard-overlay' },
      verify: { selector: '.nodus-dashboard-overlay', condition: 'not-has-class', value: 'pinned' },
      timeout: 1500,
    },

    {
      name: 'dashboard_pin',
      level: 'accessory',
      description: 'Pin fixa o dashboard (class pinned no overlay)',
      setup: 'dashboard_open',
      action: { selector: '#nodus-dashboard-pin', type: 'click' },
      verify: { selector: '.nodus-dashboard-overlay', condition: 'has-class', value: 'pinned' },
      timeout: 2000,
    },

    {
      name: 'dashboard_settings_open',
      level: 'important',
      description: 'Botão ⚙️ do dashboard abre configurações',
      setup: 'dashboard_open',
      action: { selector: '#nodus-dashboard-settings', type: 'click' },
      verify: { selector: '#nodus-settings-modal-container', condition: 'exists' },
      timeout: 2000,
    },

    {
      name: 'settings_language_change',
      level: 'important',
      description: 'Selecionar idioma no settings não fecha o painel (mudança efetivada ao salvar)',
      setup: 'dashboard_settings_open',
      action: { selector: '#languageSelect', type: 'select', value: 'en' },
      verify: { selector: '#nodus-settings-modal-container', condition: 'exists' },
      timeout: 1000,
    },

    {
      name: 'settings_save',
      level: 'critical',
      description: 'Salvar configurações fecha o painel',
      setup: 'dashboard_settings_open',
      action: { selector: '#nodus-settings-save', type: 'click' },
      verify: { selector: '#nodus-settings-modal-container', condition: 'not-exists' },
      timeout: 2000,
    },

    {
      name: 'dashboard_close',
      level: 'critical',
      description: 'Dashboard fecha ao clicar em ✕',
      setup: 'dashboard_open',
      action: { selector: '#nodus-dashboard-close', type: 'click' },
      verify: { selector: '.nodus-dashboard-modal', condition: 'not-visible' },
      timeout: 1500,
    },

  ],

  // ══════════════════════════════════════════════════════════════
  // SAVE MODAL
  // ══════════════════════════════════════════════════════════════
  saveModal: [

    {
      name: 'save_modal_open',
      level: 'critical',
      description: 'Botão Salvar abre o modal de salvar ideia',
      action: { selector: '[data-nodus-action="save"]', type: 'click' },
      verify: { selector: '#nodus-panel-nq', condition: 'exists' },
      timeout: 6000,
    },

    {
      name: 'save_modal_submit',
      level: 'critical',
      description: 'Salvar exibe toast de confirmação e fecha o modal',
      setup: 'save_modal_open',
      preDelay: 1000,
      action: { selector: '#nq-save-btn', type: 'click' },
      verify: { selector: '.nodus-toast', condition: 'exists' },
      timeout: 4000,
    },

    {
      name: 'save_modal_reopen',
      level: 'accessory',
      description: 'Reabre o modal de salvar para testar cancelar',
      preDelay: 400,
      action: { selector: '[data-nodus-action="save"]', type: 'click' },
      verify: { selector: '#nodus-panel-nq', condition: 'exists' },
      timeout: 3000,
    },

    {
      name: 'save_modal_close',
      level: 'critical',
      description: 'Clicar fora do modal (overlay) fecha o modal de salvar',
      setup: 'save_modal_reopen',
      preDelay: 600,
      action: { selector: '#nodus-panel-overlay', type: 'click' },
      verify: { selector: '#nodus-panel-nq', condition: 'not-exists' },
      timeout: 2000,
    },

    {
      name: 'save_quick',
      level: 'critical',
      description: 'Botão Quick salva sem abrir modal e exibe toast',
      action: { selector: '[data-nodus-action="quick"]', type: 'click' },
      verify: { selector: '.nodus-toast', condition: 'exists' },
      timeout: 2000,
    },

  ],

  // ══════════════════════════════════════════════════════════════
  // CHAINS
  // Executar: NodusHealth.run('chains')  — em qualquer página AI
  // ══════════════════════════════════════════════════════════════
  chains: [

    // ── Setup: estado limpo → dashboard aberto na aba Cadeias ────
    {
      name: 'chain_setup_cleanup',
      level: 'accessory',
      description: 'Fecha dashboard se estiver aberto (estado limpo)',
      action: { selector: '#nodus-dashboard-close', type: 'click-if-exists' },
      verify: { selector: '.nodus-dashboard-modal', condition: 'not-visible' },
      timeout: 1500,
    },

    {
      name: 'chain_setup_dashboard',
      level: 'critical',
      description: 'Abre o dashboard via botão na página',
      action: { selector: '[data-nodus-action="dashboard"]', type: 'click' },
      verify: { selector: '.nodus-dashboard-modal', condition: 'exists' },
      timeout: 3000,
    },

    {
      name: 'chain_setup_tab',
      level: 'critical',
      description: 'Vai para aba Cadeias',
      preDelay: 300,
      action: { selector: '[data-tab="chains"]', type: 'click' },
      verify: { selector: '[data-tab="chains"]', condition: 'has-class', value: 'active' },
      timeout: 1500,
    },

    // ── Setup: forçar viewMode=grid ──────────────────────────────
    // Default é 'graph' — nesse modo .chain-tab/.chain-name-edit/.chain-actions-btn
    // NÃO são renderizados (o template emite um <span> plano). Precisamos do modo
    // grid para todos os testes de rename/actions/delete funcionarem.
    // Clicar em .grid-btn[data-cols="1"] setta viewMode='grid' e dispara re-render.
    {
      name: 'chain_setup_grid_mode',
      level: 'accessory',
      description: 'Força viewMode=grid (onde .chain-tab e .chain-name-edit existem)',
      preDelay: 500,
      action: { selector: '.grid-btn[data-cols="1"]', type: 'click' },
      verify: { selector: '#newChainBtn', condition: 'exists' },
      timeout: 2000,
    },

    // ── Criar chain ──────────────────────────────────────────────
    {
      name: 'chain_new_input',
      level: 'important',
      description: 'Botão "Nova Chain" exibe input de nome',
      preDelay: 500,
      action: { selector: '#newChainBtn', type: 'click' },
      verify: { selector: '#chainNameInputInline', condition: 'exists' },
      timeout: 2000,
    },

    {
      name: 'chain_create',
      level: 'important',
      description: 'Digitar nome + Enter cria a chain (aparece .chain-tab)',
      preDelay: 300,
      action: { selector: '#chainNameInputInline', type: 'type-enter', value: 'Teste Health' },
      verify: { selector: '.chain-tab', condition: 'exists' },
      timeout: 3000,
    },

    // ── Renomear chain ───────────────────────────────────────────
    {
      name: 'chain_rename_input',
      level: 'important',
      description: 'Botão ✏️ na tab ativa exibe input de renomear',
      preDelay: 800,
      action: { selector: '.chain-name-edit', type: 'click' },
      verify: { selector: '#chainNameInputInline', condition: 'exists' },
      timeout: 1500,
    },

    {
      name: 'chain_rename_confirm',
      level: 'important',
      description: 'Confirmar rename mantém a chain na lista',
      preDelay: 300,
      action: { selector: '#chainNameInputInline', type: 'type-enter', value: 'Teste Health' },
      verify: { selector: '.chain-tab', condition: 'exists' },
      timeout: 2000,
    },

    // ── Adicionar nó: abre sidebar de seleção ───────────────────
    {
      name: 'chain_add_node_sidebar',
      level: 'important',
      description: 'Botão "+ Node" abre sidebar de seleção de cards',
      preDelay: 800,
      action: { selector: '#addNodeBtn', type: 'click' },
      verify: { selector: '#nodus-sidebar-external', condition: 'exists' },
      timeout: 3000,
    },

    {
      name: 'chain_sidebar_close',
      level: 'important',
      description: 'Fechar sidebar a esconde (display:none após animação)',
      // Sidebar NÃO é removida do DOM — fica com display:none pós animação 300ms.
      // Verify usa not-visible (não not-exists).
      preDelay: 500,
      action: { selector: '#closeSidebarBtn', type: 'click' },
      verify: { selector: '#nodus-sidebar-external', condition: 'not-visible' },
      timeout: 2000,
    },

    // ── Adicionar um node real à chain (necessário p/ menu de ações) ────
    // A chain recém-criada está vazia — nesse estado renderNodes() emite
    // apenas o placeholder "Esta chain está vazia" e NÃO renderiza
    // .chain-actions-btn (que vive dentro de renderGridMode). Para testar
    // o menu de ações e o delete, precisamos primeiro adicionar um node:
    // reabrir a sidebar → selecionar o primeiro card → confirmar add.
    {
      name: 'chain_sidebar_reopen',
      level: 'accessory',
      description: 'Reabre a sidebar para selecionar um card de teste',
      preDelay: 500,
      action: { selector: '#addNodeBtn', type: 'click' },
      // NOTA: usamos 'not-hidden' (só checa display !== 'none') em vez de
      // 'visible' porque a sidebar abre com animação CSS (width 0→320px,
      // display none→flex). Durante a transição, offsetParent pode ficar
      // momentaneamente null e 'visible' (que exige offsetParent) falha.
      // O teste seguinte (chain_select_first_card) prova que a sidebar
      // realmente abriu e está funcional.
      verify: { selector: '#nodus-sidebar-external', condition: 'not-hidden' },
      timeout: 2000,
    },

    {
      name: 'chain_select_first_card',
      level: 'accessory',
      description: 'Clica no primeiro card da sidebar para selecioná-lo',
      preDelay: 500,
      action: { selector: '.sidebar-card', type: 'click' },
      verify: { selector: '.sidebar-card.selected', condition: 'exists' },
      timeout: 1500,
    },

    {
      name: 'chain_add_selected_to_chain',
      level: 'important',
      description: 'Confirma adição do card selecionado — chain ganha um node e .chain-actions-btn aparece',
      preDelay: 300,
      action: { selector: '#addSelectedBtn', type: 'click' },
      // Após addSelectedToChain(): sidebarOpen=false + render() completo →
      // renderGridMode emite .chain-actions-btn (chain.nodes.length > 0).
      verify: { selector: '.chain-actions-btn', condition: 'exists' },
      timeout: 3000,
    },

    // ── Menu de ações + delete ───────────────────────────────────
    {
      name: 'chain_open_actions',
      level: 'important',
      description: 'Botão ⚙️ Ações abre o menu flutuante da chain',
      preDelay: 800,
      action: { selector: '.chain-actions-btn', type: 'click' },
      verify: { selector: '.chain-actions-menu', condition: 'not-hidden' },
      timeout: 1000,
    },

    {
      name: 'chain_delete_prompt',
      level: 'important',
      description: 'Opção "Delete chain" exibe caixa de confirmação',
      action: { selector: '.chain-action-delete', type: 'click' },
      verify: { selector: '#nodus-delete-confirm', condition: 'exists' },
      timeout: 1500,
    },

    // ── Cleanup: deleta a chain criada neste run (evita poluição em retests) ─
    {
      name: 'chain_delete_confirm',
      level: 'important',
      description: 'Confirmar delete remove a chain do DOM e fecha a confirmação',
      preDelay: 300,
      action: { selector: '#confirmDeleteChain', type: 'click' },
      verify: { selector: '#nodus-delete-confirm', condition: 'not-exists' },
      timeout: 2000,
    },

  ],

  // ══════════════════════════════════════════════════════════════
  // PROJECTS
  // Executar: NodusHealth.run('projects')  — em qualquer página AI
  // ══════════════════════════════════════════════════════════════
  projects: [

    // ── Setup: estado limpo → dashboard aberto na aba Projetos ───
    {
      name: 'project_setup_cleanup',
      level: 'accessory',
      description: 'Fecha dashboard se estiver aberto (estado limpo)',
      action: { selector: '#nodus-dashboard-close', type: 'click-if-exists' },
      verify: { selector: '.nodus-dashboard-modal', condition: 'not-visible' },
      timeout: 1500,
    },

    {
      name: 'project_setup_dashboard',
      level: 'critical',
      description: 'Abre o dashboard via botão na página',
      action: { selector: '[data-nodus-action="dashboard"]', type: 'click' },
      verify: { selector: '.nodus-dashboard-modal', condition: 'exists' },
      timeout: 3000,
    },

    {
      name: 'project_setup_tab',
      level: 'critical',
      description: 'Vai para aba Projetos (mindmap)',
      preDelay: 300,
      action: { selector: '[data-tab="mindmap"]', type: 'click' },
      verify: { selector: '[data-tab="mindmap"]', condition: 'has-class', value: 'active' },
      timeout: 1500,
    },

    // ── Espera ProjectsUI inicializar (polling até #newProjectBtn renderizar) ─
    // ProjectsUI carrega via import() → renderiza async. Log "[ProjectsUI] Pronto"
    // pode aparecer 500ms+ depois da troca de aba. Usamos um verify polling como
    // "esperar até estar pronto" antes de tentar clicar no botão.
    {
      name: 'project_setup_ui_ready',
      level: 'critical',
      description: 'Aguarda ProjectsUI terminar de renderizar (#newProjectBtn no DOM)',
      action: { selector: '[data-tab="mindmap"]', type: 'check-attr', value: 'data-tab' },
      verify: { selector: '#newProjectBtn', condition: 'exists' },
      timeout: 5000,
    },

    // ── Abrir modal de novo projeto ──────────────────────────────
    {
      name: 'project_new_modal',
      level: 'important',
      description: 'Botão "+ New Project" abre o modal',
      preDelay: 300,
      action: { selector: '#newProjectBtn', type: 'click' },
      verify: { selector: '#nodus-project-modal-overlay', condition: 'exists' },
      timeout: 1500,
    },

    // ── Selecionar cor no modal (2ª opção, para forçar mudança) ──
    {
      name: 'project_color_select',
      level: 'accessory',
      description: 'Clicar na 2ª cor marca ela como selecionada',
      action: { selector: '.nodus-project-color-option:nth-child(2)', type: 'click' },
      verify: { selector: '.nodus-project-color-option:nth-child(2)', condition: 'has-class', value: 'selected' },
      timeout: 500,
    },

    // ── Cancelar modal ───────────────────────────────────────────
    {
      name: 'project_modal_cancel',
      level: 'important',
      description: 'Cancelar fecha o modal de projeto',
      action: { selector: '#projectModalCancel', type: 'click' },
      verify: { selector: '#nodus-project-modal-overlay', condition: 'not-exists' },
      timeout: 1000,
    },

    // ── Selecionar projeto "Sem Projeto" na sidebar ──────────────
    {
      name: 'project_select_no_proj',
      level: 'important',
      description: 'Clicar em "Sem Projeto" ativa esse item na sidebar',
      preDelay: 300,
      action: { selector: '.nodus-project-item[data-project-id="__no_project__"]', type: 'click' },
      verify: { selector: '.nodus-project-item[data-project-id="__no_project__"]', condition: 'has-class', value: 'active' },
      timeout: 1000,
    },

    // ── Voltar para "Geral" ──────────────────────────────────────
    {
      name: 'project_select_general',
      level: 'important',
      description: 'Clicar em "Geral" ativa esse item na sidebar',
      preDelay: 300,
      action: { selector: '.nodus-project-item[data-project-id="__general__"]', type: 'click' },
      verify: { selector: '.nodus-project-item[data-project-id="__general__"]', condition: 'has-class', value: 'active' },
      timeout: 1000,
    },

  ],

  // ══════════════════════════════════════════════════════════════
  // ONBOARDING
  // Executar: NodusHealth.run('onboarding')  — em qualquer página AI
  //
  // PRÉ-REQUISITO: o onboarding precisa estar visível.
  // O setup abaixo força a exibição chamando NodusOnboarding.show() via
  // action 'call' (compatível com Trusted Types — funciona no Gemini/Claude).
  // ══════════════════════════════════════════════════════════════
  onboarding: [

    // ── Setup: forçar exibição ───────────────────────────────────
    // Usa action 'call' (NodusOnboarding.show tem guarda interna contra double-show)
    // em vez de 'eval' pra passar no Trusted Types do Gemini/Claude.
    {
      name: 'onboarding_setup_show',
      level: 'critical',
      description: 'Força exibição do onboarding via NodusOnboarding.show()',
      action: { type: 'call', path: 'NodusOnboarding.show' },
      verify: { selector: '#nodus-ob-overlay', condition: 'exists' },
      timeout: 1500,
    },

    // ── Avançar slide via botão Next ─────────────────────────────
    {
      name: 'onboarding_next',
      level: 'accessory',
      description: 'Botão "Next" avança para o slide 2 (2º dot fica active)',
      preDelay: 300,
      action: { selector: '#nodus-ob-next', type: 'click' },
      verify: { selector: '.nodus-ob-dot:nth-child(2)', condition: 'has-class', value: 'active' },
      timeout: 800,
    },

    // ── Navegar via dot ──────────────────────────────────────────
    {
      name: 'onboarding_dot_navigate',
      level: 'accessory',
      description: 'Clicar no 4º dot ativa o 4º dot',
      preDelay: 300,
      action: { selector: '.nodus-ob-dot:nth-child(4)', type: 'click' },
      verify: { selector: '.nodus-ob-dot:nth-child(4)', condition: 'has-class', value: 'active' },
      timeout: 800,
    },

    // ── Skip fecha o overlay ─────────────────────────────────────
    {
      name: 'onboarding_skip',
      level: 'accessory',
      description: 'Skip remove #nodus-ob-overlay do DOM',
      preDelay: 300,
      action: { selector: '#nodus-ob-skip', type: 'click' },
      verify: { selector: '#nodus-ob-overlay', condition: 'not-exists' },
      timeout: 1500,
    },

  ],

};
