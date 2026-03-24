import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
	Search,
	Users,
	X,
	Plus,
	Settings,
	UserPlus,
	Trash2,
	CheckCircle,
	Clock,
	XCircle,
} from 'lucide-react'
import type { Database } from '../../lib/database.types'

type Project = Database['public']['Tables']['projects']['Row'] & {
	profiles?: {
		full_name: string | null
	}
}
type ProjectApplication =
	Database['public']['Tables']['project_applications']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

// Custom insert types for proper typing
interface ProjectInsertData {
	title: string
	description: string | null
	owner_id: string
	required_roles: string[]
	current_members: string[]
	image_url: string | null
	created_at: string
}

interface ProjectApplicationInsertData {
	project_id: string
	user_id: string
	status: 'pending' | 'accepted' | 'rejected'
	created_at: string
}

interface ProjectUpdateData {
	current_members?: string[]
	description?: string | null
	required_roles?: string[]
	image_url?: string | null
}

interface ProjectApplicationUpdateData {
	status?: 'pending' | 'accepted' | 'rejected'
}

interface CreateProjectForm {
	title: string
	description: string
	roles: string
	image_url: string
}

interface AdminEditForm {
	description: string
	roles: string
	image_url: string
}

interface ApplicationWithProfile extends ProjectApplication {
	applicantName?: string
	applicantFaculty?: string
}

type UserProjectStatus = 'owner' | 'in_team' | 'has_application' | 'can_apply'

export function ProjectsFeed() {
	const { user } = useAuth()
	const [projects, setProjects] = useState<Project[]>([])
	const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState('')
	const [filterMode, setFilterMode] = useState<'all' | 'my'>('all')
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
	const [selectedProject, setSelectedProject] = useState<Project | null>(null)
	const [applications, setApplications] = useState<ApplicationWithProfile[]>([])
	const [isViewModalOpen, setIsViewModalOpen] = useState(false)
	const [adminEditForm, setAdminEditForm] = useState<AdminEditForm>({
		description: '',
		roles: '',
		image_url: '',
	})
	const [createFormData, setCreateFormData] = useState<CreateProjectForm>({
		title: '',
		description: '',
		roles: '',
		image_url: '',
	})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [userProjectStatuses, setUserProjectStatuses] = useState<
		Record<string, UserProjectStatus>
	>({})
	const [currentUserName, setCurrentUserName] = useState<string>('')

	useEffect(() => {
		fetchProjects()
	}, [])

	useEffect(() => {
		if (user) {
			const fetchUserName = async () => {
				try {
					const { data } = await supabase
						.from('profiles')
						.select('name')
						.eq('auth_id', user.id)
						.single()
					const typedData = data as { name: string | null } | null
					setCurrentUserName(
						typedData?.name || user.user_metadata?.full_name || '',
					)
				} catch {
					setCurrentUserName(user.user_metadata?.full_name || '')
				}
			}
			fetchUserName()
		}
	}, [user])

	useEffect(() => {
		applyFilters()
	}, [projects, searchQuery, filterMode, user, currentUserName])

	useEffect(() => {
		if (user && projects.length > 0) {
			checkUserStatusForAllProjects()
		}
	}, [user, projects])

	const fetchProjects = async () => {
		setLoading(true)
		const { data, error } = await supabase
			.from('projects')
			.select('*')
			.order('created_at', { ascending: false })

		if (error) {
			console.error('Error fetching projects:', error)
		} else {
			// Fetch owner names
			const projectsWithOwners = await Promise.all(
				((data as Database['public']['Tables']['projects']['Row'][]) || []).map(
					async project => {
						try {
							const { data: profileData } = await supabase
								.from('profiles')
								.select('name')
								.eq('auth_id', project.owner_id)
								.maybeSingle()

							const typedProfileData = profileData as {
								name: string | null
							} | null

							return {
								...project,
								profiles: {
									full_name: typedProfileData?.name || null,
								},
							} as Project
						} catch {
							return {
								...project,
								profiles: {
									full_name: null,
								},
							} as Project
						}
					},
				),
			)
			setProjects(projectsWithOwners)
		}
		setLoading(false)
	}

	const checkUserStatusForAllProjects = async () => {
		if (!user) return

		const statuses: Record<string, UserProjectStatus> = {}

		for (const project of projects) {
			if (user.id === project.owner_id) {
				statuses[project.id] = 'owner'
			} else if (project.current_members?.includes(currentUserName)) {
				statuses[project.id] = 'in_team'
			} else {
				// Check if has application
				const { data: appData } = await supabase
					.from('project_applications')
					.select('*')
					.eq('project_id', project.id)
					.eq('user_id', user.id)
					.eq('status', 'pending')
					.maybeSingle()

				statuses[project.id] = appData ? 'has_application' : 'can_apply'
			}
		}

		setUserProjectStatuses(statuses)
	}

	const getUserProjectStatus = (project: Project): UserProjectStatus => {
		return userProjectStatuses[project.id] || 'can_apply'
	}

	const applyFilters = () => {
		let filtered = projects

		if (filterMode === 'my' && user) {
			filtered = filtered.filter(
				p =>
					p.owner_id === user.id ||
					p.current_members?.includes(currentUserName),
			)
		}

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

	const handleApply = async (projectId: string) => {
		if (!user) return

		const project = projects.find(p => p.id === projectId)
		if (!project) return

		const userFullName = user.user_metadata?.full_name || ''

		// Check if already in team
		if (project.current_members?.includes(userFullName)) {
			alert('Вы уже в этой команде')
			return
		}

		// Check if already has application
		const { data: existingApp } = await supabase
			.from('project_applications')
			.select('*')
			.eq('project_id', projectId)
			.eq('user_id', user.id)
			.eq('status', 'pending')
			.maybeSingle()

		if (existingApp) {
			alert('Вы уже подали заявку на этот проект')
			return
		}

		try {
			const insertData: ProjectApplicationInsertData = {
				project_id: projectId,
				user_id: user.id,
				status: 'pending',
				created_at: new Date().toISOString(),
			}

			const { error } = await (supabase as any)
				.from('project_applications')
				.insert([insertData])

			if (error) {
				console.error('Error applying to project:', error)
				alert('Ошибка при подаче заявки')
			} else {
				alert('Заявка успешно подана!')
				checkUserStatusForAllProjects()
			}
		} catch (error) {
			console.error('Error:', error)
		}
	}

	const handleCreateProject = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!user) {
			alert('Требуется авторизация')
			return
		}

		if (!createFormData.title.trim()) {
			alert('Укажите название проекта')
			return
		}

		setIsSubmitting(true)

		try {
			const rolesArray = createFormData.roles
				.split(',')
				.map(role => role.trim())
				.filter(role => role.length > 0)

			// Get user name from profiles
			const { data: profile } = await supabase
				.from('profiles')
				.select('name')
				.eq('auth_id', user.id)
				.single()
			const typedProfile = profile as { name: string | null } | null
			const userFullName =
				typedProfile?.name || user.user_metadata?.full_name || 'Участник'
			const currentMembers = [userFullName]

			const insertData: ProjectInsertData = {
				title: createFormData.title,
				description: createFormData.description || null,
				owner_id: user.id,
				required_roles: rolesArray,
				current_members: currentMembers,
				image_url: createFormData.image_url || null,
				created_at: new Date().toISOString(),
			}

			const { error } = await (supabase as any)
				.from('projects')
				.insert([insertData])

			if (error) {
				console.error('Error creating project:', error)
				alert('Ошибка при создании проекта')
			} else {
				alert('Проект успешно создан!')
				setCreateFormData({
					title: '',
					description: '',
					roles: '',
					image_url: '',
				})
				setIsCreateModalOpen(false)
				fetchProjects()
			}
		} catch (error) {
			console.error('Error:', error)
			alert('Ошибка при создании проекта')
		} finally {
			setIsSubmitting(false)
		}
	}

	const openAdminModal = async (project: Project) => {
		setSelectedProject(project)
		setAdminEditForm({
			description: project.description || '',
			roles: project.required_roles?.join(', ') || '',
			image_url: project.image_url || '',
		})

		try {
			const { data, error } = await supabase
				.from('project_applications')
				.select('*')
				.eq('project_id', project.id)
				.eq('status', 'pending')

			if (error) {
				console.error('Error fetching applications:', error)
			} else {
				const apps = (data || []) as ProjectApplication[]

				// Fetch profile data for applicants
				const appsWithProfiles: ApplicationWithProfile[] = []
				for (const app of apps) {
					try {
						const { data: profileData } = await supabase
							.from('profiles')
							.select('name, faculty')
							.eq('auth_id', app.user_id)
							.maybeSingle()

						const typedProfileData = profileData as ProfileRow | null

						appsWithProfiles.push({
							...app,
							applicantName: typedProfileData?.name || 'Участник',
							applicantFaculty: typedProfileData?.faculty || 'Не указано',
						})
					} catch {
						appsWithProfiles.push({
							...app,
							applicantName: 'Участник',
							applicantFaculty: 'Не указано',
						})
					}
				}
				setApplications(appsWithProfiles)
			}
		} catch (error) {
			console.error('Error:', error)
		}

		setIsAdminModalOpen(true)
	}

	const openViewModal = (project: Project) => {
		setSelectedProject(project)
		setIsViewModalOpen(true)
	}

	const handleAcceptApplication = async (
		application: ApplicationWithProfile,
	) => {
		if (!selectedProject || !user) return

		try {
			const applicantName = application.applicantName || 'Участник'

			// Check for duplicates before adding
			const currentMembers = selectedProject.current_members || []
			if (currentMembers.includes(applicantName)) {
				alert('Этот пользователь уже в команде')
				return
			}

			const updatedMembers = [...currentMembers, applicantName]

			// Update project with new member
			const projectUpdateData: ProjectUpdateData = {
				current_members: updatedMembers,
			}
			const { error: updateError } = await (supabase as any)
				.from('projects')
				.update(projectUpdateData)
				.eq('id', selectedProject.id)

			if (updateError) throw updateError

			// Update application status to accepted
			const applicationUpdateData: ProjectApplicationUpdateData = {
				status: 'accepted',
			}
			const { error: statusError } = await (supabase as any)
				.from('project_applications')
				.update(applicationUpdateData)
				.eq('id', application.id)

			if (statusError) throw statusError

			alert('Заявка принята!')
			setApplications(applications.filter(app => app.id !== application.id))

			// Update selected project
			setSelectedProject({
				...selectedProject,
				current_members: updatedMembers,
			})

			// Refresh projects and statuses
			fetchProjects()
			checkUserStatusForAllProjects()
		} catch (error) {
			console.error('Error accepting application:', error)
			alert('Ошибка при принятии заявки')
		}
	}

	const handleRejectApplication = async (
		application: ApplicationWithProfile,
	) => {
		if (!selectedProject) return

		try {
			// Update application status to rejected
			const applicationUpdateData: ProjectApplicationUpdateData = {
				status: 'rejected',
			}
			const { error } = await (supabase as any)
				.from('project_applications')
				.update(applicationUpdateData)
				.eq('id', application.id)

			if (error) throw error

			alert('Заявка отклонена!')
			setApplications(applications.filter(app => app.id !== application.id))
		} catch (error) {
			console.error('Error rejecting application:', error)
			alert('Ошибка при отклонении заявки')
		}
	}

	const handleDeleteProject = async () => {
		if (!selectedProject || !user) return

		if (!confirm('Вы уверены? Это действие нельзя отменить.')) return

		try {
			const { error } = await supabase
				.from('projects')
				.delete()
				.eq('id', selectedProject.id)

			if (error) throw error

			alert('Проект удален!')
			setIsAdminModalOpen(false)
			setSelectedProject(null)
			fetchProjects()
		} catch (error) {
			console.error('Error deleting project:', error)
			alert('Ошибка при удалении проекта')
		}
	}

	const handleUpdateProject = async () => {
		if (!selectedProject || !user) return

		try {
			const rolesArray = adminEditForm.roles
				.split(',')
				.map(role => role.trim())
				.filter(role => role.length > 0)

			const projectUpdateData: ProjectUpdateData = {
				description: adminEditForm.description || null,
				required_roles: rolesArray,
				image_url: adminEditForm.image_url || null,
			}

			const { error } = await (supabase as any)
				.from('projects')
				.update(projectUpdateData)
				.eq('id', selectedProject.id)

			if (error) throw error

			alert('Проект обновлен!')
			setSelectedProject({
				...selectedProject,
				description: adminEditForm.description,
				required_roles: rolesArray,
				image_url: adminEditForm.image_url,
			})
			fetchProjects()
		} catch (error) {
			console.error('Error updating project:', error)
			alert('Ошибка при обновлении проекта')
		}
	}

	const handleAdminFormChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target
		setAdminEditForm(prev => ({
			...prev,
			[name]: value,
		}))
	}

	const handleCreateFormChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		setCreateFormData(prev => ({
			...prev,
			[e.target.name]: e.target.value,
		}))
	}

	const renderProjectButton = (project: Project) => {
		if (!user) {
			return (
				<button
					onClick={() => handleApply(project.id)}
					className='flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2'
				>
					<UserPlus className='w-4 h-4' />
					Подать заявку
				</button>
			)
		}

		const status = getUserProjectStatus(project)

		if (status === 'owner') {
			return (
				<button
					onClick={() => openAdminModal(project)}
					className='flex-1 bg-gray-600 text-white py-2 rounded-lg font-bold hover:bg-gray-700 transition flex items-center justify-center gap-2'
				>
					<Settings className='w-4 h-4' />
					Управление
				</button>
			)
		}

		if (status === 'in_team') {
			return (
				<button
					disabled
					className='flex-1 bg-green-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 opacity-75 cursor-not-allowed'
				>
					<CheckCircle className='w-4 h-4' />
					Вы в команде
				</button>
			)
		}

		if (status === 'has_application') {
			return (
				<button
					disabled
					className='flex-1 bg-yellow-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 opacity-75 cursor-not-allowed'
				>
					<Clock className='w-4 h-4' />
					Заявка на рассмотрении
				</button>
			)
		}

		return (
			<button
				onClick={() => handleApply(project.id)}
				className='flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2'
			>
				<UserPlus className='w-4 h-4' />
				Подать заявку
			</button>
		)
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
					{user && (
						<div className='flex gap-2'>
							<div className='flex rounded-lg border border-gray-300'>
								<button
									onClick={() => setFilterMode('all')}
									className={`px-4 py-2 rounded-l-lg font-medium transition ${
										filterMode === 'all'
											? 'bg-blue-600 text-white'
											: 'bg-white text-gray-700 hover:bg-gray-50'
									}`}
								>
									Все проекты
								</button>
								<button
									onClick={() => setFilterMode('my')}
									className={`px-4 py-2 rounded-r-lg font-medium transition ${
										filterMode === 'my'
											? 'bg-blue-600 text-white'
											: 'bg-white text-gray-700 hover:bg-gray-50'
									}`}
								>
									Мои проекты
								</button>
							</div>
							<button
								onClick={() => setIsCreateModalOpen(true)}
								className='bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2'
							>
								<Plus className='w-5 h-5' />
								Создать проект
							</button>
						</div>
					)}
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
							className='bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 cursor-pointer'
							onClick={() => openViewModal(project)}
						>
							{project.image_url ? (
								<img
									src={project.image_url}
									alt={project.title}
									className='w-full h-40 object-cover rounded-lg mb-4'
								/>
							) : (
								<div className='w-full h-40 bg-gray-200 rounded-lg mb-4 flex items-center justify-center'>
									<span className='text-gray-500'>Нет изображения</span>
								</div>
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
										<p className='text-sm font-bold text-gray-800'>
											{project.profiles?.full_name || 'Неизвестен'}
										</p>
									</div>
									<div className='flex items-center space-x-1 text-gray-600'>
										<Users className='w-4 h-4' />
										<span className='text-sm font-bold'>
											{project.current_members?.length || 0} участников
										</span>
									</div>
								</div>
							</div>

							<div className='flex gap-3' onClick={e => e.stopPropagation()}>
								{renderProjectButton(project)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Create Project Modal */}
			{isCreateModalOpen && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto'>
						<div className='flex items-center justify-between p-6 border-b sticky top-0 bg-white'>
							<h2 className='text-2xl font-bold text-gray-800'>
								Создать проект
							</h2>
							<button
								onClick={() => setIsCreateModalOpen(false)}
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
									value={createFormData.title}
									onChange={handleCreateFormChange}
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
									value={createFormData.description}
									onChange={handleCreateFormChange}
									placeholder='Опишите ваш проект'
									rows={4}
									className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Ссылка на обложку
								</label>
								<input
									type='url'
									name='image_url'
									value={createFormData.image_url}
									onChange={handleCreateFormChange}
									placeholder='https://example.com/image.jpg'
									className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
								/>
								<p className='text-xs text-gray-500 mt-1'>
									Оставьте пустым для стандартной заглушки
								</p>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Необходимые роли
								</label>
								<input
									type='text'
									name='roles'
									value={createFormData.roles}
									onChange={handleCreateFormChange}
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
									onClick={() => setIsCreateModalOpen(false)}
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

			{/* Admin Management Modal */}
			{isAdminModalOpen && selectedProject && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
						<div className='flex items-center justify-between p-6 border-b sticky top-0 bg-white'>
							<h2 className='text-2xl font-bold text-gray-800'>
								Управление проектом
							</h2>
							<button
								onClick={() => setIsAdminModalOpen(false)}
								className='text-gray-500 hover:text-gray-700 transition'
							>
								<X className='w-6 h-6' />
							</button>
						</div>

						<div className='p-6 space-y-6'>
							{/* Edit Project Info */}
							<div>
								<h3 className='text-lg font-bold text-gray-800 mb-4'>
									Редактирование проекта
								</h3>
								<div className='space-y-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Описание
										</label>
										<textarea
											name='description'
											value={adminEditForm.description}
											onChange={handleAdminFormChange}
											placeholder='Описание проекта'
											rows={3}
											className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Ссылка на обложку
										</label>
										<input
											type='url'
											name='image_url'
											value={adminEditForm.image_url}
											onChange={handleAdminFormChange}
											placeholder='https://example.com/image.jpg'
											className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
										/>
										<p className='text-xs text-gray-500 mt-1'>
											Оставьте пустым для стандартной заглушки
										</p>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Необходимые роли
										</label>
										<input
											type='text'
											name='roles'
											value={adminEditForm.roles}
											onChange={handleAdminFormChange}
											placeholder='Frontend, Backend, Design'
											className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
										/>
									</div>

									<button
										onClick={handleUpdateProject}
										className='w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition'
									>
										Сохранить изменения
									</button>
								</div>
							</div>

							{/* Applications */}
							<div className='border-t pt-6'>
								<h3 className='text-lg font-bold text-gray-800 mb-4'>
									Заявки ({applications.length})
								</h3>
								{applications.length === 0 ? (
									<p className='text-gray-600'>Нет новых заявок</p>
								) : (
									<div className='space-y-3'>
										{applications.map(app => (
											<div
												key={app.id}
												className='flex items-center justify-between bg-gray-50 p-4 rounded-lg'
											>
												<div>
													<p className='font-medium text-gray-800'>
														{app.applicantName}
													</p>
													<p className='text-sm text-gray-600'>
														{app.applicantFaculty}
													</p>
													<p className='text-xs text-gray-500 mt-1'>
														Статус: {app.status}
													</p>
												</div>
												<div className='flex gap-2'>
													<button
														onClick={() => handleAcceptApplication(app)}
														className='bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-green-700 transition flex items-center gap-1'
													>
														<CheckCircle className='w-4 h-4' />
														Принять
													</button>
													<button
														onClick={() => handleRejectApplication(app)}
														className='bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-red-700 transition flex items-center gap-1'
													>
														<XCircle className='w-4 h-4' />
														Отклонить
													</button>
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Delete Project */}
							<div className='border-t pt-6'>
								<button
									onClick={handleDeleteProject}
									className='w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition flex items-center justify-center gap-2'
								>
									<Trash2 className='w-4 h-4' />
									Удалить проект
								</button>
							</div>

							<div className='flex gap-3 pt-4'>
								<button
									onClick={() => setIsAdminModalOpen(false)}
									className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition'
								>
									Закрыть
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* View Project Modal */}
			{isViewModalOpen && selectedProject && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
						<div className='flex items-center justify-between p-6 border-b sticky top-0 bg-white'>
							<h2 className='text-2xl font-bold text-gray-800'>
								{selectedProject.title}
							</h2>
							<button
								onClick={() => setIsViewModalOpen(false)}
								className='text-gray-500 hover:text-gray-700 transition'
							>
								<X className='w-6 h-6' />
							</button>
						</div>

						<div className='p-6 space-y-6'>
							{/* Project Image */}
							{selectedProject.image_url ? (
								<img
									src={selectedProject.image_url}
									alt={selectedProject.title}
									className='w-full h-64 object-cover rounded-lg'
								/>
							) : (
								<div className='w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center'>
									<span className='text-gray-500'>Нет изображения</span>
								</div>
							)}

							{/* Project Description */}
							<div>
								<h3 className='text-lg font-bold text-gray-800 mb-2'>
									Описание
								</h3>
								<p className='text-gray-600'>
									{selectedProject.description || 'Описание не указано'}
								</p>
							</div>

							{/* Project Owner */}
							<div>
								<h3 className='text-lg font-bold text-gray-800 mb-2'>
									Создатель проекта
								</h3>
								<p className='text-gray-600'>
									{selectedProject.profiles?.full_name || 'Неизвестен'}
								</p>
							</div>

							{/* Required Roles */}
							{selectedProject.required_roles &&
								selectedProject.required_roles.length > 0 && (
									<div>
										<h3 className='text-lg font-bold text-gray-800 mb-2'>
											Необходимые роли
										</h3>
										<div className='flex flex-wrap gap-2'>
											{selectedProject.required_roles.map((role, idx) => (
												<span
													key={idx}
													className='px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium'
												>
													{role}
												</span>
											))}
										</div>
									</div>
								)}

							{/* Current Members */}
							<div>
								<h3 className='text-lg font-bold text-gray-800 mb-2'>
									Участники ({selectedProject.current_members?.length || 0})
								</h3>
								{selectedProject.current_members &&
								selectedProject.current_members.length > 0 ? (
									<div className='flex flex-wrap gap-2'>
										{selectedProject.current_members.map((member, idx) => (
											<span
												key={idx}
												className='px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium'
											>
												{member}
											</span>
										))}
									</div>
								) : (
									<p className='text-gray-600'>Пока нет участников</p>
								)}
							</div>

							{/* Action Button */}
							<div className='border-t pt-6'>
								<div className='flex gap-3'>
									{renderProjectButton(selectedProject)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
