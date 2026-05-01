# Kata

A role-aware daily journal. Build a template that fits how you work, write one entry a day, and Kata writes you back — weekly digests every Sunday and a monthly letter on the first.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + Framer Motion
- MongoDB / Mongoose
- NextAuth v5 (credentials provider, bcryptjs)
- Groq (`llama-3.3-70b-versatile`) for digests
- Upstash Redis for rate limiting
- @dnd-kit for the drag-and-drop template builder

## Setup

```bash
npm install
cp .env.example .env.local
# fill in MONGODB_URI, NEXTAUTH_SECRET, GROQ_API_KEY, optional Upstash, CRON_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Var | Required | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | dev | Defaults to deployment URL on Vercel |
| `MONGODB_URI` | yes | Atlas or local Mongo |
| `GROQ_API_KEY` | for digests | Get one at console.groq.com |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional | Rate limits no-op if unset |
| `CRON_SECRET` | for digests | Sent as `x-cron-secret` by Vercel cron |

## Cron

`vercel.json` schedules `POST /api/digests/generate` daily at 12:00 UTC. The handler picks weekly (every Sunday) or monthly (first of month) work based on the current UTC date. Force a run from the CLI:

```bash
curl -X POST $URL/api/digests/generate \
  -H "x-cron-secret: $CRON_SECRET" \
  -d "force=weekly"
```

## Layout

- `app/(app)/*` — auth-gated app shell (dashboard, entry, history, digest, templates, settings)
- `app/api/*` — route handlers
- `components/{builder,entry,dashboard,digest,landing,settings,templates,shared}/*`
- `lib/{db,auth,ai,ratelimit,validation,utils}/*`
- `proxy.ts` — auth gate (Next 16 replacement for `middleware.ts`)
