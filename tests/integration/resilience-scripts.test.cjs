const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("failure-injection script supports dry-run mode", () => {
  const result = spawnSync("node", ["scripts/failure-inject-webhooks.cjs", "--dry-run"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || "dry-run command failed");
  assert.match(result.stdout, /Failure-injection dry run/);
  assert.match(result.stdout, /duplicate webhook replay/);
});

test("evidence-pack script writes markdown output", () => {
  const outputPath = path.join(
    process.cwd(),
    "artifacts",
    "test-beta-launch-evidence.md"
  );

  const result = spawnSync(
    "node",
    [
      "scripts/build-beta-evidence-pack.cjs",
      "--skip-checks",
      "--output",
      outputPath,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    }
  );

  assert.equal(result.status, 0, result.stderr || "evidence script failed");
  assert.equal(fs.existsSync(outputPath), true, "evidence output file missing");

  const markdown = fs.readFileSync(outputPath, "utf8");
  assert.match(markdown, /Beta Launch Evidence Pack/);
  assert.match(markdown, /Required Attachments/);

  fs.rmSync(outputPath, { force: true });
});
