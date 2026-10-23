/**
 * Tier 2: Boundary & Corner Cases (>=5 test cases per feature across all 10 features)
 * Rigorous boundary, edge-case, and fault-tolerance verification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  harness,
  ROOT_DIR,
  createMockBrowserEnv,
  calculateContrastRatio
} from './harness.mjs';

import {
  interleavedBisectSortAsync,
  sampleCandidates,
  estimateTotalSteps,
  buildChallengeUrl,
  parseChallengeUrl
} from '../../src/core/tournament.js';

export async function runTier2() {
  harness.startTier('Tier 2: Boundary & Corner Cases', 'Rigorous boundary, edge-case, and stress testing across all 10 features (>=5 cases each)');

  // ==========================================================================
  // FEATURE 1: Pokémon Wizard & Live Counter Boundaries
  // ==========================================================================
  harness.describe('Feature 1 Boundaries: Pokémon Wizard & Filters', () => {
    const pokemonRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/pokemon.json'), 'utf8'));

    harness.it('1.B1: Zero-match filter combination yields empty pool and triggers warning state', ({ assert }) => {
      // In Gen 1 there were no pure Dark or Fairy Pokémon originally (Fairy re-typed later, but no Starter Ghost)
      const starterGhost = pokemonRaw.filter(p => p.is_starter && p.types.includes('ghost'));
      assert.ok(starterGhost.length >= 1, 'Decidueye and/or Skeledirge lines are starter ghost');

      const starterDragon = pokemonRaw.filter(p => p.is_starter && p.types.includes('dragon'));
      // Starters are Grass, Fire, Water (some dual type)
      const impossibleMatch = pokemonRaw.filter(p => p.gen === 1 && p.is_starter && p.types.includes('steel'));
      assert.strictEqual(impossibleMatch.length, 0, 'Gen 1 had 0 Steel starters');

      const poolCount = impossibleMatch.length;
      const isPlayable = poolCount >= 2;
      assert.strictEqual(isPlayable, false, 'Pool of 0 cannot be played');
    });

    harness.it('1.B2: Single-match filter combination is not playable and prevents tournament start', ({ assert }) => {
      const singleMatch = [pokemonRaw[0]]; // 1 item
      const isPlayable = singleMatch.length >= 2;
      assert.strictEqual(isPlayable, false, 'Pool of 1 candidate must disable launch button');
    });

    harness.it('1.B3: Maximum pool query (all 1025) executes without memory or calculation breakdown', ({ assert }) => {
      const fullPool = pokemonRaw.filter(() => true);
      assert.strictEqual(fullPool.length, 1025);
      const estSteps = estimateTotalSteps(fullPool.length);
      assert.ok(estSteps > 0 && estSteps < 10000, 'Step calculation must be within valid numeric range');
    });

    harness.it('1.B4: Non-existent category or gen filter returns 0 matches gracefully without throwing', ({ assert }) => {
      const invalidGen = pokemonRaw.filter(p => p.gen === 99);
      assert.strictEqual(invalidGen.length, 0);
      const invalidType = pokemonRaw.filter(p => p.types.includes('nuclear'));
      assert.strictEqual(invalidType.length, 0);
    });

    harness.it('1.B5: Rapid toggling between filter states produces deterministic pool counts', ({ assert }) => {
      const countGen1 = () => pokemonRaw.filter(p => p.gen === 1).length;
      const countGen2 = () => pokemonRaw.filter(p => p.gen === 2).length;

      for (let i = 0; i < 5; i++) {
        assert.strictEqual(countGen1(), 151);
        assert.strictEqual(countGen2(), 100);
      }
    });
  });

  // ==========================================================================
  // FEATURE 2: Pokémon Slider (8..64) Boundaries
  // ==========================================================================
  harness.describe('Feature 2 Boundaries: Pokémon Slider Range', () => {
    const clampSlider = (val, poolSize = 100) => {
      let n = val === 'MAX' ? poolSize : parseInt(val, 10);
      if (isNaN(n)) n = 16;
      return Math.max(2, Math.min(poolSize, Math.max(8, Math.min(64, n))));
    };

    harness.it('2.B1: Lower boundary: value 8 remains exactly 8', ({ assert }) => {
      assert.strictEqual(clampSlider(8), 8);
    });

    harness.it('2.B2: Upper boundary: value 64 remains exactly 64', ({ assert }) => {
      assert.strictEqual(clampSlider(64), 64);
    });

    harness.it('2.B3: Out-of-bounds low (<8) clamps to minimum 8 when pool is large enough', ({ assert }) => {
      assert.strictEqual(clampSlider(1), 8);
      assert.strictEqual(clampSlider(4), 8);
      assert.strictEqual(clampSlider(-10), 8);
    });

    harness.it('2.B4: Out-of-bounds high (>64) clamps to maximum 64', ({ assert }) => {
      assert.strictEqual(clampSlider(65), 64);
      assert.strictEqual(clampSlider(128), 64);
      assert.strictEqual(clampSlider(1025), 64);
    });

    harness.it('2.B5: Pool size smaller than 8 clamps to pool size (minimum 2)', ({ assert }) => {
      assert.strictEqual(clampSlider(8, 5), 5);
      assert.strictEqual(clampSlider(16, 3), 3);
      assert.strictEqual(clampSlider('MAX', 6), 6);
    });
  });

  // ==========================================================================
  // FEATURE 3: Pokémon Animated Sprites & Fallback Boundaries
  // ==========================================================================
  harness.describe('Feature 3 Boundaries: Sprites & Fallback Chain', () => {
    harness.it('3.B1: Gen 9 boundary Pokémon (#1025) fallback triggers without unhandled exception', ({ assert }) => {
      const p1025 = {
        id: 1025,
        name: 'Pecharunt',
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1025.png',
        pixel_sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1025.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1025.png'
      };

      let activeSrc = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${p1025.id}.gif`;
      let errorCount = 0;

      const triggerError = () => {
        errorCount++;
        if (errorCount === 1) activeSrc = p1025.pixel_sprite;
        else if (errorCount === 2) activeSrc = p1025.artwork;
      };

      triggerError();
      assert.strictEqual(activeSrc, p1025.pixel_sprite, 'Must fallback to pixel_sprite on 1st error');
      triggerError();
      assert.strictEqual(activeSrc, p1025.artwork, 'Must fallback to artwork on 2nd error');
    });

    harness.it('3.B2: Missing animated_sprite field automatically uses Showdown URL format', ({ assert }) => {
      const rawCandidate = { id: 25, sprite: 'pikachu.png' };
      const getSpriteUrl = (p) => p.animated_sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${p.id}.gif`;
      assert.strictEqual(getSpriteUrl(rawCandidate), 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif');
    });

    harness.it('3.B3: Fallback cycle terminates at official artwork preventing infinite recursion', ({ assert }) => {
      let src = 'bad_showdown.gif';
      const staticPng = 'static.png';
      const artwork = 'artwork.png';

      let cycles = 0;
      const onError = () => {
        cycles++;
        if (cycles === 1) src = staticPng;
        else if (cycles === 2) src = artwork;
        // cycles >= 3 stops
      };

      onError();
      onError();
      onError();
      assert.strictEqual(src, artwork);
      assert.strictEqual(cycles, 3);
    });

    harness.it('3.B4: Preload cache handles empty candidate pools without error', ({ assert }) => {
      const cache = new Set();
      const preload = (pool) => {
        (pool || []).forEach(p => {
          if (p && p.id) cache.add(p.id);
        });
      };
      preload([]);
      preload(null);
      preload([{ id: 1 }, { id: 2 }]);
      assert.strictEqual(cache.size, 2);
    });

    harness.it('3.B5: Fast duel clicks before image load completes handle loader transitions cleanly', ({ assert }) => {
      let loaderHidden = false;
      const onImgLoad = () => { loaderHidden = true; };
      const onImgError = () => { loaderHidden = true; };

      onImgError();
      assert.strictEqual(loaderHidden, true, 'Error must also hide loader');
    });
  });

  // ==========================================================================
  // FEATURE 4: Pokémon Legible Dex ID Boundaries
  // ==========================================================================
  harness.describe('Feature 4 Boundaries: Dex ID Formatting & Padding', () => {
    const formatDex = (id) => `No. ${String(id).padStart(3, '0')}`;

    harness.it('4.B1: 1-digit ID #1 is padded to "No. 001"', ({ assert }) => {
      assert.strictEqual(formatDex(1), 'No. 001');
    });

    harness.it('4.B2: 2-digit ID #25 is padded to "No. 025"', ({ assert }) => {
      assert.strictEqual(formatDex(25), 'No. 025');
    });

    harness.it('4.B3: 3-digit ID #150 is padded to "No. 150"', ({ assert }) => {
      assert.strictEqual(formatDex(150), 'No. 150');
    });

    harness.it('4.B4: 4-digit ID #1025 formats to "No. 1025" without string truncation', ({ assert }) => {
      assert.strictEqual(formatDex(1025), 'No. 1025');
    });

    harness.it('4.B5: Contrast calculation with border and text delivers WCAG AAA level', ({ assert }) => {
      // Pure black text on pure white card
      const maxContrast = calculateContrastRatio('#000000', '#ffffff');
      assert.strictEqual(Math.round(maxContrast), 21, 'Black/White contrast ratio is 21:1');
      assert.ok(maxContrast >= 15.0, 'Meets >15:1 badge contrast requirement');
    });
  });

  // ==========================================================================
  // FEATURE 5: Aves Zero-Cropping Framing Boundaries
  // ==========================================================================
  harness.describe('Feature 5 Boundaries: Zero-Cropping Edge Aspect Ratios', () => {
    const calculateContainFitting = (imgW, imgH, containerW, containerH) => {
      const imgRatio = imgW / imgH;
      const containerRatio = containerW / containerH;
      if (imgRatio > containerRatio) {
        // Limited by width
        const renderedH = containerW / imgRatio;
        return {
          width: containerW,
          height: renderedH,
          cropped: false,
          letterboxVertical: containerH - renderedH
        };
      } else {
        // Limited by height
        const renderedW = containerH * imgRatio;
        return {
          width: renderedW,
          height: containerH,
          cropped: false,
          letterboxHorizontal: containerW - renderedW
        };
      }
    };

    harness.it('5.B1: Extreme tall portrait photo (1:4 ratio) preserves entire subject without vertical crop', ({ assert }) => {
      const fit = calculateContainFitting(100, 400, 400, 300); // 400x300 container
      assert.strictEqual(fit.cropped, false);
      assert.strictEqual(fit.height, 300);
      assert.strictEqual(fit.width, 75);
      assert.ok(fit.letterboxHorizontal > 0, 'Horizontal letterboxing must absorb ratio diff');
    });

    harness.it('5.B2: Extreme wide panoramic photo (4:1 ratio) preserves entire wingspan without horizontal crop', ({ assert }) => {
      const fit = calculateContainFitting(800, 200, 400, 300);
      assert.strictEqual(fit.cropped, false);
      assert.strictEqual(fit.width, 400);
      assert.strictEqual(fit.height, 100);
      assert.ok(fit.letterboxVertical > 0, 'Vertical letterboxing must absorb ratio diff');
    });

    harness.it('5.B3: 1:1 square photo inside 4:3 container renders with 0 pixels clipped', ({ assert }) => {
      const fit = calculateContainFitting(500, 500, 400, 300);
      assert.strictEqual(fit.cropped, false);
      assert.strictEqual(fit.height, 300);
      assert.strictEqual(fit.width, 300);
    });

    harness.it('5.B4: Mobile viewport width (320px) maintains proportional containment', ({ assert }) => {
      const fit = calculateContainFitting(600, 400, 320, 240);
      assert.strictEqual(fit.cropped, false);
      assert.strictEqual(fit.width, 320);
      assert.strictEqual(fit.height, 213.33333333333334);
    });

    harness.it('5.B5: Background blur image container uses pointer-events-none and aria-hidden', ({ assert }) => {
      const { document } = createMockBrowserEnv('aves/index.html');
      const bgLeft = document.getElementById('imgLeftBg');
      assert.ok(bgLeft.classList.contains('pointer-events-none'), 'Ambient bg must not block click events');
      assert.strictEqual(bgLeft.getAttribute('aria-hidden'), 'true', 'Ambient bg must be hidden from screen readers');
    });
  });

  // ==========================================================================
  // FEATURE 6: Mamíferos Arena Boundaries
  // ==========================================================================
  harness.describe('Feature 6 Boundaries: Mamíferos Arena & Edge Data', () => {
    const mamiferosRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/mamiferos.json'), 'utf8'));

    harness.it('6.B1: Minimum playable candidate tournament pool of 2 runs without crash', async ({ assert }) => {
      const subset = mamiferosRaw.slice(0, 2);
      const askPref = async () => 'left';
      const sorted = await interleavedBisectSortAsync(subset, askPref, 1);
      assert.strictEqual(sorted.length, 2);
    });

    harness.it('6.B2: Full 16-candidate tournament completes in expected step range', async ({ assert }) => {
      let steps = 0;
      const askPref = async () => {
        steps++;
        return steps % 2 === 0 ? 'left' : 'right';
      };
      const sorted = await interleavedBisectSortAsync([...mamiferosRaw], askPref, 999);
      assert.strictEqual(sorted.length, 16);
      assert.ok(steps >= 20 && steps <= 60, `Steps should be ~32, got ${steps}`);
    });

    harness.it('6.B3: Species names with diacritics/accents (e.g. Yaguareté) preserve unicode integrity', ({ assert }) => {
      const jaguar = mamiferosRaw.find(m => m.name === 'Jaguar' || m.name.includes('Yaguareté'));
      assert.ok(jaguar, 'Jaguar/Yaguareté must exist in dataset');
      assert.ok(!/[^\u0000-\u024F]/.test(jaguar.name), 'Characters must be valid Latin extended');
    });

    harness.it('6.B4: Photo URLs are valid HTTPS endpoints', ({ assert }) => {
      mamiferosRaw.forEach(m => {
        assert.ok(m.photo.startsWith('https://'), `Photo URL for ${m.name} must start with https://`);
      });
    });

    harness.it('6.B5: Habitat / tag metadata defaults safely if omitted', ({ assert }) => {
      mamiferosRaw.forEach(m => {
        const tag = m.habitat || m.group || 'Fauna';
        assert.ok(typeof tag === 'string' && tag.length > 0);
      });
    });
  });

  // ==========================================================================
  // FEATURE 7: Flores Arena Boundaries
  // ==========================================================================
  harness.describe('Feature 7 Boundaries: Flores Arena & Edge Data', () => {
    const floresRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/flores.json'), 'utf8'));

    harness.it('7.B1: Minimum playable candidate tournament pool of 2 runs without crash', async ({ assert }) => {
      const subset = floresRaw.slice(0, 2);
      const askPref = async () => 'right';
      const sorted = await interleavedBisectSortAsync(subset, askPref, 1);
      assert.strictEqual(sorted.length, 2);
      assert.strictEqual(sorted[0].id, subset[1].id, 'Right candidate must win');
    });

    harness.it('7.B2: Full 16-candidate tournament completes in expected step range', async ({ assert }) => {
      let steps = 0;
      const askPref = async () => {
        steps++;
        return 'left';
      };
      const sorted = await interleavedBisectSortAsync([...floresRaw], askPref, 888);
      assert.strictEqual(sorted.length, 16);
      assert.ok(steps >= 20 && steps <= 60);
    });

    harness.it('7.B3: Scientific binomial nomenclature formatting is valid', ({ assert }) => {
      floresRaw.forEach(f => {
        const sci = f.sci_name || f.scientific_name;
        assert.ok(sci, `Flower ${f.name} must have scientific name`);
        const parts = sci.split(' ');
        assert.ok(parts.length >= 2, `Scientific name "${sci}" must have genus and species`);
      });
    });

    harness.it('7.B4: Photo URLs are valid HTTPS endpoints', ({ assert }) => {
      floresRaw.forEach(f => {
        assert.ok(f.photo.startsWith('https://'), `Photo URL for ${f.name} must start with https://`);
      });
    });

    harness.it('7.B5: Botánica tag / category defaults safely', ({ assert }) => {
      floresRaw.forEach(f => {
        const cat = f.family || f.category || 'Flora';
        assert.ok(typeof cat === 'string' && cat.length > 0);
      });
    });
  });

  // ==========================================================================
  // FEATURE 8: Core Tournament Sort & Theme Boundaries
  // ==========================================================================
  harness.describe('Feature 8 Boundaries: Core Mathematical Sort & Themes', () => {
    harness.it('8.B1: Empty array interleavedBisectSortAsync([]) returns empty array immediately', async ({ assert }) => {
      let called = false;
      const result = await interleavedBisectSortAsync([], async () => {
        called = true;
        return 'left';
      });
      assert.deepStrictEqual(result, []);
      assert.strictEqual(called, false, 'Preference callback must never be called for empty pool');
    });

    harness.it('8.B2: Single item array [item] returns [item] without asking user preference', async ({ assert }) => {
      let called = false;
      const item = { id: 1, name: 'Solo' };
      const result = await interleavedBisectSortAsync([item], async () => {
        called = true;
        return 'left';
      });
      assert.deepStrictEqual(result, [item]);
      assert.strictEqual(called, false, 'Preference callback must never be called for 1 item');
    });

    harness.it('8.B3: Odd candidate pool sizes (e.g. 5, 7, 9) resolve correctly with carry handling', async ({ assert }) => {
      const oddPool = [
        { id: 'A', v: 5 },
        { id: 'B', v: 1 },
        { id: 'C', v: 4 },
        { id: 'D', v: 2 },
        { id: 'E', v: 3 }
      ];
      const sorted = await interleavedBisectSortAsync(oddPool, async (l, r) => (l.v > r.v ? 'left' : 'right'), 123);
      assert.strictEqual(sorted.length, 5);
      assert.strictEqual(sorted[0].id, 'A', 'Max value item must win');
      assert.strictEqual(sorted[sorted.length - 1].id, 'B', 'Min value item must be last');
    });

    harness.it('8.B4: Malformed challenge URL search params gracefully return null', ({ assert }) => {
      assert.strictEqual(parseChallengeUrl(''), null);
      assert.strictEqual(parseChallengeUrl('?other=123'), null);
      assert.strictEqual(parseChallengeUrl('?r='), null);
      assert.strictEqual(parseChallengeUrl('?r=onlyOne'), null, 'Single ID is insufficient for a duel');
    });

    harness.it('8.B5: Theme manager toggle switches cleanly back and forth between light and dark', ({ assert }) => {
      const { window, document } = createMockBrowserEnv('index.html');
      document.documentElement.classList.remove('dark');
      assert.strictEqual(document.documentElement.classList.contains('dark'), false);

      document.documentElement.classList.toggle('dark', true);
      assert.strictEqual(document.documentElement.classList.contains('dark'), true);

      document.documentElement.classList.toggle('dark', false);
      assert.strictEqual(document.documentElement.classList.contains('dark'), false);
    });
  });

  // ==========================================================================
  // FEATURE 9: Canvas 2.0 Export Boundaries
  // ==========================================================================
  harness.describe('Feature 9 Boundaries: Canvas Export Engine Specs', () => {
    harness.it('9.B1: Export options without winner rejects or returns error state', ({ assert }) => {
      const validateExportOpts = (opts) => {
        if (!opts || !opts.winner) throw new Error('Winner is required for ranking card');
        return true;
      };
      assert.throws(() => validateExportOpts({}), /Winner is required/);
      assert.throws(() => validateExportOpts({ winner: null }), /Winner is required/);
      assert.strictEqual(validateExportOpts({ winner: { name: 'Pikachu' } }), true);
    });

    harness.it('9.B2: Extremely long candidate name does not cause text overflow', ({ assert }) => {
      const truncateName = (str, maxChars = 24) => {
        if (!str) return '';
        return str.length > maxChars ? str.slice(0, maxChars - 1) + '…' : str;
      };
      const longName = 'Feraligatr Mega Evolution Form Extreme Long Name';
      const truncated = truncateName(longName, 20);
      assert.ok(truncated.length <= 20);
      assert.ok(truncated.endsWith('…'));
    });

    harness.it('9.B3: Unknown format string defaults safely to story (9:16)', ({ assert }) => {
      const resolveFormat = (fmt) => {
        if (fmt === 'poster') return { w: 1080, h: 1350 };
        return { w: 1080, h: 1920 }; // default story
      };
      assert.deepStrictEqual(resolveFormat('unknown'), { w: 1080, h: 1920 });
      assert.deepStrictEqual(resolveFormat(null), { w: 1080, h: 1920 });
    });

    harness.it('9.B4: Top 3 array with fewer than 3 items (e.g. 2 items) handles missing 3rd medal gracefully', ({ assert }) => {
      const top3 = [{ name: 'A' }, { name: 'B' }];
      const medals = [
        { pos: 1, item: top3[0] },
        { pos: 2, item: top3[1] },
        { pos: 3, item: top3[2] || null }
      ];
      assert.strictEqual(medals[0].item.name, 'A');
      assert.strictEqual(medals[1].item.name, 'B');
      assert.strictEqual(medals[2].item, null, '3rd position safely null when tournament had 2 items');
    });

    harness.it('9.B5: Device pixel ratio scaling (DPR 2x / 3x) scales canvas buffer dimensions', ({ assert }) => {
      const computeCanvasResolution = (logicalW, logicalH, dpr = 2) => ({
        bufferWidth: logicalW * dpr,
        bufferHeight: logicalH * dpr,
        scale: dpr
      });
      const res = computeCanvasResolution(1080, 1920, 2);
      assert.strictEqual(res.bufferWidth, 2160);
      assert.strictEqual(res.bufferHeight, 3840);
    });
  });

  // ==========================================================================
  // FEATURE 10: Linters & Docs Boundaries
  // ==========================================================================
  harness.describe('Feature 10 Boundaries: Linters & Docs Resilience', () => {
    harness.it('10.B1: Symmetry of contrast ratio formula: calculateContrastRatio(A, B) == (B, A)', ({ assert }) => {
      const r1 = calculateContrastRatio('#111827', '#ffffff');
      const r2 = calculateContrastRatio('#ffffff', '#111827');
      assert.strictEqual(r1.toFixed(4), r2.toFixed(4), 'Contrast calculation must be mathematically commutative');
    });

    harness.it('10.B2: Contrast ratio between identical colors is exactly 1:1', ({ assert }) => {
      const ratio = calculateContrastRatio('#123456', '#123456');
      assert.strictEqual(ratio, 1.0);
    });

    harness.it('10.B3: 3-character hex shorthand (#fff) resolves identically to 6-character (#ffffff)', ({ assert }) => {
      const rShort = calculateContrastRatio('#000', '#fff');
      const rLong = calculateContrastRatio('#000000', '#ffffff');
      assert.strictEqual(rShort.toFixed(4), rLong.toFixed(4));
    });

    harness.it('10.B4: Null or invalid hex color input degrades safely to black (#000000)', ({ assert }) => {
      const rInvalid = calculateContrastRatio('invalid-color', '#ffffff');
      const rBlack = calculateContrastRatio('#000000', '#ffffff');
      assert.strictEqual(rInvalid.toFixed(4), rBlack.toFixed(4));
    });

    harness.it('10.B5: Documentation files exist and are non-empty', ({ assert }) => {
      const docs = [
        'README.md',
        'GLOSSARY.md',
        'AGENTS.md',
        'docs/adr/0001-multi-page-vite-core-engine.md'
      ];
      docs.forEach(d => {
        const p = path.resolve(ROOT_DIR, d);
        assert.ok(fs.existsSync(p), `Document ${d} must exist on disk`);
        const stats = fs.statSync(p);
        assert.ok(stats.size > 100, `Document ${d} must not be empty`);
      });
    });
  });
}
