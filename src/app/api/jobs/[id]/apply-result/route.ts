import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdmin()
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { success } = await req.json()
  const jobId = params.id

  if (success) {
    await admin.from('jobs').update({ status: 'applied' }).eq('id', jobId)
    const { data: existing } = await admin.from('applications').select('id').eq('job_id', jobId).single()
    if (!existing) {
      const { data: job } = await admin.from('jobs').select('portal,region').eq('id', jobId).single()
      await admin.from('applications').insert({ user_id: user.id, job_id: jobId, portal: job?.portal, region: job?.region, status: 'applied', next_followup_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
    }
  } else {
    await admin.from('jobs').update({ status: 'new' }).eq('id', jobId)
  }

  return NextResponse.json({ ok: true })
}
