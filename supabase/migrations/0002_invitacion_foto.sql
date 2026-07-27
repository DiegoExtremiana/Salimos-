-- =========================================================
-- ¿Salimos? — foto de la invitación editable después de mandarla
-- La foto de una invitación es la foto de LA PERSONA, y es la que se usa
-- para identificar sus citas en el registro. Como muchas veces no la tienes
-- al crear el enlace, hace falta poder ponerla más tarde.
-- Aplica en Supabase (SQL Editor) o CLI: supabase db push
-- =========================================================

create or replace function public.admin_actualizar_invitacion(p_token text, p_id uuid, p_foto_url text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  update public.invitaciones set foto_url = p_foto_url where id = p_id;
end;
$$;

grant execute on function public.admin_actualizar_invitacion(text, uuid, text) to anon, authenticated;
