'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { Job } from '@/lib/supabase'
import { cn, formatSalary, scoreClass, scoreLabel, portalIcon, regionFlag, timeAgo, formatDate } from '@/lib/utils'
import {
  ArrowLeft, ExternalLink, Zap, BookOpen, Star,
  AlertTriangle, CheckCircle2, Building2, Globe, Users,
  TrendingUp, Lightbulb, Clock, MapPin, Briefcase
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function JobDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [prepLoading, setPrepLoading] = useState(false)
  const [prep, setPrep] = useState<any>(null)
  const [tab, setTab] = useState<'overview' | 'company' | 'prep'>('overview')

  useEffect(() => { loadJob() }, [id])

  async function loadJob() {
    const { data } = await supabase.from('jobs').select('*').eq('id', id).single()
    if (data) setJob(data)
    setLoading(false)
  }

  async function handleApply() {
    if (!job) return
    setApplying(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('jobs').update({ status: 'applying' }).eq('id', job.id)
      await supabase.from('applications').insert({
        user_id: user!.id,
        job_id: job.id,
        portal: job.portal,
        region: job.region,
        status: 'applied',
        next_followup_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      setJob(prev => prev ? { ...prev, status: 'applied' as any } : null)
      toast.success(`Applied to ${job.title} at ${job.company}!`)
    } catch {
      toast.error('Apply failed')
    }
    setApplying(false)
  }

  async function loadInterviewPrep() {
    if (!job) return
    setPrepLoading(true)
    try {
      const res = await fetch('/api/ai/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
          resume: '',
          companyNews: job.company_news ? JSON.stringify(job.company_news) : '',
        }),
      })
      const data = await res.json()
      setPrep(data)
      setTab('prep')
    } catch {
      toast.error('Could not generate prep card')
    }
    setPrepLoading(false)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <div className="skeleton h-8 w-48 rounded-lg" />
          <div className="skeleton h-40 rounded-xl" />
          <div className="skeleton h-60 rounded-xl" />
        </div>
      </AppLayout>
    )
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-gray-400">Job not found</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Back to jobs
        </button>

        {/* Header card */}
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
              {job.company_logo
                ? <img src={job.company_logo} alt={job.company} className="w-full h-full object-contain" />
                : job.company[0]
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-base font-semibold text-gray-900">{job.title}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{job.company}</p>
                </div>
                {job.fit_score && (
                  <div className="text-right flex-shrink-0">
                    <span className={cn('badge text-sm font-mono font-semibold px-3 py-1', scoreClass(job.fit_score))}>
                      {job.fit_score}/10
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">{scoreLabel(job.fit_score)}</p>
                  </div>
                )}
              </div>

              {/* Meta tags */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={11} /> {job.location}
                </span>
                {job.remote_type && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Globe size={11} /> {job.remote_type}
                  </span>
                )}
                {job.employment_type && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Briefcase size={11} /> {job.employment_type}
                  </span>
                )}
                <span className="text-xs text-gray-500">{regionFlag(job.region)}</span>
                <span className="text-xs text-gray-500">{portalIcon(job.portal)} {job.portal}</span>
                {job.posted_at && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={11} /> Posted {timeAgo(job.posted_at)}
                  </span>
                )}
              </div>

              {/* Salary */}
              {job.salary_min && (
                <div className="mt-2 text-sm font-medium text-gray-800">
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                  <span className="text-xs text-gray-400 font-normal ml-1">/ year</span>
                </div>
              )}

              {/* Visa badge */}
              {job.visa_sponsorship && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs bg-ireland-50 text-ireland-600 px-2 py-1 rounded-full">
                  🛂 Visa sponsorship available
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            {job.status !== 'applied' ? (
              <button onClick={handleApply} disabled={applying} className="btn-brand flex-1 py-2">
                <Zap size={14} /> {applying ? 'Applying...' : 'Auto-apply now'}
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-brand-600 font-medium bg-brand-50 rounded-lg">
                <CheckCircle2 size={15} /> Applied
              </div>
            )}
            {job.portal_url && (
              <a href={job.portal_url} target="_blank" rel="noopener" className="btn-outline px-3 py-2">
                <ExternalLink size={14} /> View on {job.portal}
              </a>
            )}
            <button
              onClick={loadInterviewPrep}
              disabled={prepLoading}
              className="btn-outline px-3 py-2"
            >
              <BookOpen size={14} /> {prepLoading ? 'Loading...' : 'Prep card'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'company', label: 'Company' },
            { key: 'prep', label: 'Interview Prep' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {tab === 'overview' && (
          <div className="space-y-3">
            {/* JD Intelligence */}
            {job.jd_intelligence && (
              <div className="card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Lightbulb size={14} className="text-brand-500" /> AI Intelligence
                </h2>
                <div className="space-y-2">
                  <div className="bg-brand-50 rounded-lg p-3">
                    <p className="text-[11px] font-semibold text-brand-700 uppercase tracking-wide mb-1">What they really want</p>
                    <p className="text-sm text-gray-700">{job.jd_intelligence.what_they_want}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Lead with this</p>
                    <p className="text-sm text-gray-700">{job.jd_intelligence.lead_with}</p>
                  </div>
                  {job.jd_intelligence.red_flags?.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <AlertTriangle size={10} /> Red flags
                      </p>
                      <ul className="space-y-1">
                        {job.jd_intelligence.red_flags.map((f, i) => (
                          <li key={i} className="text-sm text-red-700">• {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Skills required */}
            {job.skills_required?.length > 0 && (
              <div className="card p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Skills Required</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills_required.map(s => (
                    <span key={s} className="badge badge-brand">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Full JD */}
            {job.description && (
              <div className="card p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Job Description</h2>
                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Company */}
        {tab === 'company' && (
          <div className="space-y-3">
            <div className="card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <Building2 size={14} /> {job.company}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {job.glassdoor_rating && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-semibold text-gray-900 font-mono">{job.glassdoor_rating}</div>
                    <div className="text-xs text-gray-500">Glassdoor rating</div>
                    <div className="flex justify-center mt-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={10} className={s <= Math.round(job.glassdoor_rating!) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                      ))}
                    </div>
                  </div>
                )}
                {job.company_size && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-gray-900">{job.company_size}</div>
                    <div className="text-xs text-gray-500 mt-1">Company size</div>
                  </div>
                )}
                {job.company_industry && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center col-span-2">
                    <div className="text-sm font-semibold text-gray-900">{job.company_industry}</div>
                    <div className="text-xs text-gray-500 mt-1">Industry</div>
                  </div>
                )}
              </div>

              {/* Referral connections */}
              {job.referral_connections && job.referral_connections.length > 0 && (
                <div className="bg-brand-50 rounded-lg p-3">
                  <p className="text-[11px] font-semibold text-brand-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Users size={10} /> You have connections here
                  </p>
                  {job.referral_connections.map((c: any, i: number) => (
                    <div key={i} className="text-sm text-gray-700">• {c.name} — {c.title}</div>
                  ))}
                  <p className="text-xs text-brand-600 mt-2">Ask for a referral — 10× better response rate</p>
                </div>
              )}

              {/* Company news */}
              {job.company_news && job.company_news.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent news</p>
                  <div className="space-y-2">
                    {job.company_news.map((n: any, i: number) => (
                      <div key={i} className="text-sm text-gray-700 border-l-2 border-gray-200 pl-3">{n.headline}</div>
                    ))}
                  </div>
                </div>
              )}

              {!job.glassdoor_rating && !job.company_news && (
                <p className="text-sm text-gray-400 text-center py-4">Company research will be pulled automatically when job is discovered</p>
              )}
            </div>
          </div>
        )}

        {/* Tab: Interview Prep */}
        {tab === 'prep' && (
          <div className="space-y-3">
            {!prep ? (
              <div className="card p-8 text-center">
                <BookOpen size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400 mb-3">Generate your personalised interview prep card</p>
                <button onClick={loadInterviewPrep} disabled={prepLoading} className="btn-brand text-sm px-4 py-2">
                  {prepLoading ? 'Generating...' : 'Generate prep card'}
                </button>
              </div>
            ) : (
              <>
                <div className="card p-4">
                  <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-brand-500" /> Lead with this
                  </h2>
                  <div className="bg-brand-50 rounded-lg p-3 text-sm text-brand-800 font-medium">
                    {prep.lead_with}
                  </div>
                </div>

                <div className="card p-4">
                  <h2 className="text-sm font-semibold text-gray-800 mb-3">Likely interview questions</h2>
                  <div className="space-y-2">
                    {prep.likely_questions?.map((q: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg">
                        <span className="text-xs font-mono text-gray-400 mt-0.5 flex-shrink-0">Q{i+1}</span>
                        <p className="text-sm text-gray-700">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-4">
                  <h2 className="text-sm font-semibold text-gray-800 mb-2">Company insight</h2>
                  <p className="text-sm text-gray-600">{prep.company_insight}</p>
                </div>

                <div className="card p-4">
                  <h2 className="text-sm font-semibold text-gray-800 mb-3">Talking points & smart questions</h2>
                  <div className="space-y-2">
                    {prep.talking_points?.map((p: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-brand-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
