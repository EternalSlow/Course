// Practice.jsx
import './style/style.css';
import { NavLink, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const API_BASE = 'http://localhost:5000/api';

const NavIcons = {
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  book: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  code: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
};

const navItems = [
  { to: '/home',     icon: 'home',   label: 'Главная' },
  { to: '/lesson',   icon: 'book',   label: 'Уроки' },
  { to: '/practice', icon: 'code',   label: 'Практика' },
  { to: '/league',   icon: 'trophy', label: 'Лига' },
  { to: '/profile',  icon: 'user',   label: 'Профиль' },
];

export default function Practice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mistakes, setMistakes] = useState([]);
  const [lastCompletedLesson, setLastCompletedLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.add('practice');
    return () => document.body.classList.remove('practice');
  }, []);

  useEffect(() => {
    if (!user?.userId) return;
    const controller = new AbortController();

    Promise.all([
      fetch(`${API_BASE}/user/${user.userId}/practice`, { signal: controller.signal }),
      fetch(`${API_BASE}/user/${user.userId}/lessons`, { signal: controller.signal }),
    ])
      .then(async ([practiceResponse, lessonsResponse]) => {
        const [practiceData, lessonsData] = await Promise.all([
          practiceResponse.json(),
          lessonsResponse.json(),
        ]);
        if (!practiceResponse.ok) {
          throw new Error(practiceData.error || 'Не удалось загрузить вопросы для повторения');
        }
        if (!lessonsResponse.ok) {
          throw new Error(lessonsData.error || 'Не удалось загрузить список уроков');
        }
        if (!Array.isArray(practiceData.mistakes) || !Array.isArray(lessonsData.lessons)) {
          throw new Error('Сервер вернул некорректные данные');
        }
        setMistakes(practiceData.mistakes);
        const completedLessons = lessonsData.lessons.filter((lesson) => lesson.status === 'completed');
        setLastCompletedLesson(
          completedLessons.sort((first, second) => second.lesson_number - first.lesson_number)[0] || null
        );
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') {
          setError(loadError instanceof TypeError
            ? 'Не удалось связаться с сервером. Проверьте соединение.'
            : loadError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [user?.userId]);

  return (
    <div className="practice page-container">
      <div className="app-container">

        {/* Section Tag */}
        <p className="section-tag">Повторяйте и закрепляйте</p>

        {/* Header */}
        <div className="header-row">
          <h1 className="header-title">Разберите ошибки</h1>
        </div>

        

        {/* Description */}
        <p className="description">
          Здесь собраны вопросы, на которые вы ответили неверно. Правильный ответ удалит вопрос из списка.
        </p>

        <button
          className="practice-last-lesson"
          type="button"
          disabled={loading || !lastCompletedLesson}
          onClick={() => navigate(`/task/${lastCompletedLesson.lesson_number}?review=true`)}
        >
          {loading
            ? 'Загрузка уроков...'
            : lastCompletedLesson
              ? `Повторить последний урок: ${lastCompletedLesson.title}`
              : 'Завершите урок, чтобы открыть повторение'}
        </button>

        <div className="mistake-card">
          <div className="mistake-card-header">
            <div className="mistake-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </div>
            <div>
              <div className="mistake-title">Вопросы для повторения</div>
              <div className="mistake-subtitle">{mistakes.length} в списке</div>
            </div>
          </div>
        </div>

        <div className="cards-list">
          {loading && <p>Загрузка вопросов...</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && mistakes.length === 0 && (
            <p className="practice-empty">
              Пока нет вопросов для повторения. Неверные ответы из уроков появятся здесь.
            </p>
          )}
          {!loading && !error && mistakes.map((mistake) => (
            <button
              key={mistake.taskId}
              type="button"
              className="row-card practice-question"
              onClick={() => navigate(`/task/${mistake.lessonNumber}?practice=${mistake.taskId}`)}
            >
              <div className="row-card-icon option-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9b59b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
              </div>
              <div className="row-card-info">
                <div className="row-card-title">{mistake.lessonTitle}</div>
                <div className="row-card-subtitle">{mistake.question}</div>
              </div>
              <div className="row-card-arrow">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        <div className="footer-message">Ответьте правильно, чтобы убрать вопрос из списка.</div>

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item${isActive ? ' active' : ''}`
              }
            >
              <div className="nav-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {NavIcons[icon]}
                </svg>
              </div>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

      </div>
    </div>
  );
}