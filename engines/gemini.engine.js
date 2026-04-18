// ═══════════════════════════════════════════════════════════════
// NODUS - Gemini Engine v4.0.0
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
      const platformName = "gemini";
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



  
// ═══════════════════════════════════════════════════════════════  // TELEMETRY TRACKER  // ═══════════════════════════════════════════════════════════════  let telemetryTracker = null;    (async () => {    try {      const module = await import(chrome.runtime.getURL('telemetry/telemetry.tracker.js'));      telemetryTracker = module.getTelemetryTracker();      console.log('[Gemini] ✅ Telemetry tracker loaded');    } catch (error) {      console.warn('[Gemini] ⚠️ Telemetry not available:', error);    }  })();
  
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
    name: 'Gemini',
    // Seletor para respostas do Gemini (Web Components)
    anchorSelector: 'message-content',
    // Seletores de input (contentEditable dentro de rich-textarea)
    inputSelectors: [
      'div[contenteditable="true"].ql-editor',
      'div[contenteditable="true"]',
      'rich-textarea'
    ],
    
    getQuestion(answerElement) {
      try {
        // Buscar o ancestral model-response
        const modelResponse = answerElement.closest('model-response');
        if (!modelResponse) return null;
        
        // Buscar o user-query anterior
        let prev = modelResponse.previousElementSibling;
        while (prev) {
          if (prev.tagName === 'USER-QUERY') {
            const queryText = prev.innerText?.trim() || prev.textContent?.trim();
            return queryText;
          }
          prev = prev.previousElementSibling;
        }
        
        // Tentar buscar globalmente
        const allUserQueries = document.querySelectorAll('user-query');
        if (allUserQueries.length > 0) {
          const lastQuery = allUserQueries[allUserQueries.length - 1];
          return lastQuery.innerText?.trim() || lastQuery.textContent?.trim();
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
      if (answerElement.querySelector("[data-nodus-container='1']")) return;
      
      let text = answerElement.innerText?.slice(0, 300) || '';

      if (text.length < 3) {
        for (let retry = 0; retry < 10; retry++) {
          await new Promise(r => setTimeout(r, 500));
          if (answerElement.querySelector("[data-nodus-container='1']")) return;
          text = answerElement.innerText?.slice(0, 300) || '';
          if (text.length >= 3) break;
        }
      }
      if (text.length < 3) return;
      if (answerElement.querySelector("[data-nodus-container='1']")) return;

      const hash = hashText(text);
      if (injectedMap.has(hash)) return;
      
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
      
      // Verificar licença para Auto Capture
      chrome.storage.local.get('nodus_license').then(licenseData => {
        const license = licenseData.nodus_license || {};
        const isPro = license.status === 'pro';
        autoCaptureState.isPro = isPro;
        const acBtn = answerElement.querySelector('[data-nodus-action="autocapture"]');
        if (acBtn) {
          acBtn.disabled = !isPro;
          acBtn.style.cursor = isPro ? 'pointer' : 'not-allowed';
          acBtn.style.opacity = isPro ? '1' : '0.4';
          acBtn.title = isPro ? 'Auto Capture' : 'Recurso PRO';
        }
      });
      
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
      
      // Adicionar no final do message-content
      answerElement.appendChild(container);
      
      injectedMap.set(hash, answerElement);
      
      // Auto capture se ativado
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
    
    // Clonar elemento para não afetar o DOM
    const clone = answerElement.cloneNode(true);
    
    // Remover container de botões NODUS do clone
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
      platform: 'gemini'
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
          counter.style.cssText = 'background:#ef4444;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0;';
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
          console.error('[Engine] ❌ window.NodusDashboard NÃO ENCONTRADO!');
          UI.showToast('❌ Dashboard não carregado (verifique console)', 'error');
          return;
        }
        
        window.NodusDashboard.open('cards');
        
      } catch (error) {
        console.error('[Engine] ❌ ERRO ao abrir dashboard:', error);
        console.error('[Engine] Stack trace:', error.stack);
        UI.showToast('❌ Erro: ' + error.message, 'error');
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
      
      // Buscar o elemento message-content ancestral
      const answerElement = container.closest('message-content');
      if (!answerElement) {
        console.error('[Engine] Elemento message-content não encontrado');
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
              // message-content pode ser adicionado diretamente
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
  
  // ═══════════════════════════════════════════════════════════════
  // CAPTURE FULL CHAT
  // ═══════════════════════════════════════════════════════════════
  
  window.NodusEngine = window.NodusEngine || {};
  
  // ═══════════════════════════════════════════════════════════════
  // AUTO-SCROLL HELPER (Lazy Loading) - GEMINI
  // ═══════════════════════════════════════════════════════════════
  
  async function loadAllMessagesWithProgress(onProgress) {
    try {
      
      // ✨ GEMINI ESPECÍFICO: infinite-scroller com classe chat-history
      const geminiContainer = document.querySelector('infinite-scroller.chat-history, [data-test-id="chat-history-container"]');
      
      if (!geminiContainer) {
        console.error('[AutoScroll Gemini] Container chat-history não encontrado!');
        return false;
      }
      
      
      let lastCount = 0;
      let noChangeCount = 0;
      const maxAttempts = 5; // Gemini precisa de mais tentativas
      let iteration = 0;
      
      while (noChangeCount < maxAttempts) {
        iteration++;
        
        // ✨ SCROLL AGRESSIVO - Forçar para o topo
        geminiContainer.scrollTop = 0;
        geminiContainer.scrollTo?.({ top: 0, behavior: 'instant' });
        
        
        // Aguardar carregar (3.5 segundos - Gemini precisa de tempo generoso)
        await new Promise(r => setTimeout(r, 3500));
        
        // Contar PARES de conversas (user-query + response)
        const userQueries = document.querySelectorAll('user-query').length;
        const aiResponses = document.querySelectorAll('model-response, message-content').length;
        const currentCount = Math.min(userQueries, aiResponses);
        
        
        if (onProgress) {
          onProgress(currentCount);
        }
        
        if (currentCount === lastCount) {
          noChangeCount++;
        } else {
          noChangeCount = 0;
          lastCount = currentCount;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('[AutoScroll Gemini] Erro:', error);
      return false;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // INLINE WARNING (Lazy Loading) - COMPACTO
  // ═══════════════════════════════════════════════════════════════
  
  function showInlineLoadingChoice(initialCount, onLoadAll, onCaptureNow) {
    // Remover existente
    const existing = document.getElementById('nodus-inline-warning');
    if (existing) existing.remove();
    
    // Criar warning inline compacto
    const warning = document.createElement('div');
    warning.id = 'nodus-inline-warning';
    warning.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #1a1f29 0%, #0e1117 100%);
      border: 2px solid #4285f4;
      border-radius: 12px;
      padding: 16px;
      max-width: 380px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #e5e7eb;
      animation: slideIn 0.3s ease;
    `;
    
    warning.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      
      <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 12px;">
        <div style="font-size: 24px;">⚠️</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px; color: #4285f4; margin-bottom: 4px;">
            Lazy Loading Detectado
          </div>
          <div style="font-size: 12px; color: #9ca3af; line-height: 1.4;">
            <strong style="color: #4285f4;">${initialCount} conversas</strong> visíveis.<br>
            Pode haver mais antigas não carregadas.
          </div>
        </div>
      </div>
      
      <div id="progress-inline" style="display: none; margin-bottom: 12px; text-align: center;">
        <div style="font-size: 12px; color: #4285f4; font-weight: 500; margin-bottom: 6px;">
          🔄 Carregando... <span id="progress-count-inline">${initialCount}</span> conversas
        </div>
        <div style="height: 3px; background: rgba(66, 133, 244, 0.2); border-radius: 2px; overflow: hidden;">
          <div id="progress-bar-inline" style="height: 100%; background: #4285f4; width: 0%; transition: width 0.3s;"></div>
        </div>
      </div>
      
      <div id="buttons-inline" style="display: flex; gap: 8px;">
        <button id="capture-now-inline" style="
          flex: 1;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: #ef4444;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        ">
          ❌ Só ${initialCount}
        </button>
        <button id="load-all-inline" style="
          flex: 1;
          padding: 8px 12px;
          background: linear-gradient(135deg, #4285f4, #1a73e8);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">
          🔄 Carregar Tudo
        </button>
      </div>
    `;
    
    document.body.appendChild(warning);
    
    // Event listeners
    document.getElementById('capture-now-inline').onclick = () => {
      warning.remove();
      onCaptureNow();
    };
    
    document.getElementById('load-all-inline').onclick = async () => {
      // Esconder botões, mostrar progresso
      document.getElementById('buttons-inline').style.display = 'none';
      document.getElementById('progress-inline').style.display = 'block';
      
      const updateProgress = (count) => {
        document.getElementById('progress-count-inline').textContent = count;
        const percentage = Math.min((count / (initialCount * 2)) * 100, 95);
        document.getElementById('progress-bar-inline').style.width = percentage + '%';
      };
      
      const success = await loadAllMessagesWithProgress(updateProgress);
      
      document.getElementById('progress-bar-inline').style.width = '100%';
      document.querySelector('#progress-inline div').innerHTML = '✅ Completo!';
      
      await new Promise(r => setTimeout(r, 500));
      warning.remove();
      
      if (success) {
        onLoadAll();
      }
    };
    
    // Hover effects
    const captureBtn = document.getElementById('capture-now-inline');
    const loadBtn = document.getElementById('load-all-inline');
    
    captureBtn.onmouseenter = () => captureBtn.style.background = 'rgba(239, 68, 68, 0.2)';
    captureBtn.onmouseleave = () => captureBtn.style.background = 'rgba(239, 68, 68, 0.1)';
    
    loadBtn.onmouseenter = () => {
      loadBtn.style.transform = 'translateY(-1px)';
      loadBtn.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.4)';
    };
    loadBtn.onmouseleave = () => {
      loadBtn.style.transform = 'translateY(0)';
      loadBtn.style.boxShadow = 'none';
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CAPTURE FULL CHAT (GEMINI) - COM MODAL LAZY LOADING
  // ═══════════════════════════════════════════════════════════════
  
  window.NodusEngine.captureFullChat = async function(platform) {
    
    // ═══════════════════════════════════════════════════════════════
    // FUNÇÃO DE CAPTURA (será chamada após modal ou diretamente)
    // ═══════════════════════════════════════════════════════════════
    const doCapture = async () => {
      const startTime = Date.now();
      const logData = {
        platform: platform || 'Gemini',
        url: window.location.href,
        selectors_tried: [],
        elements_found: 0,
        nodes_captured: 0,
        status: 'FAILED',
        details: {}
      };
      
      try {
        
        // Verificar se debug está ativo
        const debugActive = window.NodusDebugCapture ? 
          await window.NodusDebugCapture.isDebugActive('gemini') : false;
        
        if (debugActive) {
        }
        
        // Tentar múltiplos seletores (Gemini muda frequentemente)
        let allMessages = document.querySelectorAll('message-content, user-query, [data-message-role], .message-container');
        logData.selectors_tried.push('message-content, user-query, [data-message-role], .message-container');
        logData.details.selector1_count = allMessages.length;
        
        if (debugActive) {
        }
        
        // Se não encontrou, tentar seletores mais genéricos
        if (!allMessages || allMessages.length === 0) {
          allMessages = document.querySelectorAll('[class*="message"], [class*="turn"], [class*="query"]');
          logData.selectors_tried.push('[class*="message"], [class*="turn"], [class*="query"]');
          logData.details.selector2_count = allMessages.length;
          
          if (debugActive) {
        }
      }
      
      // Última tentativa: qualquer div que pareça mensagem
      if (!allMessages || allMessages.length === 0) {
        allMessages = document.querySelectorAll('div[class*="conversation"] div, model-response, user-query, message-content');
        logData.selectors_tried.push('div[class*="conversation"] div, model-response, user-query, message-content');
        logData.details.selector3_count = allMessages.length;
        
        if (debugActive) {
        }
      }
      
      logData.elements_found = allMessages ? allMessages.length : 0;
      
      if (!allMessages || allMessages.length === 0) {
        console.error('[FullChat] ERRO: Nenhuma mensagem encontrada');
        logData.error = 'No messages found - tried all selectors';
        logData.details.dom_sample = document.body.innerHTML.substring(0, 500);
        
        if (debugActive && window.NodusDebugCapture) {
          await window.NodusDebugCapture.addLog(logData);
        }
        
        return { ok: false, error: logData.error };
      }
      
      
      if (debugActive) {
      }
      
      const nodes = [];
      let userMsg = null;
      let debugSamples = [];
      
      allMessages.forEach((msg, index) => {
        try {
          // Tentar detectar role do elemento
          const role = msg.getAttribute('data-message-role') || 
                       msg.getAttribute('data-role') ||
                       msg.getAttribute('role');
          
          // Extrair texto/markdown
          const textMd = window.NodusHtmlToMarkdown ?
            window.NodusHtmlToMarkdown.convert(msg) :
            (msg.innerText || msg.textContent || '').trim();
          
          const text = textMd; // Compatibilidade com código existente
          
          // Log dos primeiros 10 elementos SEMPRE (não só em debug)
          if (index < 10) {
            console.log(`[FullChat] Elemento ${index}:`, {
              tagName: msg.tagName,
              className: msg.className,
              role: role,
              textLength: text.length,
              textPreview: text.substring(0, 80)
            });
          }
          
          // Debug: coletar amostra dos primeiros 3 elementos
          if (debugActive && index < 3) {
            debugSamples.push({
              index,
              role,
              classes: msg.className,
              textLength: text.length,
              textPreview: text.substring(0, 50)
            });
          }
          
          if (!text || text.length < 3) {
            return;
          }
          
          // Heurística melhorada: detectar role
          // 1. Se tem atributo role, confiar nele
          // 2. Se é tag USER-QUERY, é do usuário
          // 3. Se é tag MESSAGE-CONTENT, é do assistant
          // 4. Se não tem, usar tamanho (user geralmente < 200 chars)
          let isUser = false;
          
          if (role === 'user') {
            isUser = true;
          } else if (role === 'assistant' || role === 'model') {
            isUser = false;
          } else if (msg.tagName === 'USER-QUERY') {
            // Tag específica do Gemini para perguntas do usuário
            isUser = true;
          } else if (msg.tagName === 'MESSAGE-CONTENT') {
            // Tag específica do Gemini para respostas do modelo
            isUser = false;
          } else {
            // Sem role explícito: usar heurística de tamanho
            // Respostas do Gemini geralmente são LONGAS
            isUser = text.length < 200;
          }
          
          
          if (debugActive && index < 5) {
          }
          
          if (isUser && !userMsg) {
            // Armazenar mensagem do usuário
            userMsg = text;
            if (debugActive) {
            }
          } else if (!isUser && userMsg) {
            // Par completo: user + assistant
            const firstLine = userMsg.split('\n')[0];
            const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
            
            
            if (debugActive) {
            }
            
            nodes.push({
              id: `node_${Date.now()}_${index}`,
              title: title,
              question: userMsg,
              answer: text,
              platform: platform || 'Gemini',
              date: Date.now(),
              order: nodes.length,
              type: 'standalone'
            });
            
            userMsg = null; // Reset
          } else {
          }
        } catch (err) {
          console.error('[FullChat] Erro processando elemento', index, ':', err);
        }
      });
      
      
      logData.nodes_captured = nodes.length;
      logData.details.debug_samples = debugSamples;
      logData.details.execution_time_ms = Date.now() - startTime;
      logData.details.total_elements_processed = allMessages.length;
      logData.details.pairing_info = {
        user_messages_found: nodes.length,
        last_user_msg_pending: userMsg ? 'yes' : 'no'
      };
      
      if (debugActive) {
      }
      
      if (nodes.length === 0) {
        logData.error = 'No valid message pairs found';
        logData.status = 'FAILED';
        logData.details.hint = 'Elementos foram encontrados mas não foi possível parear user/assistant. Verifique debug_samples.';
        
        if (debugActive && window.NodusDebugCapture) {
          await window.NodusDebugCapture.addLog(logData);
        }
        
        return { ok: false, error: logData.error };
      }
      
      logData.status = 'SUCCESS';
      
      
      if (debugActive && window.NodusDebugCapture) {
        await window.NodusDebugCapture.addLog(logData);
      } else {
      }
      
      return { ok: true, nodes: nodes };
      
    } catch (error) {
      console.error('[FullChat] ERRO GERAL:', error);
      logData.error = error.message;
      logData.details.stack = error.stack;
      
      const debugActive = window.NodusDebugCapture ? 
        await window.NodusDebugCapture.isDebugActive('gemini') : false;
      
      if (debugActive && window.NodusDebugCapture) {
        await window.NodusDebugCapture.addLog(logData);
      }
      
      return { ok: false, error: error.message };
    }
    }; // Fim de doCapture
    
    // ═══════════════════════════════════════════════════════════════
    // LAZY LOADING MODAL - Contar PARES de conversas visíveis
    // ═══════════════════════════════════════════════════════════════
    
    // Contar pares (pergunta + resposta) ao invés de elementos DOM totais
    const userQueries = document.querySelectorAll('user-query').length;
    const aiResponses = document.querySelectorAll('model-response, message-content').length;
    const conversationPairs = Math.min(userQueries, aiResponses);
    
    
    // Mostrar modal inline com opções
    return new Promise((resolve) => {
      showInlineLoadingChoice(
        conversationPairs, // Agora mostra PARES ao invés de elementos totais
        // onLoadAll - quando usuário clica "Carregar Tudo"
        async () => {
          const result = await doCapture();
          window.dispatchEvent(new CustomEvent('nodus-fullchat-captured', { detail: result }));
          resolve(result);
        },
        // onCaptureNow - quando usuário clica "Só X"
        async () => {
          const result = await doCapture();
          window.dispatchEvent(new CustomEvent('nodus-fullchat-captured', { detail: result }));
          resolve(result);
        }
      );
    });
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
