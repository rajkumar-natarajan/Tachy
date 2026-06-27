<div align="center">

# ⚡ Tachy

### Lightning-fast API development

A modern, fast, and beautiful API development platform — a Postman alternative built for speed.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript) ![React](https://img.shields.io/badge/React-19-61dafb?logo=react) ![Tailwind](https://img.shields.io/badge/TailwindCSS-3-06b6d4?logo=tailwindcss) ![License](https://img.shields.io/badge/license-MIT-A855F7)

</div>

---

Tachy lets developers **design, test, debug, document, and mock APIs** with an
exceptional UX. Dark-mode-first, ⌘K command palette, Monaco-powered editors,
real request timing via a server-side proxy, a full Postman-style scripting
sandbox, and a **built-in mock server** — all running instantly with
offline-first local persistence. No account, no cloud, no setup.

## Table of contents

- [Quick start](#quick-start)
- [Why Tachy](#why-tachy)
- [Feature overview](#feature-overview)
- [Built-in mock server & Test Lab](#built-in-mock-server--test-lab)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Tech stack](#tech-stack)
- [Roadmap](#roadmap)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Quick start

**Prerequisites:** Node.js 18+ (Node 20/22 LTS recommended) and npm.

```bash
git clone https://github.com/rajkumar-natarajan/Tachy.git
cd Tachy
npm install
npm run dev
# open http://localhost:3000
```

On first launch Tachy seeds:

- a **Tachy Demo API** collection (public JSONPlaceholder endpoints),
- a **🧪 Tachy Test Lab** collection (runs against the local mock server),
- environments: **Development**, **Production**, and **Local Mock**.

Pick an environment in the top bar and hit **Send** (or `⌘↵`).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack, 4 GB heap) at `localhost:3000` |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint with ESLint |

### Deployment

Tachy is hosted on **Vercel** via **GitHub Actions** — pushes to `main` deploy
to production and pull requests get preview deployments automatically. Server
routes (`/api/proxy`, `/api/mock`) require a Node runtime, so a static host like
GitHub Pages is not used. See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for
the full Vercel setup, build, and deploy guide.

---

## Why Tachy

- **Fast by design.** Requests run through a server-side proxy that captures real
  timing, size, and raw headers — and bypasses browser CORS so you can call any API.
- **Offline-first.** All state lives in a single persisted store. Nothing leaves
  your machine; your collections, history, and environments survive reloads.
- **Batteries included.** A built-in mock server means you can exercise every
  scenario — status codes, latency, auth, CRUD, redirects, GraphQL — without an
  external backend.
- **Delightful UX.** ⌘K command palette, VS Code-grade Monaco editors, resizable
  panels, tabbed requests, and a polished dark/light theme.

---

## Feature overview

| Area | What you get |
|------|--------------|
| **Request builder** | All HTTP methods, `{{variable}}` URLs, query params, header presets, body modes (JSON / Text / XML / HTML / JS / form-data / x-www-form-urlencoded / GraphQL / binary), Monaco editor with JSON beautify |
| **Authorization** | None, Bearer, Basic, API Key (header or query), JWT, OAuth 2.0, Digest |
| **Response viewer** | Pretty · Raw · Preview (sandboxed iframe) · Headers · Cookies · Tests · Timeline, with status/time/size, filter & search, copy & download |
| **Scripting** | Postman-compatible `pm` sandbox: pre-request & test scripts, `pm.test`, `pm.expect`, `pm.environment.set`, console logs, snippet library |
| **Collections** | Hierarchical folders, add / duplicate / delete / rename, cross-collection search, import (Postman v2.1) & export |
| **Environments & variables** | Global / collection / environment scopes with correct resolution order, secret masking, dynamic vars (`{{$timestamp}}`, `{{$randomUUID}}`, `{{$randomInt}}`…) |
| **History** | Automatic, searchable request history |
| **Code generation** | cURL, JavaScript (fetch), Python (requests), Go, Java |
| **Import** | Postman collection v2.1, cURL command parsing |
| **Mock server** | Built-in local API (`/api/mock`) covering every test scenario |
| **UX** | ⌘K command palette, resizable panels, request tabs, dark/light themes, keyboard shortcuts |

See **[docs/FEATURES.md](docs/FEATURES.md)** for the full breakdown.

---

## Built-in mock server & Test Lab

Tachy ships with a self-contained mock API at **`/api/mock`** so you can test
realistic scenarios with zero external dependencies.

| Endpoint | Scenario |
|---|---|
| `/echo` | Reflects method, query, headers, and body |
| `/json` | Sample nested JSON payload |
| `/status/:code` | Responds with any HTTP status (200, 404, 418, 500…) |
| `/delay/:ms` | Latency simulation |
| `/headers` · `/cookies` · `/redirect` | Header inspection, Set-Cookie, 302 follow |
| `/error` · `/random` | Forced 500, random faker-style record |
| `/users` · `/users/:id` | Full in-memory CRUD (GET/POST/PUT/PATCH/DELETE) |
| `/auth/bearer` · `/auth/basic` · `/auth/apikey` | Real 200/401 auth checks |
| `/graphql` | Minimal GraphQL responder |

The **🧪 Tachy Test Lab** collection contains ready-to-run requests (with
assertions and variable chaining) for all of the above. Activate the
**Local Mock** environment and start sending.

Full reference: **[docs/MOCK_SERVER.md](docs/MOCK_SERVER.md)**.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command palette |
| `⌘↵` / `Ctrl+Enter` | Send request |
| `⌘T` / `Ctrl+T` | New tab |
| `⌘W` / `Ctrl+W` | Close tab |
| `⌘S` / `Ctrl+S` | Save request to its collection |

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
│              ┌───────────────────┴───────────────────┐                   │
│              ▼                                       ▼                    │
│   app/api/proxy/route.ts                  app/api/mock/[[...path]]        │
│   server-side fetch (CORS bypass,         built-in mock API for           │
│   real timing/size, SSRF guards)          local testing                   │
└───────────────────────────────────┬───────────────────────────────────────┘
                                     ▼
                              Target API server
```

Deep dive: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Project structure

```
tachy/
├─ prisma/
│  └─ schema.prisma          # reference data model for the v2 backend
├─ docs/                     # comprehensive documentation
│  ├─ ARCHITECTURE.md
│  ├─ FEATURES.md
│  ├─ MOCK_SERVER.md
│  ├─ SCRIPTING.md
│  └─ CONTRIBUTING.md
├─ src/
│  ├─ app/
│  │  ├─ api/proxy/route.ts            # server-side request executor
│  │  ├─ api/mock/[[...path]]/route.ts # built-in mock server
│  │  ├─ globals.css                   # theme tokens, brand styles
│  │  ├─ layout.tsx  page.tsx
│  │  ├─ error.tsx  global-error.tsx  not-found.tsx
│  ├─ components/
│  │  ├─ Workspace.tsx        # orchestrator: tabs, resizable split panels
│  │  ├─ TopBar.tsx           # logo, env selector, theme, ⌘K
│  │  ├─ Sidebar.tsx          # collections tree / environments / history
│  │  ├─ RequestPanel.tsx     # method/url/send + params/headers/auth/body/scripts
│  │  ├─ ResponsePanel.tsx    # pretty/raw/preview/headers/cookies/tests/timeline
│  │  ├─ CommandPalette.tsx   # ⌘K fuzzy command palette
│  │  ├─ EnvironmentEditor.tsx
│  │  ├─ KeyValueEditor.tsx  CodeEditor.tsx  ThemeProvider.tsx
│  │  └─ ui.tsx               # Button/Input/Select/Badge/Tabs/EmptyState…
│  └─ lib/
│     ├─ types.ts  store.ts  factory.ts  variables.ts  auth.ts
│     ├─ sandbox.ts  client.ts  codegen.ts  importer.ts
│     ├─ sample.ts  testlab.ts  utils.ts
└─ …config (next, tailwind, tsconfig, postcss)
```

---

## Documentation

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow, state model, request lifecycle, proxy design |
| [docs/FEATURES.md](docs/FEATURES.md) | Every feature explained with how-to notes |
| [docs/MOCK_SERVER.md](docs/MOCK_SERVER.md) | Complete mock API reference + Test Lab guide |
| [docs/SCRIPTING.md](docs/SCRIPTING.md) | The `pm` sandbox API, assertions, variables, snippets |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Dev setup, conventions, how to add features |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Hosting on Vercel via GitHub Actions, required secrets |

---

## Tech stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling:** Tailwind CSS 3 with CSS-variable theme tokens (dark/light)
- **State:** Zustand (persisted to `localStorage`)
- **Editor:** Monaco (`@monaco-editor/react`) with a custom Tachy theme
- **Icons / themes:** lucide-react, next-themes
- **Backend (reference):** Prisma + PostgreSQL schema for the planned v2

---

## Roadmap

The planned collaborative backend is captured in
[`prisma/schema.prisma`](prisma/schema.prisma).

- **Collaboration:** Postgres + Prisma, NextAuth, team RBAC, real-time sync, comments
- **Mock servers v2:** generate from collections, conditional rules, Faker data
- **Monitors:** cron scheduled runs, email/webhook alerts, run metrics
- **API Flows:** visual request chaining (React Flow)
- **Docs:** auto-generated public documentation pages
- **Protocols:** WebSocket, SSE, gRPC
- **More importers:** OpenAPI/Swagger, Insomnia
- **PWA / offline**, request forking & versioning, end-to-end secret encryption

---

## Security

- The proxy enforces absolute `http(s)` URLs, times out after 60s, and blocks
  requests to cloud metadata endpoints (`169.254.169.254`,
  `metadata.google.internal`) to mitigate SSRF.
- Scripts run in a local `Function`-based sandbox authored only by you — the same
  trust model as Postman's local sandbox. Treat scripts like code you run yourself.
- Secrets marked as "secret" are masked in the UI; persistence is local-only.

---

## Contributing

Contributions are welcome! See **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** for
dev setup, code conventions, and a guide to adding new auth types, body modes,
or code generators.

---

## License

MIT © Tachy contributors. See [LICENSE](LICENSE).
