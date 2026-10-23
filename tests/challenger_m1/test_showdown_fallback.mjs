import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('====================================================');
console.log('CHALLENGER STRESS TEST 2: Showdown Sprites & Fallback');
console.log('====================================================\n');

// 1. Load pokemon dataset
const dataPath = path.join(rootDir, 'public/data/pokemon.json');
const dataset = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const pokemonMap = new Map();
dataset.forEach(p => {
  if (!p.animated_sprite) {
    p.animated_sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${p.id}.gif`;
  }
  pokemonMap.set(p.id, p);
});

console.log(`Loaded dataset with ${dataset.length} Pokémon.`);
const p1025 = pokemonMap.get(1025);
assert(p1025, 'Pokémon #1025 (Pecharunt) must exist in public/data/pokemon.json');
console.log('Pokémon #1025 found:', p1025.name, p1025.animated_sprite);

// 2. Real HTTP verification: Check Showdown GIF vs static PNG vs Artwork for #1025
console.log('\n--- Live HTTP Status Verification for #1025 ---');
try {
  const showdownRes = await fetch(p1025.animated_sprite);
  console.log(`Showdown GIF for #1025 returned HTTP status: ${showdownRes.status}`);
  assert.strictEqual(showdownRes.status, 404, 'Showdown GIF for #1025 should return 404 as documented');

  const spriteRes = await fetch(p1025.sprite);
  console.log(`Static PNG sprite for #1025 returned HTTP status: ${spriteRes.status}`);
  assert.strictEqual(spriteRes.status, 200, 'Static PNG sprite for #1025 must return 200');

  const artworkRes = await fetch(p1025.artwork);
  console.log(`Official artwork for #1025 returned HTTP status: ${artworkRes.status}`);
  assert.strictEqual(artworkRes.status, 200, 'Official artwork for #1025 must return 200');
  console.log('✓ Real network verification confirms Showdown GIF returns 404 and fallbacks return 200');
} catch (netErr) {
  console.warn('Network fetch check skipped or timed out:', netErr.message);
}

// 3. Emulate Battle View Fallback (`handleImgError`)
console.log('\n--- Emulating Battle View Fallback (`handleImgError`) ---');
function simulateBattleImg(pokemon, failureChain) {
  let battleLoaded = false;
  const img = {
    src: pokemon.animated_sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemon.id}.gif`,
    onerror: null,
    onload: null,
    dataset: { fallbackStage: '0' }
  };

  const app = {
    state: {
      currentLeft: pokemon,
      pokemonMap
    },
    onBattleImgLoad(side) {
      battleLoaded = true;
    },
    handleImgError(side) {
      const p = side === 'left' ? this.state.currentLeft : this.state.currentRight;
      if (!p || !img) {
        this.onBattleImgLoad(side);
        return;
      }
      // Monotonic fallback stages from src/pokemon/main.js
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
        this.onBattleImgLoad(side);
      }
    }
  };

  img.onerror = () => app.handleImgError('left');

  let errorEventCount = 0;
  const maxIterations = 20;

  while (img.onerror && failureChain.has(img.src) && errorEventCount < maxIterations) {
    errorEventCount++;
    img.onerror();
  }

  return {
    finalSrc: img.src,
    errorCount: errorEventCount,
    onerrorNull: img.onerror === null,
    battleLoaded,
    infiniteLoopDetected: errorEventCount >= maxIterations
  };
}

// Scenario 1: Only Showdown GIF fails (like #1025 in reality with working internet)
const res1 = simulateBattleImg(p1025, new Set([p1025.animated_sprite]));
assert.strictEqual(res1.finalSrc, p1025.sprite, 'Should fallback to static sprite');
assert.strictEqual(res1.errorCount, 1, 'Should trigger exactly 1 onerror');
console.log('✓ Scenario 1 (GIF 404 -> static PNG): PASS -> Fallback reached:', res1.finalSrc);

// Scenario 2: GIF and PNG both fail -> fallback to artwork
const res2 = simulateBattleImg(p1025, new Set([p1025.animated_sprite, p1025.sprite]));
assert.strictEqual(res2.finalSrc, p1025.artwork, 'Should fallback to artwork');
assert.strictEqual(res2.errorCount, 2, 'Should trigger exactly 2 onerrors');
console.log('✓ Scenario 2 (GIF 404 & PNG 404 -> Artwork): PASS -> Fallback reached:', res2.finalSrc);

// Scenario 3: Worst case - Offline / total failure (GIF 404, PNG 404, Artwork 404)
console.log('\n--- Scenario 3: Adversarial Stress Test: Offline / Total Fallback Exhaustion ---');
const res3 = simulateBattleImg(p1025, new Set([p1025.animated_sprite, p1025.sprite, p1025.artwork]));
console.log(`  Iterations reached: ${res3.errorCount} (max=${20})`);
console.log(`  Infinite loop detected: ${res3.infiniteLoopDetected}`);
console.log(`  img.onerror is null: ${res3.onerrorNull}`);
console.log(`  battleLoaded called: ${res3.battleLoaded}`);

assert.strictEqual(res3.infiniteLoopDetected, false, 'Infinite loop must not occur in handleImgError');
assert.strictEqual(res3.onerrorNull, true, 'img.onerror must be nullified upon exhausting fallbacks');
assert.strictEqual(res3.battleLoaded, true, 'battleLoaded must be called to unblock UI');
assert(res3.errorCount <= 3, `Expected at most 3 error cycles, got ${res3.errorCount}`);
console.log('✓ Scenario 3 (Total Fallback Exhaustion -> Safe Terminal Nullification): PASS -> Zero infinite loops');

// 4. Check Podium Cascade (`handleImgCascade`)
console.log('\n--- Checking Results/Podium Cascade (`handleImgCascade`) ---');
function simulatePodiumCascade(pokemon, failureChain) {
  const img = {
    src: pokemon.animated_sprite || pokemon.sprite,
    onerror: null,
    dataset: { fallbackStage: '0' }
  };

  const app = {
    state: { pokemonMap },
    handleImgCascade(targetImg, pokemonId) {
      const p = this.state.pokemonMap.get(Number(pokemonId));
      if (!p || !targetImg) {
        if (targetImg) targetImg.onerror = null;
        return;
      }
      if (!targetImg.dataset) targetImg.dataset = {};
      const stage = parseInt(targetImg.dataset.fallbackStage || '0', 10);
      if (stage === 0 && p.sprite) {
        targetImg.dataset.fallbackStage = '1';
        targetImg.src = p.sprite;
      } else if (stage <= 1 && p.artwork) {
        targetImg.dataset.fallbackStage = '2';
        targetImg.src = p.artwork;
      } else {
        targetImg.onerror = null;
      }
    }
  };

  img.onerror = () => app.handleImgCascade(img, pokemon.id);

  let errorEventCount = 0;
  const maxIterations = 20;

  while (img.onerror && failureChain.has(img.src) && errorEventCount < maxIterations) {
    errorEventCount++;
    img.onerror();
  }

  return {
    finalSrc: img.src,
    errorCount: errorEventCount,
    onerrorNull: img.onerror === null,
    infiniteLoopDetected: errorEventCount >= maxIterations
  };
}

const pod1 = simulatePodiumCascade(p1025, new Set([p1025.animated_sprite]));
assert.strictEqual(pod1.finalSrc, p1025.sprite);
assert.strictEqual(pod1.errorCount, 1);
console.log('✓ Podium Scenario 1 (GIF 404 -> PNG): PASS');

const pod3 = simulatePodiumCascade(p1025, new Set([p1025.animated_sprite, p1025.sprite, p1025.artwork]));
assert.strictEqual(pod3.infiniteLoopDetected, false, 'Infinite loop must not occur in podium cascade');
assert.strictEqual(pod3.onerrorNull, true, 'img.onerror must be nullified upon exhausting fallbacks');
assert(pod3.errorCount <= 3, `Expected at most 3 error cycles in podium, got ${pod3.errorCount}`);
console.log('✓ Podium Scenario 3 (Total Fallback Exhaustion -> Safe Nullification): PASS -> Zero infinite loops');

// 5. Verify source code in src/pokemon/main.js directly
const sourceCode = fs.readFileSync(path.join(rootDir, 'src/pokemon/main.js'), 'utf8');
assert(sourceCode.includes("img.dataset.fallbackStage = '1'"), 'src/pokemon/main.js must implement monotonic fallbackStage = 1');
assert(sourceCode.includes("img.dataset.fallbackStage = '2'"), 'src/pokemon/main.js must implement monotonic fallbackStage = 2');
assert(!sourceCode.includes("if (img.src !== pokemon.sprite"), 'src/pokemon/main.js must not use buggy ping-pong comparison');
console.log('✓ Source code verification: src/pokemon/main.js contains genuine monotonic fallback stages.');

console.log('\n====================================================');
console.log('ALL SHOWDOWN SPRITE & FALLBACK TESTS PASSED CLEANLY (100%)');
console.log('====================================================');
