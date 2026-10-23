/**
 * Adversarial Stress Test Suite for Milestone 2
 * Comprehensive empirical testing:
 * 1. Theme Manager (src/core/theme.js) parameter conventions & edge cases
 * 2. InterleavedBisectSortAsync & Undo Stack across Mamíferos, Flores, and Pokémon
 * 3. Photo framing zero-crop containers & backdrop blur layers
 * 4. Mathematical sorting invariants & total order correctness
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

import { ROOT_DIR, createMockBrowserEnv } from './e2e/harness.mjs';
import {
  initTheme,
  toggleTheme,
  getPreferredTheme,
  bindThemeButton
} from '../src/core/theme.js';
import {
  createSeededRng,
  fisherYatesShuffle,
  estimateTotalSteps,
  sampleCandidates,
  interleavedBisectSortAsync
} from '../src/core/tournament.js';

let passedChecks = 0;
let totalChecks = 0;

function setupMockEnv(htmlPath) {
  const env = createMockBrowserEnv(htmlPath);
  env.window.addEventListener = (type, listener) => {};
  env.window.removeEventListener = (type, listener) => {};
  env.window.navigator = { clipboard: { writeText: () => Promise.resolve() } };
  global.window = env.window;
  global.document = env.document;
  global.localStorage = env.window.localStorage;
  global.fetch = env.window.fetch;
  global.scrollTo = () => {};
  global.Audio = class {
    constructor() {
      this.src = '';
      this.preload = '';
    }
    play() { return Promise.resolve(); }
    pause() {}
  };
  global.Image = class {
    constructor() {
      this.src = '';
      this.complete = true;
    }
  };
  return env;
}

function check(desc, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`  ✓ PASS: ${desc}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(err);
    throw err;
  }
}

async function checkAsync(desc, fn) {
  totalChecks++;
  try {
    await fn();
    passedChecks++;
    console.log(`  ✓ PASS: ${desc}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(err);
    throw err;
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('  ADVERSARIAL STRESS TEST SUITE: MILESTONE 2');
  console.log('================================================================\n');

  // ============================================================================
  // SECTION 1: THEME MANAGER ADVERSARIAL STRESS
  // ============================================================================
  console.log('--- Section 1: src/core/theme.js Stress Testing ---');

  check('Theme 1.1: bindThemeButton handles empty/undefined arguments gracefully', () => {
    setupMockEnv('mamiferos/index.html');
    assert.doesNotThrow(() => bindThemeButton());
    assert.doesNotThrow(() => bindThemeButton({}));
    assert.doesNotThrow(() => bindThemeButton({ buttonId: 'non_existent_btn_id' }));
  });

  check('Theme 1.2: Parameter Convention 1 (darkIconId, lightIconId)', () => {
    const env = setupMockEnv('mamiferos/index.html');
    const { document } = env;

    const btn = document.getElementById('themeToggle');
    const darkIcon = document.getElementById('themeIconDark');
    const lightIcon = document.getElementById('themeIconLight');
    const label = document.getElementById('themeLabel');

    bindThemeButton({
      buttonId: 'themeToggle',
      labelId: 'themeLabel',
      darkIconId: 'themeIconDark',
      lightIconId: 'themeIconLight'
    });

    assert.strictEqual(document.documentElement.classList.contains('dark'), false);
    assert.strictEqual(darkIcon.classList.contains('hidden'), false);
    assert.strictEqual(lightIcon.classList.contains('hidden'), true);
    assert.strictEqual(label.textContent, 'Oscuro');

    btn.click();
    assert.strictEqual(document.documentElement.classList.contains('dark'), true);
    assert.strictEqual(darkIcon.classList.contains('hidden'), true);
    assert.strictEqual(lightIcon.classList.contains('hidden'), false);
    assert.strictEqual(label.textContent, 'Claro');
    assert.strictEqual(localStorage.getItem('rankea2_theme'), 'dark');
  });

  check('Theme 1.3: Parameter Convention 2 (iconDarkId, iconLightId)', () => {
    const env = setupMockEnv('flores/index.html');
    const { document } = env;

    const btn = document.getElementById('themeToggle');
    const darkIcon = document.getElementById('themeIconDark');
    const lightIcon = document.getElementById('themeIconLight');

    bindThemeButton({
      buttonId: 'themeToggle',
      labelId: 'themeLabel',
      iconDarkId: 'themeIconDark',
      iconLightId: 'themeIconLight'
    });

    assert.strictEqual(darkIcon.classList.contains('hidden'), false);
    assert.strictEqual(lightIcon.classList.contains('hidden'), true);

    btn.click();
    assert.strictEqual(document.documentElement.classList.contains('dark'), true);
    btn.click();
    assert.strictEqual(document.documentElement.classList.contains('dark'), false);
    assert.strictEqual(darkIcon.classList.contains('hidden'), false);
    assert.strictEqual(lightIcon.classList.contains('hidden'), true);
  });

  check('Theme 1.4: Mixed parameter conventions and missing optional elements', () => {
    const env = setupMockEnv('pokemon/index.html');
    const { document } = env;

    const btn = document.getElementById('themeToggle');
    assert.doesNotThrow(() => {
      bindThemeButton({
        buttonId: 'themeToggle',
        darkIconId: 'themeIconDark',
        iconLightId: 'themeIconLight'
      });
    });

    btn.click();
    assert.strictEqual(document.documentElement.classList.contains('dark'), true);
  });

  check('Theme 1.5: 200 Rapid toggles state synchronization', () => {
    const env = setupMockEnv('mamiferos/index.html');
    const { document } = env;

    const btn = document.getElementById('themeToggle');
    const darkIcon = document.getElementById('themeIconDark');
    const lightIcon = document.getElementById('themeIconLight');
    const label = document.getElementById('themeLabel');

    bindThemeButton({
      buttonId: 'themeToggle',
      labelId: 'themeLabel',
      iconDarkId: 'themeIconDark',
      iconLightId: 'themeIconLight'
    });

    for (let i = 0; i < 200; i++) {
      btn.click();
      const shouldBeDark = (i % 2 === 0);
      assert.strictEqual(document.documentElement.classList.contains('dark'), shouldBeDark);
      assert.strictEqual(localStorage.getItem('rankea2_theme'), shouldBeDark ? 'dark' : 'light');
      assert.strictEqual(darkIcon.classList.contains('hidden'), shouldBeDark);
      assert.strictEqual(lightIcon.classList.contains('hidden'), !shouldBeDark);
      assert.strictEqual(label.textContent, shouldBeDark ? 'Claro' : 'Oscuro');
    }
  });

  // ============================================================================
  // SECTION 2: TOURNAMENT CORE MATHEMATICAL INVARIANTS & TOTAL ORDER
  // ============================================================================
  console.log('\n--- Section 2: Mathematical Tournament Core Stress Testing ---');

  await checkAsync('Tournament 2.1: Perfect total order reconstruction for N in [2..35]', async () => {
    const testSizes = [2, 3, 4, 5, 7, 8, 9, 13, 16, 20, 27, 32, 35];

    for (const n of testSizes) {
      const items = Array.from({ length: n }, (_, i) => ({ id: i, score: 1000 - i }));
      const rng = createSeededRng(n * 77 + 3);
      const shuffled = fisherYatesShuffle(items, rng);

      let comparisonCount = 0;
      const sorted = await interleavedBisectSortAsync(shuffled, async (left, right) => {
        comparisonCount++;
        return left.score > right.score ? 'left' : 'right';
      }, n * 13 + 5);

      assert.strictEqual(sorted.length, n, `Result length must be ${n}`);
      for (let i = 0; i < n; i++) {
        assert.strictEqual(sorted[i].id, i, `Element at index ${i} must have id ${i}`);
      }

      const upperLimit = Math.ceil(n * Math.log2(n) * 2.5) + 15;
      assert.ok(comparisonCount <= upperLimit, `Comparisons (${comparisonCount}) exceeded upper bound ${upperLimit} for N=${n}`);
    }
  });

  await checkAsync('Tournament 2.2: Seed and decision determinism over 10 random permutations', async () => {
    const n = 16;
    const items = Array.from({ length: n }, (_, i) => ({ id: i, val: `item-${i}` }));

    for (let run = 0; run < 10; run++) {
      const seed = 1000 + run;
      const decisions = [];

      const resA = await interleavedBisectSortAsync(items, async (l, r) => {
        const pick = (l.id + r.id) % 2 === 0 ? 'left' : 'right';
        decisions.push(pick);
        return pick;
      }, seed);

      let dIdx = 0;
      const resB = await interleavedBisectSortAsync(items, async (l, r) => {
        return decisions[dIdx++];
      }, seed);

      assert.strictEqual(resA.length, n);
      assert.strictEqual(resB.length, n);
      for (let i = 0; i < n; i++) {
        assert.strictEqual(resA[i].id, resB[i].id);
      }
    }
  });

  // ============================================================================
  // SECTION 3: ARENA CONTROLLERS TOURNAMENT & UNDO STACK STRESS
  // ============================================================================
  console.log('\n--- Section 3: Arena Controllers Tournament & Undo Stack Stress ---');

  async function simulateArenaTournamentWithUndos(appInstance, arenaName, totalCandidates = 16, numUndoEvents = 8) {
    assert.ok(appInstance.state, `${arenaName} app must have state`);
    assert.strictEqual(typeof appInstance.undoLastBattleChoice, 'function', `${arenaName} must have undoLastBattleChoice`);
    assert.strictEqual(typeof appInstance.chooseCandidate, 'function', `${arenaName} must have chooseCandidate`);

    appInstance.state.limit = totalCandidates;
    const battlePromise = appInstance.startBattleGame(false);

    let stepsTaken = 0;
    let undosPerformed = 0;
    const maxSteps = 400;

    while (stepsTaken < maxSteps) {
      if (!document.getElementById('viewBattle') || document.getElementById('viewBattle').classList.contains('hidden')) {
        break;
      }

      await new Promise(r => setTimeout(r, 1));

      if (!appInstance.state.pendingResolver) {
        if (!document.getElementById('viewBattle')?.classList.contains('hidden')) {
          await new Promise(r => setTimeout(r, 5));
        }
        if (!appInstance.state.pendingResolver) break;
      }

      const canUndo = appInstance.state.choiceHistory && appInstance.state.choiceHistory.length > 0;
      const shouldUndo = canUndo && undosPerformed < numUndoEvents && Math.random() < 0.25;

      if (shouldUndo) {
        const depthBefore = appInstance.state.choiceHistory.length;
        appInstance.undoLastBattleChoice();
        undosPerformed++;

        await new Promise(r => setTimeout(r, 5));

        const depthAfter = appInstance.state.choiceHistory ? appInstance.state.choiceHistory.length : 0;
        assert.strictEqual(depthAfter, depthBefore - 1, `History length must decrease by 1 after undo (was ${depthBefore}, now ${depthAfter})`);
        assert.ok(appInstance.state.pendingResolver, 'After undo replay, pendingResolver must be set for user interaction');
        continue;
      }

      const pick = Math.random() < 0.5 ? 'left' : 'right';
      appInstance.chooseCandidate(pick);
      stepsTaken++;
    }

    await battlePromise;

    assert.ok(
      !document.getElementById('viewResults').classList.contains('hidden'),
      `${arenaName}: viewResults must be visible after tournament completion`
    );
    assert.strictEqual(
      appInstance.state.finalRanking.length,
      totalCandidates,
      `${arenaName}: finalRanking must have exactly ${totalCandidates} items`
    );

    const ids = appInstance.state.finalRanking.map(item => item.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(
      uniqueIds.size,
      totalCandidates,
      `${arenaName}: final ranking must not contain duplicate candidates`
    );

    return { stepsTaken, undosPerformed };
  }

  await checkAsync('Arena 3.1: Mamíferos Arena with 10 random undo cycles', async () => {
    setupMockEnv('mamiferos/index.html');
    const appModule = await import('../src/mamiferos/main.js');
    const app = appModule.default || window.app;
    await app.init();

    const { stepsTaken, undosPerformed } = await simulateArenaTournamentWithUndos(app, 'Mamíferos', 16, 10);
    assert.ok(undosPerformed > 0, `At least 1 undo should have executed (did ${undosPerformed})`);
    assert.strictEqual(app.state.finalRanking.length, 16);
  });

  await checkAsync('Arena 3.2: Flores Arena with 10 random undo cycles', async () => {
    setupMockEnv('flores/index.html');
    const appModule = await import('../src/flores/main.js');
    const app = appModule.default || window.app;
    await app.init();

    const { stepsTaken, undosPerformed } = await simulateArenaTournamentWithUndos(app, 'Flores', 16, 10);
    assert.ok(undosPerformed > 0, `At least 1 undo should have executed (did ${undosPerformed})`);
    assert.strictEqual(app.state.finalRanking.length, 16);
  });

  await checkAsync('Arena 3.3: Pokémon Arena with 12 random undo cycles and 16 candidates', async () => {
    setupMockEnv('pokemon/index.html');
    const appModule = await import('../src/pokemon/main.js');
    const app = appModule.default || window.app;
    await app.init();

    const { stepsTaken, undosPerformed } = await simulateArenaTournamentWithUndos(app, 'Pokémon', 16, 12);
    assert.ok(undosPerformed > 0, `At least 1 undo should have executed (did ${undosPerformed})`);
    assert.strictEqual(app.state.finalRanking.length, 16);
  });

  await checkAsync('Arena 3.4: Deep consecutive undo rewind all the way to Step 1', async () => {
    setupMockEnv('mamiferos/index.html');
    const appModule = await import('../src/mamiferos/main.js');
    const app = appModule.default || window.app;
    await app.init();
    app.startBattleGame(false);

    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 2));
      assert.ok(app.state.pendingResolver);
      app.chooseCandidate('left');
    }

    await new Promise(r => setTimeout(r, 0));
    assert.strictEqual(app.state.choiceHistory.length, 6);

    for (let i = 6; i > 0; i--) {
      assert.strictEqual(app.state.choiceHistory.length, i);
      app.undoLastBattleChoice();
      await new Promise(r => setTimeout(r, 5));
    }

    assert.strictEqual(app.state.choiceHistory.length, 0);
    assert.ok(app.state.pendingResolver, 'Step 1 should be waiting for choice after full rewind');

    const btnUndo = document.getElementById('btnUndoBattleChoice');
    if (btnUndo) {
      assert.strictEqual(btnUndo.classList.contains('hidden'), true);
    }
    assert.doesNotThrow(() => app.undoLastBattleChoice());
    assert.strictEqual(app.state.choiceHistory.length, 0);
  });

  // ============================================================================
  // SECTION 4: PHOTO CONTAINERS, BACKDROP BLUR & ZERO-CROP VALIDATION
  // ============================================================================
  console.log('\n--- Section 4: Photo Containers Zero-Crop & Backdrop Blur Stress Testing ---');

  check('Photo 4.1: mamiferos/index.html duel markup contains required classes', () => {
    const html = fs.readFileSync(path.resolve(ROOT_DIR, 'mamiferos/index.html'), 'utf8');

    assert.ok(html.includes('id="imgLeftBg"'), 'Left backdrop image exists');
    assert.ok(html.includes('id="imgLeft"'), 'Left foreground image exists');

    const leftBgMatches = html.match(/<img[^>]*id="imgLeftBg"[^>]*>/);
    assert.ok(leftBgMatches, 'imgLeftBg tag found');
    const leftBgTag = leftBgMatches[0];
    assert.ok(leftBgTag.includes('blur-xl'), 'Backdrop has blur-xl');
    assert.ok(leftBgTag.includes('opacity-65'), 'Backdrop has opacity-65');
    assert.ok(leftBgTag.includes('pointer-events-none'), 'Backdrop has pointer-events-none');
    assert.ok(leftBgTag.includes('aria-hidden="true"'), 'Backdrop has aria-hidden="true"');
    assert.ok(leftBgTag.includes('object-cover'), 'Backdrop uses object-cover to fill container');

    const leftFgMatches = html.match(/<img[^>]*id="imgLeft"[^>]*>/);
    assert.ok(leftFgMatches, 'imgLeft tag found');
    const leftFgTag = leftFgMatches[0];
    assert.ok(leftFgTag.includes('object-contain'), 'Foreground has object-contain');
    assert.ok(leftFgTag.includes('object-center'), 'Foreground has object-center');

    assert.ok(html.includes('id="imgRightBg"'), 'Right backdrop image exists');
    assert.ok(html.includes('id="imgRight"'), 'Right foreground image exists');
    const rightBgMatches = html.match(/<img[^>]*id="imgRightBg"[^>]*>/);
    assert.ok(rightBgMatches, 'imgRightBg tag found');
    const rightBgTag = rightBgMatches[0];
    assert.ok(rightBgTag.includes('blur-xl'), 'Right backdrop has blur-xl');
    assert.ok(rightBgTag.includes('opacity-65'), 'Right backdrop has opacity-65');

    const rightFgMatches = html.match(/<img[^>]*id="imgRight"[^>]*>/);
    assert.ok(rightFgMatches, 'imgRight tag found');
    const rightFgTag = rightFgMatches[0];
    assert.ok(rightFgTag.includes('object-contain'), 'Right foreground has object-contain');
    assert.ok(rightFgTag.includes('object-center'), 'Right foreground has object-center');
  });

  check('Photo 4.2: flores/index.html duel markup contains required classes', () => {
    const html = fs.readFileSync(path.resolve(ROOT_DIR, 'flores/index.html'), 'utf8');

    const leftBgMatches = html.match(/<img[^>]*id="imgLeftBg"[^>]*>/);
    assert.ok(leftBgMatches, 'flores imgLeftBg tag found');
    const leftBgTag = leftBgMatches[0];
    assert.ok(leftBgTag.includes('blur-xl'), 'flores backdrop has blur-xl');
    assert.ok(leftBgTag.includes('opacity-65'), 'flores backdrop has opacity-65');
    assert.ok(leftBgTag.includes('pointer-events-none'), 'flores backdrop has pointer-events-none');
    assert.ok(leftBgTag.includes('aria-hidden="true"'), 'flores backdrop has aria-hidden="true"');

    const leftFgMatches = html.match(/<img[^>]*id="imgLeft"[^>]*>/);
    assert.ok(leftFgMatches, 'flores imgLeft tag found');
    const leftFgTag = leftFgMatches[0];
    assert.ok(leftFgTag.includes('object-contain'), 'flores foreground has object-contain');
    assert.ok(leftFgTag.includes('object-center'), 'flores foreground has object-center');
  });

  await checkAsync('Photo 4.3: Podium and rest-of-ranking dynamically rendered containers in Mamíferos', async () => {
    setupMockEnv('mamiferos/index.html');
    const appModule = await import('../src/mamiferos/main.js');
    const app = appModule.default || window.app;
    await app.init();

    app.state.finalRanking = app.state.pool.slice(0, 16);
    await app.renderResultsView();

    const podiumEl = document.getElementById('podiumContainer');
    assert.ok(podiumEl, 'Podium container must exist');
    const podHtml = podiumEl.innerHTML;

    const podFgCount = (podHtml.match(/object-contain\s+object-center/g) || []).length;
    assert.strictEqual(podFgCount, 3, 'All 3 podium foregrounds must have object-contain object-center');

    const podBgCount = (podHtml.match(/blur-xl\s+opacity-65/g) || []).length;
    assert.strictEqual(podBgCount, 3, 'All 3 podium backdrops must have blur-xl opacity-65');

    const restEl = document.getElementById('restRankingContainer');
    assert.ok(restEl, 'Rest ranking container must exist');
    const restHtml = restEl.innerHTML;

    const restFgCount = (restHtml.match(/object-contain\s+object-center/g) || []).length;
    assert.strictEqual(restFgCount, 13, 'All 13 rest ranking items must have object-contain object-center');
  });

  await checkAsync('Photo 4.4: Podium and rest-of-ranking dynamically rendered containers in Flores', async () => {
    setupMockEnv('flores/index.html');
    const appModule = await import('../src/flores/main.js');
    const app = appModule.default || window.app;
    await app.init();

    app.state.finalRanking = app.state.pool.slice(0, 16);
    await app.renderResultsView();

    const podiumEl = document.getElementById('podiumContainer');
    assert.ok(podiumEl, 'Podium container must exist');
    const podHtml = podiumEl.innerHTML;

    const podFgCount = (podHtml.match(/object-contain\s+object-center/g) || []).length;
    assert.strictEqual(podFgCount, 3, 'All 3 podium foregrounds must have object-contain object-center');

    const podBgCount = (podHtml.match(/blur-xl\s+opacity-65/g) || []).length;
    assert.strictEqual(podBgCount, 3, 'All 3 podium backdrops must have blur-xl opacity-65');

    const restEl = document.getElementById('restRankingContainer');
    assert.ok(restEl, 'Rest ranking container must exist');
    const restHtml = restEl.innerHTML;

    const restFgCount = (restHtml.match(/object-contain\s+object-center/g) || []).length;
    assert.strictEqual(restFgCount, 13, 'All 13 rest ranking items must have object-contain object-center');
  });

  // ============================================================================
  // SECTION 5: RAPID INPUT FLOODING, SLIDER SCALING & MALFORMED INPUTS
  // ============================================================================
  console.log('\n--- Section 5: Rapid Input Flooding & Extreme Boundaries ---');

  await checkAsync('Edge 5.1: Rapid duplicate clicks (double-click debouncing) in duel', async () => {
    setupMockEnv('mamiferos/index.html');
    const appModule = await import('../src/mamiferos/main.js');
    const app = appModule.default || window.app;
    await app.init();
    app.startBattleGame(false);

    await new Promise(r => setTimeout(r, 2));
    assert.ok(app.state.pendingResolver);

    // Click once
    app.chooseCandidate('left');
    // Immediate double click before next step resolves
    assert.doesNotThrow(() => app.chooseCandidate('left'));
    assert.doesNotThrow(() => app.chooseCandidate('right'));
    assert.strictEqual(app.state.choiceHistory.length, 1);
  });

  await checkAsync('Edge 5.2: Rapid spam clicks on Undo button do not corrupt history', async () => {
    setupMockEnv('flores/index.html');
    const appModule = await import('../src/flores/main.js');
    const app = appModule.default || window.app;
    await app.init();
    app.startBattleGame(false);

    // Make 2 choices
    await new Promise(r => setTimeout(r, 2));
    app.chooseCandidate('left');
    await new Promise(r => setTimeout(r, 2));
    app.chooseCandidate('right');
    await new Promise(r => setTimeout(r, 2));

    assert.strictEqual(app.state.choiceHistory.length, 2);

    // Spam undo 5 times in rapid succession
    app.undoLastBattleChoice();
    assert.doesNotThrow(() => app.undoLastBattleChoice());
    assert.doesNotThrow(() => app.undoLastBattleChoice());
    assert.doesNotThrow(() => app.undoLastBattleChoice());

    await new Promise(r => setTimeout(r, 10));
    // Should safely rewind to 1 or 0 without negative length or crash
    assert.ok(app.state.choiceHistory.length >= 0);
    assert.ok(app.state.choiceHistory.length <= 1);
  });

  await checkAsync('Edge 5.3: Pokémon tournament scaling: N=8 and N=32 with undo cycles', async () => {
    for (const count of [8, 32]) {
      setupMockEnv('pokemon/index.html');
      const appModule = await import('../src/pokemon/main.js');
      const app = appModule.default || window.app;
      await app.init();

      const { stepsTaken, undosPerformed } = await simulateArenaTournamentWithUndos(app, `Pokémon-${count}`, count, 4);
      assert.strictEqual(app.state.finalRanking.length, count, `Ranking length must be ${count}`);
      assert.ok(stepsTaken > 0);
    }
  });

  check('Edge 5.4: Theme Manager initial dark class preservation on load', () => {
    const env = setupMockEnv('mamiferos/index.html');
    const { document } = env;

    // Simulate page loading with pre-existing dark class from SSR/HTML script
    document.documentElement.classList.add('dark');
    localStorage.setItem('rankea2_theme', 'dark');

    const darkIcon = document.getElementById('themeIconDark');
    const lightIcon = document.getElementById('themeIconLight');
    const label = document.getElementById('themeLabel');

    bindThemeButton({
      buttonId: 'themeToggle',
      labelId: 'themeLabel',
      iconDarkId: 'themeIconDark',
      iconLightId: 'themeIconLight'
    });

    // Dark mode state: darkIcon must be hidden, lightIcon visible, label 'Claro'
    assert.strictEqual(darkIcon.classList.contains('hidden'), true);
    assert.strictEqual(lightIcon.classList.contains('hidden'), false);
    assert.strictEqual(label.textContent, 'Claro');
  });

  await checkAsync('Edge 5.5: Corrupted or non-existent IDs in challenge URL degrade safely', async () => {
    const env = setupMockEnv('mamiferos/index.html');
    env.window.location.search = '?r=999999.888888.abc';
    const appModule = await import('../src/mamiferos/main.js');
    const app = appModule.default || window.app;
    await app.init();

    // Accepting challenge with non-existent IDs should not crash
    assert.doesNotThrow(() => app.acceptChallenge());
    // Pool remains safe
    assert.ok(app.state.pool.length > 0);
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log(`  ALL ADVERSARIAL CHECKS PASSED: ${passedChecks}/${totalChecks} (100.0%)`);
  console.log('================================================================\n');
}

runAllTests().catch(err => {
  console.error('Fatal error in stress test suite:', err);
  process.exit(1);
});
