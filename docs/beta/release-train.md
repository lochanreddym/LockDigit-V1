# Release Train (Private Beta)

## Cadence

- Weekly release cutoff: Tuesday 17:00 PT
- Candidate build window: Wednesday 09:00-13:00 PT
- Production release window: Wednesday 14:00-16:00 PT
- Hotfix window: any time for Sev1/Sev2 incidents

## Branching And Promotion

1. Changes land on feature branches through pull requests.
2. Approved changes merge into `develop`.
3. Weekly cut creates `release/<yyyy-mm-dd>`.
4. Promote to `main` only after quality + security CI gates pass.

## Freeze Policy

- Allowed during freeze:
  - Security fixes
  - Data integrity fixes
  - Reliability/availability fixes
  - Incident response patches
- Blocked during freeze:
  - New feature scope
  - UI polish-only changes
  - Non-essential refactors

## Go/No-Go Checklist

1. CI pipeline green for quality and security jobs.
2. No unresolved Sev1/Sev2 incidents.
3. Reconciliation mismatch rate below beta threshold.
4. On-call engineer and rollback owner assigned.
5. Migration runbook approved for any schema/API change.

## Rollback Policy

- Trigger rollback when any release causes:
  - Confirmed cross-tenant access defect
  - Payment finalization integrity defect
  - Sustained Sev1 impact longer than 15 minutes
- Rollback target:
  - Revert to prior production tag within 30 minutes.
  - Follow [rollback-runbook.md](./rollback-runbook.md).
