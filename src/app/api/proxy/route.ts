import { NextRequest, NextResponse } from "next/server";
import type { TachyResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProxyPayload {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  bodyMode: string;
}

/** Headers we must not forward verbatim from the client config. */
const STRIPPED = new Set(["host", "content-length", "connection"]);

function parseCookies(setCookie: string[] | undefined): { name: string; value: string }[] {
  if (!setCookie) return [];
  return setCookie
    .map((c) => {
      const first = c.split(";")[0];
      const eq = first.indexOf("=");
      if (eq < 0) return null;
      return { name: first.slice(0, eq).trim(), value: first.slice(eq + 1).trim() };
    })
    .filter((c): c is { name: string; value: string } => c !== null);
}

export async function POST(req: NextRequest) {
  let payload: ProxyPayload;
  try {
    payload = (await req.json()) as ProxyPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  if (!payload.url || !/^https?:\/\//i.test(payload.url)) {
    return NextResponse.json(
      errorResponse("URL must be a valid absolute http(s) URL", payload.url ?? ""),
      { status: 200 },
    );
  }

  // SSRF guardrail: block obvious internal metadata endpoints.
  if (isBlockedHost(payload.url)) {
    return NextResponse.json(
      errorResponse("Requests to internal/metadata hosts are blocked", payload.url),
      { status: 200 },
    );
  }

  const headers = new Headers();
  for (const [k, v] of Object.entries(payload.headers ?? {})) {
    if (!STRIPPED.has(k.toLowerCase())) headers.set(k, v);
  }

  let body: BodyInit | undefined;
  if (payload.body !== undefined && !["GET", "HEAD"].includes(payload.method)) {
    if (payload.bodyMode === "form-data") {
      // Reconstruct multipart form-data from the serialized text fields.
      try {
        const parsed = JSON.parse(payload.body) as { __formdata: { key: string; value: string }[] };
        const fd = new FormData();
        for (const f of parsed.__formdata ?? []) fd.append(f.key, f.value);
        body = fd;
        headers.delete("Content-Type"); // let fetch set the boundary
      } catch {
        body = payload.body;
      }
    } else {
      body = payload.body;
    }
  }

  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(payload.url, {
      method: payload.method,
      headers,
      body,
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const buf = await res.arrayBuffer();
    const bytes = buf.byteLength;
    const text = new TextDecoder().decode(buf);
    const timeMs = performance.now() - start;

    const outHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      outHeaders[key] = value;
    });

    const setCookie =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : undefined;

    const result: TachyResponse = {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
      body: text,
      contentType: res.headers.get("content-type") ?? "",
      timeMs,
      sizeBytes: bytes,
      cookies: parseCookies(setCookie),
      redirected: res.redirected,
      finalUrl: res.url,
    };

    return NextResponse.json(result);
  } catch (e) {
    clearTimeout(timeout);
    const err = e as Error;
    const message =
      err.name === "AbortError" ? "Request timed out after 60s" : err.message;
    return NextResponse.json(errorResponse(message, payload.url, start), { status: 200 });
  }
}

function errorResponse(message: string, url: string, start?: number): TachyResponse {
  return {
    status: 0,
    statusText: "Error",
    headers: {},
    body: "",
    contentType: "",
    timeMs: start ? performance.now() - start : 0,
    sizeBytes: 0,
    cookies: [],
    redirected: false,
    finalUrl: url,
    error: message,
  };
}

function isBlockedHost(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host === "169.254.169.254") return true; // cloud metadata
    if (host === "metadata.google.internal") return true;
    return false;
  } catch {
    return false;
  }
}
