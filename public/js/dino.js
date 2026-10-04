const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const msg = document.getElementById('msg');
const bestScoreEl = document.getElementById('bestScore');

const GROUND_Y = 160;
const GRAVITY = 0.6;
const JUMP_VELOCITY = -11;

let dino, obstacles, speed, score, running, gameOver, animFrame, bestScore;

function resetGame() {
  dino = { x: 50, y: GROUND_Y - 40, w: 30, h: 40, vy: 0, jumping: false };
  obstacles = [];
  speed = 6;
  score = 0;
  running = false;
  gameOver = false;
  msg.textContent = 'Press Space or ↑ to start';
}

function loadBest() {
  fetch('/api/session').then(r => r.json()).then(d => {
    bestScore = (d.scores && d.scores.dino) || 0;
    bestScoreEl.textContent = bestScore;
  });
}

function spawnObstacle() {
  const h = 20 + Math.random() * 25;
  obstacles.push({ x: canvas.width, y: GROUND_Y - h, w: 16 + Math.random() * 10, h });
}

let spawnTimer = 0;

function update() {
  if (!running) return;

  // Physics
  dino.vy += GRAVITY;
  dino.y += dino.vy;
  if (dino.y > GROUND_Y - dino.h) {
    dino.y = GROUND_Y - dino.h;
    dino.vy = 0;
    dino.jumping = false;
  }

  // Obstacles
  spawnTimer--;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = 60 + Math.random() * 60 - Math.min(speed * 3, 40);
  }
  obstacles.forEach(o => o.x -= speed);
  obstacles = obstacles.filter(o => o.x + o.w > 0);

  // Collision
  for (const o of obstacles) {
    if (
      dino.x < o.x + o.w &&
      dino.x + dino.w > o.x &&
      dino.y < o.y + o.h &&
      dino.y + dino.h > o.y
    ) {
      endGame();
      return;
    }
  }

  score += 0.15;
  speed += 0.002;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ground
  ctx.strokeStyle = '#555';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvas.width, GROUND_Y);
  ctx.stroke();

  // Dino
  ctx.fillStyle = '#4285f4';
  ctx.fillRect(dino.x, dino.y, dino.w, dino.h);

  // Obstacles
  ctx.fillStyle = '#e8eaed';
  obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));

  // Score
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '16px monospace';
  ctx.fillText('Score: ' + Math.floor(score), canvas.width - 130, 24);
}

function loop() {
  update();
  draw();
  if (!gameOver) animFrame = requestAnimationFrame(loop);
}

function jump() {
  if (gameOver) {
    resetGame();
    startGame();
    return;
  }
  if (!running) {
    startGame();
    return;
  }
  if (!dino.jumping) {
    dino.vy = JUMP_VELOCITY;
    dino.jumping = true;
  }
}

function startGame() {
  running = true;
  msg.textContent = '';
  loop();
}

function endGame() {
  running = false;
  gameOver = true;
  cancelAnimationFrame(animFrame);
  const finalScore = Math.floor(score);
  msg.textContent = `Game over! Score: ${finalScore} — press Space to retry`;
  if (finalScore > bestScore) {
    bestScore = finalScore;
    bestScoreEl.textContent = bestScore;
  }
  fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: 'dino', score: finalScore })
  });
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    jump();
  }
});
canvas.addEventListener('mousedown', jump);

resetGame();
draw();
loadBest();
