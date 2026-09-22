import { useEffect, useState } from 'react'
import { ExternalLink, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { safeExternalUrl } from '../../lib/urls'

type Project = Database['public']['Tables']['projects']['Row']

type PortfolioProject = Project & {
	participantRole: string
}

export function CompletedProjects({ userId }: { userId: string }) {
	const [projects, setProjects] = useState<PortfolioProject[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let active = true

		const loadProjects = async () => {
			setLoading(true)
			try {
				const [{ data: owned, error: ownedError }, { data: memberships, error: memberError }] =
					await Promise.all([
						supabase
							.from('projects')
							.select('*')
							.eq('owner_id', userId)
							.eq('status', 'completed'),
						supabase
							.from('project_members')
							.select('project_id, role')
							.eq('user_id', userId),
					])

				if (ownedError) throw ownedError
				if (memberError) throw memberError

				const roleByProject = new Map(
					(memberships || []).map(item => [item.project_id, item.role]),
				)
				const memberProjectIds = [...roleByProject.keys()]
				let memberProjects: Project[] = []

				if (memberProjectIds.length > 0) {
					const { data, error } = await supabase
						.from('projects')
						.select('*')
						.in('id', memberProjectIds)
						.eq('status', 'completed')
					if (error) throw error
					memberProjects = data || []
				}

				const combined = new Map<string, PortfolioProject>()
				for (const project of owned || []) {
					combined.set(project.id, { ...project, participantRole: 'Автор проекта' })
				}
				for (const project of memberProjects) {
					if (!combined.has(project.id)) {
						combined.set(project.id, {
							...project,
							participantRole: roleByProject.get(project.id) || 'Участник',
						})
					}
				}

				if (active) setProjects([...combined.values()])
			} catch (error) {
				console.error('Error fetching completed projects:', error)
				if (active) setProjects([])
			} finally {
				if (active) setLoading(false)
			}
		}

		loadProjects()
		return () => {
			active = false
		}
	}, [userId])

	if (loading) {
		return <p className='text-sm text-[var(--muted)]'>Загрузка портфолио...</p>
	}

	return (
		<div>
			<h4 className='text-lg font-semibold text-[var(--text)] mb-3 flex items-center gap-2'>
				<Trophy className='w-5 h-5 text-amber-500' />
				Завершённые проекты
			</h4>
			{projects.length === 0 ? (
				<p className='text-sm text-[var(--muted)]'>Пока нет завершённых проектов</p>
			) : (
				<div className='grid gap-3 sm:grid-cols-2'>
					{projects.map(project => (
						<article key={project.id} className='rounded-2xl border border-[var(--border)] p-4 bg-black/5 dark:bg-white/5'>
							<p className='text-xs font-semibold text-amber-600 mb-1'>{project.participantRole}</p>
							<h5 className='font-bold text-[var(--text)]'>{project.title}</h5>
							{project.description && (
								<p className='text-sm text-[var(--muted)] mt-2 line-clamp-3'>{project.description}</p>
							)}
							{safeExternalUrl(project.result_url) && (
								<a href={safeExternalUrl(project.result_url) || undefined} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] mt-3 hover:underline'>
									Посмотреть результат <ExternalLink className='w-4 h-4' />
								</a>
							)}
						</article>
					))}
				</div>
			)}
		</div>
	)
}
