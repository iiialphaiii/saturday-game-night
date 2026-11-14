-- Allow only full administrators to permanently delete a Game Night.
-- Event-owned records are removed through existing ON DELETE CASCADE foreign keys.

drop policy if exists "Admins can delete Game Nights" on public.game_nights;
create policy "Admins can delete Game Nights"
on public.game_nights
for delete
to authenticated
using (((auth.jwt()->'app_metadata')->>'role')='admin');
