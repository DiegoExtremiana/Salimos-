/* =========================================================
   Configuración pública de ¿Salimos?
   La "publishable key" de Supabase está PENSADA para el navegador:
   es pública y la seguridad la imponen RLS + funciones con token en la BD.
   NO pongas aquí la contraseña de la base de datos ni ninguna clave secreta.
   ========================================================= */
window.SALIMOS_CONFIG = {
  supabaseUrl: 'https://fwdotxksqpyhsosdnbld.supabase.co',
  supabaseKey: 'sb_publishable_EwOOfmK6CHis0dGPTmxILA_Jqi22Qbk',

  /* De dónde sale la foto de perfil de quien deja su Instagram al pedir cita.
     Instagram no la sirve al navegador (CORS) y unavatar dejó su proveedor de
     Instagram en plan de pago, así que hace falta un origen que sí responda:
     pon aquí la plantilla, con {usuario} donde va la cuenta. Ejemplos:
       'https://unavatar.io/instagram/{usuario}?fallback=false&key=TU_CLAVE'
       'https://mi-endpoint.example/avatar/{usuario}'
     Debe responder la imagen con CORS abierto y un 404 si no hay foto.
     Vacío = no se busca ninguna foto (la cita se guarda igual, sin cara). */
  avatarInstagram: '',
};
