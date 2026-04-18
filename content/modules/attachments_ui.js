/**
 * NODUS Attachments UI Module
 * Manages attachment modal and UI interactions
 * Version: 1.0.0
 */

const NodusAttachmentsUI = {
    currentIdeaId: null,
    currentQueue: null,

    /**
     * Open attachments modal for an idea
     */
    async open(ideaId, queueName) {
        
        this.currentIdeaId = ideaId;
        this.currentQueue = queueName;

        // Load idea data
        const idea = await this.getIdea(ideaId, queueName);
        
        if (!idea) {
            console.error('[AttachmentsUI] Idea not found:', ideaId);
            if (window.NODUS_UI) { window.NODUS_UI.showToast('Erro: Ideia nao encontrada', 'error'); }
            return;
        }

        // Load attachments
        const attachments = await window.NodusAttachmentsDB.getAttachmentsByIdeaId(ideaId);

        // Check for file detection alert
        const showAlert = idea.hasGeneratedFile && attachments.length === 0;

        // Render modal
        this.renderModal(idea, attachments, showAlert);
    },

    /**
     * Get idea from storage
     */
    async getIdea(ideaId, queueName) {
        const storageKey = `ideas_queue_${queueName}`;
        const data = await chrome.storage.local.get(storageKey);
        const queue = data[storageKey] || [];
        return queue.find(i => i.id === ideaId);
    },

    /**
     * Render attachments modal
     */
    renderModal(idea, attachments, showAlert) {
        
        // Remove existing modal
        const existing = document.getElementById('nodus-attachments-modal');
        if (existing) {
            existing.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'nodus-attachments-modal';
        modal.className = 'nodus-attachments-modal';
        
        // Adicionar estilo inline como fallback
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(0, 0, 0, 0.85) !important;
        `;
        
        modal.innerHTML = `
            <div class="nodus-attachments-overlay" onclick="window.NodusAttachmentsUI.close()"></div>
            <div class="nodus-attachments-content" style="
                position: relative;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                background: #1a1a1a;
                border: 2px solid #2a2a2a;
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
                z-index: 1000000;
            ">
                <div class="nodus-attachments-header">
                    <h3>📎 Attachments - ${this.escapeHtml(idea.title)}</h3>
                    <button class="nodus-attachments-close" onclick="window.NodusAttachmentsUI.close()">✕</button>
                </div>

                ${showAlert ? this.renderAlert() : ''}

                <div class="nodus-attachments-body">
                    <div class="nodus-attachments-list" id="nodus-attachments-list">
                        ${attachments.length === 0 ? this.renderEmptyState() : this.renderAttachmentsList(attachments)}
                    </div>

                    ${attachments.length > 0 ? `
                        <div class="nodus-drag-hint">
                            💡 <strong>Dica:</strong> Selecione arquivos clicando neles (borda azul), depois use os botões abaixo.
                        </div>
                        
                        <div class="nodus-attachments-main-actions">
                            <button class="nodus-action-btn primary" onclick="window.NodusAttachmentsUI.injectSelected()" id="nodus-inject-btn" disabled>
                                ⚡ Injetar no Chat (<span id="selected-count">0</span>)
                            </button>
                            <button class="nodus-action-btn secondary" onclick="window.NodusAttachmentsUI.copySelected()" id="nodus-copy-btn" disabled>
                                📋 Copiar Info
                            </button>
                            <button class="nodus-action-btn secondary" onclick="window.NodusAttachmentsUI.downloadSelected()" id="nodus-download-btn" disabled>
                                📥 Baixar (<span id="selected-download-count">0</span>)
                            </button>
                        </div>
                    ` : ''}

                    <div class="nodus-attachments-actions">
                        <input type="file" id="nodus-attachments-file-input" multiple style="display: none;">
                        <button class="nodus-attachments-add-btn" onclick="document.getElementById('nodus-attachments-file-input').click()">
                            📎 Add File
                        </button>
                    </div>

                    <div class="nodus-attachments-stats">
                        <span id="nodus-attachments-count">${attachments.length} file(s)</span>
                        <span id="nodus-attachments-size">${this.formatTotalSize(attachments)}</span>
                    </div>
                </div>
            </div>
            
            <!-- Drag Counter -->
            <div class="nodus-drag-counter" id="nodus-drag-counter">
                <span class="drag-counter-icon">📎</span>
                <span class="drag-counter-number" id="nodus-drag-counter-number">0</span>
                <span>arquivo(s)</span>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        this.setupEventListeners();

        // Animate in
        requestAnimationFrame(() => {
            modal.classList.add('visible');
        });
        
    },

    /**
     * Render file detection alert
     */
    renderAlert() {
        return `
            <div class="nodus-file-detection-alert" id="nodus-file-alert">
                <div class="alert-content">
                    <span>⚠️</span>
                    <span>Arquivo detectado nesta resposta</span>
                </div>
                <div class="alert-actions">
                    <button class="alert-btn" onclick="window.NodusAttachmentsUI.dismissAlert()">✓ OK, entendi</button>
                    <button class="alert-btn" onclick="window.NodusAttachmentsUI.disableAlerts()">⚙️</button>
                </div>
            </div>
        `;
    },

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="nodus-attachments-empty">
                <div class="empty-icon">📭</div>
                <div class="empty-text">Nenhum arquivo anexado</div>
            </div>
        `;
    },

    /**
     * Render attachments list
     */
    renderAttachmentsList(attachments) {
        return attachments.map(att => {
            const typeClass = this.getFileTypeClass(att.fileType);
            const icon = this.getFileIcon(att.fileType);
            
            return `
            <div class="nodus-attachment-item" 
                 data-attachment-id="${att.id}"
                 data-file-name="${this.escapeHtml(att.fileName)}"
                 data-file-size="${att.fileSize}"
                 data-file-type="${att.fileType}"
                 draggable="true">
                <div class="attachment-checkbox">
                    <span class="checkbox-icon">☐</span>
                    <span class="checkbox-icon-checked">☑</span>
                </div>
                <div class="attachment-thumb ${typeClass}">
                    ${icon}
                </div>
                <div class="attachment-info">
                    <div class="attachment-details">
                        <div class="attachment-name">${this.escapeHtml(att.fileName)}</div>
                        <div class="attachment-meta">
                            <span class="attachment-size">${this.formatFileSize(att.fileSize)}</span>
                            <span>•</span>
                            <span class="attachment-date">${this.formatDate(att.uploadedAt)}</span>
                        </div>
                    </div>
                </div>
                <div class="attachment-actions">
                    <button class="attachment-btn" onclick="window.NodusAttachmentsUI.downloadFile('${att.id}')">
                        📥
                    </button>
                    <button class="attachment-btn delete" onclick="window.NodusAttachmentsUI.deleteFile('${att.id}')">
                        🗑️
                    </button>
                </div>
            </div>
        `}).join('');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const fileInput = document.getElementById('nodus-attachments-file-input');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // ESC to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Setup drag-and-drop
        this.setupDragAndDrop();
    },

    /**
     * Setup drag-and-drop functionality
     */
    setupDragAndDrop() {
        
        // Initialize drag bar
        if (window.NodusAttachmentsDragBar) {
            window.NodusAttachmentsDragBar.init();
        }

        const items = document.querySelectorAll('.nodus-attachment-item[draggable="true"]');
        
        items.forEach((item, index) => {
            
            // Click to select (IMPORTANTE!)
            item.addEventListener('click', (e) => {
                
                // Ignorar se clicou em botão de ação
                if (e.target.closest('.attachment-btn')) {
                    return;
                }
                
                // Toggle seleção
                item.classList.toggle('selected');
                
                // Atualizar drag bar e botões
                this.updateDragBarSelection();
            });

            // Drag start
            item.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
            
            // Drag end
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    },

    /**
     * Update drag bar with selected files
     */
    updateDragBarSelection() {
        const selectedItems = document.querySelectorAll('.nodus-attachment-item.selected');
        const selectedFiles = Array.from(selectedItems).map(item => ({
            id: item.dataset.attachmentId,
            fileName: item.dataset.fileName,
            fileSize: item.dataset.fileSize,
            fileType: item.dataset.fileType
        }));

        // Update drag bar
        if (window.NodusAttachmentsDragBar) {
            window.NodusAttachmentsDragBar.updateSelection(selectedFiles);
        }

        // Update action buttons
        const injectBtn = document.getElementById('nodus-inject-btn');
        const copyBtn = document.getElementById('nodus-copy-btn');
        const downloadBtn = document.getElementById('nodus-download-btn');
        const selectedCount = document.getElementById('selected-count');
        const selectedDownloadCount = document.getElementById('selected-download-count');

        const count = selectedFiles.length;

        if (count > 0) {
            if (injectBtn) {
                injectBtn.disabled = false;
                injectBtn.classList.add('active');
            }
            if (copyBtn) {
                copyBtn.disabled = false;
                copyBtn.classList.add('active');
            }
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.classList.add('active');
            }
            if (selectedCount) selectedCount.textContent = count;
            if (selectedDownloadCount) selectedDownloadCount.textContent = count;
        } else {
            if (injectBtn) {
                injectBtn.disabled = true;
                injectBtn.classList.remove('active');
            }
            if (copyBtn) {
                copyBtn.disabled = true;
                copyBtn.classList.remove('active');
            }
            if (downloadBtn) {
                downloadBtn.disabled = true;
                downloadBtn.classList.remove('active');
            }
            if (selectedCount) selectedCount.textContent = '0';
            if (selectedDownloadCount) selectedDownloadCount.textContent = '0';
        }

    },

    /**
     * Handle drag start
     */
    handleDragStart(e, item) {
        item.classList.add('dragging');
        
        const selectedItems = document.querySelectorAll('.nodus-attachment-item.selected');
        let draggedFiles = [];
        
        if (selectedItems.length > 0 && item.classList.contains('selected')) {
            // Arrasta múltiplos selecionados
            draggedFiles = Array.from(selectedItems).map(i => ({
                id: i.dataset.attachmentId,
                name: i.dataset.fileName,
                size: parseInt(i.dataset.fileSize),
                type: i.dataset.fileType
            }));
        } else {
            // Arrasta apenas este
            draggedFiles = [{
                id: item.dataset.attachmentId,
                name: item.dataset.fileName,
                size: parseInt(item.dataset.fileSize),
                type: item.dataset.fileType
            }];
        }
        
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify(draggedFiles));
        
        
        // Mostrar contador visual se múltiplos
        if (draggedFiles.length > 1) {
            const counter = document.getElementById('nodus-drag-counter');
            const counterNumber = document.getElementById('nodus-drag-counter-number');
            
            if (counter && counterNumber) {
                counterNumber.textContent = draggedFiles.length;
                counter.classList.add('active');
                
                // Seguir cursor
                const updatePosition = (event) => {
                    counter.style.left = (event.clientX + 15) + 'px';
                    counter.style.top = (event.clientY + 15) + 'px';
                };
                
                updatePosition(e);
                document.addEventListener('dragover', updatePosition);
                counter._dragoverHandler = updatePosition;
            }
        }
    },

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        document.querySelectorAll('.nodus-attachment-item.dragging').forEach(item => {
            item.classList.remove('dragging');
        });
        
        // Esconder contador
        const counter = document.getElementById('nodus-drag-counter');
        if (counter) {
            counter.classList.remove('active');
            if (counter._dragoverHandler) {
                document.removeEventListener('dragover', counter._dragoverHandler);
                counter._dragoverHandler = null;
            }
        }
    },

    /**
     * Handle file selection
     */
    async handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        for (const file of files) {
            await this.addFile(file);
        }

        // Reset input
        e.target.value = '';

        if (window.NODUS_UI) {
            window.NODUS_UI.showToast(`📎 ${files.length} arquivo(s) adicionado(s)`, 'success');
        }
    },

    /**
     * Add file to idea
     */
    async addFile(file) {
        try {
            // Add to IndexedDB (já valida tamanho internamente)
            const attachment = await window.NodusAttachmentsDB.addFile(this.currentIdeaId, file);

            // Update idea in storage (mark as having attachments)
            await this.updateIdeaAttachmentStatus(true);

            // Refresh modal
            await this.refresh();

            
            return attachment;
        } catch (error) {
            console.error('[AttachmentsUI] Error adding file:', error);
            
            // Mensagens de erro específicas
            let errorMessage = 'Erro ao adicionar arquivo';
            if (error.message.includes('excede o limite')) {
                errorMessage = error.message;
            } else if (error.message.includes('Limite de')) {
                errorMessage = error.message;
            } else if (error.message.includes('armazenamento atingido')) {
                errorMessage = 'Espaço de armazenamento cheio (500MB)';
            }
            
            if (window.NODUS_UI) {
                window.NODUS_UI.showToast(errorMessage, 'error');
            }
            
            throw error;
        }
    },

    /**
     * Download file
     */
    async downloadFile(attachmentId) {
        try {
            await window.NodusAttachmentsDB.downloadFile(attachmentId);
            
            if (window.NODUS_UI) {
                window.NODUS_UI.showToast('📥 Download iniciado', 'success');
            }
        } catch (error) {
            console.error('[AttachmentsUI] Download error:', error);
            if (window.NODUS_UI) {
                window.NODUS_UI.showToast('Erro no download', 'error');
            }
        }
    },

    /**
     * Delete file
     */
    async deleteFile(attachmentId) {
        if (!confirm('Remover este arquivo?')) return;

        try {
            await window.NodusAttachmentsDB.deleteFile(attachmentId);

            // Check if there are any attachments left
            const remaining = await window.NodusAttachmentsDB.getAttachmentsByIdeaId(this.currentIdeaId);
            if (remaining.length === 0) {
                await this.updateIdeaAttachmentStatus(false);
            }

            // Refresh modal
            await this.refresh();

            if (window.NODUS_UI) {
                window.NODUS_UI.showToast('🗑️ Arquivo removido', 'success');
            }
        } catch (error) {
            console.error('[AttachmentsUI] Delete error:', error);
            if (window.NODUS_UI) {
                window.NODUS_UI.showToast('Erro ao remover arquivo', 'error');
            }
        }
    },

    /**
     * Update idea's attachment status in storage
     */
    async updateIdeaAttachmentStatus(hasAttachments) {
        const storageKey = `ideas_queue_${this.currentQueue}`;
        const data = await chrome.storage.local.get(storageKey);
        const queue = data[storageKey] || [];
        
        const ideaIndex = queue.findIndex(i => i.id === this.currentIdeaId);
        if (ideaIndex !== -1) {
            queue[ideaIndex].hasAttachment = hasAttachments;
            
            // Remove file detection alert if files were added
            if (hasAttachments) {
                queue[ideaIndex].hasGeneratedFile = false;
            }
            
            await chrome.storage.local.set({ [storageKey]: queue });
            
            // Disparar evento para atualizar dashboard
            window.dispatchEvent(new CustomEvent('nodus-attachment-updated', {
                detail: {
                    ideaId: this.currentIdeaId,
                    action: hasAttachments ? 'added' : 'removed'
                }
            }));
        }
    },

    /**
     * Dismiss alert
     */
    async dismissAlert() {
        const alert = document.getElementById('nodus-file-alert');
        if (alert) {
            alert.style.display = 'none';
        }

        // Update idea to remove alert
        const storageKey = `ideas_queue_${this.currentQueue}`;
        const data = await chrome.storage.local.get(storageKey);
        const queue = data[storageKey] || [];
        
        const ideaIndex = queue.findIndex(i => i.id === this.currentIdeaId);
        if (ideaIndex !== -1) {
            queue[ideaIndex].hasGeneratedFile = false;
            await chrome.storage.local.set({ [storageKey]: queue });
        }

        if (window.NODUS_UI) {
            window.NODUS_UI.showToast('✓ Alerta dispensado', 'success');
        }
    },

    /**
     * Disable alerts globally
     */
    async disableAlerts() {
        const settings = await chrome.storage.local.get('settings');
        const currentSettings = settings.settings || {};
        
        currentSettings.showFileDetectionAlert = false;
        await chrome.storage.local.set({ settings: currentSettings });

        if (window.NODUS_UI) {
            window.NODUS_UI.showToast('🔕 Alertas desabilitados', 'success');
        }

        this.close();
    },

    /**
     * Refresh modal content
     */
    async refresh() {
        const idea = await this.getIdea(this.currentIdeaId, this.currentQueue);
        const attachments = await window.NodusAttachmentsDB.getAttachmentsByIdeaId(this.currentIdeaId);
        const showAlert = idea.hasGeneratedFile && attachments.length === 0;

        const list = document.getElementById('nodus-attachments-list');
        const count = document.getElementById('nodus-attachments-count');
        const size = document.getElementById('nodus-attachments-size');
        const alert = document.getElementById('nodus-file-alert');

        if (list) {
            list.innerHTML = attachments.length === 0 
                ? this.renderEmptyState() 
                : this.renderAttachmentsList(attachments);
        }

        if (count) count.textContent = `${attachments.length} file(s)`;
        if (size) size.textContent = this.formatTotalSize(attachments);

        // Update alert visibility
        if (alert) {
            alert.style.display = showAlert ? 'flex' : 'none';
        }
    },

    /**
     * Close modal
     */
    close() {
        const modal = document.getElementById('nodus-attachments-modal');
        if (modal) {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 300);
        }
        
        // Clear drag bar
        if (window.NodusAttachmentsDragBar) {
            window.NodusAttachmentsDragBar.destroy();
        }
        
        // Refresh dashboard to update attachment counts
        if (window.NodusDashboardCards) {
            window.NodusDashboardCards.refreshGrid();
        }
    },

    /**
     * Get file icon based on MIME type
     */
    getFileIcon(mimeType) {
        if (!mimeType) return '📎';
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        if (mimeType.includes('image')) return '🖼️';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
        if (mimeType.includes('text')) return '📃';
        if (mimeType.includes('python')) return '🐍';
        if (mimeType.includes('javascript')) return '💻';
        if (mimeType.includes('json')) return '📊';
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return '📦';
        return '📎';
    },

    /**
     * Get file type class for thumbnail styling
     */
    getFileTypeClass(mimeType) {
        if (!mimeType) return 'type-generic';
        if (mimeType.includes('pdf')) return 'type-pdf';
        if (mimeType.includes('image')) return 'type-image';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'type-excel';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'type-powerpoint';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'type-word';
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return 'type-zip';
        return 'type-generic';
    },

    /**
     * Format date
     */
    formatDate(isoDate) {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        if (hours < 1) return 'Agora mesmo';
        if (hours < 24) return `${hours}h atrás`;
        if (hours < 48) return 'Ontem';
        
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    },

    /**
     * Format total size
     */
    formatTotalSize(attachments) {
        const total = attachments.reduce((sum, att) => sum + att.fileSize, 0);
        return this.formatFileSize(total);
    },

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Inject selected files into chat
     */
    async injectSelected() {
        const selected = this.getSelectedFiles();
        if (selected.length === 0) {
            if (window.NODUS_UI) { window.NODUS_UI.showToast('Selecione pelo menos um arquivo!', 'warning'); }
            return;
        }


        try {
            // Usar drop handler para injetar
            if (window.NodusDropHandler) {
                window.NodusDropHandler.currentFiles = selected;
                await window.NodusDropHandler.injectAsText();
                this.close();
            } else {
                if (window.NODUS_UI) { window.NODUS_UI.showToast('Drop handler não disponível', 'error'); }
            }
        } catch (error) {
            console.error('[AttachmentsUI] Error injecting:', error);
            if (window.NODUS_UI) { window.NODUS_UI.showToast('Erro ao injetar arquivos', 'error'); }
        }
    },

    /**
     * Copy selected files info to clipboard
     */
    async copySelected() {
        const selected = this.getSelectedFiles();
        if (selected.length === 0) {
            if (window.NODUS_UI) { window.NODUS_UI.showToast('Selecione pelo menos um arquivo!', 'warning'); }
            return;
        }


        try {
            let text = `📎 Arquivos (${selected.length}):\n\n`;
            
            for (const file of selected) {
                text += `• ${file.fileName} (${file.fileSize})\n`;
            }
            
            await navigator.clipboard.writeText(text);
            this.showToast('✅ Info copiada para clipboard!');
        } catch (error) {
            console.error('[AttachmentsUI] Error copying:', error);
            if (window.NODUS_UI) { window.NODUS_UI.showToast('Erro ao copiar', 'error'); }
        }
    },

    /**
     * Download selected files
     */
    async downloadSelected() {
        const selected = this.getSelectedFiles();
        if (selected.length === 0) {
            if (window.NODUS_UI) { window.NODUS_UI.showToast('Selecione pelo menos um arquivo!', 'warning'); }
            return;
        }


        for (const file of selected) {
            try {
                await window.NodusAttachmentsDB.downloadFile(file.id);
            } catch (error) {
                console.error('[AttachmentsUI] Error downloading:', file.fileName, error);
            }
        }

        this.showToast(`✅ ${selected.length} arquivo(s) baixado(s)!`);
    },

    /**
     * Get selected files
     */
    getSelectedFiles() {
        const selectedItems = document.querySelectorAll('.nodus-attachment-item.selected');
        return Array.from(selectedItems).map(item => ({
            id: item.dataset.attachmentId,
            fileName: item.dataset.fileName,
            fileSize: item.dataset.fileSize,
            fileType: item.dataset.fileType
        }));
    },

    /**
     * Show toast notification
     */
    showToast(message) {
        if (window.NodusUI && window.NodusUI.showToast) {
            window.NodusUI.showToast(message, 'success');
        } else {
            // Fallback simples
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #10b981;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                z-index: 1000003;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
};

// Export to global scope
window.NodusAttachmentsUI = NodusAttachmentsUI;
