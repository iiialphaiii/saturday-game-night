alter table public.votes
  add column if not exists vote_type text not null default 'up';

alter table public.votes
  drop constraint if exists votes_vote_type_check;

alter table public.votes
  add constraint votes_vote_type_check
  check (vote_type in ('up', 'down'));

drop policy if exists "Participants can change their own votes" on public.votes;
create policy "Participants can change their own votes"
on public.votes
for update
to authenticated
using (
  participant_id = (select private.current_participant_id())
  and exists (
    select 1
    from public.games g
    join public.game_nights gn on gn.id = g.event_id
    where g.id = votes.game_id
      and gn.voting_open
      and not gn.is_archived
  )
)
with check (
  participant_id = (select private.current_participant_id())
  and vote_type in ('up', 'down')
  and exists (
    select 1
    from public.games g
    join public.game_nights gn on gn.id = g.event_id
    where g.id = votes.game_id
      and gn.voting_open
      and not gn.is_archived
  )
);

drop function if exists public.get_game_vote_counts(bigint[]);
create function public.get_game_vote_counts(p_game_ids bigint[])
returns table(game_id bigint, up_count bigint, down_count bigint, my_vote text)
language sql
stable
security definer
set search_path = ''
as $function$
  select requested.game_id,
    count(v.id) filter (where v.vote_type = 'up') as up_count,
    count(v.id) filter (where v.vote_type = 'down') as down_count,
    (
      select own_vote.vote_type
      from public.votes own_vote
      where own_vote.game_id = requested.game_id
        and own_vote.participant_id = (select private.current_participant_id())
      limit 1
    ) as my_vote
  from unnest(coalesce(p_game_ids, array[]::bigint[])) as requested(game_id)
  left join public.votes v on v.game_id = requested.game_id
  where (select auth.uid()) is not null
  group by requested.game_id;
$function$;

revoke all on function public.get_game_vote_counts(bigint[]) from public, anon;
grant execute on function public.get_game_vote_counts(bigint[]) to authenticated;
