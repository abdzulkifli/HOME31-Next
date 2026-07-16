# HOME31 V7.7.4 Project Owner Update

This frontend update makes the existing `accountable_owner` record field explicit in the interface as **Project owner name**.

## Changes

- Initiative form label changed to Project owner name.
- New normal-user records prefill the owner from the signed-in profile.
- Management review summary uses Project owner.
- Personal initiative cards show the project owner.
- Enterprise portfolio table and CSV export use Project Owner wording.

## Database

No SQL migration is required. The value continues to be stored in the existing `public.initiatives.accountable_owner` column.

## Deployment

Replace `index.html` and `app.js` in GitHub. Preserve your Supabase URL and publishable key when replacing `app.js`.
