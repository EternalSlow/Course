import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './style/style.css';

const API_BASE = 'http://localhost:5000/api';

const NavCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const NavLockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#ccced3" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

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

const FALLBACK_STEPS = [
  { side: 'left',  status: 'completed', number: 1, title: 'Привет, мир', subtitle: 'Ваш первый код' },
  { side: 'right', status: 'completed', number: 2, title: 'Переменные', subtitle: 'Дайте данным имя' },
  { side: 'left',  status: 'active',    number: 3, title: 'Условия', subtitle: <><span className="next-tag">ДАЛЕЕ</span> · Урок 3 из 6</> },
  { side: 'right', status: 'locked',    number: 4, title: 'Циклы', subtitle: 'Повторяйте команды' },
  { side: 'left',  status: 'locked',    number: 5, title: 'Функции', subtitle: 'Создавайте блоки кода' },
  { side: 'right', status: 'locked',    number: 6, title: 'Массивы', subtitle: 'Храните данные вместе' },
];

export default function Lesson() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [steps, setSteps] = useState([]);
  const [language, setLanguage] = useState('Python');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSteps = useCallback(async (signal) => {
    if (!user?.userId) return;
    setLoading(true);
    setError(null);
    setSteps([]);
    setLanguage('Python');

    try {
      const res = await fetch(`${API_BASE}/user/${user.userId}/lessons`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!Array.isArray(data.lessons)) {
        throw new Error('Некорректный ответ сервера');
      }

      setLanguage(data.language || 'Python');
      const total = data.lessons.length;

      const transformed = data.lessons.map((lesson, index) => ({
        side: index % 2 === 0 ? 'left' : 'right',
        status: lesson.status,
        number: lesson.lesson_number,
        title: lesson.title,
        subtitle: lesson.status === 'active'
          ? (
            <>
              <span className="next-tag">ДАЛЕЕ</span>
                {' · '}Урок {lesson.lesson_number} из {total}
            </>
          )
          : lesson.subtitle,
      }));

      setSteps(transformed);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Ошибка загрузки уроков:', e);
      setError('Не удалось загрузить уроки. Показаны демонстрационные данные.');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    document.body.classList.add('journey');

    const ctrl = new AbortController();
    loadSteps(ctrl.signal);

    return () => {
      document.body.classList.remove('journey');
      ctrl.abort();
    };
  }, [loadSteps]);

  const handleNodeClick = (step) => {
    if (step.status === 'active') {
      navigate(`/task/${step.number}`);
    } else if (step.status === 'completed') {
      navigate(`/task/${step.number}?review=true`);
    }
  };

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length || 1;      // защита от деления на 0

  if (loading) {
    return (
      <div className="journey page-container">
        <div className="app-container">
          <p style={{ textAlign: 'center', marginTop: 100 }}>Загрузка уроков...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="journey page-container">
      <div className="app-container">
        <p className="course-tag">Курс {language}</p>

        <div className="header-row">
          <h1 className="header-title">Ваш путь в программировании</h1>
        </div>

        {error && (
          <div className="error-banner" role="alert" style={{ color: '#ff4b4b', margin: '8px 0' }}>
            {error}
          </div>
        )}

        <div className="progress-card">
          <div className="progress-info">
            <span className="progress-title">Основы</span>
            <span className="progress-text">{completedCount} / {totalCount} тем пройдено</span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        <div className="timeline-container">
          {steps.map((step) => (
            <div
              className={`timeline-item ${step.side}`}
              key={step.number}                       // ← стабильный key вместо index
              onClick={() => handleNodeClick(step)}
              style={{ cursor: step.status !== 'locked' ? 'pointer' : 'default' }}
            >
              <div className={`node-button ${step.status}`}>
                {step.status === 'completed' && <NavCheckIcon />}
                {step.status === 'active' && <span>{step.number}</span>}
                {step.status === 'locked' && <NavLockIcon />}
              </div>
              <div className="node-info">
                <h3 className="node-title">{step.title}</h3>
                <p className="node-subtitle">{step.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="footer-message muted">
          <svg viewBox="0 0 24 24">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" fill="#f1f1f1" />
            <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="#afafaf" />
            <path d="M9 11h6V8a3 3 0 0 0-6 0v3z" fill="none" stroke="#afafaf" strokeWidth="2" />
          </svg>
          <span>Завершите текущий урок, чтобы открыть следующий.</span>
        </div>

        <nav className="bottom-nav">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <div className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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