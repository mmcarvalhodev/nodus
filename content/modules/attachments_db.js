/**
 * NODUS Attachments Database Module
 * Gerencia armazenamento de arquivos usando IndexedDB
 * Versão: 1.0.0
 */

const NodusAttachmentsDB = {
  DB_NAME: 'NodusAttachmentsDB',
  DB_VERSION: 1,
  STORE_NAME: 'attachments',
  db: null,
  
  // Limites de arquivo
  LIMITS: {
    MAX_FILE_SIZE: 50 * 1024 * 1024,  // 50MB
    MAX_FILES_PER_IDEA: 10,
    MAX_TOTAL_SIZE: 500 * 1024 * 1024 // 500MB total
  },

  /**
   * Inicializa o banco de dados IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('❌ [AttachmentsDB] Erro ao abrir DB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Cria object store se não existir
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          
          // Índices para busca eficiente
          objectStore.createIndex('ideaId', 'ideaId', { unique: false });
          objectStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          objectStore.createIndex('fileType', 'fileType', { unique: false });
          
        }
      };
    });
  },

  /**
   * Adiciona um arquivo ao banco
   * @param {string} ideaId - ID da ideia
   * @param {File} file - Arquivo a ser salvo
   * @returns {Promise<object>} Metadados do arquivo salvo
   */
  async addFile(ideaId, file) {
    if (!this.db) await this.init();

    // Validação de tamanho
    if (file.size > this.LIMITS.MAX_FILE_SIZE) {
      throw new Error(`Arquivo excede o limite de ${this.LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Verificar número de arquivos por ideia
    const existingFiles = await this.getAttachmentsByIdeaId(ideaId);
    if (existingFiles.length >= this.LIMITS.MAX_FILES_PER_IDEA) {
      throw new Error(`Limite de ${this.LIMITS.MAX_FILES_PER_IDEA} arquivos por ideia atingido`);
    }

    // Verificar tamanho total
    const storageInfo = await this.getStorageInfo();
    if (storageInfo.totalSize + file.size > this.LIMITS.MAX_TOTAL_SIZE) {
      throw new Error('Limite total de armazenamento atingido (500MB)');
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Converte File para ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        const attachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ideaId: ideaId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileData: arrayBuffer,
          uploadedAt: new Date().toISOString()
        };

        const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(this.STORE_NAME);
        const request = objectStore.add(attachment);

        request.onsuccess = () => {
          
          // Retorna metadados sem o fileData (para economizar memória)
          const metadata = { ...attachment };
          delete metadata.fileData;
          
          resolve(metadata);
        };

        request.onerror = () => {
          console.error('❌ [AttachmentsDB] Erro ao adicionar:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('❌ [AttachmentsDB] Erro no processamento:', error);
        reject(error);
      }
    });
  },

  /**
   * Salva um arquivo com chave customizada (put = insert ou update).
   * Usado para node images e chain attachments com chave conhecida.
   * @param {string} key  - Chave única (vira o `id` do registro)
   * @param {object} data - { fileData: ArrayBuffer|Uint8Array, fileType, fileName, originalUrl? }
   */
  async putFile(key, data) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const fd = data.fileData;
      const record = {
        id: key,
        ideaId: key,
        fileName: data.fileName || key,
        fileSize: fd ? (fd.byteLength || fd.length || 0) : 0,
        fileType: data.fileType || 'image/jpeg',
        fileData: fd instanceof Uint8Array ? fd.buffer : fd,
        uploadedAt: new Date().toISOString()
      };
      if (data.originalUrl) record.originalUrl = data.originalUrl;
      const request = objectStore.put(record);
      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Busca todos os attachments de uma ideia
   * @param {string} ideaId - ID da ideia
   * @returns {Promise<Array>} Array de metadados (sem fileData)
   */
  async getAttachmentsByIdeaId(ideaId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const index = objectStore.index('ideaId');
      const request = index.getAll(ideaId);

      request.onsuccess = () => {
        const attachments = request.result.map(att => {
          const metadata = { ...att };
          delete metadata.fileData; // Remove dados binários
          return metadata;
        });
        
        resolve(attachments);
      };

      request.onerror = () => {
        console.error('❌ [AttachmentsDB] Erro ao buscar:', request.error);
        reject(request.error);
      };
    });
  },

  /**
   * Busca um arquivo específico (com dados binários)
   * @param {string} attachmentId - ID do attachment
   * @returns {Promise<object>} Attachment completo
   */
  async getFile(attachmentId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.get(attachmentId);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          reject(new Error('Arquivo não encontrado'));
        }
      };

      request.onerror = () => {
        console.error('❌ [AttachmentsDB] Erro ao recuperar:', request.error);
        reject(request.error);
      };
    });
  },

  /**
   * Remove um attachment
   * @param {string} attachmentId - ID do attachment
   * @returns {Promise<void>}
   */
  async deleteFile(attachmentId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.delete(attachmentId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('❌ [AttachmentsDB] Erro ao remover:', request.error);
        reject(request.error);
      };
    });
  },

  /**
   * Remove todos os attachments de uma ideia
   * @param {string} ideaId - ID da ideia
   * @returns {Promise<number>} Quantidade de arquivos removidos
   */
  async deleteAllByIdeaId(ideaId) {
    if (!this.db) await this.init();

    const attachments = await this.getAttachmentsByIdeaId(ideaId);
    
    const deletePromises = attachments.map(att => this.deleteFile(att.id));
    await Promise.all(deletePromises);
    
    return attachments.length;
  },

  /**
   * Faz download de um arquivo
   * @param {string} attachmentId - ID do attachment
   */
  async downloadFile(attachmentId) {
    try {
      const attachment = await this.getFile(attachmentId);
      
      // Converte ArrayBuffer para Blob
      const blob = new Blob([attachment.fileData], { type: attachment.fileType });
      
      // Cria URL temporária
      const url = URL.createObjectURL(blob);
      
      // Cria link temporário e clica
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      
      // Limpa
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('❌ [AttachmentsDB] Erro no download:', error);
      throw error;
    }
  },

  /**
   * Calcula espaço total usado
   * @returns {Promise<object>} { totalSize, totalFiles }
   */
  async getStorageInfo() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const attachments = request.result;
        const totalSize = attachments.reduce((sum, att) => sum + att.fileSize, 0);
        const totalFiles = attachments.length;
        
        
        resolve({
          totalSize,
          totalFiles,
          totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
        });
      };

      request.onerror = () => {
        console.error('❌ [AttachmentsDB] Erro ao calcular storage:', request.error);
        reject(request.error);
      };
    });
  },

  /**
   * Get file as Blob (for drop handler)
   * @param {string} attachmentId - ID do attachment
   * @returns {Promise<Blob>} Blob do arquivo
   */
  async getFileBlob(attachmentId) {
    try {
      
      const attachment = await this.getFile(attachmentId);
      
      if (!attachment) {
        throw new Error(`Attachment ${attachmentId} not found`);
      }
      
      if (!attachment.fileData) {
        throw new Error(`No file data for ${attachmentId}`);
      }
      
      // Criar blob a partir do ArrayBuffer
      const blob = new Blob([attachment.fileData], {
        type: attachment.fileType || 'application/octet-stream'
      });
      
      
      return blob;
    } catch (error) {
      console.error('❌ [AttachmentsDB] Error getting blob:', error);
      throw error;
    }
  },

  /**
   * Get file content as text (for text files)
   * @param {string} attachmentId - ID do attachment
   * @returns {Promise<string>} Conteúdo do arquivo como texto
   */
  async getFileAsText(attachmentId) {
    try {
      
      const blob = await this.getFileBlob(attachmentId);
      const text = await blob.text();
      
      
      return text;
    } catch (error) {
      console.error('❌ [AttachmentsDB] Error getting text:', error);
      return `[Erro ao ler arquivo: ${error.message}]`;
    }
  },

  /**
   * Check if file type is text
   * @param {string} fileType - MIME type
   * @returns {boolean}
   */
  isTextFile(fileType) {
    if (!fileType) return false;
    
    const textTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/x-sh',
      'application/x-python'
    ];
    
    return textTypes.some(type => fileType.includes(type));
  }
};

// Inicializa automaticamente quando o script carrega
(async () => {
  try {
    await NodusAttachmentsDB.init();
  } catch (err) {
    console.error('❌ [AttachmentsDB] Falha na inicialização:', err);
  }
})();

// Export para uso global
window.NodusAttachmentsDB = NodusAttachmentsDB;
