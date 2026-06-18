/* ── Constants ──────────────────────────────────────────── */
const DIFF_TIME       = { easy: 30, medium: 15, hard: 5 };
const QUESTIONS_PER_ROUND = 10;
const RING_CIRC       = 113.1;
const SCORE_DECAY_KM  = 3000;

/* ── State ──────────────────────────────────────────────── */
let globe, difficulty, questions, currentIdx, score;
let timerInterval, timeLeft, totalTime;
let results = [];
let answered = false;

/* ── DOM refs ───────────────────────────────────────────── */
const $  = id => document.getElementById(id);
const splash    = $('splash');
const hud       = $('hud');
const resultsEl = $('results');
const feedback  = $('feedback');
const scoreEl   = $('score');
const clueText  = $('clue-text');
const questionNum = $('question-num');
const timerNum  = $('timer-num');
const ringFg    = $('ring-progress');

/* ── Globe init ─────────────────────────────────────────── */
function initGlobe() {
  if (globe) return;

  globe = Globe({ animateIn: true })
    .width(window.innerWidth)
    .height(window.innerHeight)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor('#4488ff')
    .atmosphereAltitude(0.18)
    .globeImageUrl('earth.jpg')
    .pointsData([])
    .pointLat('lat')
    .pointLng('lng')
    .pointColor('color')
    .pointRadius('radius')
    .pointAltitude(0.005)
    .pointResolution(12)
    .arcsData([])
    .arcColor('color')
    .arcStroke(0.6)
    .arcDashLength(0.5)
    .arcDashGap(0.25)
    .arcDashAnimateTime(2000)
    .onGlobeClick(({ lat, lng }) => onGlobeClick(lat, lng))
    ($('globe-container'));

  // Auto-rotate gently on splash
  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.6;
  globe.controls().enableZoom = true;
  globe.controls().minDistance = 150;

  window.addEventListener('resize', () => {
    globe.width(window.innerWidth).height(window.innerHeight);
  });
}

/* ── Difficulty buttons ─────────────────────────────────── */
document.querySelectorAll('.btn-diff').forEach(btn => {
  btn.addEventListener('click', () => {
    difficulty = btn.dataset.diff;
    startGame();
  });
});
$('btn-quit').addEventListener('click', endGame);
$('btn-play-again').addEventListener('click', () => startGame());
$('btn-change-diff').addEventListener('click', () => showScreen('splash'));

/* ── Game flow ──────────────────────────────────────────── */
function startGame() {
  score = 0; currentIdx = 0; results = [];
  questions = getShuffledQuestions(QUESTIONS_PER_ROUND);
  scoreEl.textContent = '0';
  showScreen('game');
  initGlobe();
  // Stop rotation while playing
  globe.controls().autoRotate = false;
  loadQuestion();
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

function onGlobeClick(lat, lng) {
  if (answered) return;
  answered = true;
  stopTimer();

  const q   = questions[currentIdx];
  const dist = haversineKm(lat, lng, q.lat, q.lng);
  const pts  = distanceScore(dist);
  const dr   = Math.round(dist);

  // Guess marker colour reflects accuracy
  const gColor = pts >= 75 ? '#27ae60' : pts >= 40 ? '#e67e22' : '#e74c3c';
  const answerColor = '#ffffff';

  globe
    .pointsData([
      { lat, lng, color: gColor,     radius: 0.5 },
      { lat: q.lat, lng: q.lng, color: answerColor, radius: 0.5 },
    ])
    .arcsData([{
      startLat: lat, startLng: lng,
      endLat: q.lat, endLng: q.lng,
      color: ['rgba(150,150,150,0.7)', 'rgba(150,150,150,0.7)'],
    }]);

  // Fly to show both points
  const midLat = (lat + q.lat) / 2;
  const midLng = midLng_(lng, q.lng);
  globe.pointOfView({ lat: midLat, lng: midLng, altitude: altitudeForDist(dist) }, 800);

  score += pts;
  scoreEl.textContent = score;

  const distLabel = dr < 2 ? 'Perfect!' : `${dr.toLocaleString()} km away`;
  const fbClass   = pts >= 75 ? 'correct' : pts >= 40 ? 'warn' : 'wrong';
  showFeedback(`${scoreEmoji(pts)} ${pts}/100 — ${distLabel}`, fbClass);

  results.push({ label: q.label, pts, dist: dr, timedOut: false });
  setTimeout(nextQuestion, 2200);
}

function onTimeout() {
  if (answered) return;
  answered = true;

  const q = questions[currentIdx];
  globe
    .pointsData([{ lat: q.lat, lng: q.lng, color: '#ffffff', radius: 0.5 }])
    .arcsData([]);
  globe.pointOfView({ lat: q.lat, lng: q.lng, altitude: 2.0 }, 800);

  results.push({ label: q.label, pts: 0, dist: null, timedOut: true });
  showFeedback('⏱ Time\'s up! — 0/100', 'timeout');
  setTimeout(nextQuestion, 2200);
}

function nextQuestion() {
  hideFeedback();
  currentIdx++;
  if (currentIdx >= questions.length) {
    endGame();
  } else {
    // Slow zoom-out between questions
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 600);
    setTimeout(loadQuestion, 700);
  }
}

function endGame() {
  stopTimer();
  clearMarkers();
  globe.controls().autoRotate = true;
  showScreen('results');
  renderResults();
}

/* ── Timer ──────────────────────────────────────────────── */
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 0.1);
    updateTimerDisplay(timeLeft, totalTime);
    if (timeLeft <= 0) { clearInterval(timerInterval); onTimeout(); }
  }, 100);
}
function stopTimer() { clearInterval(timerInterval); }

function updateTimerDisplay(left, total) {
  const pct = left / total;
  ringFg.style.strokeDashoffset = RING_CIRC * (1 - pct);
  timerNum.textContent = Math.ceil(left);
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
function clearMarkers() {
  globe && globe.pointsData([]).arcsData([]);
}

/* ── Scoring ────────────────────────────────────────────── */
function distanceScore(km) {
  return Math.max(1, Math.round(100 * Math.exp(-km / SCORE_DECAY_KM)));
}
function scoreEmoji(pts) {
  if (pts === 100) return '💯';
  if (pts >= 90)   return '🤩';
  if (pts >= 75)   return '😄';
  if (pts >= 60)   return '😊';
  if (pts >= 45)   return '🙂';
  if (pts >= 30)   return '😐';
  if (pts >= 15)   return '😕';
  return '😢';
}

/* ── Results ────────────────────────────────────────────── */
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
      cls = 'ri-correct'; distLabel = r.dist < 2 ? 'Perfect!' : `${r.dist.toLocaleString()} km away`;
    } else if (r.pts >= 40) {
      cls = 'ri-warn';    distLabel = `${r.dist.toLocaleString()} km away`;
    } else {
      cls = 'ri-wrong';   distLabel = `${r.dist.toLocaleString()} km away`;
    }
    const emoji = r.timedOut ? '⏱️' : scoreEmoji(r.pts);
    div.className = `result-item ${cls}`;
    div.innerHTML = `<span class="ri-score"><span class="ri-emoji">${emoji}</span>${r.timedOut ? 0 : r.pts}<small>/100</small></span><span>${r.label}</span><span class="ri-dist">${distLabel}</span>`;
    list.appendChild(div);
  });
}

/* ── Screen management ──────────────────────────────────── */
function showScreen(screen) {
  splash.classList.add('hidden');
  hud.classList.add('hidden');
  resultsEl.classList.add('hidden');
  feedback.className = 'hidden';

  if (screen === 'splash')  { splash.classList.remove('hidden'); }
  else if (screen === 'game')    { hud.classList.remove('hidden'); }
  else if (screen === 'results') { resultsEl.classList.remove('hidden'); }
}

/* ── Helpers ────────────────────────────────────────────── */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function midLng_(a, b) {
  // handle anti-meridian wrap
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return a + d / 2;
}

function altitudeForDist(km) {
  // zoom in tight for close, farther for far
  if (km < 200)   return 0.8;
  if (km < 800)   return 1.2;
  if (km < 3000)  return 1.8;
  return 2.5;
}

/* ── Boot ───────────────────────────────────────────────── */
initGlobe();
