import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface ResetPasswordFormProps {
	onDone: () => void
}

export function ResetPasswordForm({ onDone }: ResetPasswordFormProps) {
	const [password, setPassword] = useState('')
	const [password2, setPassword2] = useState('')
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const { updatePassword } = useAuth()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setMessage('')

		if (password.length < 12) {
			setError('Пароль должен быть не короче 12 символов')
			return
		}
		if (password !== password2) {
			setError('Пароли не совпадают')
			return
		}

		setLoading(true)
		try {
			await updatePassword(password)
			setMessage('Пароль обновлён. Теперь можно войти.')
			setTimeout(onDone, 800)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ошибка обновления пароля')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='card w-full max-w-md mx-auto p-8'>
			<h2 className='text-3xl font-bold text-center mb-6 text-[var(--text)]'>
				Новый пароль
			</h2>

			{message && (
				<div className='mb-4 p-3 rounded-xl border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'>
					{message}
				</div>
			)}
			{error && (
				<div className='mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'>
					{error}
				</div>
			)}

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
						className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='••••••••'
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-[var(--muted)] mb-1'>
						Повторите пароль
					</label>
					<input
						type='password'
						value={password2}
						onChange={e => setPassword2(e.target.value)}
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
					{loading ? 'Сохранение...' : 'Сохранить пароль'}
				</button>
			</form>
		</div>
	)
}

