// PATCH: Add to navItems in src/components/AppLayout.tsx
// In the "Your Profile" section, add this item:

// { href: '/linkedin-sync', icon: Linkedin, label: 'LinkedIn Sync' },

// Full updated navItems:
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
      { href: '/linkedin-sync', icon: Linkedin, label: 'LinkedIn Sync' },  // ADD THIS
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

// Also add Linkedin to imports:
// import { ..., Linkedin } from 'lucide-react'
