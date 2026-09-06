import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface ForgotPasswordFormProps {
	onBackToLogin: () => void
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
	const [email, setEmail] = useState('')
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const { resetPasswordForEmail } = useAuth()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setMessage('')
		setLoading(true)

		try {
			await resetPasswordForEmail(email.trim())
			setMessage('Письмо для сброса пароля отправлено. Проверьте почту.')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ошибка отправки письма')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='card w-full max-w-md mx-auto p-8'>
			<h2 className='text-3xl font-bold text-center mb-2 text-[var(--text)]'>
				Сброс пароля
			</h2>
			<p className='text-center text-[var(--muted)] mb-6'>
				Укажите email — мы отправим ссылку для восстановления.
			</p>

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
						Email
					</label>
					<input
						type='email'
						value={email}
						onChange={e => setEmail(e.target.value)}
						required
						className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='your@email.com'
					/>
				</div>

				<button
					type='submit'
					disabled={loading}
					className='w-full bg-[var(--accent)] text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed'
				>
					{loading ? 'Отправка...' : 'Отправить ссылку'}
				</button>
			</form>

			<div className='mt-6 text-center'>
				<button
					type='button'
					onClick={onBackToLogin}
					className='text-[var(--accent)] hover:opacity-90 font-semibold'
				>
					Назад ко входу
				</button>
			</div>
		</div>
	)
}

