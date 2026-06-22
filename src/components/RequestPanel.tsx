"use client";

import { generateCode, CODE_LANGS, type CodeLang } from "@/lib/codegen";
import { newKeyValue } from "@/lib/factory";
import { useStore } from "@/lib/store";
import type { AuthType, BodyMode, RequestTab, TachyRequest } from "@/lib/types";
import { HTTP_METHODS } from "@/lib/types";
import { cn, methodColor } from "@/lib/utils";
import { Code2, Save, Send, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CodeEditor } from "./CodeEditor";
import { KeyValueEditor } from "./KeyValueEditor";
import { Button, IconButton, SegTabs, Spinner } from "./ui";

type ConfigTab = "params" | "headers" | "auth" | "body" | "pre" | "tests";

export function RequestPanel({ tab }: { tab: RequestTab }) {
  const update = useStore((s) => s.updateActiveRequest);
  const send = useStore((s) => s.send);
  const save = useStore((s) => s.saveActiveTab);
  const [configTab, setConfigTab] = useState<ConfigTab>("params");
  const [codeOpen, setCodeOpen] = useState(false);

  const req = tab.request;

  function set(patch: Partial<TachyRequest>) {
    update((r) => ({ ...r, ...patch }));
  }

  const paramCount = req.params.filter((p) => p.enabled && p.key).length;
  const headerCount = req.headers.filter((p) => p.enabled && p.key).length;

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send(tab.id);
    }
  }

  return (
    <div className="flex h-full flex-col" onKeyDown={onKeyDown}>
      {/* URL bar */}
      <div className="flex items-center gap-2 px-3 pt-3">
        <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-border bg-elevated focus-within:border-cyan-500/50 focus-within:shadow-glow">
          <div className="relative">
            <select
              value={req.method}
              onChange={(e) => set({ method: e.target.value as TachyRequest["method"] })}
              className={cn(
                "h-11 cursor-pointer appearance-none bg-transparent pl-4 pr-8 text-sm font-bold focus:outline-none",
                methodColor(req.method),
              )}
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m} className="bg-navy-900 text-fg">
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="h-6 w-px bg-border" />
          <UrlInput value={req.url} onChange={(url) => set({ url })} />
        </div>

        <Button
          variant="primary"
          size="lg"
          className="h-11 px-6"
          disabled={tab.loading}
          onClick={() => send(tab.id)}
        >
          {tab.loading ? <Spinner /> : <Send size={16} />}
          {tab.loading ? "Sending" : "Send"}
        </Button>

        <IconButton
          label="Save request"
          className="h-11 w-10"
          onClick={save}
        >
          <Save size={17} className={cn(tab.dirty && tab.sourceNodeId && "text-cyan-400")} />
        </IconButton>
        <IconButton
          label="Generate code"
          className="h-11 w-10"
          active={codeOpen}
          onClick={() => setCodeOpen(!codeOpen)}
        >
          <Code2 size={17} />
        </IconButton>
      </div>

      {/* Config tabs */}
      <div className="border-b border-border px-3 pt-3">
        <SegTabs<ConfigTab>
          value={configTab}
          onChange={setConfigTab}
          options={[
            { value: "params", label: "Params", badge: paramCount || undefined },
            { value: "headers", label: "Headers", badge: headerCount || undefined },
            { value: "auth", label: "Auth" },
            {
              value: "body",
              label: "Body",
              badge: req.body.mode !== "none" ? 1 : undefined,
            },
            { value: "pre", label: "Pre-request" },
            { value: "tests", label: "Tests" },
          ]}
        />
      </div>

      {/* Config content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {configTab === "params" && (
          <KeyValueEditor
            items={req.params}
            onChange={(params) => set({ params })}
            keyPlaceholder="Parameter"
          />
        )}
        {configTab === "headers" && (
          <HeadersEditor req={req} set={set} />
        )}
        {configTab === "auth" && <AuthEditor req={req} set={set} />}
        {configTab === "body" && <BodyEditor req={req} set={set} />}
        {configTab === "pre" && (
          <ScriptEditor
            label="Pre-request Script"
            hint="Runs before the request is sent. Use pm.environment.set('token', '...') and pm.variables.get(...)."
            value={req.preRequestScript}
            onChange={(preRequestScript) => set({ preRequestScript })}
          />
        )}
        {configTab === "tests" && (
          <ScriptEditor
            label="Tests"
            hint="Runs after the response. Use pm.test('name', () => pm.expect(...).to.equal(...))."
            value={req.testScript}
            onChange={(testScript) => set({ testScript })}
            tests
          />
        )}
      </div>

      {codeOpen && <CodePanel req={req} onClose={() => setCodeOpen(false)} />}
    </div>
  );
}

/* ---------------- URL input with variable highlighting ---------------- */

function UrlInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="https://api.example.com/v1/resource  ·  use {{baseUrl}} for variables"
      spellCheck={false}
      className="h-11 flex-1 bg-transparent px-3 font-mono text-[13px] text-fg placeholder:text-muted/50 focus:outline-none"
    />
  );
}

/* ---------------- Headers with presets ---------------- */

function HeadersEditor({
  req,
  set,
}: {
  req: TachyRequest;
  set: (patch: Partial<TachyRequest>) => void;
}) {
  const presets = [
    { label: "Content-Type: JSON", key: "Content-Type", value: "application/json" },
    { label: "Accept: JSON", key: "Accept", value: "application/json" },
    { label: "Authorization", key: "Authorization", value: "Bearer {{token}}" },
    { label: "User-Agent", key: "User-Agent", value: "Tachy/1.0" },
  ];

  function addPreset(p: { key: string; value: string }) {
    const withoutTrailing = req.headers.filter((h) => h.key.trim() !== "");
    set({
      headers: [...withoutTrailing, newKeyValue({ key: p.key, value: p.value }), newKeyValue()],
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => addPreset(p)}
            className="rounded-md border border-border bg-elevated px-2 py-1 text-[11px] text-muted hover:border-cyan-500/40 hover:text-cyan-400"
          >
            + {p.label}
          </button>
        ))}
      </div>
      <KeyValueEditor
        items={req.headers}
        onChange={(headers) => set({ headers })}
        keyPlaceholder="Header"
      />
    </div>
  );
}

/* ---------------- Auth ---------------- */

function AuthEditor({
  req,
  set,
}: {
  req: TachyRequest;
  set: (patch: Partial<TachyRequest>) => void;
}) {
  const auth = req.auth;
  const types: { value: AuthType; label: string }[] = [
    { value: "none", label: "No Auth" },
    { value: "bearer", label: "Bearer Token" },
    { value: "basic", label: "Basic Auth" },
    { value: "apikey", label: "API Key" },
    { value: "jwt", label: "JWT Bearer" },
    { value: "oauth2", label: "OAuth 2.0" },
    { value: "digest", label: "Digest" },
  ];

  function setAuth(patch: Partial<typeof auth>) {
    set({ auth: { ...auth, ...patch } });
  }

  return (
    <div className="flex gap-6">
      <div className="w-44 shrink-0">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted">
          Auth Type
        </label>
        <select
          value={auth.type}
          onChange={(e) => setAuth({ type: e.target.value as AuthType })}
          className="h-9 w-full cursor-pointer rounded-lg border border-border bg-elevated px-2.5 text-sm text-fg focus:border-cyan-500/50"
        >
          {types.map((t) => (
            <option key={t.value} value={t.value} className="bg-navy-900">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-3">
        {auth.type === "none" && (
          <p className="pt-2 text-xs text-muted">
            This request does not use any authorization.
          </p>
        )}
        {auth.type === "bearer" && (
          <Field label="Token">
            <input
              value={auth.bearer?.token ?? ""}
              onChange={(e) => setAuth({ bearer: { token: e.target.value } })}
              placeholder="{{token}}"
              className="auth-input"
            />
          </Field>
        )}
        {auth.type === "basic" && (
          <>
            <Field label="Username">
              <input
                value={auth.basic?.username ?? ""}
                onChange={(e) =>
                  setAuth({ basic: { ...auth.basic!, username: e.target.value } })
                }
                className="auth-input"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={auth.basic?.password ?? ""}
                onChange={(e) =>
                  setAuth({ basic: { ...auth.basic!, password: e.target.value } })
                }
                className="auth-input"
              />
            </Field>
          </>
        )}
        {auth.type === "apikey" && (
          <>
            <Field label="Key">
              <input
                value={auth.apikey?.key ?? ""}
                onChange={(e) =>
                  setAuth({ apikey: { ...auth.apikey!, key: e.target.value } })
                }
                placeholder="X-API-Key"
                className="auth-input"
              />
            </Field>
            <Field label="Value">
              <input
                value={auth.apikey?.value ?? ""}
                onChange={(e) =>
                  setAuth({ apikey: { ...auth.apikey!, value: e.target.value } })
                }
                placeholder="{{apiKey}}"
                className="auth-input"
              />
            </Field>
            <Field label="Add to">
              <select
                value={auth.apikey?.addTo ?? "header"}
                onChange={(e) =>
                  setAuth({
                    apikey: { ...auth.apikey!, addTo: e.target.value as "header" | "query" },
                  })
                }
                className="auth-input cursor-pointer"
              >
                <option value="header" className="bg-navy-900">Header</option>
                <option value="query" className="bg-navy-900">Query Params</option>
              </select>
            </Field>
          </>
        )}
        {(auth.type === "jwt" || auth.type === "oauth2") && (
          <Field label={auth.type === "jwt" ? "JWT / Token" : "Access Token"}>
            <input
              value={
                auth.type === "jwt" ? auth.jwt?.secret ?? "" : auth.oauth2?.accessToken ?? ""
              }
              onChange={(e) =>
                auth.type === "jwt"
                  ? setAuth({ jwt: { ...auth.jwt!, secret: e.target.value } })
                  : setAuth({ oauth2: { ...auth.oauth2!, accessToken: e.target.value } })
              }
              placeholder="{{accessToken}}"
              className="auth-input"
            />
          </Field>
        )}
        {auth.type === "digest" && (
          <p className="pt-2 text-xs text-muted">
            Digest auth is configured per-request at send time (challenge/response).
            Provide credentials via Basic fields for the initial handshake.
          </p>
        )}
      </div>
      <style jsx global>{`
        .auth-input {
          height: 2.25rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--elevated));
          padding: 0 0.75rem;
          font-family: var(--font-mono);
          font-size: 13px;
          color: rgb(var(--fg));
        }
        .auth-input:focus {
          border-color: rgba(0, 240, 255, 0.5);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <label className="w-24 shrink-0 text-right text-[12px] text-muted">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ---------------- Body ---------------- */

const BODY_MODES: { value: BodyMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "json", label: "JSON" },
  { value: "text", label: "Text" },
  { value: "xml", label: "XML" },
  { value: "html", label: "HTML" },
  { value: "javascript", label: "JavaScript" },
  { value: "form-data", label: "Form Data" },
  { value: "urlencoded", label: "x-www-form-urlencoded" },
  { value: "graphql", label: "GraphQL" },
  { value: "binary", label: "Binary" },
];

const RAW_LANG: Record<string, string> = {
  json: "json",
  text: "plaintext",
  xml: "xml",
  html: "html",
  javascript: "javascript",
};

function BodyEditor({
  req,
  set,
}: {
  req: TachyRequest;
  set: (patch: Partial<TachyRequest>) => void;
}) {
  const body = req.body;

  function setBody(patch: Partial<typeof body>) {
    set({ body: { ...body, ...patch } });
  }

  const isRaw = ["json", "text", "xml", "html", "javascript"].includes(body.mode);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <select
          value={body.mode}
          onChange={(e) => setBody({ mode: e.target.value as BodyMode })}
          className="h-8 cursor-pointer rounded-lg border border-border bg-elevated px-2.5 text-xs text-fg focus:border-cyan-500/50"
        >
          {BODY_MODES.map((m) => (
            <option key={m.value} value={m.value} className="bg-navy-900">
              {m.label}
            </option>
          ))}
        </select>
        {body.mode === "json" && (
          <button
            onClick={() => {
              try {
                setBody({ raw: JSON.stringify(JSON.parse(body.raw), null, 2) });
              } catch {
                /* ignore invalid */
              }
            }}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:text-cyan-400"
          >
            <Sparkles size={12} /> Beautify
          </button>
        )}
      </div>

      {body.mode === "none" && (
        <p className="pt-2 text-xs text-muted">This request has no body.</p>
      )}

      {isRaw && (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
          <CodeEditor
            value={body.raw}
            onChange={(raw) => setBody({ raw })}
            language={RAW_LANG[body.mode] ?? "plaintext"}
          />
        </div>
      )}

      {body.mode === "form-data" && (
        <KeyValueEditor
          items={body.formData}
          onChange={(formData) => setBody({ formData })}
          allowFileType
        />
      )}
      {body.mode === "urlencoded" && (
        <KeyValueEditor
          items={body.urlencoded}
          onChange={(urlencoded) => setBody({ urlencoded })}
        />
      )}
      {body.mode === "graphql" && (
        <div className="grid min-h-0 flex-1 grid-rows-[2fr_1fr] gap-2">
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-elevated/50 px-3 py-1 text-[11px] font-medium text-muted">
              Query
            </div>
            <CodeEditor
              value={body.graphql.query}
              onChange={(query) => setBody({ graphql: { ...body.graphql, query } })}
              language="graphql"
              height="calc(100% - 28px)"
            />
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-elevated/50 px-3 py-1 text-[11px] font-medium text-muted">
              Variables
            </div>
            <CodeEditor
              value={body.graphql.variables}
              onChange={(variables) => setBody({ graphql: { ...body.graphql, variables } })}
              language="json"
              height="calc(100% - 28px)"
            />
          </div>
        </div>
      )}
      {body.mode === "binary" && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
          Binary file upload — drag a file here (demo placeholder)
        </div>
      )}
    </div>
  );
}

/* ---------------- Script editor ---------------- */

const SNIPPETS = [
  { label: "Status is 200", code: `pm.test("Status code is 200", function () {\n  pm.response.to.have.status(200);\n});\n` },
  { label: "Response has key", code: `pm.test("Body has field", function () {\n  const data = pm.response.json();\n  pm.expect(data).to.have.property("id");\n});\n` },
  { label: "Save token", code: `const data = pm.response.json();\npm.environment.set("token", data.token);\n` },
  { label: "Response time < 500ms", code: `pm.test("Response is fast", function () {\n  pm.expect(pm.response.responseTime).to.be.below(500);\n});\n` },
];

function ScriptEditor({
  label,
  hint,
  value,
  onChange,
  tests,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  tests?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-fg">{label}</div>
          <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(tests ? SNIPPETS : SNIPPETS.slice(2)).map((s) => (
          <button
            key={s.label}
            onClick={() => onChange(value + (value ? "\n" : "") + s.code)}
            className="rounded-md border border-border bg-elevated px-2 py-1 text-[11px] text-muted hover:border-grape-500/40 hover:text-grape-400"
          >
            + {s.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
        <CodeEditor value={value} onChange={onChange} language="javascript" />
      </div>
    </div>
  );
}

/* ---------------- Code generation panel ---------------- */

function CodePanel({ req, onClose }: { req: TachyRequest; onClose: () => void }) {
  const [lang, setLang] = useState<CodeLang>("curl");
  const collection = useStore((s) =>
    s.collections.find((c) => c.nodes.some((n) => n.request?.id === req.id)),
  );
  const env = useStore((s) => s.environments.find((e) => e.id === s.activeEnvId));
  const globals = useStore((s) => s.globals);

  const code = useMemo(
    () => generateCode(req, { collection, environment: env, globals }, lang),
    [req, collection, env, globals, lang],
  );

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-[460px] flex-col border-l border-border bg-surface shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Code2 size={16} className="text-cyan-400" /> Code Snippet
        </div>
        <IconButton label="Close" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-border p-3">
        {CODE_LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLang(l.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium",
              lang === l.id
                ? "bg-cyan-500/15 text-cyan-400"
                : "text-muted hover:bg-elevated",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed text-fg/90">
          {code}
        </pre>
      </div>
      <div className="border-t border-border p-3">
        <Button
          variant="subtle"
          className="w-full justify-center"
          onClick={() => navigator.clipboard.writeText(code)}
        >
          Copy to clipboard
        </Button>
      </div>
    </div>
  );
}
