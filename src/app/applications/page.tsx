'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { Application } from '@/lib/supabase'
import { cn, formatDate, statusColor, statusLabel, regionFlag, portalIcon, scoreClass } from '@/lib/utils'
import { Search, Calendar, ChevronRight, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const STATUSES = [
  'all', 'applied', 'viewed', 'under_review', 'shortlisted',
  'interview_scheduled', 'interview_done', 'offer', 'rejected', 'ghosted'
]

export default function ApplicationsPage() {
  const { applications, setApplications } = useStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState<'all'|'india'|'ireland'>('all')
  const [updatingId, setUpdatingId] = useState<string|null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('applications')
      .select('*, job:jobs(*)')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false })
    if (data) setApplications(data)
    setLoading(false)
  }

  async function updateStatus(app: Application, newStatus: string) {
    setUpdatingId(app.id)
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus, last_updated: new Date().toISOString() })
      .eq('id', app.id)
    if (!error) {
      setApplications(applications.map(a =>
        a.id === app.id ? { ...a, status: newStatus as any } : a
      ))
      toast.success('Status updated')
    }
    setUpdatingId(null)
  }

  const filtered = applications.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (regionFilter !== 'all' && a.region !== regionFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return a.job?.title?.toLowerCase().includes(q) || a.job?.company?.toLowerCase().includes(q)
    }
    return true
  })

  // Funnel counts
  const funnelStages = [
    { key: 'applied', label: 'Applied', count: applications.length },
    { key: 'viewed', label: 'Viewed', count: applications.filter(a => ['viewed','under_review','shortlisted','interview_scheduled','interview_done','offer'].includes(a.status)).length },
    { key: 'interview_scheduled', label: 'Interview', count: applications.filter(a => ['interview_scheduled','interview_done','offer'].includes(a.status)).length },
    { key: 'offer', label: 'Offer', count: applications.filter(a => a.status === 'offer').length },
  ]

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500">{applications.length} total · {applications.filter(a=>a.status==='applied').length} awaiting response</p>
        </div>

        {/* Funnel */}
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Conversion funnel</h2>
          <div className="flex gap-2 items-end">
            {funnelStages.map((stage, i) => {
              const pct = funnelStages[0].count > 0 ? (stage.count / funnelStages[0].count) * 100 : 0
              return (
                <div key={stage.key} className="flex-1 text-center">
                  <div className="text-lg font-semibold font-mono text-gray-900">{stage.count}</div>
                  <div className="h-2 rounded-full bg-gray-100 mt-1 mb-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500">{stage.label}</div>
                  {i < funnelStages.length - 1 && (
                    <div className="text-[10px] text-gray-400 mt-0.5">{Math.round(pct)}%</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search company or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-8 py-1.5 text-xs"
            />
          </div>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value as any)} className="input py-1.5 text-xs w-auto">
            <option value="all">All regions</option>
            <option value="india">🇮🇳 India</option>
            <option value="ireland">🇮🇪 Ireland</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input py-1.5 text-xs w-auto">
            {STATUSES.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All statuses' : statusLabel(s)}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm text-gray-400">No applications found</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-2.5">Role / Company</th>
                    <th className="text-left text-[11px] font-medium text-gray-400 px-3 py-2.5 hidden sm:table-cell">Track</th>
                    <th className="text-left text-[11px] font-medium text-gray-400 px-3 py-2.5 hidden md:table-cell">Applied</th>
                    <th className="text-left text-[11px] font-medium text-gray-400 px-3 py-2.5">Status</th>
                    <th className="text-left text-[11px] font-medium text-gray-400 px-3 py-2.5 hidden lg:table-cell">Score</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(app => (
                    <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{app.job?.title}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[180px]">{app.job?.company}</div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <span>{regionFlag(app.region)}</span>
                          <span className="text-[10px] text-gray-400">{portalIcon(app.portal)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-500">{formatDate(app.applied_at)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={app.status}
                          onChange={e => updateStatus(app, e.target.value)}
                          disabled={updatingId === app.id}
                          className={cn(
                            'text-[11px] font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-1 focus:ring-brand-400',
                            statusColor(app.status)
                          )}
                        >
                          {STATUSES.slice(1).map(s => (
                            <option key={s} value={s}>{statusLabel(s)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        {app.job?.fit_score && (
                          <span className={cn('badge text-[11px] font-mono', scoreClass(app.job.fit_score))}>
                            {app.job.fit_score}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/applications/${app.id}`} className="text-[11px] text-brand-600 hover:text-brand-700">
                          Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
