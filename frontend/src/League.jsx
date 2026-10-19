import React, { useEffect, useState } from 'react';
import './style/style.css';
import { NavLink } from 'react-router-dom';
import { useAuth } from './AuthContext';

const API_BASE = 'http://localhost:5000/api';
const podiumPlaces = {
  1: { label: '★ 1ST', place: 'first' },
  2: { label: '2ND', place: 'second' },
  3: { label: '3RD', place: 'third' },
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
  { to: '/home',     icon: 'home',   label: 'home' },
  { to: '/lesson',   icon: 'book',   label: 'Learn' },
  { to: '/practice', icon: 'code',   label: 'Practice' },
  { to: '/league',   icon: 'trophy', label: 'League' },
  { to: '/profile',  icon: 'user',   label: 'Profile' },
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
        if (!Array.isArray(data.learners)) throw new Error('Invalid leaderboard data');
        setLearners(data.learners);
      })
      .catch((fetchError) => {
        if (fetchError.name !== 'AbortError') setError('Unable to load the leaderboard.');
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
            <div key={p.id} className={`podium-card ${p.place}`}>
              <div className="podium-rank">{p.label}</div>
              <div className="podium-avatar">
                {p.avatar ? <img src={`http://localhost:5000${p.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : getInitials(p.username)}
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
              ? `You're #${currentRank} of ${learners.length} learners.${topThreeGap === null ? ' Great work in the top three!' : ` Only ${formatXP(topThreeGap)} from the top three!`}`
              : 'Join the leaderboard by completing lessons and earning XP.'}
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="leaderboard-list">
          {loading && <p>Loading leaderboard...</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && learners.length === 0 && <p>No learners yet.</p>}
          {leaderboard.map((row) => (
            <div
              key={row.id}
              className={`leaderboard-item${row.id === user?.userId ? ' highlight' : ''}`}
            >
              <div className="lb-rank">{row.rank}</div>
              <div className="lb-avatar">
                {row.avatar ? <img src={`http://localhost:5000${row.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : getInitials(row.username)}
              </div>
              <div className="lb-info">
                <div className="lb-name">{row.username}</div>
                {row.id === user?.userId && <div className="lb-you">YOU</div>}
              </div>
              <div className="lb-xp">{formatXP(row.xp)}</div>
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