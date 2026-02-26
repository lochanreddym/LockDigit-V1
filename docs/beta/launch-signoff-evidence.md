# Beta Launch Sign-off Evidence

Use this checklist to approve private beta launch and cohort expansion.

## Build And Security Evidence

1. `npm run typecheck` output captured.
2. `npm run lint` output captured.
3. `npm run test` output captured.
4. `npm run security:deps` output captured.
5. `npm run security:secrets` output captured.

## Security Isolation Evidence

1. Cross-tenant access test results.
2. Auth token enforcement test results.
3. PIN lockout and cooldown behavior test results.

## Compliance Evidence

1. Document retention policy documented and enforced (legal/compliance schedules, legal hold, jurisdictional requirements).
2. PII handling and encryption verification.
3. Audit log retention and access controls.

## Payment Integrity Evidence

1. Webhook signature rejection test result.
2. Duplicate webhook idempotency test result.
3. Reconciliation report for the last 7 days.
4. Ledger balance invariants check result.

## Reliability Evidence (Load/Performance)

1. Failure-injection drill report (`failure-injection-runbook.md`).
2. Alert fire/resolve proof for webhook lag and reconciliation mismatch.
3. Cron job cost/runtime summary on synthetic high-volume data.
4. Load test results for target concurrent users.
5. P95/P99 latency for critical paths (auth, payment, document verification).

## Operational Readiness Evidence (DR, Backup, Retention)

1. On-call roster for launch week.
2. Rollback owner assignment.
3. Migration + rollback runbooks linked in release ticket.
4. Approved beta operating limits.
5. Disaster recovery runbook and RTO/RPO targets.
6. Backup and restore verification (Convex, Stripe).
7. Data retention policy and automated cleanup (technical TTLs, deletion jobs, backup/archive cleanup automation).

## Sign-off

1. Engineering lead:
2. Security lead:
3. Operations lead:
4. Product owner:
5. Date (UTC):
