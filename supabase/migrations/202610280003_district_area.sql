-- Official district area (BPS), kept beside the population so density can be shown
-- with both sources. Area has its own publisher and year.
alter table public.district_population
  add column area_km2 numeric(8, 2) check (area_km2 > 0),
  add column area_year integer,
  add column area_publisher text,
  add column area_source_url text;
