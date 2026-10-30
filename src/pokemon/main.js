import {
  createSeededRng,
  sampleCandidates,
  generateSeed,
  buildChallengeUrl,
  buildCompactChallengeUrl,
  buildSeedChallengeUrl,
  parseChallengeUrl,
  interleavedBisectSortAsync,
  preloadImagePair,
  preloadCandidatePool,
  animateDuelTransition
} from '../core/tournament.js';
import { bindThemeButton } from '../core/theme.js';
import { renderRankingCard, exportRankingCard } from '../core/canvas.js';
import { saveRankingToCloud, fetchRankingFromCloud } from '../core/supabase.js';
import { POKEMON_TYPES, GENERATIONS, getTypeBadge } from './types.js';

// Preset IDs
const PRESET_KANTO_IDS = [1, 4, 7, 25, 94, 150, 143, 133, 130, 149, 65, 131, 68, 59, 123, 39];
const PRESET_STARTERS_IDS = [3, 6, 9, 154, 157, 160, 254, 257, 260, 389, 392, 658, 724, 815, 908, 911];
const PRESET_LEGENDARIES_IDS = [150, 151, 249, 250, 384, 382, 383, 483, 484, 487, 493, 643, 644, 716, 888, 1007];
const PRESET_EEVEELUTIONS_IDS = [133, 134, 135, 136, 196, 197, 470, 471, 700];
const PRESET_DRAGONS_GHOSTS_IDS = [149, 94, 445, 487, 373, 778, 609, 887, 384, 681, 330, 442, 612, 724, 635, 230];

const app = {
  state: {
    allPokemon: [],
    pokemonMap: new Map(),
    candidatePool: [],
    initialBattlePool: [],
    currentLeft: null,
    currentRight: null,
    battleStep: 0,
    estimatedTotalSteps: 0,
    battleSeed: generateSeed('p'),
    choiceHistory: [],
    replayDecisions: [],
    pendingResolver: null,
    finalRanking: [],
    imageCache: new Set(),
    selectedGen: 'all',
    selectedType: 'all',
    selectedRarity: 'all',
    limit: 16,
    samplingMode: 'popular',
    spriteMode: (typeof localStorage !== 'undefined' && localStorage.getItem('rankea2_pokemon_sprite_mode')) || 'animated',
    playingChallengeMode: false,
    incomingChallenge: null,
    winnerAudioEl: null,
    audioUnlocked: false,
    exportFormat: 'story'
  },

  async init() {
    bindThemeButton({
      buttonId: 'themeToggle',
      labelId: 'themeLabel',
      iconDarkId: 'themeIconDark',
      iconLightId: 'themeIconLight'
    });

    this.state.winnerAudioEl = document.getElementById('winnerCryAudio');
    this.bindKeyboard();
    this.syncPixelUi();
    this.syncSpriteModeUI();
    await this.loadDataset();
    this.renderWizardFilters();
    this.setSamplingMode(this.state.samplingMode);
    await this.checkIncomingChallenge();
  },

  syncPixelUi() {
    const isPixel = typeof localStorage !== 'undefined'
      ? localStorage.getItem('rankea2_pokemon_pixel_ui') !== 'false'
      : true;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('pixel-ui', isPixel);
      const label = document.getElementById('pixelUiLabel');
      if (label) label.textContent = isPixel ? 'Pixel UI' : 'Moderno';
    }
  },

  togglePixelUi() {
    if (typeof document === 'undefined' || !document.body) return;
    const isPixel = !document.body.classList.contains('pixel-ui');
    document.body.classList.toggle('pixel-ui', isPixel);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rankea2_pokemon_pixel_ui', isPixel ? 'true' : 'false');
    }
    const label = document.getElementById('pixelUiLabel');
    if (label) label.textContent = isPixel ? 'Pixel UI' : 'Moderno';
  },

  getPokemonSprite(pokemon, mode = this.state.spriteMode) {
    if (!pokemon) return '';
    if (mode === 'artwork') {
      return pokemon.artwork || pokemon.sprite || '';
    }
    if (mode === 'classic') {
      return pokemon.pixel_sprite || pokemon.sprite || '';
    }
    return pokemon.animated_sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemon.id}.gif`;
  },

  setSpriteMode(mode) {
    if (!['animated', 'artwork', 'classic'].includes(mode)) return;
    this.state.spriteMode = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rankea2_pokemon_sprite_mode', mode);
    }
    this.syncSpriteModeUI();

    // Actualiza imágenes en vivo si el combate está en pantalla
    if (this.state.currentLeft) {
      const imgL = document.getElementById('imgLeft');
      if (imgL) {
        imgL.src = this.getPokemonSprite(this.state.currentLeft, mode);
        imgL.classList.toggle('pixel-sprite', mode !== 'artwork');
      }
    }
    if (this.state.currentRight) {
      const imgR = document.getElementById('imgRight');
      if (imgR) {
        imgR.src = this.getPokemonSprite(this.state.currentRight, mode);
        imgR.classList.toggle('pixel-sprite', mode !== 'artwork');
      }
    }

    // Si los resultados están visibles, regenera el podio con el nuevo sprite
    const resView = document.getElementById('viewResults');
    if (resView && !resView.classList.contains('hidden') && this.state.finalRanking && this.state.finalRanking.length > 0) {
      this.renderResultsView();
    }
  },

  syncSpriteModeUI() {
    const current = this.state.spriteMode || 'animated';
    const modeLabels = {
      animated: 'GIF Animado',
      artwork: 'Oficial HD',
      classic: 'Pixel 2D',
    };

    // 1. Botones de modo (Header y Duelo)
    document.querySelectorAll('[data-sprite-mode]').forEach(btn => {
      const isActive = btn.dataset.spriteMode === current;
      btn.classList.toggle('bg-rose-600', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('border-rose-600', isActive);
      btn.classList.toggle('font-bold', isActive);
      if (isActive) {
        btn.classList.remove('text-muted');
      } else {
        btn.classList.add('text-muted');
      }
    });

    // 2. Tarjetas del Wizard de configuración
    document.querySelectorAll('[data-sprite-card]').forEach(card => {
      const isActive = card.dataset.spriteCard === current;
      card.classList.toggle('border-rose-500', isActive);
      card.classList.toggle('bg-rose-500/10', isActive);
      card.classList.toggle('border-line', !isActive);
      card.classList.toggle('bg-surface', !isActive);

      const status = card.querySelector('.sprite-card-status');
      if (status) {
        status.textContent = isActive ? 'Activo' : 'Elegir';
        if (isActive) {
          status.className = 'sprite-card-status text-[10px] font-pixel font-bold uppercase px-2 py-0.5 rounded bg-rose-600 text-white';
        } else {
          status.className = 'sprite-card-status text-[10px] font-pixel font-bold uppercase px-2 py-0.5 rounded bg-canvas text-muted border border-line';
        }
      }
    });

    // 3. Badges en plataformas de combate en vivo
    const label = modeLabels[current] || 'Sprite';
    const badgeL = document.getElementById('spriteBadgeLeft');
    const badgeR = document.getElementById('spriteBadgeRight');
    if (badgeL) badgeL.textContent = label;
    if (badgeR) badgeR.textContent = label;
  },

  async loadDataset() {
    try {
      const res = await fetch('/data/pokemon.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.state.pokemonMap.clear();
      data.forEach(p => {
        if (!p.animated_sprite) {
          p.animated_sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${p.id}.gif`;
        }
        this.state.pokemonMap.set(p.id, p);
      });
      this.state.allPokemon = data;
      this.state.candidatePool = [...data];
    } catch (err) {
      console.error('Error cargando catálogo Pokémon:', err);
    }
  },

  async checkIncomingChallenge() {
    const challenge = parseChallengeUrl();
    if (challenge && challenge.seed && challenge.seed.length === 8 && !challenge.seed.includes('.')) {
      const cloud = await fetchRankingFromCloud(challenge.seed);
      if (cloud && cloud.ids && cloud.ids.length >= 2) {
        challenge.ids = cloud.ids;
        if (cloud.author) challenge.author = cloud.author;
      }
    }
    if (challenge && (challenge.seed || (challenge.ids && challenge.ids.length >= 2))) {
      this.state.incomingChallenge = challenge;
      const banner = document.getElementById('challengeBanner');
      if (banner) banner.classList.remove('hidden');
    }
  },

  dismissChallengeBanner() {
    const banner = document.getElementById('challengeBanner');
    if (banner) banner.classList.add('hidden');
  },

  async acceptChallenge() {
    this.dismissChallengeBanner();
    if (!this.state.incomingChallenge) return;
    if (this.state.incomingChallenge.ids && this.state.incomingChallenge.ids.length >= 2) {
      const candidates = this.state.incomingChallenge.ids
        .map(rawId => this.state.pokemonMap.get(parseInt(rawId, 10)))
        .filter(Boolean);
      if (candidates.length >= 2) {
        this.state.candidatePool = candidates;
        this.state.limit = candidates.length;
        if (this.state.incomingChallenge.seed) {
          this.state.battleSeed = this.state.incomingChallenge.seed;
        }
        this.startBattleGame(true);
        return;
      }
    }
    if (this.state.incomingChallenge.seed) {
      this.state.battleSeed = this.state.incomingChallenge.seed;
      const count = 16;
      this.state.limit = count;
      const rng = createSeededRng(this.state.battleSeed);
      const mode = String(this.state.battleSeed).startsWith('p') ? 'popular' : 'random';
      const catalog = (this.state.allPokemon && this.state.allPokemon.length >= 16) ? this.state.allPokemon : this.state.fullCatalog;
      this.state.candidatePool = sampleCandidates(catalog, count, mode, { rng });
      this.startBattleGame(true);
    }
  },

  goToView(viewId) {
    const viewIds = ['viewHome', 'viewWizard', 'viewBattle', 'viewResults'];
    viewIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== viewId);
    });

    const btnHome = document.getElementById('btnHeaderHome');
    if (btnHome) {
      btnHome.classList.toggle('hidden', viewId === 'viewHome');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderWizardFilters() {
    // 1. Regions / Gens with live counts
    const genBox = document.getElementById('genPillContainer');
    if (genBox) {
      const currentType = this.state.selectedType;
      const currentRarity = this.state.selectedRarity;

      const countForGen = (gId) => {
        const targetG = parseInt(String(gId).replace(/\D/g, ''), 10);
        return this.state.allPokemon.filter(p => {
          if (gId !== 'all' && !isNaN(targetG) && p.gen !== targetG) return false;
          if (currentType !== 'all' && !p.types.includes(currentType.toLowerCase())) return false;
          if (currentRarity === 'starter' && !p.is_starter) return false;
          if (currentRarity === 'legendary' && !p.is_legendary) return false;
          return true;
        }).length;
      };

      genBox.innerHTML = GENERATIONS.map(g => {
        const cnt = countForGen(g.id);
        const isDisabled = cnt === 0;
        return `
          <button type="button" onclick="app.setGenFilter('${g.id}')" ${isDisabled ? 'disabled' : ''}
            class="gen-pill px-3 py-1.5 rounded-xl border text-xs font-pixel transition ${isDisabled ? 'opacity-35 cursor-not-allowed border-line bg-surface/50 text-muted' : g.id === this.state.selectedGen ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold' : 'border-line bg-surface text-ink hover:border-muted'}">
            ${g.name} <span class="text-[10px] opacity-70">(${cnt})</span>
          </button>
        `;
      }).join('');
    }

    // 2. Types with live counts
    const typeBox = document.getElementById('typePillContainer');
    if (typeBox) {
      const typeEntries = Object.entries(POKEMON_TYPES);
      const currentGen = this.state.selectedGen;
      const currentRarity = this.state.selectedRarity;

      // Helper to count pokemon per type under active gen & rarity
      const countForType = (tKey) => {
        return this.state.allPokemon.filter(p => {
          if (currentGen !== 'all' && p.gen !== parseInt(currentGen, 10)) return false;
          if (currentRarity === 'starter' && !p.is_starter) return false;
          if (currentRarity === 'legendary' && !p.is_legendary) return false;
          if (tKey !== 'all' && !p.types.includes(tKey)) return false;
          return true;
        }).length;
      };

      const allCount = countForType('all');

      typeBox.innerHTML = `
        <button type="button" onclick="app.setTypeFilter('all')"
          class="type-pill px-2.5 py-1.5 rounded-xl border text-xs font-pixel transition ${this.state.selectedType === 'all' ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold' : 'border-line bg-surface text-ink hover:border-muted'}">
          Todos (${allCount})
        </button>
        ${typeEntries.map(([k, t]) => {
          const cnt = countForType(k);
          const isDisabled = cnt === 0;
          return `
            <button type="button" onclick="app.setTypeFilter('${k}')" ${isDisabled ? 'disabled' : ''}
              class="type-pill px-2.5 py-1.5 rounded-xl border text-xs font-pixel transition flex items-center gap-1.5 ${isDisabled ? 'opacity-35 cursor-not-allowed border-line bg-surface/50 text-muted' : this.state.selectedType === k ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold' : 'border-line bg-surface text-ink hover:border-muted'}">
              <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0" style="background-color: ${t.color}"></span>
              <span>${t.name}</span>
              <span class="text-[10px] opacity-70">(${cnt})</span>
            </button>
          `;
        }).join('')}
      `;
    }

    this.updateMatchingCount();
  },

  setGenFilter(genId) {
    this.state.selectedGen = genId;
    this.renderWizardFilters();
  },

  setTypeFilter(typeKey) {
    this.state.selectedType = typeKey;
    this.renderWizardFilters();
  },

  setRarityFilter(rarity) {
    this.state.selectedRarity = rarity;
    document.querySelectorAll('.rarity-btn').forEach(b => {
      const active = b.dataset.rarity === rarity;
      b.classList.toggle('border-rose-500', active);
      b.classList.toggle('bg-rose-500/10', active);
      b.classList.toggle('text-rose-500', active);
      b.classList.toggle('font-bold', active);
    });
    this.renderWizardFilters();
  },

  getFilteredPool() {
    const rawGen = String(this.state.selectedGen || 'all');
    const targetGen = parseInt(rawGen.replace(/\D/g, ''), 10);
    return this.state.allPokemon.filter(p => {
      if (rawGen !== 'all' && !isNaN(targetGen) && p.gen !== targetGen) {
        return false;
      }
      if (this.state.selectedType !== 'all' && !p.types.includes(this.state.selectedType.toLowerCase())) {
        return false;
      }
      if (this.state.selectedRarity === 'starter' && !p.is_starter) {
        return false;
      }
      if (this.state.selectedRarity === 'legendary' && !p.is_legendary) {
        return false;
      }
      return true;
    });
  },

  updateMatchingCount() {
    const matching = this.getFilteredPool();
    this.state.candidatePool = matching;
    const poolCount = matching.length;

    const countEl = document.getElementById('step3TotalFound');
    if (countEl) countEl.textContent = poolCount;

    const summaryEl = document.getElementById('step3FilterSummary');
    if (summaryEl) summaryEl.textContent = this.getHumanSummary();

    const warningEl = document.getElementById('noPokemonWarning');
    const launchBtn = document.getElementById('btnLaunchGame');

    if (poolCount < 2) {
      if (warningEl) warningEl.classList.remove('hidden');
      if (launchBtn) {
        launchBtn.disabled = true;
        launchBtn.classList.add('opacity-40');
      }
    } else {
      if (warningEl) warningEl.classList.add('hidden');
      if (launchBtn) {
        launchBtn.disabled = false;
        launchBtn.classList.remove('opacity-40');
      }
    }

    // Adjust slider range dynamically
    const slider = document.getElementById('limitSlider');
    if (slider) {
      const minVal = Math.min(8, poolCount);
      const maxVal = Math.min(64, poolCount);
      slider.min = minVal;
      slider.max = Math.max(minVal, maxVal);
      slider.step = poolCount < 8 ? 1 : 8;
      if (this.state.limit > maxVal || this.state.limit < minVal) {
        this.state.limit = Math.min(16, maxVal);
      }
      slider.value = this.state.limit;
    }

    this.onLimitChange(this.state.limit);
  },

  onSliderInput(val) {
    this.onLimitChange(val, true);
  },

  onLimitChange(val, fromSlider = false) {
    const poolCount = Array.isArray(this.state.candidatePool) ? this.state.candidatePool.length : 16;
    let n;
    if (poolCount === 0) {
      n = 0;
    } else {
      n = val === 'MAX' ? poolCount : parseInt(val, 10);
      if (isNaN(n)) n = 16;
      const minLimit = Math.min(8, poolCount);
      n = Math.max(minLimit, Math.min(poolCount, n));
    }
    this.state.limit = n;

    const slider = document.getElementById('limitSlider');
    if (slider && !fromSlider) slider.value = n;

    const valDisplay = document.getElementById('limitValueDisplay');
    if (valDisplay) valDisplay.textContent = n;

    // Quick buttons active styling
    document.querySelectorAll('.size-quick-btn').forEach(btn => {
      const isMax = val === 'MAX' && btn.textContent.includes('Todas');
      const isNum = parseInt(btn.textContent, 10) === n;
      const active = isMax || isNum;
      btn.className = active
        ? 'size-quick-btn py-1.5 px-2 rounded-lg text-[11px] font-pixel border-2 border-rose-500 bg-rose-500/10 text-rose-500 text-center transition font-bold'
        : 'size-quick-btn py-1.5 px-2 rounded-lg text-[11px] font-pixel border border-line bg-surface text-ink text-center transition';
    });

    const estDecisions = n > 0 ? Math.max(1, Math.round(n * Math.log2(n) * 0.82)) : 0;
    const mins = n > 0 ? Math.max(0.5, (estDecisions * 2.2) / 60) : 0;
    const timeStr = n === 0 ? '0 min' : mins < 1 ? 'Menos de 1 min' : `~${Math.round(mins)} min`;

    const clicksEl = document.getElementById('effortClicksBigNumber');
    if (clicksEl) clicksEl.textContent = estDecisions;

    const timeBadge = document.getElementById('effortTimeBadge');
    if (timeBadge) timeBadge.textContent = timeStr;

    const intensityBadge = document.getElementById('effortIntensityBadge');
    if (intensityBadge) {
      if (n === 0) {
        intensityBadge.textContent = 'Sin duelos';
        intensityBadge.className = 'text-[10px] font-pixel font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-600 text-white';
      } else if (estDecisions <= 20) {
        intensityBadge.textContent = 'Partida Rápida';
        intensityBadge.className = 'text-[10px] font-pixel font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white';
      } else if (estDecisions <= 60) {
        intensityBadge.textContent = 'Duración Ideal';
        intensityBadge.className = 'text-[10px] font-pixel font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-600 text-white';
      } else {
        intensityBadge.textContent = 'Torneo Épico';
        intensityBadge.className = 'text-[10px] font-pixel font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-600 text-white';
      }
    }

    const hintEl = document.getElementById('durationHintText');
    if (hintEl) {
      hintEl.textContent = n === 0
        ? 'No hay suficientes Pokémon para iniciar un torneo.'
        : `Harás unas ${estDecisions} elecciones rápidas 1 vs 1 (${timeStr.toLowerCase()}).`;
    }
  },

  setSamplingMode(mode) {
    this.state.samplingMode = mode;
    const btnPop = document.getElementById('btnSamplePopular');
    const btnRnd = document.getElementById('btnSampleRandom');
    if (btnPop && btnRnd) {
      if (mode === 'popular') {
        btnPop.className = 'p-3 rounded-xl border-2 border-rose-500 bg-rose-500/10 text-left transition';
        btnRnd.className = 'p-3 rounded-xl border border-line bg-surface text-left transition';
      } else {
        btnRnd.className = 'p-3 rounded-xl border-2 border-rose-500 bg-rose-500/10 text-left transition';
        btnPop.className = 'p-3 rounded-xl border border-line bg-surface text-left transition';
      }
    }
  },

  getHumanSummary() {
    if (this.state.isChaosPool) {
      return 'Chaos Pool (16 al azar)';
    }
    const genObj = GENERATIONS.find(g => g.id === this.state.selectedGen);
    const genTxt = genObj ? genObj.name : 'Todas las regiones';
    const typeTxt = this.state.selectedType !== 'all' ? `Tipo ${POKEMON_TYPES[this.state.selectedType]?.name}` : 'Todos los tipos';
    const rarityTxt = this.state.selectedRarity === 'starter' ? 'Iniciales' : this.state.selectedRarity === 'legendary' ? 'Legendarios' : '';
    return [genTxt, typeTxt, rarityTxt].filter(Boolean).join(' · ');
  },

  // Presets & Chaos Pool
  launchSurpriseMe() {
    this.state.isChaosPool = true;
    this.state.selectedGen = 'all';
    this.state.selectedType = 'all';
    this.state.selectedRarity = 'all';
    this.state.limit = 16;
    this.state.samplingMode = 'random';
    this.state.battleSeed = generateSeed('r');

    const rng = createSeededRng(this.state.battleSeed);
    const catalog = (this.state.allPokemon && this.state.allPokemon.length >= 16) ? this.state.allPokemon : this.state.fullCatalog;
    this.state.candidatePool = sampleCandidates(catalog, 16, 'random', { rng });
    this.startBattleGame(true);
  },

  launchPreset(presetName) {
    this.state.isChaosPool = false;
    let ids = PRESET_KANTO_IDS;
    if (presetName === 'starters') ids = PRESET_STARTERS_IDS;
    else if (presetName === 'legendaries') ids = PRESET_LEGENDARIES_IDS;
    else if (presetName === 'eeveelutions') ids = PRESET_EEVEELUTIONS_IDS;
    else if (presetName === 'dragons') ids = PRESET_DRAGONS_GHOSTS_IDS;

    const candidates = ids.map(id => this.state.pokemonMap.get(id)).filter(Boolean);
    this.state.candidatePool = candidates;
    this.state.limit = candidates.length;
    this.state.battleSeed = generateSeed('p');
    this.startBattleGame(true);
  },

  // ============================================================
  // BATTLE ENGINE: Interleaved Bisect Sort with Undo & Preload
  // ============================================================
  async startBattleGame(fromChallenge = false) {
    if (this.state.candidatePool.length < 2) return;

    if (!fromChallenge) {
      if (!this.state.battleSeed || typeof this.state.battleSeed !== 'string' || this.state.battleSeed.length !== 8) {
        this.state.battleSeed = generateSeed(this.state.samplingMode === 'random' ? 'r' : 'p');
      }
      const rng = createSeededRng(this.state.battleSeed);
      this.state.candidatePool = sampleCandidates(this.state.candidatePool, this.state.limit, this.state.samplingMode, {
        rng,
        compareFn: (a, b) => (a.id || 0) - (b.id || 0)
      });
    }

    let pool = [...this.state.candidatePool];
    this.state.candidatePool = [...pool];
    this.state.initialBattlePool = [...pool];
    this.state.choiceHistory = [];
    this.state.replayDecisions = [];
    this.state.battleStep = 0;
    this.state.estimatedTotalSteps = Math.max(1, Math.round(pool.length * Math.log2(pool.length) * 0.82));

    const badge = document.getElementById('battleCategoryBadge');
    if (badge) badge.textContent = fromChallenge ? 'Desafío compartido' : this.getHumanSummary();

    const estWrap = document.getElementById('battleTotalEstWrap');
    if (estWrap) estWrap.textContent = `/~${this.state.estimatedTotalSteps}`;

    this.goToView('viewBattle');

    // Preload candidate sprites in background
    preloadCandidatePool(pool, p => this.getPokemonSprite(p, this.state.spriteMode));

    await this.runTournamentSortFromHistory();
  },

  async runTournamentSortFromHistory() {
    this.state.battleStep = 0;
    const poolCopy = [...(this.state.candidatePool || this.state.initialBattlePool || [])];
    const seed = this.state.battleSeed || 1337;
    try {
      const sorted = await interleavedBisectSortAsync(
        this.state.candidatePool,
        (left, right) => this.askUserPreference(left, right),
        seed
      );
      this.state.finalRanking = sorted;
      await this.renderResultsView();
    } catch (_) {}
  },

  undoLastBattleChoice() {
    if (!this.state.choiceHistory || this.state.choiceHistory.length === 0 || !this.state.pendingResolver) return;
    const prev = this.state.pendingResolver;
    this.state.pendingResolver = null;
    prev.reject(new Error('UndoStep'));

    this.state.choiceHistory.pop();
    this.state.replayDecisions = [...this.state.choiceHistory];
    this.runTournamentSortFromHistory();
  },

  preloadPoolImagesInBackground(pool) {
    if (typeof Image === 'undefined') return;
    for (const p of pool) {
      const src = this.getPokemonSprite(p, this.state.spriteMode);
      if (src && !this.state.imageCache.has(src)) {
        const img = new Image();
        img.src = src;
        this.state.imageCache.add(src);
      }
    }
  },

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  createSeededRng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  async interleavedBisectSortAsync(arr, seed = 1) {
    return interleavedBisectSortAsync(arr, (left, right) => this.askUserPreference(left, right), seed);
  },

  async askUserPreference(leftPokemon, rightPokemon) {
    this.state.battleStep++;

    // Fast-forward through recorded decisions when undoing a step
    if (this.state.replayDecisions && this.state.replayDecisions.length > 0) {
      const recordedPick = this.state.replayDecisions.shift();
      return Promise.resolve(recordedPick);
    }

    this.state.currentLeft = leftPokemon;
    this.state.currentRight = rightPokemon;

    const done = this.state.battleStep - 1;
    const est = Math.max(this.state.battleStep, this.state.estimatedTotalSteps);
    const pct = Math.min(98, Math.round((done / est) * 100));

    const stepNumEl = document.getElementById('battleStepNum');
    if (stepNumEl) stepNumEl.textContent = this.state.battleStep;
    const pctEl = document.getElementById('battlePctText');
    if (pctEl) pctEl.textContent = `${pct}%`;
    const barEl = document.getElementById('battleProgressBar');
    if (barEl) barEl.style.width = `${Math.max(4, pct)}%`;

    const undoBtn = document.getElementById('btnUndoBattleChoice');
    if (undoBtn) {
      const hasHistory = this.state.choiceHistory && this.state.choiceHistory.length > 0;
      undoBtn.classList.toggle('hidden', !hasHistory);
      undoBtn.classList.toggle('inline-flex', Boolean(hasHistory));
    }

    const spriteL = this.getPokemonSprite(leftPokemon, this.state.spriteMode);
    const spriteR = this.getPokemonSprite(rightPokemon, this.state.spriteMode);

    const grid = document.getElementById('battleCardsGrid');
    const winner = this.state.lastWinnerSide;
    this.state.lastWinnerSide = null;
    await animateDuelTransition(grid, () => {
      // Show loaders while sprites swap
      document.getElementById('loaderLeft')?.classList.remove('hidden');
      document.getElementById('loaderRight')?.classList.remove('hidden');

      const isArtwork = this.state.spriteMode === 'artwork';

      // Update Left
      const imgL = document.getElementById('imgLeft');
      if (imgL) {
        if (!imgL.dataset) imgL.dataset = {};
        imgL.dataset.fallbackStage = '0';
        imgL.onerror = () => this.handleImgError('left');
        imgL.alt = leftPokemon.name;
        imgL.src = spriteL;
        imgL.classList.toggle('pixel-sprite', !isArtwork);
        if (imgL.complete) this.onBattleImgLoad('left');
      }
      const nameL = document.getElementById('nameLeft');
      if (nameL) nameL.textContent = leftPokemon.name;
      const dexL = document.getElementById('dexLeft');
      if (dexL) dexL.textContent = `No. ${String(leftPokemon.id).padStart(3, '0')}`;
      const regL = document.getElementById('regLeft');
      if (regL) regL.textContent = `${leftPokemon.region} · Gen ${leftPokemon.gen}`;
      const typesL = document.getElementById('typesLeft');
      if (typesL) typesL.innerHTML = leftPokemon.types.map(t => getTypeBadge(t)).join('');

      // Update Right
      const imgR = document.getElementById('imgRight');
      if (imgR) {
        if (!imgR.dataset) imgR.dataset = {};
        imgR.dataset.fallbackStage = '0';
        imgR.onerror = () => this.handleImgError('right');
        imgR.alt = rightPokemon.name;
        imgR.src = spriteR;
        imgR.classList.toggle('pixel-sprite', !isArtwork);
        if (imgR.complete) this.onBattleImgLoad('right');
      }
      const nameR = document.getElementById('nameRight');
      if (nameR) nameR.textContent = rightPokemon.name;
      const dexR = document.getElementById('dexRight');
      if (dexR) dexR.textContent = `No. ${String(rightPokemon.id).padStart(3, '0')}`;
      const regR = document.getElementById('regRight');
      if (regR) regR.textContent = `${rightPokemon.region} · Gen ${rightPokemon.gen}`;
      const typesR = document.getElementById('typesRight');
      if (typesR) typesR.innerHTML = rightPokemon.types.map(t => getTypeBadge(t)).join('');
    }, [spriteL, spriteR], winner);

    return new Promise((resolve, reject) => {
      this.state.pendingResolver = { resolve, reject };
    });
  },

  onBattleImgLoad(side) {
    const loader = document.getElementById(side === 'left' ? 'loaderLeft' : 'loaderRight');
    if (loader) loader.classList.add('hidden');
  },

  handleImgError(side) {
    const pokemon = side === 'left' ? this.state.currentLeft : this.state.currentRight;
    const img = document.getElementById(side === 'left' ? 'imgLeft' : 'imgRight');
    if (!pokemon || !img) {
      this.onBattleImgLoad(side);
      return;
    }
    if (!img.dataset) img.dataset = {};
    const stage = parseInt(img.dataset.fallbackStage || '0', 10);
    if (stage === 0 && pokemon.sprite) {
      img.dataset.fallbackStage = '1';
      img.src = pokemon.sprite;
    } else if (stage <= 1 && pokemon.artwork) {
      img.dataset.fallbackStage = '2';
      img.src = pokemon.artwork;
    } else {
      img.onerror = null;
      this.onBattleImgLoad(side);
    }
  },

  handleImgCascade(img, pokemonId) {
    const p = this.state.pokemonMap.get(Number(pokemonId));
    if (!p || !img) {
      if (img) img.onerror = null;
      return;
    }
    if (!img.dataset) img.dataset = {};
    const stage = parseInt(img.dataset.fallbackStage || '0', 10);
    if (stage === 0 && p.sprite) {
      img.dataset.fallbackStage = '1';
      img.src = p.sprite;
    } else if (stage <= 1 && p.artwork) {
      img.dataset.fallbackStage = '2';
      img.src = p.artwork;
    } else {
      img.onerror = null;
    }
  },

  unlockWinnerAudioOnGesture() {
    try {
      if (this.state.audioUnlocked || !this.state.winnerAudioEl) return;
      this.state.winnerAudioEl.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.state.winnerAudioEl.volume = 0.01;
      const p = this.state.winnerAudioEl.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          this.state.winnerAudioEl.pause();
          this.state.winnerAudioEl.currentTime = 0;
          this.state.winnerAudioEl.volume = 0.7;
          this.state.audioUnlocked = true;
        }).catch(() => {});
      }
    } catch (_) {}
  },

  chooseCandidate(side) {
    if (!this.state.pendingResolver) return;
    this.state.lastWinnerSide = side;
    this.unlockWinnerAudioOnGesture();

    // Visual card click flash
    const cardEl = document.getElementById(side === 'left' ? 'cardLeftBtn' : 'cardRightBtn');
    if (cardEl) {
      cardEl.classList.add('border-rose-500');
      setTimeout(() => cardEl.classList.remove('border-rose-500'), 100);
    }

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

  // ============================================================
  // RESULTS & PODIUM VIEW
  // ============================================================
  async renderResultsView() {
    this.goToView('viewResults');
    const ranking = this.state.finalRanking;
    const winner = ranking[0];
    const runnerUp = ranking[1];
    const third = ranking[2];

    // Winner Cry (Only sound in the entire tournament, as decided in grill-me)
    if (winner && winner.cry && this.state.winnerAudioEl) {
      this.state.winnerAudioEl.src = winner.cry;
      this.state.winnerAudioEl.volume = 0.7;
      this.state.winnerAudioEl.play().catch(e => console.log('Audio autoplay prevented:', e));
    }

    const isArtwork = this.state.spriteMode === 'artwork';
    const spriteClass = isArtwork ? '' : 'pixel-sprite';

    const podBox = document.getElementById('podiumContainer');
    if (podBox && winner) {
      podBox.innerHTML = `
        <!-- 2ND PLACE -->
        <div class="p-4 sm:p-5 rounded-2xl retro-box bg-surface flex flex-col items-center text-center order-2 sm:order-1">
          <span class="inline-block px-2 py-0.5 rounded text-[10px] font-pixel font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mb-2">2° Puesto</span>
          <div class="h-28 sm:h-32 w-full flex items-center justify-center battle-platform rounded-xl">
            <img src="${this.getPokemonSprite(runnerUp, this.state.spriteMode)}" alt="${runnerUp.name}" onerror="app.handleImgCascade(this, ${runnerUp.id})" class="${spriteClass} max-h-24 sm:max-h-28 w-auto object-contain" />
          </div>
          <h4 class="font-pixel-title text-sm sm:text-base text-ink mt-3">${runnerUp.name}</h4>
          <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-canvas/90 text-ink border border-line tracking-wider shadow-2xs inline-block my-1">No. ${String(runnerUp.id).padStart(3, '0')}</span>
          <div class="flex gap-1 mt-2">${runnerUp.types.map(t => getTypeBadge(t)).join('')}</div>
        </div>

        <!-- 1ST PLACE (CHAMPION) -->
        <div class="p-5 sm:p-6 rounded-2xl retro-box border-amber-400 bg-surface flex flex-col items-center text-center order-1 sm:order-2 relative shadow-lg">
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md bg-amber-400 text-zinc-950 font-pixel text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm border border-black">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            Campeón
          </div>
          <div class="h-36 sm:h-44 w-full flex items-center justify-center battle-platform rounded-xl mt-2">
            <img src="${this.getPokemonSprite(winner, this.state.spriteMode)}" alt="${winner.name}" onerror="app.handleImgCascade(this, ${winner.id})" class="${spriteClass} max-h-32 sm:max-h-40 w-auto object-contain" />
          </div>
          <h4 class="font-pixel-title text-base sm:text-lg text-ink mt-3">${winner.name}</h4>
          <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-canvas/90 text-ink border border-line tracking-wider shadow-2xs inline-block my-1">No. ${String(winner.id).padStart(3, '0')} · ${winner.region}</span>
          <div class="flex gap-1.5 mt-2">${winner.types.map(t => getTypeBadge(t)).join('')}</div>
          
          <button type="button" onclick="app.replayWinnerCry()" class="mt-4 px-3 py-1.5 rounded-lg border border-line bg-surface hover:border-amber-400 text-[11px] font-pixel text-muted hover:text-ink transition flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            Reescuchar rugido
          </button>
        </div>

        <!-- 3RD PLACE -->
        <div class="p-4 sm:p-5 rounded-2xl retro-box bg-surface flex flex-col items-center text-center order-3">
          <span class="inline-block px-2 py-0.5 rounded text-[10px] font-pixel font-bold uppercase tracking-wider bg-amber-700/10 text-amber-700 dark:text-amber-400 mb-2">3° Puesto</span>
          <div class="h-28 sm:h-32 w-full flex items-center justify-center battle-platform rounded-xl">
            <img src="${this.getPokemonSprite(third, this.state.spriteMode)}" alt="${third.name}" onerror="app.handleImgCascade(this, ${third.id})" class="${spriteClass} max-h-24 sm:max-h-28 w-auto object-contain" />
          </div>
          <h4 class="font-pixel-title text-sm sm:text-base text-ink mt-3">${third.name}</h4>
          <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-canvas/90 text-ink border border-line tracking-wider shadow-2xs inline-block my-1">No. ${String(third.id).padStart(3, '0')}</span>
          <div class="flex gap-1 mt-2">${third.types.map(t => getTypeBadge(t)).join('')}</div>
        </div>
      `;
    }

    const restBox = document.getElementById('restRankingContainer');
    if (restBox) {
      const rest = ranking.slice(3);
      if (rest.length === 0) {
        restBox.parentElement.classList.add('hidden');
      } else {
        restBox.parentElement.classList.remove('hidden');
        restBox.innerHTML = rest.map((p, idx) => `
          <div class="flex items-center justify-between p-3 sm:px-4 hover:bg-canvas/50 transition">
            <div class="flex items-center gap-3">
              <span class="font-pixel text-xs font-bold text-muted w-6">#${idx + 4}</span>
              <img src="${this.getPokemonSprite(p, this.state.spriteMode)}" alt="${p.name}" onerror="app.handleImgCascade(this, ${p.id})" class="${spriteClass} w-10 h-10 object-contain" />
              <div>
                <span class="font-pixel-title text-xs text-ink block">${p.name}</span>
                <span class="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-canvas/90 text-ink border border-line tracking-wider inline-block mt-0.5">No. ${String(p.id).padStart(3, '0')}</span>
                <span class="text-[11px] text-muted">· ${p.region}</span>
              </div>
            </div>
            <div class="flex gap-1">${p.types.map(t => getTypeBadge(t)).join('')}</div>
          </div>
        `).join('');
      }
    }
  },

  replayWinnerCry() {
    if (this.state.winnerAudioEl) {
      this.state.winnerAudioEl.currentTime = 0;
      this.state.winnerAudioEl.play();
    }
  },

  async shareChallenge() {
    const base = `${window.location.origin}${window.location.pathname}`;
    const ranking = this.state.finalRanking || [];
    let challengeUrl;
    if (ranking.length >= 2) {
      if (!this.state.cloudShortCode) {
        this.state.cloudShortCode = await saveRankingToCloud({
          packId: 'pokemon',
          rankingIds: ranking.map(p => p.id),
          author: (document.getElementById('posterAuthorInput')?.value || '').trim()
        });
      }
      if (this.state.cloudShortCode) {
        challengeUrl = `${base}?s=${this.state.cloudShortCode}`;
      } else {
        const ids = ranking.map(p => p.id).join('.');
        challengeUrl = `${base}?r=${ids}`;
      }
    } else {
      const seed = this.state.battleSeed || generateSeed('r');
      challengeUrl = `${base}?s=${seed}`;
    }

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
        btnS.className = 'py-2 px-3 rounded-xl border-2 border-rose-500 bg-rose-500/10 text-xs font-pixel font-bold text-ink text-center transition';
        btnP.className = 'py-2 px-3 rounded-xl border border-line bg-canvas text-xs font-pixel text-muted hover:text-ink text-center transition';
      } else {
        btnP.className = 'py-2 px-3 rounded-xl border-2 border-rose-500 bg-rose-500/10 text-xs font-pixel font-bold text-ink text-center transition';
        btnS.className = 'py-2 px-3 rounded-xl border border-line bg-canvas text-xs font-pixel text-muted hover:text-ink text-center transition';
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
        arena: 'pokemon',
        winner,
        top3,
        format: this.state.exportFormat || 'story',
        options: {
          canvas,
          ranking: this.state.finalRanking,
          seed: this.state.battleSeed
        }
      });
    } catch (err) {
      console.error('Error renderizando tarjeta visual:', err);
    } finally {
      if (loader) loader.classList.add('hidden');
      canvas.classList.remove('opacity-40');
    }
  },

  async shareExportCard() {
    const canvas = document.getElementById('exportCardCanvas');
    if (!canvas) return;
    const suffix = this.state.exportFormat === 'poster' ? 'poster' : 'historia';
    const result = await exportRankingCard({
      canvas,
      filename: `rankea2-pokemon-${suffix}.png`,
      title: 'Rankea2 · Mi Ranking Pokémon',
      text: '¡Mirá el podio Pokémon que armé en Rankea2!'
    });

    if (result.copied) {
      this.showExportToast('¡Tarjeta copiada al portapapeles!');
    } else if (result.downloaded) {
      this.showExportToast('¡Tarjeta descargada como PNG!');
    }
  },

  async copyExportCardImage() {
    const canvas = document.getElementById('exportCardCanvas');
    if (!canvas) return;
    const suffix = this.state.exportFormat === 'poster' ? 'poster' : 'historia';
    const result = await exportRankingCard({
      canvas,
      filename: `rankea2-pokemon-${suffix}.png`,
      action: 'copy'
    });
    if (result.copied) {
      this.showExportToast('¡Tarjeta copiada al portapapeles!');
    } else {
      this.showExportToast('No se pudo copiar directo. Guardando PNG...');
    }
  },

  async downloadExportCardPng() {
    const canvas = document.getElementById('exportCardCanvas');
    if (!canvas) return;
    const suffix = this.state.exportFormat === 'poster' ? 'poster' : 'historia';
    await exportRankingCard({
      canvas,
      filename: `rankea2-pokemon-${suffix}.png`,
      action: 'download'
    });
    this.showExportToast('¡Tarjeta descargada como PNG!');
  },

  showExportToast(msg) {
    const toast = document.getElementById('exportFeedbackToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }
};

if (typeof window !== 'undefined') {
  window.app = app;
  window.addEventListener('DOMContentLoaded', () => app.init());
}
export default app;
