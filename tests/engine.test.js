import test from "node:test";
import assert from "node:assert/strict";
import { sampleCases } from "../public/js/cases.js";
import { analyzeCase, retrieveEvidence, validateCaseInput, validateAnalysis } from "../public/js/engine.js";

const expected = new Map([
  ["CAS-2841", ["P1", "RB-014"]],
  ["CAS-2838", ["P2", "RB-021"]],
  ["CAS-2834", ["P2", "RB-033"]],
  ["CAS-2829", ["P3", "RB-041"]]
]);

test("sample cases map to expected severity and primary runbook", () => {
  for (const item of sampleCases) {
    const result = analyzeCase(item);
    assert.equal(result.severity.level, expected.get(item.id)[0]);
    assert.equal(result.evidence[0].sourceId, expected.get(item.id)[1]);
  }
});

test("retrieval finds the control runbook for each supported failure mode", () => {
  const cases = [
    ["Webhook endpoint returns duplicate invoice callbacks", "webhook retry event id duplicate", "RB-033"],
    ["SAML login redirects back to sign in", "okta saml certificate acs login loop", "RB-021"],
    ["CSV export stuck in processing", "export job partial signed URL timeout", "RB-052"],
    ["User gets permission denied after role change", "authorization role cache denied request", "RB-063"],
    ["API client receives 429 bursts", "rate limit retry jitter request", "RB-082"]
  ];

  for (const [title, description, sourceId] of cases) {
    const evidence = retrieveEvidence({ title, description, logs: "", productArea: "", environment: "Production" });
    assert.equal(evidence[0].sourceId, sourceId, title);
  }
});

test("analysis is schema-valid and grounded", () => {
  const result = analyzeCase(sampleCases[0]);
  assert.equal(validateAnalysis(result), true);
  assert.ok(result.evidence.length > 0);
  assert.ok(result.nextActions.length >= 2);
  assert.match(result.customerReply, /Hi Maya/);
  assert.equal(result.escalation.required, true);
});

test("case validation rejects empty and oversized inputs", () => {
  assert.match(validateCaseInput({}), /title/i);
  assert.match(validateCaseInput({ title: "x", description: "y".repeat(8001) }), /8000/);
  assert.equal(validateCaseInput({ title: "Valid", description: "Useful detail" }), null);
});
