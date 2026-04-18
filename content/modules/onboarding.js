// ═══════════════════════════════════════════════════════════════
// NODUS - Onboarding Multilingue (v1.0)
// Slider de cartões com suporte PT-BR / EN / ES
// Gatilho: checkAndShow() — só exibe se nunca completado
// ═══════════════════════════════════════════════════════════════

window.NodusOnboarding = {
  STORAGE_KEY: 'nodus_onboarding_done',
  TOTAL: 8,

  // Estado interno
  _index: 0,
  _overlay: null,
  _slidesEl: null,
  _dotsEl: null,
  _prevBtn: null,
  _nextBtn: null,
  _progressEl: null,
  _keyHandler: null,
  _startX: 0,

  // ─────────────────────────────────────────────────────────────
  // i18n helper (usa NodusI18n se disponível)
  // ─────────────────────────────────────────────────────────────
  _t(key) {
    if (typeof NodusI18n !== 'undefined') return NodusI18n.t(key);
    // Fallback mínimo em inglês
    const fallbacks = {
      'onboarding.skip': 'Skip',
      'onboarding.next': 'Next',
      'onboarding.prev': 'Previous',
      'onboarding.start': 'Get Started!',
      'onboarding.of': 'of'
    };
    return fallbacks[key] || key;
  },

  // ─────────────────────────────────────────────────────────────
  // Dados dos slides
  // ─────────────────────────────────────────────────────────────
  _getSlides() {
    const t = (k) => this._t(k);
    return [
      // 1 — Welcome
      {
        emoji: '💡',
        title: t('onboarding.slide1.title'),
        body: `
          <p class="nodus-ob-tagline">${t('onboarding.slide1.tagline')}</p>
          <p class="nodus-ob-desc">${t('onboarding.slide1.desc')}</p>`
      },
      // 2 — Why NODUS
      {
        emoji: '🤔',
        title: t('onboarding.slide2.title'),
        body: `
          <p class="nodus-ob-desc">${t('onboarding.slide2.desc')}</p>
          <ul class="nodus-ob-list">
            <li>${t('onboarding.slide2.item1')}</li>
            <li>${t('onboarding.slide2.item2')}</li>
            <li>${t('onboarding.slide2.item3')}</li>
          </ul>`
      },
      // 3 — Os Botões NODUS
      {
        emoji: '🖱️',
        title: t('onboarding.slide3.title'),
        body: `
          <p class="nodus-ob-desc">${t('onboarding.slide3.desc')}</p>
          <ul class="nodus-ob-list">
            <li>${t('onboarding.slide3.btn1')}</li>
            <li>${t('onboarding.slide3.btn2')}</li>
            <li>${t('onboarding.slide3.btn3')}</li>
            <li>${t('onboarding.slide3.btn4')}</li>
          </ul>`
      },
      // 4 — Dashboard
      {
        emoji: '📊',
        title: t('onboarding.slide4.title'),
        body: `
          <p class="nodus-ob-desc">${t('onboarding.slide4.desc')}</p>
          <ul class="nodus-ob-list">
            <li>${t('onboarding.slide4.item1')}</li>
            <li>${t('onboarding.slide4.item2')}</li>
            <li>${t('onboarding.slide4.item3')}</li>
          </ul>`
      },
      // 5 — Filas & Tags
      {
        emoji: '📁',
        title: t('onboarding.slide5.title'),
        body: `
          <p class="nodus-ob-desc">${t('onboarding.slide5.desc')}</p>
          <ul class="nodus-ob-list">
            <li>${t('onboarding.slide5.item1')}</li>
            <li>${t('onboarding.slide5.item2')}</li>
            <li>${t('onboarding.slide5.item3')}</li>
          </ul>
          <div class="nodus-ob-tip">${t('onboarding.slide5.tip')}</div>`
      },
      // 6 — Cadeias (Chains)
      {
        emoji: '🔗',
        title: t('onboarding.slide6.title'),
        body: `
          <p class="nodus-ob-desc">${t('onboarding.slide6.desc')}</p>
          <ul class="nodus-ob-list">
            <li>${t('onboarding.slide6.item1')}</li>
            <li>${t('onboarding.slide6.item2')}</li>
            <li>${t('onboarding.slide6.item3')}</li>
          </ul>
          <div class="nodus-ob-tip">${t('onboarding.slide6.tip')}</div>`
      },
      // 7 — PRO Features
      {
        emoji: '⚡',
        title: t('onboarding.slide7.title'),
        body: `
          <p class="nodus-ob-desc">${t('onboarding.slide7.desc')}</p>
          <ul class="nodus-ob-pro-list">
            <li>${t('onboarding.slide7.item1')}</li>
            <li>${t('onboarding.slide7.item2')}</li>
            <li>${t('onboarding.slide7.item3')}</li>
            <li>${t('onboarding.slide7.item4')}</li>
          </ul>`
      },
      // 8 — Tudo Pronto!
      {
        emoji: '🎉',
        title: t('onboarding.slide8.title'),
        body: `<p class="nodus-ob-desc">${t('onboarding.slide8.desc')}</p>`
      }
    ];
  },

  // ─────────────────────────────────────────────────────────────
  // Build HTML
  // ─────────────────────────────────────────────────────────────
  _buildHTML() {
    const slides = this._getSlides();
    const total  = slides.length;
    const t      = (k) => this._t(k);

    const slidesHTML = slides.map((s, i) => `
      <div class="nodus-ob-slide" data-index="${i}">
        <span class="nodus-ob-emoji">${s.emoji}</span>
        <h2 class="nodus-ob-title">${s.title}</h2>
        ${s.body}
      </div>
    `).join('');

    const dotsHTML = slides.map((_, i) => `
      <button class="nodus-ob-dot${i === 0 ? ' active' : ''}"
              data-idx="${i}"
              aria-label="Slide ${i + 1}"></button>
    `).join('');

    return `
      <div class="nodus-ob-overlay" id="nodus-ob-overlay" role="dialog" aria-modal="true" aria-label="NODUS Onboarding">
        <div class="nodus-ob-card">

          <!-- Header -->
          <div class="nodus-ob-header">
            <span class="nodus-ob-logo">NODUS</span>
            <span class="nodus-ob-progress" id="nodus-ob-progress">1 ${t('onboarding.of')} ${total}</span>
            <button class="nodus-ob-skip" id="nodus-ob-skip">${t('onboarding.skip')}</button>
          </div>

          <!-- Slides -->
          <div class="nodus-ob-slides-wrapper">
            <div class="nodus-ob-slides" id="nodus-ob-slides">
              ${slidesHTML}
            </div>
          </div>

          <!-- Footer -->
          <div class="nodus-ob-footer">
            <button class="nodus-ob-prev" id="nodus-ob-prev" disabled>${t('onboarding.prev')}</button>
            <div class="nodus-ob-dots" id="nodus-ob-dots">${dotsHTML}</div>
            <button class="nodus-ob-next" id="nodus-ob-next">${t('onboarding.next')}</button>
          </div>

        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────
  // Verificar & Exibir
  // ─────────────────────────────────────────────────────────────
  async checkAndShow() {
    try {
      const data = await chrome.storage.local.get(this.STORAGE_KEY);
      if (data[this.STORAGE_KEY]) {
        return;
      }
      this.show();
    } catch (e) {
      console.error('[Onboarding] Erro ao verificar storage:', e);
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Show
  // ─────────────────────────────────────────────────────────────
  show() {
    if (document.getElementById('nodus-ob-overlay')) return;

    // CSS
    this._injectCSS();

    // DOM
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this._buildHTML();
    document.body.appendChild(wrapper.firstElementChild);

    // Refs
    this._overlay    = document.getElementById('nodus-ob-overlay');
    this._slidesEl   = document.getElementById('nodus-ob-slides');
    this._dotsEl     = document.getElementById('nodus-ob-dots');
    this._prevBtn    = document.getElementById('nodus-ob-prev');
    this._nextBtn    = document.getElementById('nodus-ob-next');
    this._progressEl = document.getElementById('nodus-ob-progress');
    this._index      = 0;

    // Events
    document.getElementById('nodus-ob-skip')
      .addEventListener('click', () => this.skip());

    this._prevBtn.addEventListener('click', () => this.prev());
    this._nextBtn.addEventListener('click', () => this.next());

    // Dot clicks
    this._dotsEl.querySelectorAll('.nodus-ob-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        if (!isNaN(idx)) this.goTo(idx);
      });
    });

    // Touch / swipe
    this._overlay.addEventListener('touchstart', (e) => {
      this._startX = e.touches[0].clientX;
    }, { passive: true });

    this._overlay.addEventListener('touchend', (e) => {
      const diff = this._startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? this.next() : this.prev();
      }
    }, { passive: true });

    // Teclado
    this._keyHandler = (e) => {
      if (e.key === 'ArrowRight') this.next();
      else if (e.key === 'ArrowLeft') this.prev();
      else if (e.key === 'Escape') this.skip();
    };
    document.addEventListener('keydown', this._keyHandler);

    // Clique fora do card = skip
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.skip();
    });

  },

  // ─────────────────────────────────────────────────────────────
  // Navegação
  // ─────────────────────────────────────────────────────────────
  goTo(index) {
    if (index < 0 || index >= this.TOTAL) return;
    this._index = index;

    // Mover slider
    this._slidesEl.style.transform = `translateX(-${index * 100}%)`;

    // Progress label
    const of = this._t('onboarding.of');
    this._progressEl.textContent = `${index + 1} ${of} ${this.TOTAL}`;

    // Dots
    this._dotsEl.querySelectorAll('.nodus-ob-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    // Botão Prev
    this._prevBtn.disabled = index === 0;

    // Botão Next → vira "Começar!" no último slide
    const isLast = index === this.TOTAL - 1;
    this._nextBtn.textContent = isLast
      ? this._t('onboarding.start')
      : this._t('onboarding.next');
    this._nextBtn.classList.toggle('nodus-ob-finish', isLast);
  },

  next() {
    if (this._index === this.TOTAL - 1) {
      this.complete();
    } else {
      this.goTo(this._index + 1);
    }
  },

  prev() {
    this.goTo(this._index - 1);
  },

  // ─────────────────────────────────────────────────────────────
  // Finalizar
  // ─────────────────────────────────────────────────────────────
  async _markDone() {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: true });
    } catch (e) {
      console.error('[Onboarding] Erro ao salvar flag:', e);
    }
  },

  async skip() {
    await this._markDone();
    this._hide();
  },

  async complete() {
    await this._markDone();
    this._hide();
  },

  _hide() {
    if (this._overlay) {
      this._overlay.style.animation = 'nodus-ob-fadeout 0.22s ease forwards';
      const el = this._overlay;
      setTimeout(() => el.remove(), 250);
      this._overlay = null;
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Injetar CSS via <link> (web_accessible_resource)
  // ─────────────────────────────────────────────────────────────
  _injectCSS() {
    if (document.getElementById('nodus-ob-css')) return;
    const link = document.createElement('link');
    link.id   = 'nodus-ob-css';
    link.rel  = 'stylesheet';
    link.href = chrome.runtime.getURL('content/modules/onboarding.css');
    document.head.appendChild(link);
  }
};

