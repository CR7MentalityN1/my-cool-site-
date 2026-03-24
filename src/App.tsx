import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { Landing } from './components/Layout/Landing'
import { Header } from './components/Layout/Header'
import { LoginForm } from './components/Auth/LoginForm'
import { RegisterForm } from './components/Auth/RegisterForm'
import { ProfileForm } from './components/Profile/ProfileForm'
import { StudentsFeed } from './components/Feed/StudentsFeed'
import { Chat } from './components/Chat/Chat'
import { ProjectsFeed } from './components/Projects/ProjectsFeed'

function App() {
	const { user, loading } = useAuth()
	const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
	const [currentPage, setCurrentPage] = useState<
		'landing' | 'feed' | 'profile' | 'chat' | 'projects'
	>('landing')

	if (loading) {
		return (
			<div className='min-h-screen bg-gray-100 flex items-center justify-center'>
				<div className='text-2xl text-gray-600'>Загрузка...</div>
			</div>
		)
	}

	if (!user) {
		if (currentPage === 'landing') {
			return (
				<Landing
					onGetStarted={() => {
						setAuthMode('register')
						setCurrentPage('feed')
					}}
					onViewProjects={() => {
						setAuthMode('login')
						setCurrentPage('feed')
					}}
				/>
			)
		}

		return (
			<div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4'>
				{authMode === 'login' ? (
					<LoginForm onSwitchToRegister={() => setAuthMode('register')} />
				) : (
					<RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
				)}
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-gray-100'>
			<Header
				currentPage={currentPage}
				onNavigate={(page: any) => setCurrentPage(page)}
			/>
			<main>
				{currentPage === 'feed' && <StudentsFeed />}
				{currentPage === 'projects' && <ProjectsFeed />}
				{currentPage === 'profile' && <ProfileForm />}
				{currentPage === 'chat' && <Chat />}
			</main>
		</div>
	)
}

export default App
