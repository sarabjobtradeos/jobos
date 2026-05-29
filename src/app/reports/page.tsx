'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { FileBarChart, RefreshCw, TrendingUp, CheckCircle2, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const { applications, stats, profile } = useStore()
  const [reports, setReports] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [latestReport, setLatestReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(10)
    if (data) {
      setReports(data)
      if (data[0]) setLatestReport(data[0])
    }
    setLoading(false)
  }

  async function generateReport() {
    setGenerating(true)
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)

    const weekApps = applications.filter(a => new Date(a.applied_at) >= weekStart)

    try {
      const res = await fetch('/api/ai/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekData: {
            total_applied: weekApps.length,
            india_applied: weekApps.filter(a => a.region === 'india').length,
            ireland_applied: weekApps.filter(a => a.region === 'ireland').length,
            interviews: weekApps.filter(a => ['interview_scheduled','interview_done'].includes(a.status)).length,
            rejections: weekApps.filter(a => a.status === 'rejected').length,
            response_rate: stats.responseRate,
            avg_fit_score: stats.avgFitScore,
          },
          profile: { full_name: profile?.full_name || 'there' },
        }),
      })
      const aiData = await res.json()

      const { data: { user } } = await supabase.auth.getUser()
      const { data: saved } = await supabase.from('weekly_reports').insert({
        user_id: user!.id,
        week_start: weekStart.toISOString().slice(0, 10),
        week_end: now.toISOString().slice(0, 10),
        total_applied: weekApps.length,
        india_applied: weekApps.filter(a => a.region === 'india').length,
        ireland_applied: weekApps.filter(a => a.region === 'ireland').length,
        interviews_scheduled: weekApps.filter(a => a.status === 'interview_scheduled').length,
        response_rate: stats.responseRate,
        avg_fit_score: stats.avgFitScore,
        recommendations: aiData.recommendations,
        report_html: JSON.stringify(aiData),
      }).select().single()

      if (saved) setLatestReport(saved)
      toast.success('Weekly report generated!')
      load()
    } catch {
      toast.error('Report generation failed')
    }
    setGenerating(false)
  }

  const parsedReport = latestReport?.report_html ? JSON.parse(latestReport.report_html) : null

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Weekly Report</h1>
            <p className="text-sm text-gray-500">Auto-generated every Sunday · {reports.length} reports saved</p>
          </div>
          <button onClick={generateReport} disabled={generating} className="btn-brand text-sm px-3 py-1.5">
            <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating...' : 'Generate now'}
          </button>
        </div>

        {loading ? (
          <div className="skeleton h-64 rounded-xl" />
        ) : !latestReport ? (
          <div className="card p-12 text-center">
            <FileBarChart size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-3">No reports yet</p>
            <button onClick={generateReport} disabled={generating} className="btn-brand text-sm px-4 py-2">
              Generate first report
            </button>
          </div>
        ) : (
          <>
            {/* Latest report */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                  Week of {latestReport.week_start} → {latestReport.week_end}
                </h2>
                <span className="badge badge-brand text-[10px]">Latest</span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Applied', value: latestReport.total_applied },
                  { label: '🇮🇳', value: latestReport.india_applied },
                  { label: '🇮🇪', value: latestReport.ireland_applied },
                  { label: 'Interviews', value: latestReport.interviews_scheduled },
                ].map(m => (
                  <div key={m.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-xl font-semibold font-mono text-gray-900">{m.value}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {parsedReport && (
                <>
                  {/* AI Summary */}
                  <div className="bg-brand-50 rounded-xl p-4">
                    <p className="text-sm text-brand-800 leading-relaxed">{parsedReport.summary}</p>
                  </div>

                  {/* Highlights */}
                  {parsedReport.highlights?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <CheckCircle2 size={10} className="text-brand-500" /> Highlights
                      </p>
                      <div className="space-y-1">
                        {parsedReport.highlights.map((h: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-brand-400 mt-0.5">•</span> {h}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {parsedReport.recommendations?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Lightbulb size={10} className="text-india-600" /> Next week — do this
                      </p>
                      <div className="space-y-1">
                        {parsedReport.recommendations.map((r: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <TrendingUp size={12} className="text-india-500 mt-0.5 flex-shrink-0" /> {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Past reports */}
            {reports.length > 1 && (
              <div className="card p-4 space-y-2">
                <h2 className="text-sm font-semibold text-gray-800">Past reports</h2>
                {reports.slice(1).map(r => (
                  <div
                    key={r.id}
                    onClick={() => setLatestReport(r)}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 px-2 rounded-lg"
                  >
                    <span className="text-sm text-gray-700">{r.week_start} → {r.week_end}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{r.total_applied} applied</span>
                      <span>{r.interviews_scheduled} interviews</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
