import {
  createSeededRng,
  buildChallengeUrl,
  parseChallengeUrl,
  interleavedBisectSortAsync
} from '../core/tournament.js';
import { bindThemeButton } from '../core/theme.js';
import { renderRankingCard, exportRankingCard } from '../core/canvas.js';

const FALLBACK_FLOWER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="%23047857" stroke-width="2"><circle cx="50" cy="50" r="14" fill="%23EAF2EC"/><circle cx="50" cy="26" r="10" fill="%23D1E0D7"/><circle cx="50" cy="74" r="10" fill="%23D1E0D7"/><circle cx="26" cy="50" r="10" fill="%23D1E0D7"/><circle cx="74" cy="50" r="10" fill="%23D1E0D7"/><circle cx="33" cy="33" r="10" fill="%23D1E0D7"/><circle cx="67" cy="33" r="10" fill="%23D1E0D7"/><circle cx="33" cy="67" r="10" fill="%23D1E0D7"/><circle cx="67" cy="67" r="10" fill="%23D1E0D7"/><circle cx="50" cy="50" r="8" fill="%23047857"/></svg>`;

const FLORES_CATALOG_FALLBACK = [
  { id: 1, name: "Orquídea Cattleya", sci_name: "Cattleya trianae", family: "Orchidaceae", region: "América Tropical", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/256523606/medium.jpeg" },
  { id: 2, name: "Pasionaria Azufrada", sci_name: "Passiflora caerulea", family: "Passifloraceae", region: "Sudamérica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/40082393/medium.jpg" },
  { id: 3, name: "Flor de Loto Sagrado", sci_name: "Nelumbo nucifera", family: "Nelumbonaceae", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/116385724/medium.jpeg" },
  { id: 4, name: "Flor de Cerezo (Sakura)", sci_name: "Prunus serrulata", family: "Rosaceae", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/90432717/medium.jpeg" },
  { id: 5, name: "Rosa Silvestre", sci_name: "Rosa canina", family: "Rosaceae", region: "Europa y Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/43901474/medium.jpeg" },
  { id: 6, name: "Ave del Paraíso", sci_name: "Strelitzia reginae", family: "Strelitziaceae", region: "Sudáfrica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/375256909/medium.jpg" },
  { id: 7, name: "Girasol Silvestre", sci_name: "Helianthus annuus", family: "Asteraceae", region: "Norteamérica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/323768714/medium.jpg" },
  { id: 8, name: "Lavanda Silvestre", sci_name: "Lavandula angustifolia", family: "Lamiaceae", region: "Mediterráneo", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/157057/medium.jpg" },
  { id: 9, name: "Hibisco de Jardín", sci_name: "Hibiscus rosa-sinensis", family: "Malvaceae", region: "Asia Tropical", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/729214308/medium.jpg" },
  { id: 10, name: "Nenúfar Blanco", sci_name: "Nymphaea alba", family: "Nymphaeaceae", region: "Europa y Norte de África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/169681028/medium.jpeg" },
  { id: 11, name: "Dalia Silvestre", sci_name: "Dahlia pinnata", family: "Asteraceae", region: "México y Centroamérica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/571049090/medium.jpg" },
  { id: 12, name: "Magnolia Blanca", sci_name: "Magnolia grandiflora", family: "Magnoliaceae", region: "Norteamérica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/82254330/medium.jpg" },
  { id: 13, name: "Amapola Silvestre", sci_name: "Papaver rhoeas", family: "Papaveraceae", region: "Eurasia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/682825136/medium.jpg" },
  { id: 14, name: "Hortensia Azul", sci_name: "Hydrangea macrophylla", family: "Hydrangeaceae", region: "Japón", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/45518546/medium.jpg" },
  { id: 15, name: "Peonía China", sci_name: "Paeonia lactiflora", family: "Paeoniaceae", region: "Asia Central y Oriental", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/113190686/medium.jpg" },
  { id: 16, name: "Jazmín del Cabo", sci_name: "Gardenia jasminoides", family: "Rubiaceae", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/72076739/medium.jpg" }
];

const CURATED_BOTANICAL_FACTS = {
  "Cattleya trianae": "Flor nacional de Colombia. Sus flores epífitas alcanzan hasta 20 cm y atraen abejas euglosinas mediante fragancias naturales puras.",
  "Passiflora caerulea": "Corona radial de filamentos diseñada para posar abejorros carpinteros. En infusión tradicional es apreciada por sus flavonoides calmantes.",
  "Nelumbo nucifera": "Sus hojas poseen una microestructura superhidrófoba que repele impurezas (efecto loto). Sus semillas conservan fertilidad durante siglos.",
  "Prunus serrulata": "Sus flores de cerezo simbolizan la belleza efímera y renacimiento. Florecen en racimos densos sincronizados con la primavera.",
  "Rosa canina": "Especie silvestre antepasada de miles de rosas cultivadas. Tras la floración forma escaramujos ricos en vitamina C natural.",
  "Strelitzia reginae": "Originaria de Sudáfrica, sus brácteas simulan la silueta de una grulla exótica. Es polinizada de forma natural por aves nectarívoras.",
  "Helianthus annuus": "Presenta heliotropismo durante su desarrollo, orientándose hacia el sol. Cada cabeza floral reúne cientos de pequeñas flores individuales.",
  "Lavandula angustifolia": "Arbusto mediterráneo aromático con glándulas secretoras de aceites esenciales. Es una fuente rica de néctar para abejas silvestres.",
  "Hibiscus rosa-sinensis": "Arbusto tropical con una columna estaminal prominente fusionada al estilo. Es flor nacional de Malasia y se aprecia en infusiones.",
  "Nymphaea alba": "Planta acuática enraizada en sedimentos sumergidos con hojas flotantes de corte redondeado. Se abre con la luz solar matutina.",
  "Dahlia pinnata": "Originaria de los valles de México, donde fue cultivada históricamente por su variedad morfológica y raíces alimenticias.",
  "Magnolia grandiflora": "Árbol fósil viviente cuya floración surgió antes que las abejas modernas, evolucionando para ser polinizada por coleópteros.",
  "Papaver rhoeas": "Pétalos de textura sedosa de color carmesí vivo. Ha sido un símbolo histórico de memoria y resiliencia en los campos templados.",
  "Hydrangea macrophylla": "La tonalidad de sus inflorescencias responde al pH del suelo y a la disponibilidad de iones de aluminio libre en la tierra.",
  "Paeonia lactiflora": "Flor venerada en Asia como símbolo de armonía y nobleza. Una misma planta puede florecer anualmente durante más de medio siglo.",
  "Gardenia jasminoides": "Sus flores despiden uno de los perfumes botánicos más intensos y delicados, ampliamente apreciado en jardines de todo el mundo."
};

const app = {
  state: {
    pool: [],
    candidatePool: [],
    initialBattlePool: [],
    currentLeft: null,
    currentRight: null,
    battleStep: 0,
    estimatedTotalSteps: 0,
    battleSeed: 1337,
    choiceHistory: [],
    replayDecisions: [],
    pendingResolver: null,
    finalRanking: [],
    top1FunFact: "",
    imageCache: new Set(),
    limit: 16,
    selectedCategory: 'todas',
    selectedColor: 'todas',
    selectedUsage: 'todas',
    selectedClimate: 'todos',
    searchQuery: '',
    exportFormat: 'story'
  },

  async init() {
    bindThemeButton({
      buttonId: 'themeToggle',
      labelId: 'themeLabel',
      iconDarkId: 'themeIconDark',
      iconLightId: 'themeIconLight'
    });

    this.bindKeyboard();
    await this.loadDataset();
    this.checkIncomingChallenge();
  },

  async loadDataset() {
    try {
      const res = await fetch('/data/flores.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.state.pool = data;
      this.state.candidatePool = [...data];
    } catch (err) {
      console.warn('Usando catálogo floral integrado como fallback:', err);
      this.state.pool = [...FLORES_CATALOG_FALLBACK];
      this.state.candidatePool = [...FLORES_CATALOG_FALLBACK];
    }
  },

  async resolveTop1FunFact(flower) {
    if (!flower) return "";
    if (CURATED_BOTANICAL_FACTS[flower.sci_name]) {
      return CURATED_BOTANICAL_FACTS[flower.sci_name];
    }
    try {
      const slug = encodeURIComponent(flower.sci_name.replace(/\s+/g, '_'));
      const res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${slug}`);
      if (!res.ok) return "";
      const data = await res.json();
      return data.extract ? data.extract.split('.')[0] + '.' : "";
    } catch {
      return "";
    }
  },

  playBotanicalChimeFallback() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [
        { f: 523.25, dur: 0.35, gap: 0.08 },
        { f: 659.25, dur: 0.4, gap: 0.08 },
        { f: 783.99, dur: 0.45, gap: 0.09 },
        { f: 1046.50, dur: 0.7, gap: 0.12 }
      ];
      let offset = ctx.currentTime + 0.04;
      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.f, offset);
        gain.gain.setValueAtTime(0.001, offset);
        gain.gain.exponentialRampToValueAtTime(0.18, offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, offset + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(offset);
        osc.stop(offset + n.dur + 0.02);
        offset += n.gap;
      });
    } catch (e) {
      console.warn('Chime de victoria botánico no disponible:', e);
    }
  },

  checkIncomingChallenge() {
    const challenge = parseChallengeUrl();
    if (challenge && challenge.ids && challenge.ids.length >= 2) {
      const banner = document.getElementById('challengeBanner');
      if (banner) banner.classList.remove('hidden');
    }
  },

  dismissChallengeBanner() {
    document.getElementById('challengeBanner')?.classList.add('hidden');
  },

  acceptChallenge() {
    this.dismissChallengeBanner();
    const challenge = parseChallengeUrl();
    if (!challenge) return;
    const candidates = challenge.ids
      .map(rawId => this.state.pool.find(p => String(p.id) === String(rawId)))
      .filter(Boolean);
    if (candidates.length >= 2) {
      this.state.candidatePool = candidates;
      this.state.limit = candidates.length;
      this.startBattleGame(true);
    }
  },

  launchPreset(presetKey) {
    let subset = [...this.state.pool];
    if (presetKey === 'orquideas') {
      subset = this.state.pool.filter(p => p.family === 'Orchidaceae' || p.usage === 'Selva Tropical' || ['Passifloraceae', 'Heliconiaceae', 'Bromeliaceae'].includes(p.family));
    } else if (presetKey === 'silvestres') {
      subset = this.state.pool.filter(p => p.usage === 'Silvestre de campo' || ['Asteraceae', 'Campanulaceae', 'Papaveraceae', 'Ranunculaceae'].includes(p.family));
    } else if (presetKey === 'jardin' || presetKey === 'arboles') {
      subset = this.state.pool.filter(p => p.usage === 'Jardín Ornamental' || ['Rosaceae', 'Paeoniaceae', 'Hydrangeaceae', 'Liliaceae', 'Iridaceae'].includes(p.family));
    } else if (presetKey === 'aromaticas' || presetKey === 'acuaticas') {
      if (presetKey === 'acuaticas') {
        subset = this.state.pool.filter(p => p.usage === 'Acuática / Loto' || ['Nymphaeaceae', 'Nelumbonaceae', 'Pontederiaceae'].includes(p.family));
      } else {
        subset = this.state.pool.filter(p => p.usage === 'Aromática y Medicinal' || ['Lamiaceae', 'Apiaceae'].includes(p.family));
      }
    }
    if (subset.length < 2) subset = [...this.state.pool];
    this.state.candidatePool = subset;
    this.state.limit = Math.min(16, subset.length);
    this.startBattleGame();
  },

  launchRandomGame() {
    this.state.candidatePool = [...this.state.pool];
    this.shuffle(this.state.candidatePool);
    this.state.limit = Math.min(16, this.state.candidatePool.length);
    this.startBattleGame();
  },

  // ============================================================
  // CUSTOMIZER & FILTERS (COLOR, ENTORNO/USO, CLIMA, BUSCADOR)
  // ============================================================
  toggleCustomizer() {
    const panel = document.getElementById('customizerPanel');
    if (!panel) return;
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !isHidden);
    if (isHidden) {
      this.updateCustomizerUI();
    }
  },

  onSearchInput(val) {
    this.state.searchQuery = val || '';
    const clearBtn = document.getElementById('clearFlorSearchBtn');
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !this.state.searchQuery);
    }
    this.applyFilters();
  },

  clearSearch() {
    const input = document.getElementById('florSearchInput');
    if (input) input.value = '';
    this.onSearchInput('');
  },

  setColorFilter(color) {
    this.state.selectedColor = color;
    const colors = ['todas', 'blanco', 'amarillo', 'rojo', 'azul', 'multicolor'];
    colors.forEach(c => {
      const btn = document.getElementById(`filterColor_${c}`);
      if (!btn) return;
      if (c === color) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 text-white transition shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
      }
    });
    this.applyFilters();
  },

  setUsageFilter(usage) {
    this.state.selectedUsage = usage;
    const usages = ['todas', 'silvestre', 'jardín', 'aromática', 'selva', 'acuática'];
    usages.forEach(u => {
      const idKey = u === 'jardín' ? 'jardin' : (u === 'aromática' ? 'aromatica' : (u === 'acuática' ? 'acuatica' : u));
      const btn = document.getElementById(`filterUsage_${idKey}`);
      if (!btn) return;
      if (u === usage) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 text-white transition shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
      }
    });
    this.applyFilters();
  },

  setClimateFilter(climate) {
    this.state.selectedClimate = climate;
    const climas = ['todos', 'templado', 'tropical', 'mediterráneo', 'árido'];
    climas.forEach(c => {
      const idKey = c === 'mediterráneo' ? 'mediterraneo' : (c === 'árido' ? 'arido' : c);
      const btn = document.getElementById(`filterClim_${idKey}`);
      if (!btn) return;
      if (c === climate) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 text-white transition shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
      }
    });
    this.applyFilters();
  },

  setCategoryFilter(cat) {
    this.state.selectedCategory = cat;
    ['todas', 'orquideas', 'silvestres', 'acuaticas', 'arboles'].forEach(c => {
      const btn = document.getElementById(`filterCat_${c}`);
      if (!btn) return;
      if (c === cat) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 text-white transition shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
      }
    });

    if (cat === 'orquideas') this.state.selectedUsage = 'selva';
    else if (cat === 'silvestres') this.state.selectedUsage = 'silvestre';
    else if (cat === 'acuaticas') this.state.selectedUsage = 'acuática';
    else if (cat === 'arboles') this.state.selectedUsage = 'jardín';
    else this.state.selectedUsage = 'todas';

    this.applyFilters();
  },

  applyFilters() {
    let subset = [...this.state.pool];

    // 1. Color
    if (this.state.selectedColor && this.state.selectedColor !== 'todas') {
      const targetCol = this.state.selectedColor.toLowerCase();
      subset = subset.filter(f => (f.color || '').toLowerCase().includes(targetCol));
    }

    // 2. Uso / Entorno
    if (this.state.selectedUsage && this.state.selectedUsage !== 'todas') {
      const targetUse = this.state.selectedUsage.toLowerCase();
      subset = subset.filter(f => (f.usage || '').toLowerCase().includes(targetUse));
    }

    // 3. Clima
    if (this.state.selectedClimate && this.state.selectedClimate !== 'todos') {
      const targetClim = this.state.selectedClimate.toLowerCase();
      subset = subset.filter(f => (f.climate || '').toLowerCase().includes(targetClim));
    }

    // 4. Búsqueda por texto
    if (this.state.searchQuery && this.state.searchQuery.trim()) {
      const q = this.state.searchQuery.toLowerCase().trim();
      subset = subset.filter(f =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.sci_name || '').toLowerCase().includes(q) ||
        (f.family || '').toLowerCase().includes(q)
      );
    }

    this.state.candidatePool = subset.length >= 2 ? subset : (this.state.pool.length >= 2 ? [...this.state.pool] : subset);
    const maxVal = Math.min(64, Math.max(2, this.state.candidatePool.length));
    if (this.state.limit > maxVal) {
      this.state.limit = maxVal;
    }
    const slider = document.getElementById('limitSlider');
    if (slider) {
      slider.max = maxVal;
      if (parseInt(slider.value, 10) > maxVal) {
        this.onLimitChange(maxVal);
      }
    }
    const avail = document.getElementById('customizerAvailableCount');
    if (avail) {
      avail.textContent = `${subset.length} flores disponibles`;
    }

    const launchBtn = document.getElementById('btnLaunchCustomized');
    if (launchBtn) {
      launchBtn.disabled = subset.length < 2;
      launchBtn.classList.toggle('opacity-50', subset.length < 2);
      launchBtn.classList.toggle('cursor-not-allowed', subset.length < 2);
    }
  },

  onLimitChange(val) {
    const maxAllowed = Math.min(64, Math.max(2, this.state.candidatePool.length || 16));
    const num = Math.max(2, Math.min(maxAllowed, parseInt(val, 10) || 16));
    this.state.limit = num;
    const slider = document.getElementById('limitSlider');
    if (slider) {
      slider.max = maxAllowed;
      slider.value = num;
    }
    const countDisplay = document.getElementById('sliderCountDisplay');
    if (countDisplay) countDisplay.textContent = num;
    const estDisplay = document.getElementById('sliderDuelEst');
    if (estDisplay) {
      const est = Math.max(1, Math.round(num * Math.log2(num) * 0.82));
      estDisplay.textContent = `(~${est} duelos)`;
    }
    this.updateCustomizerButtons(num);
  },

  setLimitQuick(num) {
    this.onLimitChange(num);
  },

  updateCustomizerButtons(activeLimit) {
    [8, 16, 32, 64].forEach(n => {
      const btn = document.getElementById(`btnLimit${n}`);
      if (!btn) return;
      if (n === activeLimit) {
        btn.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700 text-white shadow-xs transition';
      } else {
        btn.className = 'px-3 py-1 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
      }
    });
  },

  updateCustomizerUI() {
    this.applyFilters();
    this.onLimitChange(this.state.limit || 16);
  },

  launchCustomizedGame() {
    this.startBattleGame();
  },

  goToView(viewId) {
    const views = ['viewHome', 'viewBattle', 'viewResults'];
    views.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== viewId);
    });
    const btnHome = document.getElementById('btnHeaderHome');
    if (btnHome) btnHome.classList.toggle('hidden', viewId === 'viewHome');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  preloadPoolImages(pool) {
    if (typeof Image === 'undefined') return;
    pool.forEach(item => {
      if (item && item.photo && !this.state.imageCache.has(item.photo)) {
        const img = new Image();
        img.src = item.photo;
        this.state.imageCache.add(item.photo);
      }
    });
  },

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  async startBattleGame(isChallenge = false) {
    let pool = [...this.state.candidatePool];
    if (pool.length < 2) pool = [...this.state.pool];
    if (pool.length < 2) return;

    if (!isChallenge) {
      this.shuffle(pool);
      const chosenLimit = Math.min(this.state.limit || 16, pool.length);
      pool = pool.slice(0, chosenLimit);
    }

    this.state.initialBattlePool = [...pool];
    this.state.battleStep = 0;
    this.state.choiceHistory = [];
    this.state.replayDecisions = [];
    this.state.pendingResolver = null;
    this.state.estimatedTotalSteps = Math.max(1, Math.round(pool.length * Math.log2(pool.length) * 0.82));

    const estWrap = document.getElementById('battleTotalEstWrap');
    if (estWrap) estWrap.textContent = `/~${this.state.estimatedTotalSteps}`;

    this.preloadPoolImages(pool);
    this.goToView('viewBattle');

    try {
      const sorted = await this.interleavedBisectSortAsync(pool, this.state.battleSeed);
      this.state.finalRanking = sorted;
      await this.renderResultsView();
    } catch (err) {
      if (err && err.message === 'UNDO_REQUESTED') return;
      console.error('Error durante el torneo de flores:', err);
    }
  },

  async runTournamentSortFromHistory() {
    this.state.battleStep = 0;
    const pool = [...this.state.initialBattlePool];
    try {
      const sorted = await this.interleavedBisectSortAsync(pool, this.state.battleSeed);
      this.state.finalRanking = sorted;
      await this.renderResultsView();
    } catch (err) {
      if (err && err.message === 'UNDO_REQUESTED') return;
      console.error('Error durante replay:', err);
    }
  },

  undoLastBattleChoice() {
    if (!this.state.choiceHistory || this.state.choiceHistory.length === 0) return;
    if (this.state.pendingResolver) {
      const reject = this.state.pendingResolver.reject;
      this.state.pendingResolver = null;
      reject(new Error('UNDO_REQUESTED'));
    }
    this.state.choiceHistory.pop();
    this.state.replayDecisions = [...this.state.choiceHistory];
    this.runTournamentSortFromHistory();
  },

  async interleavedBisectSortAsync(arr, seed = 1) {
    return interleavedBisectSortAsync(arr, (left, right) => this.askUserPreference(left, right), seed);
  },

  askUserPreference(leftItem, rightItem) {
    this.state.battleStep++;

    if (this.state.replayDecisions && this.state.replayDecisions.length > 0) {
      const recordedPick = this.state.replayDecisions.shift();
      return Promise.resolve(recordedPick);
    }

    this.state.currentLeft = leftItem;
    this.state.currentRight = rightItem;

    const done = this.state.battleStep - 1;
    const est = Math.max(this.state.battleStep, this.state.estimatedTotalSteps);
    const pct = Math.min(98, Math.round((done / est) * 100));

    document.getElementById('battleStepNum').textContent = this.state.battleStep;
    document.getElementById('battlePctText').textContent = `${pct}%`;
    document.getElementById('battleProgressBar').style.width = `${Math.max(4, pct)}%`;

    const undoBtn = document.getElementById('btnUndoBattleChoice');
    if (undoBtn) {
      const hasHistory = this.state.choiceHistory && this.state.choiceHistory.length > 0;
      undoBtn.classList.toggle('hidden', !hasHistory);
      undoBtn.classList.toggle('inline-flex', Boolean(hasHistory));
    }

    document.getElementById('loaderLeft')?.classList.remove('hidden');
    document.getElementById('loaderRight')?.classList.remove('hidden');

    const imgL = document.getElementById('imgLeft');
    imgL.alt = leftItem.name;
    imgL.src = leftItem.photo;
    const imgLBg = document.getElementById('imgLeftBg');
    if (imgLBg) imgLBg.src = leftItem.photo;
    document.getElementById('nameLeft').textContent = leftItem.name;
    document.getElementById('sciLeft').textContent = leftItem.sci_name;
    document.getElementById('tagLeft').textContent = `${leftItem.family} · ${leftItem.region}`;

    const imgR = document.getElementById('imgRight');
    imgR.alt = rightItem.name;
    imgR.src = rightItem.photo;
    const imgRBg = document.getElementById('imgRightBg');
    if (imgRBg) imgRBg.src = rightItem.photo;
    document.getElementById('nameRight').textContent = rightItem.name;
    document.getElementById('sciRight').textContent = rightItem.sci_name;
    document.getElementById('tagRight').textContent = `${rightItem.family} · ${rightItem.region}`;

    if (imgL && imgL.complete) this.onBattleImgLoad('left');
    if (imgR && imgR.complete) this.onBattleImgLoad('right');

    return new Promise((resolve, reject) => {
      this.state.pendingResolver = { resolve, reject };
    });
  },

  onBattleImgLoad(side) {
    const loader = document.getElementById(side === 'left' ? 'loaderLeft' : 'loaderRight');
    if (loader) loader.classList.add('hidden');
  },

  onBattleImgError(side) {
    const img = document.getElementById(side === 'left' ? 'imgLeft' : 'imgRight');
    const bg = document.getElementById(side === 'left' ? 'imgLeftBg' : 'imgRightBg');
    const loader = document.getElementById(side === 'left' ? 'loaderLeft' : 'loaderRight');
    if (loader) loader.classList.add('hidden');

    const item = side === 'left' ? this.state.currentLeft : this.state.currentRight;

    if (img && img.src && img.src.includes('static.inaturalist.org')) {
      const s3Url = img.src.replace('https://static.inaturalist.org/', 'https://inaturalist-open-data.s3.amazonaws.com/');
      img.src = s3Url;
      if (bg) bg.src = s3Url;
      if (item) item.photo = s3Url;
      return;
    }
    if (img && img.src !== FALLBACK_FLOWER_SVG) {
      img.src = FALLBACK_FLOWER_SVG;
      if (bg) bg.src = FALLBACK_FLOWER_SVG;
      if (item) item.photo = FALLBACK_FLOWER_SVG;
    }
  },

  onPodiumImgError(imgEl, item) {
    if (!imgEl) return;
    imgEl.onerror = null;
    if (imgEl.src && imgEl.src.includes('static.inaturalist.org')) {
      const s3Url = imgEl.src.replace('https://static.inaturalist.org/', 'https://inaturalist-open-data.s3.amazonaws.com/');
      imgEl.onerror = () => {
        imgEl.src = FALLBACK_FLOWER_SVG;
        if (item) item.photo = FALLBACK_FLOWER_SVG;
      };
      imgEl.src = s3Url;
      if (item) item.photo = s3Url;
      return;
    }
    imgEl.src = FALLBACK_FLOWER_SVG;
    if (item) item.photo = FALLBACK_FLOWER_SVG;
  },

  chooseCandidate(side) {
    if (!this.state.pendingResolver) return;
    if (!this.state.choiceHistory) this.state.choiceHistory = [];
    this.state.choiceHistory.push(side);
    const r = this.state.pendingResolver.resolve;
    this.state.pendingResolver = null;
    r(side);
  },

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const onBattle = !document.getElementById('viewBattle')?.classList.contains('hidden');
      if (!onBattle || !this.state.pendingResolver) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.chooseCandidate('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.chooseCandidate('right');
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.undoLastBattleChoice();
      }
    });
  },

  async renderResultsView() {
    this.goToView('viewResults');
    const ranking = this.state.finalRanking;
    const winner = ranking[0];
    const runnerUp = ranking[1];
    const third = ranking[2];

    this.state.top1FunFact = await this.resolveTop1FunFact(winner);

    const podBox = document.getElementById('podiumContainer');
    if (podBox && winner) {
      podBox.innerHTML = `
        <!-- 2ND PLACE -->
        <div class="p-4 sm:p-5 rounded-2xl border border-line bg-surface flex flex-col items-center text-center order-2 sm:order-1 relative">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mb-2">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>
            2° Puesto
          </span>
          <div class="relative h-28 sm:h-32 w-full rounded-xl overflow-hidden bg-stone-800 shadow-xs flex items-center justify-center">
            <img src="${runnerUp.photo}" alt="" aria-hidden="true" onerror="this.style.display='none'" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-xl opacity-65 brightness-75 pointer-events-none" />
            <img src="${runnerUp.photo}" alt="${runnerUp.name}" onerror="app.onPodiumImgError(this)" class="relative z-10 w-full h-full object-contain object-center" />
          </div>
          <h4 class="font-flora italic font-semibold text-2xl text-ink mt-2">${runnerUp.name}</h4>
          <span class="text-xs italic text-muted">${runnerUp.sci_name}</span>
          <span class="text-[10px] font-mono text-muted/75 mt-0.5">${runnerUp.family}</span>
        </div>

        <!-- 1ST PLACE -->
        <div class="p-5 sm:p-6 rounded-3xl border-2 border-emerald-700 bg-surface flex flex-col items-center text-center order-1 sm:order-2 relative shadow-md">
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 5.3 5.9.8-4.3 4.2 1 5.9L12 15.4l-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L12 2z"/></svg>
            Campeón Botánico
          </div>
          <div class="relative h-36 sm:h-44 w-full rounded-2xl overflow-hidden bg-stone-800 shadow-md mt-2 flex items-center justify-center">
            <img src="${winner.photo}" alt="" aria-hidden="true" onerror="this.style.display='none'" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-xl opacity-65 brightness-75 pointer-events-none" />
            <img src="${winner.photo}" alt="${winner.name}" onerror="app.onPodiumImgError(this)" class="relative z-10 w-full h-full object-contain object-center" />
          </div>
          <h4 class="font-flora italic font-semibold text-3xl text-ink mt-2">${winner.name}</h4>
          <span class="text-xs italic text-muted">${winner.sci_name} · ${winner.region}</span>
          <span class="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-emerald-700/10 text-emerald-800 dark:text-emerald-400 font-semibold">${winner.family}</span>
          ${this.state.top1FunFact ? `
            <div class="mt-3 pt-2.5 border-t border-line/80 text-left text-xs text-ink/90 leading-relaxed bg-canvas/60 rounded-xl p-2.5 w-full">
              <span class="font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider text-[10px] block mb-0.5">Dato botánico:</span>
              <span>${this.state.top1FunFact}</span>
            </div>
          ` : ""}
        </div>

        <!-- 3RD PLACE -->
        <div class="p-4 sm:p-5 rounded-2xl border border-line bg-surface flex flex-col items-center text-center order-3 relative">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-700/10 text-emerald-800 dark:text-emerald-400 mb-2">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12,3 20,19 4,19"/></svg>
            3° Puesto
          </span>
          <div class="relative h-28 sm:h-32 w-full rounded-xl overflow-hidden bg-stone-800 shadow-xs flex items-center justify-center">
            <img src="${third.photo}" alt="" aria-hidden="true" onerror="this.style.display='none'" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-xl opacity-65 brightness-75 pointer-events-none" />
            <img src="${third.photo}" alt="${third.name}" onerror="app.onPodiumImgError(this)" class="relative z-10 w-full h-full object-contain object-center" />
          </div>
          <h4 class="font-flora italic font-semibold text-2xl text-ink mt-2">${third.name}</h4>
          <span class="text-xs italic text-muted">${third.sci_name}</span>
          <span class="text-[10px] font-mono text-muted/75 mt-0.5">${third.family}</span>
        </div>
      `;
    }

    const restBox = document.getElementById('restRankingContainer');
    if (restBox) {
      const rest = ranking.slice(3);
      restBox.innerHTML = rest.map((p, idx) => `
        <div class="flex items-center justify-between p-3 sm:px-4 hover:bg-canvas/50 transition">
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs font-bold text-muted w-6">#${idx + 4}</span>
            <div class="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-800 shrink-0 flex items-center justify-center">
              <img src="${p.photo}" alt="" aria-hidden="true" onerror="this.style.display='none'" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-sm opacity-60 brightness-75 pointer-events-none" />
              <img src="${p.photo}" alt="${p.name}" onerror="app.onPodiumImgError(this)" class="relative z-10 w-full h-full object-contain object-center" />
            </div>
            <div>
              <span class="font-flora italic font-semibold text-base text-ink block">${p.name}</span>
              <span class="text-[11px] italic text-muted">${p.sci_name} · ${p.family}</span>
            </div>
          </div>
          <span class="text-xs text-muted font-mono">${p.region}</span>
        </div>
      `).join('');
    }

    const soundBanner = document.getElementById('winnerAudioPromptBanner');
    if (soundBanner && winner) {
      soundBanner.classList.remove('hidden');
      const soundBtnText = document.getElementById('winnerAudioBtnText');
      if (soundBtnText) soundBtnText.textContent = `Escuchar campanada de ${winner.name}`;
    }

    this.playBotanicalChimeFallback();
  },

  async shareChallenge() {
    const pool = this.state.initialBattlePool;
    if (!pool || pool.length === 0) return;
    const ids = pool.map(p => p.id);
    const challengeUrl = buildChallengeUrl({
      baseUrl: window.location.origin + window.location.pathname,
      ids,
      category: 'flores'
    });

    try {
      await navigator.clipboard.writeText(challengeUrl);
      const label = document.getElementById('shareBtnLabel');
      if (label) {
        label.textContent = '¡Link copiado!';
        setTimeout(() => { label.textContent = 'Copiar link de desafío'; }, 2500);
      }
    } catch {
      prompt('Copia este link de desafío:', challengeUrl);
    }
  },

  // ============================================================
  // EXPORT MODAL & CANVAS 2.0
  // ============================================================
  async openExportModal() {
    const modal = document.getElementById('exportModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    await this.renderExportCard();
  },

  closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.classList.add('hidden');
  },

  setExportFormat(fmt) {
    this.state.exportFormat = fmt === 'poster' ? 'poster' : 'story';
    const btnS = document.getElementById('formatBtnStory');
    const btnP = document.getElementById('formatBtnPoster');

    if (btnS && btnP) {
      if (this.state.exportFormat === 'story') {
        btnS.className = 'py-2 px-3 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 text-xs font-semibold text-ink text-center transition';
        btnP.className = 'py-2 px-3 rounded-xl border border-line bg-canvas text-xs font-medium text-muted hover:text-ink text-center transition';
      } else {
        btnP.className = 'py-2 px-3 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 text-xs font-semibold text-ink text-center transition';
        btnS.className = 'py-2 px-3 rounded-xl border border-line bg-canvas text-xs font-medium text-muted hover:text-ink text-center transition';
      }
    }

    this.renderExportCard();
  },

  async renderExportCard() {
    const canvas = document.getElementById('exportCardCanvas');
    const loader = document.getElementById('exportCanvasLoader');
    if (!canvas || !this.state.finalRanking || this.state.finalRanking.length === 0) return;

    if (loader) loader.classList.remove('hidden');
    canvas.classList.add('opacity-40');

    try {
      const winner = this.state.finalRanking[0];
      const top3 = this.state.finalRanking.slice(0, 3);
      await renderRankingCard({
        arena: 'flores',
        winner,
        top3,
        format: this.state.exportFormat,
        canvas
      });
    } catch (err) {
      console.error('Error renderizando tarjeta Canvas Flores:', err);
    } finally {
      if (loader) loader.classList.add('hidden');
      canvas.classList.remove('opacity-40');
    }
  },

  async downloadExportCardPng() {
    const canvas = document.getElementById('exportCardCanvas');
    if (!canvas) return;
    exportRankingCard({
      canvas,
      filename: `rankea2-flores-${Date.now()}.png`
    });
  },

  async downloadExportCard() {
    return this.downloadExportCardPng();
  },

  async copyExportCardImage() {
    const canvas = document.getElementById('exportCardCanvas');
    const status = document.getElementById('exportActionStatus');
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('No se pudo generar imagen');
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        if (status) {
          status.textContent = '¡Imagen copiada al portapapeles!';
          status.classList.remove('hidden');
          setTimeout(() => status.classList.add('hidden'), 2500);
        }
      });
    } catch {
      this.downloadExportCardPng();
    }
  },

  async copyExportCardToClipboard() {
    return this.copyExportCardImage();
  },

  async shareExportCard() {
    const canvas = document.getElementById('exportCardCanvas');
    if (!canvas) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.share && canvas.toBlob) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], 'ranking-flores.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Mi ranking botánico en Rankea2',
              text: '¡Mirá mi podio de flores en Rankea2!'
            });
            return;
          }
          this.downloadExportCardPng();
        });
      } else {
        this.downloadExportCardPng();
      }
    } catch {
      this.downloadExportCardPng();
    }
  }
};

if (typeof window !== 'undefined') {
  window.app = app;
  window.addEventListener('DOMContentLoaded', () => app.init());
}
export default app;
