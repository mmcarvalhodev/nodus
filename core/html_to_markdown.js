// ═══════════════════════════════════════════════════════════════
// NODUS - HTML to Markdown Parser v1.0
// ═══════════════════════════════════════════════════════════════
// Converte HTML capturado das AIs em Markdown estruturado
// Preserva: tabelas, code blocks, listas, headers, links, bold/italic
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  class HtmlToMarkdown {
    constructor() {
    }

    /**
     * Converte HTML para Markdown
     * @param {HTMLElement|string} input - Elemento HTML ou string HTML
     * @returns {string} Markdown formatado
     */
    convert(input) {
      let element;
      
      // Se for string, criar elemento temporário
      if (typeof input === 'string') {
        const temp = document.createElement('div');
        temp.innerHTML = input;
        element = temp;
      } else {
        element = input;
      }

      return this.processNode(element);
    }

    /**
     * Processa um nó recursivamente
     */
    processNode(node, depth = 0) {
      if (!node) return '';

      // Texto puro
      if (node.nodeType === Node.TEXT_NODE) {
        return this.escapeMarkdown(node.textContent);
      }

      // Elemento HTML
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        // Processar baseado no tipo de tag
        switch(tagName) {
          case 'h1': return this.heading(node, 1);
          case 'h2': return this.heading(node, 2);
          case 'h3': return this.heading(node, 3);
          case 'h4': return this.heading(node, 4);
          case 'h5': return this.heading(node, 5);
          case 'h6': return this.heading(node, 6);
          
          case 'p': return this.paragraph(node);
          case 'br': return '\n';
          case 'hr': return '\n---\n\n';
          
          case 'strong':
          case 'b': return this.bold(node);
          
          case 'em':
          case 'i': return this.italic(node);
          
          case 'code': return this.inlineCode(node);
          case 'pre': return this.codeBlock(node);
          
          case 'a': return this.link(node);
          case 'img': return this.image(node);
          
          case 'ul': return this.unorderedList(node, depth);
          case 'ol': return this.orderedList(node, depth);
          case 'li': return this.listItem(node, depth);
          
          case 'table': return this.table(node);
          
          case 'blockquote': return this.blockquote(node);
          
          // Ignorar scripts, styles
          case 'script':
          case 'style':
          case 'noscript':
            return '';
          
          // Tags genéricas: processar filhos
          default:
            return this.processChildren(node, depth);
        }
      }

      return '';
    }

    /**
     * Processa todos os filhos de um nó
     */
    processChildren(node, depth = 0) {
      let result = '';
      const children = Array.from(node.childNodes);
      
      for (const child of children) {
        result += this.processNode(child, depth);
      }
      
      return result;
    }

    /**
     * Escapa caracteres especiais do Markdown
     */
    escapeMarkdown(text) {
      if (!text) return '';
      
      // ✨ SIMPLIFICADO: Não escapar pontuação normal
      // Apenas proteger caracteres que realmente quebram Markdown em contexto de texto
      return text
        .replace(/([*_`#])/g, '\\$1'); // Escapar apenas: * _ ` #
    }

    /**
     * Headers (h1-h6)
     */
    heading(node, level) {
      const content = this.processChildren(node).trim();
      const prefix = '#'.repeat(level);
      return `\n${prefix} ${content}\n\n`;
    }

    /**
     * Parágrafo
     */
    paragraph(node) {
      const content = this.processChildren(node).trim();
      if (!content) return '';
      return `${content}\n\n`;
    }

    /**
     * Bold
     */
    bold(node) {
      const content = this.processChildren(node);
      return `**${content}**`;
    }

    /**
     * Italic
     */
    italic(node) {
      const content = this.processChildren(node);
      return `*${content}*`;
    }

    /**
     * Inline code
     */
    inlineCode(node) {
      const content = node.textContent || '';
      return `\`${content}\``;
    }

    /**
     * Code block
     */
    codeBlock(node) {
      const codeElement = node.querySelector('code');
      const content = codeElement ? codeElement.textContent : node.textContent;
      
      // Detectar linguagem se possível
      let language = '';
      if (codeElement) {
        const classes = codeElement.className.split(' ');
        for (const cls of classes) {
          if (cls.startsWith('language-')) {
            language = cls.replace('language-', '');
            break;
          }
        }
      }
      
      return `\n\`\`\`${language}\n${content}\n\`\`\`\n\n`;
    }

    /**
     * Link
     */
    link(node) {
      const content = this.processChildren(node);
      const href = node.getAttribute('href') || '';
      return `[${content}](${href})`;
    }

    /**
     * Image
     */
    image(node) {
      const alt = node.getAttribute('alt') || '';
      const src = node.getAttribute('src') || '';
      return `![${alt}](${src})`;
    }

    /**
     * Lista não ordenada
     */
    unorderedList(node, depth) {
      const items = Array.from(node.children).filter(c => c.tagName === 'LI');
      let result = '\n';
      
      for (const item of items) {
        const indent = '  '.repeat(depth);
        const content = this.processNode(item, depth + 1).trim();
        result += `${indent}- ${content}\n`;
      }
      
      return result + '\n';
    }

    /**
     * Lista ordenada
     */
    orderedList(node, depth) {
      const items = Array.from(node.children).filter(c => c.tagName === 'LI');
      let result = '\n';
      
      items.forEach((item, index) => {
        const indent = '  '.repeat(depth);
        const content = this.processNode(item, depth + 1).trim();
        result += `${indent}${index + 1}. ${content}\n`;
      });
      
      return result + '\n';
    }

    /**
     * Item de lista
     */
    listItem(node, depth) {
      // Processar filhos, mas não adicionar bullets/números
      // (isso é feito pela ul/ol)
      return this.processChildren(node, depth);
    }

    /**
     * Tabela
     */
    table(node) {
      const rows = Array.from(node.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      let result = '\n';
      let headers = [];
      let alignments = [];

      // Primeira linha: headers
      const firstRow = rows[0];
      const firstRowCells = Array.from(firstRow.querySelectorAll('th, td'));
      
      headers = firstRowCells.map(cell => {
        const content = this.processChildren(cell).trim();
        // Detectar alinhamento
        const align = cell.style.textAlign || 'left';
        alignments.push(align);
        return content;
      });

      // Montar linha de headers
      result += '| ' + headers.join(' | ') + ' |\n';

      // Linha separadora com alinhamento
      const separators = alignments.map(align => {
        if (align === 'center') return ':---:';
        if (align === 'right') return '---:';
        return '---';
      });
      result += '| ' + separators.join(' | ') + ' |\n';

      // Demais linhas
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td, th'));
        const cellContents = cells.map(cell => this.processChildren(cell).trim());
        result += '| ' + cellContents.join(' | ') + ' |\n';
      }

      return result + '\n';
    }

    /**
     * Blockquote
     */
    blockquote(node) {
      const content = this.processChildren(node).trim();
      const lines = content.split('\n');
      return '\n' + lines.map(line => `> ${line}`).join('\n') + '\n\n';
    }
  }

  // Exportar globalmente
  window.NodusHtmlToMarkdown = new HtmlToMarkdown();

})();
