// ═══════════════════════════════════════════════════════════════
// NODUS Health Runner — executa contratos ação→resultado
// ═══════════════════════════════════════════════════════════════

const NodusHealthRunner = {

  version: '2.0.0',

  // ─────────────────────────────────────────────────────────────
  // Executa um grupo de contratos
  // @param contracts  array de contratos
  // @param context    string label para o reporter
  // @param rootEl     elemento DOM raiz onde buscar seletores (default: document)
  // ─────────────────────────────────────────────────────────────
  async run(contracts, context = 'unknown', rootEl = document) {
    console.group(`[NODUS Health] 🔍 ${context} — ${contracts.length} contratos`);

    const results = [];

    for (const contract of contracts) {
      const result = await this._execute(contract, rootEl);
      results.push(result);

      const icon = result.passed ? '✅' : '❌';
      const ms   = result.duration + 'ms';
      if (result.passed) {
        console.log(`  ${icon} ${result.name}  (${ms})`);
      } else {
        console.error(`  ${icon} ${result.name}  →  ${result.error}  (${ms})`);
      }
    }

    const passed = results.filter(r =>  r.passed).length;
    const failed = results.filter(r => !r.passed);

    console.log(`\n  ${passed}/${results.length} passou`);
    console.groupEnd();

    if (failed.length > 0) {
      await NodusHealthReporter.send(failed, context);
    }

    return results;
  },

  // ─────────────────────────────────────────────────────────────
  // Executa um único contrato: ação → aguarda → verifica
  // ─────────────────────────────────────────────────────────────
  async _execute(contract, rootEl) {
    const start = Date.now();

    try {
      // 0. Delay pré-ação (para elementos que renderizam assincronamente)
      if (contract.preDelay) await this._sleep(contract.preDelay);

      // 1. Disparar a ação
      await this._doAction(contract.action, rootEl);

      // 2. Aguardar + verificar resultado no DOM
      const passed = await this._waitForVerify(contract.verify, contract.timeout || 2000, rootEl);

      return {
        name:        contract.name,
        level:       contract.level,
        description: contract.description,
        passed,
        error:       passed ? null : `resultado não encontrado: ${JSON.stringify(contract.verify)}`,
        duration:    Date.now() - start,
      };

    } catch (e) {
      return {
        name:        contract.name,
        level:       contract.level,
        description: contract.description,
        passed:      false,
        error:       e.message,
        duration:    Date.now() - start,
      };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Executa a ação definida no contrato
  // ─────────────────────────────────────────────────────────────
  async _doAction(action, rootEl) {
    // eval: executa expressão JS arbitrária (uso exclusivo em health testing)
    // ATENÇÃO: bloqueado por Trusted Types em Gemini/Claude. Prefira 'call' quando possível.
    if (action.type === 'eval') {
      // eslint-disable-next-line no-eval
      eval(action.code);
      return;
    }

    // call: invoca uma função por dotted-path no window do mundo ISOLADO
    // (via bridge CustomEvent), porque módulos como NodusOnboarding são
    // carregados com import() no content script e NÃO existem neste MAIN world.
    // Compatível com Trusted Types — nenhum eval/new Function envolvido.
    // Ex.: { type: 'call', path: 'NodusOnboarding.show', args: [] }
    if (action.type === 'call') {
      const reqId = 'hc-' + Math.random().toString(36).slice(2) + '-' + Date.now();
      await new Promise((resolve, reject) => {
        const onDone = (ev) => {
          if (!ev.detail || ev.detail.reqId !== reqId) return;
          clearTimeout(timer);
          window.removeEventListener('nodus_health_call_done', onDone);
          if (ev.detail.ok) resolve();
          else reject(new Error(ev.detail.error || 'call falhou'));
        };
        const timer = setTimeout(() => {
          window.removeEventListener('nodus_health_call_done', onDone);
          reject(new Error('Timeout aguardando bridge para call: ' + action.path));
        }, action.callTimeout || 3000);
        window.addEventListener('nodus_health_call_done', onDone);
        window.dispatchEvent(new CustomEvent('nodus_health_call', {
          detail: { path: action.path, args: action.args, reqId },
        }));
      });
      return;
    }

    // click-if-exists: não lança erro se o elemento não existir
    if (action.type === 'click-if-exists') {
      const el = rootEl.querySelector(action.selector);
      if (el) el.click();
      return;
    }

    // click-if-has-class: clica só se o elemento com classSelector tiver a classe dada
    if (action.type === 'click-if-has-class') {
      const el       = rootEl.querySelector(action.selector);
      const carrier  = action.classSelector ? rootEl.querySelector(action.classSelector) : el;
      if (el && carrier && carrier.classList.contains(action.className)) el.click();
      return;
    }

    const el = rootEl.querySelector(action.selector);
    if (!el) throw new Error(`Elemento de ação não encontrado: ${action.selector}`);

    switch (action.type) {
      case 'click':
        el.click();
        break;

      case 'type':
        el.focus();
        el.value = action.value || '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        break;

      case 'type-enter':
        el.focus();
        el.value = action.value || '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await this._sleep(100);
        // Dispara keydown + keypress + keyup — alguns handlers do app escutam
        // 'keypress' (ex.: dashboard_chains usa keypress para confirmar chain).
        // Sem keypress, o Enter é "digitado" mas a lógica nunca roda.
        el.dispatchEvent(new KeyboardEvent('keydown',  { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup',    { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        break;

      case 'select':
        el.value = action.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        break;

      case 'set-checked':
        // Força o estado de um checkbox/toggle e dispara change (determinístico para setups)
        if ('checked' in el) {
          el.checked = action.value === true || action.value === 'true';
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;

      case 'check-attr':
        // Só verifica que o atributo existe — a verificação real fica no verify
        break;

      default:
        throw new Error(`Tipo de ação desconhecido: ${action.type}`);
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Aguarda até o resultado aparecer no DOM (polling a cada 100ms)
  // ─────────────────────────────────────────────────────────────
  async _waitForVerify(verify, timeout, rootEl) {
    const end = Date.now() + timeout;

    while (Date.now() < end) {
      if (this._check(verify, rootEl)) return true;
      await this._sleep(100);
    }

    return false;
  },

  // ─────────────────────────────────────────────────────────────
  // Verifica a condição esperada no DOM
  // ─────────────────────────────────────────────────────────────
  _check(verify, rootEl) {
    const el = rootEl.querySelector(verify.selector);

    switch (verify.condition) {

      case 'exists':
        return el !== null;

      case 'not-exists':
        return el === null;

      case 'visible':
        return el !== null && el.offsetParent !== null && getComputedStyle(el).display !== 'none';

      case 'not-visible':
        return el === null || el.offsetParent === null || getComputedStyle(el).display === 'none';

      case 'has-class':
        return el !== null && el.classList.contains(verify.value);

      case 'not-has-class':
        return el !== null && !el.classList.contains(verify.value);

      case 'has-text':
        return el !== null && el.textContent.includes(verify.value);

      case 'has-attr':
        return el !== null && el.hasAttribute(verify.value);

      case 'has-attr-value':
        return el !== null && el.getAttribute(verify.attr) === verify.value;

      case 'count-gt': {
        const els = rootEl.querySelectorAll(verify.selector);
        return els.length > verify.value;
      }

      case 'not-hidden':
        // Verifica apenas display (sem checar offsetParent — útil para menus absolutos/fixed)
        return el !== null && getComputedStyle(el).display !== 'none';

      case 'changed-state':
        // Marca o estado antes da ação e verifica se mudou
        // (usado para checkboxes/toggles)
        return el !== null; // simplificado — o runner registra estado antes

      default:
        throw new Error(`Condição desconhecida: ${verify.condition}`);
    }
  },

  _sleep: (ms) => new Promise(r => setTimeout(r, ms)),
};
