-- ============================================
-- JobOS Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USER PROFILE
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  location_city text,
  location_country text,
  linkedin_url text,
  portfolio_url text,
  years_experience int,
  current_title text,
  background_summary text,
  target_roles text[], -- array of role titles
  india_active boolean default true,
  ireland_active boolean default true,
  india_locations text[] default array['Remote', 'Bengaluru', 'Mumbai', 'Hyderabad', 'Pune'],
  ireland_locations text[] default array['Remote', 'Dublin', 'Cork'],
  india_salary_min int,
  india_salary_max int,
  ireland_salary_min int,
  ireland_salary_max int,
  experience_level text check (experience_level in ('junior','mid','senior','lead','manager')),
  skills text[],
  portals text[] default array['linkedin','naukri','indeed','glassdoor'],
  relocation_open boolean default true,
  visa_sponsorship_required boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- RESUMES
-- ============================================
create table public.resumes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null, -- e.g. "India Base Resume v2"
  region text check (region in ('india','ireland','global')) not null,
  content text not null, -- full resume text
  file_url text, -- stored in Supabase Storage
  file_name text,
  is_base boolean default false, -- is this the base template
  job_id uuid, -- if tailored for a specific job
  version int default 1,
  word_count int,
  created_at timestamptz default now()
);

-- ============================================
-- COVER LETTERS
-- ============================================
create table public.cover_letters (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  region text check (region in ('india','ireland','global')) not null,
  content text not null,
  is_base boolean default false,
  job_id uuid,
  version int default 1,
  created_at timestamptz default now()
);

-- ============================================
-- JOBS
-- ============================================
create table public.jobs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  external_id text, -- job ID from portal
  title text not null,
  company text not null,
  company_logo text,
  location text,
  region text check (region in ('india','ireland','global')) not null,
  portal text not null, -- linkedin, naukri, indeed, glassdoor
  portal_url text,
  description text,
  salary_min int,
  salary_max int,
  salary_currency text default 'INR',
  employment_type text, -- full-time, contract, part-time
  remote_type text, -- remote, hybrid, onsite
  experience_required text,
  skills_required text[],
  visa_sponsorship boolean default false,
  relocation_support boolean default false,
  fit_score numeric(3,1), -- 1.0 to 10.0
  fit_reasoning text,
  jd_intelligence jsonb, -- {red_flags, what_they_want, lead_with, urgency}
  is_duplicate boolean default false,
  duplicate_of uuid,
  posted_at timestamptz,
  discovered_at timestamptz default now(),
  status text default 'new' check (status in ('new','reviewing','applying','applied','skipped','duplicate')),
  -- company research
  glassdoor_rating numeric(2,1),
  company_size text,
  company_industry text,
  company_news jsonb,
  referral_connections jsonb -- linkedin connections at company
);

-- ============================================
-- APPLICATIONS
-- ============================================
create table public.applications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  resume_id uuid references public.resumes(id),
  cover_letter_id uuid references public.cover_letters(id),
  portal text not null,
  region text not null,
  status text default 'applied' check (status in (
    'applied','viewed','under_review','shortlisted',
    'interview_scheduled','interview_done','offer','rejected','withdrawn','ghosted'
  )),
  applied_at timestamptz default now(),
  last_updated timestamptz default now(),
  -- interview tracking
  interview_date timestamptz,
  interview_type text, -- phone, video, onsite, technical
  interview_notes text,
  -- offer details
  offer_amount int,
  offer_currency text,
  offer_details jsonb,
  -- follow-up
  last_followup_at timestamptz,
  followup_count int default 0,
  next_followup_at timestamptz,
  -- rejection analysis
  rejection_reason text,
  rejection_stage text,
  -- notes
  notes text
);

-- ============================================
-- FOLLOW-UPS
-- ============================================
create table public.followups (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  draft_content text,
  sent_at timestamptz,
  status text default 'draft' check (status in ('draft','sent','responded','skipped'))
);

-- ============================================
-- WEEKLY REPORTS
-- ============================================
create table public.weekly_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  total_applied int default 0,
  india_applied int default 0,
  ireland_applied int default 0,
  interviews_scheduled int default 0,
  response_rate numeric(5,2),
  avg_fit_score numeric(3,1),
  top_companies text[],
  rejection_patterns jsonb,
  recommendations text[],
  report_html text,
  created_at timestamptz default now()
);

-- ============================================
-- PORTAL SESSIONS
-- ============================================
create table public.portal_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  portal text not null,
  is_active boolean default false,
  last_checked timestamptz,
  last_active timestamptz,
  error_message text,
  updated_at timestamptz default now()
);

-- ============================================
-- AUTOMATION LOGS
-- ============================================
create table public.automation_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null, -- job_scan, apply, followup, report
  status text check (status in ('running','success','failed')),
  details jsonb,
  jobs_found int default 0,
  jobs_applied int default 0,
  error text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.cover_letters enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.followups enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.portal_sessions enable row level security;
alter table public.automation_logs enable row level security;

-- Policies: users can only see their own data
create policy "Users own their profile" on public.profiles for all using (auth.uid() = id);
create policy "Users own their resumes" on public.resumes for all using (auth.uid() = user_id);
create policy "Users own their cover letters" on public.cover_letters for all using (auth.uid() = user_id);
create policy "Users own their jobs" on public.jobs for all using (auth.uid() = user_id);
create policy "Users own their applications" on public.applications for all using (auth.uid() = user_id);
create policy "Users own their followups" on public.followups for all using (auth.uid() = user_id);
create policy "Users own their reports" on public.weekly_reports for all using (auth.uid() = user_id);
create policy "Users own their sessions" on public.portal_sessions for all using (auth.uid() = user_id);
create policy "Users own their logs" on public.automation_logs for all using (auth.uid() = user_id);

-- ============================================
-- INDEXES for performance
-- ============================================
create index jobs_user_status on public.jobs(user_id, status);
create index jobs_region on public.jobs(user_id, region);
create index jobs_fit_score on public.jobs(user_id, fit_score desc);
create index applications_user_status on public.applications(user_id, status);
create index applications_applied_at on public.applications(user_id, applied_at desc);

-- ============================================
-- AUTO-UPDATE updated_at
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function update_updated_at();
