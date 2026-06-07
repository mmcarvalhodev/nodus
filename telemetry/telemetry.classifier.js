// ═══════════════════════════════════════════════════════════════
// NODUS Telemetry — Content Classifier v2 (multilingual + 14 cats)
// ═══════════════════════════════════════════════════════════════
//
// MUDANÇAS vs v1:
//   - 14 categorias (8 antigas + 6 novas: question, instruction,
//     tutorial, error_debug, comparison, definition)
//   - Patterns multilíngues: pt, en, es, fr — fim do bug "USA users
//     caem todos em 'other'"
//   - Detector simples de idioma por top-words
//   - Retorna { type, confidence, language } — language novo
//
// PRIVACIDADE:
//   - Roda 100% no cliente
//   - Recebe texto, retorna SÓ categoria + idioma (categóricos)
//   - Texto NUNCA é persistido nem transmitido
//   - Compatível com classificação de "respostas vistas mas não salvas"
//     (response_generated event) — runtime classifica e descarta o texto
//
// USO:
//   import { classifyContentType } from './telemetry.classifier.js';
//   const { type, confidence, language } = classifyContentType(text);
// ═══════════════════════════════════════════════════════════════

import { TELEMETRY_CONFIG, debug } from './telemetry.config.js';

// ─── Top words por idioma (proxy de detecção) ──────────────────
// 30 palavras mais comuns de cada idioma. Match com word-boundary.
// Cobertura: pt, en, es, fr. Outros idiomas caem em 'other'.
const LANG_TOP_WORDS = {
  pt: ['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para',
       'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as',
       'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu'],
  en: ['the', 'of', 'and', 'to', 'in', 'a', 'is', 'that', 'for', 'it',
       'as', 'was', 'with', 'be', 'on', 'not', 'this', 'by', 'are', 'or',
       'have', 'from', 'at', 'an', 'we', 'can', 'but', 'will', 'all', 'has'],
  es: ['de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'se', 'del',
       'las', 'un', 'por', 'con', 'no', 'una', 'su', 'para', 'es', 'al',
       'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí'],
  fr: ['de', 'la', 'le', 'et', 'à', 'les', 'des', 'en', 'un', 'du',
       'une', 'que', 'pour', 'dans', 'qui', 'est', 'au', 'pas', 'sur', 'plus',
       'par', 'je', 'avec', 'ne', 'se', 'on', 'tout', 'ce', 'mais', 'son']
};

/**
 * Detecta idioma pelo texto. Heurística simples por frequência de
 * stopwords. Retorna 'pt' | 'en' | 'es' | 'fr' | 'other'.
 * Mínimo de 5 matches pra evitar falsos positivos em textos curtos.
 */
function detectLanguage(text) {
  if (!text || text.length < 20) return 'other';

  // Tira code blocks pra não interferir
  const cleaned = text.replace(/```[\s\S]*?```/g, ' ').toLowerCase();

  const scores = {};
  for (const [lang, words] of Object.entries(LANG_TOP_WORDS)) {
    let count = 0;
    for (const w of words) {
      const re = new RegExp('\\b' + w + '\\b', 'g');
      const matches = cleaned.match(re);
      if (matches) count += matches.length;
    }
    scores[lang] = count;
  }

  let best = 'other';
  let max = 5; // threshold mínimo
  for (const [lang, s] of Object.entries(scores)) {
    if (s > max) { max = s; best = lang; }
  }
  return best;
}

// ─── Patterns por categoria ────────────────────────────────────
// Cada categoria tem patterns por idioma (`pt`, `en`, `es`, `fr`) +
// `universal` (que aplica em qualquer idioma — code symbols, números, etc).
// scoreCategory() combina os do idioma detectado + universais.

const PATTERNS = {
  // ═══ Categorias originais (refeitas multilíngues) ═══
  code: {
    universal: [
      /```[\s\S]*?```/g,                  // Fenced code blocks
      /\bfunction\s+\w+\s*\(/g,           // function name()
      /\b(const|let|var)\s+\w+\s*=/g,
      /\bclass\s+\w+/g,
      /\bimport\s+.+\s+from\s+['"]/g,
      /\bexport\s+(default|const|function|class)/g,
      /=>\s*[\{\(]/g,                     // arrow fn
      /\bif\s*\(.*\)\s*\{/g,
      /\bfor\s*\(.*\)\s*\{/g,
      /\bwhile\s*\(.*\)\s*\{/g,
      /\bconsole\.(log|error|warn|info)/g,
      // Python
      /\bdef\s+\w+\s*\(/g,
      /\bclass\s+\w+\s*\(?.*\)?:/g,
      /^\s*from\s+\w+\s+import\s+/gm,
      // SQL
      /\bSELECT\s+[\w*,\s]+\s+FROM\b/gi,
      /\bINSERT\s+INTO\b/gi,
      // Shell
      /\$\s*\w+/g,
      /\bcurl\s+http/g
    ],
    weight: 10,
    bonus(text) {
      const sd = (text.match(/[{}();=<>]/g) || []).length / Math.max(text.length, 1);
      return sd > 0.05 ? 30 : 0;
    }
  },

  technical_explanation: {
    pt: [
      /\b(algoritmo|função|variável|classe|objeto|método|array|loop|iteração)\b/gi,
      /\b(significa|representa|funciona|implementa|executa|invoca)\b/gi,
      /\b(ou seja|isto é|em outras palavras|por exemplo|como por exemplo)\b/gi
    ],
    en: [
      /\b(algorithm|function|variable|class|method|object|array|loop|iteration)\b/gi,
      /\b(means|represents|implements|executes|invokes|works\s+as)\b/gi,
      /\b(that is|in other words|for example|i\.e\.|e\.g\.)\b/gi
    ],
    es: [
      /\b(algoritmo|función|variable|clase|método|objeto|bucle|iteración)\b/gi,
      /\b(significa|representa|implementa|ejecuta|funciona)\b/gi,
      /\b(es decir|en otras palabras|por ejemplo)\b/gi
    ],
    fr: [
      /\b(algorithme|fonction|variable|classe|méthode|objet|boucle|itération)\b/gi,
      /\b(signifie|représente|implémente|exécute|fonctionne)\b/gi,
      /\b(c'est-à-dire|en d'autres termes|par exemple)\b/gi
    ],
    weight: 15,
    bonus(text) {
      const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
      return paragraphs.length >= 2 ? 20 : 0;
    }
  },

  narrative: {
    pt: [
      /\b(era|foi|estava|tinha|disse|falou|chegou|saiu)\b/gi,
      /\b(então|depois|enquanto|antes|finalmente)\b/gi,
      /\b(ele|ela|eles|elas|nós)\b/gi
    ],
    en: [
      /\b(was|were|had|said|told|came|went|walked|smiled)\b/gi,
      /\b(then|after|while|before|finally|suddenly)\b/gi,
      /\b(he|she|they|we)\s+\w+ed\b/gi
    ],
    es: [
      /\b(era|fue|estaba|tenía|dijo|habló|llegó)\b/gi,
      /\b(entonces|después|mientras|antes|finalmente)\b/gi
    ],
    fr: [
      /\b(était|fut|avait|dit|parla|arriva)\b/gi,
      /\b(alors|après|pendant que|avant|finalement)\b/gi
    ],
    universal: [
      /["'][^"'\n]{20,}["']/g            // diálogo (universal)
    ],
    weight: 8,
    bonus(text) {
      const avgSent = text.length / Math.max(text.split(/[.!?]/).length, 1);
      return avgSent > 50 ? 25 : 0;
    }
  },

  list: {
    universal: [
      /^[\s]*[-*•]\s+\S/gm,              // bullets
      /^[\s]*\d+[.)]\s+\S/gm,            // numerados (1. ou 1))
      /^[\s]*[a-z][.)]\s+\S/gmi,         // a) b) c)
      /^[\s]*\[[x\s]\]\s+\S/gm           // checkboxes
    ],
    weight: 20,
    threshold: 3,                        // mínimo de itens
    bonus(text) {
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const avg = text.length / Math.max(lines.length, 1);
      return avg < 100 ? 20 : 0;
    }
  },

  summary: {
    pt: [
      /\b(resumo|resumindo|em suma|em resumo|síntese|sintetizando)\b/gi,
      /\b(principal|principais|importante|essencial|fundamental)\b/gi,
      /\b(conclusão|concluindo|conclui-se|portanto|logo)\b/gi
    ],
    en: [
      /\b(summary|summarizing|in summary|in short|to summarize)\b/gi,
      /\b(main|key|important|essential|fundamental|crucial)\b/gi,
      /\b(in conclusion|conclude|conclusion|therefore|hence|thus)\b/gi
    ],
    es: [
      /\b(resumen|resumiendo|en resumen|síntesis)\b/gi,
      /\b(principal|principales|importante|esencial)\b/gi,
      /\b(en conclusión|conclusión|por lo tanto)\b/gi
    ],
    fr: [
      /\b(résumé|en résumé|en bref|synthèse)\b/gi,
      /\b(principal|principales|important|essentiel)\b/gi,
      /\b(en conclusion|conclusion|donc|par conséquent)\b/gi
    ],
    weight: 25,
    bonus(text) {
      return (text.length > 100 && text.length < 800) ? 15 : 0;
    }
  },

  brainstorm: {
    // Detectado por estrutura, não palavras
    weight: 0,
    bonus(text) {
      const lines = text.split('\n');
      const nonEmptyLines = lines.filter(l => l.trim()).length;
      const words = text.split(/\s+/);
      const avgWordLen = words.reduce((s, w) => s + w.length, 0) / Math.max(words.length, 1);
      // Muitas linhas curtas, palavras curtas, sem estrutura formal
      return (nonEmptyLines > 10 && avgWordLen < 8) ? 70 : 0;
    }
  },

  answer: {
    pt: [
      /^(sim|não|talvez|claro|certamente|exatamente)\b/i,
      /\b(resposta|solução)\b/gi
    ],
    en: [
      /^(yes|no|maybe|sure|certainly|exactly|absolutely)\b/i,
      /\b(answer|solution)\b/gi
    ],
    es: [
      /^(sí|no|tal vez|claro|exactamente)\b/i,
      /\b(respuesta|solución)\b/gi
    ],
    fr: [
      /^(oui|non|peut-être|bien sûr|exactement)\b/i,
      /\b(réponse|solution)\b/gi
    ],
    weight: 25
  },

  // ═══ Categorias NOVAS (v2) ═══

  question: {
    universal: [
      /\?\s*$/m,                          // termina com ?
      /\?\s*\n/g                          // ? seguido de nova linha
    ],
    pt: [
      /^(como|onde|quando|por que|qual|quais|quem|o que)\b/gim,
      /\b(será que|sera que|você pode|pode me)\b/gi
    ],
    en: [
      /^(how|where|when|why|what|which|who|whose)\b/gim,
      /\b(could you|can you|would you|do you)\b/gi
    ],
    es: [
      /^(cómo|dónde|cuándo|por qué|qué|cuál|quién)\b/gim
    ],
    fr: [
      /^(comment|où|quand|pourquoi|que|quel|qui)\b/gim
    ],
    weight: 20,
    bonus(text) {
      // múltiplos ? = forte sinal
      const qMarks = (text.match(/\?/g) || []).length;
      return qMarks >= 2 ? 30 : 0;
    }
  },

  instruction: {
    pt: [
      /^\s*(faça|crie|gere|escreva|explique|liste|mostre|implemente|escreva|traduza|resuma)\b/gim,
      /\b(por favor|por gentileza)\b/gi
    ],
    en: [
      /^\s*(write|create|generate|explain|list|show|implement|build|make|translate|summarize|describe)\b/gim,
      /\b(please|kindly)\b/gi
    ],
    es: [
      /^\s*(haz|crea|genera|escribe|explica|lista|muestra|implementa)\b/gim
    ],
    fr: [
      /^\s*(fais|crée|génère|écris|explique|liste|montre|implémente)\b/gim
    ],
    weight: 20,
    bonus(text) {
      // imperativos no início são forte sinal
      const firstLine = text.split('\n')[0] || '';
      return /^\s*(make|write|create|gere|crie|faça|haz|fais)/i.test(firstLine) ? 25 : 0;
    }
  },

  tutorial: {
    universal: [
      /^[\s]*(passo|step|étape|paso)\s*\d+[:.]?/gim,    // "passo 1:", "step 1.", etc
      /^[\s]*\d+[.)]\s+\S.{30,}/gm                       // numerados longos (passo-a-passo)
    ],
    pt: [
      /\b(primeiro|segundo|terceiro|por último|finalmente)\b.*\b(faça|crie|abra|execute)\b/gi
    ],
    en: [
      /\b(first|second|third|finally|lastly)\b.*\b(do|create|open|run|execute)\b/gi,
      /\bstep[- ]by[- ]step\b/gi
    ],
    weight: 18,
    threshold: 3,                         // pelo menos 3 passos
    bonus(text) {
      // tutorial costuma ter parágrafos com instruções entre passos
      const paragraphs = text.split('\n\n').length;
      return paragraphs >= 4 ? 20 : 0;
    }
  },

  error_debug: {
    universal: [
      /\b(TypeError|ReferenceError|SyntaxError|RangeError|TypeError):/g,
      /\b(Exception|Error|Traceback)\b.*at\s+/gi,
      /Stack\s*trace/gi,
      /at\s+\w+\s*\(.*:\d+:\d+\)/g,        // stack frame node/V8
      /File\s+".+",\s*line\s+\d+/g,         // Python traceback
      /Error:\s+\w+/g,
      /\bundefined is not (a function|an object)/gi,
      /\bcannot read propert(y|ies)\s+of\s+(null|undefined)/gi
    ],
    pt: [
      /\b(erro|exceção|falha|problema|bug)\b/gi
    ],
    en: [
      /\b(error|exception|failure|issue|bug|crash)\b/gi
    ],
    weight: 20,
    bonus(text) {
      // muitos números de linha = traceback
      const lineRefs = (text.match(/:\d+:\d+/g) || []).length;
      return lineRefs >= 2 ? 30 : 0;
    }
  },

  comparison: {
    universal: [
      /\bvs\.?\b/gi,
      /\b(\w+)\s+vs\.?\s+(\w+)\b/gi
    ],
    pt: [
      /\b(versus|comparado a|comparado com|diferença entre|melhor que|pior que)\b/gi,
      /\b(prós|contras|vantagens|desvantagens)\b/gi
    ],
    en: [
      /\b(compared to|compared with|difference between|better than|worse than)\b/gi,
      /\b(pros|cons|advantages|disadvantages|tradeoffs?)\b/gi
    ],
    es: [
      /\b(versus|comparado con|diferencia entre|mejor que|peor que)\b/gi
    ],
    fr: [
      /\b(versus|comparé à|différence entre|meilleur que|pire que)\b/gi
    ],
    weight: 22
  },

  definition: {
    pt: [
      /\b\w+\s+é\s+um[a]?\b/gi,
      /\bdefinição de\b/gi,
      /\bsignifica\s+que\b/gi
    ],
    en: [
      /\b\w+\s+is\s+an?\b/gi,
      /\bdefinition of\b/gi,
      /\brefers? to\b/gi
    ],
    es: [
      /\b\w+\s+es\s+un[a]?\b/gi,
      /\bdefinición de\b/gi
    ],
    fr: [
      /\b\w+\s+est\s+un[e]?\b/gi,
      /\bdéfinition de\b/gi
    ],
    weight: 12,
    bonus(text) {
      // definição geralmente é curta e introdutória
      return (text.length < 300) ? 15 : 0;
    }
  }
};

// ─── Helpers ───────────────────────────────────────────────────

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => {
    const matches = text.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function scoreCategory(text, def, lang) {
  // Combina patterns universais + do idioma detectado
  const patterns = [
    ...(def.universal || []),
    ...(def[lang] || [])
  ];

  let count = 0;
  if (patterns.length > 0) {
    count = countMatches(text, patterns);
  }

  // Threshold (lista exige 3+ itens, tutorial 3+ passos, etc)
  if (def.threshold && count < def.threshold) return 0;

  let score = count * (def.weight || 0);

  // Bonus específico da categoria (símbolos, parágrafos, etc)
  if (typeof def.bonus === 'function') {
    score += def.bonus(text);
  }

  return Math.min(100, score);
}

// ─── ContentClassifier (API pública) ───────────────────────────

export class ContentClassifier {
  /**
   * Classifica texto. Retorna { type, confidence, language }.
   * type: uma das 14 categorias (ou 'other')
   * confidence: 0-100
   * language: 'pt' | 'en' | 'es' | 'fr' | 'other'
   */
  classify(text) {
    if (!text || typeof text !== 'string') {
      return {
        type: TELEMETRY_CONFIG.CONTENT_TYPES.OTHER,
        confidence: 0,
        language: 'other'
      };
    }

    const language = detectLanguage(text);

    // Calcula score pra cada categoria, usando patterns do idioma detectado
    const scores = {};
    for (const [cat, def] of Object.entries(PATTERNS)) {
      scores[cat] = scoreCategory(text, def, language);
    }

    debug('Classification scores:', scores, '| lang:', language);

    // Pega o de maior score
    let maxScore = 0;
    let bestType = TELEMETRY_CONFIG.CONTENT_TYPES.OTHER;
    for (const [cat, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestType = cat;
      }
    }

    // Confidence adjust por tamanho
    let confidence = Math.min(100, maxScore);
    if (text.length < 50) confidence -= 20;
    if (text.length > 500) confidence += 10;
    confidence = Math.max(0, Math.min(100, Math.round(confidence)));

    debug(`Classified: ${bestType} (${confidence}% conf, ${language})`);

    return { type: bestType, confidence, language };
  }
}

// ─── API global ────────────────────────────────────────────────

let _instance = null;
export function classifyContentType(text) {
  if (!_instance) _instance = new ContentClassifier();
  return _instance.classify(text);
}

export default ContentClassifier;
