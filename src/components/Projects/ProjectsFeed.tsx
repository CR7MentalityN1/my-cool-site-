import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Search, Users, X, Plus } from 'lucide-react'
import type { Database } from '../../lib/database.types'

type Project = Database['public']['Tables']['projects']['Row'] & {
	owner?: { name?: string }
	participants?: Array<{ id: string }>
}

interface CreateProjectForm {
	title: string
	description: string
	roles: string
}

export function ProjectsFeed() {
	const { user } = useAuth()
	const [projects, setProjects] = useState<Project[]>([])
	const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState('')
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [formData, setFormData] = useState<CreateProjectForm>({
		title: '',
		description: '',
		roles: '',
	})
	const [isSubmitting, setIsSubmitting] = useState(false)

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

	const handleCreateProject = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!user) {
			alert('Требуется авторизация')
			return
		}

		if (!formData.title.trim()) {
			alert('Укажите название проекта')
			return
		}

		setIsSubmitting(true)

		try {
			const rolesArray = formData.roles
				.split(',')
				.map(role => role.trim())
				.filter(role => role.length > 0)

			const { error } = await (supabase as any).from('projects').insert([
				{
					title: formData.title,
					description: formData.description || null,
					owner_id: user.id,
					required_roles: rolesArray,
					image_url: null,
					created_at: new Date().toISOString(),
				},
			])

			if (error) {
				console.error('Error creating project:', error)
				alert('Ошибка при создании проекта')
			} else {
				alert('Проект успешно создан!')
				setFormData({ title: '', description: '', roles: '' })
				setIsModalOpen(false)
				fetchProjects()
			}
		} catch (error) {
			console.error('Error:', error)
			alert('Ошибка при создании проекта')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleFormChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target
		setFormData(prev => ({
			...prev,
			[name]: value,
		}))
	}

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
				<div className='flex items-end justify-between gap-4 mb-4'>
					<div className='flex-1'>
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
					<button
						onClick={() => setIsModalOpen(true)}
						className='bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2'
					>
						<Plus className='w-5 h-5' />
						Создать проект
					</button>
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

			{isModalOpen && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-lg shadow-xl max-w-md w-full'>
						<div className='flex items-center justify-between p-6 border-b'>
							<h2 className='text-2xl font-bold text-gray-800'>
								Создать проект
							</h2>
							<button
								onClick={() => setIsModalOpen(false)}
								className='text-gray-500 hover:text-gray-700 transition'
							>
								<X className='w-6 h-6' />
							</button>
						</div>

						<form onSubmit={handleCreateProject} className='p-6 space-y-4'>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Название проекта *
								</label>
								<input
									type='text'
									name='title'
									value={formData.title}
									onChange={handleFormChange}
									placeholder='Введите название'
									className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
									required
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Описание
								</label>
								<textarea
									name='description'
									value={formData.description}
									onChange={handleFormChange}
									placeholder='Опишите ваш проект'
									rows={4}
									className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Необходимые роли
								</label>
								<input
									type='text'
									name='roles'
									value={formData.roles}
									onChange={handleFormChange}
									placeholder='Frontend, Backend, Design (через запятую)'
									className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
								/>
								<p className='text-xs text-gray-500 mt-1'>
									Укажите роли через запятую
								</p>
							</div>

							<div className='flex gap-3 pt-4'>
								<button
									type='button'
									onClick={() => setIsModalOpen(false)}
									className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition'
									disabled={isSubmitting}
								>
									Отмена
								</button>
								<button
									type='submit'
									className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-blue-400'
									disabled={isSubmitting}
								>
									{isSubmitting ? 'Создание...' : 'Создать'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}
