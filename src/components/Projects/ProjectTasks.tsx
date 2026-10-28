import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getUserErrorMessage } from '../../lib/userErrors'
import { allowedAssigneeTransitions, formatTaskDeadline, isTaskOverdue, toLocalDateTimeInput } from '../../lib/taskUtils'
import type { Database, ProjectTaskStatus } from '../../lib/database.types'

type Task = Database['public']['Tables']['project_tasks']['Row']
type TaskForm = { title: string; description: string; status: ProjectTaskStatus; assignee_user_id: string; due_date: string }
const emptyForm: TaskForm = { title: '', description: '', status: 'todo', assignee_user_id: '', due_date: '' }
const columns: { status: ProjectTaskStatus; label: string }[] = [
	{ status: 'todo', label: 'К выполнению' },
	{ status: 'in_progress', label: 'В работе' },
	{ status: 'done', label: 'Готово' },
]

export function ProjectTasks({ projectId, ownerId, refreshKey = 0, onChanged }: { projectId: string; ownerId: string; refreshKey?: number; onChanged: () => void }) {
	const { user } = useAuth()
	const isOwner = user?.id === ownerId
	const [tasks, setTasks] = useState<Task[]>([])
	const [names, setNames] = useState<Record<string, string>>({})
	const [assignees, setAssignees] = useState<string[]>([])
	const [loading, setLoading] = useState(true)
	const [errorMessage, setErrorMessage] = useState('')
	const [editorOpen, setEditorOpen] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [form, setForm] = useState<TaskForm>(emptyForm)
	const [saving, setSaving] = useState(false)
	const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
	const saveLock = useRef(false)
	const taskLock = useRef<string | null>(null)

	const load = useCallback(async (showLoading = false) => {
		if (showLoading) setLoading(true)
		const [taskResult, memberResult] = await Promise.all([
			supabase.from('project_tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
			isOwner ? supabase.from('project_members').select('user_id').eq('project_id', projectId) : Promise.resolve({ data: [], error: null }),
		])
		if (taskResult.error || memberResult.error) {
			const error = taskResult.error || memberResult.error
			console.error('Error loading project tasks:', error)
			setErrorMessage(getUserErrorMessage(error, 'Не удалось загрузить задачи. Попробуйте ещё раз.'))
			setLoading(false)
			return
		}
		const rows = taskResult.data || []
		const options = [...new Set([ownerId, ...(memberResult.data || []).map(member => member.user_id)])]
		const ids = [...new Set([...options, ...rows.flatMap(task => [task.created_by, task.assignee_user_id].filter((id): id is string => Boolean(id)))])]
		const { data: profiles, error: profilesError } = ids.length
			? await supabase.from('profiles').select('auth_id, name').in('auth_id', ids)
			: { data: [], error: null }
		if (profilesError) console.error('Error loading task profiles:', profilesError)
		setNames(Object.fromEntries((profiles || []).map(profile => [profile.auth_id, profile.name?.trim() || 'Участник'])))
		setAssignees(options)
		setTasks(rows)
		setErrorMessage('')
		setLoading(false)
	}, [projectId, ownerId, isOwner])

	useEffect(() => {
		void load(true)
		const channel = supabase.channel(`project-tasks:${projectId}`)
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_tasks', filter: `project_id=eq.${projectId}` }, () => { void load() })
			.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'project_tasks', filter: `project_id=eq.${projectId}` }, () => { void load() })
			.subscribe()
		return () => { void supabase.removeChannel(channel) }
	}, [projectId, load])

	useEffect(() => { if (refreshKey) void load() }, [refreshKey, load])

	const openEditor = (task?: Task) => {
		setEditingId(task?.id || null)
		setForm(task ? {
			title: task.title,
			description: task.description || '',
			status: task.status,
			assignee_user_id: task.assignee_user_id || '',
			due_date: toLocalDateTimeInput(task.due_date),
		} : emptyForm)
		setErrorMessage('')
		setEditorOpen(true)
	}

	const save = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!user || !isOwner || saveLock.current) return
		const title = form.title.trim()
		const description = form.description.trim()
		if (!title || title.length > 120 || description.length > 2000) {
			setErrorMessage('Название: 1–120 символов, описание: до 2000 символов.')
			return
		}
		const dueDate = form.due_date ? new Date(form.due_date) : null
		if (dueDate && !Number.isFinite(dueDate.getTime())) {
			setErrorMessage('Укажите корректный дедлайн.')
			return
		}
		saveLock.current = true
		setSaving(true)
		setErrorMessage('')
		const fields = {
			title, description: description || null, status: form.status,
			assignee_user_id: form.assignee_user_id || null,
			due_date: dueDate?.toISOString() || null,
		}
		try {
			const { error } = editingId
				? await supabase.from('project_tasks').update(fields).eq('id', editingId).eq('project_id', projectId)
				: await supabase.from('project_tasks').insert({ ...fields, project_id: projectId, created_by: user.id })
			if (error) throw error
			setEditorOpen(false)
			setEditingId(null)
			setForm(emptyForm)
			onChanged()
		} catch (error) {
			console.error('Error saving project task:', error)
			setErrorMessage(getUserErrorMessage(error, 'Не удалось сохранить задачу. Проверьте исполнителя и попробуйте ещё раз.'))
		} finally {
			saveLock.current = false
			setSaving(false)
		}
	}

	const changeStatus = async (task: Task, status: ProjectTaskStatus) => {
		if (taskLock.current) return
		taskLock.current = task.id
		setBusyTaskId(task.id)
		try {
			const { error } = await supabase.rpc('set_project_task_status', { p_task_id: task.id, p_status: status })
			if (error) throw error
			onChanged()
		} catch (error) {
			console.error('Error changing task status:', error)
			setErrorMessage(getUserErrorMessage(error, 'Не удалось изменить статус задачи.'))
		} finally {
			taskLock.current = null
			setBusyTaskId(null)
		}
	}

	const remove = async (task: Task) => {
		if (!isOwner || taskLock.current || !window.confirm(`Удалить задачу «${task.title}»?`)) return
		taskLock.current = task.id
		setBusyTaskId(task.id)
		try {
			const { error } = await supabase.from('project_tasks').delete().eq('id', task.id).eq('project_id', projectId)
			if (error) throw error
			onChanged()
		} catch (error) {
			console.error('Error deleting task:', error)
			setErrorMessage(getUserErrorMessage(error, 'Не удалось удалить задачу.'))
		} finally {
			taskLock.current = null
			setBusyTaskId(null)
		}
	}

	return (
		<section className='border-t border-[var(--border)] pt-6' id={`project-tasks-${projectId}`}>
			<div className='flex items-center justify-between gap-2 mb-4'>
				<h3 className='text-lg font-bold text-[var(--text)]'>Задачи</h3>
				{isOwner && <button type='button' disabled={saving || busyTaskId !== null} onClick={() => openEditor()} className='text-sm bg-[var(--accent)] text-white px-3 py-2 rounded-xl flex items-center gap-1 disabled:opacity-50'><Plus className='w-4 h-4' /> Добавить</button>}
			</div>
			{errorMessage && <p role='alert' className='text-sm text-red-600 mb-3 break-words'>{errorMessage}</p>}
			{editorOpen && isOwner && (
				<form onSubmit={event => void save(event)} className='rounded-2xl border border-[var(--border)] p-4 mb-5 space-y-3 bg-black/5 dark:bg-white/5'>
					<h4 className='font-semibold text-[var(--text)]'>{editingId ? 'Изменить задачу' : 'Новая задача'}</h4>
					<input aria-label='Название задачи' required maxLength={120} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder='Название задачи' className='w-full p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)]' />
					<textarea aria-label='Описание задачи' maxLength={2000} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder='Описание (необязательно)' rows={3} className='w-full p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)]' />
					<div className='grid gap-3 sm:grid-cols-3'>
						<select aria-label='Статус задачи' value={form.status} onChange={event => setForm({ ...form, status: event.target.value as ProjectTaskStatus })} className='p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)]'>
							{columns.map(column => <option key={column.status} value={column.status}>{column.label}</option>)}
						</select>
						<select aria-label='Исполнитель' value={form.assignee_user_id} onChange={event => setForm({ ...form, assignee_user_id: event.target.value })} className='p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)]'>
							<option value=''>Без исполнителя</option>
							{assignees.map(id => <option key={id} value={id}>{names[id] || 'Участник'}</option>)}
						</select>
						<input aria-label='Дедлайн' type='datetime-local' value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })} className='p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] min-w-0' />
					</div>
					<div className='flex gap-2'>
						<button type='submit' disabled={saving} className='bg-[var(--accent)] text-white px-4 py-2 rounded-xl disabled:opacity-50'>{saving ? 'Сохраняем...' : 'Сохранить'}</button>
						<button type='button' disabled={saving} onClick={() => setEditorOpen(false)} className='px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text)]'>Отмена</button>
					</div>
				</form>
			)}
			{loading ? <p className='text-sm text-[var(--muted)]'>Загружаем задачи...</p> : tasks.length === 0 ? <p className='text-sm text-[var(--muted)]'>Пока нет задач.</p> : (
				<div className='grid gap-4 md:grid-cols-3'>
					{columns.map(column => (
						<div key={column.status} className='min-w-0'>
							<h4 className='font-semibold text-[var(--text)] mb-2'>{column.label} ({tasks.filter(task => task.status === column.status).length})</h4>
							<div className='space-y-3'>
								{tasks.filter(task => task.status === column.status).map(task => (
									<article key={task.id} className={`rounded-2xl border p-3 min-w-0 ${isTaskOverdue(task.due_date, task.status) ? 'border-red-500' : 'border-[var(--border)]'}`}>
										<p className='font-semibold text-[var(--text)] break-words'>{task.title}</p>
										{task.description && <p className='text-sm text-[var(--muted)] mt-1 whitespace-pre-wrap break-words'>{task.description}</p>}
										<p className='text-xs text-[var(--muted)] mt-2'>Статус: {column.label}</p>
										<p className='text-xs text-[var(--muted)] break-words'>Исполнитель: {task.assignee_user_id ? names[task.assignee_user_id] || 'Участник' : 'Не назначен'}</p>
										<p className='text-xs text-[var(--muted)] break-words'>Создал: {names[task.created_by] || 'Участник'}</p>
										<p className={`text-xs mt-1 ${isTaskOverdue(task.due_date, task.status) ? 'text-red-600 font-semibold' : 'text-[var(--muted)]'}`}>{formatTaskDeadline(task.due_date, task.status)}</p>
										<div className='flex flex-wrap gap-2 mt-3'>
											{isOwner && <button type='button' disabled={saving || busyTaskId !== null} onClick={() => openEditor(task)} className='text-xs text-[var(--accent)] disabled:opacity-50 flex items-center gap-1'><Pencil className='w-3 h-3' /> Изменить</button>}
											{isOwner && <button type='button' disabled={saving || busyTaskId !== null} onClick={() => void remove(task)} className='text-xs text-red-600 disabled:opacity-50 flex items-center gap-1'><Trash2 className='w-3 h-3' /> Удалить</button>}
											{!isOwner && task.assignee_user_id === user?.id && allowedAssigneeTransitions(task.status).map(next => (
												<button key={next} type='button' disabled={busyTaskId !== null} onClick={() => void changeStatus(task, next)} className='text-xs text-[var(--accent)] disabled:opacity-50'>
													{next === 'in_progress' ? 'В работу' : 'Завершить'}
												</button>
											))}
										</div>
									</article>
								))}
								{tasks.every(task => task.status !== column.status) && <p className='text-sm text-[var(--muted)]'>Задач нет.</p>}
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	)
}
