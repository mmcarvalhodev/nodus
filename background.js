// ═══════════════════════════════════════════════════════════════
// NODUS - Background Service Worker
// ═══════════════════════════════════════════════════════════════
// Arquivo: background.js
// Versão: 5.0.0 (Runtime Dinâmico + Telemetria v2.0)
// Função: Gerenciar storage, mensagens, estado e specs de seletores
// ═══════════════════════════════════════════════════════════════

console.log('[Background] 🚀 INÍCIO DO SCRIPT');

// ═══════════════════════════════════════════════════════════════
// IMPORTS - TELEMETRIA v2.0
// ═══════════════════════════════════════════════════════════════
console.log('[Background] Importando telemetria...');
import { getTelemetryTracker } from './telemetry/telemetry.tracker.js';
import { TelemetryStorage } from './telemetry/telemetry.storage.js';
import { TELEMETRY_CONFIG } from './telemetry/telemetry.config.js';
// v2.2: classifier ESTÁTICO. Dynamic import() é bloqueado em
// ServiceWorkerGlobalScope (W3C spec). Static import funciona porque
// background é "type": "module" no manifest.
import { classifyContentType } from './telemetry/telemetry.classifier.js';

console.log('[Background] ✅ Telemetria importada');

// Instância global do tracker
const telemetryTracker = getTelemetryTracker();
const telemetryStorage = new TelemetryStorage();

console.log('%c🔷 NODUS Background Service Worker v5.0.0 (Runtime Dinâmico)', 'color: #3b82f6; font-size: 14px; font-weight: bold;');

// ═══════════════════════════════════════════════════════════════
// HEALTH FLUSH — drena buffer pra dev server local (ou prod no futuro)
// ═══════════════════════════════════════════════════════════════
// Estratégia: todo evento que entra no buffer dispara um flush fire-and-forget.
// Se o server estiver offline, fetch falha e os eventos ficam no buffer; o
// próximo flush bem-sucedido drena tudo. Como o background SW pode ser morto
// pelo Chrome quando ocioso, também rodamos um flush em chrome.alarms a cada
// minuto pra cobrir casos onde o último evento não conseguiu drenar.
const HEALTH_FLUSH_URL = 'http://localhost:8787/health';
const HEALTH_FLUSH_TIMEOUT_MS = 2000;

let _healthFlushInFlight = false;

async function flushHealthBuffer() {
  if (_healthFlushInFlight) return; // evita reentrância
  _healthFlushInFlight = true;
  try {
    const { nodus_runtime_health_buffer } = await chrome.storage.local.get('nodus_runtime_health_buffer');
    const buf = Array.isArray(nodus_runtime_health_buffer) ? nodus_runtime_health_buffer : [];
    if (buf.length === 0) return;

    // Snapshot pra enviar; só drenamos do storage se o POST der 2xx.
    const snapshot = buf.slice();

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), HEALTH_FLUSH_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(HEALTH_FLUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: snapshot }),
        signal: ctrl.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (resp && resp.ok) {
      // Re-lê o buffer (pode ter crescido durante o fetch) e remove apenas
      // os primeiros N que foram enviados, preservando os novos.
      const fresh = await chrome.storage.local.get('nodus_runtime_health_buffer');
      const current = Array.isArray(fresh.nodus_runtime_health_buffer) ? fresh.nodus_runtime_health_buffer : [];
      const remaining = current.slice(snapshot.length);
      await chrome.storage.local.set({ nodus_runtime_health_buffer: remaining });
    }
  } catch (e) {
    // Server offline ou timeout — silencioso, evento fica no buffer.
  } finally {
    _healthFlushInFlight = false;
  }
}

// Backup flush em alarm (caso buffer não tenha sido drenado por SW dormindo)
try {
  chrome.alarms.create('nodus-health-flush', { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'nodus-health-flush') flushHealthBuffer().catch(() => {});
  });
} catch (_) { /* alarms permission ausente — pula */ }

// ═══════════════════════════════════════════════════════════════
// TELEMETRY FLUSH — alarm + onSuspend
// ═══════════════════════════════════════════════════════════════
// Antes da v2: MIN_EVENTS=100 e MAX_TIME_MS=24h. Resultado: usuário
// instalava, fazia 2-3 cliques, desinstalava → ZERO telemetria. 67% dos
// installs viravam fantasmas. Agora MIN_EVENTS=5 e MAX_TIME=5min, MAS
// se o user fecha o browser ou desinstala antes do batch sair, ainda
// perde. Solução: 2 hooks de saída redundantes.
//
//   - chrome.runtime.onSuspend: dispara quando o SW vai dormir.
//     Cobre o caso "user fechou aba/browser".
//   - chrome.alarms 'nodus-telemetry-flush' a cada 1 min: backup pro
//     caso do SW já ter dormido e o onSuspend não rolar.
//
// Ambos chamam telemetryTracker.checkAndSendBatch(true) — força envio
// mesmo sem atingir MIN_EVENTS.
try {
  chrome.alarms.create('nodus-telemetry-flush', { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'nodus-telemetry-flush') {
      telemetryTracker.checkAndSendBatch(true).catch(() => {});
    }
  });
} catch (_) { /* alarms permission ausente — pula */ }

try {
  chrome.runtime.onSuspend.addListener(() => {
    // SW vai dormir. Tenta flushar o que tem antes — fire-and-forget,
    // pode não terminar a tempo (Chrome dá poucos ms aqui), mas é melhor
    // que perder o evento de all.
    telemetryTracker.checkAndSendBatch(true).catch(() => {});
  });
} catch (_) { /* onSuspend não disponível em alguns contextos — pula */ }

// ═══════════════════════════════════════════════════════════════
// SPEC PUSH — dev-mode polling rápido + notificação às tabs
// ═══════════════════════════════════════════════════════════════
// Em dev (WORKER_URL = localhost), checa version a cada 2s. Quando o
// dev edita worker_phase2/specs/current.json + restart do server, o
// background pega a mudança em até 2s, fetcha spec completa, e dispara
// `spec_updated` pra TODAS as tabs ativas. O runtime de cada tab repuxa
// e atualiza window.__nodus_spec — sanity checks rodam de novo, paste
// passa a usar selectors novos. Tudo SEM reload de extensão.
//
// Em prod (WORKER_URL = cloudflare), polling rápido fica desligado —
// usamos só o alarm de 6h (`nodus_spec_refresh`) pra não martelar o worker.

async function notifyTabsSpecUpdated(version) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.tabs.sendMessage(tab.id, { type: 'spec_updated', version }, () => {
        // tabs sem content script lançam lastError — silenciar
        void chrome.runtime.lastError;
      });
    }
  } catch (_) { /* silent */ }
}

const _devSpecPollIntervalMs = 2000;
let _lastSeenSpecVersion = null;
let _devPollFails = 0;

async function devSpecPollTick() {
  if (!WORKER_URL.startsWith('http://localhost')) return; // gate dev mode
  try {
    const headers = await buildAuthHeaders();
    const resp = await fetch(`${WORKER_URL}/selectors/version`, { headers });

    // 401 = install perdido (server restartou e esvaziou kvInstalls in-memory).
    // Re-registra silenciosamente e tenta de novo no próximo tick.
    if (resp.status === 401) {
      console.log('[DevPoll] 🔑 server perdeu install (restart?) — re-registrando');
      await registerInstall();
      _devPollFails = 0; // re-register conta como recovery, não como falha
      return; // próximo tick (via finally) vai funcionar
    }

    if (resp.ok) {
      _devPollFails = 0;
      const data = await resp.json();
      const v = data?.version;
      if (v) {
        // Em vez de comparar contra in-memory `_lastSeenSpecVersion` (que sumiria
        // se o SW reiniciar), comparo contra o storage persistente. Mais robusto.
        const { nodus_selector_history } = await chrome.storage.local.get('nodus_selector_history');
        const cached = nodus_selector_history?.current_version;

        if (_lastSeenSpecVersion === null) {
          _lastSeenSpecVersion = v;
        }

        // Trigger change se: (a) versão do server diferente do que está em cache,
        // OU (b) diferente do que vimos da última vez (in-memory)
        if ((cached && v !== cached) || (v !== _lastSeenSpecVersion)) {
          console.log(`[DevPoll] 🔔 Spec mudou: cache=${cached || 'none'} lastSeen=${_lastSeenSpecVersion} → server=${v}`);
          _lastSeenSpecVersion = v;
          const fresh = await fetchSpecs();
          if (fresh) console.log(`[DevPoll] ✅ Spec v${fresh.version} aplicada e propagada às tabs`);
        }
      }
    } else {
      _devPollFails++;
    }
  } catch (e) {
    _devPollFails++;
    if (_devPollFails === 1) console.warn('[DevPoll] poll falhou (server offline?):', e.message);
  } finally {
    // Backoff suave se falhar muito (evita spam de erros): 2s, 4s, 8s, max 10s
    const delay = _devPollFails === 0 ? _devSpecPollIntervalMs
                : Math.min(_devSpecPollIntervalMs * Math.pow(2, _devPollFails - 1), 10000);
    setTimeout(devSpecPollTick, delay);
  }
}

// IMPORTANTE: o `const WORKER_URL = ...` está declarado MAIS ABAIXO neste
// arquivo (~linha 110). Acessá-lo aqui síncronamente cai em Temporal Dead
// Zone e quebra o registro do service worker. setTimeout(0) defere pra
// próxima tick do event loop, quando todas as `const` já estão inicializadas.
setTimeout(() => {
  if (typeof WORKER_URL === 'string' && WORKER_URL.startsWith('http://localhost')) {
    console.log(`[DevPoll] ⚡ ativo (interval ${_devSpecPollIntervalMs}ms) — server local detectado`);
    setTimeout(devSpecPollTick, 3000); // começa 3s depois do SW startup
  }
}, 0);

// ═══════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════

const state = {
  installed: false,
  version: '5.0.0',
  activeTabId: null,
  stats: {
    totalIdeas: 0,
    totalTags: 0,
    lastSave: null
  }
};

// ═══════════════════════════════════════════════════════════════
// SELECTOR RUNTIME — Gestão de Specs (Fase 2)
// ═══════════════════════════════════════════════════════════════

// Worker NODUS AI — endpoint único em produção.
// Comporta: /auth/status, /auth/capabilities, /telemetry/batch,
//           /selectors, /selectors/version, /commands, /commands/ack,
//           /webhook/paddle, /paddle/checkout, /lifetime/slots.
//
// Pra desenvolver com local-server (simulador), troca IS_DEV pra true.
// IMPORTANTE: sempre IS_DEV=false antes de empacotar pra release —
// senão extensão em prod aponta pra localhost dos usuários (telemetria
// nunca chega, capabilities sempre FREE, comandos remotos não rolam).
const IS_DEV = false;
const WORKER_URL = IS_DEV
  ? 'http://localhost:8787'
  : 'https://nodus-worker.mmcarvalho-dev.workers.dev';
const SPEC_REFRESH_HOURS = 6;
const MAX_SPEC_HISTORY = 5;

// HMAC secret (montado em runtime, não string literal)
const _s1 = 'nodus', _s2 = '2026', _s3 = 'sel3ct';
const NODUS_HMAC_SECRET = [_s3, _s1, _s2].join('_');

/**
 * Gerar ou recuperar install_id persistente
 */
async function getInstallId() {
  const { nodus_install_id } = await chrome.storage.local.get('nodus_install_id');
  if (nodus_install_id) return nodus_install_id;

  const id = crypto.randomUUID();
  await chrome.storage.local.set({ nodus_install_id: id });
  console.log('[Specs] Novo install_id gerado:', id);
  return id;
}

/**
 * Construir headers de autenticação HMAC
 */
async function buildAuthHeaders() {
  const installId = await getInstallId();
  const { nodus_license } = await chrome.storage.local.get('nodus_license');
  const licenseKey = nodus_license?.status === 'pro' ? (nodus_license.key || 'pro') : 'free';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = installId + ':' + timestamp;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(NODUS_HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return {
    'X-Nodus-Install': installId,
    'X-Nodus-License': licenseKey,
    'X-Nodus-Sig': sig,
    'X-Nodus-TS': timestamp,
    'X-Nodus-Runtime': '2.0.0'
  };
}

/**
 * Registrar install no worker (idempotente)
 */
async function registerInstall() {
  try {
    const installId = await getInstallId();

    // ATENÇÃO: NÃO mandamos `plan` daqui. O servidor é fonte de verdade.
    // Em prod, o plano é setado por webhook (Lemon Squeezy/Paddle).
    // Em dev, por env var LOCAL_DEV_GRANT_PRO=1 no local-server.
    // Mandar `plan` daqui (lendo nodus_license local) era o vetor de
    // privilege escalation — qualquer fork setava nodus_license.status='pro'
    // e ganhava PRO grátis.
    const resp = await fetch(`${WORKER_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        install_id: installId,
        extension_version: state.version,
        runtime_version: '2.0.0',
        browser: 'chrome'
      })
    });

    const data = await resp.json();
    console.log('[Specs] Register:', data.ok ? 'OK' : data.error);
    return data;
  } catch (e) {
    console.warn('[Specs] Register failed:', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Buscar specs completas do worker
 */
async function fetchSpecs(_retried) {
  try {
    const headers = await buildAuthHeaders();
    const resp = await fetch(`${WORKER_URL}/selectors`, { headers });

    if (resp.status === 401) {
      if (_retried) {
        console.warn('[Specs] Auth ainda falhou após register — desistindo');
        return null;
      }
      console.warn('[Specs] Auth failed, registrando e tentando de novo...');
      const reg = await registerInstall();
      if (!reg?.ok) return null;
      // Retry uma vez após register bem-sucedido
      return await fetchSpecs(true);
    }
    if (resp.status === 429) {
      console.warn('[Specs] Rate limited');
      return null;
    }
    if (!resp.ok) return null;

    const spec = await resp.json();
    if (!spec.version || !spec.platforms) {
      console.warn('[Specs] Spec inválida recebida');
      return null;
    }

    // Salvar no histórico local
    await saveSpecToHistory(spec);
    console.log(`[Specs] Spec v${spec.version} salva`);

    // Notificar todas as tabs ativas pra repuxarem `window.__nodus_spec`.
    // Sem isso, mesmo com a spec nova no storage, o runtime continuaria
    // usando a versão em cache no `window`. Falhas de notificação são
    // engolidas pelo helper (tabs sem content script lançam lastError).
    try {
      if (typeof notifyTabsSpecUpdated === 'function') {
        await notifyTabsSpecUpdated(spec.version);
      }
    } catch (_) { /* helper pode estar em TDZ se chamado muito cedo */ }

    return spec;
  } catch (e) {
    console.warn('[Specs] Fetch failed:', e.message);
    return null;
  }
}

// ─── Capabilities (server-authoritative gating) ──────────────
// O blob {plan, features, limits, issued_at, ttl_seconds} é a única
// fonte de verdade pra "o que o usuário pode fazer". O cliente NÃO
// determina isso — só consome. Aqui no background fetchamos e salvamos
// no storage; license.js (content script) lê do storage.
//
// Quando: após registerInstall, e a cada alarm 'nodus_capabilities_refresh'.
// Frequência: depende do ttl_seconds do blob (default 1h em dev).
//
// Falha de rede: NÃO substitui o blob anterior — license.js trata a
// expiração via TTL, então blob velho é descartado naturalmente e o
// fail-closed em fallback FREE entra em cena.

async function fetchCapabilities(_retried) {
  try {
    const headers = await buildAuthHeaders();
    // Envia email da license local (se houver) pro server resolver plano via
    // tabela `licenses`. Vazio = FREE. HMAC já assina installId + ts; email
    // é metadata adicional pro server consultar — não é credencial.
    try {
      const { nodus_license } = await chrome.storage.local.get('nodus_license');
      const email = nodus_license?.email && !nodus_license.email.endsWith('@nodus.local')
        ? nodus_license.email.toLowerCase().trim()
        : null;
      if (email) headers['X-Nodus-Email'] = email;
    } catch (_) { /* sem email → FREE */ }

    const resp = await fetch(`${WORKER_URL}/auth/capabilities`, { headers });

    if (resp.status === 401) {
      if (_retried) {
        console.warn('[Capabilities] Auth ainda falhou após register — desistindo');
        return null;
      }
      console.warn('[Capabilities] Auth failed, registrando e retry...');
      const reg = await registerInstall();
      if (!reg?.ok) return null;
      return await fetchCapabilities(true);
    }
    if (!resp.ok) {
      console.warn('[Capabilities] HTTP', resp.status);
      return null;
    }

    const blob = await resp.json();
    if (!blob || typeof blob.plan !== 'string' || !Array.isArray(blob.features) || !blob.limits) {
      console.warn('[Capabilities] Blob inválido recebido');
      return null;
    }

    await chrome.storage.local.set({ nodus_capabilities: blob });
    console.log(`[Capabilities] ${blob.plan} salvo (ttl=${blob.ttl_seconds}s, features=${blob.features.length})`);

    // Notifica tabs pra license.js refazer loadCapabilities()
    try {
      await notifyTabsCapabilitiesUpdated(blob.plan);
    } catch (_) { /* helper TDZ-safe */ }

    return blob;
  } catch (e) {
    console.warn('[Capabilities] Fetch failed:', e.message);
    return null;
  }
}

async function notifyTabsCapabilitiesUpdated(plan) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'CAPABILITIES_UPDATED', plan });
      } catch (_) { /* tab sem content script */ }
    }
  } catch (_) { /* tabs API pode falhar em early init */ }
}

// ═══════════════════════════════════════════════════════════════
// REMOTE COMMANDS — admin → extensão (poll a cada 5min)
// ═══════════════════════════════════════════════════════════════
// Permite o admin (você) disparar ações remotas sem release/store update.
// Modelo: extensão polla GET /commands com HMAC; recebe lista de comandos
// pendentes; executa cada um; faz POST /commands/ack pra targeted commands.
// Broadcast commands (install_id=NULL no server) usam timestamp local
// pra filtrar já-vistos (last_commands_poll_ts).
//
// Comandos suportados (extensible — desconhecidos são ignorados silenciosamente):
//   - flush_telemetry      → força envio do batch agora
//   - reload_spec          → fetchSpecs() + notifyTabsSpecUpdated()
//   - reload_capabilities  → fetchCapabilities()
//   - reset_first_events   → remove chrome.storage.local.nodus_first_events

async function pollRemoteCommands() {
  try {
    const headers = await buildAuthHeaders();
    const lastPollData = await chrome.storage.local.get('nodus_commands_last_poll_ts');
    const lastPoll = lastPollData?.nodus_commands_last_poll_ts || 0;
    headers['X-Nodus-Last-Poll'] = String(lastPoll);

    const resp = await fetch(`${WORKER_URL}/commands`, { headers });
    if (!resp.ok) {
      // 401 = sig stale ou install não registrada. Tenta re-register na próxima.
      if (resp.status === 401) await registerInstall();
      return;
    }
    const data = await resp.json();
    if (!Array.isArray(data.commands)) return;

    if (data.commands.length === 0) {
      // Sem trabalho — só atualiza last_poll
      await chrome.storage.local.set({ nodus_commands_last_poll_ts: data.server_time || Math.floor(Date.now() / 1000) });
      return;
    }

    console.log(`[Commands] received ${data.commands.length} command(s)`);
    for (const cmd of data.commands) {
      try {
        const ok = await executeRemoteCommand(cmd);
        // Se targeted (não-broadcast), ack pra marcar executed_at no server
        if (ok && !cmd.is_broadcast) {
          fetch(`${WORKER_URL}/commands/ack`, {
            method: 'POST',
            headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: cmd.id })
          }).catch(() => {}); // fire-and-forget
        }
      } catch (e) {
        console.warn(`[Commands] cmd ${cmd.id?.slice(0,8)} (${cmd.type}) failed:`, e?.message);
      }
    }

    // Atualiza last_poll pra filtrar broadcasts já vistos
    await chrome.storage.local.set({ nodus_commands_last_poll_ts: data.server_time || Math.floor(Date.now() / 1000) });
  } catch (e) {
    console.warn('[Commands] poll error:', e?.message);
  }
}

async function executeRemoteCommand(cmd) {
  console.log(`[Commands] exec ${cmd.type} (id=${cmd.id?.slice(0,8)}${cmd.is_broadcast ? ' broadcast' : ''})`);
  switch (cmd.type) {
    case 'flush_telemetry':
      // Força envio do batch independente de MIN_EVENTS/MAX_TIME
      await telemetryTracker.checkAndSendBatch(true);
      return true;

    case 'reload_spec':
      // Re-fetcha specs do worker e notifica tabs
      const fresh = await fetchSpecs();
      if (fresh) await notifyTabsSpecUpdated(fresh.version);
      return true;

    case 'reload_capabilities':
      // Re-fetcha capabilities + notifica tabs (license.js re-aplica fallback)
      await fetchCapabilities();
      return true;

    case 'reset_first_events':
      // Apaga marcas de first_save/first_inject/etc. Útil pra testar
      // funnel sem precisar desinstalar/reinstalar a extensão.
      await chrome.storage.local.remove('nodus_first_events');
      console.log('[Commands] nodus_first_events cleared');
      return true;

    default:
      console.log(`[Commands] tipo desconhecido: ${cmd.type} — ignorado (forward-compat)`);
      return false;
  }
}

/**
 * Verificar se há versão nova (leve, sem baixar spec completa)
 */
async function checkSpecVersion() {
  try {
    const headers = await buildAuthHeaders();
    const { nodus_selector_history } = await chrome.storage.local.get('nodus_selector_history');
    const currentVersion = nodus_selector_history?.current_version || '';

    headers['X-Nodus-Current-Version'] = currentVersion;

    const resp = await fetch(`${WORKER_URL}/selectors/version`, { headers });
    if (!resp.ok) return;

    const data = await resp.json();
    if (data.changed) {
      console.log(`[Specs] Nova versão disponível: ${data.version} (atual: ${currentVersion})`);
      await fetchSpecs();
    } else {
      console.log(`[Specs] Spec atualizada (v${data.version})`);
    }
  } catch (e) {
    console.warn('[Specs] Version check failed:', e.message);
  }
}

/**
 * Salvar spec no histórico local (máximo MAX_SPEC_HISTORY versões)
 */
async function saveSpecToHistory(spec) {
  const { nodus_selector_history } = await chrome.storage.local.get('nodus_selector_history');
  const history = nodus_selector_history || { current_version: null, history: [] };

  // Não duplicar versão
  if (history.history.some(h => h.version === spec.version)) {
    history.current_version = spec.version;
    await chrome.storage.local.set({ nodus_selector_history: history });
    return;
  }

  // Inserir no início
  history.history.unshift({
    version: spec.version,
    received_at: new Date().toISOString(),
    source: 'worker',
    platforms: spec.platforms
  });

  // Manter máximo
  while (history.history.length > MAX_SPEC_HISTORY) {
    history.history.pop();
  }

  history.current_version = spec.version;
  await chrome.storage.local.set({ nodus_selector_history: history });
}

/**
 * Obter spec de uma plataforma (do histórico local)
 * Implementa fallback cascade: tenta versão atual → anteriores
 */
async function getSpecForPlatform(platform) {
  const { nodus_selector_history } = await chrome.storage.local.get('nodus_selector_history');

  if (nodus_selector_history?.history?.length > 0) {
    // Tentar cada versão do histórico
    for (const entry of nodus_selector_history.history) {
      const platformSpec = entry.platforms?.[platform];
      if (platformSpec) {
        return { spec: platformSpec, version: entry.version, source: entry.source };
      }
    }
  }

  // Fallback: spec bundled (não tem histórico ainda)
  console.warn(`[Specs] Sem spec no histórico para ${platform}, trigger fetch...`);
  // Tentar buscar do worker
  const freshSpec = await fetchSpecs();
  if (freshSpec?.platforms?.[platform]) {
    return { spec: freshSpec.platforms[platform], version: freshSpec.version, source: 'worker-fresh' };
  }

  return null;
}

/**
 * Inicializar sistema de specs
 */
async function initSpecSystem() {
  console.log('[Specs] Inicializando sistema de specs...');

  // Registrar install
  await registerInstall();

  // Capabilities (gating). Buscamos cedo pra que license.js já tenha o blob
  // quando carregar. Falha aqui é não-fatal — license.js cai pra FREE seguro.
  await fetchCapabilities();

  // Verificar se já tem specs
  const { nodus_selector_history } = await chrome.storage.local.get('nodus_selector_history');
  if (!nodus_selector_history || nodus_selector_history.history.length === 0) {
    console.log('[Specs] Sem specs locais, buscando do worker...');
    await fetchSpecs();
  } else {
    console.log(`[Specs] Spec local v${nodus_selector_history.current_version} encontrada`);
    // Verificar se há versão nova em background
    checkSpecVersion();
  }

  // Agendar refresh periódico de specs (6h) e capabilities (30 min — TTL do blob é 1h em dev)
  chrome.alarms.create('nodus_spec_refresh', { periodInMinutes: SPEC_REFRESH_HOURS * 60 });
  chrome.alarms.create('nodus_capabilities_refresh', { periodInMinutes: 30 });
  // Comandos remotos (admin → extensão). Poll 5min — janela útil pra debug
  // sem martelar o worker. Comandos: flush_telemetry, reload_spec, etc.
  chrome.alarms.create('nodus_commands_poll', { periodInMinutes: 5 });
  console.log(`[Specs] Refresh agendado a cada ${SPEC_REFRESH_HOURS}h; capabilities a cada 30min; commands poll a cada 5min`);
}

// Listener do alarm de refresh
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'nodus_spec_refresh') {
    console.log('[Specs] Alarm: verificando versão...');
    checkSpecVersion();
  } else if (alarm.name === 'nodus_capabilities_refresh') {
    console.log('[Capabilities] Alarm: re-fetch...');
    fetchCapabilities();
  } else if (alarm.name === 'nodus_commands_poll') {
    pollRemoteCommands().catch(e => console.warn('[Commands] poll failed:', e?.message));
  }
});

// Inicializar specs no startup do service worker (já instalado)
(async () => {
  try {
    const { nodus_install_id } = await chrome.storage.local.get('nodus_install_id');
    if (nodus_install_id) {
      // Já instalado — garantir que alarms estão ativos
      chrome.alarms.get('nodus_spec_refresh', (alarm) => {
        if (!alarm) {
          chrome.alarms.create('nodus_spec_refresh', { periodInMinutes: SPEC_REFRESH_HOURS * 60 });
          console.log('[Specs] Alarm re-criado no startup');
        }
      });
      chrome.alarms.get('nodus_capabilities_refresh', (alarm) => {
        if (!alarm) {
          chrome.alarms.create('nodus_capabilities_refresh', { periodInMinutes: 30 });
          console.log('[Capabilities] Alarm re-criado no startup');
        }
      });
      chrome.alarms.get('nodus_commands_poll', (alarm) => {
        if (!alarm) {
          chrome.alarms.create('nodus_commands_poll', { periodInMinutes: 5 });
          console.log('[Commands] Poll alarm re-criado no startup');
        }
      });
      // Refresh oportunista de capabilities no wakeup do SW — caso o blob
      // esteja velho, melhor pegar fresco antes do user clicar em algo.
      fetchCapabilities();
    }
  } catch (e) {
    console.warn('[Specs] Startup check failed:', e);
  }
})();

// ═══════════════════════════════════════════════════════════════
// INSTALAÇÃO
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('%c📦 Extensão instalada/atualizada', 'color: #10b981; font-weight: bold;');
  console.log('Motivo:', details.reason);
  console.log('Versão:', state.version);

  // ✨ TELEMETRIA v2: registra install/update IMEDIATAMENTE.
  // Antes esse evento não existia — install só era detectado quando user
  // chegava a 100 ações OU 24h depois, fazendo 67% dos installs virarem
  // fantasmas no D1. Agora chega no servidor no próximo flush (≤5 min).
  // Força flush imediato pra que install seja visível mesmo se user
  // desinstalar nos primeiros segundos.
  try {
    await telemetryTracker.trackInstall(details);
    await telemetryTracker.checkAndSendBatch(/*force*/ true);
  } catch (e) {
    console.warn('[Background] trackInstall failed:', e?.message);
  }

  if (details.reason === 'install') {
    // Primeira instalação
    console.log('%c🎉 Primeira instalação!', 'color: #f59e0b; font-weight: bold;');

    // Inicializar sistema de specs (Fase 2) — registra install + baixa specs + agenda alarm
    initSpecSystem();

    // Inicializar storage com estrutura padrão
    await chrome.storage.local.set({
      ideas_queue_quick: [],
      ideas_queue_default: [],
      ideas_queue_custom1: [],
      settings: {
        crossPlatformInject: false,
        showAutoButtons: true,  // ✅ HABILITADO POR PADRÃO
        showButtonsPlatforms: {
          chatgpt: true,
          claude: true,
          gemini: true,
          perplexity: true,
          copilot: true,
          grok: true,
          deepseek: true
        },
        cardAnimation: 'glow',
        telemetryMode: 1  // ✅ TELEMETRIA HABILITADA POR PADRÃO
      },
      stats: {
        totalIdeas: 0,
        totalTags: 0,
        firstInstall: new Date().toISOString()
      }
    });

    // ✨ INICIALIZAR TELEMETRIA (Modo 1 - Logs Locais)
    await telemetryStorage.setMode(TELEMETRY_CONFIG.DEFAULT_MODE);
    
    // Gerar anon_id (SHA-256 + salt)
    const anonId = await telemetryTracker.security.getAnonId();
    console.log('%c✅ Telemetria inicializada - Modo 1 (Logs Locais)', 'color: #10b981;');
    console.log('%c🔐 Anon ID gerado:', 'color: #8b5cf6;', anonId.substring(0, 16) + '...');

    console.log('%c✅ Storage inicializado', 'color: #10b981;');

    // Abrir página de boas-vindas (opcional)
    // chrome.tabs.create({ url: 'welcome.html' });

  } else if (details.reason === 'update') {
    console.log(`%c🔄 Atualizado de ${details.previousVersion} para ${state.version}`, 'color: #3b82f6;');

    // Re-inicializar specs na atualização (garante alarm + versão fresca)
    initSpecSystem();

    // Migração de dados se necessário
    // await migrateData(details.previousVersion);
  }

  state.installed = true;
});

// ═══════════════════════════════════════════════════════════════
// LISTENER DE MENSAGENS
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.group('%c📨 Mensagem recebida', 'color: #8b5cf6; font-weight: bold;');
  console.log('Action:', message.action);
  console.log('Sender:', sender.tab ? `Tab ${sender.tab.id}` : 'Extension');
  console.log('Data:', message);

  // Handler assíncrono
  (async () => {
    try {
      let response;

      // ── Keepalive (dev mode) ──
      // Content script pinga a cada 20s pra manter SW vivo durante demo
      // de hot-reload de spec. Resposta no-op, super-leve.
      if (message.type === '_nodus_keepalive') {
        sendResponse({ ok: true, t: Date.now() });
        console.groupEnd();
        return;
      }

      // ── force_telemetry_flush ──
      // Botão "Forçar envio agora" pra debug/admin. Manda batch
      // independente de MIN_EVENTS/MAX_TIME. Útil quando o user quer
      // ver dados em tempo real sem esperar batch natural.
      if (message.type === 'force_telemetry_flush') {
        try {
          const result = await telemetryTracker.checkAndSendBatch(true);
          sendResponse({ ok: true, flushed: result });
          console.log('[Telemetry] Force flush requested via message');
        } catch (e) {
          sendResponse({ ok: false, error: e?.message });
        }
        console.groupEnd();
        return;
      }

      // ── telemetry_toggle ──
      // Popup/dashboard chama ANTES de persistir a flag de storage:
      //   1. enabled=false → manda telemetry_disabled + flush imediato
      //      (último evento antes do user cortar telemetria)
      //   2. enabled=true  → manda telemetry_enabled_event + flush
      //      (rastreia opt-in pra entender quem re-ativa)
      // Sem isso, opt-out vira fantasma e a gente perde métrica.
      if (message.type === 'telemetry_toggle') {
        try {
          const { enabled, source } = message.payload || {};
          await telemetryTracker.trackTelemetryToggle(!!enabled, source || 'unknown');
          sendResponse({ ok: true });
          console.log(`[Telemetry] Toggle event tracked: enabled=${enabled} source=${source}`);
        } catch (e) {
          console.warn('[Telemetry] telemetry_toggle error:', e?.message);
          sendResponse({ ok: false, error: e?.message });
        }
        console.groupEnd();
        return;
      }

      // ── classify_and_track_response (Telemetria v2) ──
      // Content scripts MV3 não suportam dynamic import de arquivos da
      // extensão. Runtime envia o texto da resposta pra cá; background
      // (que É module) importa o classifier, classifica, descarta o texto,
      // e chama trackResponseGenerated com platform + length + content_type
      // + content_language. Texto NUNCA é persistido nem transmitido pra
      // rede — só atravessa o boundary content↔background.
      if (message.type === 'classify_and_track_response') {
        try {
          const { platform, length, text } = message.payload || {};
          // Log explícito pra debug — confirma que handler disparou
          // E que classifier foi importado corretamente.
          console.log(`[Classify] ${platform} len=${length} classifier=${typeof classifyContentType}`);
          let content_type = null;
          let content_language = null;
          if (text && text.length >= 20) {
            const r = classifyContentType(text);
            content_type = r?.type || null;
            content_language = r?.language || null;
            console.log(`[Classify] result: ${content_type} (${content_language})`);
          } else {
            console.log(`[Classify] text muito curto (<20 chars), pulando classificação`);
          }
          await telemetryTracker.trackResponseGenerated({
            platform,
            length: length || 0,
            content_type,
            content_language
          });
          sendResponse({ ok: true, content_type, content_language });
        } catch (e) {
          console.warn('[Telemetry] classify_and_track_response error:', e?.message);
          sendResponse({ ok: false, error: e?.message });
        }
        console.groupEnd();
        return;
      }

      // ── Handler por type (Runtime Fase 2) ──
      // runtime.js envia { type: 'get_selectors', platform } para buscar spec local
      if (message.type === 'get_selectors' && message.platform) {
        const result = await getSpecForPlatform(message.platform);
        if (result) {
          response = { ok: true, spec: result.spec, version: result.version, source: result.source };
        } else {
          response = { ok: false, error: 'Spec não disponível para ' + message.platform };
        }
        sendResponse(response);
        console.groupEnd();
        return;
      }

      // ── DEV: força refetch imediato da spec do worker ──
      // Uso: chrome.runtime.sendMessage({type:'force_spec_refresh'}, console.log)
      // executado APENAS no service worker console (chrome://extensions → service
      // worker). Da aba do ChatGPT não funciona porque page console é MAIN world.
      // Em dev mode (WORKER_URL = localhost), o polling automático abaixo torna
      // isso redundante — basta editar o spec.json e o background pega em ~2s.
      if (message.type === 'force_spec_refresh') {
        try {
          console.log('[Specs] 🔄 Force refresh disparado');
          const fresh = await fetchSpecs();
          if (!fresh) {
            sendResponse({ ok: false, error: 'fetchSpecs returned null (worker offline?)' });
          } else {
            await notifyTabsSpecUpdated(fresh.version);
            sendResponse({ ok: true, version: fresh.version, platforms: Object.keys(fresh.platforms || {}) });
          }
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        console.groupEnd();
        return;
      }

      // ── Runtime Health (doc 07) ──
      // runtime.js envia { type: 'report_runtime_health', payload } quando uma
      // função instrumentada via withHealth() falha ou retorna null.
      // Buferamos em chrome.storage.local (ring buffer, máx 200 eventos) E
      // tentamos flush imediato em http://localhost:8787/health (dev server).
      // Se o server estiver offline, o evento fica no buffer; o próximo flush
      // bem-sucedido drena tudo. Em produção isso será trocado pra
      // https://nodus-health-worker.mmcarvalho-dev.workers.dev/health.
      if (message.type === 'report_runtime_health' && message.payload) {
        try {
          const MAX_HEALTH_BUFFER = 200;
          const { nodus_runtime_health_buffer } = await chrome.storage.local.get('nodus_runtime_health_buffer');
          const buf = Array.isArray(nodus_runtime_health_buffer) ? nodus_runtime_health_buffer : [];
          buf.push(message.payload);
          while (buf.length > MAX_HEALTH_BUFFER) buf.shift();
          await chrome.storage.local.set({ nodus_runtime_health_buffer: buf });
          // Fire-and-forget flush — não atrasa a resposta, não quebra se server offline
          flushHealthBuffer().catch(() => {});
          sendResponse({ ok: true, buffered: buf.length });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        console.groupEnd();
        return;
      }

      switch (message.action) {
        case 'saveIdea':
          response = await handleSaveIdea(message.idea);
          break;

        case 'captureFullChat':
          console.log('%c📚 CAPTANDO FULL CHAT!', 'color: #10b981; font-size: 16px; font-weight: bold;');
          console.log('Data recebida:', message.data);
          response = await handleCaptureFullChat(message.data);
          console.log('Response gerada:', response);
          break;

        case 'fetchImageAsBase64':
          // Background busca a imagem sem restrição de CORS (host_permissions bypass)
          try {
            const imgResp = await fetch(message.url);
            if (!imgResp.ok) throw new Error('HTTP ' + imgResp.status);
            const imgBuf = await imgResp.arrayBuffer();
            const mimeType = imgResp.headers.get('content-type') || 'image/jpeg';
            // Converter para base64
            const uint8 = new Uint8Array(imgBuf);
            let binary = '';
            for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
            const base64 = btoa(binary);
            response = { ok: true, base64, mimeType };
          } catch (err) {
            response = { ok: false, error: err.message };
          }
          break;

        case 'getIdeas':
          response = await handleGetIdeas(message.queueKey);
          break;

        case 'getLastIdea':
          response = await handleGetLastIdea();
          break;

        case 'deleteIdea':
          response = await handleDeleteIdea(message.ideaId, message.queueKey);
          break;

        case 'updateIdea':
          response = await handleUpdateIdea(message.idea, message.queueKey);
          break;

        case 'getStats':
          response = await handleGetStats();
          break;

        case 'clearQueue':
          response = await handleClearQueue(message.queueKey);
          break;

        case 'getSettings':
          response = await handleGetSettings();
          break;

        case 'saveSettings':
          response = await handleSaveSettings(message.settings);
          break;

        case 'openPanelNQ':
          response = await handleOpenPanelNQ(message.ideaData, sender.tab?.id);
          break;

        case 'inject_text_in_current_tab':
          response = await handleInjectTextInCurrentTab(message.text, message.injectMode, sender.tab?.id);
          break;

        // ═══════════════════════════════════════════════════════════
        // TELEMETRIA v2.0 - Handlers
        // ═══════════════════════════════════════════════════════════
        
        case 'getTelemetryMode':
          response = await handleGetTelemetryMode();
          break;

        case 'setTelemetryMode':
          response = await handleSetTelemetryMode(message.mode);
          break;

        case 'getTelemetryStats':
          response = await handleGetTelemetryStats();
          break;

        case 'exportTelemetryData':
          response = await handleExportTelemetryData(message.format);
          break;

        case 'clearTelemetryData':
          response = await handleClearTelemetryData();
          break;

        case 'trackChainDelete':
          response = await handleTrackChainDelete(message.data);
          break;
        
        case 'SEND_TELEMETRY_NOW':
          response = await handleSendTelemetryNow();
          break;


        case 'ping':
          response = { ok: true, message: 'Background ativo', version: state.version };
          break;

        // ═══════════════════════════════════════════════════════════
        // LICENÇA - Propagar mudança para todas as tabs
        // ═══════════════════════════════════════════════════════════
        case 'LICENSE_CHANGED':
          console.log('[License] 📩 MESSAGE COMPLETO:', JSON.stringify(message));
          console.log('[License] 📩 STATUS:', message.status);
          response = await handleLicenseChanged(message.status, sender.tab?.id);
          break;

        default:
          response = { ok: false, error: 'Ação desconhecida' };
      }

      console.log('%c✅ Response:', 'color: #10b981;', response);
      console.groupEnd();
      sendResponse(response);

    } catch (error) {
      console.error('%c❌ Erro ao processar mensagem:', 'color: #ef4444;', error);
      console.groupEnd();
      sendResponse({ ok: false, error: error.message });
    }
  })();

  return true; // Indica resposta assíncrona
});

// ═══════════════════════════════════════════════════════════════
// HANDLERS DE AÇÕES
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// SALVAR IDEIA
// ─────────────────────────────────────────────────────────────
async function handleSaveIdea(idea) {
  console.log('%c💾 Salvando ideia...', 'color: #3b82f6; font-weight: bold;');
  console.log('Ideia:', idea);

  try {
    // Validações
    if (!idea || typeof idea !== 'object') {
      throw new Error('Ideia inválida');
    }

    if (!idea.title || !idea.text) {
      throw new Error('Título e texto são obrigatórios');
    }

    // Determinar fila baseado nas tags
    let queueKey = idea.queue || 'ideas_queue_default';
    
    // Se tem tags, processar para determinar fila
    if (idea.tags && Array.isArray(idea.tags)) {
      const firstTag = idea.tags[0];
      
      // Tag especial __quick__ vai para quick queue
      if (firstTag === '__quick__') {
        queueKey = 'ideas_queue_quick';
        console.log('[Background] Tag __quick__ detectada, salvando na Quick Queue');
      }
      // Outras tags especiais podem ser adicionadas aqui
    }
    
    console.log('[Background] Fila determinada:', queueKey);

    // Pegar fila atual
    const storage = await chrome.storage.local.get(queueKey);
    let currentQueue = storage[queueKey] || [];

    // ✨ VERIFICAR DUPLICATA (TODAS AS FILAS - SEM EXCEÇÃO)
    const contentHash = generateContentHash(idea);
    const isDuplicate = currentQueue.some(existingIdea => {
      const existingHash = generateContentHash(existingIdea);
      return existingHash === contentHash;
    });

    if (isDuplicate) {
      console.log('%c⚠️ Duplicate idea detected!', 'color: #fbbf24; font-weight: bold;');
      return { 
        ok: false, 
        duplicate: true,
        message: 'Idea already saved',
        queueKey 
      };
    }
    
    // Adicionar metadados
    const ideaToSave = {
      ...idea,
      id: generateId(),
      savedAt: new Date().toISOString(),
      queue: queueKey
    };

    // Adicionar no início (mais recente primeiro)
    currentQueue.unshift(ideaToSave);
    
    // 🚨 LIMITE DA FILA QUICK: Máximo 50 ideias (sobrescreve mais antigas)
    if (queueKey === 'ideas_queue_quick' && currentQueue.length > 50) {
      console.log('%c⚠️ Quick Queue reached limit of 50! Removing oldest...', 'color: #fbbf24; font-weight: bold;');
      currentQueue = currentQueue.slice(0, 50); // Manter apenas as 50 mais recentes
    }

    // Salvar
    await chrome.storage.local.set({ [queueKey]: currentQueue });

    // Atualizar stats
    await updateStats('add', ideaToSave);

    // ✨ TELEMETRIA: Rastrear evento de save
    await telemetryTracker.trackSave({
      platform: ideaToSave.source,
      content_type: ideaToSave.content_type,
      text: ideaToSave.text,
      tags: ideaToSave.tags,
      queue: queueKey,
      captureMethod: ideaToSave.captureMethod,
      url: ideaToSave.sourceUrl
    });

    console.log('%c✅ Idea saved successfully!', 'color: #10b981; font-weight: bold;');
    console.log('ID:', ideaToSave.id);
    console.log('Queue:', queueKey);

    return { 
      ok: true, 
      ideaId: ideaToSave.id,
      queueKey,
      message: 'Idea saved successfully' 
    };

  } catch (error) {
    console.error('%c❌ Erro ao salvar ideia:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// CAPTURAR CHAT COMPLETO
// ─────────────────────────────────────────────────────────────
async function handleCaptureFullChat(data) {
  console.log('%c📚 Capturando chat completo...', 'color: #10b981; font-weight: bold;');
  console.log('[Background] Data recebida:', data);
  console.log('[Background] chainTitle recebido:', data.chainTitle);
  console.log('[Background] chainTitle tipo:', typeof data.chainTitle);
  console.log('[Background] chainTitle length:', data.chainTitle?.length);

  try {
    const { nodes, chainTitle, platform } = data;
    
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      throw new Error('Nenhum node fornecido');
    }
    
    console.log('[Background] Nodes recebidos:', nodes.length);
    
    // VERIFICAR DUPLICATA: Criar hash do conteúdo
    console.log('[Background] Verificando se chat já foi capturado...');
    const contentHash = nodes.map(n => (n.question || '') + (n.answer || '')).join('|');
    const chatHash = contentHash.length.toString() + '_' + (contentHash.charCodeAt(0) || 0);
    console.log('[Background] Chat hash:', chatHash);
    
    // Buscar chains existentes para verificar duplicata
    const existingChainsData = await chrome.storage.local.get(['nodus_chains']);
    const existingChains = existingChainsData.nodus_chains || [];
    
    // Verificar se já existe uma chain com este hash
    const duplicateChain = existingChains.find(c => c.chatHash === chatHash);
    if (duplicateChain) {
      console.log('[Background] ⚠️ Chat já capturado! Chain existente:', duplicateChain.id);
      return { 
        ok: false, 
        error: 'duplicate',
        message: 'Este chat já foi capturado anteriormente',
        existingChainId: duplicateChain.id,
        existingChainName: duplicateChain.name
      };
    }
    
    console.log('[Background] ✅ Chat novo, processando...');
    
    // Cores por plataforma
    const PLATFORM_COLORS = {
      'ChatGPT': '#10a37f',
      'Claude': '#cc785c',
      'Gemini': '#4285f4',
      'Perplexity': '#20808d',
      'Copilot': '#0078d4',
      'Grok': '#000000'
    };
    
    // NOVA ARQUITETURA: Salvar cada node como IDEA em fila virtual
    const virtualQueue = `fullchat_${platform.toLowerCase().replace(/\s+/g, '')}`;
    console.log('[Background] Fila virtual:', virtualQueue);
    
    // Buscar ideas existentes
    const allQueues = ['ideas_queue_quick', 'ideas_queue_default', 'ideas_queue_q1', virtualQueue];
    const storageData = await chrome.storage.local.get(allQueues);
    
    const savedIdeas = [];
    const chainNodes = [];
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      // Criar tags obrigatórias: plataforma + "fullchat"
      const tags = [platform.toLowerCase(), 'fullchat'];
      
      // Criar idea com status virtual
      const idea = {
        id: `idea_${Date.now()}_${i}`,
        title: node.title || `Mensagem ${i + 1}`,
        question: node.question || '',
        answer: node.answer || '',
        text: node.answer || node.question || '',
        platform: platform,
        source: platform, // IMPORTANTE: para telemetria
        captureMethod: 'fullchat', // IMPORTANTE: para telemetria
        tags: tags, // Tags obrigatórias: [platform, "fullchat"]
        queue: virtualQueue,
        status: 'virtual', // NOVO CAMPO
        date: new Date().toISOString(), // Data ISO
        timestamp: Date.now() + i, // +i para garantir ordem
        sourceUrl: data.sourceUrl || '', // URL da captura (passada do content script)
        injectionCount: 0,
        notes: null,
        attachments: [],
        hasAttachment: false,
        hasGeneratedFile: false,
        images: node.images || [] // URLs de imagens capturadas (ChatGPT/outras plataformas)
      };
      
      savedIdeas.push(idea);
      
      // Criar node da chain referenciando idea
      chainNodes.push({
        id: `node_${Date.now()}_${i}`,
        ideaId: idea.id,
        display: 'both',
        type: 'linked' // Agora é linked, não standalone
      });
      
      console.log(`[Background] Idea ${i + 1}/${nodes.length} criada:`, idea.id, 'tags:', tags);
    }
    
    // Salvar ideas na fila virtual
    const virtualQueueIdeas = storageData[virtualQueue] || [];
    virtualQueueIdeas.push(...savedIdeas);
    await chrome.storage.local.set({ [virtualQueue]: virtualQueueIdeas });
    
    console.log(`[Background] ✅ ${savedIdeas.length} ideas salvas na fila virtual`);
    
    // TELEMETRIA: Registrar capturas fullchat
    try {
      if (typeof NodusRawTelemetry !== 'undefined') {
        for (const idea of savedIdeas) {
          await NodusRawTelemetry.logIdeaSave({
            platform: idea.source || idea.platform,
            captureMethod: idea.captureMethod || 'fullchat',
            hasAttachments: idea.hasAttachment || false,
            tagCount: idea.tags?.length || 0
          });
        }
        console.log(`[Background] ✅ Telemetria registrada: ${savedIdeas.length} capturas fullchat`);
      }
    } catch (telemetryError) {
      console.warn('[Background] Telemetria falhou (não crítico):', telemetryError);
    }
    
    // Extrair cor selecionada se enviada
    const selectedColor = data.selectedColor;
    console.log('[Background] Cor selecionada:', selectedColor);
    
    // Coletar imagens dos nós se solicitado (includeImages flag)
    let chainImageAttachments = [];
    if (data.includeImages) {
      const seenUrls = new Set();
      nodes.forEach(node => {
        (node.images || []).forEach(url => {
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            const fileName = url.split('/').pop().split('?')[0].split('#')[0] || `image_${seenUrls.size}.jpg`;
            chainImageAttachments.push({
              id: `img_${Date.now()}_${seenUrls.size}`,
              fileName: fileName.length > 60 ? fileName.substring(0, 60) : fileName,
              fileSize: 0,
              fileType: 'image/url',
              url: url,
              uploadedAt: new Date().toISOString()
            });
          }
        });
      });
      console.log(`[Background] 📷 ${chainImageAttachments.length} imagens adicionadas à chain`);
    }

    // Criar chain com nodes referenciando ideas
    const chain = {
      id: `chain_${Date.now()}`,
      name: chainTitle || `Full Chat - ${platform} - ${new Date().toLocaleString()}`,
      color: selectedColor || PLATFORM_COLORS[platform] || '#3b82f6', // Priorizar cor selecionada
      nodes: chainNodes,
      chatHash: chatHash, // Para detectar duplicatas
      platform: platform, // Adicionar platform para referência
      attachments: chainImageAttachments, // Imagens do Full Chat (vazio se não solicitado)
      notes: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    console.log('[Background] Chain criada:', chain);
    
    // Buscar chains existentes
    console.log('[Background] Buscando chains existentes...');
    const chainsData = await chrome.storage.local.get(['nodus_chains']);
    const chains = chainsData.nodus_chains || [];
    
    console.log('[Background] Chains existentes:', chains.length);
    
    // Adicionar nova chain
    chains.push(chain);
    
    console.log('[Background] Total após adicionar:', chains.length);
    console.log('[Background] Salvando chains no storage...');
    
    // Salvar chains COM RETRY
    let saveSuccess = false;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Background] Tentativa ${attempt}/3 de salvar...`);
        await chrome.storage.local.set({ nodus_chains: chains });
        console.log(`[Background] ✅ Salvamento tentativa ${attempt} OK`);
        saveSuccess = true;
        break;
      } catch (error) {
        lastError = error;
        console.error(`[Background] ❌ Erro na tentativa ${attempt}:`, error);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 200 * attempt)); // 200ms, 400ms
        }
      }
    }
    
    if (!saveSuccess) {
      console.error('[Background] ❌ FALHA CRÍTICA: Não conseguiu salvar chains após 3 tentativas');
      throw new Error(`Falha ao salvar chains: ${lastError?.message || 'Unknown'}`);
    }
    
    console.log('[Background] ✅ Salvo! Verificando...');
    
    // ✨ REGISTRAR CREATE NA TELEMETRIA (forçar no event_log)
    try {
      console.log('[Telemetry] Registrando chain created no event_log...');
      
      // Salvar DIRETAMENTE no event_log (bypass modo)
      const eventLogData = await chrome.storage.local.get('telemetry_event_log');
      const eventLog = eventLogData.telemetry_event_log || [];
      
      eventLog.unshift({
        event_type: 'chain_create',
        platform_origin: platform,
        content_type: 'chain',
        metadata: {
          chain_id: chain.id,
          chain_name: chainTitle,
          node_count: savedIdeas.length
        },
        timestamp: Date.now()
      });
      
      // Limitar tamanho
      if (eventLog.length > 1000) {
        eventLog.pop();
      }
      
      await chrome.storage.local.set({ telemetry_event_log: eventLog });
      console.log('[Telemetry] ✅ Chain create logged');
    } catch (telemetryError) {
      console.warn('[Telemetry] Chain create logging failed:', telemetryError);
    }
    
    // VERIFICAR COM RETRY
    let verifyChains = [];
    let verifyIdeas = [];
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[Background] Verificação tentativa ${attempt}/3...`);
      const verifyData = await chrome.storage.local.get(['nodus_chains', virtualQueue]);
      verifyChains = verifyData.nodus_chains || [];
      verifyIdeas = verifyData[virtualQueue] || [];
      
      console.log(`[Background] Verificação ${attempt} - Chains:`, verifyChains.length);
      console.log(`[Background] Verificação ${attempt} - Ideas virtuais:`, verifyIdeas.length);
      
      // Se encontrou a chain nova, success!
      const foundChain = verifyChains.find(c => c.id === chain.id);
      if (foundChain) {
        console.log(`[Background] ✅ Chain ${chain.id} verificada na tentativa ${attempt}!`);
        break;
      }
      
      if (attempt < 3) {
        console.log(`[Background] ⚠️ Chain não encontrada, aguardando ${200 * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, 200 * attempt));
      }
    }
    
    // Verificar se chain realmente existe
    const foundChain = verifyChains.find(c => c.id === chain.id);
    if (!foundChain) {
      console.error('[Background] ❌ AVISO: Chain salva mas não encontrada na verificação!');
      console.error('[Background] IDs esperado vs encontrados:', {
        expected: chain.id,
        found: verifyChains.map(c => c.id)
      });
    }
    
    console.log('%c✅ Full Chat processado com sucesso!', 'color: #10b981;', {
      chain: chain.id,
      ideas: savedIdeas.length,
      virtualQueue
    });
    
    // ✨ TRACK: Evento de Full Chat Capture
    try {
      await telemetryTracker.trackEvent('fullcapture', {
        platform_origin: platform.toLowerCase(),
        ideas_count: savedIdeas.length,
        chain_created: true,
        chain_id: chain.id
      });
    } catch (err) {
      console.warn('[Telemetry] Track failed:', err);
    }
    
    return { ok: true, chain: chain, ideasCount: savedIdeas.length };
  } catch (error) {
    console.error('%c❌ Erro ao capturar chat:', 'color: #ef4444;', error);
    console.error('Stack:', error.stack);
    return { ok: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// OBTER IDEIAS
// ─────────────────────────────────────────────────────────────
async function handleGetIdeas(queueKey = 'ideas_queue_default') {
  console.log(`%c📥 Obtendo ideias da fila: ${queueKey}`, 'color: #3b82f6;');

  try {
    const storage = await chrome.storage.local.get(queueKey);
    const ideas = storage[queueKey] || [];

    console.log(`%c✅ ${ideas.length} ideias encontradas`, 'color: #10b981;');

    return { 
      ok: true, 
      ideas,
      queueKey,
      count: ideas.length 
    };

  } catch (error) {
    console.error('%c❌ Erro ao obter ideias:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// OBTER ÚLTIMA IDEIA (para Paste)
// ─────────────────────────────────────────────────────────────
async function handleGetLastIdea() {
  console.log('%c📋 Obtendo última ideia salva', 'color: #3b82f6;');

  try {
    // Buscar em todas as filas
    const storage = await chrome.storage.local.get([
      'ideas_queue_quick',
      'ideas_queue_default', 
      'ideas_queue_custom1'
    ]);

    let allIdeas = [];
    
    // Concatenar todas as ideias com timestamp
    ['ideas_queue_quick', 'ideas_queue_default', 'ideas_queue_custom1'].forEach(queueKey => {
      const queue = storage[queueKey] || [];
      allIdeas = allIdeas.concat(queue);
    });

    // Ordenar por savedAt (mais recente primeiro)
    allIdeas.sort((a, b) => {
      const dateA = new Date(a.savedAt || a.date);
      const dateB = new Date(b.savedAt || b.date);
      return dateB - dateA;
    });

    const lastIdea = allIdeas[0];

    if (!lastIdea) {
      console.log('%c⚠️ Nenhuma ideia encontrada', 'color: #f59e0b;');
      return { ok: false, message: 'Nenhuma ideia salva ainda' };
    }

    console.log('%c✅ Última ideia encontrada:', 'color: #10b981;', lastIdea.id);

    return { ok: true, idea: lastIdea };

  } catch (error) {
    console.error('%c❌ Erro ao obter última ideia:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// DELETAR IDEIA
// ─────────────────────────────────────────────────────────────
async function handleDeleteIdea(ideaId, queueKey) {
  console.log(`%c🗑️ Deletando ideia ${ideaId} da fila ${queueKey}`, 'color: #ef4444;');

  try {
    const storage = await chrome.storage.local.get(queueKey);
    const currentQueue = storage[queueKey] || [];

    // Filtrar ideia
    const ideaToDelete = currentQueue.find(i => i.id === ideaId);
    const updatedQueue = currentQueue.filter(i => i.id !== ideaId);

    // Salvar
    await chrome.storage.local.set({ [queueKey]: updatedQueue });

    // Atualizar stats
    if (ideaToDelete) {
      await updateStats('remove', ideaToDelete);
    }

    console.log('%c✅ Ideia deletada', 'color: #10b981;');

    // ✨ TRACK: Evento de Delete
    try {
      await telemetryTracker.trackDelete({
        queue: queueKey,
        idea_id: ideaId
      });
    } catch (err) {
      console.warn('[Telemetry] Track failed:', err);
    }

    return { 
      ok: true, 
      message: 'Ideia deletada',
      remainingCount: updatedQueue.length 
    };

  } catch (error) {
    console.error('%c❌ Erro ao deletar ideia:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// ATUALIZAR IDEIA
// ─────────────────────────────────────────────────────────────
async function handleUpdateIdea(updatedIdea, queueKey) {
  console.log(`%c✏️ Atualizando ideia ${updatedIdea.id}`, 'color: #f59e0b;');

  try {
    const storage = await chrome.storage.local.get(queueKey);
    const currentQueue = storage[queueKey] || [];

    // Encontrar e atualizar
    const index = currentQueue.findIndex(i => i.id === updatedIdea.id);
    
    if (index === -1) {
      throw new Error('Ideia não encontrada');
    }

    currentQueue[index] = {
      ...currentQueue[index],
      ...updatedIdea,
      updatedAt: new Date().toISOString()
    };

    // Salvar
    await chrome.storage.local.set({ [queueKey]: currentQueue });

    console.log('%c✅ Ideia atualizada', 'color: #10b981;');

    return { ok: true, message: 'Ideia atualizada' };

  } catch (error) {
    console.error('%c❌ Erro ao atualizar ideia:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// OBTER ESTATÍSTICAS
// ─────────────────────────────────────────────────────────────
async function handleGetStats() {
  console.log('%c📊 Obtendo estatísticas', 'color: #8b5cf6;');

  try {
    const storage = await chrome.storage.local.get(['stats', 'ideas_queue_quick', 'ideas_queue_default', 'ideas_queue_custom1']);
    
    const stats = {
      ...storage.stats,
      queues: {
        quick: storage.ideas_queue_quick?.length || 0,
        default: storage.ideas_queue_default?.length || 0,
        custom1: storage.ideas_queue_custom1?.length || 0
      },
      total: (storage.ideas_queue_quick?.length || 0) + 
             (storage.ideas_queue_default?.length || 0) + 
             (storage.ideas_queue_custom1?.length || 0)
    };

    console.log('%c✅ Stats:', 'color: #10b981;', stats);

    return { ok: true, stats };

  } catch (error) {
    console.error('%c❌ Erro ao obter stats:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// LIMPAR FILA
// ─────────────────────────────────────────────────────────────
async function handleClearQueue(queueKey) {
  console.log(`%c🧹 Limpando fila: ${queueKey}`, 'color: #f59e0b; font-weight: bold;');

  try {
    await chrome.storage.local.set({ [queueKey]: [] });

    console.log('%c✅ Fila limpa', 'color: #10b981;');

    return { ok: true, message: 'Fila limpa' };

  } catch (error) {
    console.error('%c❌ Erro ao limpar fila:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// GERAR ID ÚNICO
// ─────────────────────────────────────────────────────────────
function generateId() {
  return `idea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────
// GERAR HASH DE CONTEÚDO (para detectar duplicatas)
// ─────────────────────────────────────────────────────────────
function generateContentHash(idea) {
  // Gerar hash simples baseado no conteúdo principal
  const content = [
    (idea.question || '').trim(),
    (idea.text || '').trim(),
    idea.platform,
    idea.source
  ].join('|').toLowerCase();
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// ─────────────────────────────────────────────────────────────
// ATUALIZAR ESTATÍSTICAS
// ─────────────────────────────────────────────────────────────
async function updateStats(action, idea) {
  try {
    const storage = await chrome.storage.local.get('stats');
    const stats = storage.stats || { totalIdeas: 0, totalTags: 0 };

    if (action === 'add') {
      stats.totalIdeas++;
      stats.totalTags += (idea.tags?.length || 0);
      stats.lastSave = new Date().toISOString();
    } else if (action === 'remove') {
      stats.totalIdeas = Math.max(0, stats.totalIdeas - 1);
      stats.totalTags = Math.max(0, stats.totalTags - (idea.tags?.length || 0));
    }

    await chrome.storage.local.set({ stats });
    state.stats = stats;

  } catch (error) {
    console.error('Erro ao atualizar stats:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// LISTENER DE ABAS
// ═══════════════════════════════════════════════════════════════

chrome.tabs.onActivated.addListener((activeInfo) => {
  state.activeTabId = activeInfo.tabId;
  console.log(`%c📑 Tab ativa: ${activeInfo.tabId}`, 'color: #3b82f6; font-size: 10px;');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    console.log(`%c🔄 Tab ${tabId} carregada: ${tab.url}`, 'color: #8b5cf6; font-size: 10px;');
  }
});

// ═══════════════════════════════════════════════════════════════
// KEEPALIVE (evitar service worker dormir)
// ═══════════════════════════════════════════════════════════════

// Service workers podem "dormir" após 30s de inatividade
// Este keepalive previne isso em momentos críticos

let keepAliveInterval;

function startKeepAlive() {
  if (keepAliveInterval) return;
  
  keepAliveInterval = setInterval(() => {
    chrome.storage.local.get('_keepalive', () => {
      // Apenas manter service worker ativo
    });
  }, 20000); // A cada 20 segundos
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Iniciar keepalive
startKeepAlive();

// ═══════════════════════════════════════════════════════════════
// LOG INICIAL
// ═══════════════════════════════════════════════════════════════

console.log('%c✅ Background Service Worker ativo!', 'color: #10b981; font-size: 14px; font-weight: bold;');
console.log(`%cVersão: ${state.version}`, 'color: #94a3b8;');
console.log(`%cTimestamp: ${new Date().toISOString()}`, 'color: #94a3b8;');

// ─────────────────────────────────────────────────────────────
// OBTER CONFIGURAÇÕES
// ─────────────────────────────────────────────────────────────
async function handleGetSettings() {
  console.log('%c⚙️ Obtendo configurações', 'color: #8b5cf6;');

  try {
    const storage = await chrome.storage.local.get('settings');
    const settings = storage.settings || {
      crossPlatformInject: false,
      autoOpenPanel: true,
      showNotifications: true
    };

    console.log('%c✅ Configurações:', 'color: #10b981;', settings);

    return { ok: true, settings };

  } catch (error) {
    console.error('%c❌ Erro ao obter configurações:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// SALVAR CONFIGURAÇÕES
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ABRIR PANEL NQ
// ─────────────────────────────────────────────────────────────
async function handleOpenPanelNQ(ideaData, tabId) {
  console.log('%c🎨 Abrindo Panel NQ...', 'color: #3b82f6; font-weight: bold;');
  console.log('Idea Data:', ideaData);
  console.log('Tab ID:', tabId);

  try {
    if (!tabId) {
      throw new Error('Tab ID não fornecido');
    }

    // Enviar mensagem para o content script da tab
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'openPanelNQ',
      ideaData: ideaData
    });

    console.log('%c✅ Panel NQ aberto', 'color: #10b981; font-weight: bold;');
    return { ok: true, message: 'Panel NQ aberto' };

  } catch (error) {
    console.error('%c❌ Erro ao abrir Panel NQ:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// SALVAR CONFIGURAÇÕES
// ─────────────────────────────────────────────────────────────
async function handleSaveSettings(settings) {
  console.log('%c💾 Salvando configurações', 'color: #3b82f6;');

  try {
    await chrome.storage.local.set({ settings });

    console.log('%c✅ Configurações salvas:', 'color: #10b981;', settings);

    return { ok: true, message: 'Configurações salvas' };

  } catch (error) {
    console.error('%c❌ Erro ao salvar configurações:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// INJETAR TEXTO NA ABA ATUAL
// ─────────────────────────────────────────────────────────────
async function handleInjectTextInCurrentTab(text, injectMode = 'formatted', senderTabId = null) {
  console.log('%c💉 Injetando texto na aba atual...', 'color: #3b82f6; font-weight: bold;');
  console.log(`Inject Mode: ${injectMode}, Sender Tab: ${senderTabId}`);

  try {
    // Prefer the sender's tab ID to avoid injecting into the wrong tab
    let tab = null;
    if (senderTabId) {
      tab = await chrome.tabs.get(senderTabId).catch(() => null);
    }
    if (!tab) {
      // Fallback: active tab in current window
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = activeTab;
    }

    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    console.log('Injetando na tab:', tab.id);

    // Send message to content script to inject text
    await chrome.tabs.sendMessage(tab.id, {
      action: 'injectText',
      text: text,
      injectMode: injectMode
    });

    // ℹ️ TELEMETRIA: O tracking é feito pelo engine quando o paste é executado
    // Não fazer tracking aqui para evitar duplicatas

    console.log('%c✅ Texto injetado com sucesso!', 'color: #10b981; font-weight: bold;');
    return { ok: true, message: 'Text injected successfully' };

  } catch (error) {
    console.error('%c❌ Erro ao injetar texto:', 'color: #ef4444;', error);
    return { ok: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// TELEMETRIA v2.0 - HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Obter modo de telemetria atual
 */
async function handleGetTelemetryMode() {
  try {
    const mode = await telemetryStorage.getMode();
    return { ok: true, mode };
  } catch (error) {
    console.error('[Telemetry] Error getting mode:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Definir modo de telemetria
 */
async function handleSetTelemetryMode(mode) {
  try {
    await telemetryStorage.setMode(mode);
    console.log(`[Telemetry] Mode changed to: ${mode}`);
    return { ok: true, mode };
  } catch (error) {
    console.error('[Telemetry] Error setting mode:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Obter estatísticas de telemetria
 */
async function handleGetTelemetryStats() {
  try {
    const stats = await telemetryTracker.getStats();
    return { ok: true, stats };
  } catch (error) {
    console.error('[Telemetry] Error getting stats:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Exportar dados de telemetria
 */
async function handleExportTelemetryData(format = 'json') {
  try {
    const data = await telemetryTracker.exportAuditData(format);
    return { ok: true, data };
  } catch (error) {
    console.error('[Telemetry] Error exporting data:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Limpar todos os dados de telemetria
 */
async function handleClearTelemetryData() {
  try {
    await telemetryStorage.clearAll();
    console.log('[Telemetry] All data cleared');
    return { ok: true, message: 'Telemetry data cleared' };
  } catch (error) {
    console.error('[Telemetry] Error clearing data:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Registrar delete de chain na telemetria
 */
async function handleTrackChainDelete(data) {
  try {
    console.log('[Telemetry] Tracking chain delete:', data);
    
    await telemetryTracker.trackDelete({
      platform: data.platform,
      content_type: 'chain',
      metadata: {
        chain_id: data.chainId,
        chain_name: data.chainName,
        node_count: data.nodeCount
      }
    });
    
    console.log('[Telemetry] ✅ Chain delete tracked');
    return { ok: true, message: 'Chain delete tracked' };
  } catch (error) {
    console.error('[Telemetry] Error tracking chain delete:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Enviar telemetria manualmente (botão de teste)
 */
async function handleSendTelemetryNow() {
  try {
    console.log('[Telemetry] 🧪 Manual send triggered');
    
    const result = await telemetryTracker.sendNow();
    
    if (result.ok) {
      console.log(`[Telemetry] ✅ Sent ${result.sent} events`);
      return { ok: true, sent: result.sent };
    } else {
      console.error('[Telemetry] ❌ Failed to send:', result.error);
      return { ok: false, error: result.error };
    }
  } catch (error) {
    console.error('[Telemetry] Error sending now:', error);
    return { ok: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LICENSE CHANGE HANDLER - Propagar para todas as tabs de IA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Propaga mudança de licença para todas as tabs das plataformas de IA
 * @param {string} status - 'pro' ou 'free'
 * @param {number} senderTabId - ID da tab que enviou (para não notificar ela mesma)
 */
async function handleLicenseChanged(status, senderTabId) {
  console.log(`[License] Propagando mudança de licença: ${status}`);
  
  // URLs das plataformas de IA
  const aiPlatformPatterns = [
    'https://chat.openai.com/*',
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'https://perplexity.ai/*',
    'https://*.perplexity.ai/*',
    'https://copilot.microsoft.com/*',
    'https://grok.com/*',
    'https://x.com/*'
  ];
  
  try {
    // Buscar todas as tabs das plataformas de IA
    const tabs = await chrome.tabs.query({});
    
    const aiTabs = tabs.filter(tab => {
      if (!tab.url) return false;
      return aiPlatformPatterns.some(pattern => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(tab.url);
      });
    });
    
    console.log(`[License] Encontradas ${aiTabs.length} tabs de IA`);
    
    // Enviar mensagem para cada tab (exceto a que enviou)
    let notifiedCount = 0;
    for (const tab of aiTabs) {
      if (tab.id === senderTabId) continue; // Não notificar a tab que enviou
      
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'LICENSE_UPDATED',
          status: status
        });
        notifiedCount++;
        console.log(`[License] Tab ${tab.id} notificada (${tab.url})`);
      } catch (e) {
        // Tab pode não ter o content script carregado, ignorar
        console.log(`[License] Não foi possível notificar tab ${tab.id}:`, e.message);
      }
    }
    
    return { ok: true, notifiedTabs: notifiedCount };
  } catch (error) {
    console.error('[License] Erro ao propagar licença:', error);
    return { ok: false, error: error.message };
  }
}
