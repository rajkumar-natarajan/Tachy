# Deployment Guide

This document is the complete, step-by-step guide to hosting **Tachy** through
GitHub and Vercel — covering Vercel setup, local builds, the CI/CD pipeline,
production deploys, custom domains, and troubleshooting.

- [Overview](#overview)
- [Why Vercel and not GitHub Pages](#why-vercel-and-not-github-pages)
- [Architecture of the pipeline](#architecture-of-the-pipeline)
- [Prerequisites](#prerequisites)
- [Part 1 — Vercel setup](#part-1--vercel-setup)
- [Part 2 — GitHub repository secrets](#part-2--github-repository-secrets)
- [Part 3 — Building locally](#part-3--building-locally)
- [Part 4 — Deploying](#part-4--deploying)
- [Part 5 — Custom domains](#part-5--custom-domains)
- [Part 6 — Deployment protection](#part-6--deployment-protection)
- [Environment variables](#environment-variables)
- [Manual deploys with the Vercel CLI](#manual-deploys-with-the-vercel-cli)
- [Rollbacks](#rollbacks)
- [Troubleshooting](#troubleshooting)
- [Quick reference](#quick-reference)

---

## Overview

Tachy is a [Next.js](https://nextjs.org) (App Router) application. Beyond the
static UI it ships two **server-side API routes** that require a Node.js
runtime:

| Route | Purpose |
|---|---|
| `POST /api/proxy` | Executes the user's outbound HTTP requests — the core "Send" feature. Runs server-side to bypass browser CORS restrictions. |
| `ANY /api/mock/*` | The built-in mock server used by the Test Lab collection. |

Deployments are driven entirely from GitHub via GitHub Actions and land on
[Vercel](https://vercel.com):

- **Push to `main`** → production deployment.
- **Open / update a pull request** → isolated preview deployment, with the URL
  posted as a PR comment.

---

## Why Vercel and not GitHub Pages

GitHub Pages only serves **static files** and cannot execute server code. Tachy's
`/api/proxy` and `/api/mock` routes are dynamic and need a Node runtime — this is
visible in the production build output, where they are marked `ƒ` (Dynamic):

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/mock/[[...path]]      ← dynamic (Node runtime)
└ ƒ /api/proxy                 ← dynamic (Node runtime)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Hosting on GitHub Pages would break "Send" and the mock server. Vercel runs
Next.js API routes natively with zero extra configuration, so all functionality
is preserved while the pipeline is still triggered from GitHub.

---

## Architecture of the pipeline

```
  git push / open PR
        │
        ▼
  GitHub Actions  (.github/workflows/deploy.yml)
        │
        ├─ 1. Verify Vercel secrets are present
        ├─ 2. Checkout + setup Node 22 (npm cache)
        ├─ 3. npm ci
        ├─ 4. Install Vercel CLI
        ├─ 5. Choose target (production on main, preview on PRs)
        ├─ 6. vercel pull   (fetch project env/settings)
        ├─ 7. vercel build  (prebuild output)
        └─ 8. vercel deploy --prebuilt
        │
        ▼
   Vercel  →  Production URL  (or Preview URL commented on the PR)
```

The workflow lives at
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

---

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free Hobby tier is sufficient).
- Push access to the GitHub repository.
- Node.js 20+ and npm installed locally (only needed for local builds / CLI).
- Optionally the [GitHub CLI](https://cli.github.com) (`gh`) to set secrets from
  the terminal.

---

## Part 1 — Vercel setup

### 1.1 Install the Vercel CLI

```bash
npm install --global vercel
vercel --version
```

> **PATH note (Homebrew Node on macOS):** if `vercel` is "not found" after a
> global install, the npm global bin directory may not be on your `PATH`.
> Confirm the install with `npm ls -g --depth=0 | grep vercel`, then symlink it:
>
> ```bash
> ln -sf "$(npm prefix -g)/bin/vercel" /usr/local/bin/vercel
> ```

### 1.2 Log in

```bash
vercel login
```

This prints a device URL such as `https://vercel.com/oauth/device?user_code=XXXX-XXXX`.
Open it in your browser, confirm the code matches, and approve. The code expires
after a few minutes — simply re-run `vercel login` to get a fresh one if needed.

> Logging into the Vercel **dashboard** is not the same as approving the **CLI**
> device code; you must approve the specific code the CLI shows.

Verify:

```bash
vercel whoami
```

### 1.3 Link the project

From the repository root:

```bash
vercel link
```

Answer the prompts:

| Prompt | Answer |
|---|---|
| Which team? | Your personal account / team |
| Link to existing project? | **Create new project** (or link an existing one) |
| Project name? | `tachy` |
| Detected Next.js — customize settings? | **No** (auto-detected build is correct) |
| Customize advanced settings? | **No** |

This creates a git-ignored `.vercel/` directory containing `project.json`:

```json
{ "projectId": "prj_xxxxxxxx", "orgId": "team_xxxxxxxx", "projectName": "tachy" }
```

Keep these IDs — they become GitHub secrets in the next part.

### 1.4 Create a deploy token

Vercel tokens **cannot** be generated via the CLI — create one in the dashboard:

1. Go to **https://vercel.com/account/settings/tokens**.
2. **Create Token** → name it e.g. `github-actions`, scope **Full Account**.
3. Copy the value (shown once). This is your `VERCEL_TOKEN`.

---

## Part 2 — GitHub repository secrets

The workflow needs three secrets. Add them under
**Repository → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value / where to find it |
|---|---|
| `VERCEL_TOKEN` | The token from [step 1.4](#14-create-a-deploy-token) |
| `VERCEL_ORG_ID` | `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId` |

Or set them from the terminal with the GitHub CLI:

```bash
gh secret set VERCEL_TOKEN      --repo <owner>/<repo>   # paste when prompted
gh secret set VERCEL_ORG_ID     --repo <owner>/<repo> --body "team_xxxxxxxx"
gh secret set VERCEL_PROJECT_ID --repo <owner>/<repo> --body "prj_xxxxxxxx"

# Confirm
gh secret list --repo <owner>/<repo>
```

The workflow's first step validates that all three are present and fails early
with a clear message if any are missing.

---

## Part 3 — Building locally

Verify the production build before deploying:

```bash
npm ci          # clean, reproducible install
npm run build   # next build — type-checks and compiles
npm run start   # serve the production build at http://localhost:3000
```

A successful build prints the route table shown
[above](#why-vercel-and-not-github-pages). The API routes must appear as `ƒ`
(Dynamic); if they show as `○` (Static) the server features won't work.

Other scripts:

```bash
npm run dev     # local dev server with hot reload
npm run lint    # ESLint (next lint)
```

---

## Part 4 — Deploying

### Automatic (recommended)

Once the secrets are in place, deploys are fully automatic:

| Action | Result |
|---|---|
| Push a commit to `main` | Production deployment |
| Open or update a pull request | Preview deployment; the URL is commented on the PR |

Watch a run from the terminal:

```bash
gh run list  --repo <owner>/<repo> --branch main --limit 1
gh run watch <run-id> --repo <owner>/<repo> --exit-status
```

### Verifying a deployment

After a deploy completes, smoke-test the live URL — including the server routes:

```bash
URL="https://<your-deployment>.vercel.app"

curl -s -o /dev/null -w "home: %{http_code}\n" "$URL"
curl -s -o /dev/null -w "mock: %{http_code}\n" "$URL/api/mock/json"
curl -s -o /dev/null -w "proxy: %{http_code}\n" \
  -X POST "$URL/api/proxy" -H "Content-Type: application/json" \
  -d '{"method":"GET","url":"https://api.github.com/zen","headers":{},"bodyMode":"none"}'
```

All three should return `200`. A working `/api/proxy` (which performs a real
outbound request) confirms the server-side runtime is functioning.

---

## Part 5 — Custom domains

The default deployment URL looks like
`https://<project>-<account>.vercel.app`. To use your own domain:

1. **Project → Settings → Domains → Add**.
2. Enter your domain (e.g. `tachy.app`) and follow the DNS instructions
   (an `A`/`CNAME` record or Vercel nameservers).
3. Vercel provisions TLS automatically once DNS propagates.

> The bare `<project>.vercel.app` subdomain may already be taken by another
> account; in that case your stable URL is the `-<account>` variant, or attach a
> custom domain.

---

## Part 6 — Deployment protection

By default Vercel may enable **Deployment Protection** (Vercel Authentication),
which gates every `*.vercel.app` URL behind Vercel SSO — visitors get redirected
to `vercel.com/sso-api` (HTTP 302/307).

To make the app **publicly accessible**, disable it:

- **Dashboard:** Project → Settings → Deployment Protection → set Vercel
  Authentication to *Disabled* (or *Standard Protection* for previews only).
- **API:**

  ```bash
  curl -X PATCH "https://api.vercel.com/v9/projects/tachy?teamId=$VERCEL_ORG_ID" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"ssoProtection": null}'
  ```

Re-enable it any time if you want previews kept private.

---

## Environment variables

Tachy's MVP is self-contained and needs **no** runtime environment variables.
If you later add any (e.g. for the planned v2 backend):

1. Add them in **Project → Settings → Environment Variables** (choose the
   Production / Preview / Development scopes).
2. The workflow's `vercel pull` step fetches them at build time, so no workflow
   changes are required.

For local development, place values in `.env.local` (already git-ignored).

---

## Manual deploys with the Vercel CLI

You can deploy without GitHub Actions when needed:

```bash
# Preview deploy
vercel --token "$VERCEL_TOKEN"

# Production deploy
vercel --prod --token "$VERCEL_TOKEN"

# List recent deployments
vercel ls tachy --token "$VERCEL_TOKEN"
```

---

## Rollbacks

To revert production to a previous good deployment:

- **Dashboard:** Project → Deployments → pick a healthy deployment →
  **⋯ → Promote to Production**.
- **CLI:**

  ```bash
  vercel ls tachy --token "$VERCEL_TOKEN"        # find the target URL
  vercel promote <deployment-url> --token "$VERCEL_TOKEN"
  ```

Alternatively, `git revert` the offending commit on `main` and let the pipeline
redeploy.

---

## Troubleshooting

**`Error: You defined "--token", but it's missing a value`**
The `VERCEL_TOKEN` secret (or `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`) is empty or
missing. The workflow's preflight step now fails early listing the missing
secret(s). Add them ([Part 2](#part-2--github-repository-secrets)) and re-run the
job.

**`vercel: command not found` after a successful install**
The npm global bin directory isn't on your `PATH`. See the
[PATH note](#11-install-the-vercel-cli) in Part 1.

**Login hangs on "Waiting for authentication…"**
The device code expired or wasn't approved. Stop the command, run `vercel login`
again, and approve the **new** code shown by the CLI.

**Live site returns 302/307 → `vercel.com/sso-api`**
Deployment Protection is on. Disable it as in
[Part 6](#part-6--deployment-protection).

**API routes return 404 or behave as static**
Ensure the build shows the routes as `ƒ` (Dynamic). Do not enable
`output: 'export'` in `next.config.mjs` — static export strips the API routes.

**Secrets not available on a pull request**
GitHub does not expose secrets to PRs opened from **forks**, so deploys only run
for branches within this repository.

**Node.js version annotations in Actions logs**
Warnings that some actions target Node 20 are informational and don't affect the
deploy.

---

## Quick reference

```bash
# One-time setup
npm i -g vercel
vercel login
vercel link                      # creates .vercel/project.json
# create token at vercel.com/account/settings/tokens
gh secret set VERCEL_TOKEN      --repo <owner>/<repo>
gh secret set VERCEL_ORG_ID     --repo <owner>/<repo> --body "<orgId>"
gh secret set VERCEL_PROJECT_ID --repo <owner>/<repo> --body "<projectId>"

# Local build
npm ci && npm run build && npm run start

# Deploy
git push origin main             # → production via GitHub Actions
#   (open a PR for a preview deployment)

# Manual deploy
vercel --prod --token "$VERCEL_TOKEN"
```
