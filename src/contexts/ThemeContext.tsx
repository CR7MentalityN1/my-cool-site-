import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
	theme: Theme
	setTheme: (theme: Theme) => void
	toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'theme'

function applyThemeToDom(theme: Theme) {
	const root = document.documentElement
	root.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<Theme>('light')

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored === 'light' || stored === 'dark') {
			setThemeState(stored)
			applyThemeToDom(stored)
			return
		}

		const prefersDark =
			window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
		const initial: Theme = prefersDark ? 'dark' : 'light'
		setThemeState(initial)
		applyThemeToDom(initial)
	}, [])

	const setTheme = (next: Theme) => {
		setThemeState(next)
		localStorage.setItem(STORAGE_KEY, next)
		applyThemeToDom(next)
	}

	const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

	const value = useMemo<ThemeContextValue>(
		() => ({ theme, setTheme, toggleTheme }),
		[theme],
	)

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
	const ctx = useContext(ThemeContext)
	if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
	return ctx
}

