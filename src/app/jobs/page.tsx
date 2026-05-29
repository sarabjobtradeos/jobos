'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { Job } from '@/lib/supabase'
import { cn, formatSalary, scoreClass, scoreLabel, portalIcon, regionFlag, timeAgo, truncate } from '@/lib/utils'
import { Filter, Search, Zap, ExternalLink, BookmarkPlus, ChevronDown, Info } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function JobsPage() {
  const { profile } = useStore()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<'all' | 'india' | 'ireland'>('all')
  const [portalFilter, setPortalFilter] = useState<string>('all')
  const [minScore, setMinScore] = useState(0)
  const [applying, setApplying] = useState<string | null>(null)

  useEffect(() => { loadJobs() }, [])

  async function loadJobs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'duplicate')
      .order('fit_score', { ascending: false })
      .order('discovered_at', { ascending: false })
    if (data) setJobs(data)
    setLoading(false)
  }

  async function handleApply(job: Job) {
    setApplying(job.id)
    try {
      // Update job status
      await supabase.from('jobs').update({ status: 'applying' }).eq('id', job.id)
      // Create application record
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('applications').insert({
        user_id: user!.id,
        job_id: job.id,
        portal: job.portal,
        region: job.region,
        status: 'applied',
        next_followup_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'applied' as any } : j))
      toast.success(`Applied to ${job.title} at ${job.company}`)
    } catch {
      toast.error('Apply failed — please try again')
    }
    setApplying(null)
  }

  const filtered = jobs.filter(j => {
    if (regionFilter !== 'all' && j.region !== regionFilter) return false
    if (portalFilter !== 'all' && j.portal !== portalFilter) return false
    if (j.fit_score && j.fit_score < minScore) return false
    if (search) {
      const q = search.toLowerCase()
      return j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
    }
    return true
  })

  const newCount = jobs.filter(j => j.status === 'new').length

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Job Matches</h1>
            <p className="text-sm text-gray-500">{newCount} new · {jobs.length} total discovered</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-8 py-1.5 text-xs"
            />
          </div>
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value as any)}
            className="input py-1.5 text-xs w-auto"
          >
            <option value="all">🌍 All regions</option>
            <option value="india">🇮🇳 India</option>
            <option value="ireland">🇮🇪 Ireland</option>
          </select>
          <select
            value={portalFilter}
            onChange={e => setPortalFilter(e.target.value)}
            className="input py-1.5 text-xs w-auto"
          >
            <option value="all">All portals</option>
            <option value="linkedin">LinkedIn</option>
            <option value="naukri">Naukri</option>
            <option value="indeed">Indeed</option>
            <option value="glassdoor">Glassdoor</option>
          </select>
          <select
            value={minScore}
            onChange={e => setMinScore(Number(e.target.value))}
            className="input py-1.5 text-xs w-auto"
          >
            <option value={0}>Any score</option>
            <option value={7}>7+ score</option>
            <option value={8}>8+ score</option>
            <option value={9}>9+ score</option>
          </select>
        </div>

        {/* Jobs list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-400 text-sm">No jobs match your filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(job => (
              <div key={job.id} className={cn(
                'card p-4 transition-all hover:shadow-md',
                job.status === 'applied' && 'opacity-60'
              )}>
                <div className="flex items-start gap-3">
                  {/* Company logo */}
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                    {job.company_logo
                      ? <img src={job.company_logo} alt={job.company} className="w-full h-full object-contain" />
                      : job.company[0]
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-gray-900 hover:text-brand-600">
                          {job.title}
                        </Link>
                        <div className="text-xs text-gray-500 mt-0.5">{job.company} · {job.location}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {job.fit_score && (
                          <span className={cn('badge text-xs font-mono font-semibold', scoreClass(job.fit_score))}>
                            {job.fit_score}/10
                          </span>
                        )}
                        <span className="text-lg">{regionFlag(job.region)}</span>
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {portalIcon(job.portal)} {job.portal}
                      </span>
                      {job.remote_type && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {job.remote_type}
                        </span>
                      )}
                      {job.salary_min && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                        </span>
                      )}
                      {job.visa_sponsorship && (
                        <span className="text-[10px] bg-ireland-50 text-ireland-600 px-2 py-0.5 rounded-full">
                          🛂 Visa sponsorship
                        </span>
                      )}
                      {job.skills_required?.slice(0, 3).map(s => (
                        <span key={s} className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>

                    {/* JD intelligence */}
                    {job.jd_intelligence && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-700">They want: </span>
                        {job.jd_intelligence.what_they_want}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-gray-400">{timeAgo(job.discovered_at)}</span>
                      <div className="flex items-center gap-2">
                        {job.portal_url && (
                          <a href={job.portal_url} target="_blank" rel="noopener" className="btn-ghost text-xs px-2 py-1">
                            <ExternalLink size={11} /> View JD
                          </a>
                        )}
                        <Link href={`/jobs/${job.id}`} className="btn-outline text-xs px-2 py-1">
                          Details
                        </Link>
                        {job.status !== 'applied' ? (
                          <button
                            onClick={() => handleApply(job)}
                            disabled={applying === job.id}
                            className="btn-brand text-xs px-3 py-1 disabled:opacity-70"
                          >
                            <Zap size={11} />
                            {applying === job.id ? 'Applying...' : 'Auto-apply'}
                          </button>
                        ) : (
                          <span className="text-xs text-brand-600 font-medium flex items-center gap-1">
                            <CheckIcon /> Applied
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
