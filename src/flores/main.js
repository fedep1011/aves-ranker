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
  { id: 1, name: "Orquídea Cattleya", sci_name: "Cattleya trianae", family: "Orchidaceae", color: "Multicolor / Exótica", usage: "Selva Tropical", climate: "Tropical", region: "América Tropical", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/256523606/medium.jpeg" },
  { id: 2, name: "Pasionaria Azufrada", sci_name: "Passiflora caerulea", family: "Passifloraceae", color: "Azul / Violeta", usage: "Selva Tropical", climate: "Tropical", region: "Sudamérica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/40082393/medium.jpg" },
  { id: 3, name: "Flor de Loto Sagrado", sci_name: "Nelumbo nucifera", family: "Nelumbonaceae", color: "Rojo / Rosa", usage: "Acuática / Loto", climate: "Templado", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/116385724/medium.jpeg" },
  { id: 4, name: "Flor de Cerezo (Sakura)", sci_name: "Prunus serrulata", family: "Rosaceae", color: "Rojo / Rosa", usage: "Jardín Ornamental", climate: "Templado", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/90432717/medium.jpeg" },
  { id: 5, name: "Rosa Silvestre", sci_name: "Rosa canina", family: "Rosaceae", color: "Rojo / Rosa", usage: "Jardín Ornamental", climate: "Templado", region: "Europa y Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/43901474/medium.jpeg" },
  { id: 6, name: "Ave del Paraíso", sci_name: "Strelitzia reginae", family: "Strelitziaceae", color: "Amarillo / Naranja", usage: "Selva Tropical", climate: "Tropical", region: "Sudáfrica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/375256909/medium.jpg" },
  { id: 7, name: "Girasol Silvestre", sci_name: "Helianthus annuus", family: "Asteraceae", color: "Amarillo / Naranja", usage: "Silvestre de campo", climate: "Templado", region: "Norteamérica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/323768714/medium.jpg" },
  { id: 8, name: "Lavanda Silvestre", sci_name: "Lavandula angustifolia", family: "Lamiaceae", color: "Azul / Violeta", usage: "Aromática y Medicinal", climate: "Mediterráneo", region: "Mediterráneo", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/157057/medium.jpg" },
  { id: 9, name: "Hibisco de Jardín", sci_name: "Hibiscus rosa-sinensis", family: "Malvaceae", color: "Rojo / Rosa", usage: "Jardín Ornamental", climate: "Tropical", region: "Asia Tropical", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/729214308/medium.jpg" },
  { id: 10, name: "Nenúfar Blanco", sci_name: "Nymphaea alba", family: "Nymphaeaceae", color: "Blanco", usage: "Acuática / Loto", climate: "Templado", region: "Europa y Norte de África", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/169681028/medium.jpeg" },
  { id: 11, name: "Dalia Silvestre", sci_name: "Dahlia pinnata", family: "Asteraceae", color: "Rojo / Rosa", usage: "Jardín Ornamental", climate: "Templado", region: "México y Centroamérica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/571049090/medium.jpg" },
  { id: 12, name: "Magnolia Blanca", sci_name: "Magnolia grandiflora", family: "Magnoliaceae", color: "Blanco", usage: "Jardín Ornamental", climate: "Templado", region: "Norteamérica", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/82254330/medium.jpg" },
  { id: 13, name: "Amapola Silvestre", sci_name: "Papaver rhoeas", family: "Papaveraceae", color: "Rojo / Rosa", usage: "Silvestre de campo", climate: "Templado", region: "Eurasia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/682825136/medium.jpg" },
  { id: 14, name: "Hortensia Azul", sci_name: "Hydrangea macrophylla", family: "Hydrangeaceae", color: "Azul / Violeta", usage: "Jardín Ornamental", climate: "Templado", region: "Japón", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/45518546/medium.jpg" },
  { id: 15, name: "Peonía China", sci_name: "Paeonia lactiflora", family: "Paeoniaceae", color: "Rojo / Rosa", usage: "Jardín Ornamental", climate: "Templado", region: "Asia Central y Oriental", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/113190686/medium.jpg" },
  { id: 16, name: "Jazmín del Cabo", sci_name: "Gardenia jasminoides", family: "Rubiaceae", color: "Blanco", usage: "Jardín Ornamental", climate: "Templado", region: "Asia", photo: "https://inaturalist-open-data.s3.amazonaws.com/photos/72076739/medium.jpg" }
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
    { id: "nueva zelanda", label: "Nueva Zelanda" }
  ],

  usages: [
    { key: "silvestre", title: "Silvestres de campo", desc: "Margaritas, amapolas, campanillas, achicorias y tréboles" },
    { key: "jardín", title: "Jardín ornamental", desc: "Rosas cultivadas, peonías, hortensias, tulipanes y dalias" },
    { key: "aromática", title: "Aromáticas y medicinales", desc: "Lavandas, salvias, manzanillas, romeros y mentas silvestres" },
    { key: "selva", title: "Selva tropical y exóticas", desc: "Orquídeas, pasionarias, heliconias y bromelias" },
    { key: "acuática", title: "Acuáticas y lotos", desc: "Nenúfares blancos y flores de loto sagrado" }
  ],

  colors: [
    { key: "blanco", label: "Blanco", swatch: "#F5F5F4" },
    { key: "amarillo", label: "Amarillo / Naranja", swatch: "#EAB308" },
    { key: "rojo", label: "Rojo / Rosa", swatch: "#E11D48" },
    { key: "azul", label: "Azul / Violeta", swatch: "#6366F1" },
    { key: "multicolor", label: "Multicolor / Exótica", swatch: "#D946EF" }
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
    usages: new Set(),
    colors: new Set(),
    keyword: "",
    samplingMode: "popular",
    limit: 16,
    totalFound: 0,
    selectedCategory: "todas",
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
      const res = await fetch('/data/flores.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.state.pool = data;
      this.state.candidatePool = [...data];
      this.state.totalFound = data.length;
    } catch (err) {
      console.warn('Usando catálogo floral integrado como fallback:', err);
      this.state.pool = [...FLORES_CATALOG_FALLBACK];
      this.state.candidatePool = [...FLORES_CATALOG_FALLBACK];
      this.state.totalFound = FLORES_CATALOG_FALLBACK.length;
    }
  },

  // ============================================================
  // WIZARD DE 3 PASOS (LUGAR, TIPO/COLOR, CONFIRMAR)
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
        ? 'px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition bg-emerald-700 text-white'
        : 'px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition bg-canvas text-ink border border-line hover:border-ink/40';
    }

    if (wrap && chips) {
      wrap.classList.toggle('hidden', !hasPlaces);
      chips.innerHTML = '';
      this.state.places.forEach((lbl, id) => {
        const chip = document.createElement('span');
        chip.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700 text-white shadow-xs';
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
          ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 text-white transition shadow-xs'
          : 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
        btn.textContent = p.label;
        grid.appendChild(btn);
      });
    }

    this.updateStep1LiveCount();
  },

  updateStep1LiveCount() {
    const placeMatches = this.getFilteredSubset(true);
    const count = placeMatches.length;
    const numEl = document.getElementById('step1CountNumber');
    const lblEl = document.getElementById('step1CountLabel');
    const btnCountEl = document.getElementById('btnStep1NextCount');
    const btnNext = document.getElementById('btnStep1Next');

    const placeLabel = this.state.places.size === 0
      ? 'en todo el mundo'
      : (this.state.places.size === 1
          ? `en ${Array.from(this.state.places.values())[0]}`
          : `en los lugares elegidos`);

    if (numEl) numEl.textContent = `${count.toLocaleString('es-UY')} especies`;
    if (lblEl) lblEl.textContent = `Flores con foto disponibles ${placeLabel}:`;
    if (btnCountEl) btnCountEl.textContent = `(${count.toLocaleString('es-UY')})`;
    if (btnNext) {
      if (count < 2) {
        btnNext.disabled = true;
        btnNext.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        btnNext.disabled = false;
        btnNext.classList.remove('opacity-50', 'cursor-not-allowed');
      }
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
        b.className = 'w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-emerald-700/10 flex items-center justify-between';
        b.innerHTML = `<span>${item.label}</span><span class="text-emerald-700 font-medium">+</span>`;
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

  // PASO 2: TIPO Y COLOR
  renderStep2Traits() {
    const kwTrim = this.state.keyword.trim();
    const hasKw = kwTrim.length > 0;
    const activeFilterCount = this.state.usages.size + this.state.colors.size + (hasKw ? 1 : 0);
    const hasAny = activeFilterCount > 0;

    const btnAll = document.getElementById('btnTraitsAll');
    if (btnAll) {
      btnAll.className = !hasAny
        ? 'px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition bg-emerald-700 text-white'
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
        kwInp.className = 'w-full rounded-xl bg-emerald-700/10 border-2 border-emerald-700 px-4 py-2 text-sm text-ink focus:outline-hidden';
      } else {
        kwChip.classList.add('hidden');
        kwChip.classList.remove('inline-flex');
        kwInp.className = 'w-full sm:w-80 rounded-full bg-canvas border border-line px-3.5 py-2 text-xs sm:text-sm text-ink placeholder:text-muted focus:outline-hidden focus:border-emerald-700 transition';
      }
    }

    const uGrid = document.getElementById('usagesGrid');
    if (uGrid) {
      uGrid.innerHTML = '';
      CATALOG_DATA.usages.forEach(u => {
        const active = this.state.usages.has(u.key);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => {
          if (this.state.usages.has(u.key)) this.state.usages.delete(u.key);
          else this.state.usages.add(u.key);
          this.renderStep2Traits();
        };
        btn.className = active
          ? 'p-3 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 text-left transition'
          : 'p-3 rounded-xl border border-line bg-canvas/50 hover:border-ink/40 text-left transition';
        btn.innerHTML = `
          <div class="text-xs sm:text-sm font-medium text-ink">${u.title}</div>
          <div class="text-[11px] text-muted mt-0.5">${u.desc}</div>
        `;
        uGrid.appendChild(btn);
      });
    }

    const cGrid = document.getElementById('colorsGrid');
    if (cGrid) {
      cGrid.innerHTML = '';
      CATALOG_DATA.colors.forEach(c => {
        const active = this.state.colors.has(c.key);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => {
          if (this.state.colors.has(c.key)) this.state.colors.delete(c.key);
          else this.state.colors.add(c.key);
          this.renderStep2Traits();
        };
        btn.className = active
          ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 text-white transition shadow-xs'
          : 'px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-muted hover:text-ink transition';
        btn.textContent = c.label;
        cGrid.appendChild(btn);
      });
    }

    this.updateStep2LiveFeedback();
  },

  updateStep2LiveFeedback() {
    const matches = this.getFilteredSubset(false);
    const count = matches.length;
    const banner = document.getElementById('step2FeedbackBanner');
    const titleEl = document.getElementById('step2FeedbackTitle');
    const detailEl = document.getElementById('step2FeedbackDetail');
    const iconEl = document.getElementById('step2FeedbackIcon');
    const btnNext = document.getElementById('btnStep2Next');
    const btnText = document.getElementById('btnStep2NextText');
    const btnCount = document.getElementById('btnStep2NextCount');

    if (!banner) return;

    banner.className = 'p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-2.5 ';

    if (count >= 2) {
      banner.classList.add('bg-emerald-900/10', 'border-emerald-800/25', 'text-emerald-800', 'dark:text-emerald-200');
      if (iconEl) {
        iconEl.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
        iconEl.className = 'w-4 h-4 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-300';
      }
      if (count <= 3) {
        const names = matches.map(f => f.name).join(', ');
        if (titleEl) titleEl.textContent = `${count} flores con foto listas`;
        if (detailEl) detailEl.textContent = `Encontradas: ${names}. Alcanzan justo para una partida corta.`;
      } else {
        if (titleEl) titleEl.textContent = `${count.toLocaleString('es-UY')} especies con foto disponibles`;
        if (detailEl) detailEl.textContent = 'Tu combinación tiene opciones suficientes para jugar con 8, 16 o más.';
      }

      if (btnNext) {
        btnNext.disabled = false;
        btnNext.classList.remove('opacity-50', 'cursor-not-allowed');
      }
      if (btnText) btnText.textContent = 'Siguiente: Confirmar';
      if (btnCount) {
        btnCount.textContent = `(${count.toLocaleString('es-UY')})`;
        btnCount.classList.remove('hidden');
      }
    } else if (count === 1) {
      const single = matches[0];
      banner.classList.add('bg-amber-500/15', 'border-amber-500/40', 'text-amber-900', 'dark:text-amber-200');
      if (iconEl) {
        iconEl.innerHTML = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
        iconEl.className = 'w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400';
      }
      if (titleEl) titleEl.textContent = `Solo hay 1 flor disponible: ${single.name}`;
      if (detailEl) detailEl.textContent = `${single.name} (${single.sci_name}). Para armar un torneo necesitas al menos 2 especies. Prueba cambiando de lugar o quitando algún filtro.`;

      if (btnNext) {
        btnNext.disabled = true;
        btnNext.classList.add('opacity-50', 'cursor-not-allowed');
      }
      if (btnText) btnText.textContent = 'Solo 1 especie (mínimo 2)';
      if (btnCount) btnCount.classList.add('hidden');
    } else {
      banner.classList.add('bg-rose-500/10', 'border-rose-500/30', 'text-rose-900', 'dark:text-rose-200');
      if (iconEl) {
        iconEl.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
        iconEl.className = 'w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400';
      }
      if (titleEl) titleEl.textContent = 'No hay flores con foto para este filtro';
      if (detailEl) detailEl.textContent = 'Esa combinación no tiene especies registradas. Prueba cambiando de lugar o seleccionando otro color.';

      if (btnNext) {
        btnNext.disabled = true;
        btnNext.classList.add('opacity-50', 'cursor-not-allowed');
      }
      if (btnText) btnText.textContent = 'Sin especies disponibles';
      if (btnCount) btnCount.classList.add('hidden');
    }
  },

  clearTraits() {
    this.state.usages.clear();
    this.state.colors.clear();
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
    this.state.usages.clear();
    this.state.colors.clear();
    const uKeys = CATALOG_DATA.usages.map(u => u.key);
    const chosen = uKeys[Math.floor(Math.random() * uKeys.length)];
    this.state.usages.add(chosen);
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

  getFilteredSubset(placesOnly = false) {
    let subset = [...this.state.pool];

    // Lugar
    if (this.state.places.size > 0) {
      const placeKeys = Array.from(this.state.places.keys());
      const hasLatam = placeKeys.includes('latinoamérica') || placeKeys.includes('sudamérica');
      subset = subset.filter(f => {
        const reg = (f.region || '').toLowerCase();
        const countries = Array.isArray(f.countries) ? f.countries.map(c => c.toLowerCase()) : [];
        if (hasLatam && (reg.includes('américa') || reg.includes('sudamérica') || countries.includes('latinoamérica') || countries.includes('sudamérica'))) {
          return true;
        }
        return placeKeys.some(p => reg.includes(p) || countries.includes(p));
      });
    }

    if (placesOnly) {
      return subset;
    }

    // Usos / Entornos
    if (this.state.usages.size > 0) {
      subset = subset.filter(f => {
        const use = (f.usage || '').toLowerCase();
        for (const u of this.state.usages) {
          if (use.includes(u.toLowerCase())) return true;
          if (u === 'selva' && (f.family === 'Orchidaceae' || f.family === 'Passifloraceae')) return true;
          if (u === 'jardín' && (f.family === 'Rosaceae' || f.family === 'Paeoniaceae' || f.family === 'Hydrangeaceae')) return true;
          if (u === 'aromática' && f.family === 'Lamiaceae') return true;
          if (u === 'acuática' && (f.family === 'Nymphaeaceae' || f.family === 'Nelumbonaceae')) return true;
        }
        return false;
      });
    }

    // Colores
    if (this.state.colors.size > 0) {
      subset = subset.filter(f => {
        const col = (f.color || '').toLowerCase();
        for (const c of this.state.colors) {
          if (col.includes(c.toLowerCase())) return true;
        }
        return false;
      });
    }

    // Buscador
    if (this.state.keyword.trim()) {
      const q = this.state.keyword.trim().toLowerCase();
      subset = subset.filter(f =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.sci_name || '').toLowerCase().includes(q) ||
        (f.family || '').toLowerCase().includes(q)
      );
    }

    return subset;
  },

  filterPool() {
    const subset = this.getFilteredSubset(false);
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
      if (this.state.usages.size > 0) {
        const uNames = Array.from(this.state.usages).map(k => CATALOG_DATA.usages.find(u => u.key === k)?.title).filter(Boolean);
        parts.push(uNames.join(', '));
      }
      if (this.state.colors.size > 0) {
        const cNames = Array.from(this.state.colors).map(k => CATALOG_DATA.colors.find(c => c.key === k)?.label).filter(Boolean);
        parts.push(cNames.join(', '));
      }
      if (this.state.keyword.trim()) parts.push(`"${this.state.keyword.trim()}"`);
      summaryEl.textContent = parts.join(' · ');
    }

    const mini = document.getElementById('step3MiniPhotos');
    if (mini) {
      mini.innerHTML = '';
      this.state.candidatePool.slice(0, 5).forEach(f => {
        const img = document.createElement('img');
        img.src = f.photo;
        img.alt = f.name;
        img.className = 'w-8 h-8 rounded-full border-2 border-surface object-cover';
        mini.appendChild(img);
      });
    }

    const warn = document.getElementById('noFlowersWarning');
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
        btnPop.className = 'p-3 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 text-left transition';
        btnRnd.className = 'p-3 rounded-xl border border-line bg-canvas/50 hover:border-ink/40 text-left transition';
      } else {
        btnRnd.className = 'p-3 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 text-left transition';
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

  renderBattleCard(side, flower) {
    const nameEl = document.getElementById(`name${side}`);
    const sciEl = document.getElementById(`sci${side}`);
    const famEl = document.getElementById(`family${side}`);
    const regEl = document.getElementById(`region${side}`);
    const imgEl = document.getElementById(`img${side}`);
    const imgBg = document.getElementById(`img${side}Bg`);

    if (nameEl) nameEl.textContent = flower.name;
    if (sciEl) sciEl.textContent = flower.sci_name;
    if (famEl) famEl.textContent = flower.family;
    if (regEl) regEl.textContent = flower.region || 'Global';

    const loader = document.getElementById(`loader${side}`);
    if (imgEl) {
      if (loader) loader.classList.remove('hidden');
      imgEl.src = flower.photo;
      imgEl.alt = flower.name;
      imgEl.onerror = () => {
        imgEl.src = FALLBACK_FLOWER_SVG;
        if (loader) loader.classList.add('hidden');
      };
    }
    if (imgBg) {
      imgBg.src = flower.photo;
      imgBg.onerror = () => {
        imgBg.src = FALLBACK_FLOWER_SVG;
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
      loreEl.textContent = `Repique aromático y armónico de ${top1.name} (${top1.sci_name}).`;
    }
  },

  renderPodium(top3) {
    const container = document.getElementById('podiumContainer');
    if (!container) return;
    container.innerHTML = '';

    const heights = ['h-60 sm:h-72', 'h-48 sm:h-56', 'h-44 sm:h-52'];
    const medals = ['1º Reina Botánica', '2º Puesto', '3º Puesto'];
    const orders = ['order-1 sm:order-2', 'order-2 sm:order-1', 'order-3'];

    const visualOrder = [top3[0], top3[1], top3[2]].filter(Boolean);

    visualOrder.forEach((flower, idx) => {
      if (!flower) return;
      const rank = idx === 0 ? 1 : (idx === 1 ? 2 : 3);
      const card = document.createElement('div');
      card.className = `p-3 rounded-2xl border-2 border-emerald-700 bg-surface flex flex-col items-center justify-between shadow-sm ${orders[idx]} ${heights[rank - 1]}`;
      card.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-700 text-white">${medals[rank - 1]}</span>
        <div class="relative w-full flex-1 overflow-hidden rounded-xl my-2 bg-stone-900">
          <img src="${flower.photo}" alt="${flower.name}" class="absolute inset-0 w-full h-full object-contain object-center z-10" onerror="this.src='${FALLBACK_FLOWER_SVG}'" />
          <img src="${flower.photo}" alt="" class="absolute inset-0 w-full h-full object-cover blur-md opacity-50" aria-hidden="true" />
        </div>
        <div class="text-center w-full">
          <h4 class="font-flora italic text-base sm:text-lg text-ink font-bold line-clamp-1">${flower.name}</h4>
          <p class="font-mono text-[10px] text-muted italic line-clamp-1">${flower.sci_name}</p>
        </div>
      `;
      container.appendChild(card);
    });
  },

  renderRestRanking(rest) {
    const container = document.getElementById('restRankingContainer');
    if (!container) return;
    container.innerHTML = '';
    rest.forEach((flower, idx) => {
      const pos = idx + 4;
      const row = document.createElement('div');
      row.className = 'p-3 flex items-center justify-between gap-3 hover:bg-canvas/50 transition';
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="font-mono text-xs font-bold text-muted w-6 text-center">${pos}º</span>
          <img src="${flower.photo}" alt="${flower.name}" class="w-10 h-10 rounded-lg object-contain bg-stone-900" onerror="this.src='${FALLBACK_FLOWER_SVG}'" />
          <div class="text-left">
            <h5 class="text-xs sm:text-sm font-medium text-ink">${flower.name}</h5>
            <p class="font-mono text-[10px] text-muted italic">${flower.sci_name}</p>
          </div>
        </div>
        <span class="text-[10px] font-mono text-muted bg-canvas border border-line px-2 py-0.5 rounded">${flower.family}</span>
      `;
      container.appendChild(row);
    });
  },

  playWinnerChime() {
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
        gain.gain.exponentialRampToValueAtTime(0.25, offset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, offset + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(offset);
        osc.stop(offset + n.dur + 0.05);
        offset += n.dur * 0.45 + n.gap;
      });
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
    const ids = this.state.finalRanking.slice(0, 16).map(f => f.id);
    const url = buildChallengeUrl(ids, 'Herbario Floral', 'Rankea2');
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
        btnStory.className = 'p-2.5 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 text-ink text-xs font-medium transition flex items-center justify-between';
        btnPoster.className = 'p-2.5 rounded-xl border border-line bg-surface text-muted text-xs font-medium transition flex items-center justify-between';
      } else {
        btnPoster.className = 'p-2.5 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 text-ink text-xs font-medium transition flex items-center justify-between';
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
        arenaKey: 'flores',
        format: this.state.exportFormat,
        title: 'Mis Flores Favoritas',
        subtitle: 'Rankea2 · Herbario Botánico',
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
      else if (viewId === 'viewStepTraits') headerStep.textContent = 'Paso 2 · Tipo y Color';
      else if (viewId === 'viewStepSize') headerStep.textContent = 'Paso 3 · Confirmar';
      else if (viewId === 'viewBattle') headerStep.textContent = 'Duelo Floral';
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
