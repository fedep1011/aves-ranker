import fs from 'node:fs';
import assert from 'node:assert';

console.log('--- INDEPENDENT FORENSIC AUDIT CHECKS: MILESTONE 2 ---');

// 1. Controller authentic delegation and duplicate removal
const controllers = ['src/pokemon/main.js', 'src/mamiferos/main.js', 'src/flores/main.js'];
for (const file of controllers) {
  const code = fs.readFileSync(file, 'utf8');
  assert.ok(code.includes('import {') && code.includes('interleavedBisectSortAsync'), `Must import interleavedBisectSortAsync in ${file}`);
  assert.ok(!code.includes('createBisectNode'), `Duplicate createBisectNode must not exist in ${file}`);
  assert.ok(!code.includes('collectReadyLeaves'), `Duplicate collectReadyLeaves must not exist in ${file}`);
  assert.ok(!code.includes('refreshNode'), `Duplicate refreshNode must not exist in ${file}`);
  assert.ok(code.includes('interleavedBisectSortAsync('), `Must delegate to interleavedBisectSortAsync in ${file}`);
  console.log(`[PASS] ${file}: authentic delegation, 0 duplicate bisect code`);
}

// 2. Theme manager parameter aliasing
const themeCode = fs.readFileSync('src/core/theme.js', 'utf8');
assert.ok(themeCode.includes('darkIconId || iconDarkId'), 'theme.js must alias darkIconId and iconDarkId');
assert.ok(themeCode.includes('lightIconId || iconLightId'), 'theme.js must alias lightIconId and iconLightId');
console.log('[PASS] src/core/theme.js: parameter aliasing verified');

// 3. Zero-crop photo framing in HTML and JS
const arenas = ['mamiferos', 'flores'];
for (const arena of arenas) {
  const html = fs.readFileSync(`${arena}/index.html`, 'utf8');
  const js = fs.readFileSync(`src/${arena}/main.js`, 'utf8');

  assert.ok(html.includes('id="imgLeftBg"'), `${arena}/index.html missing imgLeftBg`);
  assert.ok(html.includes('id="imgRightBg"'), `${arena}/index.html missing imgRightBg`);
  assert.ok(html.includes('blur-xl'), `${arena}/index.html missing blur-xl`);
  assert.ok(html.includes('pointer-events-none'), `${arena}/index.html missing pointer-events-none`);
  assert.ok(html.includes('aria-hidden="true"'), `${arena}/index.html missing aria-hidden`);
  assert.ok(html.includes('object-contain'), `${arena}/index.html missing object-contain`);

  assert.ok(js.includes('imgLeftBg'), `src/${arena}/main.js missing imgLeftBg handler`);
  assert.ok(js.includes('imgRightBg'), `src/${arena}/main.js missing imgRightBg handler`);
  assert.ok(js.includes('blur-xl opacity-65'), `src/${arena}/main.js missing podium backdrop blur`);
  console.log(`[PASS] ${arena}: zero-crop photo framing verified across HTML & JS`);
}

// 4. Check for hardcoded test results or mock shortcuts
for (const file of controllers) {
  const code = fs.readFileSync(file, 'utf8');
  const suspicious = [
    'return true; // test',
    'return false; // test',
    'isTest',
    '__test__',
    'mockResolve',
    'fakeSort'
  ];
  for (const s of suspicious) {
    assert.ok(!code.includes(s), `Suspicious mock or test artifact '${s}' found in ${file}`);
  }
}
console.log('[PASS] Controllers: 0 hardcoded test results or mock bypasses detected');

console.log('--- ALL INDEPENDENT FORENSIC CHECKS PASSED ---');
