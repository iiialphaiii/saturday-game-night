-- Keep linked login identities on the participant's single current role.
create or replace function private.sign_in_as_participant(p_name text, p_password text)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare
  v_participant_id uuid;
  v_hash text;
  v_attempts private.participant_password_attempts%rowtype;
  v_target_role text;
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  if p_name is null or length(btrim(p_name)) = 0 or length(p_name) > 200
     or p_password is null or length(p_password) = 0 or length(p_password) > 200 then
    raise exception 'Enter the participant name and password.';
  end if;

  insert into private.participant_password_attempts(auth_user_id)
  values (auth.uid()) on conflict (auth_user_id) do nothing;
  select * into v_attempts from private.participant_password_attempts
  where auth_user_id = auth.uid() for update;
  if v_attempts.locked_until is not null and v_attempts.locked_until > now() then
    raise exception 'Too many incorrect password attempts. Please wait 15 minutes before trying again.';
  end if;

  select p.id, pp.password_hash into v_participant_id, v_hash
  from public.participants p
  left join private.participant_passwords pp on pp.participant_id = p.id
  where lower(regexp_replace(btrim(p.name), '\s+', ' ', 'g')) =
        lower(regexp_replace(btrim(p_name), '\s+', ' ', 'g'))
    and p.is_active = true;

  if v_participant_id is null then raise exception 'That participant could not be found or is inactive.'; end if;
  if v_hash is null then raise exception 'A password has not been set for this participant yet. Please ask an administrator to reset it.'; end if;

  if extensions.crypt(p_password, v_hash) = v_hash then
    insert into private.participant_aliases(auth_user_id, participant_id, approved_by)
    values (auth.uid(), v_participant_id, null)
    on conflict (auth_user_id) do update set participant_id = excluded.participant_id;

    select coalesce(
      (select u.raw_app_meta_data->>'role' from auth.users u where u.id = v_participant_id),
      (select case
        when bool_or(u.raw_app_meta_data->>'role' = 'admin') then 'admin'
        when bool_or(u.raw_app_meta_data->>'role' = 'game_admin') then 'game_admin'
        else null end
       from private.participant_aliases a
       join auth.users u on u.id = a.auth_user_id
       where a.participant_id = v_participant_id)
    ) into v_target_role;

    update auth.users
    set raw_app_meta_data = case
      when v_target_role in ('admin', 'game_admin')
        then coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_target_role)
      else coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
    end
    where id = auth.uid();

    update private.participant_password_attempts
    set failed_attempts = 0, locked_until = null, updated_at = now()
    where auth_user_id = auth.uid();
    return v_participant_id;
  end if;

  update private.participant_password_attempts
  set failed_attempts = failed_attempts + 1,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end,
      updated_at = now()
  where auth_user_id = auth.uid();
  return null;
end;
$function$;

-- Linked identities use the canonical participant's role for scoreboard authorization.
create or replace function private.has_scoreboard_access()
returns boolean language sql stable security definer set search_path = ''
as $function$
  select coalesce((
    select u.raw_app_meta_data->>'role' in ('admin', 'game_admin')
    from auth.users u
    where u.id = (select private.current_participant_id())
  ), false);
$function$;

-- Backfill aliases that were linked before role inheritance was corrected.
with participant_roles as (
  select p.id as participant_id,
    coalesce(
      (select u.raw_app_meta_data->>'role' from auth.users u where u.id = p.id),
      (select case
        when bool_or(u.raw_app_meta_data->>'role' = 'admin') then 'admin'
        when bool_or(u.raw_app_meta_data->>'role' = 'game_admin') then 'game_admin'
        else null end
       from private.participant_aliases a
       join auth.users u on u.id = a.auth_user_id
       where a.participant_id = p.id)
    ) as role
  from public.participants p
)
update auth.users u
set raw_app_meta_data = case
  when r.role in ('admin', 'game_admin')
    then coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', r.role)
  else coalesce(u.raw_app_meta_data, '{}'::jsonb) - 'role'
end
from private.participant_aliases a
join participant_roles r on r.participant_id = a.participant_id
where u.id = a.auth_user_id;
