"use client";

import { exportPostman, importPostman, parseCurl } from "@/lib/importer";
import { useStore, type SidebarTab } from "@/lib/store";
import type { Collection, CollectionNode } from "@/lib/types";
import { cn, methodColor, safeFilename, statusColor } from "@/lib/utils";
import {
  ChevronRight,
  Clock,
  Copy,
  Download,
  FilePlus2,
  FolderPlus,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  Variable,
} from "lucide-react";
import { useRef, useState } from "react";
import { IconButton } from "./ui";

export function Sidebar() {
  const sidebarTab = useStore((s) => s.sidebarTab);
  const setSidebarTab = useStore((s) => s.setSidebarTab);

  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: "collections", label: "Collections", icon: <Layers size={16} /> },
    { id: "environments", label: "Environments", icon: <Variable size={16} /> },
    { id: "history", label: "History", icon: <Clock size={16} /> },
  ];

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center gap-1 border-b border-border px-2 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSidebarTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors",
              sidebarTab === t.id
                ? "bg-elevated text-cyan-400"
                : "text-muted hover:bg-elevated/50 hover:text-fg",
            )}
          >
            {t.icon}
            <span className="hidden lg:inline">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {sidebarTab === "collections" && <CollectionsPanel />}
        {sidebarTab === "environments" && <EnvironmentsPanel />}
        {sidebarTab === "history" && <HistoryPanel />}
      </div>
    </div>
  );
}

/* ---------------- Collections ---------------- */

function CollectionsPanel() {
  const collections = useStore((s) => s.collections);
  const addCollection = useStore((s) => s.addCollection);
  const importCollection = useStore((s) => s.importCollection);
  const openNewTab = useStore((s) => s.openNewTab);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const col = importPostman(text);
      if (col) importCollection(col);
      else alert("Could not parse file as a Postman/Tachy collection.");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 px-3 py-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requests…"
            className="h-8 w-full rounded-lg bg-elevated border border-transparent pl-8 pr-2 text-xs text-fg placeholder:text-muted focus:border-cyan-500/40"
          />
        </div>
        <IconButton label="New collection" onClick={addCollection}>
          <Plus size={16} />
        </IconButton>
        <IconButton label="Import collection" onClick={() => fileRef.current?.click()}>
          <Upload size={15} />
        </IconButton>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.tachy"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Layers size={28} className="text-muted/40" />
            <p className="text-xs text-muted">No collections yet</p>
            <button
              onClick={addCollection}
              className="text-xs font-medium text-cyan-400 hover:underline"
            >
              Create your first collection
            </button>
          </div>
        ) : (
          collections.map((c) => (
            <CollectionItem key={c.id} collection={c} query={query.toLowerCase()} />
          ))
        )}
        <button
          onClick={openNewTab}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted hover:bg-elevated hover:text-fg"
        >
          <FilePlus2 size={14} /> New blank request
        </button>
      </div>
    </div>
  );
}

function CollectionItem({ collection, query }: { collection: Collection; query: string }) {
  const [expanded, setExpanded] = useState(true);
  const [menu, setMenu] = useState(false);
  const addFolder = useStore((s) => s.addFolder);
  const addRequest = useStore((s) => s.addRequest);
  const deleteCollection = useStore((s) => s.deleteCollection);

  function handleExport() {
    const blob = new Blob([exportPostman(collection)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename(collection.name)}.tachy.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-0.5">
      <div className="group flex items-center rounded-lg hover:bg-elevated/60">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-1.5 overflow-hidden px-2 py-1.5 text-left"
        >
          <ChevronRight
            size={14}
            className={cn("shrink-0 text-muted transition-transform", expanded && "rotate-90")}
          />
          <span className="text-sm">📦</span>
          <span className="truncate text-[13px] font-semibold text-fg">
            {collection.name}
          </span>
        </button>
        <div className="flex items-center pr-1 opacity-0 transition-opacity group-hover:opacity-100">
          <IconButton
            label="Add request"
            className="h-7 w-7"
            onClick={() => addRequest(collection.id, null)}
          >
            <FilePlus2 size={13} />
          </IconButton>
          <IconButton
            label="Add folder"
            className="h-7 w-7"
            onClick={() => addFolder(collection.id, null)}
          >
            <FolderPlus size={13} />
          </IconButton>
          <div className="relative">
            <IconButton label="More" className="h-7 w-7" onClick={() => setMenu(!menu)}>
              <MoreHorizontal size={14} />
            </IconButton>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-border bg-elevated py-1 shadow-xl animate-scale-in">
                  <MenuButton icon={<Download size={13} />} onClick={() => { handleExport(); setMenu(false); }}>
                    Export
                  </MenuButton>
                  <MenuButton
                    icon={<Trash2 size={13} />}
                    danger
                    onClick={() => { deleteCollection(collection.id); setMenu(false); }}
                  >
                    Delete
                  </MenuButton>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="ml-3 border-l border-border/60 pl-1">
          {collection.nodes.length === 0 ? (
            <p className="px-3 py-1.5 text-[11px] text-muted/60">Empty — add a request</p>
          ) : (
            collection.nodes.map((n) => (
              <TreeNode
                key={n.id}
                collectionId={collection.id}
                node={n}
                depth={0}
                query={query}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TreeNode({
  collectionId,
  node,
  depth,
  query,
}: {
  collectionId: string;
  node: CollectionNode;
  depth: number;
  query: string;
}) {
  const toggleExpand = useStore((s) => s.toggleExpand);
  const openRequestNode = useStore((s) => s.openRequestNode);
  const addRequest = useStore((s) => s.addRequest);
  const addFolder = useStore((s) => s.addFolder);
  const deleteNode = useStore((s) => s.deleteNode);
  const duplicateNode = useStore((s) => s.duplicateNode);
  const activeTab = useStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const [menu, setMenu] = useState(false);

  const matches =
    !query ||
    node.name.toLowerCase().includes(query) ||
    (node.request?.url ?? "").toLowerCase().includes(query);

  if (node.type === "folder") {
    const childMatches = !query || hasMatch(node, query);
    if (!childMatches) return null;
    return (
      <div>
        <div className="group flex items-center rounded-lg hover:bg-elevated/60">
          <button
            onClick={() => toggleExpand(collectionId, node.id)}
            className="flex flex-1 items-center gap-1.5 overflow-hidden px-2 py-1.5 text-left"
          >
            <ChevronRight
              size={13}
              className={cn(
                "shrink-0 text-muted transition-transform",
                node.expanded && "rotate-90",
              )}
            />
            <span className="text-xs">📁</span>
            <span className="truncate text-[13px] text-fg/90">{node.name}</span>
          </button>
          <div className="flex items-center pr-1 opacity-0 group-hover:opacity-100">
            <IconButton
              label="Add request"
              className="h-6 w-6"
              onClick={() => addRequest(collectionId, node.id)}
            >
              <FilePlus2 size={12} />
            </IconButton>
            <IconButton
              label="Add folder"
              className="h-6 w-6"
              onClick={() => addFolder(collectionId, node.id)}
            >
              <FolderPlus size={12} />
            </IconButton>
            <IconButton
              label="Delete"
              className="h-6 w-6"
              onClick={() => deleteNode(collectionId, node.id)}
            >
              <Trash2 size={12} />
            </IconButton>
          </div>
        </div>
        {node.expanded && (
          <div className="ml-3 border-l border-border/50 pl-1">
            {(node.children ?? []).map((c) => (
              <TreeNode
                key={c.id}
                collectionId={collectionId}
                node={c}
                depth={depth + 1}
                query={query}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!matches) return null;
  const isActive = activeTab?.sourceNodeId === node.id;

  return (
    <div
      className={cn(
        "group flex items-center rounded-lg",
        isActive ? "bg-cyan-500/10" : "hover:bg-elevated/60",
      )}
    >
      <button
        onClick={() => openRequestNode(collectionId, node)}
        className="flex flex-1 items-center gap-2 overflow-hidden px-2 py-1.5 text-left"
      >
        <span
          className={cn(
            "shrink-0 font-mono text-[9px] font-bold uppercase tracking-tight w-9 text-right",
            methodColor(node.request?.method ?? "GET"),
          )}
        >
          {(node.request?.method ?? "GET").slice(0, 4)}
        </span>
        <span
          className={cn(
            "truncate text-[13px]",
            isActive ? "text-cyan-300" : "text-fg/90",
          )}
        >
          {node.name}
        </span>
      </button>
      <div className="relative flex items-center pr-1 opacity-0 group-hover:opacity-100">
        <IconButton label="More" className="h-6 w-6" onClick={() => setMenu(!menu)}>
          <MoreHorizontal size={13} />
        </IconButton>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-7 z-20 w-36 rounded-lg border border-border bg-elevated py-1 shadow-xl animate-scale-in">
              <MenuButton
                icon={<Copy size={13} />}
                onClick={() => { duplicateNode(collectionId, node.id); setMenu(false); }}
              >
                Duplicate
              </MenuButton>
              <MenuButton
                icon={<Trash2 size={13} />}
                danger
                onClick={() => { deleteNode(collectionId, node.id); setMenu(false); }}
              >
                Delete
              </MenuButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function hasMatch(node: CollectionNode, query: string): boolean {
  if (node.name.toLowerCase().includes(query)) return true;
  if (node.request?.url.toLowerCase().includes(query)) return true;
  return (node.children ?? []).some((c) => hasMatch(c, query));
}

function MenuButton({
  children,
  icon,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-surface",
        danger ? "text-red-400" : "text-fg",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------------- Environments ---------------- */

function EnvironmentsPanel() {
  const environments = useStore((s) => s.environments);
  const activeEnvId = useStore((s) => s.activeEnvId);
  const setActiveEnv = useStore((s) => s.setActiveEnv);
  const addEnvironment = useStore((s) => s.addEnvironment);
  const deleteEnvironment = useStore((s) => s.deleteEnvironment);
  const setEditingEnv = useStore((s) => s.setSidebarTab);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Environments
        </span>
        <IconButton label="New environment" onClick={addEnvironment}>
          <Plus size={16} />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <button
          onClick={() => setActiveEnv(null)}
          className={cn(
            "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px]",
            activeEnvId === null ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60",
          )}
        >
          <span className="h-2 w-2 rounded-full bg-muted/40" />
          No Environment
        </button>
        {environments.map((env) => (
          <div
            key={env.id}
            className={cn(
              "group mb-0.5 flex items-center rounded-lg",
              activeEnvId === env.id ? "bg-cyan-500/10" : "hover:bg-elevated/60",
            )}
          >
            <button
              onClick={() => { setActiveEnv(env.id); useStore.getState().setSidebarTab("environments"); window.dispatchEvent(new CustomEvent("tachy:edit-env", { detail: env.id })); }}
              className="flex flex-1 items-center gap-2 overflow-hidden px-3 py-2 text-left"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: env.color }}
              />
              <span
                className={cn(
                  "truncate text-[13px]",
                  activeEnvId === env.id ? "text-cyan-300" : "text-fg/90",
                )}
              >
                {env.name}
              </span>
              <span className="ml-auto text-[10px] text-muted">
                {env.variables.filter((v) => v.key).length}
              </span>
            </button>
            <div className="flex items-center pr-1 opacity-0 group-hover:opacity-100">
              <IconButton
                label="Delete"
                className="h-6 w-6"
                onClick={() => deleteEnvironment(env.id)}
              >
                <Trash2 size={12} />
              </IconButton>
            </div>
          </div>
        ))}
        <p className="px-3 py-2 text-[11px] leading-relaxed text-muted/70">
          Select an environment to activate it. Double-click style: click a name to edit
          variables in the main panel.
        </p>
      </div>
    </div>
  );
}

/* ---------------- History ---------------- */

function HistoryPanel() {
  const history = useStore((s) => s.history);
  const clearHistory = useStore((s) => s.clearHistory);
  const openFromHistory = useStore((s) => s.openFromHistory);
  const [query, setQuery] = useState("");

  const filtered = history.filter(
    (h) => !query || h.url.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 px-3 py-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history…"
            className="h-8 w-full rounded-lg bg-elevated border border-transparent pl-8 pr-2 text-xs text-fg placeholder:text-muted focus:border-cyan-500/40"
          />
        </div>
        <IconButton label="Clear history" onClick={clearHistory}>
          <Trash2 size={15} />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Clock size={28} className="text-muted/40" />
            <p className="text-xs text-muted">No history yet</p>
          </div>
        ) : (
          filtered.map((h) => (
            <button
              key={h.id}
              onClick={() => openFromHistory(h)}
              className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-elevated/60"
            >
              <span
                className={cn(
                  "shrink-0 font-mono text-[9px] font-bold w-9 text-right",
                  methodColor(h.method),
                )}
              >
                {h.method.slice(0, 4)}
              </span>
              <span className="truncate text-[12px] text-fg/80">{h.url || "—"}</span>
              <span className={cn("ml-auto shrink-0 font-mono text-[10px]", statusColor(h.status))}>
                {h.status || "ERR"}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export { parseCurl };
