# JobOS — New Features Integration Guide

## What's in this package

### 1. Application Detail Page — `/applications/[id]`
### 2. LinkedIn Sync Suggestions — `/linkedin-sync`
### 3. PWA Push Notifications
### 4. Extension + PWA Icons (all sizes, pre-built PNGs)

---

## File placement

Copy all files from this zip into your `jobos/` project root, merging with existing files:

```
src/app/applications/[id]/page.tsx     → application detail page
src/app/linkedin-sync/page.tsx         → LinkedIn sync page
src/app/api/ai/linkedin-sync/route.ts  → AI suggestions API
src/app/api/push/subscribe/route.ts    → push subscription save/delete
src/app/api/push/send/route.ts         → push notification sender (cron)
src/lib/usePushNotifications.ts        → React hook
src/components/PushNotificationToggle.tsx → UI toggle component
public/sw-push.js                      → service worker (push events)
public/icons/icon-*.png                → all PWA icons (8 sizes)
extension/icons/icon16.png             → extension icons
extension/icons/icon48.png
extension/icons/icon128.png
supabase/migrations/002_push_subscriptions.sql
vercel.json                            → updated with 4th cron job
```

---

## Step 1 — Supabase migration

Run in your Supabase project → SQL Editor:

```sql
-- paste contents of supabase/migrations/002_push_subscriptions.sql
```

---

## Step 2 — Add environment variables

In Vercel dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated below>
VAPID_PRIVATE_KEY=<generated below>
VAPID_EMAIL=your@email.com
SUPABASE_SERVICE_KEY=<your supabase service_role key>
```

**Generate VAPID keys** (run once locally):
```bash
npx web-push generate-vapid-keys
```
Copy the Public Key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
Copy the Private Key → `VAPID_PRIVATE_KEY`

---

## Step 3 — Install web-push package

```bash
npm install web-push
npm install --save-dev @types/web-push
```

---

## Step 4 — Patch AppLayout navigation

In `src/components/AppLayout.tsx`:

1. Add to imports: `import { ..., Linkedin } from 'lucide-react'`
2. Add to the "Your Profile" nav section:
   ```ts
   { href: '/linkedin-sync', icon: Linkedin, label: 'LinkedIn Sync' },
   ```
   (between Profile & Preferences and Companies)

---

## Step 5 — Add PushNotificationToggle to Automation page

In `src/app/automation/page.tsx`, import and drop in the toggle:

```tsx
import PushNotificationToggle from '@/components/PushNotificationToggle'

// Add inside the page JSX, e.g. in a "Notifications" section:
<div className="space-y-3">
  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
    Push Notifications
  </div>
  <PushNotificationToggle />
</div>
```

---

## Step 6 — Wire application detail links

In `src/app/applications/page.tsx`, the row `<Link>` should point to `/applications/${app.id}`.

Find the existing application row and ensure it's wrapped in:
```tsx
<Link href={`/applications/${app.id}`}>
```

---

## Step 7 — Add LinkedIn profile URL to profile page

The LinkedIn sync page uses `profile.linkedin_url`. This is already in the DB schema
and Profile type. Make sure it's editable in `/profile` — it should already be there.

---

## How push notifications work

1. User clicks "Turn on" in the Automation page → browser asks permission
2. `usePushNotifications.subscribe()` creates a Web Push subscription
3. Subscription saved to `push_subscriptions` table via `/api/push/subscribe`
4. Vercel cron runs `/api/push/send` every hour
5. Cron checks for:
   - New jobs with `fit_score >= 8` discovered in the last hour
   - Interviews scheduled within 2 hours
6. Sends Web Push via `web-push` library to matching subscribers
7. `sw-push.js` service worker shows the notification + handles tap → opens correct page

---

## Extension icons

The 3 required PNG files are at:
```
extension/icons/icon16.png
extension/icons/icon48.png
extension/icons/icon128.png
```

Copy into your `extension/icons/` folder. The manifest already references these paths.

---

## What each new page does

### `/applications/[id]` — Application Detail
- Timeline tab: full status history + add custom events
- Notes tab: freeform notes + AI follow-up email generator
- Offer tab: record offer amount, compare to listed salary, decline/edit
- Quick status transitions (one tap: Applied → Shortlisted → Interview etc.)
- Overdue follow-up alert with AI draft button

### `/linkedin-sync` — LinkedIn Profile Sync
- AI analyses your JobOS profile and generates tailored suggestions
- Sections: Headline, About, Skills, Open to Work, Featured, Network, Activity, Photo
- Each suggestion shows current vs suggested text, reason + impact stat
- Copy button for each → paste directly into LinkedIn
- Mark as done to track progress
- Profile completeness score ring

---

## Monthly cost impact

| Addition             | Cost |
|----------------------|------|
| Push notifications   | Free (web-push is free, Vercel cron included) |
| Extra API route      | ~₹0-5/month at normal usage |
| Extra DB table       | No change (free tier) |
| Icons                | Free (static files) |

Total new cost: **₹0** — stays at ₹30-80/month.
