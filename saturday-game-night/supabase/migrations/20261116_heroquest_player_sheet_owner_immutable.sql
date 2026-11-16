create or replace function private.prevent_player_sheet_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception using
      errcode = '42501',
      message = 'Player sheet ownership cannot be changed.';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_player_sheet_owner_change() from public, anon, authenticated;

drop trigger if exists prevent_player_sheet_owner_change on public.player_sheets;
create trigger prevent_player_sheet_owner_change
before update of owner_id on public.player_sheets
for each row execute function private.prevent_player_sheet_owner_change();