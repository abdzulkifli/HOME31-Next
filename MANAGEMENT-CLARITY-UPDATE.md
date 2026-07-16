# HOME31 V7.9.0 Management Clarity Experience

## Management views

The Executive Overview now includes six one-click management views:

- Executive Overview
- Finance Review
- ICT Review
- Watchlist
- Missing Information
- Department Readiness

Each view opens the Enterprise Portfolio with a defined quick filter. Active filters are shown as removable chips above the register.

## Official Excel template

Super admins can obtain the official workbook in either place:

1. `Enterprise Portfolio > Excel Template`
2. `Enterprise Portfolio > Import Excel > Download Official Template`

The GitHub repository also contains:

`HOME31-Initiative-Import-Template.xlsx`

The workbook contains:

- `HOME31 Import` — blank upload sheet read by the importer
- `Instructions` — step-by-step usage and field mapping
- `Reference Lists` — valid dropdown values
- `Example Record` — a reference example that is not imported

## Consistent field mapping

| Excel heading | Database field | Dashboard treatment |
|---|---|---|
| Project Owner Name | `accountable_owner` | Enterprise Initiative Register owner column |
| Approved Budget | `approved_budget` | Portfolio cost basis |
| YEAR | `implementation_year` | AMP year selector and comparison |
| Departments | `department` | Lead department |
| Initiative | `initiative_name` | Required initiative title |
| HOME31 Strategic Pillar | `strategic_pillar` | Strategic classification |
| No. | `source_reference_no` | Optional source reference |

No database migration or Edge Function redeployment is required from V7.8.1.
