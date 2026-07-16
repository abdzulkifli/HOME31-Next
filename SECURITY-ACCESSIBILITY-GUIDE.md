# HOME31 V7.7.1 Security & Accessibility Guide

## Security controls

### Database-enforced access

Initiative RLS now requires the signed-in profile to be active and to have completed the first-login password change. The browser interface is no longer the only enforcement point.

### Protected password changes

Users change passwords through `change-own-password`. Super admins assign temporary passwords through `admin-reset-password`. The browser cannot directly modify `must_change_password` or `password_changed_at`.

### Implemented roles

V7.7.1 intentionally exposes only:

- Super Admin
- Normal User

Other role names retained in older databases are treated as legacy or unimplemented until separate permissions and workflows are designed.

### Financial certainty

Each financial stage has a confirmation flag. A blank field is unassessed; a deliberately entered zero is a confirmed zero. Existing placeholder zeros remain unconfirmed until the record is reviewed and saved.

### Audit foundation

The database records initiative inserts, updates and deletes, plus changes to profile role, account status and first-login password status. Super admins can query `public.audit_log` under RLS.

### Browser hardening

The frontend includes a Content Security Policy, formula-safe CSV export and pinned CDN package versions. Edge Functions restrict browser origins through `ALLOWED_ORIGINS`.

## Accessibility controls

- Accessible names for icon buttons and charts
- Programmatic labels for personal portfolio filters
- Initiative dialog semantics
- Focus entry, focus trap, Escape close and focus restoration
- Keyboard-focusable chart canvases
- Corrected light-surface high-contrast text
- Responsive record-card tables
- Reduced-motion support
- Standard, Comfortable and Large reading modes

## Remaining organisational controls

V7.7.1 does not replace approved hosting architecture, security assessment, privacy review, records retention, business continuity, monitoring, incident response or user-support procedures.
