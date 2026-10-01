export function safeExternalUrl(value: string | null): string | null {
	if (!value) return null

	try {
		const url = new URL(value)
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
	} catch {
		return null
	}
}

export function safeAvatarUrl(value: string | null): string | null {
	const trimmed = value?.trim() || ''
	if (!/^https?:\/\//i.test(trimmed)) return null
	return safeExternalUrl(trimmed)
}
