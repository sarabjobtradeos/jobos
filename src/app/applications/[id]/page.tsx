'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { Application } from '@/lib/supabase'
import {
  cn, formatDate, timeAgo, statusColor, statusLabel,
  portalIcon, regionFlag, formatSalary, scoreClass
} from '@/lib/utils'
import {
  ArrowLeft, Clock, MessageSquare, DollarSign, Edit3, Check,
  X, Plus, Calendar, Building2, ExternalLink, Star, AlertCircle,
  ChevronRight, Zap, TrendingUp, Mail
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

type TimelineEvent = {
  id: string
  status: string
  note?: string
  date: string
}

const STATUS_FLOW: Record<string, string[]> = {
  applied:              ['viewed', 'under_review', 'rejected', 'ghosted'],
  viewed:               ['under_review', 'rejected'],
  under_review:         ['shortlisted', 'rejected'],
  shortlisted:          ['interview_scheduled', 'rejected'],
  interview_scheduled:  ['interview_done'],
  interview_done:       ['offer', 'rejected'],
  offer:                ['withdrawn'],
  rejected:             [],
  withdrawn:            [],
  ghosted:              [],
}

const STATUS_ICONS: Record<string, string> = {
  applied: '📤',
  viewed: '👁️',
  under_review: '🔍',
  shortlisted: '⭐',
  interview_scheduled: '📅',
  interview_done: '✅',
  offer: '🎉',
  rejected: '❌',
  withdrawn: '↩️',
  ghosted: '👻',
}

export default function ApplicationDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'timeline' | 'notes' | 'offer'>('timeline')
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editingOffer, setEditingOffer] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerCurrency, setOfferCurrency] = useState('EUR')
  const [followupDraft, setFollowupDraft] = useState('')
  const [loadingFollowup, setLoadingFollowup] = useState(false)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [addingEvent, setAddingEvent] = useState(false)
  const [newEventNote, setNewEventNote] = useState('')

  useEffect(() => { loadApp() }, [id])

  async function loadApp() {
    const { data } = await supabase
      .from('applications')
      .select('*, job:jobs(*)')
      .eq('id', id)
      .single()
    if (data) {
      setApp(data)
      setNoteText(data.notes || '')
      setOfferAmount(data.offer_amount?.toString() || '')
      setOfferCurrency(data.offer_currency || 'EUR')
      // Build synthetic timeline from status + timestamps
      buildTimeline(data)
    }
    setLoading(false)
  }

  function buildTimeline(a: Application) {
    const events: TimelineEvent[] = [
      { id: '1', status: 'applied', date: a.applied_at, note: `Applied via ${a.portal}` },
    ]
    if (a.status !== 'applied') {
      events.push({ id: '2', status: a.status, date: a.last_updated, note: a.rejection_reason || undefined })
    }
    if (a.interview_date) {
      events.push({ id: '3', status: 'interview_scheduled', date: a.interview_date, note: a.interview_type || undefined })
    }
    if (a.last_followup_at) {
      events.push({ id: 'fu', status: 'followup', date: a.last_followup_at, note: 'Follow-up sent' })
    }
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setTimeline(events)
  }

  async function updateStatus(newStatus: string) {
    if (!app) return
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus, last_updated: new Date().toISOString() })
      .eq('id', app.id)
    if (!error) {
      const updated = { ...app, status: newStatus as any, last_updated: new Date().toISOString() }
      setApp(updated)
      buildTimeline(updated)
      toast.success(`Status → ${statusLabel(newStatus)}`)
    }
  }

  async function saveNote() {
    if (!app) return
    const { error } = await supabase
      .from('applications')
      .update({ notes: noteText })
      .eq('id', app.id)
    if (!error) {
      setApp({ ...app, notes: noteText })
      setEditingNote(false)
      toast.success('Note saved')
    }
  }

  async function saveOffer() {
    if (!app) return
    const amount = parseFloat(offerAmount)
    const { error } = await supabase
      .from('applications')
      .update({ offer_amount: amount, offer_currency: offerCurrency, status: 'offer', last_updated: new Date().toISOString() })
      .eq('id', app.id)
    if (!error) {
      const updated = { ...app, offer_amount: amount, offer_currency: offerCurrency, status: 'offer' as any }
      setApp(updated)
      setEditingOffer(false)
      toast.success('Offer details saved')
    }
  }

  async function generateFollowup() {
    if (!app?.job) return
    setLoadingFollowup(true)
    try {
      const res = await fetch('/api/ai/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: app.job.title,
          company: app.job.company,
          appliedAt: app.applied_at,
          followupCount: app.followup_count,
          candidateName: 'Your Name',
        }),
      })
      const data = await res.json()
      setFollowupDraft(data.email || data.content || '')
      setTab('notes')
    } catch {
      toast.error('Could not generate follow-up')
    }
    setLoadingFollowup(false)
  }

  async function markFollowupSent() {
    if (!app) return
    const now = new Date().toISOString()
    const next = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase
      .from('applications')
      .update({
        last_followup_at: now,
        followup_count: (app.followup_count || 0) + 1,
        next_followup_at: next,
      })
      .eq('id', app.id)
    if (!error) {
      setApp(prev => prev ? { ...prev, last_followup_at: now, followup_count: (prev.followup_count || 0) + 1 } : null)
      setFollowupDraft('')
      toast.success('Follow-up marked as sent')
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (!app) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-gray-400">Application not found.</div>
      </AppLayout>
    )
  }

  const job = app.job
  const nextStatuses = STATUS_FLOW[app.status] || []
  const isOverdue = app.next_followup_at && new Date(app.next_followup_at) <= new Date()
  const daysSinceApply = Math.floor((Date.now() - new Date(app.applied_at).getTime()) / 86400000)

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5 pb-10">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applications
        </button>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Company logo / initial */}
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 flex-shrink-0 overflow-hidden border border-gray-200">
              {job?.company_logo
                ? <img src={job.company_logo} alt="" className="w-full h-full object-contain p-1" />
                : job?.company?.[0] || '?'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 leading-snug">{job?.title || 'Unknown Role'}</h1>
                  <div className="text-sm text-gray-500 mt-0.5">{job?.company} · {job?.location}</div>
                </div>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0', statusColor(app.status))}>
                  {statusLabel(app.status)}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  {portalIcon(app.portal)} {app.portal}
                </span>
                <span className="text-xs text-gray-500">{regionFlag(app.region)} {app.region}</span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Applied {timeAgo(app.applied_at)} · {daysSinceApply}d ago
                </span>
                {job?.fit_score && (
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', scoreClass(job.fit_score) === 'score-high' ? 'bg-green-100 text-green-700' : scoreClass(job.fit_score) === 'score-mid' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600')}>
                    {job.fit_score}/10 fit
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Salary / offer */}
          {(job?.salary_min || job?.salary_max || app.offer_amount) && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-sm">
              {(job?.salary_min || job?.salary_max) && (
                <span className="text-gray-600">
                  Listed: <span className="font-medium">{formatSalary(job?.salary_min, job?.salary_max, job?.salary_currency)}</span>
                </span>
              )}
              {app.offer_amount && (
                <span className="text-green-700 font-medium flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Offer: {app.offer_currency === 'INR' ? '₹' : '€'}{app.offer_amount.toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* External link */}
          {job?.portal_url && (
            <a
              href={job.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> View original listing
            </a>
          )}
        </div>

        {/* Quick actions row */}
        <div className="flex gap-2 flex-wrap">
          {/* Status transitions */}
          {nextStatuses.map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-brand-300 hover:text-brand-600 transition-colors flex items-center gap-1.5"
            >
              {STATUS_ICONS[s]} Move to {statusLabel(s)}
            </button>
          ))}
          {job && (
            <Link
              href={`/jobs/${job.id}`}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-gray-300 transition-colors flex items-center gap-1.5 ml-auto"
            >
              <Zap className="w-3 h-3" /> Job Details
            </Link>
          )}
        </div>

        {/* Follow-up alert */}
        {isOverdue && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                Follow-up overdue — due {timeAgo(app.next_followup_at!)}
              </span>
            </div>
            <button
              onClick={generateFollowup}
              disabled={loadingFollowup}
              className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {loadingFollowup ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Mail className="w-3 h-3" />
              )}
              Draft Follow-up
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['timeline', 'notes', 'offer'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors capitalize',
                  tab === t
                    ? 'text-brand-600 border-b-2 border-brand-500 bg-brand-50/30'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t === 'timeline' ? '📋 Timeline' : t === 'notes' ? '📝 Notes' : '💰 Offer'}
              </button>
            ))}
          </div>

          {/* TIMELINE TAB */}
          {tab === 'timeline' && (
            <div className="p-5 space-y-4">
              <div className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3">Application history</div>

              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-100" />

                <div className="space-y-4">
                  {timeline.map((event, i) => (
                    <div key={event.id} className="flex gap-3 relative">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 relative z-10',
                        i === 0 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'
                      )}>
                        {STATUS_ICONS[event.status] || '·'}
                      </div>
                      <div className="flex-1 pt-1 pb-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-gray-800">
                            {event.status === 'followup' ? 'Follow-up sent' : statusLabel(event.status)}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(event.date)}</span>
                        </div>
                        {event.note && (
                          <p className="text-xs text-gray-500 mt-0.5">{event.note}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add manual event */}
                  {addingEvent ? (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          autoFocus
                          value={newEventNote}
                          onChange={e => setNewEventNote(e.target.value)}
                          placeholder="What happened? (e.g. Recruiter called, HR screen...)"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-300"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (!newEventNote.trim()) return
                              const evt: TimelineEvent = {
                                id: Date.now().toString(),
                                status: 'note',
                                note: newEventNote,
                                date: new Date().toISOString(),
                              }
                              setTimeline(prev => [evt, ...prev])
                              setNewEventNote('')
                              setAddingEvent(false)
                              toast.success('Event added')
                            }}
                            className="px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600 transition-colors"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setAddingEvent(false)}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingEvent(true)}
                      className="flex items-center gap-2 text-xs text-gray-400 hover:text-brand-500 transition-colors ml-11"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add event
                    </button>
                  )}
                </div>
              </div>

              {/* Follow-up count */}
              {app.followup_count > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="w-3.5 h-3.5" />
                  {app.followup_count} follow-up{app.followup_count !== 1 ? 's' : ''} sent
                  {app.last_followup_at && ` · last ${timeAgo(app.last_followup_at)}`}
                </div>
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {tab === 'notes' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400 uppercase font-medium tracking-wide">Notes & Follow-ups</div>
                {!editingNote && (
                  <button
                    onClick={() => setEditingNote(true)}
                    className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600"
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>

              {editingNote ? (
                <div className="space-y-3">
                  <textarea
                    autoFocus
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    rows={6}
                    placeholder="Add notes about this application — recruiter name, key info, what to mention in follow-ups..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-300 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveNote} className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                    <button onClick={() => { setEditingNote(false); setNoteText(app.notes || '') }} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="min-h-[80px]">
                  {noteText ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{noteText}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No notes yet. Click Edit to add.</p>
                  )}
                </div>
              )}

              {/* Interview notes if present */}
              {app.interview_notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-2">Interview Notes</div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{app.interview_notes}</p>
                </div>
              )}

              {/* Follow-up draft */}
              {followupDraft && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400 uppercase font-medium tracking-wide">AI Follow-up Draft</div>
                    <button onClick={() => setFollowupDraft('')} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{followupDraft}</pre>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(followupDraft); toast.success('Copied!') }}
                      className="px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600 transition-colors"
                    >
                      Copy Email
                    </button>
                    <button
                      onClick={markFollowupSent}
                      className="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-50"
                    >
                      Mark Sent
                    </button>
                  </div>
                </div>
              )}

              {/* Generate follow-up button */}
              {!followupDraft && (
                <button
                  onClick={generateFollowup}
                  disabled={loadingFollowup}
                  className="flex items-center gap-2 text-sm text-brand-500 hover:text-brand-600 disabled:opacity-50 transition-colors pt-2"
                >
                  {loadingFollowup
                    ? <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                    : <Zap className="w-4 h-4" />
                  }
                  Generate AI follow-up email
                </button>
              )}
            </div>
          )}

          {/* OFFER TAB */}
          {tab === 'offer' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400 uppercase font-medium tracking-wide">Offer Details</div>
                {!editingOffer && app.status === 'offer' && (
                  <button
                    onClick={() => setEditingOffer(true)}
                    className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600"
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>

              {app.status !== 'offer' && !editingOffer ? (
                <div className="text-center py-8 space-y-3">
                  <div className="text-3xl">💰</div>
                  <p className="text-sm text-gray-500">No offer received yet</p>
                  {app.status === 'interview_done' && (
                    <button
                      onClick={() => { setEditingOffer(true); updateStatus('offer') }}
                      className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors inline-flex items-center gap-2"
                    >
                      <DollarSign className="w-4 h-4" /> Record Offer 🎉
                    </button>
                  )}
                </div>
              ) : editingOffer ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Offered Amount (annual)</label>
                    <div className="flex gap-2">
                      <select
                        value={offerCurrency}
                        onChange={e => setOfferCurrency(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-300 bg-white"
                      >
                        <option value="EUR">€ EUR</option>
                        <option value="INR">₹ INR</option>
                        <option value="GBP">£ GBP</option>
                        <option value="USD">$ USD</option>
                      </select>
                      <input
                        type="number"
                        value={offerAmount}
                        onChange={e => setOfferAmount(e.target.value)}
                        placeholder="e.g. 65000"
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-300"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveOffer} className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors">
                      Save Offer
                    </button>
                    <button onClick={() => setEditingOffer(false)} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Offer display */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <div className="text-3xl font-bold text-green-700">
                      {offerCurrency === 'INR' ? '₹' : offerCurrency === 'EUR' ? '€' : offerCurrency === 'GBP' ? '£' : '$'}
                      {parseInt(offerAmount || '0').toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600 mt-0.5">per year · {offerCurrency}</div>
                  </div>

                  {/* Vs listed salary */}
                  {job?.salary_min && offerAmount && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Listed range</span>
                        <span className="font-medium">{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 mt-1">
                        <span>Your offer</span>
                        <span className="font-medium text-green-700">
                          {offerCurrency === 'INR' ? '₹' : '€'}{parseInt(offerAmount).toLocaleString()}
                        </span>
                      </div>
                      {job.salary_min && parseInt(offerAmount) > job.salary_min && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600 font-medium">
                          <TrendingUp className="w-3 h-3" />
                          {Math.round(((parseInt(offerAmount) - job.salary_min) / job.salary_min) * 100)}% above minimum
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus('withdrawn')}
                      className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Decline Offer
                    </button>
                    <button
                      onClick={() => setEditingOffer(true)}
                      className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Amount
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Job details quick view */}
        {job && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3">Job Overview</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {job.employment_type && (
                <div>
                  <span className="text-xs text-gray-400 block">Type</span>
                  <span className="text-gray-700 font-medium">{job.employment_type}</span>
                </div>
              )}
              {job.remote_type && (
                <div>
                  <span className="text-xs text-gray-400 block">Remote</span>
                  <span className="text-gray-700 font-medium capitalize">{job.remote_type}</span>
                </div>
              )}
              {job.experience_required && (
                <div>
                  <span className="text-xs text-gray-400 block">Experience</span>
                  <span className="text-gray-700 font-medium">{job.experience_required}</span>
                </div>
              )}
              {job.visa_sponsorship && (
                <div>
                  <span className="text-xs text-gray-400 block">Visa</span>
                  <span className="text-green-600 font-medium">Sponsorship available</span>
                </div>
              )}
            </div>
            {job.skills_required && job.skills_required.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400 block mb-2">Required Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills_required.slice(0, 8).map(s => (
                    <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
