// ═══════════════════════════════════════════════════════════════
// NODUS Health Bridge — mundo ISOLADO
//
// Duas responsabilidades:
//   1) 'nodus_health_send' — recebe payload do MAIN e envia ao Worker
//      (o CSP da página bloquearia o fetch lá; aqui não se aplica).
//   2) 'nodus_health_call' — invoca função por dotted-path no window
//      ISOLADO (onde módulos como NodusOnboarding são carregados via
//      import()) e responde via 'nodus_health_call_done' com reqId.
//      Isso é o que permite o runner (MAIN world) chamar funções que
//      só existem no isolated world, mantendo compatibilidade com
//      Trusted Types (sem eval).
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const ENDPOINT = 'https://nodus-health-worker.mmcarvalho-dev.workers.dev/health';

  // ── 1) Envio ao Worker ──────────────────────────────────────────
  window.addEventListener('nodus_health_send', async (e) => {
    const payload = e.detail;
    if (!payload) return;

    try {
      const res = await fetch(ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        console.info('[NODUS Health Bridge] ✅ Enviado ao Worker. ID:', data.id);
      } else {
        console.error('[NODUS Health Bridge] ❌ Worker retornou:', res.status);
      }
    } catch (e) {
      console.error('[NODUS Health Bridge] ❌ Falha ao enviar:', e.message);
    }
  });

  // ── 2) Call bridge (MAIN → ISOLATED) ────────────────────────────
  window.addEventListener('nodus_health_call', (e) => {
    const { path, args, reqId } = e.detail || {};
    const done = (detail) => window.dispatchEvent(new CustomEvent(
      'nodus_health_call_done',
      { detail: { reqId, ...detail } }
    ));

    try {
      const parts = String(path || '').split('.').filter(Boolean);
      if (!parts.length) {
        done({ ok: false, error: 'path vazio' });
        return;
      }
      let ctx = window, fn = window;
      for (const p of parts) { ctx = fn; fn = fn?.[p]; }
      if (typeof fn !== 'function') {
        done({ ok: false, error: `Função não encontrada em window.${path}` });
        return;
      }
      // A função pode retornar sync ou Promise — normalizamos em Promise.resolve
      Promise.resolve(fn.apply(ctx, Array.isArray(args) ? args : [])).then(
        () => done({ ok: true }),
        (err) => done({ ok: false, error: err?.message || String(err) })
      );
    } catch (err) {
      done({ ok: false, error: err?.message || String(err) });
    }
  });

  console.info('[NODUS Health Bridge] Pronto — aguardando eventos de saúde (send + call).');
})();
