# Migration Runbook (Schema/API)

## Preconditions

1. Migration has rollback path documented.
2. Migration validated in staging with production-like dataset.
3. Release owner and rollback owner assigned.
4. Freeze policy active for non-critical changes.
5. Full backup of Convex deployment and relevant state taken.
6. Maintenance window communicated to stakeholders (if downtime expected).
7. Notification sent to ops channel with start time and expected duration.
8. Verify existing deployed code is forward-compatible with the new schema (rollback safety) prior to deploying new code.

## Execution Steps

1. Announce migration start in ops channel.
2. Enable maintenance flag if required (e.g., schema change breaks old code, or migration requires exclusive access).
3. Deploy backward-compatible new code first (new code must tolerate the old schema).
4. Run schema migration:
   - Execute Convex schema push or migration script.
   - Verify migration completion (row counts, index creation).
   - Run smoke queries to confirm new schema is readable.
5. Run post-migration integrity checks:
  - Auth subject uniqueness
  - Payment state consistency
  - Ledger posting invariants
6. Monitor logs and error rates for 30 minutes.
7. Disable maintenance flag after successful validation:
   - Confirm step 5 checks pass and no Sev1/Sev2 alerts fire during step 6.
   - Clear maintenance mode (for example, set `MAINTENANCE_MODE=false`) and verify it is off.
   - If user-impacting errors appear after disabling, re-enable maintenance mode and start rollback procedure.

## Validation Checklist

- No increase in unauthorized access errors caused by regression.
- Webhook processing lag stays within SLO.
- Reconciliation mismatch does not exceed threshold.
- Key user read/write flows succeed.

## Failure Handling

- Stop further deploys immediately.
- Trigger rollback from [rollback-runbook.md](./rollback-runbook.md).
- Open incident and classify severity.
