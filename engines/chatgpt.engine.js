// ═══════════════════════════════════════════════════════════════
// NODUS - ChatGPT Engine v4.0.0
// ═══════════════════════════════════════════════════════════════
// + Auto Capture (PRO Feature)
// Integrado com Telemetria v2.0
// - Tracking automático de saves (manual/quick/auto)
// - Classificação de content_type
// - Estatísticas anônimas agregadas
// ═══════════════════════════════════════════════════════════════

(function() {
  
  // ═══════════════════════════════════════════════════════════════
  // HELPER: Verificar se deve exibir botões nesta plataforma
  // ═══════════════════════════════════════════════════════════════
  let cachedShowButtons = true;
  let lastCheckTime = 0;
  const CHECK_INTERVAL = 5000; // 5 segundos
  
  async function shouldShowButtons() {
    const now = Date.now();
    if (now - lastCheckTime < CHECK_INTERVAL) {
      return cachedShowButtons;
    }
    
    try {
      // ✅ Verificar se contexto ainda é válido
      if (!chrome?.runtime?.id) {
        console.warn("[Engine] Extension context invalidated, using cached value");
        return cachedShowButtons;
      }
      
      const { settings } = await chrome.storage.local.get("settings");
      
      // Se showAutoButtons está desabilitado, não mostrar nada
      if (!settings?.showAutoButtons) {
        cachedShowButtons = false;
        lastCheckTime = now;
        return false;
      }
      
      // Verificar configuração específica da plataforma
      const platformName = "chatgpt";
      const result = settings?.showButtonsPlatforms?.[platformName] !== false;
      cachedShowButtons = result;
      lastCheckTime = now;
      return result;
    } catch (error) {
      // Se erro for "context invalidated", usar valor em cache
      if (error.message?.includes("Extension context invalidated")) {
        console.warn("[Engine] Extension reloaded, using cached value");
        return cachedShowButtons;
      }
      console.error("[Engine] Error checking button settings:", error);
      cachedShowButtons = true;
      lastCheckTime = now;
      return true; // Default: mostrar
    }
  }
  'use strict';
  // Helper: Verificar se context ainda é válido
  function isContextValid() {
    try {
      return chrome.runtime?.id !== undefined;
    } catch {
      return false;
    }
  }

  // Helper: Enviar mensagem com context check
  function safeSendMessage(message, callback) {
    if (!isContextValid()) {
      console.warn('[Engine] Extension context invalidated, message not sent');
      if (callback) callback({ ok: false, error: 'Extension reloaded' });
      return;
    }
    try {
      chrome.runtime.sendMessage(message, callback);
    } catch (error) {
      console.warn('[Engine] Failed to send message:', error);
      if (callback) callback({ ok: false, error: error.message });
    }
  }

  
  
  // ═══════════════════════════════════════════════════════════════
  // TELEMETRY TRACKER
  // ═══════════════════════════════════════════════════════════════
  let telemetryTracker = null;
  
  
  
  (async () => {
    try {
      if (!isContextValid()) {
        console.warn('[ChatGPT] Extension context invalidated, skipping telemetry load');
        return;
      }
      
      const module = await import(chrome.runtime.getURL('telemetry/telemetry.tracker.js'));
      telemetryTracker = module.getTelemetryTracker();
    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) {
        console.warn('[ChatGPT] Extension reloaded, telemetry unavailable');
      } else {
        console.warn('[ChatGPT] ⚠️ Telemetry not available:', error);
      }
    }
  })();
  
  // Helper de tradução para engines
  const _t = (key) => {
    const fallbacks = {
      'btn.save': 'Salvar',
      'btn.quick': 'Rápido',
      'btn.paste': 'Colar',
      'btn.dash': window.NodusI18n ? window.NodusI18n.t('dashboard.button') : 'Painel',
      'toast.quicksaved': 'Salvo em Rápido!',
      'toast.dashboardnotavailable': 'Dashboard não disponível',
      'toast.nocontenttopaste': 'Sem conteúdo para colar',
      'toast.pasted': 'Colado!',
      'toast.pastefailed': 'Falha ao colar',
      'toast.error': 'Erro ao salvar'
    };
    try {
      if (window.NodusI18n && window.NodusI18n.currentLang && typeof window.NodusI18n.t === 'function') {
        const translated = window.NodusI18n.t(key);
        if (translated && translated !== key) return translated;
      }
    } catch (e) {}
    return fallbacks[key] || key;
  };
  
  const UI = window.NODUS_UI;
  if (!UI) {
    console.error('❌ NODUS_UI não encontrada!');
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO
  // ═══════════════════════════════════════════════════════════════
  
  const CONFIG = {
    name: 'ChatGPT',
    // ATUALIZADO: Usar container principal ao invés do filho .markdown.prose
    // Motivo: ChatGPT mudou estrutura DOM, .markdown.prose nem sempre está presente quando observer detecta
    anchorSelector: 'div[data-message-author-role="assistant"]',
    inputSelector: 'textarea#prompt-textarea',
    
    getQuestion(answerElement) {
      try {
        // answerElement já é o assistantBlock agora
        const assistantBlock = answerElement;
        
        const allMessages = document.querySelectorAll('div[data-message-author-role]');
        const currentIndex = Array.from(allMessages).indexOf(assistantBlock);
        
        if (currentIndex === -1) return null;
        
        // Buscar mensagem do usuário anterior
        for (let i = currentIndex - 1; i >= 0; i--) {
          const block = allMessages[i];
          if (block.getAttribute('data-message-author-role') === 'user') {
            const textContainer = block.querySelector('.markdown.prose') || block;
            const userText = textContainer.innerText || textContainer.textContent;
            return userText.trim();
          }
        }
        return null;
      } catch (e) {
        console.error('[Engine] Erro ao buscar pergunta:', e);
        return null;
      }
    }
  };
  
  // ═══════════════════════════════════════════════════════════════
  // INJEÇÃO DE BOTÕES
  // ═══════════════════════════════════════════════════════════════
  
  const injectedMap = new Map();
  
  // ═══════════════════════════════════════════════════════════════
  // AUTO CAPTURE STATE
  // ═══════════════════════════════════════════════════════════════
  
  let autoCaptureState = {
    enabled: false,
    count: 0,
    isPro: false
  };
  
  function hashText(str) {
    let hash = 0;
    if (!str || str.length === 0) return '0';
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }
  
  async function injectButtons(answerElement) {
    try {
      // 🔒 Verificar se deve mostrar botões
      const showButtons = await shouldShowButtons();
      if (!showButtons) return;
      
      if (!answerElement || !(answerElement instanceof Element)) {
        return;
      }
      
      if (answerElement.querySelector("[data-nodus-container='1']")) {
        return;
      }
      
      let text = answerElement.innerText?.slice(0, 300) || '';

      // Se texto vazio, esperar até 5s pelo React renderizar o conteúdo
      if (text.length < 3) {
        for (let retry = 0; retry < 10; retry++) {
          await new Promise(r => setTimeout(r, 500));
          // Re-check se outro processo já injetou enquanto esperava
          if (answerElement.querySelector("[data-nodus-container='1']")) {
            return;
          }
          text = answerElement.innerText?.slice(0, 300) || '';
          if (text.length >= 3) break;
        }
      }


      if (text.length < 3) {
        return;
      }

      // Verificação final anti-duplicata
      if (answerElement.querySelector("[data-nodus-container='1']")) {
        return;
      }
      
      const hash = hashText(text);
      if (injectedMap.has(hash)) {
        return;
      }
      
      
      // Verificar licença para Auto Capture (async, mas não bloqueia)
      if (isContextValid()) {
        chrome.storage.local.get('nodus_license').then(licenseData => {
          const license = licenseData.nodus_license || {};
          const isPro = license.status === 'pro';
          autoCaptureState.isPro = isPro;
          
          // Atualizar botão AC se já foi criado
          const acBtn = answerElement.querySelector('[data-nodus-action="autocapture"]');
          if (acBtn) {
            acBtn.disabled = !isPro;
            acBtn.style.cursor = isPro ? 'pointer' : 'not-allowed';
            acBtn.style.opacity = isPro ? '1' : '0.4';
            acBtn.title = isPro ? 'Auto Capture' : 'Recurso PRO';
          }
        }).catch(err => {
          console.warn('[Engine] Failed to check license:', err);
        });
      }
      
      const container = document.createElement('div');
      container.className = 'nodus-btn-container';
      container.dataset.nodusContainer = '1';
      container.style.cssText = `
        display: flex;
        gap: 6px;
        margin-top: 8px;
        justify-content: flex-end;
        align-items: center;
      `;
      
      const buttons = [
        { text: '💡 ' + _t('btn.save'), action: 'save', color: '#3b82f6' },
        { text: '⚡ ' + _t('btn.quick'), action: 'quick', color: '#ef4444' },
        { text: '📋 ' + _t('btn.paste'), action: 'paste', color: '#4b5563' },
        { text: '🗂️ ' + _t('btn.dash'), action: 'dashboard', color: '#8b5cf6' }
      ];
      
      
      buttons.forEach(({ text, action, color }) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.dataset.nodusAction = action;
        btn.style.cssText = `
          background: ${color};
          color: white;
          border: none;
          border-radius: 6px;
          padding: 4px 9px;
          cursor: pointer;
          font-size: 12px;
          line-height: 1.2;
          font-weight: bold;
          transition: opacity 0.2s;
        `;
        btn.onmouseenter = () => btn.style.opacity = '0.85';
        btn.onmouseleave = () => btn.style.opacity = '1';
        container.appendChild(btn);
      });
      
      // ═══════════════════════════════════════════════════════════════
      // AUTO CAPTURE BUTTON
      // ═══════════════════════════════════════════════════════════════
      
      const acBtn = document.createElement('button');
      acBtn.dataset.nodusAction = 'autocapture';
      acBtn.title = 'Auto Capture';
      acBtn.style.cssText = `
        background: transparent;
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        cursor: pointer;
        font-size: 18px;
        font-weight: normal;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
        padding: 0;
        position: relative;
      `;
      
      // Estrutura: círculo verde + emoji por cima
      if (autoCaptureState.enabled) {
        // Círculo verde no fundo
        const greenCircle = document.createElement('div');
        greenCircle.className = 'ac-green-circle';
        greenCircle.style.cssText = `
          position: absolute;
          width: 14px;
          height: 14px;
          background: #10b981;
          border-radius: 50%;
          z-index: 0;
        `;
        acBtn.appendChild(greenCircle);
        
        // Emoji por cima
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = '⭕';
        emojiSpan.style.cssText = `
          position: relative;
          z-index: 1;
          color: #10b981;
        `;
        acBtn.appendChild(emojiSpan);
      } else {
        // Apenas emoji vermelho
        acBtn.textContent = '⭕';
        acBtn.style.color = '#ef4444';
      }
      
      acBtn.onmouseenter = () => {
        if (autoCaptureState.isPro) acBtn.style.opacity = '0.85';
      };
      acBtn.onmouseleave = () => {
        if (autoCaptureState.isPro) acBtn.style.opacity = '1';
      };
      
      container.appendChild(acBtn);
      
      // Contador de capturas (visível apenas quando AC ativo)
      if (autoCaptureState.enabled && autoCaptureState.isPro) {
        const counter = document.createElement('span');
        counter.id = 'ac-counter';
        counter.textContent = autoCaptureState.count;
        counter.style.cssText = `
          background: #ef4444;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: bold;
          min-width: 20px;
          text-align: center;
        `;
        container.appendChild(counter);
      }
      
      
      // ATUALIZADO: Anexar dentro do answerElement (que agora é o container principal)
      // ao invés de como sibling do parentNode
      answerElement.appendChild(container);
      
      injectedMap.set(hash, answerElement);
      
      // Auto capture automático se estiver ativado
      if (autoCaptureState.enabled && autoCaptureState.isPro) {
        setTimeout(() => handleAutoCapture(answerElement), 500);
      }
      
      // Limpeza do mapa quando elemento for removido (sem observer por elemento)
      // O mapa é limpo pelo observer global via injectedMap.delete quando necessário
      
    } catch (e) {
      console.error('[Engine] Erro ao injetar botões:', e);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  
  function getIdeaData(answerElement) {
    const now = new Date();
    
    // answerElement agora é o container principal [data-message-author-role="assistant"]
    // Precisamos encontrar o .markdown.prose dentro dele para extrair o texto
    const markdownElement = answerElement.querySelector('.markdown.prose') || answerElement;
    
    // Clonar elemento para não afetar o DOM
    const clone = markdownElement.cloneNode(true);
    
    // Remover container de botões NODUS do clone (se existir)
    const nodusContainer = clone.querySelector('[data-nodus-container="1"]');
    if (nodusContainer) {
      nodusContainer.remove();
    }
    
    // Converter HTML para Markdown
    let text;
    if (window.NodusHtmlToMarkdown) {
      text = window.NodusHtmlToMarkdown.convert(clone);
    } else {
      text = (clone.innerText?.trim() || clone.textContent?.trim() || '');
    }
    // Remover markdown de imagens do texto (são exibidas separadamente no card)
    text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '').replace(/\n{3,}/g, '\n\n').trim();

    const question = CONFIG.getQuestion(answerElement) || '';

    // Extrair imagens: da resposta do assistente + da mensagem do utilizador anterior
    const images = [];
    // 1. Imagens na resposta (ex: DALL-E)
    markdownElement.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src') || '';
      if (src && !src.startsWith('data:') && !images.includes(src)) images.push(src);
    });
    // 2. Imagens na mensagem do utilizador anterior (uploads)
    try {
      const allMsgs = document.querySelectorAll('div[data-message-author-role]');
      const idx = Array.from(allMsgs).indexOf(answerElement);
      for (let i = idx - 1; i >= 0; i--) {
        if (allMsgs[i].getAttribute('data-message-author-role') === 'user') {
          allMsgs[i].querySelectorAll('img[src]').forEach(img => {
            const src = img.getAttribute('src') || '';
            if (src && !src.startsWith('data:') && !images.includes(src)) images.push(src);
          });
          break;
        }
      }
    } catch(e) {}

    // Detectar se há arquivo gerado na resposta
    let hasGeneratedFile = false;
    if (window.NodusFileDetection) {
      try {
        hasGeneratedFile = window.NodusFileDetection.detectGeneratedFile(answerElement);
      } catch (e) {
        console.warn('[Engine] File detection error:', e);
      }
    }

    return {
      id: `idea_${now.getTime()}_${Math.random().toString(36).slice(2, 6)}`,
      title: question.split(/[.!?\n]/)[0].slice(0, 50).trim() || 'Nova Ideia',
      question: question,
      text: text,
      tags: [CONFIG.name],
      date: now.toISOString(),
      source: CONFIG.name,
      platform: 'chatgpt',
      sourceUrl: location.href,
      hasGeneratedFile: hasGeneratedFile,
      hasAttachment: images.length > 0,
      images: images
    };
  }
  
  function handleSave(answerElement) {
    const ideaData = getIdeaData(answerElement);
    if (!ideaData || ideaData.text.length < 3) return;
    
    // ✨ TELEMETRIA: Será rastreado automaticamente no background.js
    // - Classificação de content_type (code, narrative, etc)
    // - Platform origin (chatgpt)
    // - Capture method (manual)
    
    UI.openPanelNQModal(ideaData);
  }
  
  function handleQuickSave(answerElement) {
    const ideaData = getIdeaData(answerElement);
    if (!ideaData || ideaData.text.length < 3) return;
    
    // CORREÇÃO: Enviar para fila Quick (não Default)
    ideaData.queue = 'ideas_queue_quick';
    ideaData.tags.push('__quick__'); // Tag oculta para roteamento
    ideaData.captureMethod = 'quick'; // Marca como captura quick
    
    // ✨ TELEMETRIA: Rastreado automaticamente no background.js
    // - Event type: 'save'
    // - Capture method: 'quick'
    // - Content type: classificado automaticamente
    
    safeSendMessage({ action: 'saveIdea', idea: ideaData }, response => {
      if (response?.duplicate) {
        UI.showToast('ℹ️ Já salvo', 'info');
      } else {
        UI.showToast(
          response?.ok ? '⚡ ' + _t('toast.quicksaved') : '❌ ' + _t('toast.error'),
          response?.ok ? 'success' : 'error'
        );
      }
    });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // AUTO CAPTURE
  // ═══════════════════════════════════════════════════════════════
  
  function handleAutoCapture(answerElement) {
    const ideaData = getIdeaData(answerElement);
    if (!ideaData || ideaData.text.length < 3) return;
    
    // Enviar para fila Quick apenas com tag __auto__ (sem __quick__)
    ideaData.queue = 'ideas_queue_quick';
    ideaData.tags.push('__auto__'); // Tag oculta para identificar origem AC e borda vermelha
    ideaData.captureMethod = 'auto'; // Marca como captura automática
    
    safeSendMessage({ action: 'saveIdea', idea: ideaData }, response => {
      if (response?.ok) {
        autoCaptureState.count++;
        updateAutoCaptureBadge();
      }
    });
  }
  
  function toggleAutoCapture() {
    if (!autoCaptureState.isPro) {
      UI.showToast('🔒 Recurso PRO', 'error');
      return;
    }
    
    autoCaptureState.enabled = !autoCaptureState.enabled;
    
    if (autoCaptureState.enabled) {
      autoCaptureState.count = 0;
      UI.showToast('⭕ Auto Capture ativado', 'success');
    } else {
      UI.showToast('⭕ Auto Capture desativado', 'info');
    }
    
    // Atualizar todos os botões AC na página
    updateAllAutoCaptureBtns();
  }
  
  function updateAllAutoCaptureBtns() {
    const allAcBtns = document.querySelectorAll('[data-nodus-action="autocapture"]');
    allAcBtns.forEach(btn => {
      // Limpar conteúdo
      btn.innerHTML = '';
      
      if (autoCaptureState.enabled) {
        // Círculo verde no fundo
        const greenCircle = document.createElement('div');
        greenCircle.className = 'ac-green-circle';
        greenCircle.style.cssText = `
          position: absolute;
          width: 14px;
          height: 14px;
          background: #10b981;
          border-radius: 50%;
          z-index: 0;
        `;
        btn.appendChild(greenCircle);
        
        // Emoji por cima
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = '⭕';
        emojiSpan.style.cssText = `
          position: relative;
          z-index: 1;
          color: #10b981;
        `;
        btn.appendChild(emojiSpan);
      } else {
        // Apenas emoji vermelho
        btn.textContent = '⭕';
        btn.style.color = '#ef4444';
      }
    });
    updateAutoCaptureBadge();
  }
  
  function updateAutoCaptureBadge() {
    // Atualizar contador em todos os containers
    const allContainers = document.querySelectorAll('[data-nodus-container="1"]');
    allContainers.forEach(container => {
      let counter = container.querySelector('#ac-counter');
      
      if (autoCaptureState.enabled && autoCaptureState.isPro) {
        if (!counter) {
          counter = document.createElement('span');
          counter.id = 'ac-counter';
          counter.style.cssText = `
            background: #ef4444;
            color: white;
            border-radius: 10px;
            padding: 2px 6px;
            font-size: 11px;
            font-weight: bold;
            min-width: 20px;
            text-align: center;
          `;
          container.appendChild(counter);
        }
        counter.textContent = autoCaptureState.count;
      } else if (counter) {
        counter.remove();
      }
    });
  }
  
  function handlePaste() {
    try {
      safeSendMessage({ action: 'getLastIdea' }, async response => {
        if (response?.ok && response.idea) {
          const idea = response.idea;
          try {
            const storageData = await chrome.storage.local.get('injectMode');
            const injectMode = storageData.injectMode || 'formatted';
            await chrome.runtime.sendMessage({
              action: 'inject_text_in_current_tab',
              text: idea.text,
              injectMode: injectMode
            });
            UI.showToast('📋 Colado!', 'success');
            if (telemetryTracker) {
              telemetryTracker.trackInject({
                platform_from: idea.platform || 'unknown',
                platform_to: CONFIG.name,
                inject_type: 'paste',
                url_origin: idea.sourceUrl || idea.url,
                url_destination: window.location.href,
                success: true
              }).catch(err => console.warn('[Telemetry] Track failed:', err));
            }
          } catch (error) {
            console.error('[Engine] Erro ao colar:', error);
            UI.showToast('❌ Erro ao colar', 'error');
          }
        } else {
          UI.showToast('ℹ️ Nenhuma ideia salva', 'info');
        }
      });
    } catch (e) {
      console.error('[Engine] Erro no paste:', e);
      UI.showToast('❌ Erro ao colar', 'error');
    }
  }
  
  function handleDashboard() {
    
    // Check ethical gate first
    UI.checkAcceptanceAndProceed(() => {
      try {
        if (!window.NodusDashboard) {
          console.error('[Engine] NodusDashboard não disponível');
          UI.showToast('❌ ' + _t('toast.dashboardnotavailable'), 'error');
          return;
        }
        
        window.NodusDashboard.open('cards');
        
      } catch (error) {
        console.error('[Engine] Erro ao abrir dashboard:', error);
        UI.showToast('❌ ' + _t('toast.dashboardnotavailable'), 'error');
      }
    });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // EVENT LISTENER
  // ═══════════════════════════════════════════════════════════════
  
  document.addEventListener('click', (e) => {
    try {
      const button = e.target.closest('[data-nodus-action]');
      if (!button) return;
      
      // Ignorar cliques em modais
      if (e.target.closest('#nodus-welcome-overlay') || e.target.closest('#nodus-panel-nq')) {
        return;
      }
      
      const action = button.dataset.nodusAction;
      
      // Dashboard não precisa de elemento de resposta
      if (action === 'dashboard') {
        e.preventDefault();
        e.stopPropagation();
        handleDashboard();
        return;
      }
      
      // Paste não precisa de elemento de resposta
      if (action === 'paste') {
        e.preventDefault();
        e.stopPropagation();
        UI.checkAcceptanceAndProceed(handlePaste);
        return;
      }
      
      // Auto Capture toggle
      if (action === 'autocapture') {
        e.preventDefault();
        e.stopPropagation();
        toggleAutoCapture();
        return;
      }
      
      // Save e Quick precisam do elemento de resposta
      const container = button.closest("[data-nodus-container='1']");
      if (!container) return;
      
      // ATUALIZADO: answerElement agora é o pai do container (não mais previousSibling)
      const answerElement = container.parentElement;
      if (!answerElement || !answerElement.matches(CONFIG.anchorSelector)) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      if (action === 'save') {
        UI.checkAcceptanceAndProceed(() => handleSave(answerElement));
      } else if (action === 'quick') {
        UI.checkAcceptanceAndProceed(() => handleQuickSave(answerElement));
      }
      
    } catch (err) {
      console.error('[Engine] Erro no click:', err);
    }
  });
  
  
  // ═══════════════════════════════════════════════════════════════
  // OBSERVER
  // ═══════════════════════════════════════════════════════════════
  
  let observer = null;
  let retryCount = 0;
  const MAX_RETRIES = 30; // 30 tentativas = 15 segundos
  
  function startObserver() {
    
    // Injetar em elementos existentes
    try {
      const elements = document.querySelectorAll(CONFIG.anchorSelector);
      elements.forEach(injectButtons);
    } catch (e) {
      console.error('[Engine] Erro ao injetar existentes:', e);
    }
    
    // Observer global para novos elementos (único, sem duplicatas por elemento)
    observer = new MutationObserver((mutations) => {
      try {
        let hasNewNodes = false;
        mutations.forEach(mutation => {
          // Limpar mapa de hashes para nós removidos
          mutation.removedNodes.forEach(removed => {
            if (removed.nodeType === 1) {
              const toDelete = [];
              injectedMap.forEach((el, hash) => {
                if (removed === el || (removed.contains && removed.contains(el))) {
                  toDelete.push(hash);
                }
              });
              toDelete.forEach(h => injectedMap.delete(h));
            }
          });
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              hasNewNodes = true;
              if (node.matches && node.matches(CONFIG.anchorSelector)) {
                injectButtons(node);
              }
              if (node.querySelectorAll) {
                node.querySelectorAll(CONFIG.anchorSelector).forEach(injectButtons);
              }
            }
          });
        });
      } catch (e) {
        console.error('[Engine] Erro no observer:', e);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    
    // ═══════════════════════════════════════════════════════════════
    // FALLBACK: Verificar nos primeiros 30s se há elementos sem botões
    // Roda a cada 5s por 6 vezes (30s total), depois para
    // ═══════════════════════════════════════════════════════════════
    let fallbackRuns = 0;
    const MAX_FALLBACK_RUNS = 6;
    const fallbackInterval = setInterval(() => {
      try {
        if (++fallbackRuns > MAX_FALLBACK_RUNS) {
          clearInterval(fallbackInterval);
          return;
        }
        const elements = document.querySelectorAll(CONFIG.anchorSelector);
        elements.forEach(el => {
          if (!el.querySelector("[data-nodus-container='1']")) {
            injectButtons(el);
          }
        });
      } catch (e) {
        console.error('[Engine] Erro no fallback:', e);
      }
    }, 5000); // Verifica a cada 5 segundos (era 2s)
  }
  
  function tryInitialize() {
    retryCount++;
    
    const elements = document.querySelector(CONFIG.anchorSelector);
    
    if (elements) {
      clearInterval(checkInterval);
      startObserver();
      return;
    }
    
    if (retryCount >= MAX_RETRIES) {
      console.warn('[Engine] ⚠️ Máximo de tentativas atingido, mas observer continuará ativo');
      clearInterval(checkInterval);
      // Iniciar observer mesmo sem elementos (vai capturar quando aparecerem)
      startObserver();
    }
  }
  
  // Inicialização múltipla para maior confiabilidade
  let checkInterval;
  
  // 1. Tentar imediatamente se DOM já está pronto
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    tryInitialize();
  }
  
  // 2. Aguardar DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryInitialize();
    });
  }
  
  // 3. Backup: Interval com tentativas a cada 500ms (mais rápido que antes)
  checkInterval = setInterval(tryInitialize, 500);
  
  // ═══════════════════════════════════════════════════════════════
  // FULL CHAT CAPTURE
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Capturar chat completo do ChatGPT
   */
  window.NodusEngine = window.NodusEngine || {};
  window.NodusEngine.captureFullChat = async function(platform) {
    try {

      // ── SCROLL TO TOP para forçar lazy loading de todas as mensagens ──
      // O ChatGPT usa virtual scrolling: mensagens fora da viewport não estão no DOM.
      // Precisamos rolar até o topo e aguardar o React renderizá-las.
      const scrollContainer =
        document.querySelector('[data-testid="conversation-turn-0"]')?.closest('[class*="overflow"]') ||
        document.querySelector('main [class*="overflow-y"]') ||
        document.querySelector('main > div > div') ||
        document.querySelector('main');

      if (scrollContainer && scrollContainer.scrollTop > 0) {
        scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
        await new Promise(r => setTimeout(r, 600));
        scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
        await new Promise(r => setTimeout(r, 600));
      } else {
        // Mesmo estando no topo, aguardar um tick para garantir DOM estável
        await new Promise(r => setTimeout(r, 200));
      }

      const allMessages = document.querySelectorAll('div[data-message-author-role]');
      if (!allMessages || allMessages.length === 0) {
        return { ok: false, error: 'No messages found' };
      }

      const nodes = [];
      let userMsg = null;

      allMessages.forEach((msg, index) => {
        const role = msg.getAttribute('data-message-author-role');
        const content = msg.querySelector('.markdown.prose, .whitespace-pre-wrap, [class*="prose"]');
        
        if (!content) return;

        // Converter HTML para Markdown
        let textMd;
        if (window.NodusHtmlToMarkdown) {
          textMd = window.NodusHtmlToMarkdown.convert(content);
        } else {
          // Fallback: innerText + extract images manually
          textMd = (content.innerText || content.textContent || '').trim();

          // Append image references that innerText misses
          const imgs = content.querySelectorAll('img');
          if (imgs.length > 0) {
            const imgLines = [];
            imgs.forEach(img => {
              const alt = img.getAttribute('alt') || 'image';
              const src = img.getAttribute('src') || '';
              if (src) imgLines.push(`![${alt}](${src})`);
            });
            if (imgLines.length > 0) {
              textMd += '\n\n' + imgLines.join('\n');
            }
          }
        }

        if (!textMd) return;

        // Extrair URLs de imagens do conteúdo (apenas no assistente)
        let capturedImages = [];
        if (role === 'assistant') {
          const imgEls = content.querySelectorAll('img[src]');
          imgEls.forEach(img => {
            const src = img.getAttribute('src') || '';
            // Aceitar apenas URLs http/https reais (não data:, não blob:)
            if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
              if (!capturedImages.includes(src)) capturedImages.push(src);
            }
          });
        }

        if (role === 'user') {
          userMsg = textMd;
        } else if (role === 'assistant' && userMsg) {
          // Par completo: user + assistant
          const firstLine = userMsg.split('\n')[0];
          const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;

          nodes.push({
            id: `node_${Date.now()}_${index}`,
            title: title,
            question: userMsg,
            answer: textMd, // Markdown preservado!
            images: capturedImages, // URLs de imagens do assistente
            platform: platform || 'ChatGPT',
            date: Date.now(),
            order: nodes.length,
            type: 'standalone'  // ← CRITICAL: Sistema Dual
          });

          userMsg = null; // Reset
          capturedImages = [];
        }
      });
      
      return { ok: true, nodes: nodes };
      
    } catch (error) {
      console.error('[FullChat] Error:', error);
      return { ok: false, error: error.message };
    }
  };
  
  
  // ═══════════════════════════════════════════════════════════════
  // LISTENER: Atualizar visibilidade de botões quando settings mudar
  // ═══════════════════════════════════════════════════════════════
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.settings) {
      
      // Resetar cache
      lastCheckTime = 0;
      
      shouldShowButtons().then(showButtons => {
        const containers = document.querySelectorAll('[data-nodus-container="1"]');
        containers.forEach(container => {
          container.style.display = showButtons ? "flex" : "none";
        });
      });
    }
  });
})();
