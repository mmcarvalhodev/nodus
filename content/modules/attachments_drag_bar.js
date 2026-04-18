/**
 * NODUS Attachments Drag Bar
 * Floating bar that appears when user selects attachments for dragging
 * Version: 1.0.0
 */

const NodusAttachmentsDragBar = {
    selectedFiles: [],
    dragBarElement: null,
    isVisible: false,

    /**
     * Initialize drag bar
     */
    init() {
        this.createDragBar();
        this.setupDragBarEvents();
    },

    /**
     * Create drag bar HTML element
     */
    createDragBar() {
        // Remove existing if any
        const existing = document.getElementById('nodus-attachments-drag-bar');
        if (existing) {
            existing.remove();
        }

        const dragBar = document.createElement('div');
        dragBar.id = 'nodus-attachments-drag-bar';
        dragBar.className = 'nodus-drag-bar';
        dragBar.draggable = true;
        
        dragBar.innerHTML = `
            <div class="drag-bar-header">
                <div class="drag-bar-title">📎 Arrastar</div>
                <div class="drag-bar-count" id="nodus-drag-bar-count">0 arquivo(s)</div>
            </div>
            <div class="drag-bar-files" id="nodus-drag-bar-files"></div>
        `;

        document.body.appendChild(dragBar);
        this.dragBarElement = dragBar;
        
    },

    /**
     * Setup drag bar events
     */
    setupDragBarEvents() {
        if (!this.dragBarElement) return;

        this.dragBarElement.addEventListener('dragstart', (e) => {
            this.dragBarElement.classList.add('dragging');
            
            // Remover blur do overlay
            document.body.classList.add('nodus-dragging');
            const overlay = document.getElementById('nodus-dashboard-overlay');
            if (overlay) {
                overlay.classList.add('dragging');
            }
            
            // Set data for drag
            e.dataTransfer.effectAllowed = 'copy';
            
            // Usar arquivos pré-carregados
            if (this.loadedFiles && this.loadedFiles.length > 0) {
                
                try {
                    for (const file of this.loadedFiles) {
                        e.dataTransfer.items.add(file);
                    }
                    
                } catch (error) {
                    console.error('[DragBar] Error adding files:', error);
                    
                    // Fallback: usar JSON
                    e.dataTransfer.setData('application/x-nodus-attachments', JSON.stringify({
                        files: this.selectedFiles,
                        source: 'nodus-attachments'
                    }));
                }
            } else {
                console.warn('[DragBar] ⚠️ No preloaded files, using JSON fallback');
                // Fallback: usar JSON
                e.dataTransfer.setData('application/x-nodus-attachments', JSON.stringify({
                    files: this.selectedFiles,
                    source: 'nodus-attachments'
                }));
            }
        });

        this.dragBarElement.addEventListener('dragend', (e) => {
            this.dragBarElement.classList.remove('dragging');
            
            // Restaurar blur
            document.body.classList.remove('nodus-dragging');
            const overlay = document.getElementById('nodus-dashboard-overlay');
            if (overlay) {
                overlay.classList.remove('dragging');
            }
            
            // Esconder drag bar após drag
            setTimeout(() => {
                this.hide();
            }, 300);
        });
    },

    /**
     * Update selected files
     */
    updateSelection(files) {
        this.selectedFiles = files;
        
        // Pré-carregar arquivos do DB para ter prontos no drag
        this.preloadFiles(files);
        
        if (files.length > 0) {
            this.show();
            this.render();
        } else {
            this.hide();
        }
    },
    
    /**
     * Preload files from DB
     */
    async preloadFiles(files) {
        this.loadedFiles = [];
        
        if (window.NodusAttachmentsDB) {
            try {
                for (const fileInfo of files) {
                    const fileData = await window.NodusAttachmentsDB.getFile(fileInfo.id);
                    
                    if (fileData && fileData.fileData) {
                        
                        // Converter ArrayBuffer para Blob
                        const blob = new Blob([fileData.fileData], { type: fileInfo.fileType });
                        
                        // Criar File object MAIS REALISTA
                        const file = new File([blob], fileInfo.fileName, {
                            type: fileInfo.fileType,
                            lastModified: Date.now() - Math.floor(Math.random() * 86400000) // Últimas 24h
                        });
                        
                        this.loadedFiles.push(file);
                    } else {
                        console.warn('[DragBar] ❌ No fileData for file:', fileInfo.fileName);
                    }
                }
                
            } catch (error) {
                console.error('[DragBar] Error preloading files:', error);
            }
        } else {
            console.error('[DragBar] ❌ NodusAttachmentsDB not available!');
        }
    },

    /**
     * Render drag bar content
     */
    render() {
        const filesContainer = document.getElementById('nodus-drag-bar-files');
        const countElement = document.getElementById('nodus-drag-bar-count');
        
        if (!filesContainer || !countElement) {
            console.error('[DragBar] Elements not found');
            return;
        }

        // Render thumbs com ícones e nomes
        const thumbs = this.selectedFiles.slice(0, 3).map(file => {
            const icon = this.getFileIcon(file.fileType || file.type || 'application/octet-stream');
            const name = (file.fileName || file.name || 'file').split('.')[0];
            const shortName = name.length > 15 ? name.substring(0, 15) + '...' : name;
            
            return `
                <div class="drag-bar-thumb">
                    <span class="drag-bar-icon">${icon}</span>
                    <span class="drag-bar-filename">${shortName}</span>
                </div>
            `;
        }).join('');
        
        const extra = this.selectedFiles.length > 3 ? 
            `<div class="drag-bar-extra">+${this.selectedFiles.length - 3}</div>` : '';
        
        filesContainer.innerHTML = thumbs + extra;
        
        // Update count
        const count = this.selectedFiles.length;
        countElement.textContent = `${count} arquivo(s)`;
        
    },

    /**
     * Show drag bar
     */
    show() {
        if (!this.dragBarElement) return;
        
        this.dragBarElement.classList.add('visible');
        this.isVisible = true;
    },

    /**
     * Hide drag bar
     */
    hide() {
        if (!this.dragBarElement) return;
        
        this.dragBarElement.classList.remove('visible');
        this.isVisible = false;
    },

    /**
     * Clear selection
     */
    clear() {
        this.selectedFiles = [];
        this.hide();
    },

    /**
     * Get file icon based on type
     */
    getFileIcon(fileType) {
        if (!fileType) return '📎';
        
        const type = fileType.toLowerCase();
        
        if (type.includes('pdf')) return '📄';
        if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('svg')) return '🖼️';
        if (type.includes('spreadsheet') || type.includes('excel') || type.includes('xlsx') || type.includes('csv')) return '📊';
        if (type.includes('presentation') || type.includes('powerpoint') || type.includes('pptx')) return '📽️';
        if (type.includes('video') || type.includes('mp4') || type.includes('mov')) return '🎬';
        if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) return '🎵';
        if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('gz')) return '📦';
        if (type.includes('text') || type.includes('txt') || type.includes('md')) return '📝';
        if (type.includes('code') || type.includes('javascript') || type.includes('python') || type.includes('java')) return '💻';
        
        return '📎';
    },

    /**
     * Destroy drag bar
     */
    destroy() {
        if (this.dragBarElement) {
            this.dragBarElement.remove();
            this.dragBarElement = null;
        }
        this.selectedFiles = [];
        this.isVisible = false;
    }
};

// Export
window.NodusAttachmentsDragBar = NodusAttachmentsDragBar;
