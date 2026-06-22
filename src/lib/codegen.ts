import { buildProxyRequest } from "./client";
import type { Collection, Environment, KeyValue, TachyRequest } from "./types";

export type CodeLang = "curl" | "javascript" | "python" | "go" | "java";

export const CODE_LANGS: { id: CodeLang; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "javascript", label: "JavaScript (fetch)" },
  { id: "python", label: "Python (requests)" },
  { id: "go", label: "Go (net/http)" },
  { id: "java", label: "Java (HttpClient)" },
];

interface Ctx {
  globals?: KeyValue[];
  collection?: Collection | null;
  environment?: Environment | null;
}

export function generateCode(req: TachyRequest, ctx: Ctx, lang: CodeLang): string {
  const { proxy } = buildProxyRequest(req, ctx);
  switch (lang) {
    case "curl":
      return curl(proxy);
    case "javascript":
      return js(proxy);
    case "python":
      return python(proxy);
    case "go":
      return go(proxy);
    case "java":
      return java(proxy);
  }
}

interface P {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

function curl(p: P): string {
  const lines = [`curl -X ${p.method} '${p.url}'`];
  for (const [k, v] of Object.entries(p.headers)) lines.push(`  -H '${k}: ${v}'`);
  if (p.body) lines.push(`  -d '${p.body.replace(/'/g, "'\\''")}'`);
  return lines.join(" \\\n");
}

function js(p: P): string {
  const opts: string[] = [`  method: "${p.method}"`];
  if (Object.keys(p.headers).length)
    opts.push(`  headers: ${JSON.stringify(p.headers, null, 2).replace(/\n/g, "\n  ")}`);
  if (p.body) opts.push(`  body: ${JSON.stringify(p.body)}`);
  return `const res = await fetch("${p.url}", {\n${opts.join(",\n")}\n});\nconst data = await res.json();\nconsole.log(data);`;
}

function python(p: P): string {
  const headers = JSON.stringify(p.headers, null, 4);
  const bodyLine = p.body ? `\ndata = ${JSON.stringify(p.body)}` : "";
  const call = p.body
    ? `requests.request("${p.method}", url, headers=headers, data=data)`
    : `requests.request("${p.method}", url, headers=headers)`;
  return `import requests\n\nurl = "${p.url}"\nheaders = ${headers}${bodyLine}\n\nresponse = ${call}\nprint(response.json())`;
}

function go(p: P): string {
  const bodyVar = p.body
    ? `payload := strings.NewReader(${JSON.stringify(p.body)})`
    : `var payload io.Reader = nil`;
  const headerLines = Object.entries(p.headers)
    .map(([k, v]) => `\treq.Header.Add("${k}", "${v}")`)
    .join("\n");
  return `package main

import (
\t"fmt"
\t"io"
\t"net/http"
\t"strings"
)

func main() {
\t${bodyVar}
\treq, _ := http.NewRequest("${p.method}", "${p.url}", payload)
${headerLines}
\tres, _ := http.DefaultClient.Do(req)
\tdefer res.Body.Close()
\tbody, _ := io.ReadAll(res.Body)
\tfmt.Println(string(body))
}`;
}

function java(p: P): string {
  const headerLines = Object.entries(p.headers)
    .map(([k, v]) => `    .header("${k}", "${v}")`)
    .join("\n");
  const bodyPub = p.body
    ? `HttpRequest.BodyPublishers.ofString(${JSON.stringify(p.body)})`
    : `HttpRequest.BodyPublishers.noBody()`;
  return `HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${p.url}"))
${headerLines}
    .method("${p.method}", ${bodyPub})
    .build();
HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`;
}
