CREATE TABLE public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR length(description) <= 2000),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
  due_date timestamptz,
  deadline_version bigint NOT NULL DEFAULT 1 CHECK (deadline_version > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX project_tasks_project_idx ON public.project_tasks(project_id);
CREATE INDEX project_tasks_due_date_idx ON public.project_tasks(due_date) WHERE due_date IS NOT NULL;

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_tasks FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.project_tasks TO authenticated;
GRANT INSERT (project_id, title, description, status, assignee_user_id, created_by, due_date)
  ON public.project_tasks TO authenticated;
GRANT UPDATE (title, description, status, assignee_user_id, due_date)
  ON public.project_tasks TO authenticated;

CREATE POLICY "Project owners and members can read tasks"
ON public.project_tasks FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects AS project
    WHERE project.id = project_tasks.project_id AND project.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_members AS member
    WHERE member.project_id = project_tasks.project_id AND member.user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can create tasks"
ON public.project_tasks FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.projects AS project
    WHERE project.id = project_tasks.project_id AND project.owner_id = auth.uid()
  )
);

CREATE POLICY "Project owners can update tasks"
ON public.project_tasks FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects AS project
  WHERE project.id = project_tasks.project_id AND project.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects AS project
  WHERE project.id = project_tasks.project_id AND project.owner_id = auth.uid()
));

CREATE POLICY "Project owners can delete tasks"
ON public.project_tasks FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects AS project
  WHERE project.id = project_tasks.project_id AND project.owner_id = auth.uid()
));

CREATE FUNCTION public.validate_project_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.title := btrim(NEW.title);
  NEW.description := NULLIF(btrim(NEW.description), '');
  IF NEW.assignee_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.projects AS project
    WHERE project.id = NEW.project_id AND project.owner_id = NEW.assignee_user_id
  ) THEN
    -- Serialize assignment with membership removal. A concurrent DELETE then
    -- waits and its trigger will clear this assignment.
    PERFORM 1 FROM public.project_members AS member
    WHERE member.project_id = NEW.project_id AND member.user_id = NEW.assignee_user_id
    FOR KEY SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Исполнитель должен быть участником проекта';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.deadline_version := OLD.deadline_version +
      CASE WHEN NEW.due_date IS DISTINCT FROM OLD.due_date THEN 1 ELSE 0 END;
    NEW.updated_at := clock_timestamp();
  ELSE
    NEW.deadline_version := 1;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_project_task() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_project_task_row
BEFORE INSERT OR UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.validate_project_task();

-- Members cannot UPDATE task rows directly; this RPC changes only their status.
CREATE FUNCTION public.set_project_task_status(p_task_id uuid, p_status text)
RETURNS public.project_tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_task public.project_tasks%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Требуется авторизация';
  END IF;
  SELECT * INTO v_task FROM public.project_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND OR v_task.assignee_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Недостаточно прав для изменения задачи';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects WHERE id = v_task.project_id AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = v_task.project_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Пользователь больше не состоит в проекте';
  END IF;
  IF NOT (
    (v_task.status = 'todo' AND p_status = 'in_progress') OR
    (v_task.status = 'in_progress' AND p_status = 'done') OR
    (v_task.status = 'done' AND p_status = 'in_progress')
  ) THEN
    RAISE EXCEPTION 'Недопустимый переход статуса задачи';
  END IF;
  UPDATE public.project_tasks SET status = p_status WHERE id = p_task_id
  RETURNING * INTO v_task;
  RETURN v_task;
END;
$$;
REVOKE ALL ON FUNCTION public.set_project_task_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_project_task_status(uuid, text) TO authenticated;

-- Removing a member also removes any task assignments to that member.
CREATE FUNCTION public.unassign_departed_project_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = OLD.project_id) THEN
    UPDATE public.project_tasks SET assignee_user_id = NULL
    WHERE project_id = OLD.project_id AND assignee_user_id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.unassign_departed_project_member() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER unassign_tasks_after_member_delete
AFTER DELETE ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.unassign_departed_project_member();

CREATE FUNCTION public.record_project_task_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity(project_id, actor_user_id, type, title, metadata)
    VALUES (NEW.project_id, auth.uid(), 'task_created', 'Создана задача',
      jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title));
  ELSE
    IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      INSERT INTO public.project_activity(project_id, actor_user_id, type, title, metadata)
      VALUES (NEW.project_id, auth.uid(), 'deadline_changed',
        CASE WHEN NEW.due_date IS NULL THEN 'Дедлайн задачи удалён' ELSE 'Дедлайн задачи изменён' END,
        jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title, 'deadline', NEW.due_date));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'done' THEN
      INSERT INTO public.project_activity(project_id, actor_user_id, type, title, metadata)
      VALUES (NEW.project_id, auth.uid(), 'task_completed', 'Задача завершена',
        jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title));
    ELSIF NEW.status IS DISTINCT FROM OLD.status OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.assignee_user_id IS DISTINCT FROM OLD.assignee_user_id THEN
      INSERT INTO public.project_activity(project_id, actor_user_id, type, title, metadata)
      VALUES (NEW.project_id, auth.uid(), 'task_updated', 'Задача обновлена',
        jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title,
          'status', NEW.status, 'status_changed', NEW.status IS DISTINCT FROM OLD.status));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_project_task_activity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER project_task_activity_insert
AFTER INSERT ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.record_project_task_activity();
CREATE TRIGGER project_task_activity_update
AFTER UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.record_project_task_activity();

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'application_created', 'application_accepted', 'application_rejected', 'member_joined',
  'task_assigned', 'task_deadline_soon', 'task_overdue', 'task_completed'
));
ALTER TABLE public.notifications ADD COLUMN related_task_id uuid
  REFERENCES public.project_tasks(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN task_deadline_version bigint;
ALTER TABLE public.notifications ADD COLUMN task_deadline_due_at timestamptz;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_deadline_snapshot_check
  CHECK (type NOT IN ('task_deadline_soon', 'task_overdue') OR
    (task_deadline_version IS NOT NULL AND task_deadline_version > 0
      AND task_deadline_due_at IS NOT NULL));
-- Keep previous notifications, but deduplicate each task/deadline cycle separately.
CREATE UNIQUE INDEX notifications_unique_task_deadline_event
  ON public.notifications(related_task_id, type, task_deadline_version)
  WHERE related_task_id IS NOT NULL AND type IN ('task_deadline_soon', 'task_overdue');

CREATE FUNCTION public.notify_project_task_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner_id uuid;
  v_assignment_changed boolean;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.projects WHERE id = NEW.project_id;
  IF TG_OP = 'INSERT' THEN
    v_assignment_changed := NEW.assignee_user_id IS NOT NULL;
  ELSE
    v_assignment_changed := NEW.assignee_user_id IS NOT NULL
      AND NEW.assignee_user_id IS DISTINCT FROM OLD.assignee_user_id;
  END IF;
  IF v_assignment_changed THEN
    INSERT INTO public.notifications(user_id, type, title, message, related_project_id, related_task_id)
    VALUES (NEW.assignee_user_id, 'task_assigned', 'Назначена задача',
      format('Вам назначена задача «%s».', NEW.title), NEW.project_id, NEW.id);
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done'
      AND NEW.assignee_user_id = auth.uid() AND v_owner_id <> auth.uid() THEN
      INSERT INTO public.notifications(user_id, type, title, message, related_project_id, related_task_id)
      VALUES (v_owner_id, 'task_completed', 'Задача завершена',
        format('Исполнитель завершил задачу «%s».', NEW.title), NEW.project_id, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_project_task_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_project_task_insert
AFTER INSERT ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_project_task_change();
CREATE TRIGGER notify_project_task_update
AFTER UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_project_task_change();

-- Call from a trusted database scheduler. It is never executable by browser roles.
CREATE FUNCTION public.process_project_task_deadlines()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_inserted integer;
BEGIN
  INSERT INTO public.notifications(
    user_id, type, title, message, related_project_id, related_task_id,
    task_deadline_version, task_deadline_due_at
  )
  SELECT COALESCE(task.assignee_user_id, project.owner_id),
    CASE WHEN task.due_date <= now() THEN 'task_overdue' ELSE 'task_deadline_soon' END,
    CASE WHEN task.due_date <= now() THEN 'Просрочена задача' ELSE 'Скоро дедлайн задачи' END,
    CASE WHEN task.due_date <= now()
      THEN format('Просрочена задача «%s».', task.title)
      ELSE format('До дедлайна задачи «%s» осталось меньше 24 часов.', task.title)
    END,
    task.project_id, task.id, task.deadline_version, task.due_date
  FROM public.project_tasks AS task
  JOIN public.projects AS project ON project.id = task.project_id
  WHERE task.due_date IS NOT NULL AND task.status <> 'done'
    AND task.due_date <= now() + interval '24 hours'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;
REVOKE ALL ON FUNCTION public.process_project_task_deadlines() FROM PUBLIC, anon, authenticated;
-- After enabling Supabase Cron, schedule this as a database admin, for example:
-- SELECT cron.schedule('project-task-deadlines', '*/5 * * * *',
--   'SELECT public.process_project_task_deadlines()');

-- Opt-in Realtime; task lists also refresh when reopened.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND NOT puballtables)
    AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_tasks') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks';
  END IF;
END;
$$;
