/**
 * Rankea2 Core Tournament Engine
 * Reusable across any category (Aves, Pokémon, Flores, Mamíferos, etc.)
 */

export function createSeededRng(seed) {
  let s = (seed >>> 0) || 1;
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

export function buildChallengeUrl({ baseUrl = window.location.href, ids = [], category = '', author = '', lang = 'es' }) {
  const url = new URL(baseUrl);
  url.searchParams.set('r', ids.join('.'));
  if (category) url.searchParams.set('c', category);
  if (author) url.searchParams.set('a', author);
  if (lang) url.searchParams.set('l', lang);
  return url.toString();
}

export function parseChallengeUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  const rawIds = params.get('r');
  if (!rawIds) return null;
  const ids = rawIds.split('.').map(s => s.trim()).filter(Boolean);
  if (ids.length < 2) return null;
  return {
    ids,
    category: params.get('c') || '',
    author: params.get('a') || '',
    lang: params.get('l') || 'es'
  };
}
