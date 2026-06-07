/**
 * NODUS Chains Drag Bridge — MAIN world
 *
 * Loaded as a MAIN world content script (see manifest.json).
 * Content scripts in the isolated world cannot populate DataTransfer.items
 * for native browser drag-and-drop. This bridge runs in the page's own JS
 * context where DataTransfer manipulation is fully native.
 *
 * Communication: isolated world → postMessage({ __nodus:'cdrag', t, ... }) → here
 */
(function () {
  'use strict';

  var _file = null;
  var _blobUrl = null;

  // Pick the most specific drop target available for the given selector list.
  // Tries each selector in order; returns the first visible match.
  function findDropTarget(selectorList) {
    if (!selectorList || !selectorList.length) return document.body;
    for (var i = 0; i < selectorList.length; i++) {
      var el = document.querySelector(selectorList[i]);
      if (el && el.offsetParent !== null) return el;
    }
    return document.body;
  }

  // Fire a synthetic drop sequence. SPAs like Gemini register drop-zone listeners
  // at multiple levels (document for the "file entered window" overlay, then the
  // final target for the actual drop). We dispatch the canonical sequence:
  //   dragenter(document) → dragover(document)
  // → dragenter(target)   → dragover(target)
  // → drop(target)
  // Each event gets its own DataTransfer (some SPAs mutate the one they see).
  function dispatchSyntheticDrop(target, file) {
    if (!target || !file) return false;

    var rect = target.getBoundingClientRect ? target.getBoundingClientRect() : { left: 100, top: 100, width: 200, height: 200 };
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    function makeDT() {
      var dt = new DataTransfer();
      try { dt.items.add(file); } catch (_) {}
      try { dt.effectAllowed = 'copyMove'; } catch (_) {}
      try { dt.dropEffect = 'copy'; } catch (_) {}
      return dt;
    }

    function fire(type, tgt, dt) {
      var ev = new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: cx,
        clientY: cy,
        screenX: cx,
        screenY: cy,
        dataTransfer: dt
      });
      tgt.dispatchEvent(ev);
      return ev;
    }

    try {
      // 1) File "enters the window" — activates global drop overlay
      fire('dragenter', document, makeDT());
      fire('dragenter', document.body, makeDT());
      fire('dragover', document, makeDT());
      fire('dragover', document.body, makeDT());

      // 2) File moves over the specific target (rich-textarea, input container, etc.)
      fire('dragenter', target, makeDT());
      fire('dragover', target, makeDT());

      // 3) Drop — this is where the SPA should read dataTransfer.files
      fire('drop', target, makeDT());

      // 4) dragend for cleanup on the page side
      fire('dragend', document.body, makeDT());

      console.log('[NodusChainsBridge] ✅ full drop sequence on', target.tagName || 'document', target.className || '');
      return true;
    } catch (err) {
      console.warn('[NodusChainsBridge] synthetic drop failed:', err);
      return false;
    }
  }

  // Listen for file prep/clear/inject messages from the isolated world content script
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.__nodus !== 'cdrag') return;

    if (e.data.t === 'prep') {
      // Build a real File from the markdown text sent over postMessage
      var blob = new Blob([e.data.c], { type: 'text/markdown;charset=utf-8' });
      _file = new File([blob], e.data.n, { type: 'text/markdown' });
      if (_blobUrl) URL.revokeObjectURL(_blobUrl);
      _blobUrl = URL.createObjectURL(blob); // page-origin blob URL
      console.log('[NodusChainsBridge] ✅ File ready:', _file.name, _file.size, 'bytes, blobUrl:', _blobUrl);

    } else if (e.data.t === 'clr') {
      if (_blobUrl) { URL.revokeObjectURL(_blobUrl); _blobUrl = null; }
      _file = null;
      console.log('[NodusChainsBridge] File cleared');

    } else if (e.data.t === 'reveal-gemini-input') {
      // Gemini-specific: o input[type=file] é criado TRANSIENTE pela directive
      // xapfileselectortrigger. Ele chama .click() nele e descarta — nunca fica
      // anexado ao document.querySelector. Por isso não dá pra "achar depois":
      // a gente precisa preencher DENTRO do próprio interceptor, que tem acesso
      // direto ao `this` (o input). O Angular já tem o listener de change
      // vinculado ao input antes de chamar .click() — então dispatchEvent('change')
      // nele dispara o handler do Gemini normalmente.

      // Re-construir o File a partir do conteúdo enviado pelo isolated world.
      // Precisa estar disponível ANTES do monkey-patch rodar (porque a sequência
      // de cliques dispara input.click() quase imediatamente).
      var pendingFile = null;
      try {
        if (e.data.fileName && typeof e.data.content === 'string') {
          var mdBlob = new Blob([e.data.content], { type: 'text/markdown;charset=utf-8' });
          pendingFile = new File([mdBlob], e.data.fileName, {
            type: 'text/markdown',
            lastModified: Date.now()
          });
          console.log('[NodusChainsBridge] reveal: pendingFile ready', pendingFile.name, pendingFile.size, 'b');
        }
      } catch (fErr) {
        console.warn('[NodusChainsBridge] failed to build pendingFile:', fErr);
      }

      var filled = false;

      var origInputClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this && this.type === 'file') {
          console.log('[NodusChainsBridge] Intercepted file input click — this.isConnected:', this.isConnected);
          if (pendingFile) {
            try {
              var dt = new DataTransfer();
              dt.items.add(pendingFile);
              this.files = dt.files;
              console.log('[NodusChainsBridge] ✅ input.files populated:', this.files.length, '| name:', this.files[0] && this.files[0].name);

              // Dispatchar change e input no próprio input (onde Angular atachou)
              try {
                this.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true }));
                console.log('[NodusChainsBridge]   dispatched change ✅');
              } catch (ce) { console.warn('[NodusChainsBridge]   change failed:', ce); }
              try {
                this.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
                console.log('[NodusChainsBridge]   dispatched input ✅');
              } catch (ie) { console.warn('[NodusChainsBridge]   input failed:', ie); }
              try {
                this.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, composed: true }));
              } catch (_) {}

              filled = true;
              try { this.setAttribute('data-nodus-revealed', '1'); } catch (_) {}
            } catch (err) {
              console.warn('[NodusChainsBridge] ❌ fill failed:', err);
            }
          } else {
            console.warn('[NodusChainsBridge] No pendingFile to fill input with');
          }
          return; // bloqueia o picker nativo (sempre, mesmo sem pendingFile)
        }
        return origInputClick.apply(this, arguments);
      };

      (async function revealSeq() {
        var ok = false;
        var reason = '';
        try {
          // 1) Achar o botão '+' DENTRO do container de ações do input
          //    (.leading-actions-wrapper é o wrapper confirmado pelo log do drop target)
          var wrapper = document.querySelector('.leading-actions-wrapper')
            || document.querySelector('input-area-v2 .leading-actions-wrapper')
            || document.querySelector('input-area-v2');

          var plusBtn = null;
          if (wrapper) {
            var btns = Array.from(wrapper.querySelectorAll('button'))
              .filter(function (b) { return b.offsetParent !== null; });

            // Preferência 1: botão com mat-icon "add" / "plus" / "attach"
            plusBtn = btns.find(function (b) {
              var mi = b.querySelector('mat-icon');
              if (!mi) return false;
              var fi = (mi.getAttribute('fonticon') || mi.getAttribute('data-mat-icon-name') || mi.textContent || '').trim().toLowerCase();
              return /^(add|plus|attach)/.test(fi);
            });

            // Preferência 2: botão SEM texto visível (icon-only)
            if (!plusBtn) {
              plusBtn = btns.find(function (b) { return !(b.textContent || '').trim(); });
            }
            // Preferência 3: primeiro botão
            if (!plusBtn && btns.length) plusBtn = btns[0];
          }

          if (!plusBtn) {
            reason = 'plus-btn-not-found';
            console.warn('[NodusChainsBridge] + button não encontrado em .leading-actions-wrapper');
          } else {
            console.log('[NodusChainsBridge] Clicking + button:', (plusBtn.getAttribute('aria-label') || plusBtn.outerHTML.slice(0, 100)));
            plusBtn.click();
            await new Promise(function (r) { setTimeout(r, 450); });

            // 2) Achar "Enviar arquivos" DENTRO do mat-menu-panel aberto
            var openPanels = Array.from(document.querySelectorAll(
              '.cdk-overlay-pane [role="menu"], .mat-mdc-menu-panel, .mat-menu-panel, [role="menu"]'
            )).filter(function (p) { return p.offsetParent !== null; });

            var itemRegex = /^\s*(enviar\s+arquivo|adicionar\s+arquivo|carregar\s+arquivo|fazer\s+upload|upload\s+file|send\s+file|attach\s+file|escolher\s+arquivo|file\s+upload|carregar\s+do\s+computador|do\s+computador|from\s+computer|browse)/i;

            var menuItem = null;
            for (var pi = 0; pi < openPanels.length; pi++) {
              var items = Array.from(openPanels[pi].querySelectorAll('[role="menuitem"], button, [role="option"]'))
                .filter(function (el) { return el.offsetParent !== null; });
              menuItem = items.find(function (el) { return itemRegex.test((el.textContent || '').trim()); });
              if (menuItem) break;
            }

            if (!menuItem) {
              reason = 'menu-item-not-found';
              console.warn('[NodusChainsBridge] "Enviar arquivos" não encontrado em', openPanels.length, 'painel(is) aberto(s)');
            } else {
              console.log('[NodusChainsBridge] Clicking menu item:', (menuItem.textContent || '').trim().slice(0, 60));
              menuItem.click();
              await new Promise(function (r) { setTimeout(r, 600); });

              // Se xapfileselectortrigger dispara click num button-proxy antes
              // do input[type=file] real ser clicado, a cadeia de chamadas
              // pode levar mais um frame — espera um pouquinho mais.
              if (!filled) {
                await new Promise(function (r) { setTimeout(r, 400); });
              }

              // Fechar o menu que ficou aberto visualmente (Escape)
              try {
                document.body.dispatchEvent(new KeyboardEvent('keydown', {
                  key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true
                }));
              } catch (_) {}

              // Fallback: se o menu item foi clicado mas nenhum input.click()
              // aconteceu (filled continua false), tenta clicar direto no
              // botão-proxy hidden-local-file-image-selector-button
              // (xapfileselectortrigger) — foi o que o screenshot revelou.
              if (!filled) {
                var trigger = document.querySelector('button[xapfileselectortrigger], button.hidden-local-file-image-selector-button');
                if (trigger) {
                  console.log('[NodusChainsBridge] Fallback: clicking xapfileselectortrigger');
                  trigger.click();
                  await new Promise(function (r) { setTimeout(r, 500); });
                }
              }

              ok = filled;
              if (!ok) reason = 'input-click-not-intercepted';
            }
          }
        } catch (err) {
          console.warn('[NodusChainsBridge] reveal sequence threw:', err);
          reason = 'exception';
        } finally {
          // Restaurar prototype sempre
          HTMLInputElement.prototype.click = origInputClick;
        }

        console.log('[NodusChainsBridge] reveal done — ok:', ok, '| filled:', filled, '| reason:', reason || '—');
        window.postMessage({ __nodus: 'cdrag', t: 'reveal-gemini-input-result', ok: ok, filled: filled, reason: reason }, location.origin);
      })();

    } else if (e.data.t === 'inject') {
      // Synthetic drop path: no drag gesture required.
      // We try each selector one by one, waiting between attempts, and watch the
      // DOM for an "attachment accepted" marker. First target that triggers the
      // marker wins; if none do, we return ok=false so the isolated world can
      // fall back to another strategy (download API, etc).
      if (!_file) {
        console.warn('[NodusChainsBridge] inject requested but no file prepared');
        window.postMessage({ __nodus: 'cdrag', t: 'inject-result', ok: false, reason: 'no-file' }, location.origin);
        return;
      }

      var selectors = (e.data.selectors && e.data.selectors.length) ? e.data.selectors : ['body'];
      var successMarker = e.data.successMarker || null; // CSS selector to detect success
      var perTargetDelay = e.data.perTargetDelay || 350;

      (async function tryAllTargets() {
        var anyOk = false;
        var hitTarget = null;

        for (var i = 0; i < selectors.length; i++) {
          var tgt = document.querySelector(selectors[i]);
          if (!tgt || tgt.offsetParent === null) continue;

          var fired = dispatchSyntheticDrop(tgt, _file);
          if (!fired) continue;
          anyOk = true;
          hitTarget = tgt;

          // If caller told us what "success" looks like, wait briefly and check.
          if (successMarker) {
            await new Promise(function (r) { setTimeout(r, perTargetDelay); });
            if (document.querySelector(successMarker)) {
              console.log('[NodusChainsBridge] 🎯 success marker matched after target', selectors[i]);
              break;
            }
          } else {
            // No marker — fire on the first visible target only (original behavior)
            break;
          }
        }

        var confirmed = successMarker ? !!document.querySelector(successMarker) : anyOk;
        window.postMessage({
          __nodus: 'cdrag',
          t: 'inject-result',
          ok: confirmed,
          fired: anyOk,
          target: hitTarget && hitTarget.tagName
        }, location.origin);
      })();
    }
  });

  // Capture-phase dragstart: fires before isolated-world listeners
  // Sets DataTransfer with a real File so the platform (Gemini, etc.) sees it
  document.addEventListener('dragstart', function (e) {
    // Walk up from target to find the chip element
    var el = e.target;
    var steps = 0;
    while (el && steps < 10) {
      if (el.id === 'nodus-drag-chip') break;
      el = el.parentElement;
      steps++;
    }
    if (!el || el.id !== 'nodus-drag-chip') return;

    console.log('[NodusChainsBridge] 🎯 dragstart on chip caught (capture phase)');
    console.log('[NodusChainsBridge]   _file ready?', !!_file, _file ? _file.name + ' / ' + _file.size + 'b' : '(no file prepared)');
    console.log('[NodusChainsBridge]   _blobUrl ready?', !!_blobUrl, _blobUrl || '(no blob url)');

    if (!_file) {
      console.warn('[NodusChainsBridge] ⚠️ No file prepared — postMessage(prep) may have failed');
      return;
    }

    // 1) Add the real File object (populates dataTransfer.files on drop)
    try {
      e.dataTransfer.items.add(_file);
      console.log('[NodusChainsBridge]   items.add(_file) ✅');
    } catch (err) {
      console.warn('[NodusChainsBridge]   items.add failed:', err);
    }

    // 2) DownloadURL: Chrome includes 'downloadurl' in types, which triggers
    //    Gemini's dragover drop-zone detector
    if (_blobUrl) {
      try {
        e.dataTransfer.setData('DownloadURL', 'text/markdown:' + _file.name + ':' + _blobUrl);
        console.log('[NodusChainsBridge]   setData DownloadURL ✅');
      } catch (err) {
        console.warn('[NodusChainsBridge]   setData failed:', err);
      }
    }

    e.dataTransfer.effectAllowed = 'copy';
    console.log('[NodusChainsBridge]   types at end of MAIN dragstart:', JSON.stringify(Array.from(e.dataTransfer.types)));
    console.log('[NodusChainsBridge]   files.length at end:', e.dataTransfer.files ? e.dataTransfer.files.length : '(N/A)');
  }, true /* capture */);

  // Observa drops globais para debug — nos diz se Gemini está vendo o file
  document.addEventListener('drop', function (e) {
    if (!_file) return;
    try {
      console.log('[NodusChainsBridge] 👁️ drop observed — target:', e.target && e.target.tagName,
        '| types:', JSON.stringify(Array.from(e.dataTransfer.types)),
        '| files.length:', e.dataTransfer.files ? e.dataTransfer.files.length : 0);
    } catch (_) {}
  }, true);

  console.log('[NodusChainsBridge] MAIN world bridge loaded ✅ origin:', location.origin);
})();
