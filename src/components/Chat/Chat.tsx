import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, User } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Message = Database['public']['Tables']['messages']['Row'] & {
  profiles?: {
    name: string | null;
    avatar_url: string | null;
  };
};

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          fetchMessageWithProfile(payload.new.id as string);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles (
          name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: true })
      .limit(30);

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const fetchMessageWithProfile = async (messageId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles (
          name,
          avatar_url
        )
      `)
      .eq('id', messageId)
      .single();

    if (error) {
      console.error('Error fetching new message:', error);
    } else if (data) {
      setMessages((prev) => [...prev, data]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    setLoading(true);
    const { error } = await supabase.from('messages').insert({
      user_id: profile.id,
      content: newMessage.trim(),
    });

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
    setLoading(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="bg-blue-600 text-white p-4">
          <h2 className="text-2xl font-bold">Общий чат</h2>
          <p className="text-blue-100 text-sm">Найдите команду и обсудите проекты</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwn = message.user_id === profile?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[70%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {message.profiles?.avatar_url ? (
                      <img
                        src={message.profiles.avatar_url}
                        alt={message.profiles.name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-semibold text-gray-700">
                        {message.profiles?.name || 'Без имени'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || !profile?.name}
            />
            <button
              type="submit"
              disabled={loading || !newMessage.trim() || !profile?.name}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>Отправить</span>
            </button>
          </div>
          {!profile?.name && (
            <p className="text-sm text-red-600 mt-2">
              Заполните свой профиль, чтобы отправлять сообщения
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
