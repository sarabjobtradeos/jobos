import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

// GET /api/portal/health — returns portal session status
// POST /api/portal/health — extension reports health
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({})

  const { data } = await supabaseAdmin
    .from('portal_sessions')
    .select('portal,is_active')
    .eq('user_id', user.id)

  const health: Record<string, boolean> = {}
  data?.forEach(s => { health[s.portal] = s.is_active })
  return NextResponse.json(health)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { health } = await req.json()

  for (const [portal, isActive] of Object.entries(health)) {
    await supabaseAdmin.from('portal_sessions').upsert({
      user_id: user.id,
      portal,
      is_active: isActive,
      last_checked: new Date().toISOString(),
      last_active: isActive ? new Date().toISOString() : undefined,
    })
  }

  return NextResponse.json({ ok: true })
}
