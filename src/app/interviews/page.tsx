'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { Application } from '@/lib/supabase'
import { cn, formatDate, regionFlag, statusColor, statusLabel } from '@/lib/utils'
import { Calendar, Clock, Video, Phone, MapPin, BookOpen, Plus, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ date: '', time: '', type: 'video', notes: '' })
  const [prep, setPrep] = useState<Record<string, any>>({})
  const [prepLoading, setPrepLoading] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('applications')
      .select('*, job:jobs(*)')
      .eq('user_id', user.id)
      .in('status', ['interview_scheduled', 'interview_done', 'shortlisted'])
      .order('interview_date', { ascending: true })
    if (data) setInterviews(data)
    setLoading(false)
  }

  async function saveInterview(app: Application) {
    const datetime = form.date && form.time ? `${form.date}T${form.time}:00` : null
    await supabase.from('applications').update({
      interview_date: datetime,
      interview_type: form.type,
      interview_notes: form.notes,
      status: 'interview_scheduled',
    }).eq('id', app.id)
    toast.success('Interview saved')
    setEditingId(null)
    load()
  }

  async function generatePrep(app: Application) {
    setPrepLoading(app.id)
    try {
      const res = await fetch('/api/ai/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: app.job?.title,
          company: app.job?.company,
          jobDescription: app.job?.description,
          resume: '',
        }),
      })
      const data = await res.json()
      setPrep(prev => ({ ...prev, [app.id]: data }))
    } catch {
      toast.error('Failed to generate prep')
    }
    setPrepLoading(null)
  }

  async function markDone(app: Application) {
    await supabase.from('applications').update({ status: 'interview_done' }).eq('id', app.id)
    toast.success('Interview marked as done')
    load()
  }

  const typeIcon = (type: string) => {
    if (type === 'video') return <Video size={12} />
    if (type === 'phone') return <Phone size={12} />
    return <MapPin size={12} />
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Interviews</h1>
          <p className="text-sm text-gray-500">{interviews.filter(i => i.status === 'interview_scheduled').length} scheduled</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>
        ) : interviews.length === 0 ? (
          <div className="card p-12 text-center">
            <Calendar size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No interviews yet — keep applying!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map(app => {
              const isEditing = editingId === app.id
              const appPrep = prep[app.id]
              return (
                <div key={app.id} className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{app.job?.title}</div>
                      <div className="text-xs text-gray-500">{app.job?.company} · {regionFlag(app.region)}</div>
                    </div>
                    <span className={cn('badge text-[10px]', statusColor(app.status))}>
                      {statusLabel(app.status)}
                    </span>
                  </div>

                  {/* Interview details */}
                  {app.interview_date && !isEditing && (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(app.interview_date)}</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {new Date(app.interview_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {app.interview_type && <span className="flex items-center gap-1">{typeIcon(app.interview_type)} {app.interview_type}</span>}
                    </div>
                  )}

                  {/* Edit form */}
                  {isEditing && (
                    <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label">Date</label>
                          <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input text-xs py-1.5" />
                        </div>
                        <div>
                          <label className="label">Time</label>
                          <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className="input text-xs py-1.5" />
                        </div>
                      </div>
                      <div>
                        <label className="label">Type</label>
                        <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input text-xs py-1.5">
                          <option value="video">Video call</option>
                          <option value="phone">Phone</option>
                          <option value="onsite">On-site</option>
                          <option value="technical">Technical round</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Notes</label>
                        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="input text-xs resize-none" placeholder="Interviewer name, topics, etc." />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveInterview(app)} className="btn-brand text-xs px-3 py-1.5 flex-1">Save</button>
                        <button onClick={() => setEditingId(null)} className="btn-outline text-xs px-3 py-1.5">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Prep card */}
                  {appPrep && (
                    <div className="bg-brand-50 rounded-lg p-3 space-y-2">
                      <p className="text-[11px] font-semibold text-brand-700 uppercase tracking-wide">Prep — Lead with</p>
                      <p className="text-sm text-brand-800">{appPrep.lead_with}</p>
                      <div className="space-y-1">
                        {appPrep.likely_questions?.slice(0, 3).map((q: string, i: number) => (
                          <div key={i} className="text-xs text-gray-600">Q{i+1}: {q}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => { setEditingId(app.id); setForm({ date: app.interview_date?.slice(0,10) || '', time: app.interview_date?.slice(11,16) || '', type: app.interview_type || 'video', notes: app.interview_notes || '' }) }}
                      className="btn-outline text-xs px-2.5 py-1.5"
                    >
                      <Plus size={11} /> {app.interview_date ? 'Edit schedule' : 'Add schedule'}
                    </button>
                    <button
                      onClick={() => generatePrep(app)}
                      disabled={prepLoading === app.id}
                      className="btn-outline text-xs px-2.5 py-1.5"
                    >
                      <BookOpen size={11} /> {prepLoading === app.id ? 'Loading...' : 'Prep card'}
                    </button>
                    {app.status === 'interview_scheduled' && (
                      <button onClick={() => markDone(app)} className="btn-outline text-xs px-2.5 py-1.5 text-brand-600">
                        <CheckCircle2 size={11} /> Mark done
                      </button>
                    )}
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
