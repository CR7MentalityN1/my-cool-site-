import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface ResetPasswordProps {
	onGoToLogin: () => void
}

export function ResetPassword({ onGoToLogin }: ResetPasswordProps) {
	const [canReset, setCanReset] = useState(false)
	const [password, setPassword] = useState('')
	const [password2, setPassword2] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(event => {
			if (event === 'PASSWORD_RECOVERY') {
				setCanReset(true)
			}
		})

		// Fallback: direct link with hash params
		if ((window.location.hash || '').includes('type=recovery')) {
			setCanReset(true)
		}

		return () => subscription.unsubscribe()
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
			if (updateError) throw updateError

			setMessage('Пароль успешно изменен!')
			setTimeout(() => {
				window.history.replaceState({}, '', '/')
				onGoToLogin()
			}, 3000)
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

				{!canReset ? (
					<div className='rounded-2xl border border-[var(--border)] bg-black/5 dark:bg-white/5 p-4 text-[var(--muted)]'>
						Откройте ссылку из письма для восстановления пароля — после этого появится
						форма смены пароля.
					</div>
				) : (
					<form onSubmit={handleSubmit} className='space-y-4'>
						<div>
							<label className='block text-sm font-medium text-[var(--muted)] mb-1'>
								Новый пароль
							</label>
							<input
								type='password'
								value={password}
								onChange={e => setPassword(e.target.value)}
								required
								className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)]/70 text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
							/>
						</div>

						<div>
							<label className='block text-sm font-medium text-[var(--muted)] mb-1'>
								Подтвердите пароль
							</label>
							<input
								type='password'
								value={password2}
								onChange={e => setPassword2(e.target.value)}
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
			</div>
		</div>
	)
}

