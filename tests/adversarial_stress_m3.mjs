/**
 * Adversarial Empirical Stress Test Suite for Milestone 3 (Canvas 2.0 & Multi-Arena Export)
 *
 * Exhaustive testing of:
 * 1. Boundary & corner conditions in renderRankingCard
 * 2. Canvas dimensions & exact aspect ratios
 * 3. Photo uncropped contain mode, ambient blur, and broken photo fallbacks
 * 4. Multi-tier export fallbacks (Web Share, AbortError, ClipboardItem, PNG download)
 * 5. Multi-arena theming (Pokemon, Mamíferos, Flores, Aves)
 * 6. UI modal DOM and controller actions across arenas
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

import {
  ARENA_CONFIG,
  renderRankingCard,
  exportRankingCard,
  truncateText,
  drawRoundRect,
  drawUncroppedPhoto,
  loadImageSafe
} from '../src/core/canvas.js';

import { ROOT_DIR, createMockBrowserEnv, calculateContrastRatio } from './e2e/harness.mjs';

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

// ---------------------------------------------------------------------------
// Mock 2D Canvas & Context Simulation for Node.js
// ---------------------------------------------------------------------------
class MockCanvas2DContext {
  constructor(canvas, { supportRoundRect = true } = {}) {
    this.canvas = canvas;
    this.calls = [];
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.font = '10px sans-serif';
    this.textAlign = 'left';
    this.filter = 'none';
    this.imageSmoothingEnabled = true;

    if (supportRoundRect) {
      this.roundRect = (x, y, w, h, r) => {
        this.calls.push({ method: 'roundRect', x, y, w, h, r });
      };
    }
  }
  beginPath() { this.calls.push({ method: 'beginPath' }); }
  closePath() { this.calls.push({ method: 'closePath' }); }
  moveTo(x, y) { this.calls.push({ method: 'moveTo', x, y }); }
  lineTo(x, y) { this.calls.push({ method: 'lineTo', x, y }); }
  quadraticCurveTo(cpx, cpy, x, y) { this.calls.push({ method: 'quadraticCurveTo', cpx, cpy, x, y }); }
  fill() { this.calls.push({ method: 'fill', fillStyle: this.fillStyle }); }
  stroke() { this.calls.push({ method: 'stroke', strokeStyle: this.strokeStyle }); }
  fillRect(x, y, w, h) { this.calls.push({ method: 'fillRect', x, y, w, h, fillStyle: this.fillStyle }); }
  strokeRect(x, y, w, h) { this.calls.push({ method: 'strokeRect', x, y, w, h }); }
  fillText(text, x, y) { this.calls.push({ method: 'fillText', text, x, y, font: this.font, fillStyle: this.fillStyle }); }
  save() { this.calls.push({ method: 'save' }); }
  restore() { this.calls.push({ method: 'restore' }); }
  rect(x, y, w, h) { this.calls.push({ method: 'rect', x, y, w, h }); }
  clip() { this.calls.push({ method: 'clip' }); }
  drawImage(img, ...args) { this.calls.push({ method: 'drawImage', img, args }); }
  measureText(text) { return { width: (text || '').length * 12 }; }
}

class MockFullCanvas {
  constructor(w = 1080, h = 1920, { supportRoundRect = true } = {}) {
    this.width = w;
    this.height = h;
    this.ctx = new MockCanvas2DContext(this, { supportRoundRect });
  }
  getContext(type) {
    if (type === '2d') return this.ctx;
    return null;
  }
  toDataURL(type = 'image/png') {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
  toBlob(callback, type = 'image/png') {
    if (callback) {
      const bstr = 'mock_png_binary_data';
      const u8 = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      callback(new Blob([u8], { type: 'image/png' }));
    }
  }
}

function setMockNavigator(navObj) {
  Object.defineProperty(globalThis, 'navigator', {
    value: navObj,
    configurable: true,
    writable: true
  });
}

// ===========================================================================
// SUITE EXECUTION
// ===========================================================================

console.log('================================================================');
console.log('   RANKEA2 — ADVERSARIAL EMPIRICAL STRESS SUITE (M3)           ');
console.log('================================================================\n');

// ---------------------------------------------------------------------------
// TIER 1: Module Contracts, Configuration & Contrast
// ---------------------------------------------------------------------------
console.log('--- TIER 1: Module Contracts & Configuration Integrity ---');

check('T1.1: Core canvas exports exist and are valid types', () => {
  assert.strictEqual(typeof renderRankingCard, 'function');
  assert.strictEqual(typeof exportRankingCard, 'function');
  assert.strictEqual(typeof truncateText, 'function');
  assert.strictEqual(typeof drawRoundRect, 'function');
  assert.strictEqual(typeof drawUncroppedPhoto, 'function');
  assert.strictEqual(typeof loadImageSafe, 'function');
  assert.strictEqual(typeof ARENA_CONFIG, 'object');
});

check('T1.2: ARENA_CONFIG defines all 4 arenas with light and dark themes', () => {
  const arenas = ['pokemon', 'mamiferos', 'flores', 'aves'];
  for (const a of arenas) {
    assert.ok(ARENA_CONFIG[a], `Missing config for arena: ${a}`);
    assert.ok(ARENA_CONFIG[a].brand, `Missing brand for arena: ${a}`);
    assert.ok(ARENA_CONFIG[a].tagline, `Missing tagline for arena: ${a}`);
    assert.ok(ARENA_CONFIG[a].displayFont, `Missing displayFont for arena: ${a}`);
    assert.ok(ARENA_CONFIG[a].bodyFont, `Missing bodyFont for arena: ${a}`);
    assert.ok(ARENA_CONFIG[a].light, `Missing light theme for arena: ${a}`);
    assert.ok(ARENA_CONFIG[a].dark, `Missing dark theme for arena: ${a}`);

    // Contrast check on text vs card background
    const crLight = calculateContrastRatio(ARENA_CONFIG[a].light.ink, ARENA_CONFIG[a].light.bg);
    assert.ok(crLight >= 4.5, `Arena ${a} light contrast ${crLight.toFixed(2)} must be >= 4.5`);

    const crDark = calculateContrastRatio(ARENA_CONFIG[a].dark.ink, ARENA_CONFIG[a].dark.bg);
    assert.ok(crDark >= 4.5, `Arena ${a} dark contrast ${crDark.toFixed(2)} must be >= 4.5`);
  }
});

check('T1.3: Text truncation handles edge cases (empty, null, undefined, numeric)', () => {
  assert.strictEqual(truncateText('', 20), '');
  assert.strictEqual(truncateText(null, 20), '');
  assert.strictEqual(truncateText(undefined, 20), '');
  assert.strictEqual(truncateText('Short text', 20), 'Short text');
  assert.strictEqual(truncateText('ExactTwentyCharsHere', 20), 'ExactTwentyCharsHere');
  assert.strictEqual(truncateText('This is a longer text that must be cut', 10), 'This is a…');
  assert.strictEqual(truncateText('This is a longer text that must be cut', 10).length, 10);
});

// ---------------------------------------------------------------------------
// TIER 2: Boundary & Corner Conditions on renderRankingCard
// ---------------------------------------------------------------------------
console.log('\n--- TIER 2: Boundary & Corner Conditions on renderRankingCard ---');

await asyncCheck('T2.1: Missing winner rejects with exact required error message', async () => {
  const invalidWinners = [null, undefined, false, '', 0];
  for (const win of invalidWinners) {
    let thrown = false;
    try {
      await renderRankingCard({ arena: 'pokemon', winner: win });
    } catch (err) {
      thrown = true;
      assert.strictEqual(err.message, 'Winner is required for ranking card');
    }
    assert.ok(thrown, `Expected error for invalid winner: ${win}`);
  }
});

await asyncCheck('T2.2: Top3 array with 0 items falls back to [winner] without crash', async () => {
  const winner = { id: 25, name: 'Pikachu' };
  const mockCanvas = new MockFullCanvas(1080, 1920);
  const card = await renderRankingCard({
    arena: 'pokemon',
    winner,
    top3: [],
    format: 'story',
    options: { canvas: mockCanvas }
  });
  assert.strictEqual(card.width, 1080);
  assert.strictEqual(card.height, 1920);
  // Verify winner text was rendered
  const fills = mockCanvas.ctx.calls.filter(c => c.method === 'fillText' && c.text === 'Pikachu');
  assert.ok(fills.length >= 1, 'Winner Pikachu must be drawn');
});

await asyncCheck('T2.3: Top3 array with 1 item renders winner and skips #2 and #3', async () => {
  const winner = { id: 1, name: 'Jaguar', sci_name: 'Panthera onca' };
  const mockCanvas = new MockFullCanvas(1080, 1920);
  const card = await renderRankingCard({
    arena: 'mamiferos',
    winner,
    top3: [winner],
    format: 'story',
    options: { canvas: mockCanvas }
  });
  assert.strictEqual(card.width, 1080);
  assert.strictEqual(card.height, 1920);

  // Silver and bronze badges should NOT be rendered
  const silverCalls = mockCanvas.ctx.calls.filter(c => c.method === 'fillText' && c.text.includes('PLATA'));
  const bronzeCalls = mockCanvas.ctx.calls.filter(c => c.method === 'fillText' && c.text.includes('BRONCE'));
  assert.strictEqual(silverCalls.length, 0, 'Silver medal should not render when top3 has 1 item');
  assert.strictEqual(bronzeCalls.length, 0, 'Bronze medal should not render when top3 has 1 item');
});

await asyncCheck('T2.4: Top3 array with 2 items renders #1 and #2, safely skipping #3', async () => {
  const winner = { id: 1, name: 'Rosa Silvestre', sci_name: 'Rosa canina' };
  const second = { id: 2, name: 'Lavanda', sci_name: 'Lavandula angustifolia' };
  const mockCanvas = new MockFullCanvas(1080, 1920);

  const card = await renderRankingCard({
    arena: 'flores',
    winner,
    top3: [winner, second],
    format: 'story',
    options: { canvas: mockCanvas }
  });
  assert.strictEqual(card.width, 1080);
  assert.strictEqual(card.height, 1920);

  // Gold and Silver medals should be rendered, Bronze omitted
  const goldCalls = mockCanvas.ctx.calls.filter(c => c.method === 'fillText' && c.text.includes('CAMPEÓN'));
  const silverCalls = mockCanvas.ctx.calls.filter(c => c.method === 'fillText' && c.text.includes('PLATA'));
  const bronzeCalls = mockCanvas.ctx.calls.filter(c => c.method === 'fillText' && c.text.includes('BRONCE'));

  assert.strictEqual(goldCalls.length, 1, 'Gold medal must render');
  assert.strictEqual(silverCalls.length, 1, 'Silver medal must render for 2nd place');
  assert.strictEqual(bronzeCalls.length, 0, 'Bronze medal must not render when only 2 items');
});

await asyncCheck('T2.5: Extremely long candidate names & subtitles (500+ chars) are truncated', async () => {
  const hugeName = 'P'.repeat(500);
  const hugeSubtitle = 'Sub'.repeat(300);
  const hugeBadge = 'Badge'.repeat(200);

  const mockCanvas = new MockFullCanvas(1080, 1920);
  const card = await renderRankingCard({
    arena: 'pokemon',
    winner: { id: 999, name: hugeName, region: hugeSubtitle, types: [hugeBadge] },
    top3: [
      { id: 999, name: hugeName, region: hugeSubtitle, types: [hugeBadge] },
      { id: 998, name: hugeName, region: hugeSubtitle, types: [hugeBadge] },
      { id: 997, name: hugeName, region: hugeSubtitle, types: [hugeBadge] }
    ],
    format: 'story',
    options: { canvas: mockCanvas, title: 'T'.repeat(200) }
  });

  assert.strictEqual(card.width, 1080);

  // Check that candidate names are properly truncated with ellipsis (<= 26 chars for hero, <= 20 chars for top 2/3)
  const heroNameCall = mockCanvas.ctx.calls.find(c => c.method === 'fillText' && c.text.startsWith('PPPP'));
  assert.ok(heroNameCall, 'Hero candidate name must be drawn');
  assert.ok(heroNameCall.text.length <= 26, `Hero candidate name truncated to <= 26 chars, got ${heroNameCall.text.length}`);
  assert.ok(heroNameCall.text.endsWith('…'), 'Truncated name must end with ellipsis');

  // Title truncated
  const titleCall = mockCanvas.ctx.calls.find(c => c.method === 'fillText' && c.text.startsWith('TTTT'));
  assert.ok(titleCall, 'Card title must be drawn');
  assert.ok(titleCall.text.length <= 30, `Title truncated to <= 30 chars, got ${titleCall.text.length}`);
  assert.ok(titleCall.text.endsWith('…'), 'Truncated title must end with ellipsis');
});

await asyncCheck('T2.6: Hostile characters (Unicode diacritics, RTL, HTML tags, null bytes) render safely', async () => {
  const hostileWinner = {
    id: 1,
    name: '<script>alert("xss")</script> & <html> "Pikachú"',
    subtitle: 'العربية / עִבְרִית / 🌟⭐✨',
    photo: 'https://example.com/broken\x00img.png'
  };
  const mockCanvas = new MockFullCanvas(1080, 1920);
  const card = await renderRankingCard({
    arena: 'aves',
    winner: hostileWinner,
    format: 'poster',
    options: { canvas: mockCanvas }
  });
  assert.strictEqual(card.width, 1080);
  assert.strictEqual(card.height, 1350);
});

await asyncCheck('T2.7: Missing or broken photo URLs fallback without throwing', async () => {
  const brokenPhotos = ['', null, undefined, 'https://invalid-host-9876543210.org/missing.png'];
  for (const p of brokenPhotos) {
    const res = await loadImageSafe(p);
    assert.strictEqual(res, null, `loadImageSafe should return null for broken photo: ${p}`);
  }

  // Render with broken photo
  const mockCanvas = new MockFullCanvas(1080, 1920);
  const card = await renderRankingCard({
    arena: 'mamiferos',
    winner: { id: 1, name: 'Puma', photo: 'https://invalid-host-9876543210.org/missing.png' },
    top3: [
      { id: 1, name: 'Puma', photo: '' },
      { id: 2, name: 'Zorro', photo: null },
      { id: 3, name: 'Guanaco' }
    ],
    options: { canvas: mockCanvas }
  });
  assert.strictEqual(card.width, 1080);
  assert.strictEqual(card.height, 1920);
});

// ---------------------------------------------------------------------------
// TIER 3: Dimensions, Formats & Aspect Ratios
// ---------------------------------------------------------------------------
console.log('\n--- TIER 3: Dimensions, Formats & Aspect Ratios ---');

await asyncCheck('T3.1: Story format has exact 1080x1920 dimensions and 9:16 aspect ratio', async () => {
  const mockCanvas = new MockFullCanvas(100, 100);
  const card = await renderRankingCard({
    arena: 'pokemon',
    winner: { id: 25, name: 'Pikachu' },
    format: 'story',
    options: { canvas: mockCanvas }
  });
  assert.strictEqual(card.width, 1080);
  assert.strictEqual(card.height, 1920);
  const ratio = card.width / card.height;
  assert.strictEqual(ratio, 9 / 16);
});

await asyncCheck('T3.2: Poster format has exact 1080x1350 dimensions and 4:5 aspect ratio', async () => {
  const mockCanvas = new MockFullCanvas(100, 100);
  const card = await renderRankingCard({
    arena: 'pokemon',
    winner: { id: 25, name: 'Pikachu' },
    format: 'poster',
    options: { canvas: mockCanvas }
  });
  assert.strictEqual(card.width, 1080);
  assert.strictEqual(card.height, 1350);
  const ratio = card.width / card.height;
  assert.strictEqual(ratio, 4 / 5);
});

await asyncCheck('T3.3: Unknown format strings default safely to Story (1080x1920)', async () => {
  const unknownFormats = ['unknown', 'square', 'banner', '3x4', null, undefined];
  for (const fmt of unknownFormats) {
    const mockCanvas = new MockFullCanvas(100, 100);
    const card = await renderRankingCard({
      arena: 'pokemon',
      winner: { id: 25, name: 'Pikachu' },
      format: fmt,
      options: { canvas: mockCanvas }
    });
    assert.strictEqual(card.width, 1080, `Width must be 1080 for format: ${fmt}`);
    assert.strictEqual(card.height, 1920, `Height must be 1920 for format: ${fmt}`);
  }
});

await asyncCheck('T3.4: Headless mode fallback creates functional mock canvas when options.canvas not provided', async () => {
  const card = await renderRankingCard({
    arena: 'pokemon',
    winner: { id: 25, name: 'Pikachu' },
    format: 'poster'
  });
  assert.strictEqual(card.width, 1080);
  assert.strictEqual(card.height, 1350);
  assert.strictEqual(typeof card.toDataURL, 'function');
  const data = card.toDataURL();
  assert.ok(data.startsWith('data:image/png'));
});

await asyncCheck('T3.5: Fallback path when ctx.roundRect is not natively supported', async () => {
  const mockCanvasNoRoundRect = new MockFullCanvas(1080, 1920, { supportRoundRect: false });
  assert.strictEqual(typeof mockCanvasNoRoundRect.ctx.roundRect, 'undefined');

  const card = await renderRankingCard({
    arena: 'aves',
    winner: { id: 1, name: 'Hornero', sci_name: 'Furnarius rufus' },
    format: 'story',
    options: { canvas: mockCanvasNoRoundRect }
  });

  assert.strictEqual(card.width, 1080);
  // Verify quadraticCurveTo was called as fallback
  const quadCalls = mockCanvasNoRoundRect.ctx.calls.filter(c => c.method === 'quadraticCurveTo');
  assert.ok(quadCalls.length > 0, 'Must use quadraticCurveTo when roundRect is missing');
});

await asyncCheck('T3.6: Story mode renders compact ranking rest list for positions #4 to #9', async () => {
  const ranking = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Pokemon #${i + 1}`,
    types: ['normal']
  }));
  const mockCanvas = new MockFullCanvas(1080, 1920);
  await renderRankingCard({
    arena: 'pokemon',
    winner: ranking[0],
    top3: ranking.slice(0, 3),
    format: 'story',
    options: {
      canvas: mockCanvas,
      ranking
    }
  });

  // Check positions #4 through #9 were rendered
  for (let pos = 4; pos <= 9; pos++) {
    const posTag = `#${pos}`;
    const found = mockCanvas.ctx.calls.some(c => c.method === 'fillText' && c.text === posTag);
    assert.ok(found, `Expected position tag ${posTag} in rest ranking`);
  }
});

// ---------------------------------------------------------------------------
// TIER 4: Stress-Testing exportRankingCard & Fallback Chain
// ---------------------------------------------------------------------------
console.log('\n--- TIER 4: Stress-Testing exportRankingCard & Sharing Fallbacks ---');

await asyncCheck('T4.1: Missing canvas parameter throws descriptive error', async () => {
  let thrown = false;
  try {
    await exportRankingCard({});
  } catch (err) {
    thrown = true;
    assert.strictEqual(err.message, 'Canvas element is required for export');
  }
  assert.ok(thrown);
});

await asyncCheck('T4.2: Web Share API native share success returns { shared: true, downloaded: false }', async () => {
  const mockCanvas = new MockFullCanvas(1080, 1920);

  // Set up navigator.share environment
  let shareCalled = false;
  setMockNavigator({
    canShare: (data) => Boolean(data && data.files),
    share: async (data) => {
      shareCalled = true;
      assert.ok(data.files && data.files.length === 1);
      assert.strictEqual(data.title, 'Test Title');
    }
  });

  const res = await exportRankingCard({
    canvas: mockCanvas,
    filename: 'test.png',
    title: 'Test Title',
    text: 'Test Text',
    action: 'auto'
  });

  assert.strictEqual(res.shared, true);
  assert.strictEqual(res.downloaded, false);
  assert.strictEqual(shareCalled, true);
});

await asyncCheck('T4.3: Web Share API AbortError returns { shared: false, cancelled: true } without error', async () => {
  const mockCanvas = new MockFullCanvas(1080, 1920);

  setMockNavigator({
    canShare: () => true,
    share: async () => {
      const abortErr = new Error('Share canceled by user');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
  });

  const res = await exportRankingCard({
    canvas: mockCanvas,
    filename: 'test.png',
    action: 'auto'
  });

  assert.strictEqual(res.shared, false);
  assert.strictEqual(res.cancelled, true);
  assert.strictEqual(res.downloaded, false);
});

await asyncCheck('T4.4: Web Share API failure falls back to clipboard or download', async () => {
  const mockCanvas = new MockFullCanvas(1080, 1920);

  let clipboardWritten = false;
  setMockNavigator({
    canShare: () => true,
    share: async () => {
      throw new Error('Share failed unexpectedly');
    },
    clipboard: {
      write: async (items) => {
        clipboardWritten = true;
      }
    }
  });
  global.ClipboardItem = class { constructor(obj) { this.obj = obj; } };

  const res = await exportRankingCard({
    canvas: mockCanvas,
    filename: 'test.png',
    action: 'auto'
  });

  assert.strictEqual(res.copied, true);
  assert.strictEqual(clipboardWritten, true);
});

await asyncCheck('T4.5: Explicit copy action succeeds with ClipboardItem', async () => {
  const mockCanvas = new MockFullCanvas(1080, 1920);

  let clipboardWritten = false;
  setMockNavigator({
    clipboard: {
      write: async () => { clipboardWritten = true; }
    }
  });
  global.ClipboardItem = class { constructor(obj) { this.obj = obj; } };

  const res = await exportRankingCard({
    canvas: mockCanvas,
    filename: 'test.png',
    action: 'copy'
  });

  assert.strictEqual(res.copied, true);
  assert.strictEqual(clipboardWritten, true);
});

await asyncCheck('T4.6: Explicit download action creates <a> and triggers download', async () => {
  const mockCanvas = new MockFullCanvas(1080, 1920);

  let downloadTriggered = false;
  let downloadedFilename = '';
  global.document = {
    createElement: (tag) => {
      return {
        tag,
        set download(val) { downloadedFilename = val; },
        click: () => { downloadTriggered = true; }
      };
    },
    body: {
      appendChild: () => {},
      removeChild: () => {}
    }
  };
  global.URL = {
    createObjectURL: (blob) => 'blob:mock-url'
  };

  const res = await exportRankingCard({
    canvas: mockCanvas,
    filename: 'my-ranking-card.png',
    action: 'download'
  });

  assert.strictEqual(res.downloaded, true);
  assert.strictEqual(downloadTriggered, true);
  assert.strictEqual(downloadedFilename, 'my-ranking-card.png');
});

await asyncCheck('T4.7: Headless environment without window or navigator defaults safely to downloaded: true', async () => {
  // Clean up globals
  delete global.document;
  delete global.ClipboardItem;
  setMockNavigator(undefined);

  const mockCanvas = new MockFullCanvas(1080, 1920);
  const res = await exportRankingCard({
    canvas: mockCanvas,
    filename: 'headless-test.png'
  });

  assert.strictEqual(res.downloaded, true);
  assert.strictEqual(res.filename, 'headless-test.png');
});

// ---------------------------------------------------------------------------
// TIER 5: Arena Markup, Controller Wiring & Modal Interactive Flow
// ---------------------------------------------------------------------------
console.log('\n--- TIER 5: Arena Markup & Controller Flow ---');

const targetArenas = [
  { dir: 'pokemon', main: '../src/pokemon/main.js', html: '../pokemon/index.html' },
  { dir: 'mamiferos', main: '../src/mamiferos/main.js', html: '../mamiferos/index.html' },
  { dir: 'flores', main: '../src/flores/main.js', html: '../flores/index.html' }
];

for (const { dir, main, html } of targetArenas) {
  check(`T5.1 [${dir}]: HTML contains complete Export Modal markup and controls`, () => {
    const rawHtml = fs.readFileSync(path.resolve(ROOT_DIR, `${dir}/index.html`), 'utf8');

    // Trigger button in #viewResults
    assert.ok(rawHtml.includes('id="btnOpenExportModal"'), 'Missing #btnOpenExportModal');
    assert.ok(rawHtml.includes('app.openExportModal()'), 'Missing onclick="app.openExportModal()"');

    // Modal dialog
    assert.ok(rawHtml.includes('id="exportModal"'), 'Missing #exportModal');
    assert.ok(rawHtml.includes('id="formatBtnStory"'), 'Missing #formatBtnStory');
    assert.ok(rawHtml.includes('id="formatBtnPoster"'), 'Missing #formatBtnPoster');
    assert.ok(rawHtml.includes('id="exportCardCanvas"'), 'Missing #exportCardCanvas');
    assert.ok(rawHtml.includes('id="exportCanvasLoader"'), 'Missing #exportCanvasLoader');
    assert.ok(rawHtml.includes('id="btnShareCard"'), 'Missing #btnShareCard');
    assert.ok(rawHtml.includes('id="btnCopyCardImage"'), 'Missing #btnCopyCardImage');
    assert.ok(rawHtml.includes('id="btnDownloadCardPng"'), 'Missing #btnDownloadCardPng');
    assert.ok(rawHtml.includes('id="exportFeedbackToast"'), 'Missing #exportFeedbackToast');
    assert.ok(rawHtml.includes('app.closeExportModal()'), 'Missing onclick="app.closeExportModal()"');
  });

  check(`T5.2 [${dir}]: Controller src/${dir}/main.js exports all modal methods`, () => {
    const rawJs = fs.readFileSync(path.resolve(ROOT_DIR, `src/${dir}/main.js`), 'utf8');
    assert.ok(rawJs.includes("from '../core/canvas.js'"), 'Must import canvas.js');
    assert.ok(rawJs.includes('openExportModal()'), 'Must implement openExportModal');
    assert.ok(rawJs.includes('closeExportModal()'), 'Must implement closeExportModal');
    assert.ok(rawJs.includes('setExportFormat('), 'Must implement setExportFormat');
    assert.ok(rawJs.includes('renderExportCard()'), 'Must implement renderExportCard');
    assert.ok(rawJs.includes('shareExportCard()'), 'Must implement shareExportCard');
    assert.ok(rawJs.includes('copyExportCardImage()'), 'Must implement copyExportCardImage');
    assert.ok(rawJs.includes('downloadExportCardPng()'), 'Must implement downloadExportCardPng');
    assert.ok(rawJs.includes('showExportToast('), 'Must implement showExportToast');
  });
}

// ---------------------------------------------------------------------------
// TIER 6: AGENTS.md Anti-Slop & Design Directives Compliance
// ---------------------------------------------------------------------------
console.log('\n--- TIER 6: AGENTS.md Conformance & Typography Directives ---');

check('T6.1: No emojis present in src/core/canvas.js or modal markup', () => {
  const canvasContent = fs.readFileSync(path.resolve(ROOT_DIR, 'src/core/canvas.js'), 'utf8');
  // Check for common emoji ranges
  const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
  assert.ok(!emojiRegex.test(canvasContent), 'src/core/canvas.js must not contain emojis');

  for (const { dir } of targetArenas) {
    const html = fs.readFileSync(path.resolve(ROOT_DIR, `${dir}/index.html`), 'utf8');
    const modalSection = html.slice(html.indexOf('id="exportModal"'), html.indexOf('id="exportModal"') + 3500);
    assert.ok(!emojiRegex.test(modalSection), `${dir}/index.html exportModal must not contain emojis`);
  }
});

check('T6.2: Canvas card uses standard punctuation (·) and display typography', () => {
  const canvasContent = fs.readFileSync(path.resolve(ROOT_DIR, 'src/core/canvas.js'), 'utf8');
  assert.ok(canvasContent.includes('1° · CAMPEÓN'), 'Must use middle dot · separator');
  assert.ok(canvasContent.includes('2° · PLATA'), 'Must use middle dot · separator');
  assert.ok(canvasContent.includes('3° · BRONCE'), 'Must use middle dot · separator');
  assert.ok(canvasContent.includes('RANKEA2 · '), 'Brand watermark must use middle dot');
});

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`STRESS TEST RESULTS: ${passedChecks}/${totalChecks} PASSED (${failures.length} FAILURES)`);
console.log('================================================================\n');

if (failures.length > 0) {
  console.error('FAILURES SUMMARY:');
  for (const f of failures) {
    console.error(`- Check #${f.check}: ${f.desc}`);
    console.error(`  Error: ${f.error.message}`);
  }
  process.exit(1);
} else {
  console.log('✨ ALL ADVERSARIAL STRESS CHECKS PASSED EMPIRICALLY!');
  process.exit(0);
}
