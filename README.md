# StartWise

**Start wise. Launch right.** StartWise turns a rough business idea — spoken or typed in English, Hindi or Marathi — into a tested, source-backed launch plan and a tracked path to the first customer.

Pilot scope: Pune / Maharashtra, home food (home bakery) first. Built for She Solves 3.0 by Team200OK.

> Core rule: the AI only *understands* the idea and *explains* results. Licences, schemes, every number and the go / no-go verdict come from reviewed data and plain TypeScript formulas.

## Setup in 5 commands

First, create your **own** Supabase project (free tier is fine):

1. Supabase → *SQL editor* → run `create extension if not exists vector;`
2. Supabase → *Authentication → URL configuration* → add `http://localhost:3000/login/callback` to *Redirect URLs*.
   (For quick local testing you can turn off *Confirm email* under *Authentication → Providers → Email*.)
3. Copy the keys from *Project settings → API* and the **transaction pooler** connection string from *Connect*.

Then:

```bash
git clone <repo-url> startwise && cd startwise
npm i
cp .env.example .env.local      # fill in your own Supabase keys + DATABASE_URL
npm run db:push                 # creates all 13 tables in your dev database
npm run dev                     # http://localhost:3000
```

## Environment variables

| Name | What |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project (auth only in the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: delete-my-data, admin |
| `DATABASE_URL` | Postgres connection string (Supabase transaction pooler) |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_EMBED_MODEL` | One LLM provider (chosen on Day 1); embeddings must be 768-dim |
| `ADMIN_EMAILS` | Comma-separated emails that may open `/admin` |
| `NEXT_PUBLIC_APP_URL` | Base URL used in auth email links |

Never commit `.env.local`, and never prefix a secret with `NEXT_PUBLIC_`.

## Scripts

| Script | What |
| --- | --- |
| `npm run check` | typecheck + lint + tests + ownership check (run before every push) |
| `npm run db:push` | sync the schema to **your own** dev database |
| `npm run db:generate` | generate a migration (**T1 only, on `main`, at checkpoints**) |
| `npm run db:migrate` / `db:seed` | apply migrations / load `data/**` into the demo database |

## How we work (no merge conflicts)

- Every file has one owner — see `ownership.json` (T1, T2 or SHARED). Edit only your own paths.
- Branches: `t1/…`, `t2/…` or `shared/…`. `npm run check:owners` fails if a branch touches files it does not own.
- SHARED files are frozen. To change one: say so in chat, use a `shared/<what>` branch, merge within the hour.
- Talk through contracts: types live in `src/contracts/` (frozen); each module's only public door is `src/features/<module>/api.ts` (and `ui.ts` for shared components).
- Need something in the other person's area? Write it in `requests/t1-to-t2.md` or `requests/t2-to-t1.md` and keep working against the stub.
- Every stub returns the home-bakery fixture marked "(FIXTURE)". No screen may show "FIXTURE" at the final checkpoint.

> Next.js 16 note: `middleware.ts` is now called `proxy.ts`, and `next lint` is replaced by `eslint`.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth) · Drizzle ORM · pgvector · zod · next-intl · Recharts · Leaflet · Vitest · Vercel.

## Team

Team200OK — T1 (founder journey & AI, release owner) · T2 (data, rules & execution).
