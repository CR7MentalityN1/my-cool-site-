import {
	Users,
	MessageCircle,
	CircleUser as UserCircle,
	LogOut,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface HeaderProps {
	currentPage: string
	onNavigate: (page: string) => void
}

export function Header({ currentPage, onNavigate }: HeaderProps) {
	const { signOut } = useAuth()

	const handleLogout = async () => {
		try {
			await signOut()
		} catch (error) {
			console.error('Error signing out:', error)
		}
	}

	return (
		<header className='bg-white shadow-md'>
			<div className='max-w-7xl mx-auto px-4 py-4'>
				<div className='flex items-center justify-between'>
					<button
						onClick={() => onNavigate('feed')}
						className='text-2xl font-bold text-blue-600 hover:text-blue-700 transition'
					>
						Платформа междисциплинарных проектов
					</button>

					<nav className='flex items-center space-x-6'>
						<button
							onClick={() => onNavigate('feed')}
							className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
								currentPage === 'feed'
									? 'bg-blue-600 text-white'
									: 'text-gray-700 hover:bg-gray-100'
							}`}
						>
							<Users className='w-5 h-5' />
							<span className='font-medium'>Лента</span>
						</button>

						<button
							onClick={() => onNavigate('chat')}
							className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
								currentPage === 'chat'
									? 'bg-blue-600 text-white'
									: 'text-gray-700 hover:bg-gray-100'
							}`}
						>
							<MessageCircle className='w-5 h-5' />
							<span className='font-medium'>Чат</span>
						</button>

						<button
							onClick={() => onNavigate('profile')}
							className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
								currentPage === 'profile'
									? 'bg-blue-600 text-white'
									: 'text-gray-700 hover:bg-gray-100'
							}`}
						>
							<UserCircle className='w-5 h-5' />
							<span className='font-medium'>Профиль</span>
						</button>

						<button
							onClick={handleLogout}
							className='flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition'
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
