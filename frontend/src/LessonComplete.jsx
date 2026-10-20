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
  const goal = Number(dailyGoal);
  const xpToday = Number(dailyXP);
  const dailyProgress = Number.isFinite(goal) && goal > 0 && Number.isFinite(xpToday)
    ? Math.min(100, Math.max(0, (xpToday / goal) * 100))
    : 0;

  return (
    <div className="lesson-complete page-container">
      <div className="app-container">
        {/* Робот */}
        <div className="complete-mascot">
          <img src={robot} alt="Робот" className="complete-robot" />
          <div className="confetti">
            <span className="confetti-piece" style={{ left: '20%', top: '10%' }} />
            <span className="confetti-piece" style={{ left: '80%', top: '15%' }} />
            <span className="confetti-piece" style={{ left: '15%', top: '25%' }} />
            <span className="confetti-piece" style={{ left: '85%', top: '20%' }} />
          </div>
        </div>

        {/* Заголовок */}
        <h1 className="complete-title">Отличная работа!</h1>
        <p className="complete-subtitle">
          Урок «{lessonTitle}» завершён. Урок «{nextLessonTitle}» открыт.
        </p>

        {/* Статистика */}
        <div className="stats-grid">
          <div className="stat-card xp">
            <div className="stat-icon">⚡</div>
            <div className="stat-value">+{xpEarned} XP</div>
            <div className="stat-label">ПОЛУЧЕНО</div>
          </div>
          
          <div className="stat-card accuracy">
            <div className="stat-icon"></div>
            <div className="stat-value">{accuracy}%</div>
            <div className="stat-label">ТОЧНОСТЬ</div>
          </div>
          
          <div className="stat-card time">
            <div className="stat-icon">🕐</div>
            <div className="stat-value">{timeSpent}</div>
            <div className="stat-label">ВРЕМЯ</div>
          </div>
        </div>

        {/* Результаты */}
        <div className="results-card">
          <div className="results-header">
            <span className="check-icon">✓</span>
            <strong>Правильных ответов: {correctAnswers} из {totalAnswers}</strong>
          </div>
          <p className="results-details">
            Последний ответ был верным. Повторите ошибки в разделе практики.
          </p>
        </div>

        {/* Общий XP */}
        <div className="total-xp-section">
          <div className="total-xp-header">
            <span>Прогресс цели на сегодня</span>
            <span className="xp-change">{previousXP} → {totalXP} XP</span>
          </div>
          <div className="xp-progress-track">
            <div className="xp-progress-fill" style={{ width: `${dailyProgress}%` }} />
          </div>
          <p className="daily-xp-info">
            Сегодня: {dailyXP} / {dailyGoal} XP · серия: {streakDays} дн.
          </p>
        </div>

        {/* Кнопки */}
        <div className="complete-buttons">
          <button className="btn-primary continue-btn" onClick={onNext || (() => navigate('/lesson'))}>
            <span>→</span> К уроку «{nextLessonTitle}»
          </button>
          
          <button className="btn-secondary review-btn" onClick={onReview || (() => navigate('/practice'))}>
            Разобрать ошибку
          </button>
        </div>
      </div>
    </div>
  );
}
