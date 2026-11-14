create or replace function private.has_scoreboard_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce((
    select u.raw_app_meta_data->>'role' in ('admin', 'game_admin')
    from auth.users u
    where u.id = (select auth.uid())
  ), false);
$function$;

revoke all on function private.has_scoreboard_access() from public, anon;
grant execute on function private.has_scoreboard_access() to authenticated;

create or replace function public.current_user_can_manage_scoreboard()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.has_scoreboard_access();
$function$;

revoke all on function public.current_user_can_manage_scoreboard() from public, anon;
grant execute on function public.current_user_can_manage_scoreboard() to authenticated;

drop policy if exists "Admins and game admins can manage game rounds" on public.game_rounds;
create policy "Admins and game admins can manage game rounds"
on public.game_rounds
for all
to authenticated
using ((select private.has_scoreboard_access()))
with check ((select private.has_scoreboard_access()));

drop policy if exists "Admins and game admins can manage game round placements" on public.game_round_placements;
create policy "Admins and game admins can manage game round placements"
on public.game_round_placements
for all
to authenticated
using ((select private.has_scoreboard_access()))
with check ((select private.has_scoreboard_access()));