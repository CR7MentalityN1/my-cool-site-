import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
	user: User | null
	profile: Profile | null
	loading: boolean
	signUp: (email: string, password: string) => Promise<void>
	signIn: (email: string, password: string) => Promise<void>
	signOut: () => Promise<void>
	refreshProfile: () => Promise<void>
	resetPasswordForEmail: (email: string) => Promise<void>
	updatePassword: (newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [profile, setProfile] = useState<Profile | null>(null)
	const [loading, setLoading] = useState(true)

	const fetchProfile = async (userId: string) => {
		const { data, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('auth_id', userId)
			.maybeSingle()

		if (error) {
			console.error('Error fetching profile:', error)
			return null
		}
		return data
	}

	const refreshProfile = async () => {
		if (user) {
			const profileData = await fetchProfile(user.id)
			setProfile(profileData)
		}
	}

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user ?? null)
			if (session?.user) {
				fetchProfile(session.user.id).then(setProfile)
			}
			setLoading(false)
		})

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null)
			if (session?.user) {
				fetchProfile(session.user.id).then(setProfile)
			} else {
				setProfile(null)
			}
		})

		return () => subscription.unsubscribe()
	}, [])

	const signUp = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: window.location.origin,
			},
		})

		// Если ошибка содержит требование подтверждения email - это нормально, показываем успех
		if (error) {
			if (
				error.message?.includes('Email confirmation') ||
				error.message?.includes('confirmation required')
			) {
				throw new Error(
					'Письмо отправлено! Пожалуйста, подтвердите почту, чтобы войти в Платформу междисциплинарных проектов.',
				)
			}
			throw error
		}

		// Если регистрация успешна, но требуется подтверждение
		if (data.user) {
			try {
				const { error: profileError } = await (supabase as any)
					.from('profiles')
					.upsert({
						id: data.user.id,
						auth_id: data.user.id,
						email: data.user.email!,
					})

				if (profileError) throw profileError
			} catch (profileErr) {
				console.error('Profile creation error:', profileErr)
				// Даже если профиль не создался, считаем регистрацию успешной
			}

			// Проверяем, требуется ли подтверждение email
			if (!data.user.confirmed_at) {
				throw new Error(
					'Письмо отправлено! Пожалуйста, подтвердите почту, чтобы войти в Платформу междисциплинарных проектов.',
				)
			}
		}

		return
	}

	const signIn = async (email: string, password: string) => {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		})

		if (error) throw error
	}

	const signOut = async () => {
		const { error } = await supabase.auth.signOut()
		if (error) throw error
	}

	const resetPasswordForEmail = async (email: string) => {
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: 'https://my-cool-site-puce.vercel.app/reset-password',
			})
			if (error) throw error
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e)
			alert(msg)
			throw e
		}
	}

	const updatePassword = async (newPassword: string) => {
		const { error } = await supabase.auth.updateUser({ password: newPassword })
		if (error) throw error
	}

	return (
		<AuthContext.Provider
			value={{
				user,
				profile,
				loading,
				signUp,
				signIn,
				signOut,
				refreshProfile,
				resetPasswordForEmail,
				updatePassword,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}
