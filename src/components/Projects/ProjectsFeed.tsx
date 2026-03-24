import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Search, Users } from 'lucide-react'
import type { Database } from '../../lib/database.types'

type Project = Database['public']['Tables']['projects']['Row'] & {
	owner?: { name?: string }
	participants?: Array<{ id: string }>
}

export function ProjectsFeed() {
	const { user } = useAuth()
	const [projects, setProjects] = useState<Project[]>([])
	const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState('')

	useEffect(() => {
		fetchProjects()
	}, [])

	useEffect(() => {
		applyFilters()
	}, [projects, searchQuery])

	const fetchProjects = async () => {
		setLoading(true)
		const { data, error } = await supabase
			.from('projects')
			.select('*')
			.order('created_at', { ascending: false })

		if (error) {
			console.error('Error fetching projects:', error)
		} else {
			setProjects(data || [])
		}
		setLoading(false)
	}

	const applyFilters = () => {
		let filtered = projects

		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			filtered = filtered.filter(
				p =>
					p.title?.toLowerCase().includes(query) ||
					p.description?.toLowerCase().includes(query),
			)
		}

		setFilteredProjects(filtered)
	}

	const handleApply = (async (projectId: string) => {
		if (!user) return

		try {
			const { error } = await (supabase as any)
				.from('project_applications')
				.insert([
					{
						project_id: projectId,
						user_id: user.id,
						status: 'pending',
						created_at: new Date().toISOString(),
					},
				])

			if (error) {
				console.error('Error applying to project:', error)
				alert('Ошибка при подаче заявки')
			} else {
				alert('Заявка успешно подана!')
			}
		} catch (error) {
			console.error('Error:', error)
		}
	}) as any

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-xl text-gray-600'>Загрузка проектов...</div>
			</div>
		)
	}

	return (
		<div className='max-w-7xl mx-auto px-4 py-8'>
			<h1 className='text-4xl font-bold text-gray-800 mb-8'>Проекты</h1>

			<div className='bg-white rounded-lg shadow-md p-6 mb-8'>
				<label className='block text-sm font-medium text-gray-700 mb-2'>
					Поиск проектов
				</label>
				<div className='relative'>
					<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
					<input
						type='text'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						placeholder='Поиск по названию или описанию...'
						className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
					/>
				</div>
			</div>

			{filteredProjects.length === 0 ? (
				<div className='text-center py-12'>
					<p className='text-gray-600 text-lg'>Проектов не найдено</p>
				</div>
			) : (
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{filteredProjects.map(project => (
						<div
							key={project.id}
							className='bg-white rounded-lg shadow-md hover:shadow-lg transition p-6'
						>
							{project.image_url && (
								<img
									src={project.image_url}
									alt={project.title}
									className='w-full h-40 object-cover rounded-lg mb-4'
								/>
							)}

							<h2 className='text-xl font-bold text-gray-800 mb-2'>
								{project.title}
							</h2>

							<p className='text-gray-600 text-sm mb-4'>
								{project.description}
							</p>

							{project.required_roles && project.required_roles.length > 0 && (
								<div className='mb-4'>
									<p className='text-sm font-bold text-gray-700 mb-2'>
										Необходимые роли:
									</p>
									<div className='flex flex-wrap gap-2'>
										{project.required_roles.map((role, idx) => (
											<span
												key={idx}
												className='px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium'
											>
												{role}
											</span>
										))}
									</div>
								</div>
							)}

							<div className='border-t pt-4 mb-4'>
								<div className='flex items-center justify-between mb-3'>
									<div>
										<p className='text-xs text-gray-500'>Владелец проекта</p>
										<p className='text-sm font-bold text-gray-800'>Admin</p>
									</div>
									<div className='flex items-center space-x-1 text-gray-600'>
										<Users className='w-4 h-4' />
										<span className='text-sm font-bold'>
											{project.participants?.length || 0} участников
										</span>
									</div>
								</div>
							</div>

							<div className='flex gap-3'>
								<button
									onClick={() => handleApply(project.id)}
									className='flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition'
								>
									Подать заявку
								</button>

								{user && user.id === project.owner_id && (
									<button className='flex-1 bg-gray-600 text-white py-2 rounded-lg font-bold hover:bg-gray-700 transition'>
										Управление
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
