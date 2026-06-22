"use client";

import { useStore } from "@/lib/store";
import { cn, methodColor } from "@/lib/utils";
import { Globe, Plus, X } from "lucide-react";
import { useCallbackRef } from "./useCallbackRef";
import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { EnvironmentEditor } from "./EnvironmentEditor";
import { RequestPanel } from "./RequestPanel";
import { ResponsePanel } from "./ResponsePanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { EmptyState } from "./ui";

export function Workspace() {
  const hydrated = useStore((s) => s.hydrated);
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const closeTab = useStore((s) => s.closeTab);
  const openNewTab = useStore((s) => s.openNewTab);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const responseHeight = useStore((s) => s.responseHeight);
  const setResponseHeight = useStore((s) => s.setResponseHeight);

  const saveActiveTab = useStore((s) => s.saveActiveTab);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        openNewTab();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveActiveTab();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
        if (activeTabId) {
          e.preventDefault();
          closeTab(activeTabId);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNewTab, saveActiveTab, closeTab, activeTabId]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-grape-500 shadow-glow animate-pulse">
            <span className="text-lg">⚡</span>
          </div>
          <span className="text-xs text-muted">Loading Tachy…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-fg">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <div style={{ width: sidebarWidth }} className="hidden shrink-0 md:block">
          <Sidebar />
        </div>
        <Resizer orientation="vertical" onResize={(d) => setSidebarWidth(sidebarWidth + d)} />

        {/* Main */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Tab bar */}
          <div className="flex h-10 items-center border-b border-border bg-surface">
            <div className="flex min-w-0 flex-1 items-center overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const active = tab.id === activeTab?.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "group flex h-10 max-w-[200px] shrink-0 items-center gap-2 border-r border-border px-3 text-xs",
                      active
                        ? "bg-bg text-fg"
                        : "bg-surface text-muted hover:bg-elevated/50",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[9px] font-bold",
                        methodColor(tab.request.method),
                      )}
                    >
                      {tab.request.method.slice(0, 4)}
                    </span>
                    <span className="truncate">{tab.request.name || "Untitled"}</span>
                    {tab.dirty && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    )}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="ml-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-border group-hover:opacity-100"
                    >
                      <X size={12} />
                    </span>
                  </button>
                );
              })}
              <button
                onClick={openNewTab}
                className="flex h-10 w-9 shrink-0 items-center justify-center text-muted hover:bg-elevated hover:text-fg"
                title="New tab (⌘T)"
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("tachy:edit-globals"))}
              className="flex h-10 shrink-0 items-center gap-1.5 border-l border-border px-3 text-[11px] text-muted hover:bg-elevated hover:text-fg"
              title="Global variables"
            >
              <Globe size={13} /> Globals
            </button>
          </div>

          {/* Request + Response split */}
          {activeTab ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-hidden">
                <RequestPanel tab={activeTab} />
              </div>
              <Resizer
                orientation="horizontal"
                onResize={(d) => setResponseHeight(responseHeight - d)}
              />
              <div
                style={{ height: responseHeight }}
                className="shrink-0 overflow-hidden border-t border-border bg-bg"
              >
                <ResponsePanel tab={activeTab} />
              </div>
            </div>
          ) : (
            <EmptyState title="No request open" description="Create a new request to begin." />
          )}
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      <CommandPalette />
      <EnvironmentEditor />
    </div>
  );
}

function StatusBar() {
  const tabCount = useStore((s) => s.tabs.length);
  const historyCount = useStore((s) => s.history.length);
  const env = useStore((s) => s.environments.find((e) => e.id === s.activeEnvId));
  const toggleCommandPalette = useStore((s) => s.toggleCommandPalette);

  return (
    <div className="flex h-6 items-center gap-4 border-t border-border bg-surface px-3 text-[11px] text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
      </span>
      <span>{tabCount} tabs</span>
      <span>{historyCount} in history</span>
      <span className="flex items-center gap-1">
        Env:
        {env ? (
          <span className="flex items-center gap-1 text-fg/80">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: env.color }} />
            {env.name}
          </span>
        ) : (
          <span className="text-fg/60">None</span>
        )}
      </span>
      <button
        onClick={() => toggleCommandPalette(true)}
        className="ml-auto hover:text-fg"
      >
        ⌘K Command Palette
      </button>
    </div>
  );
}

/* ---------------- Resizer ---------------- */

function Resizer({
  orientation,
  onResize,
}: {
  orientation: "vertical" | "horizontal";
  onResize: (delta: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const last = useRef(0);
  const onResizeRef = useCallbackRef(onResize);

  useEffect(() => {
    if (!dragging) return;
    function move(e: MouseEvent) {
      const pos = orientation === "vertical" ? e.clientX : e.clientY;
      const delta = pos - last.current;
      last.current = pos;
      onResizeRef(delta);
    }
    function up() {
      setDragging(false);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    document.body.style.cursor = orientation === "vertical" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, orientation, onResizeRef]);

  return (
    <div
      onMouseDown={(e) => {
        last.current = orientation === "vertical" ? e.clientX : e.clientY;
        setDragging(true);
      }}
      className={cn(
        "group relative z-10 shrink-0 transition-colors",
        orientation === "vertical"
          ? "hidden w-1 cursor-col-resize hover:bg-cyan-500/40 md:block"
          : "h-1 cursor-row-resize hover:bg-cyan-500/40",
        dragging && "bg-cyan-500/60",
      )}
    />
  );
}
