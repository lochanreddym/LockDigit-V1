# Staged Rollout Runbook

## Cohort Order

1. Internal QA
2. Staff beta
3. Invited external beta

## Promotion Gates

A cohort can be promoted only when all conditions hold for 5 consecutive days. A single day failure resets the streak; the 5-day count restarts from day 1.

1. Authenticated session success >= 99.5%.
2. Webhook processing success >= 99.9%.
3. Reconciliation mismatch rate < 0.1%.
4. No confirmed cross-tenant access incidents.
5. No unresolved Sev1 incidents.

## Cohort Controls

1. Enforce max users and payment caps from `beta-operating-limits.md`.
2. Keep blockchain anchoring and advanced verification behind feature flags.
3. Keep kill switch owner assigned for each rollout window.

Current defaults for this repository:

1. `FEATURE_BLOCKCHAIN_ANCHORING=false` (set in Convex env for beta safety).
2. `FEATURE_ADVANCED_VERIFICATION=false` (cohort-controlled; enable per cohort when validated).
3. `BETA_DAILY_PAYMENT_LIMIT_CENTS=250000` (or stricter per policy).

## Daily Cadence (Launch Weeks)

1. Reconciliation review (payments + ledger).
2. Webhook lag and failure trend review.
3. Security exceptions and lockout trend review.
4. Support escalation review with incident classification.

## Weekly Cadence

1. Security review and remediation tracking.
2. Risk review against beta operating limits.
3. Release train go/no-go for next cohort.

## Rollback Trigger

Rollback immediately if any of the following occurs:

1. Confirmed cross-tenant data access.
2. Payment state/ledger divergence with customer impact.
3. Sustained Sev1 incident > 15 minutes.

Follow `rollback-runbook.md` and document incident timeline within 48 hours.
