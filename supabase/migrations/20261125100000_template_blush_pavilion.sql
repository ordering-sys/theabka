-- New Premium wedding template: Blush Pavilion (ពន្លាពណ៌ផ្កាឈូក).
-- "decor": "pavilion" in the theme tells the app to draw its artwork (blossom
-- canopy, pillars, gold crest, garden pavilion). Keep in sync with lib/mock-data.ts.
insert into public.templates (id, name_km, name_en, event_type, tier, theme, position) values
  ('pavilion', 'ពន្លាពណ៌ផ្កាឈូក', 'Blush Pavilion', 'wedding', 'premium',
   '{"bg":"#F7D7D3","fg":"#2B2B2B","accent":"#7A5A16","ctaFg":"#FFFFFF","decor":"pavilion"}', 9)
on conflict (id) do nothing;
