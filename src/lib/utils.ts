import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSalary(min?: number, max?: number, currency = 'INR') {
  if (!min && !max) return 'Not disclosed'
  const fmt = (n: number) => {
    if (currency === 'INR') {
      if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`
      return `₹${(n / 1000).toFixed(0)}K`
    }
    if (n >= 1000) return `€${(n / 1000).toFixed(0)}K`
    return `€${n}`
  }
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  return `Up to ${fmt(max!)}`
}

export function formatDate(date: string) {
  const d = new Date(date)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

export function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function scoreClass(score: number) {
  if (score >= 8) return 'score-high'
  if (score >= 6) return 'score-mid'
  return 'score-low'
}

export function scoreLabel(score: number) {
  if (score >= 9) return 'Excellent match'
  if (score >= 8) return 'Strong match'
  if (score >= 7) return 'Good match'
  if (score >= 6) return 'Decent match'
  return 'Weak match'
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    under_review: 'bg-brand-50 text-brand-600',
    shortlisted: 'bg-brand-100 text-brand-700',
    interview_scheduled: 'bg-india-50 text-india-600',
    interview_done: 'bg-india-100 text-india-700',
    offer: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
    withdrawn: 'bg-gray-100 text-gray-600',
    ghosted: 'bg-gray-100 text-gray-500',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    applied: 'Applied',
    viewed: 'Viewed',
    under_review: 'In Review',
    shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview',
    interview_done: 'Post-Interview',
    offer: 'Offer Received',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    ghosted: 'No Response',
  }
  return map[status] || status
}

export function portalIcon(portal: string) {
  const map: Record<string, string> = {
    linkedin: '🔗',
    naukri: '💼',
    indeed: '🔍',
    glassdoor: '🏢',
  }
  return map[portal] || '🌐'
}

export function portalColor(portal: string) {
  const map: Record<string, string> = {
    linkedin: 'bg-blue-50 text-blue-700',
    naukri: 'bg-orange-50 text-orange-700',
    indeed: 'bg-indigo-50 text-indigo-700',
    glassdoor: 'bg-green-50 text-green-700',
  }
  return map[portal] || 'bg-gray-50 text-gray-700'
}

export function regionFlag(region: string) {
  if (region === 'india') return '🇮🇳'
  if (region === 'ireland') return '🇮🇪'
  return '🌍'
}

export function truncate(text: string, length = 120) {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
