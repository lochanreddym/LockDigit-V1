#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ignorePatterns = [
  /^\.env(\..*)?$/,
  /^package-lock\.json$/,
  /^Podfile\.lock$/,
  /\.keystore$/,
  /^google-services\.json$/,
  /^GoogleService-Info\.plist$/,
];

const secretPatterns = [
  { name: "AWS Access Key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Stripe live key", regex: /\bsk_live_[0-9a-zA-Z]{16,}\b/g },
  { name: "GitHub token", regex: /\bghp_[A-Za-z0-9]{36}\b/g },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  {
    name: "Private key block",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
];

function shouldIgnore(filePath) {
  const basename = path.basename(filePath);
  return ignorePatterns.some((pattern) => pattern.test(basename));
}

function isProbablyText(content) {
  return !content.includes("\u0000");
}

function getTrackedFiles() {
  const output = execSync("git ls-files", { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function scanFile(filePath) {
  const absolutePath = path.join(process.cwd(), filePath);
  let content;
  try {
    content = fs.readFileSync(absolutePath, "utf8");
  } catch {
    return [];
  }

  if (!isProbablyText(content)) return [];

  const findings = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes("secret-scan:allow")) continue;
    for (const pattern of secretPatterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        findings.push({
          filePath,
          lineNumber: i + 1,
          pattern: pattern.name,
        });
      }
    }
  }
  return findings;
}

function main() {
  const trackedFiles = getTrackedFiles().filter((filePath) => !shouldIgnore(filePath));
  const findings = trackedFiles.flatMap(scanFile);

  if (findings.length === 0) {
    console.log("Secret scan passed.");
    return;
  }

  console.error("Potential secret(s) detected:");
  for (const finding of findings) {
    console.error(
      `- ${finding.filePath}:${finding.lineNumber} (${finding.pattern})`
    );
  }
  process.exit(1);
}

main();
