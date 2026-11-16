drop policy if exists "Registered participants can view player sheets" on public.player_sheets;
create policy "Registered participants can view player sheets"
  on public.player_sheets for select to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.id = (select private.current_participant_id())
    )
  );

drop policy if exists "Registered participants can create their own sheets" on public.player_sheets;
create policy "Registered participants can create their own sheets"
  on public.player_sheets for insert to authenticated
  with check (
    owner_id = (select private.current_participant_id())
    and exists (
      select 1 from public.participants p
      where p.id = owner_id
    )
  );

drop policy if exists "Owners and admins can update player sheets" on public.player_sheets;
create policy "Owners and admins can update player sheets"
  on public.player_sheets for update to authenticated
  using (
    (
      owner_id = (select private.current_participant_id())
      or (select private.has_scoreboard_access())
    )
    and exists (
      select 1 from public.participants p
      where p.id = owner_id
    )
  )
  with check (
    (
      owner_id = (select private.current_participant_id())
      or (select private.has_scoreboard_access())
    )
    and exists (
      select 1 from public.participants p
      where p.id = owner_id
    )
  );

drop policy if exists "Owners can delete their own player sheets" on public.player_sheets;
create policy "Owners can delete their own player sheets"
  on public.player_sheets for delete to authenticated
  using (
    owner_id = (select private.current_participant_id())
    and exists (
      select 1 from public.participants p
      where p.id = owner_id
    )
  );

drop policy if exists "Admins can view player sheet audit" on public.player_sheet_audit;
create policy "Admins can view player sheet audit"
  on public.player_sheet_audit for select to authenticated
  using (
    (select private.has_scoreboard_access())
    and exists (
      select 1 from public.participants p
      where p.id = (select private.current_participant_id())
    )
  );