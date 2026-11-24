-- Replace the "Forever Love" placeholder (no audio file was ever added) with
-- "Special Someone" (public/music/special-someone.mp3, 3:45). Same list position.
-- Keep in sync with musicTracks in lib/mock-data.ts.

insert into public.music_tracks (id, name_km, name_en, style_km, style_en, duration, url, position) values
  ('special-someone', 'មនុស្សពិសេស', 'Special Someone', 'ស្នេហា', 'Romantic', '3:45', '/music/special-someone.mp3', 3)
on conflict (id) do update
  set name_km = excluded.name_km,
      name_en = excluded.name_en,
      style_km = excluded.style_km,
      style_en = excluded.style_en,
      duration = excluded.duration,
      url = excluded.url,
      position = excluded.position,
      active = true;

-- Invitations that picked the placeholder get the new song instead of a missing file.
update public.invitations
   set music_url = '/music/special-someone.mp3'
 where music_url = '/music/forever.mp3';

delete from public.music_tracks where id = 'forever';