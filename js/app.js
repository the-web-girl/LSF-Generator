/**
 * ============================================================
 * LSF Generator — Script JavaScript principal
 * Réalisé par IntA11Y - Solutions
 * ============================================================
 */

'use strict';

/* ============================================================
   1. CONFIGURATION
   ============================================================ */
const CONFIG = {
  TEXT_SIZES: [0.75, 0.875, 1, 1.125, 1.25, 1.375, 1.5],
  TEXT_SIZE_DEFAULT_INDEX: 2,
  HISTORY_MAX: 20,
  STORAGE_KEYS: {
    preferences: 'lsf_a11y_prefs',
    history: 'lsf_history',
  },
};

/* ============================================================
   2. GESTIONNAIRE D'ACCESSIBILITÉ
   ============================================================ */
const A11yManager = {
  prefs: {
    dyslexia: false,
    colorblind: false,
    grayscale: false,
    dark: false,
    simple: false,
    textSizeIndex: CONFIG.TEXT_SIZE_DEFAULT_INDEX,
  },

  init() {
    this.loadPrefs();
    this.applyAllPrefs();
    this.bindEvents();
  },

  loadPrefs() {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.preferences);
      if (saved) Object.assign(this.prefs, JSON.parse(saved));
    } catch (e) {}
  },

  savePrefs() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.preferences, JSON.stringify(this.prefs));
    } catch (e) {}
  },

  applyAllPrefs() {
    this.setDataAttr('dyslexia', this.prefs.dyslexia);
    this.setDataAttr('colorblind', this.prefs.colorblind);
    this.setDataAttr('grayscale', this.prefs.grayscale);
    this.setDataAttr('simple', this.prefs.simple);
    if (this.prefs.dark) document.documentElement.setAttribute('data-theme', 'dark');
    this.applyTextSize(this.prefs.textSizeIndex);
    this.syncButtons();
  },

  bindEvents() {
    const bindings = {
      'btn-dyslexia':   () => this.toggle('dyslexia'),
      'btn-colorblind': () => this.toggle('colorblind'),
      'btn-grayscale':  () => this.toggle('grayscale'),
      'btn-dark':       () => this.toggle('dark'),
      'btn-simple':     () => this.toggle('simple'),
      'btn-text-decrease': () => this.changeTextSize(-1),
      'btn-text-reset':    () => this.resetTextSize(),
      'btn-text-increase': () => this.changeTextSize(+1),
    };
    Object.entries(bindings).forEach(([id, fn]) => {
      document.getElementById(id)?.addEventListener('click', fn);
    });
  },

  toggle(key) {
    this.prefs[key] = !this.prefs[key];
    if (key === 'dark') {
      this.prefs.dark
        ? document.documentElement.setAttribute('data-theme', 'dark')
        : document.documentElement.removeAttribute('data-theme');
    } else {
      this.setDataAttr(key, this.prefs[key]);
    }
    this.savePrefs();
    this.syncButtons();
    const labels = {
      dyslexia:   this.prefs.dyslexia   ? 'Police dyslexie activée'       : 'Police dyslexie désactivée',
      colorblind: this.prefs.colorblind ? 'Mode daltonien activé'          : 'Mode daltonien désactivé',
      grayscale:  this.prefs.grayscale  ? 'Mode noir et blanc activé'      : 'Mode noir et blanc désactivé',
      dark:       this.prefs.dark       ? 'Mode sombre activé'             : 'Mode sombre désactivé',
      simple:     this.prefs.simple     ? 'Lecture simplifiée activée'     : 'Lecture simplifiée désactivée',
    };
    UIManager.announce(labels[key] || '');
  },

  changeTextSize(delta) {
    const newIndex = Math.max(0, Math.min(CONFIG.TEXT_SIZES.length - 1, this.prefs.textSizeIndex + delta));
    this.prefs.textSizeIndex = newIndex;
    this.applyTextSize(newIndex);
    this.savePrefs();
    UIManager.announce(`Taille du texte : ${Math.round(CONFIG.TEXT_SIZES[newIndex] * 100)}%`);
  },

  resetTextSize() {
    this.prefs.textSizeIndex = CONFIG.TEXT_SIZE_DEFAULT_INDEX;
    this.applyTextSize(CONFIG.TEXT_SIZE_DEFAULT_INDEX);
    this.savePrefs();
    UIManager.announce('Taille du texte réinitialisée');
  },

  applyTextSize(index) {
    document.documentElement.style.setProperty('--font-size-base', `${CONFIG.TEXT_SIZES[index]}rem`);
  },

  setDataAttr(key, value) {
    value
      ? document.documentElement.setAttribute(`data-${key}`, 'true')
      : document.documentElement.removeAttribute(`data-${key}`);
  },

  syncButtons() {
    const map = {
      'btn-dyslexia': 'dyslexia', 'btn-colorblind': 'colorblind',
      'btn-grayscale': 'grayscale', 'btn-dark': 'dark', 'btn-simple': 'simple',
    };
    Object.entries(map).forEach(([id, key]) => {
      document.getElementById(id)?.setAttribute('aria-pressed', String(this.prefs[key]));
    });
  },
};

/* ============================================================
   3. GESTIONNAIRE D'HISTORIQUE
   ============================================================ */
const HistoryManager = {
  entries: [],

  init() {
    this.load();
    this.render();
    document.getElementById('btn-clear-history')?.addEventListener('click', () => this.clear());
  },

  load() {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.history);
      if (saved) this.entries = JSON.parse(saved);
    } catch (e) { this.entries = []; }
  },

  save() {
    try { localStorage.setItem(CONFIG.STORAGE_KEYS.history, JSON.stringify(this.entries)); } catch (e) {}
  },

  add(query) {
    if (!query?.trim()) return;
    const trimmed = query.trim();
    this.entries = this.entries.filter(e => e.query.toLowerCase() !== trimmed.toLowerCase());
    this.entries.unshift({ query: trimmed, date: new Date().toISOString() });
    if (this.entries.length > CONFIG.HISTORY_MAX) this.entries = this.entries.slice(0, CONFIG.HISTORY_MAX);
    this.save();
    this.render();
  },

  clear() {
    this.entries = [];
    this.save();
    this.render();
    UIManager.announce('Historique effacé');
  },

  render() {
    const list = document.getElementById('history-list');
    const emptyMsg = document.getElementById('history-empty');
    if (!list) return;
    list.innerHTML = '';
    if (this.entries.length === 0) {
      emptyMsg?.removeAttribute('hidden');
      return;
    }
    emptyMsg?.setAttribute('hidden', '');
    this.entries.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-btn';
      btn.textContent = entry.query;
      btn.setAttribute('aria-label', `Rechercher à nouveau : ${entry.query}`);
      btn.addEventListener('click', () => {
        const input = document.getElementById('lsf-input');
        if (input) {
          input.value = entry.query;
          document.getElementById('lsf-form')?.requestSubmit();
          document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  },
};

/* ============================================================
   4. SERVICE LSF
   ============================================================ */
const LsfService = {

  mockData: {
    'bonjour':    { description: 'Salutation standard en LSF',          emoji: '👋' },
    'merci':      { description: 'Expression de gratitude',              emoji: '🙏' },
    'au revoir':  { description: 'Formule de départ',                    emoji: '✋' },
    'oui':        { description: 'Affirmation positive',                 emoji: '👍' },
    'non':        { description: 'Négation',                             emoji: '👎' },
    'sil vous plait': { description: 'Formule de politesse',             emoji: '🙏' },
    'pardon':     { description: 'Excuser, demander pardon',             emoji: '🤲' },
    'aide':       { description: "Demander de l'aide",                   emoji: '🆘' },
    'famille':    { description: 'Famille, parenté',                     emoji: '👨‍👩‍👧' },
    'eau':        { description: 'Eau, boisson',                         emoji: '💧' },
    'pain':       { description: 'Aliment de base',                      emoji: '🍞' },
    'maison':     { description: "Lieu d'habitation",                    emoji: '🏠' },
    'ecole':      { description: "Lieu d'enseignement",                  emoji: '🏫' },
    'école':      { description: "Lieu d'enseignement",                  emoji: '🏫' },
    'travail':    { description: 'Activité professionnelle',             emoji: '💼' },
    'amour':      { description: "Sentiment d'amour",                    emoji: '❤️' },
    'heureux':    { description: 'État de bonheur',                      emoji: '😊' },
    'triste':     { description: 'État de tristesse',                    emoji: '😢' },
    'comment':    { description: 'Interrogatif',                         emoji: '🤔' },
    'pourquoi':   { description: 'Interrogatif causal',                  emoji: '❓' },
    'je':         { description: 'Pronom personnel 1ère personne',       emoji: '👤' },
    'tu':         { description: 'Pronom personnel 2ème personne',       emoji: '👆' },
    'il':         { description: 'Pronom personnel 3ème personne',       emoji: '👉' },
    'elle':       { description: 'Pronom personnel 3ème personne fém.',  emoji: '👉' },
    'nous':       { description: 'Pronom personnel 1ère pers. pluriel',  emoji: '👐' },
    'vous':       { description: 'Pronom personnel 2ème pers. pluriel',  emoji: '🤲' },
    'bien':       { description: 'Adverbe positif',                      emoji: '👌' },
    'mal':        { description: 'Adverbe négatif',                      emoji: '👎' },
    'chat':       { description: 'Animal domestique félin',              emoji: '🐱' },
    'chien':      { description: 'Animal domestique canin',              emoji: '🐶' },
    'manger':     { description: 'Action de se nourrir',                 emoji: '🍽️' },
    'boire':      { description: "Action d'ingérer un liquide",          emoji: '🥤' },
    'dormir':     { description: 'Action de dormir',                     emoji: '😴' },
    'nom':        { description: 'Identité, prénom',                     emoji: '📛' },
    'signe':      { description: 'Geste en LSF',                        emoji: '🤟' },
  },

  /**
   * Recherche principale — synchrone, toujours via mock.
   * Le proxy PHP est optionnel et tenté en arrière-plan si disponible.
   */
  async search(text, mode) {
    let words;
    if (mode === 'word') {
      words = text
        .toLowerCase()
        .normalize('NFC')
        .split(/[\s,;.!?:]+/)
        .map(w => w.replace(/[«»"'()\[\]]/g, '').trim())
        .filter(w => w.length > 0);
    } else {
      words = [text.toLowerCase().normalize('NFC').trim()];
    }

    if (words.length === 0) return [];

    // Résultats mock immédiats (toujours disponibles)
    const results = words.map(word => this.getMockSign(word));
    return results.filter(Boolean);
  },

  getMockSign(word) {
    const clean = word.toLowerCase().trim();
    const encoded = encodeURIComponent(clean);
    const data = this.mockData[clean];

    return {
      word: clean,
      source: data ? 'Elix LSF (démo)' : 'Recherche externe',
      videoUrl: null,
      imageUrl: null,
      elixUrl: `https://www.elix-lsf.fr/spip.php?action=elix_recherche&lang=fr&recherche=${encoded}`,
      spreadUrl: `https://www.spreadthesign.com/fr.fr/search/?q=${encoded}`,
      description: data?.description || 'Cliquez sur un lien ci-dessous pour voir ce signe.',
      emoji: data?.emoji || '🤟',
      isMock: true,
      inDictionary: !!data,
    };
  },
};

/* ============================================================
   5. GESTIONNAIRE D'INTERFACE
   ============================================================ */
const UIManager = {

  init() {
    this.bindFormEvents();
    this.bindModalEvents();
    this.bindCharCounter();
  },

  bindFormEvents() {
    document.getElementById('lsf-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await App.handleSearch();
    });
    document.getElementById('btn-clear')?.addEventListener('click', () => this.clearForm());
  },

  bindCharCounter() {
    const input = document.getElementById('lsf-input');
    const counter = document.getElementById('char-count');
    if (!input || !counter) return;
    input.addEventListener('input', () => {
      const len = input.value.length;
      counter.textContent = `${len}/200`;
      counter.classList.toggle('warning', len > 170);
    });
  },

  bindModalEvents() {
    const modal = document.getElementById('modal-a11y');
    document.getElementById('a11y-statement')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openModal();
    });
    document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
    modal?.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hidden) this.closeModal();
    });
  },

  openModal() {
    const modal = document.getElementById('modal-a11y');
    if (!modal) return;
    modal.hidden = false;
    modal.querySelector('button, a, input, [tabindex]')?.focus();
    document.body.style.overflow = 'hidden';
    this.announce("Déclaration d'accessibilité ouverte");
  },

  closeModal() {
    const modal = document.getElementById('modal-a11y');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    document.getElementById('a11y-statement')?.focus();
  },

  clearForm() {
    const input = document.getElementById('lsf-input');
    if (input) {
      input.value = '';
      input.removeAttribute('aria-invalid');
      input.focus();
    }
    const counter = document.getElementById('char-count');
    if (counter) counter.textContent = '0/200';
    const results = document.getElementById('results-section');
    if (results) results.hidden = true;
    const errorMsg = document.getElementById('input-error');
    if (errorMsg) errorMsg.hidden = true;
  },

  showLoading() {
    // Rend la section visible
    const section = document.getElementById('results-section');
    if (section) section.hidden = false;

    // Affiche le spinner
    const loading = document.getElementById('loading-indicator');
    if (loading) loading.hidden = false;

    // Vide la grille
    const grid = document.getElementById('results-grid');
    if (grid) grid.innerHTML = '';

    // Cache erreurs et "aucun résultat"
    const error = document.getElementById('results-error');
    if (error) error.hidden = true;
    const noResults = document.getElementById('no-results');
    if (noResults) noResults.hidden = true;
  },

  hideLoading() {
    const loading = document.getElementById('loading-indicator');
    if (loading) loading.hidden = true;
  },

  showError(message) {
    this.hideLoading();
    const error = document.getElementById('results-error');
    if (!error) return;
    error.hidden = false;
    const p = error.querySelector('p');
    if (p) p.textContent = message;
  },

  renderResults(signs, query) {
    // D'abord cacher le spinner
    this.hideLoading();

    const queryEl = document.getElementById('results-query');
    if (queryEl) queryEl.textContent = query;

    const noResults = document.getElementById('no-results');
    const grid = document.getElementById('results-grid');

    if (!signs || signs.length === 0) {
      if (noResults) noResults.hidden = false;
      this.announce('Aucun signe LSF trouvé pour votre recherche.');
      return;
    }

    if (!grid) return;
    grid.innerHTML = '';

    signs.forEach((sign, index) => {
      const card = this.createSignCard(sign, index);
      grid.appendChild(card);
    });

    const count = signs.length;
    this.announce(`${count} signe${count > 1 ? 's' : ''} LSF trouvé${count > 1 ? 's' : ''} pour « ${query} ».`);
  },

  createSignCard(sign, index) {
    const article = document.createElement('article');
    article.className = 'sign-card';
    article.setAttribute('role', 'listitem');
    article.setAttribute('aria-label', `Signe LSF pour : ${sign.word}`);
    article.style.animationDelay = `${Math.min(index * 60, 360)}ms`;

    // Zone média (fallback illustratif)
    const mediaDiv = document.createElement('div');
    mediaDiv.className = 'sign-media';

    const fallback = document.createElement('div');
    fallback.className = 'sign-fallback';
    fallback.setAttribute('aria-hidden', 'true');

    const emojiEl = document.createElement('span');
    emojiEl.className = 'sign-fallback-emoji';
    emojiEl.textContent = sign.emoji || '🤟';
    fallback.appendChild(emojiEl);

    // Badge "connu / inconnu"
    const badge = document.createElement('span');
    badge.style.cssText = 'font-size:0.65rem;opacity:0.6;margin-top:4px;';
    badge.textContent = sign.inDictionary ? '✓ connu' : '? inconnu';
    fallback.appendChild(badge);

    mediaDiv.appendChild(fallback);
    article.appendChild(mediaDiv);

    // Corps de la carte
    const body = document.createElement('div');
    body.className = 'sign-card-body';

    const wordEl = document.createElement('h3');
    wordEl.className = 'sign-word';
    wordEl.textContent = sign.word;
    body.appendChild(wordEl);

    if (sign.description) {
      const descEl = document.createElement('p');
      descEl.className = 'sign-source';
      descEl.textContent = sign.description;
      body.appendChild(descEl);
    }

    const sourceEl = document.createElement('span');
    sourceEl.className = 'sign-source';
    sourceEl.textContent = `Source : ${sign.source}`;
    body.appendChild(sourceEl);

    // Liens externes
    const linksDiv = document.createElement('div');
    linksDiv.style.cssText = 'display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:auto;padding-top:0.5rem;';

    if (sign.elixUrl) {
      const a = document.createElement('a');
      a.href = sign.elixUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'sign-link';
      a.setAttribute('aria-label', `Voir « ${sign.word} » sur Elix LSF (nouvel onglet)`);
      a.textContent = '🔗 Elix LSF';
      linksDiv.appendChild(a);
    }

    if (sign.spreadUrl) {
      const a = document.createElement('a');
      a.href = sign.spreadUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'sign-link';
      a.setAttribute('aria-label', `Voir « ${sign.word} » sur SpreadTheSign (nouvel onglet)`);
      a.textContent = '🔗 SpreadTheSign';
      linksDiv.appendChild(a);
    }

    body.appendChild(linksDiv);
    article.appendChild(body);
    return article;
  },

  announce(message) {
    const announcer = document.getElementById('sr-announcer');
    if (!announcer) return;
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = message; }, 50);
  },

  toggleInputError(show) {
    const input = document.getElementById('lsf-input');
    const error = document.getElementById('input-error');
    if (show) {
      input?.setAttribute('aria-invalid', 'true');
      if (error) error.hidden = false;
    } else {
      input?.removeAttribute('aria-invalid');
      if (error) error.hidden = true;
    }
  },
};

/* ============================================================
   6. APPLICATION PRINCIPALE
   ============================================================ */
const App = {

  init() {
    // Force l'état initial propre : tout masqué au démarrage
    // (sécurité si le navigateur ne respecte pas l'attribut HTML hidden)
    const ids = ['results-section', 'loading-indicator', 'results-error', 'no-results', 'input-error'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });

    A11yManager.init();
    HistoryManager.init();
    UIManager.init();
    this.injectColorblindFilter();
    console.info('%c LSF Generator — IntA11Y Solutions', 'color:#2d5a8e;font-weight:bold;');
    console.info('Application accessible de traduction LSF. Version 1.1.0');
  },

  async handleSearch() {
    const input = document.getElementById('lsf-input');
    const query = input?.value?.trim() || '';
    const mode = document.querySelector('input[name="generation-mode"]:checked')?.value || 'word';

    if (!query) {
      UIManager.toggleInputError(true);
      input?.focus();
      UIManager.announce('Erreur : veuillez saisir un mot ou une phrase.');
      return;
    }

    UIManager.toggleInputError(false);
    UIManager.showLoading();

    const submitBtn = document.getElementById('btn-generate');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
    }

    try {
      const signs = await LsfService.search(query, mode);
      UIManager.renderResults(signs, query);
      HistoryManager.add(query);
    } catch (err) {
      console.error('Erreur handleSearch :', err);
      UIManager.showError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      // Garantit que le spinner s'arrête TOUJOURS
      UIManager.hideLoading();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    }
  },

  injectColorblindFilter() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    svg.innerHTML = `<defs><filter id="colorblind-filter" color-interpolation-filters="linearRGB">
      <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"/>
    </filter></defs>`;
    document.body.insertBefore(svg, document.body.firstChild);
  },
};

/* ============================================================
   7. INITIALISATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
