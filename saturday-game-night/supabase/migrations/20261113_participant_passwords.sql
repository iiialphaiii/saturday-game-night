-- Participant passwords for password-protected participant profile access.
-- Passwords are stored only as bcrypt hashes in the private schema.
create table if not exists private.participant_passwords (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create table if not exists private.participant_password_attempts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table private.participant_passwords enable row level security;
alter table private.participant_password_attempts enable row level security;

create or replace function private.set_my_participant_password(p_password text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  if p_password is null or length(p_password) < 8 or length(p_password) > 200 then
    raise exception 'Participant password must be at least 8 characters and no more than 200 characters.';
  end if;
  if not exists (select 1 from public.participants p where p.id = auth.uid()) then
    raise exception 'A participant profile must be created before setting its password.';
  end if;
  if not exists (select 1 from private.group_password_verified_users v where v.auth_user_id = auth.uid()) then
    raise exception 'Verify the group password before creating a participant account.';
  end if;
  insert into private.participant_passwords(participant_id, password_hash, updated_by)
  values (auth.uid(), extensions.crypt(p_password, extensions.gen_salt('bf', 12)), auth.uid())
  on conflict (participant_id) do update
    set password_hash = excluded.password_hash, updated_at = now(), updated_by = auth.uid();
end;
$$;
revoke all on function private.set_my_participant_password(text) from public;
grant execute on function private.set_my_participant_password(text) to authenticated;

create or replace function public.set_my_participant_password(p_password text)
returns void language sql security invoker set search_path = ''
as $$ select private.set_my_participant_password(p_password); $$;
revoke all on function public.set_my_participant_password(text) from public;
grant execute on function public.set_my_participant_password(text) to authenticated;

create or replace function private.sign_in_as_participant(p_name text, p_password text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_participant_id uuid;
  v_hash text;
  v_attempts private.participant_password_attempts%rowtype;
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

  if v_participant_id is null then
    raise exception 'That participant could not be found or is inactive.';
  end if;
  if v_hash is null then
    raise exception 'A password has not been set for this participant yet. Please ask an administrator to reset it.';
  end if;

  if extensions.crypt(p_password, v_hash) = v_hash then
    insert into private.participant_aliases(auth_user_id, participant_id, approved_by)
    values (auth.uid(), v_participant_id, null)
    on conflict (auth_user_id) do update set participant_id = excluded.participant_id;
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
$$;
revoke all on function private.sign_in_as_participant(text, text) from public;
grant execute on function private.sign_in_as_participant(text, text) to authenticated;

create or replace function public.sign_in_as_participant(p_name text, p_password text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.sign_in_as_participant(p_name, p_password); $$;
revoke all on function public.sign_in_as_participant(text, text) from public;
grant execute on function public.sign_in_as_participant(text, text) to authenticated;

create or replace function private.admin_reset_participant_password(p_participant_id uuid, p_password text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce((auth.jwt()->'app_metadata'->>'role'), '') <> 'admin' then
    raise exception 'Administrator access required.';
  end if;
  if p_password is null or length(p_password) < 8 or length(p_password) > 200 then
    raise exception 'Participant password must be at least 8 characters and no more than 200 characters.';
  end if;
  if not exists (select 1 from public.participants where id = p_participant_id) then
    raise exception 'Participant not found.';
  end if;
  insert into private.participant_passwords(participant_id, password_hash, updated_by)
  values (p_participant_id, extensions.crypt(p_password, extensions.gen_salt('bf', 12)), auth.uid())
  on conflict (participant_id) do update
    set password_hash = excluded.password_hash, updated_at = now(), updated_by = auth.uid();
  update private.participant_password_attempts
  set failed_attempts = 0, locked_until = null, updated_at = now()
  where auth_user_id = p_participant_id;
end;
$$;
revoke all on function private.admin_reset_participant_password(uuid, text) from public;
grant execute on function private.admin_reset_participant_password(uuid, text) to authenticated;

create or replace function public.admin_reset_participant_password(p_participant_id uuid, p_password text)
returns void language sql security invoker set search_path = ''
as $$ select private.admin_reset_participant_password(p_participant_id, p_password); $$;
revoke all on function public.admin_reset_participant_password(uuid, text) from public;
grant execute on function public.admin_reset_participant_password(uuid, text) to authenticated;

-- Legacy admin approval must not bypass participant password verification.
revoke execute on function public.admin_decide_participant_link_request(bigint, boolean) from public;
revoke execute on function public.admin_decide_participant_link_request(bigint, boolean) from anon;
revoke execute on function public.admin_decide_participant_link_request(bigint, boolean) from authenticated;
