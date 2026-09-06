/*
  # Add Specialization/Role Field to Profiles

  ## Overview
  This migration adds the ability to track user specializations/roles within their faculty.

  ## Changes
  
  ### `profiles`
  - Add `specialization` (text, nullable) - Tracks the user's specific role/specialization within their faculty
*/

-- Add specialization column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_specialization ON profiles(specialization);
