// ═══════════════════════════════════════════════════════════════
// NODUS Health Reporter — envia falhas ao Worker
// ═══════════════════════════════════════════════════════════════

const NodusHealthReporter = {

  endpoint: 'https://nodus-health-worker.mmcarvalho-dev.workers.dev/health',

  // ─────────────────────────────────────────────────────────────
  // Envia falhas detectadas ao Worker
  // ─────────────────────────────────────────────────────────────
  async send(failures, context = 'unknown') {
    if (!failures || failures.length === 0) return;

    const payload = {
      type:      'health_failure',
      version:   this._getVersion(),
      context,
      url:       typeof location !== 'undefined' ? location.href : 'background',
      timestamp: new Date().toISOString(),
      summary: {
        total_failed:    failures.length,
        critical_failed: failures.filter(f => f.level === 'critical').length,
        important_failed: failures.filter(f => f.level === 'important').length,
      },
      failures: failures.map(f => ({
        name:        f.name,
        level:       f.level       || 'unknown',
        description: f.description || '',
        error:       f.error       || 'falha silenciosa — resultado não encontrado no DOM',
        duration_ms: f.duration    ?? null,
      })),
    };

    console.warn('[NODUS Health] ⚠️ Enviando flag ao Worker:', payload);

    // Despacha via CustomEvent para o health_bridge.js (mundo isolado)
    // O bridge faz o fetch real bypassando o CSP da página
    try {
      window.dispatchEvent(new CustomEvent('nodus_health_send', {
        detail: payload,
        bubbles: false,
      }));
      console.info('[NODUS Health] ✅ Evento despachado para bridge.');
    } catch (e) {
      this._saveLocally(payload);
      console.error('[NODUS Health] ❌ Falha ao despachar — salvo localmente:', e.message);
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Salva falha localmente se o Worker não estiver acessível
  // ─────────────────────────────────────────────────────────────
  _saveLocally(payload) {
    try {
      const key = 'nodus_health_pending';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(payload);
      // Mantém só os últimos 20 registros
      if (existing.length > 20) existing.splice(0, existing.length - 20);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) { /* storage cheio ou indisponível */ }
  },

  _getVersion() {
    // document.documentElement.dataset.nodusVersion é setado pelo content.js (mundo isolado)
    // O DOM é compartilhado entre mundos isolado e MAIN, então isso funciona
    try {
      const v = document.documentElement.dataset.nodusVersion;
      if (v) return v;
    } catch (e) { /* ignore */ }
    try {
      return typeof chrome !== 'undefined'
        ? chrome.runtime.getManifest().version
        : 'dev';
    } catch (e) {
      return 'unknown';
    }
  },
};
