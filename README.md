# AI Language Teacher

Write text in English, get it translated into a target language, and receive
personalized coaching (grammar mistakes, typos, strengths). Every analysis is
stored in Postgres + pgvector so a **second AI agent** can read all of your
recurring weaknesses and generate a personalized course.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **Anthropic Claude** (`claude-opus-4-8`) via `@anthropic-ai/sdk` — structured
  outputs for translate/distill; adaptive thinking for course generation
- **Postgres 16 + pgvector** (Docker) with **Drizzle ORM**
- **Voyage AI** (`voyage-3-lite`, 1024-dim) for embeddings → similarity
  clustering of recurring errors

## Setup

```bash
pnpm install
cp .env.example .env.local          # fill in ANTHROPIC_API_KEY and VOYAGE_API_KEY
pnpm db:up                          # start Postgres+pgvector (creates the `vector` extension)
pnpm db:migrate                     # apply the migration (or db:generate first if you change the schema)
pnpm db:seed                        # insert the demo user
pnpm dev                            # http://localhost:3000
```

`ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` are both required.

> **Port note:** the Postgres container maps to host port **5433** (not 5432) to
> avoid clashing with a local Postgres install. `DATABASE_URL` points at 5433.
> If 5433 is also taken, change both `docker-compose.yml` and `.env.local`.

## How it works

- **Write** (`/`) → `POST /api/translate`: one Claude call returns the
  translation + a structured analysis. The submission, the analysis (flattened
  columns + raw JSON), and a Voyage embedding of the error *signature* are stored.
- **History** (`/history`): a server component reading past submissions + feedback
  directly from the DB.
- **Course** (`/course`) → `POST /api/course`: loads all distillations, clusters
  recurring errors via pgvector cosine similarity, builds a weakness summary, and
  asks Claude (adaptive thinking) to design a personalized course. `GET /api/course`
  returns the latest persisted course.

Single hardcoded demo user (`DEMO_USER_ID`) — no auth, but the schema is auth-ready.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm db:up` / `db:down` | Postgres via Docker Compose |
| `pnpm db:generate` | Generate a Drizzle migration from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | Seed the demo user |
