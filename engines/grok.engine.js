// ═══════════════════════════════════════════════════════════════
// NODUS - Grok Engine v4.0.0
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
      const platformName = "grok";
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
      console.warn('[Grok] ⚠️ Telemetry not available:', error);
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
    name: 'Grok',
    // Seletor para respostas do Grok
    anchorSelector: '.message-bubble',
    // Seletores de input (ProseMirror/TipTap contentEditable)
    inputSelectors: [
      'div.tiptap[contenteditable="true"]',
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"]'
    ],
    
    getQuestion(answerElement) {
      try {
        // Estratégia 1: Buscar message-bubble anterior (pergunta do usuário)
        let prev = answerElement.previousElementSibling;
        while (prev) {
          if (prev.classList.contains('message-bubble')) {
            const text = prev.innerText?.trim() || prev.textContent?.trim();
            if (text && text.length > 2 && text.length < 500) {
              return text;
            }
          }
          prev = prev.previousElementSibling;
        }
        
        // Estratégia 2: Buscar todas as message-bubbles
        const allBubbles = document.querySelectorAll('.message-bubble');
        for (let i = allBubbles.length - 1; i >= 0; i--) {
          const bubble = allBubbles[i];
          if (bubble !== answerElement) {
            const text = bubble.innerText?.trim() || bubble.textContent?.trim();
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
  // LAZY LOADING - AUTO SCROLL
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Scrollar automaticamente para carregar todas mensagens (lazy loading)
   * Grok tem lazy loading mais rápido que Gemini
   */
  async function loadAllMessagesWithProgress(onProgress) {
    
    // Encontrar container com scroll
    const grokContainer = document.querySelector('.w-full.h-full.overflow-y-auto') ||
                          document.querySelector('[class*="overflow-y-auto"]');
    
    if (!grokContainer) {
      console.error('[AutoScroll Grok] Container com overflow não encontrado!');
      return false;
    }
    
    
    let previousCount = 0;
    let stableCount = 0;
    const maxAttempts = 2; // 2 iterações estáveis suficientes para Grok

    for (let i = 0; i < 6; i++) { // Max 6 iterações
      // Scrollar para o topo
      grokContainer.scrollTop = 0;

      // Aguardar carregamento
      await new Promise(r => setTimeout(r, 500)); // 500ms por iteração
      
      // Contar mensagens carregadas
      const messages = document.querySelectorAll('.message-bubble');
      const currentCount = messages.length;
      
      
      // Atualizar progresso
      if (onProgress) {
        onProgress(currentCount);
      }
      
      // Verificar se parou de carregar
      if (currentCount === previousCount) {
        stableCount++;
        if (stableCount >= maxAttempts) {
          break;
        }
      } else {
        stableCount = 0;
      }
      
      previousCount = currentCount;
    }
    
    return true;
  }
  
  /**
   * Modal inline para escolha: carregar tudo ou capturar só visíveis
   * INLINE no canto superior direito (padrão Copilot/Gemini)
   */
  function showInlineLoadingChoice(visibleCount, onLoadAll, onCaptureNow) {
    
    // LIMPEZA AGRESSIVA - Remover TUDO
    const toRemove = [
      document.getElementById('nodus-inline-warning'),
      document.querySelector('[data-nodus-lazy-modal]'),
      ...document.querySelectorAll('[data-version]')
    ].filter(Boolean);
    
    toRemove.forEach(el => {
      el.remove();
    });
    
    // Criar modal inline (canto superior direito) - v4.11.3
    const modal = document.createElement('div');
    modal.id = 'nodus-inline-warning';
    modal.setAttribute('data-version', '4.11.3');
    
    // CSS inline com !important para sobrescrever tudo
    modal.style.cssText = `
      position: fixed !important;
      top: 80px !important;
      right: 20px !important;
      left: auto !important;
      transform: none !important;
      background: linear-gradient(135deg, #1a1f29 0%, #0e1117 100%) !important;
      border: 2px solid #1da1f2 !important;
      border-radius: 12px !important;
      padding: 16px !important;
      max-width: 380px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
      z-index: 999998 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      color: #e5e7eb !important;
      animation: slideIn 0.3s ease !important;
      margin: 0 !important;
    `;
    
    console.log('[Grok Modal] CSS aplicado:', {
      position: modal.style.position,
      top: modal.style.top,
      right: modal.style.right,
      transform: modal.style.transform
    });
    
    modal.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      
      <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 12px;">
        <div style="font-size: 32px;">🤖</div>
        <div style="flex: 1;">
          <div style="font-size: 15px; font-weight: 600; color: #1da1f2; margin-bottom: 4px;">
            NODUS - Grok
          </div>
          <div style="font-size: 13px; color: #9ca3af; line-height: 1.4;">
            ${visibleCount} mensagens (≈${Math.ceil(visibleCount / 2)} trocas)
          </div>
        </div>
      </div>
      
      <div id="nodus-lazy-progress" style="display: none; margin: 12px 0;">
        <div style="background: #374151; border-radius: 6px; height: 6px; overflow: hidden; margin-bottom: 8px;">
          <div id="nodus-lazy-bar" style="background: linear-gradient(90deg, #1da1f2, #14b8a6); height: 100%; width: 0%; transition: width 0.3s;"></div>
        </div>
        <div id="nodus-lazy-text" style="font-size: 12px; color: #1da1f2; text-align: center;">
          Carregando... <span id="nodus-lazy-count">0</span> conversas
        </div>
      </div>
      
      <div id="nodus-lazy-buttons" style="display: flex; gap: 8px; margin-top: 12px;">
        <button id="nodus-lazy-capture" style="
          flex: 1;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">
          ❌ Só ${visibleCount}
        </button>
        <button id="nodus-lazy-load" style="
          flex: 1;
          background: linear-gradient(135deg, #1da1f2, #14b8a6);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">
          🔄 Carregar Tudo
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Botão "Só visíveis"
    const btnCapture = modal.querySelector('#nodus-lazy-capture');
    btnCapture.addEventListener('click', () => {
      modal.remove();
      onCaptureNow(); // Resolve a Promise com nodes
    });
    
    btnCapture.addEventListener('mouseenter', () => {
      btnCapture.style.transform = 'translateY(-2px)';
      btnCapture.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
    });
    
    btnCapture.addEventListener('mouseleave', () => {
      btnCapture.style.transform = 'translateY(0)';
      btnCapture.style.boxShadow = 'none';
    });
    
    // Botão "Carregar tudo"
    const btnLoad = modal.querySelector('#nodus-lazy-load');
    btnLoad.addEventListener('click', async () => {
      // Esconder botões
      modal.querySelector('#nodus-lazy-buttons').style.display = 'none';
      modal.querySelector('#nodus-lazy-progress').style.display = 'block';
      
      // Atualizar progresso durante carregamento
      const updateProgress = (count) => {
        const progressBar = modal.querySelector('#nodus-lazy-bar');
        const progressText = modal.querySelector('#nodus-lazy-count');
        
        if (progressBar && progressText) {
          progressText.textContent = count;
          const percent = Math.min((count / (visibleCount * 2)) * 100, 95);
          progressBar.style.width = percent + '%';
        }
      };
      
      // Executar callback (que carrega e resolve Promise)
      modal.querySelector('#nodus-lazy-bar').style.width = '100%';
      modal.querySelector('#nodus-lazy-text').innerHTML = '✅ Processando...';
      
      setTimeout(() => {
        modal.remove();
        onLoadAll(); // Resolve a Promise com nodes (após carregar tudo)
      }, 500);
    });
    
    btnLoad.addEventListener('mouseenter', () => {
      btnLoad.style.transform = 'translateY(-2px)';
      btnLoad.style.boxShadow = '0 4px 12px rgba(29, 161, 242, 0.4)';
    });
    
    btnLoad.addEventListener('mouseleave', () => {
      btnLoad.style.transform = 'translateY(0)';
      btnLoad.style.boxShadow = 'none';
    });
  }
  
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
      
      // FILTRO: Ignorar mensagens do usuário (não são respostas do Grok)
      // Heurística: mensagens do usuário geralmente são mais curtas e vêm antes das respostas
      let text = answerElement.innerText || '';
      
      // Se a mensagem está no topo (primeira), provavelmente é do usuário
      const allBubbles = document.querySelectorAll('.message-bubble');
      const currentIndex = Array.from(allBubbles).indexOf(answerElement);
      
      // Se é ímpar (1, 3, 5...) provavelmente é resposta do Grok
      // Se é par (0, 2, 4...) provavelmente é pergunta do usuário  
      if (currentIndex % 2 === 0) {
        return;
      }
      
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

      const hash = hashText(text.slice(0, 300));
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
      
      // Adicionar no final do message-bubble
      answerElement.appendChild(container);
      
      injectedMap.set(hash, answerElement);
      
      // Auto capture se ativado - aguardar streaming com critério mais rigoroso  
      if (autoCaptureState.enabled && autoCaptureState.isPro) {
        let lastLength = answerElement.innerText?.length || 0;
        let stableCount = 0;
        let captureExecuted = false; // Evitar duplicatas
        
        const checkStable = setInterval(() => {
          const currentLength = answerElement.innerText?.length || 0;
          
          if (currentLength === lastLength && currentLength > 50) { // Mínimo 50 chars
            stableCount++;
            if (stableCount >= 6 && !captureExecuted) { // 6 checks = 3s estável
              clearInterval(checkStable);
              captureExecuted = true;
              handleAutoCapture(answerElement);
            }
          } else {
            stableCount = 0;
            lastLength = currentLength;
          }
        }, 500);
        
        // Timeout de segurança - capturar mesmo se não estabilizar
        setTimeout(() => {
          if (!captureExecuted) {
            clearInterval(checkStable);
            captureExecuted = true;
            handleAutoCapture(answerElement);
          }
        }, 15000); // 15s máximo
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

    // Remover indicador de reasoning do Grok ("Pensou por Xs" / "Thought for Xs")
    // Pode ser button, details, div com classe think/reasoning, ou qualquer elemento
    // com texto que corresponda ao padrão
    clone.querySelectorAll('button, details, [class*="think"], [class*="reason"], [class*="thought"]').forEach(el => {
      if (/^(pensou por|thought for|thinking)/i.test(el.textContent?.trim())) {
        el.remove();
      }
    });

    // Converter HTML para Markdown
    let text = window.NodusHtmlToMarkdown ?
      window.NodusHtmlToMarkdown.convert(clone) :
      (clone.innerText?.trim() || clone.textContent?.trim() || '');
    
    // Remover apenas escapes desnecessários (backslash antes de pontuação comum)
    text = text.replace(/\\([!?.,;:()[\]])/g, '$1');
    
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
      platform: 'grok'
    };
  }
  
  /**
   * Capturar conversa completa (PADRÃO COPILOT)
   * Retorna Promise que resolve com { ok, nodes } ou { pending: true }
   */
  function captureFullChat() {
    return new Promise((resolve) => {
      
      // Contar mensagens visíveis
      const visibleMessages = document.querySelectorAll('.message-bubble').length;
      
      
      // Função para processar e retornar nodes
      const processAndResolve = async (shouldLoadAll) => {
        try {
          if (shouldLoadAll) {
            // Auto-scroll para carregar tudo
            await loadAllMessagesWithProgress((count) => {
            });
          }
          
          // Capturar mensagens
          const messageBubbles = document.querySelectorAll('.message-bubble');
          
          const nodes = [];
          let userMsg = null;
          
          messageBubbles.forEach((bubble, index) => {
            try {
              // Detectar se é mensagem do usuário ou IA
              const isUser = bubble.closest('[data-message-author-role="user"]') ||
                            bubble.querySelector('[class*="user"]') ||
                            (index % 2 === 0); // Fallback: assume alternância
              
              // Clone para não afetar DOM
              const clone = bubble.cloneNode(true);
              
              // Remover botões NODUS
              const nodusContainer = clone.querySelector('[data-nodus-container="1"]');
              if (nodusContainer) {
                nodusContainer.remove();
              }
              
              const text = window.NodusHtmlToMarkdown ?
                window.NodusHtmlToMarkdown.convert(clone) :
                (clone.innerText?.trim() || clone.textContent?.trim() || '');
              
              if (!text || text.length < 3) return;
              
              if (isUser) {
                // Guardar pergunta do usuário
                userMsg = text;
              } else {
                // Resposta da IA
                nodes.push({
                  question: userMsg || '',
                  answer: text,
                  platform: 'Grok',
                  timestamp: Date.now(),
                  order: nodes.length,
                  type: userMsg ? 'qa' : 'standalone'
                });
                
                userMsg = null;
              }
            } catch (e) {
              console.warn(`[Engine] Erro ao processar mensagem ${index}:`, e);
            }
          });
          
          resolve({ ok: true, nodes: nodes });
          
        } catch (error) {
          console.error('[Engine] Erro na captura:', error);
          resolve({ ok: false, error: error.message });
        }
      };
      
      // Mostrar modal de escolha
      showInlineLoadingChoice(
        visibleMessages,
        () => processAndResolve(true),  // Carregar tudo
        () => processAndResolve(false)  // Só visíveis
      );
      
      // Retornar pending enquanto usuário decide
      // (a Promise resolve quando usuário clicar em um dos botões)
    });
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
      
      // Buscar o elemento .message-bubble ancestral
      const answerElement = container.closest('.message-bubble');
      if (!answerElement) {
        console.error('[Engine] Elemento .message-bubble não encontrado');
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
              // .message-bubble pode ser adicionado diretamente
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
  // CAPTURE FULL CHAT (GROK)
  // ═══════════════════════════════════════════════════════════════
  
  window.NodusEngine = window.NodusEngine || {};
  
  window.NodusEngine.captureFullChat = function(platform) {
    try {
      
      const allMessages = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
      if (!allMessages || allMessages.length === 0) {
        return { ok: false, error: 'No messages found' };
      }
      
      const nodes = [];
      let userMsg = null;
      
      allMessages.forEach((msg, index) => {
        // Converter HTML para Markdown
        const textMd = window.NodusHtmlToMarkdown ?
          window.NodusHtmlToMarkdown.convert(msg) :
          (msg.innerText || msg.textContent).trim();
        
        if (!textMd || textMd.length < 10) return;
        
        // Grok: detectar se é user ou bot por tamanho e padrões
        const isUser = textMd.length < 300; // Heurística
        
        if (isUser && !userMsg) {
          userMsg = textMd;
        } else if (!isUser && userMsg) {
          const firstLine = userMsg.split('\n')[0];
          const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
          
          nodes.push({
            id: `node_${Date.now()}_${index}`,
            title: title,
            question: userMsg,
            answer: textMd, // Markdown!
            platform: platform || 'Grok',
            date: Date.now(),
            order: nodes.length,
            type: 'standalone'
          });
          
          userMsg = null;
        }
      });
      
      return { ok: true, nodes: nodes };
      
    } catch (error) {
      console.error('[FullChat] Error:', error);
      return { ok: false, error: error.message };
    }
  };
  
  // Expor captureFullChat globalmente para uso externo
  window.NodusEngine = window.NodusEngine || {};
  window.NodusEngine.captureFullChat = captureFullChat;
  
  
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
