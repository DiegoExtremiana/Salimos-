-- =========================================================
-- ¿Salimos? — sesión de admin persistente en el móvil
-- El panel se instala como PWA y se usa desde el teléfono, donde volver a
-- teclear la contraseña cada mes es un estorbo. La sesión pasa a durar 180
-- días y se renueva cada vez que se entra con el token guardado (ventana
-- deslizante), así que solo caduca si se deja de usar medio año.
-- Aplica en Supabase (SQL Editor) o CLI: supabase db push
-- =========================================================

-- Login: misma firma, solo cambia la caducidad que se le pone a la sesión.
create or replace function public.login_admin(p_usuario text, p_clave text)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare v_hash text; v_token text;
begin
  select clave_hash into v_hash from public.usuarios where lower(usuario) = lower(p_usuario);
  if v_hash is null or crypt(p_clave, v_hash) <> v_hash then
    perform pg_sleep(0.4);
    return null;
  end if;
  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.sesiones (token, usuario, expira) values (v_token, p_usuario, now() + interval '180 days');
  delete from public.sesiones where expira < now();
  return v_token;
end;
$$;

-- Renovación: solo alarga una sesión que TODAVÍA es válida, así un token
-- caducado no revive.
create or replace function public.admin_renovar_sesion(p_token text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  update public.sesiones
     set expira = now() + interval '180 days'
   where token = p_token and expira > now();
end;
$$;

grant execute on function public.admin_renovar_sesion(text) to anon, authenticated;
