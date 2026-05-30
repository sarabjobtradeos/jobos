import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-vercel-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = getAdmin()
  const { data: profiles } = await admin.from('profiles').select('*')
  if (!profiles?.length) return NextResponse.json({ message: 'No profiles' })

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7)
  const weekEnd = new Date()
  let generated = 0

  for (const profile of profiles) {
    try {
      const { data: apps } = await admin.from('applications').select('*, job:jobs(fit_score)').eq('user_id', profile.id).gte('applied_at', weekStart.toISOString())
      if (!apps?.length) continue

      const weekData = {
        total_applied: apps.length,
        india_applied: apps.filter(a => a.region === 'india').length,
        ireland_applied: apps.filter(a => a.region === 'ireland').length,
        interviews: apps.filter(a => ['interview_scheduled', 'interview_done'].includes(a.status)).length,
        rejections: apps.filter(a => a.status === 'rejected').length,
        response_rate: Math.round((apps.filter(a => a.status !== 'applied').length / apps.length) * 100),
        avg_fit_score: apps.filter(a => a.job?.fit_score).reduce((sum, a, _, arr) => sum + a.job!.fit_score / arr.length, 0),
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/weekly-report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekData, profile }) })
      const aiData = await res.json()

      await admin.from('weekly_reports').insert({ user_id: profile.id, week_start: weekStart.toISOString().slice(0, 10), week_end: weekEnd.toISOString().slice(0, 10), total_applied: weekData.total_applied, india_applied: weekData.india_applied, ireland_applied: weekData.ireland_applied, interviews_scheduled: weekData.interviews, response_rate: weekData.response_rate, avg_fit_score: weekData.avg_fit_score, recommendations: aiData.recommendations, report_html: JSON.stringify(aiData) })
      generated++
    } catch (err) {
      console.error('Weekly report failed:', profile.id, err)
    }
  }
  return NextResponse.json({ success: true, generated })
}
