/**
 * DOM Interactive Stress & Bug Registry Suite
 * Tests full interactive user journeys directly against the DOM.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

import {
  ROOT_DIR,
  createMockBrowserEnv
} from './harness.mjs';

import * as tournamentCore from '../../src/core/tournament.js';
import pokemonApp from '../../src/pokemon/main.js';
import mamiferosApp from '../../src/mamiferos/main.js';
import floresApp from '../../src/flores/main.js';

let totalTests = 0;
let passedTests = 0;
const recordedBugs = [];

function recordBug(page, scenario, description, severity = 'HIGH') {
  recordedBugs.push({ page, scenario, description, severity });
  console.error(`🚨 [BUG REGISTRADO][${severity}][${page}] ${scenario}: ${description}`);
}

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    recordedBugs.push({ page: 'TEST', scenario: name, description: err.message, stack: err.stack });
  }
}

console.log('================================================================');
console.log('INICIANDO PRUEBAS INTERACTIVAS DE DOM EN TODAS LAS ARENAS');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// 1. POKÉMON ARENA DOM INTERACTION TESTS
// ----------------------------------------------------------------------
console.log('--- 1. Pruebas de Interacción DOM: Pokémon (/pokemon/) ---');

const pokeEnv = createMockBrowserEnv('pokemon/index.html');
global.window = pokeEnv.window;
global.document = pokeEnv.document;
global.localStorage = pokeEnv.window.localStorage;
global.fetch = pokeEnv.window.fetch;

await runTest('Pokémon: Inicialización, carga de dataset y renderizado de filtros', async () => {
  await pokemonApp.init();

  assert.ok(pokemonApp.state.allPokemon.length > 0, 'El catálogo Pokémon no se cargó');
  
  // Verificar que los botones de generación se renderizaron en el DOM
  const genContainer = document.getElementById('genPillContainer');
  assert.ok(genContainer, '#genPillContainer debe existir');
  assert.ok(genContainer.children.length >= 10, 'Deben existir al menos 10 botones de generación (todas + gen1..9)');

  // Verificar que los botones de tipo se renderizaron
  const typeContainer = document.getElementById('typePillContainer');
  assert.ok(typeContainer, '#typePillContainer debe existir');
  assert.ok(typeContainer.children.length >= 19, 'Deben existir al menos 19 botones de tipo (todos + 18 elementales)');
});

await runTest('Pokémon: Filtrado reactivo, conteos de tipo en vivo y deshabilitación de tipos con 0 candidatos', async () => {
  // Simular selección de Gen 1
  pokemonApp.setGenFilter('1');
  assert.strictEqual(pokemonApp.state.selectedGen, '1');
  assert.strictEqual(pokemonApp.state.candidatePool.length, 151, 'Gen 1 debe tener exactamente 151 pokémon');

  // Verificar que el slider actualizó su max
  const slider = document.getElementById('limitSlider');
  assert.strictEqual(slider.max, '64', 'Slider max debe ser 64 cuando hay 151 disponibles');

  // Comprobar que los tipos reflejan los conteos en sus badges
  const steelBtn = document.getElementById('typeBtn_steel');
  if (steelBtn) {
    const badge = document.getElementById('typeBadge_steel');
    assert.ok(badge, 'Badge de conteo de tipo acero debe existir');
    const count = parseInt(badge.textContent, 10);
    if (count === 0) {
      assert.ok(steelBtn.disabled, 'Botón de tipo con 0 candidatos debe estar deshabilitado');
    }
  }
});

await runTest('Pokémon: Filtro sin candidatos (0 Pokémon) - Warning DOM y botón deshabilitado', async () => {
  const originalPokemon = [...pokemonApp.state.allPokemon];
  pokemonApp.state.allPokemon = [];
  pokemonApp.updateMatchingCount();

  const startBtn = document.getElementById('btnLaunchGame');
  const emptyWarn = document.getElementById('noPokemonWarning');
  const totalFound = document.getElementById('step3TotalFound');

  assert.ok(startBtn.disabled, 'Botón Iniciar Duelos debe estar deshabilitado cuando hay 0 candidatos');
  assert.ok(!emptyWarn.classList.contains('hidden'), 'Warning de 0 candidatos debe ser visible');
  assert.strictEqual(totalFound.textContent, '0');

  // Restaurar dataset
  pokemonApp.state.allPokemon = originalPokemon;
  pokemonApp.updateMatchingCount();
  assert.strictEqual(startBtn.disabled, false);
});

await runTest('Pokémon: Presets DOM - Carga de Kanto, Starters y Legendarios', async () => {
  await pokemonApp.loadDataset();

  // Kanto
  pokemonApp.launchPreset('kanto');
  assert.strictEqual(pokemonApp.state.initialBattlePool.length, 16);
  assert.ok(pokemonApp.state.currentLeft, 'Debe haber un contendiente izquierdo');
  assert.ok(pokemonApp.state.currentRight, 'Debe haber un contendiente derecho');
  
  // Resetear a wizard
  pokemonApp.goToView('viewWizard');
  assert.strictEqual(document.getElementById('viewWizard').classList.contains('hidden'), false);
  assert.strictEqual(document.getElementById('viewBattle').classList.contains('hidden'), true);

  // Starters
  pokemonApp.launchPreset('starters');
  assert.strictEqual(pokemonApp.state.initialBattlePool.length, 16);
  pokemonApp.goToView('viewWizard');

  // Legendaries
  pokemonApp.launchPreset('legendaries');
  assert.strictEqual(pokemonApp.state.initialBattlePool.length, 16);
  pokemonApp.goToView('viewWizard');

  // Eeveeluciones
  pokemonApp.launchPreset('eeveelutions');
  assert.strictEqual(pokemonApp.state.initialBattlePool.length, 9);
  pokemonApp.goToView('viewWizard');

  // Dragones y Fantasmas
  pokemonApp.launchPreset('dragons');
  assert.strictEqual(pokemonApp.state.initialBattlePool.length, 16);
  pokemonApp.goToView('viewWizard');

  // Graphic Mode Toggle (Pixel UI / Moderno)
  const initialPixel = document.body.classList.contains('pixel-ui');
  pokemonApp.togglePixelUi();
  assert.strictEqual(document.body.classList.contains('pixel-ui'), !initialPixel);
  pokemonApp.togglePixelUi();
  assert.strictEqual(document.body.classList.contains('pixel-ui'), initialPixel);
});

await runTest('Pokémon: Duelos interactivos, atajos de teclado y progreso DOM', async () => {
  pokemonApp.launchPreset('kanto');
  assert.ok(pokemonApp.state.currentLeft, 'Debe haber un contendiente izquierdo');
  assert.ok(pokemonApp.state.currentRight, 'Debe haber un contendiente derecho');

  const initialStep = pokemonApp.state.battleStep;

  // Elegir contendiente izquierdo por click
  pokemonApp.chooseCandidate('left');
  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(pokemonApp.state.battleStep, initialStep + 1, 'El paso de batalla debe incrementarse');
  assert.strictEqual(pokemonApp.state.choiceHistory.length, 1, 'Historial debe registrar 1 elección');
  assert.strictEqual(pokemonApp.state.choiceHistory[0], 'left', 'Elección izquierda debe ser "left"');

  // Elegir siguiente contendiente
  pokemonApp.chooseCandidate('right');
  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(pokemonApp.state.battleStep, initialStep + 2);
  assert.strictEqual(pokemonApp.state.choiceHistory.length, 2);
  assert.strictEqual(pokemonApp.state.choiceHistory[1], 'right', 'Elección derecha debe ser "right"');
});

await runTest('Pokémon: Deshacer (Undo) interactivo con Z y botón DOM', async () => {
  const stepsBefore = pokemonApp.state.battleStep;
  assert.ok(stepsBefore >= 2, 'Debe haber pasos para deshacer');

  // Deshacer una vez
  pokemonApp.undoLastBattleChoice();
  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(pokemonApp.state.choiceHistory.length, 1, 'Debe quedar 1 elección en historial tras Undo');

  // Deshacer segunda vez
  pokemonApp.undoLastBattleChoice();
  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(pokemonApp.state.choiceHistory.length, 0, 'Historial debe quedar vacío');

  // Deshacer cuando el historial ya está vacío no debe crashear
  pokemonApp.undoLastBattleChoice();
  assert.strictEqual(pokemonApp.state.choiceHistory.length, 0);
});

await runTest('Pokémon: Flujo completo hasta Resultados, Podio y Modal de Exportación', async () => {
  // Configurar pool de 4 candidatos para terminar rápidamente
  await pokemonApp.loadDataset();
  pokemonApp.state.selectedGen = 'all';
  pokemonApp.state.selectedType = 'all';
  pokemonApp.state.selectedRarity = 'all';
  pokemonApp.state.limit = 4;
  
  const battlePromise = pokemonApp.startBattleGame();
  await new Promise(r => setTimeout(r, 10));

  // Resolver duelos automáticamente hasta terminar
  let guard = 0;
  while (pokemonApp.state.pendingResolver && guard < 20) {
    guard++;
    pokemonApp.chooseCandidate('left');
    await new Promise(r => setTimeout(r, 10));
  }

  await battlePromise;

  // Verificar transición a vista de resultados
  assert.strictEqual(document.getElementById('viewResults').classList.contains('hidden'), false);
  assert.ok(pokemonApp.state.finalRanking.length === 4, 'Ranking final debe tener 4 pokémon');

  // Modal de Exportación
  pokemonApp.openExportModal();
  const modal = document.getElementById('exportModal');
  assert.strictEqual(modal.classList.contains('hidden'), false, 'Modal debe estar abierto');

  // Cambiar formato a 'poster' y luego a 'story'
  pokemonApp.setExportFormat('poster');
  assert.strictEqual(pokemonApp.state.exportFormat, 'poster');
  pokemonApp.setExportFormat('story');
  assert.strictEqual(pokemonApp.state.exportFormat, 'story');

  // Cerrar modal
  pokemonApp.closeExportModal();
  assert.strictEqual(modal.classList.contains('hidden'), true, 'Modal debe estar cerrado');
});

// ----------------------------------------------------------------------
// 2. MAMÍFEROS & FLORES DOM TESTS
// ----------------------------------------------------------------------
console.log('\n--- 2. Pruebas de Interacción DOM: Mamíferos y Flores ---');

await runTest('Mamíferos: Inicialización, duelos y podio', async () => {
  const env = createMockBrowserEnv('mamiferos/index.html');
  global.window = env.window;
  global.document = env.document;
  global.localStorage = env.window.localStorage;
  global.fetch = env.window.fetch;

  await mamiferosApp.init();
  assert.ok(mamiferosApp.state.pool.length >= 16, 'Debe haber al menos 16 especies de mamíferos');

  // Iniciar torneo con 4
  mamiferosApp.state.limit = 4;
  const battlePromise = mamiferosApp.startBattleGame();
  await new Promise(r => setTimeout(r, 10));
  assert.strictEqual(document.getElementById('viewBattle').classList.contains('hidden'), false);

  // Resolver duelos
  let guard = 0;
  while (mamiferosApp.state.pendingResolver && guard < 20) {
    guard++;
    mamiferosApp.chooseCandidate('left');
    await new Promise(r => setTimeout(r, 10));
  }

  await battlePromise;

  assert.strictEqual(document.getElementById('viewResults').classList.contains('hidden'), false);
  assert.strictEqual(mamiferosApp.state.finalRanking.length, 4);
});

await runTest('Flores: Inicialización, duelos y podio', async () => {
  const env = createMockBrowserEnv('flores/index.html');
  global.window = env.window;
  global.document = env.document;
  global.localStorage = env.window.localStorage;
  global.fetch = env.window.fetch;

  await floresApp.init();
  assert.ok(floresApp.state.pool.length >= 16, 'Debe haber al menos 16 especies de flores');

  // Iniciar torneo con 4
  floresApp.state.limit = 4;
  const battlePromise = floresApp.startBattleGame();
  await new Promise(r => setTimeout(r, 10));
  assert.strictEqual(document.getElementById('viewBattle').classList.contains('hidden'), false);

  // Resolver duelos
  let guard = 0;
  while (floresApp.state.pendingResolver && guard < 20) {
    guard++;
    floresApp.chooseCandidate('right');
    await new Promise(r => setTimeout(r, 10));
  }

  await battlePromise;

  assert.strictEqual(document.getElementById('viewResults').classList.contains('hidden'), false);
  assert.strictEqual(floresApp.state.finalRanking.length, 4);
});

// ----------------------------------------------------------------------
// 3. INCOMING CHALLENGE URL DOM PARSING & ROUTING
// ----------------------------------------------------------------------
console.log('\n--- 3. Pruebas de Desafíos (Challenge URL) en DOM ---');

await runTest('Pokémon: Desafío entrante muestra banner y botón Aceptar inicia duelo exacto', async () => {
  const env = createMockBrowserEnv('pokemon/index.html');
  env.window.location.search = `?r=25.6.150.131&c=pokemon&a=Ash`;
  global.window = env.window;
  global.document = env.document;
  global.localStorage = env.window.localStorage;
  global.fetch = env.window.fetch;

  await pokemonApp.init();

  const banner = document.getElementById('challengeBanner');
  assert.ok(banner, 'Banner de desafío debe existir');
  assert.strictEqual(banner.classList.contains('hidden'), false, 'Banner debe mostrarse cuando hay desafío en URL');

  // Aceptar desafío
  pokemonApp.acceptChallenge();
  assert.strictEqual(banner.classList.contains('hidden'), true, 'Banner debe ocultarse al aceptar');
  assert.strictEqual(document.getElementById('viewBattle').classList.contains('hidden'), false, 'Debe mostrar viewBattle');
  assert.strictEqual(pokemonApp.state.initialBattlePool.length, 4);
});

// ----------------------------------------------------------------------
// RESUMEN FINAL
// ----------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL PRUEBAS EJECUTADAS: ${totalTests}`);
console.log(`PRUEBAS EXITOSAS: ${passedTests}`);
console.log(`BUGS REGISTRADOS: ${recordedBugs.length}`);
console.log('================================================================\n');

if (recordedBugs.length > 0) {
  console.log('DETALLE DE BUGS REGISTRADOS:');
  console.table(recordedBugs);
  process.exit(1);
} else {
  console.log('¡TODAS LAS PRUEBAS INTERACTIVAS DE DOM PASARON SIN ERRORES NI REGRESIONES!');
}
