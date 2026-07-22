/* Añade un registro de cita a data/citas.csv y data/citas.json.
   Lee el payload de la variable de entorno PAYLOAD (JSON).
   Se ejecuta dentro de la GitHub Action; usa Node del runner. */

'use strict';

const fs = require('fs');
const path = require('path');

const COLS = ['fecha', 'salimos', 'plan', 'tipo', 'franja', 'antojo', 'ciudad', 'sitio'];

let payload = {};
try { payload = JSON.parse(process.env.PAYLOAD || '{}'); } catch { payload = {}; }

// Fila saneada: solo columnas conocidas, todo a string, longitud acotada.
const row = {};
for (const c of COLS) row[c] = String(payload[c] ?? '').slice(0, 200);
if (!row.fecha) row.fecha = new Date().toISOString();

const dir = 'data';
fs.mkdirSync(dir, { recursive: true });

// --- CSV ---
const csvPath = path.join(dir, 'citas.csv');
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, COLS.join(',') + '\n');
fs.appendFileSync(csvPath, COLS.map((c) => esc(row[c])).join(',') + '\n');

// --- JSON ---
const jsonPath = path.join(dir, 'citas.json');
let arr = [];
try {
  const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (Array.isArray(parsed)) arr = parsed;
} catch { /* archivo nuevo o corrupto: empezamos de cero */ }
arr.push(row);
fs.writeFileSync(jsonPath, JSON.stringify(arr, null, 2) + '\n');

console.log('Registrado:', row);
