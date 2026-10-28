import {
	Users,
	MessageCircle,
	CircleUser as UserCircle,
	LogOut,
	FolderKanban,
	Moon,
	Sun,
	CalendarDays,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { NotificationsBell } from './NotificationsBell'

export type AppPage = 'landing' | 'feed' | 'profile' | 'chat' | 'projects' | 'calendar'

interface HeaderProps {
	currentPage: AppPage
	onNavigate: (page: AppPage) => void
	onOpenProject: (projectId: string) => void
}

export function Header({ currentPage, onNavigate, onOpenProject }: HeaderProps) {
	const { user, signOut } = useAuth()
	const { theme, toggleTheme } = useTheme()

	const handleLogout = async () => {
		try {
			await signOut()
		} catch (error) {
			console.error('Error signing out:', error)
		}
	}

	return (
		<header className='bg-[var(--card)] shadow-sm border-b border-[var(--border)]'>
			<div className='max-w-7xl mx-auto px-4 py-4'>
				<div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4'>
					<button
						onClick={() => onNavigate('feed')}
						className='text-left text-lg sm:text-xl xl:basis-64 xl:shrink-0 font-bold leading-tight text-[var(--accent)] hover:opacity-90 transition'
					>
						Платформа междисциплинарных проектов
					</button>

					<div className='flex w-full min-w-0 items-center gap-2 xl:w-auto xl:flex-1'>
					<nav className='flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 xl:gap-1 xl:overflow-visible xl:pb-0'>
						<button
							type='button'
							onClick={toggleTheme}
							aria-label='Переключить тему'
							className='p-2 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent-2)] transition'
						>
							{theme === 'dark' ? (
								<Sun className='w-5 h-5 text-[var(--text)]' />
							) : (
								<Moon className='w-5 h-5 text-[var(--text)]' />
							)}
						</button>

						<button
							onClick={() => onNavigate('projects')}
							className={`flex shrink-0 items-center space-x-2 px-3 xl:px-2 py-2 rounded-lg transition ${
								currentPage === 'projects'
									? 'bg-[var(--accent)] text-white'
									: 'text-[var(--text)] hover:bg-[var(--accent-2)]'
							}`}
						>
							<FolderKanban className='w-5 h-5' />
							<span className='font-medium'>Проекты</span>
						</button>

						<button
							onClick={() => onNavigate('feed')}
							className={`flex shrink-0 items-center space-x-2 px-3 xl:px-2 py-2 rounded-lg transition ${
								currentPage === 'feed'
									? 'bg-[var(--accent)] text-white'
									: 'text-[var(--text)] hover:bg-[var(--accent-2)]'
							}`}
						>
							<Users className='w-5 h-5' />
							<span className='font-medium'>Лента</span>
						</button>

						<button
							onClick={() => onNavigate('calendar')}
							className={`flex shrink-0 items-center space-x-2 px-3 xl:px-2 py-2 rounded-lg transition ${
								currentPage === 'calendar'
									? 'bg-[var(--accent)] text-white'
									: 'text-[var(--text)] hover:bg-[var(--accent-2)]'
							}`}
						>
							<CalendarDays className='w-5 h-5' />
							<span className='font-medium'>Календарь</span>
						</button>

						<button
							onClick={() => onNavigate('chat')}
							className={`flex shrink-0 items-center space-x-2 px-3 xl:px-2 py-2 rounded-lg transition ${
								currentPage === 'chat'
									? 'bg-[var(--accent)] text-white'
									: 'text-[var(--text)] hover:bg-[var(--accent-2)]'
							}`}
						>
							<MessageCircle className='w-5 h-5' />
							<span className='font-medium'>Чат</span>
						</button>

						<button
							onClick={() => onNavigate('profile')}
							className={`flex shrink-0 items-center space-x-2 px-3 xl:px-2 py-2 rounded-lg transition ${
								currentPage === 'profile'
									? 'bg-[var(--accent)] text-white'
									: 'text-[var(--text)] hover:bg-[var(--accent-2)]'
							}`}
						>
							<UserCircle className='w-5 h-5' />
							<span className='font-medium'>Профиль</span>
						</button>

						<button
							onClick={handleLogout}
							className='flex shrink-0 items-center space-x-2 px-3 xl:px-2 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition'
						>
							<LogOut className='w-5 h-5' />
							<span className='font-medium'>Выйти</span>
						</button>
					</nav>
					<NotificationsBell key={user?.id} onOpenProject={onOpenProject} />
					</div>
				</div>
			</div>
		</header>
	)
}
