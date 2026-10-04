const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const msg = document.getElementById('msg');
const bestScoreEl = document.getElementById('bestScore');

const GRID = 20; // 20x20 cells
const CELL = canvas.width / GRID;

let snake, dir, nextDir, food, score, running, gameOver, bestScore, tickMs, timer;

function resetGame() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  running = false;
  gameOver = false;
  tickMs = 130;
  placeFood();
  msg.textContent = 'Press any arrow key to start';
}

function loadBest() {
  fetch('/api/session').then(r => r.json()).then(d => {
    bestScore = (d.scores && d.scores.snake) || 0;
    bestScoreEl.textContent = bestScore;
  });
}

function placeFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Food
  ctx.fillStyle = '#ea4335';
  ctx.fillRect(food.x * CELL, food.y * CELL, CELL, CELL);

  // Snake
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#34a853' : '#4285f4';
    ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
  });

  // Score
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '14px monospace';
  ctx.fillText('Score: ' + score, 10, 16);
}

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    return endGame();
  }
  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    placeFood();
    tickMs = Math.max(60, tickMs - 2);
    restartTimer();
  } else {
    snake.pop();
  }

  draw();
}

function restartTimer() {
  clearInterval(timer);
  timer = setInterval(step, tickMs);
}

function startGame() {
  running = true;
  msg.textContent = '';
  restartTimer();
}

function endGame() {
  running = false;
  gameOver = true;
  clearInterval(timer);
  msg.textContent = `Game over! Score: ${score} — press any arrow key to retry`;
  if (score > bestScore) {
    bestScore = score;
    bestScoreEl.textContent = bestScore;
  }
  fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: 'snake', score })
  });
}

const KEYS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};

document.addEventListener('keydown', (e) => {
  if (!KEYS[e.code.replace('Key', '')] && !KEYS[e.code]) return;
  const wanted = KEYS[e.code];
  if (!wanted) return;
  e.preventDefault();

  if (gameOver) {
    resetGame();
    draw();
    startGame();
    return;
  }
  if (!running) {
    nextDir = wanted;
    startGame();
    return;
  }
  // prevent reversing directly into itself
  if (wanted.x === -dir.x && wanted.y === -dir.y) return;
  nextDir = wanted;
});

resetGame();
draw();
loadBest();
