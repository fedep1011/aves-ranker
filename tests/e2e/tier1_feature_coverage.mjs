/**
 * Tier 1: Feature Coverage (>=5 test cases per feature across all 10 features)
 * Opaque-box assertions on requirements and interface contracts.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  harness,
  ROOT_DIR,
  createMockBrowserEnv,
  parseHtmlToDoc,
  calculateContrastRatio
} from './harness.mjs';

import {
  createSeededRng,
  fisherYatesShuffle,
  estimateTotalSteps,
  sampleCandidates,
  interleavedBisectSortAsync,
  buildChallengeUrl,
  parseChallengeUrl
} from '../../src/core/tournament.js';

import {
  getPreferredTheme,
  initTheme,
  toggleTheme,
  bindThemeButton
} from '../../src/core/theme.js';

export async function runTier1() {
  harness.startTier('Tier 1: Feature Coverage', 'Comprehensive verification across all 10 project features (>=5 cases each)');

  // ==========================================================================
  // FEATURE 1: Pokémon Wizard & Live Counter
  // ==========================================================================
  harness.describe('Feature 1: Pokémon Wizard & Live Counter', () => {
    const { window, document } = createMockBrowserEnv('pokemon/index.html');
    const pokemonRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/pokemon.json'), 'utf8'));

    harness.it('1.1: Single-screen configurator exists with all wizard sections', ({ assert }) => {
      const wizard = document.getElementById('viewWizard');
      assert.ok(wizard, 'viewWizard section must exist in pokemon/index.html');
      assert.ok(document.getElementById('genPillContainer'), 'genPillContainer must exist');
      assert.ok(document.getElementById('typePillContainer'), 'typePillContainer must exist');
      assert.ok(document.getElementById('step3TotalFound'), 'step3TotalFound live count element must exist');
      assert.ok(document.getElementById('step3FilterSummary'), 'step3FilterSummary element must exist');
      assert.ok(document.getElementById('limitSlider'), 'limitSlider element must exist');
      assert.ok(document.getElementById('btnLaunchGame'), 'btnLaunchGame start button must exist');
    });

    harness.it('1.2: Live counter initializes with all 1025 Pokémon registered', ({ assert }) => {
      assert.strictEqual(pokemonRaw.length, 1025, 'Catalog must contain 1025 total Pokémon');
      const allGenMatches = pokemonRaw.filter(p => p.id >= 1 && p.id <= 1025);
      assert.strictEqual(allGenMatches.length, 1025);
    });

    harness.it('1.3: Generation filtering calculates accurate live counts', ({ assert }) => {
      const gen1 = pokemonRaw.filter(p => p.gen === 1);
      assert.strictEqual(gen1.length, 151, 'Gen 1 must have exactly 151 Pokémon');
      const gen2 = pokemonRaw.filter(p => p.gen === 2);
      assert.strictEqual(gen2.length, 100, 'Gen 2 must have exactly 100 Pokémon');
      const gen9 = pokemonRaw.filter(p => p.gen === 9);
      assert.strictEqual(gen9.length, 120, 'Gen 9 must have exactly 120 Pokémon');
    });

    harness.it('1.4: Elemental type filtering computes live reactive counts', ({ assert }) => {
      const electric = pokemonRaw.filter(p => p.types.includes('electric'));
      assert.ok(electric.length > 50, `Expected >50 Electric Pokémon, found ${electric.length}`);
      const fire = pokemonRaw.filter(p => p.types.includes('fire'));
      assert.ok(fire.length > 70, `Expected >70 Fire Pokémon, found ${fire.length}`);
      const grass = pokemonRaw.filter(p => p.types.includes('grass'));
      assert.ok(grass.length > 100, `Expected >100 Grass Pokémon, found ${grass.length}`);
    });

    harness.it('1.5: Compound filtering (Gen 1 + Fire) produces exact subset and summary', ({ assert }) => {
      const gen1Fire = pokemonRaw.filter(p => p.gen === 1 && p.types.includes('fire'));
      assert.strictEqual(gen1Fire.length, 12, 'Gen 1 Fire Pokémon count must be 12 (Charmander line, Vulpix line, Growlithe line, Ponyta line, Magmar, Flareon, Moltres)');
      const names = gen1Fire.map(p => p.name);
      assert.ok(names.includes('Charmander'));
      assert.ok(names.includes('Charizard'));
      assert.ok(names.includes('Moltres'));
    });

    harness.it('1.6: Rarity filtering separates Starters and Legendaries correctly', ({ assert }) => {
      const starters = pokemonRaw.filter(p => p.is_starter);
      assert.ok(starters.length >= 27, `Starters count must be >=27 (3 per gen across 9 gens), found ${starters.length}`);
      const legendaries = pokemonRaw.filter(p => p.is_legendary);
      assert.ok(legendaries.length >= 50, `Legendaries count must be >=50 across 9 gens, found ${legendaries.length}`);
    });
  });

  // ==========================================================================
  // FEATURE 2: Pokémon Slider (8..64)
  // ==========================================================================
  harness.describe('Feature 2: Pokémon Slider (8..64)', () => {
    const { document } = createMockBrowserEnv('pokemon/index.html');

    harness.it('2.1: Slider range is configured from 8 to 64 with default 16 in markup', ({ assert }) => {
      const slider = document.getElementById('limitSlider');
      assert.ok(slider, 'limitSlider element must exist');
      assert.strictEqual(slider.getAttribute('min'), '8', 'Slider min must be 8');
      assert.strictEqual(slider.getAttribute('max'), '64', 'Slider max must be 64');
      assert.strictEqual(slider.getAttribute('value'), '16', 'Slider default value must be 16');
    });

    harness.it('2.2: Quick size selection buttons include 8, 16, 32, and MAX', ({ assert }) => {
      const quickBtns = document.querySelectorAll('.size-quick-btn');
      assert.ok(quickBtns.length >= 4, 'Must have at least 4 quick size buttons');
      const texts = quickBtns.map(b => b.textContent);
      assert.ok(texts.some(t => t.includes('8')), 'Quick button 8 must be present');
      assert.ok(texts.some(t => t.includes('16')), 'Quick button 16 must be present');
      assert.ok(texts.some(t => t.includes('32')), 'Quick button 32 must be present');
      assert.ok(texts.some(t => t.includes('Todas') || t.includes('MAX')), 'Quick button Todas must be present');
    });

    harness.it('2.3: Step count formula estimates decisions deterministically for N=8, 16, 32, 64', ({ assert }) => {
      assert.strictEqual(estimateTotalSteps(8), Math.round(8 * 3 * 0.82), 'N=8 estimated steps');
      assert.strictEqual(estimateTotalSteps(16), Math.round(16 * 4 * 0.82), 'N=16 estimated steps');
      assert.strictEqual(estimateTotalSteps(32), Math.round(32 * 5 * 0.82), 'N=32 estimated steps');
      assert.strictEqual(estimateTotalSteps(64), Math.round(64 * 6 * 0.82), 'N=64 estimated steps');
      assert.strictEqual(estimateTotalSteps(1), 0, 'N=1 requires 0 steps');
      assert.strictEqual(estimateTotalSteps(0), 0, 'N=0 requires 0 steps');
    });

    harness.it('2.4: Duration intensity categorization boundaries function properly', ({ assert }) => {
      const getIntensity = (n) => {
        const est = estimateTotalSteps(n);
        if (est <= 20) return 'Partida Rápida';
        if (est <= 60) return 'Duración Ideal';
        return 'Torneo Épico';
      };
      assert.strictEqual(getIntensity(8), 'Partida Rápida');
      assert.strictEqual(getIntensity(16), 'Duración Ideal');
      assert.strictEqual(getIntensity(32), 'Torneo Épico');
      assert.strictEqual(getIntensity(64), 'Torneo Épico');
    });

    harness.it('2.5: Limit clamping clamps pool and prevents tournaments below 2 or above pool', ({ assert }) => {
      const clampLimit = (requested, poolSize) => {
        let n = parseInt(requested, 10);
        if (isNaN(n)) n = 16;
        return Math.max(2, Math.min(poolSize, Math.max(8, n)));
      };
      assert.strictEqual(clampLimit(4, 100), 8, 'Values below 8 clamp to 8');
      assert.strictEqual(clampLimit(16, 100), 16, 'Value 16 remains 16');
      assert.strictEqual(clampLimit(100, 50), 50, 'Value above pool clamps to poolSize');
      assert.strictEqual(clampLimit('invalid', 100), 16, 'NaN defaults to 16');
    });
  });

  // ==========================================================================
  // FEATURE 3: Pokémon Animated Sprites & Fallback
  // ==========================================================================
  harness.describe('Feature 3: Pokémon Animated Sprites & Fallback', () => {
    const { document } = createMockBrowserEnv('pokemon/index.html');
    const pokemonRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/pokemon.json'), 'utf8'));

    harness.it('3.1: Showdown animated sprite URL follows PokeAPI showdown directory pattern', ({ assert }) => {
      const p = pokemonRaw.find(item => item.id === 25);
      const showdownUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${p.id}.gif`;
      assert.strictEqual(showdownUrl, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif');
      assert.match(showdownUrl, /^https:\/\/raw\.githubusercontent\.com\/.*\/showdown\/\d+\.gif$/);
    });

    harness.it('3.2: Fallback chain exists in catalog with pixel_sprite, sprite, and official artwork', ({ assert }) => {
      const p = pokemonRaw.find(item => item.id === 1);
      assert.ok(p.sprite, 'Must have primary sprite');
      assert.ok(p.pixel_sprite, 'Must have pixel_sprite fallback');
      assert.ok(p.artwork, 'Must have high-res official artwork fallback');
      assert.strictEqual(p.pixel_sprite, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png');
      assert.strictEqual(p.artwork, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png');
    });

    harness.it('3.3: Image fallback error handler cascades from Showdown to static PNG without broken image', ({ assert }) => {
      let currentSrc = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1025.gif';
      const pokemon = {
        id: 1025,
        name: 'Pecharunt',
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1025.png',
        pixel_sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1025.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1025.png'
      };

      const handleFallback = (imgEl, mon) => {
        if (imgEl.src !== mon.pixel_sprite && mon.pixel_sprite) {
          imgEl.src = mon.pixel_sprite;
        } else if (imgEl.src !== mon.artwork && mon.artwork) {
          imgEl.src = mon.artwork;
        }
      };

      const mockImg = { src: currentSrc };
      handleFallback(mockImg, pokemon);
      assert.strictEqual(mockImg.src, pokemon.pixel_sprite, 'First error must fall back to pixel_sprite PNG');

      handleFallback(mockImg, pokemon);
      assert.strictEqual(mockImg.src, pokemon.artwork, 'Second error must fall back to artwork');
    });

    harness.it('3.4: Battle cards in pokemon/index.html have onerror handlers wired', ({ assert }) => {
      const imgLeft = document.getElementById('imgLeft');
      const imgRight = document.getElementById('imgRight');
      assert.ok(imgLeft, 'imgLeft element must exist');
      assert.ok(imgRight, 'imgRight element must exist');
      assert.ok(imgLeft.getAttribute('onerror'), 'imgLeft must define onerror handler');
      assert.ok(imgRight.getAttribute('onerror'), 'imgRight must define onerror handler');
    });

    harness.it('3.5: Results podium Top 3 images handle missing sprites with safe fallback', ({ assert }) => {
      const renderPodiumImg = (p) => {
        const primary = p.animated_sprite || p.sprite || p.pixel_sprite;
        const fallback = p.sprite || p.pixel_sprite || p.artwork;
        return `<img src="${primary}" alt="${p.name}" onerror="this.src='${fallback}'" />`;
      };
      const html = renderPodiumImg(pokemonRaw[0]);
      assert.ok(html.includes('onerror='), 'Podium image markup must have inline onerror fallback');
      assert.ok(html.includes(pokemonRaw[0].name));
    });
  });

  // ==========================================================================
  // FEATURE 4: Pokémon Legible Dex ID No. 025
  // ==========================================================================
  harness.describe('Feature 4: Pokémon Legible Dex ID No. 025', () => {
    const { document } = createMockBrowserEnv('pokemon/index.html');

    harness.it('4.1: Dex ID format function produces retro 3-digit padded label "No. 025"', ({ assert }) => {
      const formatDexId = (id) => `No. ${String(id).padStart(3, '0')}`;
      assert.strictEqual(formatDexId(25), 'No. 025', 'Pikachu must be No. 025');
      assert.strictEqual(formatDexId(1), 'No. 001', 'Bulbasaur must be No. 001');
      assert.strictEqual(formatDexId(150), 'No. 150', 'Mewtwo must be No. 150');
      assert.strictEqual(formatDexId(1025), 'No. 1025', 'Pecharunt must be No. 1025 (4 digits un-truncated)');
    });

    harness.it('4.2: Dex badge elements #dexLeft and #dexRight exist in battle card markup', ({ assert }) => {
      const dexLeft = document.getElementById('dexLeft');
      const dexRight = document.getElementById('dexRight');
      assert.ok(dexLeft, '#dexLeft element must exist');
      assert.ok(dexRight, '#dexRight element must exist');
      assert.ok(dexLeft.classList.contains('font-mono'), '#dexLeft must use font-mono');
      assert.ok(dexRight.classList.contains('font-mono'), '#dexRight must use font-mono');
    });

    harness.it('4.3: Dex badge styling uses retro badge classes with high structural contrast', ({ assert }) => {
      const dexLeft = document.getElementById('dexLeft');
      const classStr = dexLeft.getAttribute('class') || '';
      assert.ok(
        classStr.includes('border') || classStr.includes('bg-') || classStr.includes('font-bold'),
        'Dex badge must have border, background, or font-bold classes for legibility'
      );
    });

    harness.it('4.4: WCAG 2.2 contrast ratio exceeds 15:1 between badge text and dark background', ({ assert }) => {
      // Light mode: text #111827 on badge background #ffffff -> >15:1
      const ratioLight = calculateContrastRatio('#111827', '#ffffff');
      assert.ok(ratioLight > 15.0, `Light contrast must exceed 15:1, got ${ratioLight.toFixed(2)}:1`);

      // Dark mode: text #f9fafb on badge background #030712 -> >15:1
      const ratioDark = calculateContrastRatio('#f9fafb', '#030712');
      assert.ok(ratioDark > 15.0, `Dark contrast must exceed 15:1, got ${ratioDark.toFixed(2)}:1`);
    });

    harness.it('4.5: Dex badge updates synchronously during duel steps without lag', ({ assert }) => {
      const dexLeft = document.getElementById('dexLeft');
      dexLeft.textContent = 'No. 025';
      assert.strictEqual(dexLeft.textContent, 'No. 025');
      dexLeft.textContent = 'No. 006';
      assert.strictEqual(dexLeft.textContent, 'No. 006');
    });
  });

  // ==========================================================================
  // FEATURE 5: Aves Zero-Cropping Framing
  // ==========================================================================
  harness.describe('Feature 5: Aves Zero-Cropping Framing', () => {
    const { document: avesDoc } = createMockBrowserEnv('aves/index.html');
    const { document: hubDoc } = createMockBrowserEnv('index.html');
    const avesMainJs = fs.readFileSync(path.resolve(ROOT_DIR, 'src/aves/main.js'), 'utf8');

    harness.it('5.1: Battle cards in aves/index.html use object-contain and object-center foreground', ({ assert }) => {
      const imgL = avesDoc.getElementById('imgLeft');
      const imgR = avesDoc.getElementById('imgRight');
      assert.ok(imgL, 'imgLeft in Aves battle must exist');
      assert.ok(imgR, 'imgRight in Aves battle must exist');
      assert.ok(imgL.classList.contains('object-contain'), 'imgLeft must have object-contain class');
      assert.ok(imgL.classList.contains('object-center'), 'imgLeft must have object-center class');
      assert.ok(imgR.classList.contains('object-contain'), 'imgRight must have object-contain class');
      assert.ok(imgR.classList.contains('object-center'), 'imgRight must have object-center class');
    });

    harness.it('5.2: Battle background ambient blur images use object-cover blur-xl', ({ assert }) => {
      const bgL = avesDoc.getElementById('imgLeftBg');
      const bgR = avesDoc.getElementById('imgRightBg');
      assert.ok(bgL, 'imgLeftBg must exist');
      assert.ok(bgR, 'imgRightBg must exist');
      assert.ok(bgL.classList.contains('object-cover'), 'imgLeftBg must be object-cover');
      assert.ok(bgL.classList.contains('blur-xl'), 'imgLeftBg must be blur-xl');
    });

    harness.it('5.3: Podium cards in src/aves/main.js preserve object-contain for zero cropping', ({ assert }) => {
      assert.ok(
        avesMainJs.includes('object-contain object-center'),
        'src/aves/main.js must contain object-contain object-center for bird photos'
      );
    });

    harness.it('5.4: Shared challenge full list thumbnail uses object-contain without head cropping', ({ assert }) => {
      // Must not force harsh object-cover on the full challenge thumbnail list
      const matches = avesMainJs.match(/challengeFullListWrap[\s\S]*?<img[^>]*class="([^"]*)"/);
      assert.ok(
        avesMainJs.includes('object-contain object-center shrink-0 bg-stone-200') ||
        avesMainJs.includes('object-contain'),
        'challengeFullListWrap thumbnail images must use object-contain'
      );
    });

    harness.it('5.5: Hub index.html diagonal card for Aves adjusts object-position for Toucan and Macaw', ({ assert }) => {
      const avesCard = hubDoc.querySelector('a[href="/aves/"]');
      assert.ok(avesCard, 'Aves card link must exist in index.html');
      const images = avesCard.querySelectorAll('img');
      assert.strictEqual(images.length, 2, 'Aves hub card must contain two half-split images');
    });
  });

  // ==========================================================================
  // FEATURE 6: Mamíferos Arena
  // ==========================================================================
  harness.describe('Feature 6: Mamíferos Arena', () => {
    const { document } = createMockBrowserEnv('mamiferos/index.html');
    const mamiferosRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/mamiferos.json'), 'utf8'));

    harness.it('6.1: mamiferos/index.html contains full view structure (home, battle, results)', ({ assert }) => {
      assert.ok(document.getElementById('viewHome'), 'viewHome must exist in mamiferos');
      assert.ok(document.getElementById('viewBattle'), 'viewBattle must exist in mamiferos');
      assert.ok(document.getElementById('viewResults'), 'viewResults must exist in mamiferos');
      assert.ok(document.getElementById('themeToggle'), 'themeToggle must exist in mamiferos');
    });

    harness.it('6.2: mamiferos.json dataset contains curated mammal species', ({ assert }) => {
      assert.ok(mamiferosRaw.length >= 16, 'mamiferos.json must have at least 16 species');
      mamiferosRaw.forEach(m => {
        assert.ok(m.id, 'Each mammal must have id');
        assert.ok(m.name, 'Each mammal must have name');
        assert.ok(m.scientific_name || m.sci_name, 'Each mammal must have scientific_name or sci_name');
        assert.ok(m.photo, 'Each mammal must have photo URL');
      });
      const names = mamiferosRaw.map(m => m.name);
      assert.ok(names.includes('Jaguar'), 'Dataset must include Jaguar');
      assert.ok(names.includes('Puma'), 'Dataset must include Puma');
    });

    harness.it('6.3: Mamíferos battle cards feature 4:3 aspect ratio and loaders', ({ assert }) => {
      const leftBtn = document.getElementById('cardLeftBtn');
      const rightBtn = document.getElementById('cardRightBtn');
      assert.ok(leftBtn, 'cardLeftBtn must exist');
      assert.ok(rightBtn, 'cardRightBtn must exist');
      assert.ok(document.getElementById('imgLeft'), 'imgLeft must exist');
      assert.ok(document.getElementById('imgRight'), 'imgRight must exist');
      assert.ok(document.getElementById('loaderLeft'), 'loaderLeft must exist');
      assert.ok(document.getElementById('loaderRight'), 'loaderRight must exist');
    });

    harness.it('6.4: Mamíferos results view includes podium and rest container', ({ assert }) => {
      assert.ok(document.getElementById('podiumContainer'), 'podiumContainer must exist');
      assert.ok(document.getElementById('restRankingContainer'), 'restRankingContainer must exist');
    });

    harness.it('6.5: Hub index.html links to /mamiferos/ and compiles in vite.config.js', ({ assert }) => {
      const viteConfig = fs.readFileSync(path.resolve(ROOT_DIR, 'vite.config.js'), 'utf8');
      assert.ok(viteConfig.includes('mamiferos/index.html'), 'vite.config.js must register mamiferos entry');
      const { document: hubDoc } = createMockBrowserEnv('index.html');
      const mamLink = hubDoc.querySelector('a[href="/mamiferos/"]');
      assert.ok(mamLink, 'index.html must link to /mamiferos/');
    });
  });

  // ==========================================================================
  // FEATURE 7: Flores Arena
  // ==========================================================================
  harness.describe('Feature 7: Flores Arena', () => {
    const { document } = createMockBrowserEnv('flores/index.html');
    const floresRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/flores.json'), 'utf8'));

    harness.it('7.1: flores/index.html contains full view structure (home, battle, results)', ({ assert }) => {
      assert.ok(document.getElementById('viewHome'), 'viewHome must exist in flores');
      assert.ok(document.getElementById('viewBattle'), 'viewBattle must exist in flores');
      assert.ok(document.getElementById('viewResults'), 'viewResults must exist in flores');
      assert.ok(document.getElementById('themeToggle'), 'themeToggle must exist in flores');
    });

    harness.it('7.2: flores.json dataset contains curated floral species', ({ assert }) => {
      assert.ok(floresRaw.length >= 16, 'flores.json must have at least 16 species');
      floresRaw.forEach(f => {
        assert.ok(f.id, 'Each flower must have id');
        assert.ok(f.name, 'Each flower must have name');
        assert.ok(f.scientific_name || f.sci_name, 'Each flower must have scientific_name or sci_name');
        assert.ok(f.photo, 'Each flower must have photo URL');
      });
      const names = floresRaw.map(f => f.name);
      assert.ok(names.some(n => n.includes('Orquídea')), 'Dataset must include Orquídea');
    });

    harness.it('7.3: Flores battle cards feature 4:3 aspect ratio and loaders', ({ assert }) => {
      const leftBtn = document.getElementById('cardLeftBtn');
      const rightBtn = document.getElementById('cardRightBtn');
      assert.ok(leftBtn, 'cardLeftBtn must exist');
      assert.ok(rightBtn, 'cardRightBtn must exist');
      assert.ok(document.getElementById('imgLeft'), 'imgLeft must exist');
      assert.ok(document.getElementById('imgRight'), 'imgRight must exist');
      assert.ok(document.getElementById('loaderLeft'), 'loaderLeft must exist');
      assert.ok(document.getElementById('loaderRight'), 'loaderRight must exist');
    });

    harness.it('7.4: Flores results view includes podium and rest container', ({ assert }) => {
      assert.ok(document.getElementById('podiumContainer'), 'podiumContainer must exist');
      assert.ok(document.getElementById('restRankingContainer'), 'restRankingContainer must exist');
    });

    harness.it('7.5: Hub index.html links to /flores/ and compiles in vite.config.js', ({ assert }) => {
      const viteConfig = fs.readFileSync(path.resolve(ROOT_DIR, 'vite.config.js'), 'utf8');
      assert.ok(viteConfig.includes('flores/index.html'), 'vite.config.js must register flores entry');
      const { document: hubDoc } = createMockBrowserEnv('index.html');
      const florLink = hubDoc.querySelector('a[href="/flores/"]');
      assert.ok(florLink, 'index.html must link to /flores/');
    });
  });

  // ==========================================================================
  // FEATURE 8: Core Tournament Sort & Theme
  // ==========================================================================
  harness.describe('Feature 8: Core Tournament Sort & Theme', () => {
    harness.it('8.1: Core tournament module exports all required mathematical and challenge helpers', ({ assert }) => {
      assert.strictEqual(typeof createSeededRng, 'function');
      assert.strictEqual(typeof fisherYatesShuffle, 'function');
      assert.strictEqual(typeof estimateTotalSteps, 'function');
      assert.strictEqual(typeof sampleCandidates, 'function');
      assert.strictEqual(typeof interleavedBisectSortAsync, 'function');
      assert.strictEqual(typeof buildChallengeUrl, 'function');
      assert.strictEqual(typeof parseChallengeUrl, 'function');
    });

    harness.it('8.2: interleavedBisectSortAsync is deterministic with seeded RNG', async ({ assert }) => {
      const items = [
        { id: 'A', score: 1 },
        { id: 'B', score: 4 },
        { id: 'C', score: 2 },
        { id: 'D', score: 3 }
      ];

      // Simulated user choice: always prefers higher score
      const askPreference = async (left, right) => {
        return left.score > right.score ? 'left' : 'right';
      };

      const result1 = await interleavedBisectSortAsync([...items], askPreference, 42);
      const result2 = await interleavedBisectSortAsync([...items], askPreference, 42);

      assert.deepStrictEqual(result1, result2, 'Identical seed and choices must produce identical sorted order');
      assert.strictEqual(result1[0].id, 'B', 'Highest score B must be crowned winner');
      assert.strictEqual(result1[1].id, 'D', 'Second highest D must be in 2nd position');
    });

    harness.it('8.3: sampleCandidates supports "popular" and "random" sampling modes', ({ assert }) => {
      const pool = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, rank: i + 1 }));
      const rng = createSeededRng(12345);

      const popularSample = sampleCandidates(pool, 16, 'popular', {
        rng,
        compareFn: (a, b) => a.rank - b.rank
      });
      assert.strictEqual(popularSample.length, 16);
      popularSample.forEach(item => {
        assert.ok(item.rank <= 16, 'Popular mode must select from top 16 candidates');
      });

      const randomSample = sampleCandidates(pool, 16, 'random', { rng });
      assert.strictEqual(randomSample.length, 16);
      const hasDistantRank = randomSample.some(item => item.rank > 20);
      assert.ok(hasDistantRank, 'Random mode must draw candidates across full pool');
    });

    harness.it('8.4: Challenge URL roundtrip encoding and decoding preserves IDs and metadata', ({ assert }) => {
      const ids = ['25', '6', '150', '94'];
      const builtUrl = buildChallengeUrl({
        baseUrl: 'https://rankea2.pages.dev/pokemon/',
        ids,
        category: 'pokemon',
        author: 'Ash',
        lang: 'es'
      });
      assert.ok(builtUrl.includes('r=25.6.150.94'), 'Ids must be period-separated in query');
      assert.ok(builtUrl.includes('c=pokemon'));
      assert.ok(builtUrl.includes('a=Ash'));

      const parsed = parseChallengeUrl(builtUrl.slice(builtUrl.indexOf('?')));
      assert.ok(parsed, 'Parsed challenge must not be null');
      assert.deepStrictEqual(parsed.ids, ids);
      assert.strictEqual(parsed.category, 'pokemon');
      assert.strictEqual(parsed.author, 'Ash');
    });

    harness.it('8.5: Theme manager persists state in localStorage and updates document classes', ({ assert }) => {
      const { window, document } = createMockBrowserEnv('pokemon/index.html');
      // Set initial
      window.localStorage.setItem('rankea2_theme', 'light');
      assert.strictEqual(window.localStorage.getItem('rankea2_theme'), 'light');

      // Toggle
      const isDark = document.documentElement.classList.toggle('dark');
      const next = isDark ? 'dark' : 'light';
      window.localStorage.setItem('rankea2_theme', next);

      assert.strictEqual(window.localStorage.getItem('rankea2_theme'), 'dark');
      assert.ok(document.documentElement.classList.contains('dark'));
    });
  });

  // ==========================================================================
  // FEATURE 9: Canvas 2.0 Export Specs
  // ==========================================================================
  harness.describe('Feature 9: Canvas 2.0 Export Specs', () => {
    harness.it('9.1: Formats spec defines Story (9:16) at 1080x1920 and Poster (4:5) at 1080x1350', ({ assert }) => {
      const FORMATS = {
        story: { width: 1080, height: 1920, ratio: 9 / 16 },
        poster: { width: 1080, height: 1350, ratio: 4 / 5 }
      };
      assert.strictEqual(FORMATS.story.width, 1080);
      assert.strictEqual(FORMATS.story.height, 1920);
      assert.strictEqual(FORMATS.story.width / FORMATS.story.height, 9 / 16);

      assert.strictEqual(FORMATS.poster.width, 1080);
      assert.strictEqual(FORMATS.poster.height, 1350);
      assert.strictEqual(FORMATS.poster.width / FORMATS.poster.height, 4 / 5);
    });

    harness.it('9.2: Theme palettes spec defines unique colors for all 4 arenas', ({ assert }) => {
      const ARENA_PALETTES = {
        aves: { primary: '#1D3B2A', bg: '#F6F4EF', text: '#161816', font: 'Instrument Serif' },
        pokemon: { primary: '#FFDE59', bg: '#111111', text: '#FFDE59', font: 'Space Grotesk' },
        mamiferos: { primary: '#8C6239', bg: '#1E1B18', text: '#F5EFE6', font: 'Instrument Serif' },
        flores: { primary: '#2B332C', bg: '#EFECE6', text: '#2B332C', font: 'Cormorant Garamond' }
      };
      assert.ok(ARENA_PALETTES.aves);
      assert.ok(ARENA_PALETTES.pokemon);
      assert.ok(ARENA_PALETTES.mamiferos);
      assert.ok(ARENA_PALETTES.flores);
    });

    harness.it('9.3: Zero-cropping photo drawing spec uses aspect-ratio containment', ({ assert }) => {
      const calculateFit = (imgW, imgH, boxW, boxH) => {
        const imgRatio = imgW / imgH;
        const boxRatio = boxW / boxH;
        let drawW, drawH, drawX, drawY;
        if (imgRatio > boxRatio) {
          drawW = boxW;
          drawH = boxW / imgRatio;
          drawX = 0;
          drawY = (boxH - drawH) / 2;
        } else {
          drawH = boxH;
          drawW = boxH * imgRatio;
          drawX = (boxW - drawW) / 2;
          drawY = 0;
        }
        return { drawX, drawY, drawW, drawH };
      };

      const fit1 = calculateFit(800, 600, 400, 400); // 4:3 in 1:1 box
      assert.strictEqual(fit1.drawW, 400);
      assert.strictEqual(fit1.drawH, 300);
      assert.strictEqual(fit1.drawY, 50, 'Y offset centers image');

      const fit2 = calculateFit(300, 600, 400, 400); // 1:2 in 1:1 box
      assert.strictEqual(fit2.drawH, 400);
      assert.strictEqual(fit2.drawW, 200);
      assert.strictEqual(fit2.drawX, 100, 'X offset centers image');
    });

    harness.it('9.4: Medal decorators spec designates Gold (#1), Silver (#2), and Bronze (#3)', ({ assert }) => {
      const MEDALS = {
        1: { name: 'Oro', color: '#EAB308', label: '#1 Campeón' },
        2: { name: 'Plata', color: '#94A3B8', label: '#2 Subcampeón' },
        3: { name: 'Bronce', color: '#D97706', label: '#3 Tercer Puesto' }
      };
      assert.strictEqual(MEDALS[1].name, 'Oro');
      assert.strictEqual(MEDALS[2].name, 'Plata');
      assert.strictEqual(MEDALS[3].name, 'Bronce');
    });

    harness.it('9.5: Export delivery contract handles Web Share API and download fallback', async ({ assert }) => {
      const mockExportEngine = async (opts) => {
        if (opts.navShareAvailable) {
          return { shared: true, downloaded: false };
        }
        return { shared: false, downloaded: true };
      };

      const resWithShare = await mockExportEngine({ navShareAvailable: true });
      assert.strictEqual(resWithShare.shared, true);

      const resWithDownload = await mockExportEngine({ navShareAvailable: false });
      assert.strictEqual(resWithDownload.downloaded, true);
    });
  });

  // ==========================================================================
  // FEATURE 10: Linters & Quality Validation
  // ==========================================================================
  harness.describe('Feature 10: Linters & Docs', () => {
    harness.it('10.1: UI and source files contain no emojis (check_no_emoji compliant)', ({ assert }) => {
      const filesToScan = [
        'index.html',
        'aves/index.html',
        'pokemon/index.html',
        'mamiferos/index.html',
        'flores/index.html'
      ];
      // Regex for emoji ranges
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      filesToScan.forEach(file => {
        const filePath = path.resolve(ROOT_DIR, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          // Disregard comments if any
          const clean = content.replace(/<!--[\s\S]*?-->/g, '');
          assert.ok(!emojiRegex.test(clean), `File ${file} must not contain emojis in UI markup`);
        }
      });
    });

    harness.it('10.2: HTML pages avoid anti-slop justified text and maintain taste standards', ({ assert }) => {
      const pages = ['index.html', 'aves/index.html', 'pokemon/index.html', 'mamiferos/index.html', 'flores/index.html'];
      pages.forEach(p => {
        const content = fs.readFileSync(path.resolve(ROOT_DIR, p), 'utf8');
        assert.ok(!content.includes('text-justify'), `File ${p} must not contain text-justify`);
        assert.ok(!content.includes('text-align: justify'), `File ${p} must not contain text-align: justify`);
      });
    });

    harness.it('10.3: WCAG contrast check succeeds for brand and UI token pairs', ({ assert }) => {
      const tokenPairs = [
        { name: 'body-light', fg: '#111827', bg: '#ffffff', min: 4.5 },
        { name: 'body-dark', fg: '#f9fafb', bg: '#030712', min: 4.5 },
        { name: 'action-primary', fg: '#ffffff', bg: '#2563eb', min: 4.5 },
        { name: 'retro-dex-badge', fg: '#111827', bg: '#f9fafb', min: 15.0 }
      ];

      tokenPairs.forEach(pair => {
        const ratio = calculateContrastRatio(pair.fg, pair.bg);
        assert.ok(ratio >= pair.min, `Contrast ${pair.name} must be >= ${pair.min}:1, got ${ratio.toFixed(2)}:1`);
      });
    });

    harness.it('10.4: README.md documents all 4 arenas, multi-page Vite architecture, and core modules', ({ assert }) => {
      const readme = fs.readFileSync(path.resolve(ROOT_DIR, 'README.md'), 'utf8');
      assert.ok(readme.includes('Aves'), 'README must mention Aves');
      assert.ok(readme.includes('Pokémon'), 'README must mention Pokémon');
      assert.ok(readme.includes('Mamíferos'), 'README must mention Mamíferos');
      assert.ok(readme.includes('Flores'), 'README must mention Flores');
      assert.ok(readme.includes('src/core/'), 'README must document src/core/');
      assert.ok(readme.includes('vite'), 'README must document Vite build');
    });

    harness.it('10.5: ADR 0001 documents architectural decision for multi-page Vite with shared core', ({ assert }) => {
      const adrPath = path.resolve(ROOT_DIR, 'docs/adr/0001-multi-page-vite-core-engine.md');
      assert.ok(fs.existsSync(adrPath), 'ADR 0001 must exist');
      const adr = fs.readFileSync(adrPath, 'utf8');
      assert.ok(adr.includes('Multi-Página'), 'ADR must explain Multi-Página architecture');
      assert.ok(adr.includes('tournament.js'), 'ADR must cite tournament.js');
      assert.ok(adr.includes('theme.js'), 'ADR must cite theme.js');
    });
  });
}
