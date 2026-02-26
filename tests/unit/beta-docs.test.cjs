const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const requiredDocs = [
  "docs/beta/README.md",
  "docs/beta/release-train.md",
  "docs/beta/beta-operating-limits.md",
  "docs/beta/incident-severity-and-response.md",
  "docs/beta/migration-runbook.md",
  "docs/beta/rollback-runbook.md",
  "docs/beta/monitoring-and-alerting.md",
  "docs/beta/failure-injection-runbook.md",
  "docs/beta/staged-rollout-runbook.md",
  "docs/beta/launch-signoff-evidence.md",
];

test("beta governance docs are present", () => {
  for (const file of requiredDocs) {
    const absolute = path.join(process.cwd(), file);
    assert.equal(fs.existsSync(absolute), true, `${file} is missing`);
  }
});

test("release train doc includes freeze and rollback controls", () => {
  const releaseTrain = fs.readFileSync(
    path.join(process.cwd(), "docs/beta/release-train.md"),
    "utf8"
  );

  assert.match(releaseTrain, /freeze/i);
  assert.match(releaseTrain, /rollback/i);
  assert.match(releaseTrain, /weekly/i);
});

test("failure injection runbook references scripted drills", () => {
  const runbook = fs.readFileSync(
    path.join(process.cwd(), "docs/beta/failure-injection-runbook.md"),
    "utf8"
  );

  assert.match(runbook, /invalid signature/i);
  assert.match(runbook, /duplicate/i);
  assert.match(runbook, /scripts\/failure-inject-webhooks\.cjs/i);
});
