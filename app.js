/**
 * GameFusion — Python & NumPy Multi-Game Hub Web Engine
 * Modernized interactive edition with Web Audio, LocalStorage,
 * Confetti particles, and a full Python CLI Terminal Simulator.
 */

// ================= GLOBAL STATE =================
const DEFAULT_SCORES = {
  rps: {
    played: 0,
    user_wins: 0,
    computer_wins: 0,
    ties: 0
  },
  guess: {
    played: 0,
    best_attempts: null,
    total_attempts: 0
  }
};

let scores = JSON.parse(localStorage.getItem('gamefusion_scores')) || JSON.parse(JSON.stringify(DEFAULT_SCORES));
let currentStreak = parseInt(localStorage.getItem('gamefusion_streak') || '0', 10);
let soundEnabled = localStorage.getItem('gamefusion_sound') !== 'false';
let rpsHistory = JSON.parse(localStorage.getItem('gamefusion_rps_history') || '[]');

// Guess game active state
let guessSecret = 0;
let guessAttempts = 0;
let guessCurrentMin = 1;
let guessCurrentMax = 100;
let guessGameOver = false;

// Audio context (Web Audio API synthetic sound generation)
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
}

function playTone(freq, duration, type = 'sine', gainVal = 0.1) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Audio context safe fallback
  }
}

function playSound(name) {
  if (!soundEnabled) return;
  switch (name) {
    case 'click':
      playTone(480, 0.08, 'sine', 0.08);
      break;
    case 'win':
      setTimeout(() => playTone(523.25, 0.12, 'triangle', 0.15), 0);     // C5
      setTimeout(() => playTone(659.25, 0.12, 'triangle', 0.15), 100);   // E5
      setTimeout(() => playTone(783.99, 0.14, 'triangle', 0.15), 200);   // G5
      setTimeout(() => playTone(1046.50, 0.35, 'triangle', 0.18), 300);  // C6
      break;
    case 'loss':
      setTimeout(() => playTone(392.00, 0.15, 'sawtooth', 0.12), 0);
      setTimeout(() => playTone(329.63, 0.25, 'sawtooth', 0.14), 140);
      break;
    case 'tie':
      setTimeout(() => playTone(440, 0.12, 'square', 0.08), 0);
      setTimeout(() => playTone(440, 0.12, 'square', 0.08), 120);
      break;
    case 'hint_low':
      playTone(330, 0.12, 'sine', 0.1);
      setTimeout(() => playTone(440, 0.15, 'sine', 0.1), 80);
      break;
    case 'hint_high':
      playTone(550, 0.12, 'sine', 0.1);
      setTimeout(() => playTone(370, 0.15, 'sine', 0.1), 80);
      break;
  }
}

// ================= LOCAL STORAGE PERSISTENCE =================
function saveState() {
  localStorage.setItem('gamefusion_scores', JSON.stringify(scores));
  localStorage.setItem('gamefusion_streak', currentStreak.toString());
  localStorage.setItem('gamefusion_rps_history', JSON.stringify(rpsHistory));
  updateTicker();
  renderScoreboard();
}

// ================= CONFETTI PARTICLES =================
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];
let animId = null;

function resizeCanvas() {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function triggerConfetti() {
  if (!ctx) return;
  particles = [];
  const colors = ['#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ffffff'];
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.45,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.9) * 12 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12
    });
  }
  if (!animId) {
    runConfetti();
  }
}

function runConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.35; // gravity
    p.alpha -= 0.012;
    p.rotation += p.rotSpeed;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();

    if (p.alpha <= 0 || p.y > canvas.height) {
      particles.splice(i, 1);
    }
  }

  if (particles.length > 0) {
    animId = requestAnimationFrame(runConfetti);
  } else {
    animId = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// ================= TICKER BAR UPDATER =================
function updateTicker() {
  const total = scores.rps.played + scores.guess.played;
  const tickerTotal = document.getElementById('ticker-total-played');
  if (tickerTotal) tickerTotal.textContent = total;

  const tickerWinrate = document.getElementById('ticker-rps-winrate');
  if (tickerWinrate) {
    if (scores.rps.played === 0) {
      tickerWinrate.textContent = '0%';
    } else {
      const pct = ((scores.rps.user_wins / scores.rps.played) * 100).toFixed(0);
      tickerWinrate.textContent = `${pct}%`;
    }
  }

  const tickerGuess = document.getElementById('ticker-guess-best');
  if (tickerGuess) {
    tickerGuess.textContent = scores.guess.best_attempts !== null ? `${scores.guess.best_attempts} tries` : '—';
  }

  const tickerStreak = document.getElementById('ticker-streak');
  if (tickerStreak) {
    tickerStreak.textContent = `${currentStreak} 🔥`;
  }
}

// ================= TAB NAVIGATION =================
const navButtons = document.querySelectorAll('.nav-btn');
const tabViews = document.querySelectorAll('.tab-view');

function switchTab(tabId) {
  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  tabViews.forEach(view => {
    view.classList.toggle('active', view.id === `view-${tabId}`);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    playSound('click');
    switchTab(btn.dataset.tab);
  });
});

document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-tab-trigger]');
  if (trigger) {
    e.preventDefault();
    playSound('click');
    const target = trigger.getAttribute('data-tab-trigger');
    switchTab(target);
  }
});

// Sound toggle button
const soundBtn = document.getElementById('sound-toggle-btn');
const soundIcon = document.getElementById('sound-icon');
if (soundBtn && soundIcon) {
  soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('gamefusion_sound', soundEnabled ? 'true' : 'false');
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    if (soundEnabled) playSound('click');
  });
}

// ================= GAME 1: ROCK, PAPER, SCISSORS =================
const WEAPONS = {
  r: { name: 'Rock', emoji: '🪨', beatText: 'Rock crushes Scissors' },
  p: { name: 'Paper', emoji: '📄', beatText: 'Paper covers Rock' },
  s: { name: 'Scissors', emoji: '✂️', beatText: 'Scissors cut Paper' }
};

const playerAvatar = document.getElementById('player-avatar');
const playerChoiceIcon = document.getElementById('player-choice-icon');
const playerChoiceName = document.getElementById('player-choice-name');

const cpuAvatar = document.getElementById('cpu-avatar');
const cpuChoiceIcon = document.getElementById('cpu-choice-icon');
const cpuChoiceName = document.getElementById('cpu-choice-name');

const arenaStatus = document.getElementById('rps-round-status');
const outcomeBox = document.getElementById('rps-outcome-box');
const outcomeTitle = document.getElementById('rps-outcome-title');
const outcomeExplanation = document.getElementById('rps-outcome-explanation');

const rpsMiniUser = document.getElementById('rps-mini-user');
const rpsMiniCpu = document.getElementById('rps-mini-cpu');
const rpsMiniTies = document.getElementById('rps-mini-ties');
const rpsHistoryList = document.getElementById('rps-history-list');

function updateRpsMiniStats() {
  if (rpsMiniUser) rpsMiniUser.textContent = scores.rps.user_wins;
  if (rpsMiniCpu) rpsMiniCpu.textContent = scores.rps.computer_wins;
  if (rpsMiniTies) rpsMiniTies.textContent = scores.rps.ties;
}

function renderRpsHistory() {
  if (!rpsHistoryList) return;
  if (rpsHistory.length === 0) {
    rpsHistoryList.innerHTML = '<span class="empty-state">No rounds played yet. Make your first move!</span>';
    return;
  }
  rpsHistoryList.innerHTML = rpsHistory.slice(0, 10).map(item => `
    <span class="round-chip ${item.result}">
      ${item.result === 'win' ? '🏆 Won' : item.result === 'loss' ? '❌ Lost' : '🤝 Tie'} (${item.user.toUpperCase()} vs ${item.cpu.toUpperCase()})
    </span>
  `).join('');
}

let rpsInProgress = false;

function playRPS(userChoice) {
  if (rpsInProgress) return;
  rpsInProgress = true;
  playSound('click');

  // Reset arena visuals
  outcomeBox.classList.add('hidden');
  playerAvatar.className = 'fighter-avatar shake';
  cpuAvatar.className = 'fighter-avatar shake';
  playerChoiceIcon.textContent = '✊';
  cpuChoiceIcon.textContent = '✊';
  playerChoiceName.textContent = 'Shaking...';
  cpuChoiceName.textContent = 'Computing...';
  arenaStatus.textContent = 'Battling...';

  const choices = ['r', 'p', 's'];
  // NumPy random choice analog
  const cpuChoice = choices[Math.floor(Math.random() * choices.length)];

  setTimeout(() => {
    playerAvatar.classList.remove('shake');
    cpuAvatar.classList.remove('shake');
    playerAvatar.classList.add('revealed');
    cpuAvatar.classList.add('revealed');

    playerChoiceIcon.textContent = WEAPONS[userChoice].emoji;
    playerChoiceName.textContent = `${WEAPONS[userChoice].name} (${userChoice})`;

    cpuChoiceIcon.textContent = WEAPONS[cpuChoice].emoji;
    cpuChoiceName.textContent = `${WEAPONS[cpuChoice].name} (${cpuChoice})`;

    scores.rps.played += 1;

    let result = '';
    let expl = '';

    if (userChoice === cpuChoice) {
      result = 'tie';
      scores.rps.ties += 1;
      currentStreak = 0;
      outcomeTitle.textContent = "It's a Tie! 🤝";
      outcomeExplanation.textContent = `Both chose ${WEAPONS[userChoice].name}. Neutral round.`;
      outcomeBox.className = 'outcome-box tie';
      playSound('tie');
    } else {
      let isUserWin = false;
      if ((userChoice === 'r' && cpuChoice === 'p') || (userChoice === 'p' && cpuChoice === 'r')) {
        expl = 'whoever take the paper(p),is win';
        isUserWin = (userChoice === 'p');
      } else if ((userChoice === 'p' && cpuChoice === 's') || (userChoice === 's' && cpuChoice === 'p')) {
        expl = 'whoever take the scissors(s),is win';
        isUserWin = (userChoice === 's');
      } else if ((userChoice === 'r' && cpuChoice === 's') || (userChoice === 's' && cpuChoice === 'r')) {
        expl = 'whoever take the rock(r),is win';
        isUserWin = (userChoice === 'r');
      }

      if (isUserWin) {
        result = 'win';
        scores.rps.user_wins += 1;
        currentStreak += 1;
        outcomeTitle.textContent = '🎉 You Win The Game!';
        outcomeExplanation.textContent = expl;
        outcomeBox.className = 'outcome-box win';
        playerAvatar.classList.add('winner');
        playSound('win');
        triggerConfetti();
      } else {
        result = 'loss';
        scores.rps.computer_wins += 1;
        currentStreak = 0;
        outcomeTitle.textContent = '💀 Computer Wins The Game!';
        outcomeExplanation.textContent = expl;
        outcomeBox.className = 'outcome-box loss';
        cpuAvatar.classList.add('winner');
        playSound('loss');
      }
    }

    outcomeBox.classList.remove('hidden');
    arenaStatus.textContent = 'Match Finished';

    // Add to match history
    rpsHistory.unshift({
      user: userChoice,
      cpu: cpuChoice,
      result: result,
      time: new Date().toLocaleTimeString()
    });
    if (rpsHistory.length > 25) rpsHistory.pop();

    updateRpsMiniStats();
    renderRpsHistory();
    saveState();
    rpsInProgress = false;
  }, 750);
}

document.querySelectorAll('.weapon-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const weapon = btn.dataset.weapon;
    playRPS(weapon);
  });
});

const clearRpsHistBtn = document.getElementById('clear-rps-history');
if (clearRpsHistBtn) {
  clearRpsHistBtn.addEventListener('click', () => {
    rpsHistory = [];
    renderRpsHistory();
    localStorage.removeItem('gamefusion_rps_history');
    playSound('click');
  });
}

// ================= GAME 2: GUESS THE NUMBER =================
const guessInput = document.getElementById('guess-input');
const guessFeedback = document.getElementById('guess-feedback');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackMain = document.getElementById('feedback-main');
const feedbackSub = document.getElementById('feedback-sub');
const guessAttemptsTrail = document.getElementById('guess-attempts-trail');
const currentAttemptsDisplay = document.getElementById('guess-current-attempts');
const currentBestDisplay = document.getElementById('guess-current-best');
const rangeMinLabel = document.getElementById('range-min-label');
const rangeMaxLabel = document.getElementById('range-max-label');
const rangeBoundsText = document.getElementById('range-bounds-text');
const rangeProgressFill = document.getElementById('range-progress-fill');
const rangePointer = document.getElementById('range-pointer');
const tempBadge = document.getElementById('temperature-badge');

function initGuessGame() {
  guessSecret = Math.floor(Math.random() * 100) + 1; // 1 to 100
  guessAttempts = 0;
  guessCurrentMin = 1;
  guessCurrentMax = 100;
  guessGameOver = false;

  if (guessInput) {
    guessInput.value = '';
    guessInput.disabled = false;
    guessInput.focus();
  }

  if (currentAttemptsDisplay) currentAttemptsDisplay.textContent = '0';
  if (currentBestDisplay) {
    currentBestDisplay.textContent = scores.guess.best_attempts !== null ? `${scores.guess.best_attempts} tries` : '—';
  }

  if (guessFeedback) {
    guessFeedback.className = 'guess-feedback-card neutral';
    feedbackIcon.textContent = '🎯';
    feedbackMain.textContent = 'New Game Started!';
    feedbackSub.textContent = 'I have picked a secret number between 1 and 100. Enter your first guess!';
  }

  if (guessAttemptsTrail) {
    guessAttemptsTrail.innerHTML = '<span class="empty-state">No guesses submitted yet.</span>';
  }

  updateRangeVisualizer(50);
}

function updateRangeVisualizer(pointerVal) {
  if (rangeMinLabel) rangeMinLabel.textContent = `Min: ${guessCurrentMin}`;
  if (rangeMaxLabel) rangeMaxLabel.textContent = `Max: ${guessCurrentMax}`;
  if (rangeBoundsText) {
    rangeBoundsText.innerHTML = `Current valid search range: <strong>${guessCurrentMin} to ${guessCurrentMax}</strong>`;
  }

  if (rangeProgressFill) {
    const leftPercent = ((guessCurrentMin - 1) / 99) * 100;
    const rightPercent = ((guessCurrentMax - 1) / 99) * 100;
    const width = Math.max(2, rightPercent - leftPercent);
    rangeProgressFill.style.left = `${leftPercent}%`;
    rangeProgressFill.style.width = `${width}%`;
  }

  if (rangePointer) {
    const clamped = Math.max(1, Math.min(100, pointerVal || 50));
    const pointerPercent = ((clamped - 1) / 99) * 100;
    rangePointer.style.left = `${pointerPercent}%`;
    rangePointer.textContent = clamped;
  }
}

function handleGuessSubmit() {
  if (guessGameOver) {
    initGuessGame();
    return;
  }

  const raw = guessInput.value.trim();
  const val = parseInt(raw, 10);

  if (isNaN(val) || val < 1 || val > 100) {
    guessFeedback.className = 'guess-feedback-card high';
    feedbackIcon.textContent = '⚠️';
    feedbackMain.textContent = 'Invalid Input';
    feedbackSub.textContent = 'Please enter a valid integer within 1 to 100.';
    playSound('loss');
    return;
  }

  guessAttempts += 1;
  if (currentAttemptsDisplay) currentAttemptsDisplay.textContent = guessAttempts;

  // Clear empty state
  const emptyState = guessAttemptsTrail.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const chip = document.createElement('span');
  const diff = Math.abs(val - guessSecret);

  // Temperature hint
  let tempText = 'Cold ❄️';
  if (diff <= 3) tempText = 'Boiling Hot! 🔥';
  else if (diff <= 8) tempText = 'Very Warm ♨️';
  else if (diff <= 15) tempText = 'Warm ☀️';
  else if (diff <= 25) tempText = 'Cool 🌬️';
  if (tempBadge) tempBadge.textContent = `Proximity: ${tempText}`;

  if (val < guessSecret) {
    // Too low
    guessFeedback.className = 'guess-feedback-card low';
    feedbackIcon.textContent = '📉';
    feedbackMain.textContent = 'Too Low!';
    feedbackSub.textContent = `Your guess ${val} is too small. Try a higher number!`;
    chip.className = 'guess-chip low';
    chip.textContent = `▲ ${val} (Low)`;
    playSound('hint_low');

    if (val >= guessCurrentMin) {
      guessCurrentMin = val + 1;
    }
  } else if (val > guessSecret) {
    // Too high
    guessFeedback.className = 'guess-feedback-card high';
    feedbackIcon.textContent = '📈';
    feedbackMain.textContent = 'Too High!';
    feedbackSub.textContent = `Your guess ${val} is too large. Try a lower number!`;
    chip.className = 'guess-chip high';
    chip.textContent = `▼ ${val} (High)`;
    playSound('hint_high');

    if (val <= guessCurrentMax) {
      guessCurrentMax = val - 1;
    }
  } else {
    // Exact match!
    guessGameOver = true;
    guessFeedback.className = 'guess-feedback-card correct';
    feedbackIcon.textContent = '🎉';
    feedbackMain.textContent = `Victory! Found ${guessSecret}!`;
    feedbackSub.textContent = `Congratulations! You cracked the secret number in ${guessAttempts} attempts!`;
    chip.className = 'guess-chip correct';
    chip.textContent = `★ ${val} (Win!)`;
    playSound('win');
    triggerConfetti();

    // Update global score
    scores.guess.played += 1;
    scores.guess.total_attempts += guessAttempts;
    if (scores.guess.best_attempts === null || guessAttempts < scores.guess.best_attempts) {
      scores.guess.best_attempts = guessAttempts;
    }
    saveState();

    if (currentBestDisplay) {
      currentBestDisplay.textContent = `${scores.guess.best_attempts} tries`;
    }
    guessInput.disabled = true;
  }

  guessAttemptsTrail.appendChild(chip);
  updateRangeVisualizer(val);
  guessInput.value = '';
  if (!guessGameOver) guessInput.focus();
}

const guessForm = document.getElementById('guess-form');
if (guessForm) {
  guessForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleGuessSubmit();
  });
}

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (guessInput && !guessGameOver) {
      guessInput.value = btn.dataset.val;
      handleGuessSubmit();
    }
  });
});

const newGuessGameBtn = document.getElementById('btn-new-guess-game');
if (newGuessGameBtn) {
  newGuessGameBtn.addEventListener('click', () => {
    playSound('click');
    initGuessGame();
  });
}

// ================= VIEW 4: SEPARATED SCOREBOARD =================
function renderScoreboard() {
  // RPS stats
  const rpsPlayed = document.getElementById('score-rps-played');
  const rpsUser = document.getElementById('score-rps-user');
  const rpsCpu = document.getElementById('score-rps-cpu');
  const rpsTies = document.getElementById('score-rps-ties');
  const rpsPct = document.getElementById('score-rps-pct');
  const rpsWinBar = document.getElementById('rps-win-bar');

  if (rpsPlayed) rpsPlayed.textContent = scores.rps.played;
  if (rpsUser) rpsUser.textContent = scores.rps.user_wins;
  if (rpsCpu) rpsCpu.textContent = scores.rps.computer_wins;
  if (rpsTies) rpsTies.textContent = scores.rps.ties;

  let pct = 0;
  if (scores.rps.played > 0) {
    pct = ((scores.rps.user_wins / scores.rps.played) * 100).toFixed(1);
  }
  if (rpsPct) rpsPct.textContent = `${pct}%`;
  if (rpsWinBar) rpsWinBar.style.width = `${Math.min(100, pct)}%`;

  // Guess stats
  const guessPlayed = document.getElementById('score-guess-played');
  const guessBest = document.getElementById('score-guess-best');
  const guessTotal = document.getElementById('score-guess-total-attempts');
  const guessAvg = document.getElementById('score-guess-avg');
  const guessSkillRank = document.getElementById('guess-skill-rank');

  if (guessPlayed) guessPlayed.textContent = scores.guess.played;
  if (guessBest) {
    guessBest.textContent = scores.guess.best_attempts !== null ? `${scores.guess.best_attempts} attempts` : 'No games played yet';
  }
  if (guessTotal) guessTotal.textContent = scores.guess.total_attempts;
  if (guessAvg) {
    if (scores.guess.played > 0) {
      const avg = (scores.guess.total_attempts / scores.guess.played).toFixed(1);
      guessAvg.textContent = `${avg} attempts`;
    } else {
      guessAvg.textContent = 'N/A';
    }
  }

  // Calculate Rank
  if (guessSkillRank) {
    if (scores.guess.played === 0) {
      guessSkillRank.textContent = 'Rookie Guesser 🌱';
    } else {
      const best = scores.guess.best_attempts;
      if (best <= 4) guessSkillRank.textContent = 'NumPy Grandmaster 🧙‍♂️';
      else if (best <= 6) guessSkillRank.textContent = 'Binary Search Expert ⚡';
      else if (best <= 8) guessSkillRank.textContent = 'Sharp Detective 🔎';
      else guessSkillRank.textContent = 'Apprentice Strategist 🧭';
    }
  }

  // Raw JSON representation mirror
  const jsonView = document.getElementById('scores-json-view');
  if (jsonView) {
    jsonView.textContent = JSON.stringify(scores, null, 2);
  }
}

// Reset button
const resetBtn = document.getElementById('btn-reset-all-scores');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all game statistics and scoreboard records?')) {
      scores = JSON.parse(JSON.stringify(DEFAULT_SCORES));
      currentStreak = 0;
      rpsHistory = [];
      saveState();
      updateRpsMiniStats();
      renderRpsHistory();
      initGuessGame();
      playSound('click');
      alert('All scoreboard metrics have been reset to zero.');
    }
  });
}

// Copy JSON scores button
const copyJsonBtn = document.getElementById('btn-copy-scores-json');
if (copyJsonBtn) {
  copyJsonBtn.addEventListener('click', () => {
    const text = JSON.stringify(scores, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      copyJsonBtn.textContent = 'Copied! ✓';
      playSound('click');
      setTimeout(() => { copyJsonBtn.textContent = 'Copy JSON'; }, 2000);
    });
  });
}

// ================= VIEW 5: PYTHON CLI TERMINAL SIMULATOR =================
const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');
const terminalEnterBtn = document.getElementById('terminal-enter-btn');
const restartTermBtn = document.getElementById('btn-restart-terminal');
const clearTermBtn = document.getElementById('btn-clear-terminal');

let termState = 'MENU'; // 'MENU' | 'RPS_CHOICE' | 'GUESS_RUNNING'
let termGuessSecret = 0;
let termGuessAttempts = 0;

function termPrint(text, type = 'normal') {
  if (!terminalOutput) return;
  const line = document.createElement('div');
  line.textContent = text;
  if (type === 'user') line.className = 'terminal-line-user';
  else if (type === 'system') line.className = 'terminal-line-system';
  else if (type === 'success') line.className = 'terminal-line-success';
  else if (type === 'warn') line.className = 'terminal-line-warn';
  else if (type === 'danger') line.className = 'terminal-line-danger';
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function printTermMenu() {
  termPrint('\n' + '#'.repeat(64), 'system');
  termPrint('WELCOME TO GameFusion: A Python-Based Interactive Multi-Game Hub ', 'success');
  termPrint('#'.repeat(64), 'system');
  termPrint('1. Rock, Paper, Scissors game');
  termPrint('2. Play Guess the Number game');
  termPrint('3. Score of the two games (separated)');
  termPrint('4. Exit');
  termPrint('\nEnter your choice (1-4): ', 'system');
  termState = 'MENU';
}

function handleTerminalInput(raw) {
  const input = raw.trim();
  termPrint(`$ ${input}`, 'user');

  if (termState === 'MENU') {
    if (input === '1') {
      termPrint('\n' + '='.repeat(26), 'system');
      termPrint('ROCK, PAPER, SCISSORS GAME', 'success');
      termPrint('='.repeat(26), 'system');
      termPrint('Enter your choice (r/p/s): ', 'system');
      termState = 'RPS_CHOICE';
    } else if (input === '2') {
      termPrint('\n' + '='.repeat(26), 'system');
      termPrint('GUESS THE NUMBER GAME', 'success');
      termPrint('='.repeat(26), 'system');
      termGuessSecret = Math.floor(Math.random() * 100) + 1;
      termGuessAttempts = 0;
      termPrint('Welcome to the Number Guessing Game!');
      termPrint('I have picked a secret number between 1 and 100. Can you guess it?');
      termPrint('\nEnter your guess (1-100): ', 'system');
      termState = 'GUESS_RUNNING';
    } else if (input === '3') {
      displayTermScores();
      printTermMenu();
    } else if (input === '4') {
      termPrint('\nThanks for playing! 👋', 'success');
      termPrint('[Process exited with status 0. Type "restart" to reboot]', 'system');
    } else {
      termPrint('Invalid option. Please enter 1, 2, 3, or 4.', 'danger');
      termPrint('Enter your choice (1-4): ', 'system');
    }
  } else if (termState === 'RPS_CHOICE') {
    const userChoice = input.toLowerCase();
    const choices = ['r', 'p', 's'];
    if (!choices.includes(userChoice)) {
      termPrint('invalid choice! Please choose r, p, or s.', 'danger');
      printTermMenu();
      return;
    }

    const cpuChoice = choices[Math.floor(Math.random() * choices.length)];
    termPrint(`Computer chose: ${cpuChoice}`);
    scores.rps.played += 1;

    if (userChoice === cpuChoice) {
      termPrint('Tie', 'warn');
      scores.rps.ties += 1;
    } else {
      if ((userChoice === 'r' && cpuChoice === 'p') || (userChoice === 'p' && cpuChoice === 'r')) {
        termPrint('whoever take the paper(p),is win');
        if (userChoice === 'p') {
          termPrint('You win the game!', 'success');
          scores.rps.user_wins += 1;
        } else {
          termPrint('Computer wins the game!', 'danger');
          scores.rps.computer_wins += 1;
        }
      } else if ((userChoice === 'p' && cpuChoice === 's') || (userChoice === 's' && cpuChoice === 'p')) {
        termPrint('whoever take the scissors(s),is win');
        if (userChoice === 's') {
          termPrint('You win the game!', 'success');
          scores.rps.user_wins += 1;
        } else {
          termPrint('Computer wins the game!', 'danger');
          scores.rps.computer_wins += 1;
        }
      } else if ((userChoice === 'r' && cpuChoice === 's') || (userChoice === 's' && cpuChoice === 'r')) {
        termPrint('whoever take the rock(r),is win');
        if (userChoice === 'r') {
          termPrint('You win the game!', 'success');
          scores.rps.user_wins += 1;
        } else {
          termPrint('Computer wins the game!', 'danger');
          scores.rps.computer_wins += 1;
        }
      }
    }
    saveState();
    printTermMenu();
  } else if (termState === 'GUESS_RUNNING') {
    const num = parseInt(input, 10);
    if (isNaN(num)) {
      termPrint('Invalid input! Please enter a valid integer.', 'danger');
      termPrint('\nEnter your guess (1-100): ', 'system');
      return;
    }
    if (num < 1 || num > 100) {
      termPrint('Please enter a number within 1 to 100.', 'warn');
      termPrint('\nEnter your guess (1-100): ', 'system');
      return;
    }

    termGuessAttempts += 1;

    if (num < termGuessSecret) {
      termPrint('Too low! Try a higher number.', 'warn');
      termPrint('\nEnter your guess (1-100): ', 'system');
    } else if (num > termGuessSecret) {
      termPrint('Too high! Try a lower number.', 'warn');
      termPrint('\nEnter your guess (1-100): ', 'system');
    } else {
      termPrint(`Congratulations! You found the number ${termGuessSecret} in ${termGuessAttempts} attempts!`, 'success');
      scores.guess.played += 1;
      scores.guess.total_attempts += termGuessAttempts;
      if (scores.guess.best_attempts === null || termGuessAttempts < scores.guess.best_attempts) {
        scores.guess.best_attempts = termGuessAttempts;
      }
      saveState();
      printTermMenu();
    }
  }
}

function displayTermScores() {
  termPrint('\n' + '='.repeat(45), 'system');
  termPrint('SCOREBOARD (SEPARATED GAME SCORES)', 'success');
  termPrint('='.repeat(45), 'system');

  termPrint('\n[ 1. Rock, Paper, Scissors Game Score ]');
  termPrint(`  • Total Matches Played : ${scores.rps.played}`);
  termPrint(`  • Player Wins          : ${scores.rps.user_wins}`);
  termPrint(`  • Computer Wins        : ${scores.rps.computer_wins}`);
  termPrint(`  • Ties                 : ${scores.rps.ties}`);

  termPrint('\n[ 2. Guess the Number Game Score ]');
  termPrint(`  • Total Games Played   : ${scores.guess.played}`);
  if (scores.guess.best_attempts !== null) {
    const best = scores.guess.best_attempts;
    const avg = (scores.guess.total_attempts / scores.guess.played).toFixed(1);
    termPrint(`  • Best Score (Least Tries) : ${best} attempts`);
    termPrint(`  • Average Attempts / Game  : ${avg} attempts`);
  } else {
    termPrint('  • Best Score (Least Tries) : No games played yet');
    termPrint('  • Average Attempts / Game  : N/A');
  }
  termPrint('\n' + '='.repeat(45), 'system');
}

function initTerminal() {
  if (!terminalOutput) return;
  terminalOutput.innerHTML = '';
  termPrint('Python 3.11.0 (main) [GCC 11.2.0] on linux (in-browser sandbox)', 'system');
  termPrint('Loaded NumPy 2.1.0 engine bindings.', 'system');
  printTermMenu();
}

if (terminalInput) {
  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = terminalInput.value;
      terminalInput.value = '';
      if (val.trim().toLowerCase() === 'restart' || val.trim().toLowerCase() === 'clear') {
        initTerminal();
      } else {
        handleTerminalInput(val);
      }
    }
  });
}

if (terminalEnterBtn && terminalInput) {
  terminalEnterBtn.addEventListener('click', () => {
    const val = terminalInput.value;
    terminalInput.value = '';
    handleTerminalInput(val);
  });
}

if (restartTermBtn) {
  restartTermBtn.addEventListener('click', () => {
    initTerminal();
    playSound('click');
  });
}

if (clearTermBtn && terminalOutput) {
  clearTermBtn.addEventListener('click', () => {
    terminalOutput.innerHTML = '';
    printTermMenu();
    playSound('click');
  });
}

// ================= VIEW 6: SOURCE CODE VIEWER =================
const CODE_FILES = {
  main: `"""
Main Project: GameFusion: A Python-Based Interactive Multi-Game Hub
1. Rock, Paper, Scissors game
2. Play Guess the Number game
3. Score of the two games
4. Exit
"""

import numpy as np

# Score for both games
scores = {
    "rps": {
        "played": 0,
        "user_wins": 0,
        "computer_wins": 0,
        "ties": 0,
    },
    "guess": {
        "played": 0,
        "best_attempts": None,
        "total_attempts": 0,
    },
}


def rock_paper_scissors():
    print("\\n" + "=" * 26)
    print("ROCK, PAPER, SCISSORS GAME")
    print("=" * 26)

    user = input("Enter your choice (r/p/s): ").lower().strip()
    choice = np.array(["r", "p", "s"])

    if user not in choice:
        print("invalid choice! Please choose r, p, or s.")
        return

    computer = np.random.choice(choice)
    print("Computer chose:", computer)
    scores["rps"]["played"] += 1

    if user == computer:
        print("Tie")
        scores["rps"]["ties"] += 1
    else:
        if user == "r" and computer == "p" or user == "p" and computer == "r":
            print("whoever take the paper(p),is win")
            if user == "p":
                print("You win the game!")
                scores["rps"]["user_wins"] += 1
            else:
                print("Computer wins the game!")
                scores["rps"]["computer_wins"] += 1

        elif user == "p" and computer == "s" or user == "s" and computer == "p":
            print("whoever take the scissors(s),is win")
            if user == "s":
                print("You win the game!")
                scores["rps"]["user_wins"] += 1
            else:
                print("Computer wins the game!")
                scores["rps"]["computer_wins"] += 1

        elif user == "r" and computer == "s" or user == "s" and computer == "r":
            print("whoever take the rock(r),is win")
            if user == "r":
                print("You win the game!")
                scores["rps"]["user_wins"] += 1
            else:
                print("Computer wins the game!")
                scores["rps"]["computer_wins"] += 1


def guess_the_number():
    print("\\n" + "=" * 26)
    print("GUESS THE NUMBER GAME")
    print("=" * 26)

    # random number between 1 and 100
    secret_number = int(np.random.randint(1, 101))
    attempts = 0

    print("Welcome to the Number Guessing Game!")
    print("I have picked a secret number between 1 and 100. Can you guess it?")

    while True:
        try:
            user_guess = int(input("\\nEnter your guess (1-100): "))

            if user_guess < 1 or user_guess > 100:
                print("Please enter a number within 1 to 100.")
                continue

            attempts += 1

            if user_guess < secret_number:
                print("Too low! Try a higher number.")
            elif user_guess > secret_number:
                print("Too high! Try a lower number.")
            else:
                print(f"Congratulations! You found the number {secret_number} in {attempts} attempts!")
                # Update score statistics
                scores["guess"]["played"] += 1
                scores["guess"]["total_attempts"] += attempts
                if scores["guess"]["best_attempts"] is None or attempts < scores["guess"]["best_attempts"]:
                    scores["guess"]["best_attempts"] = attempts
                break

        except ValueError:
            print("Invalid input! Please enter a valid integer.")


def display_scores():
    print("\\n" + "=" * 45)
    print("SCOREBOARD (SEPARATED GAME SCORES)")
    print("=" * 45)

    # 1. Rock, Paper, Scissors Scores
    print("\\n[ 1. Rock, Paper, Scissors Game Score ]")
    print(f"  • Total Matches Played : {scores['rps']['played']}")
    print(f"  • Player Wins          : {scores['rps']['user_wins']}")
    print(f"  • Computer Wins        : {scores['rps']['computer_wins']}")
    print(f"  • Ties                 : {scores['rps']['ties']}")

    # 2. Guess the Number Scores
    print("\\n[ 2. Guess the Number Game Score ]")
    print(f"  • Total Games Played   : {scores['guess']['played']}")
    if scores["guess"]["best_attempts"] is not None:
        best = scores["guess"]["best_attempts"]
        avg = scores["guess"]["total_attempts"] / scores["guess"]["played"]
        print(f"  • Best Score (Least Tries) : {best} attempts")
        print(f"  • Average Attempts / Game  : {avg:.1f} attempts")
    else:
        print("  • Best Score (Least Tries) : No games played yet")
        print("  • Average Attempts / Game  : N/A")

    print("\\n" + "=" * 45)


def main():
    while True:
        print("\\n" + "#" * 64)
        print("WELCOME TO GameFusion: A Python-Based Interactive Multi-Game Hub ")
        print("#" * 64)
        print("1. Rock, Paper, Scissors game")
        print("2. Play Guess the Number game")
        print("3. Score of the two games (separated)")
        print("4. Exit")

        choice = input("\\nEnter your choice (1-4): ").strip()

        if choice == "1":
            rock_paper_scissors()
        elif choice == "2":
            guess_the_number()
        elif choice == "3":
            display_scores()
        elif choice == "4":
            print("\\nThanks for playing! ")
            break
        else:
            print("Invalid option. Please enter 1, 2, 3, or 4.")


if __name__ == "__main__":
    main()`,

  p1: `# Rock, paper, scissors game using numpy in python (project -> 1)

import numpy as np

user = input("Enter your choice (r/p/s): ").lower().strip()
choice = np.array(["r","p","s"])
computer = np.random.choice(choice)
print("Computer chose:", computer)
if user == computer:
    print("Tie")
else:
    if user == "r" and computer == "p" or user == "p" and computer == "r":
        print("whoever take the paper(p),is win")
        if user == "p":
            print("You win the game!")
        else:
            print("Computer wins the game!")

    elif user == "p" and computer == "s" or user == "s" and computer == "p":
        print("whoever take the sessior(s),is win")
        if user == "s":
            print("You win the game!")
        else:
            print("Computer wins the game!")

    elif user == "r" and computer == "s" or user == "s" and computer == "r":
        print("whoever take the rock(r),is win")
        if user == "r":
            print("You win the game!")
        else:
            print("Computer wins the game!")

    else:
        print("invalid")`,

  p2: `# Guess the Number game using NumPy in Python (Project -> 2)

import numpy as np

# Generate a random number between 1 and 100 (inclusive)
secret_number = np.random.randint(1, 101)
attempts = 0

print("🎯 Welcome to the Number Guessing Game!")
print("I have picked a secret number between 1 and 100. Can you guess it?")

while True:
    try:
        user_guess = int(input("\\nEnter your guess (1-100): "))
        attempts += 1

        if user_guess < 1 or user_guess > 100:
            print("⚠️ Please enter a number within 1 to 100.")
            continue

        if user_guess < secret_number:
            print("📉 Too low! Try a higher number.")
        elif user_guess > secret_number:
            print("📈 Too high! Try a lower number.")
        else:
            print(f"🎉 Congratulations! You found the number {secret_number} in {attempts} attempts!")
            break

    except ValueError:
        print("❌ Invalid input! Please enter a valid integer.")`
};

const codeContent = document.getElementById('code-content');
const currentFilenameLabel = document.getElementById('current-filename-label');
const copyCodeBtn = document.getElementById('btn-copy-code');
let currentCodeFile = 'main';

function showCode(fileKey) {
  currentCodeFile = fileKey;
  document.querySelectorAll('.code-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.file === fileKey);
  });
  const filenames = {
    main: 'main_project.py',
    p1: 'project_1.py (RPS)',
    p2: 'project_2.py (Guess)'
  };
  if (currentFilenameLabel) currentFilenameLabel.textContent = filenames[fileKey] || fileKey;
  if (codeContent) codeContent.textContent = CODE_FILES[fileKey] || '';
}

document.querySelectorAll('.code-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    playSound('click');
    showCode(btn.dataset.file);
  });
});

if (copyCodeBtn) {
  copyCodeBtn.addEventListener('click', () => {
    const text = CODE_FILES[currentCodeFile];
    navigator.clipboard.writeText(text).then(() => {
      copyCodeBtn.textContent = 'Copied! ✓';
      playSound('click');
      setTimeout(() => { copyCodeBtn.textContent = '📋 Copy Code'; }, 2000);
    });
  });
}

// ================= INITIALIZATION =================
window.addEventListener('DOMContentLoaded', () => {
  updateTicker();
  updateRpsMiniStats();
  renderRpsHistory();
  initGuessGame();
  renderScoreboard();
  initTerminal();
  showCode('main');
});

