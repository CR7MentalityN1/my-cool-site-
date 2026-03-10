import { X, User, Mail } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface StudentModalProps {
  profile: Profile;
  onClose: () => void;
}

export function StudentModal({ profile, onClose }: StudentModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Профиль студента</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name || 'Student'} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {profile.name || 'Без имени'}
              </h3>
              <p className="text-gray-600">{profile.faculty || 'Факультет не указан'}</p>
              <p className="text-gray-500">{profile.course ? `${profile.course} курс` : ''}</p>
            </div>
          </div>

          {profile.skills && profile.skills.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Навыки</h4>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.project_description && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Описание проекта</h4>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {profile.project_description}
              </p>
            </div>
          )}

          {profile.contacts && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Контакты
              </h4>
              <p className="text-gray-700">{profile.contacts}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
