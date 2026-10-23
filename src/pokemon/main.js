import {
  interleavedBisectSortAsync,
  createSeededRng,
  fisherYatesShuffle,
  estimateTotalSteps,
  buildChallengeUrl,
  parseChallengeUrl
} from '../core/tournament.js';
import { bindThemeButton } from '../core/theme.js';
import { POKEMON_TYPES, GENERATIONS, getTypeBadge } from './types.js';

// DOM Elements
const views = {
  home: document.getElementById('viewHome'),
  wizard: document.getElementById('viewWizard'),
  battle: document.getElementById('viewBattle'),
  results: document.getElementById('viewResults')
};

const elements = {
  themeToggle: document.getElementById('themeToggle'),
  themeLabel: document.getElementById('themeLabel'),
  themeIconDark: document.getElementById('themeIconDark'),
  themeIconLight: document.getElementById('themeIconLight'),
  btnHeaderBrand: document.getElementById('btnHeaderBrand'),
  btnHeaderHome: document.getElementById('btnHeaderHome'),
  challengeBanner: document.getElementById('challengeBanner'),
  btnAcceptChallenge: document.getElementById('btnAcceptChallenge'),
  btnDismissChallenge: document.getElementById('btnDismissChallenge'),
  btnPresetKanto: document.getElementById('btnPresetKanto'),
  btnPresetStarters: document.getElementById('btnPresetStarters'),
  btnPresetLegendaries: document.getElementById('btnPresetLegendaries'),
  btnOpenWizard: document.getElementById('btnOpenWizard'),
  btnCancelWizard: document.getElementById('btnCancelWizard'),
  genPillContainer: document.getElementById('genPillContainer'),
  typePillContainer: document.getElementById('typePillContainer'),
  availableCountLabel: document.getElementById('availableCountLabel'),
  btnStartWizardTournament: document.getElementById('btnStartWizardTournament'),
  battleRoundLabel: document.getElementById('battleRoundLabel'),
  battleProgressBar: document.getElementById('battleProgressBar'),
  btnUndoBattle: document.getElementById('btnUndoBattle'),
  cardLeft: document.getElementById('cardLeft'),
  cardLeftDex: document.getElementById('cardLeftDex'),
  cardLeftRegion: document.getElementById('cardLeftRegion'),
  cardLeftLoader: document.getElementById('cardLeftLoader'),
  cardLeftImg: document.getElementById('cardLeftImg'),
  cardLeftName: document.getElementById('cardLeftName'),
  cardLeftTypes: document.getElementById('cardLeftTypes'),
  cardRight: document.getElementById('cardRight'),
  cardRightDex: document.getElementById('cardRightDex'),
  cardRightRegion: document.getElementById('cardRightRegion'),
  cardRightLoader: document.getElementById('cardRightLoader'),
  cardRightImg: document.getElementById('cardRightImg'),
  cardRightName: document.getElementById('cardRightName'),
  cardRightTypes: document.getElementById('cardRightTypes'),
  podiumContainer: document.getElementById('podiumContainer'),
  restRankingContainer: document.getElementById('restRankingContainer'),
  btnShareChallenge: document.getElementById('btnShareChallenge'),
  shareBtnLabel: document.getElementById('shareBtnLabel'),
  btnPlayAgain: document.getElementById('btnPlayAgain'),
  btnGoHomeResults: document.getElementById('btnGoHomeResults'),
  winnerCryAudio: document.getElementById('winnerCryAudio')
};

// Preset IDs
const PRESET_KANTO_IDS = [1, 4, 7, 25, 94, 150, 143, 133, 130, 149, 65, 131, 68, 59, 123, 39];
const PRESET_STARTERS_IDS = [3, 6, 9, 154, 157, 160, 254, 257, 260, 389, 392, 658, 724, 815, 908, 911];
const PRESET_LEGENDARIES_IDS = [150, 151, 249, 250, 384, 382, 383, 483, 484, 487, 493, 643, 644, 716, 888, 1007];

// State
const state = {
  allPokemon: [],
  pokemonMap: new Map(),
  imageCache: new Set(),
  wizard: {
    gen: 'all',
    type: 'all',
    rarity: 'all',
    size: 16
  },
  currentTournament: {
    candidates: [],
    seed: 1,
    choiceHistory: [],
    replayDecisions: [],
    pendingResolver: null,
    stepCount: 0,
    estimatedSteps: 32,
    activeLeft: null,
    activeRight: null,
    ranking: []
  },
  isSelecting: false,
  incomingChallenge: null
};

// Init Theme toggle
bindThemeButton({
  buttonId: 'themeToggle',
  labelId: 'themeLabel',
  iconDarkId: 'themeIconDark',
  iconLightId: 'themeIconLight'
});

// View Navigation
function switchView(viewName) {
  Object.keys(views).forEach(key => {
    if (views[key]) {
      views[key].classList.toggle('hidden', key !== viewName);
    }
  });

  if (elements.btnHeaderHome) {
    elements.btnHeaderHome.classList.toggle('hidden', viewName === 'home');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Load Dataset
async function loadDataset() {
  try {
    const res = await fetch('/data/pokemon.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.allPokemon = await res.json();
    state.pokemonMap.clear();
    state.allPokemon.forEach(p => state.pokemonMap.set(p.id, p));
    initWizardOptions();
    checkIncomingChallenge();
  } catch (err) {
    console.error('Error cargando catálogo Pokémon:', err);
  }
}

// Check Incoming URL Challenge (?r=id1.id2...)
function checkIncomingChallenge() {
  const challenge = parseChallengeUrl();
  if (challenge && challenge.ids && challenge.ids.length >= 2) {
    state.incomingChallenge = challenge;
    elements.challengeBanner?.classList.remove('hidden');
  }
}

// Preload sprites of candidates in background (2KB per sprite, finishes in ~50ms)
function preloadCandidateImages(pool) {
  if (!pool || !Array.isArray(pool)) return;
  pool.forEach(p => {
    if (p && p.sprite && !state.imageCache.has(p.sprite)) {
      const img = new Image();
      img.src = p.sprite;
      img.onload = () => state.imageCache.add(p.sprite);
    }
  });
}

// Wizard Setup
function initWizardOptions() {
  // Gens
  if (elements.genPillContainer) {
    elements.genPillContainer.innerHTML = GENERATIONS.map(g => `
      <button data-gen="${g.id}" class="gen-pill px-3 py-1.5 rounded-xl border text-xs font-pixel transition ${g.id === 'all' ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold' : 'border-line bg-surface text-ink hover:border-muted'}">
        ${g.name}
      </button>
    `).join('');

    elements.genPillContainer.querySelectorAll('.gen-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        state.wizard.gen = btn.dataset.gen;
        elements.genPillContainer.querySelectorAll('.gen-pill').forEach(b => {
          const active = b.dataset.gen === state.wizard.gen;
          b.className = `gen-pill px-3 py-1.5 rounded-xl border text-xs font-pixel transition ${active ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold' : 'border-line bg-surface text-ink hover:border-muted'}`;
        });
        updateAvailableCount();
      });
    });
  }

  // Types
  if (elements.typePillContainer) {
    const typeEntries = Object.entries(POKEMON_TYPES);
    elements.typePillContainer.innerHTML = `
      <button data-type="all" class="type-pill px-3 py-1.5 rounded-xl border text-xs font-pixel transition border-rose-500 bg-rose-500/10 text-rose-500 font-bold">
        Todos los tipos
      </button>
      ${typeEntries.map(([k, t]) => `
        <button data-type="${k}" class="type-pill px-3 py-1.5 rounded-xl border border-line bg-surface text-ink text-xs font-pixel transition hover:border-muted flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${t.color}"></span>
          ${t.name}
        </button>
      `).join('')}
    `;

    elements.typePillContainer.querySelectorAll('.type-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        state.wizard.type = btn.dataset.type;
        elements.typePillContainer.querySelectorAll('.type-pill').forEach(b => {
          const active = b.dataset.type === state.wizard.type;
          b.classList.toggle('border-rose-500', active);
          b.classList.toggle('bg-rose-500/10', active);
          b.classList.toggle('text-rose-500', active);
          b.classList.toggle('font-bold', active);
          b.classList.toggle('border-line', !active);
        });
        updateAvailableCount();
      });
    });
  }

  // Rarity buttons
  document.querySelectorAll('.rarity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.wizard.rarity = btn.dataset.rarity;
      document.querySelectorAll('.rarity-btn').forEach(b => {
        const active = b.dataset.rarity === state.wizard.rarity;
        b.classList.toggle('border-rose-500', active);
        b.classList.toggle('bg-rose-500/10', active);
        b.classList.toggle('text-rose-500', active);
        b.classList.toggle('font-bold', active);
      });
      updateAvailableCount();
    });
  });

  // Size buttons
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.wizard.size = parseInt(btn.dataset.size, 10);
      document.querySelectorAll('.size-btn').forEach(b => {
        const active = parseInt(b.dataset.size, 10) === state.wizard.size;
        b.classList.toggle('border-rose-500', active);
        b.classList.toggle('border-2', active);
        b.classList.toggle('border-line', !active);
      });
    });
  });

  updateAvailableCount();
}

function getFilteredPokemon() {
  return state.allPokemon.filter(p => {
    // Gen
    if (state.wizard.gen !== 'all' && p.gen !== parseInt(state.wizard.gen, 10)) {
      return false;
    }
    // Type
    if (state.wizard.type !== 'all' && !p.types.includes(state.wizard.type.toLowerCase())) {
      return false;
    }
    // Rarity
    if (state.wizard.rarity === 'starter' && !p.is_starter) {
      return false;
    }
    if (state.wizard.rarity === 'legendary' && !p.is_legendary) {
      return false;
    }
    return true;
  });
}

function updateAvailableCount() {
  const matching = getFilteredPokemon();
  if (elements.availableCountLabel) {
    elements.availableCountLabel.textContent = `${matching.length} Pokémon disponibles`;
  }
  if (elements.btnStartWizardTournament) {
    elements.btnStartWizardTournament.disabled = matching.length < 4;
    elements.btnStartWizardTournament.textContent = matching.length < 4
      ? 'Filtro muy estricto (mínimo 4)'
      : `Comenzar Torneo (${Math.min(matching.length, state.wizard.size)} criaturas) →`;
  }
}

// Start Tournament with candidate pool
function startTournamentWithCandidates(candidates) {
  if (!candidates || candidates.length < 2) return;

  preloadCandidateImages(candidates);

  const seed = Math.floor(Math.random() * 999999) + 1;
  const rng = createSeededRng(seed);
  const shuffled = fisherYatesShuffle(candidates, rng);

  state.currentTournament = {
    candidates: shuffled,
    seed,
    choiceHistory: [],
    replayDecisions: [],
    pendingResolver: null,
    stepCount: 0,
    estimatedSteps: estimateTotalSteps(shuffled.length),
    activeLeft: null,
    activeRight: null,
    ranking: []
  };

  switchView('battle');
  runTournamentEngine();
}

// Engine execution with replay support for undo
async function runTournamentEngine() {
  const t = state.currentTournament;

  // Abort previous running promise if any
  if (t.pendingResolver) {
    try {
      t.pendingResolver.reject(new Error('ResetRun'));
    } catch (_) {}
    t.pendingResolver = null;
  }

  const askPreference = (left, right) => {
    t.stepCount++;

    // Fast-forward through recorded decisions when undoing a step
    if (t.replayDecisions && t.replayDecisions.length > 0) {
      const recordedPick = t.replayDecisions.shift();
      return Promise.resolve(recordedPick);
    }

    t.activeLeft = left;
    t.activeRight = right;
    updateBattleProgress();

    return new Promise((resolve, reject) => {
      t.pendingResolver = { resolve, reject };

      renderBattleCard(
        left,
        elements.cardLeftDex,
        elements.cardLeftRegion,
        elements.cardLeftImg,
        elements.cardLeftName,
        elements.cardLeftTypes,
        elements.cardLeftLoader
      );

      renderBattleCard(
        right,
        elements.cardRightDex,
        elements.cardRightRegion,
        elements.cardRightImg,
        elements.cardRightName,
        elements.cardRightTypes,
        elements.cardRightLoader
      );
    });
  };

  updateBattleProgress();

  try {
    const finalRanking = await interleavedBisectSortAsync(t.candidates, askPreference, t.seed);
    t.ranking = finalRanking;
    showResults(finalRanking);
  } catch (err) {
    if (err && err.message === 'UndoStep') {
      // Cleanly handled by handleUndo
      return;
    }
  }
}

function updateBattleProgress() {
  const t = state.currentTournament;
  const currentStep = t.choiceHistory.length + 1;
  if (elements.battleRoundLabel) {
    elements.battleRoundLabel.textContent = `Duelo ${currentStep} de ~${t.estimatedSteps}`;
  }
  if (elements.battleProgressBar) {
    const pct = Math.min(98, Math.round((t.choiceHistory.length / Math.max(1, t.estimatedSteps)) * 100));
    elements.battleProgressBar.style.width = `${Math.max(4, pct)}%`;
  }
  if (elements.btnUndoBattle) {
    const hasHistory = t.choiceHistory && t.choiceHistory.length > 0;
    elements.btnUndoBattle.classList.toggle('opacity-40', !hasHistory);
    elements.btnUndoBattle.disabled = !hasHistory;
  }
}

function renderBattleCard(pokemon, dexEl, regEl, imgEl, nameEl, typesEl, loaderEl) {
  if (!pokemon) return;

  dexEl.textContent = `#${String(pokemon.id).padStart(3, '0')}`;
  regEl.textContent = `${pokemon.region} · Gen ${pokemon.gen}`;
  nameEl.textContent = pokemon.name;
  typesEl.innerHTML = pokemon.types.map(t => getTypeBadge(t)).join('');

  // Sprite loading with indicator
  if (loaderEl) loaderEl.classList.remove('hidden');

  const spriteUrl = pokemon.sprite;
  const tempImg = new Image();
  tempImg.onload = () => {
    imgEl.src = spriteUrl;
    imgEl.alt = pokemon.name;
    if (loaderEl) loaderEl.classList.add('hidden');
    state.imageCache.add(spriteUrl);
  };
  tempImg.onerror = () => {
    imgEl.src = spriteUrl;
    if (loaderEl) loaderEl.classList.add('hidden');
  };
  tempImg.src = spriteUrl;

  if (tempImg.complete) {
    imgEl.src = spriteUrl;
    imgEl.alt = pokemon.name;
    if (loaderEl) loaderEl.classList.add('hidden');
  }
}

function handleDuelChoice(side) {
  if (state.isSelecting) return;
  const t = state.currentTournament;
  if (!t.pendingResolver) return;

  state.isSelecting = true;

  // Flash selected card
  const cardEl = side === 'left' ? elements.cardLeft : elements.cardRight;
  cardEl.classList.add('border-rose-500');

  t.choiceHistory.push(side);
  const resolver = t.pendingResolver.resolve;
  t.pendingResolver = null;

  setTimeout(() => {
    cardEl.classList.remove('border-rose-500');
    state.isSelecting = false;
    resolver(side);
  }, 90);
}

function handleUndo() {
  const t = state.currentTournament;
  if (!t.choiceHistory || t.choiceHistory.length === 0 || !t.pendingResolver) return;

  const prev = t.pendingResolver;
  t.pendingResolver = null;
  prev.reject(new Error('UndoStep'));

  t.choiceHistory.pop();
  t.replayDecisions = [...t.choiceHistory];
  t.stepCount = 0;

  runTournamentEngine();
}

// Results & Podium
function showResults(ranking) {
  switchView('results');

  const winner = ranking[0];
  const runnerUp = ranking[1];
  const third = ranking[2];

  // Play Winner Cry (Only sound in the entire tournament, as decided in grill-me)
  if (winner && winner.cry && elements.winnerCryAudio) {
    elements.winnerCryAudio.src = winner.cry;
    elements.winnerCryAudio.volume = 0.6;
    elements.winnerCryAudio.play().catch(e => console.log('Audio autoplay prevented:', e));
  }

  // Render Podium (2nd, 1st elevated, 3rd)
  if (elements.podiumContainer) {
    elements.podiumContainer.innerHTML = `
      <!-- 2ND PLACE -->
      <div class="p-4 sm:p-5 rounded-2xl retro-box bg-surface flex flex-col items-center text-center order-2 sm:order-1">
        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-pixel font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mb-2">2° Puesto</span>
        <div class="h-28 sm:h-32 w-full flex items-center justify-center battle-platform rounded-xl">
          <img src="${runnerUp.sprite}" alt="${runnerUp.name}" class="pixel-sprite max-h-24 sm:max-h-28 w-auto object-contain" />
        </div>
        <h4 class="font-pixel-title text-sm sm:text-base text-ink mt-3">${runnerUp.name}</h4>
        <span class="font-pixel text-[11px] text-muted">#${String(runnerUp.id).padStart(3, '0')}</span>
        <div class="flex gap-1 mt-2">${runnerUp.types.map(t => getTypeBadge(t)).join('')}</div>
      </div>

      <!-- 1ST PLACE (GOLD) -->
      <div class="p-5 sm:p-6 rounded-2xl retro-box border-amber-400 bg-surface flex flex-col items-center text-center order-1 sm:order-2 relative shadow-lg">
        <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md bg-amber-400 text-zinc-950 font-pixel text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm border border-black">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          Campeón
        </div>
        <div class="h-36 sm:h-44 w-full flex items-center justify-center battle-platform rounded-xl mt-2">
          <img src="${winner.sprite}" alt="${winner.name}" class="pixel-sprite max-h-32 sm:max-h-40 w-auto object-contain" />
        </div>
        <h4 class="font-pixel-title text-base sm:text-lg text-ink mt-3">${winner.name}</h4>
        <span class="font-pixel text-[11px] text-muted">#${String(winner.id).padStart(3, '0')} · ${winner.region}</span>
        <div class="flex gap-1.5 mt-2">${winner.types.map(t => getTypeBadge(t)).join('')}</div>
        
        <button id="btnReplayWinnerCry" class="mt-4 px-3 py-1.5 rounded-lg border border-line bg-surface hover:border-amber-400 text-[11px] font-pixel text-muted hover:text-ink transition flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
          Reescuchar rugido
        </button>
      </div>

      <!-- 3RD PLACE -->
      <div class="p-4 sm:p-5 rounded-2xl retro-box bg-surface flex flex-col items-center text-center order-3">
        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-pixel font-bold uppercase tracking-wider bg-amber-700/10 text-amber-700 dark:text-amber-400 mb-2">3° Puesto</span>
        <div class="h-28 sm:h-32 w-full flex items-center justify-center battle-platform rounded-xl">
          <img src="${third.sprite}" alt="${third.name}" class="pixel-sprite max-h-24 sm:max-h-28 w-auto object-contain" />
        </div>
        <h4 class="font-pixel-title text-sm sm:text-base text-ink mt-3">${third.name}</h4>
        <span class="font-pixel text-[11px] text-muted">#${String(third.id).padStart(3, '0')}</span>
        <div class="flex gap-1 mt-2">${third.types.map(t => getTypeBadge(t)).join('')}</div>
      </div>
    `;

    document.getElementById('btnReplayWinnerCry')?.addEventListener('click', () => {
      if (elements.winnerCryAudio) {
        elements.winnerCryAudio.currentTime = 0;
        elements.winnerCryAudio.play();
      }
    });
  }

  // Rest of positions (#4 to #N)
  if (elements.restRankingContainer) {
    const rest = ranking.slice(3);
    if (rest.length === 0) {
      elements.restRankingContainer.parentElement.classList.add('hidden');
    } else {
      elements.restRankingContainer.parentElement.classList.remove('hidden');
      elements.restRankingContainer.innerHTML = rest.map((p, idx) => `
        <div class="flex items-center justify-between p-3 sm:px-4 hover:bg-canvas/50 transition">
          <div class="flex items-center gap-3">
            <span class="font-pixel text-xs font-bold text-muted w-6">#${idx + 4}</span>
            <img src="${p.sprite}" alt="${p.name}" class="pixel-sprite w-10 h-10 object-contain" />
            <div>
              <span class="font-pixel-title text-xs text-ink block">${p.name}</span>
              <span class="font-pixel text-[10px] text-muted">#${String(p.id).padStart(3, '0')} · ${p.region}</span>
            </div>
          </div>
          <div class="flex gap-1">${p.types.map(t => getTypeBadge(t)).join('')}</div>
        </div>
      `).join('');
    }
  }
}

// Event Bindings
function bindEvents() {
  // Navigation
  elements.btnHeaderBrand?.addEventListener('click', () => switchView('home'));
  elements.btnHeaderHome?.addEventListener('click', () => switchView('home'));
  elements.btnCancelWizard?.addEventListener('click', () => switchView('home'));
  elements.btnGoHomeResults?.addEventListener('click', () => switchView('home'));
  elements.btnPlayAgain?.addEventListener('click', () => {
    startTournamentWithCandidates(state.currentTournament.candidates);
  });

  // Open Wizard
  elements.btnOpenWizard?.addEventListener('click', () => switchView('wizard'));

  // Presets
  elements.btnPresetKanto?.addEventListener('click', () => {
    const candidates = PRESET_KANTO_IDS.map(id => state.pokemonMap.get(id)).filter(Boolean);
    startTournamentWithCandidates(candidates);
  });

  elements.btnPresetStarters?.addEventListener('click', () => {
    const candidates = PRESET_STARTERS_IDS.map(id => state.pokemonMap.get(id)).filter(Boolean);
    startTournamentWithCandidates(candidates);
  });

  elements.btnPresetLegendaries?.addEventListener('click', () => {
    const candidates = PRESET_LEGENDARIES_IDS.map(id => state.pokemonMap.get(id)).filter(Boolean);
    startTournamentWithCandidates(candidates);
  });

  // Start from Wizard
  elements.btnStartWizardTournament?.addEventListener('click', () => {
    const pool = getFilteredPokemon();
    const count = Math.min(pool.length, state.wizard.size);
    const rng = createSeededRng(Date.now());
    const candidates = fisherYatesShuffle(pool, rng).slice(0, count);
    startTournamentWithCandidates(candidates);
  });

  // Duel Card Clicks
  elements.cardLeft?.addEventListener('click', () => handleDuelChoice('left'));
  elements.cardRight?.addEventListener('click', () => handleDuelChoice('right'));
  elements.btnUndoBattle?.addEventListener('click', handleUndo);

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (views.battle && !views.battle.classList.contains('hidden')) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDuelChoice('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleDuelChoice('right');
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      }
    }
  });

  // Challenge Banner Actions
  elements.btnDismissChallenge?.addEventListener('click', () => {
    elements.challengeBanner?.classList.add('hidden');
  });

  elements.btnAcceptChallenge?.addEventListener('click', () => {
    if (state.incomingChallenge && state.incomingChallenge.ids) {
      const candidates = state.incomingChallenge.ids
        .map(rawId => state.pokemonMap.get(parseInt(rawId, 10)))
        .filter(Boolean);
      elements.challengeBanner?.classList.add('hidden');
      startTournamentWithCandidates(candidates);
    }
  });

  // Share Challenge Button
  elements.btnShareChallenge?.addEventListener('click', async () => {
    const t = state.currentTournament;
    if (!t.candidates || t.candidates.length === 0) return;
    const ids = t.candidates.map(p => p.id);
    const challengeUrl = buildChallengeUrl({
      baseUrl: window.location.origin + window.location.pathname,
      ids,
      category: 'pokemon'
    });

    try {
      await navigator.clipboard.writeText(challengeUrl);
      if (elements.shareBtnLabel) {
        elements.shareBtnLabel.textContent = '¡Link copiado!';
        setTimeout(() => {
          elements.shareBtnLabel.textContent = 'Copiar link de desafío';
        }, 2500);
      }
    } catch {
      prompt('Copia este link de desafío:', challengeUrl);
    }
  });
}

// Bootstrap
bindEvents();
loadDataset();
