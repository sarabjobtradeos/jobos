// All Claude API calls go through here

export interface TailoredResult {
  resume: string
  coverLetter: string
  fitScore: number
  fitReasoning: string
  jdIntelligence: {
    what_they_want: string
    red_flags: string[]
    lead_with: string
    urgency: 'high' | 'medium' | 'low'
  }
  keywordsAdded: string[]
  salaryBenchmark?: {
    min: number
    max: number
    currency: string
    insight: string
  }
}

export interface InterviewPrepResult {
  likely_questions: string[]
  company_insight: string
  lead_with: string
  talking_points: string[]
}

export async function tailorResumeForJob(params: {
  jobTitle: string
  company: string
  jobDescription: string
  baseResume: string
  baseCoverLetter: string
  region: 'india' | 'ireland' | 'global'
  candidateName: string
  targetRole: string
}): Promise<TailoredResult> {
  const response = await fetch('/api/ai/tailor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Tailoring failed')
  return response.json()
}

export async function scoreJobFit(params: {
  jobDescription: string
  resume: string
  region: 'india' | 'ireland' | 'global'
  targetRoles: string[]
  skills: string[]
}): Promise<{ score: number; reasoning: string; recommend: boolean }> {
  const response = await fetch('/api/ai/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Scoring failed')
  return response.json()
}

export async function generateFollowUp(params: {
  jobTitle: string
  company: string
  appliedAt: string
  candidateName: string
  previousFollowups: number
}): Promise<{ subject: string; body: string }> {
  const response = await fetch('/api/ai/followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Follow-up generation failed')
  return response.json()
}

export async function generateInterviewPrep(params: {
  jobTitle: string
  company: string
  jobDescription: string
  resume: string
  companyNews?: string
}): Promise<InterviewPrepResult> {
  const response = await fetch('/api/ai/interview-prep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Interview prep failed')
  return response.json()
}

export async function analyzeRejectionPatterns(params: {
  rejectedApplications: Array<{
    jobTitle: string
    company: string
    region: string
    portal: string
    fitScore?: number
    stage: string
  }>
}): Promise<{
  patterns: string[]
  recommendations: string[]
  targetAdjustments: string[]
}> {
  const response = await fetch('/api/ai/rejection-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Analysis failed')
  return response.json()
}

export async function generateWeeklyReport(params: {
  weekData: any
  profile: any
}): Promise<{ summary: string; highlights: string[]; recommendations: string[] }> {
  const response = await fetch('/api/ai/weekly-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('Report generation failed')
  return response.json()
}
