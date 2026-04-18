// ═══════════════════════════════════════════════════════════════
// NODUS v4.172.0 - Content Script (Orquestrador)
// ═══════════════════════════════════════════════════════════════

(async () => {
  'use strict';

  const NODUS_VERSION = chrome.runtime.getManifest().version;
  // Expõe versão ao mundo MAIN via DOM (compartilhado entre mundos isolado e MAIN)
  document.documentElement.dataset.nodusVersion = NODUS_VERSION;
  
  // ═══════════════════════════════════════════════════════════════
  // MARKDOWN TO HTML CONVERTER (para inject)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Convert Markdown to HTML for contenteditable injection
   * Optimized for cross-platform compatibility (ChatGPT, Claude, Gemini, etc)
   */
  function convertMarkdownToHtml(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    // MELHORIA #2: Preservar caracteres tree (├─, └─) - método seguro
    // Processar linha por linha para evitar problemas com regex Unicode
    html = html.split('\n').map(line => {
      // Se linha começa com ├─ ou └─, converter para lista
      if (line.startsWith('├─ ') || line.startsWith('└─ ')) {
        return '- ' + line.substring(3); // Substitui tree por lista normal
      }
      return line;
    }).join('\n');
    
    // MELHORIA #1: Code blocks → Monospace inline (ao invés de <pre><code>)
    // ProseMirror e outros editores não aceitam <pre> direto
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
      // Preservar quebras de linha dentro do code block
      const lines = code.trim().split('\n');
      return '<span style="font-family: monospace; background: rgba(127,127,127,0.1); padding: 2px 4px; border-radius: 3px;">' + 
             lines.join('<br>') + 
             '</span>';
    });
    
    // Headers (ordem inversa: H3 → H2 → H1 para evitar conflitos)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code inline (mesmo tratamento: monospace)
    html = html.replace(/`([^`]+)`/g, '<span style="font-family: monospace; background: rgba(127,127,127,0.1); padding: 2px 4px; border-radius: 3px;">$1</span>');
    
    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr>');
    
    // Listas simples
    html = html.replace(/^- (.*)$/gim, '<li>$1</li>');
    
    // Wrap listas em <ul>
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Quebras de linha duplas → parágrafo
    html = html.replace(/\n\n/g, '</p><p>');
    
    // Quebras de linha simples → <br>
    html = html.replace(/\n/g, '<br>');
    
    // Wrap em parágrafo se não começar com tag HTML
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    // MELHORIA #3: Limpar <p> vazios (ProseMirror ignora)
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><br><\/p>/g, '<br>');
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    // Limpar múltiplos <br> consecutivos (max 2)
    html = html.replace(/(<br>\s*){3,}/g, '<br><br>');
    
    return html;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // INICIALIZAR I18N
  // ═══════════════════════════════════════════════════════════════
  
  if (typeof NodusI18n !== 'undefined') {
    await NodusI18n.init();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DETECTAR PLATAFORMA
  // ═══════════════════════════════════════════════════════════════
  
  function getPlatformName() {
    const hostname = location.hostname;
    if (hostname.includes('chat.openai') || hostname.includes('chatgpt')) return 'chatgpt';
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('gemini.google')) return 'gemini';
    if (hostname.includes('perplexity.ai')) return 'perplexity';
    if (hostname.includes('copilot.microsoft')) return 'copilot';
    if (hostname.includes('grok.com') || hostname.includes('x.com/i/grok')) return 'grok';
    if (hostname.includes('chat.deepseek.com')) return 'deepseek';
    return null;
  }
  
  const platformName = getPlatformName();
  
  if (!platformName) {
    return;
  }
  
  
  // ═══════════════════════════════════════════════════════════════
  // CARREGAR MÓDULOS (Dynamic Import)
  // ═══════════════════════════════════════════════════════════════
  
  async function loadModule(path) {
    try {
      const url = chrome.runtime.getURL(path);
      await import(url);
      return true;
    } catch (e) {
      console.error(`%c❌ Erro ao carregar ${path}:`, 'color: #ef4444;', e);
      return false;
    }
  }
  
  // Carregar módulos dinâmicos em paralelo
  // Nota: html_to_markdown, attachments_db, attachments_ui já são content scripts
  // estáticos do manifest — não precisam ser carregados novamente aqui.

  const [success] = await Promise.all([
    loadModule('content/modules/all_modules.js'),  // NodusDebug, NodusStorage, NodusUI, NodusPanelNQ, NodusGate
    loadModule('content/modules/file_detection.js'),
    loadModule('modules/state_sync.js'),
  ]);

  if (!success) {
    console.error('❌ Falha ao carregar módulos core');
    return;
  }

  // Carregar engine da plataforma (depende dos módulos acima)
  const engineLoaded = await loadModule(`engines/${platformName}.engine.js`);

  if (!engineLoaded) {
    console.error(`❌ Falha ao carregar engine: ${platformName}`);
    return;
  }
  

  // Inicializar Tab Tracker (estado persistente entre abas)
  if (typeof window.NodusTabTracker !== 'undefined') {
    window.NodusTabTracker.init();
  }

  // ═══════════════════════════════════════════════════════════════
  // ONBOARDING (exibe na primeira vez que o usuário usa)
  // ═══════════════════════════════════════════════════════════════
  setTimeout(async () => {
    try {
      await loadModule('content/modules/onboarding.js');
      if (typeof window.NodusOnboarding !== 'undefined') {
        await window.NodusOnboarding.checkAndShow();
      }
    } catch (e) {
      console.warn('[Content] Onboarding não carregado:', e);
    }
  }, 1200);
  
  // ═══════════════════════════════════════════════════════════════
  // DEBUG FUNCTIONS (acessíveis via chrome.runtime.sendMessage)
  // Centralizado na página de manutenção (admin.html)
  // ═══════════════════════════════════════════════════════════════
  
  // Debug functions movidas para admin.js - Central de Debug
  // Funções disponíveis no content script via window.NodusLicense:
  // - window.NodusLicense.isPro()
  // - window.NodusLicense.showPaywall(featureId)
  // - window.NodusLicense.showActivationModal()
  // - window.NodusLicense.setFree()
  // - window.NodusLicense.activatePro(data)
  
  // ═══════════════════════════════════════════════════════════════
  // LISTENER PARA INJECT DO POPUP
  // ═══════════════════════════════════════════════════════════════
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    // 🔄 LICENSE UPDATED - Reload a página
    if (message.type === 'LICENSE_UPDATED') {
      location.reload();
      return;
    }
    
    if (message.action === 'open_dashboard') {
      try {
        
        if (!window.NodusDashboard) {
          throw new Error('NodusDashboard não disponível');
        }
        
        window.NodusDashboard.open(message.tab || 'cards');
        sendResponse({ ok: true, message: 'Dashboard aberto' });
      } catch (error) {
        console.error('[Content] Erro ao abrir Dashboard:', error);
        sendResponse({ ok: false, error: error.message });
      }
      
      return true;
    }
    
    if (message.action === 'open_settings') {
      try {
        
        if (!window.NodusDashboard) {
          throw new Error('NodusDashboard não disponível');
        }
        
        // Abre dashboard e depois abre settings
        window.NodusDashboard.open('cards');
        setTimeout(() => {
          window.NodusDashboard.openSettings();
        }, 100);
        
        sendResponse({ ok: true, message: 'Settings aberto' });
      } catch (error) {
        console.error('[Content] Erro ao abrir Settings:', error);
        sendResponse({ ok: false, error: error.message });
      }
      
      return true;
    }
    
    if (message.action === 'openPanelNQ') {
      try {
        
        if (!window.NodusPanelNQ) {
          throw new Error('NodusPanelNQ não disponível');
        }
        
        window.NodusPanelNQ.open(message.ideaData);
        sendResponse({ ok: true, message: 'Panel NQ aberto' });
      } catch (error) {
        console.error('[Content] Erro ao abrir Panel NQ:', error);
        sendResponse({ ok: false, error: error.message });
      }
      
      return true;
    }
    
    if (message.action === 'injectText') {
      try {
        let text = message.text;
        const injectMode = message.injectMode || 'formatted';
        
        
        // Seletores por plataforma (múltiplos para maior compatibilidade)
        const INPUT_SELECTORS = {
          chatgpt: [
            'div#prompt-textarea[contenteditable="true"]',
            'div.ProseMirror[contenteditable="true"]',
            'textarea#prompt-textarea',
            'div[contenteditable="true"]',
            'textarea'
          ],
          claude: [
            '[data-testid="chat-input"]',
            'div.ProseMirror[contenteditable="true"]',
            'div[contenteditable="true"]',
            'textarea'
          ],
          gemini: [
            'div[contenteditable="true"].ql-editor',
            'div[contenteditable="true"]',
            'rich-textarea'
          ],
          perplexity: [
            '#ask-input',
            'div[contenteditable="true"]',
            '[data-lexical-editor="true"]'
          ],
          copilot: [
            '#userInput',
            'textarea[placeholder*="Copilot"]',
            'textarea'
          ],
          grok: [
            'div.tiptap[contenteditable="true"]',
            'div.ProseMirror[contenteditable="true"]',
            'div[contenteditable="true"]'
          ],
          deepseek: [
            'textarea.ds-scroll-area',
            'textarea[placeholder*="DeepSeek"]',
            'textarea'
          ]
        };
        
        const selectors = INPUT_SELECTORS[platformName];
        
        if (!selectors || !Array.isArray(selectors)) {
          console.error('[Content] Seletores não encontrados para plataforma:', platformName);
          sendResponse({ ok: false, error: 'Plataforma não configurada' });
          return true;
        }
        
        let input = null;
        
        // Tentar cada seletor até encontrar
        for (const selector of selectors) {
          input = document.querySelector(selector);
          if (input) {
            break;
          }
        }
        
        if (!input) {
          console.error('[Content] Input não encontrado');
          sendResponse({ ok: false, error: 'Input não encontrado' });
          return true; // Manter canal aberto
        }
        
        // Se for rich-textarea, buscar o contentEditable dentro
        if (input.tagName === 'RICH-TEXTAREA') {
          const innerInput = input.querySelector('div[contenteditable="true"]');
          if (innerInput) {
            input = innerInput;
          }
        }
        
        // Injetar texto
        input.focus();
        
        if (input.tagName === 'TEXTAREA') {
          // TEXTAREA normal
          input.value = text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            data: text
          });
          input.dispatchEvent(inputEvent);
          
        } else if (input.isContentEditable || input.contentEditable === 'true') {
          // ContentEditable (ProseMirror, Gemini ql-editor, Perplexity Lexical)
          
          // ✨ CLEANUP: Remover escapes e lixo de caracteres
          text = text
            .replace(/\\n/g, '\n')      // \\n → \n real
            .replace(/\\t/g, '\t')      // \\t → \t real  
            .replace(/\\\"/g, '"')      // \\" → "
            .replace(/\\\'/g, "'")      // \\' → '
            .replace(/\\\\/g, '\\');    // \\\\ → \
          
          // ✨ PERPLEXITY LEXICAL: Usar execCommand
          if (platformName === 'perplexity' && input.hasAttribute('data-lexical-editor')) {
            
            // Limpar conteúdo existente
            input.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            
            // Inserir texto (sempre como plain text no Lexical)
            document.execCommand('insertText', false, text);
            
            // Disparar eventos
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            sendResponse({ ok: true, message: 'Texto injetado' });
            return true;
          }
          
          // Para outras plataformas (ChatGPT, Claude, Gemini): método normal
          let htmlContent = text;
          
          // Aplicar conversão baseada no inject mode
          if (injectMode === 'formatted') {
            // Modo 1: Formatted HTML - converter Markdown para HTML
            if (text.includes('#') || text.includes('**') || text.includes('```')) {
              htmlContent = convertMarkdownToHtml(text);
            }
          } else if (injectMode === 'markdown') {
            // Modo 2: Markdown - manter como está (raw)
            // Criar parágrafo simples com texto preservado
            input.innerHTML = '';
            const p = document.createElement('p');
            p.textContent = text;
            input.appendChild(p);
            
            // Posicionar cursor
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(p);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            
            // Disparar eventos
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('focus', { bubbles: true }));
            
            sendResponse({ ok: true, message: 'Texto injetado' });
            return true;
          } else if (injectMode === 'plaintext') {
            // Modo 3: Plain text - já vem stripped do dashboard
            // Criar parágrafo simples
            input.innerHTML = '';
            const p = document.createElement('p');
            p.textContent = text;
            input.appendChild(p);
            
            // Posicionar cursor
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(p);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            
            // Disparar eventos
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('focus', { bubbles: true }));
            
            sendResponse({ ok: true, message: 'Texto injetado' });
            return true;
          }
          
          // Modo formatted: continua com HTML rendering
          input.innerHTML = '';
          
          // Criar elemento com HTML renderizado
          const fragment = document.createDocumentFragment();
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          
          // Mover nodes para o fragment
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          
          input.appendChild(fragment);
          
          // Posicionar cursor no final
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(input);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          
          // Disparar eventos
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('focus', { bubbles: true }));
        }
        
        sendResponse({ ok: true, message: 'Texto injetado' });
        
      } catch (error) {
        console.error('[Content] Erro ao injetar:', error);
        sendResponse({ ok: false, error: error.message });
      }
      
      return true; // CRÍTICO: Manter canal de resposta aberto para sendResponse assíncrono
    }
    
    return true; // Async response
  });
  
})();
