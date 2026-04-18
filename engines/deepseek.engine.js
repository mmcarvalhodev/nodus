// ═══════════════════════════════════════════════════════════════
// NODUS - DeepSeek Engine v1.0.0
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
      const platformName = "deepseek";
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
      console.warn('[DeepSeek] ⚠️ Telemetry not available:', error);
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
    name: 'DeepSeek',
    // Seletor para respostas do DeepSeek - SEM hash para pegar TODAS
    anchorSelector: 'div.ds-message',
    // Seletor alternativo caso o primeiro não funcione
    anchorSelectorAlt: 'div[class*="message"]',
    // Seletor de input (textarea)
    inputSelector: 'textarea.ds-scroll-area',
    
    // Cores dos botões (tema DeepSeek - azul escuro)
    colors: {
      save: '#1e40af',      // Azul escuro
      quick: '#dc2626',     // Vermelho
      paste: '#059669',     // Verde
      dash: '#7c3aed'       // Roxo
    }
  };
  
  // Mapa para evitar duplicação de botões
  const injectedMap = new Map();
  
  // AUTO CAPTURE STATE
  let autoCaptureState = {
    enabled: false,
    count: 0,
    isPro: false
  };
  
  // ═══════════════════════════════════════════════════════════════
  // INJEÇÃO DE BOTÕES
  // ═══════════════════════════════════════════════════════════════
  
  async function injectButtons(answerElement) {
    try {
      // 🔒 Verificar se deve mostrar botões
      const showButtons = await shouldShowButtons();
      if (!showButtons) return;
      // Verificar se já tem botões
      if (answerElement.querySelector('[data-nodus-container="1"]')) {
        return;
      }
      
      // CRÍTICO: Verificar se é resposta do DeepSeek (não pergunta do usuário)
      // No DeepSeek, mensagens do usuário geralmente são mais curtas e vêm antes
      // Verificar se o elemento contém características de resposta da IA
      const hasCodeBlocks = answerElement.querySelector('pre, code');
      const hasLongText = answerElement.textContent?.length > 100;
      const hasFormatting = answerElement.querySelector('strong, em, ul, ol, h1, h2, h3');
      
      // Se for mensagem muito curta sem formatação, provavelmente é do usuário
      if (!hasCodeBlocks && !hasLongText && !hasFormatting) {
        // Verificar se tem ícones de ações do DeepSeek (botões nativos)
        const hasDeepseekButtons = answerElement.querySelector('[class*="action"], [class*="button"]');
        if (!hasDeepseekButtons) {
          return; // Pular - provavelmente é mensagem do usuário
        }
      }
      
      // Container dos botões - SEMPRE VISÍVEL (padrão NODUS)
      const container = document.createElement('div');
      container.setAttribute('data-nodus-container', '1');
      container.style.cssText = `
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 12px;
        justify-content: flex-end;
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
      
      // Criar botões COM ÍCONES + TEXTO (padrão NODUS)
      const buttons = [
        { icon: '💾', text: _t('btn.save'), action: 'save', color: CONFIG.colors.save },
        { icon: '⚡', text: _t('btn.quick'), action: 'quick', color: CONFIG.colors.quick },
        { icon: '📋', text: _t('btn.paste'), action: 'paste', color: CONFIG.colors.paste },
        { icon: '📊', text: _t('btn.dash'), action: 'dash', color: CONFIG.colors.dash }
      ];
      
      buttons.forEach(({ icon, text, action, color }) => {
        const btn = document.createElement('button');
        btn.innerHTML = `${icon} ${text}`;
        btn.setAttribute('data-nodus-action', action);
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
          white-space: nowrap;
        `;
        btn.onmouseenter = () => btn.style.opacity = '0.85';
        btn.onmouseleave = () => btn.style.opacity = '1';
        container.appendChild(btn);
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
      
      container.appendChild(acBtn);
      
      if (autoCaptureState.enabled && autoCaptureState.isPro) {
        const counter = document.createElement('span');
        counter.id = 'ac-counter';
        counter.textContent = autoCaptureState.count;
        counter.style.cssText = 'background:#ef4444;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0;';
        container.appendChild(counter);
      }
      
      // Adicionar container APÓS o conteúdo da mensagem
      answerElement.appendChild(container);
      
      // Auto capture se ativado - usar mesmo algoritmo do Grok (que funcionou)
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
      // Silencioso - reinjeção contínua
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
    
    // Converter ANSWER para Markdown
    let answer = '';
    if (window.NodusHtmlToMarkdown) {
      answer = window.NodusHtmlToMarkdown.convert(clone);
    } else {
      answer = clone.innerText?.trim() || clone.textContent?.trim() || '';
    }
    
    // Remover apenas escapes desnecessários (backslash antes de pontuação comum)
    answer = answer.replace(/\\([!?.,;:()[\]])/g, '$1');
    
    // BUSCAR QUESTION: encontrar mensagem do usuário ANTES desta resposta
    let question = '';
    try {
      // No DeepSeek, mensagens alternam: user, assistant, user, assistant...
      // Precisamos encontrar a mensagem anterior
      const allMessages = Array.from(document.querySelectorAll(CONFIG.anchorSelector + ', ' + CONFIG.anchorSelectorAlt));
      const currentIndex = allMessages.indexOf(answerElement);
      
      if (currentIndex > 0) {
        // Mensagem anterior deve ser do usuário
        const previousMessage = allMessages[currentIndex - 1];
        const prevClone = previousMessage.cloneNode(true);
        
        // Remover botões NODUS se existirem
        const prevNodus = prevClone.querySelector('[data-nodus-container="1"]');
        if (prevNodus) prevNodus.remove();
        
        if (window.NodusHtmlToMarkdown) {
          question = window.NodusHtmlToMarkdown.convert(prevClone);
        } else {
          question = prevClone.innerText?.trim() || prevClone.textContent?.trim() || '';
        }
      }
    } catch (e) {
      console.warn('[Engine] Erro ao buscar question:', e);
    }
    
    return {
      id: `idea_${now.getTime()}_${Math.random().toString(36).slice(2, 6)}`,
      question: question || 'No question',
      text: answer,
      answer: answer,
      timestamp: now.getTime(),
      date: now.toISOString(),
      platform: 'DeepSeek',
      source: CONFIG.name,
      tags: ['DeepSeek'],
      title: (question || answer).substring(0, 60) + ((question || answer).length > 60 ? '...' : ''),
      captureMethod: 'save'
    };
  }
  
  function handleSave(answerElement) {
    
    // Se não receber elemento (botão externo), pegar última mensagem
    if (!answerElement) {
      const allMessages = document.querySelectorAll(CONFIG.anchorSelector + ', ' + CONFIG.anchorSelectorAlt);
      answerElement = allMessages[allMessages.length - 1];
      
      if (!answerElement) {
        console.error('[Engine] Nenhuma mensagem encontrada');
        UI.showToast('⚠️ Nenhuma mensagem para salvar', 'warning');
        return;
      }
    }
    
    const ideaData = getIdeaData(answerElement);
    if (!ideaData || ideaData.answer.length < 3) return;
    UI.openPanelNQModal(ideaData);
  }
  
  function handleQuickSave(answerElement) {
    
    // Se não receber elemento (botão externo), pegar última mensagem
    if (!answerElement) {
      const allMessages = document.querySelectorAll(CONFIG.anchorSelector + ', ' + CONFIG.anchorSelectorAlt);
      answerElement = allMessages[allMessages.length - 1];
      
      if (!answerElement) {
        console.error('[Engine] Nenhuma mensagem encontrada');
        UI.showToast('⚠️ Nenhuma mensagem para salvar', 'warning');
        return;
      }
    }
    
    const ideaData = getIdeaData(answerElement);
    if (!ideaData || ideaData.answer.length < 3) return;
    
    ideaData.queue = 'ideas_queue_quick';
    ideaData.tags.push('__quick__'); // Tag oculta para roteamento
    ideaData.captureMethod = 'quick'; // Marca como captura quick
    
    // CORRIGIDO: Usar window.NodusStorage.saveIdea ao invés de addIdea
    if (window.NodusStorage && typeof window.NodusStorage.saveIdea === 'function') {
      const result = window.NodusStorage.saveIdea(ideaData);
      
      UI.showToast(_t('toast.quicksaved'), 'success');
    } else {
      console.error('[Engine] NodusStorage.saveIdea não disponível');
      UI.showToast('❌ Erro ao salvar', 'error');
    }
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
    
    // Verificar aceitação do gate ético ANTES de abrir dashboard
    UI.checkAcceptanceAndProceed(() => {
      
      if (window.NodusDashboard) {
        // Tentar vários métodos possíveis
        if (typeof window.NodusDashboard.toggle === 'function') {
          window.NodusDashboard.toggle();
        } else if (typeof window.NodusDashboard.open === 'function') {
          window.NodusDashboard.open();
        } else if (window.NodusDashboard.overlay) {
          // Método manual: mostrar overlay se existir
          window.NodusDashboard.overlay.style.display = 'flex';
          window.NodusDashboard.isOpen = true;
        } else {
          console.warn('[Engine] Dashboard existe mas métodos não disponíveis!');
          UI.showToast(_t('toast.dashboardnotavailable'), 'warning');
        }
      } else {
        console.warn('[Engine] Dashboard não disponível!');
        UI.showToast(_t('toast.dashboardnotavailable'), 'warning');
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
      const isExternal = button.dataset.nodusExternal === '1';
      
      // Dashboard não precisa de elemento
      if (action === 'dash') {
        handleDashboard();
        return;
      }
      
      // Auto Capture toggle
      if (action === 'autocapture') {
        e.preventDefault();
        e.stopPropagation();
        toggleAutoCapture();
        return;
      }
      
      let answerElement = null;
      
      // Se for botão externo, pegar última mensagem
      if (isExternal) {
        const allMessages = document.querySelectorAll(CONFIG.anchorSelector + ', ' + CONFIG.anchorSelectorAlt);
        answerElement = allMessages[allMessages.length - 1];
      } else {
        // Botão interno: encontrar elemento de resposta (subir na árvore DOM)
        answerElement = button.closest(CONFIG.anchorSelector) || 
                        button.closest(CONFIG.anchorSelectorAlt);
      }
      
      if (!answerElement && action !== 'paste') {
        console.error('[Engine] Elemento de resposta não encontrado');
        UI.showToast('⚠️ Nenhuma mensagem encontrada', 'warning');
        return;
      }
      
      // Executar ação
      switch (action) {
        case 'save':
          handleSave(answerElement);
          break;
        case 'quick':
          handleQuickSave(answerElement);
          break;
        case 'paste':
          handlePaste();
          break;
      }
    } catch (error) {
      console.error('[Engine] Erro no click handler:', error);
    }
  }, true); // capture phase: DeepSeek calls stopPropagation on clicks

  
  // ═══════════════════════════════════════════════════════════════
  // OBSERVER
  // ═══════════════════════════════════════════════════════════════
  
  function startObserver() {
    
    const observer = new MutationObserver(() => {
      const answers = document.querySelectorAll(CONFIG.anchorSelector);
      if (answers.length === 0) {
        const answersAlt = document.querySelectorAll(CONFIG.anchorSelectorAlt);
        if (answersAlt.length > 0) {
          answersAlt.forEach(injectButtons);
        }
      } else {
        answers.forEach(injectButtons);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    
    // Verificar elementos existentes
    setTimeout(() => {
      const existing = document.querySelectorAll(CONFIG.anchorSelector);
      if (existing.length === 0) {
        const existingAlt = document.querySelectorAll(CONFIG.anchorSelectorAlt);
        if (existingAlt.length > 0) {
          existingAlt.forEach(injectButtons);
        }
      } else {
        existing.forEach(injectButtons);
      }
    }, 2000);
    
    // REINJEÇÃO AGRESSIVA - DeepSeek remove botões com scroll virtual
    // Reinjectar a cada 2 segundos para garantir que botões não sumam
    setInterval(() => {
      const allMessages = document.querySelectorAll(CONFIG.anchorSelector + ', ' + CONFIG.anchorSelectorAlt);
      allMessages.forEach(injectButtons);
    }, 2000);
  }
  
  // Iniciar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // BOTÕES EXTERNOS FIXOS - DESABILITADO PARA TESTE
  // ═══════════════════════════════════════════════════════════════
  
  function createExternalButtons() {
    // Desabilitado temporariamente para testar apenas botões internos
    return;
  }
  
  // Não criar botões externos
  // setTimeout(createExternalButtons, 1000);
  
  // Botões externos desabilitados - não precisa de observer de textarea
  
  // ═══════════════════════════════════════════════════════════════
  // FULL CHAT CAPTURE - DeepSeek
  // ═══════════════════════════════════════════════════════════════
  
  window.NodusEngine = window.NodusEngine || {};
  window.NodusEngine.captureFullChat = async function() {
    try {
      
      // DEBUG: Testar múltiplos seletores
      const testSelectors = [
        'div.d29f3d7d.ds-message',
        'div.ds-message',
        'div[class*="message"]',
        'div[class*="chat"]',
        '[role="article"]'
      ];
      
      testSelectors.forEach(sel => {
        const found = document.querySelectorAll(sel);
      });
      
      // Buscar todas as mensagens
      let allMessages = document.querySelectorAll(CONFIG.anchorSelector);
      
      if (allMessages.length === 0) {
        allMessages = document.querySelectorAll(CONFIG.anchorSelectorAlt);
      }
      
      if (allMessages.length === 0) {
        console.error('[FullChat] ❌ NENHUMA MENSAGEM ENCONTRADA');
        console.error('[FullChat] DOM atual:', document.body.innerHTML.substring(0, 500));
        return { 
          ok: false, 
          error: 'Nenhuma mensagem encontrada. Os seletores CSS podem ter mudado.',
          nodes: []
        };
      }
      
      const nodes = [];
      let userMsg = null;
      
      
      allMessages.forEach((msg, index) => {
        try {
          // Clonar para não afetar DOM
          const clone = msg.cloneNode(true);
          
          // LIMPEZA CIRÚRGICA - remover apenas UI, NÃO conteúdo
          
          // 1. Botões NODUS
          clone.querySelectorAll('[data-nodus-container="1"]').forEach(el => el.remove());
          clone.querySelectorAll('[data-nodus-action]').forEach(el => el.remove());
          
          // 2. Botões nativos (copy, regenerate, feedback, etc)
          clone.querySelectorAll('button').forEach(el => el.remove());
          
          // 3. SVGs (ícones)
          clone.querySelectorAll('svg').forEach(el => el.remove());
          
          // Extrair texto
          let text = '';
          if (window.NodusHtmlToMarkdown) {
            text = window.NodusHtmlToMarkdown.convert(clone);
          } else {
            text = clone.innerText?.trim() || clone.textContent?.trim() || '';
          }
          
          
          // IMPORTANTE: Aceitar textos com mínimo de 1 char (até "oi" é válido!)
          if (!text || text.length < 1) {
            return;
          }
          
          // Detectar se é USER ou ASSISTANT pela ORDEM (alternância)
          const isUser = (index % 2 === 0);
          
          
          if (isUser) {
            // É pergunta do usuário
            userMsg = text;
          } else {
            // É resposta do assistant
            if (userMsg) {
              nodes.push({
                id: `node_${Date.now()}_${index}`,
                title: userMsg.substring(0, 60) + (userMsg.length > 60 ? '...' : ''),
                question: userMsg,
                answer: text,
                platform: 'DeepSeek',
                date: Date.now(),
                order: nodes.length,
                type: 'standalone'
              });
              
              
              userMsg = null;
            } else {
            }
          }
          
        } catch (e) {
          console.error(`[FullChat] ❌ Erro mensagem ${index}:`, e);
        }
      });
      
      
      return {
        ok: true,
        nodes: nodes,
        totalMessages: allMessages.length,
        platform: 'DeepSeek'
      };
      
    } catch (error) {
      console.error('[FullChat] ❌ ERRO FATAL:', error);
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
