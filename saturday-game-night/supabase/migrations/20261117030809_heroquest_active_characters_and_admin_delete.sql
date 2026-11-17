-- Add one public HeroQuest character per participant and permit authorized admins to delete sheets.
ALTER TABLE public.player_sheets
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS player_sheets_one_active_per_owner
  ON public.player_sheets (owner_id)
  WHERE is_active = true;

DROP POLICY IF EXISTS "Owners can delete their own player sheets" ON public.player_sheets;
CREATE POLICY "Owners and admins can delete player sheets"
  ON public.player_sheets
  FOR DELETE
  USING (
    (
      owner_id = (SELECT private.current_participant_id())
      OR (SELECT private.has_scoreboard_access())
    )
    AND EXISTS (
      SELECT 1
      FROM public.participants p
      WHERE p.id = player_sheets.owner_id
    )
  );

-- SECURITY INVOKER preserves the caller's RLS restrictions. The partial unique
-- index guarantees that no participant can have more than one active sheet.
CREATE OR REPLACE FUNCTION public.set_active_player_sheet(p_sheet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  target_owner uuid;
BEGIN
  SELECT ps.owner_id
    INTO target_owner
    FROM public.player_sheets ps
   WHERE ps.id = p_sheet_id;

  IF target_owner IS NULL THEN
    RAISE EXCEPTION 'Character sheet not found';
  END IF;

  IF target_owner IS DISTINCT FROM (SELECT private.current_participant_id())
     AND NOT (SELECT private.has_scoreboard_access()) THEN
    RAISE EXCEPTION 'Not authorized to activate this character';
  END IF;

  UPDATE public.player_sheets
     SET is_active = false
   WHERE owner_id = target_owner
     AND is_active = true;

  UPDATE public.player_sheets
     SET is_active = true
   WHERE id = p_sheet_id
     AND owner_id = target_owner;
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_player_sheet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_active_player_sheet(uuid) TO anon, authenticated;
