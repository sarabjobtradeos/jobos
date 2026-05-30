'use client'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { Profile } from '@/lib/supabase'
import { Save, Plus, X, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { profile, setProfile } = useStore()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Profile>>({
    full_name: '', email: '', phone: '', location_city: '', location_country: '',
    linkedin_url: '', portfolio_url: '', years_experience: 0, current_title: '',
    background_summary: '', target_roles: [], skills: [],
    india_active: true, ireland_active: true,
    india_locations: ['Remote', 'Bengaluru', 'Mumbai'],
    ireland_locations: ['Remote', 'Dublin'],
    india_salary_min: 0, india_salary_max: 0,
    ireland_salary_min: 0, ireland_salary_max: 0,
    experience_level: 'mid', portals: ['linkedin', 'naukri'],
    relocation_open: true, visa_sponsorship_required: true,
  })
  const [newRole, setNewRole] = useState('')
  const [newSkill, setNewSkill] = useState('')

  useEffect(() => { if (profile) setForm({ ...profile }) }, [profile])

  function update(key: keyof Profile, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function addRole() {
    if (!newRole.trim()) return
    update('target_roles', [...(form.target_roles || []), newRole.trim()])
    setNewRole('')
  }

  function removeRole(r: string) {
    update('target_roles', form.target_roles?.filter(x => x !== r))
  }

  function addSkill() {
    if (!newSkill.trim()) return
    update('skills', [...(form.skills || []), newSkill.trim()])
    setNewSkill('')
  }

  function removeSkill(s: string) {
    update('skills', form.skills?.filter(x => x !== s))
  }

  function togglePortal(p: string) {
    const current = form.portals || []
    update('portals', current.includes(p as any)
      ? current.filter(x => x !== p)
      : [...current, p as any]
    )
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ ...form, id: user.id, email: user.email })
      .select()
      .single()
    if (error) { toast.error('Save failed: ' + error.message) }
    else { setProfile(data); toast.success('Profile saved!') }
    setSaving(false)
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Profile & Preferences</h1>
          <button onClick={save} disabled={saving} className="btn-brand text-sm px-4 py-2">
            <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>

        {/* Personal info */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Personal Information</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: 'Full name', key: 'full_name', placeholder: 'Your Name' },
              { label: 'Current title', key: 'current_title', placeholder: 'e.g. Senior Product Designer' },
              { label: 'Phone', key: 'phone', placeholder: '+91 ...' },
              { label: 'City', key: 'location_city', placeholder: 'Bengaluru' },
              { label: 'LinkedIn URL', key: 'linkedin_url', placeholder: 'linkedin.com/in/...' },
              { label: 'Portfolio URL', key: 'portfolio_url', placeholder: 'yoursite.com' },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input
                  type="text"
                  value={(form as any)[f.key] || ''}
                  onChange={e => update(f.key as any, e.target.value)}
                  placeholder={f.placeholder}
                  className="input text-sm"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="label">Years of experience</label>
            <input
              type="number"
              value={form.years_experience || ''}
              onChange={e => update('years_experience', Number(e.target.value))}
              className="input text-sm w-24"
            />
          </div>
          <div>
            <label className="label">Background summary (used by AI for tailoring)</label>
            <textarea
              value={form.background_summary || ''}
              onChange={e => update('background_summary', e.target.value)}
              rows={3}
              placeholder="Brief summary of your background, key strengths, and what you bring..."
              className="input text-sm resize-none"
            />
          </div>
        </div>

        {/* Target roles */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Target Roles</h2>
          <div className="flex flex-wrap gap-2">
            {form.target_roles?.map(r => (
              <span key={r} className="badge badge-brand gap-1.5">
                {r}
                <button onClick={() => removeRole(r)}><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRole()}
              placeholder="Add role e.g. Product Designer"
              className="input text-sm flex-1"
            />
            <button onClick={addRole} className="btn-outline text-sm px-3"><Plus size={14} /></button>
          </div>
        </div>

        {/* Skills */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {form.skills?.map(s => (
              <span key={s} className="badge badge-brand gap-1.5">
                {s}
                <button onClick={() => removeSkill(s)}><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
              placeholder="Add skill e.g. Figma, React, Python"
              className="input text-sm flex-1"
            />
            <button onClick={addSkill} className="btn-outline text-sm px-3"><Plus size={14} /></button>
          </div>
        </div>

        {/* Job tracks */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Job Search Tracks</h2>

          {/* India */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🇮🇳</span>
                <span className="text-sm font-medium text-gray-800">India Track</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.india_active} onChange={e => update('india_active', e.target.checked)} className="accent-brand-400" />
                <span className="text-xs text-gray-500">Active</span>
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Min salary (₹ LPA)</label>
                <input type="number" value={(form.india_salary_min || 0) / 100000 || ''} onChange={e => update('india_salary_min', Number(e.target.value) * 100000)} placeholder="e.g. 15" className="input text-sm" />
              </div>
              <div>
                <label className="label">Max salary (₹ LPA)</label>
                <input type="number" value={(form.india_salary_max || 0) / 100000 || ''} onChange={e => update('india_salary_max', Number(e.target.value) * 100000)} placeholder="e.g. 35" className="input text-sm" />
              </div>
            </div>
          </div>

          {/* Ireland */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🇮🇪</span>
                <span className="text-sm font-medium text-gray-800">Ireland / Europe Track</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.ireland_active} onChange={e => update('ireland_active', e.target.checked)} className="accent-brand-400" />
                <span className="text-xs text-gray-500">Active</span>
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Min salary (€K/year)</label>
                <input type="number" value={(form.ireland_salary_min || 0) / 1000 || ''} onChange={e => update('ireland_salary_min', Number(e.target.value) * 1000)} placeholder="e.g. 55" className="input text-sm" />
              </div>
              <div>
                <label className="label">Max salary (€K/year)</label>
                <input type="number" value={(form.ireland_salary_max || 0) / 1000 || ''} onChange={e => update('ireland_salary_max', Number(e.target.value) * 1000)} placeholder="e.g. 85" className="input text-sm" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.visa_sponsorship_required} onChange={e => update('visa_sponsorship_required', e.target.checked)} className="accent-brand-400" />
              <span className="text-sm text-gray-700">Only show jobs with visa sponsorship</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.relocation_open} onChange={e => update('relocation_open', e.target.checked)} className="accent-brand-400" />
              <span className="text-sm text-gray-700">Open to relocation support</span>
            </label>
          </div>
        </div>

        {/* Portals */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Job Portals</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['linkedin', 'naukri', 'indeed', 'glassdoor'].map(portal => {
              const active = form.portals?.includes(portal as any)
              return (
                <button
                  key={portal}
                  onClick={() => togglePortal(portal)}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all',
                    active ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {active && <CheckCircle2 size={13} className="text-brand-600" />}
                  <span className="capitalize">{portal}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end pb-8">
          <button onClick={save} disabled={saving} className="btn-brand px-6 py-2.5">
            <Save size={15} /> {saving ? 'Saving...' : 'Save all changes'}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
