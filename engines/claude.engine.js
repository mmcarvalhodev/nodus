// ═══════════════════════════════════════════════════════════════
// NODUS - Claude AI Engine v4.0.0
// ═══════════════════════════════════════════════════════════════
// + Auto Capture (PRO Feature)
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
        console.warn('[Engine] Extension context invalidated, using cached value');
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
      const platformName = "claude";
      const result = settings?.showButtonsPlatforms?.[platformName] !== false;
      cachedShowButtons = result;
      lastCheckTime = now;
      return result;
    } catch (error) {
      // Se erro for "context invalidated", usar valor em cache
      if (error.message?.includes('Extension context invalidated')) {
        console.warn('[Engine] Extension reloaded, using cached value');
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
      const module = await import(chrome.runtime.getURL('telemetry/telemetry.tracker.js'));
      telemetryTracker = module.getTelemetryTracker();
    } catch (error) {
      console.warn('[Claude] ⚠️ Telemetry not available:', error);
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
    name: 'Claude',
    // Seletor para respostas do Claude (pb-3 ou pb-8 dependendo da posição)
    anchorSelector: 'div.group.relative[class*="pb-"]',
    // Seletores de input (ProseMirror)
    inputSelectors: [
      '[data-testid="chat-input"]',
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"]'
    ],
    
    getQuestion(answerElement) {
      try {
        // Buscar o div pai que contém data-test-render-count
        const messageBlock = answerElement.closest('div[data-test-render-count]');
        if (!messageBlock) return null;
        
        // Buscar todos os blocos de mensagem
        const allBlocks = document.querySelectorAll('div[data-test-render-count]');
        const currentIndex = Array.from(allBlocks).indexOf(messageBlock);
        
        if (currentIndex === -1) return null;
        
        // Buscar mensagem do usuário anterior
        for (let i = currentIndex - 1; i >= 0; i--) {
          const block = allBlocks[i];
          // Verificar se é mensagem do usuário (tem font-user-message)
          const userMsg = block.querySelector('[class*="user-message"]');
          if (userMsg) {
            return userMsg.innerText?.trim() || userMsg.textContent?.trim() || null;
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
      if (!answerElement || !(answerElement instanceof Element)) return;
      
      // Verificar se ainda está em streaming
      const isStreaming = answerElement.getAttribute('data-is-streaming');
      if (isStreaming === 'true') {
        return;
      }
      
      if (answerElement.querySelector("[data-nodus-container='1']")) return;
      if (answerElement.closest("[data-nodus-container='1']")) return;
      
      // Buscar o conteúdo da resposta (classe com "markdown" ou "response")
      const contentElement = answerElement.querySelector('[class*="markdown"], [class*="response"]') || answerElement;
      let text = contentElement.innerText?.slice(0, 300) || '';

      // Se texto vazio, esperar ate 5s pelo React renderizar o conteudo
      if (text.length < 3) {
        for (let retry = 0; retry < 10; retry++) {
          await new Promise(r => setTimeout(r, 500));
          if (answerElement.querySelector("[data-nodus-container='1']")) return;
          text = contentElement.innerText?.slice(0, 300) || '';
          if (text.length >= 3) break;
        }
      }
      if (text.length < 3) return;

      // Verificacao final anti-duplicata
      if (answerElement.querySelector("[data-nodus-container='1']")) return;
      
      const hash = hashText(text);
      if (injectedMap.has(hash)) return;
      
      // Verificar licença para Auto Capture (async, mas não bloqueia)
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
      });
      
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
      
      // Adicionar após o conteúdo
      if (contentElement.parentNode) {
        contentElement.parentNode.appendChild(container);
      }
      
      injectedMap.set(hash, answerElement);
      
      // Auto capture automático se estiver ativado
      if (autoCaptureState.enabled && autoCaptureState.isPro) {
        setTimeout(() => handleAutoCapture(answerElement), 500);
      }
      
      // Observer para remover do mapa se elemento for removido
      const observer = new MutationObserver(() => {
        if (!document.contains(answerElement)) {
          observer.disconnect();
          injectedMap.delete(hash);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      
    } catch (e) {
      console.error('[Engine] Erro ao injetar botões:', e);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  
  function getIdeaData(answerElement) {
    const now = new Date();
    
    
    // Buscar conteúdo da resposta
    const contentElement = answerElement.querySelector('[class*="markdown"], [class*="response"]') || answerElement;
    
    // Clonar para não afetar DOM
    const clone = contentElement.cloneNode(true);
    
    // Remover botões NODUS
    const nodusContainer = clone.querySelector('[data-nodus-container="1"]');
    if (nodusContainer) {
      nodusContainer.remove();
    }
    
    // Converter HTML para Markdown
    
    const text = window.NodusHtmlToMarkdown ?
      window.NodusHtmlToMarkdown.convert(clone) :
      (clone.innerText?.trim() || clone.textContent?.trim() || '');
    
    
    const question = CONFIG.getQuestion(answerElement) || '';
    
    // Detectar se há arquivo gerado na resposta
    let hasGeneratedFile = false;
    if (window.NodusFileDetection) {
      try {
        hasGeneratedFile = window.NodusFileDetection.detectGeneratedFile(contentElement);
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
      sourceUrl: location.href,
      platform: 'claude',
      hasGeneratedFile: hasGeneratedFile,
      hasAttachment: false
    };
  }
  
  function handleSave(answerElement) {
    const ideaData = getIdeaData(answerElement);
    if (!ideaData || ideaData.text.length < 3) return;
    UI.openPanelNQModal(ideaData);
  }
  
  function handleQuickSave(answerElement) {
    const ideaData = getIdeaData(answerElement);
    if (!ideaData || ideaData.text.length < 3) return;
    
    ideaData.queue = 'ideas_queue_quick';
    ideaData.tags.push('__quick__'); // Tag oculta para roteamento
    ideaData.captureMethod = 'quick'; // Marca como captura quick
    
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
  
  function handleDashboard() {
    UI.checkAcceptanceAndProceed(() => {
      try {
        if (!window.NodusDashboard) {
          UI.showToast('❌ ' + _t('toast.dashboardnotavailable'), 'error');
          return;
        }
        window.NodusDashboard.open('cards');
      } catch (error) {
        console.error('[Engine] Erro:', error);
        UI.showToast('❌ ' + _t('toast.dashboardnotavailable'), 'error');
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
                url_origin: idea.sourceUrl || idea.url,  // ✨ URL de origem
                url_destination: window.location.href,    // ✨ URL de destino
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
      
      // Dashboard não precisa de elemento
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
      
      // Buscar o elemento de resposta (ancestral com data-test-render-count)
      const answerElement = container.closest('div[data-test-render-count]');
      if (!answerElement) {
        console.error('[Engine] Elemento de resposta não encontrado');
        return;
      }
      
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
  
  function startObserver() {
    
    // Injetar em elementos existentes
    try {
      document.querySelectorAll(CONFIG.anchorSelector).forEach(injectButtons);
    } catch (e) {
      console.error('[Engine] Erro ao injetar existentes:', e);
    }
    
    // Observer para novos elementos E mudanças de atributo
    observer = new MutationObserver((mutations) => {
      try {
        mutations.forEach(mutation => {
          // Mudança de atributo data-is-streaming
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-is-streaming') {
            const target = mutation.target;
            const isStreaming = target.getAttribute('data-is-streaming');
            
            // Só injetar quando streaming terminar (false)
            if (isStreaming === 'false' && target.matches && target.matches(CONFIG.anchorSelector)) {
              injectButtons(target);
            }
          }
          
          // Novos nós adicionados
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
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
      subtree: true,
      attributes: true,
      attributeFilter: ['data-is-streaming']
    });
    
    // Polling para verificar elementos que terminaram streaming
    setInterval(() => {
      const elements = document.querySelectorAll(CONFIG.anchorSelector);
      elements.forEach(el => {
        const isStreaming = el.getAttribute('data-is-streaming');
        if (isStreaming === 'false' && !el.querySelector("[data-nodus-container='1']")) {
          injectButtons(el);
        }
      });
    }, 2000);
    
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CAPTURE FULL CHAT
  // ═══════════════════════════════════════════════════════════════
  
  window.NodusEngine = window.NodusEngine || {};
  
  window.NodusEngine.captureFullChat = async function(platform) {
    const startTime = Date.now();
    const logData = {
      platform: platform || 'Claude',
      url: window.location.href,
      selectors_tried: ['div[data-test-render-count]'],
      elements_found: 0,
      nodes_captured: 0,
      status: 'FAILED',
      details: {}
    };
    
    try {
      
      // Verificar se debug está ativo
      const debugActive = window.NodusDebugCapture ? 
        await window.NodusDebugCapture.isDebugActive('claude') : false;
      
      const allBlocks = document.querySelectorAll('div[data-test-render-count]');
      logData.elements_found = allBlocks ? allBlocks.length : 0;
      
      
      if (!allBlocks || allBlocks.length === 0) {
        logData.error = 'No messages found';
        console.error('[FullChat] Nenhuma mensagem encontrada');
        
        if (debugActive && window.NodusDebugCapture) {
          await window.NodusDebugCapture.addLog(logData);
        }
        
        return { ok: false, error: logData.error };
      }
      
      const nodes = [];
      let userMsg = null;
      let debugSamples = [];
      
      allBlocks.forEach((block, index) => {
        try {
          // Detectar se é mensagem do usuário
          const userElement = block.querySelector('[class*="user-message"]');
          // Detectar se é resposta do assistente
          const assistantElement = block.querySelector('[class*="font-claude-message"], [class*="markdown"], [class*="prose"]');
          
          // Log dos primeiros 10 blocos
          if (index < 10) {
            console.log(`[FullChat] Bloco ${index}:`, {
              hasUser: !!userElement,
              hasAssistant: !!assistantElement,
              userTextLength: userElement ? (userElement.innerText || '').length : 0,
              assistantTextLength: assistantElement ? (assistantElement.innerText || '').length : 0
            });
          }
          
          // Debug samples
          if (debugActive && index < 3) {
            debugSamples.push({
              index,
              hasUser: !!userElement,
              hasAssistant: !!assistantElement
            });
          }
          
          if (userElement) {
            // É mensagem do usuário
            const userHtml = userElement.innerHTML || userElement.textContent;
            userMsg = window.NodusHtmlToMarkdown ? 
              window.NodusHtmlToMarkdown.convert(userElement) :
              userElement.textContent.trim();
            
          } else if (assistantElement && userMsg) {
            // É resposta do assistente e temos uma pergunta anterior
            const answerMarkdown = window.NodusHtmlToMarkdown ?
              window.NodusHtmlToMarkdown.convert(assistantElement) :
              assistantElement.textContent.trim();
            
            if (answerMarkdown && answerMarkdown.length > 10) {
              const firstLine = userMsg.split('\n')[0];
              const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
              
              
              nodes.push({
                id: `node_${Date.now()}_${index}`,
                title: title,
                question: userMsg,
                answer: answerMarkdown, // Agora em Markdown!
                platform: platform || 'Claude',
                date: Date.now(),
                order: nodes.length,
                type: 'standalone'
              });
              
              userMsg = null; // Reset
            }
          }
        } catch (err) {
          console.error('[FullChat] Erro processando bloco', index, ':', err);
        }
      });
      
      
      logData.nodes_captured = nodes.length;
      logData.details.debug_samples = debugSamples;
      logData.details.execution_time_ms = Date.now() - startTime;
      logData.details.total_elements_processed = allBlocks.length;
      
      if (nodes.length === 0) {
        logData.error = 'No valid message pairs found';
        logData.status = 'FAILED';
        
        if (debugActive && window.NodusDebugCapture) {
          await window.NodusDebugCapture.addLog(logData);
        }
        
        return { ok: false, error: logData.error };
      }
      
      logData.status = 'SUCCESS';
      
      
      if (debugActive && window.NodusDebugCapture) {
        await window.NodusDebugCapture.addLog(logData);
      }
      
      return { ok: true, nodes: nodes };
      
    } catch (error) {
      console.error('[FullChat] ERRO GERAL:', error);
      logData.error = error.message;
      logData.details.stack = error.stack;
      
      const debugActive = window.NodusDebugCapture ? 
        await window.NodusDebugCapture.isDebugActive('claude') : false;
      
      if (debugActive && window.NodusDebugCapture) {
        await window.NodusDebugCapture.addLog(logData);
      }
      
      return { ok: false, error: error.message };
    }
  };
  
  // Aguardar DOM estar pronto
  const checkInterval = setInterval(() => {
    if (document.querySelector(CONFIG.anchorSelector)) {
      clearInterval(checkInterval);
      startObserver();
    }
  }, 1000);
  
  
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
