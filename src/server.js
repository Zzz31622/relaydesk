import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeCase, validateCaseInput } from "../public/js/engine.js";
import { analyzeWithOpenAI } from "./provider.js";

const rootDir = resolve(fileURLToPath(new URL("../public", import.meta.url)));
const envPath = resolve(fileURLToPath(new URL("../.env", import.meta.url)));

function loadEnv() {
  if (!existsSync(envPath)) return;
  return readFile(envPath, "utf8").then((contents) => {
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  });
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

const attempts = new Map();

function isRateLimited(address) {
  const now = Date.now();
  const recent = (attempts.get(address) || []).filter((time) => now - time < 60_000);
  recent.push(now);
  attempts.set(address, recent);
  return recent.length > 20;
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...securityHeaders,
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error("Request body exceeds 64 KB.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveStatic(pathname, response) {
  const decoded = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const candidate = resolve(rootDir, `.${decoded}`);
  if (candidate !== rootDir && !candidate.startsWith(`${rootDir}${sep}`)) {
    sendJson(response, 403, { error: "Path is not allowed." });
    return;
  }

  try {
    const file = await readFile(candidate);
    const extension = extname(candidate).toLowerCase();
    const cacheControl = "no-cache";
    response.writeHead(200, {
      ...securityHeaders,
      "Cache-Control": cacheControl,
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Content-Length": file.length
    });
    response.end(file);
  } catch {
    sendJson(response, 404, { error: "Not found." });
  }
}

export function createAppServer(options = {}) {
  const model = options.model || process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const liveProvider = options.liveProvider || analyzeWithOpenAI;

  return createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        provider: process.env.OPENAI_API_KEY || options.apiKey ? "openai-ready" : "demo",
        model
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/analyze") {
      if (isRateLimited(request.socket.remoteAddress || "local")) {
        sendJson(response, 429, { error: "Too many analyses. Wait one minute and retry." });
        return;
      }

      try {
        const body = await readJsonBody(request);
        const validationError = validateCaseInput(body.case);
        if (validationError) {
          sendJson(response, 400, { error: validationError });
          return;
        }

        const apiKey = process.env.OPENAI_API_KEY || options.apiKey;
        const liveRequested = body.engine === "auto" && Boolean(apiKey);
        if (liveRequested) {
          try {
            const result = await liveProvider(body.case, { apiKey, model });
            sendJson(response, 200, result);
            return;
          } catch (error) {
            console.error(`[relaydesk] Live model fallback: ${error.message}`);
          }
        }

        sendJson(response, 200, analyzeCase(body.case, { provider: "demo", model: "deterministic-demo" }));
      } catch (error) {
        const status = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, status, { error: status === 400 ? "Request body must be valid JSON." : "Analysis failed. Retry or use demo mode." });
      }
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveStatic(url.pathname, response);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed." });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await loadEnv();
  const port = Number(process.env.PORT || 4173);
  const server = createAppServer();
  server.listen(port, "127.0.0.1", () => {
    const provider = process.env.OPENAI_API_KEY ? "OpenAI live + demo fallback" : "demo";
    console.log(`RelayDesk running at http://127.0.0.1:${port} (${provider})`);
  });
}
