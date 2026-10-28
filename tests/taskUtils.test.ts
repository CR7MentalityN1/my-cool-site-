import assert from 'node:assert/strict'
import test from 'node:test'
import { allowedAssigneeTransitions, calendarRange, formatTaskDeadline, isTaskOverdue } from '../src/lib/taskUtils.ts'

test('overdue ignores completed tasks and future dates', () => {
	const now = new Date('2026-10-18T12:00:00Z')
	assert.equal(isTaskOverdue('2026-10-18T11:59:00Z', 'todo', now), true)
	assert.equal(isTaskOverdue('2026-10-18T12:00:00Z', 'todo', now), true)
	assert.equal(isTaskOverdue('2026-10-18T11:59:00Z', 'done', now), false)
	assert.equal(isTaskOverdue('2026-10-18T12:01:00Z', 'in_progress', now), false)
	assert.equal(isTaskOverdue(null, 'todo', now), false)
})

test('deadline labels distinguish today, tomorrow and overdue', () => {
	const now = new Date(2026, 9, 18, 12)
	assert.match(formatTaskDeadline(new Date(2026, 9, 18, 14).toISOString(), 'todo', now), /^Сегодня/)
	assert.match(formatTaskDeadline(new Date(2026, 9, 19, 14).toISOString(), 'todo', now), /^Завтра/)
	assert.match(formatTaskDeadline(new Date(2026, 9, 20, 14).toISOString(), 'todo', now), /^Через 2 дня/)
	assert.match(formatTaskDeadline(new Date(2026, 9, 17, 14).toISOString(), 'todo', now), /^Просрочено/)
})

test('assignee status transitions are restricted', () => {
	assert.deepEqual(allowedAssigneeTransitions('todo'), ['in_progress'])
	assert.deepEqual(allowedAssigneeTransitions('in_progress'), ['done'])
	assert.deepEqual(allowedAssigneeTransitions('done'), ['in_progress'])
})

test('calendar range covers six complete weeks', () => {
	const range = calendarRange(new Date(2026, 9, 1))
	assert.equal(range.days.length, 42)
	assert.equal(range.start.getDay(), 1)
	assert.equal(range.end.getTime() > range.days[41].getTime(), true)
})
