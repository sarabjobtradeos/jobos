import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export async function GET(req: NextRequest) {
  const admin = getAdmin()
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({})
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({})

  const { data } = await admin.from('portal_sessions').select('portal,is_active').eq('user_id', user.id)
  const health: Record<string, boolean> = {}
  data?.forEach(s => { health[s.portal] = s.is_active })
  return NextResponse.json(health)
}

export async function POST(req: NextRequest) {
  const admin = getAdmin()
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { health } = await req.json()
  for (const [portal, isActive] of Object.entries(health)) {
    await admin.from('portal_sessions').upsert({ user_id: user.id, portal, is_active: isActive, last_checked: new Date().toISOString(), last_active: isActive ? new Date().toISOString() : undefined })
  }
  return NextResponse.json({ ok: true })
}
