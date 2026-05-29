// ============================================
// BASE SCRAPER — all portal scrapers extend this
// ============================================

export interface ScrapedJob {
  external_id: string
  title: string
  company: string
  company_logo?: string
  location: string
  region: 'india' | 'ireland' | 'global'
  portal: 'linkedin' | 'naukri' | 'indeed' | 'glassdoor'
  portal_url: string
  description: string
  salary_min?: number
  salary_max?: number
  salary_currency: string
  employment_type?: string
  remote_type?: string
  experience_required?: string
  skills_required: string[]
  visa_sponsorship: boolean
  relocation_support: boolean
  posted_at?: string
}

export interface ScraperConfig {
  targetRoles: string[]
  locations: string[]
  region: 'india' | 'ireland'
  salaryMin?: number
  experienceLevel?: string
  visaRequired?: boolean
}

export abstract class BaseScaper {
  abstract name: string
  abstract scrape(config: ScraperConfig): Promise<ScrapedJob[]>

  protected parseINRSalary(text: string): { min?: number; max?: number } {
    if (!text) return {}
    // Match patterns like "15-25 LPA", "₹20L", "20,00,000"
    const lpaMatch = text.match(/(\d+(?:\.\d+)?)\s*[-–to]\s*(\d+(?:\.\d+)?)\s*(?:LPA|lpa|L\/A|lakh)/i)
    if (lpaMatch) return { min: parseFloat(lpaMatch[1]) * 100000, max: parseFloat(lpaMatch[2]) * 100000 }
    const singleLpa = text.match(/(\d+(?:\.\d+)?)\s*(?:LPA|lpa|L)/i)
    if (singleLpa) return { min: parseFloat(singleLpa[1]) * 100000 }
    return {}
  }

  protected parseEURSalary(text: string): { min?: number; max?: number } {
    if (!text) return {}
    const match = text.match(/€?\s*(\d+(?:,\d+)?(?:k|K)?)\s*[-–to]\s*€?\s*(\d+(?:,\d+)?(?:k|K)?)/i)
    if (match) {
      const parse = (s: string) => {
        const n = parseFloat(s.replace(/,/g, ''))
        return s.toLowerCase().includes('k') ? n * 1000 : n
      }
      return { min: parse(match[1]), max: parse(match[2]) }
    }
    return {}
  }

  protected extractSkills(text: string): string[] {
    const commonSkills = [
      'React', 'Next.js', 'TypeScript', 'JavaScript', 'Python', 'Node.js',
      'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
      'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'AWS', 'GCP', 'Azure',
      'Docker', 'Kubernetes', 'Git', 'REST API', 'GraphQL',
      'Product Design', 'UX Research', 'Design Systems', 'Prototyping',
      'User Testing', 'Wireframing', 'A/B Testing', 'Agile', 'Scrum',
      'Leadership', 'Communication', 'Problem Solving',
      'Machine Learning', 'AI', 'TensorFlow', 'PyTorch',
      'Java', 'Go', 'Rust', 'Swift', 'Kotlin', 'Flutter', 'React Native',
    ]
    return commonSkills.filter(skill =>
      new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
    )
  }

  protected hasVisaSponsorship(text: string): boolean {
    return /visa\s*(sponsor|support|assistance)|sponsor.*visa|work\s*permit|relocation\s*support/i.test(text)
  }

  protected detectRemoteType(text: string): 'remote' | 'hybrid' | 'onsite' | undefined {
    if (/\bfully\s*remote\b|\bwork\s*from\s*home\b|\bwfh\b/i.test(text)) return 'remote'
    if (/\bhybrid\b/i.test(text)) return 'hybrid'
    if (/\bon[\s-]?site\b|\bin[\s-]?office\b/i.test(text)) return 'onsite'
    return undefined
  }
}

// ============================================
// LINKEDIN SCRAPER
// Uses LinkedIn Jobs API / public search
// ============================================
export class LinkedInScraper extends BaseScaper {
  name = 'linkedin'

  async scrape(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []

    for (const role of config.targetRoles) {
      for (const location of config.locations) {
        try {
          const results = await this.searchLinkedIn(role, location, config)
          jobs.push(...results)
          await sleep(2000) // be respectful
        } catch (err) {
          console.error(`LinkedIn scrape failed for ${role} in ${location}:`, err)
        }
      }
    }

    return deduplicateJobs(jobs)
  }

  private async searchLinkedIn(role: string, location: string, config: ScraperConfig): Promise<ScrapedJob[]> {
    // LinkedIn public jobs search URL
    const params = new URLSearchParams({
      keywords: role,
      location: location,
      f_TPR: 'r86400', // last 24 hours
      f_WT: config.region === 'ireland' ? '2' : '', // remote
    })

    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}&start=0`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!response.ok) return []
    const html = await response.text()
    return this.parseLinkedInHTML(html, config.region)
  }

  private parseLinkedInHTML(html: string, region: 'india' | 'ireland'): ScrapedJob[] {
    const jobs: ScrapedJob[] = []

    // Extract job cards from LinkedIn HTML
    const jobPattern = /<div[^>]*data-job-id="(\d+)"[^>]*>([\s\S]*?)<\/div>/g
    const titlePattern = /<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/
    const companyPattern = /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/
    const locationPattern = /<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/

    let match
    while ((match = jobPattern.exec(html)) !== null) {
      const jobId = match[1]
      const card = match[2]

      const title = titlePattern.exec(card)?.[1]?.replace(/<[^>]+>/g, '').trim()
      const company = companyPattern.exec(card)?.[1]?.replace(/<[^>]+>/g, '').trim()
      const location = locationPattern.exec(card)?.[1]?.replace(/<[^>]+>/g, '').trim()

      if (!title || !company) continue

      jobs.push({
        external_id: `linkedin_${jobId}`,
        title,
        company,
        location: location || '',
        region,
        portal: 'linkedin',
        portal_url: `https://www.linkedin.com/jobs/view/${jobId}`,
        description: '',
        salary_currency: region === 'ireland' ? 'EUR' : 'INR',
        skills_required: [],
        visa_sponsorship: false,
        relocation_support: false,
        employment_type: 'full-time',
      })
    }

    return jobs
  }
}

// ============================================
// NAUKRI SCRAPER (India only)
// ============================================
export class NaukriScraper extends BaseScaper {
  name = 'naukri'

  async scrape(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []

    for (const role of config.targetRoles) {
      try {
        const results = await this.searchNaukri(role, config)
        jobs.push(...results)
        await sleep(2500)
      } catch (err) {
        console.error(`Naukri scrape failed for ${role}:`, err)
      }
    }

    return deduplicateJobs(jobs)
  }

  private async searchNaukri(role: string, config: ScraperConfig): Promise<ScrapedJob[]> {
    const keyword = encodeURIComponent(role)
    const locations = config.locations.filter(l => l !== 'Remote').join('%2C')
    const url = `https://www.naukri.com/jobapi/v3/search?noOfResults=20&urlType=search_by_keyword&searchType=adv&keyword=${keyword}&location=${locations}&experience=${config.experienceLevel === 'senior' ? '5' : '2'}&pageNo=1&myNaukri=false&location=${locations}&keywordSuggestions=&locationSuggestions=`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json',
        'Appid': '109',
        'Systemid': 'Naukri',
      },
    })

    if (!response.ok) return []

    try {
      const data = await response.json()
      const jobList = data?.jobDetails || []

      return jobList.map((job: any) => {
        const salary = this.parseINRSalary(job.salary || '')
        return {
          external_id: `naukri_${job.jobId}`,
          title: job.title || '',
          company: job.companyName || '',
          company_logo: job.logoPath,
          location: job.placeholders?.find((p: any) => p.type === 'location')?.label || '',
          region: 'india' as const,
          portal: 'naukri' as const,
          portal_url: `https://www.naukri.com${job.jdURL}`,
          description: job.jobDescription || '',
          salary_min: salary.min,
          salary_max: salary.max,
          salary_currency: 'INR',
          employment_type: 'full-time',
          remote_type: this.detectRemoteType(job.jobDescription || ''),
          experience_required: job.placeholders?.find((p: any) => p.type === 'experience')?.label,
          skills_required: this.extractSkills(job.jobDescription || ''),
          visa_sponsorship: false,
          relocation_support: false,
          posted_at: job.createdDate,
        }
      })
    } catch {
      return []
    }
  }
}

// ============================================
// INDEED SCRAPER
// ============================================
export class IndeedScraper extends BaseScaper {
  name = 'indeed'

  async scrape(config: ScraperConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const domain = config.region === 'ireland' ? 'ie.indeed.com' : 'in.indeed.com'

    for (const role of config.targetRoles) {
      for (const location of config.locations.slice(0, 2)) {
        try {
          const results = await this.searchIndeed(role, location, domain, config.region)
          jobs.push(...results)
          await sleep(3000)
        } catch (err) {
          console.error(`Indeed scrape failed:`, err)
        }
      }
    }

    return deduplicateJobs(jobs)
  }

  private async searchIndeed(role: string, location: string, domain: string, region: 'india' | 'ireland'): Promise<ScrapedJob[]> {
    const url = `https://${domain}/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(location)}&fromage=1&sort=date`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!response.ok) return []
    const html = await response.text()
    return this.parseIndeedHTML(html, region)
  }

  private parseIndeedHTML(html: string, region: 'india' | 'ireland'): ScrapedJob[] {
    const jobs: ScrapedJob[] = []

    // Extract JSON data embedded in page
    const jsonMatch = html.match(/window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*({[\s\S]*?});/)
    if (!jsonMatch) return []

    try {
      const data = JSON.parse(jsonMatch[1])
      const results = data?.metaData?.mosaicProviderJobCardsModel?.results || []

      results.forEach((job: any) => {
        const salary = region === 'ireland'
          ? this.parseEURSalary(job.extractedSalary?.text || '')
          : this.parseINRSalary(job.extractedSalary?.text || '')

        jobs.push({
          external_id: `indeed_${job.jobkey}`,
          title: job.title || '',
          company: job.company || '',
          location: job.formattedLocation || '',
          region,
          portal: 'indeed',
          portal_url: `https://indeed.com/viewjob?jk=${job.jobkey}`,
          description: job.snippet || '',
          salary_min: salary.min,
          salary_max: salary.max,
          salary_currency: region === 'ireland' ? 'EUR' : 'INR',
          employment_type: job.jobTypes?.[0] || 'full-time',
          remote_type: this.detectRemoteType(job.title + ' ' + job.snippet),
          skills_required: this.extractSkills(job.snippet || ''),
          visa_sponsorship: this.hasVisaSponsorship(job.snippet || ''),
          relocation_support: false,
          posted_at: job.pubDate ? new Date(job.pubDate).toISOString() : undefined,
        })
      })
    } catch { /* parse error */ }

    return jobs
  }
}

// ============================================
// HELPERS
// ============================================
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function deduplicateJobs(jobs: ScrapedJob[]): ScrapedJob[] {
  const seen = new Map<string, ScrapedJob>()

  for (const job of jobs) {
    // Fingerprint: normalised title + company
    const fp = `${job.title.toLowerCase().replace(/[^a-z0-9]/g, '')}_${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    if (!seen.has(fp)) seen.set(fp, job)
  }

  return Array.from(seen.values())
}
