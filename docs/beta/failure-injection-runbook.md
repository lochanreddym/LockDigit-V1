# Failure Injection Runbook

This runbook defines required resilience drills before private beta cohort expansion.

## Preconditions

1. Staging environment is configured with Stripe webhook secret and reachable webhook URL.
2. On-call engineer, release owner, and observer are assigned.
3. Monitoring dashboard and alert channels are active.

## Drill Scenarios

1. Invalid signature rejection:
   - Send a signed Stripe-like event with a bad signature.
   - Expected result: HTTP `400`, no transaction finalization, alert counter increments.
2. Duplicate webhook replay:
   - Send the same event ID twice with valid signatures.
   - Expected result: first delivery processed, second delivery deduped without duplicate ledger postings.
3. Webhook outage simulation:
   - Temporarily point the injection script at an unreachable endpoint.
   - Expected result: payment remains pending; reconciliation and webhook-lag alerts fire.
4. Delayed completion:
   - Submit a valid success event after an artificial delay.
   - Expected result: transaction transitions from pending to completed via webhook path only.

## Scripted Execution

Use:

```bash
LOCKDIGIT_WEBHOOK_URL="https://<deployment>/stripe/webhook" \
STRIPE_WEBHOOK_SECRET="<secret>" \
node scripts/failure-inject-webhooks.cjs
```

Dry-run mode:

```bash
node scripts/failure-inject-webhooks.cjs --dry-run
```

## Exit Criteria

1. Invalid signatures are rejected with no state mutation.
2. Duplicate events are idempotent.
3. Webhook outage is detectable through alerting.
4. Recovery path returns normal processing without manual data repair.
