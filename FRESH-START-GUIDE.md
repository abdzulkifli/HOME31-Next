# HOME31 V7.7.1 — Fresh Start Guide

This package is for a completely empty GitHub repository and a brand-new Supabase project.

## Important rules

- Run only `01-DATABASE-FRESH-INSTALL.sql`.
- Do not run any V7.1, V7.2 or V7.7 upgrade script.
- Put only the Supabase Project URL and publishable key in `app.js`.
- Never put a secret key or service-role key in GitHub.
- Deploy the three Edge Functions with `--no-verify-jwt`; each function validates the user's access token and role internally.

## Exact order

1. Create a new Supabase project.
2. Run `01-DATABASE-FRESH-INSTALL.sql`.
3. Run `02-VERIFY-DATABASE.sql`.
4. Create the first Auth user in the Supabase dashboard.
5. Promote that profile to super admin using the SQL in this guide.
6. Copy the Project URL and publishable key into `app.js`.
7. Set Supabase Site URL and redirect URLs.
8. Set `ALLOWED_ORIGINS`.
9. Deploy all three Edge Functions.
10. Upload all files in this folder to the GitHub repository root.
11. Enable GitHub Pages from `main` and `/(root)`.
12. Test admin login, normal-user creation and forced password change.

## Promote the first administrator

```sql
update public.profiles
set role = 'super_admin',
    must_change_password = false,
    account_status = 'active',
    updated_at = now()
where lower(email) = lower('YOUR-ADMIN-EMAIL');
```

Confirm:

```sql
select email, role, account_status, must_change_password
from public.profiles
where lower(email) = lower('YOUR-ADMIN-EMAIL');
```

## Edge Function commands

Run these from the extracted package root. Replace the placeholders.

```bash
supabase login
supabase secrets set ALLOWED_ORIGINS="https://YOUR-GITHUB-USERNAME.github.io,http://localhost:8000,http://127.0.0.1:8000" --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-create-user --project-ref YOUR_PROJECT_REF --no-verify-jwt --use-api
supabase functions deploy admin-reset-password --project-ref YOUR_PROJECT_REF --no-verify-jwt --use-api
supabase functions deploy change-own-password --project-ref YOUR_PROJECT_REF --no-verify-jwt --use-api
supabase functions list --project-ref YOUR_PROJECT_REF
```

## GitHub Pages URL

For a project repository named `home31-project-register`:

```text
https://YOUR-GITHUB-USERNAME.github.io/home31-project-register/
```

Use that complete URL as the Supabase Site URL and an allowed redirect URL. The Edge Function origin is only:

```text
https://YOUR-GITHUB-USERNAME.github.io
```
