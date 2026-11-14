-- Allow participants to update their own display name without creating a second profile.
-- Names are unique after trimming, whitespace normalization, and case folding.
create unique index if not exists participants_normalized_name_uidx
on public.participants (
  lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
);

create or replace function private.protect_participant_name()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.name is distinct from old.name
     and coalesce((auth.jwt()->'app_metadata'->>'role'), '') <> 'admin'
     and not (
       current_setting('app.allow_participant_name_update', true) = 'true'
       and auth.uid() = private.current_participant_id()
     ) then
    raise exception 'Participant names can only be changed by the profile owner or an administrator.';
  end if;
  return new;
end;
$function$;

create or replace function private.update_my_participant_name(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_participant_id uuid;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  v_name := regexp_replace(btrim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g');
  if length(v_name) = 0 then raise exception 'Name cannot be blank.'; end if;
  if length(v_name) > 80 then raise exception 'Name must be 80 characters or fewer.'; end if;

  v_participant_id := private.current_participant_id();
  if v_participant_id is null then raise exception 'Participant profile not found.'; end if;

  if exists (
    select 1 from public.participants p
    where p.id <> v_participant_id
      and lower(regexp_replace(btrim(p.name), '[[:space:]]+', ' ', 'g')) = lower(v_name)
  ) then
    raise exception 'That name is already in use. Please choose another name.';
  end if;

  perform set_config('app.allow_participant_name_update', 'true', true);
  update public.participants set name = v_name where id = v_participant_id;
  if not found then raise exception 'Participant profile not found.'; end if;
exception
  when unique_violation then
    raise exception 'That name is already in use. Please choose another name.';
end;
$function$;

revoke all on function private.update_my_participant_name(text) from public, anon, authenticated;
grant execute on function private.update_my_participant_name(text) to authenticated;

create or replace function public.update_my_participant_name(p_name text)
returns void
language sql
security invoker
set search_path = ''
as $function$
  select private.update_my_participant_name(p_name);
$function$;

revoke all on function public.update_my_participant_name(text) from public, anon;
grant execute on function public.update_my_participant_name(text) to authenticated;
