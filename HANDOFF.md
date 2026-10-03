# T1 handoff — where things stand

For whoever continues T1 work (and their AI coding assistant). Read this, then the two PDFs:
**StartWise Main Implementation Plan** and **T1 Task File**.

## Status

| Task | State |
| --- | --- |
| **T1-00 Phase 0** | ✅ Done and on `main` (see below) |
| T1-01 AI layer | ⏭ **Start here.** `src/lib/ai/index.ts` is still a stub returning fixtures |
| T1-02 … T1-19 | Not started. All screens show "(T1): coming soon" placeholders |

### What Phase 0 already gives you

- Next.js app with **all 14 routes** (placeholders), login + sign-up (`/login`), logout, account icon.
- `ownership.json` + `npm run check:owners` (tested: a `t2/` branch editing a T1 file fails).
- Full Drizzle schema (13 tables, RLS on) — **already migrated into the shared Supabase database**.
- Auth helpers: `requireUser()`, `requirePlan(planId)` (404 for other users' plans — tested), `isAdmin()`.
- i18n: all 15 namespaces in `messages/{en,hi,mr}/`. `common.json` and the login strings (`account.json`) are written in all 3 languages; the other T1 namespaces are empty `{}` — fill them as you build each screen.
- Frozen contracts in `src/contracts/` (plus `sections.ts`: zod shapes for every `ai.draft` kind).
- Stub `api.ts` for every module returning `src/fixtures/home-bakery.ts` data ("(FIXTURE)" text).
- UI kit in `src/components/ui/` (Button, Card, Badge, Tabs, Slider, Sheet, EmptyState, Skeleton, GuidanceFooter, LanguageSwitch). `LanguageSwitch` already saves `users.preferredLanguage` via `src/features/account/actions.ts`, and login restores it (part of T1-02 done).
- Plan layout with bottom nav; draft plans redirect to `/profile`.

## Differences from the PDFs (important for your AI assistant)

- **Next.js 16** is installed: `middleware.ts` is now **`proxy.ts`**; `params`, `searchParams` and `cookies()` are **async** (`await`); there is no `next lint` (the lint script runs `eslint`). Read `node_modules/next/dist/docs/` before writing Next.js code.
- **zod 4** is installed (`z.email()`, `error.issues`).
- `app/` lives at the repo root (matching the ownership paths); everything else is under `src/`, imported as `@/…`.
- Vitest config is `vitest.config.mts`.

## Setup on a new laptop

```bash
git clone https://github.com/tanvisheth1234-wq/startwise.git
cd startwise
npm i
# create .env.local — get the values privately from Tanvi (they are NOT in git)
npm run dev        # http://localhost:3000
```

The shared Supabase database is already migrated, so **do not** run `db:push` against it.
(T2 uses their own Supabase project and runs `npm run db:push` there.)

## Open items (not code)

- [ ] Vercel: **redeploy once** (Deployments → ⋯ → Redeploy) so `NEXT_PUBLIC_APP_URL` is built in.
- [ ] Vercel: Settings → Git → connect the GitHub repo so pushes to `main` auto-deploy.
- [ ] Supabase → Authentication → URL Configuration: Site URL `https://startwise-green.vercel.app`, add Redirect URL `https://startwise-green.vercel.app/login/callback` (and `http://localhost:3000/login/callback`). Optionally turn off "Confirm email" for the demo.
- [ ] Put real GitHub usernames in `CODEOWNERS`; add real emails to `ADMIN_EMAILS` (Vercel + `.env.local`).
- [ ] Delete the Vercel access token used for setup (vercel.com/account/tokens) and change the Supabase DB password before the demo (both were shared in chat).
- [ ] T1-01 needs an AI key (Gemini and/or OpenAI) in `.env.local` and Vercel.

Live URL: https://startwise-green.vercel.app

## How to continue (every task)

```bash
git checkout main && git pull
git checkout -b t1/ai-layer          # one branch per task, always t1/…
# …build…
npm run check                        # typecheck + lint + tests + ownership
git add -A && git commit -m "feat(ai): …"
git push -u origin HEAD              # open a PR, merge the same day
```

Prompt for the AI assistant: attach both PDFs, paste the "Paste this into your AI coding assistant first"
block from the T1 Task File, then add: *"Phase 0 (T1-00) is already done — read HANDOFF.md. Start at T1-01."*
