# ⚡ Tachy — Lightning-fast API development

> A modern, fast, and beautiful API development platform. A Postman alternative built for speed.

Tachy lets developers **design, test, debug, document, and mock APIs** with an
exceptional UX. Dark-mode-first, ⌘K command palette, Monaco-powered editors,
real request timing via a server-side proxy, and a full Postman-style scripting
sandbox — all running instantly with offline-first local persistence.

![stack](https://img.shields.io/badge/Next.js-16-black) ![ts](https://img.shields.io/badge/TypeScript-5-blue) ![tailwind](https://img.shields.io/badge/TailwindCSS-3-06b6d4)

---

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

A demo collection and two environments (Development / Production) are seeded on
first launch. Hit **Send** (or `⌘↵`) to fire a live request.

---

## What's implemented (working today)

| Area | Features |
|------|----------|
| **Request builder** | All HTTP methods, URL with `{{var}}` support, query params, headers (with presets), body modes (JSON/Text/XML/HTML/JS/form-data/urlencoded/GraphQL/binary), Monaco JSON editor with beautify |
| **Authorization** | None, Bearer, Basic, API Key (header/query), JWT, OAuth 2.0, Digest |
| **Response viewer** | Pretty / Raw / Preview (sandboxed iframe) / Headers / Cookies / Tests / Timeline, status + time + size, filter/search, copy & download |
| **Scripting** | Postman-compatible `pm` sandbox — pre-request & test scripts, `pm.test`, `pm.expect`, `pm.environment.set`, console logs, snippet library |
| **Collections** | Hierarchical folders, add/duplicate/delete/rename, search, import (Postman v2.1) & export |
| **Environments & variables** | Global / collection / environment scopes with correct resolution order, secret masking, dynamic vars (`{{$timestamp}}`, `{{$randomUUID}}`…) |
| **History** | Automatic, searchable request history |
| **Code generation** | cURL, JavaScript (fetch), Python (requests), Go, Java |
| **Import** | Postman collection v2.1, cURL parsing |
| **UX** | ⌘K command palette, resizable panels, tabbed requests, dark/light themes, keyboard shortcuts (`⌘↵` send, `⌘T` new tab, `⌘S` save, `⌘W` close, `⌘K` palette) |

---

## Architecture

```
┌──────────────────────── Next.js 16 (App Router) ─────────────────────────┐
│  Client (React 19, Zustand persisted to localStorage)                     │
│                                                                           │
│  TopBar ── Tabs ── Sidebar(Collections│Envs│History)                      │
│                 ├─ RequestPanel  (method│url│params│headers│auth│body│    │
│                 │                 pre-request│tests)                       │
│                 └─ ResponsePanel (pretty│raw│preview│headers│cookies│      │
│                                    tests│timeline)                        │
│                                                                           │
│   lib/variables.ts  → {{var}} resolver (global<collection<env<local)      │
│   lib/auth.ts       → AuthConfig → headers/query                          │
│   lib/sandbox.ts    → pm.* scripting sandbox                              │
│   lib/client.ts     → builds request, calls proxy, runs tests             │
│                                  │                                        │
│                                  ▼                                        │
│   app/api/proxy/route.ts  ── server-side fetch (bypasses CORS, real       │
│                              timing & size, SSRF guardrails)              │
└───────────────────────────────────┼──────────────────────────────────────┘
                                     ▼
                              Target API server
```

**Key decisions**
- **Server-side proxy** for real requests — bypasses browser CORS, captures true
  timing/size/raw headers, and adds SSRF guardrails (blocks cloud metadata IPs).
- **Single persisted Zustand store** — offline-first, instant, no backend needed
  for the MVP. The UI contract stays stable when a real backend is layered in.
- **Monaco** everywhere for editing — VS Code-grade JSON/JS experience.

---

## Folder structure

```
src/
├─ app/
│  ├─ api/proxy/route.ts     # server-side request executor
│  ├─ globals.css            # theme tokens, brand styles
│  ├─ layout.tsx             # root + ThemeProvider
│  └─ page.tsx
├─ components/
│  ├─ Workspace.tsx          # orchestrator: tabs, resizable split panels
│  ├─ TopBar.tsx             # logo, env selector, theme, ⌘K
│  ├─ Sidebar.tsx            # collections tree / environments / history
│  ├─ RequestPanel.tsx       # method/url/send + params/headers/auth/body/scripts
│  ├─ ResponsePanel.tsx      # pretty/raw/preview/headers/cookies/tests/timeline
│  ├─ CommandPalette.tsx     # ⌘K fuzzy command palette
│  ├─ EnvironmentEditor.tsx  # env + globals modal
│  ├─ KeyValueEditor.tsx     # reusable key/value table
│  ├─ CodeEditor.tsx         # Monaco wrapper + Tachy theme
│  └─ ui.tsx                 # Button/Input/Select/Badge/Tabs/EmptyState…
└─ lib/
   ├─ types.ts  store.ts  factory.ts  variables.ts  auth.ts
   ├─ sandbox.ts  client.ts  codegen.ts  importer.ts  sample.ts  utils.ts
```

---

## Roadmap (v2+)

Planned backend lives in [`prisma/schema.prisma`](prisma/schema.prisma) as a reference design.

- **Collaboration**: Postgres + Prisma, NextAuth, team RBAC, real-time sync (WebSockets/Liveblocks), comments
- **Mock servers**: generate from collections, conditional rules, Faker data, delay simulation
- **Monitors**: cron scheduled runs, email/webhook alerts, run metrics
- **API Flows**: visual request chaining (React Flow)
- **Docs**: auto-generated public documentation pages
- **Protocols**: WebSocket, SSE, gRPC
- **More importers**: OpenAPI/Swagger, Insomnia
- **PWA / offline**, forking & versioning, end-to-end secret encryption

---

## Security notes

- The proxy blocks requests to cloud metadata endpoints (`169.254.169.254`,
  `metadata.google.internal`) to mitigate SSRF, enforces absolute http(s) URLs,
  and times out after 60s.
- Scripts run in a local `Function`-based sandbox authored only by the user
  (same trust model as Postman's local sandbox).
