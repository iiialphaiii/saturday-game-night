-- Allow an authenticated participant to change their own password after proving the current password.
create or replace function private.change_my_participant_password(
  p_current_password text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participant_id uuid;
  v_hash text;
  v_attempts private.participant_password_attempts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required.';
  end if;

  if p_current_password is null or length(p_current_password) = 0 or length(p_current_password) > 200 then
    raise exception 'Enter your current password.';
  end if;
  if p_new_password is null or length(p_new_password) < 8 or length(p_new_password) > 200 then
    raise exception 'New password must be at least 8 characters and no more than 200 characters.';
  end if;

  select pa.participant_id into v_participant_id
  from private.participant_aliases pa
  where pa.auth_user_id = auth.uid();

  if v_participant_id is null and exists (
    select 1 from public.participants p where p.id = auth.uid() and p.is_active = true
  ) then
    v_participant_id := auth.uid();
  end if;

  if v_participant_id is null or not exists (
    select 1 from public.participants p where p.id = v_participant_id and p.is_active = true
  ) then
    raise exception 'Your active participant profile could not be found.';
  end if;

  insert into private.participant_password_attempts(auth_user_id)
  values (auth.uid()) on conflict (auth_user_id) do nothing;

  select * into v_attempts
  from private.participant_password_attempts
  where auth_user_id = auth.uid()
  for update;

  if v_attempts.locked_until is not null and v_attempts.locked_until > now() then
    raise exception 'Too many incorrect password attempts. Please wait 15 minutes before trying again.';
  end if;

  select pp.password_hash into v_hash
  from private.participant_passwords pp
  where pp.participant_id = v_participant_id;

  if v_hash is null then
    raise exception 'Your password has not been set. Please ask an administrator for help.';
  end if;

  if extensions.crypt(p_current_password, v_hash) <> v_hash then
    update private.participant_password_attempts
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end,
        updated_at = now()
    where auth_user_id = auth.uid();
    return false;
  end if;

  update private.participant_passwords
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 12)),
      updated_at = now(),
      updated_by = auth.uid()
  where participant_id = v_participant_id;

  update private.participant_password_attempts
  set failed_attempts = 0, locked_until = null, updated_at = now()
  where auth_user_id = auth.uid();

  -- Other browser/device aliases must authenticate again with the new password.
  delete from private.participant_aliases
  where participant_id = v_participant_id and auth_user_id <> auth.uid();

  return true;
end;
$$;

revoke all on function private.change_my_participant_password(text, text) from public;
grant execute on function private.change_my_participant_password(text, text) to authenticated;

create or replace function public.change_my_participant_password(
  p_current_password text,
  p_new_password text
)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.change_my_participant_password(p_current_password, p_new_password); $$;

revoke all on function public.change_my_participant_password(text, text) from public;
grant execute on function public.change_my_participant_password(text, text) to authenticated;
