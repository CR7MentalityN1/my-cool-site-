import type { Database } from './database.types'
import { parseRoleSlot } from './projectRoles'

type Profile = Database['public']['Tables']['profiles']['Row']
type Project = Database['public']['Tables']['projects']['Row']

export type Recommendation = {
	score: number
	roleLabel: string | null
	reasons: string[]
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('ru-RU')

const words = (value: string) =>
	normalize(value)
		.split(/[^a-zа-яё0-9+#.]+/i)
		.filter(word => word.length >= 2)

export function getProjectRecommendation(
	profile: Profile,
	project: Pick<Project, 'required_roles' | 'title' | 'description'>,
): Recommendation {
	const openRoles = (project.required_roles || [])
		.map(parseRoleSlot)
		.filter(role => role.taken < role.total)

	if (openRoles.length === 0) {
		return { score: 0, roleLabel: null, reasons: [] }
	}

	const profileSkills = new Set((profile.skills || []).flatMap(words))
	const projectWords = new Set(
		words(`${project.title} ${project.description || ''}`),
	)

	return openRoles.reduce<Recommendation>(
		(best, role) => {
			let score = 0
			const reasons: string[] = []

			if (profile.specialization && role.specialization) {
				if (normalize(profile.specialization) === normalize(role.specialization)) {
					score += 55
					reasons.push('совпадает специализация')
				}
			}

			if (profile.faculty && role.faculty) {
				if (normalize(profile.faculty) === normalize(role.faculty)) {
					score += 30
					reasons.push('подходит факультет')
				}
			}

			const roleWords = new Set(words(`${role.label} ${role.specialization || ''}`))
			const skillMatches = [...profileSkills].filter(
				word => roleWords.has(word) || projectWords.has(word),
			).length
			if (skillMatches > 0) {
				score += Math.min(15, skillMatches * 5)
				reasons.push('совпадают навыки')
			}

			const candidate = {
				score: Math.min(100, score),
				roleLabel: role.label,
				reasons,
			}
			return candidate.score > best.score ? candidate : best
		},
		{ score: 0, roleLabel: null, reasons: [] },
	)
}

