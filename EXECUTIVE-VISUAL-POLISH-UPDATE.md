# HOME31 V7.7.9 Executive Visual Polish

This frontend-only release preserves the V7.7.8 responsive navigation, session handling, project owner field, standard typography, database schema and Edge Functions.

## Visual changes

- Calmer command-centre background and softer panel shadows
- Consistent 16px card radius and spacing
- Eight equal, clickable KPI cards retained
- Colour is limited to meaningful accent borders and icons
- Budget Journey uses waterfall-style floating bars
- Readiness gauge replaced with a clearer percentage and horizontal progress indicator
- Cost-benefit view includes median decision quadrants
- Strategic pillar chart remains horizontal for readable labels
- Improved chart sizing and mobile stacking

## KPI interactions

- Portfolio, cost and challenge cards open the Enterprise Portfolio
- Strategic Priority opens priority records
- At Risk opens high-risk / at-risk records
- Portfolio Cost Basis opens records with confirmed Approved Budget values
- Budget Coverage opens records missing Approved Budget
- Strategic Readiness opens initiatives that have readiness follow-up

Use Clear All in Enterprise Portfolio to remove KPI-applied filters.

## Deployment

Replace `index.html`, `styles.css` and `app.js` in GitHub. Preserve the existing Supabase URL and publishable key in `app.js`.

No SQL migration or Edge Function deployment is required.
