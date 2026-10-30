# Kata

The journal that checks in on you. Write one page a day; Maru, the companion inside Kata, keeps a private map of what you're working on (threads: projects, goals, habits, people, dates), checks in on them each morning ("Did the webhook land?"), adds questions to your page from your threads and interests, and writes you a letter every Sunday. Ask Maru from any page (⌘K), or rename it whatever you like: it does the work and shows a receipt for each thing it changed (today's page and its questions, your threads, settings, the theme, who you follow), and when there are a few ways to go it offers choices you tap to make real. On a post it can read what's on your screen and draft replies for you to edit. Nothing anyone else would see is posted until you tap it. Follow people, share the good bits as moments, react and reply. Pages are always private; moments and the threads you choose to show are the only things anyone else sees.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4; GSAP (ScrollTrigger, SplitText) + Lenis for the landing scroll scenes, Framer Motion inside the app
- MongoDB / Mongoose
- NextAuth v5 (credentials provider, bcryptjs)
- Groq (gpt-oss and Qwen3.8 27B, with fallback between them) for Maru's conversation and tools, page reading and letters; without a key Maru runs on deterministic rules
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
| `GROQ_API_KEY` | optional | Maru's AI brain (conversation and the changes it makes for you, reading pages, check-in wording) and the letters; the free tier is enough for personal use. Without it Maru runs on its built-in rules. console.groq.com |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional | Rate limits no-op if unset |
| `CRON_SECRET` | for digests | Sent as `x-cron-secret` by Vercel cron |

## Cron

`vercel.json` schedules `POST /api/digests/generate` daily at 12:00 UTC. The handler picks weekly (every Sunday) or monthly (first of month) work based on the current UTC date. Force a run from the CLI:

```bash
curl -X POST $URL/api/digests/generate \
  -H "x-cron-secret: $CRON_SECRET" \
  -d "force=weekly"
```

## Demo people

For local development, `npm run seed:social -- --follow you@example.com` adds eight demo people (with moments, shared threads and follows) and makes that account follow five of them, three of whom follow back. It only runs against a localhost database, never deletes anything, and the demo accounts can't be signed into.

## Layout

- `app/(app)/*` — auth-gated app shell: home (`dashboard`), people, profiles (`u/[handle]`), threads, notifications, entry, history, letters (`digest`), gallery (`templates`), settings, lab
- `app/api/*` — route handlers (companion, threads, questions, onboarding, profile, people, follow, moments, notifications, entries, templates, digests)
- `components/{home,threads,people,builder,entry,dashboard,digest,landing,settings,templates,onboarding,auth,shared}/*`
- `lib/companion/*` — Maru: check-ins, replies, its tools (`tools.ts`), thread extraction, the day's questions; `lib/questions/*` — the tagged question bank
- `lib/social/*` — handles, visibility, feeds, people, notifications
- `lib/{db,auth,ai,ratelimit,validation,utils}/*`
- `proxy.ts` — auth gate (Next 16 replacement for `middleware.ts`)

The design system (the sticker book) is documented in `AGENTS.md`.
