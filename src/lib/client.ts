import { applyAuth, enabledKv } from "./auth";
import { runScript } from "./sandbox";
import type {
  Collection,
  Environment,
  KeyValue,
  TachyRequest,
  TachyResponse,
} from "./types";
import { buildScope, resolve, type ResolveContext } from "./variables";

export interface ProxyRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  bodyMode: string;
}

/** Serialize the request body into a string + content-type the proxy will send. */
function buildBody(
  req: TachyRequest,
  scope: Map<string, string>,
): { body?: string; contentType?: string } {
  const b = req.body;
  switch (b.mode) {
    case "json":
      return { body: resolve(b.raw, scope), contentType: "application/json" };
    case "xml":
      return { body: resolve(b.raw, scope), contentType: "application/xml" };
    case "html":
      return { body: resolve(b.raw, scope), contentType: "text/html" };
    case "javascript":
      return { body: resolve(b.raw, scope), contentType: "application/javascript" };
    case "text":
      return { body: resolve(b.raw, scope), contentType: "text/plain" };
    case "graphql":
      return {
        body: JSON.stringify({
          query: resolve(b.graphql.query, scope),
          variables: safeParse(resolve(b.graphql.variables, scope)),
        }),
        contentType: "application/json",
      };
    case "urlencoded": {
      const params = new URLSearchParams();
      for (const kv of enabledKv(b.urlencoded))
        params.append(resolve(kv.key, scope), resolve(kv.value, scope));
      return {
        body: params.toString(),
        contentType: "application/x-www-form-urlencoded",
      };
    }
    case "form-data": {
      // Represented as JSON for the proxy to reconstruct (text fields only).
      const fields = enabledKv(b.formData).map((kv) => ({
        key: resolve(kv.key, scope),
        value: resolve(kv.value, scope),
      }));
      return { body: JSON.stringify({ __formdata: fields }), contentType: "multipart/form-data" };
    }
    case "binary":
    case "none":
    default:
      return {};
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function applyQueryParams(url: string, params: { key: string; value: string }[]): string {
  if (params.length === 0) return url;
  const hashIdx = url.indexOf("#");
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : "";
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const sep = base.includes("?") ? (base.endsWith("?") ? "" : "&") : "?";
  const query = params
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
  return `${base}${sep}${query}${hash}`;
}

export interface BuildResult {
  proxy: ProxyRequest;
  preLogs: string[];
  preError?: string;
}

export function buildProxyRequest(
  req: TachyRequest,
  ctx: ResolveContext,
): BuildResult {
  const scope = buildScope(ctx);

  // Pre-request script (may mutate variables).
  const pre = runScript({ script: req.preRequestScript, variables: scope });

  let url = resolve(req.url, scope).trim();

  const headers: Record<string, string> = {};
  for (const h of enabledKv(req.headers)) {
    headers[resolve(h.key, scope)] = resolve(h.value, scope);
  }

  // Auth
  const resolvedAuth = resolveAuth(req, scope);
  const applied = applyAuth(resolvedAuth);
  Object.assign(headers, applied.headers);

  // Query params (from table + auth apikey-in-query)
  const queryParams = enabledKv(req.params).map((p) => ({
    key: resolve(p.key, scope),
    value: resolve(p.value, scope),
  }));
  queryParams.push(...applied.queryParams);
  url = applyQueryParams(url, queryParams);

  const { body, contentType } = buildBody(req, scope);
  if (contentType && !hasHeader(headers, "content-type") && req.body.mode !== "form-data") {
    headers["Content-Type"] = contentType;
  }

  return {
    proxy: {
      method: req.method,
      url,
      headers,
      body,
      bodyMode: req.body.mode,
    },
    preLogs: pre.logs,
    preError: pre.error,
  };
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((h) => h.toLowerCase() === name.toLowerCase());
}

function resolveAuth(req: TachyRequest, scope: Map<string, string>) {
  const a = req.auth;
  return {
    ...a,
    bearer: a.bearer ? { token: resolve(a.bearer.token, scope) } : a.bearer,
    basic: a.basic
      ? {
          username: resolve(a.basic.username, scope),
          password: resolve(a.basic.password, scope),
        }
      : a.basic,
    apikey: a.apikey
      ? {
          key: resolve(a.apikey.key, scope),
          value: resolve(a.apikey.value, scope),
          addTo: a.apikey.addTo,
        }
      : a.apikey,
    jwt: a.jwt
      ? { ...a.jwt, secret: resolve(a.jwt.secret, scope) }
      : a.jwt,
    oauth2: a.oauth2
      ? { ...a.oauth2, accessToken: resolve(a.oauth2.accessToken, scope) }
      : a.oauth2,
  };
}

export interface SendResult {
  response: TachyResponse;
}

/** Execute a request via the server proxy, then run the test script. */
export async function sendRequest(
  req: TachyRequest,
  ctx: {
    globals?: KeyValue[];
    collection?: Collection | null;
    environment?: Environment | null;
  },
  onVarUpdate?: (scope: "env" | "global", key: string, value: string) => void,
): Promise<SendResult> {
  const built = buildProxyRequest(req, ctx);
  const start = performance.now();

  let response: TachyResponse;
  try {
    const res = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(built.proxy),
    });
    const data = (await res.json()) as TachyResponse;
    response = data;
  } catch (e) {
    response = {
      status: 0,
      statusText: "Request Failed",
      headers: {},
      body: "",
      contentType: "",
      timeMs: performance.now() - start,
      sizeBytes: 0,
      cookies: [],
      redirected: false,
      finalUrl: built.proxy.url,
      error: (e as Error).message,
    };
  }

  // Run test script
  const scope = buildScope(ctx);
  const test = runScript({
    script: req.testScript,
    response,
    variables: scope,
  });

  if (onVarUpdate) {
    for (const [k, v] of Object.entries(test.setEnv)) onVarUpdate("env", k, v);
    for (const [k, v] of Object.entries(test.setGlobal)) onVarUpdate("global", k, v);
  }

  response.testResults = test.tests;
  response.consoleLogs = [...built.preLogs, ...test.logs];
  if (test.error) {
    response.consoleLogs.push("Test script error: " + test.error);
  }
  if (built.preError) {
    response.consoleLogs.unshift("Pre-request error: " + built.preError);
  }

  return { response };
}
