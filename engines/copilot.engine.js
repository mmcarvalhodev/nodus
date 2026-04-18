// ═══════════════════════════════════════════════════════════════
// NODUS - Microsoft Copilot Engine v4.0.0
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
      const platformName = "copilot";
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
  // Suporta tanto callback quanto Promise (await safeSendMessage(...))
  function safeSendMessage(message, callback) {
    const errResp = { ok: false, error: 'Extension reloaded' };
    if (!isContextValid()) {
      console.warn('[Engine] Extension context invalidated, message not sent');
      if (callback) { callback(errResp); return; }
      return Promise.resolve(errResp);
    }
    try {
      if (callback) {
        chrome.runtime.sendMessage(message, callback);
      } else {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(response);
            }
          });
        });
      }
    } catch (error) {
      console.warn('[Engine] Failed to send message:', error);
      const catchResp = { ok: false, error: error.message };
      if (callback) { callback(catchResp); return; }
      return Promise.resolve(catchResp);
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
      console.warn('[Copilot] ⚠️ Telemetry not available:', error);
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
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO
  // ═══════════════════════════════════════════════════════════════
  
  const CONFIG = {
    name: 'Copilot',
    // Seletor para respostas do Copilot
    anchorSelector: '[data-content="ai-message"]',
    // Seletores de input
    inputSelectors: [
      '#userInput',
      'textarea[placeholder*="Copilot"]',
      'textarea'
    ],
    
    getQuestion(answerElement) {
      try {
        // Encontrar o container da conversa
        const conversationContainer = answerElement.closest('[data-content="conversation"]');
        
        if (!conversationContainer) {
          console.warn('[Copilot] Container de conversa não encontrado');
          return null;
        }
        
        // Buscar todas as mensagens (user e ai)
        const allMessages = conversationContainer.querySelectorAll(
          '[data-content="user-message"], [data-content="ai-message"]'
        );
        
        // Encontrar índice da mensagem atual (ai)
        const currentIndex = Array.from(allMessages).indexOf(answerElement);
        
        if (currentIndex === -1) {
          console.warn('[Copilot] Mensagem atual não encontrada no array');
          return null;
        }
        
        // Buscar a última mensagem de usuário antes desta resposta
        for (let i = currentIndex - 1; i >= 0; i--) {
          const msg = allMessages[i];
          
          if (msg.getAttribute('data-content') === 'user-message') {
            const text = msg.innerText?.trim() || msg.textContent?.trim();
            return text;
          }
        }
        
        console.warn('[Copilot] Nenhuma mensagem de usuário encontrada antes da resposta');
        return null;
      } catch (e) {
        console.error('[Copilot] Erro ao buscar pergunta:', e);
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
      if (!answerElement || !(answerElement instanceof Element)) return;
      if (answerElement.querySelector("[data-nodus-container='1']")) return;
      if (answerElement.closest("[data-nodus-container='1']")) return;
      
      // Verificar se tem conteudo (com retry para frameworks SPA)
      let text = answerElement.innerText?.trim() || answerElement.textContent?.trim() || '';
      if (text.length < 3) {
        for (let retry = 0; retry < 10; retry++) {
          await new Promise(r => setTimeout(r, 500));
          if (answerElement.querySelector("[data-nodus-container='1']")) return;
          text = answerElement.innerText?.trim() || answerElement.textContent?.trim() || '';
          if (text.length >= 3) break;
        }
      }
      if (text.length < 3) return;
      if (answerElement.querySelector("[data-nodus-container='1']")) return;
      
      const hash = hashText(text.slice(0, 300));
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
      
      // Verificar licença para Auto Capture
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
        { id: 'save', icon: '💡', label: _t('btn.save'), color: '#3b82f6' },
        { id: 'quick', icon: '⚡', label: _t('btn.quick'), color: '#ef4444' },
        { id: 'paste', icon: '📋', label: _t('btn.paste'), color: '#475569' },
        { id: 'dashboard', icon: '🗂️', label: _t('btn.dash'), color: '#8b5cf6' }
      ];
      
      buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = 'nodus-btn';
        button.dataset.nodusAction = btn.id;
        button.innerHTML = `${btn.icon} ${btn.label}`;
        button.style.cssText = `
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          background: ${btn.color};
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          line-height: 1.2;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        `;
        
        button.onmouseenter = () => {
          button.style.transform = 'translateY(-1px)';
          button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        };
        
        button.onmouseleave = () => {
          button.style.transform = 'translateY(0)';
          button.style.boxShadow = 'none';
        };
        
        button.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleButtonClick(btn.id, answerElement);
        };
        
        container.appendChild(button);
      });
      
      // AUTO CAPTURE BUTTON (seguindo padrão dos outros engines)
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
      
      acBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleAutoCapture();
      };
      
      container.appendChild(acBtn);
      
      if (autoCaptureState.enabled && autoCaptureState.isPro) {
        const counter = document.createElement('span');
        counter.id = 'ac-counter';
        counter.textContent = autoCaptureState.count;
        counter.style.cssText = 'background:#ef4444;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0;';
        container.appendChild(counter);
      }
      
      // Adicionar container diretamente no answerElement
      answerElement.appendChild(container);
      injectedMap.set(hash, true);
      
      // Auto capture se ativado - algoritmo testado do DeepSeek/Grok
      if (autoCaptureState.enabled && autoCaptureState.isPro) {
        let lastLength = answerElement.innerText?.length || 0;
        let stableCount = 0;
        let captureExecuted = false;
        
        const checkStable = setInterval(() => {
          const currentLength = answerElement.innerText?.length || 0;
          
          if (currentLength === lastLength && currentLength > 50) {
            stableCount++;
            if (stableCount >= 6 && !captureExecuted) {
              clearInterval(checkStable);
              captureExecuted = true;
              handleAutoCapture(answerElement);
            }
          } else {
            stableCount = 0;
            lastLength = currentLength;
          }
        }, 500);
        
        setTimeout(() => {
          if (!captureExecuted) {
            clearInterval(checkStable);
            captureExecuted = true;
            handleAutoCapture(answerElement);
          }
        }, 15000);
      }
      
    } catch (e) {
      console.error('[Engine] Erro ao injetar botões:', e);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // EXTRAIR DADOS DA CONVERSA
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

    // Remover elementos screen-reader-only do Copilot (ex: <h6 class="sr-only">O Copilot disse</h6>)
    // Esses elementos são invisíveis na UI mas o conversor HTML→Markdown os inclui como headings
    clone.querySelectorAll('.sr-only').forEach(el => el.remove());
    
    // Converter HTML para Markdown
    let text = window.NodusHtmlToMarkdown ?
      window.NodusHtmlToMarkdown.convert(clone) :
      (clone.innerText?.trim() || clone.textContent?.trim() || '');
    
    // Remover apenas escapes desnecessários (backslash antes de pontuação comum)
    text = text.replace(/\\([!?.,;:()[\]])/g, '$1');

    // Remover cabeçalho de UI do Copilot ("O Copilot disse", "Copilot disse", etc.)
    // que aparece como heading markdown no início das respostas
    text = text.replace(/^#{1,6}\s+.*?Copilot disse.*?\n*/i, '').trim();
    
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
      platform: 'copilot',
      sourceUrl: location.href,
    hasGeneratedFile: hasGeneratedFile,
    hasAttachment: false
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // HANDLER DOS BOTÕES
  // ═══════════════════════════════════════════════════════════════
  
  async function handleButtonClick(action, answerElement) {
    try {
      
      const ideaData = getIdeaData(answerElement);
      
      // Função toast fallback
      const showToast = (msg, type = 'info') => {
        if (UI && UI.showToast) {
          UI.showToast(msg, type);
        } else {
          alert(msg);
        }
      };
      
      // Verificar gate ético para ações save e quick
      if (action === 'save' || action === 'quick' || action === 'dashboard') {
        if (UI && UI.checkAcceptanceAndProceed) {
          UI.checkAcceptanceAndProceed(() => executeAction(action, ideaData, showToast));
        } else {
          executeAction(action, ideaData, showToast);
        }
      } else {
        executeAction(action, ideaData, showToast);
      }
      
    } catch (error) {
      console.error('%c[Engine Copilot] ERRO:', 'color: #ef4444; font-weight: bold;', error);
      console.error('[Engine Copilot] Stack:', error.stack);
      
      if (UI && UI.showToast) {
        UI.showToast('❌ Erro: ' + error.message, 'error');
      } else {
        alert('❌ Erro: ' + error.message);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // AUTO CAPTURE FUNCTIONS
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
        greenCircle.style.cssText = 'position:absolute;width:14px;height:14px;background:#10b981;border-radius:50%;z-index:0;';
        btn.appendChild(greenCircle);
        const emoji = document.createElement('span');
        emoji.textContent = '⭕';
        emoji.style.cssText = 'position:relative;z-index:1;color:#10b981;';
        btn.appendChild(emoji);
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
  
  async function executeAction(action, ideaData, showToast) {
    if (action === 'save') {
      
      if (!chrome || !chrome.runtime) {
        throw new Error('Chrome runtime não disponível');
      }
      
      safeSendMessage({
        action: 'openPanelNQ',
        ideaData: ideaData
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Engine Copilot] Erro no sendMessage:', chrome.runtime.lastError);
          showToast('❌ Erro: ' + chrome.runtime.lastError.message, 'error');
        } else {
        }
      });
      
    } else if (action === 'quick') {
      
      ideaData.tags = ['__quick__'];
      ideaData.captureMethod = 'quick'; // Marca como captura quick
      
      if (!chrome || !chrome.runtime) {
        throw new Error('Chrome runtime não disponível');
      }
      
      const response = await safeSendMessage({
        action: 'saveIdea',
        idea: ideaData
      });
      
      
      if (response && response.ok) {
        showToast('⚡ ' + _t('toast.quicksaved'), 'success');
      } else if (response && response.duplicate) {
        showToast('⚠️ Ideia já salva', 'info');
      } else {
        throw new Error(response?.error || 'Error saving');
      }
      
    } else if (action === 'paste') {
      
      if (!navigator.clipboard) {
        throw new Error('Clipboard API não disponível');
      }
      
      await navigator.clipboard.writeText(ideaData.text);
      showToast('📋 Copiado!', 'success');
      
      // ✨ TRACK: Evento de Inject
      if (telemetryTracker) {
        telemetryTracker.trackInject({
          platform_from: ideaData.source || 'unknown',
          platform_to: 'copilot',
          inject_type: 'paste',
                url_origin: ideaData.sourceUrl || ideaData.url,
                url_destination: window.location.href,
          success: true
        }).catch(err => console.warn('[Telemetry] Track failed:', err));
      }
      
    } else if (action === 'dashboard') {
      if (!window.NodusDashboard) {
        throw new Error('Dashboard não disponível');
      }
      window.NodusDashboard.open('cards');
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // LISTENER DE INJEÇÃO DE TEXTO
  // ═══════════════════════════════════════════════════════════════
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'injectText') {
      try {
        let input = null;
        
        for (const selector of CONFIG.inputSelectors) {
          input = document.querySelector(selector);
          if (input) break;
        }
        
        if (!input) {
          throw new Error('Input não encontrado');
        }
        
        input.value = request.text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.focus();
        
        sendResponse({ ok: true });
      } catch (error) {
        console.error('[Engine] Erro ao injetar texto:', error);
        sendResponse({ ok: false, error: error.message });
      }
      
      return true;
    }
  });
  
  // ═══════════════════════════════════════════════════════════════
  // OBSERVER
  // ═══════════════════════════════════════════════════════════════
  
  let observer = null;
  
  function startObserver() {
    
    // Função para injetar com retry
    const injectWithRetry = (element, retries = 3) => {
      if (!element) return;
      
      const tryInject = () => {
        if (element.querySelector("[data-nodus-container='1']")) {
          return; // Já injetado
        }
        injectButtons(element);
      };
      
      tryInject();
      
      // Retry com delay para pegar mensagens que ainda estão sendo renderizadas
      if (retries > 0) {
        setTimeout(() => injectWithRetry(element, retries - 1), 500);
      }
    };
    
    // Injetar em elementos existentes
    try {
      document.querySelectorAll(CONFIG.anchorSelector).forEach(el => injectWithRetry(el));
    } catch (e) {
      console.error('[Engine] Erro ao injetar existentes:', e);
    }
    
    // Observer para novos elementos
    observer = new MutationObserver((mutations) => {
      try {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              if (node.matches && node.matches(CONFIG.anchorSelector)) {
                injectWithRetry(node);
              }
              if (node.querySelectorAll) {
                node.querySelectorAll(CONFIG.anchorSelector).forEach(el => injectWithRetry(el));
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
    
    // Polling para verificar novos elementos (backup) - mais agressivo
    setInterval(() => {
      const elements = document.querySelectorAll(CONFIG.anchorSelector);
      elements.forEach(el => {
        if (!el.querySelector("[data-nodus-container='1']")) {
          injectButtons(el);
        }
      });
    }, 2000);
    
  }
  
  // Aguardar DOM estar pronto
  const checkInterval = setInterval(() => {
    if (document.querySelector(CONFIG.anchorSelector)) {
      clearInterval(checkInterval);
      startObserver();
    }
  }, 1000);
  
  // ═══════════════════════════════════════════════════════════════
  // CAPTURE FULL CHAT (COPILOT)
  // ═══════════════════════════════════════════════════════════════
  
  window.NodusEngine = window.NodusEngine || {};
  
  // ═══════════════════════════════════════════════════════════════
  // AUTO-SCROLL HELPER (Lazy Loading)
  // ═══════════════════════════════════════════════════════════════
  
  async function loadAllMessagesWithProgress(onProgress) {
    try {
      
      // ✨ COPILOT ESPECÍFICO: [data-testid="chat-page"]
      const copilotContainer = document.querySelector('[data-testid="chat-page"]');
      
      if (!copilotContainer) {
        console.error('[AutoScroll] Container [data-testid="chat-page"] não encontrado!');
        return false;
      }
      
      
      let lastCount = 0;
      let noChangeCount = 0;
      const maxAttempts = 3;
      let iteration = 0;
      
      while (noChangeCount < maxAttempts) {
        iteration++;
        
        // ✨ SCROLL AGRESSIVO - Forçar para o topo
        copilotContainer.scrollTop = 0;
        copilotContainer.scrollTo?.({ top: 0, behavior: 'instant' });
        
        
        // Aguardar carregar (1 segundo para dar tempo)
        await new Promise(r => setTimeout(r, 1000));
        
        // Contar mensagens
        const userMsgs = document.querySelectorAll('[data-content="user-message"]').length;
        const aiMsgs = document.querySelectorAll('[data-content="ai-message"]').length;
        const currentCount = Math.min(userMsgs, aiMsgs);
        
        
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
      console.error('[AutoScroll] Erro:', error);
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
      border: 2px solid #facc15;
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
          <div style="font-weight: 600; font-size: 14px; color: #facc15; margin-bottom: 4px;">
            Lazy Loading Detectado
          </div>
          <div style="font-size: 12px; color: #9ca3af; line-height: 1.4;">
            <strong style="color: #facc15;">${initialCount} mensagens</strong> visíveis.<br>
            Pode haver mais antigas não carregadas.
          </div>
        </div>
      </div>
      
      <div id="progress-inline" style="display: none; margin-bottom: 12px; text-align: center;">
        <div style="font-size: 12px; color: #60a5fa; font-weight: 500; margin-bottom: 6px;">
          🔄 Carregando... <span id="progress-count-inline">${initialCount}</span> msgs
        </div>
        <div style="height: 3px; background: rgba(96, 165, 250, 0.2); border-radius: 2px; overflow: hidden;">
          <div id="progress-bar-inline" style="height: 100%; background: #60a5fa; width: 0%; transition: width 0.3s;"></div>
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
          background: linear-gradient(135deg, #3b82f6, #2563eb);
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
      loadBtn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
    };
    loadBtn.onmouseleave = () => {
      loadBtn.style.transform = 'translateY(0)';
      loadBtn.style.boxShadow = 'none';
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CAPTURE FULL CHAT (COPILOT) - COM MODAL
  // ═══════════════════════════════════════════════════════════════
  
  window.NodusEngine.captureFullChat = function(platform) {
    
    // Função de captura (será chamada pelo modal)
    const doCapture = () => {
      try {
        // ✨ NOVOS SELETORES (2024): data-content ao invés de cib-message
        const userMessages = document.querySelectorAll('[data-content="user-message"]');
        const aiMessages = document.querySelectorAll('[data-content="ai-message"]');
        
        
        if (userMessages.length === 0 && aiMessages.length === 0) {
          return { ok: false, error: 'No messages found' };
        }
        
        const nodes = [];
        
        // Processar pares user+ai
        const maxPairs = Math.min(userMessages.length, aiMessages.length);
        
        for (let i = 0; i < maxPairs; i++) {
          const userMsg = userMessages[i];
          const aiMsg = aiMessages[i];
          
          // Pegar texto (remover "O Copilot disse" e headers)
          const userText = (userMsg.textContent || '').trim();
          const aiText = (aiMsg.textContent || '').replace(/^O Copilot disse\s*/i, '').trim();
          
          if (!userText || !aiText) continue;
          
          // Converter HTML para Markdown
          const userMd = window.NodusHtmlToMarkdown ?
            window.NodusHtmlToMarkdown.convert(userMsg) :
            userText;
          
          const aiMd = window.NodusHtmlToMarkdown ?
            window.NodusHtmlToMarkdown.convert(aiMsg) :
            aiText;
          
          const firstLine = userMd.split('\n')[0];
          const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
          
          nodes.push({
            id: `node_${Date.now()}_${i}`,
            title: title,
            question: userMd,
            answer: aiMd,
            platform: platform || 'Copilot',
            date: Date.now(),
            order: nodes.length,
            type: 'pair'
          });
        }
        
        return { ok: true, nodes: nodes };
        
      } catch (error) {
        console.error('[FullChat] Error:', error);
        return { ok: false, error: error.message };
      }
    };
    
    // Contar mensagens iniciais
    const initialUserCount = document.querySelectorAll('[data-content="user-message"]').length;
    const initialAiCount = document.querySelectorAll('[data-content="ai-message"]').length;
    const initialCount = Math.min(initialUserCount, initialAiCount);
    
    // Mostrar modal com opções
    showInlineLoadingChoice(
      initialCount,
      // onLoadAll: capturar após carregar tudo
      () => {
        const result = doCapture();
        // Passar para dashboard (será interceptado pelo código existente)
        if (result.ok) {
          window.dispatchEvent(new CustomEvent('nodus-fullchat-captured', { detail: result }));
        }
        return result;
      },
      // onCaptureNow: capturar imediatamente
      () => {
        const result = doCapture();
        if (result.ok) {
          window.dispatchEvent(new CustomEvent('nodus-fullchat-captured', { detail: result }));
        }
        return result;
      }
    );
    
    // Retornar pendente (modal vai lidar)
    return { ok: true, pending: true, message: 'Aguardando escolha do usuário...' };
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
