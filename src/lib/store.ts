"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sendRequest } from "./client";
import {
  newCollection,
  newEnvironment,
  newFolder,
  newKeyValue,
  newRequest,
  newRequestNode,
  uid,
} from "./factory";
import { seedCollections, seedEnvironments } from "./sample";
import type {
  Collection,
  CollectionNode,
  Environment,
  HistoryEntry,
  KeyValue,
  RequestTab,
  TachyRequest,
} from "./types";

export type SidebarTab = "collections" | "environments" | "history";

interface TachyState {
  collections: Collection[];
  environments: Environment[];
  globals: KeyValue[];
  activeEnvId: string | null;
  tabs: RequestTab[];
  activeTabId: string | null;
  history: HistoryEntry[];
  sidebarTab: SidebarTab;
  sidebarWidth: number;
  responseHeight: number;
  commandPaletteOpen: boolean;
  hydrated: boolean;

  // hydration
  setHydrated: () => void;

  // ui
  setSidebarTab: (t: SidebarTab) => void;
  setSidebarWidth: (w: number) => void;
  setResponseHeight: (h: number) => void;
  toggleCommandPalette: (open?: boolean) => void;

  // tabs
  openNewTab: () => void;
  openRequestNode: (collectionId: string, node: CollectionNode) => void;
  openFromHistory: (entry: HistoryEntry) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateActiveRequest: (updater: (r: TachyRequest) => TachyRequest) => void;
  updateRequestById: (tabId: string, updater: (r: TachyRequest) => TachyRequest) => void;
  send: (tabId: string) => Promise<void>;

  // env
  setActiveEnv: (id: string | null) => void;
  addEnvironment: () => string;
  deleteEnvironment: (id: string) => void;
  updateEnvironment: (id: string, updater: (e: Environment) => Environment) => void;
  setGlobals: (vars: KeyValue[]) => void;

  // collections
  addCollection: () => void;
  importCollection: (c: Collection) => void;
  deleteCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  updateCollection: (id: string, updater: (c: Collection) => Collection) => void;
  addFolder: (collectionId: string, parentId: string | null) => void;
  addRequest: (collectionId: string, parentId: string | null) => void;
  deleteNode: (collectionId: string, nodeId: string) => void;
  duplicateNode: (collectionId: string, nodeId: string) => void;
  renameNode: (collectionId: string, nodeId: string, name: string) => void;
  toggleExpand: (collectionId: string, nodeId: string) => void;
  saveActiveTab: () => void;

  // history
  clearHistory: () => void;
}

function findNode(nodes: CollectionNode[], id: string): CollectionNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function mapNodes(
  nodes: CollectionNode[],
  fn: (n: CollectionNode) => CollectionNode,
): CollectionNode[] {
  return nodes.map((n) => {
    const mapped = fn(n);
    if (mapped.children) {
      return { ...mapped, children: mapNodes(mapped.children, fn) };
    }
    return mapped;
  });
}

function removeNode(nodes: CollectionNode[], id: string): CollectionNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) =>
      n.children ? { ...n, children: removeNode(n.children, id) } : n,
    );
}

function insertInParent(
  nodes: CollectionNode[],
  parentId: string | null,
  child: CollectionNode,
): CollectionNode[] {
  if (parentId === null) return [...nodes, child];
  return nodes.map((n) => {
    if (n.id === parentId && n.type === "folder") {
      return { ...n, expanded: true, children: [...(n.children ?? []), child] };
    }
    if (n.children) return { ...n, children: insertInParent(n.children, parentId, child) };
    return n;
  });
}

function deepCloneNode(node: CollectionNode): CollectionNode {
  return {
    ...node,
    id: uid(),
    request: node.request ? { ...node.request, id: uid() } : undefined,
    children: node.children?.map(deepCloneNode),
  };
}

function makeTab(request: TachyRequest, sourceNodeId?: string): RequestTab {
  return { id: uid(), request, sourceNodeId, dirty: false };
}

export const useStore = create<TachyState>()(
  persist(
    (set, get) => ({
      collections: seedCollections(),
      environments: seedEnvironments(),
      globals: [newKeyValue()],
      activeEnvId: null,
      tabs: [makeTab(newRequest({ name: "Untitled Request" }))],
      activeTabId: null,
      history: [],
      sidebarTab: "collections",
      sidebarWidth: 300,
      responseHeight: 340,
      commandPaletteOpen: false,
      hydrated: false,

      setHydrated: () => {
        const s = get();
        set({
          hydrated: true,
          activeTabId: s.activeTabId ?? s.tabs[0]?.id ?? null,
          activeEnvId: s.activeEnvId ?? s.environments[0]?.id ?? null,
        });
      },

      setSidebarTab: (t) => set({ sidebarTab: t }),
      setSidebarWidth: (w) => set({ sidebarWidth: Math.max(220, Math.min(520, w)) }),
      setResponseHeight: (h) => set({ responseHeight: Math.max(120, Math.min(800, h)) }),
      toggleCommandPalette: (open) =>
        set((s) => ({ commandPaletteOpen: open ?? !s.commandPaletteOpen })),

      openNewTab: () => {
        const tab = makeTab(newRequest());
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      },

      openRequestNode: (collectionId, node) => {
        if (!node.request) return;
        const existing = get().tabs.find((t) => t.sourceNodeId === node.id);
        if (existing) {
          set({ activeTabId: existing.id });
          return;
        }
        const tab = makeTab({ ...node.request, name: node.name }, node.id);
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      },

      openFromHistory: (entry) => {
        const tab = makeTab(
          newRequest({ name: entry.url, method: entry.method, url: entry.url }),
        );
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      },

      closeTab: (tabId) => {
        set((s) => {
          const idx = s.tabs.findIndex((t) => t.id === tabId);
          const tabs = s.tabs.filter((t) => t.id !== tabId);
          let activeTabId = s.activeTabId;
          if (s.activeTabId === tabId) {
            const next = tabs[idx] ?? tabs[idx - 1] ?? tabs[0];
            activeTabId = next?.id ?? null;
          }
          if (tabs.length === 0) {
            const tab = makeTab(newRequest());
            return { tabs: [tab], activeTabId: tab.id };
          }
          return { tabs, activeTabId };
        });
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      updateActiveRequest: (updater) => {
        const { activeTabId } = get();
        if (activeTabId) get().updateRequestById(activeTabId, updater);
      },

      updateRequestById: (tabId, updater) => {
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tabId
              ? { ...t, request: updater(t.request), dirty: true }
              : t,
          ),
        }));
      },

      send: async (tabId) => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === tabId);
        if (!tab) return;

        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, loading: true } : t)),
        }));

        const collection = tab.sourceNodeId
          ? state.collections.find((c) => findNode(c.nodes, tab.sourceNodeId!)) ?? null
          : null;
        const environment =
          state.environments.find((e) => e.id === state.activeEnvId) ?? null;

        const { response } = await sendRequest(
          tab.request,
          { globals: state.globals, collection, environment },
          (scope, key, value) => {
            if (scope === "env" && environment) {
              get().updateEnvironment(environment.id, (e) => ({
                ...e,
                variables: upsertVar(e.variables, key, value),
              }));
            } else if (scope === "global") {
              set((s) => ({ globals: upsertVar(s.globals, key, value) }));
            }
          },
        );

        const entry: HistoryEntry = {
          id: uid(),
          method: tab.request.method,
          url: tab.request.url,
          status: response.status,
          timeMs: response.timeMs,
          at: Date.now(),
        };

        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tabId ? { ...t, loading: false, response } : t,
          ),
          history: [entry, ...s.history].slice(0, 100),
        }));
      },

      setActiveEnv: (id) => set({ activeEnvId: id }),

      addEnvironment: () => {
        const env = newEnvironment();
        set((s) => ({ environments: [...s.environments, env], activeEnvId: env.id }));
        return env.id;
      },

      deleteEnvironment: (id) =>
        set((s) => ({
          environments: s.environments.filter((e) => e.id !== id),
          activeEnvId: s.activeEnvId === id ? null : s.activeEnvId,
        })),

      updateEnvironment: (id, updater) =>
        set((s) => ({
          environments: s.environments.map((e) => (e.id === id ? updater(e) : e)),
        })),

      setGlobals: (vars) => set({ globals: vars }),

      addCollection: () =>
        set((s) => ({ collections: [...s.collections, newCollection()] })),

      importCollection: (c) =>
        set((s) => ({ collections: [...s.collections, c] })),

      deleteCollection: (id) =>
        set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),

      renameCollection: (id, name) =>
        set((s) => ({
          collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)),
        })),

      updateCollection: (id, updater) =>
        set((s) => ({
          collections: s.collections.map((c) => (c.id === id ? updater(c) : c)),
        })),

      addFolder: (collectionId, parentId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? { ...c, nodes: insertInParent(c.nodes, parentId, newFolder()) }
              : c,
          ),
        })),

      addRequest: (collectionId, parentId) => {
        const node = newRequestNode();
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? { ...c, nodes: insertInParent(c.nodes, parentId, node) }
              : c,
          ),
        }));
        const c = get().collections.find((c) => c.id === collectionId);
        if (c) get().openRequestNode(collectionId, node);
      },

      deleteNode: (collectionId, nodeId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId ? { ...c, nodes: removeNode(c.nodes, nodeId) } : c,
          ),
        })),

      duplicateNode: (collectionId, nodeId) =>
        set((s) => ({
          collections: s.collections.map((c) => {
            if (c.id !== collectionId) return c;
            const node = findNode(c.nodes, nodeId);
            if (!node) return c;
            const clone = deepCloneNode({ ...node, name: node.name + " copy" });
            return { ...c, nodes: [...c.nodes, clone] };
          }),
        })),

      renameNode: (collectionId, nodeId, name) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  nodes: mapNodes(c.nodes, (n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          name,
                          request: n.request ? { ...n.request, name } : undefined,
                        }
                      : n,
                  ),
                }
              : c,
          ),
        })),

      toggleExpand: (collectionId, nodeId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  nodes: mapNodes(c.nodes, (n) =>
                    n.id === nodeId ? { ...n, expanded: !n.expanded } : n,
                  ),
                }
              : c,
          ),
        })),

      saveActiveTab: () => {
        const { activeTabId, tabs, collections } = get();
        const tab = tabs.find((t) => t.id === activeTabId);
        if (!tab || !tab.sourceNodeId) return;
        set({
          collections: collections.map((c) => ({
            ...c,
            nodes: mapNodes(c.nodes, (n) =>
              n.id === tab.sourceNodeId
                ? { ...n, name: tab.request.name, request: { ...tab.request } }
                : n,
            ),
          })),
          tabs: tabs.map((t) => (t.id === tab.id ? { ...t, dirty: false } : t)),
        });
      },

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "tachy-store",
      partialize: (s) => ({
        collections: s.collections,
        environments: s.environments,
        globals: s.globals,
        activeEnvId: s.activeEnvId,
        tabs: s.tabs.map((t) => ({ ...t, loading: false })),
        activeTabId: s.activeTabId,
        history: s.history,
        sidebarTab: s.sidebarTab,
        sidebarWidth: s.sidebarWidth,
        responseHeight: s.responseHeight,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

function upsertVar(vars: KeyValue[], key: string, value: string): KeyValue[] {
  const idx = vars.findIndex((v) => v.key === key);
  if (idx >= 0) {
    const copy = [...vars];
    copy[idx] = { ...copy[idx], value };
    return copy;
  }
  const withoutTrailing = vars.filter((v) => v.key.trim() !== "" || v.value.trim() !== "");
  return [...withoutTrailing, newKeyValue({ key, value }), newKeyValue()];
}

export function useActiveTab() {
  return useStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
}
