import { User } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface StudentCardProps {
  profile: Profile;
  onViewDetails: () => void;
}

export function StudentCard({ profile, onViewDetails }: StudentCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition p-6">
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name || 'Student'} className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10 text-gray-400" />
          )}
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mb-1 text-center">
          {profile.name || 'Без имени'}
        </h3>

        <p className="text-sm text-gray-600 mb-1">{profile.faculty || 'Факультет не указан'}</p>
        <p className="text-sm text-gray-500 mb-3">{profile.course ? `${profile.course} курс` : ''}</p>

        {profile.skills && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {profile.skills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
            {profile.skills.length > 3 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{profile.skills.length - 3}
              </span>
            )}
          </div>
        )}

        <button
          onClick={onViewDetails}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Подробнее
        </button>
      </div>
    </div>
  );
}
