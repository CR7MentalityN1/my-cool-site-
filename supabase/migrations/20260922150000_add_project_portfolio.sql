/*
  Project lifecycle and portfolio support.

  The migration is additive: existing projects remain in the recruiting state,
  while accepted members can be stored by id for reliable portfolio records.
*/

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'recruiting'
    CHECK (status IN ('recruiting', 'team_formed', 'completed')),
  ADD COLUMN IF NOT EXISTS result_url text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id
  ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id
  ON project_members(user_id);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project owners can add project members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can update project members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
        AND projects.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can remove project members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- Backfill accepted applications so older projects also appear in portfolios.
INSERT INTO project_members (project_id, user_id, role)
SELECT project_id, user_id, role_applied_for
FROM project_applications
WHERE status = 'accepted'
ON CONFLICT (project_id, user_id) DO NOTHING;

