-- Applicants and project owners need the application rows; other users do not.
DROP POLICY IF EXISTS "Anyone can view all applications"
ON public.project_applications;

CREATE POLICY "Applicants and project owners can view applications"
ON public.project_applications FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.projects AS project
    WHERE project.id = project_applications.project_id
      AND project.owner_id = auth.uid()
  )
);

-- Project owners can reject applications, but must not delete another
-- applicant's record. Applicants may withdraw only their own pending rows.
DROP POLICY IF EXISTS "Users can delete their own applications"
ON public.project_applications;
CREATE POLICY "Applicants can withdraw their pending applications"
ON public.project_applications FOR DELETE TO authenticated
USING (user_id = auth.uid() AND status = 'pending');

-- Owners can reject applications, but must not rewrite their applicant,
-- project, role or other fields through the direct table API.
REVOKE UPDATE ON public.project_applications FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status) ON public.project_applications TO authenticated;

-- Membership is created by accept_project_application in one transaction.
-- The function is SECURITY DEFINER; authenticated clients need no direct write access.
DROP POLICY IF EXISTS "Project owners can add project members"
ON public.project_members;
DROP POLICY IF EXISTS "Project owners can update project members"
ON public.project_members;
REVOKE INSERT, UPDATE ON public.project_members FROM PUBLIC, anon, authenticated;

-- Preserve the existing public per-role counts without exposing application rows.
CREATE FUNCTION public.pending_project_application_counts(p_project_ids uuid[])
RETURNS TABLE (project_id uuid, role_applied_for text, application_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT application.project_id, application.role_applied_for, count(*)
  FROM public.project_applications AS application
  WHERE auth.uid() IS NOT NULL
    AND application.status = 'pending'
    AND application.project_id = ANY(p_project_ids)
  GROUP BY application.project_id, application.role_applied_for;
$$;

REVOKE ALL ON FUNCTION public.pending_project_application_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pending_project_application_counts(uuid[]) TO authenticated;
