/* =========================================================
   ¿Salimos?  —  lógica del formulario
   - Cara pública = broma. La app real solo aparece con enlace de invitación
     (?i=slug), que además saluda por el nombre.
   - Ubicación SIEMPRE opcional: mapa con buscador y área dibujable.
   - Las respuestas se guardan en Supabase (RLS: insertar público,
     leer/editar solo el admin).
   ========================================================= */

'use strict';

const cita = {
  invitacionId: null,
  nombre: '',
  mote: '',
  meal: null,
  slot: null,
  cuisine: null,
  center: null,          // {lat, lon} centro para buscar/ordenar (solo memoria)
  area: null,            // {type:'circle',lat,lon,radio} | {type:'rect',bbox}
  ubicacionLabel: '',    // etiqueta de zona/ciudad (opcional)
};

/* ---------- Catálogo de cocinas ---------- */
const FOOD = 'restaurant|fast_food';
const COCINAS_COMIDA = [
  { id: 'ramen',   label: 'Ramen',       osm: { amenity: FOOD, cuisine: 'ramen|noodle|japanese' } },
  { id: 'sushi',   label: 'Sushi',       osm: { amenity: FOOD, cuisine: 'sushi|japanese' } },
  { id: 'burger',  label: 'Hamburguesa', osm: { amenity: FOOD, cuisine: 'burger|american' } },
  { id: 'pizza',   label: 'Pizza',       osm: { amenity: FOOD, cuisine: 'pizza|italian' } },
  { id: 'tapas',   label: 'Tapas',       osm: { amenity: FOOD, cuisine: 'tapas|spanish|regional' } },
  { id: 'mexican', label: 'Mexicano',    osm: { amenity: FOOD, cuisine: 'mexican' } },
  { id: 'kebab',   label: 'Kebab',       osm: { amenity: FOOD, cuisine: 'kebab|turkish' } },
  { id: 'italian', label: 'Italiano',    osm: { amenity: FOOD, cuisine: 'italian' } },
];
const COCINAS_DESAYUNO = [
  { id: 'cafe',    label: 'Café y tostada', osm: { amenity: 'cafe' } },
  { id: 'churros', label: 'Churros',        osm: { amenity: FOOD, cuisine: 'churro|spanish' } },
  { id: 'bakery',  label: 'Bollería',       osm: { shop: 'bakery|pastry' } },
  { id: 'brunch',  label: 'Brunch',         osm: { amenity: 'cafe|restaurant', cuisine: 'breakfast|brunch|american' } },
];
const PLANES_PASEO = [
  { id: 'parque',  label: 'Un parque',       osm: { leisure: 'park' } },
  { id: 'mirador', label: 'Un mirador',      osm: { tourism: 'viewpoint' } },
  { id: 'playa',   label: 'La playa',        osm: { natural: 'beach' } },
  { id: 'casco',   label: 'Sitio con encanto', osm: { tourism: 'attraction' } },
];
const PLANES_COPA = [
  { id: 'bar',     label: 'Un bar',       osm: { amenity: 'bar|pub' } },
  { id: 'coctel',  label: 'Cócteles',     osm: { amenity: 'bar', cuisine: 'cocktail' } },
  { id: 'vino',    label: 'Vinos',        osm: { amenity: 'bar|pub', drink: 'wine' } },
  { id: 'terraza', label: 'Terraza café', osm: { amenity: 'cafe|bar' } },
];
const MEALS = [
  { id: 'desayunar', label: 'Desayunar', kind: 'food', slot: { name: 'Desayuno', start: '09:00', end: '11:00' }, cocinas: COCINAS_DESAYUNO, guasa: 'Madrugar por amor. Muy top.' },
  { id: 'comer',     label: 'Comer',     kind: 'food', slot: { name: 'Comida',   start: '13:30', end: '15:00' }, cocinas: COCINAS_COMIDA,   guasa: 'Plan seguro: nadie discute con hambre.' },
  { id: 'cenar',     label: 'Cenar',     kind: 'food', slot: { name: 'Cena',     start: '21:00', end: '22:30' }, cocinas: COCINAS_COMIDA,   guasa: 'A la luz de las farolas. Un clásico.' },
  { id: 'pasear',    label: 'Pasear',    kind: 'walk', slot: null,                                              cocinas: PLANES_PASEO,     guasa: 'Gasto cero, encanto máximo.' },
  { id: 'tomar',     label: 'Tomar algo', kind: 'drink', slot: null,                                            cocinas: PLANES_COPA,      guasa: 'Una y ya veremos. (Nunca es una.)' },
];

/* ========================= UI base ========================= */
function pintarIconos(raiz = document) {
  raiz.querySelectorAll('[data-icon]').forEach((el) => {
    if (el.dataset.done) return;
    el.innerHTML = window.svgIcon(el.dataset.icon, 'icon');
    el.dataset.done = '1';
  });
}
function goTo(id) {
  const current = document.querySelector('.screen.is-active');
  const next = document.getElementById(id);
  if (!next || current === next) return;
  if (current) {
    current.classList.remove('is-active');
    current.classList.add('is-leaving');
    setTimeout(() => current.classList.remove('is-leaving'), 550);
  }
  requestAnimationFrame(() => next.classList.add('is-active'));
}
function escapar(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

/* ========================= Invitación / broma ========================= */
async function resolverInvitacion() {
  const slug = new URLSearchParams(location.search).get('i');
  if (!slug) return false;
  if (!window.sb) return false;
  try {
    const { data, error } = await window.sb.rpc('obtener_invitacion', { p_slug: slug });
    if (error || !data || !data.length) return false;
    const inv = data[0];
    cita.invitacionId = inv.id;
    cita.nombre = inv.nombre || '';
    cita.mote = inv.mote || '';
    return true;
  } catch { return false; }
}

function revelarApp() {
  const nombre = cita.nombre ? escapar(cita.nombre) : '';
  document.getElementById('salimos-eyebrow').textContent =
    nombre ? `Oye ${cita.nombre}, una pregunta rapidísima` : 'una pregunta rapidísima';
  goTo('screen-salimos');
}

function setupBroma() {
  const hint = document.getElementById('broma-hint');
  const chistes = [
    '* Demo no disponible. El becario se fue a comer.',
    '* Estamos en ronda semilla. La ronda es de croquetas.',
    '* Certificación ISO-9001 en proceso (desde 1998).',
    '* Si tienes un enlace personal, ábrelo. Si no, disfruta del PowerPoint.',
  ];
  let i = 0;
  const btn = document.getElementById('btn-demo');
  if (btn) btn.addEventListener('click', () => { i = (i + 1) % chistes.length; hint.textContent = chistes[i]; });
}

/* ========================= Pantalla 1 — "No" que huye ========================= */
const LABELS_NO = ['No', '¿Seguro?', 'Piénsalo', 'Nop', 'Casi', 'Ni de broma', 'Insiste', 'Que no 😅'];
let noHits = 0, roaming = false;

function setupHuida() {
  const btnNo = document.getElementById('btn-no');
  const btnSi = document.getElementById('btn-si');
  const UMBRAL = 120;

  function fijar() {
    if (roaming) return;
    const r = btnNo.getBoundingClientRect();
    btnNo.style.position = 'fixed';
    btnNo.style.margin = '0';
    btnNo.style.left = r.left + 'px';
    btnNo.style.top = r.top + 'px';
    roaming = true;
  }
  function saltar(px, py) {
    fijar();
    const w = btnNo.offsetWidth, h = btnNo.offsetHeight, pad = 14;
    const maxX = window.innerWidth - w - pad, maxY = window.innerHeight - h - pad;
    const cx = btnNo.getBoundingClientRect().left + w / 2;
    const cy = btnNo.getBoundingClientRect().top + h / 2;
    let dx = cx - px, dy = cy - py, dist = Math.hypot(dx, dy) || 1;
    let nx = cx + (dx / dist) * 190 - w / 2, ny = cy + (dy / dist) * 190 - h / 2;
    nx = Math.max(pad, Math.min(maxX, nx));
    ny = Math.max(pad, Math.min(maxY, ny));
    if (Math.hypot(nx + w / 2 - px, ny + h / 2 - py) < UMBRAL) {
      nx = pad + Math.random() * (maxX - pad);
      ny = pad + Math.random() * (maxY - pad);
    }
    btnNo.style.left = nx + 'px';
    btnNo.style.top = ny + 'px';
    noHits++;
    btnNo.style.transform = `rotate(${(Math.random() * 16 - 8).toFixed(1)}deg)`;
    const span = btnNo.querySelector('span'); if (span) span.style.display = 'none';
    btnNo.childNodes.forEach((n) => { if (n.nodeType === 3) n.textContent = ''; });
    btnNo.appendChild(document.createTextNode(LABELS_NO[Math.min(noHits, LABELS_NO.length - 1)]));
  }
  document.addEventListener('pointermove', (e) => {
    if (!document.getElementById('screen-salimos').classList.contains('is-active')) return;
    const r = btnNo.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (Math.hypot(cx - e.clientX, cy - e.clientY) < UMBRAL) saltar(e.clientX, e.clientY);
  });
  btnNo.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.touches[0]; saltar(t ? t.clientX : innerWidth / 2, t ? t.clientY : innerHeight / 2); }, { passive: false });
  btnNo.addEventListener('pointerdown', (e) => { e.preventDefault(); saltar(e.clientX, e.clientY); });
  btnNo.addEventListener('click', (e) => { e.preventDefault(); saltar(e.clientX, e.clientY); });
  btnSi.addEventListener('click', () => { lanzarCorazones(); setTimeout(() => goTo('screen-vamos'), 450); });
}

function lanzarCorazones() {
  const fx = document.getElementById('fx');
  for (let i = 0; i < 26; i++) {
    const h = document.createElement('span');
    h.className = 'heart';
    h.innerHTML = window.svgIcon('heart', 'icon');
    const size = 20 + Math.random() * 30;
    const ico = h.querySelector('.icon');
    ico.style.width = size + 'px'; ico.style.height = size + 'px';
    h.style.left = Math.random() * 100 + 'vw';
    h.style.bottom = '-40px';
    h.style.animationDelay = (Math.random() * 0.5) + 's';
    fx.appendChild(h);
    setTimeout(() => h.remove(), 2400);
  }
}

/* ========================= Pantalla 2 — Vamos a… ========================= */
function renderMeals() {
  const cont = document.getElementById('meal-options');
  cont.innerHTML = '';
  MEALS.forEach((m) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.innerHTML = window.svgIcon(m.id, 'icon') + `<span>${m.label}</span>` +
      (m.slot ? `<span class="tiny">${m.slot.start}–${m.slot.end}</span>` : '');
    b.addEventListener('click', () => {
      cita.meal = m; cita.slot = m.slot; cita.cuisine = null;
      prepararApetece(m); goTo('screen-apetece');
    });
    cont.appendChild(b);
  });
}

/* ========================= Pantalla 3 — Me apetece… ========================= */
function prepararApetece(meal) {
  document.getElementById('apetece-eyebrow').textContent =
    meal.slot ? `${meal.slot.name} · ${meal.slot.start}–${meal.slot.end}` : meal.label;
  document.getElementById('apetece-sub').textContent = meal.guasa;
  const cont = document.getElementById('cuisine-options');
  cont.innerHTML = '';
  meal.cocinas.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.innerHTML = window.svgIcon(c.id, 'icon') + `<span>${c.label}</span>`;
    b.addEventListener('click', () => { cita.cuisine = c; prepararResultado(); goTo('screen-resultado'); });
    cont.appendChild(b);
  });
}

/* ========================= Pantalla 4 — Mapa opcional + resultados ========================= */
let map = null, capaMarcadores = null, capaDibujo = null;

function prepararResultado() {
  const m = cita.meal, c = cita.cuisine;
  document.getElementById('plan-title').textContent = `${m.label} · ${c.label}`;
  const hora = cita.slot ? ` a eso de las ${cita.slot.start}` : '';
  document.getElementById('plan-summary').textContent = `${frase(m, c)}${hora}. Marca una zona si quieres, o cierra la cita sin más.`;

  document.getElementById('map-stage').hidden = false;
  document.getElementById('results-wrap').hidden = true;
  document.getElementById('done').hidden = true;
  document.getElementById('places').innerHTML = '';

  setTimeout(iniciarMapa, 60);
}
function frase(m, c) {
  if (m.kind === 'walk') return `Un paseo hasta ${c.label.toLowerCase()}`;
  if (m.kind === 'drink') return `${m.label} — ${c.label.toLowerCase()}`;
  return `${m.slot.name} de ${c.label.toLowerCase()}`;
}

/* ---------- Mapa + buscador + área ---------- */
function iniciarMapa() {
  if (map) { map.invalidateSize(); return; }
  map = L.map('map', { zoomControl: true }).setView([40.4168, -3.7038], 6); // España por defecto
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap', maxZoom: 19,
  }).addTo(map);
  capaMarcadores = L.layerGroup().addTo(map);
  capaDibujo = new L.FeatureGroup().addTo(map);

  const drawControl = new L.Control.Draw({
    position: 'topright',
    draw: {
      polyline: false, polygon: false, marker: false, circlemarker: false,
      rectangle: { shapeOptions: { color: '#ef5b47', weight: 2 } },
      circle: { shapeOptions: { color: '#ef5b47', weight: 2 } },
    },
    edit: { featureGroup: capaDibujo, edit: false },
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, (e) => {
    capaDibujo.clearLayers();
    capaDibujo.addLayer(e.layer);
    fijarArea(e.layerType, e.layer);
  });
  map.on(L.Draw.Event.DELETED, () => { cita.area = null; });

  setTimeout(() => map.invalidateSize(), 120);
}

function fijarArea(tipo, layer) {
  if (tipo === 'circle') {
    const c = layer.getLatLng();
    cita.area = { type: 'circle', lat: c.lat, lon: c.lng, radio: Math.round(layer.getRadius()) };
    cita.center = { lat: c.lat, lon: c.lng };
  } else if (tipo === 'rectangle') {
    const b = layer.getBounds();
    cita.area = { type: 'rect', bbox: `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}` };
    const ctr = b.getCenter();
    cita.center = { lat: ctr.lat, lon: ctr.lng };
  }
}

/* ---------- Buscador de lugares (Nominatim) ---------- */
let searchTimer = null;
function setupBuscador() {
  const input = document.getElementById('geo-search');
  const list = document.getElementById('search-results');

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = input.value.trim();
    if (q.length < 3) { list.hidden = true; list.innerHTML = ''; return; }
    searchTimer = setTimeout(() => geocodar(q, list), 400);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const first = list.querySelector('li'); if (first) first.click(); }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) { list.hidden = true; }
  });
}

async function geocodar(q, list) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=es&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const data = await res.json();
    list.innerHTML = '';
    if (!data.length) { list.hidden = true; return; }
    data.forEach((r) => {
      const li = document.createElement('li');
      li.textContent = r.display_name;
      li.addEventListener('click', () => {
        const bb = r.boundingbox;
        if (bb) map.fitBounds([[+bb[0], +bb[2]], [+bb[1], +bb[3]]]);
        else map.setView([+r.lat, +r.lon], 14);
        cita.center = { lat: +r.lat, lon: +r.lon };
        cita.ubicacionLabel = r.display_name.split(',').slice(0, 2).join(',').trim();
        list.hidden = true;
        document.getElementById('geo-search').value = r.display_name.split(',')[0];
      });
      list.appendChild(li);
    });
    list.hidden = false;
  } catch { list.hidden = true; }
}

/* ---------- Mi ubicación (opcional) ---------- */
function usarMiUbicacion() {
  if (!('geolocation' in navigator)) return;
  const btn = document.getElementById('btn-mylocation');
  btn.classList.add('loading');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btn.classList.remove('loading');
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      cita.center = { lat, lon };
      map.setView([lat, lon], 14);
      L.circleMarker([lat, lon], { radius: 7, color: '#6f8b3c', fillColor: '#86a84c', fillOpacity: .9, weight: 2 })
        .addTo(capaMarcadores).bindPopup('Por aquí andas');
    },
    () => { btn.classList.remove('loading'); },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

/* ---------- Overpass ---------- */
function construirFiltro(tags) {
  return Object.entries(tags).map(([k, v]) => (v ? `["${k}"~"${v}",i]` : `["${k}"]`)).join('');
}
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
async function overpass(query) {
  let err;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) { err = e; }
  }
  throw err;
}

async function buscarSitios() {
  const lista = document.getElementById('places');
  document.getElementById('results-wrap').hidden = false;
  document.getElementById('done').hidden = true;
  lista.innerHTML = `<li class="state-msg">Rastreando ${cita.cuisine.label.toLowerCase()} en la zona…</li>`;

  const filtro = construirFiltro(cita.cuisine.osm);
  let query, centro;
  if (cita.area && cita.area.type === 'circle') {
    const { lat, lon, radio } = cita.area; centro = { lat, lon };
    query = `[out:json][timeout:25];(node${filtro}(around:${radio},${lat},${lon});way${filtro}(around:${radio},${lat},${lon}););out center 60;`;
  } else if (cita.area && cita.area.type === 'rect') {
    query = `[out:json][timeout:25];(node${filtro}(${cita.area.bbox});way${filtro}(${cita.area.bbox}););out center 60;`;
    centro = cita.center;
  } else {
    const b = map.getBounds();
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
    query = `[out:json][timeout:25];(node${filtro}(${bbox});way${filtro}(${bbox}););out center 60;`;
    centro = map.getCenter(); centro = { lat: centro.lat, lon: centro.lng };
  }
  cita.center = centro;

  let sitios = [];
  try {
    const data = await overpass(query);
    sitios = normalizar(data.elements || [], centro);
  } catch {
    lista.innerHTML = `<li class="state-msg">Los mapas están de siesta. Prueba otra vez en un momento.</li>`;
    return;
  }
  if (!sitios.length) {
    lista.innerHTML = `<li class="state-msg">No encuentro ${cita.cuisine.label.toLowerCase()} en esa zona. Amplía el área o mueve el mapa.</li>`;
    return;
  }
  sitios.sort((a, b) => a.dist - b.dist);
  const top = sitios.slice(0, 10);
  pintarLista(top);
  pintarMapa(top, centro);
}

function normalizar(elements, centro) {
  const out = [], vistos = new Set();
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon, nombre = el.tags?.name;
    if (lat == null || lon == null || !nombre) continue;
    const k = nombre.toLowerCase(); if (vistos.has(k)) continue; vistos.add(k);
    out.push({ nombre, lat, lon, tags: el.tags, dist: centro ? haversine(centro.lat, centro.lon, lat, lon) : 0 });
  }
  return out;
}
function haversine(la1, lo1, la2, lo2) {
  const R = 6371000, rad = (d) => d * Math.PI / 180;
  const dLa = rad(la2 - la1), dLo = rad(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function fmtDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; }

function pintarLista(sitios) {
  const lista = document.getElementById('places');
  lista.innerHTML = '';
  sitios.forEach((p, i) => {
    const det = [];
    if (p.tags['addr:street']) det.push(p.tags['addr:street'] + (p.tags['addr:housenumber'] ? ' ' + p.tags['addr:housenumber'] : ''));
    if (p.dist) det.push(fmtDist(p.dist));
    const li = document.createElement('li');
    li.className = 'place';
    li.innerHTML = `<span class="idx">${i + 1}</span>` +
      `<span class="info"><span class="name">${escapar(p.nombre)}</span><span class="meta">${det.join(' · ')}</span></span>` +
      `<button class="pick">${window.svgIcon('check', 'icon')} Este</button>`;
    li.querySelector('.pick').addEventListener('click', () => cerrarCita(p));
    lista.appendChild(li);
  });
}
function pintarMapa(sitios, centro) {
  capaMarcadores.clearLayers();
  if (centro) L.circleMarker([centro.lat, centro.lon], { radius: 6, color: '#7d4a6b', fillColor: '#7d4a6b', fillOpacity: .6, weight: 1 }).addTo(capaMarcadores);
  const bounds = [];
  sitios.forEach((p, i) => {
    const icon = L.divIcon({
      className: 'pin',
      html: `<div style="background:#ef5b47;color:#fff;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:grid;place-items:center;font-weight:800;box-shadow:0 3px 8px rgba(0,0,0,.35)"><span style="transform:rotate(45deg)">${i + 1}</span></div>`,
      iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
    });
    L.marker([p.lat, p.lon], { icon }).addTo(capaMarcadores).bindPopup(`<b>${escapar(p.nombre)}</b>${p.dist ? '<br>' + fmtDist(p.dist) : ''}`);
    bounds.push([p.lat, p.lon]);
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  setTimeout(() => map.invalidateSize(), 80);
}

/* ========================= Cierre + guardado en Supabase ========================= */
async function cerrarCita(place) {
  const m = cita.meal, c = cita.cuisine;
  document.getElementById('map-stage').hidden = true;
  document.getElementById('results-wrap').hidden = true;

  const done = document.getElementById('done');
  done.hidden = false;
  document.getElementById('done-title').textContent = '¡Cita cerrada!';
  const cuando = cita.slot ? ` (${cita.slot.name.toLowerCase()}, ${cita.slot.start})` : '';
  const sitioTxt = place ? ` en ${place.nombre}` : '';
  document.getElementById('done-text').textContent = `${m.label} de ${c.label.toLowerCase()}${sitioTxt}${cuando}. Nos vemos ✨`;
  pintarIconos(done);
  lanzarCorazones();

  const params = {
    p_invitacion_id: cita.invitacionId,
    p_nombre: cita.nombre || null,
    p_mote: cita.mote || null,
    p_plan: m.label,
    p_tipo: m.kind,
    p_franja: cita.slot ? `${cita.slot.start}-${cita.slot.end}` : '',
    p_antojo: c.label,
    p_sitio: place ? place.nombre : null,
    p_sitio_lat: place ? place.lat : null,
    p_sitio_lon: place ? place.lon : null,
    p_ubicacion: cita.ubicacionLabel || '',
    p_area_lat: cita.area && cita.area.type === 'circle' ? cita.area.lat : null,
    p_area_lon: cita.area && cita.area.type === 'circle' ? cita.area.lon : null,
    p_area_radio: cita.area && cita.area.type === 'circle' ? cita.area.radio : null,
    p_area_bbox: cita.area && cita.area.type === 'rect' ? cita.area.bbox : null,
  };

  const logEl = document.getElementById('done-log');
  if (!window.sb) { console.info('[registro local — sin Supabase]', params); logEl.textContent = 'Guardado en local (modo prueba).'; return; }
  try {
    const { error } = await window.sb.rpc('registrar_cita', params);
    logEl.textContent = error ? 'No se pudo registrar (pero la cita sigue en pie).' : 'Cita registrada 📝';
    if (error) console.error(error);
  } catch (e) { logEl.textContent = 'No se pudo registrar (pero la cita sigue en pie).'; console.error(e); }
}

/* ========================= Arranque ========================= */
document.addEventListener('DOMContentLoaded', async () => {
  pintarIconos();
  setupBroma();
  setupHuida();
  renderMeals();
  setupBuscador();
  document.getElementById('btn-buscar').addEventListener('click', buscarSitios);
  document.getElementById('btn-skip').addEventListener('click', () => cerrarCita(null));
  document.getElementById('btn-mylocation').addEventListener('click', usarMiUbicacion);
  document.querySelectorAll('.link-back').forEach((b) => { if (b.dataset.back) b.addEventListener('click', () => goTo(b.dataset.back)); });

  // Puerta: la app real solo con invitación válida; si no, se queda la broma.
  const ok = await resolverInvitacion();
  if (ok) revelarApp();
});
