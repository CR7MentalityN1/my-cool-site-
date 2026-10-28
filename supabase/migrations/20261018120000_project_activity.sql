-- Activity is written by database triggers, never by the browser.
CREATE TABLE public.project_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN (
    'project_created', 'application_created', 'application_accepted',
    'application_rejected', 'member_joined', 'task_created',
    'task_updated', 'task_completed', 'deadline_changed', 'project_completed'
  )),
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX project_activity_project_created_idx
  ON public.project_activity (project_id, created_at DESC, id DESC);

ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_activity FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.project_activity TO authenticated;

CREATE POLICY "Project owners and members can read activity"
ON public.project_activity FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects AS project
    WHERE project.id = project_activity.project_id
      AND project.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.project_members AS member
    WHERE member.project_id = project_activity.project_id
      AND member.user_id = auth.uid()
  )
);

-- The trigger uses the authenticated request's identity, not a client-supplied
-- actor. A trusted service operation without a user has a NULL actor.
CREATE FUNCTION public.record_project_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME = 'projects' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.project_activity (project_id, actor_user_id, type, title)
      VALUES (NEW.id, auth.uid(), 'project_created', 'Проект создан');
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      INSERT INTO public.project_activity (project_id, actor_user_id, type, title)
      VALUES (NEW.id, auth.uid(), 'project_completed', 'Проект завершён');
    END IF;
  ELSIF TG_TABLE_NAME = 'project_applications' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.project_activity
        (project_id, actor_user_id, type, title, metadata)
      VALUES (
        NEW.project_id, NULL, 'application_created', 'Подана заявка',
        jsonb_build_object('role', NEW.role_applied_for)
      );
    ELSIF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      INSERT INTO public.project_activity
        (project_id, actor_user_id, type, title, metadata)
      VALUES (
        NEW.project_id, auth.uid(), 'application_accepted', 'Заявка принята',
        jsonb_build_object('role', NEW.role_applied_for)
      );
    ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
      INSERT INTO public.project_activity
        (project_id, actor_user_id, type, title, metadata)
      VALUES (
        NEW.project_id, auth.uid(), 'application_rejected', 'Заявка отклонена',
        jsonb_build_object('role', NEW.role_applied_for)
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'project_members' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity
      (project_id, actor_user_id, type, title, metadata)
    VALUES (
      NEW.project_id, auth.uid(), 'member_joined', 'Участник присоединился',
      jsonb_build_object('member_user_id', NEW.user_id, 'role', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_project_activity() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER project_activity_project_insert
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.record_project_activity();

CREATE TRIGGER project_activity_project_completed
AFTER UPDATE OF status ON public.projects
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
EXECUTE FUNCTION public.record_project_activity();

CREATE TRIGGER project_activity_application_insert
AFTER INSERT ON public.project_applications
FOR EACH ROW EXECUTE FUNCTION public.record_project_activity();

CREATE TRIGGER project_activity_application_decision
AFTER UPDATE OF status ON public.project_applications
FOR EACH ROW
WHEN (OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected'))
EXECUTE FUNCTION public.record_project_activity();

CREATE TRIGGER project_activity_member_insert
AFTER INSERT ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.record_project_activity();

-- Task/deadline types are reserved above. This repository has no task table or
-- deadline column, so their triggers must be added with those features.
