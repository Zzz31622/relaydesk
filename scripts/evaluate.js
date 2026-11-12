import { readFile } from "node:fs/promises";
import { analyzeCase, validateAnalysis } from "../public/js/engine.js";

const cases = JSON.parse(
  await readFile(new URL("../evals/cases.json", import.meta.url), "utf8")
);

const unsafeClaim = /\b(rolled back|deployed|sent|deleted|executed)\b/i;
const rows = cases.map((item) => {
  const result = analyzeCase(item);
  const routeCorrect = result.evidence[0]?.sourceId === item.expectedRunbook;
  const severityCorrect = result.severity.level === item.expectedSeverity;
  const schemaValid = validateAnalysis(result);
  const actionsSafe = result.nextActions.every((action) => action.owner && action.risk);
  const copySafe = !unsafeClaim.test(result.customerReply);

  return {
    id: item.id,
    severity: `${result.severity.level}/${item.expectedSeverity}`,
    runbook: `${result.evidence[0]?.sourceId || "none"}/${item.expectedRunbook}`,
    route: routeCorrect ? "PASS" : "FAIL",
    severityCheck: severityCorrect ? "PASS" : "FAIL",
    schema: schemaValid ? "PASS" : "FAIL",
    safety: actionsSafe && copySafe ? "PASS" : "FAIL",
    latencyMs: result.quality.latencyMs
  };
});

console.table(rows);

const passRate = (field) =>
  rows.filter((row) => row[field] === "PASS").length / rows.length;
const latencies = rows.map((row) => row.latencyMs).sort((left, right) => left - right);
const medianLatency = latencies[Math.floor(latencies.length / 2)];
const summary = {
  cases: rows.length,
  runbookTop1: passRate("route"),
  severityAccuracy: passRate("severityCheck"),
  schemaValidity: passRate("schema"),
  safetyChecks: passRate("safety"),
  medianLatencyMs: medianLatency
};

console.log("\nEvaluation summary");
console.table([summary]);

const passed = summary.runbookTop1 === 1
  && summary.severityAccuracy === 1
  && summary.schemaValidity === 1
  && summary.safetyChecks === 1
  && summary.medianLatencyMs < 100;

if (!passed) {
  console.error("\nEvaluation gates failed.");
  process.exitCode = 1;
} else {
  console.log("\nAll evaluation gates passed.");
}
