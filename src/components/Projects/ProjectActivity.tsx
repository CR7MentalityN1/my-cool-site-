import { useEffect, useState } from 'react'
import {
	CalendarDays,
	CheckCircle,
	ClipboardList,
	FolderPlus,
	Pencil,
	Trophy,
	UserPlus,
	Users,
	XCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database, Json } from '../../lib/database.types'

type Activity = Database['public']['Tables']['project_activity']['Row']
type ActivityType = Activity['type']

const icons: Record<ActivityType, typeof FolderPlus> = {
	project_created: FolderPlus,
	application_created: ClipboardList,
	application_accepted: CheckCircle,
	application_rejected: XCircle,
	member_joined: UserPlus,
	task_created: ClipboardList,
	task_updated: Pencil,
	task_completed: CheckCircle,
	deadline_changed: CalendarDays,
	project_completed: Trophy,
}

function metadataString(metadata: Json, key: string): string | null {
	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
	const value = metadata[key]
	return typeof value === 'string' && value.trim() ? value : null
}

function relativeTime(value: string): string {
	const elapsed = Date.now() - new Date(value).getTime()
	if (!Number.isFinite(elapsed)) return ''
	if (elapsed < 60_000) return 'только что'
	const formatter = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' })
	if (elapsed < 3_600_000) return formatter.format(-Math.floor(elapsed / 60_000), 'minute')
	if (elapsed < 86_400_000) return formatter.format(-Math.floor(elapsed / 3_600_000), 'hour')
	return formatter.format(-Math.floor(elapsed / 86_400_000), 'day')
}

function activityText(activity: Activity, names: Record<string, string>): string {
	const actor = activity.actor_user_id ? names[activity.actor_user_id] || 'Участник' : 'Система'
	const memberId = metadataString(activity.metadata, 'member_user_id')
	const role = metadataString(activity.metadata, 'role')
	const task = metadataString(activity.metadata, 'task_title')
	const taskStatus = metadataString(activity.metadata, 'status')
	const statusChanged = activity.metadata && typeof activity.metadata === 'object' && !Array.isArray(activity.metadata)
		? activity.metadata.status_changed === true : false
	const deadline = metadataString(activity.metadata, 'deadline')
	const member = memberId ? names[memberId] || 'Участник' : 'Участник'

	switch (activity.type) {
		case 'project_created': return `${actor} создал(а) проект`
		case 'application_created': return `Подана заявка${role ? ` на роль ${role}` : ''}`
		case 'application_accepted': return `Заявка${role ? ` на роль ${role}` : ''} принята`
		case 'application_rejected': return `Заявка${role ? ` на роль ${role}` : ''} отклонена`
		case 'member_joined': return `${member} присоединился(-ась) к проекту`
		case 'task_created': return task ? `Создана задача «${task}»` : activity.title
		case 'task_updated':
			if (task && statusChanged && taskStatus === 'in_progress') return `Задача «${task}» переведена в работу`
			if (task && statusChanged && taskStatus === 'todo') return `Задача «${task}» возвращена к выполнению`
			return task ? `Задача «${task}» обновлена` : activity.title
		case 'task_completed': return task ? `Задача «${task}» завершена` : activity.title
		case 'deadline_changed':
			return deadline && task
				? `Дедлайн задачи «${task}» изменён на ${new Date(deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
				: task ? `Дедлайн задачи «${task}» удалён` : activity.title
		case 'project_completed': return `${actor} завершил(а) проект`
	}
}

export default function ProjectActivity({ projectId, refreshKey = 0 }: { projectId: string; refreshKey?: number }) {
	const [events, setEvents] = useState<Activity[]>([])
	const [names, setNames] = useState<Record<string, string>>({})
	const [loading, setLoading] = useState(true)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		let cancelled = false
		async function load() {
			setLoading(true)
			setFailed(false)
			const { data, error } = await supabase
				.from('project_activity')
				.select('id, project_id, actor_user_id, type, title, description, metadata, created_at')
				.eq('project_id', projectId)
				.order('created_at', { ascending: false })
				.order('id', { ascending: false })
				.limit(20)
			if (cancelled) return
			if (error) {
				console.error('Error loading project activity:', error)
				setFailed(true)
				setLoading(false)
				return
			}

			const rows = data || []
			const userIds = [...new Set(rows.flatMap(row => [
				row.actor_user_id,
				metadataString(row.metadata, 'member_user_id'),
			]).filter((id): id is string => Boolean(id)))]
			let displayNames: Record<string, string> = {}
			if (userIds.length) {
				const { data: profiles, error: profilesError } = await supabase
					.from('profiles')
					.select('auth_id, name')
					.in('auth_id', userIds)
				if (profilesError) console.error('Error loading activity actors:', profilesError)
				if (cancelled) return
				displayNames = Object.fromEntries((profiles || []).map(profile => [
					profile.auth_id, profile.name?.trim() || 'Участник',
				]))
			}
			setEvents(rows)
			setNames(displayNames)
			setLoading(false)
		}
		void load()
		return () => { cancelled = true }
	}, [projectId, refreshKey])

	return (
		<section className='border-t border-[var(--border)] pt-6'>
			<h3 className='text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2'>
				<Users className='w-5 h-5 text-[var(--accent)]' />Активность
			</h3>
			{loading ? (
				<p className='text-sm text-[var(--muted)]'>Загружаем активность...</p>
			) : failed ? (
				<p className='text-sm text-[var(--muted)]'>Не удалось загрузить активность проекта.</p>
			) : events.length === 0 ? (
				<p className='text-sm text-[var(--muted)]'>Пока нет событий.</p>
			) : (
				<ul className='space-y-3'>
					{events.map(event => {
						const Icon = icons[event.type]
						const actorName = event.type === 'application_created'
							? 'Заявитель'
							: event.actor_user_id ? names[event.actor_user_id] || 'Участник' : 'Система'
						return (
							<li key={event.id} className='flex items-start gap-3 min-w-0'>
								<Icon className='w-5 h-5 shrink-0 mt-0.5 text-[var(--accent)]' />
								<div className='min-w-0'>
									<p className='text-sm text-[var(--text)] break-words'>{activityText(event, names)}</p>
									<p className='text-xs text-[var(--muted)] break-words' title={new Date(event.created_at).toLocaleString('ru-RU')}>
										{actorName} · {relativeTime(event.created_at)}
									</p>
								</div>
							</li>
						)
					})}
				</ul>
			)}
		</section>
	)
}
