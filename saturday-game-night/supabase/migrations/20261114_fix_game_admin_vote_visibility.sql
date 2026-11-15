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
