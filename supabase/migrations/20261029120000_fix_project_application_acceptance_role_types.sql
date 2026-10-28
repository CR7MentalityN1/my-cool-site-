-- The original RPC assumed projects.required_roles is text[]. Some existing
-- databases have jsonb instead, causing COALESCE(jsonb, text[]) to fail with
-- 42804. Check the actual schema before replacing the function; do not ALTER
-- either column or rewrite existing project data.
DO $$
DECLARE
  v_roles_type text;
  v_members_type text;
BEGIN
  SELECT pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  INTO v_roles_type
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.projects'::regclass
    AND attribute.attname = 'required_roles'
    AND NOT attribute.attisdropped;

  SELECT pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  INTO v_members_type
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.projects'::regclass
    AND attribute.attname = 'current_members'
    AND NOT attribute.attisdropped;

  IF v_roles_type IS NULL OR v_roles_type NOT IN ('text[]', 'jsonb') THEN
    RAISE EXCEPTION 'Unsupported projects.required_roles type: %', v_roles_type;
  END IF;
  IF v_members_type IS NULL OR v_members_type NOT IN ('text[]', 'jsonb') THEN
    RAISE EXCEPTION 'Unsupported projects.current_members type: %', v_members_type;
  END IF;

  RAISE NOTICE 'accept_project_application: required_roles=%, current_members=%',
    v_roles_type, v_members_type;
END;
$$;

-- CREATE OR REPLACE keeps the existing signature and its dependent triggers.
-- The project row lock still serializes concurrent acceptances. The JSONB
-- working value preserves each role element as a string or object, while
-- jsonb_populate_record converts it back to the actual projects row type.
CREATE OR REPLACE FUNCTION public.accept_project_application(p_application_id uuid)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_application public.project_applications%ROWTYPE;
  v_project public.projects%ROWTYPE;
  v_project_update public.projects%ROWTYPE;
  v_roles jsonb;
  v_members jsonb;
  v_item jsonb;
  v_role jsonb;
  v_updated_role jsonb;
  v_item_is_string boolean;
  v_raw text;
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

  -- Re-read after the project lock so concurrent acceptances see fresh state.
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

  -- to_jsonb(text[]) and to_jsonb(jsonb) are both JSON arrays, unlike the
  -- original COALESCE(jsonb, text[]) expression.
  v_roles := COALESCE(to_jsonb(v_project.required_roles), '[]'::jsonb);
  IF jsonb_typeof(v_roles) <> 'array' THEN
    RAISE EXCEPTION 'Неверный формат ролей проекта';
  END IF;

  FOR v_index IN 0..jsonb_array_length(v_roles) - 1 LOOP
    v_item := v_roles -> v_index;
    v_item_is_string := jsonb_typeof(v_item) = 'string';
    IF v_item_is_string THEN
      v_raw := v_item #>> '{}';
      IF left(btrim(v_raw), 1) = '{' THEN
        v_role := v_raw::jsonb;
      ELSE
        v_role := NULL;
      END IF;
    ELSIF jsonb_typeof(v_item) = 'object' THEN
      v_raw := NULL;
      v_role := v_item;
    ELSE
      CONTINUE;
    END IF;

    IF v_role IS NOT NULL THEN
      IF jsonb_typeof(v_role) <> 'object' THEN
        RAISE EXCEPTION 'Неверный формат ролей проекта';
      END IF;
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

      v_updated_role := (v_role - 'filled') ||
        jsonb_build_object('count', v_count, 'taken', v_taken + 1);
      v_roles := jsonb_set(v_roles, ARRAY[v_index::text],
        CASE WHEN v_item_is_string THEN to_jsonb(v_updated_role::text)
          ELSE v_updated_role END, false);
      v_found := true;
      EXIT;
    END IF;
  END LOOP;
  IF NOT v_found THEN
    RAISE EXCEPTION 'Выбранная роль больше не доступна';
  END IF;

  SELECT COALESCE(name, 'Участник') INTO v_name
  FROM public.profiles WHERE auth_id = v_application.user_id;
  v_name := COALESCE(v_name, 'Участник');

  v_members := COALESCE(to_jsonb(v_project.current_members), '[]'::jsonb);
  IF jsonb_typeof(v_members) <> 'array' THEN
    RAISE EXCEPTION 'Неверный формат участников проекта';
  END IF;
  v_members := v_members || jsonb_build_array(v_name);

  -- The target row type is read from the actual table schema: text[] stays
  -- text[], jsonb stays jsonb. No ALTER COLUMN or global data conversion.
  v_project_update := jsonb_populate_record(v_project,
    jsonb_build_object('required_roles', v_roles, 'current_members', v_members));

  INSERT INTO public.project_members(project_id, user_id, role)
  VALUES (v_project.id, v_application.user_id, v_application.role_applied_for);

  UPDATE public.project_applications
  SET status = 'accepted'
  WHERE id = v_application.id;

  UPDATE public.projects
  SET required_roles = v_project_update.required_roles,
      current_members = v_project_update.current_members
  WHERE id = v_project.id
  RETURNING * INTO v_project;

  RETURN v_project;
END;
$function$;

REVOKE ALL ON FUNCTION public.accept_project_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_project_application(uuid) TO authenticated;
