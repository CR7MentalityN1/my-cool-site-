import { useEffect, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { supabase } from './lib/supabase'
import { Landing } from './components/Layout/Landing'
import { Header } from './components/Layout/Header'
import { LoginForm } from './components/Auth/LoginForm'
import { RegisterForm } from './components/Auth/RegisterForm'
import { ForgotPasswordForm } from './components/Auth/ForgotPasswordForm'
import { ResetPasswordForm } from './components/Auth/ResetPasswordForm'
import { ResetPassword } from './pages/ResetPassword'
import { ProfileForm } from './components/Profile/ProfileForm'
import { StudentsFeed } from './components/Feed/StudentsFeed'
import { Chat } from './components/Chat/Chat'
import { ProjectsFeed } from './components/Projects/ProjectsFeed'

function App() {
	const { user, loading } = useAuth()
	const [authMode, setAuthMode] = useState<
		'login' | 'register' | 'forgot' | 'reset'
	>('login')
	const [currentPage, setCurrentPage] = useState<
		'landing' | 'feed' | 'profile' | 'chat' | 'projects'
	>('landing')

	useEffect(() => {
		// keep legacy behavior for in-app reset form
		const hash = window.location.hash || ''
		if (hash.includes('type=recovery')) setAuthMode('reset')
	}, [])

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(event => {
			if (event === 'PASSWORD_RECOVERY') {
				// Ensure user sees password reset UI
				window.history.replaceState({}, '', '/reset-password')
				setAuthMode('reset')
				setCurrentPage('feed')
			}
		})

		return () => subscription.unsubscribe()
	}, [])

	if (loading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-[var(--bg)]'>
				<div className='text-2xl text-[var(--muted)]'>Загрузка...</div>
			</div>
		)
	}

	// Dedicated reset-password route (Supabase redirect target)
	if (window.location.pathname === '/reset-password') {
		return (
			<ResetPassword
				onGoToLogin={() => {
					setAuthMode('login')
					setCurrentPage('feed')
				}}
			/>
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
				{authMode === 'reset' && (
					<ResetPasswordForm onDone={() => setAuthMode('login')} />
				)}
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-[var(--bg)]'>
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
