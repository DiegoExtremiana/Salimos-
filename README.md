# ¿Salimos? 💌

Una página para pedir una cita con estilo (y algo de trampa). Elegante por
fuera, bromista por dentro. Estática (GitHub Pages) + **Supabase** para guardar
las respuestas. Sin Excel, sin ficheros, sin backend propio.

## Idea

- La **cara pública** es una broma (parodia de SaaS corporativo). Así la página
  queda "escondida" en tu portafolio: quien entre sin invitación solo ve el chiste.
- La **app real** aparece de dos maneras, y cada cita se etiqueta con su **categoría**:
  - **La pedí yo** (`pedida_por_mi`): abren un **enlace de invitación** (`?i=<slug>`)
    que yo he pasado; además **saluda por el nombre**: *"Oye Laura, una pregunta rapidísima"*.
  - **Me la pidieron** (`pedida_a_mi`): alguien entra en la landing, pulsa
    **"Crea tu cita"** y rellena **nombre + Instagram/teléfono** (ambos
    obligatorios). Ese contacto se guarda **cifrado** y solo se ve en el panel.

## Flujo

1. **¿Salimos?** — Botones **Sí** y **No**. El **No** huye del cursor
   deslizándose por toda la pantalla (ratón y dedo). Solo cabe el **Sí**.
2. **Vamos a…** — Desayunar, Comer, Cenar, Pasear o Tomar algo. Si es comida,
   se guarda la franja: desayuno `09:00–11:00`, comida `13:30–15:00`,
   cena `21:00–22:30`.
3. **Me apetece…** — Antojo concreto (Ramen, Sushi, Hamburguesa…); cambia según
   el plan.
4. **La cita** — Mapa con **buscador** (comunidades, ciudades, calles…). Se puede
   **dibujar un área** (círculo o rectángulo) y buscar dentro solo los sitios que
   encajan con el plan. **La ubicación es siempre opcional**: se puede cerrar la
   cita sin elegir sitio.

Todos los iconos son **SVG propios** ([js/icons.js](js/icons.js)).

## Panel de administración — `/citas`

Página **no listada** (`noindex`). Login **propio contra la base de datos**
(sin registro): usuario y contraseña viven en la tabla `usuarios` de Supabase,
con la **contraseña cifrada (bcrypt)**. El login se valida en el servidor con la
función `login_admin`, que devuelve un **token de sesión**; a partir de ahí todo
el acceso a datos pasa por funciones que exigen ese token. La contraseña **nunca**
está en el código ni viaja en claro.

Dentro (tema oscuro, estilo "Diegoncurso"):

- **Visor de la base de datos**: tabla con búsqueda, orden por columnas y
  selector "Ver: N". **Clic en una fila** → se expande y se puede **editar**
  (incluida la **nota /10** de la cita, que rellenas tú después).
- **Invitaciones**: botón flotante con un **clip 📎** → rellenas *nombre* y
  *mote* → genera la **URL personal** (`?i=slug`). Ese nombre y mote se guardan
  y viajan con las respuestas de quien contesta.

## Datos guardados (tabla `citas`)

`created_at` (cuándo se registró), `categoria` (la pedí yo / me la pidieron),
`fecha_cita` (día y hora de la cita, elegidos en el mapa), `nombre`, `mote`,
`contacto_cif` (Instagram/teléfono **cifrado**, solo landing), `salimos`,
`plan` (Vamos a), `tipo`, `franja` (horario), `antojo` (Me apetece), `sitio`,
`ubicacion`, área marcada (`area_lat/lon/radio` o `area_bbox`), `nota` (/10) y
`notas_admin`.

El contacto se cifra con `pgp_sym_encrypt` (pgcrypto). La clave vive en la tabla
`app_config` (se crea en `seed_admin.sql`, fuera del repo) y solo la usan las
funciones del servidor; el panel lo muestra descifrado tras validar el token.

> La ubicación exacta se usa **solo en el navegador** para buscar sitios.
> A la base de datos solo llega, como mucho, la **zona/ciudad** y el área que la
> persona haya marcado voluntariamente. Nunca las coordenadas del dispositivo.

## Seguridad (RLS)

La [migración](supabase/migrations/0001_init.sql) activa Row Level Security en
**todas** las tablas **sin políticas de cliente**: con la publishable key no se
puede leer ni escribir ninguna tabla directamente. Todo pasa por funciones
`SECURITY DEFINER`:

- Público: `obtener_invitacion(slug)` (resuelve **una** invitación, no lista
  todas) y `registrar_cita(...)` (inserta la respuesta). Nada más.
- Admin (exigen token de `login_admin`): `admin_citas`, `admin_actualizar_cita`,
  `admin_borrar_cita`, `admin_invitaciones`, `admin_crear_invitacion`.
- La tabla `usuarios` no es accesible desde el cliente: los hashes de contraseña
  no se pueden leer ni con la publishable key.

La `publishable key` está pensada para vivir en el navegador; la seguridad la
imponen RLS + estas funciones. La **contraseña de la base de datos** y la
connection string **no** están en el repo ni deben estarlo.

## Puesta en marcha (una vez)

1. **Esquema** — en Supabase → *SQL Editor*, pega y ejecuta
   [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql).
   (O con la CLI: `supabase link --project-ref fwdotxksqpyhsosdnbld` y `supabase db push`.)
2. **Usuario admin + clave de cifrado** — ejecuta **una vez**
   `supabase/seed_admin.sql`: crea `Diego` (contraseña bcrypt) y genera la
   **clave de cifrado** del contacto en `app_config`. Ese archivo está en
   `.gitignore`: **no se sube al repo público**. Para cambiar la contraseña,
   edita el texto entre comillas y vuelve a ejecutarlo. **No** regeneres la clave
   de cifrado o no podrás descifrar los contactos ya guardados.
   - Revisar usuarios: `select id, usuario, created_at from public.usuarios;`
3. **Pages** — *Settings → Pages → Source: GitHub Actions*. `push` a `main` y listo:
   `https://diegoextremiana.github.io/Salimos-/`
   - App (invitación): `…/Salimos-/?i=<slug>`
   - Admin: `…/Salimos-/citas/`

## Ocultar del portafolio

- La raíz muestra la **broma** salvo que haya `?i=<slug>` válido → los enlaces
  automáticos del portafolio caen en el chiste.
- Recomendado además: en GitHub, pon una **descripción de repo en tono de broma**
  y quita el enlace de *homepage* del repo.

## Ejecutar en local

`localhost` es contexto seguro (necesario para geolocalización):

```bash
# XAMPP: carpeta en htdocs → http://localhost/citasDiego/?i=PRUEBA
# o Python:
python -m http.server 8000
```

## Tecnología

- HTML + CSS + JS, sin frameworks ni build. Iconos SVG propios. Fraunces + Nunito.
- [Supabase](https://supabase.com/) (Postgres + Auth + RLS) vía `@supabase/supabase-js`.
- [Leaflet](https://leafletjs.com/) + [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw) + [OpenStreetMap](https://www.openstreetmap.org/).
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) (sitios) y
  [Nominatim](https://nominatim.org/) (buscador).

---

Que salga bien. O, como mínimo, que se coma rico.
