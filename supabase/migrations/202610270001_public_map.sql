create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create table public.map_layers (
  id text primary key,
  name text not null,
  category text not null,
  asset_path text not null,
  feature_count integer not null check (feature_count >= 0),
  bounds jsonb,
  sort_order integer not null default 0,
  imported_at timestamptz not null default now()
);

create table public.villages (
  name text not null,
  district text not null,
  primary key (name, district)
);

create table public.news (
  id text primary key,
  judul text not null,
  isi text not null default '',
  kategori text not null default 'Kegiatan',
  tanggal text not null,
  lokasi text not null default '',
  foto text not null default '',
  "fotoList" jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  sort_order integer not null default 0
);

create table public.map_features (
  id bigint generated always as identity primary key,
  layer_id text not null references public.map_layers (id) on delete cascade,
  source_index integer not null check (source_index >= 0),
  properties jsonb not null default '{}'::jsonb,
  geom extensions.geometry(Geometry, 4326) not null,
  unique (layer_id, source_index)
);
create index map_features_geom_idx on public.map_features using gist (geom);
create index map_features_layer_idx on public.map_features (layer_id);

alter table public.map_layers enable row level security;
alter table public.villages enable row level security;
alter table public.news enable row level security;
alter table public.map_features enable row level security;
create policy "Public can read map layers" on public.map_layers for select to anon, authenticated using (true);
create policy "Public can read villages" on public.villages for select to anon, authenticated using (true);
create policy "Public can read published news" on public.news for select to anon, authenticated using (published);
create policy "Public can read public map features" on public.map_features for select to anon, authenticated using (true);
revoke all on public.map_layers, public.villages, public.news, public.map_features from anon, authenticated;
grant select on public.map_layers, public.villages, public.news, public.map_features to anon, authenticated;
grant all on public.map_layers, public.villages, public.news, public.map_features to service_role;
grant usage, select on sequence public.map_features_id_seq to service_role;

-- Import batches are only callable with a server-side service_role key.
create function public.import_map_features(p_layer_id text, p_features jsonb, p_offset integer default 0)
returns void language sql security invoker set search_path = '' as $$
  insert into public.map_features (layer_id, source_index, properties, geom)
  select p_layer_id, (feature.ordinality - 1 + p_offset)::integer,
    coalesce(feature.value -> 'properties', '{}'::jsonb),
    extensions.st_force2d(extensions.st_setsrid(extensions.st_geomfromgeojson(feature.value -> 'geometry'), 4326))
  from jsonb_array_elements(p_features) with ordinality as feature(value, ordinality)
  where feature.value -> 'geometry' <> 'null'::jsonb
  on conflict (layer_id, source_index) do update
    set properties = excluded.properties, geom = excluded.geom;
$$;
revoke all on function public.import_map_features(text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.import_map_features(text, jsonb, integer) to service_role;

create function public.identify_location(p_lat double precision, p_lng double precision, p_layers text[])
returns table (layer_id text, layer_name text, properties jsonb)
language sql stable security invoker set search_path = '' as $$
  select features.layer_id, layers.name, features.properties
  from public.map_features as features
  join public.map_layers as layers on layers.id = features.layer_id
  where p_lat between -90 and 90 and p_lng between -180 and 180
    and features.layer_id = any(p_layers)
    and extensions.st_intersects(features.geom, extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326));
$$;
revoke all on function public.identify_location(double precision, double precision, text[]) from public;
grant execute on function public.identify_location(double precision, double precision, text[]) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('map-data', 'map-data', true, 52428800, array['application/gzip'])
on conflict (id) do nothing;
