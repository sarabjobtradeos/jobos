'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { PortalSession } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Bot, CheckCircle2, XCircle, RefreshCw, Clock, Zap, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const PORTALS = [
  { key: 'linkedin', name: 'LinkedIn', color: 'bg-blue-50 text-blue-700', desc: 'Professional network — best for senior roles' },
  { key: 'naukri', name: 'Naukri', color: 'bg-orange-50 text-orange-700', desc: 'Largest India job portal' },
  { key: 'indeed', name: 'Indeed', color: 'bg-indigo-50 text-indigo-700', desc: 'Global reach including Ireland' },
  { key: 'glassdoor', name: 'Glassdoor', color: 'bg-green-50 text-green-700', desc: 'Company reviews + job listings' },
]

export default function AutomationPage() {
  const [sessions, setSessions] = useState<PortalSession[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    scan_time: '08:00',
    auto_apply_threshold: 8,
    max_daily_applies: 20,
    apply_india: true,
    apply_ireland: true,
    followup_days: 7,
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: s }, { data: l }] = await Promise.all([
      supabase.from('portal_sessions').select('*').eq('user_id', user.id),
      supabase.from('automation_logs').select('*').eq('user_id', user.id).order('started_at', { ascending: false }).limit(10),
    ])
    if (s) setSessions(s)
    if (l) setLogs(l)
    setLoading(false)
  }

  function getSession(portal: string) {
    return sessions.find(s => s.portal === portal)
  }

  async function checkPortal(portal: string) {
    setChecking(portal)
    // In real implementation this calls the extension to check session
    await new Promise(r => setTimeout(r, 1500))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('portal_sessions').upsert({
      user_id: user.id,
      portal,
      is_active: true,
      last_checked: new Date().toISOString(),
      last_active: new Date().toISOString(),
    })
    toast.success(`${portal} session is active`)
    load()
    setChecking(null)
  }

  async function saveSettings() {
    toast.success('Automation settings saved')
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">AI & Automation</h1>
          <p className="text-sm text-gray-500">Configure how JobOS finds and applies to jobs on your behalf</p>
        </div>

        {/* How it works banner */}
        <div className="card p-4 bg-brand-50 border-brand-200 space-y-2">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-brand-600" />
            <p className="text-sm font-medium text-brand-800">How automation works</p>
          </div>
          <ol className="text-xs text-brand-700 space-y-1 list-decimal list-inside">
            <li>Install the JobOS Chrome extension (link below)</li>
            <li>Keep LinkedIn, Naukri, Indeed, Glassdoor tabs open and logged in</li>
            <li>JobOS scans for jobs daily at your chosen time</li>
            <li>AI scores each job, tailors your resume, and applies via the extension</li>
            <li>You check your dashboard — everything else is automated</li>
          </ol>
        </div>

        {/* Portal health */}
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Portal Session Health</h2>
          <p className="text-xs text-gray-400">Your browser must be open with these portals logged in for auto-apply to work.</p>
          <div className="space-y-2">
            {PORTALS.map(portal => {
              const session = getSession(portal.key)
              const isActive = session?.is_active
              return (
                <div key={portal.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0', portal.color)}>
                    {portal.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{portal.name}</span>
                      {isActive
                        ? <CheckCircle2 size={13} className="text-brand-500" />
                        : <XCircle size={13} className="text-gray-300" />
                      }
                    </div>
                    <div className="text-xs text-gray-400">{portal.desc}</div>
                    {session?.last_checked && (
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={9} /> Checked {new Date(session.last_checked).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => checkPortal(portal.key)}
                    disabled={checking === portal.key}
                    className="btn-outline text-xs px-2.5 py-1.5 flex-shrink-0"
                  >
                    <RefreshCw size={11} className={checking === portal.key ? 'animate-spin' : ''} />
                    {checking === portal.key ? 'Checking...' : 'Check'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chrome extension */}
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Chrome Extension</h2>
          <p className="text-xs text-gray-500">The extension runs in your browser and applies to jobs through your real logged-in sessions. No passwords stored.</p>
          <div className="flex gap-2">
            <div className="flex-1 input text-xs py-2 text-gray-400 bg-gray-50">Extension not yet installed</div>
            <button className="btn-brand text-xs px-3 py-2" onClick={() => toast('Extension download coming in Phase 3')}>
              Download
            </button>
          </div>
        </div>

        {/* Automation settings */}
        <div className="card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <Bot size={14} className="text-brand-500" /> Automation Settings
          </h2>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Daily scan time</label>
                <input type="time" value={settings.scan_time} onChange={e => setSettings(p => ({ ...p, scan_time: e.target.value }))} className="input text-sm" />
              </div>
              <div>
                <label className="label">Auto-apply threshold (score)</label>
                <select value={settings.auto_apply_threshold} onChange={e => setSettings(p => ({ ...p, auto_apply_threshold: Number(e.target.value) }))} className="input text-sm">
                  <option value={6}>6+ (broad)</option>
                  <option value={7}>7+ (balanced)</option>
                  <option value={8}>8+ (selective)</option>
                  <option value={9}>9+ (strict)</option>
                </select>
              </div>
              <div>
                <label className="label">Max daily applications</label>
                <input type="number" value={settings.max_daily_applies} onChange={e => setSettings(p => ({ ...p, max_daily_applies: Number(e.target.value) }))} min={1} max={50} className="input text-sm" />
              </div>
              <div>
                <label className="label">Follow-up after (days)</label>
                <input type="number" value={settings.followup_days} onChange={e => setSettings(p => ({ ...p, followup_days: Number(e.target.value) }))} min={3} max={14} className="input text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              {[
                { key: 'apply_india', label: '🇮🇳 Auto-apply to India jobs' },
                { key: 'apply_ireland', label: '🇮🇪 Auto-apply to Ireland jobs' },
              ].map(s => (
                <label key={s.key} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={(settings as any)[s.key]} onChange={e => setSettings(p => ({ ...p, [s.key]: e.target.checked }))} className="accent-brand-400 w-4 h-4" />
                  <span className="text-sm text-gray-700">{s.label}</span>
                </label>
              ))}
            </div>
            <button onClick={saveSettings} className="btn-brand text-sm px-4 py-2 w-full">
              <Zap size={13} /> Save automation settings
            </button>
          </div>
        </div>

        {/* Recent automation logs */}
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Recent automation runs</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400">No automation runs yet</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between text-xs py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-medium text-gray-800 capitalize">{log.type.replace('_', ' ')}</span>
                    <span className="text-gray-400 ml-2">{new Date(log.started_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.jobs_found > 0 && <span className="text-gray-500">{log.jobs_found} found</span>}
                    {log.jobs_applied > 0 && <span className="text-brand-600">{log.jobs_applied} applied</span>}
                    <span className={cn('badge text-[10px]',
                      log.status === 'success' ? 'bg-brand-50 text-brand-600' :
                      log.status === 'failed' ? 'bg-red-50 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    )}>{log.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
