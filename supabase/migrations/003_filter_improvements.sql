-- Migration: 003_filter_improvements.sql
-- Run this in Supabase SQL Editor after 001 and 002

-- Add outside_preference flag to jobs table
-- This is set to true when fallback filter is used (strict exp filter returned 0 results)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS outside_preference boolean DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS freshness_score float DEFAULT 0.5;

-- Add experience range columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_min integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_max integer DEFAULT 10;

-- Index for fast filtering of outside-preference jobs
CREATE INDEX IF NOT EXISTS idx_jobs_outside_preference ON jobs(user_id, outside_preference);
