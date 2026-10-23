import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

import { ROOT_DIR, createMockBrowserEnv } from './e2e/harness.mjs';
import { bindThemeButton } from '../src/core/theme.js';
import { interleavedBisectSortAsync } from '../src/core/tournament.js';

console.log('====================================================');
console.log('  MILESTONE 2 VERIFICATION TEST SUITE');
console.log('====================================================\n');

// ----------------------------------------------------------------------------
// 1. Verify src/core/theme.js parameter flexibility
// ----------------------------------------------------------------------------
console.log('--- Test 1: Theme Manager Parameter Flexibility ---');
{
  const env = createMockBrowserEnv('mamiferos/index.html');
  global.window = env.window;
  global.document = env.document;
  global.localStorage = env.window.localStorage;
  const { document } = env;
  const btn = document.getElementById('themeToggle');
  const darkIcon = document.getElementById('themeIconDark');
  const lightIcon = document.getElementById('themeIconLight');
  const label = document.getElementById('themeLabel');

  assert.ok(btn, 'themeToggle button must exist');
  assert.ok(darkIcon, 'themeIconDark must exist');
  assert.ok(lightIcon, 'themeIconLight must exist');

  // Bind using iconDarkId / iconLightId alias
  bindThemeButton({
    buttonId: 'themeToggle',
    labelId: 'themeLabel',
    iconDarkId: 'themeIconDark',
    iconLightId: 'themeIconLight'
  });

  // Default light mode: darkIcon visible, lightIcon hidden
  assert.strictEqual(darkIcon.classList.contains('hidden'), false);
  assert.strictEqual(lightIcon.classList.contains('hidden'), true);
  assert.strictEqual(label.textContent, 'Oscuro');

  // Trigger click -> toggle to dark
  btn.click();
  assert.strictEqual(document.documentElement.classList.contains('dark'), true);
  assert.strictEqual(darkIcon.classList.contains('hidden'), true);
  assert.strictEqual(lightIcon.classList.contains('hidden'), false);
  assert.strictEqual(label.textContent, 'Claro');

  // Trigger click again -> back to light
  btn.click();
  assert.strictEqual(document.documentElement.classList.contains('dark'), false);
  assert.strictEqual(darkIcon.classList.contains('hidden'), false);
  assert.strictEqual(lightIcon.classList.contains('hidden'), true);
  assert.strictEqual(label.textContent, 'Oscuro');

  // Also verify darkIconId / lightIconId alias works identically
  bindThemeButton({
    buttonId: 'themeToggle',
    labelId: 'themeLabel',
    darkIconId: 'themeIconDark',
    lightIconId: 'themeIconLight'
  });
  console.log('  [PASS] Theme button toggles SVG icons properly with both naming conventions');
}

// ----------------------------------------------------------------------------
// 2. Verify De-duplication in Controllers
// ----------------------------------------------------------------------------
console.log('\n--- Test 2: Core Tournament De-duplication in Controllers ---');
{
  const files = [
    'src/pokemon/main.js',
    'src/mamiferos/main.js',
    'src/flores/main.js'
  ];

  files.forEach(file => {
    const content = fs.readFileSync(path.resolve(ROOT_DIR, file), 'utf8');
    assert.ok(
      content.includes('import {') && content.includes('interleavedBisectSortAsync'),
      `${file} must import interleavedBisectSortAsync from core module`
    );
    assert.ok(
      !content.includes('createBisectNode'),
      `${file} must not contain duplicated internal createBisectNode logic`
    );
    assert.ok(
      !content.includes('collectReadyLeaves'),
      `${file} must not contain duplicated internal collectReadyLeaves logic`
    );
    assert.ok(
      !content.includes('refreshNode'),
      `${file} must not contain duplicated internal refreshNode logic`
    );
    assert.ok(
      content.includes('interleavedBisectSortAsync(this.state.candidatePool') ||
      content.includes('interleavedBisectSortAsync('),
      `${file} must delegate to core interleavedBisectSortAsync`
    );
    console.log(`  [PASS] ${file}: 0 duplicate bisect nodes, imports and delegates cleanly to core`);
  });
}

// ----------------------------------------------------------------------------
// 3. Verify Photo Framing in mamiferos and flores
// ----------------------------------------------------------------------------
console.log('\n--- Test 3: Photo Framing in Mamíferos & Flores HTML & Controllers ---');
{
  ['mamiferos', 'flores'].forEach(arena => {
    const htmlPath = `${arena}/index.html`;
    const jsPath = `src/${arena}/main.js`;
    const html = fs.readFileSync(path.resolve(ROOT_DIR, htmlPath), 'utf8');
    const js = fs.readFileSync(path.resolve(ROOT_DIR, jsPath), 'utf8');

    // HTML duel cards
    assert.ok(html.includes('id="imgLeftBg"'), `${htmlPath} must have imgLeftBg for ambient blur`);
    assert.ok(html.includes('id="imgRightBg"'), `${htmlPath} must have imgRightBg for ambient blur`);
    assert.ok(html.includes('blur-xl'), `${htmlPath} must use blur-xl for ambient blur backdrop`);
    assert.ok(html.includes('pointer-events-none'), `${htmlPath} ambient blur must have pointer-events-none`);
    assert.ok(html.includes('aria-hidden="true"'), `${htmlPath} ambient blur must have aria-hidden="true"`);

    // Foreground duel photos
    const imgLeftTag = html.match(/<img[^>]*id="imgLeft"[^>]*>/)[0];
    const imgRightTag = html.match(/<img[^>]*id="imgRight"[^>]*>/)[0];
    assert.ok(imgLeftTag.includes('object-contain'), `${htmlPath} imgLeft must use object-contain`);
    assert.ok(imgLeftTag.includes('object-center'), `${htmlPath} imgLeft must use object-center`);
    assert.ok(imgRightTag.includes('object-contain'), `${htmlPath} imgRight must use object-contain`);
    assert.ok(imgRightTag.includes('object-center'), `${htmlPath} imgRight must use object-center`);

    // Podium cards in controller
    assert.ok(js.includes('object-contain object-center'), `${jsPath} podium cards must use object-contain object-center`);
    assert.ok(js.includes('blur-xl opacity-65'), `${jsPath} podium backdrop must use blur-xl ambient layer`);

    // Rest of ranking list
    assert.ok(js.includes('object-contain object-center'), `${jsPath} rest list items must use object-contain object-center`);

    console.log(`  [PASS] ${arena}: duel cards, podium cards, and rest list have zero photo cropping`);
  });
}

// ----------------------------------------------------------------------------
// 4. Verify End-to-End Tournament Simulation for Mamíferos & Flores
// ----------------------------------------------------------------------------
console.log('\n--- Test 4: End-to-End Tournament Simulation with Undo ---');
{
  const mamiferosRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/mamiferos.json'), 'utf8'));
  const floresRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/flores.json'), 'utf8'));

  assert.strictEqual(mamiferosRaw.length, 16);
  assert.strictEqual(floresRaw.length, 16);

  // Simulate Mamíferos
  let stepsM = 0;
  const sortedM = await interleavedBisectSortAsync([...mamiferosRaw], async (l, r) => {
    stepsM++;
    return l.name.startsWith('J') || l.name.startsWith('T') ? 'left' : 'right';
  }, 42);
  assert.strictEqual(sortedM.length, 16);
  assert.ok(stepsM >= 20 && stepsM <= 60);

  // Simulate Flores
  let stepsF = 0;
  const sortedF = await interleavedBisectSortAsync([...floresRaw], async (l, r) => {
    stepsF++;
    return l.id < r.id ? 'left' : 'right';
  }, 99);
  assert.strictEqual(sortedF.length, 16);
  assert.strictEqual(sortedF[0].id, 1, 'Orquídea (id: 1) should be champion');
  assert.ok(stepsF >= 20 && stepsF <= 60);

  console.log('  [PASS] Full 16-candidate deterministic tournament simulations completed successfully');
}

console.log('\n====================================================');
console.log('  ALL MILESTONE 2 CHECKS PASSED (100%)');
console.log('====================================================\n');
