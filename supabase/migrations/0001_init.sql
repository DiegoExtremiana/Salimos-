-- =========================================================
-- ¿Salimos?  —  esquema inicial
-- Login propio en la BD (usuarios + sesiones), contraseñas cifradas (bcrypt).
-- Acceso a datos SIEMPRE por funciones SECURITY DEFINER con token:
-- el cliente (publishable key) no toca las tablas directamente.
-- Aplica en Supabase (SQL Editor) o con la CLI: supabase db push
-- Luego ejecuta UNA vez supabase/seed_admin.sql para crear el usuario.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Usuarios de acceso (login) ----------
create table if not exists public.usuarios (
  id          uuid primary key default gen_random_uuid(),
  usuario     text not null unique,
  clave_hash  text not null,            -- bcrypt (pgcrypto crypt + gen_salt('bf'))
  created_at  timestamptz not null default now()
);

-- ---------- Sesiones (tokens de login, gestionadas por funciones) ----------
create table if not exists public.sesiones (
  token   text primary key,
  usuario text not null,
  creado  timestamptz not null default now(),
  expira  timestamptz not null
);

-- ---------- Invitaciones (las crea el admin) ----------
create table if not exists public.invitaciones (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  slug        text not null unique,
  nombre      text not null,
  mote        text
);

-- ---------- Citas (respuestas del formulario) ----------
create table if not exists public.citas (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),   -- fecha y hora
  invitacion_id uuid references public.invitaciones(id) on delete set null,
  nombre        text,
  mote          text,
  salimos       text default 'sí',
  plan          text,             -- "Vamos a…"
  tipo          text,             -- food / walk / drink
  franja        text,             -- horario
  antojo        text,             -- "Me apetece…"
  sitio         text,
  sitio_lat     double precision,
  sitio_lon     double precision,
  ubicacion     text,             -- zona / ciudad (opcional)
  area_lat      double precision,
  area_lon      double precision,
  area_radio    integer,
  area_bbox     text,
  nota          smallint check (nota is null or (nota >= 0 and nota <= 10)),
  notas_admin   text
);
create index if not exists citas_created_idx on public.citas (created_at desc);

-- ---------- Seguridad: RLS activada y SIN políticas de cliente ----------
-- (nadie accede a las tablas con la publishable key; solo las funciones definer)
alter table public.usuarios     enable row level security;
alter table public.sesiones     enable row level security;
alter table public.invitaciones enable row level security;
alter table public.citas        enable row level security;

revoke all on public.usuarios     from anon, authenticated;
revoke all on public.sesiones     from anon, authenticated;
revoke all on public.invitaciones from anon, authenticated;
revoke all on public.citas        from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- =========================================================
-- Funciones internas
-- =========================================================

-- Devuelve el usuario dueño de un token válido (o NULL). No se expone a clientes.
create or replace function public.sesion_usuario(p_token text)
returns text
language sql security definer set search_path = public
as $$
  select usuario from public.sesiones where token = p_token and expira > now();
$$;

-- =========================================================
-- Login / logout
-- =========================================================

create or replace function public.login_admin(p_usuario text, p_clave text)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_hash text; v_token text;
begin
  select clave_hash into v_hash from public.usuarios where lower(usuario) = lower(p_usuario);
  if v_hash is null or crypt(p_clave, v_hash) <> v_hash then
    perform pg_sleep(0.4);   -- freno básico anti-fuerza-bruta
    return null;
  end if;
  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.sesiones (token, usuario, expira)
  values (v_token, p_usuario, now() + interval '30 days');
  -- limpieza de sesiones caducadas
  delete from public.sesiones where expira < now();
  return v_token;
end;
$$;

create or replace function public.logout_admin(p_token text)
returns void
language sql security definer set search_path = public
as $$ delete from public.sesiones where token = p_token; $$;

-- =========================================================
-- Público: resolver invitación y registrar cita
-- =========================================================

create or replace function public.obtener_invitacion(p_slug text)
returns table (id uuid, nombre text, mote text)
language sql security definer set search_path = public
as $$
  select id, nombre, mote from public.invitaciones where slug = p_slug limit 1;
$$;

create or replace function public.registrar_cita(
  p_invitacion_id uuid, p_nombre text, p_mote text, p_plan text, p_tipo text,
  p_franja text, p_antojo text, p_sitio text, p_sitio_lat double precision,
  p_sitio_lon double precision, p_ubicacion text, p_area_lat double precision,
  p_area_lon double precision, p_area_radio integer, p_area_bbox text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.citas
    (invitacion_id, nombre, mote, salimos, plan, tipo, franja, antojo, sitio,
     sitio_lat, sitio_lon, ubicacion, area_lat, area_lon, area_radio, area_bbox)
  values
    (p_invitacion_id, p_nombre, p_mote, 'sí', p_plan, p_tipo, p_franja, p_antojo, p_sitio,
     p_sitio_lat, p_sitio_lon, p_ubicacion, p_area_lat, p_area_lon, p_area_radio, p_area_bbox);
end;
$$;

-- =========================================================
-- Admin (requieren token válido)
-- =========================================================

create or replace function public.admin_citas(p_token text)
returns setof public.citas
language plpgsql security definer set search_path = public
as $$
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  return query select * from public.citas order by created_at desc;
end;
$$;

create or replace function public.admin_actualizar_cita(p_token text, p_id uuid, p_nota smallint, p_notas text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  update public.citas set nota = p_nota, notas_admin = p_notas where id = p_id;
end;
$$;

create or replace function public.admin_borrar_cita(p_token text, p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  delete from public.citas where id = p_id;
end;
$$;

create or replace function public.admin_invitaciones(p_token text)
returns setof public.invitaciones
language plpgsql security definer set search_path = public
as $$
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  return query select * from public.invitaciones order by created_at desc;
end;
$$;

create or replace function public.admin_crear_invitacion(p_token text, p_slug text, p_nombre text, p_mote text)
returns public.invitaciones
language plpgsql security definer set search_path = public
as $$
declare v_row public.invitaciones;
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  insert into public.invitaciones (slug, nombre, mote)
  values (p_slug, p_nombre, nullif(p_mote, '')) returning * into v_row;
  return v_row;
end;
$$;

-- =========================================================
-- Permisos de ejecución (el cliente usa la publishable key = rol anon)
-- sesion_usuario NO se concede: solo la usan las funciones definer.
-- =========================================================
grant execute on function public.login_admin(text, text)                         to anon, authenticated;
grant execute on function public.logout_admin(text)                              to anon, authenticated;
grant execute on function public.obtener_invitacion(text)                        to anon, authenticated;
grant execute on function public.registrar_cita(uuid, text, text, text, text, text, text, text, double precision, double precision, text, double precision, double precision, integer, text) to anon, authenticated;
grant execute on function public.admin_citas(text)                               to anon, authenticated;
grant execute on function public.admin_actualizar_cita(text, uuid, smallint, text) to anon, authenticated;
grant execute on function public.admin_borrar_cita(text, uuid)                   to anon, authenticated;
grant execute on function public.admin_invitaciones(text)                        to anon, authenticated;
grant execute on function public.admin_crear_invitacion(text, text, text, text)  to anon, authenticated;
