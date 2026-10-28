-- Display geometry and legend symbols are stored with each layer, so a deployed
-- frontend needs no locally prepared data.
alter table public.map_layers
  add column display_asset_path text,
  add column symbol_ids text[];
