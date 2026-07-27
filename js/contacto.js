/* =========================================================
   Contacto: Instagram
   Quien pide cita desde la landing deja su Instagram o su teléfono. Si es
   Instagram, de ahí sale su foto de perfil (y el enlace a su perfil en el
   panel), así que el reconocimiento del usuario vive aquí, compartido entre
   la app y el panel para que las dos entiendan lo mismo por "Instagram".
   ========================================================= */
(function () {
  'use strict';

  /* Acepta "@laura", "laura", "instagram.com/laura" o la URL entera.
     Un teléfono (solo dígitos y signos) NO es un usuario de Instagram. */
  function usuarioInstagram(contacto) {
    const texto = String(contacto || '').trim();
    if (!texto) return null;
    const enlace = texto.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
    const usuario = enlace ? enlace[1] : texto.replace(/^@/, '');
    if (!/^[A-Za-z0-9._]{2,30}$/.test(usuario)) return null;
    if (!/[A-Za-z]/.test(usuario)) return null;
    return usuario.toLowerCase();
  }

  function urlPerfilInstagram(usuario) { return `https://www.instagram.com/${usuario}/`; }

  /* Instagram no sirve la foto de perfil al navegador (CORS), así que hace
     falta un origen intermedio que sí la devuelva. Cuál es se configura en
     js/config.js (avatarInstagram), porque el que valga hoy puede no valer
     mañana: unavatar, por ejemplo, pasó su proveedor de Instagram a plan de
     pago. Sin configurar, no se busca foto y la cita se guarda igual. */
  function urlAvatar(usuario) {
    const plantilla = (window.SALIMOS_CONFIG || {}).avatarInstagram;
    if (!plantilla) return null;
    return plantilla.replace('{usuario}', encodeURIComponent(usuario));
  }

  function blobADataUrl(blob) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result);
      lector.onerror = () => reject(lector.error);
      lector.readAsDataURL(blob);
    });
  }

  /* Devuelve la foto como data URL (queda congelada en la BD: ni depende del
     servicio ni cambia si la persona cambia su avatar) o null si no hay.
     Si la petición no llega a completarse —CORS, red— devolvemos la URL: una
     etiqueta <img> sí puede pintarla aunque fetch no haya podido leerla. */
  async function fotoDeInstagram(contacto, { timeoutMs = 7000, maxBytes = 900000 } = {}) {
    const usuario = usuarioInstagram(contacto);
    if (!usuario) return null;
    const url = urlAvatar(usuario);
    if (!url) return null;
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: control.signal });
      if (!res.ok) return null;                       // 404: esa cuenta no tiene foto pública
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) return null;
      if (blob.size > maxBytes) return url;           // demasiado grande para meterla en la fila
      return await blobADataUrl(blob);
    } catch {
      return control.signal.aborted ? null : url;
    } finally {
      clearTimeout(reloj);
    }
  }

  window.usuarioInstagram = usuarioInstagram;
  window.urlPerfilInstagram = urlPerfilInstagram;
  window.fotoDeInstagram = fotoDeInstagram;
})();
