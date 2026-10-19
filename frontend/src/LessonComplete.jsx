import React from 'react';
import { useNavigate } from 'react-router-dom';
import './style/style.css';
import robot from './assets/robot.svg';

export default function LessonComplete({ 
  lessonTitle, 
  nextLessonTitle,
  xpEarned, 
  accuracy, 
  timeSpent,
  correctAnswers,
  totalAnswers,
  totalXP,
  previousXP,
  dailyXP,
  dailyGoal,
  streakDays,
  onNext,
  onReview 
}) {
  const navigate = useNavigate();

  return (
    <div className="lesson-complete page-container">
      <div className="app-container">
        {/* Робот */}
        <div className="complete-mascot">
          <img src={robot} alt="Robot" className="complete-robot" />
          <div className="confetti">
            <span className="confetti-piece" style={{ left: '20%', top: '10%' }} />
            <span className="confetti-piece" style={{ left: '80%', top: '15%' }} />
            <span className="confetti-piece" style={{ left: '15%', top: '25%' }} />
            <span className="confetti-piece" style={{ left: '85%', top: '20%' }} />
          </div>
        </div>

        {/* Заголовок */}
        <h1 className="complete-title">Look at you, coder!</h1>
        <p className="complete-subtitle">
          {lessonTitle} complete. {nextLessonTitle} unlocked.
        </p>

        {/* Статистика */}
        <div className="stats-grid">
          <div className="stat-card xp">
            <div className="stat-icon">⚡</div>
            <div className="stat-value">+{xpEarned} XP</div>
            <div className="stat-label">EARNED</div>
          </div>
          
          <div className="stat-card accuracy">
            <div className="stat-icon"></div>
            <div className="stat-value">{accuracy}%</div>
            <div className="stat-label">ACCURACY</div>
          </div>
          
          <div className="stat-card time">
            <div className="stat-icon">🕐</div>
            <div className="stat-value">{timeSpent}</div>
            <div className="stat-label">TIME</div>
          </div>
        </div>

        {/* Результаты */}
        <div className="results-card">
          <div className="results-header">
            <span className="check-icon">✓</span>
            <strong>{correctAnswers} of {totalAnswers} answers correct</strong>
          </div>
          <p className="results-details">
            You nailed the last one: apples goes from 2 to 3. 
            Revisit one missed answer in practice.
          </p>
        </div>

        {/* Общий XP */}
        <div className="total-xp-section">
          <div className="total-xp-header">
            <span>Total XP</span>
            <span className="xp-change">{previousXP} → {totalXP}</span>
          </div>
          <div className="xp-progress-track">
            <div className="xp-progress-fill" style={{ width: `${(dailyXP / dailyGoal) * 100}%` }} />
          </div>
          <p className="daily-xp-info">
            {dailyXP} / {dailyGoal} XP today · {streakDays}-day streak going strong
          </p>
        </div>

        {/* Кнопки */}
        <div className="complete-buttons">
          <button className="btn-primary continue-btn" onClick={onNext || (() => navigate('/lesson'))}>
            <span>→</span> On to {nextLessonTitle}
          </button>
          
          <button className="btn-secondary review-btn" onClick={onReview || (() => navigate('/practice'))}>
            Review my mistake
          </button>
        </div>
      </div>
    </div>
  );
}
