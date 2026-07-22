# ¿Salimos? 💌

Una página para pedir una cita con estilo (y algo de trampa). Elegante por
fuera, bromista por dentro. Estática (GitHub Pages) + **Supabase** para guardar
las respuestas. Sin Excel, sin ficheros, sin backend propio.

## Idea

- La **cara pública** es una broma (parodia de SaaS corporativo). Así la página
  queda "escondida" en tu portafolio: quien entre sin invitación solo ve el chiste.
- La **app real** aparece solo al abrir un **enlace de invitación** (`?i=<slug>`),
  que además **saluda por el nombre**: *"Oye Laura, una pregunta rapidísima"*.

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

Página **no listada** (`noindex`). Login con **Supabase Auth** (sin registro):

- Usuario: **Diego** (se traduce internamente al email de Supabase Auth).
- La contraseña la valida Supabase (guardada cifrada con bcrypt, nunca en el código).

Dentro (tema oscuro, estilo "Diegoncurso"):

- **Visor de la base de datos**: tabla con búsqueda, orden por columnas y
  selector "Ver: N". **Clic en una fila** → se expande y se puede **editar**
  (incluida la **nota /10** de la cita, que rellenas tú después).
- **Invitaciones**: botón flotante con un **clip 📎** → rellenas *nombre* y
  *mote* → genera la **URL personal** (`?i=slug`). Ese nombre y mote se guardan
  y viajan con las respuestas de quien contesta.

## Datos guardados (tabla `citas`)

`created_at` (fecha y hora), `nombre`, `mote`, `salimos`, `plan` (Vamos a),
`tipo`, `franja` (horario), `antojo` (Me apetece), `sitio`, `ubicacion`,
área marcada (`area_lat/lon/radio` o `area_bbox`), `nota` (/10) y `notas_admin`.

> La ubicación exacta se usa **solo en el navegador** para buscar sitios.
> A la base de datos solo llega, como mucho, la **zona/ciudad** y el área que la
> persona haya marcado voluntariamente. Nunca las coordenadas del dispositivo.

## Seguridad (RLS)

La [migración](supabase/migrations/0001_init.sql) activa Row Level Security:

- `citas`: **cualquiera puede INSERTAR** (contestar el formulario), pero
  **solo el admin autenticado puede LEER / EDITAR / BORRAR**. Los datos sensibles
  quedan protegidos aunque la publishable key sea pública.
- `invitaciones`: solo el admin las gestiona. El público resuelve **una** por
  slug mediante la función `obtener_invitacion` (no puede listar todas).

La `publishable key` de Supabase está pensada para vivir en el navegador; la
seguridad la impone RLS. La **contraseña de la base de datos** y la connection
string **no** están en el repo ni deben estarlo.

## Puesta en marcha (una vez)

1. **Base de datos** — en Supabase → *SQL Editor*, pega y ejecuta
   [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql).
   (O con la CLI: `supabase link --project-ref fwdotxksqpyhsosdnbld` y `supabase db push`.)
2. **Usuario admin** — *Authentication → Users → Add user*:
   - Email: `diego@salimos.app` (el que mapea el usuario "Diego" en
     [js/config.js](js/config.js)).
   - Password: la tuya.
   - *Auto Confirm User*: sí.
3. **Cerrar el registro público** — *Authentication → Providers → Email* →
   desactiva *"Allow new users to sign up"*. Así solo existe el admin.
4. **Pages** — *Settings → Pages → Source: GitHub Actions*. `push` a `main` y listo:
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
