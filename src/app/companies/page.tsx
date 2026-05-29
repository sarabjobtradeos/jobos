'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Building2, Search, Star, RefreshCw, ExternalLink, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

interface Company {
  name: string
  logo?: string
  industry?: string
  size?: string
  glassdoor_rating?: number
  applications: number
  interviews: number
  region: string
  news?: any[]
  culture?: string
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [researching, setResearching] = useState<string | null>(null)
  const [researchData, setResearchData] = useState<Record<string, any>>({})
  const [coldEmail, setColdEmail] = useState<Record<string, any>>({})
  const [emailLoading, setEmailLoading] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Aggregate companies from applications
    const { data: apps } = await supabase
      .from('applications')
      .select('*, job:jobs(company, company_logo, company_industry, company_size, glassdoor_rating, region, company_news)')
      .eq('user_id', user.id)

    if (!apps) { setLoading(false); return }

    const companyMap = new Map<string, Company>()
    apps.forEach(app => {
      const name = app.job?.company
      if (!name) return
      if (!companyMap.has(name)) {
        companyMap.set(name, {
          name,
          logo: app.job?.company_logo,
          industry: app.job?.company_industry,
          size: app.job?.company_size,
          glassdoor_rating: app.job?.glassdoor_rating,
          applications: 0,
          interviews: 0,
          region: app.job?.region || 'india',
          news: app.job?.company_news,
        })
      }
      const c = companyMap.get(name)!
      c.applications++
      if (['interview_scheduled', 'interview_done', 'offer'].includes(app.status)) c.interviews++
    })

    setCompanies(Array.from(companyMap.values()).sort((a, b) => b.applications - a.applications))
    setLoading(false)
  }

  async function researchCompany(company: Company) {
    setResearching(company.name)
    try {
      const res = await fetch('/api/company/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.name }),
      })
      const data = await res.json()
      setResearchData(prev => ({ ...prev, [company.name]: data }))
      toast.success(`Research loaded for ${company.name}`)
    } catch {
      toast.error('Research failed')
    }
    setResearching(null)
  }

  async function generateColdEmail(company: Company) {
    setEmailLoading(company.name)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name, background_summary').eq('id', user!.id).single()
    try {
      const res = await fetch('/api/ai/cold-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: 'relevant role',
          company: company.name,
          candidateName: profile?.full_name || '',
          candidateBackground: profile?.background_summary || '',
          region: company.region,
        }),
      })
      const data = await res.json()
      setColdEmail(prev => ({ ...prev, [company.name]: data }))
    } catch {
      toast.error('Email generation failed')
    }
    setEmailLoading(null)
  }

  const filtered = companies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500">{companies.length} companies you've applied to</p>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="input pl-9 text-sm"
          />
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Building2 size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No companies yet — start applying!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(company => {
              const research = researchData[company.name]
              const email = coldEmail[company.name]
              return (
                <div key={company.name} className="card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                      {company.logo
                        ? <img src={company.logo} alt={company.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        : company.name[0]
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-gray-900">{company.name}</h2>
                        <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-gray-500">
                          <span>{company.applications} applied</span>
                          {company.interviews > 0 && <span className="text-brand-600">· {company.interviews} interview{company.interviews > 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {(research?.company_industry || company.industry) && (
                          <span className="text-xs text-gray-400">{research?.company_industry || company.industry}</span>
                        )}
                        {(research?.company_size || company.size) && (
                          <span className="text-xs text-gray-400">· {research?.company_size || company.size}</span>
                        )}
                        {(research?.glassdoor_rating || company.glassdoor_rating) && (
                          <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                            <Star size={10} className="fill-yellow-400 text-yellow-400" />
                            {research?.glassdoor_rating || company.glassdoor_rating}
                          </span>
                        )}
                      </div>
                      {research?.culture_summary && (
                        <p className="text-xs text-gray-500 mt-1.5 italic">"{research.culture_summary}"</p>
                      )}
                    </div>
                  </div>

                  {/* Company news */}
                  {(research?.company_news || company.news)?.length > 0 && (
                    <div className="space-y-1">
                      {(research?.company_news || company.news).slice(0, 2).map((n: any, i: number) => (
                        <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                          📰 {n.headline}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cold email */}
                  {email && (
                    <div className="bg-brand-50 rounded-xl p-3 space-y-2">
                      <p className="text-[11px] font-semibold text-brand-700 uppercase tracking-wide">LinkedIn cold message</p>
                      <p className="text-xs text-gray-700">{email.linkedin_message}</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(email.linkedin_message); toast.success('Copied!') }}
                        className="text-[11px] text-brand-600 hover:text-brand-700"
                      >
                        Copy message →
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => researchCompany(company)}
                      disabled={researching === company.name}
                      className="btn-outline text-xs px-2.5 py-1.5"
                    >
                      <RefreshCw size={11} className={researching === company.name ? 'animate-spin' : ''} />
                      {researching === company.name ? 'Researching...' : 'Research'}
                    </button>
                    <button
                      onClick={() => generateColdEmail(company)}
                      disabled={emailLoading === company.name}
                      className="btn-outline text-xs px-2.5 py-1.5"
                    >
                      <Mail size={11} />
                      {emailLoading === company.name ? 'Drafting...' : 'Cold email'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
