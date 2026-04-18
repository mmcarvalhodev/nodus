// ═══════════════════════════════════════════════════════════════
// NODUS - Background Service Worker
// ═══════════════════════════════════════════════════════════════
// Arquivo: background.js
// Versão: 3.2.0 (com Telemetria v2.0)
// Função: Gerenciar storage, mensagens e estado da extensão
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// IMPORTS - TELEMETRIA v2.0
// ═══════════════════════════════════════════════════════════════
import { getTelemetryTracker } from './telemetry/telemetry.tracker.js';
import { TelemetryStorage } from './telemetry/telemetry.storage.js';
import { TELEMETRY_CONFIG } from './telemetry/telemetry.config.js';


// Instância global do tracker
const telemetryTracker = getTelemetryTracker();
const telemetryStorage = new TelemetryStorage();


// ═══════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════

const state = {
  installed: false,
  version: '3.2.0',
  activeTabId: null,
  stats: {
    totalIdeas: 0,
    totalTags: 0,
    lastSave: null
  }
};

// ═══════════════════════════════════════════════════════════════
// INSTALAÇÃO
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(async (details) => {

  if (details.reason === 'install') {
    // Primeira instalação
    
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


    // Abrir página de boas-vindas (opcional)
    // chrome.tabs.create({ url: 'welcome.html' });

  } else if (details.reason === 'update') {
    
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

  // Handler assíncrono
  (async () => {
    try {
      let response;

      switch (message.action) {
        case 'saveIdea':
          response = await handleSaveIdea(message.idea);
          break;

        case 'captureFullChat':
          response = await handleCaptureFullChat(message.data);
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
          response = await handleLicenseChanged(message.status, sender.tab?.id);
          break;

        default:
          response = { ok: false, error: 'Ação desconhecida' };
      }

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
      }
      // Outras tags especiais podem ser adicionadas aqui
    }
    

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

  try {
    const { nodes, chainTitle, platform } = data;
    
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      throw new Error('Nenhum node fornecido');
    }
    
    
    // VERIFICAR DUPLICATA: Criar hash do conteúdo
    const contentHash = nodes.map(n => (n.question || '') + (n.answer || '')).join('|');
    const chatHash = contentHash.length.toString() + '_' + (contentHash.charCodeAt(0) || 0);
    
    // Buscar chains existentes para verificar duplicata
    const existingChainsData = await chrome.storage.local.get(['nodus_chains']);
    const existingChains = existingChainsData.nodus_chains || [];
    
    // Verificar se já existe uma chain com este hash
    const duplicateChain = existingChains.find(c => c.chatHash === chatHash);
    if (duplicateChain) {
      return { 
        ok: false, 
        error: 'duplicate',
        message: 'Este chat já foi capturado anteriormente',
        existingChainId: duplicateChain.id,
        existingChainName: duplicateChain.name
      };
    }
    
    
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
      
    }
    
    // Salvar ideas na fila virtual
    const virtualQueueIdeas = storageData[virtualQueue] || [];
    virtualQueueIdeas.push(...savedIdeas);
    await chrome.storage.local.set({ [virtualQueue]: virtualQueueIdeas });
    
    
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
      }
    } catch (telemetryError) {
      console.warn('[Background] Telemetria falhou (não crítico):', telemetryError);
    }
    
    // Extrair cor selecionada se enviada
    const selectedColor = data.selectedColor;
    
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
    
    
    // Buscar chains existentes
    const chainsData = await chrome.storage.local.get(['nodus_chains']);
    const chains = chainsData.nodus_chains || [];
    
    
    // Adicionar nova chain
    chains.push(chain);
    
    
    // Salvar chains COM RETRY
    let saveSuccess = false;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await chrome.storage.local.set({ nodus_chains: chains });
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
    
    
    // ✨ REGISTRAR CREATE NA TELEMETRIA (forçar no event_log)
    try {
      
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
    } catch (telemetryError) {
      console.warn('[Telemetry] Chain create logging failed:', telemetryError);
    }
    
    // VERIFICAR COM RETRY
    let verifyChains = [];
    let verifyIdeas = [];
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      const verifyData = await chrome.storage.local.get(['nodus_chains', virtualQueue]);
      verifyChains = verifyData.nodus_chains || [];
      verifyIdeas = verifyData[virtualQueue] || [];
      
      
      // Se encontrou a chain nova, success!
      const foundChain = verifyChains.find(c => c.id === chain.id);
      if (foundChain) {
        break;
      }
      
      if (attempt < 3) {
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

  try {
    const storage = await chrome.storage.local.get(queueKey);
    const ideas = storage[queueKey] || [];


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
      return { ok: false, message: 'Nenhuma ideia salva ainda' };
    }


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

  try {
    await chrome.storage.local.set({ [queueKey]: [] });


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
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
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


// ─────────────────────────────────────────────────────────────
// OBTER CONFIGURAÇÕES
// ─────────────────────────────────────────────────────────────
async function handleGetSettings() {

  try {
    const storage = await chrome.storage.local.get('settings');
    const settings = storage.settings || {
      crossPlatformInject: false,
      autoOpenPanel: true,
      showNotifications: true
    };


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

  try {
    if (!tabId) {
      throw new Error('Tab ID não fornecido');
    }

    // Enviar mensagem para o content script da tab
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'openPanelNQ',
      ideaData: ideaData
    });

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

  try {
    await chrome.storage.local.set({ settings });


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


    // Send message to content script to inject text
    await chrome.tabs.sendMessage(tab.id, {
      action: 'injectText',
      text: text,
      injectMode: injectMode
    });

    // ℹ️ TELEMETRIA: O tracking é feito pelo engine quando o paste é executado
    // Não fazer tracking aqui para evitar duplicatas

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
    
    await telemetryTracker.trackDelete({
      platform: data.platform,
      content_type: 'chain',
      metadata: {
        chain_id: data.chainId,
        chain_name: data.chainName,
        node_count: data.nodeCount
      }
    });
    
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
    
    const result = await telemetryTracker.sendNow();
    
    if (result.ok) {
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
      } catch (e) {
        // Tab pode não ter o content script carregado, ignorar
      }
    }
    
    return { ok: true, notifiedTabs: notifiedCount };
  } catch (error) {
    console.error('[License] Erro ao propagar licença:', error);
    return { ok: false, error: error.message };
  }
}
