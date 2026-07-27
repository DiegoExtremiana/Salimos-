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
  categoria: null,       // 'pedida_por_mi' (invitación) | 'pedida_a_mi' (landing)
  contacto: '',          // Instagram/teléfono (solo flujo landing)
  fechaCita: null,       // día y hora de la cita (ISO)
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
  { id: 'bakery',  label: 'Dulce',          osm: { shop: 'bakery|pastry' } },
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
    cita.categoria = 'pedida_por_mi';   // yo pasé el enlace
    cita.nombre = inv.nombre || '';
    cita.mote = inv.mote || '';
    return true;
  } catch { return false; }
}

function revelarApp() {
  const nombre = (cita.nombre || '').trim();
  document.getElementById('salimos-ask').textContent = nombre
    ? `Oye ${nombre}, ¿quieres tener una cita inolvidable conmigo?`
    : '¡Hola! ¿Quieres tener una cita inolvidable conmigo?';
  document.getElementById('salimos-eyebrow').textContent = 'una pregunta rapidísima';
  goTo('screen-salimos');
}

/* Foto de perfil de quien pide la cita. Se pide en cuanto deja su Instagram
   —no al cerrar la cita— para que esté lista mucho antes de guardarla y no
   haga esperar a nadie. Si no deja Instagram, se queda en null. */
let fotoContacto = null;
function pedirFotoDeContacto(contacto) {
  fotoContacto = window.fotoDeInstagram
    ? window.fotoDeInstagram(contacto).catch(() => null)
    : null;
}

function setupBroma() {
  // "¿Quedamos?": alguien pide cita sin invitación
  const form = document.getElementById('crear-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('crear-nombre').value.trim();
    const contacto = document.getElementById('crear-contacto').value.trim();
    if (!nombre || !contacto) return;   // ambos obligatorios
    cita.categoria = 'pedida_a_mi';     // me la piden a mí
    cita.nombre = nombre;
    cita.contacto = contacto;
    pedirFotoDeContacto(contacto);
    revelarApp();
  });
}

/* ========================= Pantalla 1 — "No" que huye ========================= */
const LABELS_NO = ['No', '¿Seguro?', 'Piénsalo', 'Nop', 'Casi', 'Ni de broma', 'Insiste', 'Que no 😅'];
let noHits = 0, roaming = false, respondido = false;

function setupHuida() {
  const btnNo = document.getElementById('btn-no');
  const btnSi = document.getElementById('btn-si');
  const casaBtnNo = btnNo.parentElement;   // dónde vive de normal, dentro de #screen-salimos
  const UMBRAL = 120;
  const PAD = 14;

  // Tamaño de pantalla real (visualViewport evita sorpresas con teclado/barra del navegador)
  function tamPantalla() {
    const vv = window.visualViewport;
    return vv ? { w: vv.width, h: vv.height } : { w: window.innerWidth, h: window.innerHeight };
  }

  // Límites según la huella YA GIRADA del botón: un botón rotado ocupa más
  // que su ancho/alto sin girar, así que el límite tiene que contar con eso
  // o la esquina se saldría de la pantalla (y con ella, el scroll).
  function limites(w, h, deg) {
    const rad = Math.abs(deg) * Math.PI / 180;
    const bw = w * Math.cos(rad) + h * Math.sin(rad);
    const bh = w * Math.sin(rad) + h * Math.cos(rad);
    const exX = (bw - w) / 2, exY = (bh - h) / 2;
    const { w: vw, h: vh } = tamPantalla();
    const minX = PAD + exX, minY = PAD + exY;
    return {
      minX, minY,
      maxX: Math.max(minX, vw - w - PAD - exX),
      maxY: Math.max(minY, vh - h - PAD - exY),
    };
  }

  function fijar() {
    if (roaming) return;
    const r = btnNo.getBoundingClientRect();
    // .card usa backdrop-filter y .screen usa transform: ambos crean un
    // "contenedor" propio para position:fixed, así que top/left dejarían de
    // ser relativos a la pantalla real. Sacamos el botón al body para que
    // "fixed" sea de verdad relativo al viewport.
    document.body.appendChild(btnNo);
    btnNo.style.position = 'fixed';
    btnNo.style.margin = '0';
    btnNo.style.left = r.left + 'px';
    btnNo.style.top = r.top + 'px';
    roaming = true;
  }

  function anguloActual() {
    const m = /rotate\(([-\d.]+)deg\)/.exec(btnNo.style.transform);
    return m ? +m[1] : 0;
  }

  function saltar(px, py) {
    // Entre pulsar "Sí" y que cambie de pantalla hay 450ms de margen (corazones);
    // si el ratón se mueve cerca del "No" en ese hueco, sin esto volvería a huir
    // (y a re-engancharse al body) justo después de haberlo devuelto a su sitio.
    if (respondido) return;
    fijar();
    noHits++;
    const span = btnNo.querySelector('span'); if (span) span.style.display = 'none';
    btnNo.childNodes.forEach((n) => { if (n.nodeType === 3) n.textContent = ''; });
    btnNo.appendChild(document.createTextNode(LABELS_NO[Math.min(noHits, LABELS_NO.length - 1)]));

    const deg = +(Math.random() * 16 - 8).toFixed(1);
    const w = btnNo.offsetWidth, h = btnNo.offsetHeight;
    const { minX, minY, maxX, maxY } = limites(w, h, deg);

    const r = btnNo.getBoundingClientRect();
    const cx = r.left + w / 2, cy = r.top + h / 2;
    let dx = cx - px, dy = cy - py, dist = Math.hypot(dx, dy) || 1;
    let nx = cx + (dx / dist) * 190 - w / 2, ny = cy + (dy / dist) * 190 - h / 2;
    nx = Math.max(minX, Math.min(maxX, nx));
    ny = Math.max(minY, Math.min(maxY, ny));
    if (Math.hypot(nx + w / 2 - px, ny + h / 2 - py) < UMBRAL) {
      nx = minX + Math.random() * (maxX - minX);
      ny = minY + Math.random() * (maxY - minY);
    }
    btnNo.style.left = nx + 'px';
    btnNo.style.top = ny + 'px';
    btnNo.style.transform = `rotate(${deg}deg)`;
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
  btnSi.addEventListener('click', () => {
    respondido = true;   // ya no huye más, ni aunque el ratón pase cerca antes de cambiar de pantalla
    lanzarCorazones();
    // Aquí se acaba la huida: el botón vive en <body> mientras huye, así que
    // si no lo devolvemos a su sitio se quedaría visible en las pantallas
    // siguientes (no desaparece solo con cambiar de pantalla).
    if (roaming) {
      casaBtnNo.appendChild(btnNo);
      btnNo.style.position = '';
      btnNo.style.left = '';
      btnNo.style.top = '';
      btnNo.style.margin = '';
      btnNo.style.transform = '';
      const span = btnNo.querySelector('span'); if (span) span.style.display = '';
      btnNo.childNodes.forEach((n) => { if (n.nodeType === 3) n.textContent = ''; });
      btnNo.appendChild(document.createTextNode('No'));
      noHits = 0;
      roaming = false;
    }
    setTimeout(() => goTo('screen-vamos'), 450);
  });

  // Rotar el móvil, abrir el teclado, redimensionar la ventana: reencaja sin dejarlo fuera
  function reencajar() {
    if (!roaming) return;
    const r = btnNo.getBoundingClientRect();
    const { minX, minY, maxX, maxY } = limites(r.width, r.height, anguloActual());
    btnNo.style.left = Math.max(minX, Math.min(maxX, r.left)) + 'px';
    btnNo.style.top = Math.max(minY, Math.min(maxY, r.top)) + 'px';
  }
  window.addEventListener('resize', reencajar);
  window.visualViewport?.addEventListener('resize', reencajar);
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
  configurarCuando();

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
      rectangle: { shapeOptions: { color: '#d3b06a', weight: 2 } },
      circle: { shapeOptions: { color: '#d3b06a', weight: 2 } },
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
      L.circleMarker([lat, lon], { radius: 7, color: '#d3b06a', fillColor: '#e4c78a', fillOpacity: .9, weight: 2 })
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
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
// Lanza la consulta a todos los mirrors a la vez y devuelve el PRIMERO que
// responde bien (rápido + fiable). Aborta los demás y corta si nadie contesta.
// Los mirrors públicos (gratis, sin garantías) a veces dan 504 sueltos bajo
// carga: un intento con reintento automático hace que funcione a la primera
// casi siempre, sin que el usuario tenga que pulsar "buscar" otra vez.
async function overpass(query, { timeoutMs = 13000, intentos: maxIntentos = 2, onReintento } = {}) {
  let ultimoError;
  for (let intento = 1; intento <= maxIntentos; intento++) {
    const controllers = OVERPASS.map(() => new AbortController());
    const timer = setTimeout(() => controllers.forEach((c) => c.abort()), timeoutMs);
    const peticiones = OVERPASS.map((url, i) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: controllers[i].signal,
      }).then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
    );
    try {
      return await Promise.any(peticiones);
    } catch (e) {
      ultimoError = e;
      controllers.forEach((c) => c.abort());   // cancela los que sigan en vuelo
      if (intento < maxIntentos) { onReintento?.(); await new Promise((r) => setTimeout(r, 900)); }
    } finally {
      clearTimeout(timer);
    }
  }
  throw ultimoError;
}

let buscando = false;
async function buscarSitios() {
  if (buscando) return;                       // evita búsquedas solapadas
  const lista = document.getElementById('places');
  const btn = document.getElementById('btn-buscar');
  buscando = true;
  btn.classList.add('loading');
  document.getElementById('results-wrap').hidden = false;
  document.getElementById('done').hidden = true;
  lista.innerHTML = `<li class="state-msg loading-msg">Rastreando ${escapar(cita.cuisine.label.toLowerCase())} en la zona…</li>`;

  const filtro = construirFiltro(cita.cuisine.osm);
  let query, centro;
  if (cita.area && cita.area.type === 'circle') {
    const { lat, lon, radio } = cita.area; centro = { lat, lon };
    query = `[out:json][timeout:25];(node${filtro}(around:${radio},${lat},${lon});way${filtro}(around:${radio},${lat},${lon}););out center 60;`;
  } else if (cita.area && cita.area.type === 'rect') {
    query = `[out:json][timeout:25];(node${filtro}(${cita.area.bbox});way${filtro}(${cita.area.bbox}););out center 60;`;
    centro = cita.center;
  } else {
    // Sin área dibujada: buscamos en un radio acotado alrededor del centro del
    // mapa (media diagonal del viewport, entre 800 m y 12 km). Así la consulta
    // siempre está limitada y Overpass responde rápido aunque el mapa esté lejos.
    const b = map.getBounds();
    const c = map.getCenter();
    centro = { lat: c.lat, lon: c.lng };
    let radio = Math.round(haversine(c.lat, c.lng, b.getNorth(), b.getEast()));
    radio = Math.min(12000, Math.max(800, radio || 3000));
    query = `[out:json][timeout:25];(node${filtro}(around:${radio},${c.lat},${c.lng});way${filtro}(around:${radio},${c.lat},${c.lng}););out center 60;`;
  }
  cita.center = centro;

  try {
    const data = await overpass(query, {
      onReintento: () => { lista.innerHTML = `<li class="state-msg loading-msg">Casi... reintentando la búsqueda…</li>`; },
    });
    const sitios = normalizar(data.elements || [], centro);
    if (!sitios.length) {
      lista.innerHTML = `<li class="state-msg">No encuentro ${escapar(cita.cuisine.label.toLowerCase())} en esa zona. Amplía el área o mueve el mapa.</li>`;
      return;
    }
    sitios.sort((a, b) => a.dist - b.dist);
    const top = sitios.slice(0, 10);
    pintarLista(top);
    pintarMapa(top, centro);
  } catch {
    lista.innerHTML = `<li class="state-msg">Los mapas están de siesta. Prueba otra vez en un momento.</li>`;
  } finally {
    buscando = false;
    btn.classList.remove('loading');
  }
}

// Web o catálogo del sitio, si OSM la trae (varios nombres de etiqueta posibles)
function extraerWeb(tags) {
  if (!tags) return null;
  const claves = ['website', 'contact:website', 'website:menu', 'menu', 'url'];
  for (const k of claves) { if (tags[k]) return tags[k]; }
  return null;
}
function normalizar(elements, centro) {
  const out = [], vistos = new Set();
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon, nombre = el.tags?.name;
    if (lat == null || lon == null || !nombre) continue;
    const k = nombre.toLowerCase(); if (vistos.has(k)) continue; vistos.add(k);
    out.push({ nombre, lat, lon, tags: el.tags, web: extraerWeb(el.tags), dist: centro ? haversine(centro.lat, centro.lon, lat, lon) : 0 });
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
  if (centro) L.circleMarker([centro.lat, centro.lon], { radius: 6, color: '#7d1f30', fillColor: '#7d1f30', fillOpacity: .6, weight: 1 }).addTo(capaMarcadores);
  const bounds = [];
  sitios.forEach((p, i) => {
    const icon = L.divIcon({
      className: 'pin',
      html: `<div style="background:#d3b06a;color:#241a0c;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:grid;place-items:center;font-weight:800;box-shadow:0 3px 8px rgba(0,0,0,.5)"><span style="transform:rotate(45deg)">${i + 1}</span></div>`,
      iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
    });
    L.marker([p.lat, p.lon], { icon }).addTo(capaMarcadores).bindPopup(`<b>${escapar(p.nombre)}</b>${p.dist ? '<br>' + fmtDist(p.dist) : ''}`);
    bounds.push([p.lat, p.lon]);
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  setTimeout(() => map.invalidateSize(), 80);
}

/* ========================= ¿Cuándo? (nunca en el pasado) =========================
   Una cita se pide para más adelante, así que el día no puede ser anterior a
   hoy y, si es hoy, la hora no puede haber pasado ya. El campo sigue siendo
   opcional: sin día no hay nada que validar. */
function ymdLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function hmLocal(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function cuandoEsPasado() {
  const fecha = document.getElementById('cita-fecha').value;
  if (!fecha) return false;
  const hora = document.getElementById('cita-hora').value;
  const ahora = new Date();
  if (!hora) return fecha < ymdLocal(ahora);          // solo día: basta comparar el día
  const d = new Date(`${fecha}T${hora}`);
  if (isNaN(d)) return false;
  return d.getTime() < ahora.getTime() - 60000;        // un minuto de margen
}
function avisoCuando(texto) {
  const el = document.getElementById('cuando-error');
  el.textContent = texto;
  el.hidden = !texto;
}
/* Refresca los mínimos: se llama al entrar al paso del mapa, porque "hoy" y
   "ahora" cambian si la pestaña se queda abierta. */
function configurarCuando() {
  document.getElementById('cita-fecha').min = ymdLocal(new Date());
  validarCuando();
}
function validarCuando() {
  const fechaInput = document.getElementById('cita-fecha');
  const horaInput = document.getElementById('cita-hora');
  const ahora = new Date();
  const hoy = ymdLocal(ahora);
  let aviso = '';

  if (fechaInput.value && fechaInput.value < hoy) {
    fechaInput.value = hoy;
    aviso = 'Ese día ya pasó: lo he puesto en hoy.';
  }
  horaInput.min = fechaInput.value === hoy ? hmLocal(ahora) : '';
  if (cuandoEsPasado()) aviso = 'Esa hora ya pasó. Elige una más tarde o cambia de día.';
  avisoCuando(aviso);
  return !cuandoEsPasado();
}

/* ========================= Cierre + guardado en Supabase ========================= */
async function cerrarCita(place) {
  // Puerta final: si el día u hora elegidos ya pasaron, no se cierra nada.
  if (!validarCuando()) {
    document.getElementById('cuando-error').scrollIntoView({ block: 'center', behavior: 'smooth' });
    document.getElementById('cita-hora').focus();
    return;
  }
  const m = cita.meal, c = cita.cuisine;
  document.getElementById('map-stage').hidden = true;
  document.getElementById('results-wrap').hidden = true;

  // fecha y hora de la cita (elegidas en el paso del mapa): si la invitada
  // puso una hora concreta, manda SIEMPRE por delante de la franja por defecto
  // del plan (antes se ignoraba y se guardaba/mostraba siempre la de serie).
  const fechaVal = document.getElementById('cita-fecha').value;
  const horaVal = document.getElementById('cita-hora').value;
  let fechaCita = null;
  if (fechaVal) { const d = new Date(`${fechaVal}T${horaVal || '00:00'}`); if (!isNaN(d)) fechaCita = d.toISOString(); }
  const horaFinal = horaVal || (cita.slot ? cita.slot.start : '');

  const done = document.getElementById('done');
  done.hidden = false;
  document.getElementById('done-title').textContent = '¡Cita cerrada!';
  const cuando = cita.slot ? ` (${cita.slot.name.toLowerCase()}, ${horaFinal})` : (horaFinal ? ` (a las ${horaFinal})` : '');
  const sitioTxt = place ? ` en ${place.nombre}` : '';
  document.getElementById('done-text').textContent = `${m.label} de ${c.label.toLowerCase()}${sitioTxt}${cuando}. Nos vemos ✨`;
  pintarIconos(done);
  lanzarCorazones();

  // La foto de su Instagram se pidió al empezar; si aún viene en camino le
  // damos un par de segundos y, si no llega, la cita se guarda igual sin ella.
  const foto = await Promise.race([
    Promise.resolve(fotoContacto).catch(() => null),
    new Promise((r) => setTimeout(() => r(null), 2000)),
  ]);

  const params = {
    p_invitacion_id: cita.invitacionId,
    p_categoria: cita.categoria || null,
    p_nombre: cita.nombre || null,
    p_mote: cita.mote || null,
    p_contacto: cita.contacto || null,
    p_plan: m.label,
    p_tipo: m.kind,
    p_franja: horaVal ? horaVal : (cita.slot ? `${cita.slot.start}-${cita.slot.end}` : ''),
    p_antojo: c.label,
    p_fecha_cita: fechaCita,
    p_sitio: place ? place.nombre : null,
    p_sitio_lat: place ? place.lat : null,
    p_sitio_lon: place ? place.lon : null,
    p_sitio_web: place ? place.web : null,
    p_ubicacion: cita.ubicacionLabel || '',
    p_area_lat: cita.area && cita.area.type === 'circle' ? cita.area.lat : null,
    p_area_lon: cita.area && cita.area.type === 'circle' ? cita.area.lon : null,
    p_area_radio: cita.area && cita.area.type === 'circle' ? cita.area.radio : null,
    p_area_bbox: cita.area && cita.area.type === 'rect' ? cita.area.bbox : null,
    p_foto_url: foto,
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
  document.getElementById('cita-fecha').addEventListener('change', validarCuando);
  document.getElementById('cita-hora').addEventListener('change', validarCuando);
  document.querySelectorAll('.link-back').forEach((b) => { if (b.dataset.back) b.addEventListener('click', () => goTo(b.dataset.back)); });

  // Puerta: resolvemos la invitación ANTES de pintar nada. Así, si el enlace es
  // válido, se entra directo a la cita sin que parpadee primero la broma.
  // (Mientras tanto se ve el splash; al decidir, quitamos 'booting' y aparece.)
  const ok = await resolverInvitacion();
  if (ok) revelarApp();
  else goTo('screen-broma');
  document.body.classList.remove('booting');
});

/* ---------- PWA (instalable, pantalla completa en móvil) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
