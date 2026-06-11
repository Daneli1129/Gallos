// ============================================================
// shared/shared.js
// Auth, estado global, utilidades compartidas entre admin y empleado
// ============================================================

// ── USUARIOS ──────────────────────────────────────────────
const USERS = [
    { usuario: 'admin', pass: 'admin', nombre: 'Bruno García', rol: 'admin' },
    { usuario: 'empleado', pass: '123', nombre: 'María Ramírez', rol: 'empleado' },
    { usuario: 'empleado2', pass: '456', nombre: 'Carlos Mendoza', rol: 'empleado' },
];

// Registro de sesiones de empleados (en memoria)
const empSessions = {};

// Usuario activo
let currentUser = sessionStorage.getItem('currentUser') 
    ? JSON.parse(sessionStorage.getItem('currentUser')) 
    : null;

// ── ESTADO GLOBAL ─────────────────────────────────────────
const COLORS = [
    '#F3D370', '#E74C3C', '#2ECC71', '#D4A24A',
    '#7c3aed', '#3AB0FF', '#B8963A', '#C0392B'
];

// Base de jugadores del sistema
let jugadores = [
    { id: 'H1', nombre: 'Heri', color: COLORS[0], saldoAnt: 4600, apuestas: [] },
    { id: 'P2', nombre: 'Picuni', color: COLORS[1], saldoAnt: 0, apuestas: [] },
    { id: 'J3', nombre: 'Jaime Sosa', color: COLORS[2], saldoAnt: 0, apuestas: [] },
    { id: 'A4', nombre: 'Arias', color: COLORS[3], saldoAnt: 0, apuestas: [] },
    { id: 'M5', nombre: 'Maldonado', color: COLORS[4], saldoAnt: 0, apuestas: [] },
    { id: 'R6', nombre: 'Renata', color: COLORS[5], saldoAnt: 0, apuestas: [] },
    { id: 'T7', nombre: 'Tomas', color: COLORS[6], saldoAnt: 0, apuestas: [] },
];

// Peleas activas del día
let peleas = [];
let peleaActual = 1;
let estadoPelea = 'espera';  // 'espera' | 'activa' | 'cerrada'

// Jugador seleccionado (usado en admin/fichas)
let selectedJugador = null;

// Tab activo
let currentTab = '';

// Bitácora de movimientos
let bitacora = [];
let logFiltro = 'todos';

// ── UTILIDADES ────────────────────────────────────────────

/** Formatea número como moneda MXN */
const fmt = n =>
    '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Iniciales de un nombre (máximo 2 palabras) */
const initials = n =>
    n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

/** Hora actual formateada */
const nowStr = () =>
    new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Fecha larga (ej: lunes, 31 de mayo de 2026) */
const today = () =>
    new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

/** Fecha corta para nombre de archivo PDF (ej: 31/05/2026) */
const todayShort = () =>
    new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });

/** Formatea una fecha como HH:MM */
const fmtTime = d =>
    d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';

// ── AUTH ──────────────────────────────────────────────────

function doLogin() {
    const u = document.getElementById('li-u').value.trim();
    const p = document.getElementById('li-p').value;
    const found = USERS.find(x => x.usuario === u && x.pass === p);

    if (!found) {
        document.getElementById('l-err').classList.add('show');
        document.getElementById('li-p').value = '';
        return;
    }

    document.getElementById('l-err').classList.remove('show');
    currentUser = found;

    // Registrar sesión si es empleado
    if (found.rol === 'empleado') {
        empSessions[found.usuario] = {
            nombre: found.nombre,
            lastLogin: new Date(),
            active: true
        };
    }

    // Redirigir según rol
    if (found.rol === 'admin') {
        window.location.href = '../admin/index.html';
    } else {
        window.location.href = '../empleado/index.html';
    }
}

function doLogout() {
    if (currentUser?.rol === 'empleado') {
        empSessions[currentUser.usuario] = {
            ...empSessions[currentUser.usuario],
            active: false,
            lastLogout: new Date()
        };
    }
    currentUser = null;
    selectedJugador = null;
    
    // 🔴 LA CLAVE: Borrar la sesión guardada en el navegador
    sessionStorage.removeItem('currentUser');
    
    // Volver al login
    window.location.href = '../index.html';
}

const isAdmin = () => currentUser?.rol === 'admin';

// ── NAV / SIDEBAR ─────────────────────────────────────────
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  // Siempre empieza colapsado (la clase 'collapsed' ya está en el HTML)
  let hTimer;
  nav.addEventListener('mouseenter', () => {
    clearTimeout(hTimer);
    nav.classList.add('hover-expand');
  });
  nav.addEventListener('mouseleave', () => {
    hTimer = setTimeout(() => nav.classList.remove('hover-expand'), 200);
  });
}

// ── ELIMINAR PELEA ──────────────────────────────────────────
function eliminarPelea(num) {
  const p = peleas.find(x => x.num === num);
  if (!p) return;
  const nombrePelea = `Pelea #${num}`;

  // Limpiar apuestas de esta pelea de los jugadores
  p.apuestas.forEach(ap => {
    if (ap.jugadorId) {
      const j = jugadores.find(x => x.id === ap.jugadorId);
      if (j) j.apuestas = j.apuestas.filter(a => a.id !== ap.id);
    }
  });

  peleas = peleas.filter(x => x.num !== num);
  logAction('eliminar', `Pelea #${num} eliminada`, '🗑️');

  // Ajustar peleaActual si eliminamos la última
  if (peleaActual === num && peleas.length > 0) {
    peleaActual = Math.max(...peleas.map(x => x.num));
  } else if (peleas.length === 0) {
    peleaActual = 1;
  }

  toast(`🗑️ <strong>${nombrePelea}</strong> eliminada`, 'error');
}

// ── CÁLCULO DE FICHA ─────────────────────────────────────

/**
 * Calcula el resumen financiero de un jugador.
 * @param {Object} j — jugador del array jugadores
 * @returns {Object} { saldo, ganadas, perdidas, enJuego, totalGanadas, totalPerdidas, saldoAntTotal }
 */
function calcFicha(j) {
    const totalPerdidas = j.apuestas
        .filter(a => a.resultado === 'perdida')
        .reduce((s, a) => s + a.monto, 0);

    const totalGanadas = j.apuestas
        .filter(a => a.resultado === 'ganada')
        .reduce((s, a) => s + (a.monto * 0.9), 0);   // 90% para el jugador

    const saldoAntTotal = j.saldoAnt + totalPerdidas;
    const saldo = totalGanadas - saldoAntTotal;

    return {
        saldo,
        ganadas: j.apuestas.filter(a => a.resultado === 'ganada'),
        perdidas: j.apuestas.filter(a => a.resultado === 'perdida'),
        enJuego: j.apuestas.filter(a => a.resultado === 'pendiente'),
        totalGanadas,
        totalPerdidas,
        saldoAntTotal
    };
}

// ── BITÁCORA ──────────────────────────────────────────────

/**
 * Agrega un evento a la bitácora.
 * @param {string} tipo   — categoría del evento
 * @param {string} msg    — mensaje HTML (puede usar <strong>)
 * @param {string} icon   — emoji del icono
 */
function logAction(tipo, msg, icon = '🎯') {
    bitacora.unshift({
        ts: nowStr(),
        user: currentUser.nombre,
        rol: currentUser.rol,
        tipo,
        msg,
        icon
    });
    // Máximo 300 registros en memoria
    if (bitacora.length > 300) bitacora.pop();
}

// ── CONFIRM MODAL ─────────────────────────────────────────

/**
 * Muestra un modal de confirmación personalizado.
 * @param {string} msg    — HTML del mensaje
 * @param {string} icon   — emoji del icono (por defecto ⚠️)
 * @param {string} btnText— texto del botón aceptar (por defecto 'Aceptar')
 * @param {string} btnClass — clase del botón (primary o danger)
 * @returns {Promise<boolean>}
 */
function showConfirm(msg, icon = '⚠️', btnText = 'Aceptar', btnClass = 'primary') {
  return new Promise(resolve => {
    let overlay = document.getElementById('confirm-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.id = 'confirm-overlay';
      overlay.style.display = 'none';
      overlay.innerHTML = `
        <div class="confirm-box">
          <div class="confirm-icon" id="confirm-icon">⚠️</div>
          <div class="confirm-msg" id="confirm-msg"></div>
          <div class="confirm-actions">
            <button class="mbtn ghost" id="confirm-cancel">Cancelar</button>
            <button class="mbtn" id="confirm-ok">Aceptar</button>
          </div>
        </div>`;
      overlay.addEventListener('click', e => {
        if (e.target === overlay) resolve(false);
      });
      document.body.appendChild(overlay);
    }

    const msgEl   = overlay.querySelector('#confirm-msg');
    const iconEl  = overlay.querySelector('#confirm-icon');
    const okBtn   = overlay.querySelector('#confirm-ok');
    const cancelBtn = overlay.querySelector('#confirm-cancel');

    msgEl.innerHTML  = msg;
    iconEl.textContent = icon;
    okBtn.textContent  = btnText;
    okBtn.className    = `mbtn ${btnClass}`;
    overlay.style.display = 'flex';

    const keyHandler = e => {
      if (e.key === 'Escape') { cleanup(); resolve(false); }
      if (e.key === 'Enter')  { cleanup(); resolve(true); }
    };
    document.addEventListener('keydown', keyHandler);

    const cleanup = () => {
      overlay.style.display = 'none';
      document.removeEventListener('keydown', keyHandler);
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    setTimeout(() => okBtn.focus(), 50);

    okBtn.onclick = () => { cleanup(); resolve(true); };
    cancelBtn.onclick = () => { cleanup(); resolve(false); };
  });
}

// ── TOAST ─────────────────────────────────────────────────

/**
 * Muestra una notificación temporal.
 * @param {string} msg    — HTML del mensaje
 * @param {string} color  — color CSS de la barra lateral
 */
function toast(msg, color = 'var(--gold)') {
    const t = document.getElementById('toast');
    document.getElementById('tmsg').innerHTML = msg;
    document.getElementById('tline').style.background = color;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2600);
}

// ── PELEAS (acceso compartido) ────────────────────────────

/**
 * Obtiene una pelea por número, creándola si no existe.
 */
function getPelea(num) {
    let p = peleas.find(x => x.num === num);
    if (!p) {
        p = { num, estado: 'espera', apuestas: [], minimizada: false };
        peleas.push(p);
    }
    return p;
}

/**
 * Agrega una apuesta a una pelea (evita duplicados por id).
 */
function addApuestaToPelea(num, ap) {
    const p = getPelea(num);
    if (!p.apuestas.find(a => a.id === ap.id)) {
        p.apuestas.push({ ...ap });
    }
}

// ── ICONOS SVG ────────────────────────────────────────────
// Objeto centralizado para no repetir SVGs inline en cada archivo
const I = {
    plus: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    x: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    dl: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    trophy: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>`,
    pause: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    play: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    stop: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
    file: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    eye: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    dg: `<svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3.5" fill="var(--green2)"/></svg>`,
    dr: `<svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3.5" fill="var(--rojo2)"/></svg>`,
    dy: `<svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3.5" fill="var(--gold)"/></svg>`,
};

// ── TOAST ─────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.dataset.type = type;
  document.getElementById('tmsg').innerHTML = msg;
  t.classList.remove('visible');
  void t.offsetWidth; // reflow
  t.classList.add('visible');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('visible'), 2800);
}

// ── INIT LISTENERS ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Login page listeners
    const pBtn = document.getElementById('li-p');
    const uBtn = document.getElementById('li-u');
    if (pBtn) pBtn.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    if (uBtn) uBtn.addEventListener('keydown', e => { if (e.key === 'Enter') pBtn?.focus(); });

    // Sidebar init (admin / empleado pages)
    initNav();
});