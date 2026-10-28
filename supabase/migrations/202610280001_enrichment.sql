-- Enrichment data: population per district and OpenStreetMap public facilities.
-- Each row keeps its publisher and source so the interface can attribute it.

create table public.district_population (
  code text primary key,
  district text not null unique,
  year integer not null,
  population integer not null check (population >= 0),
  publisher text not null,
  source_url text not null,
  retrieved_at timestamptz not null
);

create table public.facilities (
  id text primary key,
  name text not null default '',
  category text not null,
  kind text not null,
  district text not null,
  geom extensions.geography(Point, 4326) not null
);
create index facilities_geom_idx on public.facilities using gist (geom);

alter table public.district_population enable row level security;
alter table public.facilities enable row level security;
create policy "Public can read district population" on public.district_population for select to anon, authenticated using (true);
create policy "Public can read facilities" on public.facilities for select to anon, authenticated using (true);
revoke all on public.district_population, public.facilities from anon, authenticated;
grant select on public.district_population, public.facilities to anon, authenticated;
grant all on public.district_population, public.facilities to service_role;

-- Facilities within a radius (metres), nearest first. Radius and limit are capped.
create function public.nearby_facilities(p_lat double precision, p_lng double precision, p_radius double precision default 1500, p_limit integer default 8)
returns table (id text, name text, category text, kind text, district text, lat double precision, lng double precision, distance double precision)
language sql stable security invoker set search_path = '' as $$
  with origin as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as geom
  )
  select facilities.id, facilities.name, facilities.category, facilities.kind, facilities.district,
    extensions.st_y(facilities.geom::extensions.geometry), extensions.st_x(facilities.geom::extensions.geometry),
    extensions.st_distance(facilities.geom, origin.geom)
  from public.facilities, origin
  where p_lat between -90 and 90 and p_lng between -180 and 180
    and extensions.st_dwithin(facilities.geom, origin.geom, least(greatest(p_radius, 0), 5000))
  order by extensions.st_distance(facilities.geom, origin.geom)
  limit least(greatest(p_limit, 1), 50);
$$;
revoke all on function public.nearby_facilities(double precision, double precision, double precision, integer) from public;
grant execute on function public.nearby_facilities(double precision, double precision, double precision, integer) to anon, authenticated;
