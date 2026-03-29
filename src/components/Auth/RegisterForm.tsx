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

		if (password.length < 6) {
			setError('Пароль должен содержать минимум 6 символов')
			return
		}

		setLoading(true)

		try {
			await signUp(email, password)
			setSuccessMessage(
				'Письмо с подтверждением отправлено на вашу почту! Пожалуйста, проверьте папку Спам',
			)
			setEmail('')
			setPassword('')
			setConfirmPassword('')
			setError('')
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Не удалось зарегистрироваться',
			)
			setSuccessMessage('')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='w-full max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg'>
			<h2 className='text-3xl font-bold text-center mb-6 text-gray-800'>
				Регистрация
			</h2>

			{error && (
				<div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded'>
					{error}
				</div>
			)}
			{successMessage && (
				<div className='mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded'>
					{successMessage}
				</div>
			)}

			<form onSubmit={handleSubmit} className='space-y-4'>
				<div>
					<label
						htmlFor='email'
						className='block text-sm font-medium text-gray-700 mb-1'
					>
						Email
					</label>
					<input
						id='email'
						type='email'
						value={email}
						onChange={e => setEmail(e.target.value)}
						required
						className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='your@email.com'
					/>
				</div>

				<div>
					<label
						htmlFor='password'
						className='block text-sm font-medium text-gray-700 mb-1'
					>
						Пароль
					</label>
					<input
						id='password'
						type='password'
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
						className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='••••••••'
					/>
				</div>

				<div>
					<label
						htmlFor='confirmPassword'
						className='block text-sm font-medium text-gray-700 mb-1'
					>
						Подтвердите пароль
					</label>
					<input
						id='confirmPassword'
						type='password'
						value={confirmPassword}
						onChange={e => setConfirmPassword(e.target.value)}
						required
						className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='••••••••'
					/>
				</div>

				<button
					type='submit'
					disabled={loading}
					className='w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed'
				>
					{loading ? 'Регистрация...' : 'Зарегистрироваться'}
				</button>
			</form>

			<p className='mt-6 text-center text-gray-600'>
				Уже есть аккаунт?{' '}
				<button
					onClick={onSwitchToLogin}
					className='text-blue-600 hover:text-blue-700 font-semibold'
				>
					Войти
				</button>
			</p>
		</div>
	)
}
