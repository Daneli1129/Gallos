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

let peleaFilter = 'todas';
function setPeleaFilter(f) { peleaFilter = f; renderPeleas(); }

// ── TABS DE ADMIN ─────────────────────────────────────────
const TABS_ADMIN = [
  { id: 'dashboard', label: 'Resumen', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>` },
  { id: 'fichas', label: 'Fichas', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>` },
  { id: 'peleas', label: 'Peleas', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>` },
  { id: 'diario', label: 'Diario', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
  { id: 'semanal', label: 'Semanal', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>` },
  { id: 'bitacora', label: 'Movimientos', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
];

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const u = currentUser || { nombre: 'Admin', rol: 'admin' };
  document.getElementById('nav-av').textContent = initials(u.nombre);
  document.getElementById('nav-un').textContent = u.nombre;
  document.getElementById('tb-av').textContent  = initials(u.nombre);
  document.getElementById('tb-un').textContent  = u.nombre;

  buildNav();
  buildMobNav();
  renderJugList(jugadores);
  getPelea(peleaActual);
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

  if (tab === 'fichas' && !selectedJugador) {
    document.getElementById('fichas-empty').style.display = 'flex';
    document.getElementById('fichas-empty').innerHTML = `
      <div style="color:var(--text3); opacity:0.6; margin-bottom:12px;">${UI_ICONS.user}</div>
      <p>Selecciona un jugador para ver su ficha</p>
    `;
    document.getElementById('ficha-detail').style.display = 'none';
  }
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'peleas')    renderPeleas();
  if (tab === 'diario')    renderPeriodo('diario');
  if (tab === 'semanal')   renderPeriodo('semanal');
  if (tab === 'bitacora')  renderBitacora();
}

// ── DASHBOARD ─────────────────────────────────────────────
function renderDashboard() {
  const el = document.getElementById('dash-wrap');

  const totalPeleas = peleas.length;
  const activas = peleas.filter(p => p.estado === 'activa').length;
  const cerradas = peleas.filter(p => p.estado === 'cerrada').length;
  const espera = peleas.filter(p => p.estado === 'espera').length;

  const totalApuestas = jugadores.reduce((s, j) => s + j.apuestas.length, 0);
  const totalDinero = jugadores.reduce((s, j) =>
    s + j.apuestas.reduce((a, b) => a + b.monto, 0), 0);
  const totalEnJuego = jugadores.reduce((s, j) => {
    const { enJuego } = calcFicha(j);
    return s + enJuego.reduce((a, b) => a + b.monto, 0);
  }, 0);

  const top = [...jugadores]
    .map(j => ({ ...j, apCount: j.apuestas.length }))
    .sort((a, b) => b.apCount - a.apCount)
    .slice(0, 5);

  el.innerHTML = `
    <div class="dash">
      <div class="dash-hdr">
        <div class="dash-hdr-title">Panel de Resumen</div>
        <div class="dash-hdr-sub">${today()}</div>
      </div>

      <div class="dash-grid">
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#C0392B22;color:#f0b0a0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div class="dash-card-body">
            <div class="dash-card-val">${totalPeleas}</div>
            <div class="dash-card-lbl">Peleas hoy</div>
          </div>
          <div class="dash-card-ft">
            <span class="dash-chip e">${espera} espera</span>
            <span class="dash-chip a">${activas} activas</span>
            <span class="dash-chip c">${cerradas} cerradas</span>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-icon" style="background:#1A8A4A22;color:#90EEB0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="dash-card-body">
            <div class="dash-card-val">${totalApuestas}</div>
            <div class="dash-card-lbl">Apuestas registradas</div>
          </div>
          <div class="dash-card-ft">
            <span style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;">$${totalDinero.toLocaleString('es-MX')} total</span>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-icon" style="background:#E1BA6422;color:#F3D370;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          </div>
          <div class="dash-card-body">
            <div class="dash-card-val">${fmt(totalEnJuego)}</div>
            <div class="dash-card-lbl">En juego ahora</div>
          </div>
          <div class="dash-card-ft">
            <span style="font-size:10px;color:var(--gold);font-family:'JetBrains Mono',monospace;">En ${jugadores.reduce((s, j) => s + calcFicha(j).enJuego.length, 0)} peleas activas</span>
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-icon" style="background:#1A6DB522;color:#90C8FF;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="dash-card-body">
            <div class="dash-card-val">${jugadores.length}</div>
            <div class="dash-card-lbl">Jugadores activos</div>
          </div>
          <div class="dash-card-ft">
            <span style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;">Con apuestas: ${jugadores.filter(j => j.apuestas.length).length}</span>
          </div>
        </div>
      </div>

      <div class="dash-section">
        <div class="dash-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
          Jugadores con más actividad
        </div>
        <div class="dash-rank">
          ${top.map((j, i) => `
            <div class="dash-rank-item" onclick="selectJugador(jugadores.find(x=>x.id==='${j.id}')); setTab('fichas');">
              <span class="dash-rank-pos ${i < 3 ? 'top' : ''}">${i + 1}</span>
              <div class="dash-rank-av" style="background:${j.color}22;color:${j.color};border-color:${j.color}55;">${initials(j.nombre)}</div>
              <div class="dash-rank-info">
                <div class="dash-rank-name">${j.nombre}</div>
                <div class="dash-rank-meta">${j.apCount} apuestas</div>
              </div>
              <div class="dash-rank-saldo ${j.apCount > 0 ? (calcFicha(j).saldo >= 0 ? 'sp' : 'sn') : 'sz'}">
                ${calcFicha(j).saldo >= 0 ? '+' : '−'}${fmt(calcFicha(j).saldo)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
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
        <div class="p-name">${j.nombre}${idx < 3 ? `<span class="p-rank">${idx + 1}</span>` : ''}</div>
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
        <div class="p-name">${j.nombre}${idx < 3 ? `<span class="p-rank">${idx + 1}</span>` : ''}</div>
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
        ${g ? `<span class="pnum">P${g.pelea}</span><span class="pm pos">${fmt(g.monto * 0.9)}</span>` : '<span style="color:var(--text3);font-size:10px;">—</span>'}
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
          <div class="fc-name">${j.nombre}</div>
          <div class="fc-sub">${j.apuestas.length} apuestas · ${today()}</div>
          ${j.addedBy ? `<div class="fc-by">Registrado por ${j.addedBy}</div>` : ''}
        </div>
        <div class="fc-pv">
          <div class="fc-pv-lbl">Balance</div>
          <div class="fc-pv-val ${esBien ? 'pos' : 'neg'}">${sign}${fmt(saldo)}</div>
        </div>
      </div>
      <div class="fc-actions">
        <button class="btn-sm" onclick="exportPDF('${j.id}','diario')">${I.dl} PDF Hoy</button>
        <button class="btn-sm" onclick="exportPDF('${j.id}','semanal')">${I.dl} PDF Semanal</button>
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

function updSaldoAnt(id, val) {
  const j = jugadores.find(x => x.id === id);
  if (!j) return;
  j.saldoAnt = parseFloat(val) || 0;
  renderFicha();
  renderJugList(jugadores);
  toast(`Saldo anterior de <strong>${j.nombre}</strong> actualizado`, 'success');
}

// ── PELEAS (solo lectura) ─────────────────────────────────
function renderPeleas() {
  renderToolbar();
  const sc    = document.getElementById('peleas-scroll');
  sc.innerHTML = '';
  const lista = [...peleas]
    .sort((a, b) => b.num - a.num)
    .filter(p => peleaFilter === 'todas' || p.estado === peleaFilter);
  if (!lista.length) {
    sc.innerHTML = `<div class="pb-empty">${
      peleaFilter === 'todas' ? 'Sin peleas registradas aún.' :
      peleaFilter === 'activa' ? 'No hay peleas activas.' :
      peleaFilter === 'espera' ? 'No hay peleas en espera.' :
      'No hay peleas cerradas.'
    }</div>`;
    return;
  }
  lista.forEach(p => sc.appendChild(buildPB(p)));
}

function renderToolbar() {
  const tb   = document.getElementById('peleas-toolbar');
  const totalPeleas = peleas.length;
  const activas = peleas.filter(p => p.estado === 'activa').length;
  const espera  = peleas.filter(p => p.estado === 'espera').length;
  const cerradas = peleas.filter(p => p.estado === 'cerrada').length;
  const filtros = [
    { id: 'todas',  label: `Todas`,  count: totalPeleas },
    { id: 'activa', label: 'Activas', count: activas },
    { id: 'espera', label: 'Espera',  count: espera },
    { id: 'cerrada',label: 'Cerradas',count: cerradas },
  ];
  tb.innerHTML = `
    <div class="p-num-big">Peleas</div>
    <span class="p-num-sub">${totalPeleas} · #${peleaActual}</span>
    <div class="ctrl-sep"></div>
    <div class="pf-row">
      ${filtros.map(f => `
        <button class="pf-btn${peleaFilter === f.id ? ' active' : ''}"
                onclick="setPeleaFilter('${f.id}')">
          <span class="pf-lbl">${f.label}</span>
          <span class="pf-cnt">${f.count}</span>
        </button>`).join('')}
    </div>
    <div class="ctrl-sep"></div>
    <div class="admin-ro">${I.eye} Solo lectura</div>`;
}

function toggleMin(num) {
  const p = getPelea(num);
  if (p) { p.minimizada = !p.minimizada; renderPeleas(); }
}

function buildPB(p) {
  if (p.minimizada === undefined) p.minimizada = p.estado !== 'activa';
  const rojos  = p.apuestas.filter(a => a.bando === 'rojo');
  const verdes = p.apuestas.filter(a => a.bando === 'verde');
  const tR     = rojos.reduce((s, a) => s + a.monto, 0);
  const tV     = verdes.reduce((s, a) => s + a.monto, 0);
  const total  = tR + tV;
  const pctR   = total > 0 ? Math.round(tR / total * 100) : 50;
  const pctV   = 100 - pctR;
  const pCls   = p.estado === 'activa' ? 'pill-a' : p.estado === 'espera' ? 'pill-e' : 'pill-c';
  const pTxt   = p.estado === 'activa' ? 'Activa' : p.estado === 'espera' ? 'Espera' : 'Cerrada';

  const chevron = p.minimizada
    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
    : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;

  const estadoBtns = `
    <div class="pb-state-group">
      <span class="pb-st${p.estado === 'espera' ? ' active-e' : ''}">${I.pause}</span>
      <span class="pb-st${p.estado === 'activa' ? ' active-a' : ''}">${I.play}</span>
      <span class="pb-st${p.estado === 'cerrada' ? ' active-c' : ''}">${I.stop}</span>
    </div>`;

  let winnerTag = '';
  if (p.ganador) {
    const wCls = p.ganador === 'verde' ? 'v' : 'r';
    winnerTag = `<div class="pb-winner ${wCls}">
      ${I.trophy} Ganó <strong>${p.ganador === 'verde' ? 'Verde' : 'Rojo'}</strong>
    </div>`;
  } else if (p.estado === 'cerrada') {
    winnerTag = `<div class="pb-winner" style="opacity:.4;">Sin resultado</div>`;
  }

  const delBtn = `
    <button class="pb-del-btn" onclick="event.stopPropagation();confirmEliminarPelea(${p.num})" title="Eliminar pelea">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      </svg>
    </button>`;

  const buildRows = lista => lista.length
    ? lista.map(a => {
        const cls = a.resultado === 'ganada' ? ' gr' : a.resultado === 'perdida' ? ' pr' : '';
        const mc  = a.resultado === 'ganada' ? ' g'  : a.resultado === 'perdida' ? ' p'  : '';
        return `<div class="ap-row${cls}">
          <span class="ap-name">${a.nombre}</span>
          <span class="ap-monto${mc}">${fmt(a.monto)}</span>
        </div>`;
      }).join('')
    : '<div class="ap-empty">Sin apostadores</div>';

  const bar = total > 0
    ? `<div class="pelea-bar"><div class="pb-bar-r" style="width:${pctR}%"></div><div class="pb-bar-v" style="width:${pctV}%"></div></div>`
    : '';

  const div = document.createElement('div');
  div.className = 'pb';
  div.id = `bloque-${p.num}`;
  div.innerHTML = `
    <div class="pb-head" onclick="toggleMin(${p.num})">
      <div class="pb-head-l">
        <span class="pb-num">#${p.num}</span>
        <span class="status-pill ${pCls}">${pTxt}</span>
        <span class="pb-total">${fmt(total)}</span>
      </div>
      <div class="pb-head-r">
        ${estadoBtns}
        ${delBtn}
        <span class="pb-chev">${chevron}</span>
      </div>
    </div>
    ${!p.minimizada && winnerTag ? winnerTag : ''}
    ${p.minimizada ? '' : `
      ${bar}
      <div class="p-cols">
        <div class="col-r">
          <div class="col-hdr r"><span class="col-dot"></span> Rojo · ${fmt(tR)} <span class="col-pct">${pctR}%</span></div>
          ${buildRows(rojos)}
        </div>
        <div>
          <div class="col-hdr v"><span class="col-dot"></span> Verde · ${fmt(tV)} <span class="col-pct">${pctV}%</span></div>
          ${buildRows(verdes)}
        </div>
      </div>
      <div class="pb-reparte">
        <div class="pb-rep-cell">
          <span class="pb-rep-lbl">Si gana Rojo</span>
          <span class="pb-rep-arrow">→</span>
          <span class="pb-rep-val" style="color:var(--rojo2);">${fmt(tV * 0.9)}</span>
        </div>
        <div class="pb-rep-cell">
          <span class="pb-rep-lbl">Si gana Verde</span>
          <span class="pb-rep-arrow">→</span>
          <span class="pb-rep-val" style="color:var(--green2);">${fmt(tR * 0.9)}</span>
        </div>
      </div>`}`;
  return div;
}

async function confirmEliminarPelea(pN) {
  const p = getPelea(pN);
  if (!p) return;
  const ok = await showConfirm(`¿Eliminar <strong>Pelea #${pN}</strong>?<br><span style="font-size:12px;color:var(--text3);">Se borrarán todas las apuestas asociadas. Esta acción no se puede deshacer.</span>`, '🗑️', 'Eliminar', 'danger');
  if (!ok) return;
  eliminarPelea(pN);
  renderPeleas();
}

// ── DIARIO / SEMANAL ──────────────────────────────────────
function renderPeriodo(tipo) {
  const el       = document.getElementById(`${tipo}-wrap`);
  const esDiario = tipo === 'diario';
  const participaron = jugadores.filter(j => j.apuestas.length > 0);
  const ganados  = participaron.filter(j => calcFicha(j).saldo > 0);
  const perdidos = participaron.filter(j => calcFicha(j).saldo < 0);
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
          ${g ? `<span class="pnum">P${g.pelea}</span><span class="pm pos">${fmt(g.monto * 0.9)}</span>` : '<span style="color:var(--text3);font-size:10px;">—</span>'}
        </div>
      </div>`;
    }
    return `<div class="mini-ficha">
      <div class="mf-head">
        <div class="mf-av" style="background:${j.color}22;color:${j.color};border-color:${j.color};">${initials(j.nombre)}</div>
        <div class="mf-info">
          <div class="mf-name">${j.nombre}</div>
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
    <div class="ph-hdr">
      <div class="ph-hdr-t">${esDiario ? 'Resumen Diario' : 'Resumen Semanal'}</div>
      <div class="ph-hdr-s">${today()} · ${participaron.length} participantes</div>
      <div class="ph-stats">
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
      ${participaron.length ? miniFichas : '<div class="mf-empty">Ningún jugador con apuestas registradas.</div>'}
    </div>`;
}

// ── BITÁCORA ──────────────────────────────────────────────
const tipoLogInfo = t => ({
  apuesta:   { label: 'Apuesta',   icon: '💰', color: 'var(--accent2)' },
  resultado: { label: 'Resultado', icon: '🏆', color: 'var(--green2)' },
  eliminar:  { label: 'Eliminado', icon: '🗑️', color: 'var(--rojo2)' },
  estado:    { label: 'Estado',    icon: '⚡', color: 'var(--blue2)' },
  'nueva-pelea': { label: 'Nueva Pelea', icon: '🐓', color: 'var(--blue2)' },
  'nuevo-jugador': { label: 'Nuevo Jugador', icon: '✨', color: 'var(--accent2)' },
  'saldo-negativo': { label: 'Alerta', icon: '⚠️', color: 'var(--rojo2)' },
})[t] || { label: 'Movimiento', icon: '📋', color: 'var(--text3)' };

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
    : '<div class="log-empty">No hay movimientos que mostrar.</div>';

  el.innerHTML = `
    <div class="log-hdr">
      <div class="log-hdr-t">Registro</div>
      <div class="log-hdr-s">${today()} · ${counts.todos} movimientos</div>
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
  const W = 215.9, mg = 20;
  let y = mg;

  const { saldo, ganadas, perdidas, totalGanadas, totalPerdidas } = calcFicha(j);

  // Encabezado principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(204, 0, 0); 
  doc.text("GALLO GOLD BRUNO'S", W / 2, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text("Sistema de Registro de Peleas", W / 2, y, { align: 'center' });
  
  y += 5;
  doc.text(`${today()}`, W / 2, y, { align: 'center' });
  
  y += 14;
  
  // Datos del apostador
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`APOSTADOR: ${j.nombre.toUpperCase()}`, mg, y);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`ID: ${j.id}`, W - mg, y, { align: 'right' });
  
  y += 8;

  // Tabla de Peleas (Encabezados)
  const cW = (W - mg * 2) / 2; 
  
  doc.setFillColor(204, 0, 0);
  doc.rect(mg, y, cW, 8, 'F');
  doc.setFillColor(34, 197, 94);
  doc.rect(mg + cW, y, cW, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("PELEAS PERDIDAS", mg + cW / 2, y + 5.5, { align: 'center' });
  doc.text("PELEAS GANADAS", mg + cW + cW / 2, y + 5.5, { align: 'center' });
  
  y += 8;
  
  // Tabla de Peleas (Filas)
  const maxR = Math.max(perdidas.length, ganadas.length, 1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  for (let i = 0; i < maxR; i++) {
    const p = perdidas[i];
    const g = ganadas[i];
    
    if (i % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(mg, y, W - mg * 2, 7, 'F');
    }
    
    doc.setTextColor(0, 0, 0);
    if (p) {
      doc.text(`P ${p.pelea}`, mg + 4, y + 5);
      doc.text(fmt(p.monto), mg + cW - 4, y + 5, { align: 'right' });
    } else {
      doc.text("—", mg + cW / 2, y + 5, { align: 'center' });
    }
    
    if (g) {
      doc.text(`P ${g.pelea}`, mg + cW + 4, y + 5);
      doc.text(fmt(g.monto * 0.9), mg + cW * 2 - 4, y + 5, { align: 'right' });
    } else {
      doc.text("—", mg + cW + cW / 2, y + 5, { align: 'center' });
    }
    
    y += 7;
    
    if (y > 250) {
      doc.addPage();
      y = mg;
    }
  }
  
  y += 10;

  // Bloque de Totales
  const w3 = (W - mg * 2) / 3;
  doc.setFillColor(40, 40, 40);
  doc.rect(mg, y, W - mg * 2, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("SALDO ANTERIOR", mg + w3 / 2, y + 5.5, { align: 'center' });
  doc.text("TOTAL PERDIDAS", mg + w3 + w3 / 2, y + 5.5, { align: 'center' });
  doc.text("TOTAL GANADAS", mg + w3 * 2 + w3 / 2, y + 5.5, { align: 'center' });
  
  y += 8;
  
  doc.setFillColor(245, 245, 245);
  doc.rect(mg, y, W - mg * 2, 10, 'F');
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(fmt(j.saldoAnt), mg + w3 / 2, y + 6.5, { align: 'center' });
  doc.text(fmt(totalPerdidas), mg + w3 + w3 / 2, y + 6.5, { align: 'center' });
  doc.text(fmt(totalGanadas), mg + w3 * 2 + w3 / 2, y + 6.5, { align: 'center' });
  
  y += 20;

  // Resultado y Saldo Final
  const isWin = saldo >= 0;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("SALDO FINAL", mg, y + 8);
  
  doc.setFontSize(22);
  doc.setTextColor(isWin ? 34 : 204, isWin ? 197 : 0, isWin ? 94 : 0);
  doc.text(`${isWin ? '+' : '-'} ${fmt(Math.abs(saldo))}`, W / 2, y + 8, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(`RESULTADO: ${isWin ? 'GANA' : 'PIERDE'}`, W - mg, y + 8, { align: 'right' });
  
  y += 18;
  doc.setDrawColor(200, 200, 200);
  doc.line(mg, y, W - mg, y);
  
  y += 8;
  
  // Pie de página
  const periodoMayus = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gallo Gold Bruno's Corte ${periodoMayus} Generado automáticamente`, W / 2, y, { align: 'center' });

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
  const map = { r: 'dashboard', f: 'fichas', p: 'peleas', d: 'diario', s: 'semanal', m: 'bitacora' };
  if (map[k]) { setTab(map[k]); e.preventDefault(); }
});