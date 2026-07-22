# ¿Salimos? 💌

Una página para pedir una cita con estilo (y algo de trampa).

Mandas el enlace, la otra persona responde unas preguntas y la app propone
sitios reales cerca de ella. Elegante por fuera, bromista por dentro. Cada cita
cerrada se guarda automáticamente en el propio repo (CSV + JSON) mediante una
GitHub Action — sin bases de datos externas.

## Cómo funciona

1. **¿Salimos?** — Botones **Sí** y **No**. El **No** huye del cursor por toda
   la pantalla (ratón y dedo), así que solo se puede decir **Sí**. 😏
2. **Vamos a…** — Desayunar, Comer, Cenar, Pasear o Tomar algo. Si es comida,
   se registra la franja horaria:
   - Desayuno → **09:00 – 11:00**
   - Comida → **13:30 – 15:00**
   - Cena → **21:00 – 22:30**
3. **Me apetece…** — Antojo concreto (Ramen, Sushi, Hamburguesa, Pizza, Tapas…);
   las opciones cambian según el plan.
4. **La cita** — Con permiso, se lee la ubicación **solo en el navegador** y se
   consulta OpenStreetMap para proponer **varios sitios** con mapa y distancias.
   Al elegir uno, la cita queda cerrada y se registra.

Todos los iconos son **SVG propios** (línea, sin dependencias externas), en
[js/icons.js](js/icons.js).

## Privacidad

- La ubicación exacta se usa **solo en el navegador** para preguntar a
  [Overpass / OpenStreetMap](https://overpass-api.de/) qué hay cerca. Nunca se
  envía a ningún servidor propio ni se guarda.
- En el registro se guarda, como mucho, la **ciudad** (nunca las coordenadas).
- Campos registrados: `fecha`, `salimos`, `plan`, `tipo`, `franja`, `antojo`,
  `ciudad`, `sitio`.

## Registro automático (GitHub Action, sin base de datos)

Arquitectura, todo dentro de GitHub:

```
Web (GitHub Pages)
   │  repository_dispatch  { event_type: "nueva-cita", client_payload: {...} }
   ▼
GitHub Action  (.github/workflows/registro.yml)
   │  node .github/scripts/append.js  → añade fila
   ▼
Commit automático a  data/citas.csv  +  data/citas.json
```

- La Action se ejecuta con el `GITHUB_TOKEN` integrado (no expuesto).
- Los datos quedan en [data/citas.csv](data/citas.csv),
  [data/citas.json](data/citas.json) y un **Excel** [data/citas.xlsx](data/citas.xlsx)
  (regenerado con `openpyxl` en cada registro), fáciles de abrir/analizar.

### Ver el registro: página oculta `/citas`

`citas/index.html` es una página **no listada** (nadie enlaza a ella y lleva
`noindex`). Muestra una tabla con todas las respuestas — **Fecha y hora**,
**Vamos a**, **Horario**, **Me apetece**, **Ubicación** (ciudad) y **Sitio** — y
botones para descargar el **Excel**, el CSV o el JSON.

- En Pages: `https://diegoextremiana.github.io/Salimos-/citas/`
- En local: `http://localhost/citasDiego/citas/`

> ⚠️ Como el repo es público, tanto `data/` como la página `/citas` son
> **accesibles por cualquiera que sepa la URL**. Es "oculta" (no listada), no
> "privada". Si quieres que el registro sea privado de verdad, hay que pasar el
> repo a privado (Pages privado requiere plan de pago) o usar el proxy
> serverless de la nota de seguridad. Por eso solo se guarda la ciudad, nunca
> las coordenadas.

### Puesta en marcha (una sola vez)

1. **Crear un token** de acceso *fine-grained* en GitHub
   (*Settings → Developer settings → Fine-grained tokens*):
   - **Resource owner:** tu usuario · **Repository access:** solo `Salimos-`.
   - **Permisos:** `Contents` → **Read and write** (lo mínimo para
     `repository_dispatch`).
2. **Guardarlo como Secret** del repo:
   *Settings → Secrets and variables → Actions → New repository secret*
   → nombre **`DISPATCH_TOKEN`**, valor = el token.
3. **Activar Pages vía Actions:**
   *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
4. `push` a `main` → se despliega en
   `https://diegoextremiana.github.io/Salimos-/`

El workflow [pages.yml](.github/workflows/pages.yml) inyecta el token en
`js/config.js` **durante el despliegue** (desde el Secret), así que el token
**no se sube nunca al código fuente**.

### ⚠️ Nota de seguridad (importante)

GitHub Pages es 100 % estático: para que el navegador pueda disparar la Action
hace falta un token, y ese token **queda visible en el sitio publicado**
(cualquiera que abra el `js/config.js` de la web puede leerlo).

- Por eso el token debe ser **fine-grained**, limitado a **este único repo** y
  con **solo `Contents`**. El peor caso de una filtración es que alguien haga
  commits basura en este repo; se revierte y se **revoca el token** al instante.
- Si prefieres que el token no sea público, la alternativa es un pequeño proxy
  serverless (Cloudflare Worker / Netlify Function) que guarde el token como
  secreto y llame a `repository_dispatch`. Los datos seguirían acabando en el
  repo. Dilo y lo monto.

Sin token configurado (por ejemplo en local) la app funciona igual, pero el
registro solo se muestra en la consola del navegador.

## Ejecutar en local

La geolocalización necesita contexto seguro; `localhost` cuenta:

```bash
# XAMPP: coloca la carpeta en htdocs y abre http://localhost/citasDiego/
# o con Python:
python -m http.server 8000    # http://localhost:8000
```

## Tecnología

- HTML + CSS + JavaScript, sin frameworks ni build.
- Iconos SVG propios · Fuentes Fraunces + Nunito.
- [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) para el mapa.
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) para buscar locales.
- [Nominatim](https://nominatim.org/) para la ciudad (registro).
- GitHub Actions para el registro y el despliegue.

---

Hecho con nervios y buenas intenciones.
