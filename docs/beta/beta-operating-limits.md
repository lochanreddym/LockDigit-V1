# Beta Operating Limits

## User And Risk Caps

- Maximum active beta users: 5,000
- Maximum new invites per day: 250
- Maximum per-user daily payment volume: 2,500 USD
- Maximum per-transaction amount: 500 USD (manual review above this threshold)

## Manual Review Thresholds

- Any transfer ≥ 500 USD
- More than 5 failed PIN attempts in 24h
- New device + payment attempt in same session
- Payment activity burst exceeding 10 transactions in 10 minutes

## Operational Controls

- Feature flags:
  - Blockchain anchoring: default OFF for new cohorts
  - Advanced verification: cohort-controlled
  - Transfer limits: remotely adjustable
- Daily reconciliation: Stripe vs Convex ledger balance check and mismatch resolution; required before increasing caps.

## Escalation

- Limit breaches auto-generate incident ticket.
- Sev2 escalation if breach affects payment integrity or auth isolation.
