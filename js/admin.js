/* =========================================================
   ¿Salimos? — Panel de administración (/citas)
   Login propio contra la BD (funciones RPC con token). Sin Supabase Auth.
   El token se guarda en localStorage; todo el acceso a datos pasa por
   funciones SECURITY DEFINER que lo validan en el servidor.
   ========================================================= */

'use strict';

const TOKEN_KEY = 'salimos_admin_token';
let token = localStorage.getItem(TOKEN_KEY) || null;
let rows = [];
let sortKey = 'created_at';
let sortDir = 'desc';
let openId = null;   // fila de cita expandida en la tabla

const COLS = [
  { k: 'created_at', label: 'Registrada', fmt: fechaHora },
  { k: 'categoria',  label: 'Tipo', fmt: fmtCategoria },
  { k: 'fecha_cita', label: 'Cuándo', fmt: fechaHora },
  { k: 'nombre',     label: 'Nombre' },
  { k: 'plan',       label: 'Vamos a' },
  { k: 'antojo',     label: 'Me apetece' },
  { k: 'franja',     label: 'Horario' },
  { k: 'ubicacion',  label: 'Ubicación' },
  { k: 'sitio',      label: 'Sitio' },
  { k: 'nota',       label: 'Nota', fmt: fmtNota },
];

/* ---------- helpers ---------- */
function pintarIconos(raiz = document) {
  raiz.querySelectorAll('[data-icon]').forEach((el) => {
    if (el.dataset.done) return;
    el.innerHTML = window.svgIcon(el.dataset.icon, 'icon');
    el.dataset.done = '1';
  });
}
function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
function fechaHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return esc(iso);
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtNota(v) {
  if (v == null || v === '') return '<span class="badge-nota empty">— /10</span>';
  return `<span class="badge-nota">${v}/10</span>`;
}
function fmtCategoria(v) {
  if (v === 'pedida_por_mi') return '<span class="cat cat-mi">La pedí yo</span>';
  if (v === 'pedida_a_mi') return '<span class="cat cat-ellos">Me la pidieron</span>';
  return '<span class="cat cat-none">—</span>';
}
function randSlug() {
  const a = new Uint8Array(7);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => (b % 36).toString(36)).join('');
}
function requireDB() { return !!window.sb; }

/* ---------- login / sesión ---------- */
function showLogin() {
  document.getElementById('login').hidden = false;
  document.getElementById('panel').hidden = true;
  document.getElementById('fab').hidden = true;
}
function showPanel() {
  document.getElementById('login').hidden = true;
  document.getElementById('panel').hidden = false;
  document.getElementById('fab').hidden = false;
  loadCitas();
}

async function iniciarSesion(e) {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  const usuario = document.getElementById('usuario').value.trim();
  const clave = document.getElementById('clave').value;
  if (!requireDB()) { errEl.textContent = 'Supabase no configurado.'; return; }

  const { data, error } = await window.sb.rpc('login_admin', { p_usuario: usuario, p_clave: clave });
  if (error || !data) { errEl.textContent = 'Usuario o contraseña incorrectos.'; return; }
  token = data;
  localStorage.setItem(TOKEN_KEY, token);
  showPanel();
}

async function cerrarSesion() {
  try { if (token && window.sb) await window.sb.rpc('logout_admin', { p_token: token }); } catch { /* ignore */ }
  token = null;
  localStorage.removeItem(TOKEN_KEY);
  showLogin();
}

function sesionCaducada() { token = null; localStorage.removeItem(TOKEN_KEY); showLogin(); }

/* ---------- navegación ---------- */
function setView(view) {
  document.querySelectorAll('.nav-item[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('view-citas').hidden = view !== 'citas';
  document.getElementById('view-invitaciones').hidden = view !== 'invitaciones';
  if (view === 'invitaciones') loadInvites();
  if (view === 'citas') loadCitas();
}

/* ---------- CITAS ---------- */
async function loadCitas() {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '<tr><td class="empty">Cargando…</td></tr>';
  const { data, error } = await window.sb.rpc('admin_citas', { p_token: token });
  if (error) {
    if (/no_autorizado/.test(error.message || '')) { sesionCaducada(); return; }
    tbody.innerHTML = `<tr><td class="empty">Error: ${esc(error.message)}</td></tr>`;
    return;
  }
  rows = data || [];
  renderCitas();
}

function filtradas() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  let out = rows;
  if (q) {
    out = rows.filter((r) => ['nombre', 'mote', 'plan', 'antojo', 'franja', 'ubicacion', 'sitio', 'contacto', 'categoria']
      .some((k) => String(r[k] || '').toLowerCase().includes(q)));
  }
  const dir = sortDir === 'asc' ? 1 : -1;
  out = out.slice().sort((a, b) => {
    let x = a[sortKey], y = b[sortKey];
    if (sortKey === 'nota') { x = x ?? -1; y = y ?? -1; return (x - y) * dir; }
    return String(x || '').localeCompare(String(y || '')) * dir;
  });
  return out;
}

function renderCitas() {
  const thead = document.getElementById('thead');
  thead.innerHTML = '<tr>' + COLS.map((c) => {
    const arrow = c.k === sortKey ? (sortDir === 'asc' ? '▲' : '▼') : '↕';
    return `<th data-key="${c.k}">${c.label} <span class="arrow">${arrow}</span></th>`;
  }).join('') + '</tr>';
  thead.querySelectorAll('th').forEach((th) => th.addEventListener('click', () => {
    const k = th.dataset.key;
    if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortKey = k; sortDir = 'asc'; }
    renderCitas();
  }));

  const all = filtradas();
  const per = parseInt(document.getElementById('perpage').value, 10);
  const shown = per === 0 ? all : all.slice(0, per);
  document.getElementById('count').textContent =
    `Mostrando ${shown.length} de ${all.length} filtradas (${rows.length} totales)`;

  const tbody = document.getElementById('tbody');
  if (!shown.length) { tbody.innerHTML = '<tr><td class="empty" colspan="' + COLS.length + '">Sin citas todavía.</td></tr>'; return; }

  tbody.innerHTML = '';
  shown.forEach((r) => {
    const tr = document.createElement('tr');
    tr.className = 'row' + (r.id === openId ? ' open' : '');
    tr.innerHTML = COLS.map((c) => `<td>${c.fmt ? c.fmt(r[c.k]) : esc(r[c.k]) || '—'}</td>`).join('');
    tr.addEventListener('click', () => { openId = openId === r.id ? null : r.id; renderCitas(); });
    tbody.appendChild(tr);
    if (r.id === openId) tbody.appendChild(filaDetalle(r));
  });
}

function filaDetalle(r) {
  const tr = document.createElement('tr');
  tr.className = 'detail';
  const td = document.createElement('td');
  td.colSpan = COLS.length;

  const sitioLink = (r.sitio_lat && r.sitio_lon)
    ? `<a href="https://www.openstreetmap.org/?mlat=${r.sitio_lat}&mlon=${r.sitio_lon}#map=18/${r.sitio_lat}/${r.sitio_lon}" target="_blank" rel="noopener">ver en mapa</a>`
    : '—';
  let area = '—';
  if (r.area_radio) area = `Círculo · radio ${r.area_radio} m`;
  else if (r.area_bbox) area = `Rectángulo · ${r.area_bbox}`;

  const notaOpts = ['<option value="">— sin nota —</option>']
    .concat(Array.from({ length: 11 }, (_, i) => `<option value="${i}" ${r.nota === i ? 'selected' : ''}>${i}/10</option>`))
    .join('');

  td.innerHTML = `
    <div class="editor">
      <div><div class="lbl">Categoría</div><div class="val">${fmtCategoria(r.categoria)}</div></div>
      <div><div class="lbl">Contacto</div><div class="val">${esc(r.contacto) || '<span style="color:var(--muted)">— (solo landing)</span>'}</div></div>
      <div><div class="lbl">Cuándo (cita)</div><div class="val">${r.fecha_cita ? fechaHora(r.fecha_cita) : '—'}</div></div>
      <div><div class="lbl">Salimos</div><div class="val">${esc(r.salimos) || '—'}</div></div>
      <div><div class="lbl">Plan</div><div class="val">${esc(r.plan) || '—'} · ${esc(r.antojo) || '—'}</div></div>
      <div><div class="lbl">Sitio</div><div class="val">${esc(r.sitio) || '—'} &nbsp; ${sitioLink}</div></div>
      <div><div class="lbl">Área marcada</div><div class="val">${esc(area)}</div></div>
      <div>
        <div class="lbl">Nota de la cita</div>
        <select id="ed-nota">${notaOpts}</select>
      </div>
      <div class="full">
        <div class="lbl">Notas del admin</div>
        <textarea id="ed-notas" placeholder="Qué tal fue, anécdotas, si repetiríamos…">${esc(r.notas_admin) || ''}</textarea>
      </div>
      <div class="editor-actions">
        <button class="btn-save" id="ed-save"><span data-icon="save"></span> Guardar</button>
        <button class="btn-del" id="ed-del"><span data-icon="trash"></span> Borrar</button>
        <span class="save-msg" id="ed-msg"></span>
      </div>
    </div>`;
  tr.appendChild(td);

  pintarIconos(td);
  td.querySelector('#ed-save').addEventListener('click', (e) => { e.stopPropagation(); guardarCita(r.id, td); });
  td.querySelector('#ed-del').addEventListener('click', (e) => { e.stopPropagation(); borrarCita(r.id); });
  td.querySelector('.editor').addEventListener('click', (e) => e.stopPropagation());
  return tr;
}

async function guardarCita(id, td) {
  const msg = td.querySelector('#ed-msg');
  const notaVal = td.querySelector('#ed-nota').value;
  const p_nota = notaVal === '' ? null : parseInt(notaVal, 10);
  const p_notas = td.querySelector('#ed-notas').value || null;
  const { error } = await window.sb.rpc('admin_actualizar_cita', { p_token: token, p_id: id, p_nota, p_notas });
  if (error) {
    if (/no_autorizado/.test(error.message || '')) { sesionCaducada(); return; }
    msg.style.color = '#ef4444'; msg.textContent = 'Error al guardar.'; return;
  }
  const row = rows.find((r) => r.id === id);
  if (row) { row.nota = p_nota; row.notas_admin = p_notas; }
  msg.style.color = ''; msg.textContent = 'Guardado ✓';
  setTimeout(() => renderCitas(), 500);
}

async function borrarCita(id) {
  if (!confirm('¿Borrar esta cita del registro? No se puede deshacer.')) return;
  const { error } = await window.sb.rpc('admin_borrar_cita', { p_token: token, p_id: id });
  if (error) {
    if (/no_autorizado/.test(error.message || '')) { sesionCaducada(); return; }
    alert('No se pudo borrar: ' + error.message); return;
  }
  rows = rows.filter((r) => r.id !== id);
  openId = null;
  renderCitas();
}

/* ---------- INVITACIONES ---------- */
function urlInvitacion(slug) { return new URL('../?i=' + slug, location.href).href; }

async function loadInvites() {
  const cont = document.getElementById('invite-list');
  cont.innerHTML = '<p class="empty">Cargando…</p>';
  const { data, error } = await window.sb.rpc('admin_invitaciones', { p_token: token });
  if (error) {
    if (/no_autorizado/.test(error.message || '')) { sesionCaducada(); return; }
    cont.innerHTML = `<p class="empty">Error: ${esc(error.message)}</p>`; return;
  }
  if (!data || !data.length) { cont.innerHTML = '<p class="empty">Aún no hay invitaciones. Crea una con el clip 📎</p>'; return; }
  cont.innerHTML = '';
  data.forEach((inv) => {
    const url = urlInvitacion(inv.slug);
    const div = document.createElement('div');
    div.className = 'invite';
    div.innerHTML =
      `<div class="invite-head">` +
        `<div class="invite-who"><h4>${esc(inv.nombre)}</h4><div class="mote">${esc(inv.mote) || 'sin mote'}</div></div>` +
        `<button class="icon-btn del-btn" title="Borrar invitación">${window.svgIcon('trash', 'icon')}</button>` +
      `</div>` +
      `<div class="url"><input type="text" readonly value="${esc(url)}" /><button class="icon-btn copy-btn" title="Copiar">${window.svgIcon('copy', 'icon')}</button></div>`;
    div.querySelector('.copy-btn').addEventListener('click', () => copiar(url, div.querySelector('.copy-btn')));
    div.querySelector('.del-btn').addEventListener('click', () => borrarInvitacion(inv.id, inv.nombre));
    cont.appendChild(div);
  });
}

async function borrarInvitacion(id, nombre) {
  if (!confirm(`¿Borrar la invitación de ${nombre}? El enlace dejará de funcionar. Las citas ya registradas se conservan.`)) return;
  const { error } = await window.sb.rpc('admin_borrar_invitacion', { p_token: token, p_id: id });
  if (error) {
    if (/no_autorizado/.test(error.message || '')) { sesionCaducada(); return; }
    alert('No se pudo borrar: ' + error.message); return;
  }
  loadInvites();
}

async function crearInvitacion(e) {
  e.preventDefault();
  const nombre = document.getElementById('inv-nombre').value.trim();
  const mote = document.getElementById('inv-mote').value.trim();
  if (!nombre) return;
  const slug = randSlug();
  const { error } = await window.sb.rpc('admin_crear_invitacion', { p_token: token, p_slug: slug, p_nombre: nombre, p_mote: mote });
  if (error) {
    if (/no_autorizado/.test(error.message || '')) { sesionCaducada(); return; }
    alert('No se pudo crear: ' + error.message); return;
  }
  const url = urlInvitacion(slug);
  document.getElementById('invite-url').value = url;
  document.getElementById('invite-result').hidden = false;
  if (!document.getElementById('view-invitaciones').hidden) loadInvites();
}

async function copiar(text, btn) {
  try { await navigator.clipboard.writeText(text); } catch { /* silencioso */ }
  if (btn) { const old = btn.innerHTML; btn.innerHTML = window.svgIcon('check', 'icon'); setTimeout(() => (btn.innerHTML = old), 1200); }
}

/* ---------- modal ---------- */
function abrirModal() {
  document.getElementById('invite-form').reset();
  document.getElementById('invite-result').hidden = true;
  document.getElementById('modal').hidden = false;
}
function cerrarModal() { document.getElementById('modal').hidden = true; }

/* ---------- arranque ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  pintarIconos();

  document.getElementById('login-form').addEventListener('submit', iniciarSesion);
  document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
  document.querySelectorAll('.nav-item[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  document.getElementById('btn-refresh').addEventListener('click', loadCitas);
  document.getElementById('q').addEventListener('input', renderCitas);
  document.getElementById('perpage').addEventListener('change', renderCitas);

  document.getElementById('fab').addEventListener('click', abrirModal);
  document.getElementById('btn-new-invite').addEventListener('click', abrirModal);
  document.getElementById('modal-close').addEventListener('click', cerrarModal);
  document.getElementById('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') cerrarModal(); });
  document.getElementById('invite-form').addEventListener('submit', crearInvitacion);
  document.getElementById('copy-url').addEventListener('click', () => copiar(document.getElementById('invite-url').value, document.getElementById('copy-url')));

  // ¿Token guardado y válido?
  if (token && window.sb) {
    const { error } = await window.sb.rpc('admin_citas', { p_token: token });
    if (!error) { showPanel(); return; }
  }
  showLogin();
});

/* ---------- PWA (instalable, pantalla completa) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
