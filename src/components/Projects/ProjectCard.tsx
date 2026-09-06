import { useMemo, useState } from 'react'
import { Users, UserPlus, Settings } from 'lucide-react'
import type { Database } from '../../lib/database.types'
import { parseRoleSlot, type RoleSlot } from '../../lib/projectRoles'

type ProjectRow = Database['public']['Tables']['projects']['Row']

type ProjectWithOwner = ProjectRow & {
	profiles?: {
		full_name: string | null
	}
}

type UserProjectStatus = 'owner' | 'in_team' | 'has_application' | 'can_apply'

interface ProjectCardProps {
	project: ProjectWithOwner
	status: UserProjectStatus
	applicationsByRoleKey?: Record<string, number>
	onOpen: () => void
	onOpenAdmin: () => void
	onApply: (roleKey?: string) => void
}

export function ProjectCard({
	project,
	status,
	applicationsByRoleKey,
	onOpen,
	onOpenAdmin,
	onApply,
}: ProjectCardProps) {
	const roles = useMemo(() => {
		return (project.required_roles || []).map(parseRoleSlot)
	}, [project.required_roles])

	const [confirmRole, setConfirmRole] = useState<RoleSlot | null>(null)

	// can_apply — только для чужих проектов.
	const canClickRoles = status === 'can_apply'

	return (
		<>
			<div
				className='card glass card-hover p-6 cursor-pointer relative overflow-hidden group select-none'
				onClick={onOpen}
			>
				{project.image_url ? (
					<img
						src={project.image_url}
						alt={project.title}
						className='w-full h-40 object-cover rounded-2xl mb-4 pointer-events-none'
					/>
				) : (
					<div className='w-full h-40 bg-black/5 dark:bg-white/10 rounded-2xl mb-4 flex items-center justify-center border border-[var(--border)]'>
						<span className='text-[var(--muted)]'>Нет изображения</span>
					</div>
				)}

				<div className='flex items-start justify-between gap-3 relative z-10'>
					<h2 className='text-xl font-bold text-[var(--text)] mb-2'>
						{project.title}
					</h2>

					{status === 'owner' && (
						<button
							type='button'
							onClick={e => {
								e.stopPropagation()
								onOpenAdmin()
							}}
							className='p-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:bg-black/5 dark:hover:bg-white/10 relative z-20'
						>
							<Settings className='w-5 h-5 text-[var(--text)]' />
						</button>
					)}
				</div>

				<p className='text-[var(--muted)] text-sm mb-4 line-clamp-2 relative z-10'>
					{project.description}
				</p>

				{roles.length > 0 && (
					<div className='mb-4 relative z-30'>
						<p className='text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2'>
							Нужны специалисты:
						</p>
						<div className='flex flex-wrap gap-2'>
							{roles.map(role => {
								const isFull = role.taken >= role.total
								const disabled = !canClickRoles || isFull

								return (
									<button
										key={role.key}
										type='button'
										// ВАЖНО: не используем disabled={disabled}, чтобы клик не блокировался браузером
										onClick={e => {
											e.preventDefault()
											e.stopPropagation()
											console.log('Попытка клика по роли:', role.label)
											if (!disabled) {
												setConfirmRole(role)
											}
										}}
										className={`
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all 
                      relative z-40 pointer-events-auto cursor-pointer select-none active:scale-95
                      ${
												disabled
													? 'bg-gray-500/10 text-gray-500 opacity-50 cursor-not-allowed'
													: 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)] hover:text-white shadow-sm'
											}
                    `}
									>
										<span>{role.label}</span>
										<span className='px-1.5 py-0.5 rounded-lg text-[10px] bg-black/10'>
											{role.taken}/{role.total}
										</span>
									</button>
								)
							})}
						</div>
					</div>
				)}

				<div className='border-t border-[var(--border)] pt-4 mt-auto relative z-10'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-3'>
							<div className='w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-xs'>
								{project.profiles?.full_name?.[0] || '?'}
							</div>
							<p className='text-xs font-bold text-[var(--text)]'>
								{project.profiles?.full_name || 'Неизвестен'}
							</p>
						</div>
						<div className='flex items-center gap-1.5 text-[var(--muted)]'>
							<Users className='w-3.5 h-3.5' />
							<span className='text-xs font-bold'>
								{project.current_members?.length || 0}
							</span>
						</div>
					</div>
				</div>
			</div>

			{confirmRole && (
				<div
					className='fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]'
					onClick={() => setConfirmRole(null)}
				>
					<div
						className='bg-[var(--card)] border border-[var(--border)] w-full max-w-sm p-8 rounded-[2rem] shadow-2xl scale-in-center'
						onClick={e => e.stopPropagation()}
					>
						<div className='text-center mb-8'>
							<div className='w-20 h-20 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6'>
								<UserPlus className='w-10 h-10 text-[var(--accent)]' />
							</div>
							<h3 className='text-2xl font-bold text-[var(--text)]'>
								Подать заявку?
							</h3>
							<p className='text-[var(--muted)] mt-3 px-4'>
								Вы выбрали роль{' '}
								<span className='text-[var(--accent)] font-bold'>
									{confirmRole.label}
								</span>
							</p>
						</div>

						<div className='flex flex-col gap-3'>
							<button
								type='button'
								onClick={() => {
									onApply(confirmRole.key)
									setConfirmRole(null)
								}}
								className='w-full py-4 rounded-2xl bg-[var(--accent)] text-white font-bold hover:brightness-110 transition-all active:scale-[0.98] shadow-lg shadow-[var(--accent)]/25'
							>
								Да, отправить заявку
							</button>
							<button
								type='button'
								onClick={() => setConfirmRole(null)}
								className='w-full py-4 rounded-2xl border border-[var(--border)] text-[var(--muted)] hover:bg-white/5 transition-all font-medium'
							>
								Отмена
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
