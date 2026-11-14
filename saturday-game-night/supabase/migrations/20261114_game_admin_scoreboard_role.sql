drop function if exists public.admin_list_participant_roles();
drop function if exists private.admin_list_participant_roles();

create function private.admin_list_participant_roles()
returns table(participant_id uuid, participant_name text, is_admin boolean, is_game_admin boolean)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce((auth.jwt()->'app_metadata'->>'role'), '') <> 'admin' then
    raise exception 'Administrator access required.';
  end if;
  return query
    select p.id, p.name,
      coalesce(u.raw_app_meta_data->>'role' = 'admin', false),
      coalesce(u.raw_app_meta_data->>'role' = 'game_admin', false)
    from public.participants p
    left join auth.users u on u.id = p.id
    order by lower(p.name);
end;
$function$;

create function public.admin_list_participant_roles()
returns table(participant_id uuid, participant_name text, is_admin boolean, is_game_admin boolean)
language sql
set search_path = ''
as $function$
  select * from private.admin_list_participant_roles();
$function$;

create or replace function private.admin_set_participant_game_admin(p_participant_id uuid, p_make_game_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce((auth.jwt()->'app_metadata'->>'role'), '') <> 'admin' then
    raise exception 'Administrator access required.';
  end if;
  if not exists (select 1 from public.participants where id = p_participant_id) then
    raise exception 'Participant not found.';
  end if;
  if not exists (select 1 from auth.users where id = p_participant_id) then
    raise exception 'This participant has no direct login account to promote.';
  end if;

  update auth.users
  set raw_app_meta_data =
    case
      when p_make_game_admin and coalesce(raw_app_meta_data->>'role', '') <> 'admin'
        then coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"game_admin"}'::jsonb
      when not p_make_game_admin and coalesce(raw_app_meta_data->>'role', '') = 'game_admin'
        then coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
      else coalesce(raw_app_meta_data, '{}'::jsonb)
    end
  where id = p_participant_id;
end;
$function$;

create or replace function public.admin_set_participant_game_admin(p_participant_id uuid, p_make_game_admin boolean)
returns void
language sql
set search_path = ''
as $function$
  select private.admin_set_participant_game_admin(p_participant_id, p_make_game_admin);
$function$;

drop policy if exists "Admins can manage game rounds" on public.game_rounds;
create policy "Admins and game admins can manage game rounds"
on public.game_rounds
for all
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') in ('admin', 'game_admin'))
with check ((auth.jwt()->'app_metadata'->>'role') in ('admin', 'game_admin'));

drop policy if exists "Admins can manage game round placements" on public.game_round_placements;
create policy "Admins and game admins can manage game round placements"
on public.game_round_placements
for all
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') in ('admin', 'game_admin'))
with check ((auth.jwt()->'app_metadata'->>'role') in ('admin', 'game_admin'));

revoke all on function private.admin_list_participant_roles() from public, anon, authenticated;
grant execute on function private.admin_list_participant_roles() to authenticated;
revoke all on function private.admin_set_participant_game_admin(uuid, boolean) from public, anon, authenticated;
grant execute on function private.admin_set_participant_game_admin(uuid, boolean) to authenticated;
revoke all on function public.admin_list_participant_roles() from public, anon;
grant execute on function public.admin_list_participant_roles() to authenticated;
revoke all on function public.admin_set_participant_game_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_set_participant_game_admin(uuid, boolean) to authenticated;
