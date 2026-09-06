import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface LoginFormProps {
	onSwitchToRegister: () => void
	onForgotPassword: () => void
}

export function LoginForm({ onSwitchToRegister, onForgotPassword }: LoginFormProps) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const { signIn } = useAuth()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		try {
			await signIn(email, password)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Не удалось войти')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='card w-full max-w-md mx-auto p-8'>
			<h2 className='text-3xl font-bold text-center mb-6 text-[var(--text)]'>
				Вход
			</h2>

			{error && (
				<div className='mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'>
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit} className='space-y-4'>
				<div>
					<label
						htmlFor='email'
						className='block text-sm font-medium text-[var(--muted)] mb-1'
					>
						Email
					</label>
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
					<div className='mt-2 text-right'>
						<button
							type='button'
							onClick={onForgotPassword}
							className='text-sm text-[var(--accent)] hover:opacity-90 font-semibold'
						>
							Забыли пароль?
						</button>
					</div>
				</div>

				<button
					type='submit'
					disabled={loading}
					className='w-full bg-[var(--accent)] text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed'
				>
					{loading ? 'Вход...' : 'Войти'}
				</button>
			</form>

			<p className='mt-6 text-center text-[var(--muted)]'>
				Нет аккаунта?{' '}
				<button
					onClick={onSwitchToRegister}
					className='text-[var(--accent)] hover:opacity-90 font-semibold'
				>
					Зарегистрироваться
				</button>
			</p>
		</div>
	)
}
