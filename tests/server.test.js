import test from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "../src/server.js";

async function withServer(callback) {
  const server = createAppServer({ apiKey: "" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("health endpoint reports demo mode when no key exists", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.provider, "demo");
  });
});

test("analysis endpoint returns useful triage", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case: {
          title: "Checkout API returns 502 after deployment",
          description: "Production checkout cannot complete payment after an EU canary deployment.",
          logs: "gateway_5xx=40% upstream_connect_timeout=2s",
          productArea: "API Gateway",
          environment: "Production / EU",
          accountTier: "Enterprise"
        }
      })
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.provider, "demo");
    assert.equal(payload.severity.level, "P1");
    assert.equal(payload.evidence[0].sourceId, "RB-014");
  });
});

test("case endpoint rejects malformed input", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case: { title: "" } })
    });
    assert.equal(response.status, 400);
  });
});

test("live provider failure falls back to deterministic triage", async () => {
  const server = createAppServer({
    apiKey: "test-key",
    liveProvider: async () => {
      throw new Error("provider timeout");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        engine: "auto",
        case: {
          title: "SSO login loop after certificate update",
          description: "Okta users authenticate and return to the login page.",
          logs: "saml_status=success acs_redirect=login",
          productArea: "Identity",
          environment: "Production / US",
          accountTier: "Business"
        }
      })
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.provider, "demo");
    assert.equal(payload.evidence[0].sourceId, "RB-021");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("static server blocks path traversal", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/..%2Fpackage.json`);
    assert.notEqual(response.status, 200);
  });
});
