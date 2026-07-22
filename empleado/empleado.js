// ============================================================
// empleado/empleado.js
// Lógica del panel de empleado:
//   - Peleas (control total)
//   - Modal apostador (4 pasos + confirmación)
// ============================================================

// ── TAB DEL EMPLEADO ──────────────────────────────────────
const TABS_EMP = [
  { id: 'peleas', label: 'Pelea', icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>` },
];

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await waitForAuth();
  if (!currentUser) {
    window.location.href = '../index.html';
    return;
  }
  if (currentUser.rol !== 'empleado') {
    if (currentUser.rol === 'admin') {
      window.location.href = '../admin/index.html';
    } else {
      window.location.href = '../index.html';
    }
    return;
  }

  const u = currentUser;
  document.getElementById('nav-av').textContent = initials(u.nombre);
  document.getElementById('nav-un').textContent = u.nombre;
  document.getElementById('tb-av').textContent = initials(u.nombre);
  document.getElementById('tb-un').textContent = u.nombre;

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

  TABS_EMP.forEach(t => {
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

  TABS_EMP.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'mob-nav-btn';
    btn.id = `mob-ni-${t.id}`;
    btn.innerHTML = `${t.icon}<span>${t.label}</span>`;
    btn.onclick = () => setTab(t.id);
    nav.appendChild(btn);
  });

  // Botón salir en mobile bottom nav
  const lout = document.createElement('button');
  lout.className = 'mob-nav-btn';
  lout.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
    <span>Salir</span>`;
  lout.onclick = doLogout;
  nav.appendChild(lout);
}

// ── TABS ──────────────────────────────────────────────────
function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-item,.mob-nav-btn').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('visible'));

  document.getElementById(`tab-${tab}`)?.classList.add('visible');
  document.getElementById(`ni-${tab}`)?.classList.add('active');
  document.getElementById(`mob-ni-${tab}`)?.classList.add('active');

  refreshData();

  if (tab === 'peleas') renderPeleas();
}

let peleaFilter = 'espera';
function setPeleaFilter(f) { peleaFilter = f; renderPeleas(); }

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

// ── PELEAS ────────────────────────────────────────────────
function renderPeleas() {
  renderToolbar();
  const sc = document.getElementById('peleas-scroll');
  sc.innerHTML = '';
  sc.style.display = ''; // Reset inline style de Terminadas

  // Vista especial para Terminadas
  if (peleaFilter === 'cerrada') {
    renderTerminadas(sc);
    return;
  }

  const stateWeight = { activa: 0, espera: 1, cerrada: 2 };
  const lista = [...peleas]
    .sort((a, b) => {
      const wA = stateWeight[a.estado] !== undefined ? stateWeight[a.estado] : 99;
      const wB = stateWeight[b.estado] !== undefined ? stateWeight[b.estado] : 99;
      if (wA !== wB) return wA - wB;
      return b.num - a.num;
    })
    .filter(p => {
      const matchFilter = peleaFilter === 'todas' || p.estado === peleaFilter;
      const matchSearch = !searchPeleaQuery || String(p.num).includes(searchPeleaQuery);
      return matchFilter && matchSearch;
    });
  if (!lista.length) {
    sc.innerHTML = `<div class="pb-empty">${searchPeleaQuery ? 'No se encontraron peleas con ese número.' :
        peleaFilter === 'activa' ? ' No hay ninguna pelea en juego ahora.' :
          peleaFilter === 'espera' ? ' No hay peleas en espera.' :
            'No hay peleas registradas.'
      }</div>`;
    return;
  }
  lista.forEach((p, i) => {
    const el = buildPB(p);
    el.style.setProperty('--i', i);
    sc.appendChild(el);
  });
  sc.scrollTop = 0;
}

function renderTerminadas(sc) {
  const cerradas = [...peleas]
    .filter(p => p.estado === 'cerrada')
    .filter(p => !searchPeleaQuery || String(p.num).includes(searchPeleaQuery))
    .sort((a, b) => b.num - a.num);

  if (!cerradas.length) {
    sc.innerHTML = `<div class="pb-empty">No hay peleas terminadas aún.</div>`;
    return;
  }

  // Cambiar grid a lista vertical desde arriba
  sc.style.display = 'flex';
  sc.style.flexDirection = 'column';
  sc.style.gap = '8px';
  sc.style.justifyContent = 'flex-start';
  sc.style.alignItems = 'stretch';

  cerradas.forEach(p => {
    const tR = p.apuestas.filter(a => a.bando === 'rojo').reduce((s, a) => s + a.monto, 0);
    const tV = p.apuestas.filter(a => a.bando === 'verde').reduce((s, a) => s + a.monto, 0);
    const total = tR + tV;
    const comision = total * (appConfig.comision_porcentaje / 100);
    const pctR = total > 0 ? Math.round(tR / total * 100) : 50;
    const pctV = 100 - pctR;

    let ganadorHtml = '';
    let ganadorColor = 'var(--text3)';
    if (p.ganador === 'verde') {
      ganadorHtml = `<span style="color:var(--green2);font-weight:900;font-size:13px;">● Verde</span>`;
      ganadorColor = 'var(--green2)';
    } else if (p.ganador === 'rojo') {
      ganadorHtml = `<span style="color:var(--rojo2);font-weight:900;font-size:13px;">● Rojo</span>`;
      ganadorColor = 'var(--rojo2)';
    } else if (p.ganador === 'empate') {
      ganadorHtml = `<span style="color:var(--gold2);font-weight:900;font-size:13px;">◆ Empate</span>`;
      ganadorColor = 'var(--gold2)';
    } else if (p.ganador === 'anulada') {
      ganadorHtml = `<span style="color:var(--text3);font-weight:900;font-size:13px;">✕ Anulada</span>`;
    } else {
      ganadorHtml = `<span style="color:var(--text3);opacity:.5;font-size:12px;">Sin resultado</span>`;
    }

    const row = document.createElement('div');
    row.className = 'term-row';
    row.style.cssText = `
      display:grid;
      grid-template-columns: 44px 1fr auto auto auto;
      align-items:center;
      gap:12px;
      padding:12px 16px;
      background:linear-gradient(145deg,rgba(28,26,22,.96),rgba(20,18,15,.98));
      border:1px solid rgba(255,255,255,.06);
      border-left:3px solid ${ganadorColor};
      border-radius:10px;
      transition:background .12s,border-color .12s;
      cursor:default;
    `;
    row.innerHTML = `
      <span style="font-family:'JetBrains Mono',monospace;font-weight:900;font-size:15px;color:var(--gold);text-align:center;">#${p.num}</span>
      <div>${ganadorHtml}<div style="margin-top:3px;display:flex;gap:4px;align-items:center;">
        <div style="height:4px;border-radius:4px;background:var(--rojo2);width:${pctR * 0.6}px;max-width:60px;"></div>
        <div style="height:4px;border-radius:4px;background:var(--green2);width:${pctV * 0.6}px;max-width:60px;"></div>
        <span style="font-size:9px;color:var(--text3);margin-left:2px;font-family:'JetBrains Mono',monospace;">${pctR}R·${pctV}V</span>
      </div></div>
      <div style="text-align:right;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;color:var(--text2);">${fmt(total)}</div>
        <div style="font-size:9px;color:var(--text3);margin-top:1px;">TOTAL</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;color:var(--gold);">${fmt(comision)}</div>
        <div style="font-size:9px;color:var(--text3);margin-top:1px;">CASA 10%</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:var(--text3);">${p.apuestas.length} apuestas</div>
      </div>`;
    sc.appendChild(row);
  });
}

function renderToolbar() {
  const tb = document.getElementById('peleas-toolbar');
  const totalPeleas = peleas.length;
  const activas = peleas.filter(p => p.estado === 'activa').length;
  const espera = peleas.filter(p => p.estado === 'espera').length;
  const cerradas = peleas.filter(p => p.estado === 'cerrada').length;
  const peleaActiva = peleas.find(p => p.estado === 'activa');
  // Solo 3 tabs
  const filtros = [
    { id: 'espera', label: 'En espera', count: espera },
    { id: 'activa', label: 'En juego', count: activas },
    { id: 'cerrada', label: 'Terminadas', count: cerradas },
  ];
  // Si el filtro actual es 'todas', redirigir a 'espera'
  if (peleaFilter === 'todas') peleaFilter = 'espera';

  // Banner de pelea activa
  let bannerHtml = '';
  if (peleaActiva) {
    const tR = peleaActiva.apuestas.filter(a => a.bando === 'rojo').reduce((s, a) => s + a.monto, 0);
    const tV = peleaActiva.apuestas.filter(a => a.bando === 'verde').reduce((s, a) => s + a.monto, 0);
    const vol = tR + tV;
    const enEspera = peleas.filter(p => p.estado === 'espera').length;
    bannerHtml = `
      <div class="active-fight-banner">
        <div class="afb-dot"></div>
        <span class="afb-label">En juego</span>
        <span class="afb-num">#${peleaActiva.num}</span>
        ${vol > 0 ? `<span class="afb-vol">${fmt(vol)}</span>` : ''}
        ${enEspera > 0 ? `<span class="afb-sep"></span><span class="afb-queued">${enEspera} en cola</span>` : ''}
      </div>`;
  }

  tb.innerHTML = `
    <div class="p-num-big">⚔️ Peleas</div>
    <div class="ctrl-sep"></div>
    <div class="pf-row">
      ${filtros.map(f => `
        <button class="pf-btn ${f.id}${peleaFilter === f.id ? ' active' : ''}"
                onclick="setPeleaFilter('${f.id}')">
          <span class="pf-lbl">${f.label}</span>
          <span class="pf-cnt">${f.count}</span>
        </button>`).join('')}
    </div>
    <div class="ctrl-sep"></div>
    ${peleaFilter !== 'cerrada' ? `
    <div class="search-box p-search">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="number" id="pelea-search-inp" placeholder="Buscar #" value="${searchPeleaQuery || ''}" oninput="searchPelea(this.value)">
    </div>` : `
    <div class="search-box p-search">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="number" id="pelea-search-inp" placeholder="Buscar #" value="${searchPeleaQuery || ''}" oninput="searchPelea(this.value)">
    </div>`}
    <button class="bc-n" onclick="nuevaPelea()">${I.plus} Nueva pelea</button>
    <div class="ctrl-sep"></div>
    <div class="pin-badge" id="pin-badge">
      <span class="pin-lbl">📺 PIN</span>
      <span class="pin-code" id="pin-code">······</span>
      <button class="pin-btn" onclick="copyPlayerPin()" title="Copiar PIN">📋</button>
      <button class="pin-btn" onclick="refreshPlayerPin()" title="Generar nuevo PIN">↻</button>
    </div>`;

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

  loadPlayerPinBadge();
}

async function loadPlayerPinBadge() {
  const el = document.getElementById('pin-code');
  if (!el) return;
  const pin = await getPlayerPin();
  el.textContent = pin || '——';
  el.style.opacity = pin ? '1' : '.4';
}

async function copyPlayerPin() {
  const pin = await getPlayerPin();
  if (!pin) { toast('No hay PIN configurado', 'error'); return; }
  try {
    await navigator.clipboard.writeText(pin);
    toast('PIN copiado: <strong>' + pin + '</strong>', 'success');
  } catch {
    toast('PIN: ' + pin, 'info');
  }
}

async function refreshPlayerPin() {
  const ok = await showConfirm('¿Generar nuevo PIN para la vista de espectadores?<br><span style="font-size:12px;color:var(--text3);">El PIN anterior dejará de funcionar.</span>', '↻', 'Generar', 'primary');
  if (!ok) return;
  const pin = generatePlayerPin();
  await setPlayerPin(pin);
  await logAction('config', 'PIN de vista de espectadores regenerado a <strong>' + pin + '</strong>', '📺');
  const el = document.getElementById('pin-code');
  if (el) {
    el.textContent = pin;
    el.style.opacity = '1';
  }
  toast('Nuevo PIN: <strong>' + pin + '</strong>', 'success');
}

function expandirTodas() {
  peleas.forEach(p => p.minimizada = false);
  renderPeleas();
}

// Limpiar filtro al colapsar todas para evitar confusión
function colapsarTodas() {
  peleas.forEach(p => p.minimizada = true);
  renderPeleas();
}

function toggleMin(num) {
  const p = getPelea(num);
  if (p) { p.minimizada = !p.minimizada; renderPeleas(); }
}

function buildPB(p) {
  if (p.minimizada === undefined) p.minimizada = false;

  // ── Detectar si hay una pelea activa (para bloquear play en otras) ──
  const hayActiva = peleas.some(x => x.estado === 'activa');
  const estaEnCola = p.estado === 'espera' && hayActiva;

  const rojos = p.apuestas.filter(a => a.bando === 'rojo');
  const verdes = p.apuestas.filter(a => a.bando === 'verde');
  const tR = rojos.reduce((s, a) => s + a.monto, 0);
  const tV = verdes.reduce((s, a) => s + a.monto, 0);
  const tRCasado = rojos.reduce((s, a) => s + (a.montoCasado || 0), 0);
  const tVCasado = verdes.reduce((s, a) => s + (a.montoCasado || 0), 0);
  const total = tR + tV;
  const pctR = total > 0 ? Math.round(tR / total * 100) : 50;
  const pctV = 100 - pctR;
  const pCls = p.estado === 'activa' ? 'pill-a' : p.estado === 'espera' ? 'pill-e' : 'pill-c';
  const pTxt = p.estado === 'activa' ? 'En juego' : p.estado === 'espera' ? 'En espera' : 'Terminada';

  const chevron = p.minimizada
    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
    : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;

  const isEspera = p.estado === 'espera';
  const isActiva = p.estado === 'activa';
  const isCerrada = p.estado === 'cerrada';

  // ── Controles de estado: solo play si espera, solo indicador si activa ──
  const stateCtrl = !isCerrada ? `
    <div class="pb-state-group">
      ${isEspera ? `<button class="pb-st-big st-espera" title="En espera">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      </button>
      <button class="pb-st-big btn-play-start${(!isActiva && hayActiva) ? ' locked-play' : ''}" onclick="event.stopPropagation();cambiarEstadoPelea(${p.num},'activa')" title="${hayActiva ? 'Espera a que termine la pelea activa' : 'Iniciar pelea'}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
      </button>` : `<button class="pb-st-big st-activa" title="En juego">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
      </button>`}
    </div>` : '';

  // ── Botón Finalizar (solo si está activa y tiene apuestas) ──
  const finalizarBtn = isActiva && p.apuestas.length > 0 ? `
    <button class="pb-fin-btn" onclick="event.stopPropagation();toggleFinalizarPanel(${p.num})" title="Finalizar pelea">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Finalizar
    </button>` : '';

  // ── Botón eliminar más visible ──
  const delBtn = `
    <button class="pb-del-btn-v2" onclick="event.stopPropagation();confirmEliminarPelea(${p.num})" title="Eliminar pelea">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      </svg>
    </button>`;

  // ── Panel de finalizar (inline) ──
  const finalizarPanel = !isCerrada ? `
    <div class="pb-fin-panel" id="fin-panel-${p.num}" style="display:none;">
      <div class="pb-fin-panel-inner">
        <span class="pb-fin-lbl">¿Quién ganó la Pelea #${p.num}?</span>
        <div class="pb-fin-opts">
          <button class="pb-fin-opt fov" onclick="event.stopPropagation();ganarPelea(${p.num},'verde')">
            <span class="fopt-dot" style="background:var(--green2);"></span> Verde
          </button>
          <button class="pb-fin-opt for" onclick="event.stopPropagation();ganarPelea(${p.num},'rojo')">
            <span class="fopt-dot" style="background:var(--rojo2);"></span> Rojo
          </button>
          <button class="pb-fin-opt foa" onclick="event.stopPropagation();ganarPelea(${p.num},'anulada')">
            <span class="fopt-dot" style="background:var(--text3);"></span> Anular
          </button>
        </div>
        <button class="pb-fin-close" onclick="event.stopPropagation();toggleFinalizarPanel(${p.num})">
          Cancelar
        </button>
      </div>
    </div>` : '';

  // ── Resultado para cerradas ──
  let winnerSection = '';
  if (isCerrada) {
    if (p.ganador === 'empate') {
      winnerSection = `<span class="pb-winner" style="color:var(--gold2);">◆ Empate</span>`;
    } else if (p.ganador === 'anulada') {
      winnerSection = `<span class="pb-winner" style="color:var(--text3);">✕ Anulada</span>`;
    } else if (p.ganador) {
      const wCol = p.ganador === 'verde' ? 'var(--green2)' : 'var(--rojo2)';
      winnerSection = `<span class="pb-winner" style="color:${wCol};">● Ganó <strong>${p.ganador === 'verde' ? 'Verde' : 'Rojo'}</strong></span>`;
    } else {
      winnerSection = `<span class="pb-winner" style="opacity:.4;">Sin resultado</span>`;
    }
  }

  const buildRows = lista => lista.length
    ? lista.map(a => {
      const cls = a.resultado === 'ganada' ? ' gr' : a.resultado === 'perdida' ? ' pr' : '';
      const mc = a.resultado === 'ganada' ? ' g' : a.resultado === 'perdida' ? ' p' : '';
      
      if (a.estado === 'casado' || isCerrada) {
        return `<div class="ap-row${cls}">
            <span class="ap-name">${sanitize(a.nombre)}</span>
            <span class="ap-monto${mc}">${fmt(a.monto)}</span>
            ${!isCerrada ? `
              <div class="ap-row-actions">
                <button class="ap-del" onclick="elimDePelea(${p.num},'${a.id}')">${I.x}</button>
              </div>
            ` : ''}
          </div>`;
      }
      
      return `<div class="ap-row${cls} parcial">
          <div class="ap-info-split">
            <span class="ap-name">${sanitize(a.nombre)}</span>
            <div class="ap-badges">
              ${a.montoCasado > 0 ? `<span class="badge-matched">${fmt(a.montoCasado)} Casado</span>` : ''}
              ${a.montoPendiente > 0 ? `<span class="badge-unmatched">${fmt(a.montoPendiente)} En Cola</span>` : ''}
            </div>
          </div>
          <span class="ap-monto${mc}">${fmt(a.monto)}</span>
          ${!isCerrada ? `
            <div class="ap-row-actions">
              ${(isEspera && a.montoCasado === 0) ? `<button class="ap-swap" onclick="cambiarBandoApuesta(${p.num},'${a.id}','${a.bando}')" title="Cambiar de lado/color">${I.swap}</button>` : ''}
              <button class="ap-del" onclick="elimDePelea(${p.num},'${a.id}')">${I.x}</button>
            </div>
          ` : ''}
        </div>`;
    }).join('')
    : '<div class="ap-empty">Sin apuestas</div>';

  const addBtn = isEspera
    ? `<div class="pb-add-row">
        <button class="btn-add-ap" onclick="openModalAp(${p.num})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            <line x1="19" y1="11" x2="19" y2="17"/><line x1="16" y1="14" x2="22" y2="14"/>
          </svg>
          Registrar apuesta
        </button>
      </div>` : '';

  const bar = total > 0
    ? `<div class="pelea-bar"><div class="pb-bar-r" style="width:${pctR}%"></div><div class="pb-bar-v" style="width:${pctV}%"></div></div>`
    : '';

  const div = document.createElement('div');
  let cardClass = 'pb';
  if (isActiva) cardClass += ' active-pelea-card';
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
        ${stateCtrl}
        ${finalizarBtn}
        ${delBtn}
        <span class="pb-chev">${chevron}</span>
      </div>
    </div>
    ${isCerrada && winnerSection ? `<div class="pb-actions">${winnerSection}</div>` : ''}
    ${finalizarPanel}
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
      ${addBtn}
      <div class="pb-reparte">
        <div class="pb-rep-cell">
          <span class="pb-rep-lbl">Pago Rojo</span>
          <span class="pb-rep-arrow">→</span>
          <span class="pb-rep-val" style="color:var(--rojo2);">${fmt(tVCasado * (1 - appConfig.comision_porcentaje / 100))}</span>
        </div>
        <div class="pb-rep-cell">
          <span class="pb-rep-lbl">Pago Verde</span>
          <span class="pb-rep-arrow">→</span>
          <span class="pb-rep-val" style="color:var(--green2);">${fmt(tRCasado * (1 - appConfig.comision_porcentaje / 100))}</span>
        </div>
      </div>`}`;
  return div;
}

function toggleFinalizarPanel(pNum) {
  const panel = document.getElementById(`fin-panel-${pNum}`);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  // Cerrar todos los paneles primero
  document.querySelectorAll('.pb-fin-panel').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.pb-fin-btn').forEach(el => el.classList.remove('active'));
  if (!isOpen) {
    panel.style.display = 'block';
    const btn = panel.closest('.pb')?.querySelector('.pb-fin-btn');
    if (btn) btn.classList.add('active');
  }
}

async function cambiarBandoApuesta(pN, apId, bandoActual) {
  const nuevoBando = bandoActual === 'rojo' ? 'verde' : 'rojo';
  const labelBando = nuevoBando === 'rojo' ? 'Rojo' : 'Verde';
  
  const ok = await showConfirm(`¿Cambiar esta apuesta al bando <strong>${labelBando}</strong>?`, '↺');
  if (!ok) return;

  const p = getPelea(pN);
  const ap = p.apuestas.find(a => a.id === apId);
  if (!ap) return;

  const { error: delErr } = await sb.from('apuestas').delete().eq('id', apId);
  if (delErr) {
    toast(`⚠️ Error al mover apuesta: ${delErr.message}`, 'error');
    return;
  }

  const { error: insErr } = await sb.rpc('registrar_apuesta_p2p', {
    p_pelea_num: pN,
    p_jugador_id: ap.jugadorId,
    p_bando: nuevoBando,
    p_monto: ap.monto,
    p_autorizado_por: null
  });

  if (insErr) {
    toast(`⚠️ Error al registrar apuesta en el nuevo bando: ${insErr.message}`, 'error');
    return;
  }

  await logAction('apuesta', `<strong>${ap.nombre}</strong> — Movió su apuesta de ${fmt(ap.monto)} al bando <strong>${labelBando}</strong> · Pelea #${pN}`, '↺');
  await refreshData();
  toast(`Apuesta movida al bando <strong>${labelBando}</strong>`, 'success');
}

async function elimDePelea(pN, apId) {
  const p = getPelea(pN);
  const ap = p.apuestas.find(a => a.id === apId);

  const { error } = await sb.from('apuestas').delete().eq('id', apId);
  if (error) {
    toast(`⚠️ Error al eliminar apuesta: ${error.message}`, 'error');
    return;
  }

  await logAction('eliminar', `Apuesta de <strong>${ap?.nombre || 'participante'}</strong> eliminada de Pelea #${pN}`, '×');
  await refreshData();
}

async function ganarPelea(pN, ganador) {
  const p = getPelea(pN);
  if (!p || p.estado !== 'activa') {
    toast(`No se puede finalizar la Pelea #${pN} porque no está activa.`, 'error');
    return;
  }
  let confirmMsg = `¿Cerrar pelea con ganador <strong>${ganador === 'verde' ? 'Verde' : 'Rojo'}</strong> en Pelea #<strong>${pN}</strong>?`;
  if (ganador === 'empate') {
    confirmMsg = `¿Cerrar Pelea #<strong>${pN}</strong> declarando <strong>Empate (Tabla)</strong>?`;
  } else if (ganador === 'anulada') {
    confirmMsg = `¿Cerrar Pelea #<strong>${pN}</strong> y <strong>Anular/Cancelar</strong> todas sus apuestas?`;
  }

  const ok = await showConfirm(confirmMsg, '✓');
  if (!ok) return;

  const { data: peleaDb } = await sb
    .from('peleas')
    .select('id')
    .eq('numero_pelea', pN)
    .single();

  if (peleaDb) {
    await sb
      .from('peleas')
      .update({ estado: 'cerrada', ganador: ganador })
      .eq('id', peleaDb.id);

    if (ganador === 'anulada') {
      // Cuando la pelea se anula, se eliminan todas sus apuestas de la base de datos por completo
      await sb
        .from('apuestas')
        .delete()
        .eq('pelea_id', peleaDb.id);
    } else if (ganador === 'empate') {
      await sb
        .from('apuestas')
        .update({ resultado: 'devuelta' })
        .eq('pelea_id', peleaDb.id);
    } else {
      await sb
        .from('apuestas')
        .update({ resultado: 'ganada' })
        .eq('pelea_id', peleaDb.id)
        .eq('bando', ganador);

      await sb
        .from('apuestas')
        .update({ resultado: 'perdida' })
        .eq('pelea_id', peleaDb.id)
        .neq('bando', ganador);
    }
  }

  const actMsg = ganador === 'empate' ? 'Empate' : ganador === 'anulada' ? 'Anulada' : `Ganó ${ganador === 'verde' ? 'Verde' : 'Rojo'}`;
  await logAction('resultado', `Pelea #${pN} cerrada — <strong>${actMsg}</strong>`, '✓');
  await refreshData();
  toast(`<strong>Pelea #${pN}</strong> cerrada — ${actMsg}`, 'success');

  // ── Preguntar si iniciar la siguiente pelea ──
  const siguiente = peleas.filter(x => x.estado === 'espera').sort((a, b) => a.num - b.num)[0];
  if (siguiente) {
    setTimeout(async () => {
      const ok = await showConfirm(`¿Listo para iniciar <strong>Pelea #${siguiente.num}</strong>?`, '▶');
      if (ok) {
        await cambiarEstadoPelea(siguiente.num, 'activa');
      }
    }, 600);
  }
}

async function cambiarEstadoPelea(pN, nuevoEstado) {
  const p = getPelea(pN);
  if (!p || p.estado === nuevoEstado) return;

  // ── REGLA: solo 1 pelea activa a la vez ──
  if (nuevoEstado === 'activa') {
    const otraActiva = peleas.find(x => x.estado === 'activa' && x.num !== pN);
    if (otraActiva) {
      toast(`Ya hay una pelea activa (#${otraActiva.num}). Ciérrala primero para activar esta.`, 'error');
      return;
    }
    // ── REGLA: Debe haber al menos una apuesta en cada bando y estar parejas ──
    const rojos = p.apuestas.filter(a => a.bando === 'rojo');
    const verdes = p.apuestas.filter(a => a.bando === 'verde');
    const tRCasado = rojos.reduce((s, a) => s + (a.montoCasado || 0), 0);

    if (rojos.length === 0 || verdes.length === 0) {
      toast(`No se puede iniciar Pelea #${pN}. Debe haber al menos una apuesta en cada bando.`, 'error');
      return;
    }
    if (tRCasado === 0) {
      toast(`No se puede iniciar Pelea #${pN}. Las apuestas deben estar emparejadas (casadas).`, 'error');
      return;
    }
  }

  if (p.estado === 'cerrada' && nuevoEstado !== 'cerrada') {
    const ok = await showConfirm(`¿Reabrir <strong>Pelea #${pN}</strong>?<br>Se eliminarán los resultados actuales.`, '↺');
    if (!ok) return;

    const { data: peleaDb } = await sb.from('peleas').select('id').eq('numero_pelea', pN).single();
    if (peleaDb) {
      await sb.from('peleas').update({ estado: nuevoEstado, ganador: null }).eq('id', peleaDb.id);
      await sb.from('apuestas').update({ resultado: 'pendiente' }).eq('pelea_id', peleaDb.id);
    }
  } else {
    if (nuevoEstado === 'cerrada') {
      toast('Selecciona un resultado (Verde, Rojo, Empate o Anular) para cerrar la pelea', 'info');
      return;
    }

    if (nuevoEstado === 'activa') {
      const { error: actErr } = await sb.rpc('activar_pelea_y_limpiar_remanentes', { p_pelea_num: pN });
      if (actErr) {
        toast(`⚠️ Error al iniciar pelea: ${actErr.message}`, 'error');
        return;
      }
    } else {
      const { data: peleaDb } = await sb.from('peleas').select('id').eq('numero_pelea', pN).single();
      if (peleaDb) {
        await sb.from('peleas').update({ estado: nuevoEstado }).eq('id', peleaDb.id);
      }
    }
  }

  const labels = { espera: 'En espera', activa: 'Activa', cerrada: 'Cerrada' };
  await logAction('estado', `Pelea #${pN} → <strong>${labels[nuevoEstado]}</strong>`, '•');

  if (pN === peleaActual) estadoPelea = nuevoEstado;

  await refreshData();
  if (nuevoEstado === 'activa') {
    toast(`<strong>Pelea #${pN} en juego</strong><br>Ya no se aceptan más apuestas`, 'error');
  } else {
    toast(`<strong>P#${pN}</strong> ${labels[nuevoEstado]}`, 'success');
  }
}

async function confirmEliminarPelea(pN) {
  const p = getPelea(pN);
  if (!p) return;
  const ok = await showConfirm(`¿Eliminar <strong>Pelea #${pN}</strong>?<br><span style="font-size:12px;color:var(--text3);">Se borrarán todas las apuestas asociadas. Esta acción no se puede deshacer.</span>`, '×', 'Eliminar', 'danger');
  if (!ok) return;
  await eliminarPelea(pN);
  renderPeleas();
}

async function nuevaPelea() {
  // ── REGLA: solo 1 pelea en espera a la vez ──
  const hayEspera = peleas.some(p => p.estado === 'espera');

  if (hayEspera) {
    mostrarBloqueoNuevaPelea();
    return;
  }

  const nextNum = peleas.length > 0 ? Math.max(...peleas.map(p => p.num)) + 1 : 1;

  const { error } = await sb.from('peleas').insert({
    numero_pelea: nextNum,
    estado: 'espera',
    ganador: null
  });
  if (error) {
    toast(`Error al crear pelea: ${error.message}`, 'error');
    return;
  }

  peleaFilter = 'espera';
  await logAction('nueva-pelea', `Nueva pelea #${nextNum} creada`, '+');
  await refreshData();
  toast(`<strong>Pelea #${nextNum}</strong> creada — en espera`);
}

function mostrarBloqueoNuevaPelea() {
  const prev = document.getElementById('bloqueo-overlay');
  if (prev) prev.remove();

  const pEspera = peleas.find(p => p.estado === 'espera');

  const overlay = document.createElement('div');
  overlay.id = 'bloqueo-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:800;
    background:rgba(0,0,0,.75);
    display:flex;align-items:center;justify-content:center;
    padding:20px;
    backdrop-filter:blur(4px);
    animation:fadeInOverlay .2s ease;
  `;
  overlay.innerHTML = `
    <div style="
      max-width:380px;width:100%;
      background:linear-gradient(145deg,rgba(28,24,16,.98),rgba(16,14,9,.99));
      border:1px solid rgba(201,168,76,.35);
      border-radius:18px;
      padding:28px 24px;
      box-shadow:0 0 0 1px rgba(201,168,76,.15) inset, 0 24px 60px rgba(0,0,0,.7), 0 0 60px rgba(201,168,76,.08);
      text-align:center;
      position:relative;
      overflow:hidden;
    ">
      <div style="
        position:absolute;top:0;left:0;right:0;height:2px;
        background:linear-gradient(90deg,transparent,#E8C97A 30%,#C9A84C 50%,#E8C97A 70%,transparent);
      "></div>
      <div style="font-size:36px;margin-bottom:12px;">🚫</div>
      <div style="
        font-family:'Outfit',sans-serif;font-size:17px;font-weight:900;
        color:var(--text);margin-bottom:8px;
      ">No se puede crear otra pelea</div>
      <div style="
        font-family:'Outfit',sans-serif;font-size:13px;color:var(--text3);
        line-height:1.6;margin-bottom:20px;
      ">Ya hay una pelea <span style="color:var(--gold);font-weight:700;">En espera (#${pEspera?.num ?? '?'})</span>.<br>Solo puede haber una pelea en espera a la vez.</div>
      <div style="
        padding:10px;
        background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);
        border-radius:10px;margin-bottom:4px;
      ">
        <div style="font-size:9px;font-weight:700;color:rgba(201,168,76,.6);text-transform:uppercase;letter-spacing:.6px;">En espera</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:900;color:var(--gold);">#${pEspera?.num ?? '?'}</div>
      </div>
      <button onclick="document.getElementById('bloqueo-overlay').remove()" style="
        margin-top:18px;width:100%;padding:11px;
        background:linear-gradient(145deg,#E8C97A,#C9A84C,#A8862B);
        border:none;border-radius:10px;
        font-family:'Outfit',sans-serif;font-size:14px;font-weight:900;
        color:#0a0806;cursor:pointer;
        box-shadow:0 4px 16px rgba(201,168,76,.25);
      ">Entendido</button>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ── MODAL APOSTADOR ───────────────────────────────────────
let _modal = {
  step: 1, peleaNum: null,
  nombre: '', jugadorId: null, esNuevo: false,
  bando: null, monto: null, tipoPago: 'efectivo'
};

function openModalAp(pN) {
  _modal = { step: 1, peleaNum: pN, nombre: '', jugadorId: null, esNuevo: false, bando: null, monto: null, tipoPago: 'efectivo' };
  document.getElementById('modal-ap').style.display = 'flex';
  renderModalStep();
}
function closeModal() {
  document.getElementById('modal-ap').style.display = 'none';
}
function modalBgClick(e) {
  if (e.target === document.getElementById('modal-ap')) closeModal();
}

// ── Renderiza el paso actual ──────────────────────────────
function updateModalSteps() {
  const m = _modal;
  const fill = document.getElementById('modal-steps-fill');
  if (fill) {
    const pct = (m.step - 1) * 33.33;
    fill.style.width = `${pct}%`;
  }
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`ms-${i}`);
    if (el) {
      el.className = 'ms';
      if (i < m.step) {
        el.classList.add('done');
      } else if (i === m.step) {
        el.classList.add('active');
      }
    }
  }
}

function renderModalStep() {
  const m = _modal;
  const titles = { 1: 'Apostador', 2: 'Lado', 3: 'Monto', 4: 'Confirmar' };
  document.getElementById('modal-title').textContent = 'Registrar Apuesta';

  const body = document.getElementById('modal-body');
  const foot = document.getElementById('modal-foot');

  updateModalSteps();

  // ── PASO 1: Nombre ───────────────────────────────────────
  if (m.step === 1) {
    body.innerHTML = `
      <div style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px;">Nombre del apostador</div>
      <div class="modal-search">
        <input type="text" id="ms-inp" placeholder="Buscar o escribir nombre…"
               autocomplete="off"
               oninput="filterSugs(this.value)"
               onkeydown="msKeydown(event)">
        <div class="modal-sugs" id="ms-sugs" style="display:none;"></div>
      </div>`;
    foot.innerHTML = `
      <button class="mbtn ghost" onclick="closeModal()">Cancelar</button>
      <button class="mbtn primary" id="mb-n1" onclick="modalNext1()" disabled>Siguiente →</button>`;

    // Restaurar valor si volvemos atrás
    setTimeout(() => {
      const el = document.getElementById('ms-inp');
      if (el) {
        el.value = m.nombre || '';
        el.focus();
        if (m.nombre) document.getElementById('mb-n1').disabled = false;
      }
    }, 30);
  }

  // ── PASO 2: Equipo ───────────────────────────────────────
  else if (m.step === 2) {
    body.innerHTML = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px;font-weight:600;">
        👤 <strong style="color:var(--text);">${m.nombre}</strong>
      </div>
      <div style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px;">Selecciona lado</div>
      <div class="modal-team-btns">
        <button class="mtb${m.bando === 'rojo' ? ' sel-r' : ''}" data-side="rojo" onclick="selTeam('rojo')">
          <span class="mtb-ico">Rojo</span>
          <span class="mtb-lbl">Lado Rojo</span>
          <span class="mtb-glow"></span>
        </button>
        <button class="mtb${m.bando === 'verde' ? ' sel-v' : ''}" data-side="verde" onclick="selTeam('verde')">
          <span class="mtb-ico">Verde</span>
          <span class="mtb-lbl">Lado Verde</span>
          <span class="mtb-glow"></span>
        </button>
      </div>`;
    foot.innerHTML = `
      <button class="mbtn ghost" onclick="goBack()">← Atrás</button>
      <button class="mbtn primary" id="mb-n2" onclick="modalNext2()" ${m.bando ? '' : 'disabled'}>Siguiente →</button>`;
  }

  // ── PASO 3: Monto ────────────────────────────────────────
  else if (m.step === 3) {
    const amts = [500, 1000, 1500, 2000];
    const esOtro = m.monto && !amts.includes(m.monto);

    // Recuadro de información de crédito
    const j = jugadores.find(x => x.id === m.jugadorId);
    let creditInfoHtml = '';
    if (j) {
      const creditoDisponible = j.limiteCredito - j.creditoUtilizado;
      creditInfoHtml = `
        <div class="credit-info-box" style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;font-size:11px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center;">
            <span style="color:var(--text3);">Límite de crédito:</span>
            <span style="color:var(--text);font-family:'JetBrains Mono',monospace;">${fmt(j.limiteCredito)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center;">
            <span style="color:var(--text3);">Crédito utilizado:</span>
            <span style="color:var(--text);font-family:'JetBrains Mono',monospace;">${fmt(j.creditoUtilizado)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center;">
            <span style="color:var(--text3);">Crédito disponible:</span>
            <span style="color:${creditoDisponible >= 0 ? 'var(--green2)' : 'var(--rojo2)'};font-family:'JetBrains Mono',monospace;font-weight:bold;">${fmt(creditoDisponible)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:var(--text3);">Estado candado:</span>
            <span style="color:${j.estadoCandado ? 'var(--rojo2)' : 'var(--green2)'};font-weight:bold;">${j.estadoCandado ? '🔒 BLOQUEADO' : '🔓 ACTIVO'}</span>
          </div>
        </div>`;
    } else {
      creditInfoHtml = `
        <div class="credit-info-box" style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;font-size:11px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center;">
            <span style="color:var(--text3);">Límite de crédito (nuevo):</span>
            <span style="color:var(--text);font-family:'JetBrains Mono',monospace;">${fmt(5000.00)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center;">
            <span style="color:var(--text3);">Crédito disponible:</span>
            <span style="color:var(--green2);font-family:'JetBrains Mono',monospace;font-weight:bold;">${fmt(5000.00)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:var(--text3);">Estado candado:</span>
            <span style="color:var(--green2);font-weight:bold;">🔓 ACTIVO</span>
          </div>
        </div>`;
    }

    body.innerHTML = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px;font-weight:600;">
        👤 <strong style="color:var(--text);">${m.nombre}</strong> ·
        <span style="color:${m.bando === 'verde' ? 'var(--green2)' : 'var(--rojo2)'};">
          ${m.bando === 'verde' ? 'Verde' : 'Rojo'}
        </span>
      </div>
      <div style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px;">Monto de apuesta</div>
      <div class="modal-amt-grid">
        ${amts.map(a => `<button class="mab${m.monto === a ? ' sel' : ''}" onclick="selAmt(event,${a})">${fmt(a)}</button>`).join('')}
        <button class="mab otro${esOtro ? ' sel' : ''}" onclick="selAmt(event,'otro')">Monto personalizado</button>
      </div>
      <div id="otro-wrap" style="display:${esOtro ? 'block' : 'none'};">
        <input class="modal-otro-inp" id="otro-inp"
               type="text" inputmode="numeric"
               placeholder="$0"
               value="${esOtro ? '$' + Number(m.monto).toLocaleString('en-US') : ''}"
               oninput="otroChange(this.value)">
      </div>
      <div style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.7px;margin-top:16px;margin-bottom:8px;">Método de pago</div>
      <div class="modal-amt-grid" style="grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom:12px;">
        <button class="mab${m.tipoPago === 'efectivo' ? ' sel' : ''}" onclick="selPayment('efectivo')">💵 Efectivo</button>
        <button class="mab${m.tipoPago === 'credito' ? ' sel' : ''}" onclick="selPayment('credito')">💳 Crédito</button>
      </div>
      ${creditInfoHtml}`;
    foot.innerHTML = `
      <button class="mbtn ghost" onclick="goBack()">← Atrás</button>
      <button class="mbtn primary" id="mb-n3" onclick="modalNext3()" ${(m.monto && m.monto > 0) ? '' : 'disabled'}>Revisar →</button>`;
  }

  // ── PASO 4: Confirmar ────────────────────────────────────
  else if (m.step === 4) {
    const j = jugadores.find(x => x.id === m.jugadorId);
    const estadoCandado = j ? j.estadoCandado : false;
    const creditoUtilizado = j ? j.creditoUtilizado : 0;
    const limiteCredito = j ? j.limiteCredito : 5000;

    let errorMsg = '';
    if (m.tipoPago === 'credito') {
      if (estadoCandado) {
        errorMsg = 'Usuario bloqueado por administración';
      } else if (m.monto + creditoUtilizado > limiteCredito) {
        errorMsg = 'Crédito excedido';
      }
    }

    let alertH = '';
    if (m.esNuevo) {
      alertH = `<div class="modal-alert new">
           <span class="modal-alert-ico">✨</span>
           <div class="modal-alert-txt"><strong>Persona nueva</strong> — Se registrará en el sistema automáticamente.</div>
         </div>`;
    } else if (errorMsg) {
      alertH = `<div class="modal-alert error" style="background:rgba(231,76,60,0.15);border:1px solid var(--rojo2);color:#ff6b6b;padding:10px;border-radius:6px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
           <span style="font-size:16px;">⚠️</span>
           <div class="modal-alert-txt"><strong>Atención:</strong> ${errorMsg}</div>
         </div>`;
    }

    body.innerHTML = `${alertH}
      <div class="modal-confirm-box">
        <div class="mcb-row"><span class="mcb-lbl">Apostador</span><span class="mcb-val">${m.nombre}</span></div>
        <div class="mcb-row"><span class="mcb-lbl">Pelea</span>    <span class="mcb-val" style="color:var(--gold);">#${m.peleaNum}</span></div>
        <div class="mcb-row"><span class="mcb-lbl">Lado</span>
          <span class="mcb-val" style="color:${m.bando === 'verde' ? 'var(--green2)' : 'var(--rojo2)'};">
          ${m.bando === 'verde' ? 'Verde' : 'Rojo'}
          </span>
        </div>
        <div class="mcb-row"><span class="mcb-lbl">Monto</span>
          <span class="mcb-val" style="font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--gold);">
            ${fmt(m.monto)}
          </span>
        </div>
        <div class="mcb-row"><span class="mcb-lbl">Método Pago</span>
          <span class="mcb-val" style="text-transform: capitalize; color: ${m.tipoPago === 'credito' ? 'var(--gold)' : 'var(--text)'}; font-weight: bold;">
            ${m.tipoPago === 'credito' ? '💳 Crédito' : '💵 Efectivo'}
          </span>
        </div>
      </div>`;

    foot.innerHTML = `
      <button class="mbtn ghost" onclick="goBack()">Editar</button>
      <button class="mbtn primary" onclick="modalConfirm()" ${errorMsg ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
        Aceptar
      </button>`;
  }
}

// ── Funciones de navegación del modal ────────────────────
function goBack() { _modal.step--; renderModalStep(); }

function modalNext1() {
  const q = (document.getElementById('ms-inp')?.value || '').trim();
  if (!q) return;
  if (q.split(/\s+/).length < 2) {
    toast('Ingresa nombre y apellido del apostador', 'error');
    return;
  }
  _modal.nombre = q;
  if (!_modal.jugadorId && !_modal.esNuevo) {
    const exact = jugadores.find(j => j.nombre.toLowerCase() === q.toLowerCase());
    if (exact) { _modal.jugadorId = exact.id; _modal.esNuevo = false; }
    else _modal.esNuevo = true;
  }
  _modal.step = 2;
  renderModalStep();
}

function modalNext2() {
  if (!_modal.bando) return;
  _modal.step = 3;
  renderModalStep();
}

function selPayment(type) {
  _modal.tipoPago = type;
  renderModalStep();
}

function modalNext3() {
  if (!_modal.monto || _modal.monto <= 0) return;
  _modal.step = 4;
  renderModalStep();
}

// ── Sugerencias de nombres ────────────────────────────────
function filterSugs(q) {
  const sug = document.getElementById('ms-sugs');
  const nxt = document.getElementById('mb-n1');
  _modal.nombre = q;
  _modal.jugadorId = null;
  _modal.esNuevo = false;
  if (nxt) nxt.disabled = !q.trim();
  if (!q.trim()) { sug.style.display = 'none'; return; }

  const matches = jugadores.filter(j =>
    j.nombre.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 6);

  let html = matches.map(j => {
    const { saldo, ganadas, perdidas, enJuego } = calcFicha(j);
    const sc = saldo > 0 ? 'var(--green2)' : saldo < 0 ? 'var(--rojo2)' : 'var(--text3)';
    const gLen = ganadas.length, pLen = perdidas.length;
    const record = gLen || pLen ? `${gLen}G ${pLen}P` : '';
    return `<div class="modal-sug-item" onclick="selSug('${j.id}')">
      <div class="modal-sug-av" style="background:${j.color}22;color:${j.color};border-color:${j.color}55;">${initials(j.nombre)}</div>
      <div>
        <div class="modal-sug-name">${sanitize(j.nombre)}${j.estadoCandado ? ' <span style="color:var(--rojo2); font-size:10px;">🔒</span>' : ''}</div>
        <div class="modal-sug-bal" style="color:${sc};">${saldo >= 0 ? '+' : '−'}${fmt(saldo)} · ${j.apuestas.length} ap. ${j.creditoUtilizado > 0 ? `· 💳 ${fmt(j.creditoUtilizado)}` : ''}</div>
      </div>
    </div>`;
  }).join('');

  // Opción "registrar como nuevo" si no existe exacto
  if (!jugadores.find(j => j.nombre.toLowerCase() === q.toLowerCase())) {
    html += `<div class="modal-sug-new" onclick="regNuevo()">✨ Registrar "<strong>${q}</strong>" como nuevo</div>`;
  }

  sug.innerHTML = html;
  sug.style.display = html ? 'block' : 'none';
}

function msKeydown(e) {
  if (e.key !== 'Enter') return;
  const q = document.getElementById('ms-inp')?.value.trim();
  if (!q) return;
  const exact = jugadores.find(j => j.nombre.toLowerCase() === q.toLowerCase());
  if (exact) selSug(exact.id);
  else regNuevo();
}

function selSug(jId) {
  const j = jugadores.find(x => x.id === jId);
  if (!j) return;
  _modal.nombre = j.nombre;
  _modal.jugadorId = jId;
  _modal.esNuevo = false;
  document.getElementById('ms-inp').value = j.nombre;
  document.getElementById('ms-sugs').style.display = 'none';
  const nxt = document.getElementById('mb-n1');
  if (nxt) nxt.disabled = false;
}

function regNuevo() {
  const q = document.getElementById('ms-inp')?.value.trim();
  if (!q) return;
  _modal.nombre = q;
  _modal.jugadorId = null;
  _modal.esNuevo = true;
  document.getElementById('ms-sugs').style.display = 'none';
  const nxt = document.getElementById('mb-n1');
  if (nxt) nxt.disabled = false;
}

// ── Selección de equipo ───────────────────────────────────
function selTeam(b) {
  _modal.bando = b;
  document.querySelectorAll('.mtb').forEach(el => {
    const side = el.dataset.side;
    el.className = 'mtb' + (side === b ? (b === 'rojo' ? ' sel-r' : ' sel-v') : '');
  });
  const nxt = document.getElementById('mb-n2');
  if (nxt) nxt.disabled = false;
}

// ── Selección de monto ────────────────────────────────────
function selAmt(e, a) {
  if (a === 'otro') {
    _modal.monto = null;
    document.querySelectorAll('.mab').forEach(el => el.classList.toggle('sel', el.classList.contains('otro')));
    const ow = document.getElementById('otro-wrap');
    const inp = document.getElementById('otro-inp');
    if (ow) ow.style.display = 'block';
    if (inp) { inp.value = ''; inp.focus(); }
    const nxt = document.getElementById('mb-n3');
    if (nxt) nxt.disabled = true;
    return;
  }
  _modal.monto = a;
  document.querySelectorAll('.mab').forEach(el => el.classList.remove('sel'));
  e.currentTarget.classList.add('sel');
  const ow = document.getElementById('otro-wrap');
  if (ow) ow.style.display = 'none';
  const nxt = document.getElementById('mb-n3');
  if (nxt) nxt.disabled = false;
}

function otroChange(v) {
  const raw = v.replace(/[^0-9]/g, '');
  const n = parseInt(raw, 10);
  _modal.monto = n > 0 ? n : null;
  const inp = document.getElementById('otro-inp');
  if (inp) {
    inp.value = raw ? '$' + Number(raw).toLocaleString('en-US') : '';
  }
  const nxt = document.getElementById('mb-n3');
  if (nxt) nxt.disabled = !(_modal.monto > 0);
}

// ── Confirmar y guardar apuesta ───────────────────────────
async function modalConfirm() {
  const m = _modal;
  let jId = m.jugadorId;
  let newPlayerObj = null;

  // 1. Determinar si es un apostador nuevo y preparar el objeto de inserción si es necesario
  if (!jId) {
    const exist = jugadores.find(j => j.nombre.toLowerCase() === m.nombre.toLowerCase());
    if (exist) {
      jId = exist.id;
    } else {
      const nc = COLORS[jugadores.length % COLORS.length];
      const randSuff = Math.floor(Math.random() * 900) + 100;
      const nid = m.nombre.replace(/\s+/g, '').substring(0, 2).toUpperCase() + (jugadores.length + 1) + '-' + randSuff;
      jId = nid;
      newPlayerObj = {
        id: nid,
        nombre: m.nombre,
        color: nc,
        saldo_anterior: 0.00,
        registrado_por: currentUser ? currentUser.id : null
      };
    }
  }

  // 2. CORRER VALIDACIONES ANTES DE CUALQUIER ESCRITURA EN DB

  // Bando Único
  const p = getPelea(m.peleaNum);
  const existingOtherBando = p.apuestas.find(a => a.jugadorId === jId && a.bando !== m.bando);
  if (existingOtherBando) {
    toast(`El apostador ya tiene una apuesta en el bando contrario (${existingOtherBando.bando === 'verde' ? 'Verde' : 'Rojo'}) en esta pelea.`, 'error');
    return;
  }

  // 3. EJECUTAR ESCRITURAS EN DB (VALIDACIONES PASARON)

  // A. Insertar jugador si es nuevo
  if (newPlayerObj) {
    const { error: playErr } = await sb.from('jugadores').insert(newPlayerObj);
    if (playErr) {
      toast(`⚠️ Error al registrar jugador: ${playErr.message}`, 'error');
      return;
    }
    // Guardar el ID en el estado del modal para evitar re-inserciones en re-intentos
    _modal.jugadorId = jId;
    await logAction('nuevo-jugador', `Nuevo apostador registrado: <strong>${m.nombre}</strong>`, '+');
  }

  // Validaciones finales de seguridad de Crédito antes de llamar a la DB
  if (m.tipoPago === 'credito') {
    const j = jugadores.find(x => x.id === jId);
    const estadoCandado = j ? j.estadoCandado : false;
    const creditoUtilizado = j ? j.creditoUtilizado : 0;
    const limiteCredito = j ? j.limiteCredito : 5000;

    if (estadoCandado) {
      toast('Usuario bloqueado por administración', 'error');
      return;
    }
    if (m.monto + creditoUtilizado > limiteCredito) {
      toast('Crédito excedido', 'error');
      return;
    }
  }

  // B. Registrar la apuesta usando la función P2P
  const { error } = await sb.rpc('registrar_apuesta_p2p', {
    p_pelea_num: m.peleaNum,
    p_jugador_id: jId,
    p_bando: m.bando,
    p_monto: m.monto,
    p_autorizado_por: null,
    p_tipo_pago: m.tipoPago
  });

  if (error) {
    toast(`⚠️ Error al guardar apuesta: ${error.message}`, 'error');
    return;
  }

  await logAction('apuesta',
    `<strong>${m.nombre}</strong> — Apuesta de ${fmt(m.monto)} a ${m.bando === 'verde' ? 'Verde' : 'Rojo'} · Pelea #${m.peleaNum}`,
    '$');

  closeModal();
  await refreshData();
  toast(`Apuesta guardada para <strong>${m.nombre}</strong>`, 'success');
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key.toLowerCase() === 'n') { nuevaPelea(); e.preventDefault(); }
});
