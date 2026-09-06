import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface RegisterFormProps {
	onSwitchToLogin: () => void
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [successMessage, setSuccessMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const { signUp } = useAuth()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')

		if (password !== confirmPassword) {
			setError('Пароли не совпадают')
			return
		}

		if (password.length < 12) {
			setError('Пароль должен содержать минимум 12 символов')
			return
		}

		setLoading(true)

		try {
			await signUp(email, password)
			setSuccessMessage(
				"Письмо для подтверждения отправлено на вашу почту! Пожалуйста, проверьте папку 'Спам', если не видите его.",
			)
			setEmail('')
			setPassword('')
			setConfirmPassword('')
			setError('')
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Не удалось зарегистрироваться'

			// Если это сообщение про отправку письма или подтверждение email - показываем как успех
			if (
				errorMessage.includes('Письмо отправлено') ||
				errorMessage.includes('подтвердите')
			) {
				setSuccessMessage(errorMessage)
				setEmail('')
				setPassword('')
				setConfirmPassword('')
				setError('')
			} else {
				setError(errorMessage)
				setSuccessMessage('')
			}
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='card w-full max-w-md mx-auto p-8'>
			<h2 className='text-3xl font-bold text-center mb-6 text-[var(--text)]'>
				Регистрация
			</h2>

			{error && (
				<div className='mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'>
					{error}
				</div>
			)}
			{successMessage && (
				<div className='mb-4 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'>
					{successMessage}
				</div>
			)}

			<form onSubmit={handleSubmit} className='space-y-4'>
				<div>
					<input
						id='email'
						type='email'
						value={email}
						onChange={e => setEmail(e.target.value)}
						required
						className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='your@email.com'
					/>
				</div>

				<div>
					<label
						htmlFor='password'
						className='block text-sm font-medium text-[var(--muted)] mb-1'
					>
						Пароль
					</label>
					<input
						id='password'
						type='password'
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
						className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='••••••••'
					/>
				</div>

				<div>
					<label
						htmlFor='confirmPassword'
						className='block text-sm font-medium text-[var(--muted)] mb-1'
					>
						Подтвердите пароль
					</label>
					<input
						id='confirmPassword'
						type='password'
						value={confirmPassword}
						onChange={e => setConfirmPassword(e.target.value)}
						required
						className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='••••••••'
					/>
				</div>

				<button
					type='submit'
					disabled={loading}
					className='w-full bg-[var(--accent)] text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed'
				>
					{loading ? 'Регистрация...' : 'Зарегистрироваться'}
				</button>
			</form>

			<p className='mt-6 text-center text-[var(--muted)]'>
				Уже есть аккаунт?{' '}
				<button
					onClick={onSwitchToLogin}
					className='text-[var(--accent)] hover:opacity-90 font-semibold'
				>
					Войти
				</button>
			</p>
		</div>
	)
}
