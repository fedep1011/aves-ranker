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
  { id: 41970, name: "Jaguar", sci_name: "Panthera onca", family: "Felidae", group: "Felinos", habitat: "Terrestre", region: "América", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/754771503/medium.jpg" },
  { id: 41968, name: "Tigre", sci_name: "Panthera tigris", family: "Felidae", group: "Felinos", habitat: "Terrestre", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/13207883/medium.jpg" },
  { id: 41967, name: "León", sci_name: "Panthera leo", family: "Felidae", group: "Felinos", habitat: "Terrestre", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/9225318/medium.jpg" },
  { id: 41971, name: "Leopardo de las nieves", sci_name: "Panthera uncia", family: "Felidae", group: "Felinos", habitat: "Terrestre", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/16308659/medium.jpg" },
  { id: 41962, name: "Guepardo", sci_name: "Acinonyx jubatus", family: "Felidae", group: "Felinos", habitat: "Terrestre", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/57582224/medium.jpg" },
  { id: 42007, name: "Puma", sci_name: "Puma concolor", family: "Felidae", group: "Felinos", habitat: "Terrestre", region: "América", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/9834553/medium.jpg" },
  { id: 42048, name: "Lobo gris", sci_name: "Canis lupus", family: "Canidae", group: "Cánidos y Zorros", habitat: "Terrestre", region: "Europa", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/43410580/medium.jpg" },
  { id: 41638, name: "Oso Polar", sci_name: "Ursus maritimus", family: "Ursidae", group: "Osos", habitat: "Polar / Glaciar", region: "Polar", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/102785980/medium.jpg" },
  { id: 41639, name: "Oso Pardo", sci_name: "Ursus arctos", family: "Ursidae", group: "Osos", habitat: "Terrestre", region: "Eurasia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/1491897/medium.jpg" },
  { id: 41641, name: "Panda gigante", sci_name: "Ailuropoda melanoleuca", family: "Ursidae", group: "Osos", habitat: "Arbóreo / Selva", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/150277588/medium.jpg" },
  { id: 43694, name: "Elefante africano de sabana", sci_name: "Loxodonta africana", family: "Elephantidae", group: "Herbívoros y Ungulados", habitat: "Terrestre", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/93674728/medium.jpg" },
  { id: 43338, name: "Rinoceronte Blanco", sci_name: "Ceratotherium simum", family: "Rhinocerotidae", group: "Herbívoros y Ungulados", habitat: "Terrestre", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/57287523/medium.jpg" },
  { id: 42172, name: "Jirafa del Sur", sci_name: "Giraffa giraffa", family: "Giraffidae", group: "Herbívoros y Ungulados", habitat: "Terrestre", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/753693022/medium.jpg" },
  { id: 43584, name: "Gorila oriental", sci_name: "Gorilla beringei", family: "Hominidae", group: "Primates y Simios", habitat: "Arbóreo / Selva", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/109860139/medium.jpg" },
  { id: 42069, name: "Zorro Rojo", sci_name: "Vulpes vulpes", family: "Canidae", group: "Cánidos y Zorros", habitat: "Terrestre", region: "Europa", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/754793247/medium.jpg" },
  { id: 41783, name: "Tenrec Nutria Gigante", sci_name: "Potamogale velox", family: "Potamogalidae", group: "Cetáceos y Marinos", habitat: "Marino / Costero", region: "África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/227172098/medium.jpeg" }
];

const CATALOG_DATA = {
  places: [
    { id: "uruguay", label: "Uruguay" },
    { id: "argentina", label: "Argentina" },
    { id: "brasil", label: "Brasil" },
    { id: "chile", label: "Chile" },
    { id: "perú", label: "Perú" },
    { id: "colombia", label: "Colombia" },
    { id: "ecuador", label: "Ecuador" },
    { id: "paraguay", label: "Paraguay" },
    { id: "bolivia", label: "Bolivia" },
    { id: "méxico", label: "México" },
    { id: "latinoamérica", label: "Toda Latinoamérica" },
    { id: "sudamérica", label: "Sudamérica" },
    { id: "estados unidos", label: "Estados Unidos" },
    { id: "españa", label: "España" },
    { id: "europa", label: "Europa" },
    { id: "china", label: "China" },
    { id: "japón", label: "Japón" },
    { id: "india", label: "India" },
    { id: "asia", label: "Asia" },
    { id: "áfrica", label: "África" },
    { id: "australia", label: "Australia" },
    { id: "nueva zelanda", label: "Nueva Zelanda" },
    { id: "polar", label: "Región Polar" }
  ],

  groups: [
    { key: "felinos", title: "Grandes Felinos", desc: "Jaguares, leones, tigres, pumas y guepardos" },
    { key: "canidos", title: "Cánidos y Zorros", desc: "Lobos grises, zorros rojos, dingos y coyotes" },
    { key: "primates", title: "Primates y Simios", desc: "Gorilas, chimpancés, orangutanes y lémures" },
    { key: "marinos", title: "Cetáceos y Marinos", desc: "Ballenas, delfines, orcas, focas y nutrias" },
    { key: "ungulados", title: "Herbívoros y Ungulados", desc: "Elefantes, rinocerontes, jirafas, ciervos y cebras" },
    { key: "osos", title: "Osos", desc: "Osos polares, osos pardos y pandas gigantes" },
    { key: "roedores", title: "Roedores y Conejos", desc: "Capibaras, castores, ardillas y liebres" },
    { key: "murcielagos", title: "Murciélagos", desc: "Quirópteros y mamíferos voladores del mundo" }
  ],

  habitats: [
    { key: "terrestre", label: "Terrestres" },
    { key: "marino", label: "Acuáticos y Marinos" },
    { key: "arbóreo", label: "Arbóreos y Selva" },
    { key: "aéreo", label: "Aéreos" },
    { key: "polar", label: "Polares y Glaciares" }
  ]
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
    places: new Map(),
    groups: new Set(),
    habitats: new Set(),
    keyword: "",
    samplingMode: "popular",
    limit: 16,
    totalFound: 0,
    selectedCategory: "todos",
    exportFormat: "story",
    placeSearchTimer: null
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
      this.state.totalFound = data.length;
    } catch (err) {
      console.warn('Usando catálogo fauna integrado como fallback:', err);
      this.state.pool = [...MAMIFEROS_CATALOG_FALLBACK];
      this.state.candidatePool = [...MAMIFEROS_CATALOG_FALLBACK];
      this.state.totalFound = MAMIFEROS_CATALOG_FALLBACK.length;
    }
  },

  // ============================================================
  // WIZARD DE 3 PASOS (LUGAR, TIPO/HÁBITAT, CONFIRMAR)
  // ============================================================
  quickStartWorldTop() {
    this.state.candidatePool = this.state.pool.slice(0, 16);
    this.state.limit = 16;
    this.startBattleGame();
  },

  launchSurpriseMe() {
    const list = [...this.state.pool];
    this.shuffle(list);
    this.state.candidatePool = list.slice(0, 16);
    this.state.limit = 16;
    this.startBattleGame();
  },

  launchRandomGame() {
    this.launchSurpriseMe();
  },

  startGuidedSetup() {
    this.renderStep1Places();
    this.goToView('viewStepPlace');
  },

  // PASO 1: LUGAR
  renderStep1Places() {
    const wrap = document.getElementById('selectedPlacesWrap');
    const chips = document.getElementById('selectedPlacesChips');
    const grid = document.getElementById('placesGrid');
    const btnAll = document.getElementById('btnWorldAll');

    const hasPlaces = this.state.places.size > 0;
    if (btnAll) {
      btnAll.className = !hasPlaces
        ? 'px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition bg-amber-800 text-white'
        : 'px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition bg-canvas text-ink border border-line hover:border-ink/40';
    }

    if (wrap && chips) {
      wrap.classList.toggle('hidden', !hasPlaces);
      chips.innerHTML = '';
      this.state.places.forEach((lbl, id) => {
        const chip = document.createElement('span');
        chip.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-800 text-white shadow-xs';
        chip.innerHTML = `<span>${lbl}</span><button type="button" class="text-white/80 hover:text-white" aria-label="Quitar">×</button>`;
        chip.querySelector('button').onclick = () => {
          this.state.places.delete(id);
          this.renderStep1Places();
        };
        chips.appendChild(chip);
      });
    }

    if (grid) {
      grid.innerHTML = '';
      CATALOG_DATA.places.forEach(p => {
        const active = this.state.places.has(p.id);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => this.togglePlace(p.id, p.label);
        btn.className = active
          ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-800 text-white transition shadow-xs'
          : 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
        btn.textContent = p.label;
        grid.appendChild(btn);
      });
    }
  },

  togglePlace(id, label) {
    if (this.state.places.has(id)) {
      this.state.places.delete(id);
    } else {
      this.state.places.set(id, label);
    }
    this.renderStep1Places();
  },

  clearPlaces() {
    this.state.places.clear();
    this.renderStep1Places();
  },

  onPlaceSearch(query) {
    clearTimeout(this.state.placeSearchTimer);
    const drop = document.getElementById('placeDropdown');
    if (!drop) return;
    if (!query || query.trim().length < 2) {
      drop.classList.add('hidden');
      return;
    }
    const q = query.trim().toLowerCase();
    this.state.placeSearchTimer = setTimeout(() => {
      const matches = CATALOG_DATA.places.filter(p => p.label.toLowerCase().includes(q));
      drop.innerHTML = '';
      if (matches.length === 0) {
        drop.classList.add('hidden');
        return;
      }
      matches.forEach(item => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-amber-900/10 flex items-center justify-between';
        b.innerHTML = `<span>${item.label}</span><span class="text-amber-800 font-medium">+</span>`;
        b.onclick = () => {
          this.state.places.set(item.id, item.label);
          const inp = document.getElementById('placeSearchInput');
          if (inp) inp.value = '';
          drop.classList.add('hidden');
          this.renderStep1Places();
        };
        drop.appendChild(b);
      });
      drop.classList.remove('hidden');
    }, 150);
  },

  goToStep2() {
    this.renderStep2Traits();
    this.goToView('viewStepTraits');
  },

  // PASO 2: TIPO Y CATEGORÍA
  renderStep2Traits() {
    const kwTrim = this.state.keyword.trim();
    const hasKw = kwTrim.length > 0;
    const activeFilterCount = this.state.groups.size + this.state.habitats.size + (hasKw ? 1 : 0);
    const hasAny = activeFilterCount > 0;

    const btnAll = document.getElementById('btnTraitsAll');
    if (btnAll) {
      btnAll.className = !hasAny
        ? 'px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition bg-amber-800 text-white'
        : 'px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition bg-canvas text-ink border border-line hover:border-ink/40';
    }

    const hint = document.getElementById('traitsSummaryHint');
    if (hint) {
      hint.textContent = hasAny
        ? `${activeFilterCount} filtros activos${hasKw ? ` ("${kwTrim}")` : ''}`
        : 'Todas las familias incluidas';
    }

    const kwChip = document.getElementById('activeKeywordChip');
    const kwChipText = document.getElementById('activeKeywordChipText');
    const kwInp = document.getElementById('keywordInput');
    if (kwChip && kwChipText && kwInp) {
      if (hasKw) {
        kwChipText.textContent = `Filtro: "${kwTrim}"`;
        kwChip.classList.remove('hidden');
        kwChip.classList.add('inline-flex');
        kwInp.className = 'w-full rounded-xl bg-amber-900/10 border-2 border-amber-800 px-4 py-2 text-sm text-ink focus:outline-hidden';
      } else {
        kwChip.classList.add('hidden');
        kwChip.classList.remove('inline-flex');
        kwInp.className = 'w-full sm:w-80 rounded-full bg-canvas border border-line px-3.5 py-2 text-xs sm:text-sm text-ink placeholder:text-muted focus:outline-hidden focus:border-amber-800 transition';
      }
    }

    const gGrid = document.getElementById('groupsGrid');
    if (gGrid) {
      gGrid.innerHTML = '';
      CATALOG_DATA.groups.forEach(g => {
        const active = this.state.groups.has(g.key);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => {
          if (this.state.groups.has(g.key)) this.state.groups.delete(g.key);
          else this.state.groups.add(g.key);
          this.renderStep2Traits();
        };
        btn.className = active
          ? 'p-3 rounded-xl border-2 border-amber-800 bg-amber-900/10 text-left transition'
          : 'p-3 rounded-xl border border-line bg-canvas/50 hover:border-ink/40 text-left transition';
        btn.innerHTML = `
          <div class="text-xs sm:text-sm font-medium text-ink">${g.title}</div>
          <div class="text-[11px] text-muted mt-0.5">${g.desc}</div>
        `;
        gGrid.appendChild(btn);
      });
    }

    const hGrid = document.getElementById('habitatsGrid');
    if (hGrid) {
      hGrid.innerHTML = '';
      CATALOG_DATA.habitats.forEach(h => {
        const active = this.state.habitats.has(h.key);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => {
          if (this.state.habitats.has(h.key)) this.state.habitats.delete(h.key);
          else this.state.habitats.add(h.key);
          this.renderStep2Traits();
        };
        btn.className = active
          ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-800 text-white transition shadow-xs'
          : 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
        btn.textContent = h.label;
        hGrid.appendChild(btn);
      });
    }
  },

  clearTraits() {
    this.state.groups.clear();
    this.state.habitats.clear();
    this.state.keyword = '';
    const inp = document.getElementById('keywordInput');
    if (inp) inp.value = '';
    this.renderStep2Traits();
  },

  clearKeywordOnly() {
    this.state.keyword = '';
    const inp = document.getElementById('keywordInput');
    if (inp) inp.value = '';
    this.renderStep2Traits();
  },

  randomizeTraitsStep() {
    this.state.groups.clear();
    this.state.habitats.clear();
    const gKeys = CATALOG_DATA.groups.map(g => g.key);
    const chosen = gKeys[Math.floor(Math.random() * gKeys.length)];
    this.state.groups.add(chosen);
    this.renderStep2Traits();
  },

  onKeywordChange(val) {
    this.state.keyword = val || '';
    this.renderStep2Traits();
  },

  goToStep3() {
    this.filterPool();
    this.renderStep3Size();
    this.goToView('viewStepSize');
  },

  filterPool() {
    let subset = [...this.state.pool];

    // Lugar
    if (this.state.places.size > 0) {
      const placeKeys = Array.from(this.state.places.keys());
      const hasLatam = placeKeys.includes('latinoamérica') || placeKeys.includes('sudamérica');
      subset = subset.filter(m => {
        const reg = (m.region || '').toLowerCase();
        if (hasLatam && (reg.includes('américa') || reg.includes('sudamérica'))) return true;
        return placeKeys.some(p => reg.includes(p));
      });
    }

    // Grupos
    if (this.state.groups.size > 0) {
      subset = subset.filter(m => {
        for (const g of this.state.groups) {
          if (g === 'felinos' && m.family === 'Felidae') return true;
          if (g === 'canidos' && m.family === 'Canidae') return true;
          if (g === 'primates' && (m.group === 'Primates y Simios' || ['Hominidae', 'Cercopithecidae', 'Cebidae'].includes(m.family))) return true;
          if (g === 'marinos' && (m.habitat === 'Marino / Costero' || ['Delphinidae', 'Phocidae', 'Otariidae', 'Balaenopteridae'].includes(m.family))) return true;
          if (g === 'ungulados' && (m.group === 'Herbívoros y Ungulados' || ['Elephantidae', 'Rhinocerotidae', 'Giraffidae', 'Bovidae', 'Cervidae'].includes(m.family))) return true;
          if (g === 'osos' && m.family === 'Ursidae') return true;
          if (g === 'roedores' && (m.group === 'Roedores' || m.group === 'Conejos y Liebres')) return true;
          if (g === 'murcielagos' && m.group === 'Murciélagos') return true;
        }
        return false;
      });
    }

    // Hábitats
    if (this.state.habitats.size > 0) {
      subset = subset.filter(m => {
        const hab = (m.habitat || '').toLowerCase();
        for (const h of this.state.habitats) {
          if (hab.includes(h.toLowerCase())) return true;
        }
        return false;
      });
    }

    // Buscador
    if (this.state.keyword.trim()) {
      const q = this.state.keyword.trim().toLowerCase();
      subset = subset.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.sci_name || '').toLowerCase().includes(q) ||
        (m.family || '').toLowerCase().includes(q)
      );
    }

    this.state.candidatePool = subset.length >= 2 ? subset : (this.state.pool.length >= 2 ? [...this.state.pool] : subset);
    this.state.totalFound = subset.length;
  },

  // PASO 3: CONFIRMAR PARTIDA
  renderStep3Size() {
    const total = this.state.totalFound;
    const totalEl = document.getElementById('step3TotalFound');
    if (totalEl) totalEl.textContent = total;

    const summaryEl = document.getElementById('step3FilterSummary');
    if (summaryEl) {
      const parts = [];
      if (this.state.places.size > 0) parts.push(Array.from(this.state.places.values()).join(', '));
      else parts.push('Todo el mundo');
      if (this.state.groups.size > 0) {
        const gNames = Array.from(this.state.groups).map(k => CATALOG_DATA.groups.find(g => g.key === k)?.title).filter(Boolean);
        parts.push(gNames.join(', '));
      }
      if (this.state.keyword.trim()) parts.push(`"${this.state.keyword.trim()}"`);
      summaryEl.textContent = parts.join(' · ');
    }

    const mini = document.getElementById('step3MiniPhotos');
    if (mini) {
      mini.innerHTML = '';
      this.state.candidatePool.slice(0, 5).forEach(m => {
        const img = document.createElement('img');
        img.src = m.photo;
        img.alt = m.name;
        img.className = 'w-8 h-8 rounded-full border-2 border-surface object-cover';
        mini.appendChild(img);
      });
    }

    const warn = document.getElementById('noAnimalsWarning');
    const launchBtn = document.getElementById('btnLaunchGame');
    if (warn && launchBtn) {
      const hasFew = total < 2;
      warn.classList.toggle('hidden', !hasFew);
      launchBtn.disabled = hasFew;
      launchBtn.classList.toggle('opacity-50', hasFew);
    }

    this.onLimitChange(this.state.limit || 16);
  },

  setSamplingMode(mode) {
    this.state.samplingMode = mode;
    const btnPop = document.getElementById('btnSamplePopular');
    const btnRnd = document.getElementById('btnSampleRandom');
    if (btnPop && btnRnd) {
      if (mode === 'popular') {
        btnPop.className = 'p-3 rounded-xl border-2 border-amber-800 bg-amber-900/10 text-left transition';
        btnRnd.className = 'p-3 rounded-xl border border-line bg-canvas/50 hover:border-ink/40 text-left transition';
      } else {
        btnRnd.className = 'p-3 rounded-xl border-2 border-amber-800 bg-amber-900/10 text-left transition';
        btnPop.className = 'p-3 rounded-xl border border-line bg-canvas/50 hover:border-ink/40 text-left transition';
      }
    }
  },

  onLimitChange(val) {
    let num;
    const maxVal = Math.min(64, Math.max(2, this.state.candidatePool.length || 16));
    if (val === 'MAX') num = maxVal;
    else num = Math.max(2, Math.min(maxVal, parseInt(val, 10) || 16));

    this.state.limit = num;
    const slider = document.getElementById('limitSlider');
    if (slider) {
      slider.max = maxVal;
      slider.value = num;
    }
    const valDisplay = document.getElementById('limitValueDisplay');
    if (valDisplay) valDisplay.textContent = num;

    const estDisplay = document.getElementById('effortClicksBigNumber');
    if (estDisplay) {
      const est = Math.max(1, Math.round(num * Math.log2(num) * 0.82));
      estDisplay.textContent = est;
    }
  },

  // PRESETS
  launchPreset(presetKey) {
    let subset = [...this.state.pool];
    if (presetKey === 'felinos') {
      subset = this.state.pool.filter(m => m.family === 'Felidae' || m.family === 'Hyaenidae');
    } else if (presetKey === 'megafauna') {
      subset = this.state.pool.filter(m => ['Elephantidae', 'Rhinocerotidae', 'Giraffidae', 'Ursidae', 'Bovidae', 'Hippopotamidae'].includes(m.family));
    } else if (presetKey === 'canidos') {
      subset = this.state.pool.filter(m => ['Canidae', 'Mustelidae', 'Hominidae'].includes(m.family));
    } else if (presetKey === 'acuaticos') {
      subset = this.state.pool.filter(m => m.habitat === 'Marino / Costero' || ['Delphinidae', 'Phocidae', 'Otariidae', 'Balaenopteridae'].includes(m.family));
    } else if (presetKey === 'primates') {
      subset = this.state.pool.filter(m => m.group === 'Primates y Simios' || ['Hominidae', 'Cercopithecidae', 'Cebidae', 'Atelidae', 'Lemuridae'].includes(m.family));
    }
    if (subset.length < 2) subset = [...this.state.pool];
    this.state.candidatePool = subset;
    this.state.limit = Math.min(16, subset.length);
    this.startBattleGame();
  },

  setCategoryFilter(cat) {
    this.launchPreset(cat);
  },

  // ============================================================
  // BATALLA & DUELOS
  // ============================================================
  startBattleGame(isChallenge = false) {
    let candidates = [...this.state.candidatePool];
    if (!isChallenge) {
      if (this.state.samplingMode === 'random') {
        this.shuffle(candidates);
      }
      candidates = candidates.slice(0, this.state.limit);
    }

    if (candidates.length < 2) return;

    this.state.initialBattlePool = [...candidates];
    this.state.battleStep = 0;
    this.state.choiceHistory = [];
    this.state.replayDecisions = [];
    this.state.estimatedTotalSteps = Math.max(1, Math.round(candidates.length * Math.log2(candidates.length) * 0.82));
    this.state.battleSeed = Math.floor(Math.random() * 1000000);

    const undoBtn = document.getElementById('btnUndoBattleChoice');
    if (undoBtn) undoBtn.disabled = true;

    this.goToView('viewBattle');
    this.runTournament(candidates);
  },

  async runTournament(candidates) {
    const compareFn = async (left, right) => {
      if (this.state.replayDecisions.length > 0) {
        const nextDecision = this.state.replayDecisions.shift();
        this.state.battleStep++;
        this.updateBattleProgress();
        return nextDecision;
      }

      this.state.currentLeft = left;
      this.state.currentRight = right;
      this.state.battleStep++;
      this.updateBattleProgress();
      this.renderBattleCard('Left', left);
      this.renderBattleCard('Right', right);

      return new Promise(resolve => {
        this.state.pendingResolver = choice => {
          this.state.pendingResolver = null;
          this.state.choiceHistory.push(choice);
          const undoBtn = document.getElementById('btnUndoBattleChoice');
          if (undoBtn) undoBtn.disabled = this.state.choiceHistory.length === 0;
          resolve(choice);
        };
      });
    };

    const finalRanking = await interleavedBisectSortAsync(candidates, compareFn, this.state.battleSeed);
    this.state.finalRanking = finalRanking;
    this.onTournamentComplete(finalRanking);
  },

  renderBattleCard(side, animal) {
    const nameEl = document.getElementById(`name${side}`);
    const sciEl = document.getElementById(`sci${side}`);
    const famEl = document.getElementById(`family${side}`);
    const regEl = document.getElementById(`region${side}`);
    const imgEl = document.getElementById(`img${side}`);
    const imgBg = document.getElementById(`img${side}Bg`);

    if (nameEl) nameEl.textContent = animal.name;
    if (sciEl) sciEl.textContent = animal.sci_name;
    if (famEl) famEl.textContent = animal.family;
    if (regEl) regEl.textContent = animal.region || 'Global';

    const loader = document.getElementById(`loader${side}`);
    if (imgEl) {
      if (loader) loader.classList.remove('hidden');
      imgEl.src = animal.photo;
      imgEl.alt = animal.name;
      imgEl.onerror = () => {
        imgEl.src = FALLBACK_MAMIFERO_SVG;
        if (loader) loader.classList.add('hidden');
      };
    }
    if (imgBg) {
      imgBg.src = animal.photo;
      imgBg.onerror = () => {
        imgBg.src = FALLBACK_MAMIFERO_SVG;
      };
    }
  },

  onBattleImgLoad(side) {
    const loader = document.getElementById(side === 'left' ? 'loaderLeft' : 'loaderRight');
    if (loader) loader.classList.add('hidden');
  },

  chooseCandidate(side) {
    if (this.state.pendingResolver) {
      this.state.pendingResolver(side);
    }
  },

  undoLastBattleChoice() {
    if (this.state.choiceHistory.length === 0) return;
    this.state.choiceHistory.pop();
    this.state.replayDecisions = [...this.state.choiceHistory];
    this.state.battleStep = 0;
    this.runTournament([...this.state.initialBattlePool]);
  },

  updateBattleProgress() {
    const stepEl = document.getElementById('battleStepNum');
    const totEl = document.getElementById('battleTotalEstWrap');
    const pctEl = document.getElementById('battlePctText');
    const bar = document.getElementById('battleProgressBar');

    const cur = this.state.battleStep;
    const tot = Math.max(cur, this.state.estimatedTotalSteps);
    const pct = Math.min(99, Math.round((cur / tot) * 100));

    if (stepEl) stepEl.textContent = cur;
    if (totEl) totEl.textContent = ` / ~${tot}`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (bar) bar.style.width = `${pct}%`;
  },

  // ============================================================
  // RESULTADOS & PODIO
  // ============================================================
  async onTournamentComplete(ranking) {
    this.goToView('viewResults');
    this.renderPodium(ranking.slice(0, 3));
    this.renderRestRanking(ranking.slice(3));

    const top1 = ranking[0];
    const loreEl = document.getElementById('winnerLoreText');
    if (top1 && loreEl) {
      loreEl.textContent = `Llamada salvaje y rugido característico de ${top1.name} (${top1.sci_name}).`;
    }
  },

  renderPodium(top3) {
    const container = document.getElementById('podiumContainer');
    if (!container) return;
    container.innerHTML = '';

    const heights = ['h-60 sm:h-72', 'h-48 sm:h-56', 'h-44 sm:h-52'];
    const medals = ['1º Campeón', '2º Puesto', '3º Puesto'];
    const orders = ['order-1 sm:order-2', 'order-2 sm:order-1', 'order-3'];

    const visualOrder = [top3[0], top3[1], top3[2]].filter(Boolean);

    visualOrder.forEach((animal, idx) => {
      if (!animal) return;
      const rank = idx === 0 ? 1 : (idx === 1 ? 2 : 3);
      const card = document.createElement('div');
      card.className = `p-3 rounded-2xl border-2 border-amber-800 bg-surface flex flex-col items-center justify-between shadow-sm ${orders[idx]} ${heights[rank - 1]}`;
      card.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-800 text-white">${medals[rank - 1]}</span>
        <div class="relative w-full flex-1 overflow-hidden rounded-xl my-2 bg-stone-900">
          <img src="${animal.photo}" alt="${animal.name}" class="absolute inset-0 w-full h-full object-contain object-center z-10" onerror="this.src='${FALLBACK_MAMIFERO_SVG}'" />
          <img src="${animal.photo}" alt="" class="absolute inset-0 w-full h-full object-cover blur-md opacity-50" aria-hidden="true" />
        </div>
        <div class="text-center w-full">
          <h4 class="font-serif text-base sm:text-lg text-ink font-bold line-clamp-1">${animal.name}</h4>
          <p class="font-mono text-[10px] text-muted italic line-clamp-1">${animal.sci_name}</p>
        </div>
      `;
      container.appendChild(card);
    });
  },

  renderRestRanking(rest) {
    const container = document.getElementById('restRankingContainer');
    if (!container) return;
    container.innerHTML = '';
    rest.forEach((animal, idx) => {
      const pos = idx + 4;
      const row = document.createElement('div');
      row.className = 'p-3 flex items-center justify-between gap-3 hover:bg-canvas/50 transition';
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="font-mono text-xs font-bold text-muted w-6 text-center">${pos}º</span>
          <img src="${animal.photo}" alt="${animal.name}" class="w-10 h-10 rounded-lg object-contain bg-stone-900" onerror="this.src='${FALLBACK_MAMIFERO_SVG}'" />
          <div class="text-left">
            <h5 class="text-xs sm:text-sm font-medium text-ink">${animal.name}</h5>
            <p class="font-mono text-[10px] text-muted italic">${animal.sci_name}</p>
          </div>
        </div>
        <span class="text-[10px] font-mono text-muted bg-canvas border border-line px-2 py-0.5 rounded">${animal.family}</span>
      `;
      container.appendChild(row);
    });
  },

  playWinnerRoar() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch (_) {}
  },

  // ============================================================
  // DESAFÍO Y CANVAS 2.0
  // ============================================================
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

  shareChallengeLink() {
    const ids = this.state.finalRanking.slice(0, 16).map(m => m.id);
    const url = buildChallengeUrl(ids, 'Mamíferos Salvajes', 'Rankea2');
    navigator.clipboard.writeText(url).then(() => {
      const lbl = document.getElementById('shareBtnLabel');
      if (lbl) {
        lbl.textContent = '¡Enlace copiado al portapapeles!';
        setTimeout(() => { lbl.textContent = 'Copiar link de desafío'; }, 2000);
      }
    });
  },

  async openExportModal() {
    const modal = document.getElementById('exportModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    await this.renderExportPreview();
  },

  closeExportModal() {
    document.getElementById('exportModal')?.classList.add('hidden');
  },

  async setExportFormat(format) {
    this.state.exportFormat = format;
    const btnStory = document.getElementById('formatBtnStory');
    const btnPoster = document.getElementById('formatBtnPoster');
    if (btnStory && btnPoster) {
      if (format === 'story') {
        btnStory.className = 'p-2.5 rounded-xl border-2 border-amber-800 bg-amber-800/10 text-ink text-xs font-medium transition flex items-center justify-between';
        btnPoster.className = 'p-2.5 rounded-xl border border-line bg-surface text-muted text-xs font-medium transition flex items-center justify-between';
      } else {
        btnPoster.className = 'p-2.5 rounded-xl border-2 border-amber-800 bg-amber-800/10 text-ink text-xs font-medium transition flex items-center justify-between';
        btnStory.className = 'p-2.5 rounded-xl border border-line bg-surface text-muted text-xs font-medium transition flex items-center justify-between';
      }
    }
    await this.renderExportPreview();
  },

  async renderExportPreview() {
    const canvas = document.getElementById('exportCanvas');
    const loader = document.getElementById('exportCanvasLoader');
    if (!canvas) return;

    if (loader) loader.classList.remove('hidden');
    try {
      const top3 = this.state.finalRanking.slice(0, 3);
      await renderRankingCard(canvas, {
        arenaKey: 'mamiferos',
        format: this.state.exportFormat,
        title: 'Mis Mamíferos Favoritos',
        subtitle: 'Rankea2 · Fauna Salvaje',
        top3,
        totalItems: this.state.initialBattlePool.length,
        totalDuels: this.state.battleStep,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      });
    } finally {
      if (loader) loader.classList.add('hidden');
    }
  },

  async shareExportCard() {
    const canvas = document.getElementById('exportCanvas');
    if (!canvas) return;
    await exportRankingCard(canvas, 'share');
  },

  async copyExportCardImage() {
    const canvas = document.getElementById('exportCanvas');
    if (!canvas) return;
    const ok = await exportRankingCard(canvas, 'copy');
    const btnText = document.getElementById('btnCopyCardText');
    if (btnText && ok) {
      btnText.textContent = '¡Copiado!';
      setTimeout(() => { btnText.textContent = 'Copiar imagen'; }, 2000);
    }
  },

  async downloadExportCardPng() {
    const canvas = document.getElementById('exportCanvas');
    if (!canvas) return;
    await exportRankingCard(canvas, 'download');
  },

  // ============================================================
  // UTILIDADES & TECLADO
  // ============================================================
  goToView(viewId) {
    const views = ['viewHome', 'viewStepPlace', 'viewStepTraits', 'viewStepSize', 'viewBattle', 'viewResults'];
    views.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== viewId);
    });

    const headerCtrl = document.getElementById('headerControls');
    const headerHome = document.getElementById('btnHeaderHome');
    const headerStep = document.getElementById('headerStepLabel');

    if (headerCtrl) headerCtrl.classList.toggle('hidden', viewId === 'viewHome');
    if (headerHome) headerHome.classList.toggle('hidden', viewId === 'viewHome');

    if (headerStep) {
      if (viewId === 'viewStepPlace') headerStep.textContent = 'Paso 1 · Lugar';
      else if (viewId === 'viewStepTraits') headerStep.textContent = 'Paso 2 · Tipo y Hábitat';
      else if (viewId === 'viewStepSize') headerStep.textContent = 'Paso 3 · Confirmar';
      else if (viewId === 'viewBattle') headerStep.textContent = 'Duelo de Selección';
      else if (viewId === 'viewResults') headerStep.textContent = 'Podio Definitivo';
      else headerStep.textContent = '';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  bindKeyboard() {
    window.addEventListener('keydown', e => {
      const battleEl = document.getElementById('viewBattle');
      if (!battleEl || battleEl.classList.contains('hidden')) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.chooseCandidate('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.chooseCandidate('right');
      } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.undoLastBattleChoice();
      }
    });
  },

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};

if (typeof window !== 'undefined') {
  window.app = app;
  window.addEventListener('DOMContentLoaded', () => app.init());
}

export default app;
