import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runJobPipeline } from '@/lib/pipeline'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Auth check — internal scraper secret OR logged-in user
    const authHeader = req.headers.get('authorization')
    const scraperSecret = req.headers.get('x-scraper-secret')

    let userId: string | null = null

    if (scraperSecret && scraperSecret === process.env.SCRAPER_SECRET) {
      // Called by cron job — get userId from body
      const body = await req.json()
      userId = body.userId
    } else if (authHeader?.startsWith('Bearer ')) {
      // Called by logged-in user from dashboard
      const token = authHeader.slice(7)
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      userId = user?.id || null
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const result = await runJobPipeline(userId)

    return NextResponse.json({
      success: true,
      ...result,
      message: `Scan complete — ${result.new} new jobs found, ${result.scored} scored`,
    })
  } catch (err: any) {
    console.error('Pipeline error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Vercel cron — runs daily at 7am IST (1:30am UTC)
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-vercel-cron-secret')
  if (cronSecret !== process.env.SCRAPER_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Get all users with active profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .or('india_active.eq.true,ireland_active.eq.true')

  if (!profiles?.length) {
    return NextResponse.json({ message: 'No active profiles' })
  }

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
