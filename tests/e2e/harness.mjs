/**
 * Rankea2 E2E Test Harness & Lightweight DOM Simulator
 * Zero external browser or npm dependencies - runs on native Node.js ESM.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '../../');

// ============================================================================
// 1. Color Luminance & WCAG 2.2 Contrast Calculator
// ============================================================================

export function parseHexColor(hex) {
  if (!hex || typeof hex !== 'string') return [0, 0, 0];
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return [0, 0, 0];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export function sRgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function calculateRelativeLuminance(rgb) {
  const [r, g, b] = rgb.map(sRgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateContrastRatio(hex1, hex2) {
  const lum1 = calculateRelativeLuminance(parseHexColor(hex1));
  const lum2 = calculateRelativeLuminance(parseHexColor(hex2));
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// 2. Lightweight Mock DOM Node & Element
// ============================================================================

export class MockClassList {
  constructor(node) {
    this.node = node;
  }
  _getTokens() {
    const raw = this.node.getAttribute('class') || '';
    return new Set(raw.trim().split(/\s+/).filter(Boolean));
  }
  _setTokens(set) {
    this.node.setAttribute('class', Array.from(set).join(' '));
  }
  add(...classes) {
    const tokens = this._getTokens();
    classes.forEach(c => tokens.add(c));
    this._setTokens(tokens);
  }
  remove(...classes) {
    const tokens = this._getTokens();
    classes.forEach(c => tokens.delete(c));
    this._setTokens(tokens);
  }
  toggle(className, force) {
    const tokens = this._getTokens();
    let result;
    if (force !== undefined) {
      if (force) tokens.add(className);
      else tokens.delete(className);
      result = force;
    } else {
      if (tokens.has(className)) {
        tokens.delete(className);
        result = false;
      } else {
        tokens.add(className);
        result = true;
      }
    }
    this._setTokens(tokens);
    return result;
  }
  contains(className) {
    return this._getTokens().has(className);
  }
}

export class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.listeners = new Map();
    this.classList = new MockClassList(this);
    this.style = {};
    this._value = '';
    this._textContent = '';
    this.complete = false;
    this.onload = null;
    this.onerror = null;
    this.disabled = false;
  }

  get id() {
    return this.getAttribute('id') || '';
  }
  set id(val) {
    this.setAttribute('id', val);
  }

  get className() {
    return this.getAttribute('class') || '';
  }
  set className(val) {
    this.setAttribute('class', val);
  }

  get src() {
    return this.getAttribute('src') || '';
  }
  set src(val) {
    this.setAttribute('src', val);
  }

  get alt() {
    return this.getAttribute('alt') || '';
  }
  set alt(val) {
    this.setAttribute('alt', val);
  }

  get href() {
    return this.getAttribute('href') || '';
  }
  set href(val) {
    this.setAttribute('href', val);
  }

  get value() {
    return this._value || this.getAttribute('value') || '';
  }
  set value(val) {
    this._value = String(val);
    this.setAttribute('value', String(val));
  }

  get min() {
    return this.getAttribute('min') || '';
  }
  set min(val) {
    this.setAttribute('min', String(val));
  }

  get max() {
    return this.getAttribute('max') || '';
  }
  set max(val) {
    this.setAttribute('max', String(val));
  }

  get textContent() {
    if (this.children.length === 0) return this._textContent;
    return this.children.map(c => c.textContent).join('');
  }
  set textContent(val) {
    this._textContent = String(val);
    this.children = [];
  }

  get innerHTML() {
    return this._textContent;
  }
  set innerHTML(htmlStr) {
    this._textContent = htmlStr;
    const parsed = parseFragment(htmlStr);
    this.children = parsed;
    parsed.forEach(c => (c.parentNode = this));
  }

  get dataset() {
    const data = {};
    for (const [k, v] of this.attributes.entries()) {
      if (k.startsWith('data-')) {
        const camel = k.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
        data[camel] = v;
      }
    }
    return data;
  }

  setAttribute(k, v) {
    const key = k.toLowerCase();
    this.attributes.set(key, String(v));
    if (key === 'value') this._value = String(v);
  }
  getAttribute(k) {
    return this.attributes.get(k.toLowerCase()) ?? null;
  }
  hasAttribute(k) {
    return this.attributes.has(k.toLowerCase());
  }
  removeAttribute(k) {
    this.attributes.delete(k.toLowerCase());
  }

  appendChild(child) {
    if (!child) return;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }

  dispatchEvent(event) {
    const list = this.listeners.get(event.type) || [];
    list.forEach(cb => {
      try { cb.call(this, event); } catch (e) { console.error(e); }
    });
    return true;
  }

  click() {
    const event = { type: 'click', target: this, preventDefault() {}, stopPropagation() {} };
    this.dispatchEvent(event);
  }

  querySelector(selector) {
    const res = this.querySelectorAll(selector);
    return res.length > 0 ? res[0] : null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);

    const matchSingle = (el, sel) => {
      // Bracket attribute selector: tag[attr="val"], tag[attr], [attr="val"], [attr]
      const bracketIdx = sel.indexOf('[');
      if (bracketIdx !== -1 && sel.endsWith(']')) {
        const tag = bracketIdx > 0 ? sel.slice(0, bracketIdx).toLowerCase() : '';
        if (tag && el.tagName.toLowerCase() !== tag) return false;

        const attrBody = sel.slice(bracketIdx + 1, -1);
        if (attrBody.includes('=')) {
          const eqIdx = attrBody.indexOf('=');
          const attr = attrBody.slice(0, eqIdx).trim().toLowerCase();
          const rawVal = attrBody.slice(eqIdx + 1).trim();
          const cleanVal = rawVal.replace(/^['"]|['"]$/g, '');
          return el.getAttribute(attr) === cleanVal;
        } else {
          return el.hasAttribute(attrBody.trim().toLowerCase());
        }
      }

      if (sel.startsWith('#')) {
        return el.id === sel.slice(1);
      }
      if (sel.startsWith('.')) {
        return el.classList.contains(sel.slice(1));
      }
      if (/^[a-zA-Z0-9_-]+$/.test(sel)) {
        return el.tagName.toLowerCase() === sel.toLowerCase();
      }
      // compound tag.class
      if (sel.includes('.')) {
        const [tag, ...classes] = sel.split('.');
        const tagMatch = !tag || el.tagName.toLowerCase() === tag.toLowerCase();
        const classMatch = classes.every(c => el.classList.contains(c));
        return tagMatch && classMatch;
      }
      return false;
    };

    const traverse = (node) => {
      for (const sel of selectors) {
        if (matchSingle(node, sel)) {
          matches.push(node);
          break;
        }
      }
      for (const child of node.children) {
        traverse(child);
      }
    };

    for (const child of this.children) {
      traverse(child);
    }
    return matches;
  }
}

// Minimal regex-based HTML fragment parser
function parseFragment(html) {
  const elements = [];
  const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9-]+)([^>]*?)\/?>/g;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const isPaired = Boolean(match[1]);
    const tagName = isPaired ? match[1] : match[4];
    const attrString = isPaired ? match[2] : match[5];
    const innerContent = isPaired ? match[3] : '';

    const el = new MockElement(tagName);
    if (attrString) {
      const attrRegex = /([a-zA-Z0-9_:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^>\s]+)))?/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrString)) !== null) {
        const k = attrMatch[1];
        const v = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
        el.setAttribute(k, v);
      }
    }
    if (innerContent) {
      el.innerHTML = innerContent;
    }
    elements.push(el);
  }
  return elements;
}

export class MockDocument {
  constructor(rootElement) {
    this.documentElement = rootElement || new MockElement('html');
    this.body = this.documentElement.querySelector('body') || this.documentElement.appendChild(new MockElement('body'));
  }

  getElementById(id) {
    const list = this.documentElement.querySelectorAll('#' + id);
    if (list.length > 0) return list[0];
    if (this.documentElement.id === id) return this.documentElement;
    return null;
  }

  querySelector(sel) {
    return this.documentElement.querySelector(sel);
  }

  querySelectorAll(sel) {
    return this.documentElement.querySelectorAll(sel);
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }
}

export function parseHtmlToDoc(htmlContent) {
  const root = new MockElement('html');
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const htmlTagMatch = htmlContent.match(/<html([^>]*)>/i);

  if (htmlTagMatch && htmlTagMatch[1]) {
    const attrRegex = /([a-zA-Z0-9_:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^>\s]+)))?/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(htmlTagMatch[1])) !== null) {
      root.setAttribute(attrMatch[1], attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '');
    }
  }

  const head = new MockElement('head');
  if (headMatch && headMatch[1]) head.innerHTML = headMatch[1];
  root.appendChild(head);

  const body = new MockElement('body');
  if (bodyMatch && bodyMatch[1]) body.innerHTML = bodyMatch[1];
  root.appendChild(body);

  return new MockDocument(root);
}

// ============================================================================
// 3. Mock Browser Environment (window, localStorage, fetch)
// ============================================================================

export function createMockBrowserEnv(pageRelPath) {
  const fullPath = path.resolve(ROOT_DIR, pageRelPath);
  const htmlContent = fs.readFileSync(fullPath, 'utf8');
  const document = parseHtmlToDoc(htmlContent);

  const storageStore = new Map();
  const localStorage = {
    getItem(k) { return storageStore.get(k) ?? null; },
    setItem(k, v) { storageStore.set(k, String(v)); },
    removeItem(k) { storageStore.delete(k); },
    clear() { storageStore.clear(); }
  };

  const windowListeners = new Map();
  class MockImage extends MockElement {
    constructor() {
      super('img');
    }
  }
  global.Image = MockImage;

  const window = {
    document,
    Image: MockImage,
    localStorage,
    location: {
      href: 'http://localhost:5173/' + pageRelPath.replace(/index\.html$/, ''),
      origin: 'http://localhost:5173',
      search: '',
      pathname: '/' + pageRelPath.replace(/index\.html$/, '')
    },
    addEventListener: (evt, fn) => {
      if (!windowListeners.has(evt)) windowListeners.set(evt, []);
      windowListeners.get(evt).push(fn);
    },
    removeEventListener: (evt, fn) => {
      const list = windowListeners.get(evt) || [];
      const idx = list.indexOf(fn);
      if (idx !== -1) list.splice(idx, 1);
    },
    dispatchEvent: (evt) => {
      const list = windowListeners.get(evt.type) || [];
      list.forEach(cb => { try { cb(evt); } catch(e) { console.error(e); } });
      return true;
    },
    matchMedia: (query) => ({
      matches: query.includes('dark'),
      addListener: () => {},
      removeListener: () => {}
    }),
    scrollTo: () => {},
    fetch: async (url) => {
      let clean = url.replace(/^\//, '');
      const filePath = path.resolve(ROOT_DIR, 'public', clean);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return {
          ok: true,
          status: 200,
          json: async () => JSON.parse(data),
          text: async () => data
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => { throw new Error('Not found'); },
        text: async () => 'Not found'
      };
    }
  };

  document.addEventListener = (evt, fn) => window.addEventListener(evt, fn);
  document.removeEventListener = (evt, fn) => window.removeEventListener(evt, fn);
  document.dispatchEvent = (evt) => window.dispatchEvent(evt);

  return { window, document, htmlContent };
}

// ============================================================================
// 4. Test Runner Harness: describe, it, metrics
// ============================================================================

export class TestHarness {
  constructor() {
    this.currentTier = '';
    this.currentSuite = '';
    this.tiers = new Map();
    this.queuedTests = [];
    this.totalTests = 0;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.failures = [];
    this.startTime = Date.now();
  }

  startTier(tierName, description) {
    this.currentTier = tierName;
    if (!this.tiers.has(tierName)) {
      this.tiers.set(tierName, {
        name: tierName,
        description,
        suites: [],
        passed: 0,
        failed: 0,
        tests: []
      });
    }
  }

  describe(suiteName, fn) {
    this.currentSuite = suiteName;
    const tier = this.tiers.get(this.currentTier);
    if (tier && !tier.suites.includes(suiteName)) {
      tier.suites.push(suiteName);
    }
    return fn();
  }

  it(testName, testFn) {
    this.queuedTests.push({
      tier: this.currentTier,
      suite: this.currentSuite,
      name: testName,
      fn: testFn
    });
  }

  async executeAll() {
    this.startTime = Date.now();
    for (const test of this.queuedTests) {
      this.totalTests++;
      const tier = this.tiers.get(test.tier) || {
        name: test.tier,
        tests: [],
        passed: 0,
        failed: 0
      };

      const start = performance.now();
      let passed = false;
      let error = null;

      try {
        await test.fn({
          assert,
          calculateContrastRatio,
          parseHexColor
        });
        passed = true;
        this.totalPassed++;
        tier.passed = (tier.passed || 0) + 1;
      } catch (err) {
        passed = false;
        error = err;
        this.totalFailed++;
        tier.failed = (tier.failed || 0) + 1;
        this.failures.push({
          tier: test.tier,
          suite: test.suite,
          test: test.name,
          error
        });
      }

      const duration = (performance.now() - start).toFixed(2);
      tier.tests.push({
        suite: test.suite,
        name: test.name,
        passed,
        duration,
        error
      });
    }
  }

  getSummary() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    return {
      total: this.totalTests,
      passed: this.totalPassed,
      failed: this.totalFailed,
      passRate: this.totalTests ? ((this.totalPassed / this.totalTests) * 100).toFixed(1) : 0,
      elapsed,
      tiers: Array.from(this.tiers.values()),
      failures: this.failures
    };
  }

  printReport() {
    const s = this.getSummary();
    console.log('\n' + '='.repeat(78));
    console.log('  RANKEA2 E2E TEST SUITE REPORT (4-TIER SPECIFICATION)');
    console.log('='.repeat(78));

    for (const t of s.tiers) {
      const tierTotal = (t.passed || 0) + (t.failed || 0);
      const tierRate = tierTotal ? (((t.passed || 0) / tierTotal) * 100).toFixed(1) : 0;
      console.log(`\n▶ [${t.name}] — ${t.description || ''}`);
      console.log(`  Tests: ${tierTotal} | Passed: ${t.passed} | Failed: ${t.failed} | Pass Rate: ${tierRate}%`);
      console.log('  ' + '-'.repeat(74));

      let currentSuite = '';
      for (const item of t.tests) {
        if (item.suite !== currentSuite) {
          currentSuite = item.suite;
          console.log(`   § ${currentSuite}:`);
        }
        const mark = item.passed ? '✓ PASS' : '✗ FAIL';
        console.log(`     ${mark} ${item.name} (${item.duration}ms)`);
        if (!item.passed && item.error) {
          console.log(`       Error: ${item.error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(78));
    console.log(`  AGGREGATE SUMMARY:`);
    console.log(`  Total Tests: ${s.total} | Passed: ${s.passed} | Failed: ${s.failed} | Duration: ${s.elapsed}s`);
    console.log(`  Overall Pass Rate: ${s.passRate}%`);
    console.log('='.repeat(78));

    if (s.failed > 0) {
      console.log(`\n⚠ FAILURES REQUIRING ATTENTION (${s.failed}):`);
      s.failures.forEach((f, idx) => {
        console.log(`  ${idx + 1}. [${f.tier}] ${f.suite} -> ${f.test}`);
        console.log(`     ${f.error.message}\n`);
      });
    } else {
      console.log('\n✨ ALL TEST TIERS PASSED WITH 100% SUCCESS RATE!\n');
    }
  }
}

export const harness = new TestHarness();
