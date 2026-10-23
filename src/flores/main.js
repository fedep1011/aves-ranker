import {
  createSeededRng,
  buildChallengeUrl,
  parseChallengeUrl
} from '../core/tournament.js';
import { bindThemeButton } from '../core/theme.js';

const app = {
  state: {
    pool: [],
    candidatePool: [],
    initialBattlePool: [],
    currentLeft: null,
    currentRight: null,
    battleStep: 0,
    estimatedTotalSteps: 0,
    battleSeed: 1337,
    choiceHistory: [],
    replayDecisions: [],
    pendingResolver: null,
    finalRanking: [],
    imageCache: new Set(),
    limit: 16
  },

  async init() {
    bindThemeButton({
      buttonId: 'themeToggle',
      labelId: 'themeLabel',
      iconDarkId: 'themeIconDark',
      iconLightId: 'themeIconLight'
    });

    this.bindKeyboard();
    await this.loadDataset();
    this.checkIncomingChallenge();
  },

  async loadDataset() {
    try {
      const res = await fetch('/data/flores.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.state.pool = data;
      this.state.candidatePool = [...data];
    } catch (err) {
      console.error('Error cargando catálogo Flores:', err);
    }
  },

  checkIncomingChallenge() {
    const challenge = parseChallengeUrl();
    if (challenge && challenge.ids && challenge.ids.length >= 2) {
      const banner = document.getElementById('challengeBanner');
      if (banner) banner.classList.remove('hidden');
    }
  },

  dismissChallengeBanner() {
    document.getElementById('challengeBanner')?.classList.add('hidden');
  },

  acceptChallenge() {
    this.dismissChallengeBanner();
    const challenge = parseChallengeUrl();
    if (!challenge) return;
    const candidates = challenge.ids
      .map(rawId => this.state.pool.find(p => String(p.id) === String(rawId)))
      .filter(Boolean);
    if (candidates.length >= 2) {
      this.state.candidatePool = candidates;
      this.state.limit = candidates.length;
      this.startBattleGame(true);
    }
  },

  goToView(viewId) {
    const views = ['viewHome', 'viewBattle', 'viewResults'];
    views.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== viewId);
    });
    const btnHome = document.getElementById('btnHeaderHome');
    if (btnHome) btnHome.classList.toggle('hidden', viewId === 'viewHome');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  preloadPoolImages(pool) {
    pool.forEach(item => {
      if (item && item.photo && !this.state.imageCache.has(item.photo)) {
        const img = new Image();
        img.src = item.photo;
        this.state.imageCache.add(item.photo);
      }
    });
  },

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  createSeededRng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  async startBattleGame(fromChallenge = false) {
    if (this.state.candidatePool.length < 2) return;
    let pool = [...this.state.candidatePool];
    const n = Math.min(pool.length, this.state.limit);
    this.shuffle(pool);
    pool = pool.slice(0, n);

    this.state.initialBattlePool = [...pool];
    this.state.battleSeed = Math.floor(Math.random() * 2147483646) + 1;
    this.state.choiceHistory = [];
    this.state.replayDecisions = [];
    this.state.battleStep = 0;
    this.state.estimatedTotalSteps = Math.max(1, Math.round(pool.length * Math.log2(pool.length) * 0.82));

    const estWrap = document.getElementById('battleTotalEstWrap');
    if (estWrap) estWrap.textContent = `/~${this.state.estimatedTotalSteps}`;

    this.preloadPoolImages(pool);
    this.goToView('viewBattle');
    await this.runTournamentSortFromHistory();
  },

  async runTournamentSortFromHistory() {
    this.state.battleStep = 0;
    const poolCopy = [...(this.state.initialBattlePool || [])];
    const seed = this.state.battleSeed || 1337;
    try {
      const sorted = await this.interleavedBisectSortAsync(poolCopy, seed);
      this.state.finalRanking = sorted;
      await this.renderResultsView();
    } catch (_) {}
  },

  undoLastBattleChoice() {
    if (!this.state.choiceHistory || this.state.choiceHistory.length === 0 || !this.state.pendingResolver) return;
    const prev = this.state.pendingResolver;
    this.state.pendingResolver = null;
    prev.reject(new Error('UndoStep'));

    this.state.choiceHistory.pop();
    this.state.replayDecisions = [...this.state.choiceHistory];
    this.runTournamentSortFromHistory();
  },

  async interleavedBisectSortAsync(arr, seed = 1) {
    if (arr.length <= 1) return arr;
    const rng = this.createSeededRng(seed);
    let runs = arr.map(item => [item]);
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
          node.result = [...node.leftChild.result, bItem, ...node.rightChild.result];
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

        const pick = await this.askUserPreference(leftItem, rightItem);
        const bBeatsA = swapSides ? (pick === 'left') : (pick === 'right');

        lastPairIds = new Set([itemA.id, itemB.id]);

        if (bBeatsA) {
          chosenLeaf.high = midA;
        } else {
          chosenLeaf.low = midA + 1;
        }

        refreshNode(chosenLeaf);
      }

      runs = roots.map(r => r.result).concat(carry);
    }

    return runs[0] || [];
  },

  askUserPreference(leftItem, rightItem) {
    this.state.battleStep++;

    if (this.state.replayDecisions && this.state.replayDecisions.length > 0) {
      const recordedPick = this.state.replayDecisions.shift();
      return Promise.resolve(recordedPick);
    }

    this.state.currentLeft = leftItem;
    this.state.currentRight = rightItem;

    const done = this.state.battleStep - 1;
    const est = Math.max(this.state.battleStep, this.state.estimatedTotalSteps);
    const pct = Math.min(98, Math.round((done / est) * 100));

    document.getElementById('battleStepNum').textContent = this.state.battleStep;
    document.getElementById('battlePctText').textContent = `${pct}%`;
    document.getElementById('battleProgressBar').style.width = `${Math.max(4, pct)}%`;

    const undoBtn = document.getElementById('btnUndoBattleChoice');
    if (undoBtn) {
      const hasHistory = this.state.choiceHistory && this.state.choiceHistory.length > 0;
      undoBtn.classList.toggle('hidden', !hasHistory);
      undoBtn.classList.toggle('inline-flex', Boolean(hasHistory));
    }

    document.getElementById('loaderLeft')?.classList.remove('hidden');
    document.getElementById('loaderRight')?.classList.remove('hidden');

    const imgL = document.getElementById('imgLeft');
    imgL.alt = leftItem.name;
    imgL.src = leftItem.photo;
    document.getElementById('nameLeft').textContent = leftItem.name;
    document.getElementById('sciLeft').textContent = leftItem.sci_name;
    document.getElementById('tagLeft').textContent = `${leftItem.family} · ${leftItem.region}`;

    const imgR = document.getElementById('imgRight');
    imgR.alt = rightItem.name;
    imgR.src = rightItem.photo;
    document.getElementById('nameRight').textContent = rightItem.name;
    document.getElementById('sciRight').textContent = rightItem.sci_name;
    document.getElementById('tagRight').textContent = `${rightItem.family} · ${rightItem.region}`;

    if (imgL && imgL.complete) this.onBattleImgLoad('left');
    if (imgR && imgR.complete) this.onBattleImgLoad('right');

    return new Promise((resolve, reject) => {
      this.state.pendingResolver = { resolve, reject };
    });
  },

  onBattleImgLoad(side) {
    const loader = document.getElementById(side === 'left' ? 'loaderLeft' : 'loaderRight');
    if (loader) loader.classList.add('hidden');
  },

  chooseCandidate(side) {
    if (!this.state.pendingResolver) return;
    if (!this.state.choiceHistory) this.state.choiceHistory = [];
    this.state.choiceHistory.push(side);
    const r = this.state.pendingResolver.resolve;
    this.state.pendingResolver = null;
    r(side);
  },

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const onBattle = !document.getElementById('viewBattle')?.classList.contains('hidden');
      if (!onBattle || !this.state.pendingResolver) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.chooseCandidate('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.chooseCandidate('right');
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.undoLastBattleChoice();
      }
    });
  },

  async renderResultsView() {
    this.goToView('viewResults');
    const ranking = this.state.finalRanking;
    const winner = ranking[0];
    const runnerUp = ranking[1];
    const third = ranking[2];

    const podBox = document.getElementById('podiumContainer');
    if (podBox && winner) {
      podBox.innerHTML = `
        <!-- 2ND PLACE -->
        <div class="p-4 sm:p-5 rounded-2xl border border-line bg-surface flex flex-col items-center text-center order-2 sm:order-1">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mb-2">2° Puesto</span>
          <img src="${runnerUp.photo}" alt="${runnerUp.name}" class="h-28 sm:h-32 w-auto object-cover rounded-xl shadow-xs" />
          <h4 class="font-flora italic font-semibold text-2xl text-ink mt-2">${runnerUp.name}</h4>
          <span class="text-xs italic text-muted">${runnerUp.sci_name}</span>
        </div>

        <!-- 1ST PLACE -->
        <div class="p-5 sm:p-6 rounded-3xl border-2 border-emerald-700 bg-surface flex flex-col items-center text-center order-1 sm:order-2 relative shadow-md">
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1 shadow-sm">
            Campeón
          </div>
          <img src="${winner.photo}" alt="${winner.name}" class="h-36 sm:h-44 w-auto object-cover rounded-2xl shadow-md mt-2" />
          <h4 class="font-flora italic font-semibold text-3xl text-ink mt-2">${winner.name}</h4>
          <span class="text-xs italic text-muted">${winner.sci_name} · ${winner.region}</span>
        </div>

        <!-- 3RD PLACE -->
        <div class="p-4 sm:p-5 rounded-2xl border border-line bg-surface flex flex-col items-center text-center order-3">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-700/10 text-emerald-800 dark:text-emerald-400 mb-2">3° Puesto</span>
          <img src="${third.photo}" alt="${third.name}" class="h-28 sm:h-32 w-auto object-cover rounded-xl shadow-xs" />
          <h4 class="font-flora italic font-semibold text-2xl text-ink mt-2">${third.name}</h4>
          <span class="text-xs italic text-muted">${third.sci_name}</span>
        </div>
      `;
    }

    const restBox = document.getElementById('restRankingContainer');
    if (restBox) {
      const rest = ranking.slice(3);
      restBox.innerHTML = rest.map((p, idx) => `
        <div class="flex items-center justify-between p-3 sm:px-4 hover:bg-canvas/50 transition">
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs font-bold text-muted w-6">#${idx + 4}</span>
            <img src="${p.photo}" alt="${p.name}" class="w-10 h-10 object-cover rounded-lg" />
            <div>
              <span class="font-flora italic font-semibold text-base text-ink block">${p.name}</span>
              <span class="text-[11px] italic text-muted">${p.sci_name}</span>
            </div>
          </div>
          <span class="text-xs text-muted font-mono">${p.region}</span>
        </div>
      `).join('');
    }
  },

  async shareChallenge() {
    const pool = this.state.initialBattlePool;
    if (!pool || pool.length === 0) return;
    const ids = pool.map(p => p.id);
    const challengeUrl = buildChallengeUrl({
      baseUrl: window.location.origin + window.location.pathname,
      ids,
      category: 'flores'
    });

    try {
      await navigator.clipboard.writeText(challengeUrl);
      const label = document.getElementById('shareBtnLabel');
      if (label) {
        label.textContent = '¡Link copiado!';
        setTimeout(() => { label.textContent = 'Copiar link de desafío'; }, 2500);
      }
    } catch {
      prompt('Copia este link de desafío:', challengeUrl);
    }
  }
};

window.app = app;
window.addEventListener('DOMContentLoaded', () => app.init());
export default app;
