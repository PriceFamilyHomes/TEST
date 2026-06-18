/* ── Constants ──────────────────────────────────────────── */
const DIFF_TIME  = { easy: 30, medium: 15, hard: 5 };
const QUESTIONS_PER_ROUND = 10;
const RING_CIRC    = 113.1;    // 2πr for r=18
// Scoring: exponential decay — 100 at 0 km, ~37 at 3000 km, ~1 at 15000 km
const SCORE_DECAY_KM = 3000;

/* ── State ──────────────────────────────────────────────── */
let map, difficulty, questions, currentIdx, score;
let timerInterval, timeLeft, totalTime;
let results = [];
let guessMarker, answerMarker;
let answered = false;

/* ── DOM refs ───────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const splash     = $('splash');
const hud        = $('hud');
const mapEl      = $('map');
const resultsEl  = $('results');
const feedback   = $('feedback');
const scoreEl    = $('score');
const clueText   = $('clue-text');
const questionNum= $('question-num');
const timerNum   = $('timer-num');
const ringFg     = $('ring-progress');

/* ── Difficulty selection ───────────────────────────────── */
document.querySelectorAll('.btn-diff').forEach(btn => {
  btn.addEventListener('click', () => {
    difficulty = btn.dataset.diff;
    startGame();
  });
});
$('btn-quit').addEventListener('click', endGame);
$('btn-play-again').addEventListener('click', () => {
  showScreen('splash');
  setTimeout(() => startGame(), 0);   // re-use same difficulty
});
$('btn-change-diff').addEventListener('click', () => showScreen('splash'));

/* ── Map init ───────────────────────────────────────────── */
function initMap() {
  if (map) return;
  map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 10,
    worldCopyJump: true,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  map.on('click', onMapClick);
}

/* ── Game flow ──────────────────────────────────────────── */
function startGame() {
  score = 0; currentIdx = 0; results = [];
  questions = getShuffledQuestions(QUESTIONS_PER_ROUND);
  showScreen('game');
  scoreEl.textContent = '0';
  initMap();
  setTimeout(() => { map.invalidateSize(); loadQuestion(); }, 50);
}

function loadQuestion() {
  answered = false;
  clearMarkers();
  const q = questions[currentIdx];
  questionNum.textContent = `Q${currentIdx + 1} / ${questions.length}`;
  clueText.textContent = q.clue;
  totalTime = DIFF_TIME[difficulty];
  timeLeft  = totalTime;
  updateTimerDisplay(timeLeft, totalTime);
  startTimer();
}

function distanceScore(km) {
  return Math.max(1, Math.round(100 * Math.exp(-km / SCORE_DECAY_KM)));
}

function scoreClass(pts) {
  if (pts >= 75) return 'guess-marker';    // green
  if (pts >= 40) return 'warn-marker';     // orange
  return 'wrong-marker';                   // red
}

function onMapClick(e) {
  if (answered) return;
  answered = true;
  stopTimer();

  const q = questions[currentIdx];
  const dist = haversineKm(e.latlng.lat, e.latlng.lng, q.lat, q.lng);
  const pts  = distanceScore(dist);
  const distRounded = Math.round(dist);

  guessMarker  = placeMarker(e.latlng.lat, e.latlng.lng, scoreClass(pts));
  answerMarker = placeMarker(q.lat, q.lng, 'answer-marker');

  L.polyline([[e.latlng.lat, e.latlng.lng], [q.lat, q.lng]], {
    color: '#6b7280', weight: 2, dashArray: '6,4', opacity: .7
  }).addTo(map);

  score += pts;
  scoreEl.textContent = score;

  results.push({ label: q.label, pts, dist: distRounded, timedOut: false });

  const distLabel = distRounded === 0 ? 'Perfect!' : `${distRounded.toLocaleString()} km away`;
  const fbClass   = pts >= 75 ? 'correct' : pts >= 40 ? 'warn' : 'wrong';
  showFeedback(`${pts}/100  —  ${distLabel}`, fbClass);

  setTimeout(nextQuestion, 2000);
}

function onTimeout() {
  if (answered) return;
  answered = true;
  const q = questions[currentIdx];
  answerMarker = placeMarker(q.lat, q.lng, 'answer-marker');
  results.push({ label: q.label, pts: 0, dist: null, timedOut: true });
  showFeedback('⏱ Time\'s up! — 0/100', 'timeout');
  setTimeout(nextQuestion, 2000);
}

function nextQuestion() {
  hideFeedback();
  currentIdx++;
  if (currentIdx >= questions.length) {
    endGame();
  } else {
    map.flyTo([20, 0], 2, { duration: .6 });
    setTimeout(loadQuestion, 650);
  }
}

function endGame() {
  stopTimer();
  showScreen('results');
  renderResults();
}

/* ── Timer ──────────────────────────────────────────────── */
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 0.1);
    updateTimerDisplay(timeLeft, totalTime);
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      onTimeout();
    }
  }, 100);
}

function stopTimer() { clearInterval(timerInterval); }

function updateTimerDisplay(left, total) {
  const pct = left / total;
  const offset = RING_CIRC * (1 - pct);
  ringFg.style.strokeDashoffset = offset;
  timerNum.textContent = Math.ceil(left);

  // Color coding
  const warn   = pct < .5;
  const danger = pct < .25;
  ringFg.classList.toggle('warn',   warn && !danger);
  ringFg.classList.toggle('danger', danger);
  timerNum.classList.toggle('warn',   warn && !danger);
  timerNum.classList.toggle('danger', danger);
}

/* ── Feedback ───────────────────────────────────────────── */
function showFeedback(msg, type) {
  feedback.textContent = msg;
  feedback.className   = type;
  feedback.style.opacity = '1';
}
function hideFeedback() {
  feedback.style.opacity = '0';
  setTimeout(() => { feedback.className = 'hidden'; }, 300);
}

/* ── Markers ────────────────────────────────────────────── */
function placeMarker(lat, lng, cls) {
  const icon = L.divIcon({ className: `pulse-marker ${cls}`, iconSize: [16, 16], iconAnchor: [8, 8] });
  return L.marker([lat, lng], { icon }).addTo(map);
}
function clearMarkers() {
  if (guessMarker)  map.removeLayer(guessMarker);
  if (answerMarker) map.removeLayer(answerMarker);
  guessMarker = answerMarker = null;
  // Remove polylines
  map.eachLayer(l => { if (l instanceof L.Polyline) map.removeLayer(l); });
}

/* ── Results screen ─────────────────────────────────────── */
function renderResults() {
  const maxScore = questions.length * 100;
  $('final-score-display').textContent = `${score} / ${maxScore}`;
  const list = $('result-list');
  list.innerHTML = '';
  results.forEach(r => {
    const div = document.createElement('div');
    let cls, distLabel;
    if (r.timedOut) {
      cls = 'ri-timeout'; distLabel = 'Timed out';
    } else if (r.pts >= 75) {
      cls = 'ri-correct'; distLabel = r.dist === 0 ? 'Perfect!' : `${r.dist.toLocaleString()} km away`;
    } else if (r.pts >= 40) {
      cls = 'ri-warn';    distLabel = `${r.dist.toLocaleString()} km away`;
    } else {
      cls = 'ri-wrong';   distLabel = `${r.dist.toLocaleString()} km away`;
    }
    div.className = `result-item ${cls}`;
    div.innerHTML = `<span class="ri-score">${r.timedOut ? '0' : r.pts}<small>/100</small></span><span>${r.label}</span><span class="ri-dist">${distLabel}</span>`;
    list.appendChild(div);
  });
}

/* ── Screen management ──────────────────────────────────── */
function showScreen(screen) {
  splash.classList.add('hidden');
  hud.classList.add('hidden');
  mapEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  feedback.className = 'hidden';

  if (screen === 'splash') {
    splash.classList.remove('hidden');
  } else if (screen === 'game') {
    hud.classList.remove('hidden');
    mapEl.classList.remove('hidden');
  } else if (screen === 'results') {
    resultsEl.classList.remove('hidden');
  }
}

/* ── Haversine distance ─────────────────────────────────── */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
