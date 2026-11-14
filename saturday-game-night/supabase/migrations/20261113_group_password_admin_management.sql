-- Group password gate and admin role management
-- Run after 20261113_game_night_admin_round_history.sql.

create table if not exists private.group_access_settings (
  id boolean primary key default true check (id),
  password_hash text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into private.group_access_settings(id) values (true) on conflict (id) do nothing;

create table if not exists private.group_password_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists private.group_password_verified_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now()
);
alter table private.group_access_settings enable row level security;
alter table private.group_password_attempts enable row level security;
alter table private.group_password_verified_users enable row level security;

create or replace function private.has_verified_group_password()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from private.group_password_verified_users v where v.auth_user_id = (select auth.uid()));
$$;
revoke all on function private.has_verified_group_password() from public;
grant execute on function private.has_verified_group_password() to authenticated;

create or replace function private.verify_group_password(p_password text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_hash text; v_attempts private.group_password_attempts%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in is required before checking the group password.'; end if;
  if p_password is null or length(p_password) = 0 or length(p_password) > 200 then return false; end if;
  insert into private.group_password_attempts(user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into v_attempts from private.group_password_attempts where user_id = auth.uid() for update;
  if v_attempts.locked_until is not null and v_attempts.locked_until > now() then
    raise exception 'Too many incorrect attempts. Please wait 15 minutes before trying again.';
  end if;
  select password_hash into v_hash from private.group_access_settings where id = true;
  if v_hash is null then raise exception 'The group password has not been set yet. Please ask an administrator.'; end if;
  if extensions.crypt(p_password, v_hash) = v_hash then
    insert into private.group_password_verified_users(auth_user_id) values (auth.uid())
    on conflict (auth_user_id) do update set verified_at = now();
    update private.group_password_attempts set failed_attempts = 0, locked_until = null, updated_at = now() where user_id = auth.uid();
    return true;
  end if;
  update private.group_password_attempts
  set failed_attempts = failed_attempts + 1,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end,
      updated_at = now()
  where user_id = auth.uid();
  return false;
end;
$$;
revoke all on function private.verify_group_password(text) from public;
grant execute on function private.verify_group_password(text) to authenticated;

create or replace function public.verify_group_password(p_password text)
returns boolean language sql security invoker set search_path = ''
as $$ select private.verify_group_password(p_password); $$;
revoke all on function public.verify_group_password(text) from public;
grant execute on function public.verify_group_password(text) to authenticated;

create or replace function private.admin_set_group_password(p_password text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce((auth.jwt()->'app_metadata'->>'role'), '') <> 'admin' then raise exception 'Administrator access required.'; end if;
  if p_password is null or length(btrim(p_password)) < 6 or length(p_password) > 200 then
    raise exception 'Group password must be at least 6 characters and no more than 200 characters.';
  end if;
  update private.group_access_settings
  set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
      updated_at = now(), updated_by = auth.uid()
  where id = true;
end;
$$;
revoke all on function private.admin_set_group_password(text) from public;
grant execute on function private.admin_set_group_password(text) to authenticated;

create or replace function public.admin_set_group_password(p_password text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.admin_set_group_password(p_password); end; $$;
revoke all on function public.admin_set_group_password(text) from public;
grant execute on function public.admin_set_group_password(text) to authenticated;

create or replace function private.admin_list_participant_roles()
returns table(participant_id uuid, participant_name text, is_admin boolean)
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce((auth.jwt()->'app_metadata'->>'role'), '') <> 'admin' then raise exception 'Administrator access required.'; end if;
  return query
    select p.id, p.name, coalesce(u.raw_app_meta_data->>'role' = 'admin', false)
    from public.participants p
    left join auth.users u on u.id = p.id
    order by lower(p.name);
end;
$$;
revoke all on function private.admin_list_participant_roles() from public;
grant execute on function private.admin_list_participant_roles() to authenticated;

create or replace function public.admin_list_participant_roles()
returns table(participant_id uuid, participant_name text, is_admin boolean)
language sql security invoker set search_path = ''
as $$ select * from private.admin_list_participant_roles(); $$;
revoke all on function public.admin_list_participant_roles() from public;
grant execute on function public.admin_list_participant_roles() to authenticated;

create or replace function private.admin_set_participant_admin(p_participant_id uuid, p_make_admin boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_admin_count integer;
begin
  if coalesce((auth.jwt()->'app_metadata'->>'role'), '') <> 'admin' then raise exception 'Administrator access required.'; end if;
  if not exists (select 1 from public.participants where id = p_participant_id) then raise exception 'Participant not found.'; end if;
  if not exists (select 1 from auth.users where id = p_participant_id) then raise exception 'This participant has no direct login account to promote.'; end if;
  if p_make_admin is null then raise exception 'A role change must be selected.'; end if;
  if not p_make_admin then
    select count(*) into v_admin_count from auth.users where raw_app_meta_data->>'role' = 'admin';
    if v_admin_count <= 1 and exists (select 1 from auth.users where id = p_participant_id and raw_app_meta_data->>'role' = 'admin') then
      raise exception 'The last administrator cannot be removed.';
    end if;
  end if;
  update auth.users
  set raw_app_meta_data = case when p_make_admin
    then coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
    else coalesce(raw_app_meta_data, '{}'::jsonb) - 'role' end
  where id = p_participant_id;
end;
$$;
revoke all on function private.admin_set_participant_admin(uuid, boolean) from public;
grant execute on function private.admin_set_participant_admin(uuid, boolean) to authenticated;

create or replace function public.admin_set_participant_admin(p_participant_id uuid, p_make_admin boolean)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.admin_set_participant_admin(p_participant_id, p_make_admin); end; $$;
revoke all on function public.admin_set_participant_admin(uuid, boolean) from public;
grant execute on function public.admin_set_participant_admin(uuid, boolean) to authenticated;

drop policy if exists "Participants can register themselves" on public.participants;
create policy "Participants can register themselves" on public.participants
for insert to authenticated
with check (id = auth.uid() and private.has_verified_group_password());
