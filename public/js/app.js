import { sampleCases } from "./cases.js";
import { analyzeCase, validateCaseInput } from "./engine.js";

const STORAGE_KEY = "relaydesk-workbench-v1";

const state = {
  cases: [],
  analyses: new Map(),
  completedActions: {},
  approvals: {},
  selectedId: "",
  activeTab: "analysis",
  provider: "demo",
  toastTimer: null
};

const elements = {
  caseList: document.querySelector("#caseList"),
  caseCount: document.querySelector("#caseCount"),
  caseSearch: document.querySelector("#caseSearch"),
  newCaseButton: document.querySelector("#newCaseButton"),
  evalDetailsButton: document.querySelector("#evalDetailsButton"),
  runButton: document.querySelector("#runButton"),
  exportButton: document.querySelector("#exportButton"),
  engineStatus: document.querySelector("#engineStatus"),
  engineLabel: document.querySelector("#engineLabel"),
  caseId: document.querySelector("#caseId"),
  caseChannel: document.querySelector("#caseChannel"),
  caseStatus: document.querySelector("#caseStatus"),
  caseTitleDisplay: document.querySelector("#caseTitleDisplay"),
  customerInitials: document.querySelector("#customerInitials"),
  customerDisplay: document.querySelector("#customerDisplay"),
  customerTier: document.querySelector("#customerTier"),
  caseTime: document.querySelector("#caseTime"),
  titleInput: document.querySelector("#titleInput"),
  customerInput: document.querySelector("#customerInput"),
  tierInput: document.querySelector("#tierInput"),
  productInput: document.querySelector("#productInput"),
  environmentInput: document.querySelector("#environmentInput"),
  descriptionInput: document.querySelector("#descriptionInput"),
  logsInput: document.querySelector("#logsInput"),
  analysisMeta: document.querySelector("#analysisMeta"),
  confidenceInline: document.querySelector("#confidenceInline"),
  summaryText: document.querySelector("#summaryText"),
  rootCauseTitle: document.querySelector("#rootCauseTitle"),
  rootCauseReason: document.querySelector("#rootCauseReason"),
  slaTitle: document.querySelector("#slaTitle"),
  severityReason: document.querySelector("#severityReason"),
  sourceCount: document.querySelector("#sourceCount"),
  evidenceList: document.querySelector("#evidenceList"),
  replyEditor: document.querySelector("#replyEditor"),
  copyReplyButton: document.querySelector("#copyReplyButton"),
  severityBadge: document.querySelector("#severityBadge"),
  confidenceValue: document.querySelector("#confidenceValue"),
  confidenceBar: document.querySelector("#confidenceBar"),
  severityValue: document.querySelector("#severityValue"),
  slaValue: document.querySelector("#slaValue"),
  ownerValue: document.querySelector("#ownerValue"),
  escalationBox: document.querySelector("#escalationBox"),
  escalationTitle: document.querySelector("#escalationTitle"),
  escalationReason: document.querySelector("#escalationReason"),
  actionProgress: document.querySelector("#actionProgress"),
  actionList: document.querySelector("#actionList"),
  approveButton: document.querySelector("#approveButton"),
  approvalTitle: document.querySelector("#approvalTitle"),
  approvalCopy: document.querySelector("#approvalCopy"),
  approvalFootnote: document.querySelector("#approvalFootnote"),
  traceProvider: document.querySelector("#traceProvider"),
  traceLatency: document.querySelector("#traceLatency"),
  traceCitations: document.querySelector("#traceCitations"),
  traceJson: document.querySelector("#traceJson"),
  toast: document.querySelector("#toast")
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCase(value = "") {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(value = "") {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "CU";
}

function timeLabel(value) {
  if (!value) return "Now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";
  return `${new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  }).format(date)} UTC`;
}

function selectedCase() {
  return state.cases.find((item) => item.id === state.selectedId);
}

function currentAnalysis() {
  return state.analyses.get(state.selectedId);
}

function hydrate() {
  state.cases = structuredClone(sampleCases);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.version === 1 && Array.isArray(saved.cases) && saved.cases.length) {
      state.cases = saved.cases;
      state.completedActions = saved.completedActions || {};
      state.approvals = saved.approvals || {};
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  state.selectedId = state.cases[0].id;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: 1,
    cases: state.cases,
    completedActions: state.completedActions,
    approvals: state.approvals
  }));
}

function precomputeQueue() {
  for (const item of state.cases) {
    if (item.title && item.description) {
      state.analyses.set(item.id, analyzeCase(item));
    }
  }
}

function renderQueue() {
  const filter = elements.caseSearch.value.trim().toLowerCase();
  const matches = state.cases.filter((item) =>
    !filter || [item.title, item.customer, item.id, item.productArea].some((value) =>
      String(value || "").toLowerCase().includes(filter)
    )
  );

  elements.caseCount.textContent = String(state.cases.length);
  if (!matches.length) {
    elements.caseList.innerHTML = '<p class="queue-empty">No matching cases</p>';
    return;
  }

  elements.caseList.innerHTML = matches.map((item) => {
    const analysis = state.analyses.get(item.id);
    const level = analysis?.severity.level || "NEW";
    const severityClass = level.startsWith("P") ? level.toLowerCase() : "";
    return `
      <button class="queue-item ${item.id === state.selectedId ? "is-active" : ""}" type="button" data-case-id="${escapeHtml(item.id)}">
        <span class="queue-item-topline">
          <span class="queue-id">${escapeHtml(item.id)}</span>
          <span class="queue-severity ${severityClass}">${escapeHtml(level)}</span>
        </span>
        <h3>${escapeHtml(item.title)}</h3>
        <span class="queue-customer">
          <span>${escapeHtml(item.customer || "New customer")}</span>
          <time>${escapeHtml(timeLabel(item.reportedAt))}</time>
        </span>
      </button>
    `;
  }).join("");
}

function fillForm(item) {
  elements.titleInput.value = item.title || "";
  elements.customerInput.value = item.customer || "";
  elements.tierInput.value = item.accountTier || "Growth";
  elements.productInput.value = item.productArea || "";
  elements.environmentInput.value = item.environment || "Production";
  elements.descriptionInput.value = item.description || "";
  elements.logsInput.value = item.logs || "";
}

function readForm() {
  const item = selectedCase();
  return {
    ...item,
    title: elements.titleInput.value.trim(),
    customer: elements.customerInput.value.trim(),
    accountTier: elements.tierInput.value,
    productArea: elements.productInput.value.trim(),
    environment: elements.environmentInput.value.trim(),
    description: elements.descriptionInput.value.trim(),
    logs: elements.logsInput.value.trim()
  };
}

function renderCaseHeader(item) {
  elements.caseId.textContent = item.id;
  elements.caseChannel.textContent = item.channel || "Manual";
  elements.caseStatus.textContent = titleCase(item.status || "unassigned");
  elements.caseTitleDisplay.textContent = item.title || "Untitled case";
  elements.customerInitials.textContent = initials(item.customer);
  elements.customerDisplay.textContent = item.customer || "New customer";
  elements.customerTier.textContent = item.accountTier || "Growth";
  elements.caseTime.textContent = timeLabel(item.reportedAt);
}

function severitySlaLabel(value) {
  return value
    .replace("15 min", "15 minutes")
    .replace("1 hour", "1 hour")
    .replace("4 hours", "4 hours")
    .replace(" first response", "");
}

function renderAnalysis() {
  const item = selectedCase();
  const analysis = currentAnalysis();
  if (!item) return;

  renderCaseHeader(item);
  fillForm(item);
  if (!analysis) {
    elements.summaryText.textContent = "Run triage to generate a grounded situation brief.";
    return;
  }

  const level = analysis.severity.level;
  const confidence = Math.round(analysis.quality.confidence * 100);
  const completed = state.completedActions[item.id] || [];
  const approved = Boolean(state.approvals[item.id]);

  elements.analysisMeta.textContent = `Grounded in ${analysis.evidence.length} runbook section${analysis.evidence.length === 1 ? "" : "s"}`;
  elements.confidenceInline.textContent = `${confidence}% confidence`;
  elements.summaryText.textContent = analysis.summary;
  elements.rootCauseTitle.textContent = analysis.rootCause.title;
  elements.rootCauseReason.textContent = analysis.rootCause.rationale;
  elements.slaTitle.textContent = analysis.severity.sla.replace(" first response", "");
  elements.severityReason.textContent = analysis.severity.rationale;
  const runbookCount = new Set(analysis.evidence.map((item) => item.sourceId)).size;
  elements.sourceCount.textContent = `${runbookCount} runbook${runbookCount === 1 ? "" : "s"} · ${analysis.evidence.length} section${analysis.evidence.length === 1 ? "" : "s"}`;

  elements.evidenceList.innerHTML = analysis.evidence.map((evidence, index) => `
    <article class="evidence-item">
      <span class="evidence-index">0${index + 1}</span>
      <div class="evidence-copy">
        <h4>${escapeHtml(evidence.title)}</h4>
        <div class="evidence-meta">
          <code>${escapeHtml(evidence.sourceId)}</code>
          <span>·</span>
          <span>${escapeHtml(evidence.section)}</span>
        </div>
        <p>${escapeHtml(evidence.excerpt)}</p>
      </div>
      <span class="evidence-score"><span></span>${Number(evidence.score || 0).toFixed(1)}</span>
    </article>
  `).join("");

  elements.replyEditor.value = analysis.customerReply;
  elements.severityBadge.textContent = level;
  elements.severityBadge.className = `severity-badge ${level.toLowerCase()}`;
  elements.confidenceValue.textContent = `${confidence}%`;
  elements.confidenceBar.value = confidence;
  elements.severityValue.textContent = analysis.severity.label;
  elements.slaValue.textContent = severitySlaLabel(analysis.severity.sla);
  elements.ownerValue.textContent = analysis.escalation.team;

  elements.escalationBox.classList.toggle("is-clear", !analysis.escalation.required);
  elements.escalationTitle.textContent = analysis.escalation.required
    ? `Escalate to ${analysis.escalation.team}`
    : "Standard owner review";
  elements.escalationReason.textContent = analysis.escalation.reason;

  elements.actionList.innerHTML = analysis.nextActions.map((action) => `
    <label class="action-item">
      <span class="action-check">
        <input type="checkbox" data-action-id="${escapeHtml(action.id)}" ${completed.includes(action.id) ? "checked" : ""}>
        <span class="check-ui"><svg class="icon"><use href="#icon-check"></use></svg></span>
      </span>
      <span class="action-copy">
        <h4>${escapeHtml(action.title)}</h4>
        <p>${escapeHtml(action.detail)}</p>
        <span class="action-tags">
          <span class="risk-tag ${escapeHtml(action.risk)}">${escapeHtml(action.riskLabel)} RISK</span>
          <span class="action-owner">${escapeHtml(action.owner)}</span>
        </span>
      </span>
    </label>
  `).join("");

  elements.actionProgress.textContent = `${completed.length}/${analysis.nextActions.length}`;
  elements.approveButton.classList.toggle("is-approved", approved);
  elements.approveButton.innerHTML = approved
    ? '<svg class="icon"><use href="#icon-check"></use></svg> Handoff approved'
    : '<svg class="icon"><use href="#icon-check"></use></svg> Approve handoff';
  elements.approvalTitle.textContent = approved ? "Ready for handoff" : "Review before handoff";
  elements.approvalCopy.textContent = approved
    ? "A human reviewer approved this evidence, containment path, and customer-facing draft. No message was sent automatically."
    : "Confirm the evidence and containment path before changing production state or sending the customer reply.";
  elements.approvalFootnote.textContent = approved
    ? `Approved locally · ${timeLabel(analysis.generatedAt)}`
    : "Local audit trail · no auto-send";

  elements.traceProvider.textContent = analysis.provider === "openai" ? "OpenAI" : "Demo";
  elements.traceLatency.textContent = `${analysis.quality.latencyMs} ms`;
  elements.traceCitations.textContent = String(analysis.evidence.length);
  elements.traceJson.textContent = JSON.stringify(analysis, null, 2);
}

function selectCase(caseId) {
  const next = state.cases.find((item) => item.id === caseId);
  if (!next) return;
  state.selectedId = caseId;
  state.activeTab = "analysis";
  renderQueue();
  renderAnalysis();
  activateTab("analysis");
}

function activateTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  for (const [name, id] of [["analysis", "analysisView"], ["reply", "replyView"], ["trace", "traceView"]]) {
    const view = document.querySelector(`#${id}`);
    const active = name === tabName;
    view.classList.toggle("is-active", active);
    view.hidden = !active;
  }
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  state.toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

async function checkProvider() {
  try {
    const response = await fetch(new URL("api/health", new URL("./", window.location.href)));
    if (!response.ok) throw new Error("No API");
    const payload = await response.json();
    state.provider = payload.provider;
    elements.engineStatus.classList.toggle("is-live", payload.provider === "openai-ready");
    elements.engineLabel.textContent = payload.provider === "openai-ready" ? "OpenAI ready" : "Demo engine";
  } catch {
    state.provider = "demo";
    elements.engineStatus.classList.remove("is-live");
    elements.engineLabel.textContent = "Demo engine";
  }
}

async function requestAnalysis(caseData) {
  if (state.provider !== "openai-ready") {
    await new Promise((resolve) => setTimeout(resolve, 220));
    return analyzeCase(caseData);
  }

  try {
    const response = await fetch(new URL("api/analyze", new URL("./", window.location.href)), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case: caseData, engine: "auto" })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Analysis failed");
    return payload;
  } catch {
    showToast("Live route unavailable. Demo triage used.");
    return analyzeCase(caseData);
  }
}

async function runAnalysis() {
  const caseData = readForm();
  const validationError = validateCaseInput(caseData);
  if (validationError) {
    showToast(validationError);
    (validationError.includes("title") ? elements.titleInput : elements.descriptionInput).focus();
    return;
  }

  const index = state.cases.findIndex((item) => item.id === caseData.id);
  caseData.status = "triaged";
  caseData.reportedAt = caseData.reportedAt || new Date().toISOString();
  state.cases[index] = caseData;
  state.approvals[caseData.id] = false;
  elements.runButton.disabled = true;
  elements.runButton.classList.add("is-loading");
  elements.runButton.querySelector("span").textContent = "Analyzing";

  try {
    const analysis = await requestAnalysis(caseData);
    state.analyses.set(caseData.id, analysis);
    persist();
    renderQueue();
    renderAnalysis();
    activateTab("analysis");
    showToast(analysis.provider === "openai" ? "Live triage complete" : "Grounded triage complete");
  } finally {
    elements.runButton.disabled = false;
    elements.runButton.classList.remove("is-loading");
    elements.runButton.querySelector("span").textContent = "Run triage";
  }
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const helper = document.createElement("textarea");
    helper.className = "clipboard-helper";
    helper.value = value;
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
}

async function copyReply() {
  if (!elements.replyEditor.value.trim()) return;
  await copyText(elements.replyEditor.value.trim());
  showToast("Customer reply copied");
}

function exportBrief() {
  const item = selectedCase();
  const analysis = currentAnalysis();
  if (!item || !analysis) {
    showToast("Run triage before exporting");
    return;
  }

  const actions = analysis.nextActions.map((action, index) => {
    const checked = (state.completedActions[item.id] || []).includes(action.id) ? "x" : " ";
    return `${index + 1}. [${checked}] **${action.title}** (${action.riskLabel} risk, ${action.owner}): ${action.detail}`;
  }).join("\n");
  const evidence = analysis.evidence.map((source) =>
    `- **${source.title}** (\`${source.sourceId}\`, ${source.section}): ${source.excerpt}`
  ).join("\n");

  const brief = `# ${item.id}: ${item.title}

- **Customer:** ${item.customer || "Unknown"}
- **Tier:** ${item.accountTier || "Unknown"}
- **Product area:** ${item.productArea || "Unspecified"}
- **Severity:** ${analysis.severity.level} ${analysis.severity.label}
- **First response:** ${analysis.severity.sla}
- **Human approval:** ${state.approvals[item.id] ? "Approved" : "Pending"}

## Situation

${analysis.summary}

## Hypothesis

**${analysis.rootCause.title}** (${Math.round(analysis.rootCause.confidence * 100)}% confidence)

${analysis.rootCause.rationale}

## Evidence

${evidence}

## Containment

${actions}

## Escalation

${analysis.escalation.required ? "Required" : "Not required"}: ${analysis.escalation.team}

${analysis.escalation.reason}

## Customer reply

${elements.replyEditor.value.trim()}

---

Generated by RelayDesk. Verify evidence and production state before handoff.
`;

  const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${item.id.toLowerCase()}-brief.md`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast("Case brief exported");
}

function createNewCase() {
  const nextNumber = Math.max(
    3000,
    ...state.cases.map((item) => Number(item.id.replace(/\D/g, "")) || 0)
  ) + 1;
  const item = {
    id: `CAS-${nextNumber}`,
    title: "",
    customer: "",
    contact: "",
    accountTier: "Growth",
    productArea: "",
    reportedAt: new Date().toISOString(),
    channel: "Manual",
    status: "draft",
    description: "",
    logs: "",
    environment: "Production"
  };
  state.cases.unshift(item);
  state.selectedId = item.id;
  persist();
  renderQueue();
  renderAnalysis();
  activateTab("analysis");
  elements.titleInput.focus();
  showToast("New case added");
}

function bindEvents() {
  elements.caseList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-case-id]");
    if (button) selectCase(button.dataset.caseId);
  });

  elements.caseSearch.addEventListener("input", renderQueue);
  elements.newCaseButton.addEventListener("click", createNewCase);
  elements.runButton.addEventListener("click", runAnalysis);
  elements.exportButton.addEventListener("click", exportBrief);
  elements.copyReplyButton.addEventListener("click", copyReply);

  elements.actionList.addEventListener("change", (event) => {
    if (!event.target.matches("[data-action-id]")) return;
    const item = selectedCase();
    const completed = new Set(state.completedActions[item.id] || []);
    if (event.target.checked) completed.add(event.target.dataset.actionId);
    else completed.delete(event.target.dataset.actionId);
    state.completedActions[item.id] = [...completed];
    elements.actionProgress.textContent = `${completed.size}/${currentAnalysis().nextActions.length}`;
    persist();
  });

  elements.approveButton.addEventListener("click", () => {
    const item = selectedCase();
    if (!item || !currentAnalysis()) return;
    state.approvals[item.id] = true;
    item.status = "approved";
    persist();
    renderQueue();
    renderAnalysis();
    showToast("Human handoff approved");
  });

  document.querySelector(".tabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) activateTab(tab.dataset.tab);
  });

  elements.evalDetailsButton.addEventListener("click", () => {
    showToast("8/8 runbook fit · 100% schema pass · 3 safety checks");
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      runAnalysis();
    }
    const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      elements.caseSearch.focus();
    }
  });
}

hydrate();
precomputeQueue();
bindEvents();
renderQueue();
renderAnalysis();
checkProvider();
