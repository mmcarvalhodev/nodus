// ═══════════════════════════════════════════════════════════
// NODUS v3.2.0 - Content Type Classifier
// ═══════════════════════════════════════════════════════════
// Classificador heurístico de tipos de conteúdo
// Baseado em padrões textuais e estrutura
// ═══════════════════════════════════════════════════════════

import { TELEMETRY_CONFIG, debug } from './telemetry.config.js';

/**
 * Classificador de Content Type
 */
export class ContentClassifier {
  
  /**
   * Classifica um texto e retorna tipo + confiança
   */
  classify(text) {
    if (!text || typeof text !== 'string') {
      return {
        type: TELEMETRY_CONFIG.CONTENT_TYPES.OTHER,
        confidence: 0
      };
    }
    
    // Calcular scores para cada tipo
    const scores = {
      code: this.scoreCode(text),
      technical_explanation: this.scoreTechnicalExplanation(text),
      narrative: this.scoreNarrative(text),
      list: this.scoreList(text),
      summary: this.scoreSummary(text),
      brainstorm: this.scoreBrainstorm(text),
      answer: this.scoreAnswer(text)
    };
    
    debug('Classification scores:', scores);
    
    // Encontrar maior score
    let maxScore = 0;
    let bestType = TELEMETRY_CONFIG.CONTENT_TYPES.OTHER;
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestType = type;
      }
    }
    
    // Calcular confiança (0-100)
    const confidence = this.calculateConfidence(maxScore, text);
    
    debug(`Classified as: ${bestType} (${confidence}% confidence)`);
    
    return {
      type: bestType,
      confidence: confidence
    };
  }
  
  // ═══════════════════════════════════════════════════════════
  // SCORING FUNCTIONS (heurísticas)
  // ═══════════════════════════════════════════════════════════
  
  scoreCode(text) {
    const patterns = [
      /```/g,                           // Code blocks
      /function\s+\w+\(/g,             // Function declarations
      /const\s+\w+\s*=/g,              // Const declarations
      /let\s+\w+\s*=/g,                // Let declarations
      /var\s+\w+\s*=/g,                // Var declarations
      /import\s+.+from/g,              // Imports
      /export\s+(default|const|function)/g, // Exports
      /class\s+\w+/g,                  // Class declarations
      /if\s*\(/g,                      // If statements
      /for\s*\(/g,                     // For loops
      /while\s*\(/g,                   // While loops
      /=>/g,                           // Arrow functions
      /\{[\s\S]*\}/g,                  // Code blocks
      /console\.(log|error|warn)/g    // Console statements
    ];
    
    const codeScore = this.countMatches(text, patterns) * 10;
    
    // Bonus: alta densidade de símbolos
    const symbolDensity = (text.match(/[{}();=<>]/g) || []).length / text.length;
    const symbolBonus = symbolDensity > 0.05 ? 30 : 0;
    
    return Math.min(100, codeScore + symbolBonus);
  }
  
  scoreTechnicalExplanation(text) {
    const patterns = [
      /\b(algoritmo|função|variável|classe|objeto|array|loop|iteração)\b/gi,
      /\b(significa|representa|funciona|implementa|executa)\b/gi,
      /\b(quando|onde|como|por que|qual)\b/gi,
      /\b(primeiro|segundo|terceiro|finalmente)\b/gi,
      /\b(exemplo|por exemplo|como por exemplo)\b/gi,
      /\b(ou seja|isto é|em outras palavras)\b/gi
    ];
    
    const techScore = this.countMatches(text, patterns) * 15;
    
    // Bonus: parágrafos estruturados
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
    const structureBonus = paragraphs.length >= 2 ? 20 : 0;
    
    return Math.min(100, techScore + structureBonus);
  }
  
  scoreNarrative(text) {
    const patterns = [
      /\b(era|foi|estava|tinha|disse|falou)\b/gi,
      /\b(então|depois|enquanto|quando|antes)\b/gi,
      /\b(ele|ela|eles|elas|nós|você)\b/gi,
      /\b(sempre|nunca|às vezes|frequentemente)\b/gi,
      /["']/g  // Diálogos
    ];
    
    const narrativeScore = this.countMatches(text, patterns) * 8;
    
    // Bonus: texto longo e fluido
    const avgSentenceLength = text.length / (text.split('.').length || 1);
    const fluidBonus = avgSentenceLength > 50 ? 25 : 0;
    
    return Math.min(100, narrativeScore + fluidBonus);
  }
  
  scoreList(text) {
    const patterns = [
      /^[\s]*[-*•]\s/gm,           // Bullet points
      /^[\s]*\d+\.\s/gm,           // Numbered lists
      /^[\s]*[a-z]\)\s/gm,         // a) b) c) lists
      /^[\s]*\[[x ]\]\s/gm         // Checkboxes
    ];
    
    const listMatches = this.countMatches(text, patterns);
    
    // Lista precisa de pelo menos 3 itens
    if (listMatches < 3) return 0;
    
    const listScore = listMatches * 20;
    
    // Bonus: linhas curtas e consistentes
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const avgLineLength = text.length / (lines.length || 1);
    const consistencyBonus = avgLineLength < 100 ? 20 : 0;
    
    return Math.min(100, listScore + consistencyBonus);
  }
  
  scoreSummary(text) {
    const patterns = [
      /\b(resumo|resumindo|em suma|em resumo|síntese)\b/gi,
      /\b(principal|principais|importante|essencial)\b/gi,
      /\b(total|totalmente|geral|geralmente)\b/gi,
      /\b(conclusão|concluindo|conclui-se)\b/gi
    ];
    
    const summaryScore = this.countMatches(text, patterns) * 25;
    
    // Bonus: texto de tamanho médio (não muito curto, não muito longo)
    const isMediumLength = text.length > 100 && text.length < 800 ? 15 : 0;
    
    return Math.min(100, summaryScore + isMediumLength);
  }
  
  scoreBrainstorm(text) {
    const lineCount = text.split('\n').length;
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    
    // Múltiplas linhas curtas = brainstorm
    if (lineCount > 10 && avgWordLength < 8) {
      return 70;
    }
    
    return 0;
  }
  
  scoreAnswer(text) {
    const patterns = [
      /^(sim|não|yes|no|talvez|maybe)/i,
      /\b(resposta|answer|solução|solution)\b/gi
    ];
    
    const answerScore = this.countMatches(text, patterns) * 25;
    
    return Math.min(100, answerScore);
  }
  
  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Conta matches de múltiplos padrões
   */
  countMatches(text, patterns) {
    return patterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }
  
  /**
   * Calcula confiança baseada no score e características do texto
   */
  calculateConfidence(score, text) {
    let confidence = Math.min(100, score);
    
    // Ajustes baseados no tamanho
    if (text.length < 50) {
      confidence -= 20;
    }
    
    if (text.length > 500) {
      confidence += 10;
    }
    
    // Garante range 0-100
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }
}

/**
 * Função helper global para classificação rápida
 */
export function classifyContentType(text) {
  const classifier = new ContentClassifier();
  return classifier.classify(text);
}

export default ContentClassifier;
