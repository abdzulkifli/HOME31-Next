# V7.3 Executive Overview Guide

## Executive logic

### Strategic readiness

The portfolio readiness percentage is derived from seven checks for each record:

1. Description or problem statement
2. Dated action plan, start date or target date
3. Confirmed post-challenge cost field
4. Priority status assessed
5. ICT classification assessed
6. HOME31 strategic pillar assigned
7. Derived HOME31 fit is not “Needs Validation”

### Cost journey

- Original Estimate: sum of `estimated_cost`
- Effective Post-Challenge: sum of `estimated_cost_post_challenge`
- Proposed Budget: sum of `proposed_budget_post_retreat`
- Approved Budget: sum of `approved_budget`

Blank values are excluded from totals and shown through coverage counts.

### Quarterly delivery load

The dashboard extracts dates in these formats from the action plan:

- `YYYY-MM-DD`
- `DD/MM/YYYY`

Start and target completion dates are used as fallback.

### HOME31 fit

The fit classification is derived for management viewing:

- Core Initiative
- Enabler
- Supporting Activity
- BAU · Supporting Enhancement
- Duplicate / Consolidate
- Needs Validation
- Policy Review

### AMP2026 comparison

The reference baseline is configured in `app.js` under:

```javascript
const AMP2026_BASELINE = { ... };
```

Replace it with formally reconciled baseline values when available.


## V7.5 live year-aware comparison

The Executive Overview no longer uses a fixed AMP2026 constant.

### Record separation

```text
implementation_year = 2026 → AMP2026
implementation_year = 2027 → AMP2027
```

### Cost basis

```text
AMP2026 → Approved Budget
AMP2027 → Estimated Cost Post Challenge
```

### Automatic updates

Adding, editing or deleting year-specific records updates:

- Headline portfolio figures
- AMP2026 versus AMP2027 comparison
- Department cost concentration
- Priority and watchlist counts
- Department representation
- Year-filtered risks and exceptions
