type ErrorDetails = {
	code?: unknown
	message?: unknown
	status?: unknown
}

/** An application-authored message that is safe to display verbatim. */
export class UserFacingError extends Error {}

export function getUserErrorMessage(
	error: unknown,
	fallback = 'Не удалось выполнить действие. Попробуйте ещё раз.',
): string {
	if (error instanceof UserFacingError) return error.message

	const details: ErrorDetails = error && typeof error === 'object' ? error : {}
	const code = typeof details.code === 'string' ? details.code.toLowerCase() : ''
	const message = typeof details.message === 'string' ? details.message.toLowerCase() : ''
	const status = typeof details.status === 'number' ? details.status : null

	if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
		return 'Неверный email или пароль'
	}
	if (
		status === 429 ||
		code === 'over_email_send_rate_limit' ||
		code === 'over_request_rate_limit' ||
		message.includes('rate limit exceeded') ||
		message.includes('too many requests')
	) {
		return 'Слишком много запросов. Попробуйте позже.'
	}
	if (code === '23505') return 'Такая запись уже существует'
	if (code === 'user_already_exists' || message.includes('user already registered')) {
		return 'Аккаунт с таким email уже существует'
	}
	if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
		return 'Подтвердите email по ссылке из письма'
	}
	if (code === 'weak_password') return 'Пароль слишком простой. Выберите более сложный.'
	if (code === 'otp_expired' || code === 'expired_token') {
		return 'Срок действия ссылки истёк. Запросите новое письмо.'
	}
	if (code === '42501') return 'Недостаточно прав для этого действия'
	if (
		message.includes('failed to fetch') ||
		message.includes('fetch failed') ||
		message.includes('network request failed') ||
		message.includes('network error') ||
		message.includes('networkerror') ||
		message.includes('fetcherror') ||
		message.includes('load failed') ||
		code.startsWith('08')
	) {
		return 'Не удалось связаться с сервером'
	}

	// The acceptance RPC has a small, application-authored set of domain errors.
	const applicationMessages: Record<string, string> = {
		'заявка уже обработана': 'Заявка уже обработана',
		'эта позиция уже закрыта': 'Эта позиция уже закрыта',
		'выбранная роль больше не доступна': 'Выбранная роль больше недоступна',
		'пользователь уже в команде': 'Пользователь уже в команде',
		'набор в проект закрыт': 'Набор в проект закрыт',
	}
	return applicationMessages[message] || fallback
}
