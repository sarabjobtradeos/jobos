import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export async function GET(req: NextRequest) {
  const admin = getAdmin()
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ today: 0, total: 0 })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ today: 0, total: 0 })

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const [{ count: today }, { count: total }] = await Promise.all([
    admin.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('applied_at', todayStart.toISOString()),
    admin.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])
  return NextResponse.json({ today: today || 0, total: total || 0 })
}
