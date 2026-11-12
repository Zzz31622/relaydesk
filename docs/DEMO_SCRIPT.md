# Interview Demo Script

Keep the walkthrough under four minutes.

## 1. Frame The Problem

"Support engineers get partial reports and noisy logs. They need a safe next action, not just a summary. This is a forward-deployed workflow because the hard part is turning internal knowledge into a reviewed customer decision."

## 2. Open The P1 Case

Select `CAS-2841`.

Point out:

- Severity is P1.
- The leading runbook is `RB-014`.
- Evidence sections are visible.
- The containment plan contains a medium-risk traffic change.
- The escalation owner is visible.

## 3. Inspect The Reply

Open `Customer reply`.

Point out:

- No claim that the rollback already happened.
- The customer receives a next update window.
- Sensitive data collection is explicitly blocked.

## 4. Exercise The Human Gate

Check actions and approve the handoff.

State: "The model does not send or execute anything. The reviewer remains accountable."

## 5. Export

Use `Export brief`.

State: "The output is portable to an incident channel or support ticket."

## 6. Explain Verification

Run:

```powershell
npm test
npm run eval
```

State: "The golden set is small, but it creates regression protection for routing, severity, schema, and safety."

## 7. Close With Tradeoff

"I chose deterministic lexical retrieval because it is inspectable and runs everywhere. The next step is hybrid retrieval with tenant-scoped runbooks and reviewer-edit data."
