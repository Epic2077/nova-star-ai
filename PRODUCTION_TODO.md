# Nova Star AI — Production Roadmap

A prioritized, actionable todo list for taking Nova Star AI from prototype to a production-grade solo-dev MVP launch.

## How to use this file

Each item below has:
- **Why** — a one-line reason the work matters
- **Files** — primary paths to touch
- **Steps** — the work, in order
- **Acceptance** — what proves it's done

Priority labels:
- **P0** — blocker, must do before any public traffic
- **P1** — required for MVP launch
- **P2** — nice-to-have for MVP, can land in week 2+

Work through P0s first, top to bottom within each section.

---

## 1. Fixes (Bugs)

### [P0] Rotate all secrets currently committed in `.env.local`
**Why:** `.env.local` is tracked in git with live Supabase tokens and the DeepSeek API key. Anyone with repo access (current or historic) can use them.
**Files:** `.env.local`, `.gitignore`
**Steps:**
- In the Supabase dashboard, rotate the service role key and anon key.
- In DeepSeek, revoke the existing API key and generate a new one.
- Rotate any OpenAI / Brave Search keys as well.
- Run `git rm --cached .env.local` and commit the removal.
- Verify `.env.local` is matched by `.gitignore` (the pattern `.env*` should already cover it — confirm).
- If the repo has ever been public, scrub history with `git filter-repo` or BFG; otherwise just rotation is enough.
- Update local `.env.local` with the new keys; redeploy to Vercel with the new env values.
**Acceptance:** `git ls-files | grep env` returns nothing; the app still builds and runs locally with the new keys; old keys are revoked at the provider.

---

### [P0] Partner name persists in Partner Settings after dissolve
**Why:** User-reported bug — after removing a partner, the ex-partner's name still appears in the partner settings section.
**Files:** [src/components/account/PartnershipSection.tsx](src/components/account/PartnershipSection.tsx), [src/app/api/partnership/route.ts](src/app/api/partnership/route.ts)
**Steps:**
- In `PartnershipSection.tsx`, locate `handleDissolve` (around line 106-130). After the successful PATCH response, call `await fetchPartnership()` instead of (or in addition to) the optimistic `setPartnership(null)` at line 121. This mirrors the post-join pattern at line 96.
- Also reset any related local state: invite input, copy state, joining/creating flags.
- In `api/partnership/route.ts` PATCH dissolve handler (lines 228-263), confirm the dissolve fully nulls `partner_user_id` on **both** user rows, not just the initiator. Add a unit test or manual SQL check to prove the partner side is also cleared.
- Check whether the partner display in another tab (Nova Profile, Memories, Insights) reads from cached server-component data — if so, call `router.refresh()` after dissolve to invalidate the RSC cache.
**Acceptance:** Create a partnership in test, dissolve it, and the partner settings section immediately renders the "Create Partnership / Join Partnership" empty state with no trace of the ex-partner's name; refreshing the page shows the same; the partner's own settings tab also shows no partnership.

---

### [P1] Audit other stale-state patterns
**Why:** The same `useState` + manual `fetch` pattern in `PartnershipSection.tsx` likely exists in other settings/profile components. Each one is a candidate for the same bug class.
**Files:** Likely candidates — `src/components/account/*.tsx`, `src/components/profile/*.tsx`, anywhere doing `fetch(...)` followed by `setX(...)` in event handlers
**Steps:**
- Grep for `useState` + `fetch(` combos in `src/components/`.
- For each mutation handler (delete, update, dissolve, remove), confirm a refetch happens after success.
- Where applicable, extract the fetch into a small custom hook (`usePartnership`, `useNovaProfile`) that exposes a `refetch` function.
**Acceptance:** A short list documented in this file (or a follow-up PR description) of each component checked and its status (OK / fixed / deferred).

---

## 2. Production Hardening (Solo-dev MVP)

### [P0] Add security headers in `next.config.ts`
**Why:** `next.config.ts` is currently empty. No CSP, no clickjacking protection, no HSTS — basic web-security hygiene.
**Files:** [next.config.ts](next.config.ts)
**Steps:**
- Add an `async headers()` config returning the following for all routes:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(self), geolocation=()` (allow microphone for future voice I/O)
  - `Content-Security-Policy:` start permissive (allow `'self'`, Supabase, OpenAI, DeepSeek, Vercel domains), tighten over time.
- Verify in dev with browser devtools → Network → Response Headers.
**Acceptance:** All headers visible on a request to `/`; CSP doesn't break Supabase auth, streaming chat, or third-party SDK loads.

---

### [P0] Global error boundary
**Why:** Without `error.tsx`, runtime errors in production show a blank page or leaked stack trace.
**Files:** `src/app/error.tsx` (new), `src/app/global-error.tsx` (new)
**Steps:**
- Create `src/app/error.tsx` — a client component with `"use client"`, accepts `error` and `reset` props, renders a friendly fallback UI with a "Try again" button calling `reset()`.
- Create `src/app/global-error.tsx` — same shape, but wraps the entire app (must include `<html><body>`). Used when the root layout itself errors.
- Both should log the error to Sentry (see next item) once that's wired.
**Acceptance:** Throwing in a route handler or page renders the fallback UI, not a blank page.

---

### [P0] Sentry error monitoring
**Why:** Right now production errors are invisible — no way to know what's breaking for users.
**Files:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.ts`, `.env.local`, Vercel env settings
**Steps:**
- Sign up for Sentry free tier; create a Next.js project.
- Run `npx @sentry/wizard@latest -i nextjs` — auto-generates configs.
- Set `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in `.env.local` and Vercel.
- Wrap API route try/catch blocks: call `Sentry.captureException(err)` before returning the 500.
- Enable sourcemap upload in build (the wizard handles this).
- Verify by throwing a test error in a non-prod route.
**Acceptance:** A test error appears in the Sentry dashboard within ~1 minute with proper stack trace, user ID (if available), and request URL.

---

### [P0] Configure `CRON_SECRET` and enable memory-maintenance cron
**Why:** Already on existing [todo.md](todo.md) — the cron exists but isn't running, so memory summarization and insight regeneration don't happen.
**Files:** [src/app/api/cron/memory-maintenance/route.ts](src/app/api/cron/memory-maintenance/route.ts), `vercel.json` (new or existing)
**Steps:**
- Generate a random secret (`openssl rand -hex 32`); add `CRON_SECRET` to Vercel env vars.
- Confirm the cron route verifies `Authorization: Bearer ${CRON_SECRET}` in the request header.
- Create/update `vercel.json` with:
  ```json
  {
    "crons": [{ "path": "/api/cron/memory-maintenance", "schedule": "0 3 * * *" }]
  }
  ```
- Deploy; check Vercel dashboard → Cron Jobs to confirm the schedule is registered.
- Move the corresponding item in `todo.md` to checked.
**Acceptance:** Vercel cron log shows successful daily run; memory rows in Supabase show `last_summarized_at` updating; manual `curl` with wrong secret returns 401.

---

### [P1] Minimal CI on GitHub Actions
**Why:** Right now nothing prevents a broken build from reaching `main`.
**Files:** `.github/workflows/ci.yml` (new)
**Steps:**
- Create the workflow with two jobs (or one job, two steps): `npm ci`, `npm run lint`, `npm run build`.
- Trigger on `pull_request` to `main` and `push` to `main`.
- Cache `node_modules` and `.next/cache` using `actions/cache`.
- (Optional, no tests yet) — leave a `npm test` step commented out for when tests are added.
**Acceptance:** Opening a PR runs the workflow and shows green/red status on the PR; a deliberately broken build fails the check.

---

### [P1] Structured logger
**Why:** Scattered `console.log` calls make production debugging impossible. Sentry breadcrumbs need consistent metadata.
**Files:** `src/lib/logger.ts` (new), all `src/app/api/**/*.ts`
**Steps:**
- Create a tiny logger module: `log.info(msg, meta)`, `log.warn`, `log.error`. In prod, JSON-stringify and `console.log` (Vercel ingests stdout). In dev, pretty-print.
- Include `requestId` (generate per-request via `crypto.randomUUID()`), `userId` if authed, route path.
- Replace existing `console.log` calls in API routes with the logger.
- In Sentry's `beforeSend`, attach the most recent `requestId` as a tag.
**Acceptance:** Vercel logs show one JSON line per significant API event; logs can be filtered by `requestId` to trace a single request end-to-end.

---

### [P1] SEO metadata
**Why:** Currently no Open Graph tags, no sitemap — Nova Star is invisible to search and looks broken when shared on social media.
**Files:** [src/app/layout.tsx](src/app/layout.tsx), `public/robots.txt` (new), `src/app/sitemap.ts` (new)
**Steps:**
- Export a `metadata` object from `layout.tsx` with `title.template`, `description`, `openGraph` (image, url, siteName), `twitter` card.
- Add `public/robots.txt` allowing crawlers on public pages, disallowing `/api/`, `/creator/`, `/profile/`, `/chat/`.
- Add `src/app/sitemap.ts` listing the landing page, login, signup, and any other public marketing pages.
- Add a 1200x630 OG image at `public/og-image.png`.
**Acceptance:** Pasting the prod URL into Twitter/Slack/Discord shows a rich preview; `your-domain.com/robots.txt` and `your-domain.com/sitemap.xml` return correctly.

---

### [P1] Image optimization
**Why:** Raw `<img>` tags are likely scattered across components — they ship full-size images and skip Next.js's image pipeline.
**Files:** Components in `src/components/`, especially landing-page sections
**Steps:**
- Grep `src/` for `<img` and review each occurrence.
- Replace with `<Image from "next/image"` where the source is local (in `public/`) or a known remote host.
- For unknown user-uploaded images (Supabase Storage), leave as `<img>` for now to avoid `images.remotePatterns` complexity — revisit in a follow-up.
- Set `priority` on hero/above-the-fold images.
**Acceptance:** Lighthouse "Properly size images" and "Serve images in next-gen formats" warnings drop substantially on the landing page.

---

### [P2] Rate limit error UX
**Why:** When a user hits the 24h token cap, they currently see a generic toast — no indication of when they can retry.
**Files:** [src/app/api/chat/route.ts](src/app/api/chat/route.ts), chat UI component sending the request
**Steps:**
- Have the 429 response include `{ error, retryAt: <ISO timestamp> }` from the rate limit check.
- In the chat UI, on a 429, show a banner: "Daily limit reached — resets at {time}" with the localized time.
- Optionally disable the input until `retryAt`.
**Acceptance:** Exceeding the limit shows a clear, dated message; the time matches the actual rolling-window expiry.

---

### [P2] Audit `next-auth` v4 usage (or remove)
**Why:** `next-auth ^4.24.13` is in `package.json` but the app appears to use Supabase Auth via middleware. Either it's dead code or it's a stale dependency.
**Files:** [package.json](package.json), grep for `next-auth` imports across `src/`
**Steps:**
- Grep `src/` for `next-auth` imports.
- If unused: `npm uninstall next-auth` and verify build.
- If used: upgrade to v5 (Auth.js) or migrate fully to Supabase Auth.
**Acceptance:** Either no `next-auth` references in code, or `next-auth` upgraded to v5 with working auth flows.

---

## 3. Features to Complete (MVP-required + existing todos)

### [P0] Email verification flow
**Why:** Required for any serious product — prevents fake signups, enables password reset, satisfies basic compliance.
**Files:** Supabase dashboard settings, [src/middleware.ts](src/middleware.ts), `src/app/auth/callback/route.ts` (new or existing)
**Steps:**
- In Supabase dashboard → Authentication → Email Auth, enable "Confirm email."
- Set the email redirect URL to `${SITE_URL}/auth/callback`.
- Create/update `src/app/auth/callback/route.ts` to handle the verification token exchange.
- In `middleware.ts`, gate protected routes (`/chat/*`, `/profile/*`, `/quiz/*`) behind `user.email_confirmed_at != null`. Unverified users are redirected to a "Please verify your email" page.
- Customize the verification email template in Supabase (Nova Star branding).
**Acceptance:** New signup receives a verification email; clicking the link confirms the account; unverified users can't access protected routes.

---

### [P0] Password reset flow
**Why:** Users will forget passwords. Without this, "forgot password?" is a support ticket — or worse, an account loss.
**Files:** `src/app/forgot-password/page.tsx` (new), `src/app/reset-password/page.tsx` (new), Supabase email templates
**Steps:**
- Build `/forgot-password` page: email input → `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`.
- Build `/reset-password` page: reads the recovery session, shows new password input, calls `supabase.auth.updateUser({ password })`.
- Add a "Forgot password?" link on the login page.
- Customize the password reset email template in Supabase.
**Acceptance:** End-to-end: request reset → receive email → click link → set new password → log in with new password.

---

### [P1] Image understanding (from existing todo.md)
**Why:** Users can already upload images; the chat ignores them. Completes a half-finished feature.
**Files:** [src/app/api/chat/route.ts](src/app/api/chat/route.ts), [src/lib/ai/provider.ts](src/lib/ai/provider.ts), chat UI
**Steps:**
- In the chat API route, detect when the message has image attachments.
- Route those messages to a vision-capable model (GPT-4o or equivalent) via the provider abstraction.
- Format the multimodal payload per OpenAI's content-array spec (`{ type: 'image_url', image_url: { url } }`).
- Test with screenshots, photos of text, diagrams.
- Track vision-call token usage separately (vision is more expensive).
- Move the item in `todo.md` to checked.
**Acceptance:** Upload an image, ask "what's in this?", get a relevant response; token usage row in Supabase shows the vision call.

---

### [P1] Memory dashboard (from existing todo.md)
**Why:** Users have no way to see or correct what Nova "remembers" about them — privacy and trust issue.
**Files:** `src/app/profile/memories/page.tsx` (new), `src/components/profile/MemoryList.tsx` (new), backend helpers in [src/lib/supabase/](src/lib/supabase/) and [src/lib/ai/memoryMaintenance.ts](src/lib/ai/memoryMaintenance.ts)
**Steps:**
- New route under `/profile/memories` listing personal memories with: content, confidence score, created/updated timestamp, source chat link.
- Add search/filter (by topic, confidence, date range).
- Add edit (textarea) and delete (with confirmation) actions; both call existing or new Supabase helpers.
- Add an "Export my memory data" button (JSON download) — useful for GDPR-style data export.
- Move the item in `todo.md` to checked.
**Acceptance:** Visit `/profile/memories`, see what Nova remembers, edit one memory and see it persist; deleted memories don't return.

---

### [P2] Group chat for partners (from existing todo.md)
**Why:** Existing partnership system has shared memories but no shared conversation surface.
**Files:** `src/app/chat/group/[partnershipId]/page.tsx` (new), partnership schema in `supabase/migrations/`, [src/app/api/chat/route.ts](src/app/api/chat/route.ts) (extend to allow group context)
**Steps:**
- Design a new `group_chats` table linked to partnerships, plus `group_messages`.
- Extend the chat route to accept a `partnershipId` and use both partners' Nova profiles + shared memories in the system prompt.
- Build a UI variant that shows both partners' avatars on messages.
- Use Supabase Realtime to push new messages to both partners' clients.
- Move the item in `todo.md` to checked.
**Acceptance:** Both partners can join a shared chat, both see all messages live, Nova responds with awareness of both partners' contexts.

---

### [P2] Voice I/O (from existing todo.md)
**Why:** Listed on existing todo.md as voice input/output (Whisper STT + TTS).
**Files:** Chat input component, new API routes for STT and TTS, [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
**Steps:**
- Add a mic button to the chat input; record via `MediaRecorder` API.
- POST audio blob to `/api/transcribe`, which calls OpenAI Whisper, returns text.
- Auto-insert the text into the input or auto-send.
- For TTS: add a "speak" button on Nova's responses; POST text to `/api/tts`, stream audio back.
- Update `Permissions-Policy` header (see security headers task) to allow `microphone=(self)`.
- Move the item in `todo.md` to checked.
**Acceptance:** Hold mic button, speak a question, see it transcribed and answered; click speak on the response, hear it played back.

---

## 4. Future Expansions

These are intentionally deferred past MVP. Pick them up after launch when you have user feedback driving priorities.

### Tests
**Why:** Playwright is installed but unused. Eventually you'll regress something subtle.
**Suggested approach:** Start with 3 Playwright smoke E2E tests — login, send-message, partnership-join. Add Vitest for unit tests of `src/lib/ai/*` (memory extraction, prompt assembly, provider routing). Target ~30% coverage on critical paths before chasing more.

### OpenAPI / API documentation
**Why:** Zod schemas already exist for validation; generating an OpenAPI spec from them is mostly free.
**Suggested approach:** `zod-to-openapi`, expose a `/api/docs` route with Swagger UI in dev only.

### Behavioral analytics
**Why:** Vercel Speed Insights tracks perf, not user behavior. You don't know your activation funnel.
**Suggested approach:** Plausible (privacy-friendly, no banner) or PostHog (event tracking + funnels). Track: signup → quiz completed → first chat sent → return day 2.

### Accessibility audit
**Why:** No ARIA labels, no keyboard nav audit. Excludes users and risks legal exposure in some markets.
**Suggested approach:** Run `axe DevTools` on each page, fix the high-severity issues first. Add keyboard nav to chat and settings.

### i18n framework
**Why:** RTL is hardcoded for Persian/Arabic; there's no real translation system.
**Suggested approach:** `next-intl` with English + Persian as launch languages. Move all hardcoded strings into message catalogs.

### PWA / mobile shell
**Why:** Mobile-responsive layout exists but no install prompt, no offline support, no app icon on home screen.
**Suggested approach:** Add `public/manifest.json`, basic service worker (Workbox), prompt-to-install banner.

### Admin analytics expansion
**Why:** Creator panel currently shows user lists but no business metrics.
**Suggested approach:** Charts for daily active users, token spend per user, partnership formation rate, retention curves. Use Recharts (already lightweight) or a Supabase view + Grafana.

### Disaster recovery doc
**Why:** When Supabase goes wrong, you need a runbook — not improvisation.
**Suggested approach:** Document backup cadence (Supabase Pro = PITR), restore-from-snapshot procedure, rollback procedure for bad migrations.

### Migration tooling
**Why:** Migrations are currently raw SQL files run by hand per `DATABASE_MIGRATION.md`. Error-prone and not idempotent.
**Suggested approach:** Move to `supabase db push` with versioned migrations under `supabase/migrations/`, use the Supabase CLI in CI to apply migrations on deploy.

---

## Suggested execution order (first two weeks)

**Week 1 — stop the bleeding:**
1. Rotate secrets (today)
2. Fix partner dissolve bug
3. Add security headers + error boundary
4. Wire Sentry + structured logger
5. Configure CRON_SECRET

**Week 2 — ship-readiness:**
6. Email verification + password reset
7. SEO metadata + sitemap
8. Minimal GitHub Actions CI
9. Audit other stale-state patterns
10. Image optimization sweep

After that, pick up P1 features (vision, memory dashboard) based on what users ask for first.
