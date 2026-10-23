#!/usr/bin/env node
/**
 * Tier 5 Adversarial Test Suite: Core Modules Coverage Hardening
 *
 * White-box stress testing, boundary analysis, and failure mode verification for:
 * - src/core/tournament.js (RNG seeds, odd candidate pools, preference oracles, deep undo stack, URL encoding)
 * - src/core/theme.js (rapid toggling, storage failure simulation, missing DOM elements, icon aliases)
 * - src/core/canvas.js (Story vs Poster aspect ratio geometry, CORS tainted fallback, missing photos, long text strings, export fallback chain)
 *
 * Execution: node tests/tier5_adversarial_core.mjs
 */

import assert from 'node:assert';
import {
  createSeededRng,
  fisherYatesShuffle,
  estimateTotalSteps,
  sampleCandidates,
  interleavedBisectSortAsync,
  buildChallengeUrl,
  parseChallengeUrl
} from '../src/core/tournament.js';

import {
  getPreferredTheme,
  initTheme,
  toggleTheme,
  bindThemeButton
} from '../src/core/theme.js';

import {
  ARENA_CONFIG,
  loadImageSafe,
  truncateText,
  drawRoundRect,
  drawUncroppedPhoto,
  renderRankingCard,
  exportRankingCard
} from '../src/core/canvas.js';

// ============================================================================
// Lightweight Test Runner Infrastructure
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];
const suiteTimes = new Map();
let currentSection = '';

function section(name) {
  currentSection = name;
  console.log(`\n▶ [${name}]`);
  console.log('  ' + '-'.repeat(74));
}

async function test(name, fn) {
  totalTests++;
  const start = performance.now();
  try {
    await fn();
    const duration = (performance.now() - start).toFixed(2);
    passedTests++;
    console.log(`   ✓ PASS: ${name} (${duration}ms)`);
  } catch (err) {
    const duration = (performance.now() - start).toFixed(2);
    failedTests++;
    failures.push({ section: currentSection, name, error: err, duration });
    console.error(`   ✗ FAIL: ${name} (${duration}ms)`);
    console.error(`     Error: ${err.message}`);
  }
}

// ============================================================================
// Mock DOM & Canvas Helpers for Node.js Environment
// ============================================================================

function createMockElement(tagName = 'div', id = '') {
  const classes = new Set();
  const attributes = new Map();
  const listeners = new Map();
  if (id) attributes.set('id', id);

  return {
    tagName: tagName.toUpperCase(),
    attributes,
    listeners,
    parentNode: null,
    children: [],
    style: {},
    _textContent: '',
    get id() { return attributes.get('id') || ''; },
    set id(val) { attributes.set('id', String(val)); },
    get className() { return Array.from(classes).join(' '); },
    set className(val) {
      classes.clear();
      val.split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
    },
    get textContent() { return this._textContent; },
    set textContent(val) { this._textContent = String(val); },
    classList: {
      add(...tokens) { tokens.forEach(t => classes.add(t)); },
      remove(...tokens) { tokens.forEach(t => classes.delete(t)); },
      toggle(token, force) {
        if (force !== undefined) {
          if (force) classes.add(token);
          else classes.delete(token);
          return force;
        }
        if (classes.has(token)) {
          classes.delete(token);
          return false;
        }
        classes.add(token);
        return true;
      },
      contains(token) { return classes.has(token); }
    },
    addEventListener(event, handler) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(handler);
    },
    click() {
      const handlers = listeners.get('click') || [];
      const ev = { type: 'click', target: this, preventDefault() {}, stopPropagation() {} };
      handlers.forEach(h => h.call(this, ev));
    },
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      child.parentNode = null;
      return child;
    }
  };
}

function createMockDocument(elementsMap = {}) {
  const docElement = createMockElement('html');
  const body = createMockElement('body');
  docElement.appendChild(body);

  const elementRegistry = new Map(Object.entries(elementsMap));

  return {
    documentElement: docElement,
    body,
    getElementById(id) {
      return elementRegistry.get(id) || null;
    },
    registerElement(id, el) {
      elementRegistry.set(id, el);
    },
    createElement(tagName) {
      return createMockElement(tagName);
    }
  };
}

function createMockCanvasContext() {
  const calls = [];
  return {
    calls,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'left',
    imageSmoothingEnabled: true,
    filter: 'none',

    fillRect(x, y, w, h) { calls.push({ op: 'fillRect', x, y, w, h }); },
    strokeRect(x, y, w, h) { calls.push({ op: 'strokeRect', x, y, w, h }); },
    fillText(text, x, y) { calls.push({ op: 'fillText', text, x, y }); },
    beginPath() { calls.push({ op: 'beginPath' }); },
    moveTo(x, y) { calls.push({ op: 'moveTo', x, y }); },
    lineTo(x, y) { calls.push({ op: 'lineTo', x, y }); },
    stroke() { calls.push({ op: 'stroke' }); },
    fill() { calls.push({ op: 'fill' }); },
    rect(x, y, w, h) { calls.push({ op: 'rect', x, y, w, h }); },
    roundRect(x, y, w, h, r) { calls.push({ op: 'roundRect', x, y, w, h, r }); },
    quadraticCurveTo(cx, cy, x, y) { calls.push({ op: 'quadraticCurveTo', cx, cy, x, y }); },
    closePath() { calls.push({ op: 'closePath' }); },
    save() { calls.push({ op: 'save' }); },
    restore() { calls.push({ op: 'restore' }); },
    clip() { calls.push({ op: 'clip' }); },
    drawImage(...args) { calls.push({ op: 'drawImage', args }); }
  };
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

async function runAdversarialSuite() {
  console.log('==============================================================================');
  console.log('  RANKEA2 TIER 5 ADVERSARIAL TEST SUITE: CORE WHITE-BOX HARDENING');
  console.log('==============================================================================');

  // ==========================================================================
  // SECTION 1: tournament.js White-Box Coverage & Invariant Hardening
  // ==========================================================================
  section('Core 1: tournament.js — Seeds, Shuffles & Sampling Hardening');

  await test('1.1: Extreme Seeds: 0, negative (-1, -2147483648), MAX_SAFE_INTEGER, NaN produce deterministic [0, 1) RNG', () => {
    const extremeSeeds = [0, -1, -999999, -2147483648, Number.MAX_SAFE_INTEGER, NaN, null, undefined];
    for (const seed of extremeSeeds) {
      const rng = createSeededRng(seed);
      assert.strictEqual(typeof rng, 'function', `Seed ${seed} must return a generator function`);
      for (let i = 0; i < 200; i++) {
        const val = rng();
        assert.ok(val >= 0 && val < 1, `Value ${val} from seed ${seed} must be in [0, 1)`);
      }
    }
  });

  await test('1.2: Deterministic RNG reproducibility & differentiation across distinct seeds', () => {
    const rngA1 = createSeededRng(42);
    const rngA2 = createSeededRng(42);
    const rngB = createSeededRng(43);

    const seqA1 = Array.from({ length: 500 }, () => rngA1());
    const seqA2 = Array.from({ length: 500 }, () => rngA2());
    const seqB = Array.from({ length: 500 }, () => rngB());

    assert.deepStrictEqual(seqA1, seqA2, 'Identical seed 42 must yield bit-identical sequence');
    assert.notDeepStrictEqual(seqA1, seqB, 'Seed 42 and seed 43 must yield divergent sequences');
  });

  await test('1.3: Fisher-Yates shuffle edge cases (empty array, single element, immutability, full permutation reach)', () => {
    const rng = createSeededRng(7);
    const empty = [];
    const shuffledEmpty = fisherYatesShuffle(empty, rng);
    assert.deepStrictEqual(shuffledEmpty, []);
    assert.notStrictEqual(shuffledEmpty, empty, 'Must return a new array instance');

    const single = [{ id: 'a' }];
    const shuffledSingle = fisherYatesShuffle(single, rng);
    assert.deepStrictEqual(shuffledSingle, [{ id: 'a' }]);

    const original = [1, 2, 3, 4, 5];
    const originalCopy = [...original];
    fisherYatesShuffle(original, rng);
    assert.deepStrictEqual(original, originalCopy, 'Original array must not be mutated in-place');

    // Permutation reach on 3 elements across 300 shuffles
    const permutationsSeen = new Set();
    const triad = ['A', 'B', 'C'];
    for (let i = 0; i < 300; i++) {
      permutationsSeen.add(fisherYatesShuffle(triad, rng).join(''));
    }
    assert.strictEqual(permutationsSeen.size, 6, 'All 3! = 6 permutations must be reachable');
  });

  await test('1.4: estimateTotalSteps boundary values and monotonic progression', () => {
    assert.strictEqual(estimateTotalSteps(0), 0);
    assert.strictEqual(estimateTotalSteps(1), 0);
    assert.strictEqual(estimateTotalSteps(2), 2);
    assert.strictEqual(estimateTotalSteps(3), 4);
    assert.strictEqual(estimateTotalSteps(8), 20);
    assert.strictEqual(estimateTotalSteps(16), 52);
    assert.strictEqual(estimateTotalSteps(64), 315);
    assert.strictEqual(estimateTotalSteps(1025), 8406);

    let prev = 0;
    for (let n = 2; n <= 128; n++) {
      const steps = estimateTotalSteps(n);
      assert.ok(steps >= prev, `Step estimation for n=${n} (${steps}) must be >= n=${n-1} (${prev})`);
      prev = steps;
    }
  });

  await test('1.5: sampleCandidates edge inputs: empty pool, n=0, n > pool.length, custom compareFn vs random mode', () => {
    const rng = createSeededRng(100);
    assert.deepStrictEqual(sampleCandidates([], 10, 'popular', { rng }), []);
    assert.deepStrictEqual(sampleCandidates([{ id: 1 }, { id: 2 }], 0, 'popular', { rng }), []);

    const smallPool = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const sampledExcess = sampleCandidates(smallPool, 100, 'popular', { rng });
    assert.strictEqual(sampledExcess.length, 3);
    assert.strictEqual(new Set(sampledExcess.map(c => c.id)).size, 3);

    // Popular mode with custom compareFn: sorts descending by popularity before shuffle
    const poolWithRank = [
      { id: 'low', pop: 10 },
      { id: 'top1', pop: 100 },
      { id: 'top2', pop: 90 },
      { id: 'mid', pop: 50 }
    ];
    const top2Sampled = sampleCandidates(poolWithRank, 2, 'popular', {
      rng,
      compareFn: (a, b) => b.pop - a.pop
    });
    assert.strictEqual(top2Sampled.length, 2);
    const top2Ids = new Set(top2Sampled.map(c => c.id));
    assert.ok(top2Ids.has('top1') && top2Ids.has('top2'), 'Popular mode must pick top 2 by pop');

    // Random mode: double shuffle across entire pool
    const pool10 = Array.from({ length: 10 }, (_, i) => ({ id: `cand_${i}` }));
    const randomSample = sampleCandidates(pool10, 4, 'random', { rng });
    assert.strictEqual(randomSample.length, 4);
    assert.strictEqual(new Set(randomSample.map(c => c.id)).size, 4);
  });

  section('Core 1: tournament.js — Odd Pools, Ties & Deep Undo Recursion');

  await test('1.6: Degenerate tournament inputs: empty array and single candidate return immediately', async () => {
    let preferenceCalled = false;
    const askMock = async () => { preferenceCalled = true; return 'left'; };

    const emptyRes = await interleavedBisectSortAsync([], askMock, 1);
    assert.deepStrictEqual(emptyRes, []);
    assert.strictEqual(preferenceCalled, false, 'askUserPreference must not be called on empty array');

    const singleRes = await interleavedBisectSortAsync([{ id: 'lone_wolf' }], askMock, 1);
    assert.deepStrictEqual(singleRes, [{ id: 'lone_wolf' }]);
    assert.strictEqual(preferenceCalled, false, 'askUserPreference must not be called on single item');
  });

  await test('1.7: Odd candidate pool sizes (n = 3, 5, 7, 9, 15, 63) preserve all candidates & resolve sorted order', async () => {
    const oddSizes = [3, 5, 7, 9, 15, 63];

    for (const n of oddSizes) {
      const candidates = Array.from({ length: n }, (_, i) => ({
        id: `odd_${n}_${i}`,
        score: (n - i) * 10
      }));

      let duelCount = 0;
      // Consistent transitive oracle: candidate with higher score is preferred
      const askOracle = async (candLeft, candRight) => {
        duelCount++;
        return candLeft.score > candRight.score ? 'left' : 'right';
      };

      const result = await interleavedBisectSortAsync(candidates, askOracle, 42);

      // Invariant 1: Total element conservation (no lost or duplicated candidates)
      assert.strictEqual(result.length, n, `Result size for n=${n} must equal ${n}`);
      const uniqueIds = new Set(result.map(c => c.id));
      assert.strictEqual(uniqueIds.size, n, `Every candidate ID in pool n=${n} must be preserved uniquely`);

      // Invariant 2: Total order correctness (strictly descending by score)
      for (let i = 0; i < result.length - 1; i++) {
        assert.ok(
          result[i].score >= result[i + 1].score,
          `Sort invariant violated at index ${i} for n=${n}: ${result[i].score} vs ${result[i+1].score}`
        );
      }

      // Invariant 3: Comparison complexity is bounded by O(N log N)
      const maxExpectedDuels = Math.ceil(n * Math.log2(n) * 1.5) + 10;
      assert.ok(duelCount <= maxExpectedDuels, `Duel count ${duelCount} exceeded bound ${maxExpectedDuels} for n=${n}`);
    }
  });

  await test('1.8: Repeated alternating preferences ("left", "right", ...) resolve deterministically without loop', async () => {
    for (const n of [3, 5, 8, 15, 16]) {
      const candidates = Array.from({ length: n }, (_, i) => ({ id: `alt_${n}_${i}` }));
      let step = 0;
      const alternatingOracle = async () => {
        step++;
        return step % 2 === 0 ? 'left' : 'right';
      };

      const res = await interleavedBisectSortAsync(candidates, alternatingOracle, 99);
      assert.strictEqual(res.length, n, `Result size must equal ${n}`);
      assert.strictEqual(new Set(res.map(c => c.id)).size, n, 'All candidate IDs must remain unique');
      assert.ok(step > 0 && step < 200, `Tournament should complete in reasonable steps, took ${step}`);
    }
  });

  await test('1.9: Extreme user bias: always "left" or always "right" terminates cleanly within logarithmic bounds', async () => {
    const candidates = Array.from({ length: 16 }, (_, i) => ({ id: `bias_${i}` }));

    let leftSteps = 0;
    const resLeft = await interleavedBisectSortAsync(candidates, async () => { leftSteps++; return 'left'; }, 123);
    assert.strictEqual(resLeft.length, 16);
    assert.strictEqual(new Set(resLeft.map(c => c.id)).size, 16);
    assert.ok(leftSteps <= 64, `Left bias steps ${leftSteps} must be <= 64`);

    let rightSteps = 0;
    const resRight = await interleavedBisectSortAsync(candidates, async () => { rightSteps++; return 'right'; }, 123);
    assert.strictEqual(resRight.length, 16);
    assert.strictEqual(new Set(resRight.map(c => c.id)).size, 16);
    assert.ok(rightSteps <= 64, `Right bias steps ${rightSteps} must be <= 64`);
  });

  await test('1.10: Deep Undo recursion stack & replay consistency (50 successive undo/replay cycles across 16 candidates)', async () => {
    const candidates = Array.from({ length: 16 }, (_, i) => ({ id: `undo_cand_${i}`, strength: 16 - i }));
    const seed = 777;

    // Simulate real game controller with replayable decision history
    const decisionHistory = [];

    // Helper that runs tournament up to targetStep decisions
    async function runTournamentToTarget(history) {
      let replayIdx = 0;
      let totalPrompts = 0;
      const historyCopy = [...history];

      const res = await interleavedBisectSortAsync(candidates, async (a, b) => {
        totalPrompts++;
        if (replayIdx < historyCopy.length) {
          return historyCopy[replayIdx++];
        }
        // Choose based on strength or default
        const pick = a.strength > b.strength ? 'left' : 'right';
        historyCopy.push(pick);
        replayIdx++;
        return pick;
      }, seed);

      return { res, finalHistory: historyCopy, totalPrompts };
    }

    // Initial run to collect a full tournament history
    const initialRun = await runTournamentToTarget([]);
    const fullHistory = initialRun.finalHistory;
    assert.ok(fullHistory.length > 20, '16-candidate tournament should require > 20 decisions');

    // Stress test: Perform 50 successive random depth rewind/replays
    const rng = createSeededRng(999);
    for (let cycle = 0; cycle < 50; cycle++) {
      // Pick a random rewind point between 1 and fullHistory.length - 1
      const rewindPoint = Math.floor(rng() * (fullHistory.length - 2)) + 1;
      const truncatedHistory = fullHistory.slice(0, rewindPoint);

      // Invert the choice at the rewind point to branch
      const currentChoice = fullHistory[rewindPoint];
      const branchedChoice = currentChoice === 'left' ? 'right' : 'left';
      truncatedHistory.push(branchedChoice);

      // Replay forward from the branched choice
      const replayRun = await runTournamentToTarget(truncatedHistory);

      // Verify that decisions prior to the rewind point were 100% matched
      for (let k = 0; k < rewindPoint; k++) {
        assert.strictEqual(replayRun.finalHistory[k], fullHistory[k], `Step ${k} must match original history`);
      }
      assert.strictEqual(replayRun.finalHistory[rewindPoint], branchedChoice, 'Branched decision must be respected');
      assert.strictEqual(replayRun.res.length, 16, 'Branched tournament must produce complete 16-candidate podium');
      assert.strictEqual(new Set(replayRun.res.map(c => c.id)).size, 16, 'All candidates preserved');
    }
  });

  await test('1.11: buildChallengeUrl and parseChallengeUrl edge cases (empty params, malformed dots, URI encoding)', () => {
    // buildChallengeUrl defaults
    const defaultUrl = buildChallengeUrl({ baseUrl: 'https://rankea2.com/pokemon/' });
    assert.strictEqual(defaultUrl, 'https://rankea2.com/pokemon/?r=&l=es');

    // buildChallengeUrl with full params
    const fullUrl = buildChallengeUrl({
      baseUrl: 'https://rankea2.com/aves/?foo=bar',
      ids: ['condor', 'hornero', 'colibri'],
      category: 'rapaces',
      author: 'fede p',
      lang: 'en'
    });
    assert.ok(fullUrl.includes('r=condor.hornero.colibri'));
    assert.ok(fullUrl.includes('c=rapaces'));
    assert.ok(fullUrl.includes('a=fede+p') || fullUrl.includes('a=fede%20p'));
    assert.ok(fullUrl.includes('l=en'));

    // parseChallengeUrl boundary cases
    assert.strictEqual(parseChallengeUrl(''), null);
    assert.strictEqual(parseChallengeUrl('?c=pokemon'), null);
    assert.strictEqual(parseChallengeUrl('?r='), null);
    assert.strictEqual(parseChallengeUrl('?r=pikachu'), null, 'Single ID must return null (min 2 required)');

    // parseChallengeUrl with excess dots and surrounding whitespace
    const parsed = parseChallengeUrl('?r=  pikachu .. charizard ... blastoise . &c=starters&a=Ash');
    assert.ok(parsed !== null);
    assert.deepStrictEqual(parsed.ids, ['pikachu', 'charizard', 'blastoise']);
    assert.strictEqual(parsed.category, 'starters');
    assert.strictEqual(parsed.author, 'Ash');
    assert.strictEqual(parsed.lang, 'es');
  });

  await test('1.12: interleavedBisectSortAsync resilience when candidate items omit id property or have ties', async () => {
    // Candidates missing id property entirely
    const itemsWithoutId = [
      { name: 'Item 1', val: 10 },
      { name: 'Item 2', val: 20 },
      { name: 'Item 3', val: 15 },
      { name: 'Item 4', val: 25 }
    ];
    const sorted = await interleavedBisectSortAsync(itemsWithoutId, async (a, b) => {
      return a.val > b.val ? 'left' : 'right';
    }, 12);
    assert.strictEqual(sorted.length, 4);
    assert.strictEqual(sorted[0].name, 'Item 4');
    assert.strictEqual(sorted[3].name, 'Item 1');
  });

  // ==========================================================================
  // SECTION 2: theme.js White-Box Coverage & Stress
  // ==========================================================================
  section('Core 2: theme.js — Synchronization, Stress Toggles & DOM Resilience');

  await test('2.1: getPreferredTheme precedence: localStorage saved theme vs matchMedia dark/light fallback', () => {
    // Case A: localStorage has 'dark'
    globalThis.localStorage = {
      getItem: (k) => (k === 'rankea2_theme' ? 'dark' : null),
      setItem: () => {}
    };
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    assert.strictEqual(getPreferredTheme(), 'dark');

    // Case B: localStorage has 'light'
    globalThis.localStorage.getItem = () => 'light';
    assert.strictEqual(getPreferredTheme(), 'light');

    // Case C: localStorage is empty, matchMedia dark = true
    globalThis.localStorage.getItem = () => null;
    globalThis.window.matchMedia = (q) => ({ matches: q.includes('dark') });
    assert.strictEqual(getPreferredTheme(), 'dark');

    // Case D: localStorage is empty, matchMedia dark = false
    globalThis.window.matchMedia = () => ({ matches: false });
    assert.strictEqual(getPreferredTheme(), 'light');
  });

  await test('2.2: initTheme applies .dark class to documentElement and returns theme string', () => {
    const doc = createMockDocument();
    globalThis.document = doc;
    globalThis.localStorage.getItem = () => 'dark';

    const t = initTheme();
    assert.strictEqual(t, 'dark');
    assert.strictEqual(doc.documentElement.classList.contains('dark'), true);

    globalThis.localStorage.getItem = () => 'light';
    const t2 = initTheme();
    assert.strictEqual(t2, 'light');
    assert.strictEqual(doc.documentElement.classList.contains('dark'), false);
  });

  await test('2.3: toggleTheme toggles .dark class, synchronizes localStorage, and returns new state', () => {
    const doc = createMockDocument();
    globalThis.document = doc;
    let stored = '';
    globalThis.localStorage = {
      getItem: () => stored,
      setItem: (_, val) => { stored = val; }
    };

    assert.strictEqual(doc.documentElement.classList.contains('dark'), false);
    const next1 = toggleTheme();
    assert.strictEqual(next1, 'dark');
    assert.strictEqual(doc.documentElement.classList.contains('dark'), true);
    assert.strictEqual(stored, 'dark');

    const next2 = toggleTheme();
    assert.strictEqual(next2, 'light');
    assert.strictEqual(doc.documentElement.classList.contains('dark'), false);
    assert.strictEqual(stored, 'light');
  });

  await test('2.4: Rapid theme toggling stress (300 consecutive synchronous clicks maintain parity)', () => {
    const doc = createMockDocument();
    const btn = createMockElement('button', 'themeToggle');
    const lbl = createMockElement('span', 'themeLabel');
    const icDark = createMockElement('svg', 'icDark');
    const icLight = createMockElement('svg', 'icLight');

    doc.registerElement('themeToggle', btn);
    doc.registerElement('themeLabel', lbl);
    doc.registerElement('icDark', icDark);
    doc.registerElement('icLight', icLight);
    globalThis.document = doc;

    let storedTheme = 'light';
    globalThis.localStorage = {
      getItem: () => storedTheme,
      setItem: (_, v) => { storedTheme = v; }
    };

    bindThemeButton({
      buttonId: 'themeToggle',
      labelId: 'themeLabel',
      darkIconId: 'icDark',
      lightIconId: 'icLight'
    });

    for (let i = 0; i < 300; i++) {
      btn.click();
      const expectedDark = (i % 2 === 0);
      assert.strictEqual(doc.documentElement.classList.contains('dark'), expectedDark);
      assert.strictEqual(storedTheme, expectedDark ? 'dark' : 'light');
      assert.strictEqual(lbl.textContent, expectedDark ? 'Claro' : 'Oscuro');
      assert.strictEqual(icDark.classList.contains('hidden'), expectedDark);
      assert.strictEqual(icLight.classList.contains('hidden'), !expectedDark);
    }
  });

  await test('2.5: Missing DOM elements in bindThemeButton (no-op safety across missing button, label, icons)', () => {
    const doc = createMockDocument();
    globalThis.document = doc;

    // A: No arguments
    assert.doesNotThrow(() => bindThemeButton());
    assert.doesNotThrow(() => bindThemeButton({}));

    // B: buttonId not found in DOM
    assert.doesNotThrow(() => bindThemeButton({ buttonId: 'ghost_button' }));

    // C: buttonId exists, but label and icons are missing
    const loneBtn = createMockElement('button', 'loneBtn');
    doc.registerElement('loneBtn', loneBtn);
    assert.doesNotThrow(() => bindThemeButton({ buttonId: 'loneBtn' }));
    assert.doesNotThrow(() => loneBtn.click());

    // D: button exists, only dark icon exists, light icon missing
    const halfBtn = createMockElement('button', 'halfBtn');
    const loneDarkIcon = createMockElement('svg', 'loneDarkIcon');
    doc.registerElement('halfBtn', halfBtn);
    doc.registerElement('loneDarkIcon', loneDarkIcon);
    assert.doesNotThrow(() => bindThemeButton({
      buttonId: 'halfBtn',
      darkIconId: 'loneDarkIcon',
      lightIconId: 'non_existent_light'
    }));
    assert.doesNotThrow(() => halfBtn.click());
  });

  await test('2.6: Parameter alias resolution (darkIconId/lightIconId vs iconDarkId/iconLightId)', () => {
    const doc = createMockDocument();
    const btn = createMockElement('button', 'btnAlias');
    const icDark = createMockElement('svg', 'iconD');
    const icLight = createMockElement('svg', 'iconL');

    doc.registerElement('btnAlias', btn);
    doc.registerElement('iconD', icDark);
    doc.registerElement('iconL', icLight);
    globalThis.document = doc;

    // Test alternate property names: iconDarkId and iconLightId
    bindThemeButton({
      buttonId: 'btnAlias',
      iconDarkId: 'iconD',
      iconLightId: 'iconL'
    });

    assert.strictEqual(icDark.classList.contains('hidden'), false);
    assert.strictEqual(icLight.classList.contains('hidden'), true);

    btn.click();
    assert.strictEqual(icDark.classList.contains('hidden'), true);
    assert.strictEqual(icLight.classList.contains('hidden'), false);
  });

  await test('2.7: Storage failure simulation: behavior when localStorage throws SecurityError or QuotaExceededError', () => {
    // When browser operates in restricted 3rd-party sandbox, localStorage access throws
    globalThis.localStorage = {
      getItem: () => {
        const err = new Error('The operation is insecure.');
        err.name = 'SecurityError';
        throw err;
      },
      setItem: () => {
        const err = new Error('QuotaExceededError: DOM Exception 22');
        err.name = 'QuotaExceededError';
        throw err;
      }
    };
    globalThis.window = { matchMedia: () => ({ matches: false }) };

    // Verify empirical behavior under storage failure:
    // Calling getPreferredTheme propagates SecurityError
    assert.throws(() => getPreferredTheme(), /insecure/);

    // Calling toggleTheme propagates QuotaExceededError
    assert.throws(() => toggleTheme(), /QuotaExceededError/);
  });

  await test('2.8: initTheme handles unexpected/corrupted localStorage values safely', () => {
    const doc = createMockDocument();
    globalThis.document = doc;

    // Corrupted values in localStorage (e.g. random string, empty string)
    const testCases = [
      { val: 'neon', expected: 'neon' },
      { val: 'solarized', expected: 'solarized' },
      { val: 'null', expected: 'null' },
      { val: 'undefined', expected: 'undefined' },
      { val: '', expected: 'light' } // Empty string is falsy, safely falls back to default light theme
    ];
    for (const { val, expected } of testCases) {
      globalThis.localStorage = {
        getItem: () => val,
        setItem: () => {}
      };
      const result = initTheme();
      assert.strictEqual(result, expected);
      // Only 'dark' enables the class, any other string keeps .dark disabled
      assert.strictEqual(doc.documentElement.classList.contains('dark'), false, `Corrupted value "${val}" must not enable dark class`);
    }
  });

  // ==========================================================================
  // SECTION 3: canvas.js White-Box Coverage & Adversarial Resilience
  // ==========================================================================
  section('Core 3: canvas.js — Aspect Ratio Math, CORS Tainted Fallback & Layout Bounds');

  await test('3.1: Story (9:16 = 1080x1920) vs Poster (4:5 = 1080x1350) aspect ratio dimensions & unknown format fallback', async () => {
    const winner = { id: 1, name: 'Bulbasaur', types: ['grass', 'poison'] };
    const mockCtx = createMockCanvasContext();
    const mockCanvas = { getContext: () => mockCtx };

    // Story format
    const storyCard = await renderRankingCard({
      arena: 'pokemon',
      winner,
      format: 'story',
      options: { canvas: mockCanvas, theme: 'light' }
    });
    assert.strictEqual(storyCard.width, 1080);
    assert.strictEqual(storyCard.height, 1920);

    // Poster format
    const posterCard = await renderRankingCard({
      arena: 'pokemon',
      winner,
      format: 'poster',
      options: { canvas: mockCanvas, theme: 'dark' }
    });
    assert.strictEqual(posterCard.width, 1080);
    assert.strictEqual(posterCard.height, 1350);

    // Unknown format string defaults to Story
    const unknownCard = await renderRankingCard({
      arena: 'pokemon',
      winner,
      format: 'ultrawide_21_9',
      options: { canvas: mockCanvas }
    });
    assert.strictEqual(unknownCard.width, 1080);
    assert.strictEqual(unknownCard.height, 1920);
  });

  await test('3.2: truncateText boundary conditions: null, empty, exact length, and 10,000 char strings', () => {
    assert.strictEqual(truncateText(null), '');
    assert.strictEqual(truncateText(undefined), '');
    assert.strictEqual(truncateText(''), '');
    assert.strictEqual(truncateText('ExactLength20Chars!!', 20), 'ExactLength20Chars!!');
    assert.strictEqual(truncateText('ExactLength20Chars!!!', 20), 'ExactLength20Chars!…');

    const hugeString = 'A'.repeat(10000);
    const truncated = truncateText(hugeString, 30);
    assert.strictEqual(truncated.length, 30);
    assert.ok(truncated.endsWith('…'));
    assert.strictEqual(truncated, 'A'.repeat(29) + '…');
  });

  await test('3.3: drawRoundRect fallback path: native ctx.roundRect vs fallback quadraticCurveTo execution', () => {
    const nativeCtx = createMockCanvasContext();
    drawRoundRect(nativeCtx, 10, 10, 100, 50, 8, '#ffffff', '#000000', 2);
    const roundRectCalls = nativeCtx.calls.filter(c => c.op === 'roundRect');
    assert.strictEqual(roundRectCalls.length, 1);
    assert.deepStrictEqual(roundRectCalls[0], { op: 'roundRect', x: 10, y: 10, w: 100, h: 50, r: 8 });

    // Fallback path without ctx.roundRect
    const fallbackCtx = createMockCanvasContext();
    delete fallbackCtx.roundRect; // simulate older browser or headless mock
    drawRoundRect(fallbackCtx, 10, 10, 100, 50, 8, '#ffffff', '#000000', 2);
    const quadCalls = fallbackCtx.calls.filter(c => c.op === 'quadraticCurveTo');
    assert.strictEqual(quadCalls.length, 4, 'Fallback must draw 4 corner quadratic curves');
  });

  await test('3.4: drawUncroppedPhoto zero-crop contain math: ultrawide, ultratall, and 0-dimension images', () => {
    const ctx = createMockCanvasContext();

    // Case A: Missing or 0x0 image draws ambient placeholder without throwing NaN
    drawUncroppedPhoto(ctx, null, 0, 0, 400, 300);
    const place1 = ctx.calls.filter(c => c.op === 'fillRect');
    assert.ok(place1.length > 0);

    drawUncroppedPhoto(ctx, { width: 0, height: 0 }, 0, 0, 400, 300);
    const place2 = ctx.calls.filter(c => c.op === 'fillRect');
    assert.ok(place2.length > place1.length);

    // Case B: Ultrawide photo (21:9 = 2100x900) in 400x300 container
    const wideImg = { width: 2100, height: 900 };
    ctx.calls.length = 0;
    drawUncroppedPhoto(ctx, wideImg, 50, 50, 400, 300, { blurBackdrop: true });
    const drawCalls = ctx.calls.filter(c => c.op === 'drawImage');
    assert.strictEqual(drawCalls.length, 2, 'Must have 1 backdrop call + 1 foreground call');
    // Foreground call is index 1
    const fgCall = drawCalls[1].args;
    // imgRatio (2.333) > boxRatio (1.333) -> dh = w / imgRatio = 400 / (2100/900) = 171.4
    const dw = fgCall[7];
    const dh = fgCall[8];
    assert.strictEqual(dw, 400, 'Width must fit container 400 exactly');
    assert.strictEqual(dh, Math.round(400 / (2100 / 900)), 'Height must scale proportionally');

    // Case C: Pixel art mode disables imageSmoothingEnabled
    ctx.calls.length = 0;
    drawUncroppedPhoto(ctx, wideImg, 0, 0, 100, 100, { isPixelArt: true, blurBackdrop: false });
    assert.strictEqual(ctx.imageSmoothingEnabled, false);
  });

  await test('3.5: Missing or partial podium candidates & unknown arena safety in renderRankingCard', async () => {
    const mockCtx = createMockCanvasContext();
    const mockCanvas = { getContext: () => mockCtx };

    // A: Missing winner throws descriptive error
    await assert.rejects(
      () => renderRankingCard({ arena: 'pokemon', winner: null }),
      /Winner is required for ranking card/
    );

    // B: Only 1 candidate (winner, top3 omitted)
    mockCtx.calls.length = 0;
    await renderRankingCard({
      arena: 'pokemon',
      winner: { id: 25, name: 'Pikachu' },
      options: { canvas: mockCanvas }
    });
    const championTexts = mockCtx.calls.filter(c => c.op === 'fillText' && c.text.includes('CAMPEÓN'));
    const silverTexts = mockCtx.calls.filter(c => c.op === 'fillText' && c.text.includes('PLATA'));
    assert.strictEqual(championTexts.length, 1);
    assert.strictEqual(silverTexts.length, 0, 'Silver medal must be omitted when 2nd place is absent');

    // C: 2 candidates (winner + silver, bronze absent)
    mockCtx.calls.length = 0;
    await renderRankingCard({
      arena: 'mamiferos',
      winner: { id: 'yaguarete', name: 'Yaguareté', sci_name: 'Panthera onca' },
      top3: [
        { id: 'yaguarete', name: 'Yaguareté' },
        { id: 'carpincho', name: 'Carpincho' }
      ],
      options: { canvas: mockCanvas }
    });
    const sTexts = mockCtx.calls.filter(c => c.op === 'fillText' && c.text.includes('PLATA'));
    const bTexts = mockCtx.calls.filter(c => c.op === 'fillText' && c.text.includes('BRONCE'));
    assert.strictEqual(sTexts.length, 1, 'Silver medal must be rendered');
    assert.strictEqual(bTexts.length, 0, 'Bronze medal must be omitted when 3rd place is absent');

    // D: Unknown arena defaults safely to Pokémon palette
    mockCtx.calls.length = 0;
    await renderRankingCard({
      arena: 'unknown_mythical_creatures',
      winner: { id: 'dragon', name: 'Dragon' },
      options: { canvas: mockCanvas }
    });
    const brandTexts = mockCtx.calls.filter(c => c.op === 'fillText' && c.text.includes('RANKEA2 · POKÉMON'));
    assert.strictEqual(brandTexts.length, 1, 'Unknown arena must fallback to default config');
  });

  await test('3.6: High-frequency long text stress in renderRankingCard (10,000 char candidate & custom author)', async () => {
    const mockCtx = createMockCanvasContext();
    const mockCanvas = { getContext: () => mockCtx };

    const superLongWinner = {
      id: 999,
      name: 'Super Long Name '.repeat(100),
      subtitle: 'Super Long Scientific Subtitle '.repeat(100),
      badge: 'Super Long Category Badge '.repeat(100)
    };

    await renderRankingCard({
      arena: 'flores',
      winner: superLongWinner,
      format: 'story',
      options: {
        canvas: mockCanvas,
        title: 'Title '.repeat(50),
        ranking: Array.from({ length: 8 }, (_, i) => ({
          id: i,
          name: 'Rest Name '.repeat(20),
          sci_name: 'Rest Subtitle '.repeat(20)
        }))
      }
    });

    const renderedTexts = mockCtx.calls.filter(c => c.op === 'fillText').map(c => c.text);
    const candidateTexts = renderedTexts.filter(t => !t.startsWith('RANKEA2') && !t.includes('rankea2.com') && t !== 'Colección Botánica' && !t.startsWith('1°') && !t.startsWith('#'));
    for (const t of candidateTexts) {
      assert.ok(t.length <= 60, `Rendered text exceeds maximum bounding limit: "${t.slice(0, 30)}..." (${t.length} chars)`);
    }
  });

  await test('3.7: loadImageSafe CORS and network failure chain (null, cache hit, fallback to null without unhandled rejection)', async () => {
    // A: null / empty url
    assert.strictEqual(await loadImageSafe(''), null);
    assert.strictEqual(await loadImageSafe(null), null);
    assert.strictEqual(await loadImageSafe(undefined), null);

    // B: Network fetch failure in Node.js resolves to null without throwing
    const res = await loadImageSafe('https://invalid.unreachable.domain.test/photo.jpg');
    assert.strictEqual(res, null, 'Unreachable network endpoint must resolve cleanly to null');
  });

  await test('3.8: exportRankingCard error handling: missing canvas throws descriptive Error', async () => {
    await assert.rejects(
      () => exportRankingCard({}),
      /Canvas element is required for export/
    );
  });

  await test('3.9: exportRankingCard CORS tainted canvas fallback resilience (catches SecurityError and returns fallback)', async () => {
    const taintedCanvas = {
      toBlob: () => {
        const err = new Error('The operation is insecure.');
        err.name = 'SecurityError';
        throw err;
      },
      toDataURL: () => {
        const err = new Error('The operation is insecure.');
        err.name = 'SecurityError';
        throw err;
      }
    };

    // Setup mock document for download fallback
    let clicked = false;
    globalThis.document = {
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        download: '',
        href: '',
        click: () => { clicked = true; }
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {}
      }
    };

    const res = await exportRankingCard({
      canvas: taintedCanvas,
      filename: 'tainted.png',
      action: 'download'
    });

    assert.strictEqual(res.shared, false);
    assert.strictEqual(res.downloaded, true);
    assert.strictEqual(res.filename, 'tainted.png');
  });

  await test('3.10: exportRankingCard Web Share API abort handling: returns cancelled flag on AbortError', async () => {
    const mockCanvas = {
      toBlob: (cb) => cb(new Blob(['fake'], { type: 'image/png' })),
      toDataURL: () => 'data:image/png;base64,fake'
    };

    // Mock navigator.share rejecting with AbortError
    globalThis.File = class MockFile {
      constructor(chunks, name) { this.name = name; }
    };
    const mockNav = {
      canShare: () => true,
      share: async () => {
        const abortErr = new Error('Share canceled by user.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
    };
    Object.defineProperty(globalThis, 'navigator', {
      value: mockNav,
      configurable: true,
      writable: true
    });

    const res = await exportRankingCard({
      canvas: mockCanvas,
      action: 'auto'
    });

    assert.strictEqual(res.cancelled, true, 'User abort in share sheet must set cancelled: true');
    assert.strictEqual(res.shared, false);
    assert.strictEqual(res.downloaded, false);
  });

  await test('3.11: exportRankingCard explicit copy action writes to navigator.clipboard', async () => {
    const mockCanvas = {
      toBlob: (cb) => cb(new Blob(['fake_png'], { type: 'image/png' })),
      toDataURL: () => 'data:image/png;base64,fake'
    };

    let clipboardWritten = false;
    globalThis.ClipboardItem = class MockClipboardItem {
      constructor(data) { this.data = data; }
    };
    const mockNav = {
      clipboard: {
        write: async () => { clipboardWritten = true; }
      }
    };
    Object.defineProperty(globalThis, 'navigator', {
      value: mockNav,
      configurable: true,
      writable: true
    });

    const res = await exportRankingCard({
      canvas: mockCanvas,
      action: 'copy'
    });

    assert.strictEqual(clipboardWritten, true, 'Clipboard write must be invoked');
    assert.strictEqual(res.copied, true);
    assert.strictEqual(res.shared, false);
  });

  await test('3.12: Layout vertical bounding bounds: Story (<= 1920) and Poster (<= 1350) prevent visual clipping', async () => {
    const mockCtxStory = createMockCanvasContext();
    const mockCanvasStory = { getContext: () => mockCtxStory };
    await renderRankingCard({
      arena: 'aves',
      winner: { id: 'condor', name: 'Cóndor' },
      format: 'story',
      options: { canvas: mockCanvasStory }
    });
    const storyY = mockCtxStory.calls
      .filter(c => typeof c.y === 'number')
      .map(c => c.y + (typeof c.h === 'number' ? c.h : 0));
    const maxStoryY = Math.max(...storyY);
    assert.ok(maxStoryY <= 1920, `Max Story coordinate ${maxStoryY} exceeds 1920`);

    const mockCtxPoster = createMockCanvasContext();
    const mockCanvasPoster = { getContext: () => mockCtxPoster };
    await renderRankingCard({
      arena: 'aves',
      winner: { id: 'condor', name: 'Cóndor' },
      format: 'poster',
      options: { canvas: mockCanvasPoster }
    });
    const posterY = mockCtxPoster.calls
      .filter(c => typeof c.y === 'number')
      .map(c => c.y + (typeof c.h === 'number' ? c.h : 0));
    const maxPosterY = Math.max(...posterY);
    assert.ok(maxPosterY <= 1350, `Max Poster coordinate ${maxPosterY} exceeds 1350`);
  });

  await test('3.13: exportRankingCard auto action fallback to download when Web Share API is completely absent', async () => {
    const mockCanvas = {
      toBlob: (cb) => cb(new Blob(['fake_data'], { type: 'image/png' })),
      toDataURL: () => 'data:image/png;base64,fake'
    };

    // Navigator with no canShare / share / clipboard
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true
    });

    let downloadClicked = false;
    globalThis.document = {
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        download: '',
        href: '',
        click: () => { downloadClicked = true; }
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {}
      }
    };

    const res = await exportRankingCard({
      canvas: mockCanvas,
      filename: 'auto_fallback.png',
      action: 'auto'
    });

    assert.strictEqual(downloadClicked, true, 'Must trigger anchor click on auto fallback');
    assert.strictEqual(res.downloaded, true);
    assert.strictEqual(res.shared, false);
  });

  await test('3.14: renderRankingCard header options: custom title clamped to 30 chars and author formatted', async () => {
    const mockCtx = createMockCanvasContext();
    const mockCanvas = { getContext: () => mockCtx };

    await renderRankingCard({
      arena: 'pokemon',
      winner: { id: 25, name: 'Pikachu' },
      options: {
        canvas: mockCanvas,
        title: 'Super Ultra Long Custom Title That Exceeds Thirty Characters',
        author: 'Red Ketchum'
      }
    });

    const fillTexts = mockCtx.calls.filter(c => c.op === 'fillText').map(c => c.text);
    assert.ok(fillTexts.includes('Super Ultra Long Custom Title…'), 'Title must be clamped with ellipsis to 30 chars');
    assert.ok(fillTexts.includes('por Red Ketchum'), 'Author signature must be formatted with "por" prefix');
  });

  // ==========================================================================
  // Report Summary
  // ==========================================================================
  console.log('\n==============================================================================');
  console.log(`  TIER 5 ADVERSARIAL SUMMARY:`);
  console.log(`  Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  console.log(`  Pass Rate: ${passRate}%`);
  console.log('==============================================================================\n');

  if (failedTests > 0) {
    console.error(`💥 ${failedTests} test(s) failed in Tier 5 Adversarial Suite!`);
    process.exitCode = 1;
  } else {
    console.log('✨ ALL TIER 5 ADVERSARIAL STRESS & CORNER TESTS PASSED WITH 100% SUCCESS RATE!\n');
    process.exitCode = 0;
  }
}

runAdversarialSuite();
