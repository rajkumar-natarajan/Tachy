"use client";

import type { RequestTab } from "@/lib/types";
import {
  cn,
  formatBytes,
  formatTime,
  isJsonContentType,
  statusBg,
  tryPrettyJson,
} from "@/lib/utils";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Search,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CodeEditor } from "./CodeEditor";
import { EmptyState, SegTabs } from "./ui";

type ResTab = "pretty" | "raw" | "preview" | "headers" | "cookies" | "tests" | "timeline";

export function ResponsePanel({ tab }: { tab: RequestTab }) {
  const [resTab, setResTab] = useState<ResTab>("pretty");
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);
  const res = tab.response;

  const pretty = useMemo(() => (res ? tryPrettyJson(res.body) : ""), [res]);
  const isJson = res ? isJsonContentType(res.contentType) : false;

  const filteredBody = useMemo(() => {
    if (!filter || !res) return pretty;
    return pretty
      .split("\n")
      .filter((line) => line.toLowerCase().includes(filter.toLowerCase()))
      .join("\n");
  }, [filter, pretty, res]);

  if (tab.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Zap size={28} className="animate-pulse text-cyan-400" />
            <div className="absolute inset-0 animate-ping">
              <Zap size={28} className="text-cyan-400/30" />
            </div>
          </div>
          <p className="text-xs text-muted">Sending request…</p>
        </div>
      </div>
    );
  }

  if (!res) {
    return (
      <EmptyState
        icon={<Zap size={36} />}
        title="Ready when you are"
        description="Send a request to see the response here. Press ⌘↵ to fire it instantly."
      />
    );
  }

  const passed = res.testResults?.filter((t) => t.passed).length ?? 0;
  const total = res.testResults?.length ?? 0;

  function copyBody() {
    navigator.clipboard.writeText(res!.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function download() {
    const blob = new Blob([res!.body], { type: res!.contentType || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "response";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col">
      {/* status bar */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold",
            statusBg(res.status),
          )}
        >
          {res.status === 0 ? <AlertCircle size={12} /> : null}
          {res.status === 0 ? "Error" : `${res.status} ${res.statusText}`}
        </span>
        <Stat label="Time" value={formatTime(res.timeMs)} accent />
        <Stat label="Size" value={formatBytes(res.sizeBytes)} />
        {total > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
              passed === total
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400",
            )}
          >
            <Check size={12} /> {passed}/{total} tests
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={copyBody}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted hover:bg-elevated hover:text-fg"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={download}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted hover:bg-elevated hover:text-fg"
          >
            <Download size={13} /> Save
          </button>
        </div>
      </div>

      {res.error && (
        <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle size={14} /> {res.error}
        </div>
      )}

      {/* response tabs */}
      <div className="flex items-center justify-between border-b border-border px-3">
        <SegTabs<ResTab>
          value={resTab}
          onChange={setResTab}
          options={[
            { value: "pretty", label: "Pretty" },
            { value: "raw", label: "Raw" },
            { value: "preview", label: "Preview" },
            {
              value: "headers",
              label: "Headers",
              badge: Object.keys(res.headers).length,
            },
            { value: "cookies", label: "Cookies", badge: res.cookies.length || undefined },
            { value: "tests", label: "Tests", badge: total || undefined },
            { value: "timeline", label: "Timeline" },
          ]}
        />
        {(resTab === "pretty" || resTab === "raw") && (
          <div className="relative hidden md:block">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="h-7 w-40 rounded-md bg-elevated pl-7 pr-2 text-[11px] text-fg placeholder:text-muted focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* response content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {resTab === "pretty" && (
          <CodeEditor
            value={filter ? filteredBody : pretty}
            language={isJson ? "json" : "plaintext"}
            readOnly
          />
        )}
        {resTab === "raw" && (
          <CodeEditor
            value={filter ? res.body.split("\n").filter((l) => l.toLowerCase().includes(filter.toLowerCase())).join("\n") : res.body}
            language="plaintext"
            readOnly
          />
        )}
        {resTab === "preview" && <PreviewTab res={res} />}
        {resTab === "headers" && <HeadersTab headers={res.headers} />}
        {resTab === "cookies" && <CookiesTab cookies={res.cookies} />}
        {resTab === "tests" && <TestsTab res={res} />}
        {resTab === "timeline" && <TimelineTab res={res} />}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="flex items-baseline gap-1 text-xs">
      <span className="text-muted">{label}</span>
      <span className={cn("font-mono font-medium", accent ? "text-cyan-400" : "text-fg")}>
        {value}
      </span>
    </span>
  );
}

function PreviewTab({ res }: { res: NonNullable<RequestTab["response"]> }) {
  const isHtml = /html/i.test(res.contentType);
  const isImage = /image\//i.test(res.contentType);

  if (isImage) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted">Image preview ({res.contentType})</p>
      </div>
    );
  }
  if (isHtml) {
    return (
      <iframe
        sandbox=""
        srcDoc={res.body}
        className="h-full w-full bg-white"
        title="Response preview"
      />
    );
  }
  return (
    <div className="p-4">
      <pre className="whitespace-pre-wrap break-words font-mono text-[12px] text-fg/80">
        {res.body}
      </pre>
    </div>
  );
}

function HeadersTab({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);
  return (
    <div className="h-full overflow-y-auto p-3">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="border-b border-border/40">
              <td className="w-1/3 py-1.5 pr-4 align-top font-mono text-[12px] font-medium text-cyan-300/90">
                {k}
              </td>
              <td className="py-1.5 align-top font-mono text-[12px] text-fg/80 break-all">
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CookiesTab({ cookies }: { cookies: { name: string; value: string }[] }) {
  if (cookies.length === 0) {
    return <EmptyState title="No cookies" description="This response set no cookies." />;
  }
  return (
    <div className="h-full overflow-y-auto p-3">
      <table className="w-full text-sm">
        <tbody>
          {cookies.map((c, i) => (
            <tr key={i} className="border-b border-border/40">
              <td className="w-1/3 py-1.5 pr-4 font-mono text-[12px] font-medium text-grape-400">
                {c.name}
              </td>
              <td className="py-1.5 font-mono text-[12px] text-fg/80 break-all">{c.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TestsTab({ res }: { res: NonNullable<RequestTab["response"]> }) {
  const tests = res.testResults ?? [];
  const logs = res.consoleLogs ?? [];

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {tests.length === 0 && logs.length === 0 && (
        <EmptyState
          title="No tests defined"
          description="Add assertions in the Tests tab to validate responses automatically."
        />
      )}
      {tests.length > 0 && (
        <div className="space-y-1.5">
          {tests.map((t, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                t.passed
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-red-500/20 bg-red-500/5",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                  t.passed ? "bg-emerald-500 text-navy-950" : "bg-red-500 text-white",
                )}
              >
                {t.passed ? "✓" : "✕"}
              </span>
              <span className={t.passed ? "text-emerald-300" : "text-red-300"}>{t.name}</span>
              {t.error && <span className="ml-auto text-[11px] text-red-400/80">{t.error}</span>}
            </div>
          ))}
        </div>
      )}
      {logs.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Console
          </div>
          <div className="rounded-lg border border-border bg-navy-950/50 p-3 font-mono text-[12px] text-fg/70 space-y-0.5">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted/50">›</span>
                <span className="break-all">{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineTab({ res }: { res: NonNullable<RequestTab["response"]> }) {
  // Synthetic phase breakdown (real low-level timing requires platform APIs).
  const total = res.timeMs;
  const phases = [
    { label: "DNS Lookup", pct: 0.08, color: "bg-cyan-500" },
    { label: "TCP Handshake", pct: 0.12, color: "bg-grape-500" },
    { label: "TLS Negotiation", pct: 0.18, color: "bg-blue-500" },
    { label: "Request Sent", pct: 0.05, color: "bg-emerald-500" },
    { label: "Waiting (TTFB)", pct: 0.45, color: "bg-amber-500" },
    { label: "Content Download", pct: 0.12, color: "bg-pink-500" },
  ];
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-cyan-400">{formatTime(total)}</span>
        <span className="text-xs text-muted">total round-trip</span>
      </div>
      <div className="space-y-2">
        {phases.map((p) => (
          <div key={p.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-right text-[11px] text-muted">{p.label}</span>
            <div className="flex-1">
              <div
                className={cn("h-3 rounded-full", p.color)}
                style={{ width: `${Math.max(4, p.pct * 100)}%`, opacity: 0.8 }}
              />
            </div>
            <span className="w-16 shrink-0 font-mono text-[11px] text-fg/70">
              {formatTime(total * p.pct)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-muted/70">
        Phase breakdown is estimated from total time. Connect Tachy to a backend agent for
        precise per-phase metrics.
      </p>
    </div>
  );
}
