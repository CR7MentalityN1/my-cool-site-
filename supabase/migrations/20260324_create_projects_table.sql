/*
  # Create Projects Table

  ## Overview
  This migration creates the projects table for the StudyConnect platform.

  ## New Table
  
  ### `projects`
  Stores project information including:
  - `id` (uuid, primary key) - Unique project identifier
  - `title` (text) - Project title
  - `description` (text) - Project description
  - `image_url` (text) - Project cover image URL
  - `owner_id` (uuid, foreign key) - References auth.users for project owner
  - `required_roles` (text array) - List of required roles/skills
  - `created_at` (timestamptz) - Project creation timestamp

  ## Security
  - Enable RLS on projects table
  - Anyone can view all projects
  - Only project owner can update/delete their project
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  required_roles text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Create project_applications table for tracking user applications
CREATE TABLE IF NOT EXISTS project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_applications_project_id ON project_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_user_id ON project_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_status ON project_applications(status);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can update their projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete their projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can view all applications"
  ON project_applications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create applications"
  ON project_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Project owners can update applications on their projects"
  ON project_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_applications.project_id AND projects.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_applications.project_id AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own applications"
  ON project_applications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM projects WHERE projects.id = project_applications.project_id AND projects.owner_id = auth.uid()));
