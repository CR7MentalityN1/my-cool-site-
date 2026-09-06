import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Send, User } from 'lucide-react'
import type { Database } from '../../lib/database.types'

type Message = Database['public']['Tables']['messages']['Row'] & {
	profiles?: {
		name: string | null
		avatar_url: string | null
	}
}

export function Chat() {
	const [messages, setMessages] = useState<Message[]>([])
	const [newMessage, setNewMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const { profile } = useAuth()
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const emojiList = ['😊', '😂', '🔥', '👍', '❤️', '🚀']

	useEffect(() => {
		fetchMessages()

		const channel = supabase
			.channel('schema-db-changes')
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'messages' },
				payload => {
					const newMessage = payload.new as Message | null
					if (!newMessage) return

					setMessages(prev => [...prev, newMessage])

					fetchMessageWithProfile(newMessage.id)
				},
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [])

	useEffect(() => {
		scrollToBottom()
	}, [messages])

	const fetchMessages = async () => {
		try {
			const { data, error } = await supabase
				.from('messages')
				.select(
					`
          *,
          profiles (
            name,
            avatar_url
          )
        `,
				)
				.order('created_at', { ascending: true })
				.limit(30)

			if (error) throw error
			setMessages(data || [])
		} catch (error) {
			console.error('Error fetching messages:', error)
			alert('Не удалось загрузить сообщения')
		}
	}

	const fetchMessageWithProfile = async (messageId: string) => {
		try {
			const { data, error } = await supabase
				.from('messages')
				.select(
					`
          *,
          profiles (
            name,
            avatar_url
          )
        `,
				)
				.eq('id', messageId)
				.single()

			if (error) throw error
			if (data) {
				setMessages(prev =>
					prev.some(message => message.id === data.id)
						? prev.map(message => (message.id === data.id ? data : message))
						: [...prev, data],
				)
			}
		} catch (error) {
			console.error('Error fetching new message:', error)
		}
	}

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	const appendEmoji = (emoji: string) => {
		setNewMessage(prev => prev + emoji)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!newMessage.trim() || !profile) return

		const content = newMessage.trim()
		if (content.length > 1000) {
			alert('Сообщение слишком длинное (макс. 1000 символов)')
			return
		}

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
			alert('Не удалось отправить сообщение')
		} finally {
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
									className={`flex items-start space-x-2 max-w-[70%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
								>
									<div className='w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0'>
										{message.profiles?.avatar_url ? (
											<img
												src={message.profiles.avatar_url}
												alt={message.profiles.name || 'User'}
												className='w-full h-full object-cover'
											/>
										) : (
											<User className='w-4 h-4 text-[var(--muted)]' />
										)}
									</div>

									<div>
										<div className='flex items-center space-x-2 mb-1'>
											<span className='text-sm font-semibold text-[var(--text)]'>
												{message.profiles?.name || 'Без имени'}
											</span>
											<span className='text-xs text-[var(--muted)]'>
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
							onChange={e => setNewMessage(e.target.value)}
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
