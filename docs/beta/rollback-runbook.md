# Rollback Runbook

## Rollback Triggers

- Confirmed tenant-isolation break
- Payment finalization inconsistency
- Sustained Sev1/Sev2 impact after mitigation attempts

## Procedure

1. Declare rollback start and freeze all deploys.
2. Revert application code to last known-good production tag.
3. Revert feature flags to safe defaults:
   - Disable blockchain anchoring queue processing
   - Disable newly rolled out verification features
4. If schema changed:
   - Take backup of current Convex deployment and state before rollback.
   - Execute compatible rollback migration (if available)
   - Otherwise apply forward-fix with compatibility layer
5. Re-run smoke checks:
   - Authenticated session bootstrap
   - Payment create and status retrieval
   - Document list and retrieval
6. Confirm recovery with on-call + incident commander.

## Monitoring During Rollback

- Watch auth success rate, webhook lag, and reconciliation mismatch.
- Monitor error rates and latency for critical paths.
- Alert if metrics worsen during rollback.

## Success Criteria

- Smoke checks pass.
- No new Sev1/Sev2 incidents for 30 minutes.
- Metrics return to pre-incident baseline.
- Incident commander and on-call sign off.

## Communication

- Update stakeholder channel every 15 minutes during rollback.
- Close incident only after 30 minutes stable metrics.
- File postmortem within 48 hours for Sev1/Sev2.
