/* ═══════════════════════════════════════════════════
   RULETA REGALONA — app.js
   ═══════════════════════════════════════════════════ */

'use strict';

// ════════════════════ ESTADO GLOBAL ════════════════════
const state = {
  participants: [],
  prizes: [],
  prizeAssignments: [], // Array de ganadores pre-asignados a cada índice de state.prizes ('' = al azar)
  accessPin: localStorage.getItem('ruleta_admin_pin') || '140509',
  history: [],
  spinning: false,
  palette: 'rainbow',
  bg: 'gradient1',
  spinDuration: 6,
  removeWinner: true,
  removePrize: true,
  soundEnabled: true,
  confettiEnabled: true,
  totalSpins: 0,
  // Wheel state
  currentAngle: 0,
  winnerMsg: '¡Felicitaciones, ganaste!',
};

// ════════════════════ PALETAS ════════════════════
const PALETTES = {
  rainbow: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e91e63', '#ff5722', '#00bcd4', '#8bc34a', '#ff9800'],
  neon: ['#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff6600', '#ff0099', '#00ff99', '#9900ff', '#ff3300', '#00ccff', '#ccff00', '#ff0066'],
  pastel: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e8baff', '#ffd6e0', '#d0f0c0', '#c0e8f0', '#f0d0c0', '#e0c0f0', '#c0f0e8'],
  fire: ['#ff4500', '#ff7f00', '#ffd700', '#ff6347', '#dc143c', '#ff8c00', '#ff4500', '#e25822', '#ff2400', '#fc6600', '#ff9500', '#ff4e00'],
  ocean: ['#006994', '#00b4d8', '#48cae4', '#0077b6', '#023e8a', '#03045e', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8'],
  gold: ['#c9a84c', '#ffd700', '#e8b04b', '#d4a017', '#b8860b', '#daa520', '#fcc200', '#e5c000', '#c9a84c', '#b5851b', '#deb887', '#c8a951'],
};

// ════════════════════ AUDIO ════════════════════
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTick() {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800 + Math.random() * 400;
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) { }
}

function playWinnerSound() {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  } catch (e) { }
}

// ════════════════════ CONFETTI ════════════════════
const confCanvas = document.getElementById('confetti-canvas');
const confCtx = confCanvas.getContext('2d');
let confParticles = [];
let confAnimId = null;

function resizeConfCanvas() {
  confCanvas.width = window.innerWidth;
  confCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfCanvas);
resizeConfCanvas();

function launchConfetti() {
  if (!state.confettiEnabled) return;
  confParticles = [];
  const colors = ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#fbbf24'];
  for (let i = 0; i < 160; i++) {
    confParticles.push({
      x: Math.random() * confCanvas.width,
      y: -10 - Math.random() * 100,
      r: 4 + Math.random() * 6,
      d: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngle: 0,
      tiltSpeed: 0.05 + Math.random() * 0.1,
      alpha: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }
  if (confAnimId) cancelAnimationFrame(confAnimId);
  animateConfetti();
}

function animateConfetti() {
  confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
  confParticles.forEach(p => {
    p.y += p.d;
    p.tiltAngle += p.tiltSpeed;
    p.tilt = Math.sin(p.tiltAngle) * 12;
    p.alpha -= 0.004;
    confCtx.globalAlpha = Math.max(0, p.alpha);
    confCtx.fillStyle = p.color;
    if (p.shape === 'rect') {
      confCtx.save();
      confCtx.translate(p.x + p.r, p.y + p.r);
      confCtx.rotate(p.tiltAngle);
      confCtx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      confCtx.restore();
    } else {
      confCtx.beginPath();
      confCtx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
      confCtx.fill();
    }
  });
  confCtx.globalAlpha = 1;
  confParticles = confParticles.filter(p => p.alpha > 0 && p.y < confCanvas.height + 40);
  if (confParticles.length > 0) {
    confAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
  }
}

// ════════════════════ RUEDA CANVAS ════════════════════
const wheelCanvas = document.getElementById('wheel-canvas');
const wCtx = wheelCanvas.getContext('2d');
const W = wheelCanvas.width;
const H = wheelCanvas.height;
const CX = W / 2;
const CY = H / 2;
const RADIUS = CX - 12;

function drawWheel(angle) {
  const items = state.participants.length > 0 ? state.participants : ['Sin participantes'];
  const n = items.length;
  const arc = (2 * Math.PI) / n;
  const palette = PALETTES[state.palette];
  wCtx.clearRect(0, 0, W, H);

  // Sombra exterior
  wCtx.save();
  wCtx.shadowColor = 'rgba(168,85,247,0.5)';
  wCtx.shadowBlur = 30;

  for (let i = 0; i < n; i++) {
    const startAngle = angle + i * arc;
    const endAngle = startAngle + arc;
    const color = palette[i % palette.length];

    // Sector
    wCtx.beginPath();
    wCtx.moveTo(CX, CY);
    wCtx.arc(CX, CY, RADIUS, startAngle, endAngle);
    wCtx.closePath();
    wCtx.fillStyle = color;
    wCtx.fill();

    // Borde del sector
    wCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    wCtx.lineWidth = 1.5;
    wCtx.stroke();

    // Texto
    wCtx.save();
    wCtx.translate(CX, CY);
    wCtx.rotate(startAngle + arc / 2);
    wCtx.textAlign = 'right';
    wCtx.fillStyle = 'rgba(255,255,255,0.95)';
    wCtx.font = `bold ${calcFontSize(n, items[i])}px Outfit, sans-serif`;
    wCtx.shadowColor = 'rgba(0,0,0,0.6)';
    wCtx.shadowBlur = 4;

    const label = truncate(items[i], n > 20 ? 8 : n > 12 ? 12 : 18);
    wCtx.fillText(label, RADIUS - 16, 5);
    wCtx.restore();
  }

  wCtx.restore();

  // Borde exterior
  wCtx.beginPath();
  wCtx.arc(CX, CY, RADIUS, 0, 2 * Math.PI);
  wCtx.strokeStyle = 'rgba(255,255,255,0.3)';
  wCtx.lineWidth = 3;
  wCtx.stroke();

  // Anillo decorativo exterior
  wCtx.beginPath();
  wCtx.arc(CX, CY, RADIUS + 4, 0, 2 * Math.PI);
  wCtx.strokeStyle = 'rgba(251,191,36,0.6)';
  wCtx.lineWidth = 2;
  wCtx.stroke();
}

function calcFontSize(n, text) {
  if (n > 24) return 9;
  if (n > 16) return 11;
  if (n > 10) return 12;
  if (n > 6) return 14;
  return 16;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ════════════════════ SPIN LOGIC ════════════════════
function spinWheel() {
  if (state.spinning) return;
  if (state.participants.length === 0) {
    alert('⚠️ Primero agrega participantes en la pestaña 👥 Participantes');
    return;
  }

  state.spinning = true;
  const btnSpin = document.getElementById('btn-spin');
  btnSpin.disabled = true;
  btnSpin.classList.add('spinning-btn');

  const n = state.participants.length;
  const arc = (2 * Math.PI) / n;

  // Determinar el índice ganador según asignación del premio actual
  let winnerIdx = -1;
  const currentAssigned = state.prizeAssignments && state.prizeAssignments[0];
  if (currentAssigned && state.participants.includes(currentAssigned)) {
    winnerIdx = state.participants.indexOf(currentAssigned);
  }
  if (winnerIdx === -1) {
    winnerIdx = Math.floor(Math.random() * n);
  }

  // El puntero apunta a -PI/2 (arriba). Necesitamos que el centro del segmento `winnerIdx` quede ahí.
  // sector i tiene centro en: currentAngle + i*arc + arc/2
  // Queremos que ese ángulo mod 2PI == -PI/2 mod 2PI
  const targetCenter = -Math.PI / 2;
  const minSpins = 5;
  const extraSpins = minSpins * 2 * Math.PI + Math.random() * 4 * Math.PI;

  // Ángulo actual de inicio del sector ganador
  const sectorCenter = winnerIdx * arc + arc / 2;
  // Necesitamos rotar a un ángulo donde sectorCenter + newAngle ≡ targetCenter (mod 2PI)
  let targetAngle = targetCenter - sectorCenter;
  // Normalizar para que sea mayor que currentAngle
  while (targetAngle < state.currentAngle) targetAngle += 2 * Math.PI;
  targetAngle += extraSpins;

  const startAngle = state.currentAngle;
  const totalRotation = targetAngle - startAngle;
  const duration = state.spinDuration * 1000;
  const startTime = performance.now();

  // Tick sound interval
  let lastTick = 0;
  let tickInterval = 200;

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOut(progress);
    state.currentAngle = startAngle + totalRotation * eased;

    drawWheel(state.currentAngle);

    // Tick sounds
    const velocity = (1 - progress) * (totalRotation / duration);
    tickInterval = Math.max(30, 200 - velocity * 5000);
    if (now - lastTick > tickInterval) {
      playTick();
      lastTick = now;
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      state.currentAngle = targetAngle;
      drawWheel(state.currentAngle);
      onSpinComplete(winnerIdx);
    }
  }

  requestAnimationFrame(animate);
}

function onSpinComplete(winnerIdx) {
  state.spinning = false;
  state.totalSpins++;

  const btnSpin = document.getElementById('btn-spin');
  btnSpin.disabled = false;
  btnSpin.classList.remove('spinning-btn');

  const winnerName = state.participants[winnerIdx];

  // Determinar premio entregado (el primero de la lista)
  let prize = '—';
  let prizeIdx = -1;
  if (state.prizes.length > 0) {
    prizeIdx = 0;
    prize = state.prizes[prizeIdx];
  }

  // Registrar en historial
  const entry = {
    id: state.history.length + 1,
    name: winnerName,
    prize,
    time: new Date().toLocaleString('es-CL'),
  };
  state.history.push(entry);

  // Limpiar premio si corresponde y avanzar asignación al siguiente premio
  if (state.removePrize && prizeIdx !== -1) {
    state.prizes.splice(prizeIdx, 1);
    if (state.prizeAssignments && state.prizeAssignments.length > 0) {
      state.prizeAssignments.shift();
    }
  }

  // Limpiar participante si corresponde
  if (state.removeWinner) {
    state.participants.splice(winnerIdx, 1);
    if (state.prizeAssignments) {
      state.prizeAssignments = state.prizeAssignments.map(w => w === winnerName ? '' : w);
    }
  }

  // Actualizar UI
  updateStats();
  updateWheelMiniList();
  renderChips('participants-chips', state.participants, 'participants');
  renderChips('prizes-chips', state.prizes, 'prizes');
  drawWheel(state.currentAngle);

  // Mostrar ganador
  playWinnerSound();
  showWinnerOverlay(winnerName, prize);
  launchConfetti();
  renderHistory();
  updateLastWinner(winnerName, prize);
}

// ════════════════════ UI HELPERS ════════════════════
function showWinnerOverlay(name, prize) {
  const winnerMsg = state.winnerMsg;
  document.getElementById('winner-name').textContent = name;
  document.getElementById('winner-prize').textContent = prize;
  document.getElementById('winner-overlay').classList.remove('hidden');
}

function hideWinnerOverlay() {
  document.getElementById('winner-overlay').classList.add('hidden');
}

function updateLastWinner(name, prize) {
  const el = document.getElementById('last-winner-display');
  el.innerHTML = `
    <div class="last-winner-info">
      <div class="lw-name">🏆 ${name}</div>
      <div class="lw-prize">${prize}</div>
    </div>`;
}

function updateStats() {
  document.getElementById('stat-spins').textContent = state.totalSpins;
  document.getElementById('stat-parts').textContent = state.participants.length;
  document.getElementById('stat-prizes').textContent = state.history.length;
}

function updateWheelMiniList() {
  const partEl = document.getElementById('list-part-mini');
  const prizeEl = document.getElementById('list-prize-mini');
  const countPart = document.getElementById('count-part');
  const countPrize = document.getElementById('count-prize');

  countPart.textContent = state.participants.length;
  countPrize.textContent = state.prizes.length;

  partEl.innerHTML = state.participants.slice(0, 10).map(p => `<li>${p}</li>`).join('');
  if (state.participants.length > 10) {
    partEl.innerHTML += `<li style="color:#9090b0;font-style:italic">...y ${state.participants.length - 10} más</li>`;
  }
  prizeEl.innerHTML = state.prizes.slice(0, 8).map(p => `<li>${p}</li>`).join('');
  if (state.prizes.length > 8) {
    prizeEl.innerHTML += `<li style="color:#9090b0;font-style:italic">...y ${state.prizes.length - 8} más</li>`;
  }
}

function renderChips(containerId, items, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (items.length === 0) {
    el.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem">No hay elementos. Agrega algunos arriba.</span>';
    return;
  }
  el.innerHTML = items.map((item, i) => `
    <span class="chip">
      ${item}
      <button class="chip-del" data-type="${type}" data-index="${i}" title="Eliminar">✕</button>
    </span>
  `).join('');

  // Badge
  const badge = type === 'participants'
    ? document.getElementById('part-total-badge')
    : document.getElementById('prize-total-badge');
  if (badge) badge.textContent = items.length;
}

function renderHistory() {
  const el = document.getElementById('history-list');
  if (state.history.length === 0) {
    el.innerHTML = '<div class="history-empty">No hay ganadores registrados aún.</div>';
    return;
  }
  el.innerHTML = [...state.history].reverse().map(h => `
    <div class="history-item">
      <div class="hi-num">#${h.id}</div>
      <div>
        <div class="hi-name">${h.name}</div>
        <div class="hi-prize">${h.prize}</div>
      </div>
      <div class="hi-time">${h.time}</div>
    </div>
  `).join('');
}

function renderPrizePlanList() {
  const container = document.getElementById('prize-plan-list');
  const countEl = document.getElementById('prize-plan-count');
  if (!container) return;

  if (countEl) {
    countEl.textContent = `${state.prizes.length} ${state.prizes.length === 1 ? 'premio' : 'premios'} en lista`;
  }

  if (state.prizes.length === 0) {
    container.innerHTML = `
      <div class="prize-plan-empty">
        ⚠️ No hay premios cargados aún.<br>
        <span style="font-size:0.8rem;color:var(--text-muted);display:block;margin-top:6px">
          Agrega premios en la pestaña <strong>🎁 Premios</strong> para poder asignar sus ganadores.
        </span>
      </div>`;
    return;
  }

  container.innerHTML = state.prizes.map((prize, idx) => {
    const currentAssigned = (state.prizeAssignments && state.prizeAssignments[idx]) || '';

    const optionsHtml = ['<option value="">🎲 Al azar (aleatorio)</option>']
      .concat(state.participants.map(p => {
        const selected = p === currentAssigned ? 'selected' : '';
        return `<option value="${escHtml(p)}" ${selected}>👤 ${escHtml(p)}</option>`;
      }))
      .join('');

    return `
      <div class="prize-plan-item">
        <div class="prize-plan-item-header">
          <span class="prize-plan-num">#${idx + 1}</span>
          <span class="prize-plan-title" title="${escHtml(prize)}">${escHtml(prize)}</span>
        </div>
        <div class="prize-plan-select-wrap">
          <label class="prize-plan-label" for="prize-sel-${idx}">Ganador:</label>
          <select id="prize-sel-${idx}" class="prize-plan-select" data-index="${idx}">
            ${optionsHtml}
          </select>
        </div>
      </div>
    `;
  }).join('');
}

function openTrucarModal() {
  const modal = document.getElementById('trucar-modal');
  renderPrizePlanList();
  if (modal) modal.classList.remove('hidden');
}

function closeTrucarModal() {
  const modal = document.getElementById('trucar-modal');
  if (modal) modal.classList.add('hidden');
}

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  const input = document.getElementById('auth-password-input');
  const err = document.getElementById('auth-error-msg');
  if (input) {
    input.value = '';
    input.type = 'password';
  }
  const eye = document.getElementById('btn-toggle-auth-eye');
  if (eye) eye.textContent = '👁️';
  if (err) err.classList.add('hidden');
  if (modal) modal.classList.remove('hidden');
  setTimeout(() => { if (input) input.focus(); }, 80);
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

function verifyAuthPin() {
  const input = document.getElementById('auth-password-input');
  const err = document.getElementById('auth-error-msg');
  const val = (input ? input.value : '').trim();

  if (val === state.accessPin) {
    closeAuthModal();
    openTrucarModal();
    showToast('🔓 Acceso concedido');
  } else {
    if (err) {
      err.classList.remove('hidden');
      err.style.animation = 'none';
      err.offsetHeight; // trigger reflow
      err.style.animation = '';
    }
    if (input) {
      input.select();
      input.focus();
    }
  }
}

function promptChangePin() {
  const current = prompt('Ingresa la clave actual:');
  if (current === null) return;
  if (current !== state.accessPin) {
    alert('❌ Clave actual incorrecta.');
    return;
  }
  const newPin = prompt('Ingresa la nueva clave (mínimo 4 caracteres):');
  if (newPin === null) return;
  const trimmed = newPin.trim();
  if (trimmed.length < 4) {
    alert('⚠️ La clave debe tener al menos 4 caracteres.');
    return;
  }
  state.accessPin = trimmed;
  localStorage.setItem('ruleta_admin_pin', trimmed);
  showToast('🔑 Clave actualizada correctamente');
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function loadParticipants() {
  const raw = document.getElementById('input-participants').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) { alert('⚠️ Escribe al menos un nombre.'); return; }
  state.participants = lines;
  if (state.prizeAssignments) {
    state.prizeAssignments = state.prizeAssignments.map(w => state.participants.includes(w) ? w : '');
  }
  renderChips('participants-chips', state.participants, 'participants');
  updateWheelMiniList();
  updateStats();
  drawWheel(state.currentAngle);
  showToast(`✅ ${lines.length} participantes cargados`);
}

function loadPrizes() {
  const raw = document.getElementById('input-prizes').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) { alert('⚠️ Escribe al menos un premio.'); return; }
  state.prizes = lines;
  if (state.prizeAssignments) {
    state.prizeAssignments = state.prizeAssignments.slice(0, state.prizes.length);
  }
  renderChips('prizes-chips', state.prizes, 'prizes');
  updateWheelMiniList();
  showToast(`✅ ${lines.length} premios cargados`);
}

// ════════════════════ TOAST NOTIFICATION ════════════════════
let toastTimeout = null;
function showToast(msg) {
  let toast = document.getElementById('toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.style.cssText = `
      position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
      background:linear-gradient(135deg,#a855f7,#ec4899);
      color:white;font-family:Outfit,sans-serif;font-weight:700;
      padding:12px 28px;border-radius:99px;box-shadow:0 8px 32px rgba(168,85,247,0.4);
      z-index:99999;font-size:0.9rem;transition:opacity 0.4s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ════════════════════ EXPORT CSV ════════════════════
function exportCSV() {
  if (state.history.length === 0) { alert('No hay historial para exportar.'); return; }
  const rows = [['#', 'Ganador', 'Premio', 'Fecha']];
  state.history.forEach(h => rows.push([h.id, h.name, h.prize, h.time]));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'historial_ruleta.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ════════════════════ BACKGROUND ════════════════════
function applyBackground(bg, customUrl) {
  state.bg = bg;
  document.querySelectorAll('.bg-option').forEach(el => {
    el.classList.toggle('active', el.dataset.bg === bg);
  });
  const body = document.body;
  body.classList.remove('bg-gradient1', 'bg-gradient2', 'bg-gradient3', 'bg-gradient4', 'bg-gradient5', 'bg-image');
  body.style.backgroundImage = '';

  if (bg === 'image' && customUrl) {
    body.classList.add('bg-image');
    body.style.backgroundImage = `url('${customUrl}')`;
  } else if (bg !== 'image') {
    body.classList.add(`bg-${bg}`);
  }

  const uploadArea = document.getElementById('custom-bg-upload');
  if (uploadArea) uploadArea.style.display = bg === 'image' ? 'block' : 'none';
}

// ════════════════════ EVENT LISTENERS ════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // ── Init demo data if empty
  if (state.participants.length === 0) {
    state.participants = [
      'Camila Rojas',
      'Matías Silva',
      'Valentina Castro',
      'Nicolás Soto',
      'Fernanda Morales',
      'Benjamín Muñoz',
      'Sofía Contreras',
      'Lucas Herrera'
    ];
    const inputParts = document.getElementById('input-participants');
    if (inputParts) inputParts.value = state.participants.join('\n');
  }

  if (state.prizes.length === 0) {
    state.prizes = [
      'Smart TV 55" 4K 📺',
      'PlayStation 5 🎮',
      'Gift Card $100.000 💳',
      'Parlante JBL Boombox 🔊',
      'AirPods Pro 🎧'
    ];
    const inputPrizes = document.getElementById('input-prizes');
    if (inputPrizes) inputPrizes.value = state.prizes.join('\n');
  }

  // Init draw and state UI
  drawWheel(state.currentAngle);
  renderChips('participants-chips', state.participants, 'participants');
  renderChips('prizes-chips', state.prizes, 'prizes');
  updateWheelMiniList();
  updateStats();
  applyBackground('gradient1');

  // ── Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ── Spin
  document.getElementById('btn-spin').addEventListener('click', spinWheel);
  document.getElementById('wheel-canvas').addEventListener('click', spinWheel);

  // ── Winner overlay
  document.getElementById('btn-close-winner').addEventListener('click', hideWinnerOverlay);
  document.getElementById('winner-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideWinnerOverlay();
  });

  // ── Botón oculto & Hub central (solicita clave de acceso)
  const btnSecret = document.getElementById('btn-open-trucar');
  if (btnSecret) btnSecret.addEventListener('click', openAuthModal);
  const wheelHub = document.querySelector('.wheel-hub');
  if (wheelHub) {
    wheelHub.style.cursor = 'pointer';
    wheelHub.addEventListener('click', openAuthModal);
  }

  // ── Modal de Clave / Autenticación Controles
  const btnCloseAuth = document.getElementById('btn-close-auth');
  if (btnCloseAuth) btnCloseAuth.addEventListener('click', closeAuthModal);
  const btnCancelAuth = document.getElementById('btn-cancel-auth');
  if (btnCancelAuth) btnCancelAuth.addEventListener('click', closeAuthModal);
  const authModal = document.getElementById('auth-modal');
  if (authModal) {
    authModal.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeAuthModal();
    });
  }
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', e => {
      e.preventDefault();
      verifyAuthPin();
    });
  }
  const btnSubmitAuth = document.getElementById('btn-submit-auth');
  if (btnSubmitAuth) {
    btnSubmitAuth.addEventListener('click', e => {
      e.preventDefault();
      verifyAuthPin();
    });
  }
  const btnToggleEye = document.getElementById('btn-toggle-auth-eye');
  if (btnToggleEye) {
    btnToggleEye.addEventListener('click', () => {
      const input = document.getElementById('auth-password-input');
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btnToggleEye.textContent = '🔒';
      } else {
        input.type = 'password';
        btnToggleEye.textContent = '👁️';
      }
    });
  }

  // ── Modal Controles de Asignación de Premios
  const btnCloseTrucar = document.getElementById('btn-close-trucar');
  if (btnCloseTrucar) btnCloseTrucar.addEventListener('click', closeTrucarModal);
  const btnCancelTrucar = document.getElementById('btn-trucar-cancel');
  if (btnCancelTrucar) btnCancelTrucar.addEventListener('click', closeTrucarModal);
  const modalTrucar = document.getElementById('trucar-modal');
  if (modalTrucar) {
    modalTrucar.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeTrucarModal();
    });
  }

  // Cambiar clave
  const btnChangePin = document.getElementById('btn-change-pin');
  if (btnChangePin) btnChangePin.addEventListener('click', promptChangePin);

  // Poner todos al azar
  const btnPlanReset = document.getElementById('btn-plan-reset-all');
  if (btnPlanReset) {
    btnPlanReset.addEventListener('click', () => {
      document.querySelectorAll('.prize-plan-select').forEach(sel => {
        sel.value = '';
      });
    });
  }

  // Guardar asignaciones desde el modal
  const btnTrucarApply = document.getElementById('btn-trucar-apply');
  if (btnTrucarApply) {
    btnTrucarApply.addEventListener('click', () => {
      const selects = document.querySelectorAll('.prize-plan-select');
      state.prizeAssignments = [];
      selects.forEach(sel => {
        const idx = parseInt(sel.dataset.index, 10);
        state.prizeAssignments[idx] = sel.value;
      });
      closeTrucarModal();
      showToast('✅ Asignaciones guardadas correctamente');
    });
  }

  // Atajos de teclado: Escape cierra modales, Alt+T abre prompt de clave
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAuthModal();
      closeTrucarModal();
      hideWinnerOverlay();
    }
    if ((e.altKey && (e.key === 't' || e.key === 'T')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P' || e.key === 'x' || e.key === 'X'))) {
      e.preventDefault();
      openAuthModal();
    }
  });

  // ── Participants
  document.getElementById('btn-load-participants').addEventListener('click', loadParticipants);

  document.getElementById('btn-clear-participants').addEventListener('click', () => {
    if (confirm('¿Eliminar todos los participantes?')) {
      state.participants = [];
      state.prizeAssignments = [];
      document.getElementById('input-participants').value = '';
      renderChips('participants-chips', [], 'participants');
      updateWheelMiniList();
      updateStats();
      drawWheel(state.currentAngle);
    }
  });

  document.getElementById('btn-shuffle-participants').addEventListener('click', () => {
    for (let i = state.participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.participants[i], state.participants[j]] = [state.participants[j], state.participants[i]];
    }
    renderChips('participants-chips', state.participants, 'participants');
    updateWheelMiniList();
    drawWheel(state.currentAngle);
    showToast('🔀 Participantes mezclados');
  });

  document.getElementById('import-participants-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('input-participants').value = ev.target.result;
      loadParticipants();
    };
    reader.readAsText(file, 'UTF-8');
  });

  // ── Prizes
  document.getElementById('btn-load-prizes').addEventListener('click', loadPrizes);

  document.getElementById('btn-clear-prizes').addEventListener('click', () => {
    if (confirm('¿Eliminar todos los premios?')) {
      state.prizes = [];
      state.prizeAssignments = [];
      document.getElementById('input-prizes').value = '';
      renderChips('prizes-chips', [], 'prizes');
      updateWheelMiniList();
    }
  });

  document.getElementById('import-prizes-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('input-prizes').value = ev.target.result;
      loadPrizes();
    };
    reader.readAsText(file, 'UTF-8');
  });

  // ── Chip delete (event delegation)
  document.addEventListener('click', e => {
    const btn = e.target.closest('.chip-del');
    if (!btn) return;
    const { type, index } = btn.dataset;
    const i = parseInt(index);
    if (type === 'participants') {
      const deletedName = state.participants[i];
      state.participants.splice(i, 1);
      if (state.prizeAssignments) {
        state.prizeAssignments = state.prizeAssignments.map(w => w === deletedName ? '' : w);
      }
      renderChips('participants-chips', state.participants, 'participants');
      updateWheelMiniList();
      updateStats();
      drawWheel(state.currentAngle);
    } else if (type === 'prizes') {
      state.prizes.splice(i, 1);
      if (state.prizeAssignments) {
        state.prizeAssignments.splice(i, 1);
      }
      renderChips('prizes-chips', state.prizes, 'prizes');
      updateWheelMiniList();
    }
  });

  // ── Config: Background
  document.querySelectorAll('.bg-option').forEach(el => {
    el.addEventListener('click', () => {
      const bg = el.dataset.bg;
      applyBackground(bg);
    });
  });

  document.getElementById('bg-file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    applyBackground('image', url);
  });

  // ── Config: Palette
  document.querySelectorAll('.palette-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.palette-option').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      state.palette = el.dataset.palette;
      drawWheel(state.currentAngle);
      showToast('🎨 Paleta actualizada');
    });
  });

  // ── Config: Options
  document.getElementById('opt-remove-winner').addEventListener('change', e => { state.removeWinner = e.target.checked; });
  document.getElementById('opt-remove-prize').addEventListener('change', e => { state.removePrize = e.target.checked; });
  document.getElementById('opt-sound').addEventListener('change', e => { state.soundEnabled = e.target.checked; });
  document.getElementById('opt-confetti').addEventListener('change', e => { state.confettiEnabled = e.target.checked; });

  document.getElementById('spin-duration').addEventListener('input', e => {
    state.spinDuration = parseInt(e.target.value);
    document.getElementById('spin-duration-val').textContent = state.spinDuration + 's';
  });

  // ── Config: Text
  document.getElementById('btn-apply-text').addEventListener('click', () => {
    const title = document.getElementById('title-text').value.trim() || '🎡 Ruleta Regalona';
    const msg = document.getElementById('winner-msg').value.trim() || '¡Felicitaciones, ganaste!';
    state.winnerMsg = msg;
    document.getElementById('app-logo').textContent = title;
    document.title = title + ' – Sorteo Interactivo';
    showToast('✅ Texto actualizado');
  });

  // ── Historial
  document.getElementById('btn-export-history').addEventListener('click', exportCSV);
  document.getElementById('btn-clear-history').addEventListener('click', () => {
    if (confirm('¿Borrar todo el historial?')) {
      state.history = [];
      renderHistory();
      updateStats();
    }
  });

  // ── Responsive resize redraw
  window.addEventListener('resize', () => drawWheel(state.currentAngle));
});
