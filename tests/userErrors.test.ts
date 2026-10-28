import assert from 'node:assert/strict'
import test from 'node:test'
import { getProjectAcceptanceErrorMessage } from '../src/lib/userErrors.ts'

test('acceptance explains database type mismatch without exposing PostgreSQL details', () => {
	assert.match(getProjectAcceptanceErrorMessage({ code: '42804' }), /обновить структуру базы данных/)
})

test('acceptance explains stale and invalid applications', () => {
	assert.equal(getProjectAcceptanceErrorMessage({ message: 'Заявка уже обработана' }), 'Заявка уже обработана')
	assert.equal(getProjectAcceptanceErrorMessage({ message: 'Эта позиция уже закрыта' }), 'Эта позиция уже закрыта')
	assert.equal(getProjectAcceptanceErrorMessage({ message: 'Для заявки необходимо выбрать роль' }),
		'У заявителя не указана роль. Попросите подать новую заявку.')
})

test('acceptance explains network failures', () => {
	assert.equal(getProjectAcceptanceErrorMessage({ message: 'Failed to fetch' }), 'Не удалось связаться с сервером')
})
