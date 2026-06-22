import { emptyAuth } from "./auth";
import { newBody, newKeyValue, newRequest, uid } from "./factory";
import type {
  Collection,
  CollectionNode,
  HttpMethod,
  KeyValue,
  TachyRequest,
} from "./types";

/* ---------------- cURL import ---------------- */

export function parseCurl(input: string): TachyRequest | null {
  const text = input.trim().replace(/\\\r?\n/g, " ");
  if (!/^curl\b/.test(text)) return null;

  const tokens = tokenize(text);
  let method: HttpMethod = "GET";
  let url = "";
  const headers: KeyValue[] = [];
  let body = "";

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "-X" || t === "--request") {
      method = (tokens[++i]?.toUpperCase() as HttpMethod) ?? "GET";
    } else if (t === "-H" || t === "--header") {
      const h = tokens[++i] ?? "";
      const idx = h.indexOf(":");
      if (idx > 0)
        headers.push(
          newKeyValue({ key: h.slice(0, idx).trim(), value: h.slice(idx + 1).trim() }),
        );
    } else if (t === "-d" || t === "--data" || t === "--data-raw" || t === "--data-binary") {
      body = tokens[++i] ?? "";
      if (method === "GET") method = "POST";
    } else if (t === "-u" || t === "--user") {
      const cred = tokens[++i] ?? "";
      headers.push(newKeyValue({ key: "Authorization", value: "Basic " + btoa(cred) }));
    } else if (!t.startsWith("-") && !url) {
      url = t;
    }
  }

  const req = newRequest({ name: url || "Imported cURL", method, url, headers: [...headers, newKeyValue()] });
  if (body) {
    req.body = { ...newBody(), mode: "json", raw: body };
  }
  return req;
}

function tokenize(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (/\s/.test(c)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
    } else {
      cur += c;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/* ---------------- Postman v2.1 import ---------------- */

interface PMItem {
  name: string;
  item?: PMItem[];
  request?: PMRequest;
}
interface PMRequest {
  method?: string;
  header?: { key: string; value: string; disabled?: boolean }[];
  url?: string | { raw?: string; query?: { key: string; value: string; disabled?: boolean }[] };
  body?: { mode?: string; raw?: string; urlencoded?: { key: string; value: string; disabled?: boolean }[] };
  auth?: { type?: string; bearer?: { key: string; value: string }[] };
}

export function importPostman(json: string): Collection | null {
  let data: { info?: { name?: string }; item?: PMItem[] };
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!data.item) return null;

  const collection: Collection = {
    id: uid(),
    name: data.info?.name ?? "Imported Collection",
    description: "",
    variables: [newKeyValue()],
    auth: emptyAuth(),
    nodes: (data.item ?? []).map(convertItem),
  };
  return collection;
}

function convertItem(item: PMItem): CollectionNode {
  if (item.item) {
    return {
      id: uid(),
      name: item.name,
      type: "folder",
      expanded: true,
      children: item.item.map(convertItem),
    };
  }
  const r = item.request ?? {};
  const urlRaw = typeof r.url === "string" ? r.url : r.url?.raw ?? "";
  const queries = typeof r.url === "object" ? r.url.query ?? [] : [];

  const request = newRequest({
    name: item.name,
    method: (r.method?.toUpperCase() as HttpMethod) ?? "GET",
    url: urlRaw,
    headers: [
      ...(r.header ?? []).map((h) =>
        newKeyValue({ key: h.key, value: h.value, enabled: !h.disabled }),
      ),
      newKeyValue(),
    ],
    params: [
      ...queries.map((q) => newKeyValue({ key: q.key, value: q.value, enabled: !q.disabled })),
      newKeyValue(),
    ],
  });

  if (r.body?.mode === "raw" && r.body.raw) {
    request.body = { ...newBody(), mode: "json", raw: r.body.raw };
  } else if (r.body?.mode === "urlencoded" && r.body.urlencoded) {
    request.body = {
      ...newBody(),
      mode: "urlencoded",
      urlencoded: [
        ...r.body.urlencoded.map((u) =>
          newKeyValue({ key: u.key, value: u.value, enabled: !u.disabled }),
        ),
        newKeyValue(),
      ],
    };
  }

  if (r.auth?.type === "bearer") {
    const token = r.auth.bearer?.find((b) => b.key === "token")?.value ?? "";
    request.auth = { ...emptyAuth(), type: "bearer", bearer: { token } };
  }

  return { id: uid(), name: item.name, type: "request", request };
}

/* ---------------- Export ---------------- */

export function exportPostman(collection: Collection): string {
  const data = {
    info: {
      name: collection.name,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      _exporter: "Tachy",
    },
    item: collection.nodes.map(exportNode),
    variable: collection.variables
      .filter((v) => v.key)
      .map((v) => ({ key: v.key, value: v.value })),
  };
  return JSON.stringify(data, null, 2);
}

function exportNode(node: CollectionNode): unknown {
  if (node.type === "folder") {
    return { name: node.name, item: (node.children ?? []).map(exportNode) };
  }
  const r = node.request!;
  return {
    name: node.name,
    request: {
      method: r.method,
      header: r.headers
        .filter((h) => h.key)
        .map((h) => ({ key: h.key, value: h.value, disabled: !h.enabled })),
      url: { raw: r.url },
      body:
        r.body.mode === "none"
          ? undefined
          : { mode: "raw", raw: r.body.raw },
    },
  };
}
