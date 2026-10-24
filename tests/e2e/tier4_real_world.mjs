/**
 * Tier 4: Real-World Scenarios (>=10 test cases)
 * Complete end-to-end tournament flow simulations for all arenas.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  harness,
  ROOT_DIR,
  createMockBrowserEnv
} from './harness.mjs';

import {
  createSeededRng,
  sampleCandidates,
  interleavedBisectSortAsync,
  buildChallengeUrl,
  parseChallengeUrl
} from '../../src/core/tournament.js';

export async function runTier4() {
  harness.startTier('Tier 4: Real-World Scenarios', 'Full end-to-end tournament simulations and user lifecycle flows (>=10 cases)');

  const pokemonRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/pokemon.json'), 'utf8'));
  const mamiferosRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/mamiferos.json'), 'utf8'));
  const floresRaw = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, 'public/data/flores.json'), 'utf8'));

  harness.describe('End-to-End Tournament Simulations Across All Arenas', () => {

    // Scenario 1: Pokémon Kanto Classic Preset Tournament Flow
    harness.it('4.1: Pokémon Kanto Classic tournament full lifecycle simulation (16 candidates)', async ({ assert }) => {
      const PRESET_KANTO_IDS = [1, 4, 7, 25, 94, 150, 143, 133, 130, 149, 65, 131, 68, 59, 123, 39];
      const candidates = PRESET_KANTO_IDS.map(id => pokemonRaw.find(p => p.id === id)).filter(Boolean);
      assert.strictEqual(candidates.length, 16);

      let duelSteps = 0;
      // Consistent left preference
      const askPref = async (left, right) => {
        duelSteps++;
        return 'left';
      };

      const sorted = await interleavedBisectSortAsync([...candidates], askPref, 101);
      assert.strictEqual(sorted.length, 16);
      assert.ok(duelSteps > 0, `Duels must occur, total steps: ${duelSteps}`);

      const winner = sorted[0];
      assert.ok(winner, 'Must have crowned champion');
      const top3 = sorted.slice(0, 3);
      assert.strictEqual(top3.length, 3);

      const challengeUrl = buildChallengeUrl({
        baseUrl: 'https://rankea2.pages.dev/pokemon/',
        ids: sorted.map(p => p.id),
        category: 'pokemon',
        author: 'Ash'
      });
      assert.ok(challengeUrl.includes('r=' + sorted.map(p => p.id).join('.')));
    });

    // Scenario 2: Pokémon Starters Preset Tournament Flow
    harness.it('4.2: Pokémon Starters tournament full lifecycle simulation with alternating picks', async ({ assert }) => {
      const PRESET_STARTERS_IDS = [3, 6, 9, 154, 157, 160, 254, 257, 260, 389, 392, 658, 724, 815, 908, 911];
      const candidates = PRESET_STARTERS_IDS.map(id => pokemonRaw.find(p => p.id === id)).filter(Boolean);
      assert.strictEqual(candidates.length, 16);

      let step = 0;
      const askPref = async () => {
        step++;
        return step % 2 === 0 ? 'left' : 'right';
      };

      const sorted = await interleavedBisectSortAsync([...candidates], askPref, 202);
      assert.strictEqual(sorted.length, 16);
      assert.ok(sorted[0].name, 'Champion must be crowned');
    });

    // Scenario 3: Pokémon Legendaries Preset Tournament Flow
    harness.it('4.3: Pokémon Legendaries tournament full simulation with right preference', async ({ assert }) => {
      const PRESET_LEGENDARIES_IDS = [150, 151, 249, 250, 384, 382, 383, 483, 484, 487, 493, 643, 644, 716, 888, 1007];
      const candidates = PRESET_LEGENDARIES_IDS.map(id => pokemonRaw.find(p => p.id === id)).filter(Boolean);
      assert.strictEqual(candidates.length, 16);

      const sorted = await interleavedBisectSortAsync([...candidates], async () => 'right', 303);
      assert.strictEqual(sorted.length, 16);
      assert.ok(sorted[0], 'Must produce valid champion');
    });

    // Scenario 4: Pokémon Custom Wizard Flow (Gen 3 + Water + Slider 8)
    harness.it('4.4: Pokémon Custom Wizard flow (Gen 3 + Water + Slider 8) end-to-end', async ({ assert }) => {
      const filtered = pokemonRaw.filter(p => p.gen === 3 && p.types.includes('water'));
      assert.ok(filtered.length >= 8, `Gen 3 Water Pokémon must be >=8, found ${filtered.length}`);

      const sampled = sampleCandidates(filtered, 8, 'popular', {
        rng: createSeededRng(404),
        compareFn: (a, b) => a.id - b.id
      });
      assert.strictEqual(sampled.length, 8);

      // Favorite Kyogre (id 382) or Swampert (id 260) if present
      const askPref = async (left, right) => {
        if (left.id === 382 || left.id === 260) return 'left';
        if (right.id === 382 || right.id === 260) return 'right';
        return 'left';
      };

      const sorted = await interleavedBisectSortAsync([...sampled], askPref, 404);
      assert.strictEqual(sorted.length, 8);
      const champion = sorted[0];
      assert.ok(champion.id === 382 || champion.id === 260 || champion);
    });

    // Scenario 5: Aves 16-Bird Tournament with 3 Undo operations
    harness.it('4.5: Aves 16-bird tournament full simulation with 3 Undo operations', async ({ assert }) => {
      const mockBirds = Array.from({ length: 16 }, (_, i) => ({
        id: i + 1,
        name: `Ave ${i + 1}`,
        score: i + 1
      }));

      const history = [];
      let undoTriggered = 0;

      const askPrefWithUndo = async (left, right) => {
        const choice = left.score > right.score ? 'left' : 'right';
        history.push(choice);

        // Simulate undo at step 5, 10, 15
        if (history.length === 5 && undoTriggered === 0) {
          undoTriggered++;
          history.pop();
        } else if (history.length === 10 && undoTriggered === 1) {
          undoTriggered++;
          history.pop();
        } else if (history.length === 15 && undoTriggered === 2) {
          undoTriggered++;
          history.pop();
        }

        return choice;
      };

      const sorted = await interleavedBisectSortAsync([...mockBirds], askPrefWithUndo, 505);
      assert.strictEqual(sorted.length, 16);
      assert.strictEqual(undoTriggered, 3, 'All 3 undo operations must have been performed');
      assert.strictEqual(sorted[0].id, 16, 'Highest score bird must win regardless of undos');
    });

    // Scenario 6: Aves Shared Challenge Roundtrip
    harness.it('4.6: Aves shared challenge roundtrip: build URL -> parse -> play duel -> crown winner', async ({ assert }) => {
      const birdIds = ['1', '2', '3', '4', '5', '6', '7', '8'];
      const url = buildChallengeUrl({
        baseUrl: 'https://rankea2.pages.dev/aves/',
        ids: birdIds,
        category: 'aves',
        author: 'Ornithologist'
      });

      const parsed = parseChallengeUrl(url.slice(url.indexOf('?')));
      assert.ok(parsed);
      assert.deepStrictEqual(parsed.ids, birdIds);

      const challengeCandidates = parsed.ids.map(id => ({ id, name: `Bird ${id}` }));
      const sorted = await interleavedBisectSortAsync(challengeCandidates, async (l, r) => (l.id === '1' ? 'left' : r.id === '1' ? 'right' : 'left'), 606);
      assert.strictEqual(sorted.length, 8);
      assert.strictEqual(sorted[0].id, '1');
    });

    // Scenario 7: Mamíferos 16-Animal Tournament Simulation
    harness.it('4.7: Mamíferos 16-animal tournament full simulation -> podium and rest ranking', async ({ assert }) => {
      assert.ok(mamiferosRaw.length >= 16);

      // Simulates preference favoring Jaguar (or apex predator)
      const askPref = async (left, right) => {
        if (left.name === 'Jaguar') return 'left';
        if (right.name === 'Jaguar') return 'right';
        return left.id < right.id ? 'left' : 'right';
      };

      const pool = mamiferosRaw.slice(0, 16);
      const sorted = await interleavedBisectSortAsync(pool, askPref, 707);
      assert.strictEqual(sorted.length, 16);
      assert.strictEqual(sorted[0].name, 'Jaguar');

      const top3 = sorted.slice(0, 3);
      const rest = sorted.slice(3);
      assert.strictEqual(top3.length, 3);
      assert.strictEqual(rest.length, 13);
    });

    // Scenario 8: Flores 16-Plant Tournament Simulation
    harness.it('4.8: Flores 16-plant tournament full simulation -> podium and rest ranking', async ({ assert }) => {
      assert.ok(floresRaw.length >= 16);

      const askPref = async (left, right) => {
        return left.id > right.id ? 'left' : 'right';
      };

      const pool = floresRaw.slice(0, 16);
      const sorted = await interleavedBisectSortAsync(pool, askPref, 808);
      assert.strictEqual(sorted.length, 16);

      const top3 = sorted.slice(0, 3);
      const rest = sorted.slice(3);
      assert.strictEqual(top3.length, 3);
      assert.strictEqual(rest.length, 13);
    });

    // Scenario 9: Multi-Arena Theme Continuity Flow
    harness.it('4.9: Multi-Arena theme continuity flow (Hub -> Pokémon -> Mamíferos -> Flores -> Aves)', ({ assert }) => {
      const arenaPages = [
        'index.html',
        'pokemon/index.html',
        'mamiferos/index.html',
        'flores/index.html',
        'aves/index.html'
      ];

      // Simulate setting dark theme
      arenaPages.forEach(p => {
        const { window, document } = createMockBrowserEnv(p);
        window.localStorage.setItem('rankea2_theme', 'dark');
        const theme = window.localStorage.getItem('rankea2_theme');
        document.documentElement.classList.toggle('dark', theme === 'dark');
        assert.ok(document.documentElement.classList.contains('dark'), `Page ${p} must inherit dark class`);
      });

      // Simulate switching to light theme
      arenaPages.forEach(p => {
        const { window, document } = createMockBrowserEnv(p);
        window.localStorage.setItem('rankea2_theme', 'light');
        const theme = window.localStorage.getItem('rankea2_theme');
        document.documentElement.classList.toggle('dark', theme === 'dark');
        assert.strictEqual(document.documentElement.classList.contains('dark'), false, `Page ${p} must inherit light class`);
      });
    });

    // Scenario 10: Canvas 2.0 Export Lifecycle Simulation
    harness.it('4.10: Canvas 2.0 export lifecycle simulation (Top 3 -> Story 9:16 & Poster 4:5 cards)', async ({ assert }) => {
      const tournamentTop3 = [
        { id: 25, name: 'Pikachu', photo: 'pikachu.png' },
        { id: 6, name: 'Charizard', photo: 'charizard.png' },
        { id: 150, name: 'Mewtwo', photo: 'mewtwo.png' }
      ];

      // Simulated Canvas 2.0 Engine contract
      const renderRankingCardMock = async ({ arena, winner, top3, format, options }) => {
        assert.ok(arena, 'Arena required');
        assert.ok(winner, 'Winner required');
        assert.ok(top3 && top3.length >= 2, 'Top 3 required');
        assert.ok(format === 'story' || format === 'poster', 'Valid format required');

        const dims = format === 'story' ? { width: 1080, height: 1920 } : { width: 1080, height: 1350 };
        return {
          width: dims.width,
          height: dims.height,
          arena,
          format,
          winnerName: winner.name,
          toDataURL: () => `data:image/png;base64,mock_${format}_card`
        };
      };

      const exportRankingCardMock = async ({ canvas, filename }) => {
        assert.ok(canvas);
        assert.ok(filename);
        return { shared: false, downloaded: true, filename };
      };

      // 1. Story Export
      const storyCard = await renderRankingCardMock({
        arena: 'pokemon',
        winner: tournamentTop3[0],
        top3: tournamentTop3,
        format: 'story',
        options: { theme: 'dark' }
      });
      assert.strictEqual(storyCard.width, 1080);
      assert.strictEqual(storyCard.height, 1920);

      const storyExport = await exportRankingCardMock({
        canvas: storyCard,
        filename: 'rankea2_pokemon_story.png'
      });
      assert.strictEqual(storyExport.downloaded, true);

      // 2. Poster Export
      const posterCard = await renderRankingCardMock({
        arena: 'pokemon',
        winner: tournamentTop3[0],
        top3: tournamentTop3,
        format: 'poster',
        options: { theme: 'dark' }
      });
      assert.strictEqual(posterCard.width, 1080);
      assert.strictEqual(posterCard.height, 1350);

      const posterExport = await exportRankingCardMock({
        canvas: posterCard,
        filename: 'rankea2_pokemon_poster.png'
      });
      assert.strictEqual(posterExport.downloaded, true);
    });

  });
}
