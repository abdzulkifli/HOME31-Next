# HOME31 V7.8.0 Data Consistency Update

## Portfolio cost basis

All portfolio-level cost totals, rankings, comparisons, pillar cost views, department concentration views and cost–benefit positioning now use the confirmed `approved_budget` field for every implementation year.

Financial-stage reporting remains separate:

- Original estimate: `estimated_cost`
- Post-challenge cost: `estimated_cost_post_challenge`
- Proposed budget: `proposed_budget_post_retreat`
- Portfolio cost basis / approved budget: `approved_budget`

Only confirmed financial fields are included in totals.

## Project owner

The Enterprise Initiative Register now displays `accountable_owner`, presented as **Project Owner Name**. It no longer displays the profile associated with `created_by` in the owner column.

`created_by` remains a system access and record-assignment field. It controls which account can access a record and is not used as the business project owner.

## Database

No migration is required. All corrected views use existing fields.
