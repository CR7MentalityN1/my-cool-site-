/*
  # Add Role Tracking to Applications

  ## Overview
  This migration adds the ability to track which role each application is for.

  ## Changes
  
  ### `project_applications`
  - Add `role_applied_for` (text, nullable) - Tracks which role the user is applying for
*/

-- Add role_applied_for column to project_applications
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS role_applied_for text;

-- Create index for better performance when querying by role
CREATE INDEX IF NOT EXISTS idx_project_applications_role ON project_applications(role_applied_for);
