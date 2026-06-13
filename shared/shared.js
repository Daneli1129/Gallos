const SUPABASE_URL = 'https://nqrprvaszwocvlrjsuwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnBydmFzendvY3ZscmpzdXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTIxNDUsImV4cCI6MjA5Njc4ODE0NX0.Mwv-gANBSyR2IuJDgqoG5B1v_JSpTaXcbhSGsJw08fE';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

const empSessions = {};
let currentUser = null;
let authReady = false;
let _authResolve;
const authReadyPromise = new Promise(r => { _authResolve = r; });

async function waitForAuth(timeout = 5000) {
  if (authReady) return;
  const timer = setTimeout(() => { if (!authReady) { authReady = true; _authResolve(); } }, timeout);
  await authReadyPromise;
  clearTimeout(timer);
}
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

const COLORS = [
  '#E8C97A', '#E74C3C', '#2ECC71', '#D4A24A',
  '#7c3aed', '#3AB0FF', '#C9A84C', '#C0392B'
];

let jugadores = [];
let peleas = [];
let peleaActual = 1;
let estadoPelea = 'espera';
let selectedJugador = null;
let currentTab = '';
let bitacora = [];
let logFiltro = 'todos';

// ── CONFIGURACIONES GLOBALES ──
const appConfig = {
  comision_porcentaje: 10,
  limite_credito: 5000,
  pin_autorizacion: '8888'
};

async function fetchConfig() {
  try {
    const { data, error } = await sb.from('configuraciones').select('*');
    if (!error && data) {
      data.forEach(row => {
        if (row.clave === 'comision_porcentaje') appConfig.comision_porcentaje = parseFloat(row.valor) || 10;
        if (row.clave === 'limite_credito') appConfig.limite_credito = parseFloat(row.valor) || 5000;
        if (row.clave === 'pin_autorizacion') appConfig.pin_autorizacion = row.valor || '8888';
      });
    }
  } catch (e) {
    console.warn("No se pudo cargar la configuración de Supabase, usando locales:", e);
  }
}


// ── XSS SANITIZATION ──
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function sanitize(str) {
  return escapeHtml(str);
}

// ── CSP (Content Security Policy) ──
(function injectCSP() {
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://nqrprvaszwocvlrjsuwr.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://nqrprvaszwocvlrjsuwr.supabase.co wss://nqrprvaszwocvlrjsuwr.supabase.co; img-src 'self' data:;";
  document.head.appendChild(meta);
})();

// ── UTILIDADES ──
const fmt = n =>
  '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const initials = n =>
  n ? n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '??';

const nowStr = () =>
  new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const today = () =>
  new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const todayShort = () =>
  new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });

const fmtTime = d =>
  d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';

// ── SUPABASE AUTH ──

async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await loadUsuarioFromAuth(session.user.id);
  }
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await loadUsuarioFromAuth(session.user.id);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      selectedJugador = null;
    }
  });
  authReady = true;
  _authResolve();
}

async function loadUsuarioFromAuth(authUserId) {
  let { data, error } = await sb
    .from('usuarios')
    .select('id, username, nombre_completo, rol')
    .eq('auth_id', authUserId)
    .maybeSingle();

  // Si no se encuentra el perfil del usuario autenticado, intentar auto-vincular usando RPC
  if (!error && !data) {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (user && user.email) {
        const username = user.email.split('@')[0];
        const { data: linked } = await sb.rpc('vincular_auth_id', { p_username: username });
        if (linked) {
          const res = await sb
            .from('usuarios')
            .select('id, username, nombre_completo, rol')
            .eq('auth_id', authUserId)
            .maybeSingle();
          data = res.data;
          error = res.error;
        }
      }
    } catch (e) {
      console.warn("Intento de auto-vinculación fallido:", e);
    }
  }

  if (error || !data) {
    console.error('Error loading user profile:', error);
    currentUser = null;
    return;
  }

  currentUser = {
    id: data.id,
    usuario: data.username,
    nombre: data.nombre_completo,
    rol: data.rol,
    auth_id: authUserId
  };

  // Update connected status
  await sb.from('usuarios').update({
    esta_conectado: true,
    ultimo_acceso: new Date().toISOString()
  }).eq('id', data.id);
}

async function doLogin() {
  const u = document.getElementById('li-u')?.value.trim();
  const p = document.getElementById('li-p')?.value;
  const errEl = document.getElementById('l-err');

  if (!u || !p) {
    if (errEl) {
      errEl.textContent = 'Completa todos los campos.';
      errEl.classList.add('show');
    }
    return;
  }

  // Rate limiting check
  if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    if (errEl) {
      errEl.textContent = `Demasiados intentos. Espera ${LOGIN_LOCKOUT_MINUTES} minutos.`;
      errEl.classList.add('show');
    }
    return;
  }

  const btn = document.getElementById('l-btn');
  if (btn) btn.classList.add('cargando');

  const email = `${u}@gallogold.local`;

  const { data, error } = await sb.auth.signInWithPassword({
    email: email,
    password: p
  });

  if (btn) btn.classList.remove('cargando');

  if (error || !data?.user) {
    loginAttempts++;
    // Log failed attempt
    await logFailedLogin(u);
    if (errEl) {
      errEl.textContent = 'Usuario o contraseña incorrectos.';
      errEl.classList.add('show');
    }
    const passEl = document.getElementById('li-p');
    if (passEl) passEl.value = '';
    return;
  }

  loginAttempts = 0;
  if (errEl) errEl.classList.remove('show');

  // loadUsuarioFromAuth will be triggered by onAuthStateChange SIGNED_IN
  // Wait a beat for the profile to load
  await new Promise(r => setTimeout(r, 300));

  if (!currentUser) {
    // Fallback: try to load directly
    await loadUsuarioFromAuth(data.user.id);
  }

  if (!currentUser) {
    if (errEl) {
      errEl.textContent = 'Error al cargar perfil de usuario.';
      errEl.classList.add('show');
    }
    await sb.auth.signOut();
    return;
  }

  // Redirect
  if (currentUser.rol === 'admin') {
    window.location.href = '../admin/index.html';
  } else {
    window.location.href = '../empleado/index.html';
  }
}

async function doLogout() {
  if (currentUser) {
    await sb.from('usuarios').update({ esta_conectado: false }).eq('id', currentUser.id);
  }
  currentUser = null;
  selectedJugador = null;
  await sb.auth.signOut();
  window.location.href = '../index.html';
}

async function logFailedLogin(username) {
  try {
    await sb.from('bitacora').insert({
      tipo: 'auth_failed',
      mensaje: `Intento fallido de inicio de sesión: ${sanitize(username)}`,
      icon: '!'
    });
  } catch (e) {
    console.error('Error logging failed login:', e);
  }
}

const isAdmin = () => currentUser?.rol === 'admin';

// ── CONSULTAS DE LECTURA SUPABASE ──

async function fetchJugadores() {
  const { data, error } = await sb
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
                    numero_pelea,
                    estado,
                    ganador
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
      resultado: a.resultado,
      peleaEstado: a.peleas?.estado || 'espera',
      peleaGanador: a.peleas?.ganador || null
    })) : []
  }));
}

async function fetchPeleas() {
  const { data, error } = await sb
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
  const oldPeleas = [...peleas];
  peleas = data.map(p => {
    const old = oldPeleas.find(o => o.num == p.numero_pelea);
    return {
      id: p.id,
      num: p.numero_pelea,
      estado: p.estado,
      ganador: p.ganador || undefined,
      minimizada: old ? old.minimizada : undefined,
      apuestas: p.apuestas ? p.apuestas.map(a => ({
        id: a.id,
        jugadorId: a.jugador_id,
        nombre: a.jugadores?.nombre || 'Desconocido',
        bando: a.bando,
        monto: parseFloat(a.monto) || 0,
        resultado: a.resultado
      })) : []
    };
  });
}

async function fetchBitacora() {
  const { data, error } = await sb
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

// ── REFRESH DATA & REALTIME ──

async function refreshData() {
  await fetchConfig();
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

  if (selectedJugador) {
    selectedJugador = jugadores.find(x => x.id === selectedJugador.id) || null;
  }

  if (typeof renderDashboard === 'function') {
    if (currentTab === 'dashboard') renderDashboard();
    if (currentTab === 'peleas') renderPeleas();
    if (currentTab === 'fichas') { renderFicha(); renderJugList(jugadores); }
    if (currentTab === 'diario') renderPeriodo('diario');
    if (currentTab === 'semanal') renderPeriodo('semanal');
    if (currentTab === 'bitacora') renderBitacora();
    if (currentTab === 'config') typeof renderConfig === 'function' && renderConfig();
  } else if (typeof renderPeleas === 'function') {
    if (currentTab === 'peleas') renderPeleas();
    if (currentTab === 'fichas') { if (typeof renderFicha === 'function') { renderFicha(); renderJugList(jugadores); } }
    if (currentTab === 'diario') { if (typeof renderPeriodo === 'function') renderPeriodo('diario'); }
    if (currentTab === 'semanal') { if (typeof renderPeriodo === 'function') renderPeriodo('semanal'); }
    if (currentTab === 'bitacora') { if (typeof renderBitacora === 'function') renderBitacora(); }
  }
}

function initRealtime() {
  sb
    .channel('schema-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'peleas' }, () => refreshData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'apuestas' }, () => refreshData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jugadores' }, () => refreshData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'configuraciones' }, () => refreshData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bitacora' }, () => refreshData())
    .subscribe();
}

// ── NAV / SIDEBAR ──
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

// ── ELIMINAR PELEA ──
async function eliminarPelea(num) {
  const { data: pelea } = await sb.from('peleas').select('id').eq('numero_pelea', num).single();
  if (!pelea) return;
  const nombrePelea = `Pelea #${num}`;

  const { error } = await sb.from('peleas').delete().eq('id', pelea.id);
  if (error) {
    toast(`Error al eliminar ${nombrePelea}: ${error.message}`, 'error');
    return;
  }

  await logAction('eliminar', `Pelea #${num} eliminada`, '🗑️');
  await refreshData();
  toast(`<strong>${nombrePelea}</strong> eliminada`, 'error');
}

// ── CÁLCULO DE FICHA ──
function calcFicha(j) {
  const coef = 1 - (appConfig.comision_porcentaje / 100);

  const totalPerdidas = j.apuestas
    .filter(a => a.resultado === 'perdida')
    .reduce((s, a) => s + a.monto, 0);

  const totalGanadas = j.apuestas
    .filter(a => a.resultado === 'ganada')
    .reduce((s, a) => s + (a.monto * coef), 0);

  const saldoAntTotal = j.saldoAnt + totalPerdidas;
  const saldo = totalGanadas - saldoAntTotal;

  return {
    saldo,
    ganadas: j.apuestas.filter(a => a.resultado === 'ganada'),
    perdidas: j.apuestas.filter(a => a.resultado === 'perdida'),
    devueltas: j.apuestas.filter(a => a.resultado === 'devuelta' || (a.resultado === 'pendiente' && a.peleaEstado === 'cerrada')),
    enJuego: j.apuestas.filter(a => a.resultado === 'pendiente' && a.peleaEstado !== 'cerrada'),
    totalGanadas,
    totalPerdidas,
    saldoAntTotal
  };
}

// ── BITÁCORA ──
async function logAction(tipo, msg, icon = '🎯') {
  if (!currentUser) return;
  const { error } = await sb.from('bitacora').insert({
    tipo,
    mensaje: msg,
    icon,
    usuario_id: currentUser.id
  });
  if (error) console.error("Error al guardar en bitácora:", error);
}

// ── CONFIRM MODAL ──
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

// ── TOAST ──
function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.dataset.type = type;
  document.getElementById('tmsg').innerHTML = msg;
  t.classList.remove('visible');
  void t.offsetWidth;
  t.classList.add('visible');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('visible'), 2800);
}

// ── PELEAS (acceso compartido de compatibilidad) ──
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

// ── ICONOS SVG ──
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
  eyeOff: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  dg: `<svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3.5" fill="var(--green2)"/></svg>`,
  dr: `<svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3.5" fill="var(--rojo2)"/></svg>`,
  dy: `<svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3.5" fill="var(--gold)"/></svg>`,
};

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await fetchConfig();

  const pBtn = document.getElementById('li-p');
  const uBtn = document.getElementById('li-u');
  if (pBtn) pBtn.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  if (uBtn) uBtn.addEventListener('keydown', e => { if (e.key === 'Enter') pBtn?.focus(); });

  initNav();
});
