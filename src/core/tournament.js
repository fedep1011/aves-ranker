/**
 * Rankea2 Core Tournament Engine
 * Reusable across any category (Aves, Pokémon, Flores, Mamíferos, etc.)
 */

/**
 * Converts any seed (number, 8-character alphanumeric string, etc.) into an unsigned 32-bit integer.
 */
export function parseSeed(seed) {
  if (typeof seed === 'number') return (seed >>> 0) || 1;
  if (!seed || typeof seed !== 'string') return 1;
  if (/^\d+$/.test(seed)) return (parseInt(seed, 10) >>> 0) || 1;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) || 1;
}

/**
 * Generates a clean 8-character alphanumeric lowercase seed (e.g. "k8f3m9zq").
 * Optional prefix allows encoding mode (e.g. 'r' for random/chaos, 'p' for popular).
 */
export function generateSeed(prefix = '') {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let s = String(prefix || '');
  while (s.length < 8) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s.slice(0, 8);
}

export function createSeededRng(seed) {
  let s = parseSeed(seed);
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fisherYatesShuffle(arr, rng) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function estimateTotalSteps(n) {
  if (n <= 1) return 0;
  return Math.round(n * Math.log2(n) * 0.82);
}

/**
 * Samples a tournament pool of size N from a list of candidates:
 * - 'popular': sorts by custom comparator/score or preserves existing canonical order,
 *              takes the top N, then shuffles them so the initial bracket is unbiased.
 * - 'random': applies a double Fisher-Yates shuffle across the entire pool before slicing N,
 *             guaranteeing unexpected and rare candidates enter the tournament.
 */
export function sampleCandidates(pool, n, mode = 'popular', { rng = Math.random, compareFn } = {}) {
  const limit = Math.min(pool.length, n);
  if (pool.length <= limit) {
    return fisherYatesShuffle(pool, rng);
  }

  if (mode === 'popular') {
    let sorted = [...pool];
    if (typeof compareFn === 'function') {
      sorted.sort(compareFn);
    }
    const topN = sorted.slice(0, limit);
    return fisherYatesShuffle(topN, rng);
  }

  // mode === 'random' (Surprise / Random)
  // Double Fisher-Yates across the entire pool before slicing N
  const pass1 = fisherYatesShuffle(pool, rng);
  const pass2 = fisherYatesShuffle(pass1, rng);
  return pass2.slice(0, limit);
}

/**
 * Interleaved Midpoint-Bisect Tournament Sort:
 * Runs bottom-up tournament rounds so all sub-brackets advance in parallel.
 * Deterministic with seeded RNG, and supports Undo by replaying decisions.
 */
export async function interleavedBisectSortAsync(arr, askUserPreference, seed = 1) {
  if (arr.length <= 1) return arr;
  const rng = createSeededRng(seed);
  let runs = arr.map((item) => [item]);
  let lastPairIds = new Set();

  const createBisectNode = (A, B) => {
    if (A.length === 0) return { done: true, result: B };
    if (B.length === 0) return { done: true, result: A };
    return {
      done: false,
      A,
      B,
      midB: Math.floor(B.length / 2),
      low: 0,
      high: A.length,
      leftChild: null,
      rightChild: null,
      result: null
    };
  };

  const collectReadyLeaves = (node, out) => {
    if (!node || node.done) return;
    if (node.leftChild || node.rightChild) {
      collectReadyLeaves(node.leftChild, out);
      collectReadyLeaves(node.rightChild, out);
    } else if (node.low < node.high) {
      out.push(node);
    }
  };

  const refreshNode = (node) => {
    if (!node || node.done) return;
    if (node.leftChild || node.rightChild) {
      refreshNode(node.leftChild);
      refreshNode(node.rightChild);
      if (node.leftChild.done && node.rightChild.done) {
        const bItem = node.B[node.midB];
        node.result = [
          ...node.leftChild.result,
          bItem,
          ...node.rightChild.result
        ];
        node.done = true;
      }
      return;
    }
    if (node.low >= node.high) {
      const splitPos = node.low;
      const bLeft = node.B.slice(0, node.midB);
      const bRight = node.B.slice(node.midB + 1);
      const aLeft = node.A.slice(0, splitPos);
      const aRight = node.A.slice(splitPos);

      node.leftChild = createBisectNode(aLeft, bLeft);
      node.rightChild = createBisectNode(aRight, bRight);
      refreshNode(node);
    }
  };

  while (runs.length > 1) {
    const roots = [];
    const carry = [];
    for (let i = 0; i < runs.length; i += 2) {
      if (i + 1 < runs.length) {
        const flipRunOrder = rng() < 0.5;
        const firstRun = flipRunOrder ? runs[i + 1] : runs[i];
        const secondRun = flipRunOrder ? runs[i] : runs[i + 1];
        const root = createBisectNode(firstRun, secondRun);
        refreshNode(root);
        roots.push(root);
      } else {
        carry.push(runs[i]);
      }
    }

    while (true) {
      const readyLeaves = [];
      for (const r of roots) {
        refreshNode(r);
        collectReadyLeaves(r, readyLeaves);
      }
      if (readyLeaves.length === 0) break;

      let bestCandidates = [];
      let bestOverlap = Infinity;
      for (const leaf of readyLeaves) {
        const midA = Math.floor((leaf.low + leaf.high) / 2);
        const itemA = leaf.A[midA];
        const itemB = leaf.B[leaf.midB];
        const overlap = (lastPairIds.has(itemA.id) ? 1 : 0) + (lastPairIds.has(itemB.id) ? 1 : 0);
        if (overlap < bestOverlap) {
          bestOverlap = overlap;
          bestCandidates = [leaf];
        } else if (overlap === bestOverlap) {
          bestCandidates.push(leaf);
        }
      }

      const chosenLeaf = bestCandidates[Math.floor(rng() * bestCandidates.length)];
      const midA = Math.floor((chosenLeaf.low + chosenLeaf.high) / 2);
      const itemA = chosenLeaf.A[midA];
      const itemB = chosenLeaf.B[chosenLeaf.midB];

      const swapSides = rng() < 0.5;
      const leftItem = swapSides ? itemB : itemA;
      const rightItem = swapSides ? itemA : itemB;

      const pick = await askUserPreference(leftItem, rightItem);
      const bBeatsA = swapSides ? (pick === "left") : (pick === "right");

      lastPairIds = new Set([itemA.id, itemB.id]);

      if (bBeatsA) {
        chosenLeaf.high = midA;
      } else {
        chosenLeaf.low = midA + 1;
      }

      refreshNode(chosenLeaf);
    }

    runs = roots.map((r) => r.result).concat(carry);
  }

  return runs[0] || [];
}

/**
 * Encodes a challenge payload into an ultra-compact, URL-safe alphanumeric string (CID).
 * Numbers are converted to Base36 to minimize length.
 */
export function encodeCID({ ids = [], category = '', author = '', seed = null, lang = 'es' } = {}) {
  const idStr = ids.map(id => {
    const s = String(id).trim();
    return /^\d+$/.test(s) ? Number(s).toString(36) : `_${encodeURIComponent(s)}`;
  }).join('.');

  const parts = [
    idStr,
    encodeURIComponent(category || ''),
    encodeURIComponent(author || ''),
    (seed !== null && seed !== undefined && seed !== '') ? Number(seed).toString(36) : '',
    lang === 'en' ? 'en' : ''
  ];
  while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
  return parts.join('~');
}

/**
 * Decodes a compact CID string back into the canonical challenge object.
 */
export function decodeCID(cid) {
  if (!cid || typeof cid !== 'string') return null;
  const parts = cid.split('~');
  if (!parts[0]) return null;

  const ids = parts[0].split('.').map(chunk => {
    if (chunk.startsWith('_')) {
      return decodeURIComponent(chunk.slice(1));
    }
    const n = parseInt(chunk, 36);
    return isNaN(n) ? chunk : String(n);
  }).filter(Boolean);

  if (ids.length < 2) return null;

  return {
    ids,
    category: parts[1] ? decodeURIComponent(parts[1]) : '',
    author: parts[2] ? decodeURIComponent(parts[2]) : '',
    seed: parts[3] ? (parseInt(parts[3], 36) || parts[3]) : null,
    lang: parts[4] || 'es'
  };
}

/**
 * Generates an ultra-concise, clean 8-character alphanumeric seed challenge URL (?s=k8f3m9zq).
 */
export function buildSeedChallengeUrl(optionsOrSeed = {}) {
  let baseUrl = (typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  let seed = '';

  if (typeof optionsOrSeed === 'string' || typeof optionsOrSeed === 'number') {
    seed = String(optionsOrSeed);
  } else if (typeof optionsOrSeed === 'object' && optionsOrSeed !== null) {
    baseUrl = optionsOrSeed.baseUrl || baseUrl;
    seed = optionsOrSeed.seed || generateSeed();
  } else {
    seed = generateSeed();
  }

  const url = new URL(baseUrl);
  url.search = '';
  url.searchParams.set('s', String(seed));
  return url.toString();
}

/**
 * Generates an ultra-compact challenge URL using the ?cid= parameter.
 */
export function buildCompactChallengeUrl(optionsOrIds = {}, maybeCategory = '', maybeAuthor = '', maybeSeed = null) {
  let baseUrl = (typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  let ids = [];
  let category = '';
  let author = '';
  let lang = 'es';
  let seed = null;

  if (Array.isArray(optionsOrIds)) {
    ids = optionsOrIds;
    category = maybeCategory || '';
    author = maybeAuthor || '';
    seed = maybeSeed;
  } else if (typeof optionsOrIds === 'object' && optionsOrIds !== null) {
    baseUrl = optionsOrIds.baseUrl || baseUrl;
    ids = optionsOrIds.ids || [];
    category = optionsOrIds.category || '';
    author = optionsOrIds.author || '';
    lang = optionsOrIds.lang || 'es';
    seed = optionsOrIds.seed !== undefined ? optionsOrIds.seed : null;
  }

  const url = new URL(baseUrl);
  url.search = '';
  const cid = encodeCID({ ids, category, author, seed, lang });
  url.searchParams.set('cid', cid);
  return url.toString();
}

export function buildChallengeUrl(optionsOrIds = {}, maybeCategory = '', maybeAuthor = '', maybeSeed = null) {
  let baseUrl = (typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  let ids = [];
  let category = '';
  let author = '';
  let lang = 'es';
  let seed = null;

  if (Array.isArray(optionsOrIds)) {
    ids = optionsOrIds;
    category = maybeCategory || '';
    author = maybeAuthor || '';
    seed = maybeSeed;
  } else if (typeof optionsOrIds === 'object' && optionsOrIds !== null) {
    baseUrl = optionsOrIds.baseUrl || baseUrl;
    ids = optionsOrIds.ids || [];
    category = optionsOrIds.category || '';
    author = optionsOrIds.author || '';
    lang = optionsOrIds.lang || 'es';
    seed = optionsOrIds.seed !== undefined ? optionsOrIds.seed : null;
  }

  const url = new URL(baseUrl);
  url.searchParams.set('r', ids.join('.'));
  if (category) url.searchParams.set('c', category);
  if (author) url.searchParams.set('a', author);
  if (lang) url.searchParams.set('l', lang);
  if (seed !== null && seed !== undefined && seed !== '') url.searchParams.set('s', String(seed));
  return url.toString();
}

export function parseChallengeUrl(search = (typeof window !== 'undefined' ? window.location.search : '')) {
  if (!search) return null;
  const params = new URLSearchParams(search);

  const rawIds = params.get('r');
  const cid = params.get('cid');
  const seedParam = params.get('s') || params.get('seed');

  // 1. Try compact CID format first
  if (cid) {
    const decoded = decodeCID(cid);
    if (decoded && decoded.ids && decoded.ids.length >= 2) {
      if (params.get('c')) decoded.category = params.get('c');
      if (params.get('a')) decoded.author = params.get('a');
      if (params.get('l')) decoded.lang = params.get('l');
      if (seedParam && !seedParam.includes('.')) decoded.seed = seedParam;
      return decoded;
    }
  }

  // 2. Explicit ID list via ?r= or ?s= with dots (e.g. ?r=5020.4981.144455 or ?s=5020.4981.144455)
  const candidateIdsStr = rawIds || (seedParam && seedParam.includes('.') ? seedParam : null);
  if (candidateIdsStr) {
    const ids = candidateIdsStr.split('.').map(s => s.trim()).filter(Boolean);
    if (ids.length >= 2) {
      return {
        ids,
        category: params.get('c') || '',
        author: params.get('a') || '',
        lang: params.get('l') || 'es',
        seed: (seedParam && !seedParam.includes('.')) ? seedParam : null
      };
    }
  }

  // 3. Direct seed challenge (?s=... or ?seed=...) without custom item lists
  if (seedParam) {
    return {
      seed: seedParam,
      category: params.get('c') || '',
      author: params.get('a') || '',
      lang: params.get('l') || 'es',
      ids: null
    };
  }

  return null;
}

/**
 * Preloads a single image and waits for decode.
 * Resolves safely on error or timeout so it never blocks gameplay.
 */
export function preloadImage(url, timeoutMs = 800) {
  if (!url || typeof window === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (res) => {
      if (settled) return;
      settled = true;
      resolve(res);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      finish(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    img.src = url;
  });
}

/**
 * Preloads both images in a duel pair simultaneously.
 * Resolves only when BOTH images have loaded or timed out.
 */
export function preloadImagePair(urlA, urlB, timeoutMs = 800) {
  return Promise.all([
    preloadImage(urlA, timeoutMs),
    preloadImage(urlB, timeoutMs)
  ]);
}

/**
 * Preloads the entire tournament candidate pool in progressive background batches
 * so upcoming duels are already in memory before the player reaches them.
 */
export function preloadCandidatePool(candidates, getUrlFn, batchSize = 4) {
  if (!Array.isArray(candidates) || candidates.length === 0 || typeof window === 'undefined') return;
  const extractUrl = getUrlFn || ((it) => it?.photo || it?.imagen || it?.sprite);
  const urls = candidates.map(extractUrl).filter(Boolean);

  let cursor = 0;
  function processBatch() {
    if (cursor >= urls.length) return;
    const batch = urls.slice(cursor, cursor + batchSize);
    cursor += batchSize;
    Promise.all(batch.map(u => preloadImage(u, 3500))).then(() => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(processBatch, { timeout: 600 });
      } else {
        setTimeout(processBatch, 80);
      }
    });
  }
  processBatch();
}

/**
 * Executes a dynamic duel transition with physical "push & clash" momentum:
 * - On Desktop/PC (horizontal columns): winning card pushes opponent sideways off-screen,
 *   and the incoming contenders slide inward from opposite horizontal edges.
 * - On Mobile (stacked vertical cards): winning card pushes opponent vertically off-screen,
 *   and the incoming contenders slide inward from top/bottom.
 */
export async function animateDuelTransition(container, updateDomFn, [urlA, urlB] = [], winnerSide = null) {
  if (!container || typeof window === 'undefined') {
    if (typeof updateDomFn === 'function') updateDomFn();
    return;
  }

  const cardLeft = document.getElementById('cardLeftBtn');
  const cardRight = document.getElementById('cardRightBtn');

  // Primer duelo: sin ganador previo. Renderizar inmediatamente sin latencia ni esperas.
  if (!winnerSide) {
    if (typeof updateDomFn === 'function') updateDomFn();
    if (cardLeft && cardRight) {
      cardLeft.style.opacity = '1';
      cardRight.style.opacity = '1';
      cardLeft.style.transform = '';
      cardRight.style.transform = '';
      cardLeft.style.boxShadow = '';
      cardRight.style.boxShadow = '';
    }
    return;
  }

  if (cardLeft && cardRight) {
    // Detect layout orientation (PC horizontal vs Mobile vertical stack)
    const rectL = cardLeft.getBoundingClientRect();
    const rectR = cardRight.getBoundingClientRect();
    const isVertical = Math.abs(rectR.top - rectL.top) > 50;

    // FASE 1: Push & Knockout exit (220ms)
    cardLeft.style.transition = 'transform 220ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease-out, box-shadow 220ms ease-out';
    cardRight.style.transition = 'transform 220ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease-out, box-shadow 220ms ease-out';

    if (isVertical) {
      // Mobile: Vertical axis (stacked cards)
      if (winnerSide === 'left') {
        cardLeft.style.zIndex = '30';
        cardLeft.style.transform = 'translateY(36px) scale(1.035)';
        cardLeft.style.boxShadow = '0 16px 28px -6px rgba(0,0,0,0.3)';
        cardRight.style.zIndex = '1';
        cardRight.style.transform = 'translateY(80px) scale(0.90)';
        cardRight.style.opacity = '0';
      } else if (winnerSide === 'right') {
        cardRight.style.zIndex = '30';
        cardRight.style.transform = 'translateY(-36px) scale(1.035)';
        cardRight.style.boxShadow = '0 16px 28px -6px rgba(0,0,0,0.3)';
        cardLeft.style.zIndex = '1';
        cardLeft.style.transform = 'translateY(-80px) scale(0.90)';
        cardLeft.style.opacity = '0';
      } else {
        cardLeft.style.transform = 'translateY(-28px) scale(0.95)';
        cardLeft.style.opacity = '0';
        cardRight.style.transform = 'translateY(28px) scale(0.95)';
        cardRight.style.opacity = '0';
      }
    } else {
      // Desktop / PC: Horizontal axis (side-by-side cards)
      if (winnerSide === 'left') {
        cardLeft.style.zIndex = '30';
        cardLeft.style.transform = 'translateX(45px) scale(1.04) rotate(1.2deg)';
        cardLeft.style.boxShadow = '0 20px 32px -8px rgba(0,0,0,0.35)';
        cardRight.style.zIndex = '1';
        cardRight.style.transform = 'translateX(95px) scale(0.90) rotate(3deg)';
        cardRight.style.opacity = '0';
      } else if (winnerSide === 'right') {
        cardRight.style.zIndex = '30';
        cardRight.style.transform = 'translateX(-45px) scale(1.04) rotate(-1.2deg)';
        cardRight.style.boxShadow = '0 20px 32px -8px rgba(0,0,0,0.35)';
        cardLeft.style.zIndex = '1';
        cardLeft.style.transform = 'translateX(-95px) scale(0.90) rotate(-3deg)';
        cardLeft.style.opacity = '0';
      } else {
        cardLeft.style.transform = 'translateX(-32px) scale(0.95)';
        cardLeft.style.opacity = '0';
        cardRight.style.transform = 'translateX(32px) scale(0.95)';
        cardRight.style.opacity = '0';
      }
    }

    // Await push completion and snappy background preloads
    const pushWait = new Promise(r => setTimeout(r, 220));
    const preloadWait = (urlA && urlB) ? preloadImagePair(urlA, urlB, 300) : Promise.resolve();
    await Promise.all([pushWait, preloadWait]);

    // FASE 2: Position outside bounds without visible jump
    cardLeft.style.transition = 'none';
    cardRight.style.transition = 'none';
    cardLeft.style.opacity = '0';
    cardRight.style.opacity = '0';
    cardLeft.style.boxShadow = '';
    cardRight.style.boxShadow = '';

    if (isVertical) {
      cardLeft.style.transform = 'translateY(-48px) scale(0.96)';
      cardRight.style.transform = 'translateY(48px) scale(0.96)';
    } else {
      cardLeft.style.transform = 'translateX(-60px) scale(0.96)';
      cardRight.style.transform = 'translateX(60px) scale(0.96)';
    }

    // Mutate DOM
    if (typeof updateDomFn === 'function') {
      updateDomFn();
    }

    // Force frame layout
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // FASE 3: Converging entrance into center with smooth elastic settling
    cardLeft.style.zIndex = '1';
    cardRight.style.zIndex = '1';
    cardLeft.style.transition = 'transform 260ms cubic-bezier(0.18, 0.89, 0.32, 1.15), opacity 200ms ease-out';
    cardRight.style.transition = 'transform 260ms cubic-bezier(0.18, 0.89, 0.32, 1.15), opacity 200ms ease-out';
    cardLeft.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
    cardRight.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
    cardLeft.style.opacity = '1';
    cardRight.style.opacity = '1';

    // Cleanup inline styles after animation settles so native CSS hover states take over cleanly
    setTimeout(() => {
      cardLeft.style.transition = '';
      cardRight.style.transition = '';
      cardLeft.style.transform = '';
      cardRight.style.transform = '';
      cardLeft.style.zIndex = '';
      cardRight.style.zIndex = '';
    }, 280);
  } else {
    // Fallback if individual buttons are not present
    container.style.transition = 'opacity 110ms ease-out, transform 110ms ease-out';
    container.style.opacity = '0';
    container.style.transform = 'scale(0.985)';
    const exitTimer = new Promise(r => setTimeout(r, 110));
    const preloadWait = (urlA && urlB) ? preloadImagePair(urlA, urlB, 1800) : Promise.resolve();
    await Promise.all([exitTimer, preloadWait]);
    if (typeof updateDomFn === 'function') updateDomFn();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    container.style.transition = 'opacity 170ms cubic-bezier(0.16, 1, 0.3, 1), transform 170ms cubic-bezier(0.16, 1, 0.3, 1)';
    container.style.opacity = '1';
    container.style.transform = 'scale(1)';
  }
}

