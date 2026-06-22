# Contributing

Thanks for your interest in Tachy! This guide covers local setup, conventions,
and how to extend the common subsystems.

## Development setup

**Prerequisites:** Node.js 18+ (20/22 LTS recommended) and npm.

```bash
git clone https://github.com/rajkumar-natarajan/Tachy.git
cd Tachy
npm install
npm run dev      # http://localhost:3000
```

Useful scripts:

| Command | Description |
|---|---|
| `npm run dev` | Dev server (Turbopack, 4 GB heap) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type-check without emitting |

> The dev script sets `NODE_OPTIONS=--max-old-space-size=4096`. Keep this — the
> Turbopack dev process can accumulate memory over long sessions, and a smaller
> heap can OOM and corrupt the `.next` cache. If you ever hit a corrupted-cache
> or RSC manifest error, stop the server, `rm -rf .next`, and restart.

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full map. Quick orientation:

- `src/app/` — routes, layout, global styles, error boundaries, and the two API
  routes (`api/proxy`, `api/mock`).
- `src/components/` — UI (Workspace, panels, sidebar, command palette, editors).
- `src/lib/` — non-UI logic: store, types, variable resolution, auth, sandbox,
  client, codegen, importer, sample/testlab seeds.

## Conventions

- **TypeScript strict.** No `any` unless unavoidable; prefer precise types in
  `src/lib/types.ts`.
- **Path alias:** import from `@/...` (maps to `src/...`).
- **State:** all shared state goes through the Zustand store in
  [`src/lib/store.ts`](../src/lib/store.ts). Keep persisted data serializable and
  update `partialize` if you add fields that should/shouldn't persist.
- **Styling:** Tailwind + the semantic CSS-variable tokens (`--bg`, `--surface`,
  `--elevated`, `--border`, `--fg`, `--muted`, `--accent`). Don't hard-code
  colors that need to respond to theme. Remember light defaults come **before**
  the `.dark` block in `globals.css`.
- **Keep changes focused.** Match the surrounding style; avoid unrelated
  refactors in the same change.
- Run `npm run lint` and `npx tsc --noEmit` before opening a PR.

## How to add things

### A new auth type

1. Extend the `AuthConfig` union in [`src/lib/types.ts`](../src/lib/types.ts).
2. Implement the header/query construction in
   [`src/lib/auth.ts`](../src/lib/auth.ts).
3. Add the UI controls in the Auth tab of
   [`src/components/RequestPanel.tsx`](../src/components/RequestPanel.tsx).
4. (Optional) add a Test Lab request in
   [`src/lib/testlab.ts`](../src/lib/testlab.ts) and a mock check in
   [`src/app/api/mock/[[...path]]/route.ts`](../src/app/api/mock/[[...path]]/route.ts).

### A new body mode

1. Add the mode to the body type in `src/lib/types.ts`.
2. Handle serialization in [`src/lib/client.ts`](../src/lib/client.ts) (set the
   right `Content-Type` and encode the payload).
3. Add the editor/controls in `RequestPanel.tsx`.

### A new code generator

1. Add a generator function in [`src/lib/codegen.ts`](../src/lib/codegen.ts)
   that takes the resolved request and returns a code string.
2. Register it in the generator list so it appears in the codegen menu.

### A new mock endpoint

1. Add a `case` in the `handle` switch (or a helper) in
   [`src/app/api/mock/[[...path]]/route.ts`](../src/app/api/mock/[[...path]]/route.ts).
2. Document it in [MOCK_SERVER.md](MOCK_SERVER.md).
3. Add a matching Test Lab request in `src/lib/testlab.ts`.

### A new importer

Add a parser in [`src/lib/importer.ts`](../src/lib/importer.ts) that converts the
source format into Tachy collections/requests, then wire it into the import UI.

## Commit & PR guidelines

- Use clear, imperative commit messages (e.g. "Add Digest auth support").
- Keep PRs scoped to one logical change where possible.
- Include a short description of what changed and how you verified it (manual
  steps, affected endpoints, screenshots for UI).
- Ensure lint and type-check pass.

## Security

If you find a security issue, please avoid filing a public issue with exploit
details — note the concern privately to the maintainer first. See the Security
section of the [README](../README.md) for the proxy's SSRF guardrails and the
script sandbox trust model.
