import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-vercel-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabaseAdmin = getAdmin()

  const { data: dueApps } = await supabaseAdmin
    .from('applications')
    .select('*, job:jobs(title, company), profile:profiles(full_name)')
    .in('status', ['applied', 'viewed'])
    .lte('next_followup_at', new Date().toISOString())
    .lt('followup_count', 2)

  if (!dueApps?.length) {
    return NextResponse.json({ message: 'No follow-ups due', count: 0 })
  }

  let drafted = 0
  for (const app of dueApps) {
    try {
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

      await supabaseAdmin.from('followups').insert({
        user_id: app.user_id,
        application_id: app.id,
        draft_content: `Subject: ${draft.subject}\n\n${draft.body}`,
        status: 'draft',
      })

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
