const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');
const missEl = document.getElementById('misses');
const timeEl = document.getElementById('time');
const bestScoreEl = document.getElementById('best-score');
const messageEl = document.getElementById('message');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const difficultyInputs = document.querySelectorAll("input[name='difficulty']");

const GRID_SIZE = 3;
const BASE_POINTS = 10;
const STREAK_BONUS = 2;
const STORAGE_KEY = 'garden-whack-best-score';

const DIFFICULTIES = {
  easy: {
    label: 'やさしい',
    duration: 75,
    maxMisses: 14,
    baseDelay: 1250,
    minDelay: 600,
  },
  normal: {
    label: 'ふつう',
    duration: 60,
    maxMisses: 10,
    baseDelay: 1050,
    minDelay: 420,
  },
  hard: {
    label: 'むずかしい',
    duration: 50,
    maxMisses: 7,
    baseDelay: 900,
    minDelay: 300,
  },
};

const state = {
  running: false,
  score: 0,
  misses: 0,
  timeLeft: DIFFICULTIES.normal.duration,
  streak: 0,
  activeIndex: null,
  awaitingHit: false,
  tiles: [],
  timers: {
    tick: null,
    spawn: null,
  },
  difficulty: 'normal',
  settings: DIFFICULTIES.normal,
  bestScore: loadBestScore(),
};

function loadBestScore() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = Number.parseInt(stored ?? '', 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (error) {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch (error) {
    // ブラウザ設定により保存できない場合は無視
  }
}

function getDifficultyLabel(value) {
  return DIFFICULTIES[value]?.label ?? DIFFICULTIES.normal.label;
}

function toggleDifficultyInputs(disabled) {
  difficultyInputs.forEach((input) => {
    input.disabled = disabled;
  });
}

function applySelectedDifficulty() {
  const selected = Array.from(difficultyInputs).find((input) => input.checked);
  const value = selected ? selected.value : state.difficulty;
  setDifficulty(value);
  return value;
}

function setDifficulty(value) {
  const next = DIFFICULTIES[value] ?? DIFFICULTIES.normal;
  state.difficulty = value in DIFFICULTIES ? value : 'normal';
  state.settings = next;

  if (!state.running) {
    state.timeLeft = next.duration;
    updateTime();
    state.misses = 0;
    updateMisses();
  }
}

function createBoard() {
  const totalTiles = GRID_SIZE * GRID_SIZE;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < totalTiles; i += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('role', 'gridcell');
    button.dataset.index = String(i);
    button.addEventListener('click', () => handleTileClick(i));
    fragment.appendChild(button);
    state.tiles.push(button);
  }

  board.appendChild(fragment);
}

function resetBoardVisual() {
  state.tiles.forEach((tile) => {
    tile.classList.remove('active', 'missed');
    tile.setAttribute('aria-pressed', 'false');
  });
}

function updateScore() {
  scoreEl.textContent = state.score;
}

function updateStreak() {
  streakEl.textContent = state.streak;
}

function updateMisses() {
  missEl.textContent = `${state.misses} / ${state.settings.maxMisses}`;
}

function updateTime() {
  timeEl.textContent = state.timeLeft;
}

function updateBestScore() {
  bestScoreEl.textContent = state.bestScore;
}

function setMessage(text, type = '') {
  messageEl.textContent = text;
  messageEl.className = `message${type ? ` ${type}` : ''}`;
}

function pickNextIndex() {
  const totalTiles = state.tiles.length;
  let nextIndex = Math.floor(Math.random() * totalTiles);
  if (nextIndex === state.activeIndex) {
    nextIndex = (nextIndex + 1) % totalTiles;
  }
  return nextIndex;
}

function getSpawnDelay() {
  const { baseDelay, minDelay } = state.settings;
  const speedUp = state.streak * 35;
  return Math.max(minDelay, baseDelay - speedUp);
}

function scheduleSpawn() {
  clearTimeout(state.timers.spawn);
  const delay = getSpawnDelay();
  state.timers.spawn = setTimeout(spawnMole, delay);
}

function spawnMole() {
  if (!state.running) {
    return;
  }

  if (state.awaitingHit && state.activeIndex !== null) {
    registerMiss(state.activeIndex);
    if (!state.running) {
      return;
    }
  }

  const index = pickNextIndex();
  state.activeIndex = index;
  state.awaitingHit = true;

  resetBoardVisual();
  const activeTile = state.tiles[index];
  activeTile.classList.add('active');
  activeTile.setAttribute('aria-pressed', 'true');

  scheduleSpawn();
}

function registerMiss(tileIndex) {
  const tile = state.tiles[tileIndex];
  tile.classList.remove('active');
  tile.classList.add('missed');
  tile.setAttribute('aria-pressed', 'false');

  state.awaitingHit = false;
  state.streak = 0;
  updateStreak();

  state.misses += 1;
  updateMisses();
  setMessage('逃しちゃった！リズムを取り戻そう。', 'warning');

  if (state.misses >= state.settings.maxMisses) {
    endGame('ミスが上限に達しました。おつかれさま！', false);
  }
}

function handleTileClick(tileIndex) {
  if (!state.running || !state.awaitingHit) {
    return;
  }

  if (tileIndex !== state.activeIndex) {
    setMessage('そこじゃないよ！光っているマスを狙おう。', 'warning');
    return;
  }

  const tile = state.tiles[tileIndex];
  tile.classList.remove('active');
  tile.setAttribute('aria-pressed', 'false');

  state.awaitingHit = false;
  state.streak += 1;
  updateStreak();

  const points = BASE_POINTS + (state.streak - 1) * STREAK_BONUS;
  state.score += points;
  updateScore();

  setMessage(`ナイス！ +${points} 点`, 'success');

  setTimeout(() => {
    if (state.running) {
      spawnMole();
    }
  }, 220);
}

function startTimer() {
  clearInterval(state.timers.tick);
  state.timers.tick = setInterval(() => {
    state.timeLeft -= 1;
    updateTime();

    if (state.timeLeft <= 0) {
      endGame('タイムアップ！おつかれさま。', true);
    }
  }, 1000);
}

function updateBestScoreFromResult() {
  if (state.score <= state.bestScore) {
    return false;
  }

  state.bestScore = state.score;
  updateBestScore();
  saveBestScore(state.bestScore);
  return true;
}

function resetState(options = {}) {
  const { announce = true } = options;

  state.running = false;
  state.score = 0;
  state.misses = 0;
  state.timeLeft = state.settings.duration;
  state.streak = 0;
  state.activeIndex = null;
  state.awaitingHit = false;
  clearInterval(state.timers.tick);
  clearTimeout(state.timers.spawn);

  updateScore();
  updateMisses();
  updateTime();
  updateStreak();
  updateBestScore();
  resetBoardVisual();

  if (announce) {
    setMessage(`スタートでゲーム開始！難易度「${getDifficultyLabel(state.difficulty)}」に挑戦しよう。`);
  }
}

function startGame() {
  if (state.running) {
    return;
  }

  applySelectedDifficulty();
  toggleDifficultyInputs(true);
  resetState({ announce: false });

  state.running = true;
  startButton.disabled = true;
  resetButton.disabled = false;
  setMessage(`どんどん叩いていこう！難易度「${getDifficultyLabel(state.difficulty)}」だよ。`, 'success');

  startTimer();
  spawnMole();
}

function endGame(text, keepScore = true) {
  if (!state.running) {
    return;
  }

  state.running = false;
  clearInterval(state.timers.tick);
  clearTimeout(state.timers.spawn);
  resetBoardVisual();
  state.activeIndex = null;
  state.awaitingHit = false;

  toggleDifficultyInputs(false);
  startButton.disabled = false;
  resetButton.disabled = false;

  if (keepScore && updateBestScoreFromResult()) {
    setMessage(`${text} ハイスコア更新！`, 'success');
  } else {
    setMessage(text, keepScore ? 'success' : 'warning');
  }
}

function handleReset() {
  resetState();
  startButton.disabled = false;
  resetButton.disabled = true;
  toggleDifficultyInputs(false);
}

startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', handleReset);

difficultyInputs.forEach((input) => {
  input.addEventListener('change', (event) => {
    if (state.running) {
      event.target.checked = event.target.value === state.difficulty;
      setMessage('ゲーム中は難易度を変更できません。', 'warning');
      return;
    }

    setDifficulty(event.target.value);
    resetState();
  });
});

createBoard();
applySelectedDifficulty();
resetState();
toggleDifficultyInputs(false);
