-- Resetting a participant password invalidates old device/browser aliases.
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

  -- Remove previous device aliases so the new password is required to reconnect.
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
  where id in (
    select a.auth_user_id from private.participant_aliases a
    where a.participant_id = p_participant_id
  );
  delete from private.participant_aliases where participant_id = p_participant_id;
  delete from private.participant_password_attempts
  where auth_user_id in (
    select u.id from auth.users u
    where u.id = p_participant_id
       or u.id in (select a.auth_user_id from private.participant_aliases a where a.participant_id = p_participant_id)
  );
end;
$$;
revoke all on function private.admin_reset_participant_password(uuid, text) from public;
grant execute on function private.admin_reset_participant_password(uuid, text) to authenticated;
