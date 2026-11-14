# Saturday Game Night

A mobile-friendly shared voting app for **Saturday, November 14, 2026 at 7:00 PM**.

Participants open the same public URL, enter a name, confirm their expected arrival time, suggest games, and vote. Votes and participant updates sync live.

## Stack
- React + Vite
- Supabase (database, anonymous sign-in, realtime)
- Vercel (free static hosting tier)

## 1. Create the Supabase backend
1. Create a free project at https://supabase.com.
2. In **Project Settings → API**, copy the Project URL and anon/publishable key.
3. In **Authentication → Providers** (or Sign-in methods), enable **Anonymous Sign-Ins**.
4. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and run it.

The SQL creates the event, participant, game, and vote tables, enables row-level security, and adds the `arrival_time` field to participant records.

## 2. Configure the app
1. Copy `.env.example` to `.env.local`.
2. Fill in your Supabase project URL and anon key:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
   ```
3. Install and run locally:
   ```
   npm install
   npm run dev
   ```

## 3. Deploy free with Vercel
1. Push this project to a GitHub repository.
2. Sign in at https://vercel.com and import the repository.
3. Add the two environment variables from `.env.local` in Vercel project settings.
4. Deploy. Vercel provides a public URL you can share with everyone.

## Participant flow
- Enter name and expected arrival time when joining.
- The participant list displays each person's arrival time.
- Participants can update their arrival time later from the **Who's playing?** section.
- Suggest games and vote/unvote on any game while voting is open.

## Notes
- Anyone with the app URL can join; no invite list is required.
- Anonymous sessions are browser/device-specific. If someone clears browser data or switches devices, they may appear as a new participant.
- The Supabase anon/publishable key is intended for browser use; keep row-level security enabled. Never put a service-role key in this app.
- This starter app does not include an admin dashboard to close voting. The `event_settings.voting_open` field can be changed to `false` in Supabase Table Editor when you want to close voting.


## Admin controls and game history

The feature branch \`feature/admin-round-history\` adds:
- Administrator-only game editing/deletion, voting open/close, participant name corrections and active-list removal/restoration.
- Per-game round history with unlimited round numbers, placements (including ties), optional scores, and notes.
- Case-insensitive, whitespace-normalized participant name matching. A duplicate name cannot create a second participant.
- A duplicate-name request flow. Selecting an existing name sends an approval request; it does not immediately grant access to another participant's profile.
- Database-level name protection and normalized-name uniqueness.

### Apply the feature migration to another Supabase project

Run \`supabase/migrations/20261113_game_night_admin_round_history.sql\` in the Supabase SQL Editor. The connected Game Night Supabase project has already received the migration.

### Designate the first administrator

Admin permissions use the trusted \`app_metadata.role = "admin"\` claim, not user-editable profile metadata. First, join the app normally so your participant record exists. Then, in Supabase SQL Editor, replace \`YOUR EXACT PARTICIPANT NAME\` with the exact registered name and run:

\`\`\`sql
update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
from public.participants p
where p.id = u.id
  and lower(regexp_replace(btrim(p.name), '\\s+', ' ', 'g')) =
      lower(regexp_replace(btrim('YOUR EXACT PARTICIPANT NAME'), '\\s+', ' ', 'g'));
\`\`\`

Sign out and back in (or refresh the anonymous session) after the role change so the new JWT contains the admin claim. Keep admin access limited to trusted organizers.

The app continues to use anonymous sign-in. Because anonymous sessions are device/browser-specific, an existing participant link request requires an administrator to approve the association. An admin should approve only after verifying who is making the request in person or through a trusted channel.
