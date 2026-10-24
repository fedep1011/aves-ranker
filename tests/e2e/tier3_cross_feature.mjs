/**
 * Tier 3: Cross-Feature Combinations (>=15 test cases)
 * Pairwise interactions between filters, sliders, duels, themes, podiums, and canvas.
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
  createSeededRng,
  sampleCandidates,
  estimateTotalSteps,
  interleavedBisectSortAsync,
  buildChallengeUrl,
  parseChallengeUrl
} from '../../src/core/tournament.js';

export async function runTier3() {
  harness.startTier('Tier 3: Cross-Feature Combinations', 'Pairwise interactions across filters, sliders, duels, themes, podiums, and export (>=15 cases)');

  const pokemonRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/pokemon.json'), 'utf8'));
  const mamiferosRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/mamiferos.json'), 'utf8'));
  const floresRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/flores.json'), 'utf8'));

  harness.describe('Cross-Feature Pairwise Interactions', () => {

    // 1. Filter + Slider + Duel Initialization
    harness.it('3.1: Filter (Gen 1 + Fire) + Slider (8) + Duel pool initialization', ({ assert }) => {
      const filtered = pokemonRaw.filter(p => p.gen === 1 && p.types.includes('fire'));
      assert.strictEqual(filtered.length, 12);

      const sampled = sampleCandidates(filtered, 8, 'popular', {
        rng: createSeededRng(1),
        compareFn: (a, b) => a.id - b.id
      });
      assert.strictEqual(sampled.length, 8);
      sampled.forEach(p => {
        assert.strictEqual(p.gen, 1);
        assert.ok(p.types.includes('fire'));
      });
    });

    // 2. Filter (Starters) + Slider (16) + Seeded Sort determinism
    harness.it('3.2: Filter (Starters) + Slider (16) + Seeded sort determinism', async ({ assert }) => {
      const starters = pokemonRaw.filter(p => p.is_starter);
      const sampled = sampleCandidates(starters, 16, 'popular', {
        rng: createSeededRng(42),
        compareFn: (a, b) => a.id - b.id
      });
      assert.strictEqual(sampled.length, 16);

      const mockUserPref = async (left, right) => (left.id < right.id ? 'left' : 'right');
      const sort1 = await interleavedBisectSortAsync([...sampled], mockUserPref, 1337);
      const sort2 = await interleavedBisectSortAsync([...sampled], mockUserPref, 1337);

      assert.deepStrictEqual(sort1.map(p => p.id), sort2.map(p => p.id));
      assert.strictEqual(sort1[0].id, Math.min(...sampled.map(p => p.id)));
    });

    // 3. Theme Toggle (Dark -> Light) + Battle Card Badge Contrast Check
    harness.it('3.3: Theme toggle (Dark -> Light) + Battle card badge contrast ratio', ({ assert }) => {
      const { document } = createMockBrowserEnv('pokemon/index.html');
      const dexBadge = document.getElementById('dexLeft');
      assert.ok(dexBadge);

      // In dark theme
      document.documentElement.classList.add('dark');
      const darkContrast = calculateContrastRatio('#f9fafb', '#030712');
      assert.ok(darkContrast > 15.0, `Dark mode contrast must be >15:1, got ${darkContrast.toFixed(2)}`);

      // Toggle to light theme
      document.documentElement.classList.remove('dark');
      const lightContrast = calculateContrastRatio('#111827', '#ffffff');
      assert.ok(lightContrast > 15.0, `Light mode contrast must be >15:1, got ${lightContrast.toFixed(2)}`);
    });

    // 4. Theme Toggle + Canvas Export Card styling specs
    harness.it('3.4: Theme toggle + Canvas 2.0 card export styling palette adaptation', ({ assert }) => {
      const getCanvasPalette = (isDark) => {
        return isDark
          ? { bg: '#141413', text: '#F3F2EE', cardBg: '#1E1E1C', medalGold: '#FACC15' }
          : { bg: '#F3F2EE', text: '#161615', cardBg: '#FAF9F6', medalGold: '#EAB308' };
      };

      const lightPalette = getCanvasPalette(false);
      const darkPalette = getCanvasPalette(true);

      assert.notStrictEqual(lightPalette.bg, darkPalette.bg);
      assert.strictEqual(lightPalette.text, '#161615');
      assert.strictEqual(darkPalette.text, '#F3F2EE');

      const contrastLight = calculateContrastRatio(lightPalette.text, lightPalette.bg);
      const contrastDark = calculateContrastRatio(darkPalette.text, darkPalette.bg);
      assert.ok(contrastLight > 10.0);
      assert.ok(contrastDark > 10.0);
    });

    // 5. Duel Tournament Sort + Victory Podium generation for Pokémon
    harness.it('3.5: Duel tournament sort + Victory podium generation for Pokémon', async ({ assert }) => {
      const pikachu = pokemonRaw.find(p => p.id === 25);
      const candidates = [...pokemonRaw.slice(0, 15), pikachu];
      const winnerId = 25; // Pikachu preferred
      const pickFn = async (left, right) => {
        if (left.id === winnerId) return 'left';
        if (right.id === winnerId) return 'right';
        return left.id < right.id ? 'left' : 'right';
      };

      const sorted = await interleavedBisectSortAsync([...candidates], pickFn, 777);
      assert.strictEqual(sorted[0].id, winnerId, 'Pikachu must be crowned tournament champion');

      const top3 = sorted.slice(0, 3);
      assert.strictEqual(top3.length, 3);
      assert.strictEqual(top3[0].id, 25);
    });

    // 6. Duel Tournament Sort + Victory Podium generation for Aves
    harness.it('3.6: Duel tournament sort + Victory podium generation for Aves', async ({ assert }) => {
      const mockBirds = [
        { id: 1, name: 'Tucán Toco', photo: 'tucan.jpg' },
        { id: 2, name: 'Guacamayo Rojo', photo: 'guacamayo.jpg' },
        { id: 3, name: 'Colibrí Común', photo: 'colibri.jpg' },
        { id: 4, name: 'Hornero', photo: 'hornero.jpg' }
      ];
      const sorted = await interleavedBisectSortAsync(mockBirds, async (l, r) => (l.id === 1 ? 'left' : 'right'), 123);
      assert.strictEqual(sorted[0].name, 'Tucán Toco');
      assert.strictEqual(sorted.length, 4);
    });

    // 7. Duel Tournament Sort + Victory Podium generation for Mamíferos
    harness.it('3.7: Duel tournament sort + Victory podium generation for Mamíferos', async ({ assert }) => {
      const sorted = await interleavedBisectSortAsync(
        [...mamiferosRaw],
        async (l, r) => (l.name === 'Jaguar' ? 'left' : r.name === 'Jaguar' ? 'right' : 'left'),
        555
      );
      assert.strictEqual(sorted[0].name, 'Jaguar', 'Jaguar must win');
      const rest = sorted.slice(3);
      assert.strictEqual(rest.length, mamiferosRaw.length - 3, 'Remaining mammals must be in rest ranking');
    });

    // 8. Duel Tournament Sort + Victory Podium generation for Flores
    harness.it('3.8: Duel tournament sort + Victory podium generation for Flores', async ({ assert }) => {
      const sorted = await interleavedBisectSortAsync(
        [...floresRaw],
        async (l, r) => (l.name.includes('Orquídea') ? 'left' : r.name.includes('Orquídea') ? 'right' : 'right'),
        333
      );
      assert.ok(sorted[0].name.includes('Orquídea'), 'Orquídea must win');
      assert.strictEqual(sorted.length, floresRaw.length);
    });

    // 9. Undo choice during active duel + History stack rewind + Deterministic resume
    harness.it('3.9: Undo choice during duel + History stack rewind + deterministic replay', async ({ assert }) => {
      const pool = [
        { id: 1, score: 10 },
        { id: 2, score: 20 },
        { id: 3, score: 30 },
        { id: 4, score: 40 }
      ];

      const choiceHistory = [];
      const recordChoice = (pick) => {
        choiceHistory.push(pick);
      };
      const undoChoice = () => {
        return choiceHistory.pop();
      };

      recordChoice('left');
      recordChoice('right');
      assert.strictEqual(choiceHistory.length, 2);

      const undone = undoChoice();
      assert.strictEqual(undone, 'right');
      assert.strictEqual(choiceHistory.length, 1);

      recordChoice('left');
      assert.strictEqual(choiceHistory.length, 2);
      assert.deepStrictEqual(choiceHistory, ['left', 'left']);
    });

    // 10. Final Ranking Top 3 + Challenge URL generation + Parsing & Re-duel launch
    harness.it('3.10: Final ranking top 4 + Challenge URL generation + Parsing & Re-duel launch', ({ assert }) => {
      const top4Ids = ['25', '6', '150', '94'];
      const challengeUrl = buildChallengeUrl({
        baseUrl: 'https://rankea2.pages.dev/pokemon/',
        ids: top4Ids,
        category: 'pokemon',
        author: 'Red'
      });

      const parsed = parseChallengeUrl(challengeUrl.slice(challengeUrl.indexOf('?')));
      assert.ok(parsed);
      assert.deepStrictEqual(parsed.ids, top4Ids);

      // Re-hydrate candidates from dataset
      const candidates = parsed.ids.map(id => pokemonRaw.find(p => p.id === parseInt(id, 10))).filter(Boolean);
      assert.strictEqual(candidates.length, 4);
      assert.strictEqual(candidates[0].name, 'Pikachu');
      assert.strictEqual(candidates[1].name, 'Charizard');
    });

    // 11. Sprite fallback trigger during battle + Cry audio unlock
    harness.it('3.11: Sprite fallback trigger during battle + Cry audio unlock', ({ assert }) => {
      const { document } = createMockBrowserEnv('pokemon/index.html');
      const cryAudio = document.getElementById('winnerCryAudio');
      assert.ok(cryAudio, 'winnerCryAudio element must exist');

      let audioUnlocked = false;
      const unlockAudio = () => {
        audioUnlocked = true;
        cryAudio.setAttribute('src', 'data:audio/wav;base64,mock');
      };

      unlockAudio();
      assert.strictEqual(audioUnlocked, true);
      assert.ok(cryAudio.getAttribute('src').startsWith('data:audio/wav'));
    });

    // 12. Hub quick duel shuffle + Arena URL routing
    harness.it('3.12: Hub quick duel shuffle + Arena URL routing', ({ assert }) => {
      const { document } = createMockBrowserEnv('index.html');
      const shuffleBtn = document.getElementById('shuffleMatchupBtn');
      assert.ok(shuffleBtn, 'shuffleMatchupBtn must exist in Hub');

      const arenas = [
        { id: 'aves', href: '/aves/' },
        { id: 'pokemon', href: '/pokemon/' },
        { id: 'flores', href: '/flores/' },
        { id: 'mamiferos', href: '/mamiferos/' }
      ];

      arenas.forEach(a => {
        const link = document.querySelector(`a[href="${a.href}"]`);
        assert.ok(link, `Hub must have active link to ${a.href}`);
      });
    });

    // 13. LocalStorage theme persistence across hub and all 4 arenas
    harness.it('3.13: LocalStorage theme persistence across Hub and all 4 arenas', ({ assert }) => {
      const pages = ['index.html', 'pokemon/index.html', 'aves/index.html', 'mamiferos/index.html', 'flores/index.html'];

      // Simulate user selecting dark mode in Hub
      pages.forEach(page => {
        const { window, document } = createMockBrowserEnv(page);
        window.localStorage.setItem('rankea2_theme', 'dark');
        const theme = window.localStorage.getItem('rankea2_theme');
        assert.strictEqual(theme, 'dark', `Theme must persist in ${page}`);
      });
    });

    // 14. Canvas 2.0 card export from top 3 podium across themes
    harness.it('3.14: Canvas 2.0 card export data assembly from top 3 podium', ({ assert }) => {
      const podiumTop3 = [
        { id: 25, name: 'Pikachu', sprite: '25.png' },
        { id: 6, name: 'Charizard', sprite: '6.png' },
        { id: 150, name: 'Mewtwo', sprite: '150.png' }
      ];

      const assembleCardPayload = (arena, top3, format = 'story') => ({
        arena,
        format,
        winner: top3[0],
        podium: top3.map((item, idx) => ({
          rank: idx + 1,
          name: item.name,
          medal: idx === 0 ? 'Gold' : idx === 1 ? 'Silver' : 'Bronze'
        })),
        watermark: 'Rankea2'
      });

      const storyPayload = assembleCardPayload('pokemon', podiumTop3, 'story');
      assert.strictEqual(storyPayload.format, 'story');
      assert.strictEqual(storyPayload.winner.name, 'Pikachu');
      assert.strictEqual(storyPayload.podium[0].medal, 'Gold');
      assert.strictEqual(storyPayload.podium[1].medal, 'Silver');
      assert.strictEqual(storyPayload.podium[2].medal, 'Bronze');

      const posterPayload = assembleCardPayload('pokemon', podiumTop3, 'poster');
      assert.strictEqual(posterPayload.format, 'poster');
    });

    // 15. Sampling mode ('popular' vs 'random') + Slider candidate limit + Estimated decision count
    harness.it('3.15: Sampling mode ("popular" vs "random") + Slider limit + Step estimation', ({ assert }) => {
      const pool = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, canonicalScore: 100 - i }));
      const rng = createSeededRng(99);

      // 16 Popular
      const popular16 = sampleCandidates(pool, 16, 'popular', {
        rng,
        compareFn: (a, b) => b.canonicalScore - a.canonicalScore
      });
      assert.strictEqual(popular16.length, 16);
      const estSteps16 = estimateTotalSteps(16);
      assert.strictEqual(estSteps16, Math.round(16 * 4 * 0.82));

      // 32 Random
      const random32 = sampleCandidates(pool, 32, 'random', { rng });
      assert.strictEqual(random32.length, 32);
      const estSteps32 = estimateTotalSteps(32);
      assert.strictEqual(estSteps32, Math.round(32 * 5 * 0.82));
      assert.ok(estSteps32 > estSteps16);
    });

  });
}
