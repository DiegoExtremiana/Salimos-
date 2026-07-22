# ¿Salimos? 💌

Una página para pedir una cita con estilo (y algo de trampa).

La idea: mandas el enlace, la otra persona responde unas preguntas y la app
propone sitios reales cerca de ella para la cita. Elegante por fuera,
bromista por dentro.

## Cómo funciona

1. **¿Salimos?** — Dos botones: **Sí** y **No**. El **No** huye siempre que te
   acercas (ratón o dedo), así que solo se puede decir que **Sí**. 😏
2. **Vamos a…** — Elige el plan: Desayunar, Comer, Cenar, Pasear o Tomar algo.
   Si es comida, se registra la franja horaria:
   - 🥐 Desayuno → **09:00 – 11:00**
   - 🍽️ Comida → **13:30 – 15:00**
   - 🌙 Cena → **21:00 – 22:30**
3. **Me apetece…** — Antojo concreto (Ramen, Sushi, Hamburguesa, Pizza, Tapas…);
   las opciones cambian según el plan.
4. **La cita** — Con permiso, se lee tu ubicación **solo en tu navegador**
   (no se envía a ningún servidor ni se le revela a nadie) y se consulta
   OpenStreetMap para proponer **varios sitios** que encajan, con mapa y
   distancias.

## Privacidad

La ubicación se usa exclusivamente en el navegador para preguntar a
[Overpass / OpenStreetMap](https://overpass-api.de/) qué hay cerca. No hay
backend, ni base de datos, ni registro. Nadie ve dónde estás.

## Tecnología

- HTML + CSS + JavaScript, sin frameworks ni build.
- [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) para el mapa.
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) para buscar locales.
- Geolocalización del navegador (requiere HTTPS).

## Ejecutar en local

Al usar geolocalización hace falta un contexto seguro. `localhost` cuenta como
seguro, así que sirve la carpeta con cualquier servidor:

```bash
# opción 1: XAMPP → colócalo en htdocs y abre http://localhost/citasDiego/
# opción 2: python
python -m http.server 8000   # luego abre http://localhost:8000
```

## Publicar en GitHub Pages

1. Sube el repo a GitHub (rama `main`).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Rama `main`, carpeta `/ (root)`. Guardar.
4. En un par de minutos estará en:
   `https://diegoextremiana.github.io/Salimos-/`

Pages sirve por HTTPS, así que la geolocalización funciona sin más. Todas las
rutas del proyecto son **relativas**, por lo que funciona bien bajo el subpath
`/Salimos-/`.

---

Hecho con nervios y buenas intenciones.
