import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User } from 'lucide-react';

const FACULTIES = [
  'Прикладная математика',
  'Программная инженерия',
  'Дизайн',
  'Маркетинг',
  'Экономика',
  'Менеджмент',
  'Журналистика',
  'Другое',
];

export function ProfileForm() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    faculty: '',
    course: 1,
    skills: '',
    project_description: '',
    contacts: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        faculty: profile.faculty || '',
        course: profile.course || 1,
        skills: profile.skills?.join(', ') || '',
        project_description: profile.project_description || '',
        contacts: profile.contacts || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const skillsArray = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          faculty: formData.faculty,
          course: formData.course,
          skills: skillsArray,
          project_description: formData.project_description,
          contacts: formData.contacts,
          avatar_url: formData.avatar_url,
        })
        .eq('id', profile!.id);

      if (error) throw error;

      await refreshProfile();
      setMessage('Профиль успешно обновлен!');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Мой профиль</h2>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.includes('успешно')
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {formData.avatar_url ? (
              <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL аватара (можно использовать Gravatar, Imgur и т.д.)
            </label>
            <input
              type="url"
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Имя и фамилия *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Иван Иванов"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Факультет *</label>
            <select
              value={formData.faculty}
              onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Выберите факультет</option>
              {FACULTIES.map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Курс *</label>
            <select
              value={formData.course}
              onChange={(e) => setFormData({ ...formData, course: Number(e.target.value) })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4].map((course) => (
                <option key={course} value={course}>
                  {course} курс
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Навыки (через запятую)
          </label>
          <input
            type="text"
            value={formData.skills}
            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="React, Python, UI/UX Design"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание желаемого проекта
          </label>
          <textarea
            value={formData.project_description}
            onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Расскажите, над каким проектом хотите работать..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Контакты (Telegram, email)
          </label>
          <input
            type="text"
            value={formData.contacts}
            onChange={(e) => setFormData({ ...formData, contacts: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="@telegram или email@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Сохранение...' : 'Сохранить профиль'}
        </button>
      </form>
    </div>
  );
}
