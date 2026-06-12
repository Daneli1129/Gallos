// ============================================================
// shared/shared.js
// Auth, estado global, utilidades compartidas entre admin y empleado
// ============================================================

// ── CONEXIÓN SUPABASE ──────────────────────────────────────
const DEFAULT_URL = 'https://nqrprvaszwocvlrjsuwr.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnBydmFzendvY3ZscmpzdXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTIxNDUsImV4cCI6MjA5Njc4ODE0NX0.Mwv-gANBSyR2IuJDgqoG5B1v_JSpTaXcbhSGsJw08fE';

let supabaseUrl = localStorage.getItem('supabaseUrl') || DEFAULT_URL;
let supabaseKey = localStorage.getItem('supabaseKey') || DEFAULT_KEY;

// Si no están configuradas las credenciales de conexión reales, las solicitamos en local
if ((supabaseUrl === DEFAULT_URL || supabaseKey === DEFAULT_KEY) && !localStorage.getItem('supabaseConfigured')) {
  const promptUrl = prompt("Por favor ingresa la URL de tu proyecto Supabase (ej: https://xxxx.supabase.co):", "");
  const promptKey = prompt("Por favor ingresa la anon/public key de tu proyecto Supabase:", "");
  if (promptUrl && promptKey) {
    supabaseUrl = promptUrl.trim();
    supabaseKey = promptKey.trim();
    localStorage.setItem('supabaseUrl', supabaseUrl);
    localStorage.setItem('supabaseKey', supabaseKey);
    localStorage.setItem('supabaseConfigured', 'true');
  }
}

// Inicializar cliente
let supabase = null;
if (supabaseUrl && supabaseUrl !== DEFAULT_URL && supabaseKey && supabaseKey !== DEFAULT_KEY) {
  supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
  console.error("Supabase no se ha inicializado. Configura tus credenciales en shared.js o ingresalas cuando se soliciten.");
}

// Registro de sesiones de empleados (en memoria)
const empSessions = {};

// Usuario activo
let currentUser = sessionStorage.getItem('currentUser')
  ? JSON.parse(sessionStorage.getItem('currentUser'))
  : null;

// ── ESTADO GLOBAL ─────────────────────────────────────────
const COLORS = [
  '#E8C97A', '#E74C3C', '#2ECC71', '#D4A24A',
  '#7c3aed', '#3AB0FF', '#C9A84C', '#C0392B'
];

// Base de jugadores del sistema (se cargará desde Supabase)
let jugadores = [];

// Peleas activas del día (se cargará desde Supabase)
let peleas = [];
let peleaActual = 1;
let estadoPelea = 'espera';  // 'espera' | 'activa' | 'cerrada'

// Jugador seleccionado (usado en admin/fichas)
let selectedJugador = null;

// Tab activo
let currentTab = '';

// Bitácora de movimientos (se cargará desde Supabase)
let bitacora = [];
let logFiltro = 'todos';

// ── UTILIDADES ────────────────────────────────────────────

/** Formatea número como moneda MXN */
const fmt = n =>
  '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Iniciales de un nombre (máximo 2 palabras) */
const initials = n =>
  n ? n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '??';

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

// ── CONSULTAS DE LECTURA SUPABASE ─────────────────────────

async function fetchJugadores() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('jugadores')
    .select(`
            id,
            nombre,
            color,
            saldo_anterior,
            apuestas (
                id,
                bando,
                monto,
                resultado,
                peleas (
                    numero_pelea
                )
            )
        `);
  if (error) {
    console.error("Error cargando jugadores:", error);
    return;
  }
  jugadores = data.map(j => ({
    id: j.id,
    nombre: j.nombre,
    color: j.color,
    saldoAnt: parseFloat(j.saldo_anterior) || 0,
    apuestas: j.apuestas ? j.apuestas.map(a => ({
      id: a.id,
      pelea: a.peleas?.numero_pelea || 0,
      monto: parseFloat(a.monto) || 0,
      bando: a.bando,
      resultado: a.resultado
    })) : []
  }));
}

async function fetchPeleas() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('peleas')
    .select(`
            id,
            numero_pelea,
            estado,
            ganador,
            apuestas (
                id,
                jugador_id,
                bando,
                monto,
                resultado,
                jugadores (
                    nombre
                )
            )
        `);
  if (error) {
    console.error("Error cargando peleas:", error);
    return;
  }
  peleas = data.map(p => ({
    id: p.id,
    num: p.numero_pelea,
    estado: p.estado,
    ganador: p.ganador || undefined,
    apuestas: p.apuestas ? p.apuestas.map(a => ({
      id: a.id,
      jugadorId: a.jugador_id,
      nombre: a.jugadores?.nombre || 'Desconocido',
      bando: a.bando,
      monto: parseFloat(a.monto) || 0,
      resultado: a.resultado
    })) : []
  }));
}

async function fetchBitacora() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('bitacora')
    .select(`
            tipo,
            mensaje,
            icon,
            created_at,
            usuarios (
                nombre_completo,
                rol
            )
        `)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) {
    console.error("Error cargando bitácora:", error);
    return;
  }
  bitacora = data.map(b => {
    const d = new Date(b.created_at);
    const ts = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return {
      ts,
      user: b.usuarios?.nombre_completo || 'Sistema',
      rol: b.usuarios?.rol || 'sistema',
      tipo: b.tipo,
      msg: b.mensaje,
      icon: b.icon || '📋'
    };
  });
}

// ── REFRESH DATA & REALTIME ────────────────────────────────

async function refreshData() {
  await fetchJugadores();
  await fetchPeleas();
  await fetchBitacora();

  if (peleas.length > 0) {
    peleaActual = Math.max(...peleas.map(p => p.num));
    const activePelea = peleas.find(p => p.num === peleaActual);
    estadoPelea = activePelea ? activePelea.estado : 'espera';
  } else {
    peleaActual = 1;
    estadoPelea = 'espera';
  }

  // Si hay un jugador seleccionado, actualizar su referencia
  if (selectedJugador) {
    selectedJugador = jugadores.find(x => x.id === selectedJugador.id) || null;
  }

  // Actualizar la UI
  if (typeof renderDashboard === 'function') {
    // En Admin
    if (currentTab === 'dashboard') renderDashboard();
    if (currentTab === 'peleas') renderPeleas();
    if (currentTab === 'fichas') { renderFicha(); renderJugList(jugadores); }
    if (currentTab === 'diario') renderPeriodo('diario');
    if (currentTab === 'semanal') renderPeriodo('semanal');
    if (currentTab === 'bitacora') renderBitacora();
  } else if (typeof renderPeleas === 'function') {
    // En Empleado
    renderPeleas();
  }
}

function initRealtime() {
  if (!supabase) return;
  supabase
    .channel('schema-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'peleas' }, () => refreshData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'apuestas' }, () => refreshData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jugadores' }, () => refreshData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bitacora' }, () => refreshData())
    .subscribe();
}

// ── AUTH ──────────────────────────────────────────────────

async function doLogin() {
  const u = document.getElementById('li-u').value.trim();
  const p = document.getElementById('li-p').value;

  if (!supabase) {
    alert("Supabase no está configurado.");
    return;
  }

  const { data: user, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('username', u)
    .eq('password_hash', p)
    .maybeSingle();

  if (error || !user) {
    document.getElementById('l-err').classList.add('show');
    document.getElementById('li-p').value = '';
    return;
  }

  document.getElementById('l-err').classList.remove('show');

  const sessionUser = {
    id: user.id,
    usuario: user.username,
    nombre: user.nombre_completo,
    rol: user.rol
  };

  currentUser = sessionUser;
  sessionStorage.setItem('currentUser', JSON.stringify(sessionUser));

  // Registrar inicio de sesión en BD
  await supabase
    .from('usuarios')
    .update({ esta_conectado: true, ultimo_acceso: new Date().toISOString() })
    .eq('id', user.id);

  // Redirigir según rol
  if (user.rol === 'admin') {
    window.location.href = '../admin/index.html';
  } else {
    window.location.href = '../empleado/index.html';
  }
}

async function doLogout() {
  if (currentUser && supabase) {
    // Actualizar estado en BD
    await supabase
      .from('usuarios')
      .update({ esta_conectado: false })
      .eq('id', currentUser.id);
  }
  currentUser = null;
  selectedJugador = null;
  sessionStorage.removeItem('currentUser');
  window.location.href = '../index.html';
}

const isAdmin = () => currentUser?.rol === 'admin';

// ── NAV / SIDEBAR ─────────────────────────────────────────
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
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
async function eliminarPelea(num) {
  if (!supabase) return;
  const { data: pelea } = await supabase.from('peleas').select('id').eq('numero_pelea', num).single();
  if (!pelea) return;
  const nombrePelea = `Pelea #${num}`;

  const { error } = await supabase.from('peleas').delete().eq('id', pelea.id);
  if (error) {
    toast(`⚠️ Error al eliminar ${nombrePelea}: ${error.message}`, 'error');
    return;
  }

  await logAction('eliminar', `Pelea #${num} eliminada`, '🗑️');
  await refreshData();
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
    .reduce((s, a) => s + (a.monto * 0.9), 0);

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
 * Agrega un evento a la bitácora en Supabase.
 */
async function logAction(tipo, msg, icon = '🎯') {
  if (!supabase || !currentUser) return;
  const { error } = await supabase.from('bitacora').insert({
    tipo,
    mensaje: msg,
    icon,
    usuario_id: currentUser.id
  });
  if (error) console.error("Error al guardar en bitácora:", error);
}

// ── CONFIRM MODAL ─────────────────────────────────────────

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

    const msgEl = overlay.querySelector('#confirm-msg');
    const iconEl = overlay.querySelector('#confirm-icon');
    const okBtn = overlay.querySelector('#confirm-ok');
    const cancelBtn = overlay.querySelector('#confirm-cancel');

    msgEl.innerHTML = msg;
    iconEl.textContent = icon;
    okBtn.textContent = btnText;
    okBtn.className = `mbtn ${btnClass}`;
    overlay.style.display = 'flex';

    const keyHandler = e => {
      if (e.key === 'Escape') { cleanup(); resolve(false); }
      if (e.key === 'Enter') { cleanup(); resolve(true); }
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

// ── PELEAS (acceso compartido de compatibilidad) ──────────

function getPelea(num) {
  let p = peleas.find(x => x.num === num);
  if (!p) {
    p = { num, estado: 'espera', apuestas: [], minimizada: false };
  }
  return p;
}

function addApuestaToPelea(num, ap) {
  const p = getPelea(num);
  if (p && !p.apuestas.find(a => a.id === ap.id)) {
    p.apuestas.push({ ...ap });
  }
}

// ── ICONOS SVG ────────────────────────────────────────────
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

// ── INIT LISTENERS ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const pBtn = document.getElementById('li-p');
  const uBtn = document.getElementById('li-u');
  if (pBtn) pBtn.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  if (uBtn) uBtn.addEventListener('keydown', e => { if (e.key === 'Enter') pBtn?.focus(); });

  initNav();
});