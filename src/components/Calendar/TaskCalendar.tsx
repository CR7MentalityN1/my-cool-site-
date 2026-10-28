import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getUserErrorMessage } from '../../lib/userErrors'
import { calendarRange, isTaskOverdue } from '../../lib/taskUtils'
import type { Database, ProjectTaskStatus } from '../../lib/database.types'

type Task = Database['public']['Tables']['project_tasks']['Row']
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const statusLabels: Record<ProjectTaskStatus, string> = {
	todo: 'К выполнению', in_progress: 'В работе', done: 'Готово',
}
const statusColors: Record<ProjectTaskStatus, string> = {
	todo: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
	in_progress: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
	done: 'bg-green-500/15 text-green-700 dark:text-green-300',
}

export function TaskCalendar({ onOpenProject }: { onOpenProject: (projectId: string) => void }) {
	const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
	const [tasks, setTasks] = useState<Task[]>([])
	const [projectNames, setProjectNames] = useState<Record<string, string>>({})
	const [loading, setLoading] = useState(true)
	const [errorMessage, setErrorMessage] = useState('')
	const range = useMemo(() => calendarRange(month), [month])

	useEffect(() => {
		let cancelled = false
		async function load() {
			setLoading(true)
			setErrorMessage('')
			const { data, error } = await supabase.from('project_tasks')
				.select('*')
				.gte('due_date', range.start.toISOString())
				.lt('due_date', range.end.toISOString())
				.order('due_date', { ascending: true })
			if (cancelled) return
			if (error) {
				console.error('Error loading task calendar:', error)
				setErrorMessage(getUserErrorMessage(error, 'Не удалось загрузить календарь задач.'))
				setLoading(false)
				return
			}
			const rows = data || []
			const projectIds = [...new Set(rows.map(task => task.project_id))]
			const { data: projects, error: projectError } = projectIds.length
				? await supabase.from('projects').select('id, title').in('id', projectIds)
				: { data: [], error: null }
			if (projectError) console.error('Error loading calendar project names:', projectError)
			if (cancelled) return
			setProjectNames(Object.fromEntries((projects || []).map(project => [project.id, project.title])))
			setTasks(rows)
			setLoading(false)
		}
		void load()
		return () => { cancelled = true }
	}, [range])

	const tasksByDay = useMemo(() => {
		const grouped = new Map<string, Task[]>()
		for (const task of tasks) {
			if (!task.due_date) continue
			const key = new Date(task.due_date).toDateString()
			grouped.set(key, [...(grouped.get(key) || []), task])
		}
		return grouped
	}, [tasks])

	const moveMonth = (offset: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
	const today = new Date()

	return (
		<section className='max-w-7xl mx-auto px-4 py-6'>
			<div className='flex flex-wrap items-center justify-between gap-3 mb-5'>
				<div>
					<h1 className='text-2xl font-bold text-[var(--text)]'>Календарь дедлайнов</h1>
					<p className='text-sm text-[var(--muted)]'>Задачи проектов, к которым у вас есть доступ</p>
				</div>
				<div className='flex items-center gap-2'>
					<button type='button' onClick={() => moveMonth(-1)} aria-label='Предыдущий месяц' className='p-2 rounded-xl border border-[var(--border)] text-[var(--text)]'><ChevronLeft className='w-5 h-5' /></button>
					<span className='min-w-36 text-center font-semibold text-[var(--text)] capitalize'>{month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
					<button type='button' onClick={() => moveMonth(1)} aria-label='Следующий месяц' className='p-2 rounded-xl border border-[var(--border)] text-[var(--text)]'><ChevronRight className='w-5 h-5' /></button>
					<button type='button' onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))} className='px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm'>Сегодня</button>
				</div>
			</div>
			{errorMessage && <p role='alert' className='text-red-600 mb-3'>{errorMessage}</p>}
			{loading && <p className='text-sm text-[var(--muted)] mb-3'>Загружаем дедлайны...</p>}
			{!loading && !errorMessage && tasks.length === 0 && <p className='text-sm text-[var(--muted)] mb-3'>На этот период дедлайнов нет.</p>}
			<div className='overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]'>
				<div className='min-w-[700px] grid grid-cols-7'>
					{weekdays.map(day => <div key={day} className='p-2 text-center text-xs font-semibold text-[var(--muted)] border-b border-[var(--border)]'>{day}</div>)}
					{range.days.map(day => {
						const dayTasks = tasksByDay.get(day.toDateString()) || []
						const isToday = day.toDateString() === today.toDateString()
						return (
							<div key={day.toISOString()} className={`min-h-28 min-w-0 p-2 border-b border-r border-[var(--border)] ${day.getMonth() === month.getMonth() ? '' : 'opacity-50'}`}>
								<span className={`inline-flex w-7 h-7 items-center justify-center text-sm rounded-full ${isToday ? 'bg-[var(--accent)] text-white' : 'text-[var(--text)]'}`}>{day.getDate()}</span>
								<div className='space-y-1 mt-1'>
									{dayTasks.map(task => (
										<button key={task.id} type='button' onClick={() => onOpenProject(task.project_id)} title={`${task.title} · ${projectNames[task.project_id] || 'Проект'}`} className={`block w-full text-left rounded-lg px-2 py-1 text-xs break-words ${isTaskOverdue(task.due_date, task.status) ? 'bg-red-500/15 text-red-700 dark:text-red-300' : statusColors[task.status]}`}>
											<span className='font-semibold'>{task.title}</span>
											<span className='block opacity-75'>{projectNames[task.project_id] || 'Проект'} · {statusLabels[task.status]}{isTaskOverdue(task.due_date, task.status) ? ' · Просрочено' : ''}</span>
										</button>
									))}
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</section>
	)
}
