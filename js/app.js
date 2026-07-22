/* =========================================================
   ¿Salimos?  —  lógica
   Flujo: ¿Salimos? → Vamos a… → Me apetece… → sitios en el mapa
   La ubicación NUNCA se envía a nadie: solo se usa en tu navegador
   para preguntar a OpenStreetMap qué hay cerca.
   ========================================================= */

'use strict';

/* ---------- Estado de la cita ---------- */
const cita = {
  meal: null,        // objeto de MEALS
  slot: null,        // { name, start, end } o null
  cuisine: null,     // objeto de cocina elegido
  coords: null,      // { lat, lon }
};

/* ---------- Catálogo de cocinas reutilizable ---------- */
// amenity con "restaurant|fast_food" para no perder hamburgueserías, etc.
const FOOD = 'restaurant|fast_food';

const COCINAS_COMIDA = [
  { id: 'ramen',   label: 'Ramen',       emoji: '🍜', osm: { amenity: FOOD, cuisine: 'ramen|noodle|japanese' } },
  { id: 'sushi',   label: 'Sushi',       emoji: '🍣', osm: { amenity: FOOD, cuisine: 'sushi|japanese' } },
  { id: 'burger',  label: 'Hamburguesa', emoji: '🍔', osm: { amenity: FOOD, cuisine: 'burger|american' } },
  { id: 'pizza',   label: 'Pizza',       emoji: '🍕', osm: { amenity: FOOD, cuisine: 'pizza|italian' } },
  { id: 'tapas',   label: 'Tapas',       emoji: '🥘', osm: { amenity: FOOD, cuisine: 'tapas|spanish|regional' } },
  { id: 'mexican', label: 'Mexicano',    emoji: '🌮', osm: { amenity: FOOD, cuisine: 'mexican' } },
  { id: 'kebab',   label: 'Kebab',       emoji: '🥙', osm: { amenity: FOOD, cuisine: 'kebab|turkish' } },
  { id: 'italian', label: 'Italiano',    emoji: '🍝', osm: { amenity: FOOD, cuisine: 'italian' } },
];

const COCINAS_DESAYUNO = [
  { id: 'cafe',    label: 'Café y tostada', emoji: '☕', osm: { amenity: 'cafe' } },
  { id: 'churros', label: 'Churros',        emoji: '🍫', osm: { amenity: FOOD, cuisine: 'churro|spanish' } },
  { id: 'bakery',  label: 'Bollería',       emoji: '🥐', osm: { shop: 'bakery|pastry' } },
  { id: 'brunch',  label: 'Brunch',         emoji: '🥞', osm: { amenity: 'cafe|restaurant', cuisine: 'breakfast|brunch|american' } },
];

const PLANES_PASEO = [
  { id: 'parque',  label: 'Un parque',       emoji: '🌳', osm: { leisure: 'park' } },
  { id: 'mirador', label: 'Un mirador',      emoji: '🌄', osm: { tourism: 'viewpoint' } },
  { id: 'playa',   label: 'La playa',        emoji: '🏖️', osm: { natural: 'beach' } },
  { id: 'casco',   label: 'Casco histórico', emoji: '🏛️', osm: { tourism: 'attraction|artwork', historic: '' } },
];

const PLANES_COPA = [
  { id: 'bar',     label: 'Un bar',        emoji: '🍺', osm: { amenity: 'bar|pub' } },
  { id: 'coctel',  label: 'Cócteles',      emoji: '🍸', osm: { amenity: 'bar', cuisine: 'cocktail' } },
  { id: 'vino',    label: 'Vinos',         emoji: '🍷', osm: { amenity: 'bar|pub', drink: 'wine' } },
  { id: 'terraza', label: 'Terraza café',  emoji: '☕', osm: { amenity: 'cafe|bar' } },
];

/* ---------- Planes (Vamos a…) ---------- */
const MEALS = [
  {
    id: 'desayunar', label: 'Desayunar', emoji: '🥐', kind: 'food',
    slot: { name: 'Desayuno', start: '09:00', end: '11:00' },
    cocinas: COCINAS_DESAYUNO,
    guasa: 'Madrugar por amor. Qué romántico.',
  },
  {
    id: 'comer', label: 'Comer', emoji: '🍽️', kind: 'food',
    slot: { name: 'Comida', start: '13:30', end: '15:00' },
    cocinas: COCINAS_COMIDA,
    guasa: 'El plan más seguro: nadie discute con hambre.',
  },
  {
    id: 'cenar', label: 'Cenar', emoji: '🌙', kind: 'food',
    slot: { name: 'Cena', start: '21:00', end: '22:30' },
    cocinas: COCINAS_COMIDA,
    guasa: 'A la luz de las farolas. Un clásico.',
  },
  {
    id: 'pasear', label: 'Pasear', emoji: '🚶', kind: 'walk',
    slot: null,
    cocinas: PLANES_PASEO,
    guasa: 'Gasto cero, encanto máximo.',
  },
  {
    id: 'tomar', label: 'Tomar algo', emoji: '🍸', kind: 'drink',
    slot: null,
    cocinas: PLANES_COPA,
    guasa: 'Una y ya veremos. (Nunca es una.)',
  },
];

/* =========================================================
   Navegación entre pantallas
   ========================================================= */
function goTo(id) {
  const current = document.querySelector('.screen.is-active');
  const next = document.getElementById(id);
  if (!next || current === next) return;

  if (current) {
    current.classList.remove('is-active');
    current.classList.add('is-leaving');
    setTimeout(() => current.classList.remove('is-leaving'), 500);
  }
  // pequeño desfase para encadenar la transición
  requestAnimationFrame(() => next.classList.add('is-active'));
}

/* =========================================================
   Pantalla 1 — El botón "No" que huye
   ========================================================= */
const LABELS_NO = ['No', '¿Seguro?', 'Piénsalo', 'No vale', 'Casi', 'Ni de broma', 'Insiste'];
let noHits = 0;

function setupHuida() {
  const btnNo = document.getElementById('btn-no');
  const btnSi = document.getElementById('btn-si');

  function huir() {
    noHits++;
    const pad = 16;
    const w = btnNo.offsetWidth;
    const h = btnNo.offsetHeight;
    const maxX = Math.max(pad, window.innerWidth - w - pad);
    const maxY = Math.max(pad, window.innerHeight - h - pad);
    const x = pad + Math.random() * (maxX - pad);
    const y = pad + Math.random() * (maxY - pad);

    btnNo.style.position = 'fixed';
    btnNo.style.left = x + 'px';
    btnNo.style.top = y + 'px';
    btnNo.style.transform = `scale(${Math.max(0.55, 1 - noHits * 0.06)})`;
    btnNo.textContent = LABELS_NO[Math.min(noHits, LABELS_NO.length - 1)];
  }

  // Ratón: huye al acercarse.
  btnNo.addEventListener('mouseenter', huir);
  btnNo.addEventListener('mouseover', huir);
  // Móvil/táctil: huye antes de que el dedo lo toque.
  btnNo.addEventListener('touchstart', (e) => { e.preventDefault(); huir(); }, { passive: false });
  btnNo.addEventListener('pointerdown', (e) => { e.preventDefault(); huir(); });
  btnNo.addEventListener('click', (e) => { e.preventDefault(); huir(); });

  // Proximidad: si el puntero se acerca demasiado, se aparta.
  document.addEventListener('pointermove', (e) => {
    if (btnNo.style.position !== 'fixed') {
      const r = btnNo.getBoundingClientRect();
      if (e.clientX > r.left - 40 && e.clientX < r.right + 40 &&
          e.clientY > r.top - 40 && e.clientY < r.bottom + 40) huir();
    }
  });

  btnSi.addEventListener('click', () => {
    lanzarCorazones();
    setTimeout(() => goTo('screen-vamos'), 420);
  });
}

/* Corazones cuando dice que sí */
function lanzarCorazones() {
  const fx = document.getElementById('fx');
  const emojis = ['💖', '💘', '✨', '🥂', '💫', '🌹'];
  for (let i = 0; i < 24; i++) {
    const h = document.createElement('span');
    h.className = 'heart';
    h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    h.style.left = Math.random() * 100 + 'vw';
    h.style.bottom = '-40px';
    h.style.animationDelay = (Math.random() * 0.5) + 's';
    h.style.fontSize = (1.2 + Math.random() * 1.6) + 'rem';
    fx.appendChild(h);
    setTimeout(() => h.remove(), 2200);
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
    b.innerHTML = `<span class="emoji">${m.emoji}</span><span>${m.label}</span>` +
      (m.slot ? `<span class="tiny">${m.slot.start}–${m.slot.end}</span>` : '');
    b.addEventListener('click', () => {
      cita.meal = m;
      cita.slot = m.slot;            // registra franja horaria si es comida
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
  const eyebrow = document.getElementById('apetece-eyebrow');
  const sub = document.getElementById('apetece-sub');
  eyebrow.textContent = meal.slot ? `${meal.slot.name} · ${meal.slot.start}–${meal.slot.end}` : meal.label;
  sub.textContent = meal.guasa;

  const cont = document.getElementById('cuisine-options');
  cont.innerHTML = '';
  meal.cocinas.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.innerHTML = `<span class="emoji">${c.emoji}</span><span>${c.label}</span>`;
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
  const title = document.getElementById('plan-title');
  const summary = document.getElementById('plan-summary');
  const m = cita.meal, c = cita.cuisine;

  title.textContent = `${m.label} · ${c.label}`;
  const hora = cita.slot ? ` a eso de las ${cita.slot.start}` : '';
  summary.textContent = `${frase(m, c)}${hora}. Ahora busco un par de sitios que nos valgan.`;

  // reinicia estado de geolocalización
  document.getElementById('geo-status').hidden = false;
  document.getElementById('results-wrap').hidden = true;
  document.getElementById('places').innerHTML = '';
}

function frase(m, c) {
  if (m.kind === 'walk') return `Un paseo con parada en ${c.label.toLowerCase()}`;
  if (m.kind === 'drink') return `${m.label.toLowerCase()}: ${c.label.toLowerCase()}`;
  return `${m.slot.name} de ${c.label.toLowerCase()}`;
}

/* ---------- Geolocalización (solo en tu navegador) ---------- */
function pedirUbicacion() {
  const msg = document.getElementById('geo-msg');
  const btn = document.getElementById('btn-geo');

  if (!('geolocation' in navigator)) {
    msg.textContent = 'Tu navegador no sabe dónde estás. Qué misterio. 🕵️';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Localizando…';
  msg.textContent = 'Triangulando estrellas y semáforos…';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      cita.coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      document.getElementById('geo-status').hidden = true;
      document.getElementById('results-wrap').hidden = false;
      buscarSitios();
    },
    (err) => {
      btn.disabled = false;
      btn.textContent = 'Intentar de nuevo';
      msg.textContent = err.code === 1
        ? 'Sin ubicación no hay magia. Dale a "permitir" y prometo portarme bien. 🙏'
        : 'No he podido localizarte. ¿Probamos otra vez?';
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
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

  // Ampliamos el radio si no encontramos nada.
  const radios = [1500, 3000, 6000];
  let encontrados = [];

  try {
    for (const radio of radios) {
      const query = construirQuery(cita.coords, cita.cuisine.osm, radio);
      const data = await overpass(query);
      encontrados = normalizar(data.elements || []);
      if (encontrados.length >= 2) break;
    }
  } catch (e) {
    lista.innerHTML = `<li class="state-msg">Los mapas están de siesta. Inténtalo en un momento. 😴</li>`;
    return;
  }

  if (!encontrados.length) {
    lista.innerHTML = `<li class="state-msg">No encuentro ${cita.cuisine.label.toLowerCase()} por aquí.
      Igual toca improvisar (o mudarse). 🤷</li>`;
    return;
  }

  // ordena por distancia y coge los mejores
  encontrados.sort((a, b) => a.dist - b.dist);
  const top = encontrados.slice(0, 8);
  pintarLista(top);
  pintarMapa(top);
}

function normalizar(elements) {
  const out = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const nombre = el.tags?.name;
    if (lat == null || lon == null || !nombre) continue;
    out.push({
      nombre,
      lat, lon,
      dist: haversine(cita.coords.lat, cita.coords.lon, lat, lon),
      tags: el.tags,
    });
  }
  // sin duplicados por nombre
  const vistos = new Set();
  return out.filter((p) => {
    const k = p.nombre.toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

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
      `<a class="go" target="_blank" rel="noopener" ` +
      `href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}">Cómo llegar</a>`;
    lista.appendChild(li);
  });
}

/* ---------- Mapa (Leaflet) ---------- */
function iniciarMapa() {
  if (map) {
    map.setView([cita.coords.lat, cita.coords.lon], 15);
    return;
  }
  map = L.map('map', { zoomControl: true }).setView([cita.coords.lat, cita.coords.lon], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);
  capaMarcadores = L.layerGroup().addTo(map);
}

function pintarMapa(sitios) {
  capaMarcadores.clearLayers();

  // Tú (sin revelar a nadie, solo en pantalla)
  L.circleMarker([cita.coords.lat, cita.coords.lon], {
    radius: 8, color: '#46d18a', fillColor: '#46d18a', fillOpacity: 0.9, weight: 2,
  }).addTo(capaMarcadores).bindPopup('Aquí estás tú 📍');

  const bounds = [[cita.coords.lat, cita.coords.lon]];
  sitios.forEach((p, i) => {
    const icon = L.divIcon({
      className: 'pin',
      html: `<div style="background:#e9c46a;color:#2a1e07;width:26px;height:26px;border-radius:50% 50% 50% 0;` +
        `transform:rotate(-45deg);display:grid;place-items:center;font-weight:700;` +
        `box-shadow:0 3px 8px rgba(0,0,0,.4)"><span style="transform:rotate(45deg)">${i + 1}</span></div>`,
      iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
    });
    L.marker([p.lat, p.lon], { icon })
      .addTo(capaMarcadores)
      .bindPopup(`<b>${escapar(p.nombre)}</b><br>${fmtDist(p.dist)}`);
    bounds.push([p.lat, p.lon]);
  });

  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  setTimeout(() => map.invalidateSize(), 100);
}

function escapar(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* =========================================================
   Arranque
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  setupHuida();
  renderMeals();

  document.getElementById('btn-geo').addEventListener('click', pedirUbicacion);

  // botones "volver"
  document.querySelectorAll('.link-back').forEach((b) => {
    b.addEventListener('click', () => goTo(b.dataset.back));
  });
});
