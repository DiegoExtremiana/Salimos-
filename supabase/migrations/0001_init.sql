-- =========================================================
-- ¿Salimos?  —  esquema inicial
-- Login propio en la BD (usuarios + sesiones), contraseñas cifradas (bcrypt).
-- Datos de contacto de quien pide cita: cifrados en reposo (pgp_sym).
-- Acceso a datos SIEMPRE por funciones SECURITY DEFINER con token.
-- Aplica en Supabase (SQL Editor) o CLI: supabase db push
-- Luego ejecuta UNA vez supabase/seed_admin.sql (usuario admin + clave de cifrado).
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Configuración secreta (clave de cifrado) ----------
create table if not exists public.app_config (
  enc_key text
);

-- ---------- Usuarios de acceso (login) ----------
create table if not exists public.usuarios (
  id          uuid primary key default gen_random_uuid(),
  usuario     text not null unique,
  clave_hash  text not null,            -- bcrypt
  created_at  timestamptz not null default now()
);

-- ---------- Sesiones (tokens de login) ----------
create table if not exists public.sesiones (
  token   text primary key,
  usuario text not null,
  creado  timestamptz not null default now(),
  expira  timestamptz not null
);

-- ---------- Invitaciones ----------
create table if not exists public.invitaciones (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  slug        text not null unique,
  nombre      text not null,
  mote        text
);

-- ---------- Citas ----------
create table if not exists public.citas (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),   -- cuándo se registró
  invitacion_id uuid references public.invitaciones(id) on delete set null,
  categoria     text,                 -- 'pedida_por_mi' | 'pedida_a_mi'
  nombre        text,
  mote          text,
  contacto_cif  bytea,                -- Instagram/teléfono CIFRADO (solo landing)
  salimos       text default 'sí',
  plan          text,
  tipo          text,
  franja        text,
  antojo        text,
  fecha_cita    timestamptz,          -- día y hora de la cita (al elegir zona)
  sitio         text,
  sitio_lat     double precision,
  sitio_lon     double precision,
  ubicacion     text,
  area_lat      double precision,
  area_lon      double precision,
  area_radio    integer,
  area_bbox     text,
  nota          smallint check (nota is null or (nota >= 0 and nota <= 10)),
  notas_admin   text
);
-- columnas añadidas si la tabla ya existía de antes
alter table public.citas add column if not exists categoria    text;
alter table public.citas add column if not exists contacto_cif bytea;
alter table public.citas add column if not exists fecha_cita   timestamptz;
create index if not exists citas_created_idx on public.citas (created_at desc);

-- ---------- RLS: activada y SIN políticas de cliente ----------
alter table public.app_config    enable row level security;
alter table public.usuarios      enable row level security;
alter table public.sesiones      enable row level security;
alter table public.invitaciones  enable row level security;
alter table public.citas         enable row level security;

revoke all on public.app_config    from anon, authenticated;
revoke all on public.usuarios      from anon, authenticated;
revoke all on public.sesiones      from anon, authenticated;
revoke all on public.invitaciones  from anon, authenticated;
revoke all on public.citas         from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- =========================================================
-- Cifrado de contacto (clave en app_config, nunca en el repo)
-- =========================================================
create or replace function public._enc(p text)
returns bytea
language plpgsql security definer set search_path = public, extensions
as $$
declare k text;
begin
  if p is null or p = '' then return null; end if;
  select enc_key into k from public.app_config limit 1;
  if k is null then return convert_to(p, 'utf8'); end if;   -- sin clave: guarda tal cual (fallback)
  return pgp_sym_encrypt(p, k);
end;
$$;

create or replace function public._dec(p bytea)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare k text;
begin
  if p is null then return null; end if;
  select enc_key into k from public.app_config limit 1;
  if k is null then return convert_from(p, 'utf8'); end if;
  begin
    return pgp_sym_decrypt(p, k);
  exception when others then
    return convert_from(p, 'utf8');   -- por si se guardó sin cifrar
  end;
end;
$$;

-- =========================================================
-- Sesión
-- =========================================================
create or replace function public.sesion_usuario(p_token text)
returns text
language sql security definer set search_path = public, extensions
as $$
  select usuario from public.sesiones where token = p_token and expira > now();
$$;

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
  insert into public.sesiones (token, usuario, expira) values (v_token, p_usuario, now() + interval '30 days');
  delete from public.sesiones where expira < now();
  return v_token;
end;
$$;

create or replace function public.logout_admin(p_token text)
returns void
language sql security definer set search_path = public, extensions
as $$ delete from public.sesiones where token = p_token; $$;

-- =========================================================
-- Público: resolver invitación y registrar cita
-- =========================================================
create or replace function public.obtener_invitacion(p_slug text)
returns table (id uuid, nombre text, mote text)
language sql security definer set search_path = public, extensions
as $$
  select id, nombre, mote from public.invitaciones where slug = p_slug limit 1;
$$;

drop function if exists public.registrar_cita(uuid, text, text, text, text, text, text, text, double precision, double precision, text, double precision, double precision, integer, text);

create or replace function public.registrar_cita(
  p_invitacion_id uuid, p_categoria text, p_nombre text, p_mote text, p_contacto text,
  p_plan text, p_tipo text, p_franja text, p_antojo text, p_fecha_cita timestamptz,
  p_sitio text, p_sitio_lat double precision, p_sitio_lon double precision,
  p_ubicacion text, p_area_lat double precision, p_area_lon double precision,
  p_area_radio integer, p_area_bbox text
) returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  insert into public.citas
    (invitacion_id, categoria, nombre, mote, contacto_cif, salimos, plan, tipo, franja, antojo,
     fecha_cita, sitio, sitio_lat, sitio_lon, ubicacion, area_lat, area_lon, area_radio, area_bbox)
  values
    (p_invitacion_id, p_categoria, p_nombre, p_mote, public._enc(p_contacto), 'sí', p_plan, p_tipo, p_franja, p_antojo,
     p_fecha_cita, p_sitio, p_sitio_lat, p_sitio_lon, p_ubicacion, p_area_lat, p_area_lon, p_area_radio, p_area_bbox);
end;
$$;

-- =========================================================
-- Admin (requieren token). admin_citas devuelve JSON con el contacto descifrado.
-- =========================================================
drop function if exists public.admin_citas(text);

create or replace function public.admin_citas(p_token text)
returns setof jsonb
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  return query
    select (to_jsonb(c) - 'contacto_cif') || jsonb_build_object('contacto', public._dec(c.contacto_cif))
    from public.citas c
    order by c.created_at desc;
end;
$$;

create or replace function public.admin_actualizar_cita(p_token text, p_id uuid, p_nota smallint, p_notas text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  update public.citas set nota = p_nota, notas_admin = p_notas where id = p_id;
end;
$$;

create or replace function public.admin_borrar_cita(p_token text, p_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  delete from public.citas where id = p_id;
end;
$$;

create or replace function public.admin_invitaciones(p_token text)
returns setof public.invitaciones
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  return query select * from public.invitaciones order by created_at desc;
end;
$$;

create or replace function public.admin_crear_invitacion(p_token text, p_slug text, p_nombre text, p_mote text)
returns public.invitaciones
language plpgsql security definer set search_path = public, extensions
as $$
declare v_row public.invitaciones;
begin
  if public.sesion_usuario(p_token) is null then raise exception 'no_autorizado'; end if;
  insert into public.invitaciones (slug, nombre, mote) values (p_slug, p_nombre, nullif(p_mote, '')) returning * into v_row;
  return v_row;
end;
$$;

-- =========================================================
-- Permisos de ejecución (cliente = rol anon con la publishable key)
-- =========================================================
grant execute on function public.login_admin(text, text)                          to anon, authenticated;
grant execute on function public.logout_admin(text)                               to anon, authenticated;
grant execute on function public.obtener_invitacion(text)                         to anon, authenticated;
grant execute on function public.registrar_cita(uuid, text, text, text, text, text, text, text, text, timestamptz, text, double precision, double precision, text, double precision, double precision, integer, text) to anon, authenticated;
grant execute on function public.admin_citas(text)                                to anon, authenticated;
grant execute on function public.admin_actualizar_cita(text, uuid, smallint, text) to anon, authenticated;
grant execute on function public.admin_borrar_cita(text, uuid)                    to anon, authenticated;
grant execute on function public.admin_invitaciones(text)                         to anon, authenticated;
grant execute on function public.admin_crear_invitacion(text, text, text, text)   to anon, authenticated;
