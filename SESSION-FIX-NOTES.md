# HOME31 V7.7.3 Session Stability Fix

This is a frontend-only hotfix. No database migration or Edge Function deployment is required.

## Cause fixed

The previous frontend awaited database work directly inside Supabase `onAuthStateChange`. That can deadlock the shared Supabase client after a logout and subsequent login.

## Changes

- Keeps the auth callback synchronous.
- Defers session routing until the callback has returned.
- Cancels stale login/logout routes.
- Prevents an old login route reopening the dashboard after logout.
- Resets the sidebar, modal, charts and admin body classes on logout.
- Forces the login card to be visible whenever the signed-out screen opens.

## GitHub update

Replace these files:

- `app.js`
- `index.html`

`styles.css` is unchanged from V7.7.2.

Before uploading the replacement `app.js`, restore your own values for:

```javascript
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR-PUBLISHABLE-KEY";
```

Never place a secret key or service-role key in the browser file.

After GitHub Pages deploys, sign out, close all HOME31 tabs, reopen the site and perform a hard refresh.
