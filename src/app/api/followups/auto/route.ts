import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-vercel-cron-secret')
  if (cronSecret !== process.env.SCRAPER_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Find all applications where follow-up is due
  const { data: dueApps } = await supabaseAdmin
    .from('applications')
    .select('*, job:jobs(title, company), profile:profiles(full_name)')
    .in('status', ['applied', 'viewed'])
    .lte('next_followup_at', new Date().toISOString())
    .lt('followup_count', 2) // max 2 follow-ups per application

  if (!dueApps?.length) {
    return NextResponse.json({ message: 'No follow-ups due', count: 0 })
  }

  let drafted = 0
  for (const app of dueApps) {
    try {
      // Generate follow-up draft via AI
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: app.job?.title,
          company: app.job?.company,
          appliedAt: new Date(app.applied_at).toLocaleDateString(),
          candidateName: app.profile?.full_name || 'Candidate',
          previousFollowups: app.followup_count || 0,
        }),
      })
      const draft = await res.json()

      // Save draft to followups table
      await supabaseAdmin.from('followups').insert({
        user_id: app.user_id,
        application_id: app.id,
        draft_content: `Subject: ${draft.subject}\n\n${draft.body}`,
        status: 'draft',
      })

      // Update next follow-up date (+7 days)
      await supabaseAdmin.from('applications').update({
        next_followup_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('id', app.id)

      drafted++
    } catch (err) {
      console.error('Auto follow-up failed for app:', app.id, err)
    }
  }

  return NextResponse.json({ success: true, drafted, total: dueApps.length })
}
