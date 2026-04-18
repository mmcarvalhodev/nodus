// ═══════════════════════════════════════════════════════════════
// NODUS - Perplexity Engine v4.0.0
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
      const platformName = "perplexity";
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
      const module = await import(chrome.runtime.getURL('telemetry/telemetry.tracker.js'));
      telemetryTracker = module.getTelemetryTracker();
    } catch (error) {
      console.warn('[Perplexity] ⚠️ Telemetry not available:', error);
    }
  })();
  
  // Helper de tradução para engines para engines
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
    name: 'Perplexity',
    // Seletor para o container de respostas do Perplexity (GrandParent do .prose)
    anchorSelector: 'div[id^="markdown-content"]',
    // Seletores de input (Lexical editor contentEditable)
    inputSelectors: [
      '#ask-input',
      'div[contenteditable="true"]',
      '[data-lexical-editor="true"]'
    ],
    
    getQuestion(answerElement) {
      try {
        // Estratégia 1: Buscar elemento com class*="query" no documento
        const queryElements = document.querySelectorAll('[class*="query"]');
        
        // Pegar o último query antes desta resposta
        for (let i = queryElements.length - 1; i >= 0; i--) {
          const query = queryElements[i];
          const queryText = query.innerText?.trim() || query.textContent?.trim();
          if (queryText && queryText.length > 2 && queryText.length < 500) {
            return queryText;
          }
        }
        
        // Estratégia 2: Buscar h2 ou h3 antes da resposta
        const headers = document.querySelectorAll('h2, h3');
        for (let i = headers.length - 1; i >= 0; i--) {
          const header = headers[i];
          const headerText = header.innerText?.trim() || header.textContent?.trim();
          if (headerText && headerText.length > 2 && headerText.length < 500) {
            return headerText;
          }
        }
        
        // Estratégia 3: Buscar no DOM antes do markdown-content
        const container = answerElement.closest('div');
        if (container) {
          const prevElements = [];
          let prev = container.previousElementSibling;
          let count = 0;
          
          while (prev && count < 5) {
            prevElements.push(prev);
            prev = prev.previousElementSibling;
            count++;
          }
          
          for (const el of prevElements) {
            const text = el.innerText?.trim() || el.textContent?.trim();
            if (text && text.length > 2 && text.length < 500) {
              return text;
            }
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
  
  // AUTO CAPTURE STATE
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

      // Se texto vazio, esperar ate 5s pelo framework renderizar o conteudo
      if (text.length < 3) {
        for (let retry = 0; retry < 10; retry++) {
          await new Promise(r => setTimeout(r, 500));
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

      // Verificacao final anti-duplicata
      if (answerElement.querySelector("[data-nodus-container='1']")) {
        return;
      }
      
      const hash = hashText(text);
      if (injectedMap.has(hash)) {
        return;
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
      
      // Verificar licença
      chrome.storage.local.get('nodus_license').then(licenseData => {
        const license = licenseData.nodus_license || {};
        autoCaptureState.isPro = license.status === 'pro';
        const acBtn = answerElement.querySelector('[data-nodus-action="autocapture"]');
        if (acBtn) {
          acBtn.disabled = !autoCaptureState.isPro;
          acBtn.style.cursor = autoCaptureState.isPro ? 'pointer' : 'not-allowed';
          acBtn.style.opacity = autoCaptureState.isPro ? '1' : '0.4';
          acBtn.title = autoCaptureState.isPro ? 'Auto Capture' : 'Recurso PRO';
        }
      });
      
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
      
      // AUTO CAPTURE BUTTON
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
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        position: relative;
      `;
      
      if (autoCaptureState.enabled) {
        const greenCircle = document.createElement('div');
        greenCircle.style.cssText = 'position:absolute;width:14px;height:14px;background:#10b981;border-radius:50%;z-index:0;';
        acBtn.appendChild(greenCircle);
        const emoji = document.createElement('span');
        emoji.textContent = '⭕';
        emoji.style.cssText = 'position:relative;z-index:1;color:#10b981;';
        acBtn.appendChild(emoji);
      } else {
        acBtn.textContent = '⭕';
        acBtn.style.color = '#ef4444';
      }
      
      container.appendChild(acBtn);
      
      if (autoCaptureState.enabled && autoCaptureState.isPro) {
        const counter = document.createElement('span');
        counter.id = 'ac-counter';
        counter.textContent = autoCaptureState.count;
        counter.style.cssText = 'background:#ef4444;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0;';
        container.appendChild(counter);
      }
      // Adicionar no final do markdown-content
      answerElement.appendChild(container);
      
      injectedMap.set(hash, answerElement);
      
      // Auto capture se ativado - aguardar streaming terminar
      if (autoCaptureState.enabled && autoCaptureState.isPro) {
        let lastLength = answerElement.innerText?.length || 0;
        let stableCount = 0;
        
        const checkStable = setInterval(() => {
          const currentLength = answerElement.innerText?.length || 0;
          
          if (currentLength === lastLength) {
            stableCount++;
            if (stableCount >= 3) { // 3 checks estáveis = 1.5s sem mudanças
              clearInterval(checkStable);
              handleAutoCapture(answerElement);
            }
          } else {
            stableCount = 0;
            lastLength = currentLength;
          }
        }, 500);
        
        // Timeout máximo de 30s
        setTimeout(() => clearInterval(checkStable), 30000);
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
      console.error('[Engine] ❌ Erro ao injetar botões:', e);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  
  function getIdeaData(answerElement) {
    const now = new Date();
    
    // Clonar elemento para não afetar o DOM
    const clone = answerElement.cloneNode(true);
    
    // Remover container de botões NODUS do clone
    const nodusContainer = clone.querySelector('[data-nodus-container="1"]');
    if (nodusContainer) {
      nodusContainer.remove();
    }
    
    // Converter HTML para Markdown
    let text = window.NodusHtmlToMarkdown ?
      window.NodusHtmlToMarkdown.convert(clone) :
      (clone.innerText?.trim() || clone.textContent?.trim() || '');
    
    // Remover apenas escapes desnecessários (backslash antes de pontuação comum)
    // Mas preservar escapes necessários (como \* \_ \` para markdown)
    text = text
      .replace(/\\([!?.,;:()[\]])/g, '$1');  // Remove \ antes de pontuação simples
    
    const question = CONFIG.getQuestion(answerElement) || '';
    
    
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
      sourceUrl: location.href,
      platform: 'perplexity'
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
    
    ideaData.queue = 'ideas_queue_quick';
    ideaData.tags.push('__auto__');
    ideaData.captureMethod = 'auto';
    
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
    
    updateAllAutoCaptureBtns();
  }
  
  function updateAllAutoCaptureBtns() {
    const allAcBtns = document.querySelectorAll('[data-nodus-action="autocapture"]');
    allAcBtns.forEach(btn => {
      btn.innerHTML = '';
      
      if (autoCaptureState.enabled) {
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
        
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = '⭕';
        emojiSpan.style.cssText = `
          position: relative;
          z-index: 1;
          color: #10b981;
        `;
        btn.appendChild(emojiSpan);
      } else {
        btn.textContent = '⭕';
        btn.style.color = '#ef4444';
      }
    });
    updateAutoCaptureBadge();
  }
  
  function updateAutoCaptureBadge() {
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
        UI.showToast('❌ Error opening dashboard', 'error');
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
      
      // Buscar o elemento div[id^="markdown-content"] ancestral
      const answerElement = container.closest('div[id^="markdown-content"]');
      if (!answerElement) {
        console.error('[Engine] Elemento markdown-content não encontrado');
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
    
    // Observer para novos elementos
    observer = new MutationObserver((mutations) => {
      try {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              // .prose pode ser adicionado diretamente
              if (node.matches && node.matches(CONFIG.anchorSelector)) {
                injectButtons(node);
              }
              // Ou pode estar dentro de outro elemento
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
    
    // FALLBACK: Verificar periodicamente elementos sem botões
    setInterval(() => {
      try {
        const elements = document.querySelectorAll(CONFIG.anchorSelector);
        elements.forEach(el => {
          if (!el.querySelector("[data-nodus-container='1']")) {
            injectButtons(el);
          }
        });
      } catch (e) {
        console.error('[Engine] Erro no fallback:', e);
      }
    }, 2000);
    
  }
  
  // Aguardar DOM estar pronto
  
  const checkInterval = setInterval(() => {
    const found = document.querySelector(CONFIG.anchorSelector);
    if (found) {
      clearInterval(checkInterval);
      startObserver();
    } else {
    }
  }, 1000);
  
  // Timeout de segurança
  setTimeout(() => {
    const found = document.querySelector(CONFIG.anchorSelector);
    if (found) {
      clearInterval(checkInterval);
      startObserver();
    }
  }, 10000);
  
  // ═══════════════════════════════════════════════════════════════
  // CAPTURE FULL CHAT
  // ═══════════════════════════════════════════════════════════════
  
  window.NodusEngine = window.NodusEngine || {};
  
  window.NodusEngine.captureFullChat = function(platform) {
    try {

      // Usar o mesmo anchorSelector que injeta os botões
      const answerElements = document.querySelectorAll('div[id^="markdown-content"]');
      if (!answerElements || answerElements.length === 0) {
        return { ok: false, error: 'No messages found' };
      }

      const nodes = [];

      answerElements.forEach((answerEl, index) => {
        // Clonar e remover botões NODUS
        const clone = answerEl.cloneNode(true);
        const nodusContainer = clone.querySelector('[data-nodus-container="1"]');
        if (nodusContainer) nodusContainer.remove();

        const answer = window.NodusHtmlToMarkdown ?
          window.NodusHtmlToMarkdown.convert(clone) :
          (clone.innerText || clone.textContent).trim();

        if (!answer || answer.length < 3) return;

        // Buscar pergunta correspondente via getQuestion
        const question = CONFIG.getQuestion(answerEl) || '';
        const firstLine = (question || answer).split('\n')[0];
        const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;

        nodes.push({
          id: `node_${Date.now()}_${index}`,
          title: title,
          question: question,
          answer: answer,
          platform: platform || 'Perplexity',
          date: Date.now(),
          order: nodes.length,
          type: question ? 'qa' : 'standalone'
        });
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
