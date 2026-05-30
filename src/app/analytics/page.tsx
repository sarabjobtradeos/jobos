'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, RefreshCw, BarChart3, Target, AlertCircle } from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid
} from 'recharts'
import toast from 'react-hot-toast'

export default function AnalyticsPage() {
  const { applications, stats } = useStore()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<any>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [offerA, setOfferA] = useState({ amount: 0, currency: 'INR' })
  const [offerB, setOfferB] = useState({ amount: 0, currency: 'EUR' })

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {})
    setLoading(false)
    return () => subscription.unsubscribe()
  }, [])

  async function runRejectionAnalysis() {
    setAnalysisLoading(true)
    const rejected = applications
      .filter(a => a.status === 'rejected')
      .map(a => ({
        jobTitle: a.job?.title || '',
        company: a.job?.company || '',
        region: a.region,
        portal: a.portal,
        fitScore: a.job?.fit_score,
        stage: a.rejection_reason || 'unknown',
      }))

    if (rejected.length < 2) {
      toast.error('Need at least 2 rejections to analyse patterns')
      setAnalysisLoading(false)
      return
    }

    try {
      const res = await fetch('/api/ai/rejection-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedApplications: rejected }),
      })
      const data = await res.json()
      setAnalysis(data)
    } catch {
      toast.error('Analysis failed')
    }
    setAnalysisLoading(false)
  }

  // Status breakdown
  const statusData = [
    { name: 'Applied', value: applications.filter(a => a.status === 'applied').length, color: '#93C5FD' },
    { name: 'In Review', value: applications.filter(a => ['viewed','under_review','shortlisted'].includes(a.status)).length, color: '#1D9E75' },
    { name: 'Interview', value: applications.filter(a => ['interview_scheduled','interview_done'].includes(a.status)).length, color: '#EF9F27' },
    { name: 'Offer', value: applications.filter(a => a.status === 'offer').length, color: '#10B981' },
    { name: 'Rejected', value: applications.filter(a => a.status === 'rejected').length, color: '#F87171' },
  ].filter(d => d.value > 0)

  // Portal breakdown
  const portalData = ['linkedin', 'naukri', 'indeed', 'glassdoor'].map(p => ({
    portal: p.charAt(0).toUpperCase() + p.slice(1),
    count: applications.filter(a => a.portal === p).length,
    interviews: applications.filter(a => a.portal === p && ['interview_scheduled','interview_done','offer'].includes(a.status)).length,
  })).filter(d => d.count > 0)

  // Weekly trend
  const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - (7 - i) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return {
      week: `W${i + 1}`,
      applied: applications.filter(a => {
        const d = new Date(a.applied_at)
        return d >= weekStart && d < weekEnd
      }).length,
    }
  })

  // Offer comparison
  const inrToEur = 0.011
  const costOfLivingMultiplier = 1.4
  const irelandTakeHome = offerB.amount * 0.68
  const indiaTakeHome = offerA.amount * 0.7
  const irelandPPP = irelandTakeHome / costOfLivingMultiplier
  const indiaEquivalent = indiaTakeHome / inrToEur

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
        <h1 className="text-lg font-semibold text-gray-900">Analytics</h1>

        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total applied', value: stats.totalApplied },
            { label: 'Response rate', value: `${stats.responseRate}%` },
            { label: 'Avg fit score', value: `${stats.avgFitScore}/10` },
            { label: 'Interviews', value: stats.interviews },
          ].map(m => (
            <div key={m.label} className="card p-4 text-center">
              <div className="text-2xl font-semibold font-mono text-gray-900">{m.value}</div>
              <div className="text-xs text-gray-400 mt-1">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Status pie */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Application status breakdown</h2>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {statusData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-gray-600">{d.name}</span>
                      </div>
                      <span className="font-mono font-medium text-gray-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400">No data yet</div>
            )}
          </div>

          {/* Portal performance */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Portal performance</h2>
            {portalData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={portalData} barSize={16} barGap={4}>
                  <XAxis dataKey="portal" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="count" name="Applied" fill="#D1FAE5" radius={[3,3,0,0]} />
                  <Bar dataKey="interviews" name="Interviews" fill="#1D9E75" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400">No data yet</div>
            )}
          </div>
        </div>

        {/* Weekly trend */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Application volume — 8 weeks</h2>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Line type="monotone" dataKey="applied" stroke="#1D9E75" strokeWidth={2} dot={{ fill: '#1D9E75', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Rejection analysis */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <TrendingDown size={14} className="text-red-400" /> Rejection Pattern Analysis
            </h2>
            <button onClick={runRejectionAnalysis} disabled={analysisLoading} className="btn-outline text-xs px-3 py-1.5">
              <RefreshCw size={11} className={analysisLoading ? 'animate-spin' : ''} />
              {analysisLoading ? 'Analysing...' : 'Run analysis'}
            </button>
          </div>

          {!analysis ? (
            <p className="text-sm text-gray-400">Click to analyse your rejection patterns and get AI recommendations.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Patterns found</p>
                <div className="space-y-1">
                  {(analysis.patterns ?? []).map((p: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Recommendations</p>
                <div className="space-y-1">
                  {(analysis.recommendations ?? []).map((r: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <TrendingUp size={12} className="text-brand-500 mt-0.5 flex-shrink-0" />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Adjust targeting</p>
                <div className="space-y-1">
                  {(analysis.targetAdjustments ?? []).map((t: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Target size={12} className="text-india-600 mt-0.5 flex-shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Offer comparison calculator */}
        <div className="card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">🇮🇳 vs 🇮🇪 Offer Comparison Calculator</h2>
          <p className="text-xs text-gray-400">Compare real take-home value between India and Ireland offers.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-india-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-india-700">🇮🇳 India offer (CTC ₹/year)</p>
              <input
                type="number"
                value={offerA.amount || ''}
                onChange={e => setOfferA(p => ({ ...p, amount: Number(e.target.value) }))}
                placeholder="e.g. 2500000"
                className="input text-sm"
              />
              {offerA.amount > 0 && (
                <div className="text-xs space-y-1 text-india-800">
                  <div>CTC: ₹{(offerA.amount/100000).toFixed(1)}L/yr</div>
                  <div>Est. take-home: ₹{(indiaTakeHome/100000).toFixed(1)}L/yr</div>
                  <div>Monthly: ₹{(indiaTakeHome/1200000).toFixed(2)}L</div>
                </div>
              )}
            </div>
            <div className="bg-ireland-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-ireland-700">🇮🇪 Ireland offer (€/year)</p>
              <input
                type="number"
                value={offerB.amount || ''}
                onChange={e => setOfferB(p => ({ ...p, amount: Number(e.target.value) }))}
                placeholder="e.g. 70000"
                className="input text-sm"
              />
              {offerB.amount > 0 && (
                <div className="text-xs space-y-1 text-ireland-800">
                  <div>Gross: €{offerB.amount.toLocaleString()}/yr</div>
                  <div>Est. take-home: €{irelandTakeHome.toLocaleString(undefined,{maximumFractionDigits:0})}/yr</div>
                  <div>Monthly: €{(irelandTakeHome/12).toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                </div>
              )}
            </div>
          </div>
          {offerA.amount > 0 && offerB.amount > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Comparison (adjusted for cost of living)</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">India PPP-equivalent</p>
                  <p className="font-semibold text-gray-800">₹{(indiaTakeHome/100000).toFixed(1)}L</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ireland PPP-equivalent</p>
                  <p className="font-semibold text-gray-800">~₹{(irelandPPP/inrToEur/100000).toFixed(1)}L</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {irelandPPP/inrToEur > indiaTakeHome
                  ? '🇮🇪 Ireland offer has higher purchasing power after cost of living adjustment'
                  : '🇮🇳 India offer has higher purchasing power after cost of living adjustment'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
