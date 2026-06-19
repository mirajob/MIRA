# CLAUDE.md — MIRA Project Instructions

## Product

MIRA is a production product, not a prototype. Every architectural decision must support the full long-term platform.

The first production build is **Associations First Build** (Bocconi students, university associations, MIRA admin). Do not build future modules (companies, simulations, orientation, payments) until the Associations module foundation is stable.

## Source of Truth

Read docs before making decisions. Prefer reading docs over asking to repeat context in chat. Optimize for token efficiency.

- `docs/00_MIRA_DOCS_INDEX.md` — documentation map and conflict resolution rules
- `docs/01_MIRA_MASTER_PRODUCT_SPEC.md` — global product vision and long-term architecture
- `docs/02_MIRA_ASSOCIATIONS_FIRST_BUILD.md` — first build scope and acceptance criteria
- `docs/03_MIRA_DATABASE_SCHEMA.md` — Supabase Postgres schema, tables, enums, migrations
- `docs/04_MIRA_USER_FLOWS.md` — step-by-step product flows
- `docs/05_MIRA_UI_UX_SPEC.md` — web and mobile interface blueprint
- `docs/06_MIRA_AI_SYSTEM.md` — AI modules, schemas, prompts, logging
- `docs/07_MIRA_SECURITY_PRIVACY.md` — permissions, RLS, privacy, audit
- `docs/08_MIRA_IMPLEMENTATION_PLAN.md` — sprint sequence, tasks, acceptance criteria

## Stack

- **Web:** Next.js 15 (App Router, TypeScript, Tailwind CSS v4, shadcn/ui)
- **Mobile:** Expo / React Native (Expo Router)
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime, RLS, pgvector/RAG)
- **Web hosting:** Vercel (hosting, preview deployments)
- **Repository:** GitHub
- **AI layer:** Vercel AI SDK with provider abstraction (OpenAI, Anthropic)
- **Email:** Resend + react-email
- **Monorepo:** Turborepo with pnpm workspaces

Do not replace any part of the stack without explicit approval.

## Architecture

```
mira/
  apps/web          → Next.js 15
  apps/mobile       → Expo / React Native
  packages/types    → shared TypeScript types
  packages/supabase → Supabase client factory + generated types
  packages/ai       → AI provider abstraction, module schemas
  packages/domain   → business logic, constants, permissions, validation
  packages/config   → shared tsconfig, ESLint
  supabase/         → migrations, policies, seed data
  docs/             → product and technical specifications
```

- Supabase is the backend for database, auth, storage, realtime, and vector search.
- Vercel is for web hosting and preview deployments only.
- Server-side logic lives in Next.js API routes / Server Actions (Node.js).
- Web and mobile share one backend, one database, one auth system, one permission model.

## Development Rules

- Build incrementally. Before each major coding step, provide a short implementation plan and wait for approval.
- Commit-ready code only: typed, structured, maintainable.
- Never hardcode fake production data (associations, users, candidates, questions, AI responses, permissions).
- Never bypass auth, permissions, or security rules. Permissions must be enforced server-side via Supabase RLS.
- AI can assist evaluations but must never make final admission, rejection, or hiring decisions automatically.
- Mock AI is allowed only behind explicit development flags, never in production paths.
- Use environment variables for all secrets and configuration.

## Commands

```bash
pnpm install                  # Install all dependencies
pnpm dev                      # Start all apps in dev mode
pnpm --filter @mira/web dev   # Start web app only
pnpm --filter @mira/mobile dev # Start mobile app only
pnpm build                    # Build all packages and apps
pnpm lint                     # Lint all packages and apps
pnpm typecheck                # Type-check all packages and apps
pnpm format                   # Format all files with Prettier
```
