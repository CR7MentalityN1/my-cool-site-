/*
  # Add current_members to projects table

  ## Changes
  - Add `current_members` (jsonb array) to store project member names
*/

-- Add current_members column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS current_members jsonb DEFAULT '[]';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(created_at DESC);
