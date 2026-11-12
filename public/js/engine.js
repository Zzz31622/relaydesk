import { knowledgeBase } from "./knowledge.js";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "can", "for",
  "from", "has", "have", "in", "is", "it", "its", "of", "on", "or", "our", "that",
  "the", "their", "this", "to", "was", "we", "were", "with", "you", "your"
]);

const SYNONYMS = new Map([
  ["502", ["gateway", "upstream", "bad"]],
  ["503", ["gateway", "upstream", "unavailable"]],
  ["checkout", ["payment", "api"]],
  ["login", ["sso", "saml", "auth"]],
  ["loop", ["redirect", "saml"]],
  ["duplicate", ["idempotency", "retry"]],
  ["invoice", ["billing", "webhook"]],
  ["slow", ["latency", "performance"]],
  ["stuck", ["export", "job"]],
  ["denied", ["permission", "authorization"]],
  ["email", ["delivery", "messaging"]],
  ["429", ["rate", "limit", "retry"]]
]);

const severityRules = [
  {
    level: "P1",
    label: "Critical",
    sla: "15 min first response",
    phrases: ["all users", "production down", "completely down", "cannot checkout", "cannot complete payment", "revenue", "security breach", "data loss"],
    weight: 4
  },
  {
    level: "P1",
    label: "Critical",
    sla: "15 min first response",
    phrases: ["502", "503", "outage", "failure rate", "500"],
    weight: 1
  },
  {
    level: "P2",
    label: "High",
    sla: "1 hour first response",
    phrases: ["blocked", "certificate", "duplicate", "login loop", "cannot", "affected users", "error"],
    weight: 2
  },
  {
    level: "P3",
    label: "Normal",
    sla: "4 hours first response",
    phrases: ["slow", "latency", "delay", "warning", "single user"],
    weight: 1
  }
];

function normalize(value = "") {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

export function tokenize(value = "") {
  const raw = normalize(value).split(/[^a-z0-9]+/).filter(Boolean);
  const tokens = [];
  for (const token of raw) {
    if (!STOP_WORDS.has(token) && token.length > 1) tokens.push(token);
    for (const synonym of SYNONYMS.get(token) || []) tokens.push(synonym);
  }
  return tokens;
}

const corpus = knowledgeBase.flatMap((doc) =>
  doc.sections.map((section) => ({
    sourceId: doc.id,
    title: doc.title,
    category: doc.category,
    owner: doc.owner,
    tags: doc.tags,
    heading: section.heading,
    text: section.text
  }))
);

const documentTokens = corpus.map((record) =>
  tokenize([record.title, record.category, record.tags.join(" "), record.heading, record.text].join(" "))
);
const documentFrequency = new Map();
for (const tokens of documentTokens) {
  for (const token of new Set(tokens)) {
    documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  }
}

function bm25Score(queryTokens, tokens, index) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  const averageLength = documentTokens.reduce((sum, item) => sum + item.length, 0) / documentTokens.length;
  const k1 = 1.4;
  const b = 0.72;
  let score = 0;

  for (const token of new Set(queryTokens)) {
    const frequency = counts.get(token) || 0;
    if (!frequency) continue;
    const docsWithToken = documentFrequency.get(token) || 0;
    const idf = Math.log(1 + (documentTokens.length - docsWithToken + 0.5) / (docsWithToken + 0.5));
    const denominator = frequency + k1 * (1 - b + b * (tokens.length / averageLength));
    score += idf * ((frequency * (k1 + 1)) / denominator);
    if (corpus[index].title.toLowerCase().includes(token)) score += 0.35;
    if (corpus[index].tags.includes(token)) score += 0.22;
  }
  return score;
}

export function retrieveEvidence(caseData, limit = 3) {
  const query = [
    caseData.title,
    caseData.productArea,
    caseData.description,
    caseData.logs,
    caseData.environment
  ].join(" ");
  const queryTokens = tokenize(query);

  return corpus
    .map((record, index) => ({
      sourceId: record.sourceId,
      title: record.title,
      section: record.heading,
      excerpt: record.text,
      score: Number(bm25Score(queryTokens, documentTokens[index], index).toFixed(2))
    }))
    .filter((record) => record.score > 0)
    .sort((left, right) => right.score - left.score || left.sourceId.localeCompare(right.sourceId))
    .slice(0, limit);
}

function getKnowledgeDocument(sourceId) {
  return knowledgeBase.find((doc) => doc.id === sourceId);
}

function detectSeverity(caseData) {
  const haystack = normalize([
    caseData.title,
    caseData.description,
    caseData.logs,
    caseData.accountTier
  ].join(" "));
  const scores = new Map();

  for (const rule of severityRules) {
    let ruleScore = 0;
    for (const phrase of rule.phrases) {
      if (haystack.includes(phrase)) ruleScore += rule.weight;
    }
    if (ruleScore > 0) scores.set(rule.level, (scores.get(rule.level) || 0) + ruleScore);
  }

  if (normalize(caseData.accountTier) === "enterprise") {
    scores.set("P2", (scores.get("P2") || 0) + 0.75);
  }

  const rank = { P1: 3, P2: 2, P3: 1 };
  const level = [...scores.entries()]
    .sort((left, right) => right[1] - left[1] || rank[right[0]] - rank[left[0]])[0]?.[0] || "P3";
  const selected = severityRules.find((rule) => rule.level === level);
  const triggers = selected.phrases.filter((phrase) => haystack.includes(phrase));

  return {
    level,
    label: selected.label,
    sla: selected.sla,
    rationale: triggers.length
      ? `Observed ${triggers.slice(0, 3).join(", ")} in the case details.`
      : "No critical signal found; classify for normal queue handling."
  };
}

function buildSummary(caseData, document) {
  const audience = `${caseData.customer || "Customer"} reported ${caseData.title.toLowerCase()}`;
  const area = caseData.productArea ? ` in ${caseData.productArea}` : "";
  const rootCause = document ? ` The leading hypothesis is ${document.title.toLowerCase()}.` : "";
  return `${audience}${area}.${rootCause}`.replace(/\s+/g, " ").trim();
}

function riskLabel(risk) {
  return String(risk || "low").toUpperCase();
}

function buildCustomerReply(caseData, severity, document, actions) {
  const firstName = caseData.contact ? caseData.contact.split(" ")[0] : "there";
  const nextAction = actions[0]?.title || "collect the failing request details";
  const immediate = severity.level === "P1"
    ? `We are treating this as a ${severity.level} incident and have started containment.`
    : `We have moved this into active investigation under our ${severity.level} response target.`;

  return [
    `Hi ${firstName},`,
    "",
    `Thanks for the clear report. ${immediate}`,
    "",
    `Next we will ${nextAction.toLowerCase()}. ${document ? `The current working theory is "${document.title.toLowerCase()}"; we will confirm it before changing production state.` : "We will confirm the failure mode before changing production state."}`,
    "",
    `I will send the next update within ${severity.sla.replace(" first response", "")}. Please share one failing request ID if available, but do not send credentials, session cookies, or full customer payloads.`,
    "",
    "RelayDesk support engineering"
  ].join("\n");
}

function uniqueActions(document) {
  if (!document) {
    return [
      { title: "Collect failing request ID", detail: "Capture the smallest safe reproduction and one request ID.", risk: "low", owner: "Support engineer" },
      { title: "Confirm scope", detail: "Check affected users, region, and first failure time before escalation.", risk: "low", owner: "Support engineer" }
    ];
  }
  return document.actions.slice(0, 4).map((action) => ({ ...action }));
}

export function analyzeCase(caseData, options = {}) {
  const startedAt = performance.now();
  const evidence = retrieveEvidence(caseData, 3);
  const primary = evidence[0] ? getKnowledgeDocument(evidence[0].sourceId) : null;
  const severity = detectSeverity(caseData);
  const actions = uniqueActions(primary);
  const evidenceCoverage = evidence.length ? Math.min(100, evidence.length * 34) : 0;
  const rawConfidence = evidence[0]?.score || 0;
  const confidence = Math.min(0.94, Math.max(0.42, 0.5 + rawConfidence / 18));
  const escalationRequired = severity.level !== "P3" || confidence < 0.66 || actions.some((action) => action.risk === "high");
  const latencyMs = Math.max(12, Math.round(performance.now() - startedAt));

  return {
    caseId: caseData.id || `CASE-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    provider: options.provider || "demo",
    model: options.model || "deterministic-demo",
    summary: buildSummary(caseData, primary),
    severity,
    rootCause: {
      title: primary?.title || "Insufficient evidence for a specific hypothesis",
      confidence: Number(confidence.toFixed(2)),
      rationale: primary
        ? `Retrieved ${evidence.length} relevant runbook section${evidence.length === 1 ? "" : "s"}; ${primary.owner} owns the recommended containment path.`
        : "No runbook matched with enough signal. Keep the case in discovery and collect a failing request ID."
    },
    evidence,
    nextActions: actions.map((action, index) => ({
      id: `ACT-${index + 1}`,
      ...action,
      riskLabel: riskLabel(action.risk)
    })),
    customerReply: buildCustomerReply(caseData, severity, primary, actions),
    escalation: {
      required: escalationRequired,
      team: primary?.escalation?.team || "Support engineering lead",
      reason: primary?.escalation?.reason || "A human owner must review the evidence before production changes."
    },
    quality: {
      schemaValid: true,
      evidenceCoverage,
      confidence: Number(confidence.toFixed(2)),
      latencyMs
    }
  };
}

export function validateCaseInput(value) {
  if (!value || typeof value !== "object") return "Case payload must be an object.";
  if (!String(value.title || "").trim()) return "Case title is required.";
  if (!String(value.description || "").trim()) return "Case description is required.";
  if (String(value.title).length > 160) return "Case title must be 160 characters or less.";
  if (String(value.description).length > 8000) return "Case description must be 8000 characters or less.";
  if (String(value.logs || "").length > 8000) return "Logs must be 8000 characters or less.";
  return null;
}

export function validateAnalysis(value) {
  if (!value || typeof value !== "object") return false;
  if (!value.summary || !value.severity?.level || !value.rootCause?.title) return false;
  if (!Array.isArray(value.evidence) || !Array.isArray(value.nextActions)) return false;
  if (!value.customerReply || !value.escalation || !value.quality) return false;
  return ["P1", "P2", "P3"].includes(value.severity.level);
}

export { knowledgeBase };
