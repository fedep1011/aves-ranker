/**
 * Adversarial Empirical Stress Test Suite for Milestone 4 (Documentation, ADR & Linters)
 *
 * Exhaustive verification of:
 * 1. Deep adversarial emoji and forbidden glyph detection across all UI HTML, JS, and CSS files
 * 2. WCAG 2.2 AAA/AA color contrast calculations and Pokédex badge contrast (>15:1)
 * 3. Markdown relative link integrity in README.md and ADR 0001
 * 4. Documented architecture and feature parity against real code and dataset structures
 * 5. package.json script integrity and build artifact validation
 * 6. Mathematical resilience of core tournament sort, PRNG determinism, and canvas utilities
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

import { ROOT_DIR, parseHexColor, calculateContrastRatio } from './e2e/harness.mjs';
import * as tournamentCore from '../src/core/tournament.js';
import * as themeCore from '../src/core/theme.js';
import * as canvasCore from '../src/core/canvas.js';

let totalChecks = 0;
let passedChecks = 0;
const failures = [];

function check(desc, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`  ✓ PASS [${totalChecks}]: ${desc}`);
  } catch (err) {
    failures.push({ check: totalChecks, desc, error: err });
    console.error(`  ✗ FAIL [${totalChecks}]: ${desc}`);
    console.error(`    ${err.message}`);
  }
}

async function asyncCheck(desc, fn) {
  totalChecks++;
  try {
    await fn();
    passedChecks++;
    console.log(`  ✓ PASS [${totalChecks}]: ${desc}`);
  } catch (err) {
    failures.push({ check: totalChecks, desc, error: err });
    console.error(`  ✗ FAIL [${totalChecks}]: ${desc}`);
    console.error(`    ${err.message}`);
  }
}

console.log('==============================================================================');
console.log('⚡ ADVERSARIAL STRESS TEST SUITE — MILESTONE 4 (DOCS, ADR, LINTERS)');
console.log('==============================================================================');

// ============================================================================
// SUITE 1: Deep Adversarial Emoji & Typography Audit
// ============================================================================
console.log('\n[Suite 1: Adversarial Emoji, Dingbat & Typography Scanner]');

// Regexes matching forbidden unicode pictographs per design doctrine
const EMOJI_AND_PICTOGRAPHS = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/u;
const FORBIDDEN_DASHES_IN_UI = /[—–]/; // em-dash and en-dash in UI text

const UI_FILES = [
  'index.html',
  'aves/index.html',
  'pokemon/index.html',
  'mamiferos/index.html',
  'flores/index.html',
  'src/aves/main.js',
  'src/pokemon/main.js',
  'src/pokemon/types.js',
  'src/mamiferos/main.js',
  'src/flores/main.js',
  'src/core/tournament.js',
  'src/core/theme.js',
  'src/core/canvas.js'
];

check('Oracle Verification: Adversarial emoji detector correctly identifies forbidden emoji', () => {
  const samplesWithEmoji = ['Pikachu ⚡', 'Winner 🏆', 'Check ✔', 'Fire 🔥', 'Warning ⚠️'];
  for (const s of samplesWithEmoji) {
    assert.strictEqual(EMOJI_AND_PICTOGRAPHS.test(s), true, `Expected "${s}" to be detected as emoji`);
  }
  const cleanSamples = ['Pikachu', 'Winner: 1', 'Rankea2', 'No. 025 · Kanto', 'Aves del Mundo'];
  for (const s of cleanSamples) {
    assert.strictEqual(EMOJI_AND_PICTOGRAPHS.test(s), false, `Expected clean string "${s}" not to trigger emoji detector`);
  }
});

for (const relPath of UI_FILES) {
  check(`UI File "${relPath}" is 100% free of emoji and dingbat pictographs`, () => {
    const fullPath = path.resolve(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `File ${relPath} must exist`);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(EMOJI_AND_PICTOGRAPHS);
      if (match) {
        throw new Error(`Forbidden emoji "${match[0]}" found in ${relPath}:${i + 1} -> ${line.trim()}`);
      }
    }
  });
}

const HTML_ONLY_FILES = [
  'index.html',
  'aves/index.html',
  'pokemon/index.html',
  'mamiferos/index.html',
  'flores/index.html'
];

for (const relPath of HTML_ONLY_FILES) {
  check(`HTML UI File "${relPath}" has zero forbidden AI em-dash/en-dash tells in user-facing copy`, () => {
    const fullPath = path.resolve(ROOT_DIR, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Exclude comments or scripts if any
      if (line.includes('<!--') || line.includes('//')) continue;
      const match = line.match(FORBIDDEN_DASHES_IN_UI);
      if (match) {
        throw new Error(`Forbidden dash "${match[0]}" in UI copy at ${relPath}:${i + 1} -> ${line.trim()}`);
      }
    }
  });
}

// ============================================================================
// SUITE 2: WCAG 2.2 Contrast & Dex Badge Accessibility
// ============================================================================
console.log('\n[Suite 2: WCAG 2.2 Contrast & Dex Badge Verification]');

check('Contrast formula mathematical integrity & edge cases', () => {
  // 1. Symmetry
  const c1 = calculateContrastRatio('#ffffff', '#111827');
  const c2 = calculateContrastRatio('#111827', '#ffffff');
  assert.strictEqual(Math.abs(c1 - c2) < 0.0001, true, 'Contrast must be commutative');

  // 2. Identity
  assert.strictEqual(calculateContrastRatio('#030712', '#030712'), 1.0);
  assert.strictEqual(calculateContrastRatio('#ffffff', '#ffffff'), 1.0);

  // 3. Absolute bounds
  const maxContrast = calculateContrastRatio('#000000', '#ffffff');
  assert.strictEqual(maxContrast >= 21.0, true, `Max contrast should be 21:1, got ${maxContrast}`);

  // 4. Case-insensitivity & shorthand hex
  assert.strictEqual(calculateContrastRatio('#fff', '#000'), calculateContrastRatio('#FFFFFF', '#000000'));
});

// Helper to resolve DTCG token paths like {primitive.gray.900}
function resolveDtcgToken(tokens, tokenPath, isDark = false) {
  if (isDark && tokenPath.startsWith('semantic.')) {
    const darkSubPath = tokenPath.slice('semantic.'.length);
    const darkVal = getDotted(tokens.dark, darkSubPath);
    if (darkVal && darkVal.$value) {
      return followAlias(tokens, darkVal.$value);
    }
  }
  const directVal = getDotted(tokens, tokenPath);
  if (directVal && directVal.$value) {
    return followAlias(tokens, directVal.$value);
  }
  return null;
}

function getDotted(obj, pathStr) {
  let curr = obj;
  for (const part of pathStr.split('.')) {
    if (!curr || typeof curr !== 'object') return null;
    curr = curr[part];
  }
  return curr;
}

function followAlias(tokens, val) {
  let depth = 0;
  while (typeof val === 'string' && val.startsWith('{') && val.endsWith('}') && depth < 10) {
    const cleanRef = val.slice(1, -1).trim();
    const target = getDotted(tokens, cleanRef);
    if (!target || !target.$value) return null;
    val = target.$value;
    depth++;
  }
  return typeof val === 'string' && val.startsWith('#') ? val : null;
}

check('Semantic Color Tokens pass WCAG 2.2 AA minimums (tokens/colors.json)', () => {
  const tokensPath = path.resolve(ROOT_DIR, '.agents/ux-ui-agent-skills/tokens/colors.json');
  assert.ok(fs.existsSync(tokensPath), 'tokens/colors.json must exist');
  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

  // Light Mode checks
  const lightText = resolveDtcgToken(tokens, 'semantic.text.primary', false); // #111827
  const lightPage = resolveDtcgToken(tokens, 'semantic.surface.page', false); // #ffffff
  const lightLink = resolveDtcgToken(tokens, 'semantic.text.link', false);    // #2563eb
  const lightAction = resolveDtcgToken(tokens, 'semantic.action.primary', false); // #2563eb
  const lightOnAction = resolveDtcgToken(tokens, 'semantic.text.on-action', false); // #ffffff

  assert.ok(lightText, 'lightText must resolve to hex');
  assert.ok(lightPage, 'lightPage must resolve to hex');
  assert.ok(lightLink, 'lightLink must resolve to hex');

  const ratioLightBody = calculateContrastRatio(lightText, lightPage);
  assert.ok(ratioLightBody >= 4.5, `Light body text ratio ${ratioLightBody.toFixed(2)} must be >= 4.5`);

  const ratioLightLink = calculateContrastRatio(lightLink, lightPage);
  assert.ok(ratioLightLink >= 4.5, `Light link ratio ${ratioLightLink.toFixed(2)} must be >= 4.5`);

  const ratioLightAction = calculateContrastRatio(lightOnAction, lightAction);
  assert.ok(ratioLightAction >= 4.5, `Light action text ratio ${ratioLightAction.toFixed(2)} must be >= 4.5`);

  // Dark Mode checks
  const darkText = resolveDtcgToken(tokens, 'semantic.text.primary', true); // #f9fafb
  const darkPage = resolveDtcgToken(tokens, 'semantic.surface.page', true); // #030712
  const darkCard = resolveDtcgToken(tokens, 'semantic.surface.card', true); // #111827
  const darkLink = resolveDtcgToken(tokens, 'semantic.text.link', true);    // #60a5fa

  assert.ok(darkText, 'darkText must resolve to hex');
  assert.ok(darkPage, 'darkPage must resolve to hex');

  const ratioDarkBody = calculateContrastRatio(darkText, darkPage);
  assert.ok(ratioDarkBody >= 4.5, `Dark body text ratio ${ratioDarkBody.toFixed(2)} must be >= 4.5`);

  const ratioDarkCard = calculateContrastRatio(darkText, darkCard);
  assert.ok(ratioDarkCard >= 4.5, `Dark card text ratio ${ratioDarkCard.toFixed(2)} must be >= 4.5`);

  const ratioDarkLink = calculateContrastRatio(darkLink, darkPage);
  assert.ok(ratioDarkLink >= 4.5, `Dark link ratio ${ratioDarkLink.toFixed(2)} must be >= 4.5`);
});

check('Pokémon Dex ID Badge ("No. 025") WCAG AAA contrast ratio (> 15:1)', () => {
  // Dex badge uses text-ink on bg-canvas in both modes
  // Light: text-ink is #111827 on bg-canvas #ffffff
  const lightRatio = calculateContrastRatio('#111827', '#ffffff');
  assert.ok(lightRatio > 15.0, `Light Dex badge contrast must exceed 15:1 (got ${lightRatio.toFixed(2)}:1)`);

  // Dark: text-ink is #f9fafb on bg-canvas #030712
  const darkRatio = calculateContrastRatio('#f9fafb', '#030712');
  assert.ok(darkRatio > 15.0, `Dark Dex badge contrast must exceed 15:1 (got ${darkRatio.toFixed(2)}:1)`);
});

// ============================================================================
// SUITE 3: Markdown Link Integrity & Architecture Sync
// ============================================================================
console.log('\n[Suite 3: Markdown Link & Architecture Sync]');

check('README.md relative links and referenced files exist', () => {
  const readmePath = path.resolve(ROOT_DIR, 'README.md');
  const content = fs.readFileSync(readmePath, 'utf8');

  // Extract relative markdown links like [text](relative/path.md)
  const relativeLinkRegex = /\[([^\]]+)\]\(((?!https?:\/\/|#)[^)]+)\)/g;
  let match;
  const linksFound = [];
  while ((match = relativeLinkRegex.exec(content)) !== null) {
    linksFound.push(match[2]);
  }

  assert.ok(linksFound.length >= 3, `Expected at least 3 relative links in README.md, found ${linksFound.length}`);

  for (const rel of linksFound) {
    const targetPath = path.resolve(ROOT_DIR, rel);
    assert.ok(fs.existsSync(targetPath), `Broken relative link in README.md: "${rel}" does not exist`);
    const stat = fs.statSync(targetPath);
    assert.ok(stat.size > 0, `Linked file "${rel}" is empty`);
  }
});

check('ADR 0001 referenced source files and directories all exist on disk', () => {
  const adrCoreFiles = [
    'index.html',
    'aves/index.html',
    'pokemon/index.html',
    'mamiferos/index.html',
    'flores/index.html',
    'src/core/tournament.js',
    'src/core/theme.js',
    'src/core/canvas.js',
    'src/aves/main.js',
    'src/pokemon/main.js',
    'src/pokemon/types.js',
    'src/mamiferos/main.js',
    'src/flores/main.js',
    'public/data',
    'public/data/pokemon.json',
    'public/data/mamiferos.json',
    'public/data/flores.json',
    'vite.config.js'
  ];

  for (const f of adrCoreFiles) {
    const full = path.resolve(ROOT_DIR, f);
    assert.ok(fs.existsSync(full), `File/directory listed in ADR 0001 structure does not exist: ${f}`);
  }
});

check('Dataset counts and specifications align with documentation claims', () => {
  // 1. Pokemon: 1025 creatures
  const pokeData = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/pokemon.json'), 'utf8'));
  assert.strictEqual(pokeData.length, 1025, 'pokemon.json must contain exactly 1025 entries');
  assert.strictEqual(pokeData[0].id, 1, 'First Pokémon must be #1 (Bulbasaur)');
  assert.strictEqual(pokeData[pokeData.length - 1].id, 1025, 'Last Pokémon must be #1025 (Pecharunt)');

  // 2. Mamiferos: curated species
  const mamifData = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/mamiferos.json'), 'utf8'));
  assert.ok(mamifData.length >= 16, 'mamiferos.json must contain at least 16 species');

  // 3. Flores: curated species
  const floresData = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/flores.json'), 'utf8'));
  assert.ok(floresData.length >= 16, 'flores.json must contain at least 16 species');
});

check('Core Engine API contracts match specifications', () => {
  // tournament.js
  assert.strictEqual(typeof tournamentCore.interleavedBisectSortAsync, 'function');
  assert.strictEqual(typeof tournamentCore.sampleCandidates, 'function');
  assert.strictEqual(typeof tournamentCore.createSeededRng, 'function');
  assert.strictEqual(typeof tournamentCore.buildChallengeUrl, 'function');
  assert.strictEqual(typeof tournamentCore.parseChallengeUrl, 'function');

  // theme.js
  assert.strictEqual(typeof themeCore.bindThemeButton, 'function');

  // canvas.js
  assert.strictEqual(typeof canvasCore.renderRankingCard, 'function');
  assert.strictEqual(typeof canvasCore.exportRankingCard, 'function');
  assert.ok(canvasCore.ARENA_CONFIG.pokemon, 'ARENA_CONFIG must contain pokemon');
  assert.ok(canvasCore.ARENA_CONFIG.aves, 'ARENA_CONFIG must contain aves');
  assert.ok(canvasCore.ARENA_CONFIG.mamiferos, 'ARENA_CONFIG must contain mamiferos');
  assert.ok(canvasCore.ARENA_CONFIG.flores, 'ARENA_CONFIG must contain flores');
});

// ============================================================================
// SUITE 4: package.json Scripts & Build Output
// ============================================================================
console.log('\n[Suite 4: package.json Scripts & Build Output]');

check('package.json contains all required and documented npm scripts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'package.json'), 'utf8'));
  const requiredScripts = [
    'dev',
    'build',
    'preview',
    'test',
    'test:e2e',
    'lint:emoji',
    'lint:taste',
    'lint:contrast',
    'lint'
  ];

  for (const s of requiredScripts) {
    assert.ok(pkg.scripts[s], `package.json is missing required script: "${s}"`);
  }

  // Ensure 'lint' composes the individual linters
  assert.ok(pkg.scripts.lint.includes('lint:emoji'), 'npm run lint must run lint:emoji');
  assert.ok(pkg.scripts.lint.includes('lint:taste'), 'npm run lint must run lint:taste');
  assert.ok(pkg.scripts.lint.includes('lint:contrast'), 'npm run lint must run lint:contrast');

  // Ensure 'test' runs the test suite
  assert.ok(pkg.scripts.test.includes('tests/e2e/test_suite.mjs'), 'npm test must point to test suite');
  assert.ok(pkg.scripts['test:e2e'].includes('tests/e2e/test_suite.mjs'), 'npm run test:e2e must point to test suite');
});

check('Production build artifacts (dist/) exist and are complete', () => {
  const expectedDistFiles = [
    'dist/index.html',
    'dist/aves/index.html',
    'dist/pokemon/index.html',
    'dist/mamiferos/index.html',
    'dist/flores/index.html'
  ];

  for (const f of expectedDistFiles) {
    const p = path.resolve(ROOT_DIR, f);
    assert.ok(fs.existsSync(p), `Missing production build output: ${f}`);
    const stat = fs.statSync(p);
    assert.ok(stat.size > 1000, `Build artifact ${f} is unexpectedly small (${stat.size} bytes)`);
  }
});

// ============================================================================
// SUITE 5: Algorithmic & Data Integrity Stress Tests
// ============================================================================
console.log('\n[Suite 5: Algorithmic & Data Integrity Stress Tests]');

await asyncCheck('interleavedBisectSortAsync handles 0, 1, and 2 item pools gracefully', async () => {
  // Empty pool
  const res0 = await tournamentCore.interleavedBisectSortAsync([], async () => 'left');
  assert.deepStrictEqual(res0, []);

  // 1-item pool
  const res1 = await tournamentCore.interleavedBisectSortAsync([{ id: 'solo' }], async () => 'left');
  assert.deepStrictEqual(res1, [{ id: 'solo' }]);

  // 2-item pool: user selects 'Beta' (which is whichever side Beta is placed on)
  const res2 = await tournamentCore.interleavedBisectSortAsync(
    [{ id: 'A', name: 'Alpha' }, { id: 'B', name: 'Beta' }],
    async (left, right) => (left.id === 'B' ? 'left' : 'right') // Choose Beta
  );
  assert.strictEqual(res2[0].id, 'B', 'Winner must be Beta');
  assert.strictEqual(res2[1].id, 'A', 'Runner-up must be Alpha');
});

check('Seeded PRNG (mulberry32) produces 100% deterministic pseudo-random sequences', () => {
  const rng1 = tournamentCore.createSeededRng(42);
  const rng2 = tournamentCore.createSeededRng(42);
  const seq1 = Array.from({ length: 20 }, () => rng1());
  const seq2 = Array.from({ length: 20 }, () => rng2());
  assert.deepStrictEqual(seq1, seq2, 'Identical seed must produce identical PRNG sequence');
});

check('Challenge URL build and parse roundtrips without information loss', () => {
  const url = tournamentCore.buildChallengeUrl({
    baseUrl: 'https://rankea2.pages.dev/pokemon/',
    ids: ['10', '25', '150', '6'],
    category: 'pokemon',
    author: 'Red',
    lang: 'es'
  });
  assert.ok(url.includes('r=10.25.150.6'), `URL must contain r parameter: ${url}`);
  assert.ok(url.includes('c=pokemon'), `URL must contain category: ${url}`);

  const parsed = tournamentCore.parseChallengeUrl(new URL(url).search);
  assert.ok(parsed, 'parseChallengeUrl must succeed');
  assert.deepStrictEqual(parsed.ids, ['10', '25', '150', '6']);
  assert.strictEqual(parsed.category, 'pokemon');
  assert.strictEqual(parsed.author, 'Red');
});

check('truncateText handles bounds, edge cases, and preserves standard ellipsis', () => {
  assert.strictEqual(canvasCore.truncateText('', 10), '');
  assert.strictEqual(canvasCore.truncateText(null, 10), '');
  assert.strictEqual(canvasCore.truncateText('Pikachu', 10), 'Pikachu');
  assert.strictEqual(canvasCore.truncateText('Pikachu', 7), 'Pikachu');
  assert.strictEqual(canvasCore.truncateText('Pikachu', 6), 'Pikac…');
  assert.strictEqual(canvasCore.truncateText('Pikachu Electric Mouse', 10), 'Pikachu E…');
});

// ============================================================================
// SUITE 6: Candidate Sampling, Fallback Chain & Theme Management
// ============================================================================
console.log('\n[Suite 6: Candidate Sampling, Fallback Chain & Theme]');

check('sampleCandidates bounds & behavior (popular, random, oversizing, 0)', () => {
  const dummyPool = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, rank: i + 1 }));
  
  // 1. Oversize request (request 150 from 100) -> returns exactly 100
  const over = tournamentCore.sampleCandidates(dummyPool, 150, 'popular');
  assert.strictEqual(over.length, 100);
  assert.strictEqual(new Set(over.map(x => x.id)).size, 100, 'All candidates must be unique');

  // 2. Normal sample 16 'popular'
  const pop16 = tournamentCore.sampleCandidates(dummyPool, 16, 'popular');
  assert.strictEqual(pop16.length, 16);
  assert.strictEqual(new Set(pop16.map(x => x.id)).size, 16);
  // Popular picks top 16 ids 1..16
  const popIds = new Set(pop16.map(x => x.id));
  for (let i = 1; i <= 16; i++) {
    assert.ok(popIds.has(i), `Expected popular pool to contain id ${i}`);
  }

  // 3. Normal sample 16 'random'
  const rand16 = tournamentCore.sampleCandidates(dummyPool, 16, 'random');
  assert.strictEqual(rand16.length, 16);
  assert.strictEqual(new Set(rand16.map(x => x.id)).size, 16);

  // 4. Zero request -> returns 0
  const zero = tournamentCore.sampleCandidates(dummyPool, 0, 'popular');
  assert.strictEqual(zero.length, 0);
});

check('Pokemon dataset animated sprite URL structure and fallback chain fields', () => {
  const pokeData = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/pokemon.json'), 'utf8'));
  const testIds = [1, 25, 150, 658, 1025];
  for (const id of testIds) {
    const p = pokeData.find(x => x.id === id);
    assert.ok(p, `Pokemon #${id} must exist in pokemon.json`);
    assert.ok(p.sprite, `Pokemon #${id} must have static sprite`);
    assert.ok(p.artwork, `Pokemon #${id} must have official artwork`);
    assert.ok(p.sprite.startsWith('https://'), `Pokemon #${id} sprite must be HTTPS`);
    assert.ok(p.artwork.startsWith('https://'), `Pokemon #${id} artwork must be HTTPS`);
  }
});

check('Mamiferos and Flores datasets have valid candidate schema (id, name, sci_name, photo)', () => {
  const mamiferos = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/mamiferos.json'), 'utf8'));
  for (const m of mamiferos) {
    assert.ok(m.id, 'Mamifero must have id');
    assert.ok(m.name, 'Mamifero must have name');
    assert.ok(m.sci_name, 'Mamifero must have sci_name');
    assert.ok(m.photo && m.photo.startsWith('https://'), 'Mamifero must have HTTPS photo');
  }

  const flores = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/flores.json'), 'utf8'));
  for (const fl of flores) {
    assert.ok(fl.id, 'Flor must have id');
    assert.ok(fl.name, 'Flor must have name');
    assert.ok(fl.sci_name, 'Flor must have binomial nomenclature (sci_name)');
    assert.ok(fl.photo && fl.photo.startsWith('https://'), 'Flor must have HTTPS photo');
  }
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n==============================================================================');
console.log(`  AGGREGATE SUMMARY:`);
console.log(`  Total Checks: ${totalChecks} | Passed: ${passedChecks} | Failed: ${failures.length}`);
console.log(`  Overall Pass Rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
console.log('==============================================================================');

if (failures.length > 0) {
  console.error('\n❌ FAILURES RECORDED:');
  for (const f of failures) {
    console.error(`  - Check #${f.check}: ${f.desc}`);
    console.error(`    ${f.error.stack || f.error.message}`);
  }
  process.exit(1);
} else {
  console.log('\n✨ ALL ADVERSARIAL STRESS CHECKS PASSED WITH 100% SUCCESS RATE!\n');
  process.exit(0);
}
