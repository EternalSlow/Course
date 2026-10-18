import './style/style.css';
import { NavLink } from 'react-router-dom';
import React, { useEffect, useState } from 'react';   // ✅ добавили useState
import { useAuth } from './AuthContext';              // ✅ добавили useAuth
import robot from './assets/robot.svg';

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

export default function Home() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    document.body.classList.add('home');
    return () => document.body.classList.remove('home');
  }, []);

  useEffect(() => {
    if (!user?.userId) return;
    fetch(`http://localhost:5000/api/user/${user.userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => {});
  }, [user]);

  const displayName = profile?.username || user?.username || 'friend';
  const firstName = displayName.split(' ')[0];
  const initials = firstName.slice(0, 2).toUpperCase();
  const streak   = profile?.streak   ?? 0;
  const totalXP  = profile?.xp       ?? 0;
  const curLesson = profile?.current_lesson ?? 1;
  const totalLessons = profile?.total_lessons ?? 6;

  // Цель на сегодня — отдельный запрос (или добавь в /api/user/:id)
  const [goal, setGoal] = useState(null);
  useEffect(() => {
    if (!user?.userId) return;
    fetch(`http://localhost:5000/api/user/${user.userId}/goal`)
      .then(r => r.ok ? r.json() : null)
      .then(setGoal)
      .catch(() => {});
  }, [user]);

  const goalXP      = goal?.daily_xp      ?? 0;
  const goalTarget  = goal?.daily_goal    ?? 50;
  const goalPercent = Math.min(100, Math.round((goalXP / goalTarget) * 100));
  return (
    <div className="home page-container">
      <div className="app-container">
        {/* Greeting */}
        <p className="course-tag">Good morning, {firstName}</p>

        {/* Header */}
        <div className="header-row">
          <h1 className="header-title">Ready for a little code?</h1>
          {profile?.avatar ? (
          <img
            src={`http://localhost:5000${profile.avatar}`}
            alt={firstName}
            className="am-badge"
            style={{ objectFit: 'cover', borderRadius: '50%' }}
          />
        ) : (
          <div className="am-badge">{initials}</div>
        )}
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card streak">
            <div className="stat-value-row">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2c0 0-6 6-6 11a6 6 0 0 0 12 0c0-5-6-11-6-11z" />
                </svg>
              </div>
              <span className="stat-value">{streak}</span>
            </div>
            <span className="stat-label">Day streak</span>
          </div>
          <div className="stat-card xp">
            <div className="stat-value-row">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#5c6bc0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="stat-value">{totalXP}</span>
            </div>
            <span className="stat-label">Total XP</span>
          </div>
        </div>

        {/* Today's Goal */}
        <div className="goal-card">
          <div className="goal-header">
            <span className="goal-title">Today's goal</span>
            <span className="goal-xp">{goalXP} / {goalTarget} XP</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{width: `${goalPercent}%` }} />
          </div>
          <p className="goal-message">One more lesson keeps your momentum going.</p>
        </div>

        {/* Lesson Card */}
        <div className="lesson-card">
          <div className="lesson-top-row">
            <span className="lesson-tag">Python · Beginner</span>
            <span className="lesson-progress-text">{curLesson} / {totalLessons} topics</span>
          </div>
          <div className="lesson-content-row">
            <div className="lesson-info">
              <h2 className="lesson-title">Make a decision</h2>
              <p className="lesson-subtitle">Conditions · Lesson 1 of 3</p>
            </div>
            <div className="lesson-robot">
              <img src={robot} width={72} height={72}/>
            </div>
          </div>
          <div className="progress-bar-bg lesson-progress-bar-bg">
            <div className="progress-bar-fill lesson-progress-bar-fill" style={{width: `${(curLesson / totalLessons) * 100}%` }}/>
          </div>
          <button type="button" className="btn-primary green">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Continue learning
          </button>
        </div>

        {/* Review Card */}
        <div className="row-card">
          <div className="row-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#5c6bc0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </div>
          <div className="row-card-info">
            <p className="row-card-title">Keep your skills sharp</p>
            <p className="row-card-subtitle">Review Hello World &amp; Variables</p>
          </div>
          <div className="row-card-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="#c0c4d0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
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