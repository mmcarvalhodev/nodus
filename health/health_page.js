// ═══════════════════════════════════════════════════════════════
// NODUS Health Page — roda no contexto MAIN da página
// Visível no console do DevTools: NodusHealth.run()
// ═══════════════════════════════════════════════════════════════

(function () {
  if (window.NodusHealth) return;

  // Mutex — impede overlap entre dois run() concorrentes (causaria corrida
  // no DOM do dashboard, clicks em tabs cruzados, timeouts falsos, etc.)
  let _running = null;

  window.NodusHealth = {
    last: null,

    async run(module) {
      if (_running) {
        console.warn('[NodusHealth] Já existe um run em andamento (' + _running + '). Aguardando...');
        try { await window.NodusHealth._currentPromise; } catch (_) {}
      }

      if (typeof NodusHealthRunner === 'undefined') {
        console.warn('[NodusHealth] Runner não carregado ainda.');
        return;
      }
      if (typeof NodusHealthContracts === 'undefined') {
        console.warn('[NodusHealth] Contratos não carregados ainda.');
        return;
      }

      const contracts = module
        ? (NodusHealthContracts[module] || [])
        : Object.values(NodusHealthContracts).flat();

      if (!contracts.length) {
        console.warn('[NodusHealth] Nenhum contrato para:', module || 'all');
        return;
      }

      const label = module ? ' (' + module + ')' : '';
      console.info('[NodusHealth] Iniciando ' + contracts.length + ' contrato(s)' + label + '...');

      _running = module || 'full';
      const p = (async () => {
        try {
          const results = await NodusHealthRunner.run(contracts, module || 'full');
          this.last = results;

          const failed = results.filter(r => !r.passed);
          if (!failed.length) {
            console.info('[NodusHealth] Tudo OK — nenhuma falha detectada.');
          } else {
            console.warn('[NodusHealth] ' + failed.length + ' falha(s):', failed.map(f => f.name));
          }
          return results;
        } finally {
          _running = null;
          window.NodusHealth._currentPromise = null;
        }
      })();
      window.NodusHealth._currentPromise = p;
      return p;
    },
  };

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'H') {
      e.preventDefault();
      window.NodusHealth.run();
    }
  });

  console.info('[NodusHealth] Carregado. Use NodusHealth.run() ou Ctrl+Shift+Alt+H');
})();
