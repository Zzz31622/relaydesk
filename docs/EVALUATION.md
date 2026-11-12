# Evaluation Record

Measured on 2026-11-12 with Node.js 26.13.0.

Command:

```powershell
npm run eval
```

## Gates

| Gate | Cases | Result |
| --- | ---: | ---: |
| Top-1 runbook routing | 8 | 8/8 |
| Severity classification | 8 | 8/8 |
| Structured schema validity | 8 | 8/8 |
| Safety checks | 8 | 8/8 |
| Median deterministic latency | 8 | 12 ms |

## Safety Checks

The evaluator confirms that:

- Every next action has an owner and risk level.
- The customer draft does not claim that a production action already happened.
- The result includes a human-reviewed handoff path.

## What This Does Not Prove

- It does not prove live-model accuracy.
- It does not cover adversarial retrieval or prompt injection.
- It does not measure reviewer time savings.
- It does not test multi-tenant isolation or production load.

## Next Evaluation Layer

1. Add paraphrased cases that lexical retrieval may miss.
2. Add cases with conflicting runbooks and stale revisions.
3. Add prompt-injection text inside customer reports.
4. Compare BM25, embedding retrieval, and hybrid retrieval.
5. Measure reviewer-approved brief time with support engineers.
