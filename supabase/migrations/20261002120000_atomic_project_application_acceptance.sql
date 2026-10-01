-- Only pending applications for an open role may be created through the client.
DROP POLICY IF EXISTS "Users can create applications" ON public.project_applications;
CREATE POLICY "Users can create applications"
ON public.project_applications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND NULLIF(btrim(role_applied_for), '') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.projects AS project
    WHERE project.id = project_applications.project_id
      AND project.status = 'recruiting'
      AND project.owner_id <> user_id
  )
);

-- Owners may reject directly; acceptance must use the atomic function below.
DROP POLICY IF EXISTS "Project owners can update applications on their projects"
ON public.project_applications;
CREATE POLICY "Project owners can update applications on their projects"
ON public.project_applications FOR UPDATE TO authenticated
USING (
  status = 'pending' AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_applications.project_id AND owner_id = auth.uid()
  )
)
WITH CHECK (
  status = 'rejected' AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_applications.project_id AND owner_id = auth.uid()
  )
);

-- Accepting an application updates the role, project, application and membership
-- in one transaction. A project row lock serializes concurrent acceptances.
CREATE FUNCTION public.accept_project_application(p_application_id uuid)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_application public.project_applications%ROWTYPE;
  v_project public.projects%ROWTYPE;
  v_roles text[];
  v_raw text;
  v_role jsonb;
  v_key text;
  v_count integer;
  v_taken integer;
  v_name text;
  v_found boolean := false;
  v_index integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Требуется авторизация';
  END IF;

  SELECT * INTO v_application
  FROM public.project_applications
  WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Заявка не найдена';
  END IF;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_application.project_id
  FOR UPDATE;
  IF NOT FOUND OR v_project.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Недостаточно прав для управления этим проектом';
  END IF;

  -- Re-read after locking the project, so a second acceptance cannot use stale data.
  SELECT * INTO v_application
  FROM public.project_applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND OR v_application.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Заявка уже обработана';
  END IF;
  IF NULLIF(btrim(v_application.role_applied_for), '') IS NULL THEN
    RAISE EXCEPTION 'Для заявки необходимо выбрать роль';
  END IF;
  IF v_project.status <> 'recruiting' THEN
    RAISE EXCEPTION 'Набор в проект закрыт';
  END IF;
  IF v_application.user_id = v_project.owner_id OR EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = v_project.id AND user_id = v_application.user_id
  ) THEN
    RAISE EXCEPTION 'Пользователь уже в команде';
  END IF;

  v_roles := COALESCE(v_project.required_roles, ARRAY[]::text[]);
  IF v_application.role_applied_for IS NOT NULL THEN
    FOR v_index IN 1..COALESCE(array_length(v_roles, 1), 0) LOOP
      v_raw := v_roles[v_index];
      IF left(btrim(v_raw), 1) = '{' THEN
        v_role := v_raw::jsonb;
        v_count := GREATEST(1, COALESCE((v_role->>'count')::integer, 1));
        v_taken := LEAST(v_count, GREATEST(0,
          COALESCE((v_role->>'taken')::integer, (v_role->>'filled')::integer, 0)));
        IF v_role ? 'faculty' AND v_role ? 'specialization' THEN
          v_key := v_role->>'faculty' || ' — ' || v_role->>'specialization';
          IF v_count > 1 THEN
            v_key := v_key || ' (' || v_count || ')';
          END IF;
        ELSE
          v_key := v_role->>'label';
        END IF;
      ELSE
        v_role := NULL;
        v_count := 1;
        v_taken := 0;
        IF position('—' IN v_raw) > 0 THEN
          v_key := btrim(split_part(v_raw, '—', 1)) || ' — ' ||
            btrim(substring(v_raw FROM position('—' IN v_raw) + 1));
        ELSE
          v_key := v_raw;
        END IF;
      END IF;

      IF v_key = v_application.role_applied_for THEN
        IF v_taken >= v_count THEN
          RAISE EXCEPTION 'Эта позиция уже закрыта';
        END IF;
        IF v_role IS NULL THEN
          IF position('—' IN v_raw) > 0 THEN
            v_role := jsonb_build_object(
              'faculty', btrim(split_part(v_raw, '—', 1)),
              'specialization', btrim(substring(v_raw FROM position('—' IN v_raw) + 1))
            );
          ELSE
            v_role := jsonb_build_object('label', v_raw);
          END IF;
        END IF;
        v_roles[v_index] := (v_role - 'filled' ||
          jsonb_build_object('count', v_count, 'taken', v_taken + 1))::text;
        v_found := true;
        EXIT;
      END IF;
    END LOOP;
    IF NOT v_found THEN
      RAISE EXCEPTION 'Выбранная роль больше не доступна';
    END IF;
  END IF;

  SELECT COALESCE(name, 'Участник') INTO v_name
  FROM public.profiles WHERE auth_id = v_application.user_id;
  v_name := COALESCE(v_name, 'Участник');

  INSERT INTO public.project_members(project_id, user_id, role)
  VALUES (v_project.id, v_application.user_id, v_application.role_applied_for);

  UPDATE public.project_applications
  SET status = 'accepted'
  WHERE id = v_application.id;

  UPDATE public.projects
  SET required_roles = v_roles,
      current_members = COALESCE(current_members, '[]'::jsonb) || jsonb_build_array(v_name)
  WHERE id = v_project.id
  RETURNING * INTO v_project;

  RETURN v_project;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_project_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_project_application(uuid) TO authenticated;
