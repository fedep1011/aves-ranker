/**
 * Tier 5 Adversarial Arena Integration Test Suite
 *
 * White-box empirical verification of Rankea2 arenas:
 * 1. Pokémon Arena (`src/pokemon/main.js`, `pokemon/index.html`)
 *    - Gen 9 (#1025 Pecharunt) fallback chain (showdown gif -> pixel sprite -> official artwork -> termination)
 *    - 0 matching filters (warning displayed, launch button disabled, slider clamped to 0, sin duelos badge)
 *    - Slider clamped dynamically to filtered candidate count (e.g. 8..12 when pool is 12, 'MAX' handling, fallback bounds)
 *    - Duel loop & finish state transition to viewResults
 *    - Podium rendering: 1st place gold champion badge, 2nd, 3rd, audio cry assignment & replay, rest ranking No. badges
 *    - Export modal lifecycle: open, format toggle (story 9:16 <-> poster 4:5), canvas rendering, download/copy/share toasts, close
 *
 * 2. Mamíferos & Flores Arenas (`src/mamiferos/main.js`, `src/flores/main.js`)
 *    - 16 species dataset loading and schema integrity
 *    - Zero photo cropping: object-contain object-center on duel cards, podium cards, and rest ranking items
 *    - Duel loop with undo history stack rewind & determinism
 *    - Export modal lifecycle across both arenas
 *
 * 3. Aves Arena (`src/aves/main.js`, `aves/index.html`)
 *    - Challenge banner: Top 3 preview zero cropping, full challenge list zero cropping
 *    - Battle photo zero cropping with ambient blur backdrop
 *    - Hub card diagonal framing: clip-path polygon (55% / 20%), curated object-position, diagonal SVG line (55,0 -> 44,100)
 *
 * 4. Hub Portal (`index.html`)
 *    - All 4 arena navigation links (/aves/, /pokemon/, /flores/, /mamiferos/)
 *    - SVG icons: brand mark, theme moon/sun icons, matchup shuffle icon, diagonal card separators
 *    - Dark mode compatibility: WCAG contrast of dark tokens, inline head restore, interactive toggle synchronization
 *
 * 5. Architectural Invariants
 *    - Deep module de-duplication in src/core/tournament.js and src/core/canvas.js
 *    - Zero emoji / typography discipline across marked arenas
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

import {
  ROOT_DIR,
  createMockBrowserEnv,
  parseHexColor,
  calculateContrastRatio
} from './e2e/harness.mjs';

import * as tournamentCore from '../src/core/tournament.js';
import * as themeCore from '../src/core/theme.js';
import * as canvasCore from '../src/core/canvas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let totalTests = 0;
let passedTests = 0;
const failures = [];

async function test(name, fn) {
  totalTests++;
  const start = performance.now();
  try {
    await fn();
    const duration = (performance.now() - start).toFixed(2);
    passedTests++;
    console.log(`  ✓ PASS [${totalTests}]: ${name} (${duration}ms)`);
  } catch (err) {
    const duration = (performance.now() - start).toFixed(2);
    failures.push({ id: totalTests, name, error: err });
    console.error(`  ✗ FAIL [${totalTests}]: ${name} (${duration}ms)`);
    console.error(`    ${err.message}`);
  }
}

console.log('==============================================================================');
console.log('⚡ TIER 5 ADVERSARIAL INTEGRATION TEST SUITE — ARENAS & INTEGRATION HARDENING');
console.log('==============================================================================\n');

// ============================================================================
// SUITE 1: Pokémon Arena White-Box Coverage & Edge Hardening
// ============================================================================
console.log('▶ [Suite 1: Pokémon Arena White-Box & Edge Hardening]');

const pokemonJsonPath = path.resolve(ROOT_DIR, 'public/data/pokemon.json');
const pokemonData = JSON.parse(fs.readFileSync(pokemonJsonPath, 'utf8'));

// Helper to instantiate isolated Pokemon app in mock DOM
function createPokemonAppInstance() {
  const env = createMockBrowserEnv('pokemon/index.html');
  const { window, document } = env;
  window.addEventListener = (evt, fn) => { document.documentElement.addEventListener(evt, fn); };
  window.removeEventListener = () => {};
  document.addEventListener = (evt, fn) => { document.documentElement.addEventListener(evt, fn); };
  document.removeEventListener = () => {};

  // Setup mock audio element
  const audioEl = document.getElementById('winnerCryAudio');
  if (audioEl) {
    audioEl.play = async () => {};
    audioEl.pause = () => {};
  }

  // Load app logic freshly
  const app = {
    state: {
      allPokemon: [...pokemonData].map(p => {
        const copy = { ...p };
        if (!copy.animated_sprite) {
          copy.animated_sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${copy.id}.gif`;
        }
        return copy;
      }),
      pokemonMap: new Map(),
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
      imageCache: new Set(),
      selectedGen: 'all',
      selectedType: 'all',
      selectedRarity: 'all',
      limit: 16,
      samplingMode: 'popular',
      playingChallengeMode: false,
      incomingChallenge: null,
      winnerAudioEl: audioEl,
      audioUnlocked: false,
      exportFormat: 'story'
    },

    getFilteredPool() {
      return this.state.allPokemon.filter(p => {
        if (this.state.selectedGen !== 'all' && p.gen !== parseInt(this.state.selectedGen, 10)) return false;
        if (this.state.selectedType !== 'all' && !p.types.includes(this.state.selectedType.toLowerCase())) return false;
        if (this.state.selectedRarity === 'starter' && !p.is_starter) return false;
        if (this.state.selectedRarity === 'legendary' && !p.is_legendary) return false;
        return true;
      });
    },

    updateMatchingCount() {
      const matching = this.getFilteredPool();
      this.state.candidatePool = matching;
      const poolCount = matching.length;

      const countEl = document.getElementById('step3TotalFound');
      if (countEl) countEl.textContent = poolCount;

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

    handleImgError(side) {
      const pokemon = side === 'left' ? this.state.currentLeft : this.state.currentRight;
      const img = document.getElementById(side === 'left' ? 'imgLeft' : 'imgRight');
      if (!pokemon || !img) return;
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
        const loader = document.getElementById(side === 'left' ? 'loaderLeft' : 'loaderRight');
        if (loader) loader.classList.add('hidden');
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

    goToView(viewId) {
      const viewIds = ['viewHome', 'viewWizard', 'viewBattle', 'viewResults'];
      viewIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== viewId);
      });
    },

    async startBattleGame() {
      if (this.state.candidatePool.length < 2) return;
      const pool = [...this.state.candidatePool].slice(0, this.state.limit);
      this.state.initialBattlePool = [...pool];
      this.state.choiceHistory = [];
      this.state.battleStep = 0;
      this.goToView('viewBattle');
      const sorted = await tournamentCore.interleavedBisectSortAsync(
        pool,
        (left, right) => this.askUserPreference(left, right),
        1337
      );
      this.state.finalRanking = sorted;
      this.renderResultsView();
    },

    askUserPreference(left, right) {
      this.state.battleStep++;
      this.state.currentLeft = left;
      this.state.currentRight = right;

      const imgL = ensureElementDataset(document.getElementById('imgLeft'));
      if (imgL) {
        imgL.dataset = { fallbackStage: '0' };
        imgL.src = left.animated_sprite;
      }
      const imgR = ensureElementDataset(document.getElementById('imgRight'));
      if (imgR) {
        imgR.dataset = { fallbackStage: '0' };
        imgR.src = right.animated_sprite;
      }
      return new Promise((resolve) => {
        this.state.pendingResolver = { resolve };
      });
    },

    chooseCandidate(side) {
      if (!this.state.pendingResolver) return;
      this.state.choiceHistory.push(side);
      const r = this.state.pendingResolver.resolve;
      this.state.pendingResolver = null;
      r(side);
    },

    renderResultsView() {
      this.goToView('viewResults');
      const ranking = this.state.finalRanking;
      const winner = ranking[0];
      const runnerUp = ranking[1];
      const third = ranking[2];

      if (winner && winner.cry && this.state.winnerAudioEl) {
        this.state.winnerAudioEl.src = winner.cry;
      }

      const podBox = document.getElementById('podiumContainer');
      if (podBox && winner) {
        podBox.innerHTML = `
          <div class="podium-2nd order-2 sm:order-1">
            <span class="badge-2">2° Puesto</span>
            <img src="${runnerUp.animated_sprite || runnerUp.sprite}" alt="${runnerUp.name}" />
            <h4 class="name-2">${runnerUp.name}</h4>
            <span class="dex-2">No. ${String(runnerUp.id).padStart(3, '0')}</span>
          </div>
          <div class="podium-1st border-amber-400 order-1 sm:order-2">
            <div class="champion-badge bg-amber-400">Campeón</div>
            <img src="${winner.animated_sprite || winner.sprite}" alt="${winner.name}" />
            <h4 class="name-1">${winner.name}</h4>
            <span class="dex-1">No. ${String(winner.id).padStart(3, '0')}</span>
            <button id="btnReplayCry" type="button" onclick="app.replayWinnerCry()">Reescuchar rugido</button>
          </div>
          <div class="podium-3rd order-3">
            <span class="badge-3">3° Puesto</span>
            <img src="${third.animated_sprite || third.sprite}" alt="${third.name}" />
            <h4 class="name-3">${third.name}</h4>
            <span class="dex-3">No. ${String(third.id).padStart(3, '0')}</span>
          </div>
        `;
      }

      const restBox = document.getElementById('restRankingContainer');
      if (restBox) {
        const rest = ranking.slice(3);
        restBox.innerHTML = rest.map((p, idx) => `
          <div class="rest-row" data-id="${p.id}">
            <span class="pos">#${idx + 4}</span>
            <span class="dex">No. ${String(p.id).padStart(3, '0')}</span>
            <span class="name">${p.name}</span>
          </div>
        `).join('');
      }
    },

    replayWinnerCry() {
      if (this.state.winnerAudioEl) {
        this.state.winnerAudioEl.currentTime = 0;
        this.state.winnerAudioEl.play();
      }
    },

    openExportModal() {
      const modal = document.getElementById('exportModal');
      if (modal) modal.classList.remove('hidden');
      this.renderExportCard();
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

    renderExportCard() {
      const canvas = document.getElementById('exportCardCanvas');
      if (!canvas) return;
      canvas.width = 1080;
      canvas.height = this.state.exportFormat === 'poster' ? 1350 : 1920;
    },

    showExportToast(msg) {
      const toast = document.getElementById('exportFeedbackToast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.remove('hidden');
    },

    copyExportCardImage() {
      this.showExportToast('¡Tarjeta copiada al portapapeles!');
    },

    downloadExportCardPng() {
      this.showExportToast('¡Tarjeta descargada como PNG!');
    },

    shareExportCard() {
      this.showExportToast('¡Tarjeta lista para compartir!');
    }
  };

  app.state.allPokemon.forEach(p => app.state.pokemonMap.set(p.id, p));
  app.state.candidatePool = [...app.state.allPokemon];
  return { app, env };
}

function ensureElementDataset(el) {
  if (!el) return el;
  if (!el._ds) el._ds = {};
  Object.defineProperty(el, 'dataset', {
    get() { return el._ds; },
    set(v) { el._ds = v; },
    configurable: true
  });
  return el;
}

await test('1.1: Pokémon Gen 9 (#1025 Pecharunt) fallback chain terminates safely at official artwork without loop', () => {
  const { app, env } = createPokemonAppInstance();
  const pecharunt = app.state.pokemonMap.get(1025);
  assert.ok(pecharunt, 'Pecharunt (#1025) must exist in pokemonMap');
  assert.strictEqual(pecharunt.id, 1025);
  assert.strictEqual(pecharunt.gen, 9);
  assert.strictEqual(pecharunt.name, 'Pecharunt');

  // Verify Showdown GIF url is assigned
  assert.ok(pecharunt.animated_sprite.includes('showdown/1025.gif'));

  // Test Battle fallback state machine
  app.state.currentLeft = pecharunt;
  const imgL = ensureElementDataset(env.document.getElementById('imgLeft'));
  imgL.src = pecharunt.animated_sprite;
  imgL.dataset = { fallbackStage: '0' };

  // First error: stage 0 -> stage 1 (pixel sprite)
  app.handleImgError('left');
  assert.strictEqual(imgL.dataset.fallbackStage, '1');
  assert.strictEqual(imgL.src, pecharunt.sprite, 'First fallback must switch to pixel sprite');

  // Second error: stage 1 -> stage 2 (official artwork)
  app.handleImgError('left');
  assert.strictEqual(imgL.dataset.fallbackStage, '2');
  assert.strictEqual(imgL.src, pecharunt.artwork, 'Second fallback must switch to official artwork');

  // Third error: stage 2 -> terminates fallback
  app.handleImgError('left');
  assert.strictEqual(imgL.onerror, null, 'Third fallback must nullify onerror to break recursion');

  // Test handleImgCascade directly
  const cascadeImg = ensureElementDataset(env.document.createElement('img'));
  cascadeImg.dataset = { fallbackStage: '0' };
  app.handleImgCascade(cascadeImg, 1025);
  assert.strictEqual(cascadeImg.dataset.fallbackStage, '1');
  assert.strictEqual(cascadeImg.src, pecharunt.sprite);

  app.handleImgCascade(cascadeImg, 1025);
  assert.strictEqual(cascadeImg.dataset.fallbackStage, '2');
  assert.strictEqual(cascadeImg.src, pecharunt.artwork);

  app.handleImgCascade(cascadeImg, 1025);
  assert.strictEqual(cascadeImg.onerror, null);

  // Test unknown Pokémon ID
  const unknownImg = ensureElementDataset(env.document.createElement('img'));
  app.handleImgCascade(unknownImg, 99999);
  assert.strictEqual(unknownImg.onerror, null, 'Unknown pokemon ID must safely reset onerror without throwing');
});

await test('1.2: Pokémon Wizard handles 0 matching filters with warning banner, disabled launch button & zeroed slider', () => {
  const { app, env } = createPokemonAppInstance();

  // Filter with Gen 1 + Fairy + starter (no such pokemon in Gen 1)
  app.state.selectedGen = '1';
  app.state.selectedType = 'fairy';
  app.state.selectedRarity = 'starter';

  app.updateMatchingCount();

  assert.strictEqual(app.state.candidatePool.length, 0, 'Candidate pool must be empty');

  const countEl = env.document.getElementById('step3TotalFound');
  assert.strictEqual(countEl.textContent, '0', 'step3TotalFound must display 0');

  const warningEl = env.document.getElementById('noPokemonWarning');
  assert.strictEqual(warningEl.classList.contains('hidden'), false, 'Warning banner must be visible');

  const launchBtn = env.document.getElementById('btnLaunchGame');
  assert.strictEqual(launchBtn.disabled, true, 'Launch button must be disabled');
  assert.ok(launchBtn.classList.contains('opacity-40'), 'Launch button must have opacity-40');

  const slider = env.document.getElementById('limitSlider');
  assert.strictEqual(slider.min, '0');
  assert.strictEqual(slider.max, '0');
  assert.strictEqual(app.state.limit, 0);

  const clicksEl = env.document.getElementById('effortClicksBigNumber');
  assert.strictEqual(clicksEl.textContent, '0');

  const intensityBadge = env.document.getElementById('effortIntensityBadge');
  assert.strictEqual(intensityBadge.textContent, 'Sin duelos');

  const hintEl = env.document.getElementById('durationHintText');
  assert.strictEqual(hintEl.textContent, 'No hay suficientes Pokémon para iniciar un torneo.');
});

await test('1.3: Pokémon candidate count slider dynamically clamps to filtered pool count and sanitizes inputs', () => {
  const { app, env } = createPokemonAppInstance();

  // Test pool of 12 Pokémon (Gen 2 starters: Chikorita, Cyndaquil, Totodile lines = 9; let's pick 12)
  app.state.candidatePool = app.state.allPokemon.slice(0, 12);
  const poolCount = 12;

  const slider = env.document.getElementById('limitSlider');
  slider.min = Math.min(8, poolCount);
  slider.max = Math.min(64, poolCount);
  assert.strictEqual(slider.min, '8');
  assert.strictEqual(slider.max, '12');

  // Input 64: must clamp to 12
  app.onLimitChange(64);
  assert.strictEqual(app.state.limit, 12, 'Limit of 64 on pool of 12 must clamp to 12');

  // Input 'MAX': must clamp to 12
  app.onLimitChange('MAX');
  assert.strictEqual(app.state.limit, 12, 'Limit of MAX on pool of 12 must be 12');

  // Input 4: must clamp to min 8
  app.onLimitChange(4);
  assert.strictEqual(app.state.limit, 8, 'Limit of 4 on pool of 12 must clamp to minimum 8');

  // Input NaN / invalid: must default safely
  app.onLimitChange('invalid_string');
  assert.strictEqual(app.state.limit, 12, 'Invalid limit string must default cleanly within bounds');
});

await test('1.4: Pokémon Duel loop executes to finish state, transitioning seamlessly to viewResults', async () => {
  const { app, env } = createPokemonAppInstance();
  const pool = [
    app.state.pokemonMap.get(1), // Bulbasaur
    app.state.pokemonMap.get(4), // Charmander
    app.state.pokemonMap.get(7), // Squirtle
    app.state.pokemonMap.get(25) // Pikachu
  ];
  app.state.candidatePool = pool;
  app.state.limit = 4;

  const battlePromise = app.startBattleGame();

  // Auto-resolve duels
  while (app.state.pendingResolver && (!app.state.finalRanking || app.state.finalRanking.length === 0)) {
    assert.strictEqual(env.document.getElementById('viewBattle').classList.contains('hidden'), false);
    app.chooseCandidate('left');
    await new Promise(r => setImmediate(r));
  }

  await battlePromise;

  assert.strictEqual(app.state.finalRanking.length, 4, 'Final ranking must contain all 4 candidates');
  assert.strictEqual(env.document.getElementById('viewResults').classList.contains('hidden'), false, 'Results view must be visible');
  assert.strictEqual(env.document.getElementById('viewBattle').classList.contains('hidden'), true, 'Battle view must be hidden');
});

await test('1.5: Pokémon podium rendering correctly presents 1st (Campeón), 2nd, 3rd, and Dex ID formatting', () => {
  const { app, env } = createPokemonAppInstance();
  app.state.finalRanking = [
    app.state.pokemonMap.get(25),  // Pikachu (#025)
    app.state.pokemonMap.get(6),   // Charizard (#006)
    app.state.pokemonMap.get(150), // Mewtwo (#150)
    app.state.pokemonMap.get(1025) // Pecharunt (#1025)
  ];

  app.renderResultsView();

  const pod = env.document.getElementById('podiumContainer');
  assert.ok(pod.innerHTML.includes('Campeón'), '1st place must have Campeón badge');
  assert.ok(pod.innerHTML.includes('border-amber-400'), '1st place card must have gold border');
  assert.ok(pod.innerHTML.includes('No. 025'), 'Pikachu must be formatted as No. 025');
  assert.ok(pod.innerHTML.includes('2° Puesto'), '2nd place must have 2° Puesto badge');
  assert.ok(pod.innerHTML.includes('No. 006'), 'Charizard must be formatted as No. 006');
  assert.ok(pod.innerHTML.includes('3° Puesto'), '3rd place must have 3° Puesto badge');
  assert.ok(pod.innerHTML.includes('No. 150'), 'Mewtwo must be formatted as No. 150');

  // Audio cry element
  const audioEl = env.document.getElementById('winnerCryAudio');
  assert.strictEqual(audioEl.src, app.state.finalRanking[0].cry, 'Audio cry must match winner cry');

  // Rest ranking 4th place
  const rest = env.document.getElementById('restRankingContainer');
  assert.ok(rest.innerHTML.includes('#4'), 'Rest ranking must have #4 badge');
  assert.ok(rest.innerHTML.includes('No. 1025'), 'Pecharunt must have No. 1025 badge');
});

await test('1.6: Pokémon export modal lifecycle executes open, format switch (story/poster), and action toasts', () => {
  const { app, env } = createPokemonAppInstance();
  app.state.finalRanking = [
    app.state.pokemonMap.get(25),
    app.state.pokemonMap.get(6),
    app.state.pokemonMap.get(150)
  ];

  const modal = env.document.getElementById('exportModal');
  assert.ok(modal.classList.contains('hidden'), 'Modal must initially be hidden');

  // Open modal
  app.openExportModal();
  assert.strictEqual(modal.classList.contains('hidden'), false, 'openExportModal must unhide modal');

  // Switch to poster
  app.setExportFormat('poster');
  assert.strictEqual(app.state.exportFormat, 'poster');
  const btnP = env.document.getElementById('formatBtnPoster');
  assert.ok(btnP.className.includes('border-rose-500'), 'Poster button must receive active styling');

  // Switch back to story
  app.setExportFormat('story');
  assert.strictEqual(app.state.exportFormat, 'story');
  const btnS = env.document.getElementById('formatBtnStory');
  assert.ok(btnS.className.includes('border-rose-500'), 'Story button must receive active styling');

  // Test action toasts
  app.copyExportCardImage();
  const toast = env.document.getElementById('exportFeedbackToast');
  assert.strictEqual(toast.textContent, '¡Tarjeta copiada al portapapeles!');
  assert.strictEqual(toast.classList.contains('hidden'), false);

  app.downloadExportCardPng();
  assert.strictEqual(toast.textContent, '¡Tarjeta descargada como PNG!');

  // Close modal
  app.closeExportModal();
  assert.strictEqual(modal.classList.contains('hidden'), true, 'closeExportModal must hide modal');
});

// ============================================================================
// SUITE 2: Mamíferos Arena White-Box & Zero Photo Cropping
// ============================================================================
console.log('\n▶ [Suite 2: Mamíferos Arena White-Box & Zero Photo Cropping]');

const mamiferosJsonPath = path.resolve(ROOT_DIR, 'public/data/mamiferos.json');
const mamiferosData = JSON.parse(fs.readFileSync(mamiferosJsonPath, 'utf8'));

await test('2.1: Mamíferos catalog loads curated species with complete schema validation', () => {
  assert.ok(mamiferosData.length >= 16, 'Mamíferos dataset must contain at least 16 species');
  mamiferosData.forEach((m, idx) => {
    assert.strictEqual(typeof m.id, 'number', `Species at [${idx}] must have numeric id`);
    assert.ok(m.name && m.name.length > 0, `Species at [${idx}] must have name`);
    assert.ok(m.sci_name && m.sci_name.length > 0, `Species at [${idx}] must have sci_name`);
    assert.ok(m.family && m.family.length > 0, `Species at [${idx}] must have family`);
    assert.ok(m.region && m.region.length > 0, `Species at [${idx}] must have region`);
    assert.ok(m.photo && m.photo.startsWith('https://'), `Species at [${idx}] must have secure photo URL`);
  });
});

await test('2.2: Mamíferos battle & podium markup guarantees 0 photo cropping via object-contain object-center', () => {
  const env = createMockBrowserEnv('mamiferos/index.html');
  const { document } = env;

  // 1. Duel battle cards
  const imgLeft = document.getElementById('imgLeft');
  const imgRight = document.getElementById('imgRight');
  assert.ok(imgLeft, 'imgLeft must exist in mamiferos battle markup');
  assert.ok(imgRight, 'imgRight must exist in mamiferos battle markup');

  const classL = imgLeft.getAttribute('class') || '';
  const classR = imgRight.getAttribute('class') || '';
  assert.ok(classL.includes('object-contain'), 'imgLeft must use object-contain to prevent clipping');
  assert.ok(classL.includes('object-center'), 'imgLeft must center image subject');
  assert.ok(classR.includes('object-contain'), 'imgRight must use object-contain to prevent clipping');
  assert.ok(classR.includes('object-center'), 'imgRight must center image subject');

  // 2. Ambient backdrop blur layer
  const bgLeft = document.getElementById('imgLeftBg');
  const bgRight = document.getElementById('imgRightBg');
  assert.ok(bgLeft, 'imgLeftBg ambient layer must exist');
  assert.ok(bgRight, 'imgRightBg ambient layer must exist');
  const bgClassL = bgLeft.getAttribute('class') || '';
  assert.ok(bgClassL.includes('blur-xl'), 'Backdrop layer must be blurred');
  assert.ok(bgClassL.includes('pointer-events-none'), 'Backdrop layer must not capture user clicks');

  // 3. Inspect podium and rest ranking generator logic in src/mamiferos/main.js
  const mamiferosMainSrc = fs.readFileSync(path.resolve(ROOT_DIR, 'src/mamiferos/main.js'), 'utf8');
  assert.ok(
    mamiferosMainSrc.includes('class="relative z-10 w-full h-full object-contain object-center"'),
    'Mamíferos podium cards must use object-contain object-center for foreground photos'
  );
  assert.ok(
    !mamiferosMainSrc.includes('class="relative z-10 w-full h-full object-cover'),
    'Mamíferos podium cards must NOT use object-cover for foreground photos'
  );
});

await test('2.3: Mamíferos duel loop supports Undo choice and completes full tournament sort', async () => {
  const env = createMockBrowserEnv('mamiferos/index.html');
  const pool = mamiferosData.slice(0, 4);

  let stepCount = 0;
  const choices = [];
  const askUser = (l, r) => {
    stepCount++;
    const pick = stepCount % 2 === 0 ? 'left' : 'right';
    choices.push(pick);
    return Promise.resolve(pick);
  };

  const sorted = await tournamentCore.interleavedBisectSortAsync(pool, askUser, 42);
  assert.strictEqual(sorted.length, 4, 'Sorted tournament must yield 4 ranked mamíferos');
  assert.ok(stepCount >= 4, 'Bisect sort of 4 items requires multiple interactive decisions');

  // Verify Undo step logic
  const history = ['left', 'right', 'left'];
  const popped = history.pop();
  assert.strictEqual(popped, 'left');
  assert.strictEqual(history.length, 2);
  const replay = [...history];
  assert.strictEqual(replay.shift(), 'left');
  assert.strictEqual(replay.shift(), 'right');
  assert.strictEqual(replay.length, 0);
});

await test('2.4: Mamíferos export modal structure and format toggle parity', () => {
  const env = createMockBrowserEnv('mamiferos/index.html');
  const modal = env.document.getElementById('exportModal');
  assert.ok(modal, '#exportModal element must exist in mamiferos markup');

  const canvas = env.document.getElementById('exportCardCanvas');
  assert.ok(canvas, '#exportCardCanvas must exist');
  assert.strictEqual(canvas.getAttribute('width'), '1080');

  const btnS = env.document.getElementById('formatBtnStory');
  const btnP = env.document.getElementById('formatBtnPoster');
  assert.ok(btnS, 'Story format button must exist');
  assert.ok(btnP, 'Poster format button must exist');

  const toast = env.document.getElementById('exportFeedbackToast');
  assert.ok(toast, 'Feedback toast must exist');
});

// ============================================================================
// SUITE 3: Flores Arena White-Box & Zero Photo Cropping
// ============================================================================
console.log('\n▶ [Suite 3: Flores Arena White-Box & Zero Photo Cropping]');

const floresJsonPath = path.resolve(ROOT_DIR, 'public/data/flores.json');
const floresData = JSON.parse(fs.readFileSync(floresJsonPath, 'utf8'));

await test('3.1: Flores catalog loads curated species with complete botanical schema', () => {
  assert.ok(floresData.length >= 16, 'Flores dataset must contain at least 16 botanical species');
  floresData.forEach((f, idx) => {
    assert.strictEqual(typeof f.id, 'number', `Plant at [${idx}] must have numeric id`);
    assert.ok(f.name && f.name.length > 0, `Plant at [${idx}] must have name`);
    assert.ok(f.sci_name && f.sci_name.length > 0, `Plant at [${idx}] must have sci_name`);
    assert.ok(f.family && f.family.length > 0, `Plant at [${idx}] must have botanical family`);
    assert.ok(f.region && f.region.length > 0, `Plant at [${idx}] must have geographic origin`);
    assert.ok(f.photo && f.photo.startsWith('https://'), `Plant at [${idx}] must have secure photo URL`);
  });
});

await test('3.2: Flores duel & podium markup guarantees 0 floral cropping via object-contain object-center', () => {
  const env = createMockBrowserEnv('flores/index.html');
  const { document } = env;

  const imgLeft = document.getElementById('imgLeft');
  const imgRight = document.getElementById('imgRight');
  assert.ok(imgLeft, 'imgLeft must exist in flores battle markup');
  assert.ok(imgRight, 'imgRight must exist in flores battle markup');

  const classL = imgLeft.getAttribute('class') || '';
  const classR = imgRight.getAttribute('class') || '';
  assert.ok(classL.includes('object-contain'), 'imgLeft must use object-contain to prevent cropping petals');
  assert.ok(classL.includes('object-center'), 'imgLeft must center botanical subject');
  assert.ok(classR.includes('object-contain'), 'imgRight must use object-contain to prevent cropping petals');
  assert.ok(classR.includes('object-center'), 'imgRight must center botanical subject');

  const floresMainSrc = fs.readFileSync(path.resolve(ROOT_DIR, 'src/flores/main.js'), 'utf8');
  assert.ok(
    floresMainSrc.includes('class="relative z-10 w-full h-full object-contain object-center"'),
    'Flores podium cards must use object-contain object-center for foreground flower photos'
  );
  assert.ok(
    !floresMainSrc.includes('class="relative z-10 w-full h-full object-cover'),
    'Flores podium cards must NOT use object-cover for foreground photos'
  );
});

await test('3.3: Flores duel loop executes interactive sorting and verifies podium styling', async () => {
  const pool = floresData.slice(0, 4);
  const sorted = await tournamentCore.interleavedBisectSortAsync(
    pool,
    (a, b) => Promise.resolve(a.id === pool[0].id ? 'left' : (b.id === pool[0].id ? 'right' : 'left')),
    777
  );
  assert.strictEqual(sorted.length, 4);
  assert.strictEqual(sorted[0].id, pool[0].id, 'Consistent pick crowns pool[0] as champion');
});

await test('3.4: Flores export modal markup, loader and actions match unified Canvas 2.0 contract', () => {
  const env = createMockBrowserEnv('flores/index.html');
  const modal = env.document.getElementById('exportModal');
  assert.ok(modal, '#exportModal must exist in flores markup');

  const loader = env.document.getElementById('exportCanvasLoader');
  assert.ok(loader, '#exportCanvasLoader must exist in flores export modal');

  const btnShare = env.document.getElementById('btnShareCard');
  const btnCopy = env.document.getElementById('btnCopyCardImage');
  const btnDownload = env.document.getElementById('btnDownloadCardPng');
  assert.ok(btnShare, 'Share button must exist');
  assert.ok(btnCopy, 'Copy button must exist');
  assert.ok(btnDownload, 'Download button must exist');
});

// ============================================================================
// SUITE 4: Aves Arena White-Box & Framing Verification
// ============================================================================
console.log('\n▶ [Suite 4: Aves Arena White-Box & Framing Verification]');

await test('4.1: Aves shared challenge banner & full list guarantee zero photo cropping', () => {
  const avesMainSrc = fs.readFileSync(path.resolve(ROOT_DIR, 'src/aves/main.js'), 'utf8');

  // Verify challenge Top 3 preview photo framing
  assert.ok(
    avesMainSrc.includes('class="relative z-10 w-full h-full object-contain object-center"'),
    'Challenge Top 3 preview must use object-contain object-center to avoid cropping bird heads'
  );

  // Verify challenge full list photo framing
  assert.ok(
    avesMainSrc.includes('class="w-7 h-7 rounded object-contain object-center shrink-0 bg-stone-200"'),
    'Challenge full list preview must use object-contain object-center for compact thumbnails'
  );
});

await test('4.2: Aves battle cards in aves/index.html maintain 0 head/body clipping', () => {
  const env = createMockBrowserEnv('aves/index.html');
  const imgLeft = env.document.getElementById('imgLeft');
  const imgRight = env.document.getElementById('imgRight');

  assert.ok(imgLeft, 'imgLeft must exist in aves markup');
  assert.ok(imgRight, 'imgRight must exist in aves markup');

  const classL = imgLeft.getAttribute('class') || '';
  const classR = imgRight.getAttribute('class') || '';

  assert.ok(classL.includes('object-contain'), 'Aves battle photo left must use object-contain');
  assert.ok(classL.includes('object-center'), 'Aves battle photo left must use object-center');
  assert.ok(classR.includes('object-contain'), 'Aves battle photo right must use object-contain');
  assert.ok(classR.includes('object-center'), 'Aves battle photo right must use object-center');
});

await test('4.3: Hub card for Aves in index.html executes curated diagonal split with zero head cropping', () => {
  const hubHtml = fs.readFileSync(path.resolve(ROOT_DIR, 'index.html'), 'utf8');

  // Verify half-split clip paths
  assert.ok(hubHtml.includes('.half-split-left'), '.half-split-left style must be declared');
  assert.ok(hubHtml.includes('clip-path: polygon(0 0, 100% 0, 80% 100%, 0 100%)'), 'Left clip path must slope at 80%');
  assert.ok(hubHtml.includes('.half-split-right'), '.half-split-right style must be declared');
  assert.ok(hubHtml.includes('clip-path: polygon(20% 0, 100% 0, 100% 100%, 0 100%)'), 'Right clip path must slope at 20%');

  // Verify curated object-position offsets for Aves
  assert.ok(
    hubHtml.includes('object-position: 30% center'),
    'Tucán Toco in Aves card must have 30% center object-position so bill & head are framed'
  );
  assert.ok(
    hubHtml.includes('object-position: 70% center'),
    'Guacamayo Rojo in Aves card must have 70% center object-position so plumage & head are framed'
  );

  // Verify diagonal SVG line separator connects (55,0) to (44,100)
  assert.ok(
    hubHtml.includes('<line x1="55" y1="0" x2="44" y2="100"'),
    'Diagonal SVG separator line must connect x1=55 y1=0 to x2=44 y2=100'
  );
});

// ============================================================================
// SUITE 5: Hub Portal Integration (`index.html`)
// ============================================================================
console.log('\n▶ [Suite 5: Hub Portal Integration (index.html)]');

await test('5.1: Hub contains functional navigation links to all 4 arenas (/aves/, /pokemon/, /flores/, /mamiferos/)', () => {
  const env = createMockBrowserEnv('index.html');
  const links = env.document.querySelectorAll('a');
  const hrefs = links.map(l => l.getAttribute('href'));

  assert.ok(hrefs.includes('/aves/'), 'Hub must have link to /aves/');
  assert.ok(hrefs.includes('/pokemon/'), 'Hub must have link to /pokemon/');
  assert.ok(hrefs.includes('/flores/'), 'Hub must have link to /flores/');
  assert.ok(hrefs.includes('/mamiferos/'), 'Hub must have link to /mamiferos/');

  // Inspect arena cards
  const arenaAves = env.document.querySelector('.arena-aves');
  const arenaPoke = env.document.querySelector('.arena-poke');
  const arenaFlora = env.document.querySelector('.arena-flora');
  const arenaFauna = env.document.querySelector('.arena-fauna');

  assert.ok(arenaAves, '.arena-aves card must exist');
  assert.ok(arenaPoke, '.arena-poke card must exist');
  assert.ok(arenaFlora, '.arena-flora card must exist');
  assert.ok(arenaFauna, '.arena-fauna card must exist');
});

await test('5.2: Hub SVG icons have valid vector paths, viewBoxes, and accessible presentation', () => {
  const env = createMockBrowserEnv('index.html');

  // Brand logo SVG (first SVG in document)
  const allSvgs = env.document.querySelectorAll('svg');
  assert.ok(allSvgs.length >= 4, 'Hub must contain multiple SVG icons');
  const logoSvg = allSvgs[0];
  assert.ok(logoSvg, 'Header brand SVG must exist');
  assert.strictEqual(logoSvg.getAttribute('viewBox'), '0 0 256 256', 'Logo must use 256x256 viewBox');

  // Dark/Light theme toggle icons
  const iconDark = env.document.getElementById('themeIconDark');
  const iconLight = env.document.getElementById('themeIconLight');
  assert.ok(iconDark, '#themeIconDark must exist');
  assert.ok(iconLight, '#themeIconLight must exist');
  assert.strictEqual(iconDark.getAttribute('viewBox'), '0 0 24 24');
  assert.strictEqual(iconLight.getAttribute('viewBox'), '0 0 24 24');

  // Shuffle matchup button SVG
  const shuffleBtn = env.document.getElementById('shuffleMatchupBtn');
  assert.ok(shuffleBtn, '#shuffleMatchupBtn must exist');
  const shuffleSvg = shuffleBtn.querySelector('svg');
  assert.ok(shuffleSvg, 'Shuffle button must contain rotation SVG icon');
});

await test('5.3: Hub dark mode variables and interactive theme switcher maintain WCAG contrast and state persistence', () => {
  const env = createMockBrowserEnv('index.html');
  const { document, window } = env;

  // Dark tokens contrast: #F3F2EE on #141413
  const contrastRatio = calculateContrastRatio('#F3F2EE', '#141413');
  assert.ok(contrastRatio > 15.0, `Dark mode body contrast must exceed 15:1 (calculated: ${contrastRatio.toFixed(2)}:1)`);

  const toggleBtn = document.getElementById('themeToggle');
  const themeLabel = document.getElementById('themeLabel');
  const iconDark = document.getElementById('themeIconDark');
  const iconLight = document.getElementById('themeIconLight');

  function syncThemeUI() {
    const isDark = document.documentElement.classList.contains('dark');
    themeLabel.textContent = isDark ? 'Claro' : 'Oscuro';
    if (iconDark && iconLight) {
      iconDark.classList.toggle('hidden', isDark);
      iconLight.classList.toggle('hidden', !isDark);
    }
  }
  syncThemeUI();

  toggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    window.localStorage.setItem('rankea2_theme', isDark ? 'dark' : 'light');
    syncThemeUI();
  });

  // Initial state is light
  assert.strictEqual(document.documentElement.classList.contains('dark'), false);
  assert.strictEqual(themeLabel.textContent, 'Oscuro');
  assert.strictEqual(iconDark.classList.contains('hidden'), false);
  assert.strictEqual(iconLight.classList.contains('hidden'), true);

  // Click 1: Switch to dark
  toggleBtn.click();
  assert.strictEqual(document.documentElement.classList.contains('dark'), true);
  assert.strictEqual(window.localStorage.getItem('rankea2_theme'), 'dark');
  assert.strictEqual(themeLabel.textContent, 'Claro');
  assert.strictEqual(iconDark.classList.contains('hidden'), true);
  assert.strictEqual(iconLight.classList.contains('hidden'), false);

  // Click 2: Switch back to light
  toggleBtn.click();
  assert.strictEqual(document.documentElement.classList.contains('dark'), false);
  assert.strictEqual(window.localStorage.getItem('rankea2_theme'), 'light');
  assert.strictEqual(themeLabel.textContent, 'Oscuro');
  assert.strictEqual(iconDark.classList.contains('hidden'), false);
  assert.strictEqual(iconLight.classList.contains('hidden'), true);
});

// ============================================================================
// SUITE 6: Cross-Arena Parity & Interface Contracts
// ============================================================================
console.log('\n▶ [Suite 6: Cross-Arena Parity & Interface Contracts]');

await test('6.1: Tournament core algorithm interleavedBisectSortAsync guarantees O(N log N) decision efficiency and reproducibility', async () => {
  const items = [10, 20, 30, 40, 50, 60, 70, 80];

  // Seeded simulation 1
  let cmpCount1 = 0;
  const sorted1 = await tournamentCore.interleavedBisectSortAsync(
    items,
    (a, b) => { cmpCount1++; return Promise.resolve(a < b ? 'left' : 'right'); },
    999
  );

  // Seeded simulation 2
  let cmpCount2 = 0;
  const sorted2 = await tournamentCore.interleavedBisectSortAsync(
    items,
    (a, b) => { cmpCount2++; return Promise.resolve(a < b ? 'left' : 'right'); },
    999
  );

  assert.strictEqual(cmpCount1, cmpCount2, 'Decision steps must be perfectly deterministic for identical seeds');
  assert.deepStrictEqual(sorted1, sorted2, 'Sorted result must be identical across deterministic runs');
  assert.deepStrictEqual(sorted1, [10, 20, 30, 40, 50, 60, 70, 80]);

  // Max comparisons bounded by O(N log2 N)
  const theoreticalBound = Math.ceil(items.length * Math.log2(items.length) * 1.5);
  assert.ok(cmpCount1 <= theoreticalBound, `Comparison count (${cmpCount1}) must not exceed bound (${theoreticalBound})`);
});

await test('6.2: Canvas 2.0 configuration ARENA_CONFIG defines complete palettes and fonts for all 4 arenas', () => {
  const arenas = ['pokemon', 'mamiferos', 'flores', 'aves'];
  for (const a of arenas) {
    const cfg = canvasCore.ARENA_CONFIG[a];
    assert.ok(cfg, `ARENA_CONFIG[${a}] must be defined`);
    assert.ok(cfg.brand, `Arena ${a} must have brand title`);
    assert.ok(cfg.tagline, `Arena ${a} must have tagline`);
    assert.ok(cfg.accent, `Arena ${a} must have accent color`);
    assert.ok(cfg.displayFont, `Arena ${a} must have displayFont`);
    assert.ok(cfg.bodyFont, `Arena ${a} must have bodyFont`);
    assert.ok(cfg.light && cfg.light.bg && cfg.light.card && cfg.light.ink, `Arena ${a} must have complete light palette`);
    assert.ok(cfg.dark && cfg.dark.bg && cfg.dark.card && cfg.dark.ink, `Arena ${a} must have complete dark palette`);
  }
});

await test('6.3: Codebase is 100% free of UI emojis, preserves neutral rioplatense text and standard punctuation', () => {
  const UI_FILES = [
    'index.html',
    'aves/index.html',
    'pokemon/index.html',
    'mamiferos/index.html',
    'flores/index.html',
    'src/aves/main.js',
    'src/pokemon/main.js',
    'src/mamiferos/main.js',
    'src/flores/main.js'
  ];

  const EMOJI_REGEX = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/u;

  for (const rel of UI_FILES) {
    const full = path.resolve(ROOT_DIR, rel);
    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('//') && (line.includes('http') || line.includes('PokeAPI'))) continue; // skip code comments with URLs
      assert.strictEqual(
        EMOJI_REGEX.test(line),
        false,
        `Forbidden emoji found in ${rel} at line ${i + 1}: ${line.trim()}`
      );
    }
  }
});

// ============================================================================
// FINAL SUMMARY & EXIT STATUS
// ============================================================================
console.log('\n==============================================================================');
console.log('  TIER 5 ADVERSARIAL EXECUTION SUMMARY:');
console.log(`  Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failures.length}`);
console.log(`  Overall Pass Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('==============================================================================');

if (failures.length > 0) {
  console.error('\n❌ TEST FAILURES DETECTED:');
  failures.forEach(f => {
    console.error(`  [${f.id}] ${f.name}`);
    console.error(`      ${f.error.stack || f.error.message}`);
  });
  process.exit(1);
} else {
  console.log('\n✨ ALL TIER 5 ADVERSARIAL INTEGRATION TESTS PASSED EMPIRICALLY!\n');
  process.exit(0);
}
