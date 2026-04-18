// ═══════════════════════════════════════════════════════════
// NODUS v3.3.1 - Popup de Estatísticas
// ═══════════════════════════════════════════════════════════

// Helper de tradução
const _t = (key) => {
  if (typeof NodusI18n !== 'undefined') {
    return NodusI18n.t(key);
  }
  const fallbacks = {
    'popup.capturestoday': 'Capturas Hoje',
    'popup.totalideas': 'Total Ideias',
    'popup.queues': 'Filas',
    'popup.chains': 'Chains',
    'popup.logs': 'Logs',
    'popup.tags': 'Tags',
    'popup.storage': 'Storage',
    'popup.dashboard': 'Dashboard',
    'popup.nolog': 'Nenhum log ainda',
    'popup.notag': 'Nenhuma tag',
    'popup.used': 'usado',
    'popup.total': 'total',
    'popup.telemetry.disabled.title': 'Estatísticas Desativadas',
    'popup.telemetry.disabled.message': 'Ative a telemetria para ver estatísticas de uso.',
    'popup.telemetry.enable': 'Ativar Telemetria',
    'log.quicksave': 'Quick Save',
    'log.capture': 'Captura'
  };
  return fallbacks[key] || key;
};

const QUEUE_KEYS = [
  'ideas_queue_quick',
  'ideas_queue_default',
  'ideas_queue_custom1',
  'ideas_queue_custom2',
  'ideas_queue_custom3',
  'ideas_queue_custom4'
];

const QUEUE_LABELS = {
  'ideas_queue_quick': 'Quick',
  'ideas_queue_default': 'Default',
  'ideas_queue_custom1': 'Q1',
  'ideas_queue_custom2': 'Q2',
  'ideas_queue_custom3': 'Q3',
  'ideas_queue_custom4': 'Q4'
};

const PLATFORMS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'copilot', 'grok'];

const PLATFORM_LABELS = {
  'chatgpt': 'ChatGPT',
  'claude': 'Claude',
  'gemini': 'Gemini',
  'perplexity': 'Perplexity',
  'copilot': 'Copilot',
  'grok': 'Grok'
};

const EVENT_ICONS = {
  'save': '💾',
  'quick_save': '⚡',
  'inject': '💉',
  'export': '📤',
  'delete': '🗑️',
  'chain_add': '🔗',
  'chain_created': '📚',
  'chain_delete': '🗑️',
  'update': '✏️'
};

// Cores das tags (mesmo sistema do dashboard)
function getTagColor(tagName) {
  const predefinedColors = {
    'CLAUDE': '#a855f7',
    'CHATGPT': '#10b981',
    'COPILOT': '#3b82f6',
    'GEMINI': '#8b5cf6',
    'PERPLEXITY': '#06b6d4',
    'GROK': '#f59e0b',
    'TECH': '#6366f1',
    'BOOK': '#ec4899',
    'WRITING': '#ef4444',
    'FITNESS': '#14b8a6',
    'NEWS': '#f97316'
  };

  const upperTag = tagName.toUpperCase();
  if (predefinedColors[upperTag]) {
    return predefinedColors[upperTag];
  }

  // Generate color from tag name hash
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1'];
  return colors[Math.abs(hash) % colors.length];
}

// ═══════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  
  // Inicializar i18n
  if (typeof NodusI18n !== 'undefined') {
    await NodusI18n.init();
  }
  
  // Verificar se telemetria está ativa
  const telemetryEnabled = await checkTelemetry();
  
  if (!telemetryEnabled) {
    showTelemetryDisabled();
    return;
  }
  
  // Aplicar traduções
  applyTranslations();
  
  await loadStats();
  await updateTelemetryInfo();
  setupEventListeners();

});

// Aplicar traduções aos elementos data-i18n
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = _t(key);
  });
}

// ═══════════════════════════════════════════════════════════
// VERIFICAR TELEMETRIA
// ═══════════════════════════════════════════════════════════

async function checkTelemetry() {
  try {
    // ✅ Usar a mesma chave que as configurações
    const data = await chrome.storage.local.get('settings');
    const mode = data.settings?.telemetryMode;
    
    // Se não houver settings, assumir que telemetria está ATIVADA (default)
    if (mode === undefined) {
      return true;
    }
    
    // Mode 0 = Off, 1 = On
    return mode > 0;
  } catch (error) {
    console.error('[Popup] Erro ao verificar telemetria:', error);
    return true; // Default: ativado
  }
}

function showTelemetryDisabled() {
  const content = document.querySelector('.content');
  content.innerHTML = `
    <div class="telemetry-disabled">
      <div class="telemetry-icon">📊</div>
      <div class="telemetry-title">${_t('popup.telemetry.disabled.title')}</div>
      <div class="telemetry-message">${_t('popup.telemetry.disabled.message')}</div>
      <button class="telemetry-btn" id="btn-enable-telemetry">${_t('popup.telemetry.enable')}</button>
    </div>
  `;
  
  // Listener para ativar telemetria
  document.getElementById('btn-enable-telemetry').addEventListener('click', async () => {
    // Escrever nas duas chaves: telemetry_enabled (popup) e settings.telemetryMode (dashboard)
    const settingsData = await chrome.storage.local.get('settings');
    const settings = settingsData.settings || {};
    settings.telemetryMode = 1;
    await chrome.storage.local.set({ telemetry_enabled: true, settings });
    location.reload();
  });
  
  setupEventListeners();
}

// ═══════════════════════════════════════════════════════════
// CARREGAR ESTATÍSTICAS
// ═══════════════════════════════════════════════════════════

async function loadStats() {
  try {
    // Carregar todas as filas NORMAIS
    const queuesData = await chrome.storage.local.get(QUEUE_KEYS);
    
    // BUSCAR FILAS VIRTUAIS (fullchat_*)
    // Pegar TODAS as keys do storage e filtrar as que começam com "fullchat_"
    const allStorage = await chrome.storage.local.get(null);
    const virtualQueueKeys = Object.keys(allStorage).filter(key => key.startsWith('fullchat_'));
    
    
    // Adicionar filas virtuais ao queuesData
    virtualQueueKeys.forEach(key => {
      queuesData[key] = allStorage[key];
    });
    
    // Criar lista combinada de TODAS as filas (normais + virtuais)
    const allQueueKeys = [...QUEUE_KEYS, ...virtualQueueKeys];
    
    // Carregar chains
    const chainsData = await chrome.storage.local.get('nodus_chains');
    const chains = chainsData.nodus_chains || [];
    
    // Extrair tags de todas as ideias (TODAS as filas)
    const allTags = new Set();
    allQueueKeys.forEach(key => {
      const queue = queuesData[key] || [];
      queue.forEach(idea => {
        if (idea.tags && Array.isArray(idea.tags)) {
          idea.tags.forEach(tag => allTags.add(tag));
        }
      });
    });
    const tags = Array.from(allTags).sort();
    
    // Carregar logs (telemetria)
    const logsData = await chrome.storage.local.get('telemetry_event_log');
    const logs = logsData.telemetry_event_log || [];
    
    // Calcular estatísticas (passando TODAS as filas)
    const stats = await calculateStats(queuesData, chains, tags, logs, allQueueKeys);
    
    // Atualizar UI
    updateUI(stats);
    
  } catch (error) {
    console.error('[Popup] Erro ao carregar stats:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// CALCULAR ESTATÍSTICAS
// ═══════════════════════════════════════════════════════════

async function calculateStats(queuesData, chains, tags, logs, allQueueKeys = QUEUE_KEYS) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Contagem por fila
  const queueCounts = {};
  let totalIdeas = 0;
  const platformCountsToday = {};
  let capturesToday = 0;
  
  // Array para gerar logs a partir das ideias
  const generatedLogs = [];
  
  // USAR TODAS AS FILAS (normais + virtuais)
  allQueueKeys.forEach(key => {
    const queue = queuesData[key] || [];
    queueCounts[key] = queue.length;
    totalIdeas += queue.length;
    
    // Contar capturas de hoje e por plataforma
    queue.forEach(idea => {
      const ideaDate = new Date(idea.date || idea.timestamp || idea.createdAt || 0);
      const ideaDateOnly = new Date(ideaDate);
      ideaDateOnly.setHours(0, 0, 0, 0);
      
      // Normalizar plataforma (pode ser source ou platform, minúsculo)
      const platform = (idea.source || idea.platform || 'unknown').toLowerCase();
      
      if (ideaDateOnly.getTime() === today.getTime()) {
        capturesToday++;
        platformCountsToday[platform] = (platformCountsToday[platform] || 0) + 1;
      }
      
      // Gerar log APENAS para ideas NORMAIS (não fullchat)
      // Ideas fullchat serão agrupadas por chain
      if (!key.startsWith('fullchat_')) {
        generatedLogs.push({
          time: ideaDate,
          type: key === 'ideas_queue_quick' ? 'quick_save' : 'save',
          platform: PLATFORM_LABELS[platform] || platform,
          text: key === 'ideas_queue_quick' ? _t('log.quicksave') : _t('log.capture'),
          ideaId: idea.id
        });
      }
    });
  });
  
  // ✨ BUSCAR EVENTOS DE CHAIN DA TELEMETRIA (create E delete)
  // Não usar mais nodus_chains para evitar que logs desapareçam ao deletar
  try {
    const telemetryData = await chrome.storage.local.get('telemetry_event_log');
    const telemetryLogs = telemetryData.telemetry_event_log || [];
    
    telemetryLogs.forEach(event => {
      // Chain create
      if (event.event_type === 'chain_create') {
        const chainDate = new Date(event.timestamp);
        if (!isNaN(chainDate.getTime())) {
          const chainName = event.metadata?.chain_name || 'Chain';
          const nodeCount = event.metadata?.node_count || '?';
          
          generatedLogs.push({
            time: chainDate,
            type: 'chain_created',
            platform: event.platform_origin || 'Chain',
            text: `📚 Chain criada (${nodeCount}) · ${chainName}`,  // ✅ NOME ADICIONADO
            chainId: event.metadata?.chain_id,
            chainName: chainName,
            chainNodeCount: event.metadata?.node_count || 0,
            chainColor: event.metadata?.chain_color || '#3b82f6'
          });
        }
      }
      
      // Chain delete
      if (event.event_type === 'delete' && event.content_type === 'chain') {
        const chainDate = new Date(event.timestamp);
        if (!isNaN(chainDate.getTime())) {
          const chainName = event.metadata?.chain_name || 'Chain';
          const nodeCount = event.metadata?.node_count || '?';
          
          generatedLogs.push({
            time: chainDate,
            type: 'chain_delete',
            platform: event.platform_origin || 'Chain',
            text: `🗑️ Chain deletada (${nodeCount}) · ${chainName}`,  // ✅ NOME ADICIONADO
            chainName: chainName,
            chainNodeCount: event.metadata?.node_count || 0
          });
        }
      }
    });
  } catch (e) {
    console.warn('[Popup] Erro ao buscar telemetria de chains:', e);
  }
  
  // Ordenar logs por data (mais recentes primeiro)
  generatedLogs.sort((a, b) => b.time.getTime() - a.time.getTime());
  
  // Usar apenas generatedLogs (que já tem chains da telemetria)
  const recentLogs = generatedLogs.slice(0, 20);
  
  // Chains stats
  const totalChains = chains.length;
  const totalNodes = chains.reduce((sum, chain) => sum + (chain.nodes?.length || 0), 0);
  
  // Última captura
  let lastCapture = null;
  let lastCaptureTime = 0;
  
  QUEUE_KEYS.forEach(key => {
    const queue = queuesData[key] || [];
    queue.forEach(idea => {
      const ts = new Date(idea.date || idea.timestamp || idea.createdAt || 0).getTime();
      if (ts > lastCaptureTime) {
        lastCaptureTime = ts;
        lastCapture = idea;
      }
    });
  });
  
  return {
    capturesToday,
    totalIdeas,
    queueCounts,
    platformCountsToday,
    totalChains,
    totalNodes,
    lastCapture,
    lastCaptureTime,
    tags,
    recentLogs
  };
}

function getEventText(eventType) {
  const texts = {
    'save': _t('log.capture'),
    'quick_save': _t('log.quicksave'),
    'inject': 'Injection',
    'export': 'Export',
    'delete': 'Delete',
    'chain_add': 'Add Chain',
    'update': 'Update'
  };
  return texts[eventType] || eventType;
}

// ═══════════════════════════════════════════════════════════
// ATUALIZAR UI
// ═══════════════════════════════════════════════════════════

function updateUI(stats) {
  // Capturas hoje
  document.getElementById('capturas-hoje').textContent = stats.capturesToday;
  
  // Plataformas grid
  const plataformasGrid = document.getElementById('plataformas-grid');
  plataformasGrid.innerHTML = PLATFORMS.map(plat => `
    <div class="expand-item">
      <div class="expand-item-label">${PLATFORM_LABELS[plat]}</div>
      <div class="expand-item-value">${stats.platformCountsToday[plat] || 0}</div>
    </div>
  `).join('');
  
  // Total ideias
  document.getElementById('total-ideias').textContent = stats.totalIdeas;
  document.getElementById('total-filas').textContent = stats.totalIdeas;
  document.getElementById('total-chains-resumo').innerHTML = 
    `${stats.totalChains} <span class="summary-sub">(${stats.totalNodes})</span>`;
  
  // Filas list expandido
  const filasList = document.getElementById('filas-list');
  let filasHTML = '';
  
  QUEUE_KEYS.forEach(key => {
    const count = stats.queueCounts[key] || 0;
    if (count > 0 || ['ideas_queue_quick', 'ideas_queue_default', 'ideas_queue_custom1'].includes(key)) {
      filasHTML += `
        <div class="expand-list-item">
          <span class="expand-list-label">${QUEUE_LABELS[key]}</span>
          <span class="expand-list-value">${count}</span>
        </div>
      `;
    }
  });
  
  filasHTML += '<div class="expand-list-divider"></div>';
  filasHTML += `
    <div class="expand-list-item">
      <span class="expand-list-label">Chains</span>
      <span class="expand-list-value">${stats.totalChains} <span class="expand-list-sub">(${stats.totalNodes})</span></span>
    </div>
  `;
  
  filasList.innerHTML = filasHTML;
  
  // Contador de logs
  document.getElementById('log-count').textContent = stats.recentLogs.length;
  
  // Logs list
  const logsList = document.getElementById('logs-list');
  if (stats.recentLogs.length > 0) {
    logsList.innerHTML = stats.recentLogs.map(log => {
      // Se é chain, adicionar atributos para tooltip e click
      if (log.type === 'chain_created') {
        return `
          <div class="log-entry chain-log" 
               data-chain-id="${log.chainId || ''}"
               data-chain-name="${log.chainName || ''}"
               data-chain-nodes="${log.chainNodeCount || 0}"
               data-chain-color="${log.chainColor || '#3b82f6'}"
               title="Click to open chain">
            <span class="log-time">${formatTime(log.time)}</span>
            <span class="log-icon">${EVENT_ICONS[log.type] || '📌'}</span>
            <span class="log-text">${log.text}</span>
            <span class="log-plat">${log.platform}</span>
          </div>
        `;
      } else {
        // Log normal
        return `
          <div class="log-entry">
            <span class="log-time">${formatTime(log.time)}</span>
            <span class="log-icon">${EVENT_ICONS[log.type] || '📌'}</span>
            <span class="log-text">${log.text}</span>
            <span class="log-plat">${log.platform}</span>
          </div>
        `;
      }
    }).join('');
    
    // Adicionar event listeners para chains
    document.querySelectorAll('.chain-log').forEach(chainLog => {
      // Tooltip hover
      chainLog.addEventListener('mouseenter', showChainTooltip);
      chainLog.addEventListener('mouseleave', hideChainTooltip);
      
      // Click handler
      chainLog.addEventListener('click', () => {
        const chainId = chainLog.dataset.chainId;
        openDashboardChain(chainId);
      });
    });
  } else {
    logsList.innerHTML = `<div class="empty-state">${_t('popup.nolog')}</div>`;
  }
  
  // Tags
  document.getElementById('total-tags').textContent = stats.tags.length;
  const tagsList = document.getElementById('tags-list');
  if (stats.tags.length > 0) {
    tagsList.innerHTML = stats.tags.map(tag => {
      const tagName = tag.name || tag;
      const color = getTagColor(tagName);
      return `<span class="tag" style="background: ${color}; border-color: ${color};">${tagName}</span>`;
    }).join('');
  } else {
    tagsList.innerHTML = `<div class="empty-state">${_t('popup.notag')}</div>`;
  }
  
  // Storage
  updateStorageInfo();
}

// ═══════════════════════════════════════════════════════════
// CHAIN TOOLTIP & NAVIGATION
// ═══════════════════════════════════════════════════════════

let chainTooltip = null;

function showChainTooltip(event) {
  const chainLog = event.currentTarget;
  const chainName = chainLog.dataset.chainName;
  const chainNodes = chainLog.dataset.chainNodes;
  const chainColor = chainLog.dataset.chainColor;
  
  // Criar tooltip se não existe
  if (!chainTooltip) {
    chainTooltip = document.createElement('div');
    chainTooltip.className = 'chain-tooltip';
    document.body.appendChild(chainTooltip);
  }
  
  // Preencher conteúdo
  chainTooltip.innerHTML = `
    <div class="chain-tooltip-header" style="border-left: 3px solid ${chainColor};">
      <strong>${chainName}</strong>
    </div>
    <div class="chain-tooltip-body">
      <div class="chain-tooltip-info">
        <span class="chain-tooltip-icon">🔗</span>
        <span>${chainNodes} nodes</span>
      </div>
      <div class="chain-tooltip-hint">
        Click to open in Dashboard
      </div>
    </div>
  `;
  
  // Posicionar tooltip
  const rect = chainLog.getBoundingClientRect();
  chainTooltip.style.top = `${rect.bottom + 5}px`;
  chainTooltip.style.left = `${rect.left}px`;
  chainTooltip.style.display = 'block';
}

function hideChainTooltip() {
  if (chainTooltip) {
    chainTooltip.style.display = 'none';
  }
}

async function openDashboardChain(chainId) {
  try {
    // Enviar mensagem para abrir dashboard na chain específica
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'openDashboard',
        mode: 'chains',
        chainId: chainId
      });
      
      // Fechar popup
      window.close();
    }
  } catch (error) {
    console.error('[Popup] Erro ao abrir chain:', error);
  }
}

function getTimeDiff(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function formatTime(date) {
  
  // Se não é um objeto Date, tentar converter
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  // Se inválido, retornar placeholder
  if (!date || isNaN(date.getTime())) {
    console.warn('[Popup] Data inválida em formatTime:', date);
    return '--:--';
  }
  
  const formatted = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return formatted;
}

async function updateStorageInfo() {
  try {
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    const maxBytes = 5 * 1024 * 1024; // 5MB (limite local storage)
    const percent = Math.round((bytesInUse / maxBytes) * 100);
    
    document.getElementById('storage-percent').textContent = `${percent}%`;
    document.getElementById('storage-bar-mini').style.width = `${percent}%`;
    document.getElementById('storage-bar-big').style.width = `${percent}%`;
    document.getElementById('storage-used').textContent = formatBytes(bytesInUse) + ' ' + _t('popup.used');
    document.getElementById('storage-total').textContent = '5 MB ' + _t('popup.total');
  } catch (error) {
    console.error('[Popup] Erro ao calcular storage:', error);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ═══════════════════════════════════════════════════════════
// TELEMETRY
// ═══════════════════════════════════════════════════════════

async function updateTelemetryInfo() {
  try {
    // Importar config
    const KEYS = {
      TELEMETRY_ENABLED: 'telemetry_enabled',
      EVENT_QUEUE: 'telemetry_event_queue',
      LAST_SENT: 'telemetry_last_sent'
    };
    
    const storage = await chrome.storage.local.get([
      KEYS.TELEMETRY_ENABLED,
      KEYS.EVENT_QUEUE,
      KEYS.LAST_SENT
    ]);
    
    const enabled = storage[KEYS.TELEMETRY_ENABLED] ?? true;
    const queue = storage[KEYS.EVENT_QUEUE] || [];
    const lastSent = storage[KEYS.LAST_SENT] || 0;
    
    // Atualizar status
    const statusEl = document.getElementById('telemetry-status');
    const toggleEl = document.getElementById('telemetry-toggle');
    const statsEl = document.getElementById('telemetry-stats');
    const disabledMsgEl = document.getElementById('telemetry-disabled-msg');
    
    toggleEl.checked = enabled;
    statusEl.textContent = enabled ? 'ON' : 'OFF';
    statusEl.style.color = enabled ? '#10b981' : '#ef4444';
    
    if (enabled) {
      statsEl.style.display = 'block';
      disabledMsgEl.style.display = 'none';
      
      // Atualizar contadores
      document.getElementById('telemetry-queue').textContent = queue.length;
      document.getElementById('telemetry-send-count').textContent = queue.length;
      
      // Last sent
      if (lastSent > 0) {
        const timeSince = Date.now() - lastSent;
        const hoursSince = Math.floor(timeSince / (1000 * 60 * 60));
        const minutesSince = Math.floor((timeSince % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hoursSince > 0) {
          document.getElementById('telemetry-last-sent').textContent = `${hoursSince}h ago`;
        } else {
          document.getElementById('telemetry-last-sent').textContent = `${minutesSince}m ago`;
        }
      } else {
        document.getElementById('telemetry-last-sent').textContent = 'Never';
      }
      
      // Next send
      const timeUntilSend = 24 * 60 * 60 * 1000 - (Date.now() - lastSent);
      const hoursUntil = Math.floor(timeUntilSend / (1000 * 60 * 60));
      
      if (queue.length >= 100) {
        document.getElementById('telemetry-next-send').textContent = 'Now (100 events)';
      } else {
        document.getElementById('telemetry-next-send').textContent = `in ${hoursUntil}h`;
      }
      
      // Botão Send Now
      const sendBtn = document.getElementById('telemetry-send-now');
      sendBtn.disabled = queue.length === 0;
      
    } else {
      statsEl.style.display = 'none';
      disabledMsgEl.style.display = 'block';
    }
    
  } catch (error) {
    console.error('[Popup] Erro ao atualizar telemetria:', error);
  }
}

async function toggleTelemetry() {
  try {
    const toggleEl = document.getElementById('telemetry-toggle');
    const enabled = toggleEl.checked;

    // Sincronizar as duas chaves: telemetry_enabled (popup) e settings.telemetryMode (dashboard)
    const settingsData = await chrome.storage.local.get('settings');
    const settings = settingsData.settings || {};
    settings.telemetryMode = enabled ? 1 : 0;
    await chrome.storage.local.set({ telemetry_enabled: enabled, settings });


    await updateTelemetryInfo();

  } catch (error) {
    console.error('[Popup] Erro ao alternar telemetria:', error);
  }
}

async function sendTelemetryNow() {
  try {
    const sendBtn = document.getElementById('telemetry-send-now');
    sendBtn.disabled = true;
    sendBtn.textContent = '⏳ Sending...';
    
    // Enviar mensagem para background para executar envio
    const response = await chrome.runtime.sendMessage({
      action: 'SEND_TELEMETRY_NOW'
    });
    
    if (response && response.ok) {
      sendBtn.textContent = `✅ Sent ${response.sent} events!`;
      setTimeout(async () => {
        await updateTelemetryInfo();
      }, 2000);
    } else {
      sendBtn.textContent = '❌ Error sending';
      setTimeout(async () => {
        await updateTelemetryInfo();
      }, 2000);
    }
    
  } catch (error) {
    console.error('[Popup] Erro ao enviar telemetria:', error);
    const sendBtn = document.getElementById('telemetry-send-now');
    sendBtn.textContent = '❌ Error';
    setTimeout(async () => {
      await updateTelemetryInfo();
    }, 2000);
  }
}

// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

function setupEventListeners() {
  // Botão Dashboard
  document.getElementById('btn-dashboard').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'open_dashboard', tab: 'cards' });
      window.close();
    }
  });
  
  // Botão Config
  document.getElementById('btn-config').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'open_settings' });
      window.close();
    }
  });
  
  // Toggle Telemetria
  document.getElementById('telemetry-toggle').addEventListener('change', toggleTelemetry);
  
  // Botão Send Now
  document.getElementById('telemetry-send-now').addEventListener('click', sendTelemetryNow);
}

// (segundo DOMContentLoaded removido — estava duplicando loadStats e setupEventListeners)
