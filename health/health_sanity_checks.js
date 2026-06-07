// ═══════════════════════════════════════════════════════════════
// NODUS Sanity Checks — verificações passivas spec-derivadas
// ═══════════════════════════════════════════════════════════════
// Roda em ISOLATED world (content script estático + loader dinâmico
// no content.js). Complementa a instrumentação withHealth do runtime:
//   - withHealth captura falhas durante o fluxo normal (reativo)
//   - sanity checks detectam ESTADO quebrado mesmo sem interação
//
// Checks são spec-derivados (não hardcoded por plataforma):
//   1. spec_answer_container_has_matches — `answer.container` encontra ≥1
//   2. spec_input_present                 — `input.selectors` encontra 1
//   3. spec_observer_target_present       — `observer.target` (ou fallbacks) existe
//   4. spec_button_injected               — ≥1 answer tem [data-nodus-container]
//
// Todos read-only — nunca mutam DOM.
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Individual checks ──────────────────────────────────────────

  function check_spec_answer_container_has_matches(spec) {
    const sel = spec?.answer?.container;
    if (!sel) return { passed: false, reason: 'no answer.container in spec' };
    try {
      const found = document.querySelectorAll(sel).length;
      return { passed: found > 0, found, selector: sel };
    } catch (e) {
      return { passed: false, reason: 'invalid selector: ' + e.message, selector: sel };
    }
  }

  function check_spec_input_present(spec) {
    const selectors = spec?.input?.selectors;
    if (!Array.isArray(selectors) || selectors.length === 0) {
      return { passed: true, skipped: 'no input.selectors in spec' };
    }
    for (const sel of selectors) {
      try {
        if (document.querySelector(sel)) {
          return { passed: true, matchedSelector: sel };
        }
      } catch (e) {
        // selector inválido, tenta próximo
      }
    }
    return { passed: false, attempted: selectors };
  }

  function check_spec_observer_target_present(spec) {
    const obsConf = spec?.observer || {};
    const primary = obsConf.target;
    const fallbacks = Array.isArray(obsConf.fallbackTargets) ? obsConf.fallbackTargets : [];
    const candidates = [primary, ...fallbacks].filter(Boolean);

    if (candidates.length === 0) {
      // observer com target default ('body') ainda funciona no runtime
      return { passed: true, skipped: 'no observer.target declared (defaults to body)' };
    }
    for (const sel of candidates) {
      try {
        if (document.querySelector(sel)) {
          return { passed: true, matchedSelector: sel };
        }
      } catch (e) {
        // ignore invalid
      }
    }
    return { passed: false, attempted: candidates };
  }

  function check_spec_button_injected(spec) {
    const containerSel = spec?.answer?.container;
    if (!containerSel) return { passed: false, reason: 'no answer.container in spec' };
    try {
      const answers = document.querySelectorAll(containerSel);
      if (answers.length === 0) {
        // sem respostas no DOM ainda — não é falha, é estado inicial
        return { passed: true, skipped: 'no answers rendered yet', total: 0 };
      }
      let injected = 0;
      answers.forEach((a) => {
        if (a.querySelector('[data-nodus-container="1"]') || a.querySelector('[data-nodus-container]')) {
          injected++;
        }
      });
      return { passed: injected > 0, injected, total: answers.length };
    } catch (e) {
      return { passed: false, reason: 'query error: ' + e.message };
    }
  }

  // ─── Runner ─────────────────────────────────────────────────────

  function check_spec_fullchat_messageblocks_present(spec) {
    // Se a spec não declara fullchat, skipa (plataforma sem suporte explícito)
    const sel = spec?.fullchat?.messageBlocks;
    if (!sel) {
      return { passed: true, skipped: 'no fullchat.messageBlocks in spec' };
    }
    try {
      const found = document.querySelectorAll(sel).length;
      return { passed: found > 0, found, selector: sel };
    } catch (e) {
      return { passed: false, reason: 'invalid selector: ' + e.message, selector: sel };
    }
  }

  const CHECKS = {
    spec_answer_container_has_matches:      check_spec_answer_container_has_matches,
    spec_input_present:                     check_spec_input_present,
    spec_observer_target_present:           check_spec_observer_target_present,
    spec_button_injected:                   check_spec_button_injected,
    spec_fullchat_messageblocks_present:    check_spec_fullchat_messageblocks_present,
  };

  /**
   * Roda todos os sanity checks sobre a spec atual.
   * @param {Object} spec - Spec ativa da plataforma
   * @returns {{ok: boolean, checks: Object, failed: Array, skipped: Array}}
   */
  function run(spec) {
    if (!spec || typeof spec !== 'object') {
      return { ok: false, error: 'no spec provided', checks: {}, failed: [], skipped: [] };
    }
    const results = {};
    const failed = [];
    const skipped = [];
    for (const [name, fn] of Object.entries(CHECKS)) {
      try {
        const r = fn(spec);
        results[name] = r;
        if (r.passed === false) failed.push({ name, ...r });
        if (r.skipped) skipped.push({ name, reason: r.skipped });
      } catch (e) {
        results[name] = { passed: false, reason: 'check threw: ' + e.message };
        failed.push({ name, reason: 'check threw: ' + e.message });
      }
    }
    return { ok: failed.length === 0, checks: results, failed, skipped };
  }

  // Exposição ao mundo ISOLATED (runtime.js também ISOLATED)
  window.NodusSanityChecks = { run, CHECKS: Object.keys(CHECKS) };
  console.info('[NODUS Sanity] Pronto — ' + Object.keys(CHECKS).length + ' checks registrados.');
})();
