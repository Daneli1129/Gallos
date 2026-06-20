// ============================================================
// admin/admin.js
// Lógica exclusiva del panel administrador:
//   - Nav, tabs, jugadores list, fichas (solo lectura)
//   - Peleas (solo lectura), Diario, Semanal, Bitácora, PDF
// ============================================================

// Iconos formales (sin emojis)
const UI_ICONS = {
  user: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  apuesta: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
  resultado: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>`,
  eliminar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  estado: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

let peleaFilter = 'activa';
function setPeleaFilter(f) { peleaFilter = f; renderPeleas(); }

// ── TABS DE ADMIN ─────────────────────────────────────────
const TABS_ADMIN = [
  { id: 'dashboard', label: 'Panel', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>` },
  { id: 'fichas', label: 'Fichas', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>` },
  { id: 'peleas', label: 'Pelea', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>` },
  { id: 'diario', label: 'Corte Día', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
  { id: 'semanal', label: 'Corte Semana', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>` },
  { id: 'bitacora', label: 'Auditoría', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
  { id: 'config', label: 'Ajustes', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` },
];

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await waitForAuth();
  if (!currentUser) {
    window.location.href = '../index.html';
    return;
  }
  if (currentUser.rol !== 'admin') {
    if (currentUser.rol === 'empleado') {
      window.location.href = '../empleado/index.html';
    } else {
      window.location.href = '../index.html';
    }
    return;
  }

  const u = currentUser;
  document.getElementById('nav-av').textContent = initials(u.nombre);
  document.getElementById('nav-un').textContent = u.nombre;
  document.getElementById('tb-av').textContent  = initials(u.nombre);
  document.getElementById('tb-un').textContent  = u.nombre;
  
  const mobAv = document.getElementById('mob-av-circle');
  if (mobAv) mobAv.textContent = initials(u.nombre);

  buildNav();
  buildMobNav();

  await refreshData();
  initRealtime();
  
  setTab('peleas');
});

// ── NAV ───────────────────────────────────────────────────
function buildNav() {
  const nb = document.getElementById('nav-body');
  nb.innerHTML = '';

  TABS_ADMIN.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.id = `ni-${t.id}`;
    btn.innerHTML = `${t.icon}<span class="nav-label">${t.label}</span><span class="tip">${t.label}</span>`;
    btn.onclick = () => setTab(t.id);
    nb.appendChild(btn);
  });
}

function buildMobNav() {
  const nav = document.getElementById('mob-bottom-nav');
  nav.innerHTML = '';

  TABS_ADMIN.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'mob-nav-btn';
    btn.id = `mob-ni-${t.id}`;
    btn.innerHTML = `${t.icon}<span>${t.label.split(' ')[0]}</span>`;
    btn.onclick = () => setTab(t.id);
    nav.appendChild(btn);
  });
}

// ── TABS ──────────────────────────────────────────────────
function setTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.nav-item,.mob-nav-btn').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('visible'));

  document.getElementById(`tab-${tab}`)?.classList.add('visible');
  document.getElementById(`ni-${tab}`)?.classList.add('active');
  document.getElementById(`mob-ni-${tab}`)?.classList.add('active');

  if (tab === 'fichas') {
    renderJugList(jugadores);
    if (!selectedJugador) {
      document.getElementById('fichas-empty').style.display = 'flex';
      document.getElementById('fichas-empty').innerHTML = `
        <div style="color:var(--text3); opacity:0.6; margin-bottom:12px;">${UI_ICONS.user}</div>
        <p>Selecciona un apostador para ver su ficha</p>
      `;
      document.getElementById('ficha-detail').style.display = 'none';
    }
  }
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'peleas')    renderPeleas();
  if (tab === 'diario')    renderPeriodo('diario');
  if (tab === 'semanal')   renderPeriodo('semanal');
  if (tab === 'bitacora')  renderBitacora();
  if (tab === 'config')    renderConfig();
}

// ── DASHBOARD ─────────────────────────────────────────────
/* Animación contadora para dashboard */
function counterStart() {
  document.querySelectorAll('.dash-card-val, .dash-comision-val, .dash-flow-val').forEach(el => {
    const raw = el.textContent.trim();
    const num = parseFloat(raw.replace(/[$,]/g, ''));
    if (isNaN(num)) return;
    const isCurrency = raw.includes('$');
    const dur = 600 + Math.min(num, 50000) * .008;
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(num * ease);
      el.textContent = isCurrency ? fmt(cur) : cur;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = raw;
    }
    requestAnimationFrame(tick);
  });
}

function renderDashboard() {
  const el = document.getElementById('dash-wrap');

  const totalPeleas = peleas.length;
  const activas = peleas.filter(p => p.estado === 'activa').length;
  const cerradas = peleas.filter(p => p.estado === 'cerrada').length;
  const espera = peleas.filter(p => p.estado === 'espera').length;

  const totalApuestas = jugadores.reduce((s, j) => s + j.apuestas.length, 0);
  const totalRojo = jugadores.reduce((s, j) =>
    s + j.apuestas.filter(a => a.bando === 'rojo').reduce((a, b) => a + b.monto, 0), 0);
  const totalVerde = jugadores.reduce((s, j) =>
    s + j.apuestas.filter(a => a.bando === 'verde').reduce((a, b) => a + b.monto, 0), 0);
  const totalDinero = totalRojo + totalVerde;
  const totalEnJuego = jugadores.reduce((s, j) => {
    const { enJuego } = calcFicha(j);
    return s + enJuego.reduce((a, b) => a + b.monto, 0);
  }, 0);
  const coef = 1 - (appConfig.comision_porcentaje / 100);
  const payoutRojo = totalVerde * coef;
  const payoutVerde = totalRojo * coef;
  const exposure = Math.abs(payoutRojo - payoutVerde);
  const pctRojo = totalDinero > 0 ? Math.round(totalRojo / totalDinero * 100) : 50;
  const pctVerde = 100 - pctRojo;
  const comPct = appConfig.comision_porcentaje / 100;
  const comisionGarantizada = Math.min(totalRojo, totalVerde) * comPct;
  const comisionMax = Math.max(totalRojo, totalVerde) * comPct;
  const pctComision = totalDinero > 0 ? (comisionGarantizada / totalDinero * 100).toFixed(1) : '0.0';

  const top = [...jugadores]
    .map(j => ({ ...j, apCount: j.apuestas.length, ficha: calcFicha(j) }))
    .sort((a, b) => b.ficha.totalPerdidas + b.ficha.totalGanadas - (a.ficha.totalPerdidas + a.ficha.totalGanadas))
    .slice(0, 5);

  const activos = jugadores.filter(j => j.apuestas.some(a => !a.resultado)).length;
  const ganadores = jugadores.filter(j => calcFicha(j).saldo > 0).length;
  const perdedores = jugadores.filter(j => calcFicha(j).saldo < 0).length;

  el.innerHTML = `
    <div class="dash">
      <div class="dash-hdr">
        <div class="dash-kicker">GALLO GOLD · BRUNO'S</div>
        <div class="dash-hdr-title">Panel de Control</div>
        <div class="dash-hdr-sub">${today()} · ${nowStr()}</div>
      </div>

      <div class="dash-flow">
        <div class="dash-flow-card">
          <span class="dash-flow-dot r"></span>
          <div class="dash-flow-info">
            <span class="dash-flow-lbl">Rojo</span>
            <span class="dash-flow-val">${fmt(totalRojo)}</span>
          </div>
          <span class="dash-flow-pct">${pctRojo}%</span>
        </div>
        
        <div class="dash-flow-vs-circle">
          <svg width="68" height="68" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5"></circle>
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--rojo2)" stroke-width="2.5" stroke-dasharray="${pctRojo} ${100 - pctRojo}" stroke-dashoffset="25" style="filter: drop-shadow(0 0 4px var(--rojo2));"></circle>
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--green2)" stroke-width="2.5" stroke-dasharray="${pctVerde} ${100 - pctVerde}" stroke-dashoffset="${25 - pctRojo}" style="filter: drop-shadow(0 0 4px var(--green2));"></circle>
          </svg>
          <div class="dash-flow-vs-lbl">VS</div>
        </div>

        <div class="dash-flow-card">
          <span class="dash-flow-dot v"></span>
          <div class="dash-flow-info">
            <span class="dash-flow-lbl">Verde</span>
            <span class="dash-flow-val">${fmt(totalVerde)}</span>
          </div>
          <span class="dash-flow-pct">${pctVerde}%</span>
        </div>
        <div class="dash-flow-exp">
          <span class="dash-flow-exp-lbl">Brecha</span>
          <span class="dash-flow-exp-val">${fmt(exposure)}</span>
        </div>
      </div>

      <div class="dash-grid">
        <div class="dash-card">
          <div class="dash-card-icon dash-icon-red">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div class="dash-card-body">
            <div class="dash-card-val">${totalPeleas}</div>
            <div class="dash-card-lbl">Peleas</div>
          </div>
          <div class="dash-card-ft">
            <span class="dash-chip e">${espera} abiertas</span>
            <span class="dash-chip a">${activas} en juego</span>
            <span class="dash-chip c">${cerradas} cerradas</span>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-icon dash-icon-green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="dash-card-body">
            <div class="dash-card-val">${totalApuestas}</div>
            <div class="dash-card-lbl">Apuestas</div>
          </div>
          <div class="dash-card-ft">
            <span class="dash-mini-metric">${fmt(totalDinero)} volumen</span>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-icon dash-icon-gold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          </div>
          <div class="dash-card-body">
            <div class="dash-card-val">${fmt(totalEnJuego)}</div>
            <div class="dash-card-lbl">En Juego</div>
          </div>
          <div class="dash-card-ft">
            <span class="dash-mini-metric">Pago R ${fmt(payoutRojo)}</span>
            <span class="dash-mini-metric">Pago V ${fmt(payoutVerde)}</span>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-icon dash-icon-blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="dash-card-body">
            <div class="dash-card-val">${jugadores.length}</div>
            <div class="dash-card-lbl">Apostadores</div>
          </div>
          <div class="dash-card-ft">
            <span class="dash-mini-metric">${activos} activos</span>
            <span class="dash-mini-metric">${ganadores} ganan</span>
            <span class="dash-mini-metric">${perdedores} pierden</span>
          </div>
        </div>
      </div>

      <!-- Comisión -->
      <div class="dash-comision">
        <div class="dash-comision-body">
          <div class="dash-comision-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="dash-comision-info">
            <div class="dash-comision-val">${fmt(comisionGarantizada)}</div>
            <div class="dash-comision-lbl">Comisión Garantizada</div>
          </div>
          <div class="dash-comision-div"></div>
          <div class="dash-comision-info">
            <div class="dash-comision-val">${fmt(comisionMax)}</div>
            <div class="dash-comision-lbl">Comisión Potencial</div>
          </div>
          <div class="dash-comision-div"></div>
          <div class="dash-comision-info">
            <div class="dash-comision-val dash-comision-vol">${fmt(totalDinero)}</div>
            <div class="dash-comision-lbl">Volumen Total</div>
          </div>
          <div class="dash-comision-div"></div>
          <div class="dash-comision-badge">${pctComision}%</div>
        </div>
      </div>

      <div class="dash-section">
        <div class="dash-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
          Mayor Actividad
          <span class="dash-section-caption">Volumen operativo</span>
        </div>
        <div class="dash-rank">
          ${top.map((j, i) => {
            const medals = { 0: '🥇', 1: '🥈', 2: '🥉' };
            const posBadge = medals[i] 
              ? `<span class="dash-rank-medal" title="Top ${i+1}">${medals[i]}</span>` 
              : `<span class="dash-rank-pos">${i + 1}</span>`;
            return `
            <div class="dash-rank-item" onclick="selectJugador(jugadores.find(x=>x.id==='${j.id}')); setTab('fichas');">
              ${posBadge}
              <div class="dash-rank-av" style="background:${j.color}22;color:${j.color};border-color:${j.color}55;">${initials(j.nombre)}</div>
              <div class="dash-rank-info">
                <div class="dash-rank-name">${sanitize(j.nombre)}</div>
                <div class="dash-rank-meta">${j.apCount} apuestas · ${j.ficha.enJuego.length} abiertas</div>
              </div>
              <div class="dash-rank-saldo ${j.ficha.saldo >= 0 ? 'sp' : 'sn'}">
                ${j.ficha.saldo >= 0 ? '+' : '−'}${fmt(j.ficha.saldo)}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  requestAnimationFrame(() => counterStart());
}

// ── DRAWER MÓVIL ──────────────────────────────────────────
function openDrawer() {
  document.getElementById('mob-drawer').classList.add('open');
  renderMobJugList(jugadores);
  document.getElementById('mob-search').value = '';
}
function closeDrawer() {
  document.getElementById('mob-drawer').classList.remove('open');
}
function filterJugMob() {
  const q = document.getElementById('mob-search').value.toLowerCase();
  renderMobJugList(jugadores.filter(j => j.nombre.toLowerCase().includes(q) || j.id.toLowerCase().includes(q)));
}
function renderMobJugList(list) {
  const el = document.getElementById('mob-jug-list');
  el.innerHTML = '';
  const sorted = [...list].sort((a, b) => b.apuestas.length - a.apuestas.length);
  sorted.forEach((j, idx) => {
    const { saldo, ganadas, perdidas, enJuego } = calcFicha(j);
    const sc   = saldo > 0 ? 'sp' : saldo < 0 ? 'sn' : 'sz';
    const sign = saldo >= 0 ? '+' : '−';
    const gLen = ganadas.length, pLen = perdidas.length, eLen = enJuego.length;
    const d    = document.createElement('div');
    d.className = `p-card${selectedJugador?.id === j.id ? ' active' : ''}`;
    d.innerHTML = `
      <div class="p-av" style="background:${j.color}22;color:${j.color};border-color:${j.color}55;">${initials(j.nombre)}</div>
      <div class="p-info">
        <div class="p-name">${sanitize(j.nombre)}${idx < 3 ? `<span class="p-rank">${idx + 1}</span>` : ''}</div>
        <div class="p-meta">
          <span class="p-stats">
            <span class="p-stat-tot">${j.apuestas.length} apuestas</span>
            ${gLen ? `<span class="p-stat-w">${gLen} G</span>` : ''}
            ${pLen ? `<span class="p-stat-l">${pLen} P</span>` : ''}
            ${eLen ? `<span class="p-stat-a">${eLen} activas</span>` : ''}
          </span>
          <span class="p-saldo ${sc}">${sign}${fmt(saldo)}</span>
        </div>
      </div>`;
    d.onclick = () => { selectJugador(j); closeDrawer(); };
    el.appendChild(d);
  });
}

// ── LISTA JUGADORES ───────────────────────────────────────
function filterJug() {
  const q = document.getElementById('search-inp').value.toLowerCase();
  renderJugList(jugadores.filter(j => j.nombre.toLowerCase().includes(q) || j.id.toLowerCase().includes(q)));
}
function renderJugList(list) {
  const el = document.getElementById('jugadores-list');
  el.innerHTML = '';
  const sorted = [...list].sort((a, b) => b.apuestas.length - a.apuestas.length);
  sorted.forEach((j, idx) => {
    const { saldo, ganadas, perdidas, enJuego } = calcFicha(j);
    const sc   = saldo > 0 ? 'sp' : saldo < 0 ? 'sn' : 'sz';
    const sign = saldo >= 0 ? '+' : '−';
    const gLen = ganadas.length, pLen = perdidas.length, eLen = enJuego.length;
    const d    = document.createElement('div');
    d.className = `p-card${selectedJugador?.id === j.id ? ' active' : ''}`;
    d.innerHTML = `
      <div class="p-av" style="background:${j.color}22;color:${j.color};border-color:${j.color}55;">${initials(j.nombre)}</div>
      <div class="p-info">
        <div class="p-name">${sanitize(j.nombre)}${idx < 3 ? `<span class="p-rank">${idx + 1}</span>` : ''}</div>
        <div class="p-meta">
          <span class="p-stats">
            <span class="p-stat-tot">${j.apuestas.length} apuestas</span>
            ${gLen ? `<span class="p-stat-w">${gLen} G</span>` : ''}
            ${pLen ? `<span class="p-stat-l">${pLen} P</span>` : ''}
            ${eLen ? `<span class="p-stat-a">${eLen} activas</span>` : ''}
          </span>
          <span class="p-saldo ${sc}">${sign}${fmt(saldo)}</span>
        </div>
      </div>`;
    d.onclick = () => selectJugador(j);
    el.appendChild(d);
  });
}
function selectJugador(j) {
  selectedJugador = j;
  setTab('fichas');
  renderFicha();
  renderJugList(jugadores);
  document.getElementById('mob-sel').textContent = j.nombre;
}

// ── FICHAS (solo lectura) ─────────────────────────────────
function renderFicha() {
  const empty  = document.getElementById('fichas-empty');
  const detail = document.getElementById('ficha-detail');

  if (!selectedJugador) {
    empty.style.display  = 'flex';
    detail.style.display = 'none';
    return;
  }
  empty.style.display  = 'none';
  detail.style.display = 'block';

  const j = selectedJugador;
  const { saldo, ganadas, perdidas, enJuego, totalGanadas, totalPerdidas, saldoAntTotal } = calcFicha(j);
  const esBien = saldo >= 0;
  const sign   = esBien ? '+' : '−';
  const maxRows = Math.max(perdidas.length, ganadas.length, 1);

  let rows = '';
  for (let i = 0; i < maxRows; i++) {
    const p = perdidas[i], g = ganadas[i];
    rows += `<div class="fc-row">
      <div class="fc-cell l">
        ${p ? `<span class="pnum">P${p.pelea}</span><span class="pm neg">${fmt(p.monto)}</span>` : '<span style="color:var(--text3);font-size:10px;">—</span>'}
      </div>
      <div class="fc-cell">
        ${g ? `<span class="pnum">P${g.pelea}</span><span class="pm pos">${fmt(g.monto * (1 - appConfig.comision_porcentaje / 100))}</span>` : '<span style="color:var(--text3);font-size:10px;">—</span>'}
      </div>
    </div>`;
  }
  if (enJuego.length) {
    enJuego.forEach(a => {
      rows += `<div class="fc-row">
        <div class="fc-cell l" style="opacity:.5"><span style="font-size:10px;color:var(--text3);">En juego P${a.pelea}</span></div>
        <div class="fc-cell"  style="opacity:.5"><span class="pm neu">${fmt(a.monto)}</span></div>
      </div>`;
    });
  }

  detail.innerHTML = `
    <div class="ficha-card">
      <div class="fc-head">
        <div class="fc-av" style="background:${j.color}22;color:${j.color};border-color:${j.color};">${initials(j.nombre)}</div>
        <div class="fc-info">
          <div class="fc-name">${sanitize(j.nombre)}</div>
          <div class="fc-sub">${j.apuestas.length} apuestas · ${today()}</div>
          ${j.addedBy ? `<div class="fc-by">Registrado por ${j.addedBy}</div>` : ''}
        </div>
        <div class="fc-pv">
          <div class="fc-pv-lbl">Balance</div>
          <div class="fc-pv-val ${esBien ? 'pos' : 'neg'}">${sign}${fmt(saldo)}</div>
        </div>
      </div>
      <div class="fc-actions">
        <button class="btn-sm" onclick="exportPDF('${j.id}','diario')">${I.dl} PDF Día</button>
        <button class="btn-sm" onclick="exportPDF('${j.id}','semanal')">${I.dl} PDF Corte</button>
      </div>
      <div class="fc-saldo-ant">
        <div class="fc-sa-row">
          <span class="fc-sa-lbl">Saldo Anterior</span>
          <div class="fc-sa-inp-grp">
            <span class="fc-sa-prefix">$</span>
            <input class="sa-inp-admin" type="number" value="${j.saldoAnt}" onchange="updSaldoAnt('${j.id}', this.value)">
          </div>
        </div>
      </div>
      <div class="fc-tabla">
        <div class="fc-tabla-hdr">
          <div style="border-right:1px solid var(--border2);"><div class="fc-col-hd p">Perdidas</div></div>
          <div><div class="fc-col-hd g">Ganadas</div></div>
        </div>
        ${rows}
      </div>
      <div class="fc-tots">
        <div class="fc-tot-grid">
          <div class="fc-tot-item">
            <span class="fc-tot-lbl">Saldo Inicial</span>
            <span class="fc-tot-val">${fmt(j.saldoAnt)}</span>
          </div>
          <div class="fc-tot-item">
            <span class="fc-tot-lbl">Total Perdido</span>
            <span class="fc-tot-val sn">${fmt(saldoAntTotal)}</span>
          </div>
          <div class="fc-tot-item">
            <span class="fc-tot-lbl">Total Ganado</span>
            <span class="fc-tot-val sp">${fmt(totalGanadas)}</span>
          </div>
        </div>
      </div>
      <div class="fc-saldo-final ${esBien ? 'win' : 'lose'}">
        <div class="fc-sf-left">
          <span class="fc-sf-lbl">Resultado Final</span>
          <span class="fc-sf-badge ${esBien ? 'g' : 'r'}">${esBien ? 'GANADOR' : 'PERDEDOR'}</span>
        </div>
        <span class="fc-sf-val ${esBien ? 'pos' : 'neg'}">${sign}${fmt(saldo)}</span>
      </div>
    </div>`;
}

async function updSaldoAnt(id, val) {
  const j = jugadores.find(x => x.id === id);
  if (!j) return;
  const numericVal = parseFloat(val) || 0;

  const { error } = await sb
    .from('jugadores')
    .update({ saldo_anterior: numericVal })
    .eq('id', id);
  if (error) {
    toast(`⚠️ Error al actualizar saldo anterior: ${error.message}`, 'error');
    return;
  }

  await refreshData();
  toast(`Saldo anterior de <strong>${j.nombre}</strong> actualizado`, 'success');
}

// ── PELEAS (solo lectura) ─────────────────────────────────
let searchPeleaQuery = '';

function searchPelea(val) {
  searchPeleaQuery = val.trim();
  renderPeleas();
  setTimeout(() => {
    const inp = document.getElementById('pelea-search-inp');
    if (inp) {
      inp.focus();
      const val = inp.value;
      inp.value = '';
      inp.value = val;
    }
  }, 10);
}

function renderPeleas() {
  renderToolbar();
  const sc    = document.getElementById('peleas-scroll');
  sc.innerHTML = '';
  const stateWeight = { activa: 0, espera: 1, cerrada: 2 };
  const lista = [...peleas]
    .sort((a, b) => {
      const wA = stateWeight[a.estado] !== undefined ? stateWeight[a.estado] : 99;
      const wB = stateWeight[b.estado] !== undefined ? stateWeight[b.estado] : 99;
      if (wA !== wB) return wA - wB;
      return b.num - a.num;
    })
    .filter(p => {
      const matchFilter = p.estado === peleaFilter;
      const matchSearch = !searchPeleaQuery || String(p.num).includes(searchPeleaQuery);
      return matchFilter && matchSearch;
    });
  if (!lista.length) {
    sc.innerHTML = `<div class="pb-empty">${
      searchPeleaQuery ? 'No se encontraron peleas con ese número.' :
      peleaFilter === 'activa' ? 'No hay peleas en juego.' :
      peleaFilter === 'espera' ? 'No hay peleas en espera.' :
      'No hay peleas terminadas.'
    }</div>`;
    return;
  }
  lista.forEach((p, i) => {
    const el = buildPB(p);
    el.style.setProperty('--i', i);
    sc.appendChild(el);
  });
}

function renderToolbar() {
  const tb   = document.getElementById('peleas-toolbar');
  const totalPeleas = peleas.length;
  const activas = peleas.filter(p => p.estado === 'activa').length;
  const espera  = peleas.filter(p => p.estado === 'espera').length;
  const cerradas = peleas.filter(p => p.estado === 'cerrada').length;
  const peleaActivaObj = peleas.find(p => p.estado === 'activa');
  const filtros = [
    { id: 'activa', label: 'En juego',   count: activas },
    { id: 'espera', label: 'En espera',  count: espera },
    { id: 'cerrada',label: 'Terminadas', count: cerradas },
  ];

  // Banner de pelea activa
  let bannerHtml = '';
  if (peleaActivaObj) {
    const tR = peleaActivaObj.apuestas.filter(a => a.bando === 'rojo').reduce((s, a) => s + a.monto, 0);
    const tV = peleaActivaObj.apuestas.filter(a => a.bando === 'verde').reduce((s, a) => s + a.monto, 0);
    const vol = tR + tV;
    const enEspera = peleas.filter(p => p.estado === 'espera').length;
    bannerHtml = `
      <div class="active-fight-banner">
        <div class="afb-dot"></div>
        <span class="afb-label">En juego</span>
        <span class="afb-num">#${peleaActivaObj.num}</span>
        ${vol > 0 ? `<span class="afb-vol">${fmt(vol)}</span>` : ''}
        ${enEspera > 0 ? `<span class="afb-sep"></span><span class="afb-queued">${enEspera} en cola</span>` : ''}
      </div>`;
  }

  tb.innerHTML = `
    <div class="p-num-big">⚔️ Peleas</div>
    <div class="ctrl-sep"></div>
    <div class="search-box p-search">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="number" id="pelea-search-inp" placeholder="Buscar #" value="${searchPeleaQuery || ''}" oninput="searchPelea(this.value)">
    </div>
    <div class="pf-row">
      ${filtros.map(f => `
        <button class="pf-btn ${f.id}${peleaFilter === f.id ? ' active' : ''}"
                onclick="setPeleaFilter('${f.id}')">
          <span class="pf-lbl">${f.label}</span>
          <span class="pf-cnt">${f.count}</span>
        </button>`).join('')}
    </div>
    <div class="ctrl-sep"></div>
    <span class="ro-badge">Solo lectura</span>`;

  // Insertar banner después del toolbar si hay pelea activa
  const wrap = document.getElementById('peleas-toolbar').parentElement;
  const oldBanner = wrap.querySelector('.active-fight-banner');
  if (oldBanner) oldBanner.remove();
  if (bannerHtml) {
    const bannerEl = document.createElement('div');
    bannerEl.innerHTML = bannerHtml;
    const toolbar = document.getElementById('peleas-toolbar');
    toolbar.insertAdjacentElement('afterend', bannerEl.firstElementChild);
  }
}

function toggleMin(num) {
  const p = getPelea(num);
  if (p) { p.minimizada = !p.minimizada; renderPeleas(); }
}

function buildPB(p) {
  if (p.minimizada === undefined) p.minimizada = p.estado === 'cerrada';

  // ── Detectar si hay una pelea activa (para estilo "cola") ──
  const hayActiva = peleas.some(x => x.estado === 'activa');
  const estaEnCola = p.estado === 'espera' && hayActiva;

  const rojos  = p.apuestas.filter(a => a.bando === 'rojo');
  const verdes = p.apuestas.filter(a => a.bando === 'verde');
  const tR     = rojos.reduce((s, a) => s + a.monto, 0);
  const tV     = verdes.reduce((s, a) => s + a.monto, 0);
  const total  = tR + tV;
  const pctR   = total > 0 ? Math.round(tR / total * 100) : 50;
  const pctV   = 100 - pctR;
  const pCls   = p.estado === 'activa' ? 'pill-a' : p.estado === 'espera' ? 'pill-e' : 'pill-c';
  const pTxt   = p.estado === 'activa' ? 'En juego' : p.estado === 'espera' ? 'Abierto' : 'Cerrado';

  const chevron = p.minimizada
    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
    : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;

  let winnerTag = '';
  if (p.ganador) {
    if (p.ganador === 'empate') {
      winnerTag = `<div class="pb-winner" style="color:var(--gold2);">
        ${I.trophy} Pelea declarada en <strong>Empate</strong>
      </div>`;
    } else if (p.ganador === 'anulada') {
      winnerTag = `<div class="pb-winner" style="color:var(--text3);">
        ${I.x} Pelea <strong>Anulada / Cancelada</strong>
      </div>`;
    } else {
      const wCls = p.ganador === 'verde' ? 'v' : 'r';
      winnerTag = `<div class="pb-winner ${wCls}">
        ${I.trophy} Ganó <strong>${p.ganador === 'verde' ? 'Verde' : 'Rojo'}</strong>
      </div>`;
    }
  } else if (p.estado === 'cerrada') {
    winnerTag = `<div class="pb-winner" style="opacity:.4;">Sin resultado</div>`;
  }

  const buildRows = lista => lista.length
    ? lista.map(a => {
        const cls = a.resultado === 'ganada' ? ' gr' : a.resultado === 'perdida' ? ' pr' : '';
        const mc  = a.resultado === 'ganada' ? ' g'  : a.resultado === 'perdida' ? ' p'  : '';
        return `<div class="ap-row${cls}">
          <span class="ap-name">${sanitize(a.nombre)}</span>
          <span class="ap-monto${mc}">${fmt(a.monto)}</span>
        </div>`;
      }).join('')
    : '<div class="ap-empty">Sin apuestas</div>';

  const bar = total > 0
    ? `<div class="pelea-bar"><div class="pb-bar-r" style="width:${pctR}%"></div><div class="pb-bar-v" style="width:${pctV}%"></div></div>`
    : '';

  const div = document.createElement('div');
  // ── Clase visual según estado ──
  let cardClass = 'pb';
  if (p.estado === 'activa') cardClass += ' active-pelea-card';
  else if (estaEnCola) cardClass += ' queue-pelea-card';
  div.className = cardClass;
  div.id = `bloque-${p.num}`;
  div.innerHTML = `
    <div class="pb-state-strip"></div>
    <div class="pb-head" onclick="toggleMin(${p.num})">
      <div class="pb-head-l">
        <span class="pb-num">#${p.num}</span>
        <span class="status-pill ${pCls}">${pTxt}</span>
        <span class="pb-total">${fmt(total)} <span style="font-size:9px;color:var(--text3);font-weight:700;">VOL</span></span>
      </div>
      <div class="pb-head-r">
        <span class="pb-chev">${chevron}</span>
      </div>
    </div>
    ${!p.minimizada && winnerTag ? winnerTag : ''}
    ${p.minimizada ? '' : `
      ${bar}
      <div class="p-cols">
        <div class="col-r">
          <div class="col-hdr r"><span class="col-dot"></span> Rojo <span class="col-pct">${pctR}%</span></div>
          <div class="ap-list">
            ${buildRows(rojos)}
          </div>
        </div>
        <div class="col-v">
          <div class="col-hdr v"><span class="col-dot"></span> Verde <span class="col-pct">${pctV}%</span></div>
          <div class="ap-list">
            ${buildRows(verdes)}
          </div>
        </div>
      </div>
      <div class="pb-reparte">
        <div class="pb-rep-cell">
          <span class="pb-rep-lbl">Pago Rojo</span>
          <span class="pb-rep-arrow">→</span>
          <span class="pb-rep-val" style="color:var(--rojo2);">${fmt(tV * (1 - appConfig.comision_porcentaje / 100))}</span>
        </div>
        <div class="pb-rep-cell">
          <span class="pb-rep-lbl">Pago Verde</span>
          <span class="pb-rep-arrow">→</span>
          <span class="pb-rep-val" style="color:var(--green2);">${fmt(tR * (1 - appConfig.comision_porcentaje / 100))}</span>
        </div>
      </div>`}`;
  return div;
}


// ── DIARIO / SEMANAL ──────────────────────────────────────
let searchDiarioQuery = '';
let searchSemanalQuery = '';

function searchPeriodo(tipo, val) {
  if (tipo === 'diario') searchDiarioQuery = val.trim();
  else searchSemanalQuery = val.trim();
  renderPeriodo(tipo);

  // Restore focus and cursor position after render
  setTimeout(() => {
    const inp = document.getElementById(`search-periodo-${tipo}`);
    if (inp) {
      inp.focus();
      const length = inp.value.length;
      inp.setSelectionRange(length, length);
    }
  }, 10);
}

function renderPeriodo(tipo) {
  const el       = document.getElementById(`${tipo}-wrap`);
  const esDiario = tipo === 'diario';
  const todosParticiparon = jugadores.filter(j => j.apuestas.length > 0);
  const query = esDiario ? searchDiarioQuery : searchSemanalQuery;
  const queryLower = query.toLowerCase();
  
  const participaron = todosParticiparon.filter(j => 
    !query || j.nombre.toLowerCase().includes(queryLower) || j.id.toLowerCase().includes(queryLower)
  );

  const ganados  = todosParticiparon.filter(j => calcFicha(j).saldo > 0);
  const perdidos = todosParticiparon.filter(j => calcFicha(j).saldo < 0);
  const tG = ganados.reduce((s, j) => s + calcFicha(j).saldo, 0);
  const tP = perdidos.reduce((s, j) => s + Math.abs(calcFicha(j).saldo), 0);
  const corte = tP - tG;

  const miniFichas = participaron.map(j => {
    const { saldo, ganadas, perdidas, totalGanadas, saldoAntTotal } = calcFicha(j);
    const ok = saldo >= 0;
    const maxR = Math.max(ganadas.length, perdidas.length, 1);
    let rows = '';
    for (let i = 0; i < maxR; i++) {
      const p = perdidas[i], g = ganadas[i];
      rows += `<div class="mf-row">
        <div class="mf-cell l">
          ${p ? `<span class="pnum">P${p.pelea}</span><span class="pm neg">${fmt(p.monto)}</span>` : '<span style="color:var(--text3);font-size:10px;">—</span>'}
        </div>
        <div class="mf-cell">
          ${g ? `<span class="pnum">P${g.pelea}</span><span class="pm pos">${fmt(g.monto * (1 - appConfig.comision_porcentaje / 100))}</span>` : '<span style="color:var(--text3);font-size:10px;">—</span>'}
        </div>
      </div>`;
    }
    return `<div class="mini-ficha">
      <div class="mf-head">
        <div class="mf-av" style="background:${j.color}22;color:${j.color};border-color:${j.color};">${initials(j.nombre)}</div>
        <div class="mf-info">
          <div class="mf-name">${sanitize(j.nombre)}</div>
          <div class="mf-ap">${j.apuestas.length} apuestas</div>
        </div>
        <div class="mf-bal ${ok ? 'pos' : 'neg'}">
          <span class="mf-bal-sign">${ok ? '+' : '−'}</span>
          <span class="mf-bal-val">${fmt(saldo)}</span>
        </div>
      </div>
      <div class="mf-body">
        <div><div class="mf-col-hd p">Perdidas</div></div>
        <div><div class="mf-col-hd g">Ganadas</div></div>
        ${rows}
      </div>
      <div class="mf-tots">
        <div class="mf-ti"><span class="mf-ti-lbl">Perdido</span><span class="mf-ti-val sn">${fmt(saldoAntTotal)}</span></div>
        <div class="mf-ti"><span class="mf-ti-lbl">Ganado</span><span class="mf-ti-val sp">${fmt(totalGanadas)}</span></div>
      </div>
      <div class="mf-final ${ok ? 'win' : 'lose'}">
        <span class="mf-final-lbl">Resultado</span>
        <div class="mf-final-right">
          <span class="mf-final-badge ${ok ? 'g' : 'r'}">${ok ? 'GANÓ' : 'PERDIÓ'}</span>
          <span class="mf-final-val ${ok ? 'pos' : 'neg'}">${ok ? '+' : '−'}${fmt(saldo)}</span>
        </div>
      </div>
      <button class="mf-dl-btn" onclick="exportPDF('${j.id}','${tipo}')">${I.dl} PDF</button>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="ph-hdr" style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; width:100%;">
        <div style="flex:1; min-width:200px;">
          <div class="ph-hdr-t">${esDiario ? 'Corte Diario' : 'Corte Semanal'}</div>
          <div class="ph-hdr-s">${today()} · ${todosParticiparon.length} participantes</div>
        </div>
        <button class="ph-dl" style="margin-top:0;" onclick="exportPDF_bulk('${tipo}')">${I.dl} Descargar PDF</button>
      </div>

      <div class="search-box" style="max-width:320px; width:100%; margin-top:2px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="search-periodo-${tipo}" placeholder="Buscar apostador..." value="${query}" oninput="searchPeriodo('${tipo}', this.value)">
      </div>

      <div class="ph-stats" style="margin-top:4px;">
        <div class="ph-stat g">
          <span class="ph-stat-val">${ganados.length}</span>
          <span class="ph-stat-lbl">Ganan</span>
        </div>
        <div class="ph-stat r">
          <span class="ph-stat-val">${perdidos.length}</span>
          <span class="ph-stat-lbl">Pierden</span>
        </div>
        <div class="ph-stat c">
          <span class="ph-stat-val">${fmt(corte)}</span>
          <span class="ph-stat-lbl">Corte</span>
        </div>
      </div>
      <button class="ph-dl" onclick="exportPDF_bulk('${tipo}')">${I.dl} Descargar PDF</button>
    </div>
    <div class="mini-fichas-grid">
      ${participaron.length ? miniFichas : '<div class="mf-empty">Ningún apostador con apuestas registradas.</div>'}
    </div>`;
}

// ── BITÁCORA ──────────────────────────────────────────────
const tipoLogInfo = t => ({
  apuesta:   { label: 'Apuesta',   icon: '$', color: 'var(--accent2)' },
  resultado: { label: 'Resultado', icon: '✓', color: 'var(--green2)' },
  eliminar:  { label: 'Eliminado', icon: '×', color: 'var(--rojo2)' },
  estado:    { label: 'Estado',    icon: '•', color: 'var(--blue2)' },
  'nueva-pelea': { label: 'Pelea', icon: '+', color: 'var(--blue2)' },
  'nuevo-jugador': { label: 'Apostador', icon: '+', color: 'var(--accent2)' },
  'saldo-negativo': { label: 'Alerta', icon: '!', color: 'var(--rojo2)' },
  config:    { label: 'Ajustes',   icon: '⚙️', color: 'var(--gold)' },
  corte_jornada: { label: 'Corte', icon: '🏁', color: 'var(--green2)' },
})[t] || { label: 'Auditoría', icon: '•', color: 'var(--text3)' };

const fmtTimeRel = ts => {
  if (!ts) return '';
  const parts = ts.split(':').map(Number);
  if (parts.length < 2) return ts;
  const now = new Date();
  const then = new Date();
  then.setHours(parts[0]||0, parts[1]||0, parts[2]||0);
  let diffMin = Math.round((now - then) / 60000);
  if (diffMin < 0) diffMin += 1440;
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 12) return `hace ${diffHr}h`;
  return ts.slice(0,5);
};

function renderBitacora() {
  const el = document.getElementById('log-wrap');

  const counts = {
    todos:     bitacora.length,
    apuesta:   bitacora.filter(x => x.tipo === 'apuesta').length,
    resultado: bitacora.filter(x => x.tipo === 'resultado').length,
    eliminar:  bitacora.filter(x => x.tipo === 'eliminar').length,
    estado:    bitacora.filter(x => ['estado','nueva-pelea','nuevo-jugador'].includes(x.tipo)).length,
  };

  const lista = logFiltro === 'todos'
    ? bitacora
    : logFiltro === 'estado'
      ? bitacora.filter(x => ['estado','nueva-pelea','nuevo-jugador'].includes(x.tipo))
      : bitacora.filter(x => x.tipo === logFiltro);

  const items = lista.length
    ? lista.map(e => {
        const info = tipoLogInfo(e.tipo);
        return `<div class="log-entry" style="--lc:${info.color}">
          <div class="log-indicator" style="background:${info.color}22;color:${info.color};">${info.icon}</div>
          <div class="log-body">
            <div class="log-tag" style="color:${info.color};">${info.label}</div>
            <div class="log-msg">${e.msg}</div>
            <div class="log-meta">
              <span class="log-actor">${e.user}</span>
              <span class="log-dot">·</span>
              <span class="log-time">${fmtTimeRel(e.ts)}</span>
            </div>
          </div>
        </div>`;
      }).join('')
    : '<div class="log-empty">No hay auditoría que mostrar.</div>';

  el.innerHTML = `
    <div class="log-hdr">
      <div class="log-hdr-t">Auditoría</div>
      <div class="log-hdr-s">${today()} · ${counts.todos} eventos</div>
    </div>
    <div class="log-filters">
      <button class="log-fb${logFiltro==='todos'?' active':''}" onclick="setLogF('todos')">
        ${UI_ICONS.info}todas
      </button>
      <button class="log-fb${logFiltro==='apuesta'?' active':''}" onclick="setLogF('apuesta')">
        ${UI_ICONS.apuesta}apuestas
      </button>
      <button class="log-fb${logFiltro==='resultado'?' active':''}" onclick="setLogF('resultado')">
        ${UI_ICONS.resultado}resultados
      </button>
      <button class="log-fb${logFiltro==='eliminar'?' active':''}" onclick="setLogF('eliminar')">
        ${UI_ICONS.eliminar}eliminadas
      </button>
      <button class="log-fb${logFiltro==='estado'?' active':''}" onclick="setLogF('estado')">
        ${UI_ICONS.estado}estados
      </button>
    </div>
    <div class="log-list">${items}</div>`;
}
function setLogF(f) { logFiltro = f; renderBitacora(); }

// ── PDF EXPORT ────────────────────────────────────────────
// ── PDF EXPORT ────────────────────────────────────────────
function buildPDF(j, tipo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W = 215.9, mg = 18;
  let y = mg;

  // Colores de marca
  const gold = [201, 168, 76];
  const goldLight = [232, 201, 122];
  const ember = [212, 56, 13];
  const dark = [20, 18, 14];
  const mid = [100, 100, 100];
  const light = [150, 150, 150];
  const bgLight = [248, 246, 242];

  const { saldo, ganadas, perdidas, totalGanadas, totalPerdidas } = calcFicha(j);
  const periodoMayus = tipo.charAt(0).toUpperCase() + tipo.slice(1);

  // ─── ENCABEZADO ───
  // Línea dorada superior
  doc.setDrawColor(...gold);
  doc.setLineWidth(1.5);
  doc.line(mg, y, W - mg, y);
  y += 8;

  // Título principal
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...dark);
  doc.text('GALLO GOLD', W / 2, y, { align: 'center' });
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...mid);
  doc.text('BRUNO\'S · CONTROL DE APUESTAS', W / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(...light);
  doc.text(`${today()} · Corte ${periodoMayus}`, W / 2, y, { align: 'center' });
  y += 6;

  // Línea dorada inferior
  doc.setDrawColor(...gold);
  doc.setLineWidth(.5);
  doc.line(mg, y, W - mg, y);
  y += 10;

  // ─── DATOS DEL APOSTADOR ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text(j.nombre.toUpperCase(), mg, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mid);
  doc.text(`ID: ${j.id} · ${j.apuestas.length} apuestas`, W - mg, y, { align: 'right' });
  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(...light);
  doc.text(`Saldo anterior: ${fmt(j.saldoAnt)}`, mg, y);
  y += 10;

  // ─── TABLA DE PELEAS ───
  const colW = (W - mg * 2) / 2;
  const rowH = 6.5;
  const padX = 4;

  // Encabezados de tabla
  const th = 7.5;
  doc.setFillColor(...dark);
  doc.rect(mg, y, colW, th, 'F');
  doc.setFillColor(...dark);
  doc.rect(mg + colW, y, colW, th, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PERDIDAS', mg + colW / 2, y + 5, { align: 'center' });
  doc.text('GANADAS', mg + colW + colW / 2, y + 5, { align: 'center' });
  y += th;

  // Filas
  const maxR = Math.max(perdidas.length, ganadas.length, 1);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);

  for (let i = 0; i < maxR; i++) {
    const p = perdidas[i];
    const g = ganadas[i];

    if (i % 2 === 0) {
      doc.setFillColor(...bgLight);
      doc.rect(mg, y, W - mg * 2, rowH, 'F');
    }

    // Borde sutil entre filas
    doc.setDrawColor(230, 228, 224);
    doc.setLineWidth(.3);
    doc.line(mg, y, W - mg, y);

    doc.setTextColor(...dark);

    // Columna Perdidas
    if (p) {
      doc.text(`#${p.pelea}`, mg + padX, y + 4.5);
      doc.text(fmt(p.monto), mg + colW - padX, y + 4.5, { align: 'right' });
    } else {
      doc.setTextColor(200, 200, 200);
      doc.text('—', mg + colW / 2, y + 4.5, { align: 'center' });
      doc.setTextColor(...dark);
    }

    // Columna Ganancias
    if (g) {
      doc.text(`#${g.pelea}`, mg + colW + padX, y + 4.5);
      doc.text(fmt(g.monto * (1 - appConfig.comision_porcentaje / 100)), mg + colW * 2 - padX, y + 4.5, { align: 'right' });
    } else {
      doc.setTextColor(200, 200, 200);
      doc.text('—', mg + colW + colW / 2, y + 4.5, { align: 'center' });
      doc.setTextColor(...dark);
    }

    y += rowH;

    if (y > 255) {
      doc.addPage();
      y = mg;
    }
  }

  // Línea final de tabla
  doc.setDrawColor(...gold);
  doc.setLineWidth(.7);
  doc.line(mg, y, W - mg, y);
  y += 8;

  // ─── RESUMEN ───
  const sumW = (W - mg * 2) / 3;

  // Fondo oscuro del resumen
  doc.setFillColor(...dark);
  doc.rect(mg, y, W - mg * 2, 8, 'F');

  doc.setTextColor(...goldLight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SALDO ANTERIOR', mg + sumW / 2, y + 5, { align: 'center' });
  doc.text('TOTAL PERDIDAS', mg + sumW + sumW / 2, y + 5, { align: 'center' });
  doc.text('TOTAL GANADAS', mg + sumW * 2 + sumW / 2, y + 5, { align: 'center' });
  y += 8;

  doc.setFillColor(...bgLight);
  doc.rect(mg, y, W - mg * 2, 9, 'F');

  doc.setTextColor(...dark);
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.text(fmt(j.saldoAnt), mg + sumW / 2, y + 6, { align: 'center' });
  doc.text(fmt(totalPerdidas), mg + sumW + sumW / 2, y + 6, { align: 'center' });
  doc.text(fmt(totalGanadas), mg + sumW * 2 + sumW / 2, y + 6, { align: 'center' });
  y += 18;

  // ─── SALDO FINAL ───
  const isWin = saldo >= 0;
  const resultColor = isWin ? [34, 180, 90] : [212, 56, 13];

  // Línea divisoria
  doc.setDrawColor(...gold);
  doc.setLineWidth(.5);
  doc.line(mg, y, W - mg, y);
  y += 8;

  // Etiqueta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...mid);
  doc.text('SALDO FINAL', mg, y + 6);

  // Valor grande
  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...resultColor);
  doc.text(`${isWin ? '+' : '−'}${fmt(Math.abs(saldo))}`, W / 2, y + 6, { align: 'center' });

  // Resultado tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...light);
  doc.text(isWin ? 'UTILIDAD' : 'PÉRDIDA', W - mg, y + 6, { align: 'right' });

  y += 16;

  // ─── PIE DE PÁGINA ───
  doc.setDrawColor(...gold);
  doc.setLineWidth(.5);
  doc.line(mg, y, W - mg, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...light);
  doc.text('Gallo Gold · Bruno\'s', mg, y);
  doc.text(`Reporte generado el ${today()}`, W - mg, y, { align: 'right' });
  y += 3.5;
  doc.setTextColor(190, 188, 184);
  doc.text('Control de Apuestas · Corte ' + periodoMayus, W / 2, y, { align: 'center' });

  return doc;
}

function exportPDF(jId, tipo) {
  const j = jugadores.find(x => x.id === jId);
  if (!j) return;
  if (!j.apuestas.length) { toast(`Sin apuestas: <strong>${j.nombre}</strong>`, 'error'); return; }
  buildPDF(j, tipo).save(`ficha_${j.nombre.replace(/ /g,'_')}_${tipo}_${todayShort()}.pdf`);
  toast(`${I.dl} PDF de <strong>${j.nombre}</strong> descargado`, 'success');
}

function exportPDF_bulk(tipo) {
  const lista = jugadores.filter(j => j.apuestas.length > 0);
  if (!lista.length) { toast('Sin jugadores con apuestas', 'error'); return; }
  lista.forEach(j => buildPDF(j, tipo).save(`ficha_${j.nombre.replace(/ /g,'_')}_${tipo}_${todayShort()}.pdf`));
  toast(`${I.dl} <strong>${lista.length} PDFs descargados</strong> — ${tipo}`, 'success');
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  const map = { r: 'dashboard', f: 'fichas', p: 'peleas', d: 'diario', s: 'semanal', m: 'bitacora', a: 'config' };
  if (map[k]) { setTab(map[k]); e.preventDefault(); }
});

// ── AJUSTES & CONFIGURACIONES (NUEVO) ──────────────────────
function renderConfig() {
  const el = document.getElementById('config-wrap');
  if (!el) return;

  el.innerHTML = `
    <div class="config-container">
      <div class="dash-hdr">
        <div class="dash-kicker">Configuración General</div>
        <div class="dash-hdr-title">Ajustes del Sistema</div>
        <div class="dash-hdr-sub">${today()}</div>
      </div>

      <div class="config-card">
        <div class="config-title">Comisiones y Créditos</div>
        <p class="config-desc">Configura los parámetros financieros clave que se aplican a los cálculos y validaciones de apuestas en tiempo real.</p>
        
        <div class="config-group">
          <label class="config-label">Comisión de la Casa (%)</label>
          <div class="config-input-wrapper">
            <span class="config-input-prefix">%</span>
            <input type="number" id="cfg-comision" class="config-input" min="0" max="100" value="${appConfig.comision_porcentaje}">
          </div>
        </div>

        <div class="config-group">
          <label class="config-label">Límite de Crédito General ($)</label>
          <div class="config-input-wrapper">
            <span class="config-input-prefix">$</span>
            <input type="number" id="cfg-limite" class="config-input" min="0" value="${appConfig.limite_credito}">
          </div>
        </div>

        <div class="config-group">
          <label class="config-label">PIN de Autorización del Supervisor</label>
          <div class="config-input-wrapper" style="position: relative;">
            <span class="config-input-prefix">🔑</span>
            <input type="password" id="cfg-pin" class="config-input" maxlength="4" pattern="\\d*" inputmode="numeric" value="${appConfig.pin_autorizacion}" style="padding-right: 42px;">
            <button class="config-eye-btn eye-deco" type="button" aria-label="Mostrar PIN" onclick="togglePinVisibility()" style="
              position: absolute;
              right: 8px;
              top: 50%;
              transform: translateY(-50%);
              border: none;
              background: transparent;
              color: rgba(255,255,255,0.4);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0;
            ">
              <svg class="eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;">
                <path class="eye-lid" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle class="eye-pupil" cx="12" cy="12" r="3"/>
                <line class="eye-slash" x1="4" y1="4" x2="20" y2="20"/>
              </svg>
            </button>
          </div>
        </div>

        <button class="config-btn-save" onclick="saveConfig()">Guardar Ajustes</button>
      </div>

      <div class="config-card">
        <div class="config-title" style="color:var(--rojo2);">Operaciones de Cierre y Reinicio</div>
        <p class="config-desc">
          Utiliza esta función al finalizar la jornada o semana. Actualiza los saldos de todos los apostadores a su balance actual y borra todas las peleas del sistema para comenzar una nueva jornada limpios.
        </p>
        <button class="config-btn-danger" onclick="confirmCierreCaja()">🏁 Realizar Cierre de Caja</button>
      </div>
    </div>
  `;
}

async function saveConfig() {
  const comision = parseFloat(document.getElementById('cfg-comision').value);
  const limite = parseFloat(document.getElementById('cfg-limite').value);
  const pin = document.getElementById('cfg-pin').value.trim();

  if (isNaN(comision) || comision < 0 || comision > 100) {
    toast('Comisión inválida. Debe ser entre 0 y 100.', 'error');
    return;
  }
  if (isNaN(limite) || limite < 0) {
    toast('Límite de crédito inválido.', 'error');
    return;
  }
  const pinRegex = /^\d{4}$/;
  if (!pin) {
    toast('El PIN no puede estar vacío.', 'error');
    return;
  }
  if (!pinRegex.test(pin)) {
    toast('El PIN debe ser de exactamente 4 dígitos numéricos.', 'error');
    return;
  }

  // Update in Supabase
  const rows = [
    { clave: 'comision_porcentaje', valor: comision.toString() },
    { clave: 'limite_credito', valor: limite.toString() },
    { clave: 'pin_autorizacion', valor: pin }
  ];

  let successCount = 0;
  for (const row of rows) {
    const { error } = await sb.from('configuraciones').upsert(row, { onConflict: 'clave' });
    if (!error) successCount++;
  }

  if (successCount === rows.length) {
    await logAction('config', `Configuración del sistema actualizada: Comisión ${comision}%, Límite $${limite}, PIN ${pin}`, '⚙️');
    await refreshData();
    toast('Configuración guardada correctamente.', 'success');
  } else {
    toast('Ocurrió un error al guardar la configuración.', 'error');
  }
}

function togglePinVisibility() {
  const pinInp = document.getElementById('cfg-pin');
  const eyeBtn = document.querySelector('.config-eye-btn');
  if (!pinInp || !eyeBtn) return;
  const hidden = pinInp.type === 'password';
  pinInp.type = hidden ? 'text' : 'password';
  eyeBtn.classList.toggle('showing', hidden);
  eyeBtn.setAttribute('aria-label', hidden ? 'Ocultar PIN' : 'Mostrar PIN');
  const svg = eyeBtn.querySelector('.eye-svg');
  if (svg) {
    svg.classList.remove('eye-pulse-now');
    void svg.offsetWidth;
    svg.classList.add('eye-pulse-now');
    setTimeout(() => svg.classList.remove('eye-pulse-now'), 500);
  }
}

async function confirmCierreCaja() {
  const ok = await showConfirm(
    `<strong>¿Realizar Cierre de Caja / Corte de Jornada?</strong><br><br>` +
    `<span style="font-size:12px;color:var(--text3);line-height:1.5;display:block;">` +
    `Esta acción:<br>` +
    `1. Calculará y guardará el balance de cada jugador como su nuevo <strong>Saldo Anterior</strong>.<br>` +
    `2. <strong>Eliminará todas las peleas cerradas</strong> (y sus apuestas asociadas) del sistema para iniciar limpios.<br>` +
    `3. Esta operación no se puede deshacer.</span>`,
    '⚠️',
    'Proceder al Cierre',
    'danger'
  );
  if (!ok) return;

  toast('Realizando cierre de caja...', 'info');

  try {
    // 1. Calculate balances and prepare batch update for jugadores
    const updates = jugadores.map(j => {
      const { saldo } = calcFicha(j);
      return {
        id: j.id,
        nombre: j.nombre,
        color: j.color,
        saldo_anterior: parseFloat(saldo.toFixed(2))
      };
    });

    const { error: jError } = await sb.from('jugadores').upsert(updates, { onConflict: 'id' });
    if (jError) {
      throw new Error(`Error actualizando jugadores: ${jError.message}`);
    }

    // 2. Delete closed fights
    const { error: pError } = await sb.from('peleas').delete().eq('estado', 'cerrada');
    if (pError) {
      throw new Error(`Error eliminando peleas cerradas: ${pError.message}`);
    }

    // 3. Log to bitacora
    await logAction('corte_jornada', `Corte de Jornada realizado: saldos actualizados y peleas cerradas archivadas`, '🏁');

    toast('Cierre de caja completado con éxito.', 'success');
    await refreshData();
  } catch (err) {
    console.error(err);
    toast(`⚠️ Falló el cierre: ${err.message}`, 'error');
  }
}