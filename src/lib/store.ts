import { create } from 'zustand'
import { Profile, Job, Application, PortalSession, AutomationLog } from './supabase'

interface AppState {
  // Auth
  user: any | null
  profile: Profile | null
  setUser: (user: any) => void
  setProfile: (profile: Profile | null) => void

  // Jobs
  jobs: Job[]
  todayJobs: Job[]
  setJobs: (jobs: Job[]) => void
  setTodayJobs: (jobs: Job[]) => void

  // Applications
  applications: Application[]
  setApplications: (apps: Application[]) => void
  updateApplication: (id: string, updates: Partial<Application>) => void

  // Portal health
  portalSessions: PortalSession[]
  setPortalSessions: (sessions: PortalSession[]) => void

  // Automation
  lastScanLog: AutomationLog | null
  setLastScanLog: (log: AutomationLog | null) => void
  isScanning: boolean
  setIsScanning: (v: boolean) => void

  // UI
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  activeRegion: 'all' | 'india' | 'ireland'
  setActiveRegion: (r: 'all' | 'india' | 'ireland') => void

  // Stats (computed)
  stats: {
    totalApplied: number
    indiaApplied: number
    irelandApplied: number
    inReview: number
    interviews: number
    offers: number
    avgFitScore: number
    responseRate: number
  }
  computeStats: () => void
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  jobs: [],
  todayJobs: [],
  setJobs: (jobs) => set({ jobs }),
  setTodayJobs: (jobs) => set({ todayJobs: jobs }),

  applications: [],
  setApplications: (applications) => {
    set({ applications })
    get().computeStats()
  },
  updateApplication: (id, updates) => {
    set(state => ({
      applications: state.applications.map(a =>
        a.id === id ? { ...a, ...updates } : a
      )
    }))
    get().computeStats()
  },

  portalSessions: [],
  setPortalSessions: (portalSessions) => set({ portalSessions }),

  lastScanLog: null,
  setLastScanLog: (log) => set({ lastScanLog: log }),
  isScanning: false,
  setIsScanning: (isScanning) => set({ isScanning }),

  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  activeRegion: 'all',
  setActiveRegion: (activeRegion) => set({ activeRegion }),

  stats: {
    totalApplied: 0, indiaApplied: 0, irelandApplied: 0,
    inReview: 0, interviews: 0, offers: 0, avgFitScore: 0, responseRate: 0,
  },
  computeStats: () => {
    const { applications } = get()
    const totalApplied = applications.length
    const indiaApplied = applications.filter(a => a.region === 'india').length
    const irelandApplied = applications.filter(a => a.region === 'ireland').length
    const inReview = applications.filter(a => ['under_review','shortlisted','viewed'].includes(a.status)).length
    const interviews = applications.filter(a => ['interview_scheduled','interview_done'].includes(a.status)).length
    const offers = applications.filter(a => a.status === 'offer').length
    const responded = applications.filter(a => !['applied','ghosted'].includes(a.status)).length
    const responseRate = totalApplied > 0 ? Math.round((responded / totalApplied) * 100) : 0
    const jobsWithScore = applications.filter(a => a.job?.fit_score)
    const avgFitScore = jobsWithScore.length > 0
      ? jobsWithScore.reduce((acc, a) => acc + (a.job?.fit_score || 0), 0) / jobsWithScore.length
      : 0

    set({ stats: {
      totalApplied, indiaApplied, irelandApplied,
      inReview, interviews, offers,
      avgFitScore: Math.round(avgFitScore * 10) / 10,
      responseRate,
    }})
  },
}))
