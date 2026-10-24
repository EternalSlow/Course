import React, { useEffect, useState } from 'react';
import './style/style.css';
import { NavLink } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { API_BASE, assetUrl } from './api';

const podiumPlaces = {
  1: { label: '★ 1-Е', place: 'first' },
  2: { label: '2-Е', place: 'second' },
  3: { label: '3-Е', place: 'third' },
};

const getInitials = (name = '') => name.trim().slice(0, 2).toUpperCase() || '?';
const formatXP = (xp) => `${Number(xp || 0).toLocaleString()} XP`;

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

export default function League() {
  const { user } = useAuth();
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.add('league');
    return () => document.body.classList.remove('league');
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_BASE}/league`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data.learners)) throw new Error('Некорректные данные рейтинга');
        setLearners(data.learners);
      })
      .catch((fetchError) => {
        if (fetchError.name !== 'AbortError') setError('Не удалось загрузить рейтинг.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const podium = learners.slice(0, 3)
    .map((learner) => ({ ...learner, ...podiumPlaces[learner.rank] }))
    .sort((a, b) => [2, 1, 3].indexOf(a.rank) - [2, 1, 3].indexOf(b.rank));
  const leaderboard = learners.slice(3);
  const currentLearner = learners.find((learner) => learner.id === user?.userId);
  const currentRank = currentLearner?.rank;
  const topThreeGap = currentRank > 3
    ? Math.max(0, learners[2].xp - currentLearner.xp)
    : null;

  return (
    <div className="league page-container">
      <div className="app-container">

        {/* Section Tag */}
        <div className="section-tag">Рейтинг</div>

        {/* Header */}
        <div className="header-row">
          <h1 className="header-title">Вместе — лучше</h1>
        </div>

        {/* Club Header */}
        <div className="club-header">
          <div className="club-name-row">
            <div className="club-trophy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
            <div className="club-name">Клуб Byte</div>
          </div>
          <button type="button" className="period-btn">Всего XP</button>
        </div>

        {/* Podium */}
        <div className="podium">
          {podium.map((p) => (
            <div key={p.id} className={`podium-card ${p.place}`}>
              <div className="podium-rank">{p.label}</div>
              <div className="podium-avatar">
                {p.avatar ? <img src={assetUrl(p.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : getInitials(p.username)}
              </div>
              <div className="podium-name">{p.username}</div>
              <div className="podium-xp">{formatXP(p.xp)}</div>
            </div>
          ))}
        </div>

        {/* Encouragement Banner */}
        <div className="encourage-banner">
          <div className="encourage-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="encourage-text">
            {currentRank
              ? `Вы на ${currentRank}-м месте из ${learners.length}.${topThreeGap === null ? ' Отличная работа — вы в первой тройке!' : ` До первой тройки осталось ${formatXP(topThreeGap)}!`}`
              : 'Проходите уроки и получайте XP, чтобы попасть в рейтинг.'}
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="leaderboard-list">
          {loading && <p>Загрузка рейтинга...</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && learners.length === 0 && <p>Пока нет участников.</p>}
          {leaderboard.map((row) => (
            <div
              key={row.id}
              className={`leaderboard-item${row.id === user?.userId ? ' highlight' : ''}`}
            >
              <div className="lb-rank">{row.rank}</div>
              <div className="lb-avatar">
                {row.avatar ? <img src={assetUrl(row.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : getInitials(row.username)}
              </div>
              <div className="lb-info">
                <div className="lb-name">{row.username}</div>
                {row.id === user?.userId && <div className="lb-you">ВЫ</div>}
              </div>
              <div className="lb-xp">{formatXP(row.xp)}</div>
            </div>
          ))}
        </div>

        {/* Footer Message */}
        <div className="footer-message">Дружеское соревнование помогает расти.</div>

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