alter table public.game_event_arrivals
  add column if not exists checked_in_at timestamptz;
