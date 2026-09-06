import { X, User, Mail } from 'lucide-react'
import type { Database } from '../../lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface StudentModalProps {
	profile: Profile
	onClose: () => void
}

export function StudentModal({ profile, onClose }: StudentModalProps) {
	return (
		<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
			<div className='card glass max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
				<div className='sticky top-0 bg-[var(--card)] border-b border-[var(--border)] p-4 flex justify-between items-center'>
					<h2 className='text-2xl font-bold text-[var(--text)]'>Профиль студента</h2>
					<button
						onClick={onClose}
						className='text-[var(--muted)] hover:text-[var(--text)] transition'
					>
						<X className='w-6 h-6' />
					</button>
				</div>

				<div className='p-6'>
					<div className='flex items-center space-x-6 mb-6'>
						<div className='w-24 h-24 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0'>
							{profile.avatar_url ? (
								<img
									src={profile.avatar_url}
									alt={profile.name || 'Student'}
									className='w-full h-full object-cover'
								/>
							) : (
								<User className='w-12 h-12 text-[var(--muted)]' />
							)}
						</div>

						<div>
							<h3 className='text-2xl font-bold text-[var(--text)] mb-2'>
								{profile.name || 'Без имени'}
							</h3>
							<p className='text-[var(--muted)]'>
								{profile.faculty ? (
									profile.specialization ? (
										<>
											{profile.faculty} —{' '}
											<span className='font-semibold'>
												{profile.specialization}
											</span>
										</>
									) : (
										profile.faculty
									)
								) : (
									'Факультет не указан'
								)}
							</p>
							<p className='text-[var(--muted)]'>
								{profile.course ? `${profile.course} курс` : ''}
							</p>
						</div>
					</div>

					{profile.skills && profile.skills.length > 0 && (
						<div className='mb-6'>
							<h4 className='text-lg font-semibold text-[var(--text)] mb-3'>
								Навыки
							</h4>
							<div className='flex flex-wrap gap-2'>
								{profile.skills.map((skill, index) => (
									<span key={index} className='badge' style={{ fontSize: 14 }}>
										{skill}
									</span>
								))}
							</div>
						</div>
					)}

					{profile.project_description && (
						<div className='mb-6'>
							<h4 className='text-lg font-semibold text-[var(--text)] mb-3'>
								Описание проекта
							</h4>
							<p className='text-[var(--text)]/90 leading-relaxed whitespace-pre-wrap'>
								{profile.project_description}
							</p>
						</div>
					)}

					{profile.contacts && (
						<div className='rounded-2xl p-4 border border-[var(--border)] bg-black/5 dark:bg-white/5'>
							<h4 className='text-lg font-semibold text-[var(--text)] mb-2 flex items-center'>
								<Mail className='w-5 h-5 mr-2' />
								Контакты
							</h4>
							<p className='text-[var(--text)]/90'>{profile.contacts}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
