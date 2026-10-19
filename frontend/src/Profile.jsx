import React, { useEffect, useState } from 'react';
import './style/style.css';
import { NavLink, useNavigate } from 'react-router-dom';
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
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const streak = profile?.streak ?? 0;
  const xp = profile?.xp ?? 0;
  const totalLessons = profile?.total_lessons ?? 0;
  const completedLessons = Math.min(totalLessons, Math.max(0, (profile?.current_lesson ?? 1) - 1));
  const progress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="profile page-container">
      <div className="app-container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Your profile</h1>
          <button className="header-action settings-button" type="button" onClick={() => navigate('/settings')} title="Settings" aria-label="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4m0-13.4-1.4 1.4m-10.6 10.6-1.4 1.4" />
            </svg>
          </button>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        {/* Profile Info */}
        <div className="profile-info">
          <div className="profile-avatar">
            {profile?.avatar
              ? <img src={`http://localhost:5000${profile.avatar}`} alt={displayName} />
              : initials}
          </div>
          <div className="profile-details">
            <div className="profile-name">{displayName}</div>
            <div className="profile-username">{email}</div>
            <div className="profile-badge">{language} explorer</div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{xp.toLocaleString()}</div>
            <div className="stat-label">Total XP</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{streak}</div>
            <div className="stat-label">Day streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile?.rank ? `#${profile.rank}` : '—'}</div>
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
            <div className="streak-title">{streak} day{streak === 1 ? '' : 's'} in a row</div>
          </div>
          <p className="profile-username">Complete a lesson today to keep your streak going.</p>
        </div>

        {/* Progress Card */}
        <div className="progress-card">
          <div className="progress-header">
            <div className="progress-title">{language} foundations</div>
            <div className="progress-percent">{progress}%</div>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-subtitle">{completedLessons} / {totalLessons} topics complete</div>
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