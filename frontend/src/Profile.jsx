import React, { useEffect, useState } from 'react';
import './style/style.css';
import { NavLink } from 'react-router-dom';
import { useAuth } from './AuthContext';

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
  { to: '/home',     icon: 'home',   label: 'home' },
  { to: '/lesson',   icon: 'book',   label: 'Learn' },
  { to: '/practice', icon: 'code',   label: 'Practice' },
  { to: '/league',   icon: 'trophy', label: 'League' },
  { to: '/profile',  icon: 'user',   label: 'Profile' },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.classList.add('profile');
    return () => document.body.classList.remove('profile');
  }, []);

  useEffect(() => {
    if (!user?.userId) return;
    fetch(`http://localhost:5000/api/user/${user.userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setProfile)
      .catch(() => setError('Не удалось загрузить профиль'));
  }, [user]);

  const displayName = profile?.username || user?.username || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();
  const email = profile?.email || '';
  const language = profile?.language || 'Python';
  const joined = 'Joined October 2026'; // можно потом брать с сервера

  return (
    <div className="profile page-container">
      <div className="app-container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Your profile</h1>
          <div className="header-action" onClick={logout} title="Log out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
        </div>

        {error && <p style={{ color: '#ff4b4b' }}>{error}</p>}

        {/* Profile Info */}
        <div className="profile-info">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-details">
            <div className="profile-name">{displayName}</div>
            <div className="profile-username">
              {email && `@${email.split('@')[0]} · `}{joined}
            </div>
            <div className="profile-badge">{language} explorer</div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">1,270</div>
            <div className="stat-label">Total XP</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">7</div>
            <div className="stat-label">Day streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">#4</div>
            <div className="stat-label">Club rank</div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="streak-card">
          <div className="streak-header">
            <div className="streak-fire">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            </div>
            <div className="streak-title">7 days. One great habit.</div>
          </div>
          <div className="streak-days">
            {['S', 'S', 'M', 'T', 'W', 'T', 'F'].map((day, i) => (
              <div className="streak-day" key={i}>
                <span className="streak-day-label">{day}</span>
                <div className="streak-day-circle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Card */}
        <div className="progress-card">
          <div className="progress-header">
            <div className="progress-title">Python foundations</div>
            <div className="progress-percent">33%</div>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" />
          </div>
          <div className="progress-subtitle">2 / 6 topics complete · Conditions is next</div>
        </div>

        {/* Achievements */}
        <div className="achievements-header">
          <div className="achievements-title">Little wins, big energy</div>
          <div className="achievements-count">3 earned</div>
        </div>
        <div className="achievements-row">
          <div className="achievement-card blue">
            <div className="achievement-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#5c6bc0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <div className="achievement-label">First print</div>
          </div>
          <div className="achievement-card orange">
            <div className="achievement-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            </div>
            <div className="achievement-label">7-day club</div>
          </div>
          <div className="achievement-card green">
            <div className="achievement-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="achievement-label">1,000 XP</div>
          </div>
        </div>

        {/* Daily Goal */}
        <div className="row-card daily-goal">
          <div className="row-card-icon daily-goal-icon">
            <div className="row-card-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <div className="row-card-title">Daily goal</div>
          </div>
          <div className="daily-goal-right">
            <span className="daily-goal-text">15 min · 50 XP</span>
            <div className="row-card-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>

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