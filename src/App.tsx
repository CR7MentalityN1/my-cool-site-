import { useEffect, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { initialRecoveryRedirect } from './lib/supabase'
import { Landing } from './components/Layout/Landing'
import { Header } from './components/Layout/Header'
import type { AppPage } from './components/Layout/Header'
import { LoginForm } from './components/Auth/LoginForm'
import { RegisterForm } from './components/Auth/RegisterForm'
import { ForgotPasswordForm } from './components/Auth/ForgotPasswordForm'
import { ResetPassword } from './pages/ResetPassword'
import { ProfileForm } from './components/Profile/ProfileForm'
import { StudentsFeed } from './components/Feed/StudentsFeed'
import { Chat } from './components/Chat/Chat'
import { ProjectsFeed } from './components/Projects/ProjectsFeed'

function App() {
	const { user, loading } = useAuth()
	const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>(
		'login',
	)
	const [currentPage, setCurrentPage] = useState<AppPage>('landing')

	useEffect(() => {
		if (user && currentPage === 'landing') {
			setCurrentPage('projects')
		}
	}, [user, currentPage])

	// The recovery page must mount while Auth is still initializing so it can
	// observe the redirect event. A reset link that lands on / also works.
	if (
		window.location.pathname === '/reset-password' ||
		initialRecoveryRedirect.hasRecoveryLink
	) {
		return <ResetPassword />
	}

	if (loading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-[var(--bg)]'>
				<div className='text-2xl text-[var(--muted)]'>Загрузка...</div>
			</div>
		)
	}

	if (!user) {
		if (currentPage === 'landing' && window.location.pathname !== '/login') {
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
			<div className='min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]'>
				{authMode === 'login' && (
					<LoginForm
						onSwitchToRegister={() => setAuthMode('register')}
						onForgotPassword={() => setAuthMode('forgot')}
					/>
				)}
				{authMode === 'register' && (
					<RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
				)}
				{authMode === 'forgot' && (
					<ForgotPasswordForm onBackToLogin={() => setAuthMode('login')} />
				)}
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-[var(--bg)]'>
			<Header currentPage={currentPage} onNavigate={setCurrentPage} />
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
