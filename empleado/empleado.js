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
  const u = currentUser || { nombre: 'Empleado', rol: 'empleado' };
  document.getElementById('nav-av').textContent = initials(u.nombre);
  document.getElementById('nav-un').textContent = u.nombre;
  document.getElementById('tb-av').textContent  = initials(u.nombre);
  document.getElementById('tb-un').textContent  = u.nombre;

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

  if (tab === 'peleas') renderPeleas();
}

let peleaFilter = 'todas';
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
    sc.innerHTML = `<div style="text-align:center;color:var(--text3);padding:36px;font-size:13px;">${
      searchPeleaQuery ? 'No se encontraron peleas con ese número.' :
      peleaFilter === 'todas' ? 'No hay peleas registradas. Crea la primera con <strong style="color:var(--gold);">Crear pelea</strong>' :
      peleaFilter === 'activa' ? 'No hay peleas en juego.' :
      peleaFilter === 'espera' ? 'No hay peleas abiertas.' :
      'No hay peleas cerradas.'
    }</div>`;
    return;
  }
  lista.forEach((p, i) => {
    const el = buildPB(p);
    el.style.setProperty('--i', i);
    sc.appendChild(el);
  });
  // Scroll al tope para ver la pelea más reciente
  sc.scrollTop = 0;
}

function renderToolbar() {
  const tb   = document.getElementById('peleas-toolbar');
  const totalPeleas = peleas.length;
  const activas = peleas.filter(p => p.estado === 'activa').length;
  const espera  = peleas.filter(p => p.estado === 'espera').length;
  const cerradas = peleas.filter(p => p.estado === 'cerrada').length;
  const filtros = [
    { id: 'todas',  label: `Pelea`,  count: totalPeleas },
    { id: 'activa', label: 'En juego', count: activas },
    { id: 'espera', label: 'Abiertas',  count: espera },
    { id: 'cerrada',label: 'Cerradas',count: cerradas },
  ];
  tb.innerHTML = `
    <div class="p-num-big">${I.eye} Pelea</div>
    <span style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace;font-weight:600;">${totalPeleas} peleas · #${peleaActual}</span>
    <div class="ctrl-sep"></div>
    <div class="search-box p-search">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="number" id="pelea-search-inp" placeholder="Buscar #" value="${searchPeleaQuery || ''}" oninput="searchPelea(this.value)">
    </div>
    <div class="pf-row">
      ${filtros.map(f => `
        <button class="pf-btn${peleaFilter === f.id ? ' active' : ''}"
                onclick="setPeleaFilter('${f.id}')">
          <span class="pf-lbl">${f.label}</span>
          <span class="pf-cnt">${f.count}</span>
        </button>`).join('')}
    </div>
    <div class="estado-group">
      <button class="btn-estado" onclick="expandirTodas()" title="Expandir todas las peleas">
        ${I.eye} <span class="etxt">Exp. todo</span>
      </button>
      <button class="btn-estado" onclick="colapsarTodas()" title="Colapsar todas las peleas">
        ${I.eyeOff} <span class="etxt">Col. todo</span>
      </button>
    </div>
    <div class="ctrl-sep"></div>
    <button class="bc-n" onclick="nuevaPelea()">${I.plus} Crear pelea</button>`;
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
  if (p.minimizada === undefined) p.minimizada = p.estado === 'cerrada';

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

  const isEspera  = p.estado === 'espera';
  const isActiva  = p.estado === 'activa';
  const isCerrada = p.estado === 'cerrada';

  // Estado inline con SVG
  const stateCtrl = `
    <div class="pb-state-group">
      <button class="pb-st${isEspera ? ' active-e' : ''}"
              onclick="event.stopPropagation();cambiarEstadoPelea(${p.num},'espera')"
              title="En espera">${I.pause}</button>
      <button class="pb-st${isActiva ? ' active-a' : ''}"
              onclick="event.stopPropagation();cambiarEstadoPelea(${p.num},'activa')"
              title="Activa">${I.play}</button>
      <button class="pb-st${isCerrada ? ' active-c' : ''}"
              onclick="event.stopPropagation();cambiarEstadoPelea(${p.num},'cerrada')"
              title="Cerrada">${I.stop}</button>
    </div>`;

  // Sección de ganador
  let winnerSection;
  if (isCerrada) {
    if (p.ganador === 'empate') {
      winnerSection = `<span class="pb-winner" style="color:var(--gold2);">${I.trophy} Empate</span>`;
    } else if (p.ganador === 'anulada') {
      winnerSection = `<span class="pb-winner" style="color:var(--text3);">${I.x} Anulada</span>`;
    } else if (p.ganador) {
      winnerSection = `<span class="pb-winner ${p.ganador === 'verde' ? 'v' : 'r'}">${I.trophy} Ganó <strong>${p.ganador === 'verde' ? 'Verde' : 'Rojo'}</strong></span>`;
    } else {
      winnerSection = `<span class="pb-winner" style="opacity:.4;">Sin resultado</span>`;
    }
  } else {
    winnerSection = `
      <button class="pb-btn-win wv" onclick="event.stopPropagation();ganarPelea(${p.num},'verde')">
        ${I.trophy} Verde
      </button>
      <button class="pb-btn-win wr" onclick="event.stopPropagation();ganarPelea(${p.num},'rojo')">
        ${I.trophy} Rojo
      </button>
      <button class="pb-btn-win" style="border-color:var(--gold-bdr);color:var(--gold2);background:rgba(201,168,76,.06);" onclick="event.stopPropagation();ganarPelea(${p.num},'empate')">
        ${I.trophy} Empate
      </button>
      <button class="pb-btn-win" style="border-color:var(--border3);color:var(--text3);background:rgba(255,255,255,.04);" onclick="event.stopPropagation();ganarPelea(${p.num},'anulada')">
        ${I.x} Anular
      </button>`;
  }

  // Botón eliminar
  const delBtn = `
      <button class="pb-del-btn" onclick="event.stopPropagation();confirmEliminarPelea(${p.num})" title="Eliminar pelea">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      </svg>
    </button>`;

  // Botón + rápido en head (siempre visible)
  const quickAddBtn = !isCerrada
    ? `<button class="pb-quick-add" onclick="event.stopPropagation();openModalAp(${p.num})" title="Registrar apuesta">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>`
    : '';

  const buildRows = lista => lista.length
    ? lista.map(a => {
        const cls = a.resultado === 'ganada' ? ' gr' : a.resultado === 'perdida' ? ' pr' : '';
        const mc  = a.resultado === 'ganada' ? ' g'  : a.resultado === 'perdida' ? ' p'  : '';
        return `<div class="ap-row${cls}">
          <span class="ap-name">${sanitize(a.nombre)}</span>
          <span class="ap-monto${mc}">${fmt(a.monto)}</span>
          <button class="ap-del" onclick="elimDePelea(${p.num},'${a.id}')">${I.x}</button>
        </div>`;
      }).join('')
    : '<div class="ap-empty">Sin apuestas</div>';

  const addBtn = !isCerrada
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
  div.className = p.estado === 'activa' ? 'pb active-pelea-card' : 'pb';
  div.id = `bloque-${p.num}`;
  div.innerHTML = `
    <div class="pb-head" onclick="toggleMin(${p.num})">
      <div class="pb-head-l">
        <span class="pb-num">#${p.num}</span>
        <span class="status-pill ${pCls}">${pTxt}</span>
        <span class="pb-total">${fmt(total)} <span style="font-size:9px;color:var(--text3);font-weight:700;">VOL</span></span>
      </div>
      <div class="pb-head-r">
        ${quickAddBtn}
        ${stateCtrl}
        ${delBtn}
        <span class="pb-chev">${chevron}</span>
      </div>
    </div>
    ${winnerSection ? `<div class="pb-actions">${winnerSection}</div>` : ''}
    ${p.minimizada ? '' : `
      ${bar}
      <div class="p-cols">
        <div class="col-r">
          <div class="col-hdr r"><span class="col-dot"></span> Rojo <span class="col-pct">${pctR}%</span></div>
          ${buildRows(rojos)}
        </div>
        <div>
          <div class="col-hdr v"><span class="col-dot"></span> Verde <span class="col-pct">${pctV}%</span></div>
          ${buildRows(verdes)}
        </div>
      </div>
      ${addBtn}
      <div class="pb-reparte">
        <div class="pb-rep-cell">
          <span class="pb-rep-lbl">Pago Rojo</span>
          <span class="pb-rep-arrow">→</span>
          <span class="pb-rep-val" style="color:var(--rojo2);">${fmt(tV * 0.9)}</span>
        </div>
        <div class="pb-rep-cell">
          <span class="pb-rep-lbl">Pago Verde</span>
          <span class="pb-rep-arrow">→</span>
          <span class="pb-rep-val" style="color:var(--green2);">${fmt(tR * 0.9)}</span>
        </div>
      </div>`}`;
  return div;
}

async function elimDePelea(pN, apId) {
  const p  = getPelea(pN);
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

    if (ganador === 'empate' || ganador === 'anulada') {
      // Devolver apuestas
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
}

async function cambiarEstadoPelea(pN, nuevoEstado) {
  const p = getPelea(pN);
  if (!p || p.estado === nuevoEstado) return;

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

    const { data: peleaDb } = await sb.from('peleas').select('id').eq('numero_pelea', pN).single();
    if (peleaDb) {
      await sb.from('peleas').update({ estado: nuevoEstado }).eq('id', peleaDb.id);
    }
  }

  const labels = { espera: 'En espera', activa: 'Activa', cerrada: 'Cerrada' };
  await logAction('estado', `Pelea #${pN} → <strong>${labels[nuevoEstado]}</strong>`, '•');

  if (pN === peleaActual) estadoPelea = nuevoEstado;

  await refreshData();
  toast(`<strong>P#${pN}</strong> ${labels[nuevoEstado]}`, 'success');
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

  peleaFilter = 'todas';
  await logAction('nueva-pelea', `Nueva pelea #${nextNum} creada`, '+');
  await refreshData();
  toast(`<strong>Pelea #${nextNum}</strong> creada`);
}

// ── MODAL APOSTADOR ───────────────────────────────────────
let _modal = {
  step: 1, peleaNum: null,
  nombre: '', jugadorId: null, esNuevo: false,
  bando: null, monto: null
};

function openModalAp(pN) {
  _modal = { step: 1, peleaNum: pN, nombre: '', jugadorId: null, esNuevo: false, bando: null, monto: null };
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
  const m      = _modal;
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
    const amts   = [500, 1000, 1500, 2000];
    const esOtro = m.monto && !amts.includes(m.monto);
    body.innerHTML = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px;font-weight:600;">
        👤 <strong style="color:var(--text);">${m.nombre}</strong> ·
        <span style="color:${m.bando === 'verde' ? 'var(--green2)' : 'var(--rojo2)'};">
          ${m.bando === 'verde' ? 'Verde' : 'Rojo'}
        </span>
      </div>
      <div style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px;">Monto de apuesta</div>
      <div class="modal-amt-grid">
        ${amts.map(a => `<button class="mab${m.monto === a ? ' sel' : ''}" onclick="selAmt(${a})">${fmt(a)}</button>`).join('')}
        <button class="mab otro${esOtro ? ' sel' : ''}" onclick="selAmt('otro')">Monto personalizado</button>
      </div>
      <div id="otro-wrap" style="display:${esOtro ? 'block' : 'none'};">
        <input class="modal-otro-inp" id="otro-inp"
               type="number" inputmode="numeric" pattern="[0-9]*"
               placeholder="0"
               value="${esOtro ? m.monto : ''}"
               oninput="otroChange(this.value)">
      </div>`;
    foot.innerHTML = `
      <button class="mbtn ghost" onclick="goBack()">← Atrás</button>
      <button class="mbtn primary" id="mb-n3" onclick="modalNext3()" ${(m.monto && m.monto > 0) ? '' : 'disabled'}>Revisar →</button>`;
  }

  // ── PASO 4: Confirmar ────────────────────────────────────
  else if (m.step === 4) {
    const j         = jugadores.find(x => x.id === m.jugadorId);
    const saldoMonto = j ? calcFicha(j).saldo : 0;
    const nextSaldo = saldoMonto - m.monto;
    const isOverLimit = j && (nextSaldo < -appConfig.limite_credito);
    const isSaldoNeg  = !isOverLimit && j && (saldoMonto < 0);

    let alertH = '';
    if (m.esNuevo) {
      alertH = `<div class="modal-alert new">
           <span class="modal-alert-ico">✨</span>
           <div class="modal-alert-txt"><strong>Persona nueva</strong> — Se registrará en el sistema automáticamente.</div>
         </div>`;
    } else if (isOverLimit) {
      alertH = `<div class="modal-alert warn" style="background:rgba(231,76,60,.16); border-color:rgba(231,76,60,.4);">
           <span class="modal-alert-ico" style="color:var(--rojo2);">⚠️</span>
           <div class="modal-alert-txt" style="color:var(--text);">
             <strong>¡LÍMITE DE CRÉDITO EXCEDIDO!</strong><br>
             El saldo actual de <strong>${m.nombre}</strong> es <strong>${fmt(saldoMonto)}</strong>. 
             Esta apuesta excede el límite permitido de <strong>${fmt(appConfig.limite_credito)}</strong> (quedaría en ${fmt(nextSaldo)}).<br>
             Se requiere el PIN del supervisor para autorizar.
           </div>
         </div>`;
    } else if (isSaldoNeg) {
      alertH = `<div class="modal-alert warn">
              <span class="modal-alert-ico">!</span>
             <div class="modal-alert-txt">
               <strong>${m.nombre}</strong> tiene saldo negativo de <strong>${fmt(Math.abs(saldoMonto))}</strong>.
               Tu usuario quedará registrado como quien autorizó esta apuesta.
             </div>
           </div>`;
    }

    let pinInput = '';
    if (isOverLimit) {
      pinInput = `
        <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size:9px; font-weight:700; text-transform:uppercase; color:var(--rojo2); font-family:'JetBrains Mono',monospace;">PIN de Autorización del Supervisor</label>
          <input type="password" id="modal-pin-auth" class="modal-otro-inp" style="border-color:rgba(231,76,60,.4); margin-top:0; padding:10px; font-size:16px;" placeholder="PIN de 4 dígitos">
        </div>
      `;
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
      </div>
      ${pinInput}`;

    foot.innerHTML = `
      <button class="mbtn ghost" onclick="goBack()">Editar</button>
      <button class="${(isSaldoNeg || isOverLimit) ? 'mbtn danger' : 'mbtn primary'}" onclick="modalConfirm()">
        ${(isSaldoNeg || isOverLimit) ? 'Confirmar' : 'Aceptar'}
      </button>`;
  }
}

// ── Funciones de navegación del modal ────────────────────
function goBack() { _modal.step--; renderModalStep(); }

function modalNext1() {
  const q = (document.getElementById('ms-inp')?.value || '').trim();
  if (!q) return;
  _modal.nombre = q;
  if (!_modal.jugadorId && !_modal.esNuevo) {
    const exact = jugadores.find(j => j.nombre.toLowerCase() === q.toLowerCase());
    if (exact) { _modal.jugadorId = exact.id; _modal.esNuevo = false; }
    else          _modal.esNuevo = true;
  }
  _modal.step = 2;
  renderModalStep();
}

function modalNext2() {
  if (!_modal.bando) return;
  _modal.step = 3;
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
  _modal.nombre    = q;
  _modal.jugadorId = null;
  _modal.esNuevo   = false;
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
        <div class="modal-sug-name">${sanitize(j.nombre)}</div>
        <div class="modal-sug-bal" style="color:${sc};">${saldo >= 0 ? '+' : '−'}${fmt(saldo)} · ${j.apuestas.length} apuestas${record ? ' · ' + record : ''}</div>
      </div>
    </div>`;
  }).join('');

  // Opción "registrar como nuevo" si no existe exacto
  if (!jugadores.find(j => j.nombre.toLowerCase() === q.toLowerCase())) {
    html += `<div class="modal-sug-new" onclick="regNuevo()">✨ Registrar "<strong>${q}</strong>" como nuevo</div>`;
  }

  sug.innerHTML     = html;
  sug.style.display = html ? 'block' : 'none';
}

function msKeydown(e) {
  if (e.key !== 'Enter') return;
  const q = document.getElementById('ms-inp')?.value.trim();
  if (!q) return;
  const exact = jugadores.find(j => j.nombre.toLowerCase() === q.toLowerCase());
  if (exact) selSug(exact.id);
  else        regNuevo();
}

function selSug(jId) {
  const j = jugadores.find(x => x.id === jId);
  if (!j) return;
  _modal.nombre    = j.nombre;
  _modal.jugadorId = jId;
  _modal.esNuevo   = false;
  document.getElementById('ms-inp').value   = j.nombre;
  document.getElementById('ms-sugs').style.display = 'none';
  const nxt = document.getElementById('mb-n1');
  if (nxt) nxt.disabled = false;
}

function regNuevo() {
  const q = document.getElementById('ms-inp')?.value.trim();
  if (!q) return;
  _modal.nombre    = q;
  _modal.jugadorId = null;
  _modal.esNuevo   = true;
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
function selAmt(a) {
  if (a === 'otro') {
    _modal.monto = null;
    document.querySelectorAll('.mab').forEach(el => el.classList.toggle('sel', el.classList.contains('otro')));
    const ow  = document.getElementById('otro-wrap');
    const inp = document.getElementById('otro-inp');
    if (ow)  ow.style.display = 'block';
    if (inp) { inp.focus(); inp.select(); }
    const nxt = document.getElementById('mb-n3');
    if (nxt) nxt.disabled = true;
    return;
  }
  _modal.monto = a;
  document.querySelectorAll('.mab').forEach(el => el.classList.remove('sel'));
  event.currentTarget.classList.add('sel');
  const ow = document.getElementById('otro-wrap');
  if (ow) ow.style.display = 'none';
  const nxt = document.getElementById('mb-n3');
  if (nxt) nxt.disabled = false;
}

function otroChange(v) {
  const n   = parseFloat(v);
  _modal.monto = n > 0 ? n : null;
  const nxt = document.getElementById('mb-n3');
  if (nxt) nxt.disabled = !(_modal.monto > 0);
}

// ── Confirmar y guardar apuesta ───────────────────────────
async function modalConfirm() {
  const m   = _modal;
  let jId   = m.jugadorId;

  // Si es nuevo, registrarlo en el sistema
  if (!jId) {
    const exist = jugadores.find(j => j.nombre.toLowerCase() === m.nombre.toLowerCase());
    if (exist) {
      jId = exist.id;
    } else {
      const nc  = COLORS[jugadores.length % COLORS.length];
      const randSuff = Math.floor(Math.random() * 900) + 100;
      const nid = m.nombre.replace(/\s+/g,'').substring(0,2).toUpperCase() + (jugadores.length + 1) + '-' + randSuff;

      const { error } = await sb.from('jugadores').insert({
        id: nid,
        nombre: m.nombre,
        color: nc,
        saldo_anterior: 0.00,
        registrado_por: currentUser ? currentUser.id : null
      });
      if (error) {
        toast(`⚠️ Error al registrar jugador: ${error.message}`, 'error');
        return;
      }

      jId = nid;
      await logAction('nuevo-jugador', `Nuevo apostador registrado: <strong>${m.nombre}</strong>`, '+');
    }
  }

  const j         = jugadores.find(x => x.id === jId);
  const prevSaldo = j ? calcFicha(j).saldo : 0;
  const nextSaldo = prevSaldo - m.monto;
  const isOverLimit = j && (nextSaldo < -appConfig.limite_credito);
  const isSaldoNeg = !isOverLimit && j && (prevSaldo < 0);

  // Validar PIN de supervisor si excede límite de crédito
  if (isOverLimit) {
    const pinVal = document.getElementById('modal-pin-auth')?.value;
    if (!pinVal) {
      toast('PIN de supervisor requerido para exceder el límite de crédito.', 'error');
      return;
    }
    if (pinVal !== appConfig.pin_autorizacion) {
      toast('PIN de supervisor incorrecto.', 'error');
      return;
    }
  }

  // Crear apuesta
  const id = Date.now().toString();

  const { data: peleaDb } = await sb.from('peleas').select('id').eq('numero_pelea', m.peleaNum).single();
  if (!peleaDb) {
    toast(`Pelea #${m.peleaNum} no encontrada.`, 'error');
    return;
  }

  const { error } = await sb.from('apuestas').insert({
    pelea_id: peleaDb.id,
    jugador_id: jId,
    bando: m.bando,
    monto: m.monto,
    resultado: 'pendiente',
    autorizado_por: (isSaldoNeg || isOverLimit) && currentUser ? currentUser.id : null
  });

  if (error) {
    toast(`⚠️ Error al guardar apuesta: ${error.message}`, 'error');
    return;
  }

  // Log saldo negativo u overlimit
  if (isOverLimit) {
    await logAction('saldo-negativo',
      `⚠️ ¡LÍMITE EXCEDIDO! Apuesta de ${fmt(m.monto)} excede el límite de crédito (${fmt(appConfig.limite_credito)}) — <strong>${j ? j.nombre : m.nombre}</strong> (Saldo: ${fmt(prevSaldo)}) · Autorizado por PIN de Supervisor · ${nowStr()}`,
      '!');
  } else if (isSaldoNeg) {
    await logAction('saldo-negativo',
      `Apuesta autorizada con saldo negativo (${fmt(Math.abs(prevSaldo))}) — <strong>${j ? j.nombre : m.nombre}</strong> · Autorizado por <strong>${currentUser.nombre}</strong> · ${nowStr()}`,
      '!');
  }

  await logAction(    'apuesta',
    `<strong>${j ? j.nombre : m.nombre}</strong> — ${fmt(m.monto)} ${m.bando === 'verde' ? 'Verde' : 'Rojo'} · Pelea #${m.peleaNum}`,
    '$');

  closeModal();
  await refreshData();
  toast(`<strong>${j ? j.nombre : m.nombre}</strong> — ${fmt(m.monto)} ${m.bando === 'verde' ? 'Verde' : 'Rojo'} · M${m.peleaNum}`, 'success');
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key.toLowerCase() === 'n') { nuevaPelea(); e.preventDefault(); }
});









