'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Briefcase, ListChecks, FileText, User,
  Building2, Bot, Calendar, Mail, BarChart3, FileBarChart,
  LogOut, Menu, X, Bell, ChevronRight, Globe, Flag
} from 'lucide-react'

const navItems = [
  {
    section: 'Overview',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/jobs', icon: Briefcase, label: 'Job Matches', badge: 'new' },
      { href: '/applications', icon: ListChecks, label: 'Applications' },
    ]
  },
  {
    section: 'Your Profile',
    items: [
      { href: '/resumes', icon: FileText, label: 'Resumes & Cover Letters' },
      { href: '/profile', icon: User, label: 'Profile & Preferences' },
      { href: '/companies', icon: Building2, label: 'Companies' },
    ]
  },
  {
    section: 'Automation',
    items: [
      { href: '/automation', icon: Bot, label: 'AI & Automation' },
      { href: '/interviews', icon: Calendar, label: 'Interviews' },
      { href: '/followups', icon: Mail, label: 'Follow-ups', badge: 'action' },
    ]
  },
  {
    section: 'Reports',
    items: [
      { href: '/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/reports', icon: FileBarChart, label: 'Weekly Report' },
    ]
  },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, sidebarOpen, setSidebarOpen, jobs, applications } = useStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const newJobsCount = jobs.filter(j => j.status === 'new').length
  const actionFollowups = applications.filter(a =>
    a.next_followup_at && new Date(a.next_followup_at) <= new Date()
  ).length

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-400 flex items-center justify-center">
            <span className="text-white text-sm font-bold">J</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 leading-none">JobOS</div>
            <div className="text-[10px] text-gray-400 mt-0.5">automated search</div>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div className="px-3 py-3 border-b border-gray-100">
        <div className="flex gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-india-50 text-india-600 text-[10px] font-medium">
            🇮🇳 India
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-ireland-50 text-ireland-600 text-[10px] font-medium">
            🇮🇪 Ireland
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navItems.map(section => (
          <div key={section.section} className="mb-4">
            <div className="px-2 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {section.section}
            </div>
            {section.items.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const badgeCount = item.badge === 'new' ? newJobsCount : item.badge === 'action' ? actionFollowups : 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm mb-0.5 transition-all',
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon size={15} className={isActive ? 'text-brand-600' : 'text-gray-400'} />
                  <span className="flex-1">{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="text-[10px] font-semibold bg-brand-400 text-white px-1.5 py-0.5 rounded-full font-mono">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-xs font-semibold text-brand-700">
            {profile?.full_name ? getInitials(profile.full_name) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">{profile?.full_name || 'Your Name'}</div>
            <div className="text-[10px] text-gray-400 truncate">{profile?.current_title || 'Set up profile'}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-white border-r border-gray-100 transition-all duration-200 flex-shrink-0',
        sidebarOpen ? 'w-52' : 'w-0 overflow-hidden'
      )}>
        <NavContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-white h-full shadow-xl">
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => { setSidebarOpen(!sidebarOpen); setMobileOpen(!mobileOpen) }}
            className="btn-ghost p-1.5 -ml-1"
          >
            <Menu size={18} className="text-gray-500" />
          </button>
          <div className="flex-1" />
          <button className="btn-ghost p-1.5 relative">
            <Bell size={16} className="text-gray-500" />
            {actionFollowups > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand-400 rounded-full" />
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
