/* =========================================================
   Cliente Supabase compartido (window.sb).
   Requiere que antes se cargue el SDK de Supabase y js/config.js.
   ========================================================= */
(function () {
  'use strict';
  var cfg = window.SALIMOS_CONFIG || {};
  if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseKey) {
    console.warn('[db] Supabase no configurado.');
    window.sb = null;
    return;
  }
  window.sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
})();
