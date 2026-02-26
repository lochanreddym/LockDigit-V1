# Monitoring And Alerting Baseline

## Beta SLO Targets

- Authenticated session success: ≥ 99.5% (alert if below for 15 minutes)
- Stripe webhook processing success: >= 99.9%
- Reconciliation mismatch rate: < 0.1%
- Cross-tenant data incidents: 0 confirmed

## Required Dashboards

- Auth:
  - Token verification failures
  - Bootstrap session errors
- Payments:
  - Payment state distribution
  - Webhook lag and failure count
  - Reconciliation mismatch trend
- Documents:
  - Verification failure rate (SLO: < 5% over 15 minutes)
  - Anchoring queue backlog and retry rate

## Required Alerts

- Critical:
  - Webhook lag > 5 minutes for 10 minutes
  - Reconciliation mismatch > 0.1% in rolling 24h
  - Any confirmed cross-tenant access event
- High:
  - PIN lockout spike > 2x baseline (baseline: rolling 7-day average of daily lockout count)
  - Verification failure rate > 5% for 15 minutes
  - Pending transaction age > ALERT_PENDING_TXN_AGE_MS (default 10 minutes)

## Convex Operational Alerting

- Cron `evaluate operational alerts` runs every 5 minutes.
- Alerts are written as immutable `auditLogs` entries with `targetType=ops_alert`.
- Live snapshot query is available via `ops.getAlertSnapshot`.

Threshold environment variables (optional):

- `ALERT_WEBHOOK_LAG_MS`
- `ALERT_PENDING_TXN_AGE_MS`
- `ALERT_PIN_FAILURE_SPIKE_THRESHOLD`
- `ALERT_COOLDOWN_MS`

## Operating Cadence

- Daily:
  - Reconciliation review
  - Alert review and triage
- Weekly:
  - Security review with action tracking
  - Risk review against beta limits
