import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { User, Contact, FileText, Sparkles } from 'lucide-react'
import { CompletedProjects } from './CompletedProjects'
import { AvatarImage } from '../AvatarImage'
import { safeAvatarUrl } from '../../lib/urls'
import { getUserErrorMessage } from '../../lib/userErrors'

const FACULTIES = [
	'Прикладная математика',
	'Программная инженерия',
	'Дизайн',
	'Маркетинг',
	'Экономика',
	'Менеджмент',
	'Журналистика',
	'Другое',
]

const SPECIALIZATIONS: Record<string, string[]> = {
	'Прикладная математика': [
		'Наука о данных',
		'Машинное обучение',
		'Финансовая аналитика',
		'Биоинформатика',
	],
	'Программная инженерия': [
		'Backend-разработчик',
		'Frontend-разработчик',
		'Full Stack',
		'DevOps',
		'QA-инженер',
	],
	Дизайн: [
		'UI/UX дизайнер',
		'Графический дизайнер',
		'3D дизайнер',
		'Motion-дизайнер',
	],
	Маркетинг: [
		'Цифровой маркетинг',
		'Контент-менеджер',
		'SMM-менеджер',
		'Маркетинговый аналитик',
	],
	Экономика: [
		'Финансовый аналитик',
		'Инвестиционный консультант',
		'Аудитор',
		'Экономист',
	],
	Менеджмент: [
		'Проектный менеджер',
		'Продуктовый менеджер',
		'Бизнес-аналитик',
		'Scrum-мастер',
	],
	Журналистика: ['Копирайтер', 'Редактор', 'Видеопродюсер', 'Журналист'],
	Другое: ['Специалист', 'Консультант', 'Аналитик'],
}

export function ProfileForm() {
	const { user, profile, loading: authLoading, refreshProfile } = useAuth()
	const [loading, setLoading] = useState(false)
	const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
	const savingRef = useRef(false)
	const [formData, setFormData] = useState({
		name: '',
		faculty: '',
		specialization: '',
		course: 1,
		skills: '',
		project_description: '',
		contacts: '',
		avatar_url: '',
	})

	useEffect(() => {
		if (profile) {
			setFormData({
				name: profile.name || '',
				faculty: profile.faculty || '',
				specialization: profile.specialization || '',
				course: profile.course || 1,
				skills: profile.skills?.join(', ') || '',
				project_description: profile.project_description || '',
				contacts: profile.contacts || '',
				avatar_url: profile.avatar_url || '',
			})
		}
	}, [profile])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (savingRef.current) return
		setFeedback(null)

		if (!user) {
			setFeedback({ type: 'error', text: 'Пользователь не авторизован' })
			return
		}
		const name = formData.name.trim()
		const contacts = formData.contacts.trim()
		const projectDescription = formData.project_description.trim()
		const skills = formData.skills.trim()
		const avatarUrl = formData.avatar_url.trim()
		let validationError: string | null = null
		if (!name) validationError = 'Укажите имя и фамилию'
		else if (name.length > 80) validationError = 'Имя слишком длинное (макс. 80 символов)'
		else if (contacts.length > 200) validationError = 'Контакты слишком длинные (макс. 200 символов)'
		else if (projectDescription.length > 2000) validationError = 'Описание слишком длинное (макс. 2000 символов)'
		else if (skills.length > 500) validationError = 'Список навыков слишком длинный (макс. 500 символов)'
		else if (avatarUrl && !safeAvatarUrl(avatarUrl)) {
			validationError = 'URL аватара должен начинаться с http:// или https://'
		}
		if (validationError) {
			setFeedback({ type: 'error', text: validationError })
			return
		}

		savingRef.current = true
		setLoading(true)
		try {
			const skillsArray = skills
				.split(',')
				.map(s => s.trim())
				.filter(s => s.length > 0)

			const { error } = await supabase.from('profiles').upsert({
				id: user.id,
				auth_id: user.id,
				email: user.email || '',
				name,
				faculty: formData.faculty.trim(),
				specialization: formData.specialization.trim(),
				course: formData.course,
				skills: skillsArray,
				project_description: projectDescription,
				contacts,
				avatar_url: avatarUrl,
			})

			if (error) {
				console.error('Ошибка сохранения:', error)
				throw error
			}

			await refreshProfile()
			setFeedback({ type: 'success', text: 'Профиль успешно обновлён!' })
		} catch (err) {
			console.error('Ошибка сохранения профиля:', err)
			setFeedback({ type: 'error', text: getUserErrorMessage(err, 'Не удалось сохранить профиль. Попробуйте ещё раз.') })
		} finally {
			savingRef.current = false
			setLoading(false)
		}
	}

	if (authLoading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-xl text-gray-600'>Загрузка...</div>
			</div>
		)
	}

	if (!user) {
		return (
			<div className='max-w-2xl mx-auto p-6 card glass'>
				<div className='text-center'>
					<h2 className='text-3xl font-bold mb-6 text-[var(--text)] inline-flex items-center gap-2 justify-center'>
						<User className='w-7 h-7' />
						Мой профиль
					</h2>
					<p className='text-[var(--muted)]'>
						Пожалуйста, войдите в систему для редактирования профиля.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className='max-w-2xl mx-auto p-6 card glass'>
			<h2 className='text-3xl font-bold mb-6 text-[var(--text)] inline-flex items-center gap-2'>
				<User className='w-7 h-7' />
				Мой профиль
			</h2>

			{feedback && (
				<div
					role={feedback.type === 'error' ? 'alert' : 'status'}
					className={`mb-4 p-3 rounded ${
						feedback.type === 'success'
							? 'bg-green-100 border border-green-400 text-green-700'
							: 'bg-red-100 border border-red-400 text-red-700'
					}`}
				>
					{feedback.text}
				</div>
			)}

			<form
				onSubmit={handleSubmit}
				onChangeCapture={() => { if (feedback) setFeedback(null) }}
				className='space-y-6'
			>
				<div className='flex items-center space-x-4 mb-6'>
					<div className='w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0'>
						<AvatarImage url={formData.avatar_url} alt='Avatar' iconClassName='w-12 h-12 text-gray-400' />
					</div>
					<div className='flex-1 min-w-0'>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							URL аватара (можно использовать Gravatar, Imgur и т.д.)
						</label>
						<input
							type='url'
							value={formData.avatar_url}
							onChange={e =>
								setFormData({ ...formData, avatar_url: e.target.value })
							}
							className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
							placeholder='https://example.com/avatar.jpg'
						/>
					</div>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Имя и фамилия *
					</label>
						<input
							type='text'
							value={formData.name}
							onChange={e => setFormData({ ...formData, name: e.target.value })}
							maxLength={80}
						required
						className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='Иван Иванов'
					/>
				</div>

				<div className='grid grid-cols-2 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							Факультет *
						</label>
						<select
							value={formData.faculty}
							onChange={e => {
								const newFaculty = e.target.value
								setFormData({
									...formData,
									faculty: newFaculty,
									specialization: '',
								})
							}}
							required
							className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						>
							<option value=''>Выберите факультет</option>
							{FACULTIES.map(faculty => (
								<option key={faculty} value={faculty}>
									{faculty}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							Специализация *
						</label>
						<select
							value={formData.specialization}
							onChange={e =>
								setFormData({ ...formData, specialization: e.target.value })
							}
							required
							disabled={!formData.faculty}
							className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-black/5 disabled:text-[var(--muted)] dark:disabled:bg-white/5'
						>
							<option value=''>
								{formData.faculty
									? 'Выберите специализацию'
									: 'Сначала выберите факультет'}
							</option>
							{formData.faculty &&
								SPECIALIZATIONS[formData.faculty]?.map(spec => (
									<option key={spec} value={spec}>
										{spec}
									</option>
								))}
						</select>
					</div>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Курс *
					</label>
					<select
						value={formData.course}
						onChange={e =>
							setFormData({ ...formData, course: Number(e.target.value) })
						}
						required
						className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
					>
						{[1, 2, 3, 4].map(course => (
							<option key={course} value={course}>
								{course} курс
							</option>
						))}
					</select>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						<span className='inline-flex items-center gap-2'>
							<Sparkles className='w-4 h-4 text-[var(--muted)]' />
							Навыки (через запятую)
						</span>
					</label>
					<input
						type='text'
						value={formData.skills}
						onChange={e => setFormData({ ...formData, skills: e.target.value })}
						maxLength={500}
						className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='React, Python, UI/UX Design'
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						<span className='inline-flex items-center gap-2'>
							<FileText className='w-4 h-4 text-[var(--muted)]' />
							Описание желаемого проекта
						</span>
					</label>
					<textarea
						value={formData.project_description}
						onChange={e =>
							setFormData({ ...formData, project_description: e.target.value })
						}
						rows={4}
						maxLength={2000}
						className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='Расскажите, над каким проектом хотите работать...'
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						<span className='inline-flex items-center gap-2'>
							<Contact className='w-4 h-4 text-[var(--muted)]' />
							Контакты (Telegram, email)
						</span>
					</label>
					<input
						type='text'
						value={formData.contacts}
						onChange={e =>
							setFormData({ ...formData, contacts: e.target.value })
						}
						maxLength={200}
						className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
						placeholder='@telegram или email@example.com'
					/>
				</div>

				<button
					type='submit'
					disabled={loading || !user}
					className='w-full bg-[var(--accent)] text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed'
				>
					{loading ? 'Сохранение...' : 'Сохранить профиль'}
				</button>
			</form>

			<div className='mt-8 border-t border-[var(--border)] pt-6'>
				<CompletedProjects userId={user.id} />
			</div>
		</div>
	)
}
