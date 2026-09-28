const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// --- Tiny JSON "database" ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'please-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));

function requireLoginPage(req, res, next) {
  if (req.session && req.session.username) return next();
  return res.redirect('/');
}
function requireLoginApi(req, res, next) {
  if (req.session && req.session.username) return next();
  return res.status(401).json({ error: 'Not logged in.' });
}

// --- Auth API ---
app.post('/api/signup', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || username.trim().length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Username needs 3+ characters and password needs 4+ characters.' });
  }
  const key = username.trim().toLowerCase();
  const db = readDB();
  if (db.users[key]) {
    return res.status(400).json({ error: 'That username is already taken.' });
  }
  db.users[key] = {
    username: username.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    scores: { dino: 0, snake: 0 }
  };
  writeDB(db);
  req.session.username = key;
  res.json({ success: true, username: db.users[key].username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const key = (username || '').trim().toLowerCase();
  const db = readDB();
  const user = db.users[key];
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  req.session.username = key;
  res.json({ success: true, username: user.username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/session', (req, res) => {
  if (req.session && req.session.username) {
    const db = readDB();
    const user = db.users[req.session.username];
    if (user) return res.json({ loggedIn: true, username: user.username, scores: user.scores });
  }
  res.json({ loggedIn: false });
});

// --- Score API ---
app.post('/api/scores', requireLoginApi, (req, res) => {
  const { game, score } = req.body || {};
  if (!['dino', 'snake'].includes(game) || typeof score !== 'number' || isNaN(score)) {
    return res.status(400).json({ error: 'Invalid score submission.' });
  }
  const db = readDB();
  const user = db.users[req.session.username];
  const rounded = Math.max(0, Math.floor(score));
  if (rounded > (user.scores[game] || 0)) {
    user.scores[game] = rounded;
    writeDB(db);
  }
  res.json({ success: true, scores: user.scores });
});

// --- Protected pages (must be logged in) ---
app.get(['/dashboard.html', '/dino.html', '/snake.html'], requireLoginPage, (req, res, next) => {
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
