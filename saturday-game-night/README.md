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
- The app URL is public, but creating a new participant account requires the current group password. Existing registered participants can continue using their existing browser session.
- Anonymous sessions are browser/device-specific. If someone clears browser data or switches devices, they may appear as a new participant.
- The Supabase anon/publishable key is intended for browser use; keep row-level security enabled. Never put a service-role key in this app.
- This starter app does not include an admin dashboard to close voting. The `event_settings.voting_open` field can be changed to `false` in Supabase Table Editor when you want to close voting.


## Admin controls and game history

The feature branch \`feature/admin-round-history\` adds:
- Administrator-only game editing/deletion, voting open/close, participant name corrections and active-list removal/restoration.
- Per-game round history with unlimited round numbers, placements (including ties), optional scores, and notes.
- Case-insensitive, whitespace-normalized participant name matching. A duplicate name cannot create a second participant.
- Existing participant names require the participant password before a new browser/device session can access that profile. Names are matched case-insensitively and duplicate accounts cannot be created.
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

Reload the app after the role change. The app refreshes the current session token at startup so the new JWT includes the admin claim; do not sign out of the anonymous admin session, because anonymous accounts are browser/device-specific. Admins can correct their own name from the Admin controls. Keep admin access limited to trusted organizers.

The app continues to use anonymous sign-in. Because anonymous sessions are device/browser-specific, participants use their participant name and password to reconnect from another browser or device. A participant password is stored as a bcrypt hash in the private schema. Password verification is rate-limited (five failed attempts trigger a 15-minute lockout).


## Group password and administrator management

- New participant registrations must enter the group password before a participant row can be created. The database verifies the password using a bcrypt hash; the plaintext password is never stored or sent to the browser as a setting.
- Incorrect password attempts are rate-limited per anonymous account (five failures trigger a 15-minute lockout). A database policy also blocks direct API inserts that did not pass the password check.
- An existing participant session remains active when the group password changes. The new password applies to new anonymous sessions and registrations.
- Admins can set or replace the group password in **Admin controls → Group password**. Use a password of at least six characters.
- Admins can promote participants or remove admin access in **Admin controls → Administrator access**. Admin roles are stored in trusted Supabase Auth app metadata, not user-editable profile metadata. The last administrator cannot be removed.
- When an admin promotes someone, that person should reload the app (or refresh their session) to receive the updated administrator claim. Role removal takes effect when the affected user's access token refreshes.
- Apply `supabase/migrations/20261113_group_password_and_admin_management.sql` after the existing admin/round-history migration on a fresh project. The connected Game Night Supabase project has already received these changes.

 
## Participant passwords and normal admin mode

- When creating a participant for the first time, choose a participant password of at least eight characters and enter the group password.
- When a name already exists, enter that participant's password to sign in to the existing profile. A name alone never grants access, and no duplicate participant is created.
- Passwords are stored as bcrypt hashes in the private schema. Admins can use **Admin controls → Manage participants → Reset password** to set a new password for a participant.
- Participants created before password sign-in was added do not have a participant password yet. An admin must reset/set a password for each existing participant before they can sign in from a new browser or device. Existing active sessions continue to work.
- Admins can select **Switch to normal mode** in the top bar to hide all admin-only buttons and controls while using the board as a regular participant. Select **Switch to admin mode** to show them again. This does not remove administrator permissions.
- Apply `supabase/migrations/20261113_participant_passwords.sql` after the group-password migration on a fresh project. The connected Game Night Supabase project has already received this migration.
