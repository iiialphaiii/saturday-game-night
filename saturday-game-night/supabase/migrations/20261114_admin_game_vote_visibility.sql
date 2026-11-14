drop policy if exists "Anyone can read votes" on public.votes;
create policy "Participants and scoreboard admins can read votes"
on public.votes
for select
to authenticated
using (
  participant_id = (select private.current_participant_id())
  or (select private.has_scoreboard_access())
);

create or replace function public.get_game_vote_counts(p_game_ids bigint[])
returns table(game_id bigint, vote_count bigint, has_voted boolean)
language sql
stable
security definer
set search_path = ''
as $function$
  select requested.game_id,
    (select count(*) from public.votes v where v.game_id = requested.game_id) as vote_count,
    exists (
      select 1 from public.votes v
      where v.game_id = requested.game_id
        and v.participant_id = (select private.current_participant_id())
    ) as has_voted
  from unnest(coalesce(p_game_ids, array[]::bigint[])) as requested(game_id)
  where (select auth.uid()) is not null;
$function$;

revoke all on function public.get_game_vote_counts(bigint[]) from public, anon;
grant execute on function public.get_game_vote_counts(bigint[]) to authenticated;
