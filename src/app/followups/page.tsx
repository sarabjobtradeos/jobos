'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { Application } from '@/lib/supabase'
import { cn, formatDate, regionFlag } from '@/lib/utils'
import { Mail, Send, Clock, CheckCircle2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function FollowupsPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>({})
  const [generating, setGenerating] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('applications')
      .select('*, job:jobs(*)')
      .eq('user_id', user.id)
      .in('status', ['applied', 'viewed'])
      .order('applied_at', { ascending: true })
    if (data) setApps(data)
    setLoading(false)
  }

  async function generateDraft(app: Application) {
    setGenerating(app.id)
    try {
      const res = await fetch('/api/ai/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: app.job?.title,
          company: app.job?.company,
          appliedAt: formatDate(app.applied_at),
          candidateName: 'Your Name',
          previousFollowups: app.followup_count,
        }),
      })
      const data = await res.json()
      setDrafts(prev => ({ ...prev, [app.id]: data }))
    } catch {
      toast.error('Failed to generate draft')
    }
    setGenerating(null)
  }

  async function markSent(app: Application) {
    setSending(app.id)
    await supabase.from('applications').update({
      last_followup_at: new Date().toISOString(),
      followup_count: (app.followup_count || 0) + 1,
      next_followup_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', app.id)
    setDrafts(prev => { const n = { ...prev }; delete n[app.id]; return n })
    toast.success('Follow-up marked as sent')
    load()
    setSending(null)
  }

  const overdue = apps.filter(a => a.next_followup_at && new Date(a.next_followup_at) <= new Date())
  const upcoming = apps.filter(a => !a.next_followup_at || new Date(a.next_followup_at) > new Date())

  const AppRow = ({ app }: { app: Application }) => {
    const draft = drafts[app.id]
    const daysSince = Math.floor((Date.now() - new Date(app.applied_at).getTime()) / 86400000)
    return (
      <div className={cn('card p-4 space-y-3', overdue.includes(app) && 'border-india-200')}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-medium text-gray-900">{app.job?.title}</div>
            <div className="text-xs text-gray-500">{app.job?.company} · {regionFlag(app.region)} · Applied {formatDate(app.applied_at)} ({daysSince}d ago)</div>
            {app.followup_count > 0 && (
              <div className="text-xs text-gray-400 mt-0.5">{app.followup_count} follow-up{app.followup_count > 1 ? 's' : ''} sent</div>
            )}
          </div>
          {overdue.includes(app) && (
            <span className="badge bg-india-50 text-india-600 text-[10px] flex-shrink-0">
              <Clock size={9} /> Due
            </span>
          )}
        </div>

        {draft ? (
          <div className="space-y-2">
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-gray-500">Subject: <span className="text-gray-800">{draft.subject}</span></div>
              <textarea
                value={draft.body}
                onChange={e => setDrafts(prev => ({ ...prev, [app.id]: { ...prev[app.id], body: e.target.value } }))}
                rows={4}
                className="input text-xs resize-none w-full"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => markSent(app)}
                disabled={sending === app.id}
                className="btn-brand text-xs px-3 py-1.5 flex-1"
              >
                <CheckCircle2 size={12} /> {sending === app.id ? 'Marking...' : 'Mark as sent'}
              </button>
              <button onClick={() => generateDraft(app)} className="btn-outline text-xs px-3 py-1.5">
                <RefreshCw size={12} /> Regenerate
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => generateDraft(app)}
            disabled={generating === app.id}
            className="btn-outline text-xs px-3 py-1.5 w-full"
          >
            <Mail size={12} />
            {generating === app.id ? 'Generating...' : 'Generate follow-up draft'}
          </button>
        )}
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Follow-ups</h1>
          <p className="text-sm text-gray-500">{overdue.length} overdue · {apps.length} total tracking</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        ) : (
          <>
            {overdue.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-india-600 uppercase tracking-wider">Overdue</h2>
                {overdue.map(a => <AppRow key={a.id} app={a} />)}
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming</h2>
                {upcoming.map(a => <AppRow key={a.id} app={a} />)}
              </div>
            )}
            {apps.length === 0 && (
              <div className="card p-12 text-center">
                <Send size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No applications to follow up on yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
