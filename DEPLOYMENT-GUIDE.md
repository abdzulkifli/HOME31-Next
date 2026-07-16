# HOME31 V7.7.1 Fresh Deployment Guide

Follow `FRESH-START-GUIDE.md` in order. This package intentionally excludes upgrade SQL files.

## Supabase key model

Use the Project URL and `sb_publishable_...` key in `app.js`. Hosted Edge Functions read Supabase's default publishable and secret key collections, with temporary legacy-key fallback. Never copy a secret or service-role key into the repository.

## Function authentication

Deploy with `--no-verify-jwt`. The functions themselves reject missing or invalid user access tokens, check account status, and enforce super-admin privileges where required.

## GitHub Pages

Publish from the `main` branch and `/(root)`. Keep `.nojekyll` in the repository root.

## V7.8.1 protected form and Excel import

For an existing V7.8.0 deployment, replace `index.html`, `styles.css` and `app.js`.

No SQL migration or Edge Function redeployment is required.

V7.8.1 loads SheetJS Community Edition from `https://cdn.sheetjs.com` to parse Excel workbooks and generate the HOME31 import template in the browser. The supplied Content Security Policy already permits this source.
