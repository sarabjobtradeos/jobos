import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// DATABASE TYPES
// ============================================

export type Region = 'india' | 'ireland' | 'global'
export type Portal = 'linkedin' | 'naukri' | 'indeed' | 'glassdoor'
export type ApplicationStatus =
  | 'applied' | 'viewed' | 'under_review' | 'shortlisted'
  | 'interview_scheduled' | 'interview_done' | 'offer' | 'rejected' | 'withdrawn' | 'ghosted'
export type JobStatus = 'new' | 'reviewing' | 'applying' | 'applied' | 'skipped' | 'duplicate'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  location_city?: string
  location_country?: string
  linkedin_url?: string
  portfolio_url?: string
  years_experience?: number
  current_title?: string
  background_summary?: string
  target_roles: string[]
  india_active: boolean
  ireland_active: boolean
  india_locations: string[]
  ireland_locations: string[]
  india_salary_min?: number
  india_salary_max?: number
  ireland_salary_min?: number
  ireland_salary_max?: number
  experience_level?: string
  skills: string[]
  portals: Portal[]
  relocation_open: boolean
  visa_sponsorship_required: boolean
  created_at: string
  updated_at: string
}

export interface Resume {
  id: string
  user_id: string
  name: string
  region: Region
  content: string
  file_url?: string
  file_name?: string
  is_base: boolean
  job_id?: string
  version: number
  word_count?: number
  created_at: string
}

export interface CoverLetter {
  id: string
  user_id: string
  name: string
  region: Region
  content: string
  is_base: boolean
  job_id?: string
  version: number
  created_at: string
}

export interface Job {
  id: string
  user_id: string
  external_id?: string
  title: string
  company: string
  company_logo?: string
  location: string
  region: Region
  portal: Portal
  portal_url?: string
  description?: string
  salary_min?: number
  salary_max?: number
  salary_currency: string
  employment_type?: string
  remote_type?: string
  experience_required?: string
  skills_required?: string[]
  visa_sponsorship?: boolean
  relocation_support?: boolean
  fit_score?: number
  fit_reasoning?: string
  jd_intelligence?: {
    what_they_want: string
    red_flags: string[]
    lead_with: string
    urgency: 'high' | 'medium' | 'low'
  }
  is_duplicate?: boolean
  posted_at?: string
  discovered_at: string
  status: JobStatus
  glassdoor_rating?: number
  company_size?: string
  company_industry?: string
  company_news?: any[]
  referral_connections?: any[]
}

export interface Application {
  id: string
  user_id: string
  job_id: string
  resume_id?: string
  cover_letter_id?: string
  portal: Portal
  region: Region
  status: ApplicationStatus
  applied_at: string
  last_updated: string
  interview_date?: string
  interview_type?: string
  interview_notes?: string
  offer_amount?: number
  offer_currency?: string
  last_followup_at?: string
  followup_count: number
  next_followup_at?: string
  rejection_reason?: string
  notes?: string
  // joined
  job?: Job
}

export interface PortalSession {
  id: string
  user_id: string
  portal: Portal
  is_active: boolean
  last_checked?: string
  last_active?: string
  error_message?: string
}

export interface AutomationLog {
  id: string
  user_id: string
  type: string
  status: 'running' | 'success' | 'failed'
  details?: any
  jobs_found: number
  jobs_applied: number
  error?: string
  started_at: string
  completed_at?: string
}
