import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getUserErrorMessage } from '../../lib/userErrors'
import type { Database } from '../../lib/database.types'

type Notification = Pick<Database['public']['Tables']['notifications']['Row'],
	'id' | 'user_id' | 'type' | 'title' | 'message' | 'related_project_id' | 'related_task_id' | 'is_read' | 'created_at'>

export function NotificationsBell({ onOpenProject }: { onOpenProject: (projectId: string) => void }) {
	const { user } = useAuth()
	const userId = user?.id
	const containerRef = useRef<HTMLDivElement>(null)
	const refreshSequence = useRef(0)
	const [open, setOpen] = useState(false)
	const [items, setItems] = useState<Notification[]>([])
	const [unreadCount, setUnreadCount] = useState(0)
	const [loading, setLoading] = useState(true)
	const [busy, setBusy] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')

	const refresh = useCallback(async () => {
		if (!userId) return
		const sequence = ++refreshSequence.current
		const [recentResult, countResult] = await Promise.all([
			supabase.from('notifications')
				.select('id, user_id, type, title, message, related_project_id, related_task_id, is_read, created_at')
				.eq('user_id', userId)
				.order('created_at', { ascending: false })
				.order('id', { ascending: false })
				.limit(10),
			supabase.from('notifications')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', userId)
				.eq('is_read', false),
		])
		if (sequence !== refreshSequence.current) return
		if (recentResult.error || countResult.error) {
			const error = recentResult.error || countResult.error
			console.error('Error loading notifications:', error)
			setErrorMessage(getUserErrorMessage(error, 'Не удалось загрузить уведомления. Попробуйте ещё раз.'))
		} else {
			setItems(recentResult.data || [])
			setUnreadCount(countResult.count || 0)
			setErrorMessage('')
		}
		setLoading(false)
	}, [userId])

	useEffect(() => {
		if (!userId) return
		void refresh()
		const channel = supabase
			.channel(`notifications:${userId}`)
			.on('postgres_changes', {
				event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}`,
			}, () => { void refresh() })
			.subscribe()
		return () => { void supabase.removeChannel(channel) }
	}, [userId, refresh])

	useEffect(() => {
		if (!open) return
		const closeOnOutsideClick = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
		}
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false)
		}
		document.addEventListener('mousedown', closeOnOutsideClick)
		document.addEventListener('keydown', closeOnEscape)
		return () => {
			document.removeEventListener('mousedown', closeOnOutsideClick)
			document.removeEventListener('keydown', closeOnEscape)
		}
	}, [open])

	const markRead = async (id: string) => {
		if (!userId || busy) return
		setBusy(true)
		const { error } = await supabase.from('notifications')
			.update({ is_read: true })
			.eq('id', id)
			.eq('user_id', userId)
		if (error) {
			console.error('Error marking notification read:', error)
			setErrorMessage(getUserErrorMessage(error, 'Не удалось отметить уведомление прочитанным.'))
		} else {
			await refresh()
		}
		setBusy(false)
	}

	const markAllRead = async () => {
		if (!userId || busy || !unreadCount) return
		setBusy(true)
		const { error } = await supabase.from('notifications')
			.update({ is_read: true })
			.eq('user_id', userId)
			.eq('is_read', false)
		if (error) {
			console.error('Error marking notifications read:', error)
			setErrorMessage(getUserErrorMessage(error, 'Не удалось отметить уведомления прочитанными.'))
		} else {
			await refresh()
		}
		setBusy(false)
	}

	return (
		<div className='relative shrink-0' ref={containerRef}>
			<button
				type='button'
				aria-label='Уведомления'
				aria-expanded={open}
				onClick={() => {
					setOpen(value => !value)
					void refresh()
				}}
				className='relative p-2 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent-2)] transition'
			>
				<Bell className='w-5 h-5 text-[var(--text)]' />
				{unreadCount > 0 && (
					<span className='absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center'>
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</button>

			{open && (
				<div className='absolute right-0 top-full mt-2 z-50 w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl text-[var(--text)]'>
					<div className='flex items-center justify-between gap-2 p-4 border-b border-[var(--border)]'>
						<h2 className='font-bold'>Уведомления</h2>
						<button type='button' onClick={() => void markAllRead()} disabled={busy || unreadCount === 0} className='text-xs text-[var(--accent)] disabled:opacity-50 flex items-center gap-1'>
							<CheckCheck className='w-4 h-4' /> Прочитать все
						</button>
					</div>
					{errorMessage && <p className='px-4 pt-3 text-sm text-red-600'>{errorMessage}</p>}
					{loading ? (
						<p className='p-4 text-sm text-[var(--muted)]'>Загружаем уведомления...</p>
					) : items.length === 0 ? (
						<p className='p-4 text-sm text-[var(--muted)]'>Уведомлений пока нет.</p>
					) : (
						<ul>
							{items.map(item => (
								<li key={item.id} className={`flex items-start gap-2 p-3 border-b border-[var(--border)] last:border-b-0 ${item.is_read ? '' : 'bg-[var(--accent-2)]'}`}>
									<button
										type='button'
										className='min-w-0 flex-1 text-left'
										onClick={() => {
											if (!item.is_read) void markRead(item.id)
											if (item.related_project_id) {
												setOpen(false)
												onOpenProject(item.related_project_id)
											}
										}}
									>
										<p className='font-semibold text-sm break-words'>{item.title}</p>
										<p className='text-sm break-words'>{item.message}</p>
										<time className='text-xs text-[var(--muted)]' dateTime={item.created_at}>
											{new Date(item.created_at).toLocaleString('ru-RU')}
										</time>
									</button>
									{!item.is_read && (
										<button type='button' aria-label='Отметить прочитанным' title='Отметить прочитанным' disabled={busy} onClick={() => void markRead(item.id)} className='p-1 text-[var(--accent)] disabled:opacity-50'>
											<Check className='w-4 h-4' />
										</button>
									)}
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	)
}
