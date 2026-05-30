import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runJobPipeline } from '@/lib/pipeline'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export async function POST(req: NextRequest) {
  const admin = getAdmin()
  try {
    const authHeader = req.headers.get('authorization')
    const scraperSecret = req.headers.get('x-scraper-secret')
    let userId: string | null = null

    if (scraperSecret && scraperSecret === process.env.CRON_SECRET) {
      const body = await req.json()
      userId = body.userId
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user } } = await admin.auth.getUser(token)
      userId = user?.id || null
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const result = await runJobPipeline(userId)
    return NextResponse.json({ success: true, ...result, message: `Scan complete — ${result.new} new jobs found, ${result.scored} scored` })
  } catch (err: any) {
    console.error('Pipeline error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const admin = getAdmin()
  const cronSecret = req.headers.get('x-vercel-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profiles } = await admin.from('profiles').select('id').or('india_active.eq.true,ireland_active.eq.true')
  if (!profiles?.length) return NextResponse.json({ message: 'No active profiles' })

  const results = []
  for (const profile of profiles) {
    try {
      const result = await runJobPipeline(profile.id)
      results.push({ userId: profile.id, ...result })
    } catch (err: any) {
      results.push({ userId: profile.id, error: err.message })
    }
  }
  return NextResponse.json({ success: true, results })
}
