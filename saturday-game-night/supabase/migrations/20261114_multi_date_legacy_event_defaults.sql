create or replace function public.assign_default_game_night_event()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.event_id is null then
    select gn.id into new.event_id
    from public.game_nights gn
    where not gn.is_archived
    order by
      case when gn.event_date >= current_date then 0 else 1 end,
      case when gn.event_date >= current_date then gn.event_date end asc,
      case when gn.event_date < current_date then gn.event_date end desc
    limit 1;
  end if;
  if new.event_id is null then
    raise exception 'Create a Game Night before adding games or chat messages.';
  end if;
  return new;
end;
$$;

drop trigger if exists games_assign_default_event on public.games;
create trigger games_assign_default_event
before insert on public.games
for each row execute function public.assign_default_game_night_event();

drop trigger if exists game_chat_assign_default_event on public.game_chat_messages;
create trigger game_chat_assign_default_event
before insert on public.game_chat_messages
for each row execute function public.assign_default_game_night_event();

create index if not exists game_attendance_participant_id_idx on public.game_attendance(participant_id);
create index if not exists game_nights_created_by_idx on public.game_nights(created_by);