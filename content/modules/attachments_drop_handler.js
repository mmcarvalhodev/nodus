/**
 * NODUS Attachments Drop Handler
 * Handles drop events on platform textareas with modal options
 * Version: 1.0.0
 */

const NodusDropHandler = {
    modalElement: null,
    currentFiles: [],
    dropZoneActive: false,
    indicatorElement: null,

    /**
     * Initialize drop handler
     */
    init() {
        console.log('[DropHandler] Initializing...');
        this.setupGlobalDropZone();
        this.createDropModal();
        this.createDropIndicator();
        console.log('[DropHandler] Initialized!');
    },

    /**
     * Setup drop zone on document
     */
    // Um drag é "do NODUS" quando carrega um MIME custom.
    _isNodusDrag(dataTransfer) {
        if (!dataTransfer || !dataTransfer.types) return false;
        return dataTransfer.types.includes('application/x-nodus-attachments')
            || dataTransfer.types.includes('application/x-nodus-chain-md');
    },

    /**
     * Gemini-specific: o input[type=file] é criado transiente pela directive
     * xapfileselectortrigger — nunca fica anexado ao DOM de forma queryável.
     * O MAIN-world bridge resolve tudo dentro do próprio monkey-patch:
     * quando Angular chama input.click(), o patch enche input.files com o
     * File reconstruído e dispatcha 'change'/'input' diretamente no input.
     * Aqui a gente só envia o payload e aguarda a resposta `filled: true`.
     *
     * Retorna: { ok: boolean, filled: boolean, reason: string }
     */
    async _revealAndFillGeminiFileInput(fileName, content) {
        return new Promise((resolve) => {
            let settled = false;
            const handler = (e) => {
                if (!e.data || e.data.__nodus !== 'cdrag' || e.data.t !== 'reveal-gemini-input-result') return;
                if (settled) return;
                settled = true;
                window.removeEventListener('message', handler);
                console.log('[DropHandler] reveal-gemini-input-result:', e.data);
                resolve({ ok: !!e.data.ok, filled: !!e.data.filled, reason: e.data.reason || '' });
            };
            window.addEventListener('message', handler);
            window.postMessage({
                __nodus: 'cdrag',
                t: 'reveal-gemini-input',
                fileName: fileName,
                content: content
            }, location.origin);
            // Safety timeout — 4s cobre abertura do menu + click + fallback
            setTimeout(() => {
                if (settled) return;
                settled = true;
                window.removeEventListener('message', handler);
                console.warn('[DropHandler] reveal-gemini-input timeout');
                resolve({ ok: false, filled: false, reason: 'timeout' });
            }, 4000);
        });
    },

    setupGlobalDropZone() {
        // Detectar quando drag do NODUS entra no documento
        document.addEventListener('dragenter', (e) => {
            if (this._isNodusDrag(e.dataTransfer)) {
                this.showDropIndicator();
            }
        });

        // Highlight na textarea ao passar sobre ela
        document.addEventListener('dragover', (e) => {
            if (!this._isNodusDrag(e.dataTransfer)) {
                return;
            }

            const textarea = this.getPlatformTextarea();
            if (textarea && this.isOverElement(e, textarea)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                textarea.classList.add('nodus-drop-active');
            } else if (textarea) {
                textarea.classList.remove('nodus-drop-active');
            }
        });

        // Remove highlight quando sai
        document.addEventListener('dragleave', (e) => {
            const textarea = this.getPlatformTextarea();
            if (textarea && !this.isOverElement(e, textarea)) {
                textarea.classList.remove('nodus-drop-active');
            }
        });

        // Handle drop
        document.addEventListener('drop', async (e) => {
            console.log('[DropHandler] ========================================');
            console.log('[DropHandler] DROP EVENT FIRED!');
            console.log('[DropHandler] Target:', e.target);
            console.log('[DropHandler] DataTransfer types:', e.dataTransfer.types);
            console.log('[DropHandler] DataTransfer files:', e.dataTransfer.files.length);
            
            // SEMPRE remover dragging ao soltar
            document.body.classList.remove('nodus-dragging');
            const overlay = document.getElementById('nodus-dashboard-overlay');
            if (overlay) {
                console.log('[DropHandler] Removing dragging class from overlay');
                overlay.classList.remove('dragging');
            }
            this.hideDropIndicator();
            
            // Verificar tipos NODUS: attachments (imagens) OU chain-md (cadeia .md)
            const hasNodusData = e.dataTransfer.types.includes('application/x-nodus-attachments');
            const hasNodusChainMd = e.dataTransfer.types.includes('application/x-nodus-chain-md');
            console.log('[DropHandler] Has NODUS data?', hasNodusData, '| chain-md?', hasNodusChainMd);

            // 🔗 Chain MD drop — MESMO padrão das imagens: achar input[type=file]
            //    pré-existente no DOM e preencher direto (NÃO clicar no '+' do
            //    Gemini, que abre um picker nativo do SO impossível de alimentar).
            //    Confirmado pelos logs: custom MIME types PERSISTEM no drop,
            //    enquanto 'Files' / 'DownloadURL' são removidos pelo Chrome para
            //    drags iniciados por extensão.
            if (hasNodusChainMd) {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const raw = e.dataTransfer.getData('application/x-nodus-chain-md');
                    const parsed = raw ? JSON.parse(raw) : null;
                    if (!parsed || !parsed.content) {
                        this.showToast('❌ Conteúdo da cadeia vazio', 'error');
                        console.log('[DropHandler] ========================================');
                        return;
                    }

                    const fileName = parsed.fileName || 'chain.md';
                    console.log('[DropHandler] Chain drop — fileName:', fileName, '| content length:', parsed.content.length);

                    // Gemini: sem input[type=file] no DOM (xapfileselectortrigger cria
                    // transiente). O bridge MAIN-world resolve tudo dentro do próprio
                    // monkey-patch do HTMLInputElement.prototype.click — preenche
                    // input.files + dispatch change no momento exato em que o Angular
                    // chama .click() no input criado. Não precisamos achar/preencher
                    // aqui depois. Detalhes: chains_drag_bridge.js → reveal-gemini-input.
                    if (/gemini\.google\.com/i.test(location.hostname)) {
                        console.log('[DropHandler] Gemini detected → delegando ao bridge reveal-and-fill');
                        const result = await this._revealAndFillGeminiFileInput(fileName, parsed.content);
                        console.log('[DropHandler] Gemini reveal result:', result);

                        if (result.filled) {
                            this.showToast('✅ Cadeia anexada como arquivo!', 'success');
                        } else {
                            console.warn('[DropHandler] ❌ Gemini reveal falhou:', result.reason, '— caindo para texto');
                            this.injectTextIntoTextarea(parsed.content);
                            this.showToast('⚠️ Não foi possível anexar como arquivo — colado como texto', 'info');
                        }
                        console.log('[DropHandler] ========================================');
                        return;
                    }

                    // Outras plataformas: buscar input[type=file] direto no DOM
                    const blob = new Blob([parsed.content], { type: 'text/markdown;charset=utf-8' });
                    const file = new File([blob], fileName, {
                        type: 'text/markdown',
                        lastModified: Date.now()
                    });
                    console.log('[DropHandler] Chain file reconstructed:', file.name, file.size, 'bytes');

                    const findInput = () => {
                        const all = document.querySelectorAll('input[type="file"]');
                        for (const input of all) {
                            if (input.offsetParent !== null || input.multiple) return input;
                        }
                        return all.length > 0 ? all[0] : null;
                    };
                    const fileInput = findInput();
                    console.log('[DropHandler] File inputs found:', document.querySelectorAll('input[type="file"]').length);

                    if (!fileInput) {
                        console.warn('[DropHandler] ❌ Nenhum input[type=file] encontrado — caindo para texto');
                        this.injectTextIntoTextarea(parsed.content);
                        this.showToast('⚠️ Input de arquivo não encontrado — conteúdo colado como texto', 'info');
                        console.log('[DropHandler] ========================================');
                        return;
                    }

                    // Preencher o input com o File via DataTransfer + dispatch change/input
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    fileInput.files = dt.files;
                    console.log('[DropHandler] ✅ Files set on input:', fileInput.files.length);

                    ['change', 'input'].forEach(eventType => {
                        fileInput.dispatchEvent(new Event(eventType, {
                            bubbles: true,
                            cancelable: true,
                            composed: true
                        }));
                        console.log('[DropHandler] Dispatched:', eventType);
                    });
                    try {
                        fileInput.dispatchEvent(new InputEvent('input', {
                            bubbles: true, cancelable: true, composed: true
                        }));
                    } catch (_) {}

                    this.showToast('✅ Cadeia anexada como arquivo!', 'success');
                    console.log('[DropHandler] ========================================');
                    return;
                } catch (err) {
                    console.error('[DropHandler] Error injecting chain md:', err);
                    this.showToast('❌ Erro ao injetar cadeia', 'error');
                    console.log('[DropHandler] ========================================');
                    return;
                }
            }


            // NOVA ABORDAGEM: Se tem dados do NODUS, carregar files e simular click no botão
            if (hasNodusData && e.dataTransfer.files.length === 0) {
                console.log('[DropHandler] ⚠️ New approach: simulating attachment button click...');
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    // Pegar dados do drag
                    const data = e.dataTransfer.getData('application/x-nodus-attachments');
                    
                    if (data) {
                        const parsed = JSON.parse(data);
                        console.log('[DropHandler] Loading', parsed.files.length, 'files from DB...');
                        
                        // Buscar TODOS os inputs de arquivo
                        const allFileInputs = document.querySelectorAll('input[type="file"]');
                        console.log('[DropHandler] All file inputs found:', allFileInputs.length);
                        
                        // Encontrar o input correto (geralmente o primeiro visível)
                        let fileInput = null;
                        for (const input of allFileInputs) {
                            console.log('[DropHandler] Checking input:', {
                                multiple: input.multiple,
                                accept: input.accept,
                                visible: input.offsetParent !== null
                            });
                            
                            if (input.offsetParent !== null || input.multiple) {
                                fileInput = input;
                                console.log('[DropHandler] ✅ Selected this input');
                                break;
                            }
                        }
                        
                        if (!fileInput && allFileInputs.length > 0) {
                            fileInput = allFileInputs[0];
                            console.log('[DropHandler] Using first input as fallback');
                        }
                        
                        if (fileInput) {
                            // Carregar arquivos do DB
                            const loadedFiles = [];
                            for (const fileInfo of parsed.files) {
                                const fileData = await window.NodusAttachmentsDB.getFile(fileInfo.id);
                                if (fileData && fileData.fileData) {
                                    const blob = new Blob([fileData.fileData], { type: fileInfo.fileType });
                                    const file = new File([blob], fileInfo.fileName, {
                                        type: fileInfo.fileType,
                                        lastModified: Date.now()
                                    });
                                    loadedFiles.push(file);
                                    console.log('[DropHandler] Loaded:', fileInfo.fileName);
                                }
                            }
                            
                            if (loadedFiles.length > 0) {
                                console.log('[DropHandler] Setting', loadedFiles.length, 'files on input...');
                                
                                // Criar DataTransfer
                                const dt = new DataTransfer();
                                for (const file of loadedFiles) {
                                    dt.items.add(file);
                                }
                                
                                // Setar files
                                fileInput.files = dt.files;
                                console.log('[DropHandler] Files set:', fileInput.files.length);
                                
                                // Disparar TODOS os eventos possíveis
                                ['change', 'input'].forEach(eventType => {
                                    const event = new Event(eventType, { 
                                        bubbles: true, 
                                        cancelable: true,
                                        composed: true
                                    });
                                    fileInput.dispatchEvent(event);
                                    console.log('[DropHandler] Dispatched:', eventType);
                                });
                                
                                // Tentar InputEvent também
                                const inputEvent = new InputEvent('input', {
                                    bubbles: true,
                                    cancelable: true,
                                    composed: true
                                });
                                fileInput.dispatchEvent(inputEvent);
                                
                                console.log('[DropHandler] ✅ All events dispatched!');
                                console.log('[DropHandler] ========================================');
                                return;
                            }
                        } else {
                            console.error('[DropHandler] ❌ No file input found!');
                        }
                    }
                } catch (error) {
                    console.error('[DropHandler] Error:', error);
                }
                
                console.log('[DropHandler] ❌ Failed to set files');
                console.log('[DropHandler] ========================================');
                return;
            }
            
            // Se tiver arquivos reais no dataTransfer
            if (e.dataTransfer.files.length > 0) {
                console.log('[DropHandler] ✅ Has real files');
                
                const fileInput = document.querySelector('input[type="file"][multiple]');
                if (fileInput) {
                    try {
                        e.preventDefault();
                        const dataTransfer = new DataTransfer();
                        for (const file of e.dataTransfer.files) {
                            dataTransfer.items.add(file);
                        }
                        
                        fileInput.files = dataTransfer.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
                        console.log('[DropHandler] ✅ Files set from dataTransfer!');
                        console.log('[DropHandler] ========================================');
                        return;
                    } catch (error) {
                        console.error('[DropHandler] Error:', error);
                    }
                }
            }
            
            console.log('[DropHandler] ❌ Could not process drop');
            console.log('[DropHandler] ========================================');
        });

        // Esconder indicador quando drag termina
        document.addEventListener('dragend', () => {
            this.hideDropIndicator();
            const textarea = this.getPlatformTextarea();
            if (textarea) {
                textarea.classList.remove('nodus-drop-active');
            }
            
            // Restaurar blur do overlay
            document.body.classList.remove('nodus-dragging');
            const overlay = document.getElementById('nodus-dashboard-overlay');
            if (overlay) {
                overlay.classList.remove('dragging');
            }
        });
    },

    /**
     * Check if mouse is over element
     */
    isOverElement(e, element) {
        const rect = element.getBoundingClientRect();
        return (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
        );
    },

    /**
     * Get platform textarea (varies by platform)
     */
    getPlatformTextarea() {
        // Tentar vários seletores (ordem de prioridade)
        const selectors = [
            'textarea#prompt-textarea',                    // ChatGPT
            'div[contenteditable="true"][data-id]',        // Claude
            'div.ql-editor[contenteditable="true"]',       // Gemini
            'textarea[placeholder*="Ask"]',                // Perplexity
            'textarea[placeholder*="Type"]',               // Copilot
            'textarea[placeholder*="Message"]',            // Grok
            'textarea.chat-input',                         // DeepSeek
            'div[contenteditable="true"]'                  // Fallback genérico
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && this.isVisible(element)) {
                return element;
            }
        }

        return null;
    },

    /**
     * Check if element is visible
     */
    isVisible(element) {
        return element.offsetWidth > 0 && element.offsetHeight > 0;
    },

    /**
     * Create drop indicator
     */
    createDropIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'nodus-drop-indicator';
        indicator.className = 'nodus-drop-indicator';
        indicator.style.display = 'none';
        indicator.innerHTML = `
            <div class="indicator-icon">📁</div>
            <div class="indicator-text">Solte aqui para usar os arquivos</div>
        `;
        document.body.appendChild(indicator);
        this.indicatorElement = indicator;
    },

    /**
     * Show drop indicator
     */
    showDropIndicator() {
        if (this.indicatorElement) {
            this.indicatorElement.style.display = 'flex';
        }
    },

    /**
     * Hide drop indicator
     */
    hideDropIndicator() {
        if (this.indicatorElement) {
            this.indicatorElement.style.display = 'none';
        }
    },

    /**
     * Handle drop event
     */
    async handleDrop(files) {
        console.log('[DropHandler] Files dropped:', files.length);
        console.log('[DropHandler] ⚠️ Fallback mode - ChatGPT não aceitou Files');
        console.log('[DropHandler] Tentando injetar como texto...');
        this.currentFiles = files;
        
        // Injetar como texto (fallback)
        await this.injectAsText();
    },

    /**
     * Create drop modal HTML
     */
    createDropModal() {
        const modal = document.createElement('div');
        modal.id = 'nodus-drop-modal';
        modal.className = 'nodus-drop-modal';
        modal.style.display = 'none';
        
        modal.innerHTML = `
            <div class="nodus-drop-overlay"></div>
            <div class="nodus-drop-content">
                <div class="nodus-drop-header">
                    <h3>📎 Como usar estes arquivos?</h3>
                    <button class="nodus-drop-close" id="nodusDropClose">✕</button>
                </div>
                
                <div class="nodus-drop-body">
                    <div class="nodus-drop-option" id="nodusDropInjectText">
                        <div class="option-icon">⚡</div>
                        <div class="option-content">
                            <div class="option-title">Injetar como Texto</div>
                            <div class="option-desc">Cola conteúdo formatado no chat</div>
                        </div>
                    </div>
                    
                    <div class="nodus-drop-option" id="nodusDropCopyClipboard">
                        <div class="option-icon">📋</div>
                        <div class="option-content">
                            <div class="option-title">Copiar para Clipboard</div>
                            <div class="option-desc">Cole manualmente depois</div>
                        </div>
                    </div>
                    
                    <div class="nodus-drop-option" id="nodusDropInjectInfo">
                        <div class="option-icon">📎</div>
                        <div class="option-content">
                            <div class="option-title">Info dos Arquivos</div>
                            <div class="option-desc">Lista nome e tamanho apenas</div>
                        </div>
                    </div>
                </div>
                
                <div class="nodus-drop-files">
                    <strong>Arquivos selecionados:</strong>
                    <div id="nodus-drop-files-list"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.modalElement = modal;

        // Event listeners
        modal.querySelector('.nodus-drop-overlay').addEventListener('click', () => this.closeModal());
        modal.querySelector('#nodusDropClose').addEventListener('click', () => this.closeModal());
        modal.querySelector('#nodusDropInjectText').addEventListener('click', () => this.injectAsText());
        modal.querySelector('#nodusDropCopyClipboard').addEventListener('click', () => this.copyToClipboard());
        modal.querySelector('#nodusDropInjectInfo').addEventListener('click', () => this.injectInfo());
    },

    /**
     * Show drop modal
     */
    showDropModal() {
        if (!this.modalElement) return;
        
        // Renderizar lista de arquivos
        const filesList = this.modalElement.querySelector('#nodus-drop-files-list');
        filesList.innerHTML = this.currentFiles.map(f => `
            <div class="file-item">
                ${this.getFileIcon(f.fileType)} ${f.fileName} <span class="file-size">(${f.fileSize})</span>
            </div>
        `).join('');
        
        this.modalElement.style.display = 'flex';
    },

    /**
     * Close modal
     */
    closeModal() {
        if (this.modalElement) {
            this.modalElement.style.display = 'none';
        }
        this.currentFiles = [];
    },

    /**
     * Inject as text (OPÇÃO 1)
     */
    async injectAsText() {
        try {
            console.log('[DropHandler] Injecting as text...');
            
            let text = `📎 Arquivos Anexados (${this.currentFiles.length}):\n\n`;
            
            for (const file of this.currentFiles) {
                text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                text += `📄 ${file.fileName} (${file.fileSize})\n`;
                text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                
                // Se for arquivo de texto, tentar ler conteúdo
                if (window.NodusAttachmentsDB && window.NodusAttachmentsDB.isTextFile(file.fileType)) {
                    try {
                        const content = await window.NodusAttachmentsDB.getFileAsText(file.id);
                        text += `\`\`\`\n${content}\n\`\`\`\n\n`;
                    } catch (error) {
                        text += `[Erro ao ler conteúdo: ${error.message}]\n\n`;
                    }
                } else {
                    text += `[Arquivo binário - tipo: ${file.fileType}]\n`;
                    text += `[Conteúdo não pode ser exibido como texto]\n\n`;
                }
            }
            
            // Injetar no textarea
            this.injectTextIntoTextarea(text);
            this.closeModal();
            this.showToast('✅ Arquivos injetados como texto!', 'success');
            
        } catch (error) {
            console.error('[DropHandler] Error injecting text:', error);
            this.showToast('❌ Erro ao injetar arquivos', 'error');
        }
    },

    /**
     * Copy to clipboard (OPÇÃO 2)
     */
    async copyToClipboard() {
        try {
            console.log('[DropHandler] Copying to clipboard...');
            
            let text = `📎 Arquivos (${this.currentFiles.length}):\n\n`;
            
            for (const file of this.currentFiles) {
                text += `• ${file.fileName} (${file.fileSize})\n`;
                text += `  Tipo: ${file.fileType || 'desconhecido'}\n\n`;
            }
            
            await navigator.clipboard.writeText(text);
            this.closeModal();
            this.showToast('✅ Lista copiada para clipboard!', 'success');
            
        } catch (error) {
            console.error('[DropHandler] Error copying:', error);
            this.showToast('❌ Erro ao copiar', 'error');
        }
    },

    /**
     * Inject file info only (OPÇÃO 3)
     */
    async injectInfo() {
        try {
            console.log('[DropHandler] Injecting file info...');
            
            let text = `📎 Arquivos (${this.currentFiles.length}):\n`;
            
            for (let i = 0; i < this.currentFiles.length; i++) {
                const file = this.currentFiles[i];
                text += `${i + 1}. ${file.fileName} (${file.fileSize})\n`;
            }
            
            this.injectTextIntoTextarea(text);
            this.closeModal();
            this.showToast('✅ Info dos arquivos injetada!', 'success');
            
        } catch (error) {
            console.error('[DropHandler] Error injecting info:', error);
            this.showToast('❌ Erro ao injetar info', 'error');
        }
    },

    /**
     * Inject text into platform textarea
     */
    injectTextIntoTextarea(text) {
        const textarea = this.getPlatformTextarea();
        if (!textarea) {
            console.error('[DropHandler] Textarea not found');
            this.showToast('❌ Área de texto não encontrada', 'error');
            return;
        }

        console.log('[DropHandler] Injecting into:', textarea.tagName);

        // Método 1: TEXTAREA normal
        if (textarea.tagName === 'TEXTAREA') {
            const currentValue = textarea.value;
            textarea.value = currentValue + (currentValue ? '\n\n' : '') + text;
            
            // Disparar eventos para a plataforma detectar
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.focus();
        }
        // Método 2: ContentEditable (Claude, alguns outros)
        else if (textarea.isContentEditable) {
            const currentText = textarea.textContent;
            textarea.textContent = currentText + (currentText ? '\n\n' : '') + text;
            
            // Disparar eventos
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.focus();
            
            // Mover cursor para o final
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(textarea);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        console.log('[DropHandler] Text injected successfully');
    },

    /**
     * Get file icon
     */
    getFileIcon(fileType) {
        if (!fileType) return '📎';
        
        const type = fileType.toLowerCase();
        
        if (type.includes('pdf')) return '📄';
        if (type.includes('image')) return '🖼️';
        if (type.includes('spreadsheet') || type.includes('excel') || type.includes('xlsx')) return '📊';
        if (type.includes('presentation') || type.includes('powerpoint') || type.includes('pptx')) return '📽️';
        if (type.includes('video')) return '🎬';
        if (type.includes('audio')) return '🎵';
        if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return '📦';
        if (type.includes('text')) return '📝';
        if (type.includes('code') || type.includes('javascript') || type.includes('python')) return '💻';
        
        return '📎';
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        // Usar sistema de toast existente do NODUS
        if (window.NodusUI && window.NodusUI.showToast) {
            window.NodusUI.showToast(message, type);
        } else {
            // Fallback: criar toast simples
            const toast = document.createElement('div');
            toast.className = 'nodus-drop-toast';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'success' ? '#10b981' : '#dc2626'};
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                z-index: 1000003;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideUpFade 0.3s ease-out;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
};

// Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Pequeno delay para garantir que outros módulos carregaram
        setTimeout(() => NodusDropHandler.init(), 500);
    });
} else {
    setTimeout(() => NodusDropHandler.init(), 500);
}

// Export
window.NodusDropHandler = NodusDropHandler;
