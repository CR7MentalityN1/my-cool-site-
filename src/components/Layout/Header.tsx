import {
	Users,
	MessageCircle,
	CircleUser as UserCircle,
	LogOut,
	FolderKanban,
	Moon,
	Sun,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

interface HeaderProps {
	currentPage: string
	onNavigate: (page: string) => void
}

export function Header({ currentPage, onNavigate }: HeaderProps) {
	const { signOut } = useAuth()
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
				<div className='flex items-center justify-between'>
					<button
						onClick={() => onNavigate('feed')}
						className='text-2xl font-bold text-[var(--accent)] hover:opacity-90 transition'
					>
						Платформа междисциплинарных проектов
					</button>

					<nav className='flex items-center space-x-6'>
						<button
							type='button'
							onClick={toggleTheme}
							aria-label='Переключить тему'
							className='p-2 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent-2)] transition'
						>
							{theme === 'dark' ? (
								<Sun className='w-5 h-5 text-[var(--text)]' />
							) : (
								<Moon className='w-5 h-5 text-[var(--text)]' />
							)}
						</button>

						<button
							onClick={() => onNavigate('projects')}
							className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
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
							className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
								currentPage === 'feed'
									? 'bg-[var(--accent)] text-white'
									: 'text-[var(--text)] hover:bg-[var(--accent-2)]'
							}`}
						>
							<Users className='w-5 h-5' />
							<span className='font-medium'>Лента</span>
						</button>

						<button
							onClick={() => onNavigate('chat')}
							className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
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
							className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
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
							className='flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition'
						>
							<LogOut className='w-5 h-5' />
							<span className='font-medium'>Выйти</span>
						</button>
					</nav>
				</div>
			</div>
		</header>
	)
}
