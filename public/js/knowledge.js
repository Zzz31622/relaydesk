export const knowledgeBase = [
  {
    id: "RB-014",
    title: "API gateway canary rollback",
    category: "Reliability",
    owner: "Edge Platform",
    updated: "2026-09-28",
    tags: ["502", "gateway", "deployment", "canary", "upstream", "timeout", "rollback"],
    sections: [
      {
        heading: "Symptoms",
        text: "A deployment or canary release causes elevated 502/503 responses, upstream connection timeouts, or a sharp error-rate increase in one region. Healthy pods may still report ready while the gateway points to a bad upstream revision."
      },
      {
        heading: "Triage",
        text: "Compare the error window with the deployment history. Confirm the active upstream revision and region error split. Check gateway retries, connection-pool saturation, and recent config changes before changing traffic."
      },
      {
        heading: "Containment",
        text: "Pause the canary, shift traffic to the last healthy revision, and verify a successful synthetic request. Do not roll back the database in the same step. Capture gateway and upstream logs for the failed revision."
      },
      {
        heading: "Customer communication",
        text: "State the affected region and workflow, the containment action taken, and the next update time. Avoid claiming full recovery until the synthetic check and error-rate alert stay healthy for ten minutes."
      }
    ],
    actions: [
      { title: "Confirm bad revision", detail: "Correlate the 502 start time with the latest EU canary revision.", risk: "low", owner: "Support engineer" },
      { title: "Pause canary and shift traffic", detail: "Move traffic to the last healthy upstream revision.", risk: "medium", owner: "Edge Platform" },
      { title: "Run regional smoke check", detail: "Verify checkout and auth paths from the affected region.", risk: "low", owner: "Support engineer" },
      { title: "Set 15-minute recovery checkpoint", detail: "Watch gateway 5xx and upstream timeout rates for two windows.", risk: "low", owner: "Incident commander" }
    ],
    escalation: { team: "Edge Platform on-call", reason: "Production checkout path is degraded and traffic shifting requires platform ownership." }
  },
  {
    id: "RB-021",
    title: "SAML login loop and metadata mismatch",
    category: "Identity",
    owner: "Identity Access",
    updated: "2026-10-14",
    tags: ["sso", "saml", "okta", "login", "loop", "redirect", "clock", "metadata", "cookie"],
    sections: [
      {
        heading: "Symptoms",
        text: "Users authenticate at the identity provider but return to the login page. Common causes are stale SAML metadata, an assertion-consumer URL mismatch, clock skew over five minutes, or third-party cookies blocked in the browser."
      },
      {
        heading: "Triage",
        text: "Reproduce in a private browser window. Compare the identity-provider ACS URL and entity ID with the current workspace settings. Check assertion timestamps and whether failures affect one user, one group, or the full tenant."
      },
      {
        heading: "Containment",
        text: "Refresh SAML metadata, verify NTP synchronization, and remove stale identity-provider certificates. For a tenant-wide event, offer a temporary non-SSO administrator path under the access-control policy."
      },
      {
        heading: "Customer communication",
        text: "Ask for one failing request ID and whether other user groups are affected. Explain that no password or SAML assertion should be sent in the ticket."
      }
    ],
    actions: [
      { title: "Scope affected users", detail: "Confirm whether the login loop affects one user, one Okta group, or the tenant.", risk: "low", owner: "Support engineer" },
      { title: "Compare ACS and entity ID", detail: "Validate workspace SAML fields against current Okta metadata.", risk: "low", owner: "Identity Access" },
      { title: "Refresh metadata safely", detail: "Rotate stale metadata during a customer-approved change window.", risk: "medium", owner: "Identity Access" }
    ],
    escalation: { team: "Identity Access queue", reason: "SAML metadata changes affect tenant authentication and require identity ownership." }
  },
  {
    id: "RB-033",
    title: "Webhook duplicate delivery protection",
    category: "Integrations",
    owner: "Integrations",
    updated: "2026-08-19",
    tags: ["webhook", "retry", "duplicate", "idempotency", "invoice", "event", "delivery"],
    sections: [
      {
        heading: "Symptoms",
        text: "Webhook retries are expected when an endpoint times out, returns a 5xx, or does not acknowledge within the configured window. Consumers must use the event ID as an idempotency key because at-least-once delivery can produce duplicates."
      },
      {
        heading: "Triage",
        text: "Compare the event ID and delivery attempt headers for duplicate records. Check endpoint response latency and whether the consumer commits its transaction before acknowledging. Inspect retry policy changes and recent endpoint deployments."
      },
      {
        heading: "Containment",
        text: "Ask the customer to pause downstream invoice creation or make writes idempotent. Replay a single test event with one fixed event ID. Do not bulk replay until the consumer returns a 2xx within the timeout."
      },
      {
        heading: "Customer communication",
        text: "Collect a redacted event ID, delivery timestamp, response status, and endpoint latency. Do not ask for full webhook payloads because they may contain billing data."
      }
    ],
    actions: [
      { title: "Verify duplicate event IDs", detail: "Compare event ID and delivery attempt headers for the duplicate invoices.", risk: "low", owner: "Support engineer" },
      { title: "Make invoice write idempotent", detail: "Use the event ID as the customer-side idempotency key before acknowledging.", risk: "medium", owner: "Customer engineering" },
      { title: "Replay one fixed event", detail: "Validate one delivery while downstream invoice creation remains paused.", risk: "medium", owner: "Integrations" }
    ],
    escalation: { team: "Integrations engineering", reason: "Billing-side duplicates may create financial impact and need delivery trace review." }
  },
  {
    id: "RB-041",
    title: "Dashboard latency and query fan-out",
    category: "Performance",
    owner: "Analytics Platform",
    updated: "2026-10-02",
    tags: ["dashboard", "latency", "slow", "query", "fanout", "cache", "region", "slo"],
    sections: [
      {
        heading: "Symptoms",
        text: "Analytics dashboards become slow when filters trigger many concurrent queries, cache hit rate drops, or a workspace exceeds its query concurrency budget. A single slow chart can delay the full render."
      },
      {
        heading: "Triage",
        text: "Identify the slow widget, filter cardinality, region, and query count. Compare p50 and p95 latency over seven days. Check warehouse queue time separately from application render time."
      },
      {
        heading: "Containment",
        text: "Reduce widget concurrency, pre-aggregate high-cardinality filters, and warm the cache for the next reporting window. Do not increase global limits without checking warehouse load."
      }
    ],
    actions: [
      { title: "Profile slow widget", detail: "Separate warehouse queue time from application render time.", risk: "low", owner: "Support engineer" },
      { title: "Reduce query fan-out", detail: "Cap concurrent widgets and review high-cardinality filters.", risk: "low", owner: "Analytics Platform" },
      { title: "Warm next-window cache", detail: "Precompute the common reporting slice before the customer business window.", risk: "medium", owner: "Analytics Platform" }
    ],
    escalation: { team: "Analytics Platform", reason: "Sustained latency depends on query planning and workspace concurrency controls." }
  },
  {
    id: "RB-052",
    title: "Data export stuck or partial",
    category: "Data",
    owner: "Data Delivery",
    updated: "2026-07-08",
    tags: ["export", "csv", "stuck", "partial", "job", "download", "data", "timeout"],
    sections: [
      {
        heading: "Symptoms",
        text: "Large exports can stall at queued or processing when the row estimate exceeds the export worker window. A partial file usually means the signed download expired or the worker restarted before final manifest verification."
      },
      {
        heading: "Triage",
        text: "Check export job state, row limit, file size, worker retry count, and signed-URL expiry. Confirm whether the customer downloaded from an old link or retried during an active job."
      },
      {
        heading: "Containment",
        text: "Cancel stale jobs before retry. Reduce the date range or use partitioned exports. Verify checksum and row count before asking the customer to consume the file."
      }
    ],
    actions: [
      { title: "Inspect export job", detail: "Record job state, retry count, row estimate, and signed-URL age.", risk: "low", owner: "Support engineer" },
      { title: "Cancel stale worker", detail: "Cancel the stuck job before starting a partitioned retry.", risk: "medium", owner: "Data Delivery" },
      { title: "Verify manifest and checksum", detail: "Confirm row count and checksum before customer handoff.", risk: "low", owner: "Data Delivery" }
    ],
    escalation: { team: "Data Delivery", reason: "Partial data exports can affect customer reporting and require worker trace access." }
  },
  {
    id: "RB-063",
    title: "Permission denied after role change",
    category: "Authorization",
    owner: "Core Access",
    updated: "2026-11-03",
    tags: ["permission", "denied", "role", "access", "admin", "authorization", "session"],
    sections: [
      {
        heading: "Symptoms",
        text: "A role or team change may not appear until the user refreshes the authorization cache or starts a new session. Resource-level policy can also deny access even when the workspace role looks correct."
      },
      {
        heading: "Triage",
        text: "Capture user ID, resource ID, expected role, active session age, and request ID. Compare workspace, team, and resource policy decisions. Do not collect passwords or session cookies."
      },
      {
        heading: "Containment",
        text: "Refresh caches after confirming policy state. Grant the narrowest missing permission through the approved admin workflow, then ask the user to start a new session."
      }
    ],
    actions: [
      { title: "Capture policy context", detail: "Collect user, resource, expected role, session age, and request ID.", risk: "low", owner: "Support engineer" },
      { title: "Compare policy layers", detail: "Check workspace, team, and resource-level authorization decisions.", risk: "low", owner: "Core Access" },
      { title: "Apply least-privilege fix", detail: "Grant only the missing permission through the admin workflow.", risk: "high", owner: "Customer administrator" }
    ],
    escalation: { team: "Core Access", reason: "Authorization mismatches can expose sensitive resources and need policy trace review." }
  },
  {
    id: "RB-071",
    title: "Email delivery delayed",
    category: "Messaging",
    owner: "Messaging Platform",
    updated: "2026-06-21",
    tags: ["email", "delivery", "bounce", "delay", "spam", "dkim", "domain", "webhook"],
    sections: [
      {
        heading: "Symptoms",
        text: "Transactional email may be delayed by provider queue backlog, throttling, domain reputation, failed DKIM, or recipient-side filtering. A 202 from the email API confirms acceptance, not inbox delivery."
      },
      {
        heading: "Triage",
        text: "Check message ID, accepted time, provider event timeline, bounce type, and domain authentication. Compare delivery rates across domains and recipient providers."
      },
      {
        heading: "Containment",
        text: "Pause unsafe retries to avoid reputation damage. Fix domain authentication or recipient suppression first, then replay a small sample. Never send test messages to customer distribution lists."
      }
    ],
    actions: [
      { title: "Trace one message", detail: "Record message ID, provider events, bounce type, and domain authentication state.", risk: "low", owner: "Support engineer" },
      { title: "Check domain authentication", detail: "Verify DKIM, SPF alignment, and suppression records.", risk: "low", owner: "Messaging Platform" },
      { title: "Replay small sample", detail: "Retry three approved recipients after the delivery issue is contained.", risk: "medium", owner: "Messaging Platform" }
    ],
    escalation: { team: "Messaging Platform", reason: "Reputation and suppression changes require messaging infrastructure ownership." }
  },
  {
    id: "RB-082",
    title: "API rate limit and burst handling",
    category: "API",
    owner: "API Platform",
    updated: "2026-09-12",
    tags: ["rate", "limit", "429", "burst", "quota", "retry", "backoff", "api"],
    sections: [
      {
        heading: "Symptoms",
        text: "HTTP 429 responses appear when a client exceeds per-key or workspace burst limits. Retrying immediately can amplify load. A recent traffic pattern change or missing retry jitter commonly extends the incident."
      },
      {
        heading: "Triage",
        text: "Inspect rate-limit headers, request timestamps, API key, endpoint, burst size, and retry cadence. Separate a legitimate quota increase request from a client retry bug."
      },
      {
        heading: "Containment",
        text: "Apply bounded exponential backoff with jitter, spread batch jobs, and request a scoped quota review when usage is legitimate. Do not raise limits before understanding retry behavior."
      }
    ],
    actions: [
      { title: "Classify request pattern", detail: "Inspect 429 headers, burst size, endpoint, and retry cadence.", risk: "low", owner: "Support engineer" },
      { title: "Add bounded backoff", detail: "Apply exponential backoff with jitter and a maximum retry count.", risk: "medium", owner: "Customer engineering" },
      { title: "Escalate scoped quota review", detail: "Request a temporary limit review only after traffic is bounded.", risk: "medium", owner: "API Platform" }
    ],
    escalation: { team: "API Platform", reason: "Quota changes and per-key limit adjustments require platform ownership." }
  }
];
