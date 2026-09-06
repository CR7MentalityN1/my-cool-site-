import { User } from 'lucide-react'
import type { Database } from '../../lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface StudentCardProps {
	profile: Profile
	onViewDetails: () => void
}

export function StudentCard({ profile, onViewDetails }: StudentCardProps) {
	return (
		<div className='card glass card-hover p-6'>
			<div className='flex flex-col items-center'>
				<div className='w-20 h-20 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center overflow-hidden mb-4'>
					{profile.avatar_url ? (
						<img
							src={profile.avatar_url}
							alt={profile.name || 'Student'}
							className='w-full h-full object-cover'
						/>
					) : (
						<User className='w-10 h-10 text-[var(--muted)]' />
					)}
				</div>

				<h3 className='text-xl font-semibold text-[var(--text)] mb-1 text-center'>
					{profile.name || 'Без имени'}
				</h3>

				<p className='text-sm text-[var(--muted)] mb-1'>
					{profile.faculty ? (
						profile.specialization ? (
							<>
								{profile.faculty} —{' '}
								<span className='font-semibold text-[var(--text)]'>
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
				<p className='text-sm text-[var(--muted)] mb-3'>
					{profile.course ? `${profile.course} курс` : ''}
				</p>

				{profile.skills && profile.skills.length > 0 && (
					<div className='flex flex-wrap gap-2 justify-center mb-4'>
						{profile.skills.slice(0, 3).map((skill, index) => (
							<span key={index} className='badge'>
								{skill}
							</span>
						))}
						{profile.skills.length > 3 && (
							<span className='badge' style={{ opacity: 0.85 }}>
								+{profile.skills.length - 3}
							</span>
						)}
					</div>
				)}

				<button
					onClick={onViewDetails}
					className='w-full bg-[var(--accent)] text-white py-2 rounded-xl font-medium hover:opacity-90 transition'
				>
					Подробнее
				</button>
			</div>
		</div>
	)
}
