/**
 * Формат элемента в projects.required_roles (JSON-строка):
 * { faculty, specialization, count, taken }
 * Поддерживается обратная совместимость: { filled: 0|1 } и строка "Факультет — Специализация".
 */

export type RoleSlot = {
	key: string
	label: string
	faculty: string | null
	specialization: string | null
	taken: number
	total: number
}

export function parseRoleSlot(raw: string): RoleSlot {
	if (raw.trim().startsWith('{')) {
		try {
			const p = JSON.parse(raw) as Record<string, unknown>
			if (typeof p.faculty === 'string' && typeof p.specialization === 'string') {
				const label = `${p.faculty} — ${p.specialization}`
				const key = label

				if (typeof p.count === 'number' && Number.isFinite(p.count)) {
					const total = Math.max(1, Math.floor(p.count))
					const rawTaken =
						typeof p.taken === 'number' && Number.isFinite(p.taken)
							? Math.floor(p.taken)
							: 0
					const taken = Math.min(Math.max(0, rawTaken), total)
					return {
						key,
						label,
						faculty: p.faculty,
						specialization: p.specialization,
						taken,
						total,
					}
				}

				// legacy: { faculty, specialization, filled: 0|1 }
				if ('filled' in p) {
					const filled = p.filled === 1 ? 1 : 0
					return {
						key,
						label,
						faculty: p.faculty,
						specialization: p.specialization,
						taken: filled,
						total: 1,
					}
				}
			}
		} catch {
			// fall through
		}
	}

	const parts = raw.split('—').map(s => s.trim())
	if (parts.length >= 2) {
		const faculty = parts[0]
		const specialization = parts.slice(1).join(' — ')
		const label = `${faculty} — ${specialization}`
		return {
			key: label,
			label,
			faculty,
			specialization,
			taken: 0,
			total: 1,
		}
	}

	return {
		key: raw,
		label: raw,
		faculty: null,
		specialization: null,
		taken: 0,
		total: 1,
	}
}

export function serializeRoleSlot(input: {
	faculty: string
	specialization: string
	count: number
	taken?: number
}): string {
	const total = Math.max(1, Math.floor(input.count))
	const rawTaken =
		input.taken === undefined ? 0 : Math.floor(input.taken)
	const taken = Math.min(Math.max(0, rawTaken), total)
	return JSON.stringify({
		faculty: input.faculty,
		specialization: input.specialization,
		count: total,
		taken,
	})
}
