const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("CI workflow includes quality and security gates", () => {
  const workflowPath = path.join(process.cwd(), ".github/workflows/ci.yml");
  assert.equal(fs.existsSync(workflowPath), true, "CI workflow file is missing");

  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.match(workflow, /Quality Gates/);
  assert.match(workflow, /Security Gates/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm run test:unit/);
  assert.match(workflow, /npm run test:integration/);
  assert.match(workflow, /npm run security:deps/);
  assert.match(workflow, /npm run security:secrets/);
});
