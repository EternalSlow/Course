import React, { useState, useEffect } from 'react';
import './DailyGoal.css';
import { API_BASE, apiFetch } from './api';

const goalOptions = [
  { id: 'Just a taste',    minutes: 5,  xp: 10, label: 'Попробовать',    time: '5 мин в день' },
  { id: 'Build a habit',   minutes: 10, xp: 30, label: 'Выработать привычку',   time: '10 мин в день' },
  { id: 'Make real progress', minutes: 15, xp: 50, label: 'Добиться прогресса', time: '15 мин в день' },
  { id: 'All in on code',  minutes: 20, xp: 70, label: 'Углубиться в код',  time: '20 мин в день' },
];

export default function DailyGoal({ userId, onNext }) {
  const [selectedGoal, setSelectedGoal] = useState('Make real progress');
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState(null);
  const [progress, setProgress] = useState({ current: 1, total: 3 });

  // Загружаем текущий урок при монтировании
  useEffect(() => {
    if (!userId) return;

    apiFetch(`${API_BASE}/user/${userId}/current-lesson`)
      .then(res => res.json())
      .then(data => {
        if (data.lesson) {
          setLesson(data.lesson);
          setProgress(data.progress);
        }
      })
      .catch(err => console.error('Ошибка загрузки урока:', err));
  }, [userId]);

  const handleSetGoal = async () => {
    const goal = goalOptions.find(g => g.id === selectedGoal);
    if (!goal) return;

    setLoading(true);

    try {
      // Сохраняем цель на сервере
      const res = await apiFetch(`${API_BASE}/user/${userId}/goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.id,
          minutes: goal.minutes,
          xp: goal.xp,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log('Цель установлена:', data);
        if (onNext) onNext();
      }
    } catch (err) {
      console.error('Ошибка сохранения цели:', err);
    } finally {
      setLoading(false);
    }
  };

  // Прогресс-бар
  const progressPercent = (progress.current / progress.total) * 100;

  return (
    <div className="daily-goal page-container">
      <div className="app-container">

        {/* Прогресс-бар сверху */}
        <div className="top-progress">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="progress-label">
            {progress.current} / {progress.total}
          </span>
        </div>

        {/* Маскот + приветствие */}
        <div className="mascot-section">
          <div className="mascot">
            <svg viewBox="0 0 120 120" width="80" height="80">
              {/* Тело робота */}
              <rect x="30" y="40" width="60" height="50" rx="12" fill="#58cc02" />
              {/* Голова */}
              <rect x="35" y="15" width="50" height="35" rx="10" fill="#58cc02" />
              {/* Антенна */}
              <line x1="60" y1="15" x2="60" y2="5" stroke="#58cc02" strokeWidth="3" />
              <circle cx="60" cy="5" r="4" fill="#58cc02" />
              {/* Глаза */}
              <circle cx="48" cy="30" r="6" fill="white" />
              <circle cx="72" cy="30" r="6" fill="white" />
              <circle cx="48" cy="30" r="3" fill="#333" />
              <circle cx="72" cy="30" r="3" fill="#333" />
              {/* Улыбка */}
              <path d="M50 40 Q60 48 70 40" stroke="white" strokeWidth="2" fill="none" />
              {/* Руки */}
              <rect x="15" y="50" width="15" height="8" rx="4" fill="#58cc02" />
              <rect x="90" y="50" width="15" height="8" rx="4" fill="#58cc02" />
              {/* Ноги */}
              <rect x="40" y="90" width="12" height="15" rx="4" fill="#58cc02" />
              <rect x="68" y="90" width="12" height="15" rx="4" fill="#58cc02" />
            </svg>
          </div>
          <div className="mascot-bubble">
            <p>Каждый день — новый шаг.</p>
            <p>Так мы растём!</p>
          </div>
        </div>

        {/* Заголовок */}
        <h1 className="goal-title">Какова ваша цель на день?</h1>
        <p className="goal-subtitle">Найдите время для нового навыка.</p>

        {/* Варианты целей */}
        <div className="goal-options">
          {goalOptions.map((goal) => {
            const isSelected = selectedGoal === goal.id;
            return (
              <button
                key={goal.id}
                className={`goal-option ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedGoal(goal.id)}
              >
                <div className="option-radio">
                  {isSelected && (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#58cc02" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="option-info">
                  <span className="option-label">{goal.label}</span>
                  <span className="option-time">{goal.time}</span>
                </div>
                <span className="option-xp">{goal.xp} XP</span>
              </button>
            );
          })}
        </div>

        {/* Подсказка */}
        <p className="goal-hint">Выберите свой темп. Цель можно изменить позже.</p>

        {/* Кнопка подтверждения */}
        <button
          className="goal-submit"
          onClick={handleSetGoal}
          disabled={loading}
        >
          {loading ? 'Сохраняем...' : 'Сохранить цель'}
        </button>

        {/* Информация о текущем уроке (если загружен) */}
        {lesson && (
          <div className="current-lesson-info">
            <h3>📚 Текущий урок: {lesson.title}</h3>
            <p>{lesson.description}</p>
            <div className="lesson-code">
              <pre>{lesson.content}</pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}