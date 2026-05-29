'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import AppLayout from '@/components/AppLayout'
import { formatSalary, formatDate, scoreClass, statusColor, statusLabel, portalIcon, regionFlag, timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  TrendingUp, Zap, RefreshCw, ChevronRight, ExternalLink,
  Calendar, AlertCircle, CheckCircle2, Clock, Target
} from 'lucide-react'
import Link from 'next/link'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts'

export default function DashboardPage() {
  const { profile, stats, applications, jobs, setJobs, setApplications, isScanning } = useStore()
  const [loading, setLoading] = useState(true)
  const [heatmapData, setHeatmapData] = useState<number[][]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [lastScan, setLastScan] = useState<any>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load applications with job details
    const { data: apps } = await supabase
      .from('applications')
      .select('*, job:jobs(*)')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false })

    if (apps) setApplications(apps)

    // Load today's jobs
    const today = new Date(); today.setHours(0,0,0,0)
    const { data: todayJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'new')
      .gte('discovered_at', today.toISOString())
      .order('fit_score', { ascending: false })
      .limit(5)

    if (todayJobs) setJobs(todayJobs)

    // Load last automation log
    const { data: log } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()
    if (log) setLastScan(log)

    // Generate heatmap data (last 10 weeks × 7 days)
    buildHeatmap(apps || [])
    buildWeeklyChart(apps || [])
    setLoading(false)
  }

  function buildHeatmap(apps: any[]) {
    const grid: number[][] = Array(3).fill(null).map(() => Array(10).fill(0))
    apps.forEach(app => {
      const d = new Date(app.applied_at)
      const dayOfWeek = d.getDay()
      const weeksAgo = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000))
      if (weeksAgo < 10 && [1,3,5].includes(dayOfWeek)) {
        const row = [1,3,5].indexOf(dayOfWeek)
        const col = 9 - weeksAgo
        if (col >= 0) grid[row][col]++
      }
    })
    setHeatmapData(grid)
  }

  function buildWeeklyChart(apps: any[]) {
    const weeks: Record<string, { india: number; ireland: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en', { weekday: 'short' })
      weeks[key] = { india: 0, ireland: 0 }
    }
    apps.forEach(app => {
      const d = new Date(app.applied_at)
      const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000)
      if (daysAgo <= 6) {
        const key = d.toLocaleDateString('en', { weekday: 'short' })
        if (weeks[key]) weeks[key][app.region as 'india' | 'ireland']++
      }
    })
    setWeeklyData(Object.entries(weeks).map(([day, v]) => ({ day, ...v })))
  }

  const heatColors = ['#F3F4F6', '#9FE1CB', '#5DCAA5', '#1D9E75', '#085041']
  const topJobs = jobs.filter(j => j.status === 'new').slice(0, 4)
  const recentApps = applications.slice(0, 5)
  const followupsDue = applications.filter(a =>
    a.next_followup_at && new Date(a.next_followup_at) <= new Date()
  )

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
              {profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {lastScan
                ? `Last scan ${timeAgo(lastScan.started_at)} · ${lastScan.jobs_found} jobs found`
                : 'Set up your profile to start automated scanning'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isScanning && (
              <div className="flex items-center gap-1.5 text-xs text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full">
                <RefreshCw size={11} className="animate-spin" />
                Scanning...
              </div>
            )}
            <Link href="/jobs" className="btn-brand text-xs px-3 py-1.5">
              <Zap size={13} /> View matches
            </Link>
          </div>
        </div>

        {/* Setup banner if no profile */}
        {!profile?.full_name && (
          <div className="card p-4 border-brand-200 bg-brand-50 flex items-center gap-3">
            <AlertCircle size={18} className="text-brand-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-800">Complete your profile to activate automation</p>
              <p className="text-xs text-brand-600 mt-0.5">Add your details, upload resumes, and connect portals</p>
            </div>
            <Link href="/profile" className="btn-brand text-xs px-3 py-1.5 flex-shrink-0">
              Set up now
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Applied', value: stats.totalApplied, sub: `🇮🇳 ${stats.indiaApplied} · 🇮🇪 ${stats.irelandApplied}`, color: 'text-gray-900' },
            { label: 'In Review', value: stats.inReview, sub: 'active pipeline', color: 'text-brand-600' },
            { label: 'Interviews', value: stats.interviews, sub: stats.offers > 0 ? `${stats.offers} offer${stats.offers > 1 ? 's' : ''}` : 'keep going', color: 'text-india-600' },
            { label: 'Response Rate', value: `${stats.responseRate}%`, sub: `avg fit ${stats.avgFitScore}/10`, color: 'text-gray-900' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className={cn('text-2xl font-semibold font-mono tracking-tight', s.color)}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Middle row: job matches + recent apps */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Today's top matches */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Today's top matches</h2>
              <Link href="/jobs" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
                All {jobs.length} <ChevronRight size={12} />
              </Link>
            </div>
            {topJobs.length === 0 ? (
              <div className="text-center py-8">
                <Target size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No new matches today</p>
                <p className="text-xs text-gray-300 mt-1">Next scan runs automatically</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topJobs.map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block p-3 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{job.title}</div>
                        <div className="text-xs text-gray-500 truncate">{job.company} · {job.location}</div>
                      </div>
                      {job.fit_score && (
                        <span className={cn('badge text-xs flex-shrink-0', scoreClass(job.fit_score))}>
                          {job.fit_score}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-gray-400">{portalIcon(job.portal)} {job.portal}</span>
                      <span className="text-[10px] text-gray-400">{regionFlag(job.region)}</span>
                      {job.salary_min && (
                        <span className="text-[10px] text-gray-400">{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
                      )}
                      {job.visa_sponsorship && (
                        <span className="text-[10px] bg-ireland-50 text-ireland-600 px-1.5 py-0.5 rounded-full">Visa ✓</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent applications */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Recent applications</h2>
              <Link href="/applications" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
                All <ChevronRight size={12} />
              </Link>
            </div>
            {recentApps.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No applications yet</p>
                <p className="text-xs text-gray-300 mt-1">Complete setup to start applying</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentApps.map(app => (
                  <div key={app.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{app.job?.title}</div>
                      <div className="text-xs text-gray-400 truncate">{app.job?.company} · {formatDate(app.applied_at)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px]">{regionFlag(app.region)}</span>
                      <span className={cn('badge text-[10px]', statusColor(app.status))}>
                        {statusLabel(app.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: chart + heatmap + followups */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Weekly activity chart */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">This week</h2>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weeklyData} barSize={8} barGap={2}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #F3F4F6' }}
                  cursor={{ fill: '#F9FAFB' }}
                />
                <Bar dataKey="india" name="🇮🇳 India" fill="#EF9F27" radius={[3,3,0,0]} />
                <Bar dataKey="ireland" name="🇮🇪 Ireland" fill="#378ADD" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Heatmap */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Activity — 10 weeks</h2>
            <div className="space-y-1.5">
              {['Mon', 'Wed', 'Fri'].map((day, ri) => (
                <div key={day} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 w-6">{day}</span>
                  <div className="flex gap-1">
                    {(heatmapData[ri] || Array(10).fill(0)).map((val, ci) => (
                      <div
                        key={ci}
                        className="w-4 h-4 rounded-sm transition-all hover:scale-110 cursor-default"
                        style={{ backgroundColor: heatColors[Math.min(val, 4)] }}
                        title={`${val} applications`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-[10px] text-gray-400">Less</span>
              {heatColors.map(c => (
                <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
              ))}
              <span className="text-[10px] text-gray-400">More</span>
            </div>
          </div>

          {/* Follow-ups due */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Follow-ups due</h2>
              {followupsDue.length > 0 && (
                <span className="text-[10px] bg-india-50 text-india-600 px-2 py-0.5 rounded-full font-medium">
                  {followupsDue.length} pending
                </span>
              )}
            </div>
            {followupsDue.length === 0 ? (
              <div className="text-center py-6">
                <Clock size={20} className="text-gray-300 mx-auto mb-1.5" />
                <p className="text-xs text-gray-400">All caught up</p>
              </div>
            ) : (
              <div className="space-y-2">
                {followupsDue.slice(0, 4).map(app => (
                  <div key={app.id} className="flex items-center gap-2 p-2 rounded-lg bg-india-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-800 truncate">{app.job?.company}</div>
                      <div className="text-[10px] text-gray-500">Applied {formatDate(app.applied_at)}</div>
                    </div>
                    <Link href={`/followups?app=${app.id}`} className="text-[10px] text-india-600 font-medium">
                      Draft →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
