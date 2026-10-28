import { initTheme, bindThemeButton } from '../core/theme.js';

// State
let allDilemmas = [];
let remainingIds = [];
let currentIndex = -1;
let currentDilemma = null;
let hasVoted = false;
let userVote = null; // 'A' | 'B'

// Session stats persisted in localStorage
const STATS_KEY = 'rankea2_prefieres_stats';
const defaultStats = {
  totalAnswered: 0,
  majorityVotes: 0,
  currentStreak: 0,
  bestStreak: 0,
  history: [] // { id, choice: 'A'|'B', wasMajority: boolean }
};

let stats = (() => {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...defaultStats, ...JSON.parse(raw) } : { ...defaultStats };
  } catch {
    return { ...defaultStats };
  }
})();

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save stats:', err);
  }
}

// Format numbers nicely (e.g. 2367 -> 2.367)
function formatNumber(num) {
  return new Intl.NumberFormat('es-AR').format(num);
}

// Capitalize sentence nicely
function cleanOptionText(str) {
  if (!str) return '';
  const trimmed = str.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// DOM Elements
const cardOptionA = document.getElementById('cardOptionA');
const cardOptionB = document.getElementById('cardOptionB');
const textOptionA = document.getElementById('textOptionA');
const textOptionB = document.getElementById('textOptionB');
const resultOptionA = document.getElementById('resultOptionA');
const resultOptionB = document.getElementById('resultOptionB');
const percentOptionA = document.getElementById('percentOptionA');
const percentOptionB = document.getElementById('percentOptionB');
const barOptionA = document.getElementById('barOptionA');
const barOptionB = document.getElementById('barOptionB');
const votesOptionA = document.getElementById('votesOptionA');
const votesOptionB = document.getElementById('votesOptionB');
const badgeOptionA = document.getElementById('badgeOptionA');
const badgeOptionB = document.getElementById('badgeOptionB');

const btnNext = document.getElementById('btnNext');
const btnShare = document.getElementById('btnShare');
const resultFeedback = document.getElementById('resultFeedback');
const feedbackTitle = document.getElementById('feedbackTitle');
const feedbackSubtitle = document.getElementById('feedbackSubtitle');
const feedbackIcon = document.getElementById('feedbackIcon');

const statCurrentStreak = document.getElementById('statCurrentStreak');
const statBestStreak = document.getElementById('statBestStreak');
const statTotalAnswered = document.getElementById('statTotalAnswered');
const statAffinity = document.getElementById('statAffinity');
const dilemmaCounter = document.getElementById('dilemmaCounter');
const shareToast = document.getElementById('shareToast');

function updateStatsUI() {
  if (statCurrentStreak) statCurrentStreak.textContent = stats.currentStreak;
  if (statBestStreak) statBestStreak.textContent = stats.bestStreak;
  if (statTotalAnswered) statTotalAnswered.textContent = stats.totalAnswered;
  if (statAffinity) {
    const affinity = stats.totalAnswered > 0
      ? Math.round((stats.majorityVotes / stats.totalAnswered) * 100)
      : 0;
    statAffinity.textContent = `${affinity}%`;
  }
}

function showToast(message) {
  if (!shareToast) return;
  shareToast.querySelector('#toastText').textContent = message;
  shareToast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
  shareToast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    shareToast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
    shareToast.classList.remove('opacity-100', 'translate-y-0');
  }, 2400);
}

function animateNumber(element, target, duration = 650) {
  const start = 0;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * ease);
    element.textContent = `${current}%`;
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = `${target}%`;
    }
  }
  requestAnimationFrame(update);
}

function loadDilemma(dilemma) {
  currentDilemma = dilemma;
  hasVoted = false;
  userVote = null;

  // Reset cards UI
  cardOptionA.classList.remove('ring-4', 'ring-indigo-500', 'border-indigo-500', 'scale-[1.01]', 'opacity-60', 'pointer-events-none');
  cardOptionB.classList.remove('ring-4', 'ring-pink-500', 'border-pink-500', 'scale-[1.01]', 'opacity-60', 'pointer-events-none');
  cardOptionA.removeAttribute('disabled');
  cardOptionB.removeAttribute('disabled');

  textOptionA.textContent = cleanOptionText(dilemma.opcionA);
  textOptionB.textContent = cleanOptionText(dilemma.opcionB);

  // Hide results
  resultOptionA.classList.add('hidden');
  resultOptionB.classList.add('hidden');
  barOptionA.style.width = '0%';
  barOptionB.style.width = '0%';
  percentOptionA.textContent = '0%';
  percentOptionB.textContent = '0%';
  badgeOptionA.classList.add('hidden');
  badgeOptionB.classList.add('hidden');

  // Hide feedback and Next button state
  resultFeedback.classList.add('hidden');
  btnNext.classList.add('opacity-60');
  btnNext.textContent = 'Saltar dilema →';

  // Update URL without reloading
  const url = new URL(window.location.href);
  url.searchParams.set('id', dilemma.id);
  window.history.replaceState({}, '', url.toString());

  if (dilemmaCounter) {
    dilemmaCounter.textContent = `#${dilemma.id}`;
  }
}

function buildBalancedQueue() {
  const competitive = [];
  const inclined = [];

  allDilemmas.forEach(d => {
    const diff = Math.abs((d.porcentajeA || 50) - (d.porcentajeB || 50));
    if (diff <= 40) {
      competitive.push(d.id);
    } else {
      inclined.push(d.id);
    }
  });

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  shuffle(competitive);
  shuffle(inclined);

  const queue = [];
  while (competitive.length > 0 || inclined.length > 0) {
    if (competitive.length > 0) queue.push(competitive.pop());
    if (competitive.length > 0 && Math.random() < 0.65) queue.push(competitive.pop());
    if (inclined.length > 0) queue.push(inclined.pop());
  }

  return queue;
}

function pickNextDilemma() {
  if (remainingIds.length === 0) {
    remainingIds = buildBalancedQueue();
  }
  const nextId = remainingIds.pop();
  const nextDilemma = allDilemmas.find(d => d.id === nextId) || allDilemmas[0];
  loadDilemma(nextDilemma);
}

function handleVote(choice) {
  if (hasVoted || !currentDilemma) return;
  hasVoted = true;
  userVote = choice;

  const pctA = currentDilemma.porcentajeA;
  const pctB = currentDilemma.porcentajeB;
  const isMajority = (choice === 'A' && pctA >= pctB) || (choice === 'B' && pctB >= pctA);

  // Update stats
  stats.totalAnswered += 1;
  if (isMajority) {
    stats.majorityVotes += 1;
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
  } else {
    stats.currentStreak = 0;
  }
  stats.history.push({
    id: currentDilemma.id,
    choice,
    wasMajority: isMajority,
    timestamp: Date.now()
  });
  saveStats();
  updateStatsUI();

  // Highlight chosen card
  if (choice === 'A') {
    cardOptionA.classList.add('ring-4', 'ring-indigo-500', 'border-indigo-500');
    badgeOptionA.classList.remove('hidden');
    badgeOptionA.textContent = 'Tu elección';
  } else {
    cardOptionB.classList.add('ring-4', 'ring-pink-500', 'border-pink-500');
    badgeOptionB.classList.remove('hidden');
    badgeOptionB.textContent = 'Tu elección';
  }

  // Show percentage bars and animate numbers
  resultOptionA.classList.remove('hidden');
  resultOptionB.classList.remove('hidden');

  requestAnimationFrame(() => {
    barOptionA.style.width = `${pctA}%`;
    barOptionB.style.width = `${pctB}%`;
    animateNumber(percentOptionA, pctA);
    animateNumber(percentOptionB, pctB);
  });

  // Calculate vote breakdown
  const totalVotes = currentDilemma.votosTotales || 2000;
  const votesA = Math.round((pctA / 100) * totalVotes);
  const votesB = Math.round((pctB / 100) * totalVotes);
  votesOptionA.textContent = `${formatNumber(votesA)} votos`;
  votesOptionB.textContent = `${formatNumber(votesB)} votos`;

  // Feedback banner
  resultFeedback.classList.remove('hidden');
  if (isMajority) {
    resultFeedback.className = 'hub-surface border border-emerald-500/30 bg-emerald-500/10 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition duration-300';
    feedbackTitle.className = 'text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400';
    feedbackTitle.textContent = pctA === pctB ? 'Empate perfecto (50 / 50)' : '¡Coincidís con la mayoría!';
    feedbackSubtitle.textContent = `Racha actual: ${stats.currentStreak} dilemas en sintonía popular · Sobre ${formatNumber(totalVotes)} votos.`;
    feedbackIcon.innerHTML = `<svg class="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
  } else {
    resultFeedback.className = 'hub-surface border border-purple-500/30 bg-purple-500/10 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition duration-300';
    feedbackTitle.className = 'text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400';
    feedbackTitle.textContent = 'Gusto atípico (Minoría)';
    feedbackSubtitle.textContent = `Elegiste la opción alternativa · La racha volvió a 0 · Sobre ${formatNumber(totalVotes)} votos.`;
    feedbackIcon.innerHTML = `<svg class="w-6 h-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
  }

  // Update Next button
  btnNext.classList.remove('opacity-60');
  btnNext.textContent = 'Siguiente dilema →';
  btnNext.focus();
}

function shareCurrentDilemma() {
  if (!currentDilemma) return;
  const url = `${window.location.origin}/que-prefieres/?id=${currentDilemma.id}`;
  const text = `¿Qué preferís? "${cleanOptionText(currentDilemma.opcionA)}" o "${cleanOptionText(currentDilemma.opcionB)}" — Votá y mirá el resultado: ${url}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Enlace copiado al portapapeles'))
      .catch(() => {
        fallbackSharePrompt(url);
      });
  } else {
    fallbackSharePrompt(url);
  }
}

function fallbackSharePrompt(url) {
  window.prompt('Copiá este enlace para compartir el dilema:', url);
}

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  // If user is focused on an input, ignore
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === '1' || e.key === 'ArrowLeft') {
    e.preventDefault();
    handleVote('A');
  } else if (e.key === '2' || e.key === 'ArrowRight') {
    e.preventDefault();
    handleVote('B');
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (hasVoted) {
      pickNextDilemma();
    }
  }
});

// Event Listeners
cardOptionA.addEventListener('click', () => handleVote('A'));
cardOptionB.addEventListener('click', () => handleVote('B'));
btnNext.addEventListener('click', () => pickNextDilemma());
btnShare.addEventListener('click', () => shareCurrentDilemma());

const btnResetStreak = document.getElementById('btnResetStreak');
if (btnResetStreak) {
  btnResetStreak.addEventListener('click', () => {
    stats.currentStreak = 0;
    saveStats();
    updateStatsUI();
    showToast('Racha reiniciada a 0');
  });
}

// Init
async function init() {
  initTheme();
  bindThemeButton({
    buttonId: 'themeToggle',
    labelId: 'themeLabel',
    darkIconId: 'themeIconDark',
    lightIconId: 'themeIconLight'
  });

  updateStatsUI();

  try {
    const res = await fetch('/data/que-prefieres.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allDilemmas = await res.json();

    // Prepare balanced pool
    remainingIds = buildBalancedQueue();

    // Check URL param ?id=
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get('id');
    const targetDilemma = requestedId ? allDilemmas.find(d => d.id === requestedId) : null;

    if (targetDilemma) {
      // Remove from remaining
      remainingIds = remainingIds.filter(id => id !== targetDilemma.id);
      loadDilemma(targetDilemma);
    } else {
      pickNextDilemma();
    }
  } catch (err) {
    console.error('Error loading dilemmas:', err);
    textOptionA.textContent = 'Error al cargar los dilemas';
    textOptionB.textContent = 'Por favor recargá la página';
  }
}

init();
