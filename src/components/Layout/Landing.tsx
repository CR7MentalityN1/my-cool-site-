import { Users, MessageCircle, Target, ArrowRight } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
  onViewProjects: () => void;
}

export function Landing({ onGetStarted, onViewProjects }: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Study<span className="text-blue-600">Connect</span>
          </h1>
          <p className="text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Найди команду для своего учебного проекта
          </p>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            Платформа для поиска единомышленников среди студентов университета. Создавайте проекты, делитесь идеями и находите партнеров для совместной работы.
          </p>

          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={onGetStarted}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition flex items-center space-x-2 shadow-lg"
            >
              <span>Начать</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onViewProjects}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600 shadow-lg"
            >
              Смотреть проекты
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center hover:shadow-2xl transition">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Найди команду</h3>
            <p className="text-gray-600">
              Просматривай профили студентов из разных факультетов и находи тех, кто разделяет твои интересы
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-8 text-center hover:shadow-2xl transition">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Создай проект</h3>
            <p className="text-gray-600">
              Опиши свою идею проекта, укажи нужные навыки и жди откликов от заинтересованных студентов
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-8 text-center hover:shadow-2xl transition">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Общайся</h3>
            <p className="text-gray-600">
              Используй общий чат для обсуждения идей и координации работы над проектами
            </p>
          </div>
        </div>

        <div className="mt-20 bg-white rounded-lg shadow-xl p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Готов начать?</h2>
          <p className="text-gray-600 mb-8 text-lg">
            Зарегистрируйся сейчас и найди свою идеальную команду для следующего проекта
          </p>
          <button
            onClick={onGetStarted}
            className="bg-blue-600 text-white px-10 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition inline-flex items-center space-x-2 shadow-lg"
          >
            <span>Создать аккаунт</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
