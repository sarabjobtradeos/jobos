'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Linkedin, CheckCircle2, AlertCircle, ChevronRight,
  RefreshCw, Zap, User, Briefcase, Star, Globe, Award,
  ArrowRight, Copy, Check, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

type SyncSuggestion = {
  id: string
  section: string
  icon: string
  priority: 'high' | 'medium' | 'low'
  current: string
  suggested: string
  reason: string
  impact: string
  applied?: boolean
}

const PRIORITY_COLORS = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-blue-50 border-blue-200 text-blue-700',
}

const PRIORITY_LABELS = {
  high: '🔥 High impact',
  medium: '⚡ Medium impact',
  low: '💡 Nice to have',
}

export default function LinkedInSyncPage() {
  const { profile } = useStore()
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SyncSuggestion[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [generated, setGenerated] = useState(false)

  async function generateSuggestions() {
    if (!profile) { toast.error('Complete your profile first'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/linkedin-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            name: profile.full_name,
            title: profile.current_title,
            summary: profile.background_summary,
            skills: profile.skills,
            targetRoles: profile.target_roles,
            yearsExp: profile.years_experience,
            region: profile.ireland_active ? 'ireland' : 'india',
          }
        }),
      })
      const data = await res.json()
      setSuggestions(data.suggestions || fallbackSuggestions(profile))
      setScore(data.profileScore || 72)
      setGenerated(true)
    } catch {
      // Fallback to static suggestions based on profile
      setSuggestions(fallbackSuggestions(profile))
      setScore(68)
      setGenerated(true)
    }
    setLoading(false)
  }

  function fallbackSuggestions(p: typeof profile): SyncSuggestion[] {
    const region = p?.ireland_active ? 'Ireland/EU' : 'India'
    const currency = p?.ireland_active ? '€' : '₹'
    const suggestions: SyncSuggestion[] = []

    if (p?.current_title) {
      suggestions.push({
        id: 'headline',
        section: 'Headline',
        icon: '✏️',
        priority: 'high',
        current: p.current_title,
        suggested: `${p.current_title} | Open to ${p.target_roles?.[0] || 'new roles'} in ${region} | ${p.skills?.slice(0,3).join(', ')}`,
        reason: 'LinkedIn headlines with keywords get 3x more recruiter views. Include your target role + top 3 skills.',
        impact: '+40% recruiter visibility',
      })
    }

    if (p?.background_summary) {
      suggestions.push({
        id: 'about',
        section: 'About',
        icon: '📝',
        priority: 'high',
        current: p.background_summary.slice(0, 120) + '...',
        suggested: `${p.background_summary}\n\n🔍 Currently exploring ${p.target_roles?.join(', ') || 'new opportunities'} in ${region}.\n\n📩 Open to work — feel free to connect or reach out directly.`,
        reason: 'Adding "open to work" signal and target roles in the About section increases inbound recruiter messages.',
        impact: '+55% inbound messages',
      })
    }

    if (p?.skills && p.skills.length < 10) {
      suggestions.push({
        id: 'skills',
        section: 'Skills',
        icon: '🎯',
        priority: 'high',
        current: `${p.skills?.length || 0} skills listed`,
        suggested: `Add: ${['Problem Solving', 'Agile', 'Cross-functional Collaboration', 'Data Analysis', 'Project Management'].filter(s => !p.skills?.includes(s)).slice(0,4).join(', ')}`,
        reason: 'Profiles with 5+ skills get 17x more profile views. Add transferable skills your roles implied but you haven\'t listed.',
        impact: '17x more views',
      })
    }

    suggestions.push({
      id: 'open_to_work',
      section: 'Open To Work',
      icon: '🟢',
      priority: 'high',
      current: 'Status unknown',
      suggested: `Enable "Open to Work" frame visible to recruiters only (not public). Set: ${p?.target_roles?.join(', ')} · ${region} · Remote/Hybrid`,
      reason: 'The #OpenToWork recruiter-only setting increases recruiter outreach by 2x without signalling to your current employer.',
      impact: '2x recruiter outreach',
    })

    suggestions.push({
      id: 'featured',
      section: 'Featured Section',
      icon: '⭐',
      priority: 'medium',
      current: 'Not set',
      suggested: 'Pin your portfolio/GitHub/best project as a Featured item. For Ireland track, add a link to your work permit status if applicable.',
      reason: 'Featured section is above the fold — recruiters see it before reading your experience. Use it as a visual resume.',
      impact: 'First impression boost',
    })

    suggestions.push({
      id: 'connections',
      section: 'Network',
      icon: '🤝',
      priority: 'medium',
      current: 'Unknown',
      suggested: 'Connect with 10 recruiters at your target companies this week. Use "Connect + note": "Hi [Name], I\'m exploring [role] at [company]. Would love to be on your radar."',
      reason: 'LinkedIn recruiter searches prioritize 1st and 2nd connections. 500+ connections unlocks the "500+" badge that signals an active profile.',
      impact: 'Direct recruiter access',
    })

    suggestions.push({
      id: 'activity',
      section: 'Activity & Posts',
      icon: '📣',
      priority: 'low',
      current: 'No recent activity',
      suggested: 'Post 1x/week: share a project insight, comment on industry news, or repost a thought leader. Use hashtags: #OpenToWork #[YourField] #[Region]Jobs',
      reason: 'Active profiles appear higher in recruiter search results. Even 1 post/week significantly boosts your SSI (Social Selling Index).',
      impact: 'Algorithm boost',
    })

    suggestions.push({
      id: 'profile_photo',
      section: 'Profile Photo',
      icon: '📸',
      priority: 'low',
      current: 'Status unknown',
      suggested: 'Use a professional headshot with plain/blurred background. LinkedIn profiles with photos get 21x more views. Use remove.bg to clean up any existing photo.',
      impact: '21x more views',
      reason: 'First visual impression matters. A clear, professional photo signals you\'re serious about your search.',
    })

    return suggestions
  }

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(null), 2000)
  }

  function markApplied(id: string) {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, applied: !s.applied } : s))
    toast.success('Marked as done ✓')
  }

  const appliedCount = suggestions.filter(s => s.applied).length
  const highCount = suggestions.filter(s => s.priority === 'high' && !s.applied).length

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5 pb-10">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-[#0A66C2]" />
            LinkedIn Profile Sync
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI suggestions to optimise your LinkedIn for {profile?.ireland_active ? 'Ireland/EU' : 'India'} job search
          </p>
        </div>

        {/* Score + CTA card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          {generated ? (
            <div className="flex items-center gap-5">
              {/* Score ring */}
              <div className="relative flex-shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke={score! >= 80 ? '#22c55e' : score! >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeDasharray={`${(score! / 100) * 201} 201`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{score}</span>
                  <span className="text-[10px] text-gray-400">/100</span>
                </div>
              </div>

              <div className="flex-1">
                <div className="font-semibold text-gray-800">
                  {score! >= 80 ? 'Strong profile 🎉' : score! >= 60 ? 'Good — room to grow' : 'Needs attention ⚠️'}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {appliedCount}/{suggestions.length} suggestions applied
                  {highCount > 0 && <span className="text-red-600 font-medium"> · {highCount} high-impact pending</span>}
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-400 rounded-full transition-all duration-500"
                    style={{ width: `${(appliedCount / suggestions.length) * 100}%` }}
                  />
                </div>
              </div>

              <button
                onClick={generateSuggestions}
                disabled={loading}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
                title="Regenerate"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#0A66C2]/10 flex items-center justify-center mx-auto">
                <Linkedin className="w-7 h-7 text-[#0A66C2]" />
              </div>
              <div>
                <div className="font-semibold text-gray-800">Analyse your LinkedIn profile</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Get AI suggestions based on your JobOS profile and target roles
                </div>
              </div>
              <button
                onClick={generateSuggestions}
                disabled={loading || !profile}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {loading ? 'Analysing...' : 'Generate Suggestions'}
              </button>
              {!profile && (
                <p className="text-xs text-red-500">Complete your profile first to get suggestions</p>
              )}
            </div>
          )}
        </div>

        {/* Info banner */}
        {generated && (
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-sm text-blue-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              These are suggestions for your LinkedIn profile — copy the text and apply changes directly on{' '}
              <a href="https://linkedin.com/in/me" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                linkedin.com
              </a>. Mark each as done as you go.
            </span>
          </div>
        )}

        {/* Suggestions list */}
        {generated && (
          <div className="space-y-3">
            {(['high', 'medium', 'low'] as const).map(priority => {
              const group = suggestions.filter(s => s.priority === priority)
              if (!group.length) return null
              return (
                <div key={priority}>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                    {PRIORITY_LABELS[priority]}
                  </div>
                  <div className="space-y-2.5">
                    {group.map(s => (
                      <div
                        key={s.id}
                        className={cn(
                          'bg-white rounded-xl border shadow-sm overflow-hidden transition-opacity',
                          s.applied ? 'opacity-50' : ''
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{s.icon}</span>
                              <div>
                                <div className="text-sm font-semibold text-gray-800">{s.section}</div>
                                <span className={cn('text-xs px-1.5 py-0.5 rounded border font-medium inline-block mt-0.5', PRIORITY_COLORS[s.priority])}>
                                  {s.impact}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => markApplied(s.id)}
                              className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex-shrink-0',
                                s.applied
                                  ? 'bg-green-50 border-green-200 text-green-700'
                                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700'
                              )}
                            >
                              {s.applied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                              {s.applied ? 'Done' : 'Mark done'}
                            </button>
                          </div>

                          {/* Reason */}
                          <p className="text-xs text-gray-500 mt-2.5 leading-relaxed">{s.reason}</p>

                          {/* Current → Suggested */}
                          <div className="mt-3 space-y-2">
                            {s.current && s.current !== 'Status unknown' && s.current !== 'Not set' && s.current !== 'No recent activity' && s.current !== 'Unknown' && (
                              <div className="bg-red-50 rounded-lg p-2.5">
                                <div className="text-[10px] text-red-400 font-medium uppercase tracking-wide mb-1">Current</div>
                                <p className="text-xs text-red-700 leading-relaxed line-clamp-2">{s.current}</p>
                              </div>
                            )}
                            <div className="bg-green-50 rounded-lg p-2.5">
                              <div className="text-[10px] text-green-500 font-medium uppercase tracking-wide mb-1">Suggested</div>
                              <p className="text-xs text-green-800 leading-relaxed">{s.suggested}</p>
                            </div>
                          </div>

                          {/* Copy button */}
                          {s.suggested.length > 40 && (
                            <button
                              onClick={() => copyText(s.id, s.suggested)}
                              className="mt-2.5 flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 transition-colors"
                            >
                              {copied === s.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copied === s.id ? 'Copied!' : 'Copy text'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Open LinkedIn CTA */}
        {generated && (
          <a
            href="https://www.linkedin.com/in/me/edit/intro/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#0A66C2] text-white text-sm font-medium rounded-xl hover:bg-[#004182] transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            Open LinkedIn to apply changes
            <ArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>
    </AppLayout>
  )
}
