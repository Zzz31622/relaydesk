import { knowledgeBase, retrieveEvidence, validateAnalysis } from "../public/js/engine.js";

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "severity", "rootCause", "evidence", "nextActions", "customerReply", "escalation"],
  properties: {
    summary: { type: "string" },
    severity: {
      type: "object",
      additionalProperties: false,
      required: ["level", "label", "sla", "rationale"],
      properties: {
        level: { type: "string", enum: ["P1", "P2", "P3"] },
        label: { type: "string" },
        sla: { type: "string" },
        rationale: { type: "string" }
      }
    },
    rootCause: {
      type: "object",
      additionalProperties: false,
      required: ["title", "confidence", "rationale"],
      properties: {
        title: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        rationale: { type: "string" }
      }
    },
    evidence: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceId", "title", "section", "excerpt"],
        properties: {
          sourceId: { type: "string" },
          title: { type: "string" },
          section: { type: "string" },
          excerpt: { type: "string" }
        }
      }
    },
    nextActions: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "risk", "owner"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          risk: { type: "string", enum: ["low", "medium", "high"] },
          owner: { type: "string" }
        }
      }
    },
    customerReply: { type: "string" },
    escalation: {
      type: "object",
      additionalProperties: false,
      required: ["required", "team", "reason"],
      properties: {
        required: { type: "boolean" },
        team: { type: "string" },
        reason: { type: "string" }
      }
    }
  }
};

const instructions = `You are RelayDesk, an escalation copilot for forward-deployed support engineers.
Analyze the synthetic support case using only the supplied runbook evidence.
Return a concise technical summary, a P1/P2/P3 severity, one leading hypothesis, cited runbook evidence, safe next actions, a customer reply, and an escalation recommendation.
Never invent source IDs. Never claim that a production change has happened. Never request passwords, session cookies, SAML assertions, or full customer payloads.
Prefer reversible containment. Put customer-visible claims in the reply only when supported by the case or evidence.
Use "P1 Critical / 15 min first response", "P2 High / 1 hour first response", or "P3 Normal / 4 hours first response".`;

function extractResponseText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  if (!Array.isArray(payload.output)) return "";
  return payload.output
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("");
}

function normalizeLiveResult(parsed, retrieval, latencyMs) {
  const knownSources = new Map(
    retrieval.map((item) => [item.sourceId, knowledgeBase.find((doc) => doc.id === item.sourceId)])
  );
  const evidence = parsed.evidence
    .filter((item) => knownSources.has(item.sourceId))
    .slice(0, 4)
    .map((item) => ({
      sourceId: item.sourceId,
      title: knownSources.get(item.sourceId).title,
      section: item.section,
      excerpt: item.excerpt.slice(0, 420),
      score: retrieval.find((record) => record.sourceId === item.sourceId)?.score || 0
    }));

  if (!evidence.length) throw new Error("Live model returned no known citations.");

  const nextActions = parsed.nextActions.slice(0, 5).map((action, index) => ({
    id: `ACT-${index + 1}`,
    title: action.title,
    detail: action.detail,
    risk: ["low", "medium", "high"].includes(action.risk) ? action.risk : "medium",
    riskLabel: ["low", "medium", "high"].includes(action.risk) ? action.risk.toUpperCase() : "MEDIUM",
    owner: action.owner
  }));

  const result = {
    caseId: parsed.caseId || "CASE-LIVE",
    generatedAt: new Date().toISOString(),
    provider: "openai",
    model: parsed.model || "configured-model",
    summary: parsed.summary.slice(0, 1200),
    severity: parsed.severity,
    rootCause: parsed.rootCause,
    evidence,
    nextActions,
    customerReply: parsed.customerReply.slice(0, 6000),
    escalation: parsed.escalation,
    quality: {
      schemaValid: true,
      evidenceCoverage: Math.min(100, evidence.length * 34),
      confidence: parsed.rootCause.confidence,
      latencyMs
    }
  };

  if (!validateAnalysis(result)) throw new Error("Live model response failed local validation.");
  return result;
}

export async function analyzeWithOpenAI(caseData, options = {}) {
  const startedAt = performance.now();
  const retrieval = retrieveEvidence(caseData, 4);
  if (!retrieval.length) throw new Error("No runbook evidence found for live analysis.");

  const runbooks = retrieval.map((item) => {
    const doc = knowledgeBase.find((candidate) => candidate.id === item.sourceId);
    return {
      sourceId: doc.id,
      title: doc.title,
      owner: doc.owner,
      section: item.section,
      excerpt: item.excerpt,
      actions: doc.actions
    };
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${options.apiKey}`,
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: options.model || "gpt-4.1-mini",
      instructions,
      input: JSON.stringify({ case: caseData, runbooks }),
      text: {
        format: {
          type: "json_schema",
          name: "relaydesk_analysis",
          strict: true,
          schema: analysisSchema
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = (await response.text()).slice(0, 300);
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const text = extractResponseText(payload);
  if (!text) throw new Error("OpenAI response contained no output text.");

  const parsed = JSON.parse(text);
  parsed.caseId = caseData.id || "CASE-LIVE";
  parsed.model = options.model || "gpt-4.1-mini";
  return normalizeLiveResult(parsed, retrieval, Math.round(performance.now() - startedAt));
}
