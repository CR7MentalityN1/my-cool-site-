import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Send } from 'lucide-react'
import type { Database } from '../../lib/database.types'
import { AvatarImage } from '../AvatarImage'
import { getUserErrorMessage } from '../../lib/userErrors'

type Message = Database['public']['Tables']['messages']['Row'] & {
	profiles?: {
		name: string | null
		avatar_url: string | null
	} | null
}

const mergeMessages = (current: Message[], incoming: Message[]): Message[] => {
	const byId = new Map(current.map(message => [message.id, message]))
	for (const message of incoming) {
		const previous = byId.get(message.id)
		byId.set(message.id, {
			...previous,
			...message,
			profiles: message.profiles ?? previous?.profiles,
		})
	}
	return [...byId.values()]
		.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
		.slice(-30)
}

export function Chat() {
	const [messages, setMessages] = useState<Message[]>([])
	const [newMessage, setNewMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const [sendError, setSendError] = useState('')
	const { profile } = useAuth()
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const sendingRef = useRef(false)
	const profileRef = useRef(profile)
	const profileCacheRef = useRef(new Map<string, NonNullable<Message['profiles']>>())
	const emojiList = ['😊', '😂', '🔥', '👍', '❤️', '🚀']
	profileRef.current = profile

	useEffect(() => {
		let active = true
		const loadingProfiles = new Set<string>()

		const fetchMessages = async () => {
			try {
				const { data, error } = await supabase
					.from('messages')
					.select('*, profiles (name, avatar_url)')
					.order('created_at', { ascending: false })
					.order('id', { ascending: false })
					.limit(30)
				if (error) throw error
				if (!active) return
				const recentMessages = (data || []) as Message[]
				for (const message of recentMessages) {
					if (message.profiles) profileCacheRef.current.set(message.user_id, message.profiles)
				}
				setMessages(previous => mergeMessages(previous, recentMessages))
			} catch (error) {
				if (!active) return
				console.error('Error fetching messages:', error)
				alert(getUserErrorMessage(error, 'Не удалось загрузить сообщения'))
			}
		}

		void fetchMessages()

		const channel = supabase
			.channel('chat-messages')
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'messages' },
				payload => {
					if (!active) return
					const message = payload.new as Message | null
					if (!message?.id) return

					const ownProfile = profileRef.current
					if (ownProfile?.id === message.user_id) {
						profileCacheRef.current.set(message.user_id, {
							name: ownProfile.name,
							avatar_url: ownProfile.avatar_url,
						})
					}
					const cachedProfile = profileCacheRef.current.get(message.user_id)
					setMessages(previous => mergeMessages(previous, [{ ...message, profiles: cachedProfile }]))
					if (cachedProfile || loadingProfiles.has(message.user_id)) return

					loadingProfiles.add(message.user_id)
					void supabase.from('profiles')
						.select('name, avatar_url')
						.eq('id', message.user_id)
						.maybeSingle()
						.then(({ data, error }) => {
							loadingProfiles.delete(message.user_id)
							if (!active) return
							if (error) {
								console.error('Error fetching message profile:', error)
								return
							}
							if (data) {
								profileCacheRef.current.set(message.user_id, data)
								setMessages(previous => previous.map(item =>
									item.user_id === message.user_id ? { ...item, profiles: data } : item,
								))
							}
						})
				},
			)
			.subscribe()

		return () => {
			active = false
			void supabase.removeChannel(channel)
		}
	}, [])

	useEffect(() => {
		scrollToBottom()
	}, [messages])

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	const appendEmoji = (emoji: string) => {
		setNewMessage(prev => prev.length + emoji.length <= 1000 ? prev + emoji : prev)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (sendingRef.current) return
		setSendError('')

		const content = newMessage.trim()
		if (!content) {
			setSendError('Введите сообщение')
			return
		}
		if (!profile?.id || !profile.name) {
			setSendError('Заполните свой профиль, чтобы отправлять сообщения')
			return
		}
		if (content.length > 1000) {
			setSendError('Сообщение слишком длинное (макс. 1000 символов)')
			return
		}

		sendingRef.current = true
		setLoading(true)
		try {
			const { error } = await supabase.from('messages').insert({
				user_id: profile.id,
				content,
			})
			if (error) throw error
			setNewMessage('')
		} catch (error) {
			console.error('Error sending message:', error)
			setSendError(getUserErrorMessage(error, 'Не удалось отправить сообщение. Попробуйте ещё раз.'))
		} finally {
			sendingRef.current = false
			setLoading(false)
		}
	}

	const formatTime = (timestamp: string) => {
		const date = new Date(timestamp)
		return date.toLocaleTimeString('ru-RU', {
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	return (
		<div className='max-w-4xl mx-auto px-4 py-8'>
			<div
				className='card overflow-hidden flex flex-col'
				style={{ height: 'calc(100vh - 200px)' }}
			>
				<div className='bg-[var(--accent)] text-white p-4'>
					<h2 className='text-2xl font-bold'>Общий чат</h2>
					<p className='text-white/80 text-sm'>
						Найдите команду и обсудите проекты
					</p>
				</div>

				<div className='flex-1 overflow-y-auto p-4 space-y-4'>
					{messages.map(message => {
						const isOwn = message.user_id === profile?.id
						return (
							<div
								key={message.id}
								className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
							>
								<div
								className={`flex items-start space-x-2 max-w-[70%] min-w-0 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
								>
									<div className='w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0'>
										<AvatarImage url={message.profiles?.avatar_url} alt={message.profiles?.name || 'User'} iconClassName='w-4 h-4 text-[var(--muted)]' />
									</div>

									<div className='min-w-0'>
										<div className='flex items-center space-x-2 mb-1'>
											<span className='text-sm font-semibold text-[var(--text)] break-all'>
												{message.profiles?.name || 'Без имени'}
											</span>
											<span className='text-xs text-[var(--muted)] flex-shrink-0'>
												{formatTime(message.created_at)}
											</span>
										</div>
										<div
											className={`px-4 py-2 rounded-2xl border ${
												isOwn
													? 'bg-[var(--accent)] text-white border-transparent'
													: 'bg-[var(--card)] text-[var(--text)] border-[var(--border)]'
											}`}
										>
											<p className='whitespace-pre-wrap break-words'>
												{message.content}
											</p>
										</div>
									</div>
								</div>
							</div>
						)
					})}
					<div ref={messagesEndRef} />
				</div>

				<form
					onSubmit={handleSubmit}
					className='border-t border-[var(--border)] p-4 bg-[var(--card)]'
				>
					<div className='mb-3 flex flex-wrap gap-2'>
						{emojiList.map(emoji => (
							<button
								type='button'
								key={emoji}
								onClick={() => appendEmoji(emoji)}
								className='rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-lg hover:bg-black/5 dark:hover:bg-white/10 transition'
							>
								{emoji}
							</button>
						))}
					</div>
					<div className='flex space-x-2'>
						<input
							type='text'
							value={newMessage}
							onChange={e => {
								setNewMessage(e.target.value)
								if (sendError) setSendError('')
							}}
							maxLength={1000}
							placeholder='Введите сообщение...'
							className='flex-1 px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
							disabled={loading || !profile?.name}
						/>
						<button
							type='submit'
							disabled={loading || !newMessage.trim() || !profile?.name}
							className='bg-[var(--accent)] text-white px-6 py-2 rounded-2xl font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2'
						>
							<Send className='w-5 h-5' />
							<span>Отправить</span>
						</button>
					</div>
					{sendError && (
						<p role='alert' className='text-sm text-red-600 mt-2'>{sendError}</p>
					)}
					{!profile?.name && (
						<p className='text-sm text-red-600 mt-2'>
							Заполните свой профиль, чтобы отправлять сообщения
						</p>
					)}
				</form>
			</div>
		</div>
	)
}
