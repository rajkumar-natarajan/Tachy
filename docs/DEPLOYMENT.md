# Deployment

Tachy is a Next.js app with server-side API routes (`/api/proxy` and
`/api/mock`). These run on demand and require a Node.js runtime, so a static
host (e.g. GitHub Pages) is **not** sufficient. Tachy deploys to
[Vercel](https://vercel.com), which natively supports Next.js API routes.

## How it works

The GitHub Actions workflow at
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) handles CI
deploys:

| Trigger | Deploy type |
|---|---|
| Push to `main` | Production deployment |
| Pull request to `main` | Preview deployment (URL is commented on the PR) |

Each run installs dependencies, builds with the Vercel CLI, and deploys the
prebuilt output.

## One-time setup

### 1. Create the Vercel project

```bash
npm install --global vercel
vercel link          # run from the repo root, follow the prompts
```

This creates a `.vercel/project.json` file containing your **org ID** and
**project ID** (the directory is git-ignored).

### 2. Add GitHub repository secrets

In **Settings → Secrets and variables → Actions**, add:

| Secret | Where to find it |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → *Create Token* |
| `VERCEL_ORG_ID` | `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId` |

### 3. Push to `main`

The workflow runs automatically and deploys to your production Vercel URL. Open
a pull request to get an isolated preview deployment first.

## Local production build

```bash
npm run build
npm run start
```

## Troubleshooting

**`Error: You defined "--token", but it's missing a value`**

The `VERCEL_TOKEN` secret (or `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`) is not set
in the repository. The workflow now fails early with a clear message listing the
missing secret(s). Complete [step 2](#2-add-github-repository-secrets) above and
re-run the job.

> The deploy workflow cannot run on pull requests opened from forks, because
> GitHub does not expose secrets to fork-based PRs. Deploys from branches within
> this repository work as expected.

