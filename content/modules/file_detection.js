/**
 * NODUS File Detection Helper
 * Detecta quando uma resposta de IA contém arquivo gerado
 * Compatível com Chrome, Firefox, Edge
 * Version: 1.0.0
 */

const NodusFileDetection = {
    /**
     * Detecta se um elemento de resposta contém arquivo gerado
     * @param {HTMLElement} responseElement - Elemento contendo a resposta da IA
     * @returns {boolean} true se detectou arquivo
     */
    detectGeneratedFile(responseElement) {
        if (!responseElement) return false;

        try {
            // Método 1: Buscar atributo download
            const hasDownloadAttr = responseElement.querySelector('[download]');
            if (hasDownloadAttr) {
                return true;
            }

            // Método 2: Buscar classes/ids específicos de download
            const downloadClasses = [
                '.download-button',
                '.download-btn',
                '.btn-download',
                '#download-button',
                '.file-download'
            ];

            for (const selector of downloadClasses) {
                if (responseElement.querySelector(selector)) {
                    return true;
                }
            }

            // Método 3: Buscar texto "Download" em botões/links (compatível Firefox)
            const clickableElements = [
                ...responseElement.querySelectorAll('button'),
                ...responseElement.querySelectorAll('a')
            ];

            const hasDownloadText = clickableElements.some(el => {
                const text = el.textContent || el.innerText || '';
                return /download/i.test(text) || /baixar/i.test(text);
            });

            if (hasDownloadText) {
                return true;
            }

            // Método 4: Buscar ícones de download (emoji ou classes de ícones)
            const hasDownloadIcon = clickableElements.some(el => {
                const text = el.textContent || '';
                return text.includes('📥') || 
                       text.includes('⬇️') || 
                       text.includes('💾') ||
                       el.classList.contains('icon-download') ||
                       el.classList.contains('fa-download');
            });

            if (hasDownloadIcon) {
                return true;
            }

            // Método 5: Buscar links com blob: ou data:
            const links = responseElement.querySelectorAll('a[href]');
            const hasBlobUrl = Array.from(links).some(link => {
                const href = link.href || '';
                return href.startsWith('blob:') || href.startsWith('data:');
            });

            if (hasBlobUrl) {
                return true;
            }

            return false;
        } catch (error) {
            console.error('[FileDetection] Erro na detecção:', error);
            return false;
        }
    },

    /**
     * Detecta tipo de arquivo baseado no contexto
     * @param {HTMLElement} responseElement - Elemento contendo a resposta
     * @returns {string|null} Tipo detectado ou null
     */
    detectFileType(responseElement) {
        if (!responseElement) return null;

        const text = responseElement.textContent || responseElement.innerText || '';
        
        // Detectar extensões de arquivo mencionadas
        const extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.html': 'html',
            '.css': 'css',
            '.json': 'json',
            '.pdf': 'pdf',
            '.docx': 'document',
            '.xlsx': 'spreadsheet',
            '.csv': 'csv',
            '.md': 'markdown',
            '.txt': 'text'
        };

        for (const [ext, type] of Object.entries(extensions)) {
            if (text.toLowerCase().includes(ext)) {
                return type;
            }
        }

        // Detectar por contexto de código
        const codeBlocks = responseElement.querySelectorAll('pre, code');
        if (codeBlocks.length > 0) {
            return 'code';
        }

        return null;
    },

    /**
     * Extrai nome sugerido para o arquivo
     * @param {HTMLElement} responseElement - Elemento contendo a resposta
     * @returns {string} Nome sugerido
     */
    extractSuggestedFilename(responseElement) {
        if (!responseElement) return 'download';

        try {
            // Buscar atributo download com nome
            const downloadEl = responseElement.querySelector('[download]');
            if (downloadEl && downloadEl.getAttribute('download')) {
                const filename = downloadEl.getAttribute('download');
                if (filename && filename !== '' && filename !== 'true') {
                    return filename;
                }
            }

            // Buscar em texto próximo a botão de download
            const buttons = responseElement.querySelectorAll('button, a');
            for (const btn of buttons) {
                const text = btn.textContent || '';
                if (/download/i.test(text) || /baixar/i.test(text)) {
                    // Procurar nome de arquivo próximo
                    const parent = btn.parentElement;
                    if (parent) {
                        const match = parent.textContent.match(/[a-zA-Z0-9_-]+\.[a-z]{2,4}/);
                        if (match) {
                            return match[0];
                        }
                    }
                }
            }

            return 'download';
        } catch (error) {
            console.error('[FileDetection] Erro ao extrair filename:', error);
            return 'download';
        }
    }
};

// Export para uso global
window.NodusFileDetection = NodusFileDetection;
