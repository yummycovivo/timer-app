// ═══════════════════════════════════════════════════════════════
//  Pomodoro Timer — Multi-Profile App
// ═══════════════════════════════════════════════════════════════

// ── Color palette for profiles ──────────────────────────────────
const PALETTE = [
  { hue: 0, label: 'Red', color: 'hsl(0, 85%, 62%)', glow: 'hsl(0, 90%, 55%)' },
  { hue: 25, label: 'Orange', color: 'hsl(25, 90%, 58%)', glow: 'hsl(25, 95%, 52%)' },
  { hue: 45, label: 'Amber', color: 'hsl(45, 90%, 55%)', glow: 'hsl(45, 95%, 48%)' },
  { hue: 150, label: 'Green', color: 'hsl(150, 70%, 50%)', glow: 'hsl(150, 80%, 45%)' },
  { hue: 190, label: 'Cyan', color: 'hsl(190, 80%, 55%)', glow: 'hsl(190, 85%, 48%)' },
  { hue: 220, label: 'Blue', color: 'hsl(220, 85%, 62%)', glow: 'hsl(220, 90%, 55%)' },
  { hue: 270, label: 'Purple', color: 'hsl(270, 70%, 62%)', glow: 'hsl(270, 80%, 55%)' },
  { hue: 330, label: 'Pink', color: 'hsl(330, 75%, 60%)', glow: 'hsl(330, 80%, 55%)' },
];

// ── Default preset profiles ────────────────────────────────────
const DEFAULT_PROFILES = [
  { id: 'pomodoro', name: 'Pomodoro', work: 25, short: 5, long: 20, sessions: 4, colorIdx: 0, preset: true },
  { id: 'deep-work', name: 'Deep Work', work: 90, short: 20, long: 30, sessions: 2, colorIdx: 6, preset: true },
  { id: '52-17', name: '52 / 17', work: 52, short: 17, long: 17, sessions: 3, colorIdx: 2, preset: true },
  { id: 'short-sprint', name: 'Short Sprint', work: 15, short: 3, long: 10, sessions: 6, colorIdx: 4, preset: true },
  { id: 'flowtime', name: 'Flowtime', work: 50, short: 10, long: 20, sessions: 3, colorIdx: 3, preset: true },
];

// ── Constants ───────────────────────────────────────────────────
const CIRCUMFERENCE = 2 * Math.PI * 154;
const PHASES = { WORK: 'work', SHORT: 'short', LONG: 'long' };
const STORAGE_KEY = 'timer_profiles';
const ACTIVE_KEY = 'timer_active_profile';
const THEME_KEY = 'timer_theme';

// ── State ───────────────────────────────────────────────────────
let profiles = [];
let activeProfileId = null;
let activeTheme = 'dark';
let phase = PHASES.WORK;
let totalSeconds = 0;
let secondsLeft = 0;
let isRunning = false;
let interval = null;
let sessionCount = 0;
let currentSession = 1;
let timeDelta = parseInt(localStorage.getItem('timer_time_delta')) || 15;

// Modal state
let editingProfileId = null; // null = creating, string = editing
let selectedColorIdx = 0;

// Context menu state
let contextProfileId = null;
let themeContextOpen = false;

// ── DOM References ──────────────────────────────────────────────
const $time = document.getElementById('timeText');
const $phase = document.getElementById('phaseLabel');
const $session = document.getElementById('sessionInfo');
const $ring = document.getElementById('ringProgress');
const $play = document.getElementById('btnPlay');
const $iconPlay = document.getElementById('iconPlay');
const $iconPause = document.getElementById('iconPause');
const $reset = document.getElementById('btnReset');
const $skip = document.getElementById('btnSkip');
const $btnAddTime = document.getElementById('btnAddTime');
const $btnRemoveTime = document.getElementById('btnRemoveTime');
const $dots = document.getElementById('sessionDots');
const $notification = document.getElementById('notification');
const $profileBar = document.getElementById('profileBar');

// Settings Modal
const $settingsToggle = document.getElementById('settingsToggle');
const $settingsOverlay = document.getElementById('settingsOverlay');
const $settingsTimeDelta = document.getElementById('settingsTimeDelta');
const $settingsCancel = document.getElementById('settingsCancel');
const $settingsSave = document.getElementById('settingsSave');

// Modal
const $modalOverlay = document.getElementById('modalOverlay');
const $modalTitle = document.getElementById('modalTitle');
const $modalName = document.getElementById('modalName');
const $modalWork = document.getElementById('modalWork');
const $modalShort = document.getElementById('modalShort');
const $modalLong = document.getElementById('modalLong');
const $modalSessions = document.getElementById('modalSessions');
const $colorSwatches = document.getElementById('colorSwatches');
const $modalCancel = document.getElementById('modalCancel');
const $modalSave = document.getElementById('modalSave');

// Context menu
const $ctx = document.getElementById('profileContext');
const $ctxEdit = document.getElementById('ctxEdit');
const $ctxDup = document.getElementById('ctxDuplicate');
const $ctxDelete = document.getElementById('ctxDelete');

// Theme Context
const $themeToggle = document.getElementById('themeToggle');
const $themeContext = document.getElementById('themeContext');
const $themeItems = document.querySelectorAll('.theme-context .profile-context-item');

// ── Persistence ─────────────────────────────────────────────────
function loadProfiles() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge: keep presets up-to-date, preserve custom profiles
      const customProfiles = parsed.filter(p => !p.preset);
      profiles = [...DEFAULT_PROFILES, ...customProfiles];
    } else {
      profiles = [...DEFAULT_PROFILES];
    }
  } catch {
    profiles = [...DEFAULT_PROFILES];
  }
  activeProfileId = localStorage.getItem(ACTIVE_KEY) || profiles[0].id;
  // Ensure active profile still exists
  if (!profiles.find(p => p.id === activeProfileId)) {
    activeProfileId = profiles[0].id;
  }

  activeTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(activeTheme);
}

function saveProfiles() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  localStorage.setItem(ACTIVE_KEY, activeProfileId);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  activeTheme = theme;
}

// ── Active profile helper ───────────────────────────────────────
function getActiveProfile() {
  return profiles.find(p => p.id === activeProfileId) || profiles[0];
}

// ── Profile bar rendering ───────────────────────────────────────
function renderProfileBar() {
  $profileBar.innerHTML = '';
  profiles.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'profile-tab' + (p.id === activeProfileId ? ' active' : '');
    const c = PALETTE[p.colorIdx] || PALETTE[0];
    btn.innerHTML = `<span class="profile-dot" style="background:${c.color}"></span>${p.name}`;
    btn.addEventListener('click', () => switchProfile(p.id));
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openContextMenu(e, p.id);
    });
    $profileBar.appendChild(btn);
  });

  // Add "+" button
  const addBtn = document.createElement('button');
  addBtn.className = 'profile-tab-add';
  addBtn.textContent = '+';
  addBtn.title = 'New profile';
  addBtn.addEventListener('click', () => openModal(null));
  $profileBar.appendChild(addBtn);
}

// ── Session dots rendering ──────────────────────────────────────
function renderDots() {
  const profile = getActiveProfile();
  $dots.innerHTML = '';
  for (let i = 0; i < profile.sessions; i++) {
    const dot = document.createElement('div');
    dot.className = 'session-dot';
    if (i < sessionCount) {
      dot.classList.add('completed');
    } else if (i === sessionCount && phase === PHASES.WORK) {
      dot.classList.add('active');
    }
    $dots.appendChild(dot);
  }
}

// ── Profile switching ───────────────────────────────────────────
function switchProfile(id) {
  if (id === activeProfileId && !isRunning) return;
  stopTimer();
  activeProfileId = id;
  const profile = getActiveProfile();
  applyProfileColors(profile);
  phase = PHASES.WORK;
  sessionCount = 0;
  currentSession = 1;
  totalSeconds = profile.work * 60;
  secondsLeft = totalSeconds;
  setPhaseUI();
  updateDisplay();
  renderProfileBar();
  renderDots();
  saveProfiles();
}

function applyProfileColors(profile) {
  const c = PALETTE[profile.colorIdx] || PALETTE[0];
  const root = document.documentElement.style;
  root.setProperty('--profile-hue', c.hue);
  root.setProperty('--profile-color', c.color);
  root.setProperty('--profile-glow', c.glow);
  root.setProperty('--work-hue', c.hue);
  root.setProperty('--work-color', c.color);
  root.setProperty('--work-glow', c.glow);
  // Reset accent to work color initially
  root.setProperty('--accent', c.color);
  root.setProperty('--accent-glow', c.glow);
  root.setProperty('--current-hue', c.hue);
}

// ── Ring ────────────────────────────────────────────────────────
$ring.style.strokeDasharray = CIRCUMFERENCE;

function updateRing() {
  const progress = secondsLeft / totalSeconds;
  const offset = CIRCUMFERENCE * progress;
  $ring.style.strokeDashoffset = CIRCUMFERENCE - offset;
}

// ── Display ────────────────────────────────────────────────────
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateDisplay() {
  $time.textContent = formatTime(secondsLeft);
  updateRing();
  const profile = getActiveProfile();
  document.title = `${formatTime(secondsLeft)} — ${profile.name}`;
}

function setPhaseUI() {
  const root = document.documentElement.style;
  const profile = getActiveProfile();
  const c = PALETTE[profile.colorIdx] || PALETTE[0];

  if (phase === PHASES.WORK) {
    $phase.textContent = 'FOCUS';
    root.setProperty('--accent', c.color);
    root.setProperty('--accent-glow', c.glow);
    root.setProperty('--current-hue', c.hue);
    $session.textContent = `SESSION ${currentSession} OF ${profile.sessions}`;
  } else if (phase === PHASES.SHORT) {
    $phase.textContent = 'SHORT BREAK';
    root.setProperty('--accent', 'var(--short-break-color)');
    root.setProperty('--accent-glow', 'var(--short-break-glow)');
    root.setProperty('--current-hue', 'var(--short-break-hue)');
    $session.textContent = 'RELAX';
  } else {
    $phase.textContent = 'LONG BREAK';
    root.setProperty('--accent', 'var(--long-break-color)');
    root.setProperty('--accent-glow', 'var(--long-break-glow)');
    root.setProperty('--current-hue', 'var(--long-break-hue)');
    $session.textContent = 'WELL DESERVED';
  }
  renderDots();
}

// ── Audio ──────────────────────────────────────────────────────
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.8);
    });
  } catch (e) { /* Audio not available */ }
}

// ── Notification toast ─────────────────────────────────────────
function showNotification(msg) {
  $notification.textContent = msg;
  $notification.classList.add('show');
  setTimeout(() => $notification.classList.remove('show'), 3000);
}

// ── Timer logic ────────────────────────────────────────────────
function tick() {
  if (secondsLeft <= 0) {
    stopTimer();
    playChime();
    advancePhase();
    return;
  }
  secondsLeft--;
  updateDisplay();
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  $iconPlay.style.display = 'none';
  $iconPause.style.display = 'block';
  interval = setInterval(tick, 1000);
}

function stopTimer() {
  isRunning = false;
  $iconPlay.style.display = 'block';
  $iconPause.style.display = 'none';
  clearInterval(interval);
  interval = null;
}

function resetTimer() {
  stopTimer();
  const profile = getActiveProfile();
  phase = PHASES.WORK;
  sessionCount = 0;
  currentSession = 1;
  totalSeconds = profile.work * 60;
  secondsLeft = totalSeconds;
  applyProfileColors(profile);
  setPhaseUI();
  updateDisplay();
}

function advancePhase() {
  const profile = getActiveProfile();
  if (phase === PHASES.WORK) {
    sessionCount++;
    if (sessionCount >= profile.sessions) {
      phase = PHASES.LONG;
      totalSeconds = profile.long * 60;
      showNotification('🎉 Great work! Time for a long break.');
    } else {
      phase = PHASES.SHORT;
      totalSeconds = profile.short * 60;
      showNotification('☕ Nice focus! Take a short break.');
    }
  } else {
    if (phase === PHASES.LONG) {
      sessionCount = 0;
      currentSession = 1;
    } else {
      currentSession = sessionCount + 1;
    }
    phase = PHASES.WORK;
    totalSeconds = profile.work * 60;
    showNotification('💪 Break over — let\'s focus!');
  }
  secondsLeft = totalSeconds;
  setPhaseUI();
  updateDisplay();
  startTimer();
}

function skipPhase() {
  stopTimer();
  advancePhase();
}

function addTime() {
  totalSeconds += timeDelta;
  secondsLeft += timeDelta;
  updateDisplay();
  showNotification(`+${timeDelta}s`);
}

function removeTime() {
  if (secondsLeft <= timeDelta) {
    secondsLeft = 0;
    tick();
  } else {
    secondsLeft -= timeDelta;
    totalSeconds -= timeDelta;
    updateDisplay();
    showNotification(`-${timeDelta}s`);
  }
}

// ── Context menu ───────────────────────────────────────────────
function openContextMenu(e, profileId) {
  contextProfileId = profileId;
  const profile = profiles.find(p => p.id === profileId);
  // Hide delete for presets
  $ctxDelete.style.display = profile.preset ? 'none' : 'block';
  $ctx.style.top = e.clientY + 'px';
  $ctx.style.left = e.clientX + 'px';
  $ctx.classList.add('open');
}

function closeContextMenu() {
  $ctx.classList.remove('open');
  contextProfileId = null;
}

$ctxEdit.addEventListener('click', () => {
  openModal(contextProfileId);
  closeContextMenu();
});

$ctxDup.addEventListener('click', () => {
  const src = profiles.find(p => p.id === contextProfileId);
  if (!src) return;
  const dup = {
    id: 'custom-' + Date.now(),
    name: src.name + ' Copy',
    work: src.work,
    short: src.short,
    long: src.long,
    sessions: src.sessions,
    colorIdx: src.colorIdx,
    preset: false,
  };
  profiles.push(dup);
  saveProfiles();
  switchProfile(dup.id);
  closeContextMenu();
});

$ctxDelete.addEventListener('click', () => {
  const profile = profiles.find(p => p.id === contextProfileId);
  if (!profile || profile.preset) return;
  profiles = profiles.filter(p => p.id !== contextProfileId);
  if (activeProfileId === contextProfileId) {
    switchProfile(profiles[0].id);
  }
  saveProfiles();
  renderProfileBar();
  closeContextMenu();
});

// Theme context menu
$themeToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  themeContextOpen = !themeContextOpen;
  if (themeContextOpen) {
    $themeContext.classList.add('open');
    closeContextMenu();
  } else {
    $themeContext.classList.remove('open');
  }
});

$themeItems.forEach(item => {
  item.addEventListener('click', (e) => {
    applyTheme(e.target.dataset.theme);
    $themeContext.classList.remove('open');
    themeContextOpen = false;
  });
});

document.addEventListener('click', (e) => {
  if (!$ctx.contains(e.target)) {
    closeContextMenu();
  }
  if (!$themeContext.contains(e.target) && !$themeToggle.contains(e.target)) {
    $themeContext.classList.remove('open');
    themeContextOpen = false;
  }
});

// ── Modal ──────────────────────────────────────────────────────
function renderColorSwatches() {
  $colorSwatches.innerHTML = '';
  PALETTE.forEach((c, i) => {
    const swatch = document.createElement('button');
    swatch.className = 'color-swatch' + (i === selectedColorIdx ? ' selected' : '');
    swatch.style.background = c.color;
    swatch.title = c.label;
    swatch.addEventListener('click', () => {
      selectedColorIdx = i;
      renderColorSwatches();
    });
    $colorSwatches.appendChild(swatch);
  });
}

function openModal(profileId) {
  editingProfileId = profileId;
  if (profileId) {
    const p = profiles.find(pr => pr.id === profileId);
    if (!p) return;
    $modalTitle.textContent = p.preset ? `Edit ${p.name}` : 'Edit Profile';
    $modalName.value = p.name;
    $modalWork.value = p.work;
    $modalShort.value = p.short;
    $modalLong.value = p.long;
    $modalSessions.value = p.sessions;
    selectedColorIdx = p.colorIdx;
    // Presets: lock name field
    $modalName.disabled = p.preset;
  } else {
    $modalTitle.textContent = 'New Profile';
    $modalName.value = '';
    $modalWork.value = 25;
    $modalShort.value = 5;
    $modalLong.value = 20;
    $modalSessions.value = 4;
    selectedColorIdx = 0;
    $modalName.disabled = false;
  }
  renderColorSwatches();
  $modalOverlay.classList.add('open');
  if (!$modalName.disabled) {
    setTimeout(() => $modalName.focus(), 100);
  }
}

function closeModal() {
  $modalOverlay.classList.remove('open');
  editingProfileId = null;
}

$modalCancel.addEventListener('click', closeModal);
$modalOverlay.addEventListener('click', (e) => {
  if (e.target === $modalOverlay) closeModal();
});

$modalSave.addEventListener('click', () => {
  const name = $modalName.value.trim() || 'Untitled';
  const work = Math.max(1, parseInt($modalWork.value) || 25);
  const short = Math.max(1, parseInt($modalShort.value) || 5);
  const long = Math.max(1, parseInt($modalLong.value) || 20);
  const sessions = Math.max(1, parseInt($modalSessions.value) || 4);

  if (editingProfileId) {
    // Editing existing
    const idx = profiles.findIndex(p => p.id === editingProfileId);
    if (idx >= 0) {
      if (!profiles[idx].preset) {
        profiles[idx].name = name;
      }
      profiles[idx].work = work;
      profiles[idx].short = short;
      profiles[idx].long = long;
      profiles[idx].sessions = sessions;
      profiles[idx].colorIdx = selectedColorIdx;
    }
    saveProfiles();
    if (editingProfileId === activeProfileId) {
      switchProfile(activeProfileId);
    } else {
      renderProfileBar();
    }
  } else {
    // Creating new
    const newProfile = {
      id: 'custom-' + Date.now(),
      name,
      work,
      short,
      long,
      sessions,
      colorIdx: selectedColorIdx,
      preset: false,
    };
    profiles.push(newProfile);
    saveProfiles();
    switchProfile(newProfile.id);
  }
  closeModal();
});

// ── Event Listeners ────────────────────────────────────────────
$play.addEventListener('click', () => isRunning ? stopTimer() : startTimer());
$reset.addEventListener('click', resetTimer);
$skip.addEventListener('click', skipPhase);
$btnAddTime.addEventListener('click', addTime);
$btnRemoveTime.addEventListener('click', removeTime);

$settingsToggle.addEventListener('click', () => {
  $settingsTimeDelta.value = timeDelta;
  $settingsOverlay.classList.add('open');
});

function closeSettings() {
  $settingsOverlay.classList.remove('open');
}

$settingsCancel.addEventListener('click', closeSettings);
$settingsOverlay.addEventListener('click', (e) => {
  if (e.target === $settingsOverlay) closeSettings();
});

$settingsSave.addEventListener('click', () => {
  const val = parseInt($settingsTimeDelta.value);
  if (!isNaN(val) && val > 0) {
    timeDelta = val;
    localStorage.setItem('timer_time_delta', timeDelta);
  }
  closeSettings();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Don't capture keys when modal is open or typing in input
  if ($modalOverlay.classList.contains('open') || $settingsOverlay.classList.contains('open')) {
    if (e.code === 'Escape') { closeModal(); closeSettings(); }
    return;
  }
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); isRunning ? stopTimer() : startTimer(); }
  if (e.code === 'KeyR') resetTimer();
  if (e.code === 'KeyS') skipPhase();
  if (e.code === 'Escape') closeContextMenu();
});

// ── Init ───────────────────────────────────────────────────────
loadProfiles();
const initialProfile = getActiveProfile();
applyProfileColors(initialProfile);
totalSeconds = initialProfile.work * 60;
secondsLeft = totalSeconds;
renderProfileBar();
setPhaseUI();
updateDisplay();
