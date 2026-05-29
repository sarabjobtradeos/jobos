# JobOS — Complete Setup & Deployment Guide

## What you need (all free or minimal cost)
- GitHub account (free)
- Vercel account (free) — vercel.com
- Supabase account (free) — supabase.com
- Anthropic API key — console.anthropic.com
- Chrome browser

---

## Step 1 — Supabase setup (10 mins)

1. Go to supabase.com → New project
2. Name it `jobos`, choose a region close to you, set a password
3. Wait for project to start (~2 mins)
4. Go to **SQL Editor** → paste the entire contents of `supabase/migrations/001_initial_schema.sql` → Run
5. Go to **Storage** → New bucket → name it `documents` → set to Public
6. Go to **Settings → API** → copy:
   - Project URL → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → this is your `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2 — Anthropic API key (2 mins)

1. Go to console.anthropic.com
2. API Keys → Create key → copy it
3. This is your `ANTHROPIC_API_KEY`
4. Add ₹500 credits — at normal usage this lasts 2-3 months

---

## Step 3 — Deploy to Vercel (5 mins)

1. Push this entire `jobos` folder to a GitHub repo
2. Go to vercel.com → New Project → Import your GitHub repo
3. In Environment Variables, add all 4 keys:
   ```
   NEXT_PUBLIC_SUPABASE_URL = (from step 1)
   NEXT_PUBLIC_SUPABASE_ANON_KEY = (from step 1)
   SUPABASE_SERVICE_ROLE_KEY = (from step 1)
   ANTHROPIC_API_KEY = (from step 2)
   ```
4. Click Deploy → wait ~3 mins
5. Your dashboard is live at `your-project.vercel.app`

---

## Step 4 — Install as mobile app (PWA)

**iPhone:**
1. Open your Vercel URL in Safari
2. Tap Share button → "Add to Home Screen"
3. Tap Add → JobOS appears on your home screen like a real app

**Android:**
1. Open your Vercel URL in Chrome
2. Tap menu → "Add to Home screen" or Chrome will auto-prompt
3. Tap Add

---

## Step 5 — First use

1. Open JobOS → sign in with your email (magic link, no password)
2. Go to **Profile & Preferences** → fill in everything
3. Go to **Resumes & Cover Letters** → upload your India resume, Ireland resume, and both cover letters
4. Go to **Automation** → check portal health → set your auto-apply threshold
5. That's it — the system starts scanning from next scheduled run

---

## Monthly cost breakdown

| Service | Cost |
|---------|------|
| Vercel (frontend) | ₹0 — free forever |
| Supabase (database) | ₹0 — free tier |
| Anthropic API (Claude) | ~₹30–80/mo depending on usage |
| **Total** | **~₹30–80/mo** |

---

## Phase 3 — Chrome Extension (coming next)

The extension enables true auto-apply through your open browser tabs.
It will be a separate download once built.

---

## Troubleshooting

**Login not working:** Check Supabase → Authentication → Email is enabled
**Jobs not showing:** Complete profile setup first
**AI tailoring fails:** Check Anthropic API key has credits
**Build fails on Vercel:** Check all 4 env variables are set correctly
