# HOME31 V7.8.1 — Protected Form & Excel Import

## Initiative form protection

The Enterprise Initiative Record now protects unfinished work in the browser.

- Changes are saved automatically after a short pause.
- The **Save draft now** control is available at all times.
- Clicking outside the form no longer closes it.
- The close icon and Escape key warn before closing a changed form.
- **Save Draft & Close** closes safely without losing entered values.
- Reopening the same new or existing record offers **Restore draft** or **Discard**.
- Drafts are removed after the initiative is saved successfully to Supabase.
- Drafts are stored per signed-in user and per initiative record on the current device.

Browser drafts are a recovery convenience, not an approved records repository. Sensitive information should follow organisational data-handling requirements.

## Consistent form presentation

- Wider management-form workspace
- Sticky header, step navigation and action footer
- Consistent field heights, labels, helper text and focus indicators
- Clear `Step x of 7` indicator
- Draft status and recovery banner
- Mobile full-screen form behaviour retained
- The floating Display control is hidden while a modal is open

## Admin Excel import

Super admins can open:

`Enterprise Portfolio → Import Excel`

Supported files:

- `.xlsx`
- `.xls`
- `.csv`

The first worksheet is read in the browser. The admin reviews validation results before any record is inserted.

### Import safeguards

- Required-field validation
- Project Owner Name mapping to `accountable_owner`
- Approved Budget mapping to `approved_budget`
- Financial confirmation flags based on whether a cell is populated
- Valid year, status, risk and percentage checks
- Fallback project owner, strategic pillar, year and record account
- Likely duplicate detection
- Invalid and skipped rows are not uploaded
- Preview of the first 25 rows
- Import in controlled batches

### Duplicate matching

A row is considered a likely duplicate when the selected year matches and either:

1. Source reference number matches, or
2. Initiative name and department both match.

### Template

The import screen can generate `HOME31-Initiative-Import-Template.xlsx` with the supported headings and an example row.

## Deployment

For an existing HOME31 V7.8.0 installation, replace:

- `index.html`
- `styles.css`
- `app.js`

No database migration or Edge Function redeployment is required.
