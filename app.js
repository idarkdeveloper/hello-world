'use strict';

// ── Storage helpers ──────────────────────────────────────────────────────────
const store = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// ── State ────────────────────────────────────────────────────────────────────
let profile = store.get('ft_profile', null);
let dailyData = loadDailyData();
let reminderTimer = null;
let pedometerActive = false;
let lastAcc = null;
let stepThreshold = 12;
let stepCooldown = false;
let pedometerStepCount = 0;

function loadDailyData() {
  const today = todayKey();
  const saved = store.get('ft_daily', {});
  if (saved.date !== today) {
    return { date: today, steps: 0, foods: [] };
  }
  return saved;
}

function saveDailyData() {
  store.set('ft_daily', dailyData);
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

// ── Tips ─────────────────────────────────────────────────────────────────────
const TIPS = [
  "Walking 10,000 steps a day can burn ~400-500 calories.",
  "Drink water before meals to reduce calorie intake naturally.",
  "A 30-minute brisk walk improves cardiovascular health.",
  "Taking stairs instead of elevators adds ~100 steps per floor.",
  "Protein-rich breakfasts reduce hunger throughout the day.",
  "Even 5-minute walking breaks every hour helps reduce sedentary time.",
  "Consistent sleep improves metabolism and reduces cravings.",
  "Stretching for 5 minutes after a walk prevents muscle soreness.",
];

// ── BMR / TDEE / BMI calculations ────────────────────────────────────────────
function calcBMR(p) {
  if (!p) return null;
  // Mifflin-St Jeor
  if (p.gender === 'male') {
    return Math.round(10 * p.weight + 6.25 * p.height - 5 * p.age + 5);
  }
  return Math.round(10 * p.weight + 6.25 * p.height - 5 * p.age - 161);
}

function calcTDEE(p) {
  const bmr = calcBMR(p);
  return bmr ? Math.round(bmr * parseFloat(p.activity)) : null;
}

function calcBMI(p) {
  if (!p || !p.weight || !p.height) return null;
  return (p.weight / Math.pow(p.height / 100, 2)).toFixed(1);
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// Calories burned from steps (rough estimate)
function calBurnedFromSteps(steps, p) {
  if (!p) return 0;
  // ~0.04 kcal per step per kg (simplified)
  return Math.round(steps * 0.04 * (p.weight / 70));
}

// Distance from steps (assume 0.762m per step)
function distanceFromSteps(steps) {
  return (steps * 0.000762).toFixed(2);
}

// Active time from steps (assume ~100 steps/min walking)
function activeMinFromSteps(steps) {
  return Math.round(steps / 100);
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function showToast(msg, duration = 2800) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function setRingProgress(ringEl, pct) {
  const clamped = Math.min(100, Math.max(0, pct));
  ringEl.setAttribute('stroke-dasharray', `${clamped} ${100 - clamped}`);
}

// Big circle ring (circumference = 2π×54 ≈ 339.29)
function setBigRing(ringEl, pct) {
  const circ = 339.29;
  const clamped = Math.min(100, Math.max(0, pct));
  const dash = (clamped / 100) * circ;
  ringEl.setAttribute('stroke-dasharray', `${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`);
}

function fmt(n) { return Number(n).toLocaleString(); }

// ── Render ────────────────────────────────────────────────────────────────────
function renderAll() {
  renderDashboard();
  renderSteps();
  renderCalories();
  renderProfile();
}

function renderDashboard() {
  const steps = dailyData.steps;
  const goal = profile ? profile.stepGoal : 10000;
  const tdee = calcTDEE(profile);
  const taken = totalCalTaken();
  const stepPct = Math.min(100, Math.round((steps / goal) * 100));
  const calPct = tdee ? Math.min(100, Math.round((taken / tdee) * 100)) : 0;

  $('dashSteps').textContent = fmt(steps);
  setRingProgress($('stepsRing'), stepPct);
  $('stepsPct').textContent = stepPct + '%';

  $('dashCalNeeded').textContent = tdee ? fmt(tdee) : '--';
  $('dashCalTaken').textContent = fmt(taken);
  setRingProgress($('calRing'), calPct);
  $('calPct').textContent = calPct + '%';

  // Balance bar
  $('balNeeded').textContent = tdee ? fmt(tdee) + ' kcal' : '-- kcal';
  $('balTaken').textContent = fmt(taken) + ' kcal';
  const fill = $('balanceFill');
  if (tdee) {
    const pct = Math.min(110, (taken / tdee) * 100);
    fill.style.width = pct + '%';
    fill.classList.toggle('over', taken > tdee);
    const diff = Math.abs(tdee - taken);
    if (taken === 0) $('balanceMsg').textContent = `You haven't logged any food yet.`;
    else if (taken < tdee) $('balanceMsg').textContent = `${fmt(diff)} kcal remaining for today.`;
    else $('balanceMsg').textContent = `You're ${fmt(diff)} kcal over your goal today.`;
  } else {
    fill.style.width = '0%';
    $('balanceMsg').textContent = 'Set up your profile to see your calorie goal.';
  }

  // Reminder status
  $('dashReminderStatus').textContent = reminderTimer ? 'Active' : 'Off';

  // Tip
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
  $('tipText').textContent = tip;
}

function renderSteps() {
  const steps = dailyData.steps;
  const goal = profile ? profile.stepGoal : 10000;
  const pct = Math.min(100, (steps / goal) * 100);

  $('bigStepCount').textContent = fmt(steps);
  setBigRing($('bigStepsRing'), pct);
  $('stepGoalDisplay').textContent = fmt(goal);

  const remaining = Math.max(0, goal - steps);
  $('stepsRemaining').textContent = remaining > 0
    ? `${fmt(remaining)} more to go`
    : '🎉 Goal reached!';

  $('statDistance').textContent = distanceFromSteps(steps) + ' km';
  $('statCalBurned').textContent = calBurnedFromSteps(steps, profile) + ' kcal';
  $('statActiveMin').textContent = activeMinFromSteps(steps) + ' min';
}

function renderCalories() {
  const tdee = calcTDEE(profile);
  const taken = totalCalTaken();
  const burned = calBurnedFromSteps(dailyData.steps, profile);
  const remaining = tdee ? Math.max(0, tdee - taken) : null;
  const pct = tdee ? Math.min(100, (taken / tdee) * 100) : 0;

  $('bigCalTaken').textContent = fmt(taken);
  setBigRing($('bigCalRing'), pct);
  $('calNeededDisplay').textContent = tdee ? fmt(tdee) : '--';
  $('calRemainingDisplay').textContent = remaining !== null ? fmt(remaining) : '--';
  $('calBurnedDisplay').textContent = fmt(burned);

  renderFoodList();
}

function renderFoodList() {
  const list = $('foodList');
  const foods = dailyData.foods;

  if (!foods.length) {
    list.innerHTML = '<li class="food-empty">No food logged yet. Start adding meals above!</li>';
    $('foodTotal').textContent = '0 kcal';
    return;
  }

  list.innerHTML = foods.map((f, i) => `
    <li class="food-item">
      <div class="food-item-left">
        <span class="food-item-name">${escHtml(f.name)}</span>
        <span class="food-item-time">${f.time}</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="food-item-cal">${f.cal} kcal</span>
        <button class="food-item-del" data-idx="${i}" title="Remove">✕</button>
      </div>
    </li>`).join('');

  $('foodTotal').textContent = fmt(totalCalTaken()) + ' kcal';

  list.querySelectorAll('.food-item-del').forEach(btn => {
    btn.addEventListener('click', () => {
      dailyData.foods.splice(parseInt(btn.dataset.idx), 1);
      saveDailyData();
      renderCalories();
      renderDashboard();
    });
  });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function totalCalTaken() {
  return dailyData.foods.reduce((sum, f) => sum + f.cal, 0);
}

function renderProfile() {
  if (!profile) return;
  $('profileAge').value = profile.age || '';
  $('profileWeight').value = profile.weight || '';
  $('profileHeight').value = profile.height || '';
  $('profileGender').value = profile.gender || 'male';
  $('profileActivity').value = profile.activity || '1.55';
  $('profileStepGoal').value = profile.stepGoal || 10000;

  const bmr = calcBMR(profile);
  const tdee = calcTDEE(profile);
  const bmi = calcBMI(profile);

  $('profileBMR').textContent = bmr ? fmt(bmr) : '--';
  $('profileTDEE').textContent = tdee ? fmt(tdee) : '--';
  $('profileBMI').textContent = bmi || '--';
  $('profileBMIcat').textContent = bmi ? bmiCategory(parseFloat(bmi)) : '--';
  $('profileTagline').textContent = tdee ? `Daily goal: ${fmt(tdee)} kcal · ${fmt(profile.stepGoal)} steps` : 'Edit your profile below';
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  $('tab-' + name).classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${name}"]`).classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'steps') renderSteps();
  if (name === 'calories') renderCalories();
  if (name === 'profile') renderProfile();
}

// ── Profile Save ──────────────────────────────────────────────────────────────
function readProfileForm(ageId, weightId, heightId, genderId, actId, goalId) {
  const age = parseInt($(ageId).value);
  const weight = parseFloat($(weightId).value);
  const height = parseFloat($(heightId).value);
  const gender = $(genderId).value;
  const activity = $(actId).value;
  const stepGoal = parseInt($(goalId).value) || 10000;

  if (!age || !weight || !height) return null;
  return { age, weight, height, gender, activity, stepGoal };
}

function saveProfile(p) {
  profile = p;
  store.set('ft_profile', profile);
}

// ── Steps ─────────────────────────────────────────────────────────────────────
function addSteps(n) {
  n = parseInt(n);
  if (!n || n < 1) return;
  dailyData.steps += n;
  saveDailyData();
  renderDashboard();
  renderSteps();
  renderCalories();
}

// ── Pedometer (DeviceMotion) ──────────────────────────────────────────────────
function startPedometer() {
  if (!window.DeviceMotionEvent) {
    $('pedometerStatus').textContent = 'Device motion sensor not available. Use manual entry.';
    return;
  }

  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(perm => {
        if (perm === 'granted') listenMotion();
        else $('pedometerStatus').textContent = 'Motion permission denied. Use manual entry.';
      })
      .catch(() => $('pedometerStatus').textContent = 'Could not get motion permission.');
  } else {
    listenMotion();
  }
}

function listenMotion() {
  pedometerActive = true;
  $('togglePedometerBtn').textContent = '⏹ Stop Pedometer';
  $('pedometerStatus').textContent = 'Pedometer active — keep your device in your pocket or hand.';
  $('sensorIndicator').classList.add('active');
  window.addEventListener('devicemotion', onMotion);
}

function stopPedometer() {
  pedometerActive = false;
  $('togglePedometerBtn').textContent = '▶ Start Pedometer';
  $('pedometerStatus').textContent = 'Pedometer stopped.';
  $('sensorIndicator').classList.remove('active');
  window.removeEventListener('devicemotion', onMotion);
  lastAcc = null;
}

function onMotion(e) {
  const acc = e.accelerationIncludingGravity;
  if (!acc) return;

  const mag = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

  if (lastAcc !== null) {
    const delta = Math.abs(mag - lastAcc);
    if (delta > stepThreshold && !stepCooldown) {
      stepCooldown = true;
      addSteps(1);
      setTimeout(() => { stepCooldown = false; }, 300);
    }
  }
  lastAcc = mag;
}

// ── Food Log ──────────────────────────────────────────────────────────────────
function addFood(name, cal) {
  name = name.trim();
  cal = parseInt(cal);
  if (!name || !cal || cal < 1) { showToast('Enter a valid food name and calories.'); return; }
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  dailyData.foods.push({ name, cal, time });
  saveDailyData();
  renderCalories();
  renderDashboard();
  showToast(`Added ${name} (${cal} kcal)`);
}

// ── Walk Reminder ─────────────────────────────────────────────────────────────
function startReminder(intervalMin, message) {
  stopReminder();
  const ms = intervalMin * 60 * 1000;
  reminderTimer = setInterval(() => {
    fireReminder(message);
  }, ms);
  store.set('ft_reminder', { active: true, interval: intervalMin, message });
  showToast(`Reminder set for every ${intervalMin} min`);
  renderDashboard();
  updateReminderNote();
}

function stopReminder() {
  if (reminderTimer) { clearInterval(reminderTimer); reminderTimer = null; }
  store.set('ft_reminder', { active: false });
  renderDashboard();
  updateReminderNote();
}

function fireReminder(message) {
  // In-app log
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const log = $('reminderLog');
  const empty = log.querySelector('.food-empty');
  if (empty) empty.remove();
  const li = document.createElement('li');
  li.className = 'reminder-log-item';
  li.innerHTML = `<span>${escHtml(message)}</span><span class="log-time">${time}</span>`;
  log.insertBefore(li, log.firstChild);

  // Toast
  showToast('🚶 ' + message, 4000);

  // Browser notification
  if (Notification.permission === 'granted') {
    new Notification('FitTrack – Walk Reminder', {
      body: message,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏃</text></svg>',
    });
  }
}

function updateReminderNote() {
  const note = $('reminderNote');
  if (reminderTimer) {
    const interval = parseInt($('reminderInterval').value);
    note.textContent = `Reminders active every ${interval} minutes.`;
  } else {
    note.textContent = 'Reminders are off. Toggle to enable.';
  }
}

function checkNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    $('notifPermissionBox').style.display = 'block';
  }
}

// ── Date label ────────────────────────────────────────────────────────────────
function updateDateLabel() {
  const now = new Date();
  $('dateLabel').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

// ── Event Binding ─────────────────────────────────────────────────────────────
function bindEvents() {
  // Tab navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Setup modal save
  $('saveProfileBtn').addEventListener('click', () => {
    const p = readProfileForm('setupAge', 'setupWeight', 'setupHeight', 'setupGender', 'setupActivity', 'setupStepGoal');
    if (!p) { showToast('Please fill in all fields.'); return; }
    saveProfile(p);
    $('setupModal').classList.add('hidden');
    renderAll();
    showToast('Profile saved! 🎉');
  });

  // Profile tab save
  $('saveProfileBtnProfile').addEventListener('click', () => {
    const p = readProfileForm('profileAge', 'profileWeight', 'profileHeight', 'profileGender', 'profileActivity', 'profileStepGoal');
    if (!p) { showToast('Please fill in all fields.'); return; }
    saveProfile(p);
    renderAll();
    showToast('Profile updated!');
  });

  // Add steps manually
  $('addStepsBtn').addEventListener('click', () => {
    const val = $('manualSteps').value;
    if (val < 1) { showToast('Enter a valid step count.'); return; }
    addSteps(val);
    $('manualSteps').value = '';
    showToast(`Added ${fmt(val)} steps!`);
  });

  $('manualSteps').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('addStepsBtn').click();
  });

  // Pedometer toggle
  $('togglePedometerBtn').addEventListener('click', () => {
    if (pedometerActive) stopPedometer();
    else startPedometer();
  });

  // Reset steps
  $('resetStepsBtn').addEventListener('click', () => {
    if (!confirm('Reset today\'s steps to 0?')) return;
    dailyData.steps = 0;
    saveDailyData();
    renderDashboard();
    renderSteps();
    renderCalories();
    showToast('Steps reset.');
  });

  // Quick food chips
  document.querySelectorAll('.food-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      addFood(chip.dataset.name, chip.dataset.cal);
    });
  });

  // Add custom food
  $('addFoodBtn').addEventListener('click', () => {
    addFood($('foodName').value, $('foodCal').value);
    $('foodName').value = '';
    $('foodCal').value = '';
  });

  $('foodCal').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('addFoodBtn').click();
  });

  // Clear food log
  $('clearFoodBtn').addEventListener('click', () => {
    if (!dailyData.foods.length) return;
    if (!confirm('Clear all food entries for today?')) return;
    dailyData.foods = [];
    saveDailyData();
    renderCalories();
    renderDashboard();
    showToast('Food log cleared.');
  });

  // Reminder toggle
  $('reminderToggle').addEventListener('change', function () {
    if (this.checked) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') $('notifPermissionBox').style.display = 'none';
        });
      }
      startReminder(parseInt($('reminderInterval').value), $('reminderMessage').value || 'Time to walk!');
    } else {
      stopReminder();
      showToast('Reminder disabled.');
    }
  });

  $('reminderInterval').addEventListener('change', () => {
    if ($('reminderToggle').checked) {
      startReminder(parseInt($('reminderInterval').value), $('reminderMessage').value || 'Time to walk!');
    }
  });

  // Request notification permission
  $('requestNotifBtn').addEventListener('click', () => {
    Notification.requestPermission().then(p => {
      if (p === 'granted') {
        $('notifPermissionBox').style.display = 'none';
        showToast('Notifications enabled!');
      } else {
        showToast('Notifications blocked by browser.');
      }
    });
  });

  // Reset all data
  $('resetAllBtn').addEventListener('click', () => {
    if (!confirm('This will delete ALL your data including profile, steps, and food log. Continue?')) return;
    localStorage.clear();
    location.reload();
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  updateDateLabel();
  bindEvents();

  // Restore reminder state if active
  const savedReminder = store.get('ft_reminder', { active: false });
  if (savedReminder.active) {
    $('reminderToggle').checked = true;
    $('reminderInterval').value = savedReminder.interval || 30;
    $('reminderMessage').value = savedReminder.message || 'Time to walk!';
    startReminder(savedReminder.interval || 30, savedReminder.message || 'Time to walk!');
  }

  if (!profile) {
    $('setupModal').classList.remove('hidden');
    // Pre-fill setup form if partially saved
  } else {
    $('setupModal').classList.add('hidden');
    renderAll();
  }

  checkNotificationPermission();

  // Rotate tips every 30s
  setInterval(() => {
    $('tipText').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  }, 30000);

  // Auto-reset daily data at midnight
  scheduleDataReset();
}

function scheduleDataReset() {
  const now = new Date();
  const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
  setTimeout(() => {
    dailyData = { date: todayKey(), steps: 0, foods: [] };
    saveDailyData();
    renderAll();
    showToast('New day! Data reset for today.');
    scheduleDataReset();
  }, msToMidnight);
}

document.addEventListener('DOMContentLoaded', init);
