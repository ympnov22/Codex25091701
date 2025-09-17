const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const missEl = document.getElementById('misses');
const timeEl = document.getElementById('time');
const messageEl = document.getElementById('message');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');

const GRID_SIZE = 3;
const MAX_MISSES = 10;
const GAME_DURATION = 60;
const BASE_POINTS = 10;
const STREAK_BONUS = 2;

const state = {
  running: false,
  score: 0,
  misses: 0,
  timeLeft: GAME_DURATION,
  streak: 0,
  activeIndex: null,
  awaitingHit: false,
  tiles: [],
  timers: {
    tick: null,
    spawn: null,
  },
};

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

function updateMisses() {
  missEl.textContent = state.misses;
}

function updateTime() {
  timeEl.textContent = state.timeLeft;
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
  const minDelay = 450;
  const baseDelay = 1100;
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
  state.misses += 1;
  updateMisses();
  setMessage('逃しちゃった！焦らず行こう。', 'warning');

  if (state.misses >= MAX_MISSES) {
    endGame('ミスが10回に達しました。おつかれさま！', false);
  }
}

function handleTileClick(tileIndex) {
  if (!state.running || !state.awaitingHit) {
    return;
  }

  if (tileIndex !== state.activeIndex) {
    setMessage('そこじゃないみたい。落ち着いて！', 'warning');
    return;
  }

  const tile = state.tiles[tileIndex];
  tile.classList.remove('active');
  tile.setAttribute('aria-pressed', 'false');

  state.awaitingHit = false;
  state.streak += 1;
  const points = BASE_POINTS + state.streak * STREAK_BONUS;
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

function resetState() {
  state.running = false;
  state.score = 0;
  state.misses = 0;
  state.timeLeft = GAME_DURATION;
  state.streak = 0;
  state.activeIndex = null;
  state.awaitingHit = false;
  clearInterval(state.timers.tick);
  clearTimeout(state.timers.spawn);
  updateScore();
  updateMisses();
  updateTime();
  resetBoardVisual();
  setMessage('スタートでゲーム開始！');
}

function startGame() {
  if (state.running) {
    return;
  }

  resetState();
  state.running = true;
  startButton.disabled = true;
  resetButton.disabled = false;
  setMessage('どんどん叩いていこう！', 'success');
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

  setMessage(text, keepScore ? 'success' : 'warning');
  startButton.disabled = false;
  resetButton.disabled = false;
}

function handleReset() {
  resetState();
  startButton.disabled = false;
  resetButton.disabled = true;
}

startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', handleReset);

createBoard();
resetState();
