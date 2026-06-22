"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Command, Layers, Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IconButton } from "./ui";

export function TopBar() {
  const environments = useStore((s) => s.environments);
  const activeEnvId = useStore((s) => s.activeEnvId);
  const setActiveEnv = useStore((s) => s.setActiveEnv);
  const toggleCommandPalette = useStore((s) => s.toggleCommandPalette);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeEnv = environments.find((e) => e.id === activeEnvId);

  return (
    <header className="flex h-12 items-center gap-3 border-b border-border bg-surface px-3">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-grape-500 shadow-glow">
          <Zap size={16} className="text-navy-950" fill="currentColor" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight brand-gradient">Tachy</span>
        </div>
        <span className="ml-1 hidden text-[10px] text-muted sm:inline">
          Lightning-fast API development
        </span>
      </div>

      {/* Command palette trigger */}
      <button
        onClick={() => toggleCommandPalette(true)}
        className="ml-4 hidden items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs text-muted transition-colors hover:border-cyan-500/40 hover:text-fg md:flex"
      >
        <Command size={13} />
        <span>Search or jump to…</span>
        <kbd className="ml-6 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Environment selector */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-2 py-1">
          <Layers size={13} className="text-muted" />
          <select
            value={activeEnvId ?? ""}
            onChange={(e) => setActiveEnv(e.target.value || null)}
            className="cursor-pointer bg-transparent pr-1 text-xs font-medium text-fg focus:outline-none"
          >
            <option value="" className="bg-navy-900">No Environment</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id} className="bg-navy-900">
                {env.name}
              </option>
            ))}
          </select>
          {activeEnv && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: activeEnv.color }}
            />
          )}
        </div>

        {/* Theme toggle */}
        <IconButton
          label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {mounted && theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>

        {/* Avatar */}
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-grape-500 to-cyan-500 text-[11px] font-bold text-navy-950",
          )}
          title="Personal Workspace"
        >
          T
        </div>
      </div>
    </header>
  );
}
