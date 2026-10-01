import { useState } from 'react'
import { User } from 'lucide-react'
import { safeAvatarUrl } from '../lib/urls'

interface AvatarImageProps {
	url: string | null | undefined
	alt: string
	iconClassName: string
}

export function AvatarImage({ url, alt, iconClassName }: AvatarImageProps) {
	const [failedUrl, setFailedUrl] = useState<string | null>(null)
	const safeUrl = safeAvatarUrl(url ?? null)

	return safeUrl && safeUrl !== failedUrl ? (
		<img
			src={safeUrl}
			alt={alt}
			className='w-full h-full object-cover'
			onError={() => setFailedUrl(safeUrl)}
		/>
	) : (
		<User className={iconClassName} aria-hidden='true' />
	)
}
