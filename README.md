# HOME31 Enterprise Management Platform V7.9.0

Protected Form & Excel Import Edition for GitHub Pages and Supabase. The existing navy, gold, teal and red HOME31 command-centre theme is preserved.

## Current release highlights

- Automatic initiative-form drafts
- Draft recovery after accidental closure or refresh
- Protected modal close behaviour
- More consistent seven-step form presentation
- Admin-only Excel, XLS and CSV import
- Validation preview and duplicate checks
- Downloadable HOME31 Excel import template
- Project Owner Name and Approved Budget mapped consistently

See `FORM-PROTECTION-EXCEL-IMPORT-UPDATE.md` for details.

## Fresh installation

Read `FRESH-START-GUIDE.md`, then run `01-DATABASE-FRESH-INSTALL.sql`.

## Existing V7.8.0 installation

Replace:

- `index.html`
- `styles.css`
- `app.js`

No database migration or Edge Function redeployment is required.

## Website files

- `index.html`
- `styles.css`
- `app.js`
- `.nojekyll`

## Backend files

- `01-DATABASE-FRESH-INSTALL.sql`
- `02-VERIFY-DATABASE.sql`
- `supabase/functions/admin-create-user/index.ts`
- `supabase/functions/admin-reset-password/index.ts`
- `supabase/functions/change-own-password/index.ts`

## Safety

Use dummy or non-confidential records until production hosting, privacy, backup, recovery, monitoring, penetration testing and operational ownership are formally approved.


## V7.9.0 management clarity and official Excel template

The Executive Overview includes one-click management views for finance, ICT, watchlist, missing information and department readiness. Active portfolio filters are shown as removable chips.

Super admins can download the official workbook from **Enterprise Portfolio > Excel Template** or from inside **Import Excel**. The repository also contains `HOME31-Initiative-Import-Template.xlsx`.
