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

type ProjectRole = {
	faculty: string
	specialization: string
	count: number
}

type StoredProjectRole = {
	faculty: string
	specialization: string
	filled: 0 | 1
	count: number
}

const serializeStoredRole = (role: StoredProjectRole) => JSON.stringify(role)

const parseStoredRole = (
	raw: string,
): {
	key: string
	label: string
	faculty: string | null
	specialization: string | null
	filled: 0 | 1
	count: number
} => {
	// New format: JSON string with { faculty, specialization, filled }
	if (raw.trim().startsWith('{')) {
		try {
			const parsed = JSON.parse(raw) as Partial<StoredProjectRole>
			if (
				typeof parsed?.faculty === 'string' &&
				typeof parsed?.specialization === 'string'
			) {
				const filled = parsed.filled === 1 ? 1 : 0
				const count = parsed.count || 1
				const label = `${parsed.faculty} — ${parsed.specialization}${count > 1 ? ` (${count})` : ''}`
				return {
					key: label,
					label,
					faculty: parsed.faculty,
					specialization: parsed.specialization,
					filled,
					count,
				}
			}
		} catch {
			// fall through to legacy parsing
		}
	}

	// Legacy format: "Faculty — Specialization" or any free-form string
	const parts = raw.split('—').map(p => p.trim())
	if (parts.length >= 2) {
		const faculty = parts[0]
		const specialization = parts.slice(1).join(' — ')
		const label = `${faculty} — ${specialization}`
		return { key: label, label, faculty, specialization, filled: 0, count: 1 }
	}
	return {
		key: raw,
		label: raw,
		faculty: null,
		specialization: null,
		filled: 0,
		count: 1,
	}
}

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
	roles: ProjectRole[]
	image_url: string
}

interface AdminEditForm {
	description: string
	image_url: string
	roles: StoredProjectRole[]
}

interface ApplicationWithProfile extends ProjectApplication {
	applicantName?: string
	applicantFaculty?: string
}

interface RoleApplicationCount {
	[roleName: string]: number
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
		image_url: '',
		roles: [],
	})
	const [createFormData, setCreateFormData] = useState<CreateProjectForm>({
		title: '',
		description: '',
		roles: [],
		image_url: '',
	})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [userProjectStatuses, setUserProjectStatuses] = useState<
		Record<string, UserProjectStatus>
	>({})
	const [currentUserName, setCurrentUserName] = useState<string>('')
	const [roleApplicationCounts, setRoleApplicationCounts] = useState<
		Record<string, RoleApplicationCount>
	>({})

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
			projects.forEach(project => {
				fetchRoleApplicationCounts(project.id)
			})
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

	const fetchRoleApplicationCounts = async (projectId: string) => {
		try {
			const { data, error } = await supabase
				.from('project_applications')
				.select('role_applied_for, status')
				.eq('project_id', projectId)
				.eq('status', 'pending')

			if (error) {
				console.error('Error fetching applications:', error)
				return {}
			}

			const counts: RoleApplicationCount = {}
			if (data) {
				const typedData = data as Array<{
					role_applied_for: string | null
					status: string
				}>
				typedData.forEach(app => {
					const role = app.role_applied_for || 'общая заявка'
					counts[role] = (counts[role] || 0) + 1
				})
			}

			setRoleApplicationCounts(prev => ({
				...prev,
				[projectId]: counts,
			}))

			return counts
		} catch (error) {
			console.error('Error:', error)
			return {}
		}
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

	const handleApply = async (projectId: string, roleAppliedFor?: string) => {
		if (!user) {
			alert('Требуется авторизация')
			return
		}

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

			const insertDataWithRole = {
				...insertData,
				role_applied_for: roleAppliedFor?.trim() ? roleAppliedFor.trim() : null,
			}

			const { error } = await (supabase as any)
				.from('project_applications')
				.insert([insertDataWithRole])

			if (error) {
				console.error('Error applying to project:', error)
				alert('Ошибка при подаче заявки')
			} else {
				alert('Заявка успешно подана!')
				checkUserStatusForAllProjects()
				fetchRoleApplicationCounts(projectId)
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

		const title = createFormData.title.trim()
		const description = createFormData.description.trim()

		if (!title) {
			alert('Укажите название проекта')
			return
		}

		if (title.length > 80) {
			alert('Название слишком длинное (макс. 80 символов)')
			return
		}

		if (description.length > 2000) {
			alert('Описание слишком длинное (макс. 2000 символов)')
			return
		}

		if (createFormData.roles.length === 0) {
			alert('Добавьте хотя бы одну роль')
			return
		}

		const hasIncompleteRole = createFormData.roles.some(
			r => !r.faculty.trim() || !r.specialization.trim(),
		)
		if (hasIncompleteRole) {
			alert('Заполните факультет и специализацию у каждой роли')
			return
		}

		setIsSubmitting(true)

		try {
			// Store roles as JSON strings with filled counter 0/1
			const rolesArray = createFormData.roles.map(role =>
				serializeStoredRole({
					faculty: role.faculty,
					specialization: role.specialization,
					filled: 0,
					count: role.count || 1,
				}),
			)

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
				title,
				description: description || null,
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
					roles: [],
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

		// Parse roles from project
		const parsedRoles: StoredProjectRole[] = (project.required_roles || []).map(
			raw => {
				const parsed = parseStoredRole(raw)
				return {
					faculty: parsed.faculty || '',
					specialization: parsed.specialization || '',
					filled: parsed.filled || 0,
					count: parsed.count || 1,
				}
			},
		)

		setAdminEditForm({
			description: project.description || '',
			image_url: project.image_url || '',
			roles: parsedRoles,
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
		fetchRoleApplicationCounts(project.id)
	}

	const handleAcceptApplication = async (
		application: ApplicationWithProfile,
	) => {
		if (!selectedProject || !user) return

		try {
			if (user.id !== selectedProject.owner_id) {
				alert('Недостаточно прав для управления этим проектом')
				return
			}

			const applicantName = application.applicantName || 'Участник'

			// Check for duplicates before adding
			const currentMembers = selectedProject.current_members || []
			if (currentMembers.includes(applicantName)) {
				alert('Этот пользователь уже в команде')
				return
			}

			const updatedMembers = [...currentMembers, applicantName]

			// Mark role as filled (0/1) if application targeted a specific role
			const roleKey = application.role_applied_for
			let updatedRequiredRoles = selectedProject.required_roles || []
			if (roleKey) {
				const roleEntry = updatedRequiredRoles.find(
					r => parseStoredRole(r).key === roleKey,
				)
				if (roleEntry) {
					const parsed = parseStoredRole(roleEntry)
					if (parsed.filled === 1) {
						alert('Эта позиция уже закрыта')
						return
					}
					updatedRequiredRoles = updatedRequiredRoles.map(r =>
						parseStoredRole(r).key === roleKey
							? serializeStoredRole({
									faculty: parsed.faculty || '',
									specialization: parsed.specialization || '',
									count: 1, // Добавляем обязательное поле (количество нужных людей)
									filled: 1, // Оставляем заполненность
								})
							: r,
					)
				}
			}

			// Update project with new member (and filled role if applicable)
			const projectUpdateData: ProjectUpdateData = {
				current_members: updatedMembers,
				required_roles: updatedRequiredRoles,
			}
			const { error: updateError } = await (supabase as any)
				.from('projects')
				.update(projectUpdateData)
				.eq('id', selectedProject.id)
				.eq('owner_id', user.id)

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
				required_roles: updatedRequiredRoles,
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
			if (!user || user.id !== selectedProject.owner_id) {
				alert('Недостаточно прав для управления этим проектом')
				return
			}

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

		if (user.id !== selectedProject.owner_id) {
			alert('Недостаточно прав для удаления этого проекта')
			return
		}

		if (!confirm('Вы уверены? Это действие нельзя отменить.')) return

		try {
			const { error } = await supabase
				.from('projects')
				.delete()
				.eq('id', selectedProject.id)
				.eq('owner_id', user.id)

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
			if (user.id !== selectedProject.owner_id) {
				alert('Недостаточно прав для редактирования этого проекта')
				return
			}

			const projectUpdateData: ProjectUpdateData = {
				description: adminEditForm.description || null,
				image_url: adminEditForm.image_url || null,
			}

			const { error } = await (supabase as any)
				.from('projects')
				.update(projectUpdateData)
				.eq('id', selectedProject.id)
				.eq('owner_id', user.id)

			if (error) throw error

			alert('Проект обновлен!')
			setSelectedProject({
				...selectedProject,
				description: adminEditForm.description,
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

	const addRole = () => {
		setCreateFormData(prev => ({
			...prev,
			roles: [...prev.roles, { faculty: '', specialization: '', count: 1 }],
		}))
	}

	const removeRole = (index: number) => {
		setCreateFormData(prev => ({
			...prev,
			roles: prev.roles.filter((_, i) => i !== index),
		}))
	}

	const updateRole = (
		index: number,
		field: 'faculty' | 'specialization',
		value: string,
	) => {
		setCreateFormData(prev => ({
			...prev,
			roles: prev.roles.map((role, i) =>
				i === index
					? field === 'faculty'
						? { ...role, faculty: value, specialization: '' }
						: { ...role, specialization: value }
					: role,
			),
		}))
	}

	const updateRoleCount = (index: number, value: number) => {
		setCreateFormData(prev => ({
			...prev,
			roles: prev.roles.map((role, i) =>
				i === index ? { ...role, count: Math.max(1, value) } : role,
			),
		}))
	}

	// Admin modal role management
	const addAdminRole = () => {
		setAdminEditForm(prev => ({
			...prev,
			roles: [
				...prev.roles,
				{ faculty: '', specialization: '', filled: 0, count: 1 },
			],
		}))
	}

	const removeAdminRole = (index: number) => {
		setAdminEditForm(prev => ({
			...prev,
			roles: prev.roles.filter((_, i) => i !== index),
		}))
	}

	const updateAdminRole = (
		index: number,
		field: 'faculty' | 'specialization',
		value: string,
	) => {
		setAdminEditForm(prev => ({
			...prev,
			roles: prev.roles.map((role, i) =>
				i === index
					? field === 'faculty'
						? { ...role, faculty: value, specialization: '' }
						: { ...role, specialization: value }
					: role,
			),
		}))
	}

	const updateAdminRoleCount = (index: number, value: number) => {
		setAdminEditForm(prev => ({
			...prev,
			roles: prev.roles.map((role, i) =>
				i === index ? { ...role, count: Math.max(1, value) } : role,
			),
		}))
	}

	const renderProjectButton = (project: Project) => {
		if (!user) {
			return (
				<button
					onClick={() => handleApply(project.id)}
					className='flex-1 bg-[var(--accent)] text-white py-2 rounded-2xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2'
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
					className='flex-1 bg-black/60 dark:bg-white/15 text-white py-2 rounded-2xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2 border border-white/10'
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
				className='flex-1 bg-[var(--accent)] text-white py-2 rounded-2xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2'
			>
				<UserPlus className='w-4 h-4' />
				Подать заявку
			</button>
		)
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-xl text-[var(--muted)]'>Загрузка проектов...</div>
			</div>
		)
	}

	return (
		<div className='max-w-7xl mx-auto px-4 py-8'>
			<h1 className='text-4xl font-bold text-[var(--text)] mb-8'>Проекты</h1>

			<div className='card p-6 mb-8'>
				<div className='flex items-end justify-between gap-4 mb-4'>
					<div className='flex-1'>
						<label className='block text-sm font-medium text-[var(--muted)] mb-2'>
							Поиск проектов
						</label>
						<div className='relative'>
							<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-5 h-5' />
							<input
								type='text'
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								placeholder='Поиск по названию или описанию...'
								className='w-full pl-10 pr-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
							/>
						</div>
					</div>
					{user && (
						<div className='flex gap-2'>
							<div className='flex rounded-2xl border border-[var(--border)] overflow-hidden'>
								<button
									onClick={() => setFilterMode('all')}
									className={`px-4 py-2 rounded-l-lg font-medium transition ${
										filterMode === 'all'
											? 'bg-[var(--accent)] text-white'
											: 'bg-[var(--card)] text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10'
									}`}
								>
									Все проекты
								</button>
								<button
									onClick={() => setFilterMode('my')}
									className={`px-4 py-2 rounded-r-lg font-medium transition ${
										filterMode === 'my'
											? 'bg-[var(--accent)] text-white'
											: 'bg-[var(--card)] text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10'
									}`}
								>
									Мои проекты
								</button>
							</div>
							<button
								onClick={() => setIsCreateModalOpen(true)}
								className='bg-[var(--accent)] text-white px-4 py-2 rounded-xl font-bold hover:opacity-90 transition flex items-center gap-2'
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
					<p className='text-[var(--muted)] text-lg'>Проектов не найдено</p>
				</div>
			) : (
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{filteredProjects.map(project => (
						<div
							key={project.id}
							className='card card-hover p-6 cursor-pointer'
							onClick={() => openViewModal(project)}
						>
							{project.image_url ? (
								<img
									src={project.image_url}
									alt={project.title}
									className='w-full h-40 object-cover rounded-lg mb-4'
								/>
							) : (
								<div className='w-full h-40 bg-black/5 dark:bg-white/10 rounded-2xl mb-4 flex items-center justify-center border border-[var(--border)]'>
									<span className='text-[var(--muted)]'>Нет изображения</span>
								</div>
							)}

							<h2 className='text-xl font-bold text-[var(--text)] mb-2'>
								{project.title}
							</h2>

							<p className='text-[var(--muted)] text-sm mb-4'>
								{project.description}
							</p>

							{project.required_roles && project.required_roles.length > 0 && (
								<div className='mb-4'>
									<p className='text-sm font-bold text-[var(--text)] mb-2'>
										Необходимые роли:
									</p>
									<div className='flex flex-wrap gap-3'>
										{project.required_roles.map((rawRole, idx) => {
											const role = parseStoredRole(rawRole)
											const applicationsForRole =
												roleApplicationCounts[project.id]?.[role.key] || 0

											return (
												<div key={idx} className='badge'>
													<span>{role.label}</span>
													<span className='badge__dot'>{role.filled}/1</span>
													{role.filled === 1 ? (
														<span className='ml-1 text-orange-600 font-bold text-xs'>
															Позиция закрыта
														</span>
													) : (
														applicationsForRole > 0 && (
															<span className='ml-1 text-orange-500 font-bold'>
																Заявок: {applicationsForRole}
															</span>
														)
													)}
												</div>
											)
										})}
									</div>
								</div>
							)}

							<div className='border-t border-[var(--border)] pt-4 mb-4'>
								<div className='flex items-center justify-between mb-3'>
									<div>
										<p className='text-xs text-[var(--muted)]'>
											Владелец проекта
										</p>
										<p className='text-sm font-bold text-[var(--text)]'>
											{project.profiles?.full_name || 'Неизвестен'}
										</p>
									</div>
									<div className='flex items-center space-x-1 text-[var(--muted)]'>
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
					<div className='card max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
						<div className='flex items-center justify-between p-6 border-b border-[var(--border)] sticky top-0 bg-[var(--card)]'>
							<h2 className='text-2xl font-bold text-[var(--text)]'>
								Создать проект
							</h2>
							<button
								onClick={() => setIsCreateModalOpen(false)}
								className='text-[var(--muted)] hover:text-[var(--text)] transition'
							>
								<X className='w-6 h-6' />
							</button>
						</div>

						<form onSubmit={handleCreateProject} className='p-6 space-y-4'>
							<div>
								<label className='block text-sm font-medium text-[var(--muted)] mb-2'>
									Название проекта
								</label>
								<input
									type='text'
									name='title'
									value={createFormData.title}
									onChange={handleCreateFormChange}
									placeholder='Введите название'
									className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
									required
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-[var(--muted)] mb-2'>
									Описание
								</label>
								<textarea
									name='description'
									value={createFormData.description}
									onChange={handleCreateFormChange}
									placeholder='Опишите ваш проект'
									rows={4}
									className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-[var(--muted)] mb-2'>
									Ссылка на обложку
								</label>
								<input
									type='url'
									name='image_url'
									value={createFormData.image_url}
									onChange={handleCreateFormChange}
									placeholder='https://example.com/image.jpg'
									className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
								/>
								<p className='text-xs text-gray-500 mt-1'>
									Оставьте пустым для стандартной заглушки
								</p>
							</div>

							<div>
								<label className='block text-sm font-medium text-[var(--muted)] mb-2'>
									Необходимые роли
								</label>
								<div className='space-y-3 mb-3'>
									{createFormData.roles.map((role, idx) => (
										<div key={idx} className='flex gap-2 items-start'>
											<select
												value={role.faculty}
												onChange={e =>
													updateRole(idx, 'faculty', e.target.value)
												}
												required
												className='min-w-[180px] flex-1 px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
											>
												<option value=''>Факультет</option>
												{FACULTIES.map(faculty => (
													<option key={faculty} value={faculty}>
														{faculty}
													</option>
												))}
											</select>

											<select
												value={role.specialization}
												onChange={e =>
													updateRole(idx, 'specialization', e.target.value)
												}
												required
												disabled={!role.faculty}
												className='min-w-[180px] flex-1 px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-black/5 disabled:text-[var(--muted)] dark:disabled:bg-white/5'
											>
												<option value=''>Специализация</option>
												{role.faculty &&
													SPECIALIZATIONS[role.faculty]?.map(spec => (
														<option key={spec} value={spec}>
															{spec}
														</option>
													))}
											</select>

											<input
												type='number'
												min={1}
												value={role.count || 1}
												onChange={e =>
													updateRoleCount(idx, parseInt(e.target.value) || 1)
												}
												className='w-20 px-2 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center'
											/>

											<button
												type='button'
												onClick={() => removeRole(idx)}
												className='px-3 py-2 bg-red-500/90 text-white rounded-2xl hover:bg-red-500 transition border border-red-500/30'
											>
												<Trash2 className='w-4 h-4' />
											</button>
										</div>
									))}
								</div>

								<button
									type='button'
									onClick={addRole}
									className='w-full px-4 py-2 border-2 border-dashed border-blue-400 text-[var(--accent)] rounded-2xl font-medium hover:bg-[var(--accent-2)] transition flex items-center justify-center gap-2'
								>
									<Plus className='w-4 h-4' />
									Добавить роль
								</button>
							</div>

							<div className='flex gap-3 pt-4'>
								<button
									type='button'
									onClick={() => setIsCreateModalOpen(false)}
									className='flex-1 px-4 py-2 border border-[var(--border)] text-[var(--text)] rounded-2xl font-bold hover:bg-black/5 dark:hover:bg-white/10 transition'
									disabled={isSubmitting}
								>
									Отмена
								</button>
								<button
									type='submit'
									className='flex-1 px-4 py-2 bg-[var(--accent)] text-white rounded-2xl font-bold hover:opacity-90 transition disabled:opacity-60'
									disabled={isSubmitting}
								>
									{isSubmitting ? 'Создание...' : 'Создать'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Admin Modal */}
			{isAdminModalOpen && selectedProject && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
					<div className='card max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
						<div className='flex items-center justify-between p-6 border-b border-[var(--border)] sticky top-0 bg-[var(--card)]'>
							<h2 className='text-2xl font-bold text-[var(--text)]'>
								Управление проектом
							</h2>
							<button
								onClick={() => setIsAdminModalOpen(false)}
								className='text-[var(--muted)] hover:text-[var(--text)] transition'
							>
								<X className='w-6 h-6' />
							</button>
						</div>

						<div className='p-6 space-y-6'>
							<div>
								<label className='block text-sm font-medium text-[var(--muted)] mb-2'>
									Описание
								</label>
								<textarea
									name='description'
									value={adminEditForm.description}
									onChange={handleAdminFormChange}
									rows={4}
									className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-[var(--muted)] mb-2'>
									Ссылка на обложку
								</label>
								<input
									type='url'
									name='image_url'
									value={adminEditForm.image_url}
									onChange={handleAdminFormChange}
									placeholder='https://example.com/image.jpg'
									className='w-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
								/>
							</div>

							<button
								onClick={handleUpdateProject}
								className='w-full bg-[var(--accent)] text-white py-2 rounded-2xl font-bold hover:opacity-90 transition'
							>
								Сохранить изменения
							</button>

							{/* Applications */}
							<div className='border-t pt-6'>
								<h3 className='text-lg font-bold text-[var(--text)] mb-4'>
									Заявки ({applications.length})
								</h3>
								{applications.length === 0 ? (
									<p className='text-[var(--muted)]'>Нет новых заявок</p>
								) : (
									<div className='space-y-3'>
										{applications.map(app => (
											<div
												key={app.id}
												className='flex items-center justify-between border border-[var(--border)] bg-black/5 dark:bg-white/5 p-4 rounded-2xl'
											>
												<div>
													<p className='font-medium text-[var(--text)]'>
														{app.applicantName}
													</p>
													<p className='text-sm text-[var(--muted)]'>
														{app.applicantFaculty}
													</p>
													<p className='text-xs text-[var(--muted)] mt-1'>
														Статус: {app.status}
													</p>
												</div>
												<div className='flex gap-2'>
													<button
														onClick={() => handleAcceptApplication(app)}
														className='bg-green-600 text-white px-3 py-1 rounded-2xl text-sm font-bold hover:opacity-90 transition flex items-center gap-1'
													>
														<CheckCircle className='w-4 h-4' />
														Принять
													</button>
													<button
														onClick={() => handleRejectApplication(app)}
														className='bg-red-600 text-white px-3 py-1 rounded-2xl text-sm font-bold hover:opacity-90 transition flex items-center gap-1'
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
									className='w-full bg-red-600 text-white py-2 rounded-2xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2'
								>
									<Trash2 className='w-4 h-4' />
									Удалить проект
								</button>
							</div>

							<div className='flex gap-3 pt-4'>
								<button
									onClick={() => setIsAdminModalOpen(false)}
									className='flex-1 px-4 py-2 border border-[var(--border)] text-[var(--text)] rounded-2xl font-bold hover:bg-black/5 dark:hover:bg-white/10 transition'
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
					<div className='card max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
						<div className='flex items-center justify-between p-6 border-b border-[var(--border)] sticky top-0 bg-[var(--card)]'>
							<h2 className='text-2xl font-bold text-[var(--text)]'>
								{selectedProject.title}
							</h2>
							<button
								onClick={() => setIsViewModalOpen(false)}
								className='text-[var(--muted)] hover:text-[var(--text)] transition'
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
								<h3 className='text-lg font-bold text-[var(--text)] mb-2'>
									Описание
								</h3>
								<p className='text-[var(--muted)]'>
									{selectedProject.description || 'Описание не указано'}
								</p>
							</div>

							{/* Project Owner */}
							<div>
								<h3 className='text-lg font-bold text-[var(--text)] mb-2'>
									Создатель проекта
								</h3>
								<p className='text-[var(--muted)]'>
									{selectedProject.profiles?.full_name || 'Неизвестен'}
								</p>
							</div>

							{/* Required Roles */}
							{selectedProject.required_roles &&
								selectedProject.required_roles.length > 0 && (
									<div>
										<h3 className='text-lg font-bold text-[var(--text)] mb-3'>
											Необходимые роли (нажмите, чтобы выбрать):
										</h3>
										<div className='flex flex-wrap gap-3'>
											{selectedProject.required_roles.map((rawRole, idx) => {
												const role = parseStoredRole(rawRole)
												const isFull = role.filled === 1
												const status = getUserProjectStatus(selectedProject)
												const canApply = status === 'can_apply' && !isFull

												return (
													<button
														key={idx}
														type='button'
														onClick={e => {
															e.stopPropagation()
															if (canApply) {
																handleApply(selectedProject.id, role.key)
																setIsViewModalOpen(false) // Закрываем модалку после подачи
															}
														}}
														disabled={!canApply}
														className={`
                px-4 py-2 rounded-xl text-sm font-bold transition-all
                ${
									canApply
										? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)] hover:text-white cursor-pointer active:scale-95'
										: 'bg-gray-500/10 text-gray-500 cursor-not-allowed opacity-60'
								}
              `}
													>
														<span>{role.label}</span>
														{isFull && (
															<span className='ml-2 text-[10px] uppercase bg-red-500/20 px-1.5 py-0.5 rounded-lg'>
																Закрыта
															</span>
														)}
													</button>
												)
											})}
										</div>
									</div>
								)}

							{/* Current Members */}
							<div>
								<h3 className='text-lg font-bold text-[var(--text)] mb-2'>
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
									<p className='text-[var(--muted)]'>Пока нет участников</p>
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
