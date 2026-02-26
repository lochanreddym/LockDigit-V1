#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const argv = process.argv.slice(2);
const skipChecks = argv.includes("--skip-checks");
const outputIndex = argv.indexOf("--output");
const hasOutputValue =
  outputIndex >= 0 &&
  outputIndex + 1 < argv.length &&
  argv[outputIndex + 1] &&
  !String(argv[outputIndex + 1]).startsWith("-");
const outputArg = hasOutputValue ? argv[outputIndex + 1] : null;
if (outputIndex >= 0 && !hasOutputValue) {
  console.error("Error: --output requires a path argument.");
  process.exit(1);
}
const defaultOutput = path.join(
  process.cwd(),
  "artifacts",
  `beta-launch-evidence-${new Date().toISOString().slice(0, 10)}.md`
);
const outputPath = outputArg
  ? path.resolve(process.cwd(), outputArg)
  : defaultOutput;

const checks = [
  "npm run typecheck",
  "npm run lint",
  "npm run test",
  "npm run security:deps",
  "npm run security:secrets",
];

function runShellCommand(command) {
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    cwd: process.cwd(),
  });
  return {
    command,
    status: result.status === 0 ? "pass" : "fail",
    exitCode: result.status ?? 1,
    output: `${result.stdout || ""}${result.stderr || ""}`.trim(),
  };
}

function getGitRef() {
  const result = spawnSync("git rev-parse --short HEAD", {
    shell: true,
    encoding: "utf8",
    cwd: process.cwd(),
  });
  if (result.status !== 0) return "unknown";
  return result.stdout.trim();
}

function toSection(result) {
  const safeOutput = result.output
    ? result.output.split("\n").slice(-20).join("\n")
    : "No output captured.";
  return [
    `### ${result.command}`,
    `- Status: ${result.status}`,
    `- Exit code: ${result.exitCode}`,
    "",
    "```text",
    safeOutput,
    "```",
    "",
  ].join("\n");
}

function buildMarkdown(results) {
  const generatedAt = new Date().toISOString();
  const gitRef = getGitRef();
  const failed = results.filter((r) => r.status === "fail");

  return [
    "# LockDigit Beta Launch Evidence Pack",
    "",
    `- Generated at: ${generatedAt}`,
    `- Git commit: ${gitRef}`,
    `- Check mode: ${skipChecks ? "metadata-only" : "full validation"}`,
    `- Overall status: ${failed.length === 0 ? "PASS" : "FAIL"}`,
    "",
    "## Command Evidence",
    "",
    ...(results.length > 0 ? results.map(toSection) : ["No checks were run.", ""]),
    "## Required Attachments",
    "",
    "1. Failure injection report (`docs/beta/failure-injection-runbook.md`).",
    "2. Reconciliation summary for last 7 days.",
    "3. Alert fire/resolve screenshots for webhook lag and mismatch alarms.",
    "4. Rollback owner confirmation and on-call roster.",
    "",
  ].join("\n");
}

function main() {
  const results = skipChecks ? [] : checks.map(runShellCommand);
  const markdown = buildMarkdown(results);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, "utf8");

  console.log(`Evidence pack written to: ${outputPath}`);

  const failedCount = results.filter((r) => r.status === "fail").length;
  if (failedCount > 0) {
    console.error(`Evidence pack generated with ${failedCount} failing checks.`);
    process.exitCode = 1;
  }
}

main();
