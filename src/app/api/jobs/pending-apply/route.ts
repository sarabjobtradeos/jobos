// /api/jobs/pending-apply/route.ts
// Returns jobs ready to be applied to by the extension

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserFromToken(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: jobs } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'applying')
    .order('fit_score', { ascending: false })
    .limit(5)

  return NextResponse.json({ jobs: jobs || [] })
}
