-- =========================================================
-- ¿Salimos? — foto de perfil de quien pide la cita
-- Si alguien deja su Instagram en la landing, la app trae su foto de perfil
-- y la manda con la cita. Así el registro le pone cara desde el primer día,
-- sin tener que buscarla y subirla a mano desde el panel.
-- Aplica en Supabase (SQL Editor) o CLI: supabase db push
-- =========================================================

-- Igual que en 0001: con dos sobrecargas vivas PostgREST no sabe a cuál
-- llamar y la cita se pierde. Se borran todas antes de crear la nueva.
do $$
declare r record;
begin
  for r in
    select 'drop function if exists public.' || p.proname ||
           '(' || pg_get_function_identity_arguments(p.oid) || ') cascade;' as stmt
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'registrar_cita'
  loop execute r.stmt; end loop;
end $$;

create or replace function public.registrar_cita(
  p_invitacion_id uuid, p_categoria text, p_nombre text, p_mote text, p_contacto text,
  p_plan text, p_tipo text, p_franja text, p_antojo text, p_fecha_cita timestamptz,
  p_sitio text, p_sitio_lat double precision, p_sitio_lon double precision, p_sitio_web text,
  p_ubicacion text, p_area_lat double precision, p_area_lon double precision,
  p_area_radio integer, p_area_bbox text, p_foto_url text
) returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  insert into public.citas
    (invitacion_id, categoria, nombre, mote, contacto_cif, salimos, plan, tipo, franja, antojo,
     fecha_cita, sitio, sitio_lat, sitio_lon, sitio_web, ubicacion, area_lat, area_lon, area_radio,
     area_bbox, foto_url)
  values
    (p_invitacion_id, p_categoria, p_nombre, p_mote, public._enc(p_contacto), 'sí', p_plan, p_tipo, p_franja, p_antojo,
     p_fecha_cita, p_sitio, p_sitio_lat, p_sitio_lon, p_sitio_web, p_ubicacion, p_area_lat, p_area_lon, p_area_radio,
     p_area_bbox, nullif(p_foto_url, ''));
end;
$$;

grant execute on function public.registrar_cita(uuid, text, text, text, text, text, text, text, text, timestamptz, text, double precision, double precision, text, text, double precision, double precision, integer, text, text) to anon, authenticated;
