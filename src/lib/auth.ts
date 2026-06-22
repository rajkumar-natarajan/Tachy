import type { AuthConfig, KeyValue } from "./types";

/** Base64 encode that works in browser and node runtimes. */
function b64(input: string): string {
  if (typeof btoa === "function") return btoa(input);
  return Buffer.from(input, "utf-8").toString("base64");
}

export interface AppliedAuth {
  headers: Record<string, string>;
  queryParams: { key: string; value: string }[];
}

/**
 * Translate an AuthConfig into concrete headers / query params.
 * Values are expected to be already variable-resolved by the caller.
 */
export function applyAuth(auth: AuthConfig): AppliedAuth {
  const headers: Record<string, string> = {};
  const queryParams: { key: string; value: string }[] = [];

  switch (auth.type) {
    case "bearer": {
      const t = auth.bearer?.token?.trim();
      if (t) headers["Authorization"] = `Bearer ${t}`;
      break;
    }
    case "basic": {
      const u = auth.basic?.username ?? "";
      const p = auth.basic?.password ?? "";
      if (u || p) headers["Authorization"] = `Basic ${b64(`${u}:${p}`)}`;
      break;
    }
    case "apikey": {
      const key = auth.apikey?.key?.trim();
      const value = auth.apikey?.value ?? "";
      if (key) {
        if (auth.apikey?.addTo === "query") queryParams.push({ key, value });
        else headers[key] = value;
      }
      break;
    }
    case "jwt": {
      const token = auth.jwt?.secret?.trim();
      const prefix = auth.jwt?.headerPrefix ?? "Bearer";
      if (token) headers["Authorization"] = `${prefix} ${token}`.trim();
      break;
    }
    case "oauth2": {
      const t = auth.oauth2?.accessToken?.trim();
      const prefix = auth.oauth2?.headerPrefix ?? "Bearer";
      if (t) headers["Authorization"] = `${prefix} ${t}`.trim();
      break;
    }
    case "digest":
    case "none":
    case "inherit":
    default:
      break;
  }

  return { headers, queryParams };
}

export function emptyAuth(): AuthConfig {
  return {
    type: "none",
    bearer: { token: "" },
    basic: { username: "", password: "" },
    apikey: { key: "", value: "", addTo: "header" },
    jwt: { algorithm: "HS256", secret: "", payload: "", headerPrefix: "Bearer" },
    oauth2: { accessToken: "", headerPrefix: "Bearer" },
  };
}

export function enabledKv(list: KeyValue[]): KeyValue[] {
  return list.filter((k) => k.enabled && k.key.trim() !== "");
}
