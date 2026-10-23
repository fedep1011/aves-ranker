import {
  createSeededRng,
  buildChallengeUrl,
  parseChallengeUrl,
  interleavedBisectSortAsync
} from '../core/tournament.js';
import { bindThemeButton } from '../core/theme.js';
import { renderRankingCard, exportRankingCard } from '../core/canvas.js';

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
    limit: 16,
    exportFormat: 'story'
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
    if (typeof Image === 'undefined') return;
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

    this.state.candidatePool = [...pool];
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
    const seed = this.state.battleSeed || 1337;
    try {
      const sorted = await interleavedBisectSortAsync(
        this.state.candidatePool,
        (left, right) => this.askUserPreference(left, right),
        seed
      );
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
    return interleavedBisectSortAsync(arr, (left, right) => this.askUserPreference(left, right), seed);
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
    const imgLBg = document.getElementById('imgLeftBg');
    if (imgLBg) imgLBg.src = leftItem.photo;
    document.getElementById('nameLeft').textContent = leftItem.name;
    document.getElementById('sciLeft').textContent = leftItem.sci_name;
    document.getElementById('tagLeft').textContent = `${leftItem.family} · ${leftItem.region}`;

    const imgR = document.getElementById('imgRight');
    imgR.alt = rightItem.name;
    imgR.src = rightItem.photo;
    const imgRBg = document.getElementById('imgRightBg');
    if (imgRBg) imgRBg.src = rightItem.photo;
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
          <div class="relative h-28 sm:h-32 w-full rounded-xl overflow-hidden bg-stone-800 shadow-xs flex items-center justify-center">
            <img src="${runnerUp.photo}" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-xl opacity-65 brightness-75 pointer-events-none" />
            <img src="${runnerUp.photo}" alt="${runnerUp.name}" class="relative z-10 w-full h-full object-contain object-center" />
          </div>
          <h4 class="font-flora italic font-semibold text-2xl text-ink mt-2">${runnerUp.name}</h4>
          <span class="text-xs italic text-muted">${runnerUp.sci_name}</span>
        </div>

        <!-- 1ST PLACE -->
        <div class="p-5 sm:p-6 rounded-3xl border-2 border-emerald-700 bg-surface flex flex-col items-center text-center order-1 sm:order-2 relative shadow-md">
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1 shadow-sm">
            Campeón
          </div>
          <div class="relative h-36 sm:h-44 w-full rounded-2xl overflow-hidden bg-stone-800 shadow-md mt-2 flex items-center justify-center">
            <img src="${winner.photo}" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-xl opacity-65 brightness-75 pointer-events-none" />
            <img src="${winner.photo}" alt="${winner.name}" class="relative z-10 w-full h-full object-contain object-center" />
          </div>
          <h4 class="font-flora italic font-semibold text-3xl text-ink mt-2">${winner.name}</h4>
          <span class="text-xs italic text-muted">${winner.sci_name} · ${winner.region}</span>
        </div>

        <!-- 3RD PLACE -->
        <div class="p-4 sm:p-5 rounded-2xl border border-line bg-surface flex flex-col items-center text-center order-3">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-700/10 text-emerald-800 dark:text-emerald-400 mb-2">3° Puesto</span>
          <div class="relative h-28 sm:h-32 w-full rounded-xl overflow-hidden bg-stone-800 shadow-xs flex items-center justify-center">
            <img src="${third.photo}" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-xl opacity-65 brightness-75 pointer-events-none" />
            <img src="${third.photo}" alt="${third.name}" class="relative z-10 w-full h-full object-contain object-center" />
          </div>
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
            <div class="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-800 shrink-0 flex items-center justify-center">
              <img src="${p.photo}" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-sm opacity-60 brightness-75 pointer-events-none" />
              <img src="${p.photo}" alt="${p.name}" class="relative z-10 w-full h-full object-contain object-center" />
            </div>
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
  },

  // ============================================================
  // EXPORT MODAL & CANVAS 2.0
  // ============================================================
  async openExportModal() {
    const modal = document.getElementById('exportModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    await this.renderExportCard();
  },

  closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.classList.add('hidden');
  },

  setExportFormat(fmt) {
    this.state.exportFormat = fmt === 'poster' ? 'poster' : 'story';
    const btnS = document.getElementById('formatBtnStory');
    const btnP = document.getElementById('formatBtnPoster');

    if (btnS && btnP) {
      if (this.state.exportFormat === 'story') {
        btnS.className = 'py-2 px-3 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 text-xs font-semibold text-ink text-center transition';
        btnP.className = 'py-2 px-3 rounded-xl border border-line bg-canvas text-xs font-medium text-muted hover:text-ink text-center transition';
      } else {
        btnP.className = 'py-2 px-3 rounded-xl border-2 border-emerald-700 bg-emerald-700/10 text-xs font-semibold text-ink text-center transition';
        btnS.className = 'py-2 px-3 rounded-xl border border-line bg-canvas text-xs font-medium text-muted hover:text-ink text-center transition';
      }
    }

    this.renderExportCard();
  },

  async renderExportCard() {
    const canvas = document.getElementById('exportCardCanvas');
    const loader = document.getElementById('exportCanvasLoader');
    if (!canvas || !this.state.finalRanking || this.state.finalRanking.length === 0) return;

    if (loader) loader.classList.remove('hidden');
    canvas.classList.add('opacity-40');

    try {
      const winner = this.state.finalRanking[0];
      const top3 = this.state.finalRanking.slice(0, 3);
      await renderRankingCard({
        arena: 'flores',
        winner,
        top3,
        format: this.state.exportFormat || 'story',
        options: {
          canvas,
          ranking: this.state.finalRanking
        }
      });
    } catch (err) {
      console.error('Error renderizando tarjeta visual:', err);
    } finally {
      if (loader) loader.classList.add('hidden');
      canvas.classList.remove('opacity-40');
    }
  },

  async shareExportCard() {
    const canvas = document.getElementById('exportCardCanvas');
    if (!canvas) return;
    const suffix = this.state.exportFormat === 'poster' ? 'poster' : 'historia';
    const result = await exportRankingCard({
      canvas,
      filename: `rankea2-flores-${suffix}.png`,
      title: 'Rankea2 · Mi Ranking Botánico',
      text: '¡Mirá el podio botánico que armé en Rankea2!'
    });

    if (result.copied) {
      this.showExportToast('¡Tarjeta copiada al portapapeles!');
    } else if (result.downloaded) {
      this.showExportToast('¡Tarjeta descargada como PNG!');
    }
  },

  async copyExportCardImage() {
    const canvas = document.getElementById('exportCardCanvas');
    if (!canvas) return;
    const suffix = this.state.exportFormat === 'poster' ? 'poster' : 'historia';
    const result = await exportRankingCard({
      canvas,
      filename: `rankea2-flores-${suffix}.png`,
      action: 'copy'
    });
    if (result.copied) {
      this.showExportToast('¡Tarjeta copiada al portapapeles!');
    } else {
      this.showExportToast('No se pudo copiar directo. Guardando PNG...');
    }
  },

  async downloadExportCardPng() {
    const canvas = document.getElementById('exportCardCanvas');
    if (!canvas) return;
    const suffix = this.state.exportFormat === 'poster' ? 'poster' : 'historia';
    await exportRankingCard({
      canvas,
      filename: `rankea2-flores-${suffix}.png`,
      action: 'download'
    });
    this.showExportToast('¡Tarjeta descargada como PNG!');
  },

  showExportToast(msg) {
    const toast = document.getElementById('exportFeedbackToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }
};

if (typeof window !== 'undefined') {
  window.app = app;
  window.addEventListener('DOMContentLoaded', () => app.init());
}
export default app;
