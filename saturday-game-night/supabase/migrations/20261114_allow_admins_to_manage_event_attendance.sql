drop policy if exists "Participants can RSVP to open Game Nights" on public.game_attendance;
drop policy if exists "Participants can update their RSVP" on public.game_attendance;
create policy "Participants and scoreboard admins can RSVP to open Game Nights"
on public.game_attendance for insert to authenticated
with check (
  (participant_id = private.current_participant_id() or private.has_scoreboard_access())
  and exists (select 1 from public.game_nights gn where gn.id = game_attendance.event_id and not gn.is_archived)
);
create policy "Participants and scoreboard admins can update RSVP"
on public.game_attendance for update to authenticated
using (
  (participant_id = private.current_participant_id() or private.has_scoreboard_access())
  and exists (select 1 from public.game_nights gn where gn.id = game_attendance.event_id and not gn.is_archived)
)
with check (
  (participant_id = private.current_participant_id() or private.has_scoreboard_access())
  and exists (select 1 from public.game_nights gn where gn.id = game_attendance.event_id and not gn.is_archived)
);

drop policy if exists "Participants can set their event arrival time" on public.game_event_arrivals;
drop policy if exists "Participants can update their event arrival time" on public.game_event_arrivals;
create policy "Participants and scoreboard admins can set event arrival time"
on public.game_event_arrivals for insert to authenticated
with check (
  (participant_id = private.current_participant_id() or private.has_scoreboard_access())
  and exists (select 1 from public.game_nights gn where gn.id = game_event_arrivals.event_id and not gn.is_archived)
);
create policy "Participants and scoreboard admins can update event arrival time"
on public.game_event_arrivals for update to authenticated
using (
  (participant_id = private.current_participant_id() or private.has_scoreboard_access())
  and exists (select 1 from public.game_nights gn where gn.id = game_event_arrivals.event_id and not gn.is_archived)
)
with check (
  (participant_id = private.current_participant_id() or private.has_scoreboard_access())
  and exists (select 1 from public.game_nights gn where gn.id = game_event_arrivals.event_id and not gn.is_archived)
);
