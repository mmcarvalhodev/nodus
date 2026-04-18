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
        this.setupGlobalDropZone();
        this.createDropModal();
        this.createDropIndicator();
    },

    /**
     * Setup drop zone on document
     */
    setupGlobalDropZone() {
        // Detectar quando drag do NODUS entra no documento
        document.addEventListener('dragenter', (e) => {
            // Verificar se é do NODUS drag bar
            if (e.dataTransfer.types.includes('application/x-nodus-attachments')) {
                this.showDropIndicator();
            }
        });

        // Highlight na textarea ao passar sobre ela
        document.addEventListener('dragover', (e) => {
            // Verificar se é do NODUS
            if (!e.dataTransfer.types.includes('application/x-nodus-attachments')) {
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
            
            // SEMPRE remover dragging ao soltar
            document.body.classList.remove('nodus-dragging');
            const overlay = document.getElementById('nodus-dashboard-overlay');
            if (overlay) {
                overlay.classList.remove('dragging');
            }
            this.hideDropIndicator();
            
            // Verificar se tem dados do NODUS
            const hasNodusData = e.dataTransfer.types.includes('application/x-nodus-attachments');
            
            // NOVA ABORDAGEM: Se tem dados do NODUS, carregar files e simular click no botão
            if (hasNodusData && e.dataTransfer.files.length === 0) {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    // Pegar dados do drag
                    const data = e.dataTransfer.getData('application/x-nodus-attachments');
                    
                    if (data) {
                        const parsed = JSON.parse(data);
                        
                        // Buscar TODOS os inputs de arquivo
                        const allFileInputs = document.querySelectorAll('input[type="file"]');
                        
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
                                break;
                            }
                        }
                        
                        if (!fileInput && allFileInputs.length > 0) {
                            fileInput = allFileInputs[0];
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
                                }
                            }
                            
                            if (loadedFiles.length > 0) {
                                
                                // Criar DataTransfer
                                const dt = new DataTransfer();
                                for (const file of loadedFiles) {
                                    dt.items.add(file);
                                }
                                
                                // Setar files
                                fileInput.files = dt.files;
                                
                                // Disparar TODOS os eventos possíveis
                                ['change', 'input'].forEach(eventType => {
                                    const event = new Event(eventType, { 
                                        bubbles: true, 
                                        cancelable: true,
                                        composed: true
                                    });
                                    fileInput.dispatchEvent(event);
                                });
                                
                                // Tentar InputEvent também
                                const inputEvent = new InputEvent('input', {
                                    bubbles: true,
                                    cancelable: true,
                                    composed: true
                                });
                                fileInput.dispatchEvent(inputEvent);
                                
                                return;
                            }
                        } else {
                            console.error('[DropHandler] ❌ No file input found!');
                        }
                    }
                } catch (error) {
                    console.error('[DropHandler] Error:', error);
                }
                
                return;
            }
            
            // Se tiver arquivos reais no dataTransfer
            if (e.dataTransfer.files.length > 0) {
                
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
                        return;
                    } catch (error) {
                        console.error('[DropHandler] Error:', error);
                    }
                }
            }
            
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
