import React, { useEffect } from 'react';
import './style/style.css';
import { NavLink } from 'react-router-dom';

const podium = [
  { rank: '2ND', initials: 'LC', name: 'Leo', xp: '1,540 XP', place: 'second' },
  { rank: '★ 1ST', initials: 'MP', name: 'Maya', xp: '1,820 XP', place: 'first' },
  { rank: '3RD', initials: 'SK', name: 'Sam', xp: '1,390 XP', place: 'third' },
];

const leaderboard = [
  { rank: 4, initials: 'AM', name: 'Alex Morgan', xp: '1,270 XP', you: true },
  { rank: 5, initials: 'NC', name: 'Nina Chen', xp: '1,160 XP' },
  { rank: 6, initials: 'OA', name: 'Omar Ali', xp: '1,080 XP' },
  { rank: 7, initials: 'JP', name: 'Jules Park', xp: '970 XP' },
];

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

export default function League() {
  useEffect(() => {
    document.body.classList.add('league');
    return () => document.body.classList.remove('league');
  }, []);
  return (
    <div className="league page-container">
      <div className="app-container">

        {/* Section Tag */}
        <div className="section-tag">Leaderboard</div>

        {/* Header */}
        <div className="header-row">
          <h1 className="header-title">Better together</h1>
          <div className="header-action">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
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
            <div className="club-name">Byte club</div>
          </div>
          <button type="button" className="period-btn">All-time XP</button>
        </div>

        {/* Podium */}
        <div className="podium">
          {podium.map((p) => (
            <div key={p.name} className={`podium-card ${p.place}`}>
              <div className="podium-rank">{p.rank}</div>
              <div className="podium-avatar">{p.initials}</div>
              <div className="podium-name">{p.name}</div>
              <div className="podium-xp">{p.xp}</div>
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
            You're #4 of 12 learners. Only 120 XP from the top three!
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="leaderboard-list">
          {leaderboard.map((row) => (
            <div
              key={row.rank}
              className={`leaderboard-item${row.you ? ' highlight' : ''}`}
            >
              <div className="lb-rank">{row.rank}</div>
              <div className="lb-avatar">{row.initials}</div>
              <div className="lb-info">
                <div className="lb-name">{row.name}</div>
                {row.you && <div className="lb-you">YOU</div>}
              </div>
              <div className="lb-xp">{row.xp}</div>
            </div>
          ))}
        </div>

        {/* Footer Message */}
        <div className="footer-message">Friendly competition. Real progress.</div>

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