import type { ProjectTaskStatus } from './database.types'

export function isTaskOverdue(dueDate: string | null, status: ProjectTaskStatus, now = new Date()): boolean {
	if (!dueDate || status === 'done') return false
	const due = new Date(dueDate).getTime()
	return Number.isFinite(due) && due <= now.getTime()
}

function calendarDayNumber(date: Date): number {
	return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
}

export function formatTaskDeadline(dueDate: string | null, status: ProjectTaskStatus, now = new Date()): string {
	if (!dueDate) return 'Без дедлайна'
	const due = new Date(dueDate)
	if (!Number.isFinite(due.getTime())) return 'Дата не указана'
	const date = due.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
	if (isTaskOverdue(dueDate, status, now)) return `Просрочено · ${date}`
	const days = calendarDayNumber(due) - calendarDayNumber(now)
	if (days === 0) return `Сегодня · ${due.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
	if (days === 1) return `Завтра · ${due.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
	if (days > 1 && days < 7) return `Через ${days} ${days < 5 ? 'дня' : 'дней'} · ${date}`
	return date
}

export function allowedAssigneeTransitions(status: ProjectTaskStatus): ProjectTaskStatus[] {
	if (status === 'todo') return ['in_progress']
	if (status === 'in_progress') return ['done']
	return ['in_progress']
}

export function calendarRange(month: Date): { start: Date; end: Date; days: Date[] } {
	const first = new Date(month.getFullYear(), month.getMonth(), 1)
	const start = new Date(first)
	start.setDate(first.getDate() - (first.getDay() + 6) % 7)
	const days = Array.from({ length: 42 }, (_, index) => {
		const day = new Date(start)
		day.setDate(start.getDate() + index)
		return day
	})
	const end = new Date(start)
	end.setDate(start.getDate() + 42)
	return { start, end, days }
}

export function toLocalDateTimeInput(value: string | null): string {
	if (!value) return ''
	const date = new Date(value)
	if (!Number.isFinite(date.getTime())) return ''
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
	return local.toISOString().slice(0, 16)
}
