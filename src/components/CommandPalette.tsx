"use client";

import { useStore } from "@/lib/store";
import type { CollectionNode } from "@/lib/types";
import { cn, methodColor } from "@/lib/utils";
import {
  CornerDownLeft,
  FilePlus2,
  Layers,
  Moon,
  Plus,
  Search,
  Sun,
  Variable,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
  group: string;
}

export function CommandPalette() {
  const open = useStore((s) => s.commandPaletteOpen);
  const toggle = useStore((s) => s.toggleCommandPalette);
  const collections = useStore((s) => s.collections);
  const environments = useStore((s) => s.environments);
  const openRequestNode = useStore((s) => s.openRequestNode);
  const openNewTab = useStore((s) => s.openNewTab);
  const addCollection = useStore((s) => s.addCollection);
  const setActiveEnv = useStore((s) => s.setActiveEnv);
  const setSidebarTab = useStore((s) => s.setSidebarTab);
  const { theme, setTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  // Global keyboard shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") toggle(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];

    // Requests from collections
    function walk(collectionId: string, nodes: CollectionNode[], path: string) {
      for (const n of nodes) {
        if (n.type === "request") {
          cmds.push({
            id: n.id,
            label: n.name,
            hint: `${n.request?.method} · ${path}`,
            icon: (
              <span className={cn("font-mono text-[10px] font-bold w-9 text-right", methodColor(n.request?.method ?? "GET"))}>
                {(n.request?.method ?? "GET").slice(0, 4)}
              </span>
            ),
            group: "Requests",
            run: () => {
              openRequestNode(collectionId, n);
              toggle(false);
            },
          });
        } else if (n.children) {
          walk(collectionId, n.children, `${path} / ${n.name}`);
        }
      }
    }
    for (const c of collections) walk(c.id, c.nodes, c.name);

    // Actions
    cmds.push(
      {
        id: "new-request",
        label: "New Request",
        hint: "Create a blank request",
        icon: <FilePlus2 size={15} className="text-cyan-400" />,
        group: "Actions",
        run: () => {
          openNewTab();
          toggle(false);
        },
      },
      {
        id: "new-collection",
        label: "New Collection",
        icon: <Plus size={15} className="text-cyan-400" />,
        group: "Actions",
        run: () => {
          addCollection();
          setSidebarTab("collections");
          toggle(false);
        },
      },
      {
        id: "toggle-theme",
        label: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
        icon: theme === "dark" ? <Sun size={15} /> : <Moon size={15} />,
        group: "Actions",
        run: () => {
          setTheme(theme === "dark" ? "light" : "dark");
          toggle(false);
        },
      },
    );

    // Environments
    cmds.push({
      id: "env-none",
      label: "No Environment",
      icon: <Variable size={15} className="text-muted" />,
      group: "Environments",
      run: () => {
        setActiveEnv(null);
        toggle(false);
      },
    });
    for (const env of environments) {
      cmds.push({
        id: "env-" + env.id,
        label: `Activate: ${env.name}`,
        icon: <Layers size={15} style={{ color: env.color }} />,
        group: "Environments",
        run: () => {
          setActiveEnv(env.id);
          toggle(false);
        },
      });
    }

    return cmds;
  }, [
    collections,
    environments,
    theme,
    openRequestNode,
    openNewTab,
    addCollection,
    setActiveEnv,
    setSidebarTab,
    setTheme,
    toggle,
  ]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
    );
  }, [commands, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[index]?.run();
    }
  }

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-navy-950/70 backdrop-blur-sm pt-[12vh] animate-fade-in"
      onClick={() => toggle(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={18} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder="Search requests, run actions, switch environments…"
            className="h-14 flex-1 bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
          />
          <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted">
            ESC
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted">
              No results for “{query}”
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted/70">
                  {group}
                </div>
                {items.map((c) => {
                  flatIndex++;
                  const active = flatIndex === index;
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setIndex(flatIndex)}
                      onClick={c.run}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                        active ? "bg-cyan-500/10 text-fg" : "text-fg/80 hover:bg-elevated",
                      )}
                    >
                      <span className="flex w-9 shrink-0 justify-center">{c.icon}</span>
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && (
                        <span className="truncate text-[11px] text-muted">{c.hint}</span>
                      )}
                      {active && <CornerDownLeft size={13} className="text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
