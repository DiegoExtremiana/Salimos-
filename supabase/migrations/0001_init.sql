-- =========================================================
-- ¿Salimos?  —  esquema inicial
-- Aplica esto en Supabase (SQL Editor) o con la CLI:
--   supabase db push
-- =========================================================

create extension if not exists pgcrypto;

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
  nombre        text,             -- nombre saludado (de la invitación)
  mote          text,             -- mote (de la invitación)
  salimos       text default 'sí',
  plan          text,             -- "Vamos a…"
  tipo          text,             -- food / walk / drink
  franja        text,             -- horario (desayuno/comida/cena)
  antojo        text,             -- "Me apetece…"
  sitio         text,             -- sitio elegido (opcional)
  sitio_lat     double precision,
  sitio_lon     double precision,
  ubicacion     text,             -- etiqueta de zona / ciudad (opcional)
  area_lat      double precision, -- centro del área marcada (opcional)
  area_lon      double precision,
  area_radio    integer,          -- radio en metros si es círculo
  area_bbox     text,             -- "s,w,n,e" si es rectángulo
  nota          smallint check (nota is null or (nota >= 0 and nota <= 10)), -- /10, la rellena el admin
  notas_admin   text
);

create index if not exists citas_created_idx on public.citas (created_at desc);

-- ---------- Seguridad a nivel de fila (RLS) ----------
alter table public.invitaciones enable row level security;
alter table public.citas        enable row level security;

-- Permisos de rol (RLS sigue filtrando por fila)
grant usage on schema public to anon, authenticated;
grant insert on public.citas to anon;                                  -- el formulario inserta
grant select, insert, update, delete on public.citas to authenticated; -- el admin lo gestiona
grant select, insert, update, delete on public.invitaciones to authenticated;

-- CITAS: cualquiera puede INSERTAR (contestar el formulario);
-- solo el admin autenticado puede LEER / EDITAR / BORRAR (datos sensibles).
drop policy if exists citas_insert_publico on public.citas;
create policy citas_insert_publico on public.citas
  for insert to anon, authenticated with check (true);

drop policy if exists citas_admin_select on public.citas;
create policy citas_admin_select on public.citas
  for select to authenticated using (auth.uid() is not null);

drop policy if exists citas_admin_update on public.citas;
create policy citas_admin_update on public.citas
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists citas_admin_delete on public.citas;
create policy citas_admin_delete on public.citas
  for delete to authenticated using (auth.uid() is not null);

-- INVITACIONES: solo el admin las gestiona. El público NO puede listarlas.
drop policy if exists invit_admin_all on public.invitaciones;
create policy invit_admin_all on public.invitaciones
  for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

-- El público resuelve UNA invitación por slug (no puede listar todas)
-- mediante función SECURITY DEFINER.
create or replace function public.obtener_invitacion(p_slug text)
returns table (id uuid, nombre text, mote text)
language sql
security definer
set search_path = public
as $$
  select id, nombre, mote
  from public.invitaciones
  where slug = p_slug
  limit 1;
$$;

grant execute on function public.obtener_invitacion(text) to anon, authenticated;
