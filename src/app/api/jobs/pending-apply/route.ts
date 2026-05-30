import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export async function GET(req: NextRequest) {
  const admin = getAdmin()
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: jobs } = await admin.from('jobs').select('*').eq('user_id', user.id).eq('status', 'applying').order('fit_score', { ascending: false }).limit(5)
  return NextResponse.json({ jobs: jobs || [] })
}
