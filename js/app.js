/* =========================================================
   ¿Salimos?  —  lógica
   Flujo: ¿Salimos? → Vamos a… → Me apetece… → sitios en el mapa → cita cerrada
   La ubicación NUNCA se envía a nadie: solo se usa en tu navegador para
   preguntar a OpenStreetMap qué hay cerca. Al registrar la cita se guarda
   como mucho la CIUDAD, nunca las coordenadas exactas.
   ========================================================= */

'use strict';

/* ---------- Estado de la cita ---------- */
const cita = {
  meal: null,        // objeto de MEALS
  slot: null,        // { name, start, end } o null
  cuisine: null,     // objeto de cocina elegido
  coords: null,      // { lat, lon } (solo en memoria del navegador)
  ciudad: '',        // texto (reverse geocode, nivel ciudad)
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

/* ---------- Planes (Vamos a…) ---------- */
const MEALS = [
  { id: 'desayunar', label: 'Desayunar', kind: 'food', slot: { name: 'Desayuno', start: '09:00', end: '11:00' }, cocinas: COCINAS_DESAYUNO, guasa: 'Madrugar por amor. Muy top.' },
  { id: 'comer',     label: 'Comer',     kind: 'food', slot: { name: 'Comida',   start: '13:30', end: '15:00' }, cocinas: COCINAS_COMIDA,   guasa: 'Plan seguro: nadie discute con hambre.' },
  { id: 'cenar',     label: 'Cenar',     kind: 'food', slot: { name: 'Cena',     start: '21:00', end: '22:30' }, cocinas: COCINAS_COMIDA,   guasa: 'A la luz de las farolas. Un clásico.' },
  { id: 'pasear',    label: 'Pasear',    kind: 'walk', slot: null,                                              cocinas: PLANES_PASEO,     guasa: 'Gasto cero, encanto máximo.' },
  { id: 'tomar',     label: 'Tomar algo', kind: 'drink', slot: null,                                            cocinas: PLANES_COPA,      guasa: 'Una y ya veremos. (Nunca es una.)' },
];

/* =========================================================
   Utilidades de UI
   ========================================================= */
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

/* =========================================================
   Pantalla 1 — El botón "No" que huye del cursor
   ========================================================= */
const LABELS_NO = ['No', '¿Seguro?', 'Piénsalo', 'Nop', 'Casi', 'Ni de broma', 'Insiste', 'Que no 😅'];
let noHits = 0;
let roaming = false;

function setupHuida() {
  const btnNo = document.getElementById('btn-no');
  const btnSi = document.getElementById('btn-si');
  const UMBRAL = 120;   // px: a partir de aquí, el "No" siente el peligro

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
    const maxX = window.innerWidth - w - pad;
    const maxY = window.innerHeight - h - pad;
    const cx = btnNo.getBoundingClientRect().left + w / 2;
    const cy = btnNo.getBoundingClientRect().top + h / 2;

    // vector de huida (alejarse del cursor)
    let dx = cx - px, dy = cy - py;
    let dist = Math.hypot(dx, dy) || 1;
    let nx = cx + (dx / dist) * 190 - w / 2;
    let ny = cy + (dy / dist) * 190 - h / 2;

    // clamp a la pantalla
    nx = Math.max(pad, Math.min(maxX, nx));
    ny = Math.max(pad, Math.min(maxY, ny));

    // si sigue acorralado cerca del cursor, salto aleatorio
    if (Math.hypot(nx + w / 2 - px, ny + h / 2 - py) < UMBRAL) {
      nx = pad + Math.random() * (maxX - pad);
      ny = pad + Math.random() * (maxY - pad);
    }

    btnNo.style.left = nx + 'px';
    btnNo.style.top = ny + 'px';
    noHits++;
    btnNo.style.transform = `rotate(${(Math.random() * 16 - 8).toFixed(1)}deg)`;
    btnNo.querySelector('span').style.display = 'none'; // esconde el icono al huir
    btnNo.childNodes.forEach((n) => { if (n.nodeType === 3) n.textContent = ''; });
    btnNo.appendChild(document.createTextNode(LABELS_NO[Math.min(noHits, LABELS_NO.length - 1)]));
  }

  // Persecución del cursor: si se acerca al "No", huye
  document.addEventListener('pointermove', (e) => {
    if (!document.getElementById('screen-salimos').classList.contains('is-active')) return;
    const r = btnNo.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (Math.hypot(cx - e.clientX, cy - e.clientY) < UMBRAL) saltar(e.clientX, e.clientY);
  });

  // Táctil: huye antes del toque
  btnNo.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    saltar(t ? t.clientX : window.innerWidth / 2, t ? t.clientY : window.innerHeight / 2);
  }, { passive: false });
  btnNo.addEventListener('pointerdown', (e) => { e.preventDefault(); saltar(e.clientX, e.clientY); });
  btnNo.addEventListener('click', (e) => { e.preventDefault(); saltar(e.clientX, e.clientY); });

  btnSi.addEventListener('click', () => {
    lanzarCorazones();
    setTimeout(() => goTo('screen-vamos'), 450);
  });
}

function lanzarCorazones() {
  const fx = document.getElementById('fx');
  for (let i = 0; i < 26; i++) {
    const h = document.createElement('span');
    h.className = 'heart';
    h.innerHTML = window.svgIcon('heart', 'icon');
    const size = 20 + Math.random() * 30;
    h.querySelector('.icon').style.width = size + 'px';
    h.querySelector('.icon').style.height = size + 'px';
    h.style.left = Math.random() * 100 + 'vw';
    h.style.bottom = '-40px';
    h.style.animationDelay = (Math.random() * 0.5) + 's';
    fx.appendChild(h);
    setTimeout(() => h.remove(), 2400);
  }
}

/* =========================================================
   Pantalla 2 — Vamos a…
   ========================================================= */
function renderMeals() {
  const cont = document.getElementById('meal-options');
  cont.innerHTML = '';
  MEALS.forEach((m) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.innerHTML = window.svgIcon(m.id, 'icon') + `<span>${m.label}</span>` +
      (m.slot ? `<span class="tiny">${m.slot.start}–${m.slot.end}</span>` : '');
    b.addEventListener('click', () => {
      cita.meal = m;
      cita.slot = m.slot;            // registra la franja horaria si es comida
      cita.cuisine = null;
      prepararApetece(m);
      goTo('screen-apetece');
    });
    cont.appendChild(b);
  });
}

/* =========================================================
   Pantalla 3 — Me apetece…
   ========================================================= */
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
    b.addEventListener('click', () => {
      cita.cuisine = c;
      prepararResultado();
      goTo('screen-resultado');
    });
    cont.appendChild(b);
  });
}

/* =========================================================
   Pantalla 4 — Resultado + mapa
   ========================================================= */
let map = null;
let capaMarcadores = null;

function prepararResultado() {
  const m = cita.meal, c = cita.cuisine;
  document.getElementById('plan-title').textContent = `${m.label} · ${c.label}`;
  const hora = cita.slot ? ` a eso de las ${cita.slot.start}` : '';
  document.getElementById('plan-summary').textContent = `${frase(m, c)}${hora}. Busco un par de sitios que nos valgan.`;

  document.getElementById('geo-status').hidden = false;
  document.getElementById('results-wrap').hidden = true;
  document.getElementById('done').hidden = true;
  document.getElementById('places').innerHTML = '';
}

function frase(m, c) {
  if (m.kind === 'walk') return `Un paseo hasta ${c.label.toLowerCase()}`;
  if (m.kind === 'drink') return `${m.label} — ${c.label.toLowerCase()}`;
  return `${m.slot.name} de ${c.label.toLowerCase()}`;
}

/* ---------- Geolocalización (solo en tu navegador) ---------- */
function pedirUbicacion() {
  const msg = document.getElementById('geo-msg');
  const btn = document.getElementById('btn-geo');

  if (!('geolocation' in navigator)) {
    msg.textContent = 'Tu navegador no sabe dónde estás. Qué misterio.';
    return;
  }
  btn.disabled = true;
  btn.innerHTML = 'Localizando…';
  msg.textContent = 'Triangulando estrellas y semáforos…';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      cita.coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      document.getElementById('geo-status').hidden = true;
      document.getElementById('results-wrap').hidden = false;
      resolverCiudad();     // en segundo plano, para el registro (solo ciudad)
      buscarSitios();
    },
    (err) => {
      btn.disabled = false;
      btn.innerHTML = window.svgIcon('pin', 'icon') + ' Intentar de nuevo';
      msg.textContent = err.code === 1
        ? 'Sin ubicación no hay magia. Dale a "permitir" y me porto bien.'
        : 'No he podido localizarte. ¿Probamos otra vez?';
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

/* Reverse geocode a nivel ciudad (Nominatim). No guardamos coordenadas. */
async function resolverCiudad() {
  try {
    const { lat, lon } = cita.coords;
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    const data = await res.json();
    const a = data.address || {};
    cita.ciudad = a.city || a.town || a.village || a.municipality || a.county || a.state || '';
  } catch { /* si falla, ciudad queda vacía */ }
}

/* ---------- Consulta a OpenStreetMap (Overpass) ---------- */
function construirQuery(coords, tags, radio) {
  const filtro = Object.entries(tags)
    .map(([k, v]) => (v ? `["${k}"~"${v}",i]` : `["${k}"]`))
    .join('');
  const { lat, lon } = coords;
  return `[out:json][timeout:25];(` +
    `node${filtro}(around:${radio},${lat},${lon});` +
    `way${filtro}(around:${radio},${lat},${lon});` +
    `);out center 40;`;
}

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function overpass(query) {
  let ultimoError;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) { ultimoError = e; }
  }
  throw ultimoError;
}

async function buscarSitios() {
  const lista = document.getElementById('places');
  lista.innerHTML = `<li class="state-msg">Rastreando ${cita.cuisine.label.toLowerCase()} cerca de ti…</li>`;
  iniciarMapa();

  const radios = [1500, 3000, 6000];
  let encontrados = [];
  try {
    for (const radio of radios) {
      const data = await overpass(construirQuery(cita.coords, cita.cuisine.osm, radio));
      encontrados = normalizar(data.elements || []);
      if (encontrados.length >= 2) break;
    }
  } catch {
    lista.innerHTML = `<li class="state-msg">Los mapas están de siesta. Prueba en un momento.</li>`;
    return;
  }

  if (!encontrados.length) {
    lista.innerHTML = `<li class="state-msg">No encuentro ${cita.cuisine.label.toLowerCase()} por aquí.
      Toca improvisar (o mudarse).</li>`;
    return;
  }

  encontrados.sort((a, b) => a.dist - b.dist);
  const top = encontrados.slice(0, 8);
  pintarLista(top);
  pintarMapa(top);
}

function normalizar(elements) {
  const out = [];
  const vistos = new Set();
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const nombre = el.tags?.name;
    if (lat == null || lon == null || !nombre) continue;
    const k = nombre.toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push({ nombre, lat, lon, dist: haversine(cita.coords.lat, cita.coords.lon, lat, lon), tags: el.tags });
  }
  return out;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; }

/* ---------- Pintar resultados ---------- */
function pintarLista(sitios) {
  const lista = document.getElementById('places');
  lista.innerHTML = '';
  sitios.forEach((p, i) => {
    const detalles = [];
    if (p.tags['addr:street']) {
      detalles.push(p.tags['addr:street'] + (p.tags['addr:housenumber'] ? ' ' + p.tags['addr:housenumber'] : ''));
    }
    detalles.push(fmtDist(p.dist));
    const li = document.createElement('li');
    li.className = 'place';
    li.innerHTML =
      `<span class="idx">${i + 1}</span>` +
      `<span class="info"><span class="name">${escapar(p.nombre)}</span>` +
      `<span class="meta">${detalles.join(' · ')}</span></span>` +
      `<button class="pick">${window.svgIcon('check', 'icon')} Este</button>`;
    li.querySelector('.pick').addEventListener('click', () => cerrarCita(p));
    lista.appendChild(li);
  });
}

/* ---------- Mapa (Leaflet) ---------- */
function iniciarMapa() {
  if (map) { map.setView([cita.coords.lat, cita.coords.lon], 15); return; }
  map = L.map('map', { zoomControl: true }).setView([cita.coords.lat, cita.coords.lon], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap', maxZoom: 19,
  }).addTo(map);
  capaMarcadores = L.layerGroup().addTo(map);
}

function pintarMapa(sitios) {
  capaMarcadores.clearLayers();
  L.circleMarker([cita.coords.lat, cita.coords.lon], {
    radius: 8, color: '#6f8b3c', fillColor: '#86a84c', fillOpacity: 0.9, weight: 2,
  }).addTo(capaMarcadores).bindPopup('Aquí estás tú');

  const bounds = [[cita.coords.lat, cita.coords.lon]];
  sitios.forEach((p, i) => {
    const icon = L.divIcon({
      className: 'pin',
      html: `<div style="background:#ef5b47;color:#fff;width:26px;height:26px;border-radius:50% 50% 50% 0;` +
        `transform:rotate(-45deg);display:grid;place-items:center;font-weight:800;` +
        `box-shadow:0 3px 8px rgba(0,0,0,.35)"><span style="transform:rotate(45deg)">${i + 1}</span></div>`,
      iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
    });
    L.marker([p.lat, p.lon], { icon }).addTo(capaMarcadores)
      .bindPopup(`<b>${escapar(p.nombre)}</b><br>${fmtDist(p.dist)}`);
    bounds.push([p.lat, p.lon]);
  });
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  setTimeout(() => map.invalidateSize(), 100);
}

function escapar(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

/* =========================================================
   Cierre de cita + registro (GitHub Action del repo)
   ========================================================= */
function cerrarCita(place) {
  const m = cita.meal, c = cita.cuisine;
  document.getElementById('results-wrap').hidden = true;

  const done = document.getElementById('done');
  done.hidden = false;
  document.getElementById('done-title').textContent = '¡Cita cerrada!';
  const cuando = cita.slot ? ` (${cita.slot.name.toLowerCase()}, ${cita.slot.start})` : '';
  document.getElementById('done-text').textContent =
    `${m.label} de ${c.label.toLowerCase()} en ${place.nombre}${cuando}. Nos vemos ✨`;
  pintarIconos(done);

  lanzarCorazones();

  enviarRegistro({
    fecha: new Date().toISOString(),
    salimos: 'sí',
    plan: m.label,
    tipo: m.kind,
    franja: cita.slot ? `${cita.slot.start}-${cita.slot.end}` : '',
    antojo: c.label,
    ciudad: cita.ciudad || '',
    sitio: place.nombre,
  });
}

/* Envía el registro a la GitHub Action vía repository_dispatch.
   El token se inyecta en js/config.js al desplegar en Pages (desde Secrets).
   Sin token (p.ej. en local) el registro solo se muestra en consola. */
async function enviarRegistro(rec) {
  const logEl = document.getElementById('done-log');
  const cfg = window.SALIMOS_CONFIG || {};
  if (!cfg.token || !cfg.repo) {
    console.info('[registro local — no se envía sin token]', rec);
    logEl.textContent = 'Registro guardado en local (modo prueba).';
    return;
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${cfg.repo}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: 'nueva-cita', client_payload: rec }),
    });
    logEl.textContent = res.ok ? 'Cita registrada 📝' : 'No se pudo registrar (pero la cita sigue en pie).';
  } catch {
    logEl.textContent = 'No se pudo registrar (pero la cita sigue en pie).';
  }
}

/* =========================================================
   Arranque
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  pintarIconos();
  setupHuida();
  renderMeals();
  document.getElementById('btn-geo').addEventListener('click', pedirUbicacion);
  document.querySelectorAll('.link-back').forEach((b) => {
    b.addEventListener('click', () => goTo(b.dataset.back));
  });
});
