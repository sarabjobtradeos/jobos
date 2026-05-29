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

// POST /api/jobs/[id]/apply-result
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { success, error } = await req.json()
  const jobId = params.id

  if (success) {
    // Update job status
    await supabaseAdmin.from('jobs').update({ status: 'applied' }).eq('id', jobId)
    // Create application record if not exists
    const { data: existing } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .single()

    if (!existing) {
      const { data: job } = await supabaseAdmin.from('jobs').select('portal,region').eq('id', jobId).single()
      await supabaseAdmin.from('applications').insert({
        user_id: user.id,
        job_id: jobId,
        portal: job?.portal,
        region: job?.region,
        status: 'applied',
        next_followup_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }
  } else {
    // Reset job to 'new' for manual apply
    await supabaseAdmin.from('jobs').update({ status: 'new' }).eq('id', jobId)
  }

  return NextResponse.json({ ok: true })
}
