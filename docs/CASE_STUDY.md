# RelayDesk Case Study

## Problem

Support escalations arrive as partial customer reports, noisy logs, and implicit account context. Engineers must decide four things quickly:

1. How severe is the issue?
2. Which internal runbook applies?
3. What reversible action is safe now?
4. Who owns the next step?

Generic chat interfaces can answer these questions, but they often hide missing evidence, make unsupported production claims, and produce output that is hard to audit.

## Product Slice

RelayDesk focuses on one complete workflow: escalation intake to reviewed handoff.

The output contract contains:

- Situation summary.
- Severity, response target, and rationale.
- Leading hypothesis with confidence.
- Cited runbook sections.
- Safe next actions with risk, detail, and owner.
- Escalation recommendation.
- Customer-facing draft.
- Quality metrics and provider trace.

The application deliberately stops before executing production changes or sending a message. A human must review and approve the handoff.

## Forward-Deployed Engineering Fit

This project demonstrates the work that often sits between a model demo and customer adoption:

| FDE activity | Project evidence |
| --- | --- |
| Problem discovery | Narrow support-engineering workflow with explicit human gate |
| Rapid delivery | Runnable Node app with no runtime dependencies |
| System integration | Shared browser/server engine, optional model API, exportable handoff |
| Reliability | Schema checks, fallback path, request limits, static file hardening |
| Evaluation | Eight golden cases with routing, severity, schema, and safety gates |
| Customer communication | Grounded reply draft and safe-data warnings |
| Handoff quality | Markdown case brief and reviewer approval state |

## Key Design Decisions

### Ground first, generate second

Retrieval runs before analysis. The interface shows source IDs and excerpt text so the reviewer can inspect why a runbook was selected.

### Deterministic demo, optional live model

The project must be easy for a reviewer to run. A deterministic engine provides a stable local path and regression target. The live path uses the same evidence and must pass local validation before returning.

### Human gate over autonomy

The value is decision support, not unattended execution. The approval button records a local review state. It does not send a reply or run a production action.

### One shared engine

The browser imports the same engine used by the server. This avoids drift between the static demo and full-stack path.

## Evaluation

The current golden set has one control case for each synthetic runbook. The deterministic engine passes all gates:

- Top-1 runbook routing: 8/8.
- Severity classification: 8/8.
- Schema validity: 8/8.
- Safety checks: 8/8.
- Median local latency: 12 ms.

The set is small and synthetic. It is a regression harness, not a model-quality benchmark.

## Failure Handling

- A live provider timeout or invalid citation set falls back to deterministic analysis.
- A blank or oversized case is rejected before analysis.
- Static path traversal is blocked.
- Unknown live source IDs are removed, and output with no known citation is rejected.
- The customer draft asks for safe identifiers only and warns against sensitive payloads.

## What I Would Build Next

The next milestone is a real integration pilot:

1. Ingest customer-approved runbooks with document versions and tenant scope.
2. Connect a support system for case intake and reviewed write-back.
3. Capture reviewer edits as preference data for evaluation.
4. Add trace export and retrieval failure dashboards.
5. Test with five support engineers and measure time to safe next action.

The first success metric would be reviewer-approved case brief time, not raw model response time.

## Interview Summary

"I built RelayDesk because AI support demos often stop at text generation. I wanted the last mile: retrieval with visible citations, structured triage, safe actions, review controls, and an evaluation harness. The app runs without a key, but includes a guarded live-model path. I kept the scope to one escalation workflow and tested eight control cases. The main tradeoff is that lexical retrieval is deterministic and easy to inspect, but semantic retrieval is a clear next step once there is real customer data."
