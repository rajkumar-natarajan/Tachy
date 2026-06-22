import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tachy Mock Server
 * -----------------
 * A self-contained local API for testing every request scenario without any
 * external dependency. All routes live under /api/mock/*.
 *
 * Routes:
 *   GET|POST|...  /echo                     → reflects method, headers, query, body
 *   GET           /json                     → sample JSON payload
 *   GET           /status/:code             → responds with the given HTTP status
 *   GET           /delay/:ms                → responds after :ms milliseconds
 *   GET           /headers                  → returns received headers
 *   GET           /cookies                  → sets demo cookies
 *   GET           /redirect                 → 302 → /echo
 *   GET           /error                    → 500 error payload
 *   GET           /random                   → random faker-style record
 *   GET           /users                    → list users
 *   POST          /users                    → create user
 *   GET           /users/:id                → get user
 *   PUT|PATCH     /users/:id                → update user
 *   DELETE        /users/:id                → delete user
 *   GET           /auth/bearer              → requires `Authorization: Bearer <token>`
 *   GET           /auth/basic               → requires Basic auth (admin/secret)
 *   GET           /auth/apikey              → requires `X-API-Key: tachy-demo-key`
 *   POST          /graphql                  → tiny GraphQL-ish responder
 */

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  active: boolean;
  createdAt: string;
}

// In-memory store (resets on server restart) -------------------------------
const g = globalThis as unknown as { __tachyUsers?: User[]; __tachySeq?: number };
if (!g.__tachyUsers) {
  g.__tachyUsers = [
    { id: 1, name: "Ada Lovelace", email: "ada@tachy.dev", role: "admin", active: true, createdAt: iso() },
    { id: 2, name: "Alan Turing", email: "alan@tachy.dev", role: "editor", active: true, createdAt: iso() },
    { id: 3, name: "Grace Hopper", email: "grace@tachy.dev", role: "viewer", active: false, createdAt: iso() },
  ];
  g.__tachySeq = 4;
}
const users = g.__tachyUsers;

function iso() {
  return new Date().toISOString();
}

const FIRST = ["Nova", "Kai", "Zara", "Leo", "Mira", "Eli", "Iris", "Theo", "Luna", "Rex"];
const LAST = ["Quantum", "Vega", "Cipher", "Stark", "Nyx", "Orion", "Pax", "Lux", "Volt", "Echo"];
const ROLES: User["role"][] = ["admin", "editor", "viewer"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomUser(): User {
  const name = `${rand(FIRST)} ${rand(LAST)}`;
  return {
    id: Math.floor(Math.random() * 100000),
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@tachy.dev`,
    role: rand(ROLES),
    active: Math.random() > 0.3,
    createdAt: iso(),
  };
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

async function readBody(req: NextRequest): Promise<unknown> {
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) return await req.json();
    const text = await req.text();
    if (!text) return null;
    if (ct.includes("x-www-form-urlencoded")) {
      return Object.fromEntries(new URLSearchParams(text));
    }
    return text;
  } catch {
    return null;
  }
}

function headersObject(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  req.headers.forEach((v, k) => (out[k] = v));
  return out;
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const [root, a, b] = path;
  const method = req.method.toUpperCase();
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams);

  switch (root) {
    case undefined:
    case "":
      return json({
        service: "Tachy Mock Server",
        message: "Pick an endpoint to test a scenario.",
        endpoints: [
          "/echo", "/json", "/status/:code", "/delay/:ms", "/headers",
          "/cookies", "/redirect", "/error", "/random",
          "/users", "/users/:id",
          "/auth/bearer", "/auth/basic", "/auth/apikey", "/graphql",
        ],
      });

    case "echo":
      return json({
        method,
        path: "/" + path.join("/"),
        query,
        headers: headersObject(req),
        body: await readBody(req),
        receivedAt: iso(),
      });

    case "json":
      return json({
        id: "tachy-001",
        product: "Tachy",
        tagline: "Lightning-fast API development",
        version: "1.0.0",
        features: ["collections", "environments", "scripting", "mock-server"],
        nested: { a: { b: { c: [1, 2, 3] } } },
        active: true,
        score: 9.8,
      });

    case "status": {
      const code = Math.min(599, Math.max(100, parseInt(a ?? "200", 10) || 200));
      return json(
        { status: code, message: statusMessage(code), requested: a },
        { status: code },
      );
    }

    case "delay": {
      const ms = Math.min(15000, Math.max(0, parseInt(a ?? "1000", 10) || 0));
      await new Promise((r) => setTimeout(r, ms));
      return json({ delayedMs: ms, message: `Responded after ${ms}ms`, at: iso() });
    }

    case "headers":
      return json({ headers: headersObject(req), count: [...req.headers].length });

    case "cookies": {
      const res = json({ message: "Cookies set", at: iso() });
      res.cookies.set("tachy_session", "sess_" + Math.random().toString(36).slice(2, 10), {
        httpOnly: true,
        path: "/",
      });
      res.cookies.set("tachy_theme", "dark", { path: "/" });
      return res;
    }

    case "redirect":
      return NextResponse.redirect(new URL("/api/mock/echo", req.url), 302);

    case "error":
      return json(
        { error: "InternalServerError", message: "Simulated failure for testing", code: 500 },
        { status: 500 },
      );

    case "random":
      return json(randomUser());

    case "users":
      return handleUsers(req, method, a, await readBody(req));

    case "auth":
      return handleAuth(req, a);

    case "graphql": {
      const body = (await readBody(req)) as { query?: string } | null;
      const q = body?.query ?? "";
      if (/user/i.test(q)) {
        return json({ data: { user: users[0] } });
      }
      if (/users/i.test(q)) {
        return json({ data: { users } });
      }
      return json({
        data: { __schema: { types: ["User", "Query"] } },
        note: "Send a query mentioning 'user' or 'users'.",
      });
    }

    default:
      return json(
        { error: "NotFound", message: `Unknown mock endpoint: /${path.join("/")}` },
        { status: 404 },
      );
  }
}

function handleUsers(
  _req: NextRequest,
  method: string,
  idParam: string | undefined,
  body: unknown,
) {
  // /users
  if (!idParam) {
    if (method === "GET") return json({ data: users, total: users.length });
    if (method === "POST") {
      const b = (body ?? {}) as Partial<User>;
      const user: User = {
        id: g.__tachySeq!++,
        name: b.name ?? "New User",
        email: b.email ?? `user${g.__tachySeq}@tachy.dev`,
        role: (b.role as User["role"]) ?? "viewer",
        active: b.active ?? true,
        createdAt: iso(),
      };
      users.push(user);
      return json({ data: user, message: "User created" }, { status: 201 });
    }
    return json({ error: "MethodNotAllowed" }, { status: 405 });
  }

  // /users/:id
  const id = parseInt(idParam, 10);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return json({ error: "NotFound", message: `No user with id ${idParam}` }, { status: 404 });
  }

  if (method === "GET") return json({ data: users[idx] });
  if (method === "PUT" || method === "PATCH") {
    const b = (body ?? {}) as Partial<User>;
    users[idx] = { ...users[idx], ...b, id };
    return json({ data: users[idx], message: "User updated" });
  }
  if (method === "DELETE") {
    const [removed] = users.splice(idx, 1);
    return json({ data: removed, message: "User deleted" });
  }
  return json({ error: "MethodNotAllowed" }, { status: 405 });
}

function handleAuth(req: NextRequest, kind: string | undefined) {
  const auth = req.headers.get("authorization") ?? "";
  const unauthorized = (msg: string, scheme: string) =>
    json({ error: "Unauthorized", message: msg }, {
      status: 401,
      headers: { "WWW-Authenticate": scheme },
    });

  switch (kind) {
    case "bearer": {
      const token = auth.replace(/^Bearer\s+/i, "");
      if (!auth.toLowerCase().startsWith("bearer ") || !token)
        return unauthorized("Missing or invalid Bearer token", "Bearer");
      return json({ authenticated: true, scheme: "bearer", token });
    }
    case "basic": {
      if (!auth.toLowerCase().startsWith("basic "))
        return unauthorized("Missing Basic credentials", 'Basic realm="tachy"');
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
      const [user, pass] = decoded.split(":");
      if (user === "admin" && pass === "secret")
        return json({ authenticated: true, scheme: "basic", user });
      return unauthorized("Invalid credentials (try admin/secret)", 'Basic realm="tachy"');
    }
    case "apikey": {
      const key = req.headers.get("x-api-key");
      if (key === "tachy-demo-key")
        return json({ authenticated: true, scheme: "apikey" });
      return unauthorized("Missing or invalid X-API-Key (try tachy-demo-key)", "ApiKey");
    }
    default:
      return json({ error: "NotFound", message: "Use /auth/bearer, /auth/basic or /auth/apikey" }, { status: 404 });
  }
}

function statusMessage(code: number): string {
  const map: Record<number, string> = {
    200: "OK", 201: "Created", 202: "Accepted", 204: "No Content",
    301: "Moved Permanently", 302: "Found", 304: "Not Modified",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
    409: "Conflict", 418: "I'm a teapot", 422: "Unprocessable Entity", 429: "Too Many Requests",
    500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable",
  };
  return map[code] ?? "Unknown";
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
