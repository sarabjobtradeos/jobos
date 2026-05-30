import { createClient } from '@supabase/supabase-js'
import { LinkedInScraper, NaukriScraper, IndeedScraper, ScrapedJob, deduplicateJobs } from './scrapers'
import { Profile } from './supabase'

let _admin: any = null
function getAdmin() { if (!_admin) _admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
); return _admin; }

// ============================================
// MAIN PIPELINE ORCHESTRATOR
// ============================================
export async function runJobPipeline(userId: string): Promise<{
  found: number
  new: number
  duplicates: number
  scored: number
  fallbackUsed: boolean
}> {
  const { data: profile } = await getAdmin()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile || !profile.target_roles?.length) {
    throw new Error('Profile incomplete — set target roles first')
  }

  const { data: log } = await getAdmin()
    .from('automation_logs')
    .insert({ user_id: userId, type: 'job_scan', status: 'running' })
    .select()
    .single()

  let allJobs: ScrapedJob[] = []
  let newCount = 0
  let dupCount = 0
  let scoredCount = 0
  let fallbackUsed = false

  try {
    // Run scrapers for each active track
    if (profile.india_active) {
      const { jobs: indiaJobs, usedFallback } = await scrapeIndia(profile)
      allJobs.push(...indiaJobs)
      if (usedFallback) fallbackUsed = true
    }

    if (profile.ireland_active) {
      const { jobs: irelandJobs, usedFallback } = await scrapeIreland(profile)
      allJobs.push(...irelandJobs)
      if (usedFallback) fallbackUsed = true
    }

    // Cross-portal deduplication
    allJobs = deduplicateJobs(allJobs)

    // Filter against already-known jobs
    const existingIds = await getExistingExternalIds(userId)
    const newJobs = allJobs.filter(j => !existingIds.has(j.external_id))
    newCount = newJobs.length
    dupCount = allJobs.length - newCount

    // Score + save each new job
    for (const job of newJobs) {
      try {
        const scored = await scoreAndSaveJob(job, profile, userId, fallbackUsed)
        if (scored) scoredCount++
      } catch (err) {
        console.error('Failed to score/save job:', job.title, err)
      }
    }

    await getAdmin()
      .from('automation_logs')
      .update({
        status: 'success',
        jobs_found: allJobs.length,
        jobs_applied: 0,
        completed_at: new Date().toISOString(),
        details: {
          new: newCount,
          duplicates: dupCount,
          scored: scoredCount,
          fallback_filter_used: fallbackUsed,
        },
      })
      .eq('id', log?.id)

    await scheduleFollowUps(userId)

  } catch (err: any) {
    await getAdmin()
      .from('automation_logs')
      .update({ status: 'failed', error: err.message, completed_at: new Date().toISOString() })
      .eq('id', log?.id)
    throw err
  }

  return { found: allJobs.length, new: newCount, duplicates: dupCount, scored: scoredCount, fallbackUsed }
}

// ============================================
// SCRAPE INDIA TRACK
// ============================================
async function scrapeIndia(profile: Profile): Promise<{ jobs: ScrapedJob[], usedFallback: boolean }> {
  const strictConfig = {
    targetRoles: profile.target_roles,
    locations: profile.india_locations || ['Bengaluru', 'Mumbai', 'Remote'],
    region: 'india' as const,
    salaryMin: profile.india_salary_min,
    experienceMin: profile.experience_min,  // e.g. 1
    experienceMax: profile.experience_max,  // e.g. 4
    visaRequired: false,
  }

  const jobs = await runScrapers(profile, strictConfig, ['linkedin', 'naukri', 'indeed'])

  // FALLBACK: if strict filters return nothing, widen experience range
  if (jobs.length === 0 && strictConfig.experienceMax) {
    console.log('India strict filter returned 0 jobs — widening experience range')
    const fallbackConfig = {
      ...strictConfig,
      experienceMax: strictConfig.experienceMax + 2, // widen by 2 years
      _isFallback: true,
    }
    const fallbackJobs = await runScrapers(profile, fallbackConfig, ['linkedin', 'naukri', 'indeed'])
    return { jobs: fallbackJobs.map(j => ({ ...j, _outsidePreference: true })), usedFallback: true }
  }

  return { jobs, usedFallback: false }
}

// ============================================
// SCRAPE IRELAND TRACK
// ============================================
async function scrapeIreland(profile: Profile): Promise<{ jobs: ScrapedJob[], usedFallback: boolean }> {
  const strictConfig = {
    targetRoles: profile.target_roles,
    locations: profile.ireland_locations || ['Dublin', 'Remote'],
    region: 'ireland' as const,
    salaryMin: profile.ireland_salary_min,
    experienceMin: profile.experience_min,
    experienceMax: profile.experience_max,
    visaRequired: profile.visa_sponsorship_required,
  }

  let jobs = await runScrapers(profile, strictConfig, ['linkedin', 'indeed'])

  // Apply visa sponsorship filter for Ireland
  if (profile.visa_sponsorship_required) {
    jobs = jobs.filter(j =>
      j.visa_sponsorship ||
      j.remote_type === 'remote' ||
      /visa|sponsorship|work permit|relocation|stamp/i.test(j.description || '')
    )
  }

  // FALLBACK: if nothing found, widen experience range
  if (jobs.length === 0 && strictConfig.experienceMax) {
    console.log('Ireland strict filter returned 0 jobs — widening experience range')
    const fallbackConfig = {
      ...strictConfig,
      experienceMax: strictConfig.experienceMax + 2,
      _isFallback: true,
    }
    let fallbackJobs = await runScrapers(profile, fallbackConfig, ['linkedin', 'indeed'])
    if (profile.visa_sponsorship_required) {
      fallbackJobs = fallbackJobs.filter(j =>
        j.visa_sponsorship ||
        j.remote_type === 'remote' ||
        /visa|sponsorship|work permit|relocation|stamp/i.test(j.description || '')
      )
    }
    return { jobs: fallbackJobs.map(j => ({ ...j, _outsidePreference: true })), usedFallback: true }
  }

  return { jobs, usedFallback: false }
}

// ============================================
// RUN SCRAPERS
// ============================================
async function runScrapers(profile: Profile, config: any, portals: string[]): Promise<ScrapedJob[]> {
  const enabledPortals = profile.portals || portals
  const jobs: ScrapedJob[] = []

  for (const portal of enabledPortals) {
    try {
      let scraper
      if (portal === 'linkedin') scraper = new LinkedInScraper()
      else if (portal === 'naukri') scraper = new NaukriScraper()
      else if (portal === 'indeed') scraper = new IndeedScraper()
      else continue

      const results = await scraper.scrape(config)
      jobs.push(...results)
    } catch (err) {
      console.error(`Scraper failed for ${portal}:`, err)
      // Continue with other portals — don't let one failure kill the whole run
    }
  }

  return jobs
}

// ============================================
// SCORE + SAVE A JOB
// ============================================
async function scoreAndSaveJob(
  job: ScrapedJob & { _outsidePreference?: boolean },
  profile: Profile,
  userId: string,
  fallbackUsed: boolean
): Promise<boolean> {
  const { data: resumes } = await getAdmin()
    .from('resumes')
    .select('content')
    .eq('user_id', userId)
    .eq('region', job.region)
    .eq('is_base', true)
    .limit(1)

  const resumeContent = resumes?.[0]?.content || ''

  let fitScore = 0
  let fitReasoning = ''
  let jdIntelligence = null

  if (resumeContent && job.description) {
    try {
      const scoreRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: job.description,
          resume: resumeContent,
          region: job.region,
          targetRoles: profile.target_roles,
          skills: profile.skills || [],
        }),
      })
      const scored = await scoreRes.json()
      fitScore = scored.score || 0
      fitReasoning = scored.reasoning || ''

      // Tailor for high-scoring jobs
      if (fitScore >= 7) {
        const isIreland = job.region === 'ireland'
        const tailorRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/tailor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: job.title,
            company: job.company,
            jobDescription: job.description,
            baseResume: resumeContent,
            baseCoverLetter: '',
            region: job.region,
            candidateName: profile.full_name,
            // Cover letter: only auto-generate for Ireland in pipeline
            // India cover letters are never auto-generated (not needed)
            requestCoverLetter: isIreland,
          }),
        })
        const tailored = await tailorRes.json()
        jdIntelligence = tailored.jdIntelligence
      }
    } catch (err) {
      console.error('Scoring failed:', err)
    }
  }

  const freshnessScore = calculateFreshnessScore(job.posted_at)

  const { error } = await getAdmin().from('jobs').insert({
    user_id: userId,
    external_id: job.external_id,
    title: job.title,
    company: job.company,
    company_logo: job.company_logo || getCompanyLogo(job.company),
    location: job.location,
    region: job.region,
    portal: job.portal,
    portal_url: job.portal_url,
    description: job.description,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_currency: job.salary_currency,
    employment_type: job.employment_type,
    remote_type: job.remote_type,
    experience_required: job.experience_required,
    skills_required: job.skills_required,
    visa_sponsorship: job.visa_sponsorship,
    relocation_support: job.relocation_support,
    fit_score: fitScore > 0 ? fitScore : null,
    fit_reasoning: fitReasoning,
    jd_intelligence: jdIntelligence,
    posted_at: job.posted_at,
    status: 'new',
    // NEW fields
    outside_preference: job._outsidePreference || false,  // orange flag in UI
    freshness_score: freshnessScore,
  })

  return !error
}

// ============================================
// HELPERS
// ============================================
async function getExistingExternalIds(userId: string): Promise<Set<string>> {
  const { data } = await getAdmin()
    .from('jobs')
    .select('external_id')
    .eq('user_id', userId)
    .not('external_id', 'is', null)

  return new Set((data || []).map(j => j.external_id))
}

function calculateFreshnessScore(postedAt?: string): number {
  if (!postedAt) return 0.5
  const hoursAgo = (Date.now() - new Date(postedAt).getTime()) / 3600000
  if (hoursAgo < 6) return 1.0
  if (hoursAgo < 24) return 0.8
  if (hoursAgo < 48) return 0.6
  if (hoursAgo < 72) return 0.4
  return 0.2
}

function getCompanyLogo(company: string): string {
  const domain = company.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
  return `https://logo.clearbit.com/${domain}.com`
}

async function scheduleFollowUps(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: dueApps } = await getAdmin()
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['applied', 'viewed'])
    .lt('applied_at', sevenDaysAgo)
    .is('next_followup_at', null)

  if (!dueApps?.length) return

  for (const app of dueApps) {
    await getAdmin()
      .from('applications')
      .update({ next_followup_at: new Date().toISOString() })
      .eq('id', app.id)
  }
}
