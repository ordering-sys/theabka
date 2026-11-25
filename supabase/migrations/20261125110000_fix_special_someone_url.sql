-- "Special Someone" must point at the audio file in public/music/. Its url had been
-- changed to a YouTube link, which an <audio> element can't play and which no longer
-- matches musicTracks in lib/mock-data.ts. The editor sends '/music/special-someone.mp3',
-- so the music check in the invitations trigger refused every save ('invalid_music_url').
-- Built-in track urls must be same-site audio files; keep this table in sync with
-- musicTracks in lib/mock-data.ts.

update public.music_tracks
   set url = '/music/special-someone.mp3',
       active = true
 where id = 'special-someone';

-- Invitations saved while the YouTube link was in place get the playable file.
-- (Changing music_url to a valid track passes the trigger's check.)
update public.invitations i
   set music_url = '/music/special-someone.mp3'
 where i.music_url is not null
   and i.music_url not like 'storage://%'
   and i.music_url not in (select m.url from public.music_tracks m)
   and i.music_url like 'https://youtu%';
