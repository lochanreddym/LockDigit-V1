# LockDigit Beta Launch Evidence Pack

- Generated at: 2026-02-25T21:49:41.640Z
- Git commit: 05ab296
- Check mode: full validation
- Overall status: PASS

## Command Evidence

### npm run typecheck
- Status: pass
- Exit code: 0

```text
> lockdigit@1.0.0 typecheck
> npm run typecheck:app && npm run typecheck:convex


> lockdigit@1.0.0 typecheck:app
> tsc --noEmit


> lockdigit@1.0.0 typecheck:convex
> tsc --noEmit --project convex/tsconfig.json
```

### npm run lint
- Status: pass
- Exit code: 0

```text
> lockdigit@1.0.0 lint
> expo lint --max-warnings 0

env: load .env.local .env
env: export [REDACTED: Firebase, Stripe, Convex, Polygon variables]
```

### npm run test
- Status: pass
- Exit code: 0

```text
  ...
# Subtest: failure-injection script supports dry-run mode
ok 2 - failure-injection script supports dry-run mode
  ---
  duration_ms: 25.750917
  ...
# Subtest: evidence-pack script writes markdown output
ok 3 - evidence-pack script writes markdown output
  ---
  duration_ms: 40.375208
  ...
1..3
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 99.121083
```

### npm run security:deps
- Status: pass
- Exit code: 0

```text
> lockdigit@1.0.0 security:deps
> npm audit --audit-level=high

found 0 vulnerabilities
```

### npm run security:secrets
- Status: pass
- Exit code: 0

```text
> lockdigit@1.0.0 security:secrets
> node scripts/check-secrets.cjs

Secret scan passed.
```

## Required Attachments

1. Failure injection report (`docs/beta/failure-injection-runbook.md`).
2. Reconciliation summary for last 7 days.
3. Alert fire/resolve screenshots for webhook lag and mismatch alarms.
4. Rollback owner confirmation and on-call roster.
