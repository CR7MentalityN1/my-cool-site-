import { useEffect, useState } from 'react'
import { initialRecoveryRedirect, supabase } from '../lib/supabase'

type RecoveryState = 'checking' | 'ready' | 'invalid' | 'success'

const RECOVERY_MARKER = 'password-recovery-user'

function recoveryErrorMessage(code: string | null, description?: string | null) {
	if (code === 'otp_expired' || code === 'expired_token') {
		return 'Срок действия ссылки истёк или она уже была использована. Запросите новое письмо для сброса пароля.'
	}
	if (code || description) {
		return 'Ссылка для восстановления недействительна или уже использована. Запросите новое письмо.'
	}
	return 'Сессия восстановления не найдена. Откройте актуальную ссылку из письма или запросите новое письмо.'
}

// StrictMode remounts effects in development. Share a pending exchange so a
// single-use PKCE code is never submitted twice.
let pendingCodeExchange: ReturnType<typeof supabase.auth.exchangeCodeForSession> | null = null

export function ResetPassword() {
	const [state, setState] = useState<RecoveryState>('checking')
	const [password, setPassword] = useState('')
	const [password2, setPassword2] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')

	const finishSignOut = async () => {
		try {
			const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
			if (signOutError) throw signOutError
			setError('')
			window.setTimeout(() => window.location.replace('/login'), 1200)
		} catch {
			setError('Пароль изменён, но автоматический выход не удался. Повторите выход.')
		}
	}

	useEffect(() => {
		let active = true
		let recoveryEventReceived = false
		const { data: { subscription } } = supabase.auth.onAuthStateChange(
			(event, session) => {
				if (event === 'SIGNED_OUT') {
					sessionStorage.removeItem(RECOVERY_MARKER)
				}
				if (event === 'PASSWORD_RECOVERY' && session) {
					recoveryEventReceived = true
					sessionStorage.setItem(RECOVERY_MARKER, session.user.id)
					if (active) {
						setError('')
						setState('ready')
					}
				}
			},
		)

		const checkRecoverySession = async () => {
			try {
				if (initialRecoveryRedirect.redirectError || initialRecoveryRedirect.errorCode || initialRecoveryRedirect.errorDescription) {
					sessionStorage.removeItem(RECOVERY_MARKER)
					throw new Error(recoveryErrorMessage(
						initialRecoveryRedirect.errorCode || initialRecoveryRedirect.redirectError,
						initialRecoveryRedirect.errorDescription,
					))
				}
				if (initialRecoveryRedirect.implicitRecovery && !initialRecoveryRedirect.hasImplicitTokens) {
					throw new Error(recoveryErrorMessage('invalid_link'))
				}

				// initialize() is idempotent in the installed SDK and waits for its
				// automatic implicit or PKCE redirect processing to complete.
				const { error: initializationError } = await supabase.auth.initialize()
				let exchangedCodeManually = false

				if (
					initialRecoveryRedirect.code &&
					new URL(window.location.href).searchParams.get('code') === initialRecoveryRedirect.code
				) {
					// The default browser client uses implicit flow. If a PKCE code
					// remains in the URL, the SDK has not exchanged it automatically.
					pendingCodeExchange ??= supabase.auth.exchangeCodeForSession(
						initialRecoveryRedirect.code,
					)
					const { error: exchangeError } = await pendingCodeExchange
					if (exchangeError) throw new Error(recoveryErrorMessage('invalid_link'))
					exchangedCodeManually = true
					const url = new URL(window.location.href)
					url.searchParams.delete('code')
					window.history.replaceState(window.history.state, '', url.toString())
				}
				if (initializationError && !exchangedCodeManually) {
					throw new Error(recoveryErrorMessage('invalid_link'))
				}

				const { data: { session }, error: sessionError } = await supabase.auth.getSession()
				if (sessionError) throw sessionError

				const knownRecovery =
					recoveryEventReceived ||
					initialRecoveryRedirect.hasRecoveryLink ||
					sessionStorage.getItem(RECOVERY_MARKER) === session?.user.id

				if (!session || !knownRecovery) {
					throw new Error(recoveryErrorMessage(null))
				}

				sessionStorage.setItem(RECOVERY_MARKER, session.user.id)
				if (active) {
					setError('')
					setState('ready')
				}
			} catch (err) {
				if (active) {
					setError(err instanceof Error ? err.message : recoveryErrorMessage('invalid_link'))
					setState('invalid')
				}
			}
		}

		checkRecoverySession()
		return () => {
			active = false
			subscription.unsubscribe()
		}
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setMessage('')

		if (password.length < 12) {
			setError('Пароль должен содержать минимум 12 символов')
			return
		}
		if (password !== password2) {
			setError('Пароли не совпадают')
			return
		}

		setLoading(true)
		try {
			const { error: updateError } = await supabase.auth.updateUser({
				password,
			})
			if (updateError) {
				if (updateError.status === 401 || updateError.status === 403) {
					sessionStorage.removeItem(RECOVERY_MARKER)
					setState('invalid')
					throw new Error(recoveryErrorMessage('expired_token'))
				}
				throw updateError
			}

			setMessage('Пароль успешно изменён')
			setState('success')
			sessionStorage.removeItem(RECOVERY_MARKER)
			await finishSignOut()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ошибка обновления пароля')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]'>
			<div className='card glass w-full max-w-md p-8'>
				<h1 className='text-3xl font-bold text-center text-[var(--text)] mb-2'>
					Смена пароля
				</h1>
				<p className='text-center text-[var(--muted)] mb-6'>
					Введите новый пароль для вашего аккаунта.
				</p>

				{message && (
					<div className='mb-4 p-3 rounded-2xl border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'>
						{message}
					</div>
				)}
				{error && (
					<div className='mb-4 p-3 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'>
						{error}
					</div>
				)}

				{state === 'checking' && (
					<p className='text-[var(--muted)]'>Проверяем ссылку для восстановления...</p>
				)}
				{state === 'invalid' && (
					<a href='/login' className='text-[var(--accent)] font-semibold hover:underline'>
						Вернуться ко входу
					</a>
				)}
				{state === 'ready' && (
					<form onSubmit={handleSubmit} className='space-y-4'>
						<div>
							<label htmlFor='new-password' className='block text-sm font-medium text-[var(--muted)] mb-1'>
								Новый пароль
							</label>
							<input
								id='new-password'
								type='password'
								value={password}
								onChange={e => setPassword(e.target.value)}
								autoComplete='new-password'
								required
								className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)]/70 text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
							/>
						</div>
						<div>
							<label htmlFor='confirm-password' className='block text-sm font-medium text-[var(--muted)] mb-1'>
								Повторите новый пароль
							</label>
							<input
								id='confirm-password'
								type='password'
								value={password2}
								onChange={e => setPassword2(e.target.value)}
								autoComplete='new-password'
								required
								className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)]/70 text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
							/>
						</div>
						<button
							type='submit'
							disabled={loading}
							className='w-full bg-[var(--accent)] text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed'
						>
							{loading ? 'Сохранение...' : 'Сохранить новый пароль'}
						</button>
					</form>
				)}
				{state === 'success' && (
					<div>
						{error ? (
							<button type='button' onClick={finishSignOut} className='text-[var(--accent)] font-semibold hover:underline'>
								Повторить выход
							</button>
						) : (
							<p className='text-[var(--muted)]'>Переходим на страницу входа...</p>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
