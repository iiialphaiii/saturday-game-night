-- Add an optional participant slogan shown only beside names in The Crew list.
alter table public.participants add column if not exists slogan text;

create or replace function private.update_my_participant_slogan(p_slogan text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_participant_id uuid;
  v_slogan text;
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  v_slogan := nullif(btrim(coalesce(p_slogan, '')), '');
  if length(v_slogan) > 100 then
    raise exception 'Slogan must be 100 characters or fewer.';
  end if;

  v_participant_id := private.current_participant_id();
  if v_participant_id is null then raise exception 'Participant profile not found.'; end if;

  update public.participants
  set slogan = v_slogan
  where id = v_participant_id;
  if not found then raise exception 'Participant profile not found.'; end if;
end;
$function$;

revoke all on function private.update_my_participant_slogan(text) from public, anon, authenticated;
grant execute on function private.update_my_participant_slogan(text) to authenticated;

create or replace function public.update_my_participant_slogan(p_slogan text)
returns void
language sql
security invoker
set search_path = ''
as $function$
  select private.update_my_participant_slogan(p_slogan);
$function$;

revoke all on function public.update_my_participant_slogan(text) from public, anon;
grant execute on function public.update_my_participant_slogan(text) to authenticated;
