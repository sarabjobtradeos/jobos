import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const jobId = params.id

  // Get job details
  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Check if already tailored
  const { data: tailoredResume } = await supabaseAdmin
    .from('resumes')
    .select('content')
    .eq('user_id', user.id)
    .eq('job_id', jobId)
    .eq('is_base', false)
    .limit(1)
    .single()

  const { data: tailoredCL } = await supabaseAdmin
    .from('cover_letters')
    .select('content')
    .eq('user_id', user.id)
    .eq('job_id', jobId)
    .eq('is_base', false)
    .limit(1)
    .single()

  if (tailoredResume && tailoredCL) {
    return NextResponse.json({ resume: tailoredResume.content, coverLetter: tailoredCL.content })
  }

  // Get base resume and cover letter
  const { data: baseResume } = await supabaseAdmin
    .from('resumes')
    .select('content')
    .eq('user_id', user.id)
    .eq('region', job.region)
    .eq('is_base', true)
    .single()

  const { data: baseCL } = await supabaseAdmin
    .from('cover_letters')
    .select('content')
    .eq('user_id', user.id)
    .eq('region', job.region)
    .eq('is_base', true)
    .single()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (!baseResume) return NextResponse.json({ error: 'No base resume' }, { status: 400 })

  // Tailor with AI
  const tailorRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/tailor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
      baseResume: baseResume.content,
      baseCoverLetter: baseCL?.content || '',
      region: job.region,
      candidateName: profile?.full_name || '',
    }),
  })
  const tailored = await tailorRes.json()

  // Save tailored versions
  await supabaseAdmin.from('resumes').insert({
    user_id: user.id,
    name: `${job.title} @ ${job.company}`,
    region: job.region,
    content: tailored.resume,
    is_base: false,
    job_id: jobId,
    version: 1,
  })

  if (tailored.coverLetter) {
    await supabaseAdmin.from('cover_letters').insert({
      user_id: user.id,
      name: `${job.title} @ ${job.company}`,
      region: job.region,
      content: tailored.coverLetter,
      is_base: false,
      job_id: jobId,
      version: 1,
    })
  }

  return NextResponse.json({ resume: tailored.resume, coverLetter: tailored.coverLetter })
}
