import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_EMAIL || 'admin@jobos.app'),
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { sent: 0, failed: 0, total: 0 }

  try {
    // Find users with new high-score jobs (score >= 8) discovered in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: highScoreJobs } = await supabase
      .from('jobs')
      .select('user_id, title, company, fit_score, region')
      .gte('fit_score', 8)
      .gte('discovered_at', oneHourAgo)
      .eq('status', 'new')

    // Find interview reminders (interviews in next 2 hours)
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    const { data: upcomingInterviews } = await supabase
      .from('applications')
      .select('user_id, interview_date, interview_type, job:jobs(title, company)')
      .eq('status', 'interview_scheduled')
      .gte('interview_date', new Date().toISOString())
      .lte('interview_date', twoHoursFromNow)

    // Build per-user notification map
    const userNotifications: Record<string, { title: string; body: string; url: string }[]> = {}

    for (const job of (highScoreJobs || [])) {
      if (!userNotifications[job.user_id]) userNotifications[job.user_id] = []
      userNotifications[job.user_id].push({
        title: `🎯 ${job.fit_score}/10 match found`,
        body: `${job.title} at ${job.company} ${job.region === 'ireland' ? '🇮🇪' : '🇮🇳'}`,
        url: '/jobs',
      })
    }

    for (const interview of (upcomingInterviews || [])) {
      if (!userNotifications[interview.user_id]) userNotifications[interview.user_id] = []
      const job = interview.job as any
      userNotifications[interview.user_id].push({
        title: '📅 Interview in ~2 hours',
        body: `${job?.title || 'Interview'} at ${job?.company || ''}${interview.interview_type ? ` · ${interview.interview_type}` : ''}`,
        url: '/interviews',
      })
    }

    // Get subscriptions for these users
    const userIds = Object.keys(userNotifications)
    if (!userIds.length) return NextResponse.json({ ...results, message: 'No notifications to send' })

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    results.total = subscriptions?.length || 0

    // Send notifications
    for (const sub of (subscriptions || [])) {
      const notifications = userNotifications[sub.user_id]
      if (!notifications?.length) continue

      // Batch into one notification if multiple
      const payload = notifications.length === 1
        ? notifications[0]
        : {
            title: `${notifications.length} new alerts`,
            body: notifications.map(n => n.body).join('\n'),
            url: '/dashboard',
          }

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            ...payload,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            tag: 'jobos-alert',
            renotify: true,
          })
        )
        results.sent++
      } catch (err: any) {
        results.failed++
        // Clean up expired subscriptions (410 Gone)
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }

    return NextResponse.json(results)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
