import {
  createSeededRng,
  buildChallengeUrl,
  parseChallengeUrl,
  interleavedBisectSortAsync
} from '../core/tournament.js';
import { bindThemeButton } from '../core/theme.js';
import { renderRankingCard, exportRankingCard } from '../core/canvas.js';

const FALLBACK_MAMIFERO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="%2392400E" stroke-width="2"><circle cx="50" cy="58" r="18" fill="%23F5EFE6"/><ellipse cx="32" cy="36" rx="8" ry="12" fill="%2392400E"/><ellipse cx="68" cy="36" rx="8" ry="12" fill="%2392400E"/><ellipse cx="42" cy="24" rx="7" ry="10" fill="%2392400E"/><ellipse cx="58" cy="24" rx="7" ry="10" fill="%2392400E"/></svg>`;

const MAMIFEROS_CATALOG_FALLBACK = [
  { id: 1, name: "Jaguar", sci_name: "Panthera onca", family: "Felidae", region: "América", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/754622110/medium.jpg" },
  { id: 2, name: "Tigre de Bengala", sci_name: "Panthera tigris", family: "Felidae", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/13207883/medium.jpg" },
  { id: 3, name: "León Africano", sci_name: "Panthera leo", family: "Felidae", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/9225318/medium.jpg" },
  { id: 4, name: "Leopardo de las Nieves", sci_name: "Panthera uncia", family: "Felidae", region: "Asia Central", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/16308659/medium.jpg" },
  { id: 5, name: "Guepardo", sci_name: "Acinonyx jubatus", family: "Felidae", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/57582224/medium.jpg" },
  { id: 6, name: "Puma", sci_name: "Puma concolor", family: "Felidae", region: "América", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/9834553/medium.jpg" },
  { id: 7, name: "Lobo Gris", sci_name: "Canis lupus", family: "Canidae", region: "Holarctis", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/43410580/medium.jpg" },
  { id: 8, name: "Oso Polar", sci_name: "Ursus maritimus", family: "Ursidae", region: "Ártico", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/102785980/medium.jpg" },
  { id: 9, name: "Oso Pardo", sci_name: "Ursus arctos", family: "Ursidae", region: "Eurasia y Norteamérica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/1491897/medium.jpg" },
  { id: 10, name: "Panda Gigante", sci_name: "Ailuropoda melanoleuca", family: "Ursidae", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/150277588/medium.jpg" },
  { id: 11, name: "Elefante Africano", sci_name: "Loxodonta africana", family: "Elephantidae", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/93674728/medium.jpg" },
  { id: 12, name: "Rinoceronte Blanco", sci_name: "Ceratotherium simum", family: "Rhinocerotidae", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/57287523/medium.jpg" },
  { id: 13, name: "Jirafa", sci_name: "Giraffa camelopardalis", family: "Giraffidae", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/753693022/medium.jpg" },
  { id: 14, name: "Gorila de Montaña", sci_name: "Gorilla beringei", family: "Hominidae", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/109860139/medium.jpg" },
  { id: 15, name: "Zorro Rojo", sci_name: "Vulpes vulpes", family: "Canidae", region: "Hemisferio Norte", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/754793247/medium.jpg" },
  { id: 16, name: "Nutria Gigante", sci_name: "Pteronura brasiliensis", family: "Mustelidae", region: "Sudamérica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/227172098/medium.jpeg" }
];

const CURATED_FAUNA_FACTS = {
  "Panthera onca": "Mayor félido de América. Posee una mordida devastadora capaz de quebrar caparazones blindados de tortugas y cráneos directamente.",
  "Panthera tigris": "El félido más grande del mundo. Excelente nadador en ríos selváticos, con rayas pelaje únicas e irrepetibles por individuo.",
  "Panthera leo": "Único felino con estructura de manada social cooperativa. Su rugido territorial puede oírse a más de 8 kilómetros de distancia.",
  "Panthera uncia": "El fantasma de las cumbres nevadas. Su gruesa cola sirve de abrigo contra vientos árticos y timón en saltos verticales.",
  "Acinonyx jubatus": "El cazador terrestre más veloz. Alcanza 100 km/h en 3 segundos gracias a sus garras semi-retráctiles que actúan como clavos.",
  "Puma concolor": "Rey del sigilo con la mayor distribución en América. Capaz de realizar saltos horizontales de hasta 12 metros entre barrancos.",
  "Canis lupus": "Depredador de manada con una resistencia inagotable. Su olfato es unas 100 veces más agudo que el humano para rastrear presas.",
  "Ursus maritimus": "El carnívoro terrestre más grande. Su pelaje traslúcido y piel negra absorben la radiación en temperaturas polares extremas.",
  "Ursus arctos": "Mamífero de fuerza imponente capaz de superar los 50 km/h y almacenar hasta un tercio de su masa corporal antes de hibernar.",
  "Ailuropoda melanoleuca": "Especialista biológico con un 'falso pulgar' óseo adaptado para sostener y deshojar cañas de bambú hasta 14 horas diarias.",
  "Loxodonta africana": "El gigante terrestre supremo. Su trompa contiene más de 40.000 músculos y emite infrasonidos que viajan por el suelo.",
  "Ceratotherium simum": "Megafauna acorazada con cuerno de queratina maciza. A pesar de sus 2 toneladas, puede esprintar a 50 km/h en distancias cortas.",
  "Giraffa camelopardalis": "El mamífero más alto del planeta. Su corazón de 11 kg genera una presión circulatoria potente para irrigar el cerebro a 5 metros.",
  "Gorilla beringei": "El primate más poderoso. Los machos espalda plateada protegen a su grupo familiar con una fuerza unas 6 veces la humana.",
  "Vulpes vulpes": "Cánido ágil con oído ultrasónico capaz de detectar roedores bajo un metro de nieve antes de lanzarse en un salto en arco.",
  "Pteronura brasiliensis": "El carnívoro de agua dulce más largo del Amazonas. Caza en patrullas familiares organizadas capaces de hacer retroceder caimanes."
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
    selectedCategory: 'todos',
    selectedGroup: 'todos',
    selectedHabitat: 'todos',
    selectedRegion: 'todos',
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
      const res = await fetch('/data/mamiferos.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.state.pool = data;
      this.state.candidatePool = [...data];
    } catch (err) {
      console.warn('Usando catálogo fauna integrado como fallback:', err);
      this.state.pool = [...MAMIFEROS_CATALOG_FALLBACK];
      this.state.candidatePool = [...MAMIFEROS_CATALOG_FALLBACK];
    }
  },

  async resolveTop1FunFact(animal) {
    if (!animal) return "";
    if (CURATED_FAUNA_FACTS[animal.sci_name]) {
      return CURATED_FAUNA_FACTS[animal.sci_name];
    }
    try {
      const slug = encodeURIComponent(animal.sci_name.replace(/\s+/g, '_'));
      const res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${slug}`);
      if (!res.ok) return "";
      const data = await res.json();
      return data.extract ? data.extract.split('.')[0] + '.' : "";
    } catch {
      return "";
    }
  },

  playFaunaCallFallback() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.6);

      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.7);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.24, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + 0.02);
      osc.stop(ctx.currentTime + 0.85);
    } catch (e) {
      console.warn('Llamada de fauna no disponible:', e);
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
    if (presetKey === 'felinos') {
      subset = this.state.pool.filter(m => m.family === 'Felidae' || m.family === 'Hyaenidae');
    } else if (presetKey === 'megafauna') {
      subset = this.state.pool.filter(m => ['Elephantidae', 'Rhinocerotidae', 'Giraffidae', 'Ursidae', 'Bovidae', 'Hippopotamidae', 'Equidae', 'Cervidae', 'Tapiridae'].includes(m.family));
    } else if (presetKey === 'canidos') {
      subset = this.state.pool.filter(m => ['Canidae', 'Mustelidae', 'Hominidae'].includes(m.family));
    } else if (presetKey === 'acuaticos') {
      subset = this.state.pool.filter(m => m.habitat === 'Marino / Costero' || ['Delphinidae', 'Phocidae', 'Otariidae', 'Balaenopteridae', 'Trichechidae', 'Odobenidae', 'Monodontidae'].includes(m.family));
    } else if (presetKey === 'primates') {
      subset = this.state.pool.filter(m => m.group === 'Primates y Simios' || ['Hominidae', 'Cercopithecidae', 'Cebidae', 'Atelidae', 'Lemuridae'].includes(m.family));
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
  // CUSTOMIZER & FILTERS (GRUPOS, HÁBITAT, REGIÓN, BUSCADOR)
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
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !this.state.searchQuery);
    }
    this.applyFilters();
  },

  clearSearch() {
    const input = document.getElementById('mamiferoSearchInput');
    if (input) input.value = '';
    this.onSearchInput('');
  },

  setGroupFilter(group) {
    this.state.selectedGroup = group;
    const groups = ['todos', 'felinos', 'canidos', 'primates', 'marinos', 'ungulados', 'osos', 'roedores', 'murcielagos'];
    groups.forEach(g => {
      const btn = document.getElementById(`filterGroup_${g}`);
      if (!btn) return;
      if (g === group) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-800 text-white transition shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
      }
    });
    this.applyFilters();
  },

  setHabitatFilter(habitat) {
    this.state.selectedHabitat = habitat;
    const habs = ['todos', 'terrestre', 'marino', 'arbóreo', 'aéreo', 'polar'];
    habs.forEach(h => {
      const idKey = h === 'arbóreo' ? 'arboreo' : (h === 'aéreo' ? 'aereo' : h);
      const btn = document.getElementById(`filterHab_${idKey}`);
      if (!btn) return;
      if (h === habitat) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-800 text-white transition shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
      }
    });
    this.applyFilters();
  },

  setRegionFilter(region) {
    this.state.selectedRegion = region;
    const regs = ['todos', 'américa', 'áfrica', 'asia', 'europa', 'oceanía', 'polar'];
    regs.forEach(r => {
      const idKey = r === 'américa' ? 'america' : (r === 'áfrica' ? 'africa' : (r === 'oceanía' ? 'oceania' : r));
      const btn = document.getElementById(`filterReg_${idKey}`);
      if (!btn) return;
      if (r === region) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-800 text-white transition shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
      }
    });
    this.applyFilters();
  },

  setCategoryFilter(cat) {
    this.state.selectedCategory = cat;
    ['todos', 'felinos', 'megafauna', 'canidos', 'acuaticos'].forEach(c => {
      const btn = document.getElementById(`filterCat_${c}`);
      if (!btn) return;
      if (c === cat) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-800 text-white transition shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
      }
    });

    if (cat === 'felinos') this.state.selectedGroup = 'felinos';
    else if (cat === 'canidos') this.state.selectedGroup = 'canidos';
    else if (cat === 'acuaticos') this.state.selectedHabitat = 'marino';
    else if (cat === 'megafauna') this.state.selectedGroup = 'ungulados';
    else {
      this.state.selectedGroup = 'todos';
      this.state.selectedHabitat = 'todos';
    }
    this.applyFilters();
  },

  applyFilters() {
    let subset = [...this.state.pool];

    // 1. Grupo
    if (this.state.selectedGroup && this.state.selectedGroup !== 'todos') {
      const g = this.state.selectedGroup;
      if (g === 'felinos') subset = subset.filter(m => m.family === 'Felidae' || m.family === 'Hyaenidae');
      else if (g === 'canidos') subset = subset.filter(m => m.family === 'Canidae' || m.family === 'Mustelidae');
      else if (g === 'primates') subset = subset.filter(m => m.group === 'Primates y Simios' || ['Hominidae', 'Cercopithecidae', 'Cebidae', 'Atelidae', 'Lemuridae'].includes(m.family));
      else if (g === 'marinos') subset = subset.filter(m => m.habitat === 'Marino / Costero');
      else if (g === 'ungulados') subset = subset.filter(m => m.group === 'Herbívoros y Ungulados' || ['Elephantidae', 'Rhinocerotidae', 'Giraffidae', 'Bovidae', 'Cervidae', 'Equidae'].includes(m.family));
      else if (g === 'osos') subset = subset.filter(m => m.family === 'Ursidae');
      else if (g === 'roedores') subset = subset.filter(m => m.group === 'Roedores' || m.group === 'Conejos y Liebres');
      else if (g === 'murcielagos') subset = subset.filter(m => m.group === 'Murciélagos');
    }

    // 2. Hábitat
    if (this.state.selectedHabitat && this.state.selectedHabitat !== 'todos') {
      const targetHab = this.state.selectedHabitat.toLowerCase();
      subset = subset.filter(m => (m.habitat || '').toLowerCase().includes(targetHab));
    }

    // 3. Región
    if (this.state.selectedRegion && this.state.selectedRegion !== 'todos') {
      const targetReg = this.state.selectedRegion.toLowerCase();
      subset = subset.filter(m => (m.region || '').toLowerCase().includes(targetReg));
    }

    // 4. Búsqueda por texto
    if (this.state.searchQuery && this.state.searchQuery.trim()) {
      const q = this.state.searchQuery.toLowerCase().trim();
      subset = subset.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.sci_name || '').toLowerCase().includes(q) ||
        (m.family || '').toLowerCase().includes(q)
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
      avail.textContent = `${subset.length} animales disponibles`;
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
        btn.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-amber-800 text-white shadow-xs transition';
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
      console.error('Error durante el torneo de mamíferos:', err);
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
    if (img && img.src !== FALLBACK_MAMIFERO_SVG) {
      img.src = FALLBACK_MAMIFERO_SVG;
      if (bg) bg.src = FALLBACK_MAMIFERO_SVG;
      if (item) item.photo = FALLBACK_MAMIFERO_SVG;
    }
  },

  onPodiumImgError(imgEl, item) {
    if (!imgEl) return;
    imgEl.onerror = null;
    if (imgEl.src && imgEl.src.includes('static.inaturalist.org')) {
      const s3Url = imgEl.src.replace('https://static.inaturalist.org/', 'https://inaturalist-open-data.s3.amazonaws.com/');
      imgEl.onerror = () => {
        imgEl.src = FALLBACK_MAMIFERO_SVG;
        if (item) item.photo = FALLBACK_MAMIFERO_SVG;
      };
      imgEl.src = s3Url;
      if (item) item.photo = s3Url;
      return;
    }
    imgEl.src = FALLBACK_MAMIFERO_SVG;
    if (item) item.photo = FALLBACK_MAMIFERO_SVG;
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
          <h4 class="font-serif text-2xl text-ink mt-2">${runnerUp.name}</h4>
          <span class="text-xs italic text-muted">${runnerUp.sci_name}</span>
          <span class="text-[10px] font-mono text-muted/75 mt-0.5">${runnerUp.family}</span>
        </div>

        <!-- 1ST PLACE -->
        <div class="p-5 sm:p-6 rounded-3xl border-2 border-amber-800 bg-surface flex flex-col items-center text-center order-1 sm:order-2 relative shadow-md">
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 5.3 5.9.8-4.3 4.2 1 5.9L12 15.4l-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L12 2z"/></svg>
            Líder de la Manada
          </div>
          <div class="relative h-36 sm:h-44 w-full rounded-2xl overflow-hidden bg-stone-800 shadow-md mt-2 flex items-center justify-center">
            <img src="${winner.photo}" alt="" aria-hidden="true" onerror="this.style.display='none'" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-xl opacity-65 brightness-75 pointer-events-none" />
            <img src="${winner.photo}" alt="${winner.name}" onerror="app.onPodiumImgError(this)" class="relative z-10 w-full h-full object-contain object-center" />
          </div>
          <h4 class="font-serif text-3xl text-ink mt-2">${winner.name}</h4>
          <span class="text-xs italic text-muted">${winner.sci_name} · ${winner.region}</span>
          <span class="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-800/10 text-amber-800 dark:text-amber-400 font-semibold">${winner.family}</span>
          ${this.state.top1FunFact ? `
            <div class="mt-3 pt-2.5 border-t border-line/80 text-left text-xs text-ink/90 leading-relaxed bg-canvas/60 rounded-xl p-2.5 w-full">
              <span class="font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider text-[10px] block mb-0.5">Ficha salvaje:</span>
              <span>${this.state.top1FunFact}</span>
            </div>
          ` : ""}
        </div>

        <!-- 3RD PLACE -->
        <div class="p-4 sm:p-5 rounded-2xl border border-line bg-surface flex flex-col items-center text-center order-3 relative">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-800/10 text-amber-800 dark:text-amber-400 mb-2">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12,3 20,19 4,19"/></svg>
            3° Puesto
          </span>
          <div class="relative h-28 sm:h-32 w-full rounded-xl overflow-hidden bg-stone-800 shadow-xs flex items-center justify-center">
            <img src="${third.photo}" alt="" aria-hidden="true" onerror="this.style.display='none'" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-xl opacity-65 brightness-75 pointer-events-none" />
            <img src="${third.photo}" alt="${third.name}" onerror="app.onPodiumImgError(this)" class="relative z-10 w-full h-full object-contain object-center" />
          </div>
          <h4 class="font-serif text-2xl text-ink mt-2">${third.name}</h4>
          <span class="text-xs italic text-muted">${third.sci_name}</span>
          <span class="text-[10px] font-mono text-muted/75 mt-0.5">${third.family}</span>
        </div>
      `;
    }

    const restBox = document.getElementById('restRankingContainer');
    if (restBox) {
      const rest = ranking.slice(3);
      restBox.innerHTML = rest.map((m, idx) => `
        <div class="flex items-center justify-between p-3 sm:px-4 hover:bg-canvas/50 transition">
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs font-bold text-muted w-6">#${idx + 4}</span>
            <div class="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-800 shrink-0 flex items-center justify-center">
              <img src="${m.photo}" alt="" aria-hidden="true" onerror="this.style.display='none'" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-sm opacity-60 brightness-75 pointer-events-none" />
              <img src="${m.photo}" alt="${m.name}" onerror="app.onPodiumImgError(this)" class="relative z-10 w-full h-full object-contain object-center" />
            </div>
            <div>
              <span class="font-serif text-base text-ink block">${m.name}</span>
              <span class="text-[11px] italic text-muted">${m.sci_name} · ${m.family}</span>
            </div>
          </div>
          <span class="text-xs text-muted font-mono">${m.region}</span>
        </div>
      `).join('');
    }

    const soundBanner = document.getElementById('winnerAudioPromptBanner');
    if (soundBanner && winner) {
      soundBanner.classList.remove('hidden');
      const soundBtnText = document.getElementById('winnerAudioBtnText');
      if (soundBtnText) soundBtnText.textContent = `Escuchar rugido de ${winner.name}`;
    }

    this.playFaunaCallFallback();
  },

  async shareChallenge() {
    const pool = this.state.initialBattlePool;
    if (!pool || pool.length === 0) return;
    const ids = pool.map(m => m.id);
    const challengeUrl = buildChallengeUrl({
      baseUrl: window.location.origin + window.location.pathname,
      ids,
      category: 'mamiferos'
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
        btnS.className = 'py-2 px-3 rounded-xl border-2 border-amber-800 bg-amber-800/10 text-xs font-semibold text-ink text-center transition';
        btnP.className = 'py-2 px-3 rounded-xl border border-line bg-canvas text-xs font-medium text-muted hover:text-ink text-center transition';
      } else {
        btnP.className = 'py-2 px-3 rounded-xl border-2 border-amber-800 bg-amber-800/10 text-xs font-semibold text-ink text-center transition';
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
        arena: 'mamiferos',
        winner,
        top3,
        format: this.state.exportFormat,
        canvas
      });
    } catch (err) {
      console.error('Error renderizando tarjeta Canvas Mamíferos:', err);
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
      filename: `rankea2-mamiferos-${Date.now()}.png`
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
          const file = new File([blob], 'ranking-mamiferos.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Mi ranking de fauna en Rankea2',
              text: '¡Mirá mi manada campeona en Rankea2!'
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
