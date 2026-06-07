// ═══════════════════════════════════════════════════════════════
// NODUS Dashboard — Diagnostic Panel (Fase 2)
// ═══════════════════════════════════════════════════════════════
// Painel para o piloto v5.0.0:
//   - Info da spec ativa (version / source / platform)
//   - Install info (id / extension version / runtime version)
//   - Sanity checks (status + botão "Run now")
//   - Ring buffer de runtime_health events (últimos 50)
//   - Counters por categoria na última hora
//   - Ações: refresh, run sanity, clear buffer
//
// Roda em ISOLATED world (content script). Lê:
//   - window.NodusRuntime.spec / specVersion / platformName
//   - window.NodusSanityChecks.run(spec)
//   - chrome.storage.local.nodus_selector_history
//   - chrome.storage.local.nodus_install_id
//   - chrome.storage.local.nodus_runtime_health_buffer
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const NodusDashboardDiagnostic = {
    _autoRefreshTimer: null,
    AUTO_REFRESH_MS: 5000,

    async render(contentArea) {
      if (!contentArea) return;

      // Limpa conteúdo anterior e marca como tab ativa
      contentArea.innerHTML = '';

      const root = document.createElement('div');
      root.id = 'nodus-diagnostic-root';
      root.className = 'nodus-diagnostic-root';
      root.innerHTML = this._templateShell();
      contentArea.appendChild(root);

      // Injeta estilos (uma única vez)
      this._ensureStyles();

      // Listeners
      root.querySelector('[data-action="refresh"]').addEventListener('click', () => this.refresh());
      root.querySelector('[data-action="run-sanity"]').addEventListener('click', () => this.runSanity());
      root.querySelector('[data-action="clear-buffer"]').addEventListener('click', () => this.clearBuffer());

      await this.refresh();

      // Auto-refresh leve do buffer enquanto o painel estiver visível
      this._startAutoRefresh();
    },

    stop() {
      if (this._autoRefreshTimer) {
        clearInterval(this._autoRefreshTimer);
        this._autoRefreshTimer = null;
      }
    },

    _startAutoRefresh() {
      if (this._autoRefreshTimer) clearInterval(this._autoRefreshTimer);
      this._autoRefreshTimer = setInterval(() => {
        const root = document.getElementById('nodus-diagnostic-root');
        if (!root) {
          // painel saiu do DOM (tab trocada) — para o timer
          this.stop();
          return;
        }
        this._refreshBufferOnly();
      }, this.AUTO_REFRESH_MS);
    },

    async refresh() {
      await Promise.all([
        this._refreshSpecInfo(),
        this._refreshSanity(),
        this._refreshBuffer(),
      ]);
    },

    async _refreshSpecInfo() {
      const el = document.getElementById('nodus-diag-spec');
      if (!el) return;

      const rt = window.NodusRuntime || {};
      const spec = rt.spec;
      const specVersion = rt.specVersion || '—';
      const platform = rt.platformName || '—';
      const runtimeVersion = rt.runtimeVersion || '—';

      let extVersion = '—';
      let installId = '—';
      let source = '—';
      try {
        extVersion = chrome.runtime.getManifest().version;
      } catch {}
      try {
        const { nodus_install_id, nodus_selector_history } = await chrome.storage.local.get([
          'nodus_install_id', 'nodus_selector_history'
        ]);
        installId = nodus_install_id || '—';
        if (nodus_selector_history?.history?.length) {
          const entry = nodus_selector_history.history.find(h => h.version === specVersion)
            || nodus_selector_history.history[0];
          source = entry?.source || '—';
        } else if (spec) {
          source = 'bundled';
        }
      } catch {}

      el.innerHTML = `
        <div class="diag-row"><span class="diag-k">Platform</span><span class="diag-v">${this._esc(platform)}</span></div>
        <div class="diag-row"><span class="diag-k">Spec version</span><span class="diag-v">${this._esc(specVersion)} <span class="diag-chip">${this._esc(source)}</span></span></div>
        <div class="diag-row"><span class="diag-k">Runtime</span><span class="diag-v">${this._esc(runtimeVersion)}</span></div>
        <div class="diag-row"><span class="diag-k">Extension</span><span class="diag-v">${this._esc(extVersion)}</span></div>
        <div class="diag-row"><span class="diag-k">Install ID</span><span class="diag-v diag-mono">${this._esc(installId)}</span></div>
      `;
    },

    async _refreshSanity() {
      const el = document.getElementById('nodus-diag-sanity');
      if (!el) return;

      const rt = window.NodusRuntime;
      if (!rt || !rt.spec) {
        el.innerHTML = `<div class="diag-empty">Runtime não inicializado ou sem spec (recarregue a aba).</div>`;
        return;
      }
      if (!window.NodusSanityChecks) {
        el.innerHTML = `<div class="diag-empty">Módulo de sanity checks não carregado.</div>`;
        return;
      }

      // Roda check fresh (sync, read-only)
      const result = window.NodusSanityChecks.run(rt.spec);
      const rows = Object.entries(result.checks || {}).map(([name, r]) => {
        let icon, cls, detail;
        if (r.skipped) { icon = '➖'; cls = 'diag-skipped'; detail = r.skipped; }
        else if (r.passed) { icon = '✔'; cls = 'diag-pass'; detail = this._sanityDetail(r); }
        else { icon = '✗'; cls = 'diag-fail'; detail = this._sanityDetail(r); }
        return `<tr class="${cls}">
          <td class="diag-icon">${icon}</td>
          <td class="diag-mono">${this._esc(name)}</td>
          <td>${this._esc(detail)}</td>
        </tr>`;
      }).join('');

      const totalFailed = (result.failed || []).length;
      const totalSkipped = (result.skipped || []).length;
      const totalPassed = Object.keys(result.checks || {}).length - totalFailed - totalSkipped;

      el.innerHTML = `
        <div class="diag-summary">
          <span class="diag-pass">✔ ${totalPassed}</span>
          <span class="diag-fail">✗ ${totalFailed}</span>
          <span class="diag-skipped">➖ ${totalSkipped}</span>
        </div>
        <table class="diag-table">
          <tbody>${rows || '<tr><td colspan="3" class="diag-empty">Sem checks registrados.</td></tr>'}</tbody>
        </table>
      `;
    },

    _sanityDetail(r) {
      // monta um resumo textual do resultado de cada check
      const parts = [];
      if ('found' in r) parts.push('found=' + r.found);
      if ('total' in r) parts.push('total=' + r.total);
      if ('injected' in r) parts.push('injected=' + r.injected);
      if (r.matchedSelector) parts.push('match=' + this._truncate(r.matchedSelector, 40));
      if (r.selector && !r.matchedSelector) parts.push('sel=' + this._truncate(r.selector, 40));
      if (r.reason) parts.push(r.reason);
      if (r.attempted) parts.push('attempted=' + r.attempted.length);
      return parts.join(' · ') || '—';
    },

    async _refreshBuffer() {
      const el = document.getElementById('nodus-diag-buffer');
      const stats = document.getElementById('nodus-diag-counters');
      if (!el) return;

      let buf = [];
      try {
        const r = await chrome.storage.local.get('nodus_runtime_health_buffer');
        buf = Array.isArray(r.nodus_runtime_health_buffer) ? r.nodus_runtime_health_buffer : [];
      } catch (e) {
        el.innerHTML = `<div class="diag-empty">Erro ao ler buffer: ${this._esc(e.message)}</div>`;
        return;
      }

      // Counters última hora
      if (stats) {
        const hourAgo = Date.now() - 3600_000;
        const recent = buf.filter(e => (e.ts || 0) >= hourAgo);
        const byCat = {};
        for (const e of recent) byCat[e.category] = (byCat[e.category] || 0) + 1;
        const cats = ['detection', 'interaction', 'ui', 'infrastructure', 'sanity'];
        stats.innerHTML = cats.map(c =>
          `<span class="diag-counter"><b>${byCat[c] || 0}</b> ${c}</span>`
        ).join('') + `<span class="diag-counter diag-counter-total"><b>${recent.length}</b> / ${buf.length} total</span>`;
      }

      // Últimos 50 eventos (mais recentes primeiro)
      const rows = buf.slice(-50).reverse().map(e => {
        const time = e.ts ? new Date(e.ts).toLocaleTimeString() : '—';
        const catShort = (e.category || '?').slice(0, 4);
        const ev = e.event || '—';
        const extras = [];
        if (e.platform) extras.push(e.platform);
        if (e.spec_version) extras.push('v' + e.spec_version);
        if (e.details?.selector) extras.push('sel=' + this._truncate(e.details.selector, 30));
        if (e.details?.found !== undefined) extras.push('found=' + e.details.found);
        if (e.error) extras.push('err=' + this._truncate(e.error, 40));
        if (e.trigger_reason) extras.push(e.trigger_reason);
        return `<tr class="diag-evt-${catShort}">
          <td class="diag-mono">${this._esc(time)}</td>
          <td class="diag-chip">${this._esc(e.category || '?')}</td>
          <td class="diag-mono">${this._esc(ev)}</td>
          <td>${this._esc(extras.join(' · '))}</td>
        </tr>`;
      }).join('');

      el.innerHTML = `
        <table class="diag-table">
          <thead><tr><th>Time</th><th>Cat</th><th>Event</th><th>Details</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" class="diag-empty">Buffer vazio.</td></tr>'}</tbody>
        </table>
      `;
    },

    async _refreshBufferOnly() {
      // chamada pelo auto-refresh — só redesenha buffer + counters
      await this._refreshBuffer();
    },

    async runSanity() {
      const rt = window.NodusRuntime;
      if (!rt || !rt.runSanityChecks) {
        console.warn('[Diagnostic] NodusRuntime.runSanityChecks indisponível');
        return;
      }
      const result = rt.runSanityChecks();
      console.info('[Diagnostic] Sanity manual:', result);
      // Pequena pausa pra eventual reporting entrar no buffer antes de redesenhar
      setTimeout(() => this.refresh(), 300);
    },

    async clearBuffer() {
      if (!confirm('Limpar buffer de health events?')) return;
      try {
        await chrome.storage.local.set({ nodus_runtime_health_buffer: [] });
        await this._refreshBuffer();
      } catch (e) {
        alert('Erro ao limpar buffer: ' + e.message);
      }
    },

    _templateShell() {
      return `
        <div class="diag-header">
          <h2>🩺 Diagnostic</h2>
          <div class="diag-actions">
            <button class="diag-btn" data-action="refresh">🔄 Refresh</button>
            <button class="diag-btn" data-action="run-sanity">▶ Run Sanity</button>
            <button class="diag-btn diag-btn-danger" data-action="clear-buffer">🗑 Clear Buffer</button>
          </div>
        </div>

        <section class="diag-section">
          <h3>Runtime</h3>
          <div id="nodus-diag-spec" class="diag-kv"></div>
        </section>

        <section class="diag-section">
          <h3>Sanity Checks</h3>
          <div id="nodus-diag-sanity"></div>
        </section>

        <section class="diag-section">
          <h3>Health Events (last 1h)</h3>
          <div id="nodus-diag-counters" class="diag-counters"></div>
          <div id="nodus-diag-buffer" class="diag-buffer"></div>
        </section>
      `;
    },

    _ensureStyles() {
      if (document.getElementById('nodus-diagnostic-styles')) return;
      const style = document.createElement('style');
      style.id = 'nodus-diagnostic-styles';
      style.textContent = `
        .nodus-diagnostic-root { padding: 16px 20px; color: #e5e7eb; font-size: 13px; overflow-y: auto; max-height: calc(100vh - 200px); }
        .nodus-diagnostic-root h2 { margin: 0; font-size: 18px; }
        .nodus-diagnostic-root h3 { margin: 0 0 8px; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
        .diag-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #374151; }
        .diag-actions { display: flex; gap: 8px; }
        .diag-btn { background: #374151; color: #e5e7eb; border: 1px solid #4b5563; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
        .diag-btn:hover { background: #4b5563; }
        .diag-btn-danger { background: #7f1d1d; border-color: #991b1b; }
        .diag-btn-danger:hover { background: #991b1b; }
        .diag-section { margin-bottom: 20px; background: #1f2937; padding: 12px 16px; border-radius: 8px; }
        .diag-kv { display: grid; grid-template-columns: 120px 1fr; row-gap: 4px; }
        .diag-row { display: contents; }
        .diag-k { color: #9ca3af; }
        .diag-v { color: #e5e7eb; }
        .diag-mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; }
        .diag-chip { display: inline-block; background: #374151; color: #d1d5db; padding: 1px 6px; border-radius: 4px; font-size: 11px; margin-left: 4px; }
        .diag-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .diag-table th, .diag-table td { padding: 4px 8px; text-align: left; border-bottom: 1px solid #374151; vertical-align: top; }
        .diag-table th { color: #9ca3af; font-weight: 500; font-size: 11px; text-transform: uppercase; }
        .diag-pass { color: #10b981; }
        .diag-fail { color: #ef4444; }
        .diag-skipped { color: #6b7280; }
        .diag-icon { width: 24px; text-align: center; }
        .diag-empty { color: #6b7280; padding: 12px; text-align: center; font-style: italic; }
        .diag-summary { display: flex; gap: 16px; margin-bottom: 8px; font-weight: 600; }
        .diag-counters { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .diag-counter { background: #374151; padding: 4px 10px; border-radius: 4px; font-size: 12px; }
        .diag-counter b { color: #f59e0b; }
        .diag-counter-total b { color: #10b981; }
        .diag-buffer { max-height: 400px; overflow-y: auto; }
      `;
      document.head.appendChild(style);
    },

    _esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    },

    _truncate(s, max) {
      s = String(s ?? '');
      return s.length > max ? s.slice(0, max - 1) + '…' : s;
    },
  };

  window.NodusDashboardDiagnostic = NodusDashboardDiagnostic;
  console.info('[NODUS Diagnostic] Pronto.');
})();
