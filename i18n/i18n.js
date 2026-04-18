// ═══════════════════════════════════════════════════════════════
// NODUS - Internationalization Module (i18n)
// Suporta: PT-BR, EN, ES, FR, DE, JA, IT, ZH, KO, HI
// ═══════════════════════════════════════════════════════════════

const NodusI18n = {
  // Idioma atual
  currentLang: 'pt',
  
  // Idiomas suportados
  supportedLangs: ['pt', 'en', 'es', 'fr', 'de', 'ja', 'it', 'zh', 'ko', 'hi'],

  // Labels dos idiomas
  langLabels: {
    'pt': 'Português',
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'ja': '日本語',
    'it': 'Italiano',
    'zh': '中文',
    'ko': '한국어',
    'hi': 'हिन्दी'
  },
  
  // ═══════════════════════════════════════════════════════════════
  // TRADUÇÕES
  // ═══════════════════════════════════════════════════════════════
  
  translations: {
    // ─────────────────────────────────────────────────────────────
    // GERAL
    // ─────────────────────────────────────────────────────────────
    'app.name': {
      pt: 'NODUS', en: 'NODUS', es: 'NODUS', fr: 'NODUS', de: 'NODUS', ja: 'NODUS',
      it: 'NODUS', zh: 'NODUS', ko: 'NODUS', hi: 'NODUS'
    },
    'app.tagline': {
      pt: 'Gerenciador de Conversas IA',
      en: 'AI Conversation Manager',
      es: 'Gestor de Conversaciones IA',
      fr: 'Gestionnaire de Conversations IA',
      de: 'KI-Gesprächs-Manager',
      ja: 'AI会話マネージャー',
      it: 'Cattura. Organizza. Riutilizza.', zh: '捕获。整理。重用。', ko: '캡처. 정리. 재사용.', hi: 'कैप्चर करें। व्यवस्थित करें। पुन: उपयोग करें।'
    },
    
    // ─────────────────────────────────────────────────────────────
    // POPUP - STATS
    // ─────────────────────────────────────────────────────────────
    'popup.capturestoday': {
      pt: 'Capturas Hoje', en: 'Captures Today', es: 'Capturas Hoy',
      fr: 'Captures Aujourd\'hui', de: 'Aufnahmen Heute', ja: '本日のキャプチャ',
      it: 'Catture Oggi', zh: '今日捕获', ko: '오늘 캡처', hi: 'आज के कैप्चर'
    },
    'popup.totalideas': {
      pt: 'Total Ideias', en: 'Total Ideas', es: 'Total Ideas',
      fr: 'Total Idées', de: 'Gesamte Ideen', ja: '総アイデア数',
      it: 'Idee Totali', zh: '总计想法', ko: '총 아이디어', hi: 'कुल विचार'
    },
    'popup.queues': {
      pt: 'Filas', en: 'Queues', es: 'Colas',
      fr: 'Files', de: 'Warteschlangen', ja: 'キュー',
      it: 'Code', zh: '队列', ko: '대기열', hi: 'कतारें'
    },
    'popup.chains': {
      pt: 'Chains', en: 'Chains', es: 'Chains',
      fr: 'Chaînes', de: 'Ketten', ja: 'チェーン',
      it: 'Catene', zh: '链', ko: '체인', hi: 'चेन'
    },
    'popup.logs': {
      pt: 'Logs', en: 'Logs', es: 'Logs',
      fr: 'Logs', de: 'Logs', ja: 'ログ',
      it: 'Log', zh: '日志', ko: '로그', hi: 'लॉग'
    },
    'popup.tags': {
      pt: 'Tags', en: 'Tags', es: 'Tags',
      fr: 'Tags', de: 'Tags', ja: 'タグ',
      it: 'Tag', zh: '标签', ko: '태그', hi: 'टैग'
    },
    'popup.storage': {
      pt: 'Storage', en: 'Storage', es: 'Almacenamiento',
      fr: 'Stockage', de: 'Speicher', ja: 'ストレージ',
      it: 'Archiviazione', zh: '存储', ko: '저장소', hi: 'भंडारण'
    },
    'popup.dashboard': {
      pt: 'Dashboard', en: 'Dashboard', es: 'Dashboard',
      fr: 'Tableau de bord', de: 'Dashboard', ja: 'ダッシュボード',
      it: 'Dashboard', zh: '仪表盘', ko: '대시보드', hi: 'डैशबोर्ड'
    },
    'popup.nolog': {
      pt: 'Nenhum log ainda', en: 'No logs yet', es: 'Sin logs aún',
      fr: 'Aucun log encore', de: 'Noch keine Logs', ja: 'ログなし',
      it: 'Nessun log ancora', zh: '暂无日志', ko: '로그 없음', hi: 'अभी कोई लॉग नहीं'
    },
    'popup.notag': {
      pt: 'Nenhuma tag', en: 'No tags', es: 'Sin tags',
      fr: 'Aucun tag', de: 'Kein Tag', ja: 'タグなし',
      it: 'Nessun tag', zh: '无标签', ko: '태그 없음', hi: 'कोई टैग नहीं'
    },
    'popup.used': {
      pt: 'usado', en: 'used', es: 'usado',
      fr: 'utilisé', de: 'verwendet', ja: '使用済み',
      it: 'usato', zh: '已用', ko: '사용됨', hi: 'उपयोग किया'
    },
    'popup.total': {
      pt: 'total', en: 'total', es: 'total',
      fr: 'total', de: 'gesamt', ja: '合計',
      it: 'totale', zh: '总计', ko: '총', hi: 'कुल'
    },
    
    // ─────────────────────────────────────────────────────────────
    // POPUP - TELEMETRIA DESATIVADA
    // ─────────────────────────────────────────────────────────────
    'popup.telemetry.disabled.title': {
      pt: 'Estatísticas Desativadas', en: 'Statistics Disabled', es: 'Estadísticas Desactivadas',
      fr: 'Statistiques Désactivées', de: 'Statistiken Deaktiviert', ja: '統計無効',
      it: 'Statistiche Disabilitate', zh: '统计已禁用', ko: '통계 비활성화', hi: 'आँकड़े अक्षम'
    },
    'popup.telemetry.disabled.message': {
      pt: 'Ative a telemetria para ver estatísticas de uso.',
      en: 'Enable telemetry to view usage statistics.',
      es: 'Active la telemetría para ver estadísticas de uso.',
      fr: 'Activez la télémétrie pour voir les statistiques d\'utilisation.',
      de: 'Aktiviere die Telemetrie, um Nutzungsstatistiken zu sehen.',
      ja: '使用統計を表示するにはテレメトリを有効にしてください。',
      it: 'Attiva la telemetria per vedere le statistiche.', zh: '启用遥测以查看使用统计数据。', ko: '사용 통계를 보려면 텔레메트리를 활성화하세요.', hi: 'आँकड़े देखने के लिए टेलीमेट्री सक्षम करें।'
    },
    'popup.telemetry.enable': {
      pt: 'Ativar Telemetria', en: 'Enable Telemetry', es: 'Activar Telemetría',
      fr: 'Activer la Télémétrie', de: 'Telemetrie Aktivieren', ja: 'テレメトリを有効にする',
      it: 'Attiva Telemetria', zh: '启用遥测', ko: '텔레메트리 활성화', hi: 'टेलीमेट्री सक्षम करें'
    },
    
    // ─────────────────────────────────────────────────────────────
    // LOGS
    // ─────────────────────────────────────────────────────────────
    'log.quicksave': {
      pt: 'Quick Save',
      en: 'Quick Save',
      es: 'Guardado Rápido',
      fr: 'Sauvegarde Rapide',
      de: 'Schnellspeichern',
      ja: 'クイック保存',
      it: 'Salvataggio Rapido', zh: '快速保存', ko: '빠른 저장', hi: 'त्वरित सहेजना'
    },
    'log.capture': {
      pt: 'Captura',
      en: 'Capture',
      es: 'Captura',
      fr: 'Capture',
      de: 'Aufnahme',
      ja: 'キャプチャ',
      it: 'Cattura', zh: '捕获', ko: '캡처', hi: 'कैप्चर'
    },
    'log.chaincreated': {
      pt: 'Chain criada',
      en: 'Chain created',
      es: 'Chain creada',
      fr: 'Chain créée',
      de: 'Chain erstellt',
      ja: 'チェーン作成',
      it: 'Catena Creata', zh: '链已创建', ko: '체인 생성됨', hi: 'चेन बनाई गई'
    },
    'log.addtochain': {
      pt: 'Add to Chain', en: 'Add to Chain', es: 'Añadir a Chain',
      fr: 'Ajouter à Chain', de: 'Zur Chain hinzufügen', ja: 'チェーンに追加',
      it: 'Aggiungi alla Catena', zh: '添加到链', ko: '체인에 추가', hi: 'चेन में जोड़ें'
    },
    
    // ─────────────────────────────────────────────────────────────
    // DASHBOARD - TABS
    // ─────────────────────────────────────────────────────────────
    'dashboard.cards': {
      pt: 'Cartões', en: 'Cards', es: 'Tarjetas',
      fr: 'Cartes', de: 'Karten', ja: 'カード',
      it: 'Schede', zh: '卡片', ko: '카드', hi: 'कार्ड'
    },
    'dashboard.chains': {
      pt: 'Cadeias', en: 'Chains', es: 'Cadenas',
      fr: 'Chaînes', de: 'Ketten', ja: 'チェーン',
      it: 'Catene', zh: '链', ko: '체인', hi: 'चेन'
    },
    'dashboard.mindmap': {
      pt: 'Projetos', en: 'Projects', es: 'Proyectos',
      fr: 'Projets', de: 'Projekte', ja: 'プロジェクト',
      it: 'Mappa Mentale', zh: '思维导图', ko: '마인드맵', hi: 'माइंड मैप'
    },
    
    // ─────────────────────────────────────────────────────────────
    // SAVE IDEA PANEL
    // ─────────────────────────────────────────────────────────────
    'save.title': {
      pt: 'SALVAR IDEIA', en: 'SAVE IDEA', es: 'GUARDAR IDEA',
      fr: 'SAUVEGARDER L\'IDÉE', de: 'IDEE SPEICHERN', ja: 'アイデアを保存',
      it: 'SALVA IDEA', zh: '保存想法', ko: '아이디어 저장', hi: 'विचार सहेजें'
    },
    'save.fieldTitle': {
      pt: 'Título', en: 'Title', es: 'Título',
      fr: 'Titre', de: 'Titel', ja: 'タイトル',
      it: 'Titolo', zh: '标题', ko: '제목', hi: 'शीर्षक'
    },
    'save.fieldQuestion': {
      pt: 'Pergunta', en: 'Question', es: 'Pregunta',
      fr: 'Question', de: 'Frage', ja: '質問',
      it: 'Domanda', zh: '问题', ko: '질문', hi: 'प्रश्न'
    },
    'save.fieldAnswer': {
      pt: 'Resposta', en: 'Answer', es: 'Respuesta',
      fr: 'Réponse', de: 'Antwort', ja: '回答',
      it: 'Risposta', zh: '回答', ko: '답변', hi: 'उत्तर'
    },
    'save.fieldTags': {
      pt: 'Tags (máx 4)', en: 'Tags (max 4)', es: 'Tags (máx 4)',
      fr: 'Tags (max 4)', de: 'Tags (max 4)', ja: 'タグ（最大4つ）',
      it: 'Tag (max 4)', zh: '标签（最多4个）', ko: '태그 (최대 4개)', hi: 'टैग (अधिकतम 4)'
    },
    'save.destination': {
      pt: 'DESTINO:', en: 'DEST:', es: 'DESTINO:',
      fr: 'DEST:', de: 'ZIEL:', ja: '保存先:',
      it: 'DEST:', zh: '目标:', ko: '대상:', hi: 'गंतव्य:'
    },
    'save.addTags': {
      pt: 'Adicionar Tags', en: 'Add Tags', es: 'Agregar Tags',
      fr: 'Ajouter des Tags', de: 'Tags Hinzufügen', ja: 'タグを追加',
      it: 'Aggiungi Tag', zh: '添加标签', ko: '태그 추가', hi: 'टैग जोड़ें'
    },
    'save.tagPlaceholder': {
      pt: 'Nova tag...', en: 'New tag...', es: 'Nueva etiqueta...',
      fr: 'Nouveau tag...', de: 'Neuer Tag...', ja: '新しいタグ...',
      it: 'Nuovo tag...', zh: '新标签...', ko: '새 태그...', hi: 'नया टैग...'
    },
    'save.addTagBtn': {
      pt: 'ADICIONAR', en: 'ADD', es: 'AGREGAR',
      fr: 'AJOUTER', de: 'HINZUFÜGEN', ja: '追加',
      it: 'AGGIUNGI', zh: '添加', ko: '추가', hi: 'जोड़ें'
    },
    'save.cancel': {
      pt: 'CANCELAR', en: 'CANCEL', es: 'CANCELAR',
      fr: 'ANNULER', de: 'ABBRECHEN', ja: 'キャンセル',
      it: 'ANNULLA', zh: '取消', ko: '취소', hi: 'रद्द करें'
    },
    'save.save': {
      pt: 'SALVAR', en: 'SAVE', es: 'GUARDAR',
      fr: 'SAUVEGARDER', de: 'SPEICHERN', ja: '保存',
      it: 'SALVA IDEA', zh: '保存想法', ko: '아이디어 저장', hi: 'विचार सहेजें'
    },
    'save.titlePlaceholder': {
      pt: 'Digite um título...', en: 'Enter a title...', es: 'Ingrese un título...',
      fr: 'Entrez un titre...', de: 'Titel eingeben...', ja: 'タイトルを入力...',
      it: 'Titolo opzionale...', zh: '可选标题...', ko: '선택적 제목...', hi: 'वैकल्पिक शीर्षक...'
    },
    'save.responsePlaceholder': {
      pt: 'Editar resposta...', en: 'Edit the response...', es: 'Editar respuesta...',
      fr: 'Modifier la réponse...', de: 'Antwort bearbeiten...', ja: '回答を編集...',
      it: 'Risposta IA...', zh: 'AI回答...', ko: 'AI 응답...', hi: 'AI उत्तर...'
    },
    'save.fileAlert': {
      pt: 'Esta resposta parece conter um arquivo',
      en: 'This response seems to contain a file',
      es: 'Esta respuesta parece contener un archivo',
      fr: 'Cette réponse semble contenir un fichier',
      de: 'Diese Antwort enthält möglicherweise eine Datei',
      ja: 'この回答にはファイルが含まれているようです',
      it: 'File allegato rilevato', zh: '检测到附件文件', ko: '첨부 파일 감지됨', hi: 'संलग्न फ़ाइल मिली'
    },
    'save.attachFile': {
      pt: '⬆️ Anexar arquivo', en: '⬆️ Attach file', es: '⬆️ Adjuntar archivo',
      fr: '⬆️ Joindre un fichier', de: '⬆️ Datei anhängen', ja: '⬆️ ファイルを添付',
      it: 'Allega File', zh: '附加文件', ko: '파일 첨부', hi: 'फ़ाइल संलग्न करें'
    },
    'save.dismiss': {
      pt: '❌ Ignorar', en: '❌ Dismiss', es: '❌ Ignorar',
      fr: '❌ Ignorer', de: '❌ Ignorieren', ja: '❌ 無視する',
      it: 'Ignora', zh: '忽略', ko: '무시', hi: 'अनदेखा करें'
    },

    // ─────────────────────────────────────────────────────────────
    // DASHBOARD - CARDS
    // ─────────────────────────────────────────────────────────────
    'card.question': {
      pt: '💬 Pergunta:',
      en: '💬 Question:',
      es: '💬 Pregunta:', fr: '💬 Question :', de: '💬 Frage:', ja: '💬 質問：',
      it: '💬 Domanda:', zh: '💬 问题：', ko: '💬 질문:', hi: '💬 प्रश्न:'
    },
    'card.answer': {
      pt: '📝 Resposta:', en: '📝 Answer:', es: '📝 Respuesta:',
      fr: '📝 Réponse :', de: '📝 Antwort:', ja: '📝 回答：',
      it: '📝 Risposta:', zh: '📝 回答：', ko: '📝 답변:', hi: '📝 उत्तर:'
    },
    'card.seemore': {
      pt: 'Ver mais', en: 'See more', es: 'Ver más',
      fr: 'Voir plus', de: 'Mehr anzeigen', ja: '続きを見る',
      it: 'Vedi altro', zh: '查看更多', ko: '더 보기', hi: 'और देखें'
    },
    'card.seeless': {
      pt: 'Ver menos', en: 'See less', es: 'Ver menos',
      fr: 'Voir moins', de: 'Weniger anzeigen', ja: '折りたたむ',
      it: 'Vedi meno', zh: '收起', ko: '접기', hi: 'कम देखें'
    },
    'card.notitle': {
      pt: 'Sem título', en: 'No title', es: 'Sin título',
      fr: 'Sans titre', de: 'Kein Titel', ja: 'タイトルなし',
      it: 'Senza titolo', zh: '无标题', ko: '제목 없음', hi: 'शीर्षक नहीं'
    },
    'card.noquestion': {
      pt: 'Sem pergunta', en: 'No question', es: 'Sin pregunta',
      fr: 'Sans question', de: 'Keine Frage', ja: '質問なし',
      it: 'Nessuna domanda', zh: '无问题', ko: '질문 없음', hi: 'कोई प्रश्न नहीं'
    },
    'card.noanswer': {
      pt: 'Sem resposta', en: 'No answer', es: 'Sin respuesta',
      fr: 'Sans réponse', de: 'Keine Antwort', ja: '回答なし',
      it: 'Nessuna risposta', zh: '无回答', ko: '답변 없음', hi: 'कोई उत्तर नहीं'
    },

    // ─────────────────────────────────────────────────────────────
    // DASHBOARD - FILTROS
    // ─────────────────────────────────────────────────────────────
    'filter.search': {
      pt: 'Buscar ideias...',
      en: 'Search ideas...',
      es: 'Buscar ideas...',
      fr: 'Rechercher des idées...',
      de: 'Ideen suchen...',
      ja: 'アイデアを検索...',
      it: 'Cerca idee...', zh: '搜索想法...', ko: '아이디어 검색...', hi: 'विचार खोजें...'
    },
    'filter.platform': {
      pt: 'Plataforma',
      en: 'Platform',
      es: 'Plataforma',
      fr: 'Plateforme',
      de: 'Plattform',
      ja: 'プラットフォーム',
      it: 'Piattaforma', zh: '平台', ko: '플랫폼', hi: 'प्लेटफ़ॉर्म'
    },
    'filter.allplatforms': {
      pt: 'Todas as Plataformas',
      en: 'All Platforms',
      es: 'Todas las Plataformas',
      fr: 'Toutes les Plateformes',
      de: 'Alle Plattformen',
      ja: 'すべてのプラットフォーム',
      it: 'Tutte le Piattaforme', zh: '所有平台', ko: '모든 플랫폼', hi: 'सभी प्लेटफ़ॉर्म'
    },
    'filter.daterange': {
      pt: 'Período',
      en: 'Date Range',
      es: 'Período',
      fr: 'Période',
      de: 'Zeitraum',
      ja: '期間',
      it: 'Periodo', zh: '日期范围', ko: '기간', hi: 'तारीख सीमा'
    },
    'filter.alltime': {
      pt: 'Todo o período',
      en: 'All Time',
      es: 'Todo el período',
      fr: 'Toute la période',
      de: 'Gesamter Zeitraum',
      ja: '全期間',
      it: 'Tutto il periodo', zh: '全部时间', ko: '전체 기간', hi: 'सभी समय'
    },
    'filter.today': {
      pt: 'Hoje',
      en: 'Today',
      es: 'Hoy',
      fr: 'Aujourd\'hui',
      de: 'Heute',
      ja: '今日',
      it: 'Oggi', zh: '今天', ko: '오늘', hi: 'आज'
    },
    'filter.thisweek': {
      pt: 'Esta semana',
      en: 'This Week',
      es: 'Esta semana',
      fr: 'Cette semaine',
      de: 'Diese Woche',
      ja: '今週',
      it: 'Questa settimana', zh: '本周', ko: '이번 주', hi: 'इस सप्ताह'
    },
    'filter.thismonth': {
      pt: 'Este mês',
      en: 'This Month',
      es: 'Este mes',
      fr: 'Ce mois-ci',
      de: 'Diesen Monat',
      ja: '今月',
      it: 'Questo mese', zh: '本月', ko: '이번 달', hi: 'इस महीने'
    },
    'filter.tags': {
      pt: 'Tags',
      en: 'Tags',
      es: 'Tags',
      fr: 'Tags',
      de: 'Tags',
      ja: 'タグ',
      it: 'Tag', zh: '标签', ko: '태그', hi: 'टैग'
    },
    'filter.notags': {
      pt: 'Sem tags ainda',
      en: 'No tags yet',
      es: 'Sin tags aún',
      fr: 'Pas encore de tags',
      de: 'Noch keine Tags',
      ja: 'タグなし',
      it: 'Nessun tag ancora', zh: '还没有标签', ko: '아직 태그 없음', hi: 'अभी कोई टैग नहीं'
    },
    'filter.clear': {
      pt: 'Limpar Filtros',
      en: 'Clear Filters',
      es: 'Limpiar Filtros',
      fr: 'Effacer les Filtres',
      de: 'Filter Zurücksetzen',
      ja: 'フィルターをクリア',
      it: 'Cancella Filtri', zh: '清除筛选', ko: '필터 초기화', hi: 'फ़िल्टर साफ़ करें'
    },
    'filter.filters': {
      pt: 'Filtros',
      en: 'Filters',
      es: 'Filtros',
      fr: 'Filtres',
      de: 'Filter',
      ja: 'フィルター',
      it: 'Filtri', zh: '筛选', ko: '필터', hi: 'फ़िल्टर'
    },
    
    // ─────────────────────────────────────────────────────────────
    // FILAS
    // ─────────────────────────────────────────────────────────────
    'queue.quick': {
      pt: 'Quick',
      en: 'Quick',
      es: 'Rápido',
      fr: 'Rapide',
      de: 'Schnell',
      ja: 'クイック',
      it: 'Rapida', zh: '快速', ko: '빠른', hi: 'त्वरित'
    },
    'queue.default': {
      pt: 'Default',
      en: 'Default',
      es: 'Default',
      fr: 'Par défaut',
      de: 'Standard',
      ja: 'デフォルト',
      it: 'Predefinita', zh: '默认', ko: '기본', hi: 'डिफ़ॉल्ट'
    },
    'queue.showing': {
      pt: 'Mostrando',
      en: 'Showing',
      es: 'Mostrando',
      fr: 'Affichage',
      de: 'Anzeige',
      ja: '表示中',
      it: 'Mostrando', zh: '显示', ko: '표시 중', hi: 'दिखा रहे हैं'
    },
    'queue.ideas': {
      pt: 'ideias',
      en: 'ideas',
      es: 'ideas',
      fr: 'idées',
      de: 'Ideen',
      ja: 'アイデア',
      it: 'idee', zh: '想法', ko: '아이디어', hi: 'विचार'
    },
    'queue.clearqueue': {
      pt: 'Limpar Fila',
      en: 'Clear Queue',
      es: 'Limpiar Cola',
      fr: 'Vider la File',
      de: 'Warteschlange Leeren',
      ja: 'キューをクリア',
      it: 'Svuota Coda', zh: '清空队列', ko: '대기열 비우기', hi: 'कतार साफ़ करें'
    },
    'confirm.clearqueue': {
      pt: '⚠️ Tens a certeza que queres limpar TODAS as {count} ideias da fila {queue}?\n\nEsta ação não pode ser desfeita!',
      en: '⚠️ Are you sure you want to clear ALL {count} ideas from {queue} queue?\n\nThis action cannot be undone!',
      es: '⚠️ ¿Seguro que quieres limpiar TODAS las {count} ideas de la cola {queue}?\n\n¡Esta acción no se puede deshacer!',
      fr: '⚠️ Voulez-vous vraiment effacer TOUTES les {count} idées de la file {queue}?\n\nCette action est irréversible!',
      de: '⚠️ Möchtest du wirklich ALLE {count} Ideen aus der {queue}-Warteschlange löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden!',
      ja: '⚠️ {queue}キューの全{count}件のアイデアを削除しますか？\n\nこの操作は元に戻せません！',
      it: '⚠️ Sei sicuro di voler eliminare TUTTE le {count} idee dalla coda {queue}?\n\nQuesta azione non può essere annullata!',
      zh: '⚠️ 确定要清空 {queue} 队列中的全部 {count} 条想法吗？\n\n此操作无法撤销！',
      ko: '⚠️ {queue} 대기열의 모든 {count}개 아이디어를 삭제하시겠습니까?\n\n이 작업은 취소할 수 없습니다!',
      hi: '⚠️ क्या आप {queue} कतार से सभी {count} विचार साफ़ करना चाहते हैं?\n\nयह क्रिया पूर्ववत नहीं की जा सकती!'
    },
    
    // ─────────────────────────────────────────────────────────────
    // BOTÕES DOM (engines)
    // ─────────────────────────────────────────────────────────────
    'btn.save': {
      pt: 'Salvar',
      en: 'Save',
      es: 'Guardar',
      fr: 'Sauvegarder',
      de: 'Speichern',
      ja: '保存',
      it: 'Salva', zh: '保存', ko: '저장', hi: 'सहेजें'
    },
    'btn.cancel': {
      pt: 'Cancelar',
      en: 'Cancel',
      es: 'Cancelar',
      fr: 'Annuler',
      de: 'Abbrechen',
      ja: 'キャンセル',
      it: 'Annulla', zh: '取消', ko: '취소', hi: 'रद्द करें'
    },
    'btn.create': {
      pt: 'Criar',
      en: 'Create',
      es: 'Crear',
      fr: 'Créer',
      de: 'Erstellen',
      ja: '作成',
      it: 'Crea', zh: '创建', ko: '만들기', hi: 'बनाएं'
    },
    'btn.edit': {
      pt: 'Editar',
      en: 'Edit',
      es: 'Editar',
      fr: 'Modifier',
      de: 'Bearbeiten',
      ja: '編集',
      it: 'Modifica', zh: '编辑', ko: '편집', hi: 'संपादित'
    },
    'btn.delete': {
      pt: 'Excluir',
      en: 'Delete',
      es: 'Eliminar',
      fr: 'Supprimer',
      de: 'Löschen',
      ja: '削除',
      it: 'Elimina', zh: '删除', ko: '삭제', hi: 'हटाएं'
    },
    'btn.quick': {
      pt: 'Rápido',
      en: 'Quick',
      es: 'Rápido',
      fr: 'Rapide',
      de: 'Schnell',
      ja: 'クイック',
      it: 'Rapido', zh: '快速', ko: '빠른', hi: 'त्वरित'
    },
    'btn.paste': {
      pt: 'Colar',
      en: 'Paste',
      es: 'Pegar',
      fr: 'Coller',
      de: 'Einfügen',
      ja: '貼り付け',
      it: 'Incolla', zh: '粘贴', ko: '붙여넣기', hi: 'पेस्ट'
    },
    'btn.dash': {
      pt: 'Dash',
      en: 'Dash',
      es: 'Dash',
      fr: 'Dash',
      de: 'Dash',
      ja: 'Dash',
      it: 'Dashboard', zh: '仪表盘', ko: '대시보드', hi: 'डैशबोर्ड'
    },
    'btn.fullchat': {
      pt: 'Capturar Chat',
      en: 'Full Chat',
      es: 'Chat Completo',
      fr: 'Capturer Chat',
      de: 'Chat Aufnehmen',
      ja: 'チャット全体',
      it: 'Chat Completa', zh: '完整聊天', ko: '전체 채팅', hi: 'पूरी चैट'
    },
    'btn.addnode': {
      pt: 'Node',
      en: 'Node',
      es: 'Nodo',
      fr: 'Nœud',
      de: 'Knoten',
      ja: 'ノード',
      it: 'Aggiungi Nodo', zh: '添加节点', ko: '노드 추가', hi: 'नोड जोड़ें'
    },
    'btn.newchain': {
      pt: 'New',
      en: 'New',
      es: 'Nueva',
      fr: 'Nouveau',
      de: 'Neu',
      ja: '新規',
      it: 'Nuova Catena', zh: '新建链', ko: '새 체인', hi: 'नई चेन'
    },
    
    // ─────────────────────────────────────────────────────────────
    // TOASTS
    // ─────────────────────────────────────────────────────────────
    'toast.quicksaved': {
      pt: 'Salvo em Rápido!',
      en: 'Saved in Quick!',
      es: '¡Guardado en Rápido!',
      fr: 'Sauvegardé en Rapide!',
      de: 'In Schnell gespeichert!',
      ja: 'クイックに保存！',
      it: 'Salvataggio Rapido!', zh: '快速保存！', ko: '빠른 저장!', hi: 'त्वरित सहेजा!'
    },
    'toast.dashboardnotavailable': {
      pt: 'Dashboard não disponível',
      en: 'Dashboard not available',
      es: 'Dashboard no disponible',
      fr: 'Dashboard non disponible',
      de: 'Dashboard nicht verfügbar',
      ja: 'ダッシュボード利用不可',
      it: 'Dashboard non disponibile', zh: '仪表盘不可用', ko: '대시보드 사용 불가', hi: 'डैशबोर्ड उपलब्ध नहीं'
    },
    'toast.error': {
      pt: 'Erro ao salvar',
      en: 'Error saving',
      es: 'Error al guardar',
      fr: 'Erreur de sauvegarde',
      de: 'Fehler beim Speichern',
      ja: '保存エラー',
      it: 'Errore!', zh: '错误！', ko: '오류!', hi: 'त्रुटि!'
    },
    'toast.fullchatcaptured': {
      pt: 'Chat capturado! {count} nodes criados',
      en: 'Chat captured! {count} nodes created',
      es: 'Chat capturado! {count} nodos creados',
      fr: 'Chat capturé! {count} nœuds créés',
      de: 'Chat aufgenommen! {count} Knoten erstellt',
      ja: 'チャット取得！{count}ノード作成'
    },
    'toast.nochatstocapture': {
      pt: 'Nenhuma mensagem encontrada nesta aba',
      en: 'No messages found in this tab',
      es: 'No se encontraron mensajes en esta pestaña',
      fr: 'Aucun message trouvé dans cet onglet',
      de: 'Keine Nachrichten in diesem Tab gefunden',
      ja: 'このタブにメッセージが見つかりません',
      it: 'Nessuna chat da catturare', zh: '没有可捕获的聊天', ko: '캡처할 채팅 없음', hi: 'कैप्चर करने के लिए कोई चैट नहीं'
    },
    'toast.platformnotsupported': {
      pt: 'Plataforma não suportada para Full Chat',
      en: 'Platform not supported for Full Chat',
      es: 'Plataforma no compatible con Chat Completo',
      fr: 'Plateforme non supportée pour le Chat Complet',
      de: 'Plattform für Full Chat nicht unterstützt',
      ja: 'このプラットフォームはフルチャットに対応していません',
      it: 'Piattaforma non supportata', zh: '平台不受支持', ko: '지원하지 않는 플랫폼', hi: 'प्लेटफ़ॉर्म समर्थित नहीं'
    },
    'toast.fullchaterror': {
      pt: 'Erro ao capturar chat completo',
      en: 'Error capturing full chat',
      es: 'Error al capturar chat completo',
      fr: 'Erreur lors de la capture du chat complet',
      de: 'Fehler beim Aufnehmen des vollständigen Chats',
      ja: 'フルチャットキャプチャエラー',
      it: 'Errore cattura chat', zh: '聊天捕获错误', ko: '채팅 캡처 오류', hi: 'चैट कैप्चर त्रुटि'
    },
    
    // ─────────────────────────────────────────────────────────────
    // TOOLTIPS
    // ─────────────────────────────────────────────────────────────
    'tooltip.column1': {
      pt: '1 coluna',
      en: '1 column',
      es: '1 columna',
      fr: '1 colonne',
      de: '1 Spalte',
      ja: '1列',
      it: '1 colonna', zh: '1列', ko: '1열', hi: '1 कॉलम'
    },
    'tooltip.column2': {
      pt: '2 colunas',
      en: '2 columns',
      es: '2 columnas',
      fr: '2 colonnes',
      de: '2 Spalten',
      ja: '2列',
      it: '2 colonne', zh: '2列', ko: '2열', hi: '2 कॉलम'
    },
    'tooltip.column3': {
      pt: '3 colunas',
      en: '3 columns',
      es: '3 columnas',
      fr: '3 colonnes',
      de: '3 Spalten',
      ja: '3列',
      it: '3 colonne', zh: '3列', ko: '3열', hi: '3 कॉलम'
    },
    'tooltip.injectedtimes': {
      pt: 'Injetado {n} vezes',
      en: 'Injected {n} times',
      es: 'Inyectado {n} veces',
      fr: 'Injecté {n} fois',
      de: '{n} mal injiziert',
      ja: '{n}回注入済み',
      it: 'Iniettato {n} volte', zh: '已注入{n}次', ko: '{n}회 주입됨', hi: '{n} बार इंजेक्ट किया'
    },
    'tooltip.opensource': {
      pt: 'Abrir origem',
      en: 'Open source',
      es: 'Abrir origen',
      fr: 'Ouvrir l\'origine',
      de: 'Quelle öffnen',
      ja: 'ソースを開く',
      it: 'Apri origine', zh: '打开来源', ko: '원본 열기', hi: 'स्रोत खोलें'
    },
    'tooltip.manageattachments': {
      pt: 'Gerenciar anexos',
      en: 'Manage attachments',
      es: 'Gestionar adjuntos',
      fr: 'Gérer les pièces jointes',
      de: 'Anhänge verwalten',
      ja: '添付ファイルを管理',
      it: 'Gestisci allegati', zh: '管理附件', ko: '첨부파일 관리', hi: 'अनुलग्नक प्रबंधित करें'
    },
    'tooltip.filedetected': {
      pt: 'Arquivo detectado na resposta',
      en: 'File detected in response',
      es: 'Archivo detectado en respuesta',
      fr: 'Fichier détecté dans la réponse',
      de: 'Datei in Antwort erkannt',
      ja: '回答にファイルを検出',
      it: 'File rilevato nella risposta', zh: '回答中检测到文件', ko: '응답에서 파일 감지됨', hi: 'उत्तर में फ़ाइल मिली'
    },
    'tooltip.addnotes': {
      pt: 'Adicionar notas',
      en: 'Add notes',
      es: 'Añadir notas',
      fr: 'Ajouter des notes',
      de: 'Notizen hinzufügen',
      ja: 'メモを追加',
      it: 'Aggiungi note', zh: '添加笔记', ko: '노트 추가', hi: 'नोट जोड़ें'
    },
    'tooltip.injectfull': {
      pt: 'Injetar pergunta + resposta',
      en: 'Inject question + answer',
      es: 'Inyectar pregunta + respuesta',
      fr: 'Injecter question + réponse',
      de: 'Frage + Antwort injizieren',
      ja: '質問+回答を注入',
      it: 'Inietta domanda + risposta', zh: '注入问题+回答', ko: '질문+답변 주입', hi: 'प्रश्न+उत्तर इंजेक्ट करें'
    },
    'button.injectfull': {
      pt: 'TUDO',
      en: 'FULL',
      es: 'TODO',
      fr: 'TOUT',
      de: 'ALLES',
      ja: '全文',
      it: 'TUTTO', zh: '全部', ko: '전체', hi: 'सभी'
    },
    'tooltip.injectanswer': {
      pt: 'Injetar só resposta',
      en: 'Inject answer only',
      es: 'Inyectar solo respuesta',
      fr: 'Injecter seulement la réponse',
      de: 'Nur Antwort injizieren',
      ja: '回答のみ注入',
      it: 'Inietta solo risposta', zh: '仅注入回答', ko: '답변만 주입', hi: 'केवल उत्तर इंजेक्ट करें'
    },
    'button.injectanswer': {
      pt: 'RESP',
      en: 'ANS',
      es: 'RESP',
      fr: 'RÉP',
      de: 'ANT',
      ja: '回答',
      it: 'RISP', zh: '回答', ko: '답변', hi: 'उत्तर'
    },
    'tooltip.toggleinjectmode': {
      pt: 'Alternar modo de injeção',
      en: 'Toggle injection mode',
      es: 'Cambiar modo de inyección',
      fr: 'Basculer le mode d\'injection',
      de: 'Injektionsmodus umschalten',
      ja: '注入モードを切替',
      it: 'Cambia modalità iniezione', zh: '切换注入模式', ko: '주입 모드 전환', hi: 'इंजेक्शन मोड बदलें'
    },
    'tooltip.copytoclipboard': {
      pt: 'Copiar para área de transferência',
      en: 'Copy to clipboard',
      es: 'Copiar al portapapeles',
      fr: 'Copier dans le presse-papiers',
      de: 'In Zwischenablage kopieren',
      ja: 'クリップボードにコピー',
      it: 'Copia negli appunti', zh: '复制到剪贴板', ko: '클립보드에 복사', hi: 'क्लिपबोर्ड पर कॉपी करें'
    },
    'tooltip.editidea': {
      pt: 'Editar ideia',
      en: 'Edit idea',
      es: 'Editar idea',
      fr: 'Modifier l\'idée',
      de: 'Idee bearbeiten',
      ja: 'アイデアを編集',
      it: 'Modifica idea', zh: '编辑想法', ko: '아이디어 편집', hi: 'विचार संपादित करें'
    },
    'tooltip.deleteidea': {
      pt: 'Deletar ideia',
      en: 'Delete idea',
      es: 'Eliminar idea',
      fr: 'Supprimer l\'idée',
      de: 'Idee löschen',
      ja: 'アイデアを削除',
      it: 'Elimina idea', zh: '删除想法', ko: '아이디어 삭제', hi: 'विचार हटाएं'
    },
    'tooltip.confirmdelete': {
      pt: 'Confirmar exclusão',
      en: 'Confirm delete',
      es: 'Confirmar eliminación',
      fr: 'Confirmer la suppression',
      de: 'Löschen bestätigen',
      ja: '削除を確認',
      it: 'Conferma eliminazione', zh: '确认删除', ko: '삭제 확인', hi: 'हटाने की पुष्टि करें'
    },
    'tooltip.cancel': {
      pt: 'Cancelar',
      en: 'Cancel',
      es: 'Cancelar',
      fr: 'Annuler',
      de: 'Abbrechen',
      ja: 'キャンセル',
      it: 'Annulla', zh: '取消', ko: '취소', hi: 'रद्द करें'
    },
    'tooltip.changequeue': {
      pt: 'Mudar fila',
      en: 'Change queue',
      es: 'Cambiar cola',
      fr: 'Changer de file',
      de: 'Warteschlange ändern',
      ja: 'キューを変更',
      it: 'Cambia coda', zh: '更改队列', ko: '대기열 변경', hi: 'कतार बदलें'
    },
    'tooltip.canceledit': {
      pt: 'Cancelar edição',
      en: 'Cancel editing',
      es: 'Cancelar edición',
      fr: 'Annuler la modification',
      de: 'Bearbeitung abbrechen',
      ja: '編集をキャンセル',
      it: 'Annulla modifica', zh: '取消编辑', ko: '편집 취소', hi: 'संपादन रद्द करें'
    },
    'tooltip.savechanges': {
      pt: 'Salvar alterações',
      en: 'Save changes',
      es: 'Guardar cambios',
      fr: 'Sauvegarder les modifications',
      de: 'Änderungen speichern',
      ja: '変更を保存',
      it: 'Salva modifiche', zh: '保存更改', ko: '변경 사항 저장', hi: 'परिवर्तन सहेजें'
    },
    'tooltip.download': {
      pt: 'Baixar',
      en: 'Download',
      es: 'Descargar',
      fr: 'Télécharger',
      de: 'Herunterladen',
      ja: 'ダウンロード',
      it: 'Scarica', zh: '下载', ko: '다운로드', hi: 'डाउनलोड'
    },
    'tooltip.delete': {
      pt: 'Deletar',
      en: 'Delete',
      es: 'Eliminar',
      fr: 'Supprimer',
      de: 'Löschen',
      ja: '削除',
      it: 'Elimina', zh: '删除', ko: '삭제', hi: 'हटाएं'
    },
    
    // ─────────────────────────────────────────────────────────────
    // SETTINGS
    // ─────────────────────────────────────────────────────────────
    'settings.title': {
      pt: 'Configurações',
      en: 'Settings',
      es: 'Configuración',
      fr: 'Paramètres',
      de: 'Einstellungen',
      ja: '設定',
      it: 'Impostazioni', zh: '设置', ko: '설정', hi: 'सेटिंग्स'
    },
    'settings.account': {
      pt: 'Conta & Plano',
      en: 'Account & Plan',
      es: 'Cuenta y Plan',
      fr: 'Compte & Plan',
      de: 'Konto & Plan',
      ja: 'アカウント＆プラン',
      it: 'Account', zh: '账户', ko: '계정', hi: 'खाता'
    },
    'settings.injection': {
      pt: 'Injeção de Ideias',
      en: 'Idea Injection',
      es: 'Inyección de Ideas',
      fr: 'Injection d\'Idées',
      de: 'Ideen-Injektion',
      ja: 'アイデア注入',
      it: 'Iniezione', zh: '注入', ko: '주입', hi: 'इंजेक्शन'
    },
    'settings.crossplatform': {
      pt: 'Cross-Platform Inject',
      en: 'Cross-Platform Inject',
      es: 'Inyección Cross-Platform',
      fr: 'Injection Cross-Plateforme',
      de: 'Plattformübergreifende Injektion',
      ja: 'クロスプラットフォーム注入',
      it: 'Cross-Platform', zh: 'Cross-Platform', ko: '크로스 플랫폼', hi: 'क्रॉस-प्लेटफ़ॉर्म'
    },
    'settings.crossplatform.desc': {
      pt: 'Permite injetar ideias em sites diferentes da origem',
      en: 'Allows injecting ideas into different sites from origin',
      es: 'Permite inyectar ideas en sitios diferentes del origen',
      fr: 'Permet d\'injecter des idées dans des sites différents de l\'origine',
      de: 'Ermöglicht das Injizieren von Ideen in verschiedene Websites als Ursprung',
      ja: '元のサイトとは異なるサイトにアイデアを注入できます',
      it: 'Inietta in siti diversi dall\'origine', zh: '注入到不同于来源的网站', ko: '원본과 다른 사이트에 주입', hi: 'मूल से अलग साइटों में इंजेक्ट'
    },
    'settings.buttons': {
      pt: 'Botões no DOM',
      en: 'DOM Buttons',
      es: 'Botones en DOM',
      fr: 'Boutons dans le DOM',
      de: 'DOM-Schaltflächen',
      ja: 'DOMボタン',
      it: 'Pulsanti', zh: '按钮', ko: '버튼', hi: 'बटन'
    },
    'settings.showbuttons': {
      pt: 'Exibir Botões Automáticos',
      en: 'Show Auto Buttons',
      es: 'Mostrar Botones Automáticos',
      fr: 'Afficher les Boutons Automatiques',
      de: 'Auto-Schaltflächen Anzeigen',
      ja: '自動ボタンを表示',
      it: 'Mostra Pulsanti', zh: '显示按钮', ko: '버튼 표시', hi: 'बटन दिखाएं'
    },
    'settings.showbuttons.desc': {
      pt: 'Mostra botão 💡 Save nas respostas automaticamente',
      en: 'Shows 💡 Save button on responses automatically',
      es: 'Muestra botón 💡 Save en las respuestas automáticamente',
      fr: 'Affiche le bouton Save sur les réponses automatiquement',
      de: 'Zeigt Save-Button auf Antworten automatisch',
      ja: '回答にSaveボタンを自動表示',
      it: 'Mostra automaticamente i pulsanti NODUS', zh: '自动显示NODUS按钮', ko: 'NODUS 버튼 자동 표시', hi: 'NODUS बटन स्वचालित रूप से दिखाएं'
    },
    'settings.showbuttons.note': {
      pt: 'Alterações nos botões requerem recarregar a página.',
      en: 'Button changes require page reload.',
      es: 'Cambios en botones requieren recargar la página.',
      fr: 'Les changements de boutons nécessitent de recharger la page.',
      de: 'Button-Änderungen erfordern einen Seitenneustart.',
      ja: 'ボタンの変更はページの再読み込みが必要です。',
      it: 'Richiede ricaricamento pagina', zh: '需要重新加载页面', ko: '페이지 새로고침 필요', hi: 'पृष्ठ पुनः लोड आवश्यक'
    },
    'settings.animation': {
      pt: 'Animação de Cards',
      en: 'Card Animation',
      es: 'Animación de Cards',
      fr: 'Animation des Cartes',
      de: 'Karten-Animation',
      ja: 'カードアニメーション',
      it: 'Animazione', zh: '动画', ko: '애니메이션', hi: 'एनिमेशन'
    },
    'settings.animation.desc': {
      pt: 'Animação ao adicionar novos cards',
      en: 'Animation when adding new cards',
      es: 'Animación al añadir nuevos cards',
      fr: 'Animation lors de l\'ajout de nouvelles cartes',
      de: 'Animation beim Hinzufügen neuer Karten',
      ja: '新しいカード追加時のアニメーション',
      it: 'Abilita animazioni schede', zh: '启用卡片动画', ko: '카드 애니메이션 활성화', hi: 'कार्ड एनिमेशन सक्षम करें'
    },
    'settings.animation.choose': {
      pt: 'Escolha como novos cards aparecem no dashboard',
      en: 'Choose how new cards appear in dashboard',
      es: 'Elija cómo aparecen los nuevos cards en el dashboard',
      fr: 'Choisissez comment les nouvelles cartes apparaissent dans le tableau de bord',
      de: 'Wähle, wie neue Karten im Dashboard erscheinen',
      ja: '新しいカードのダッシュボードへの表示方法を選択',
      it: 'Scegli stile animazione', zh: '选择动画样式', ko: '애니메이션 스타일 선택', hi: 'एनिमेशन शैली चुनें'
    },
    'settings.telemetry': {
      pt: 'Telemetria & Estatísticas',
      en: 'Telemetry & Statistics',
      es: 'Telemetría & Estadísticas',
      fr: 'Télémétrie & Statistiques',
      de: 'Telemetrie & Statistiken',
      ja: 'テレメトリー＆統計',
      it: 'Telemetria & Statistiche', zh: '遥测与统计', ko: '텔레메트리 및 통계', hi: 'टेलीमेट्री और आँकड़े'
    },
    'settings.telemetry.warning': {
      pt: 'Desativar telemetria remove acesso às suas estatísticas pessoais',
      en: 'Disabling telemetry removes access to your personal statistics',
      es: 'Desactivar telemetría elimina acceso a tus estadísticas personales',
      fr: 'Désactiver la télémétrie supprime l\'accès à vos statistiques personnelles',
      de: 'Das Deaktivieren der Telemetrie entfernt den Zugang zu deinen persönlichen Statistiken',
      ja: 'テレメトリを無効にすると個人統計へのアクセスが削除されます',
      it: 'La telemetria aiuta a migliorare NODUS', zh: '遥测有助于改进NODUS', ko: '텔레메트리가 NODUS 개선에 도움이 됩니다', hi: 'टेलीमेट्री NODUS को बेहतर बनाने में मदद करती है'
    },
    'settings.telemetry.mode0': {
      pt: 'Modo 0: Desligado',
      en: 'Mode 0: Off',
      es: 'Modo 0: Apagado',
      fr: 'Mode 0 : Désactivé',
      de: 'Modus 0: Aus',
      ja: 'モード0：オフ',
      it: 'Disabilitata', zh: '已禁用', ko: '비활성화', hi: 'अक्षम'
    },
    'settings.telemetry.mode0.desc': {
      pt: 'Sem telemetria, sem estatísticas',
      en: 'No telemetry, no statistics',
      es: 'Sin telemetría, sin estadísticas',
      fr: 'Pas de télémétrie, pas de statistiques',
      de: 'Keine Telemetrie, keine Statistiken',
      ja: 'テレメトリなし、統計なし',
      it: 'Nessun dato condiviso', zh: '不共享任何数据', ko: '데이터 공유 없음', hi: 'कोई डेटा साझा नहीं'
    },
    'settings.telemetry.mode1': {
      pt: 'Modo 1: Analytics Pessoal',
      en: 'Mode 1: Personal Analytics',
      es: 'Modo 1: Analytics Personal',
      fr: 'Mode 1 : Analytics Personnel',
      de: 'Modus 1: Persönliche Analyse',
      ja: 'モード1：パーソナル分析',
      it: 'Abilitata', zh: '已启用', ko: '활성화', hi: 'सक्षम'
    },
    'settings.telemetry.mode1.desc': {
      pt: '100% anônimo (SHA-256) + Veja suas estatísticas',
      en: '100% anonymous (SHA-256) + View your statistics',
      es: '100% anónimo (SHA-256) + Ve tus estadísticas',
      fr: '100% anonyme (SHA-256) + Voir vos statistiques',
      de: '100% anonym (SHA-256) + Deine Statistiken ansehen',
      ja: '100%匿名（SHA-256）＋統計を表示',
      it: 'Dati aggregati e anonimi', zh: '聚合匿名数据', ko: '집계 익명 데이터', hi: 'एकत्रित अनाम डेटा'
    },
    'settings.telemetry.mode1.recommended': {
      pt: 'RECOMENDADO • Você nos ajuda, você ganha insights!',
      en: 'RECOMMENDED • You help us, you get insights!',
      es: 'RECOMENDADO • ¡Nos ayudas, obtienes insights!',
      fr: 'RECOMMANDÉ • Vous nous aidez, vous obtenez des insights!',
      de: 'EMPFOHLEN • Du hilfst uns, du bekommst Insights!',
      ja: '推奨 • あなたのサポートでinsightsを取得！',
      it: 'Consigliato', zh: '推荐', ko: '권장', hi: 'अनुशंसित'
    },
    'settings.telemetry.viewstats': {
      pt: 'Ver Minhas Estatísticas',
      en: 'View My Statistics',
      es: 'Ver Mis Estadísticas',
      fr: 'Voir Mes Statistiques',
      de: 'Meine Statistiken Anzeigen',
      ja: '統計を表示',
      it: 'Vedi Statistiche', zh: '查看统计', ko: '통계 보기', hi: 'आँकड़े देखें'
    },
    'settings.logs': {
      pt: 'Logs de Atividade',
      en: 'Activity Logs',
      es: 'Logs de Actividad',
      fr: 'Logs d\'Activité',
      de: 'Aktivitätslogs',
      ja: 'アクティビティログ',
      it: 'Log Attività', zh: '活动日志', ko: '활동 로그', hi: 'गतिविधि लॉग'
    },
    'settings.logs.desc': {
      pt: 'Últimas atividades registradas',
      en: 'Latest recorded activities',
      es: 'Últimas actividades registradas',
      fr: 'Dernières activités enregistrées',
      de: 'Zuletzt aufgezeichnete Aktivitäten',
      ja: '最近記録されたアクティビティ',
      it: 'Ultime azioni registrate', zh: '最近记录的操作', ko: '최근 기록된 작업', hi: 'हाल की दर्ज की गई क्रियाएं'
    },
    'settings.logs.refresh': {
      pt: 'Atualizar',
      en: 'Refresh',
      es: 'Actualizar',
      fr: 'Actualiser',
      de: 'Aktualisieren',
      ja: '更新',
      it: 'Aggiorna', zh: '刷新', ko: '새로고침', hi: 'ताज़ा करें'
    },
    'settings.logs.clear': {
      pt: 'Limpar Todos os Logs',
      en: 'Clear All Logs',
      es: 'Limpiar Todos los Logs',
      fr: 'Effacer Tous les Logs',
      de: 'Alle Logs Löschen',
      ja: 'すべてのログをクリア',
      it: 'Cancella Log', zh: '清除日志', ko: '로그 지우기', hi: 'लॉग साफ़ करें'
    },
    'settings.logs.loading': {
      pt: 'Carregando...',
      en: 'Loading...',
      es: 'Cargando...',
      fr: 'Chargement...',
      de: 'Laden...',
      ja: '読み込み中...',
      it: 'Caricamento...', zh: '加载中...', ko: '로드 중...', hi: 'लोड हो रहा है...'
    },
    'settings.logs.empty': {
      pt: 'Nenhum log encontrado',
      en: 'No logs found',
      es: 'Sin logs encontrados',
      fr: 'Aucun log trouvé',
      de: 'Keine Logs gefunden',
      ja: 'ログが見つかりません',
      it: 'Nessun log disponibile', zh: '没有可用日志', ko: '사용 가능한 로그 없음', hi: 'कोई लॉग उपलब्ध नहीं'
    },
    'settings.logs.error': {
      pt: 'Erro ao carregar logs',
      en: 'Error loading logs',
      es: 'Error al cargar logs',
      fr: 'Erreur lors du chargement des logs',
      de: 'Fehler beim Laden der Logs',
      ja: 'ログの読み込みエラー',
      it: 'Errore caricamento log', zh: '加载日志出错', ko: '로그 로드 오류', hi: 'लॉग लोड त्रुटि'
    },
    'settings.logs.clearwarning': {
      pt: 'Logs são gerados das ideias salvas. Para limpar, delete as ideias.',
      en: 'Logs are generated from saved ideas. To clear, delete the ideas.',
      es: 'Los logs se generan de las ideas guardadas. Para limpiar, elimina las ideas.',
      fr: 'Les logs sont générés à partir des idées sauvegardées. Pour les effacer, supprimez les idées.',
      de: 'Logs werden aus gespeicherten Ideen generiert. Zum Löschen Ideen entfernen.',
      ja: 'ログは保存されたアイデアから生成されます。削除するには、アイデアを削除してください。',
      it: 'Cancellare tutti i log?', zh: '清除所有日志？', ko: '모든 로그를 지우시겠습니까?', hi: 'सभी लॉग साफ़ करें?'
    },
    'settings.language': {
      pt: 'Idioma',
      en: 'Language',
      es: 'Idioma',
      fr: 'Langue',
      de: 'Sprache',
      ja: '言語',
      it: 'Lingua / Language', zh: '语言 / Language', ko: '언어 / Language', hi: 'भाषा / Language'
    },
    'settings.language.auto': {
      pt: 'Detectar automaticamente',
      en: 'Detect automatically',
      es: 'Detectar automáticamente',
      fr: 'Détecter automatiquement',
      de: 'Automatisch erkennen',
      ja: '自動検出',
      it: 'Rileva automaticamente', zh: '自动检测', ko: '자동 감지', hi: 'स्वतः पहचानें'
    },
    'settings.save': {
      pt: 'Salvar',
      en: 'Save',
      es: 'Guardar',
      fr: 'Sauvegarder',
      de: 'Speichern',
      ja: '保存',
      it: 'Salva', zh: '保存', ko: '저장', hi: 'सहेजें'
    },
    'settings.cancel': {
      pt: 'Cancelar',
      en: 'Cancel',
      es: 'Cancelar',
      fr: 'Annuler',
      de: 'Abbrechen',
      ja: 'キャンセル',
      it: 'Annulla', zh: '取消', ko: '취소', hi: 'रद्द करें'
    },
    'settings.saved': {
      pt: 'Configurações salvas!',
      en: 'Settings saved!',
      es: '¡Configuración guardada!',
      fr: 'Paramètres sauvegardés!',
      de: 'Einstellungen gespeichert!',
      ja: '設定を保存しました！',
      it: 'Impostazioni salvate!', zh: '设置已保存！', ko: '설정 저장됨!', hi: 'सेटिंग्स सहेजी गई!'
    },
    'settings.saveerror': {
      pt: 'Erro ao salvar configurações',
      en: 'Error saving settings',
      es: 'Error al guardar configuración',
      fr: 'Erreur lors de la sauvegarde des paramètres',
      de: 'Fehler beim Speichern der Einstellungen',
      ja: '設定の保存エラー',
      it: 'Errore nel salvataggio', zh: '保存时出错', ko: '저장 오류', hi: 'सहेजने में त्रुटि'
    },
    'settings.support': {
      pt: 'Apoie o NODUS',
      en: 'Support NODUS',
      es: 'Apoya NODUS',
      fr: 'Soutenez NODUS',
      de: 'NODUS Unterstützen',
      ja: 'NODUSをサポート',
      it: 'Supporta NODUS', zh: '支持NODUS', ko: 'NODUS 지원', hi: 'NODUS का समर्थन करें'
    },
    'settings.support.thanks': {
      pt: 'Obrigado por usar o NODUS!',
      en: 'Thank you for using NODUS!',
      es: '¡Gracias por usar NODUS!',
      fr: 'Merci d\'utiliser NODUS!',
      de: 'Danke, dass du NODUS nutzt!',
      ja: 'NODUSをご利用いただきありがとうございます！',
      it: 'Grazie per il supporto!', zh: '感谢您的支持！', ko: '지원해 주셔서 감사합니다!', hi: 'समर्थन के लिए धन्यवाद!'
    },
    'settings.support.message': {
      pt: 'O NODUS é feito com amor e café ☕. Se você acha útil, considere apoiar o desenvolvimento!',
      en: 'NODUS is made with love and coffee ☕. If you find it useful, consider supporting development!',
      es: 'NODUS está hecho con amor y café ☕. Si te resulta útil, ¡considera apoyar el desarrollo!',
      fr: 'NODUS est fait avec amour et café ☕. Si vous le trouvez utile, envisagez de soutenir le développement!',
      de: 'NODUS wird mit Liebe und Kaffee ☕ gemacht. Wenn du es nützlich findest, unterstütze die Entwicklung!',
      ja: 'NODUSは愛とコーヒー☕で作られています。役に立つと思ったら開発のサポートをご検討ください！',
      it: 'NODUS è un progetto open-source.', zh: 'NODUS是一个开源项目。', ko: 'NODUS는 오픈 소스 프로젝트입니다.', hi: 'NODUS एक ओपन-सोर्स प्रोजेक्ट है।'
    },
    'settings.support.kofi': {
      pt: 'Ko-fi',
      en: 'Ko-fi',
      es: 'Ko-fi',
      fr: 'Ko-fi',
      de: 'Ko-fi',
      ja: 'Ko-fi',
      it: 'Supporta su Ko-fi', zh: '在Ko-fi上支持', ko: 'Ko-fi에서 지원', hi: 'Ko-fi पर समर्थन करें'
    },
    'settings.support.kofi.desc': {
      pt: 'Compre um café para o desenvolvedor',
      en: 'Buy the developer a coffee',
      es: 'Cómprale un café al desarrollador',
      fr: 'Offrez un café au développeur',
      de: 'Dem Entwickler einen Kaffee kaufen',
      ja: '開発者にコーヒーを一杯',
      it: 'Donazione singola o mensile', zh: '一次性或每月捐款', ko: '일회성 또는 월간 기부', hi: 'एकल या मासिक दान'
    },
    'settings.support.github': {
      pt: 'GitHub Sponsors',
      en: 'GitHub Sponsors',
      es: 'GitHub Sponsors',
      fr: 'GitHub Sponsors',
      de: 'GitHub Sponsors',
      ja: 'GitHub Sponsors',
      it: 'Supporta su GitHub', zh: '在GitHub上支持', ko: 'GitHub에서 지원', hi: 'GitHub पर समर्थन करें'
    },
    'settings.support.github.desc': {
      pt: 'Apoio recorrente no GitHub',
      en: 'Recurring support on GitHub',
      es: 'Apoyo recurrente en GitHub',
      fr: 'Soutien récurrent sur GitHub',
      de: 'Regelmäßige Unterstützung auf GitHub',
      ja: 'GitHubでの定期サポート',
      it: 'Star, contribuisci o segnala problemi', zh: '点赞、贡献或报告问题', ko: '스타, 기여 또는 이슈 보고', hi: 'स्टार, योगदान या समस्या रिपोर्ट'
    },
    'settings.support.benefits': {
      pt: 'Seu apoio ajuda a:',
      en: 'Your support helps:',
      es: 'Tu apoyo ayuda a:',
      fr: 'Votre soutien aide à :',
      de: 'Deine Unterstützung hilft:',
      ja: 'あなたのサポートが役立つこと:',
      it: 'Vantaggi PRO', zh: 'PRO优势', ko: 'PRO 혜택', hi: 'PRO के फायदे'
    },
    'settings.support.benefit1': {
      pt: 'Manter o desenvolvimento ativo',
      en: 'Keep active development',
      es: 'Mantener el desarrollo activo',
      fr: 'Maintenir le développement actif',
      de: 'Aktive Entwicklung aufrechterhalten',
      ja: '積極的な開発の維持',
      it: '6 code + backup', zh: '6个队列 + 备份', ko: '6개 대기열 + 백업', hi: '6 कतारें + बैकअप'
    },
    'settings.support.benefit2': {
      pt: 'Adicionar novas funcionalidades',
      en: 'Add new features',
      es: 'Agregar nuevas funcionalidades',
      fr: 'Ajouter de nouvelles fonctionnalités',
      de: 'Neue Funktionen hinzufügen',
      ja: '新機能の追加',
      it: 'Export HTML + DOCX', zh: 'HTML + DOCX导出', ko: 'HTML + DOCX 내보내기', hi: 'HTML + DOCX निर्यात'
    },
    'settings.support.benefit3': {
      pt: 'Garantir privacidade e open source',
      en: 'Guarantee privacy and open source',
      es: 'Garantizar privacidad y código abierto',
      fr: 'Garantir la confidentialité et l\'open source',
      de: 'Datenschutz und Open Source gewährleisten',
      ja: 'プライバシーとオープンソースの保証',
      it: 'Full Chat Capture illimitato', zh: '无限全聊天捕获', ko: '무제한 전체 채팅 캡처', hi: 'असीमित फुल चैट कैप्चर'
    },
    'settings.support.benefit4': {
      pt: 'Suporte dedicado para apoiadores',
      en: 'Dedicated support for supporters',
      es: 'Soporte dedicado para patrocinadores',
      fr: 'Support dédié pour les supporters',
      de: 'Engagierter Support für Unterstützer',
      ja: 'サポーターへの専用サポート',
      it: 'Progetti illimitati', zh: '无限项目', ko: '무제한 프로젝트', hi: 'असीमित प्रोजेक्ट'
    },
    'settings.support.note': {
      pt: 'Doações são voluntárias. O NODUS FREE é e sempre será funcional!',
      en: 'Donations are voluntary. NODUS FREE is and always will be functional!',
      es: '¡Las donaciones son voluntarias. NODUS FREE es y siempre será funcional!',
      fr: 'Les dons sont volontaires. NODUS FREE est et sera toujours fonctionnel!',
      de: 'Spenden sind freiwillig. NODUS FREE ist und bleibt immer funktional!',
      ja: '寄付は任意です。NODUS FREEは今後も常に機能します！',
      it: 'Supporto visto entro 24h', zh: '24小时内处理支持', ko: '24시간 내 지원 처리', hi: '24 घंटे के भीतर सहायता'
    },
    
    // ─────────────────────────────────────────────────────────────
    // MODAL SAVE
    // ─────────────────────────────────────────────────────────────
    'modal.save.title': {
      pt: 'Salvar Ideia',
      en: 'Save Idea',
      es: 'Guardar Idea',
      fr: 'Sauvegarder l\'Idée',
      de: 'Idee Speichern',
      ja: 'アイデアを保存',
      it: 'Salva Idea', zh: '保存想法', ko: '아이디어 저장', hi: 'विचार सहेजें'
    },
    'modal.save.question': {
      pt: 'Pergunta',
      en: 'Question',
      es: 'Pregunta',
      fr: 'Question',
      de: 'Frage',
      ja: '質問',
      it: 'Domanda', zh: '问题', ko: '질문', hi: 'प्रश्न'
    },
    'modal.save.answer': {
      pt: 'Resposta',
      en: 'Answer',
      es: 'Respuesta',
      fr: 'Réponse',
      de: 'Antwort',
      ja: '回答',
      it: 'Risposta', zh: '回答', ko: '답변', hi: 'उत्तर'
    },
    'modal.save.tags': {
      pt: 'Tags',
      en: 'Tags',
      es: 'Tags',
      fr: 'Tags',
      de: 'Tags',
      ja: 'タグ',
      it: 'Tag', zh: '标签', ko: '태그', hi: 'टैग'
    },
    'modal.save.queue': {
      pt: 'Fila',
      en: 'Queue',
      es: 'Cola',
      fr: 'File',
      de: 'Warteschlange',
      ja: 'キュー',
      it: 'Coda', zh: '队列', ko: '대기열', hi: 'कतार'
    },
    'modal.save.btn': {
      pt: 'Salvar',
      en: 'Save',
      es: 'Guardar',
      fr: 'Sauvegarder',
      de: 'Speichern',
      ja: '保存',
      it: 'Salva', zh: '保存', ko: '저장', hi: 'सहेजें'
    },
    'modal.save.cancel': {
      pt: 'Cancelar',
      en: 'Cancel',
      es: 'Cancelar',
      fr: 'Annuler',
      de: 'Abbrechen',
      ja: 'キャンセル',
      it: 'Annulla', zh: '取消', ko: '취소', hi: 'रद्द करें'
    },
    
    // ─────────────────────────────────────────────────────────────
    // TOASTS
    // ─────────────────────────────────────────────────────────────
    'toast.saved': {
      pt: 'Ideia salva!',
      en: 'Idea saved!',
      es: '¡Idea guardada!',
      fr: 'Idée sauvegardée!',
      de: 'Idee gespeichert!',
      ja: 'アイデアを保存しました！',
      it: 'Salvato!', zh: '已保存！', ko: '저장됨!', hi: 'सहेजा गया!'
    },
    'toast.quicksaved': {
      pt: 'Quick Save!', en: 'Quick Save!', es: '¡Guardado Rápido!',
      fr: 'Sauvegarde Rapide!', de: 'Schnellspeicherung!', ja: 'クイック保存！',
      it: 'Salvataggio Rapido!', zh: '快速保存！', ko: '빠른 저장!', hi: 'त्वरित सहेजा!'
    },
    'toast.copied': {
      pt: 'Copiado!',
      en: 'Copied!',
      es: '¡Copiado!',
      fr: 'Copié!',
      de: 'Kopiert!',
      ja: 'コピーしました！',
      it: 'Copiato!', zh: '已复制！', ko: '복사됨!', hi: 'कॉपी हो गया!'
    },
    'toast.deleted': {
      pt: 'Deletado!',
      en: 'Deleted!',
      es: '¡Eliminado!',
      fr: 'Supprimé!',
      de: 'Gelöscht!',
      ja: '削除しました！',
      it: 'Eliminato!', zh: '已删除！', ko: '삭제됨!', hi: 'हटाया गया!'
    },
    'toast.exported': {
      pt: 'Exportado!',
      en: 'Exported!',
      es: '¡Exportado!',
      fr: 'Exporté!',
      de: 'Exportiert!',
      ja: 'エクスポートしました！',
      it: 'Esportato!', zh: '已导出！', ko: '내보내기됨!', hi: 'निर्यात हो गया!'
    },
    'toast.error': {
      pt: 'Erro!', en: 'Error!', es: '¡Error!',
      fr: 'Erreur!', de: 'Fehler!', ja: 'エラー！',
      it: 'Errore!', zh: '错误！', ko: '오류!', hi: 'त्रुटि!'
    },
    'toast.injected': {
      pt: 'Injetado!',
      en: 'Injected!',
      es: '¡Inyectado!',
      fr: 'Injecté!',
      de: 'Injiziert!',
      ja: '注入しました！',
      it: 'Iniettato!', zh: '已注入！', ko: '주입됨!', hi: 'इंजेक्ट हो गया!'
    },
    'toast.chainpinned': {
      pt: 'Chain fixada!',
      en: 'Chain pinned!',
      es: '¡Chain fijada!',
      fr: 'Chain épinglée!',
      de: 'Chain angeheftet!',
      ja: 'チェーンをピン留めしました！',
      it: 'Catena fissata!', zh: '链已固定！', ko: '체인이 고정됨!', hi: 'चेन पिन की गई!'
    },
    'toast.chainunpinned': {
      pt: 'Chain desafixada!',
      en: 'Chain unpinned!',
      es: '¡Chain desanclada!',
      fr: 'Chain désépinglée!',
      de: 'Chain abgeheftet!',
      ja: 'チェーンのピン留めを解除しました！',
      it: 'Catena rimossa!', zh: '链已取消固定！', ko: '체인 고정 해제됨!', hi: 'चेन अनपिन की गई!'
    },
    'toast.telemetrydisabled': {
      pt: 'Telemetria desativada. Estatísticas não estarão disponíveis.',
      en: 'Telemetry disabled. Statistics will not be available.',
      es: 'Telemetría desactivada. Estadísticas no estarán disponibles.',
      fr: 'Télémétrie désactivée. Les statistiques ne seront pas disponibles.',
      de: 'Telemetrie deaktiviert. Statistiken werden nicht verfügbar sein.',
      ja: 'テレメトリを無効化しました。統計は利用できません。',
      it: 'Telemetria disabilitata', zh: '遥测已禁用', ko: '텔레메트리 비활성화됨', hi: 'टेलीमेट्री अक्षम'
    },
    
    // ─────────────────────────────────────────────────────────────
    // CHAIN ACTIONS
    // ─────────────────────────────────────────────────────────────
    'chain.actions': {
      pt: 'Ações',
      en: 'Actions',
      es: 'Acciones',
      fr: 'Actions',
      de: 'Aktionen',
      ja: 'アクション',
      it: 'Azioni', zh: '操作', ko: '작업', hi: 'क्रियाएं'
    },
    'chain.inject': {
      pt: 'Injetar cadeia',
      en: 'Inject chain',
      es: 'Inyectar cadena',
      fr: 'Injecter la chaîne',
      de: 'Kette injizieren',
      ja: 'チェーンを注入',
      it: 'Inietta Catena', zh: '注入链', ko: '체인 주입', hi: 'चेन इंजेक्ट'
    },
    'chain.copy': {
      pt: 'Copiar',
      en: 'Copy',
      es: 'Copiar',
      fr: 'Copier',
      de: 'Kopieren',
      ja: 'コピー',
      it: 'Copia', zh: '复制', ko: '복사', hi: 'कॉपी'
    },
    'chain.export': {
      pt: 'Exportar',
      en: 'Export',
      es: 'Exportar',
      fr: 'Exporter',
      de: 'Exportieren',
      ja: 'エクスポート',
      it: 'Esporta', zh: '导出', ko: '내보내기', hi: 'निर्यात'
    },
    'chain.delete': {
      pt: 'Deletar',
      en: 'Delete',
      es: 'Eliminar',
      fr: 'Supprimer',
      de: 'Löschen',
      ja: '削除',
      it: 'Elimina Catena', zh: '删除链', ko: '체인 삭제', hi: 'चेन हटाएं'
    },
    'chain.delete.confirm': {
      pt: 'Confirmar?',
      en: 'Confirm?',
      es: '¿Confirmar?',
      fr: 'Confirmer?',
      de: 'Bestätigen?',
      ja: '確認？',
      it: 'Eliminare la catena?', zh: '删除该链？', ko: '체인을 삭제하시겠습니까?', hi: 'चेन हटाएं?'
    },
    'chain.delete.yes': {
      pt: 'Sim',
      en: 'Yes',
      es: 'Sí',
      fr: 'Oui',
      de: 'Ja',
      ja: 'はい',
      it: 'Sì, elimina', zh: '是的，删除', ko: '예, 삭제', hi: 'हां, हटाएं'
    },
    'chain.delete.no': {
      pt: 'Não',
      en: 'No',
      es: 'No',
      fr: 'Non',
      de: 'Nein',
      ja: 'いいえ',
      it: 'No, mantieni', zh: '不，保留', ko: '아니요, 유지', hi: 'नहीं, रखें'
    },
    'chain.nodes': {
      pt: 'nós',
      en: 'nodes',
      es: 'nodos',
      fr: 'nœuds',
      de: 'Knoten',
      ja: 'ノード',
      it: 'nodi', zh: '节点', ko: '노드', hi: 'नोड'
    },
    'chain.node': {
      pt: 'nó',
      en: 'node',
      es: 'nodo',
      fr: 'nœud',
      de: 'Knoten',
      ja: 'ノード',
      it: 'nodo', zh: '节点', ko: '노드', hi: 'नोड'
    },
    'chain.attachments': {
      pt: 'Anexos',
      en: 'Attachments',
      es: 'Adjuntos',
      fr: 'Pièces jointes',
      de: 'Anhänge',
      ja: '添付ファイル',
      it: 'allegati', zh: '附件', ko: '첨부', hi: 'अनुलग्नक'
    },
    'chain.notes': {
      pt: 'Notas',
      en: 'Notes',
      es: 'Notas',
      fr: 'Notes',
      de: 'Notizen',
      ja: 'メモ',
      it: 'note', zh: '笔记', ko: '노트', hi: 'नोट'
    },

    // ─────────────────────────────────────────────────────────────
    // MÉTRICAS / TELEMETRIA
    // ─────────────────────────────────────────────────────────────
    'metrics.title': {
      pt: 'Suas Métricas Pessoais',
      en: 'Your Personal Metrics',
      es: 'Tus Métricas Personales',
      fr: 'Vos Métriques Personnelles',
      de: 'Deine Persönlichen Metriken',
      ja: 'あなたの個人メトリクス',
      it: 'Statistiche di Utilizzo', zh: '使用统计', ko: '사용 통계', hi: 'उपयोग आँकड़े'
    },
    'metrics.subtitle': {
      pt: 'Últimos 90 dias • 100% Local',
      en: 'Last 90 days • 100% Local',
      es: 'Últimos 90 días • 100% Local',
      fr: '90 derniers jours • 100% Local',
      de: 'Letzte 90 Tage • 100% Lokal',
      ja: '過去90日 • 100%ローカル',
      it: 'Ultimi 90 giorni', zh: '过去90天', ko: '최근 90일', hi: 'पिछले 90 दिन'
    },
    'metrics.totalevents': {
      pt: 'Total de Eventos',
      en: 'Total Events',
      es: 'Total de Eventos',
      fr: 'Total des Événements',
      de: 'Gesamtereignisse',
      ja: '総イベント数',
      it: 'eventi totali', zh: '总事件', ko: '총 이벤트', hi: 'कुल घटनाएं'
    },
    'metrics.saved': {
      pt: 'Ideias Salvas',
      en: 'Saved Ideas',
      es: 'Ideas Guardadas',
      fr: 'Idées Sauvegardées',
      de: 'Gespeicherte Ideen',
      ja: '保存済みアイデア',
      it: 'salvati', zh: '已保存', ko: '저장됨', hi: 'सहेजे गए'
    },
    'metrics.reuses': {
      pt: 'Reutilizações',
      en: 'Reuses',
      es: 'Reutilizaciones',
      fr: 'Réutilisations',
      de: 'Wiederverwendungen',
      ja: '再利用回数',
      it: 'riusi', zh: '重用次数', ko: '재사용', hi: 'पुन: उपयोग'
    },
    'metrics.reuserate': {
      pt: 'Taxa de Reuso',
      en: 'Reuse Rate',
      es: 'Tasa de Reutilización',
      fr: 'Taux de Réutilisation',
      de: 'Wiederverwendungsrate',
      ja: '再利用率',
      it: 'tasso riuso', zh: '重用率', ko: '재사용률', hi: 'पुन: उपयोग दर'
    },
    'metrics.platforms': {
      pt: 'Uso por Plataforma',
      en: 'Platform Usage',
      es: 'Uso por Plataforma',
      fr: 'Utilisation par Plateforme',
      de: 'Plattformnutzung',
      ja: 'プラットフォーム別使用',
      it: 'Piattaforme', zh: '平台', ko: '플랫폼', hi: 'प्लेटफ़ॉर्म'
    },
    'metrics.methods': {
      pt: 'Métodos de Captura',
      en: 'Capture Methods',
      es: 'Métodos de Captura',
      fr: 'Méthodes de Capture',
      de: 'Aufnahmemethoden',
      ja: 'キャプチャ方法',
      it: 'Metodi di Salvataggio', zh: '保存方法', ko: '저장 방법', hi: 'सहेजने के तरीके'
    },
    'metrics.contenttypes': {
      pt: 'Tipos de Conteúdo',
      en: 'Content Types',
      es: 'Tipos de Contenido',
      fr: 'Types de Contenu',
      de: 'Inhaltstypen',
      ja: 'コンテンツタイプ',
      it: 'Tipi di Contenuto', zh: '内容类型', ko: '콘텐츠 유형', hi: 'सामग्री प्रकार'
    },
    'metrics.nodata': {
      pt: 'Sem dados',
      en: 'No data',
      es: 'Sin datos',
      fr: 'Pas de données',
      de: 'Keine Daten',
      ja: 'データなし',
      it: 'Nessun dato', zh: '无数据', ko: '데이터 없음', hi: 'कोई डेटा नहीं'
    },
    'metrics.footer': {
      pt: 'Dados calculados <strong>localmente</strong> • últimos 90 dias.<br>Versões agregadas e anônimas (k=10) são compartilhadas para melhorar o NODUS.',
      en: 'Data calculated <strong>locally</strong> • last 90 days.<br>Aggregated and anonymous versions (k=10) are shared to improve NODUS.',
      es: 'Datos calculados <strong>localmente</strong> • últimos 90 días.<br>Versiones agregadas y anónimas (k=10) se comparten para mejorar NODUS.',
      fr: 'Données calculées <strong>localement</strong> • 90 derniers jours.<br>Des versions agrégées et anonymes (k=10) sont partagées pour améliorer NODUS.',
      de: 'Daten werden <strong>lokal</strong> berechnet • letzte 90 Tage.<br>Aggregierte und anonyme Versionen (k=10) werden zur Verbesserung von NODUS geteilt.',
      ja: 'データは<strong>ローカル</strong>で計算されます • 過去90日間。<br>集計・匿名化されたバージョン (k=10) がNODUSの改善のために共有されます。',
      it: 'Dati calcolati <strong>localmente</strong> • ultimi 90 giorni.<br>Versioni aggregate e anonime (k=10) vengono condivise per migliorare NODUS.', zh: '数据在<strong>本地</strong>计算 • 最近90天。<br>聚合和匿名版本（k=10）被共享以改进NODUS。', ko: '데이터는 <strong>로컬</strong>에서 계산됩니다 • 최근 90일.<br>집계 및 익명화된 버전(k=10)이 NODUS 개선을 위해 공유됩니다.', hi: 'डेटा <strong>स्थानीय रूप से</strong> गणना किया जाता है • पिछले 90 दिन।<br>NODUS को बेहतर बनाने के लिए एकत्रित और अनाम संस्करण (k=10) साझा किए जाते हैं।'
    },
    'metrics.export': {
      pt: 'Exportar Dados (JSON)',
      en: 'Export Data (JSON)',
      es: 'Exportar Datos (JSON)',
      fr: 'Exporter les Données (JSON)',
      de: 'Daten Exportieren (JSON)',
      ja: 'データをエクスポート（JSON）',
      it: 'Esporta', zh: '导出', ko: '내보내기', hi: 'निर्यात'
    },
    'metrics.exported': {
      pt: 'Exportado!',
      en: 'Exported!',
      es: '¡Exportado!',
      fr: 'Exporté!',
      de: 'Exportiert!',
      ja: 'エクスポートしました！',
      it: 'Esportato!', zh: '已导出！', ko: '내보내기됨!', hi: 'निर्यात हो गया!'
    },
    'metrics.insight': {
      pt: 'Você usa IA principalmente para <strong>{type}</strong> ({pct}%)',
      en: 'You mainly use AI for <strong>{type}</strong> ({pct}%)',
      es: 'Principalmente usas IA para <strong>{type}</strong> ({pct}%)',
      fr: 'Vous utilisez principalement l\'IA pour <strong>{type}</strong> ({pct}%)',
      de: 'Sie nutzen KI hauptsächlich für <strong>{type}</strong> ({pct}%)',
      ja: 'AIを主に<strong>{type}</strong>に使用しています ({pct}%)',
      it: 'Usi principalmente l\'IA per <strong>{type}</strong> ({pct}%)', zh: '您主要将AI用于<strong>{type}</strong>（{pct}%）', ko: 'AI를 주로 <strong>{type}</strong>에 사용합니다 ({pct}%)', hi: 'आप मुख्य रूप से AI का उपयोग <strong>{type}</strong> के लिए करते हैं ({pct}%)'
    },
    'metrics.type.code': { pt: 'programação', en: 'programming', es: 'programación', fr: 'programmation', de: 'Programmierung', ja: 'プログラミング',
      it: 'programmazione', zh: '编程', ko: '프로그래밍', hi: 'प्रोग्रामिंग' },
    'metrics.type.technical_explanation': { pt: 'explicações técnicas', en: 'technical explanations', es: 'explicaciones técnicas', fr: 'explications techniques', de: 'technische Erklärungen', ja: '技術的説明',
      it: 'spiegazioni tecniche', zh: '技术解释', ko: '기술 설명', hi: 'तकनीकी स्पष्टीकरण' },
    'metrics.type.narrative': { pt: 'narrativas', en: 'narratives', es: 'narrativas', fr: 'récits', de: 'Erzählungen', ja: 'ナラティブ',
      it: 'narrazioni', zh: '叙述', ko: '서사', hi: 'कथा' },
    'metrics.type.list': { pt: 'listas', en: 'lists', es: 'listas', fr: 'listes', de: 'Listen', ja: 'リスト',
      it: 'liste', zh: '列表', ko: '목록', hi: 'सूची' },
    'metrics.type.summary': { pt: 'resumos', en: 'summaries', es: 'resúmenes', fr: 'résumés', de: 'Zusammenfassungen', ja: '要約',
      it: 'riassunti', zh: '摘要', ko: '요약', hi: 'सारांश' },
    'metrics.type.brainstorm': { pt: 'brainstorming', en: 'brainstorming', es: 'lluvia de ideas', fr: 'brainstorming', de: 'Brainstorming', ja: 'ブレインストーミング',
      it: 'brainstorming', zh: '头脑风暴', ko: '브레인스토밍', hi: 'विचार-मंथन' },
    'metrics.type.answer': { pt: 'respostas diretas', en: 'direct answers', es: 'respuestas directas', fr: 'réponses directes', de: 'direkte Antworten', ja: '直接回答',
      it: 'risposte dirette', zh: '直接回答', ko: '직접 답변', hi: 'प्रत्यक्ष उत्तर' },
    'metrics.type.other': { pt: 'outros conteúdos', en: 'other content', es: 'otro contenido', fr: 'autre contenu', de: 'andere Inhalte', ja: 'その他のコンテンツ',
      it: 'altri contenuti', zh: '其他内容', ko: '기타 콘텐츠', hi: 'अन्य सामग्री' },

    // ─────────────────────────────────────────────────────────────
    // PROJETOS
    // ─────────────────────────────────────────────────────────────
    'project.projects': {
      pt: 'Projetos',
      en: 'Projects',
      es: 'Proyectos',
      fr: 'Projets',
      de: 'Projekte',
      ja: 'プロジェクト',
      it: 'Progetti', zh: '项目', ko: '프로젝트', hi: 'प्रोजेक्ट'
    },
    'project.new': {
      pt: 'Novo Projeto',
      en: 'New Project',
      es: 'Nuevo Proyecto',
      fr: 'Nouveau Projet',
      de: 'Neues Projekt',
      ja: '新しいプロジェクト',
      it: 'Nuovo Progetto', zh: '新建项目', ko: '새 프로젝트', hi: 'नया प्रोजेक्ट'
    },
    'project.edit': {
      pt: 'Editar Projeto',
      en: 'Edit Project',
      es: 'Editar Proyecto',
      fr: 'Modifier le Projet',
      de: 'Projekt Bearbeiten',
      ja: 'プロジェクトを編集',
      it: 'Modifica', zh: '编辑', ko: '편집', hi: 'संपादित'
    },
    'project.create': {
      pt: 'Criar Projeto',
      en: 'Create Project',
      es: 'Crear Proyecto',
      fr: 'Créer le Projet',
      de: 'Projekt Erstellen',
      ja: 'プロジェクトを作成',
      it: 'Crea Progetto', zh: '创建项目', ko: '프로젝트 생성', hi: 'प्रोजेक्ट बनाएं'
    },
    'project.general': {
      pt: 'Geral',
      en: 'General',
      es: 'General',
      fr: 'Général',
      de: 'Allgemein',
      ja: '全般',
      it: 'Generale', zh: '通用', ko: '일반', hi: 'सामान्य'
    },
    'project.noproj': {
      pt: 'Sem Projeto',
      en: 'No Project',
      es: 'Sin Proyecto',
      fr: 'Sans Projet',
      de: 'Kein Projekt',
      ja: 'プロジェクトなし',
      it: 'Senza Progetto', zh: '无项目', ko: '프로젝트 없음', hi: 'बिना प्रोजेक्ट'
    },
    'project.name': {
      pt: 'Nome do Projeto',
      en: 'Project Name',
      es: 'Nombre del Proyecto',
      fr: 'Nom du Projet',
      de: 'Projektname',
      ja: 'プロジェクト名',
      it: 'Nome', zh: '名称', ko: '이름', hi: 'नाम'
    },
    'project.name.placeholder': {
      pt: 'Ex: Trabalho, Estudos...',
      en: 'Ex: Work, Studies...',
      es: 'Ej: Trabajo, Estudios...',
      fr: 'Ex: Travail, Études...',
      de: 'Z.B.: Arbeit, Studium...',
      ja: '例：仕事、勉強...',
      it: 'Nome progetto...', zh: '项目名称...', ko: '프로젝트 이름...', hi: 'प्रोजेक्ट का नाम...'
    },
    'project.color': {
      pt: 'Cor',
      en: 'Color',
      es: 'Color',
      fr: 'Couleur',
      de: 'Farbe',
      ja: '色',
      it: 'Colore', zh: '颜色', ko: '색상', hi: 'रंग'
    },
    'project.delete.confirm': {
      pt: 'Excluir projeto "{name}"?\n\nCards e cadeias serão movidos para "Sem Projeto".',
      en: 'Delete project "{name}"?\n\nCards and chains will be moved to "No Project".',
      es: '¿Eliminar proyecto "{name}"?\n\nCards y cadenas se moverán a "Sin Proyecto".',
      fr: 'Supprimer le projet "{name}" ?\n\nLes cartes et chaînes seront déplacées vers "Sans Projet".',
      de: 'Projekt "{name}" löschen?\n\nKarten und Ketten werden nach "Kein Projekt" verschoben.',
      ja: 'プロジェクト "{name}" を削除しますか？\n\nカードとチェーンは「プロジェクトなし」に移動されます。',
      it: 'Eliminare il progetto "{name}"?\n\nSchede e catene verranno spostati in "Senza Progetto".', zh: '删除项目"{name}"？\n\n卡片和链将移至"无项目"。', ko: '프로젝트 "{name}"을 삭제하시겠습니까?\n\n카드와 체인이 "프로젝트 없음"으로 이동됩니다.', hi: 'प्रोजेक्ट "{name}" हटाएं?\n\nकार्ड और चेन "बिना प्रोजेक्ट" में स्थानांतरित हो जाएंगे।'
    },

    // ─────────────────────────────────────────────────────────────
    // GATE ÉTICO
    // ─────────────────────────────────────────────────────────────
    'gate.welcome': {
      pt: 'Bem-vindo ao NODUS',
      en: 'Welcome to NODUS',
      es: 'Bienvenido a NODUS',
      fr: 'Bienvenue dans NODUS',
      de: 'Willkommen bei NODUS',
      ja: 'NODUSへようこそ',
      it: 'Benvenuto in NODUS', zh: '欢迎使用NODUS', ko: 'NODUS에 오신 것을 환영합니다', hi: 'NODUS में आपका स्वागत है'
    },
    'gate.desc': {
      pt: 'Seu gerenciador de conversas com IA',
      en: 'Your AI conversation manager',
      es: 'Tu gestor de conversaciones con IA',
      fr: 'Votre gestionnaire de conversations IA',
      de: 'Ihr KI-Gesprächs-Manager',
      ja: 'AIの会話マネージャー',
      it: 'Il tuo assistente per conversazioni IA', zh: '您的AI对话个人助手', ko: 'AI 대화를 위한 개인 도우미', hi: 'AI बातचीत के लिए सहायक'
    },
    'gate.privacy.title': {
      pt: 'Privacidade em Primeiro Lugar',
      en: 'Privacy First',
      es: 'Privacidad Primero',
      fr: 'La Confidentialité en Premier',
      de: 'Datenschutz Zuerst',
      ja: 'プライバシーファースト',
      it: 'Privacy & Dati', zh: '隐私与数据', ko: '개인정보 및 데이터', hi: 'गोपनीयता और डेटा'
    },
    'gate.privacy.local': {
      pt: 'Todos os dados ficam no seu dispositivo',
      en: 'All data stays on your device',
      es: 'Todos los datos permanecen en tu dispositivo',
      fr: 'Toutes les données restent sur votre appareil',
      de: 'Alle Daten bleiben auf deinem Gerät',
      ja: 'すべてのデータはデバイスに留まります',
      it: 'Dati 100% locali', zh: '100%本地数据', ko: '100% 로컬 데이터', hi: '100% स्थानीय डेटा'
    },
    'gate.privacy.nocollection': {
      pt: 'Não coletamos suas conversas',
      en: 'We don\'t collect your conversations',
      es: 'No recolectamos tus conversaciones',
      fr: 'Nous ne collectons pas vos conversations',
      de: 'Wir sammeln deine Gespräche nicht',
      ja: '会話は収集しません',
      it: 'Nessuna raccolta dati personali', zh: '不收集个人数据', ko: '개인 데이터 수집 없음', hi: 'कोई व्यक्तिगत डेटा संग्रह नहीं'
    },
    'gate.privacy.anonymous': {
      pt: 'Telemetria 100% anônima e opcional',
      en: '100% anonymous and optional telemetry',
      es: 'Telemetría 100% anónima y opcional',
      fr: 'Télémétrie 100% anonyme et optionnelle',
      de: '100% anonyme und optionale Telemetrie',
      ja: '100%匿名かつオプションのテレメトリー',
      it: 'Telemetria 100% anonima e opzionale', zh: '100%匿名且可选的遥测', ko: '100% 익명 및 선택적 텔레메트리', hi: '100% अनाम और वैकल्पिक टेलीमेट्री'
    },
    'gate.accept': {
      pt: 'Aceitar e Continuar',
      en: 'Accept and Continue',
      es: 'Aceptar y Continuar',
      fr: 'Accepter et Continuer',
      de: 'Akzeptieren und Weiter',
      ja: '同意して続ける',
      it: 'Accetta e Inizia', zh: '接受并开始', ko: '수락하고 시작', hi: 'स्वीकार करें और शुरू करें'
    },
    'gate.decline': {
      pt: 'Recusar',
      en: 'Decline',
      es: 'Rechazar',
      fr: 'Refuser',
      de: 'Ablehnen',
      ja: '拒否する',
      it: 'Rifiuta', zh: '拒绝', ko: '거부', hi: 'अस्वीकार'
    },
    
    // ─────────────────────────────────────────────────────────────
    // TEMPO RELATIVO
    // ─────────────────────────────────────────────────────────────
    'time.now': {
      pt: 'agora',
      en: 'now',
      es: 'ahora',
      fr: 'maintenant',
      de: 'jetzt',
      ja: '今',
      it: 'adesso', zh: '刚刚', ko: '방금', hi: 'अभी'
    },
    'time.min': {
      pt: 'min',
      en: 'min',
      es: 'min',
      fr: 'min',
      de: 'min',
      ja: '分',
      it: 'min fa', zh: '分钟前', ko: '분 전', hi: 'मिनट पहले'
    },
    'time.hour': {
      pt: 'h',
      en: 'h',
      es: 'h',
      fr: 'h',
      de: 'h',
      ja: '時間',
      it: 'ore fa', zh: '小时前', ko: '시간 전', hi: 'घंटे पहले'
    },
    'time.day': {
      pt: 'd',
      en: 'd',
      es: 'd',
      fr: 'j',
      de: 'T',
      ja: '日',
      it: 'giorni fa', zh: '天前', ko: '일 전', hi: 'दिन पहले'
    },
    
    // ─────────────────────────────────────────────────────────────
    // PRO FEATURES
    // ─────────────────────────────────────────────────────────────
    'pro.feature': {
      pt: 'Feature PRO',
      en: 'PRO Feature',
      es: 'Feature PRO',
      fr: 'Fonctionnalité PRO',
      de: 'PRO-Funktion',
      ja: 'PRO機能',
      it: 'Funzionalità PRO', zh: 'PRO功能', ko: 'PRO 기능', hi: 'PRO सुविधा'
    },
    'pro.upgrade': {
      pt: 'Fazer Upgrade',
      en: 'Upgrade',
      es: 'Mejorar',
      fr: 'Améliorer',
      de: 'Upgrade',
      ja: 'アップグレード',
      it: 'Aggiorna a PRO', zh: '升级到PRO', ko: 'PRO로 업그레이드', hi: 'PRO में अपग्रेड करें'
    },
    // ─────────────────────────────────────────────────────────────
    // ETHICAL GATE
    // ─────────────────────────────────────────────────────────────
    'ethicalGate.title': {
      pt: 'Bem-vindo ao NODUS',
      en: 'Welcome to NODUS',
      es: 'Bienvenido a NODUS',
      fr: 'Bienvenue dans NODUS',
      de: 'Willkommen bei NODUS',
      ja: 'NODUSへようこそ',
      it: 'Navigatore Personale di Idee', zh: '个人创意导航器', ko: '개인 아이디어 내비게이터', hi: 'व्यक्तिगत विचार नेविगेटर'
    },
    'ethicalGate.subtitle': {
      pt: 'Navegador Pessoal de Ideias',
      en: 'Personal Idea Navigator',
      es: 'Navegador Personal de Ideas',
      fr: 'Navigateur Personnel d\'Idées',
      de: 'Persönlicher Ideen-Navigator',
      ja: 'パーソナルアイデアナビゲーター',
      it: 'Il tuo spazio privato per le idee IA', zh: '您的AI想法私人空间', ko: 'AI 아이디어를 위한 개인 공간', hi: 'AI विचारों के लिए आपकी निजी जगह'
    },
    'ethicalGate.description': {
      pt: 'O NODUS foi criado para <strong style="color: #e2e8f0;">capturar, organizar e reutilizar</strong> ideias geradas em suas interações com inteligências artificiais (IA), de forma <strong style="color: #60a5fa;">100% ética e local</strong>.',
      en: 'NODUS was created to <strong style="color: #e2e8f0;">capture, organize, and reuse</strong> ideas generated in your interactions with artificial intelligences (AI), in a <strong style="color: #60a5fa;">100% ethical and local</strong> way.',
      es: 'NODUS fue creado para <strong style="color: #e2e8f0;">capturar, organizar y reutilizar</strong> ideas generadas en tus interacciones con inteligencias artificiales (IA), de forma <strong style="color: #60a5fa;">100% ética y local</strong>.',
      fr: 'NODUS a été créé pour <strong style="color: #e2e8f0;">capturer, organiser et réutiliser</strong> les idées générées dans vos interactions avec les intelligences artificielles (IA), de manière <strong style="color: #60a5fa;">100% éthique et locale</strong>.',
      de: 'NODUS wurde entwickelt, um Ideen aus Ihren Interaktionen mit künstlichen Intelligenzen (KI) zu <strong style="color: #e2e8f0;">erfassen, zu organisieren und wiederzuverwenden</strong>, auf eine <strong style="color: #60a5fa;">100% ethische und lokale</strong> Weise.',
      ja: 'NODUSは、人工知能（AI）とのやり取りで生まれたアイデアを<strong style="color: #e2e8f0;">キャプチャ、整理、再利用</strong>するために作られました。<strong style="color: #60a5fa;">100%倫理的かつローカル</strong>な方法で。',
      it: 'NODUS è stato creato per <strong style="color: #e2e8f0;">catturare, organizzare e riutilizzare</strong> idee generate nelle tue interazioni con le intelligenze artificiali (IA), in modo <strong style="color: #60a5fa;">100% etico e locale</strong>.', zh: 'NODUS旨在以<strong style="color: #60a5fa;">100%道德和本地</strong>的方式<strong style="color: #e2e8f0;">捕获、组织和重用</strong>您与人工智能（AI）交互中产生的想法。', ko: 'NODUS는 인공지능(AI)과의 상호작용에서 생성된 아이디어를 <strong style="color: #60a5fa;">100% 윤리적이고 로컬</strong>한 방식으로 <strong style="color: #e2e8f0;">캡처, 정리 및 재사용</strong>하기 위해 만들어졌습니다.', hi: 'NODUS को <strong style="color: #60a5fa;">100% नैतिक और स्थानीय</strong> तरीके से आपकी AI के साथ बातचीत में उत्पन्न विचारों को <strong style="color: #e2e8f0;">कैप्चर, व्यवस्थित और पुन: उपयोग</strong> करने के लिए बनाया गया था।'
    },
    'ethicalGate.privacy': {
      pt: 'Nada do que você salvar aqui será enviado para servidores externos.',
      en: 'Nothing you save here will be sent to external servers.',
      es: 'Nada de lo que guardes aquí será enviado a servidores externos.',
      fr: 'Rien de ce que vous sauvegardez ici ne sera envoyé à des serveurs externes.',
      de: 'Nichts, was Sie hier speichern, wird an externe Server gesendet.',
      ja: 'ここで保存するものは外部サーバーに送信されません。',
      it: 'Privacy Prima di Tutto', zh: '隐私优先', ko: '프라이버시 우선', hi: 'गोपनीयता सर्वप्रथम'
    },
    'ethicalGate.control': {
      pt: 'Você tem total controle sobre suas ideias.',
      en: 'You have total control over your ideas.',
      es: 'Tienes control total sobre tus ideas.',
      fr: 'Vous avez le contrôle total sur vos idées.',
      de: 'Sie haben die vollständige Kontrolle über Ihre Ideen.',
      ja: 'アイデアの完全なコントロールはあなたにあります。',
      it: 'Hai il pieno controllo dei tuoi dati', zh: '您完全控制您的数据', ko: '데이터에 대한 완전한 제어권이 있습니다', hi: 'आपके डेटा पर पूरा नियंत्रण है'
    },
    'ethicalGate.summaryTitle': {
      pt: 'Resumo Ético e Técnico',
      en: 'Ethical and Technical Summary',
      es: 'Resumen Ético y Técnico',
      fr: 'Résumé Éthique et Technique',
      de: 'Ethische und Technische Zusammenfassung',
      ja: '倫理的・技術的まとめ',
      it: 'In breve', zh: '简而言之', ko: '요약하면', hi: 'संक्षेप में'
    },
    'ethicalGate.point1': {
      pt: 'Todo conteúdo é salvo apenas no seu navegador local.',
      en: 'All content is saved only in your local browser.',
      es: 'Todo el contenido se guarda solo en tu navegador local.',
      fr: 'Tout le contenu est sauvegardé uniquement dans votre navigateur local.',
      de: 'Alle Inhalte werden nur in Ihrem lokalen Browser gespeichert.',
      ja: 'すべてのコンテンツはローカルブラウザにのみ保存されます。',
      it: 'Tutto il contenuto viene salvato solo nel tuo browser locale.', zh: '所有内容仅保存在您的本地浏览器中。', ko: '모든 콘텐츠는 로컬 브라우저에만 저장됩니다.', hi: 'सभी सामग्री केवल आपके स्थानीय ब्राउज़र में सहेजी जाती है।'
    },
    'ethicalGate.point2': {
      pt: 'Seu conteúdo nunca é enviado para servidores externos. Telemetria de uso é anônima e pode ser desativada a qualquer momento nas configurações.',
      en: 'Your content is never sent to external servers. Usage telemetry is anonymous and can be disabled anytime in settings.',
      es: 'Tu contenido nunca se envía a servidores externos. La telemetría de uso es anónima y puede desactivarse en cualquier momento desde la configuración.',
      fr: 'Votre contenu n\'est jamais envoyé à des serveurs externes. La télémétrie d\'utilisation est anonyme et peut être désactivée à tout moment dans les paramètres.',
      de: 'Ihre Inhalte werden niemals an externe Server gesendet. Nutzungstelemetrie ist anonym und kann jederzeit in den Einstellungen deaktiviert werden.',
      ja: 'あなたのコンテンツは外部サーバーに送信されることはありません。使用状況のテレメトリは匿名であり、設定でいつでも無効化できます。',
      it: 'Il tuo contenuto non viene mai inviato a server esterni. La telemetria di utilizzo è anonima e può essere disattivata in qualsiasi momento nelle impostazioni.', zh: '您的内容永远不会发送到外部服务器。使用遥测是匿名的，可以随时在设置中禁用。', ko: '귀하의 콘텐츠는 외부 서버로 전송되지 않습니다. 사용 텔레메트리는 익명이며 설정에서 언제든지 비활성화할 수 있습니다.', hi: 'आपकी सामग्री कभी भी बाहरी सर्वर पर नहीं भेजी जाती। उपयोग टेलीमेट्री अनाम है और सेटिंग में किसी भी समय अक्षम की जा सकती है।'
    },
    'ethicalGate.point3': {
      pt: 'Você pode visualizar, exportar e deletar suas ideias a qualquer momento.',
      en: 'You can view, export, and delete your ideas anytime.',
      es: 'Puedes ver, exportar y eliminar tus ideas en cualquier momento.',
      fr: 'Vous pouvez visualiser, exporter et supprimer vos idées à tout moment.',
      de: 'Sie können Ihre Ideen jederzeit anzeigen, exportieren und löschen.',
      ja: 'アイデアはいつでも表示、エクスポート、削除できます。',
      it: 'Puoi visualizzare, esportare ed eliminare le tue idee in qualsiasi momento.', zh: '您可以随时查看、导出和删除您的想法。', ko: '언제든지 아이디어를 보고, 내보내고, 삭제할 수 있습니다.', hi: 'आप किसी भी समय अपने विचारों को देख, निर्यात और हटा सकते हैं।'
    },
    'ethicalGate.point4': {
      pt: 'Compatível com LGPD, GDPR, CCPA e outras leis de privacidade.',
      en: 'Compatible with LGPD, GDPR, CCPA, and other privacy laws.',
      es: 'Compatible con LGPD, GDPR, CCPA y otras leyes de privacidad.',
      fr: 'Compatible avec le RGPD, le CCPA, le LGPD et d\'autres lois sur la vie privée.',
      de: 'Kompatibel mit DSGVO, CCPA, LGPD und anderen Datenschutzgesetzen.',
      ja: 'LGPD、GDPR、CCPAおよびその他のプライバシー法に準拠しています。',
      it: 'Compatibile con LGPD, GDPR, CCPA e altre leggi sulla privacy.', zh: '符合LGPD、GDPR、CCPA及其他隐私法律。', ko: 'LGPD, GDPR, CCPA 및 기타 개인정보 보호법을 준수합니다.', hi: 'LGPD, GDPR, CCPA और अन्य गोपनीयता कानूनों के अनुरूप।'
    },
    'ethicalGate.point5': {
      pt: 'Sua experiência é anônima e local.',
      en: 'Your experience is anonymous and local.',
      es: 'Tu experiencia es anónima y local.',
      fr: 'Votre expérience est anonyme et locale.',
      de: 'Ihre Erfahrung ist anonym und lokal.',
      ja: 'あなたの体験は匿名かつローカルです。',
      it: 'Il codice sorgente è aperto e verificabile.', zh: '源代码是开放且可验证的。', ko: '소스 코드는 공개되어 있으며 검증 가능합니다.', hi: 'स्रोत कोड खुला और सत्यापन योग्य है।'
    },
    'ethicalGate.acceptTerms': {
      pt: 'Li e aceito os termos do NODUS e entendo que os dados são salvos localmente.',
      en: 'I have read and accept NODUS terms and understand that data is saved locally.',
      es: 'He leído y acepto los términos de NODUS y entiendo que los datos se guardan localmente.',
      fr: 'J\'ai lu et j\'accepte les conditions NODUS et je comprends que les données sont sauvegardées localement.',
      de: 'Ich habe die NODUS-Bedingungen gelesen und akzeptiere sie und verstehe, dass Daten lokal gespeichert werden.',
      ja: 'NODUSの利用規約を読み、データがローカルに保存されることを理解して同意します。',
      it: 'Ho letto e accetto i termini di NODUS e capisco che i dati sono salvati localmente.', zh: '我已阅读并接受NODUS条款，并了解数据保存在本地。', ko: 'NODUS 약관을 읽고 동의하며 데이터가 로컬에 저장됨을 이해합니다.', hi: 'मैंने NODUS की शर्तें पढ़ी और स्वीकार कीं और समझता हूं कि डेटा स्थानीय रूप से सहेजा जाता है।'
    },
    'ethicalGate.cancel': {
      pt: 'Cancelar',
      en: 'Cancel',
      es: 'Cancelar',
      fr: 'Annuler',
      de: 'Abbrechen',
      ja: 'キャンセル',
      it: 'Annulla', zh: '取消', ko: '취소', hi: 'रद्द करें'
    },
    'ethicalGate.accept': {
      pt: 'Aceitar e Começar a Usar NODUS',
      en: 'Accept and Start Using NODUS',
      es: 'Aceptar y Empezar a Usar NODUS',
      fr: 'Accepter et Commencer à Utiliser NODUS',
      de: 'Akzeptieren und NODUS verwenden',
      ja: '同意してNODUSを使い始める',
      it: 'Accetta e Inizia a Usare NODUS', zh: '接受并开始使用NODUS', ko: 'NODUS 사용 동의 및 시작', hi: 'स्वीकार करें और NODUS का उपयोग शुरू करें'
    },
    'ethicalGate.projectPage': {
      pt: 'Página Oficial do Projeto',
      en: 'Official Project Page',
      es: 'Página Oficial del Proyecto',
      fr: 'Page Officielle du Projet',
      de: 'Offizielle Projektseite',
      ja: 'プロジェクト公式ページ',
      it: 'Pagina Progetto', zh: '项目页面', ko: '프로젝트 페이지', hi: 'प्रोजेक्ट पेज'
    },
    'ethicalGate.github': {
      pt: 'GitHub / Repositório',
      en: 'GitHub / Repository',
      es: 'GitHub / Repositorio',
      fr: 'GitHub / Dépôt',
      de: 'GitHub / Repository',
      ja: 'GitHub / リポジトリ',
      it: 'GitHub', zh: 'GitHub', ko: 'GitHub', hi: 'GitHub'
    },
    'ethicalGate.terms': {
      pt: 'Termos de Uso e Privacidade Completos',
      en: 'Complete Terms of Use and Privacy',
      es: 'Términos de Uso y Privacidad Completos',
      fr: 'Conditions Complètes d\'Utilisation et de Confidentialité',
      de: 'Vollständige Nutzungsbedingungen und Datenschutz',
      ja: '完全な利用規約とプライバシー',
      it: 'Termini e Privacy', zh: '条款和隐私', ko: '약관 및 개인정보', hi: 'नियम और गोपनीयता'
    },
    
    // ─────────────────────────────────────────────────────────────
    // DASHBOARD - BUTTON
    // ─────────────────────────────────────────────────────────────
    'dashboard.button': {
      pt: 'Painel',
      en: 'Dashboard',
      es: 'Panel',
      fr: 'Tableau de bord',
      de: 'Dashboard',
      ja: 'ダッシュボード',
      it: 'Dashboard', zh: '仪表盘', ko: '대시보드', hi: 'डैशबोर्ड'
    },
    
    // ─────────────────────────────────────────────────────────────
    // QUEUES
    // ─────────────────────────────────────────────────────────────
    'queue.quick': {
      pt: 'Rápida', en: 'Quick', es: 'Rápida',
      fr: 'Rapide', de: 'Schnell', ja: 'クイック',
      it: 'Rapida', zh: '快速', ko: '빠른', hi: 'त्वरित'
    },
    'queue.default': {
      pt: 'Padrão', en: 'Default', es: 'Predeterminada',
      fr: 'Par défaut', de: 'Standard', ja: 'デフォルト',
      it: 'Predefinita', zh: '默认', ko: '기본', hi: 'डिफ़ॉल्ट'
    },
    'queue.f1': {
      pt: 'F1',
      en: 'Q1',
      es: 'C1',
      fr: 'F1',
      de: 'W1',
      ja: 'Q1',
      it: 'F1', zh: 'Q1', ko: 'Q1', hi: 'Q1'
    },
    'queue.f2': {
      pt: 'F2',
      en: 'Q2',
      es: 'C2',
      fr: 'F2',
      de: 'W2',
      ja: 'Q2',
      it: 'F2', zh: 'Q2', ko: 'Q2', hi: 'Q2'
    },
    'queue.f3': {
      pt: 'F3',
      en: 'Q3',
      es: 'C3',
      fr: 'F3',
      de: 'W3',
      ja: 'Q3',
      it: 'F3', zh: 'Q3', ko: 'Q3', hi: 'Q3'
    },
    'queue.f4': {
      pt: 'F4',
      en: 'Q4',
      es: 'C4',
      fr: 'F4',
      de: 'W4',
      ja: 'Q4',
      it: 'F4', zh: 'Q4', ko: 'Q4', hi: 'Q4'
    },
    
    // ─────────────────────────────────────────────────────────────
    // GRID & EMPTY STATE
    // ─────────────────────────────────────────────────────────────
    'grid.label': {
      pt: 'Grade',
      en: 'Grid',
      es: 'Cuadrícula',
      fr: 'Grille',
      de: 'Raster',
      ja: 'グリッド',
      it: 'Griglie', zh: '网格', ko: '그리드', hi: 'ग्रिड'
    },
    'empty.title': {
      pt: 'Nenhuma ideia encontrada',
      en: 'No ideas found',
      es: 'No se encontraron ideas',
      fr: 'Aucune idée trouvée',
      de: 'Keine Ideen gefunden',
      ja: 'アイデアが見つかりません',
      it: 'Nessuna idea salvata', zh: '没有保存的想法', ko: '저장된 아이디어 없음', hi: 'कोई विचार सहेजा नहीं'
    },
    'empty.subtitle': {
      pt: 'Comece capturando ideias de conversas com IA',
      en: 'Start capturing ideas from AI conversations',
      es: 'Comience capturando ideas de conversaciones con IA',
      fr: 'Commencez à capturer des idées de conversations IA',
      de: 'Beginne damit, Ideen aus KI-Gesprächen zu erfassen',
      ja: 'AI会話からアイデアのキャプチャを始めましょう',
      it: 'Salva la tua prima idea dalle conversazioni IA', zh: '从AI对话中保存您的第一个想法', ko: 'AI 대화에서 첫 번째 아이디어를 저장하세요', hi: 'AI बातचीत से अपना पहला विचार सहेजें'
    },
    'empty.trydifferent': {
      pt: 'Tente um termo de busca diferente',
      en: 'Try a different search term',
      es: 'Pruebe con un término de búsqueda diferente',
      fr: 'Essayez un terme de recherche différent',
      de: 'Versuche einen anderen Suchbegriff',
      ja: '別の検索キーワードを試してください',
      it: 'Prova filtri diversi', zh: '尝试不同的筛选', ko: '다른 필터 시도', hi: 'अलग फ़िल्टर आज़माएं'
    },
    
    // ─────────────────────────────────────────────────────────────
    // ACCOUNT & PLAN
    // ─────────────────────────────────────────────────────────────
    'account.email': {
      pt: 'Email',
      en: 'Email',
      es: 'Email',
      fr: 'Email',
      de: 'E-Mail',
      ja: 'メール',
      it: 'Email', zh: 'Email', ko: '이메일', hi: 'ईमेल'
    },
    'account.notconnected': {
      pt: 'Não conectado',
      en: 'Not connected',
      es: 'No conectado',
      fr: 'Non connecté',
      de: 'Nicht verbunden',
      ja: '未接続',
      it: 'Non connesso', zh: '未连接', ko: '연결되지 않음', hi: 'कनेक्ट नहीं'
    },
    'account.plan': {
      pt: 'Plano',
      en: 'Plan',
      es: 'Plan',
      fr: 'Plan',
      de: 'Plan',
      ja: 'プラン',
      it: 'Piano', zh: '计划', ko: '플랜', hi: 'योजना'
    },
    'account.free': {
      pt: 'GRATUITO',
      en: 'FREE',
      es: 'GRATIS',
      fr: 'GRATUIT',
      de: 'KOSTENLOS',
      ja: '無料',
      it: 'Gratuito', zh: '免费', ko: '무료', hi: 'मुफ़्त'
    },
    'account.pro': {
      pt: 'PRO',
      en: 'PRO',
      es: 'PRO',
      fr: 'PRO',
      de: 'PRO',
      ja: 'PRO',
      it: 'PRO', zh: 'PRO', ko: 'PRO', hi: 'PRO'
    },
    'account.membersince': {
      pt: 'Membro desde',
      en: 'Member since',
      es: 'Miembro desde',
      fr: 'Membre depuis',
      de: 'Mitglied seit',
      ja: '登録日',
      it: 'Membro dal', zh: '会员自', ko: '회원 가입일', hi: 'सदस्य'
    },
    'account.upgradetitle': {
      pt: 'Atualizar para PRO',
      en: 'Upgrade to PRO',
      es: 'Actualizar a PRO',
      fr: 'Passer à PRO',
      de: 'Auf PRO Upgraden',
      ja: 'PROにアップグレード',
      it: 'Aggiorna a PRO', zh: '升级到PRO', ko: 'PRO로 업그레이드', hi: 'PRO में अपग्रेड करें'
    },
    'account.upgradesubtitle': {
      pt: 'Desbloquear todos os recursos e filas',
      en: 'Unlock all features and queues',
      es: 'Desbloquear todas las funciones y colas',
      fr: 'Débloquer toutes les fonctionnalités et files',
      de: 'Alle Funktionen und Warteschlangen freischalten',
      ja: 'すべての機能とキューを解放',
      it: 'Sblocca tutte le funzionalità', zh: '解锁所有功能', ko: '모든 기능 잠금 해제', hi: 'सभी सुविधाएं अनलॉक करें'
    },
    'account.feature.queues': {
      pt: 'Desbloquear filas F2, F3, F4',
      en: 'Unlock Q2, Q3, Q4 queues',
      es: 'Desbloquear colas C2, C3, C4',
      fr: 'Débloquer les files F2, F3, F4',
      de: 'W2, W3, W4 freischalten',
      ja: 'Q2, Q3, Q4キューを解放',
      it: '6 code', zh: '6个队列', ko: '6개 대기열', hi: '6 कतारें'
    },
    'account.feature.export': {
      pt: 'Exportar HTML & DOCX',
      en: 'Export HTML & DOCX',
      es: 'Exportar HTML & DOCX',
      fr: 'Exporter HTML & DOCX',
      de: 'HTML & DOCX Exportieren',
      ja: 'HTML & DOCXをエクスポート',
      it: 'Export HTML + DOCX', zh: 'HTML + DOCX导出', ko: 'HTML + DOCX 내보내기', hi: 'HTML + DOCX निर्यात'
    },
    'account.feature.chains': {
      pt: 'Cadeias ilimitadas',
      en: 'Unlimited chains',
      es: 'Cadenas ilimitadas',
      fr: 'Chaînes illimitées',
      de: 'Unbegrenzte Ketten',
      ja: '無制限チェーン',
      it: 'Catene illimitate', zh: '无限链', ko: '무제한 체인', hi: 'असीमित चेन'
    },
    'account.feature.stats': {
      pt: 'Estatísticas avançadas',
      en: 'Advanced statistics',
      es: 'Estadísticas avanzadas',
      fr: 'Statistiques avancées',
      de: 'Erweiterte Statistiken',
      ja: '高度な統計',
      it: 'Statistiche avanzate', zh: '高级统计', ko: '고급 통계', hi: 'उन्नत आँकड़े'
    },
    'account.activateemail': {
      pt: 'Ativar com Email',
      en: 'Activate with Email',
      es: 'Activar con Email',
      fr: 'Activer avec Email',
      de: 'Mit E-Mail Aktivieren',
      ja: 'メールで有効化',
      it: 'Attiva con Email', zh: '通过邮箱激活', ko: '이메일로 활성화', hi: 'ईमेल से सक्रिय करें'
    },
    'account.buynow': {
      pt: 'Comprar Agora',
      en: 'Buy Now',
      es: 'Comprar Ahora',
      fr: 'Acheter Maintenant',
      de: 'Jetzt Kaufen',
      ja: '今すぐ購入',
      it: 'Acquista ora', zh: '立即购买', ko: '지금 구매', hi: 'अभी खरीदें'
    },
    'account.pricing': {
      pt: '$4.50/mês ou $30/ano',
      en: '$4.50/month or $30/year',
      es: '$4.50/mes o $30/año',
      fr: '$4.50/mois ou $30/an',
      de: '$4.50/Monat oder $30/Jahr',
      ja: '$4.50/月または$30/年',
      it: 'Prezzi', zh: '价格', ko: '가격', hi: 'कीमत'
    },

    // ─────────────────────────────────────────────────────────────
    // ONBOARDING
    // ─────────────────────────────────────────────────────────────
    'onboarding.skip': {
      pt: 'Pular',
      en: 'Skip',
      es: 'Omitir',
      fr: 'Passer',
      de: 'Überspringen',
      ja: 'スキップ',
      it: 'Salta', zh: '跳过', ko: '건너뛰기', hi: 'छोड़ें'
    },
    'onboarding.next': {
      pt: 'Próximo',
      en: 'Next',
      es: 'Siguiente',
      fr: 'Suivant',
      de: 'Weiter',
      ja: '次へ',
      it: 'Avanti', zh: '下一步', ko: '다음', hi: 'अगला'
    },
    'onboarding.prev': {
      pt: 'Anterior',
      en: 'Previous',
      es: 'Anterior',
      fr: 'Précédent',
      de: 'Zurück',
      ja: '前へ',
      it: 'Indietro', zh: '上一步', ko: '이전', hi: 'पिछला'
    },
    'onboarding.start': {
      pt: 'Começar!',
      en: 'Get Started!',
      es: '¡Empezar!',
      fr: 'Commencer!',
      de: 'Los geht\'s!',
      ja: '始める！',
      it: 'Inizia', zh: '开始', ko: '시작', hi: 'शुरू करें'
    },
    'onboarding.of': {
      pt: 'de',
      en: 'of',
      es: 'de',
      fr: 'de',
      de: 'von',
      ja: '/',
      it: 'di', zh: '/', ko: '/', hi: '/'
    },
    'onboarding.slide1.title': {
      pt: 'Bem-vindo ao NODUS',
      en: 'Welcome to NODUS',
      es: 'Bienvenido a NODUS',
      fr: 'Bienvenue dans NODUS',
      de: 'Willkommen bei NODUS',
      ja: 'NODUSへようこそ',
      it: 'Benvenuto in NODUS', zh: '欢迎使用NODUS', ko: 'NODUS에 오신 것을 환영합니다', hi: 'NODUS में आपका स्वागत है'
    },
    'onboarding.slide1.tagline': {
      pt: 'Capture. Organize. Reutilize.',
      en: 'Capture. Organize. Reuse.',
      es: 'Captura. Organiza. Reutiliza.',
      fr: 'Capturez. Organisez. Réutilisez.',
      de: 'Erfassen. Organisieren. Wiederverwenden.',
      ja: 'キャプチャ。整理。再利用。',
      it: 'Cattura. Organizza. Riutilizza.', zh: '捕获。整理。重用。', ko: '캡처. 정리. 재사용.', hi: 'कैप्चर। व्यवस्थित करें। पुन: उपयोग।'
    },
    'onboarding.slide1.desc': {
      pt: 'Salve ideias, respostas e trechos importantes das suas conversas com IA sem sair da página. Depois, organize tudo e reutilize quando quiser.',
      en: 'Save ideas, responses and key insights from your AI conversations without leaving the page. Then organize everything and reuse it whenever you want.',
      es: 'Guarda ideas, respuestas y fragmentos importantes de tus conversaciones con IA sin salir de la página. Luego organiza todo y reutilízalo cuando quieras.',
      fr: 'Sauvegardez des idées, des réponses et des extraits importants de vos conversations IA sans quitter la page. Ensuite, organisez tout et réutilisez-le quand vous voulez.',
      de: 'Speichern Sie Ideen, Antworten und wichtige Erkenntnisse aus Ihren KI-Gesprächen, ohne die Seite zu verlassen. Dann alles organisieren und jederzeit wiederverwenden.',
      ja: 'ページを離れずにAIとの会話からアイデア、回答、重要な洞察を保存。その後、すべてを整理して好きな時に再利用できます。',
      it: 'Salva idee, risposte e appunti importanti dalle tue conversazioni IA senza lasciare la pagina. Poi organizza tutto e riutilizzalo quando vuoi.', zh: '无需离开页面即可从AI对话中保存想法、回答和重要见解。然后整理所有内容，随时重用。', ko: '페이지를 떠나지 않고 AI 대화에서 아이디어, 응답, 주요 인사이트를 저장하세요. 그런 다음 모든 것을 정리하고 언제든지 재사용하세요.', hi: 'पृष्ठ छोड़े बिना अपनी AI बातचीत से विचार, उत्तर और महत्वपूर्ण अंतर्दृष्टि सहेजें। फिर सब कुछ व्यवस्थित करें और जब चाहें पुन: उपयोग करें।'
    },
    'onboarding.slide2.title': {
      pt: 'Por que usar o NODUS?',
      en: 'Why use NODUS?',
      es: '¿Por qué usar NODUS?',
      fr: 'Pourquoi utiliser NODUS?',
      de: 'Warum NODUS verwenden?',
      ja: 'なぜNODUSを使うのか？',
      it: 'Perché usare NODUS?', zh: '为什么使用NODUS？', ko: '왜 NODUS를 사용하나요?', hi: 'NODUS का उपयोग क्यों करें?'
    },
    'onboarding.slide2.desc': {
      pt: 'Boas ideias surgem no meio da conversa e somem rápido. O NODUS existe para transformar respostas úteis em material reutilizável com poucos cliques.',
      en: 'Good ideas come up in the middle of a conversation and disappear fast. NODUS transforms useful responses into reusable material in just a few clicks.',
      es: 'Las buenas ideas surgen en medio de la conversación y desaparecen rápido. NODUS transforma respuestas útiles en material reutilizable con pocos clics.',
      fr: 'Les bonnes idées surgissent au milieu d\'une conversation et disparaissent vite. NODUS transforme les réponses utiles en matériel réutilisable en quelques clics.',
      de: 'Gute Ideen tauchen mitten in einem Gespräch auf und verschwinden schnell. NODUS verwandelt nützliche Antworten in wiederverwendbares Material mit wenigen Klicks.',
      ja: '良いアイデアは会話の途中に生まれ、すぐに消えてしまいます。NODUSは有用な回答を数クリックで再利用可能な素材に変換します。',
      it: 'Le buone idee arrivano nel mezzo di una conversazione e scompaiono velocemente. NODUS trasforma le risposte utili in materiale riutilizzabile in pochi clic.', zh: '好想法在对话中间出现，很快就会消失。NODUS只需几次点击就能将有用的回答转化为可重用的材料。', ko: '좋은 아이디어는 대화 중간에 나타나 빠르게 사라집니다. NODUS는 유용한 응답을 몇 번의 클릭으로 재사용 가능한 자료로 변환합니다.', hi: 'अच्छे विचार बातचीत के बीच में आते हैं और जल्दी गायब हो जाते हैं। NODUS कुछ ही क्लिक में उपयोगी उत्तरों को पुन: उपयोगी सामग्री में बदलता है।'
    },
    'onboarding.slide2.item1': {
      pt: 'Seus dados ficam salvos localmente no seu dispositivo',
      en: 'Your data is saved locally on your device',
      es: 'Tus datos se guardan localmente en tu dispositivo',
      fr: 'Vos données sont sauvegardées localement sur votre appareil',
      de: 'Deine Daten werden lokal auf deinem Gerät gespeichert',
      ja: 'データはデバイスにローカル保存されます',
      it: 'I tuoi dati sono salvati localmente sul tuo dispositivo', zh: '您的数据本地保存在您的设备上', ko: '데이터가 기기에 로컬로 저장됩니다', hi: 'आपका डेटा आपके डिवाइस पर स्थानीय रूप से सहेजा जाता है'
    },
    'onboarding.slide2.item2': {
      pt: 'Funciona em múltiplas plataformas de IA',
      en: 'Works across multiple AI platforms',
      es: 'Funciona en múltiples plataformas de IA',
      fr: 'Fonctionne sur plusieurs plateformes IA',
      de: 'Funktioniert auf mehreren KI-Plattformen',
      ja: '複数のAIプラットフォームで動作',
      it: 'Funziona su più piattaforme IA', zh: '适用于多个AI平台', ko: '여러 AI 플랫폼에서 작동', hi: 'कई AI प्लेटफ़ॉर्म पर काम करता है'
    },
    'onboarding.slide2.item3': {
      pt: 'Permite buscar, organizar e reutilizar ideias depois',
      en: 'Search, organize and reuse ideas later',
      es: 'Busca, organiza y reutiliza ideas después',
      fr: 'Permet de rechercher, organiser et réutiliser les idées plus tard',
      de: 'Suchen, organisieren und Ideen später wiederverwenden',
      ja: '後でアイデアを検索、整理、再利用',
      it: 'Cerca, organizza e riutilizza le idee in seguito', zh: '之后搜索、整理和重用想法', ko: '나중에 아이디어 검색, 정리 및 재사용', hi: 'बाद में विचारों को खोजें, व्यवस्थित करें और पुन: उपयोग करें'
    },
    'onboarding.slide3.title': {
      pt: 'Os botões do NODUS',
      en: 'NODUS Buttons',
      es: 'Los botones de NODUS',
      fr: 'Les boutons NODUS',
      de: 'NODUS-Schaltflächen',
      ja: 'NODUSのボタン',
      it: 'I Pulsanti di NODUS', zh: 'NODUS按钮', ko: 'NODUS 버튼', hi: 'NODUS के बटन'
    },
    'onboarding.slide3.desc': {
      pt: 'Depois de uma resposta da IA, o NODUS mostra ações rápidas para salvar ou reaproveitar aquele conteúdo.',
      en: 'After an AI response, NODUS shows quick actions to save or reuse that content.',
      es: 'Después de una respuesta de IA, NODUS muestra acciones rápidas para guardar o reutilizar ese contenido.',
      fr: 'Après une réponse IA, NODUS affiche des actions rapides pour sauvegarder ou réutiliser ce contenu.',
      de: 'Nach einer KI-Antwort zeigt NODUS schnelle Aktionen zum Speichern oder Wiederverwenden dieses Inhalts.',
      ja: 'AIの回答の後、NODUSはそのコンテンツを保存または再利用するためのクイックアクションを表示します。',
      it: 'Dopo una risposta IA, NODUS mostra azioni rapide per salvare o riutilizzare quel contenuto.', zh: '在AI回答后，NODUS显示快速操作以保存或重用该内容。', ko: 'AI 응답 후 NODUS는 해당 콘텐츠를 저장하거나 재사용하는 빠른 작업을 표시합니다.', hi: 'AI उत्तर के बाद, NODUS उस सामग्री को सहेजने या पुन: उपयोग करने के लिए त्वरित क्रियाएं दिखाता है।'
    },
    'onboarding.slide3.btn1': {
      pt: '💡 Salvar — abre o modal para adicionar tags e escolher a fila',
      en: '💡 Save — opens the modal to add tags and choose a queue',
      es: '💡 Guardar — abre el modal para agregar etiquetas y elegir la cola',
      fr: '💡 Sauvegarder — ouvre le modal pour ajouter des tags et choisir une file',
      de: '💡 Speichern — öffnet das Modal zum Hinzufügen von Tags und Auswählen einer Warteschlange',
      ja: '💡 保存 — タグ追加とキュー選択用モーダルを開く',
      it: '💡 Salva — apre il modal per aggiungere tag e scegliere la coda', zh: '💡 保存 — 打开模态框以添加标签并选择队列', ko: '💡 저장 — 태그 추가 및 대기열 선택을 위한 모달 열기', hi: '💡 सहेजें — टैग जोड़ने और कतार चुनने के लिए मोडल खोलें'
    },
    'onboarding.slide3.btn2': {
      pt: '⚡ Rápido — salva direto na fila rápida, sem abrir modal',
      en: '⚡ Quick — saves directly to the quick queue, no modal',
      es: '⚡ Rápido — guarda directamente en la cola rápida, sin modal',
      fr: '⚡ Rapide — sauvegarde directement dans la file rapide, sans modal',
      de: '⚡ Schnell — speichert direkt in der Schnell-Warteschlange, kein Modal',
      ja: '⚡ クイック — モーダルなしでクイックキューに直接保存',
      it: '⚡ Rapido — salva direttamente nella coda rapida, senza modal', zh: '⚡ 快速 — 直接保存到快速队列，无需模态框', ko: '⚡ 빠른 — 모달 없이 빠른 대기열에 직접 저장', hi: '⚡ त्वरित — मोडल के बिना सीधे त्वरित कतार में सहेजें'
    },
    'onboarding.slide3.btn3': {
      pt: '📋 Colar — envia conteúdo salvo de volta para o input da IA',
      en: '📋 Paste — sends saved content back to the AI input',
      es: '📋 Pegar — envía contenido guardado de vuelta al input de la IA',
      fr: '📋 Coller — renvoie le contenu sauvegardé vers l\'input de l\'IA',
      de: '📋 Einfügen — sendet gespeicherten Inhalt zurück an die KI-Eingabe',
      ja: '📋 ペースト — 保存したコンテンツをAI入力欄に送り返す',
      it: '📋 Incolla — invia il contenuto salvato all\'input IA', zh: '📋 粘贴 — 将保存的内容发送回AI输入框', ko: '📋 붙여넣기 — 저장된 콘텐츠를 AI 입력란으로 다시 전송', hi: '📋 पेस्ट — सहेजी गई सामग्री को AI इनपुट में वापस भेजें'
    },
    'onboarding.slide3.btn4': {
      pt: '📊 Dash — abre o dashboard com suas ideias salvas',
      en: '📊 Dash — opens the dashboard with your saved ideas',
      es: '📊 Dash — abre el dashboard con tus ideas guardadas',
      fr: '📊 Dash — ouvre le tableau de bord avec vos idées sauvegardées',
      de: '📊 Dash — öffnet das Dashboard mit deinen gespeicherten Ideen',
      ja: '📊 Dash — 保存済みアイデアのダッシュボードを開く',
      it: '📊 Dash — apre il dashboard con le tue idee salvate', zh: '📊 Dash — 打开包含已保存想法的仪表盘', ko: '📊 Dash — 저장된 아이디어가 있는 대시보드 열기', hi: '📊 Dash — सहेजे गए विचारों के साथ डैशबोर्ड खोलें'
    },
    'onboarding.slide4.title': {
      pt: 'Seu Dashboard',
      en: 'Your Dashboard',
      es: 'Tu Dashboard',
      fr: 'Votre Tableau de Bord',
      de: 'Dein Dashboard',
      ja: 'あなたのダッシュボード',
      it: 'Il Tuo Dashboard', zh: '您的仪表盘', ko: '당신의 대시보드', hi: 'आपका डैशबोर्ड'
    },
    'onboarding.slide4.desc': {
      pt: 'O dashboard reúne tudo o que você salvou. É o lugar para revisar ideias, encontrar conteúdos antigos e organizar seu material.',
      en: 'The dashboard brings together everything you\'ve saved. It\'s the place to review ideas, find past content, and organize your material.',
      es: 'El dashboard reúne todo lo que guardaste. Es el lugar para revisar ideas, encontrar contenido pasado y organizar tu material.',
      fr: 'Le tableau de bord rassemble tout ce que vous avez sauvegardé. C\'est l\'endroit pour réviser les idées, trouver du contenu passé et organiser votre matériel.',
      de: 'Das Dashboard vereint alles, was du gespeichert hast. Es ist der Ort zum Überprüfen von Ideen, Finden vergangener Inhalte und Organisieren deines Materials.',
      ja: 'ダッシュボードには保存したすべてのものが集まります。アイデアのレビュー、過去のコンテンツ検索、素材の整理に使います。',
      it: 'Il dashboard raccoglie tutto ciò che hai salvato. È il posto per rivedere idee, trovare contenuti passati e organizzare il tuo materiale.', zh: '仪表盘汇集了您保存的所有内容。这是查看想法、查找过去内容和整理材料的地方。', ko: '대시보드는 저장한 모든 것을 모아줍니다. 아이디어를 검토하고, 과거 콘텐츠를 찾고, 자료를 정리하는 곳입니다.', hi: 'डैशबोर्ड में वह सब कुछ एकत्रित होता है जो आपने सहेजा है। विचारों की समीक्षा, पिछली सामग्री खोजने और अपनी सामग्री व्यवस्थित करने की जगह।'
    },
    'onboarding.slide4.item1': {
      pt: 'Busque por texto',
      en: 'Search by text',
      es: 'Busca por texto',
      fr: 'Recherchez par texte',
      de: 'Suche nach Text',
      ja: 'テキストで検索',
      it: 'Cerca per testo', zh: '按文本搜索', ko: '텍스트로 검색', hi: 'टेक्स्ट से खोजें'
    },
    'onboarding.slide4.item2': {
      pt: 'Filtre por tags e filas',
      en: 'Filter by tags and queues',
      es: 'Filtra por etiquetas y colas',
      fr: 'Filtrez par tags et files',
      de: 'Filtere nach Tags und Warteschlangen',
      ja: 'タグとキューでフィルター',
      it: 'Filtra per tag e code', zh: '按标签和队列筛选', ko: '태그 및 대기열로 필터링', hi: 'टैग और कतारों से फ़िल्टर करें'
    },
    'onboarding.slide4.item3': {
      pt: 'Abra, revise e reutilize ideias salvas',
      en: 'Open, review and reuse saved ideas',
      es: 'Abre, revisa y reutiliza ideas guardadas',
      fr: 'Ouvrez, revoyez et réutilisez les idées sauvegardées',
      de: 'Gespeicherte Ideen öffnen, überprüfen und wiederverwenden',
      ja: '保存済みアイデアを開き、確認し、再利用',
      it: 'Apri, rivedi e riutilizza le idee salvate', zh: '打开、查看和重用已保存的想法', ko: '저장된 아이디어 열기, 검토 및 재사용', hi: 'सहेजे गए विचार खोलें, समीक्षा करें और पुन: उपयोग करें'
    },
    'onboarding.slide5.title': {
      pt: 'Filas e tags',
      en: 'Queues & Tags',
      es: 'Colas y etiquetas',
      fr: 'Files et tags',
      de: 'Warteschlangen & Tags',
      ja: 'キューとタグ',
      it: 'Code e Tag', zh: '队列和标签', ko: '대기열 및 태그', hi: 'कतारें और टैग'
    },
    'onboarding.slide5.desc': {
      pt: 'Cada ideia pode ir para uma fila diferente. Use isso para separar capturas rápidas, material principal e conteúdos por tema ou projeto.',
      en: 'Each idea can go to a different queue. Use this to separate quick captures, main material, and content by topic or project.',
      es: 'Cada idea puede ir a una cola diferente. Úsalas para separar capturas rápidas, material principal y contenido por tema o proyecto.',
      fr: 'Chaque idée peut aller dans une file différente. Utilisez cela pour séparer les captures rapides, le matériel principal et le contenu par sujet ou projet.',
      de: 'Jede Idee kann in eine andere Warteschlange. Nutze das, um schnelle Aufnahmen, Hauptmaterial und Inhalte nach Thema oder Projekt zu trennen.',
      ja: 'それぞれのアイデアを別のキューに入れられます。クイックキャプチャ、メイン素材、トピック別やプロジェクト別のコンテンツを分けるのに使います。',
      it: 'Ogni idea può andare in una coda diversa. Usalo per separare le catture rapide, il materiale principale e i contenuti per tema o progetto.', zh: '每个想法可以放入不同的队列。用它来分隔快速捕获、主要材料和按主题或项目的内容。', ko: '각 아이디어는 다른 대기열로 이동할 수 있습니다. 이를 사용하여 빠른 캡처, 주요 자료 및 주제나 프로젝트별 콘텐츠를 구분하세요.', hi: 'प्रत्येक विचार अलग कतार में जा सकता है। त्वरित कैप्चर, मुख्य सामग्री और विषय या प्रोजेक्ट के अनुसार सामग्री अलग करने के लिए इसका उपयोग करें।'
    },
    'onboarding.slide5.item1': {
      pt: 'Fila Rápida: para capturas rápidas do dia a dia',
      en: 'Quick Queue: for day-to-day captures',
      es: 'Cola Rápida: para capturas del día a día',
      fr: 'File Rapide: pour les captures quotidiennes',
      de: 'Schnell-Warteschlange: für alltägliche Aufnahmen',
      ja: 'クイックキュー：日常のキャプチャ用',
      it: 'Coda Rapida: per catture quotidiane', zh: '快速队列：用于日常捕获', ko: '빠른 대기열: 일상적인 캡처용', hi: 'त्वरित कतार: रोज़मर्रा के कैप्चर के लिए'
    },
    'onboarding.slide5.item2': {
      pt: 'Fila principal: para ideias que você quer manter organizadas',
      en: 'Main Queue: for ideas you want to keep organized',
      es: 'Cola principal: para ideas que quieres mantener organizadas',
      fr: 'File principale: pour les idées que vous voulez garder organisées',
      de: 'Haupt-Warteschlange: für Ideen, die du organisiert halten möchtest',
      ja: 'メインキュー：整理して保存したいアイデア用',
      it: 'Coda principale: per idee che vuoi mantenere organizzate', zh: '主队列：用于您想保持整洁的想法', ko: '메인 대기열: 정리해 두고 싶은 아이디어용', hi: 'मुख्य कतार: उन विचारों के लिए जिन्हें आप व्यवस्थित रखना चाहते हैं'
    },
    'onboarding.slide5.item3': {
      pt: 'Tags: para classificar por assunto, contexto ou projeto',
      en: 'Tags: to classify by topic, context or project',
      es: 'Etiquetas: para clasificar por tema, contexto o proyecto',
      fr: 'Tags: pour classer par sujet, contexte ou projet',
      de: 'Tags: zum Klassifizieren nach Thema, Kontext oder Projekt',
      ja: 'タグ：テーマ、コンテキスト、プロジェクト別分類用',
      it: 'Tag: per classificare per argomento, contesto o progetto', zh: '标签：按主题、上下文或项目分类', ko: '태그: 주제, 맥락 또는 프로젝트별 분류', hi: 'टैग: विषय, संदर्भ या प्रोजेक्ट के अनुसार वर्गीकरण'
    },
    'onboarding.slide5.tip': {
      pt: '🏷️ Exemplos de tags: #marketing, #codigo, #pesquisa, #produto',
      en: '🏷️ Tag examples: #marketing, #code, #research, #product',
      es: '🏷️ Ejemplos de etiquetas: #marketing, #codigo, #investigacion, #producto',
      fr: '🏷️ Exemples de tags: #marketing, #code, #recherche, #produit',
      de: '🏷️ Tag-Beispiele: #marketing, #code, #forschung, #produkt',
      ja: '🏷️ タグ例: #マーケティング, #コード, #リサーチ, #プロダクト',
      it: '🏷️ Esempi di tag: #marketing, #codice, #ricerca, #prodotto', zh: '🏷️ 标签示例：#营销, #代码, #研究, #产品', ko: '🏷️ 태그 예시: #마케팅, #코드, #리서치, #제품', hi: '🏷️ टैग उदाहरण: #मार्केटिंग, #कोड, #शोध, #उत्पाद'
    },
    'onboarding.slide6.title': {
      pt: 'Chains',
      en: 'Chains',
      es: 'Cadenas (Chains)',
      fr: 'Chaînes',
      de: 'Ketten',
      ja: 'チェーン',
      it: 'Catene', zh: '链', ko: '체인', hi: 'चेन'
    },
    'onboarding.slide6.desc': {
      pt: 'Chains conectam ideias em sequência. Elas servem para montar fluxos reutilizáveis de prompts, respostas ou etapas de raciocínio.',
      en: 'Chains connect ideas in sequence. They\'re used to build reusable flows of prompts, responses or reasoning steps.',
      es: 'Las cadenas conectan ideas en secuencia. Sirven para armar flujos reutilizables de prompts, respuestas o pasos de razonamiento.',
      fr: 'Les chaînes connectent les idées en séquence. Elles servent à construire des flux réutilisables de prompts, réponses ou étapes de raisonnement.',
      de: 'Ketten verbinden Ideen in Reihenfolge. Sie dienen zum Aufbau wiederverwendbarer Abläufe von Prompts, Antworten oder Denkschritten.',
      ja: 'チェーンはアイデアを順番につなげます。プロンプト、回答、推論ステップの再利用可能なフローを構築するために使います。',
      it: 'Le catene collegano le idee in sequenza. Servono per costruire flussi riutilizzabili di prompt, risposte o passaggi di ragionamento.', zh: '链按顺序连接想法。它们用于构建可重用的提示、回答或推理步骤流程。', ko: '체인은 아이디어를 순서대로 연결합니다. 프롬프트, 응답 또는 추론 단계의 재사용 가능한 흐름을 구축하는 데 사용됩니다.', hi: 'चेन विचारों को क्रम में जोड़ती हैं। वे प्रॉम्प्ट, उत्तर या तर्क चरणों के पुन: उपयोग योग्य प्रवाह बनाने के लिए उपयोग होती हैं।'
    },
    'onboarding.slide6.item1': {
      pt: 'Agrupe ideias relacionadas em ordem',
      en: 'Group related ideas in order',
      es: 'Agrupa ideas relacionadas en orden',
      fr: 'Regroupez les idées liées dans l\'ordre',
      de: 'Verwandte Ideen in Reihenfolge gruppieren',
      ja: '関連するアイデアを順番にまとめる',
      it: 'Raggruppa le idee correlate in ordine', zh: '按顺序将相关想法分组', ko: '관련 아이디어를 순서대로 그룹화', hi: 'संबंधित विचारों को क्रम में समूहित करें'
    },
    'onboarding.slide6.item2': {
      pt: 'Reutilize um fluxo sempre que precisar',
      en: 'Reuse a flow whenever you need it',
      es: 'Reutiliza un flujo cuando lo necesites',
      fr: 'Réutilisez un flux quand vous en avez besoin',
      de: 'Einen Ablauf wiederverwenden, wenn nötig',
      ja: '必要な時にフローを再利用',
      it: 'Riutilizza un flusso quando ne hai bisogno', zh: '需要时重用流程', ko: '필요할 때 흐름 재사용', hi: 'जब ज़रूरत हो फ़्लो का पुन: उपयोग करें'
    },
    'onboarding.slide6.item3': {
      pt: 'Transforme conversas úteis em estruturas reaproveitáveis',
      en: 'Turn useful conversations into reusable structures',
      es: 'Convierte conversaciones útiles en estructuras reutilizables',
      fr: 'Transformez des conversations utiles en structures réutilisables',
      de: 'Nützliche Gespräche in wiederverwendbare Strukturen umwandeln',
      ja: '役立つ会話を再利用可能な構造に変換',
      it: 'Trasforma le conversazioni utili in strutture riutilizzabili', zh: '将有用的对话转化为可重用的结构', ko: '유용한 대화를 재사용 가능한 구조로 변환', hi: 'उपयोगी बातचीत को पुन: उपयोगी संरचनाओं में बदलें'
    },
    'onboarding.slide6.tip': {
      pt: '🔗 Use chains para processos repetidos, estudos, pesquisa ou fluxos de trabalho',
      en: '🔗 Use chains for repeated processes, studies, research or workflows',
      es: '🔗 Usa cadenas para procesos repetidos, estudios, investigación o flujos de trabajo',
      fr: '🔗 Utilisez les chaînes pour des processus répétés, des études, des recherches ou des workflows',
      de: '🔗 Nutze Ketten für wiederholte Prozesse, Studien, Forschung oder Arbeitsabläufe',
      ja: '🔗 繰り返しプロセス、学習、調査、ワークフローにチェーンを活用',
      it: '🔗 Usa le catene per processi ripetuti, studi, ricerche o flussi di lavoro', zh: '🔗 将链用于重复流程、学习、研究或工作流程', ko: '🔗 반복 프로세스, 학습, 조사 또는 워크플로에 체인 활용', hi: '🔗 दोहराए जाने वाले प्रक्रियाओं, अध्ययन, शोध या वर्कफ़्लो के लिए चेन का उपयोग करें'
    },
    'onboarding.slide7.title': {
      pt: 'Recursos PRO',
      en: 'PRO Features',
      es: 'Recursos PRO',
      fr: 'Fonctionnalités PRO',
      de: 'PRO-Funktionen',
      ja: 'PRO機能',
      it: 'Funzionalità PRO', zh: 'PRO功能', ko: 'PRO 기능', hi: 'PRO सुविधाएं'
    },
    'onboarding.slide7.desc': {
      pt: 'A versão gratuita já cobre o essencial. O PRO desbloqueia recursos extras para quem usa o NODUS com mais intensidade.',
      en: 'The free version already covers the essentials. PRO unlocks extra features for those who use NODUS more intensively.',
      es: 'La versión gratuita ya cubre lo esencial. El PRO desbloquea recursos extra para quienes usan NODUS con más intensidad.',
      fr: 'La version gratuite couvre déjà l\'essentiel. Le PRO débloque des fonctionnalités supplémentaires pour ceux qui utilisent NODUS plus intensément.',
      de: 'Die kostenlose Version deckt bereits das Wesentliche ab. PRO schaltet zusätzliche Funktionen für intensivere NODUS-Nutzer frei.',
      ja: '無料版でも基本機能はカバーしています。PROはNODUSをより集中的に使う方向けに追加機能を解放します。',
      it: 'La versione gratuita copre già l\'essenziale. Il PRO sblocca funzionalità extra per chi usa NODUS più intensamente.', zh: '免费版已涵盖基本功能。PRO为更密集使用NODUS的用户解锁额外功能。', ko: '무료 버전은 이미 기본적인 것을 다룹니다. PRO는 NODUS를 더 집중적으로 사용하는 사람들을 위한 추가 기능을 잠금 해제합니다.', hi: 'मुफ़्त संस्करण पहले से ही आवश्यक चीजें कवर करता है। PRO उन लोगों के लिए अतिरिक्त सुविधाएं अनलॉक करता है जो NODUS का अधिक उपयोग करते हैं।'
    },
    'onboarding.slide7.item1': {
      pt: '📁 Mais filas para organizar projetos separados',
      en: '📁 More queues to organize separate projects',
      es: '📁 Más colas para organizar proyectos separados',
      fr: '📁 Plus de files pour organiser des projets séparés',
      de: '📁 Mehr Warteschlangen zum Organisieren separater Projekte',
      ja: '📁 別プロジェクトを整理するための追加キュー',
      it: '📁 Più code per organizzare progetti separati', zh: '📁 更多队列以组织独立项目', ko: '📁 별도 프로젝트를 정리하는 더 많은 대기열', hi: '📁 अलग प्रोजेक्ट व्यवस्थित करने के लिए अधिक कतारें'
    },
    'onboarding.slide7.item2': {
      pt: '🔐 Recursos avançados de backup',
      en: '🔐 Advanced backup features',
      es: '🔐 Funciones avanzadas de backup',
      fr: '🔐 Fonctionnalités de sauvegarde avancées',
      de: '🔐 Erweiterte Backup-Funktionen',
      ja: '🔐 高度なバックアップ機能',
      it: '🔐 Funzionalità avanzate di backup', zh: '🔐 高级备份功能', ko: '🔐 고급 백업 기능', hi: '🔐 उन्नत बैकअप सुविधाएं'
    },
    'onboarding.slide7.item3': {
      pt: '📸 Recursos extras de captura e organização',
      en: '📸 Extra capture and organization features',
      es: '📸 Recursos extra de captura y organización',
      fr: '📸 Fonctionnalités de capture et d\'organisation supplémentaires',
      de: '📸 Zusätzliche Aufnahme- und Organisationsfunktionen',
      ja: '📸 追加のキャプチャと整理機能',
      it: '📸 Funzionalità extra di cattura e organizzazione', zh: '📸 额外的捕获和整理功能', ko: '📸 추가 캡처 및 정리 기능', hi: '📸 अतिरिक्त कैप्चर और व्यवस्था सुविधाएं'
    },
    'onboarding.slide7.item4': {
      pt: '🚀 Mais flexibilidade para escalar seu uso',
      en: '🚀 More flexibility to scale your use',
      es: '🚀 Más flexibilidad para escalar tu uso',
      fr: '🚀 Plus de flexibilité pour faire évoluer votre utilisation',
      de: '🚀 Mehr Flexibilität zum Skalieren deiner Nutzung',
      ja: '🚀 使用量を拡大するための柔軟性',
      it: '🚀 Più flessibilità per scalare il tuo utilizzo', zh: '🚀 更灵活地扩展您的使用', ko: '🚀 사용량을 확장하는 더 많은 유연성', hi: '🚀 आपके उपयोग को बढ़ाने के लिए अधिक लचीलापन'
    },
    'onboarding.slide8.title': {
      pt: 'Tudo pronto',
      en: 'All Set',
      es: 'Todo listo',
      fr: 'Tout est prêt',
      de: 'Alles Bereit',
      ja: '準備完了',
      it: 'Tutto Pronto', zh: '一切就绪', ko: '준비 완료', hi: 'सब तैयार'
    },
    'onboarding.slide8.desc': {
      pt: 'O NODUS já está ativo nesta página. Passe o mouse sobre uma resposta da IA para ver os botões e comece salvando sua primeira ideia.',
      en: 'NODUS is already active on this page. Hover over an AI response to see the buttons and start saving your first idea.',
      es: 'NODUS ya está activo en esta página. Pasa el mouse sobre una respuesta de IA para ver los botones y empieza guardando tu primera idea.',
      fr: 'NODUS est déjà actif sur cette page. Survolez une réponse IA pour voir les boutons et commencez à sauvegarder votre première idée.',
      de: 'NODUS ist bereits auf dieser Seite aktiv. Bewege die Maus über eine KI-Antwort, um die Schaltflächen zu sehen, und beginne mit dem Speichern deiner ersten Idee.',
      ja: 'NODUSはこのページで既に有効です。AIの回答にカーソルを合わせるとボタンが表示されます。最初のアイデアを保存してみましょう。',
      it: 'NODUS è già attivo su questa pagina. Passa il mouse su una risposta IA per vedere i pulsanti e inizia a salvare la tua prima idea.', zh: 'NODUS已在此页面上激活。将鼠标悬停在AI回答上以查看按钮，开始保存您的第一个想法。', ko: 'NODUS는 이 페이지에서 이미 활성화되어 있습니다. AI 응답에 마우스를 올리면 버튼이 표시됩니다. 첫 번째 아이디어를 저장해보세요.', hi: 'NODUS इस पृष्ठ पर पहले से सक्रिय है। बटन देखने के लिए AI उत्तर पर माउस घुमाएं और अपना पहला विचार सहेजना शुरू करें।'
    },

    // ─────────────────────────────────────────────────────────────
    // SETTINGS — HELP & ONBOARDING
    // ─────────────────────────────────────────────────────────────
    'settings.help': {
      pt: 'Ajuda & Tour',
      en: 'Help & Tour',
      es: 'Ayuda & Tour',
      fr: 'Aide & Tour',
      de: 'Hilfe & Tour',
      ja: 'ヘルプ＆ツアー',
      it: 'Aiuto & Tour', zh: '帮助与导览', ko: '도움말 및 투어', hi: 'सहायता और दौरा'
    },
    'settings.onboarding.btn': {
      pt: '🎯 Ver Tour de Apresentação',
      en: '🎯 View Onboarding Tour',
      es: '🎯 Ver Tour de Presentación',
      fr: 'Voir le Tour de Présentation',
      de: 'Einführungstour Ansehen',
      ja: 'オンボーディングツアーを見る',
      it: '🎯 Vedi Tour di Presentazione', zh: '🎯 查看新手导览', ko: '🎯 온보딩 투어 보기', hi: '🎯 परिचय दौरा देखें'
    },
    'settings.onboarding.desc': {
      pt: 'Reveja o tutorial inicial com as funcionalidades do NODUS',
      en: 'Replay the introduction tutorial with NODUS features',
      es: 'Revisa el tutorial inicial con las funcionalidades de NODUS',
      fr: 'Revoyez le tutoriel initial avec les fonctionnalités NODUS',
      de: 'Wiederhole das Einführungs-Tutorial mit NODUS-Funktionen',
      ja: 'NODUSの機能を使った初期チュートリアルを見直す',
      it: 'Rivedi il tutorial iniziale con le funzionalità di NODUS', zh: '重新查看NODUS功能的入门教程', ko: 'NODUS 기능과 함께 소개 튜토리얼 다시 보기', hi: 'NODUS सुविधाओं के साथ प्रारंभिक ट्यूटोरियल फिर से देखें'
    },
    'settings.onboarding.success': {
      pt: '✅ Tour reiniciado! Recarregue a página para ver.',
      en: '✅ Tour reset! Reload the page to view.',
      es: '✅ ¡Tour reiniciado! Recarga la página para verlo.',
      fr: 'Tour réinitialisé! Rechargez la page pour voir.',
      de: 'Tour zurückgesetzt! Seite neu laden zum Anzeigen.',
      ja: 'ツアーをリセット！表示するにはページを再読み込みしてください。',
      it: '✅ Tour ripristinato! Ricarica la pagina per vederlo.', zh: '✅ 导览已重置！重新加载页面查看。', ko: '✅ 투어가 초기화되었습니다! 페이지를 새로고침하세요.', hi: '✅ दौरा रीसेट! देखने के लिए पृष्ठ पुनः लोड करें।'
    }
  },
  
  // ═══════════════════════════════════════════════════════════════
  // MÉTODOS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Inicializa o sistema de i18n
   */
  async init() {
    // Carregar idioma salvo ou detectar
    const data = await chrome.storage.local.get('nodus_language');
    
    if (data.nodus_language && data.nodus_language !== 'auto') {
      this.currentLang = data.nodus_language;
    } else {
      // Auto-detectar do browser
      this.currentLang = this.detectLanguage();
    }
    
  },
  
  /**
   * Detecta idioma do browser
   */
  detectLanguage() {
    const browserLang = navigator.language?.toLowerCase() || 'en';

    // Mapear variantes
    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('fr')) return 'fr';
    if (browserLang.startsWith('de')) return 'de';
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('it')) return 'it';
    if (browserLang.startsWith('zh')) return 'zh';
    if (browserLang.startsWith('ko')) return 'ko';
    if (browserLang.startsWith('hi')) return 'hi';
    if (browserLang.startsWith('en')) return 'en';

    // Default
    return 'en';
  },
  
  /**
   * Define o idioma
   */
  async setLanguage(lang) {
    if (lang === 'auto') {
      this.currentLang = this.detectLanguage();
      await chrome.storage.local.set({ nodus_language: 'auto' });
    } else if (this.supportedLangs.includes(lang)) {
      this.currentLang = lang;
      await chrome.storage.local.set({ nodus_language: lang });
    }
    
  },
  
  /**
   * Obtém tradução de uma chave
   * @param {string} key - Chave da tradução
   * @param {object} params - Parâmetros para substituição (opcional)
   * @returns {string} - Texto traduzido
   */
  t(key, params = {}) {
    const translation = this.translations[key];
    
    if (!translation) {
      console.warn('[i18n] Chave não encontrada:', key);
      return key;
    }
    
    let text = translation[this.currentLang] || translation['en'] || key;
    
    // Substituir parâmetros {param}
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });
    
    return text;
  },
  
  /**
   * Atalho para t()
   */
  get(key, params) {
    return this.t(key, params);
  },
  
  /**
   * Aplica traduções em elementos com data-i18n
   */
  applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });
    
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });
  }
};

// Expor no window para acesso global
window.NodusI18n = NodusI18n;

// Atalho global
const t = (key, params) => NodusI18n.t(key, params);

// Export para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NodusI18n, t };
}
