import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StudentCard } from './StudentCard';
import { StudentModal } from './StudentModal';
import { Search } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const FACULTIES = [
  'Все',
  'Прикладная математика',
  'Программная инженерия',
  'Дизайн',
  'Маркетинг',
  'Экономика',
  'Менеджмент',
  'Журналистика',
  'Другое',
];

export function StudentsFeed() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [facultyFilter, setFacultyFilter] = useState('Все');
  const [courseFilter, setCourseFilter] = useState('Все');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [profiles, facultyFilter, courseFilter, searchQuery]);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = profiles;

    if (facultyFilter !== 'Все') {
      filtered = filtered.filter((p) => p.faculty === facultyFilter);
    }

    if (courseFilter !== 'Все') {
      filtered = filtered.filter((p) => p.course === Number(courseFilter));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.skills?.some((skill) => skill.toLowerCase().includes(query)) ||
          p.project_description?.toLowerCase().includes(query)
      );
    }

    setFilteredProfiles(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Загрузка студентов...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Лента студентов</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Поиск
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Имя, навыки, проект..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Факультет
            </label>
            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {FACULTIES.map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Курс
            </label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Все">Все</option>
              {[1, 2, 3, 4].map((course) => (
                <option key={course} value={course}>
                  {course} курс
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600">Студенты не найдены</p>
          <p className="text-gray-500 mt-2">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProfiles.map((profile) => (
            <StudentCard
              key={profile.id}
              profile={profile}
              onViewDetails={() => setSelectedProfile(profile)}
            />
          ))}
        </div>
      )}

      {selectedProfile && (
        <StudentModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}
