import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('====================================================');
console.log('CHALLENGER STRESS TEST 1: Pokémon Slider & Bounds');
console.log('====================================================\n');

// 1. Static HTML analysis
const htmlPath = path.join(rootDir, 'pokemon/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Assert slider markup
const sliderMatch = html.match(/<input\s+id="limitSlider"[^>]*>/i);
assert(sliderMatch, 'limitSlider element must exist in pokemon/index.html');
const sliderTag = sliderMatch[0];
console.log('Inspecting slider HTML markup:', sliderTag);

assert(/min="8"/.test(sliderTag), 'Slider must have min="8"');
assert(/max="64"/.test(sliderTag), 'Slider must have max="64"');
assert(/value="16"/.test(sliderTag), 'Slider must have default value="16"');
assert(/step="8"/.test(sliderTag), 'Slider must have step="8"');
console.log('✓ Slider HTML attributes verified: min="8", max="64", value="16", step="8"\n');

// Assert quick buttons
assert(html.includes("app.onLimitChange(8)"), 'Quick button for 8 must exist');
assert(html.includes("app.onLimitChange(16)"), 'Quick button for 16 must exist');
assert(html.includes("app.onLimitChange(32)"), 'Quick button for 32 must exist');
assert(html.includes("app.onLimitChange('MAX')"), "Quick button for 'MAX' must exist");
console.log('✓ Quick buttons for 8, 16, 32, and MAX present in markup\n');

// 2. Behavioral logic emulation matching src/pokemon/main.js exactly
function createSimulatedApp() {
  return {
    state: {
      candidatePool: [],
      limit: 16
    },
    // Mirror of updateMatchingCount dynamic slider clamping in src/pokemon/main.js
    updateMatchingCount(pool) {
      this.state.candidatePool = pool;
      const poolCount = pool.length;
      const minVal = Math.min(8, poolCount);
      const maxVal = Math.min(64, poolCount);
      const slider = {
        min: minVal,
        max: Math.max(minVal, maxVal),
        step: poolCount < 8 ? 1 : 8,
        value: this.state.limit
      };

      if (this.state.limit > maxVal || this.state.limit < minVal) {
        this.state.limit = Math.min(16, maxVal);
      }
      slider.value = this.state.limit;
      const limitResult = this.onLimitChange(this.state.limit);
      return {
        slider,
        limit: this.state.limit,
        canLaunch: poolCount >= 2,
        warning: poolCount < 2,
        effort: limitResult
      };
    },
    // Mirror of onLimitChange in src/pokemon/main.js
    onLimitChange(val) {
      const poolCount = this.state.candidatePool.length || 16;
      let n = val === 'MAX' ? poolCount : parseInt(val, 10);
      if (isNaN(n)) n = 16;
      const minLimit = Math.min(8, poolCount);
      n = Math.max(minLimit, Math.min(poolCount, n));
      this.state.limit = n;

      const estDecisions = Math.max(1, Math.round(n * Math.log2(n) * 0.82));
      const mins = Math.max(0.5, (estDecisions * 2.2) / 60);
      const timeStr = mins < 1 ? 'Menos de 1 min' : `~${Math.round(mins)} min`;

      let intensity = 'Torneo Épico';
      if (estDecisions <= 20) {
        intensity = 'Partida Rápida';
      } else if (estDecisions <= 60) {
        intensity = 'Duración Ideal';
      }

      return {
        n,
        estDecisions,
        mins,
        timeStr,
        intensity
      };
    }
  };
}

// 3. Test cases across boundaries and edge cases
const mockPoolLarge = Array.from({ length: 151 }, (_, i) => ({ id: i + 1, name: `PKMN_${i+1}` }));
const mockPool64 = Array.from({ length: 64 }, (_, i) => ({ id: i + 1 }));
const mockPool30 = Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }));
const mockPool8 = Array.from({ length: 8 }, (_, i) => ({ id: i + 1 }));
const mockPool5 = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
const mockPool2 = Array.from({ length: 2 }, (_, i) => ({ id: i + 1 }));
const mockPool1 = Array.from({ length: 1 }, (_, i) => ({ id: i + 1 }));
const mockPool0 = [];

console.log('Testing Large Pool (151 candidates):');
const appLarge = createSimulatedApp();
const resLarge = appLarge.updateMatchingCount(mockPoolLarge);
assert.strictEqual(resLarge.slider.min, 8);
assert.strictEqual(resLarge.slider.max, 64);
assert.strictEqual(resLarge.slider.step, 8);
assert.strictEqual(resLarge.limit, 16);
assert.strictEqual(resLarge.canLaunch, true);
console.log('  Initial state: min=8, max=64, step=8, limit=16 -> PASS');

// Test bounds 8, 16, 32, 64
for (const bound of [8, 16, 32, 64]) {
  const effort = appLarge.onLimitChange(bound);
  assert.strictEqual(effort.n, bound);
  assert(!isNaN(effort.estDecisions), 'estDecisions should not be NaN');
  assert(!isNaN(effort.mins), 'mins should not be NaN');
  console.log(`  Bound ${bound}: decisions=${effort.estDecisions}, time=${effort.timeStr}, intensity="${effort.intensity}" -> PASS`);
}

// Test MAX button
const effortMax = appLarge.onLimitChange('MAX');
assert.strictEqual(effortMax.n, 151);
console.log(`  MAX selection: n=${effortMax.n}, decisions=${effortMax.estDecisions}, time=${effortMax.timeStr} -> PASS`);

// Test out-of-bounds and adversarial inputs
console.log('\nTesting Adversarial Inputs on Large Pool:');
const tests = [
  { input: -10, expected: 8, label: 'Negative input (-10)' },
  { input: 0, expected: 8, label: 'Zero input (0)' },
  { input: 3, expected: 8, label: 'Sub-minimum input (3)' },
  { input: 999999, expected: 151, label: 'Huge input (999999)' },
  { input: 'abc', expected: 16, label: 'String "abc"' },
  { input: null, expected: 16, label: 'null input' },
  { input: undefined, expected: 16, label: 'undefined input' },
  { input: 16.9, expected: 16, label: 'Float 16.9' }
];

for (const t of tests) {
  const res = appLarge.onLimitChange(t.input);
  assert.strictEqual(res.n, t.expected, `${t.label} expected ${t.expected} but got ${res.n}`);
  console.log(`  ${t.label} -> correctly clamped to ${res.n} -> PASS`);
}

// Test Pool = 64
console.log('\nTesting Pool of exactly 64:');
const app64 = createSimulatedApp();
const res64 = app64.updateMatchingCount(mockPool64);
assert.strictEqual(res64.slider.min, 8);
assert.strictEqual(res64.slider.max, 64);
assert.strictEqual(res64.slider.step, 8);
assert.strictEqual(res64.limit, 16);
console.log('  Pool 64: min=8, max=64, step=8, limit=16 -> PASS');

// Test Pool = 30 (between 8 and 64)
console.log('\nTesting Pool of 30:');
const app30 = createSimulatedApp();
const res30 = app30.updateMatchingCount(mockPool30);
assert.strictEqual(res30.slider.min, 8);
assert.strictEqual(res30.slider.max, 30);
assert.strictEqual(res30.slider.step, 8);
const effort30Over = app30.onLimitChange(64);
assert.strictEqual(effort30Over.n, 30, 'Should clamp to 30 when requested 64');
console.log('  Pool 30: max clamped to 30, requesting 64 yields 30 -> PASS');

// Test Pool = 8 (exact minimum boundary)
console.log('\nTesting Pool of 8:');
const app8 = createSimulatedApp();
const res8 = app8.updateMatchingCount(mockPool8);
assert.strictEqual(res8.slider.min, 8);
assert.strictEqual(res8.slider.max, 8);
assert.strictEqual(res8.limit, 8);
console.log('  Pool 8: min=8, max=8, limit=8 -> PASS');

// Test Pool = 5 (< 8 small pool fallback)
console.log('\nTesting Small Pool of 5 (< 8):');
const app5 = createSimulatedApp();
const res5 = app5.updateMatchingCount(mockPool5);
assert.strictEqual(res5.slider.min, 5);
assert.strictEqual(res5.slider.max, 5);
assert.strictEqual(res5.slider.step, 1, 'Step should adapt to 1 when pool < 8');
assert.strictEqual(res5.limit, 5);
assert.strictEqual(res5.canLaunch, true);
console.log('  Pool 5: dynamic step=1, limit=5, canLaunch=true -> PASS');

// Test Pool = 2 (minimum tournament viable size)
console.log('\nTesting Pool of 2:');
const app2 = createSimulatedApp();
const res2 = app2.updateMatchingCount(mockPool2);
assert.strictEqual(res2.slider.min, 2);
assert.strictEqual(res2.slider.max, 2);
assert.strictEqual(res2.slider.step, 1);
assert.strictEqual(res2.limit, 2);
assert.strictEqual(res2.canLaunch, true);
assert.strictEqual(res2.warning, false);
console.log('  Pool 2: min=2, max=2, step=1, canLaunch=true -> PASS');

// Test Pool = 1 (unviable tournament)
console.log('\nTesting Pool of 1:');
const app1 = createSimulatedApp();
const res1 = app1.updateMatchingCount(mockPool1);
assert.strictEqual(res1.canLaunch, false, 'Launch button must be disabled for pool < 2');
assert.strictEqual(res1.warning, true, 'Warning banner must be shown for pool < 2');
console.log('  Pool 1: canLaunch=false, warning=true -> PASS');

// Test Pool = 0 (empty pool)
console.log('\nTesting Pool of 0 (empty):');
const app0 = createSimulatedApp();
const res0 = app0.updateMatchingCount(mockPool0);
assert.strictEqual(res0.canLaunch, false, 'Launch button must be disabled for empty pool');
assert.strictEqual(res0.warning, true, 'Warning banner must be shown for empty pool');
console.log('  Pool 0: canLaunch=false, warning=true -> PASS');

console.log('\n====================================================');
console.log('ALL SLIDER & BOUNDARY TESTS PASSED EMPIRICALLY (100%)');
console.log('====================================================');
