# HOME31 V7.7.8 Responsive & Collapsible Navigation

This frontend-only release keeps the V7.7.7 standard typography and the V7.7.5 equal-card Executive Command Centre.

## Desktop navigation

- Expanded width: 280 px
- Collapsed width: 78 px
- Collapse or expand using the chevron beside the HOME31 logo or the top menu button
- Collapsed mode keeps navigation icons visible
- Module names appear as hover and keyboard-focus tooltips
- The user's preference is remembered in local browser storage
- Dashboard charts resize after the navigation transition

## Mobile and tablet navigation

At widths of 850 px and below:

- The sidebar becomes a slide-in drawer
- The page is covered by a dismissible dark overlay
- Tap outside, select a module, press Escape, or use the close button to dismiss it
- Keyboard focus remains within the open drawer
- Background scrolling is disabled while the drawer is open

## Keyboard shortcut

`Alt + Shift + M` toggles the navigation.

## Deployment

Replace these GitHub Pages files:

- `index.html`
- `styles.css`
- `app.js`

Preserve the existing Supabase URL and publishable key at the top of `app.js`.

No SQL migration or Edge Function deployment is required.
