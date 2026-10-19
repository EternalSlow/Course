import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './style/style.css';
import robot from './assets/robot.svg';
import LessonComplete from './LessonComplete';

// Fallback данные — работают БЕЗ сервера
const FALLBACK_LESSON = {
  id: 3,
  number: 3,
  title: 'Conditions',
  subtitle: 'Make decisions in code',
  xp_reward: 50,
};

const FALLBACK_TASKS = [
  {
    id: 1,
    type: 'multiple_choice',
    question: 'Which keyword is used to check a condition in Python?',
    options: ['if', 'when', 'check', 'loop'],
    correct_answer: 'if',
    explanation: 'The "if" keyword checks conditions in Python.',
  },
  {
    id: 2,
    type: 'multiple_choice',
    question: 'What will this code print?\n\nif age > 18:\n    print("Adult")\n\nage = 20',
    options: ['Adult', 'Child', 'Nothing', 'Error'],
    correct_answer: 'Adult',
    explanation: 'Since 20 > 18, the condition is True.',
  },
  {
    id: 3,
    type: 'multiple_choice',
    question: 'Which is the correct Python syntax?',
    options: ['if x > 5:', 'if (x > 5)', 'if x > 5 then:', 'when x > 5:'],
    correct_answer: 'if x > 5:',
    explanation: 'Python uses "if condition:" with a colon.',
  },
];

const API_BASE = 'http://localhost:5000';

export default function LessonTask() {
  const { id } = useParams(); // номер урока из URL
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.userId;

  const [lesson, setLesson] = useState(FALLBACK_LESSON);
  const [tasks, setTasks] = useState(FALLBACK_TASKS);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false); // загрузка завершения
  const [completed, setCompleted] = useState(false);
  const [completeData, setCompleteData] = useState(null); // данные для экрана завершения
  const [lessonStats, setLessonStats] = useState({
    startTime: Date.now(),
    correctAnswers: 0,
    totalAnswers: 0,
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLesson(FALLBACK_LESSON);
    setTasks(FALLBACK_TASKS);
    setCurrentTaskIndex(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setCompleting(false);
    setCompleted(false);
    setCompleteData(null);
    setLessonStats({
      startTime: Date.now(),
      correctAnswers: 0,
      totalAnswers: 0,
    });

    if (!userId) {
      setLoading(false);
      return () => controller.abort();
    }

    fetch(`${API_BASE}/api/user/${userId}/lesson/${id}/tasks`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Unable to load lesson tasks (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (data.lesson && Array.isArray(data.tasks) && data.tasks.length > 0) {
          setLesson({
            id: data.lesson.id,
            number: data.lesson.number,
            title: data.lesson.title,
            subtitle: data.lesson.subtitle,
            xp_reward: data.lesson.xp_reward,
          });
          setTasks(data.tasks);
        } else {
          console.warn('Server returned no lesson tasks. Using fallback data.');
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          console.warn('Unable to load lesson tasks. Using fallback data.', err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, userId]);

  const currentTask = tasks[currentTaskIndex];
  const totalTasks = tasks.length;
  const progressPercent = (currentTaskIndex / totalTasks) * 100;

  const handleCheck = () => {
    if (!selectedAnswer || !currentTask) return;

    const isCorrect = selectedAnswer === currentTask.correct_answer;
    console.log('✅ Проверка:', selectedAnswer, '===', currentTask.correct_answer, '→', isCorrect);

    setFeedback(isCorrect ? 'correct' : 'wrong');

    setLessonStats(prev => ({
      ...prev,
      totalAnswers: prev.totalAnswers + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
    }));
  };

  const handleContinue = () => {
    if (feedback === 'wrong') {
      setFeedback(null);
      setSelectedAnswer(null);
      return;
    }

    if (currentTaskIndex + 1 < totalTasks) {
      setCurrentTaskIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setFeedback(null);
    } else {
      finishLesson();
    }
  };

  // Завершение урока — вызов сервера и сбор данных для экрана
  const finishLesson = async () => {
    setCompleting(true);

    const timeSpent = Math.floor((Date.now() - lessonStats.startTime) / 1000);
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const accuracy =
      lessonStats.totalAnswers > 0
        ? Math.round((lessonStats.correctAnswers / lessonStats.totalAnswers) * 100)
        : 0;

    // 1. Сообщаем серверу о завершении урока
    let nextLessonNumber = lesson.number + 1;
    let completionData = null;
    try {
      const res = await fetch(`${API_BASE}/api/user/${userId}/complete-lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonNumber: lesson.number }),
      });
      const data = await res.json();
      if (res.ok) completionData = data;
      if (res.ok && data.nextLesson) {
        nextLessonNumber = data.nextLesson;
      }
    } catch (err) {
      console.warn('⚠️ Не удалось завершить урок на сервере', err);
    }

    // 2. Загружаем данные следующего урока (для заголовка)
    let nextLessonTitle = 'Next Lesson';
    try {
      const res = await fetch(`${API_BASE}/api/user/${userId}/lesson/${nextLessonNumber}`);
      if (res.ok) {
        const data = await res.json();
        nextLessonTitle = data.title || `Lesson ${nextLessonNumber}`;
      }
    } catch (err) {
      console.warn('⚠️ Не удалось загрузить следующий урок', err);
    }

    // 3. Загружаем обновлённые данные пользователя (XP, streak)
    let userXP = 0;
    let streak = 0;
    try {
      const res = await fetch(`${API_BASE}/api/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        userXP = data.xp || 0;
        streak = data.streak || 0;
      }
    } catch (err) {
      console.warn('⚠️ Не удалось загрузить данные пользователя', err);
    }

    // 4. Загружаем daily goal (может вернуть 404 — используем fallback)
    let dailyGoal = 50;
    let dailyXP = 0;
    try {
      const res = await fetch(`${API_BASE}/api/user/${userId}/goal`);
      if (res.ok) {
        const data = await res.json();
        dailyGoal = data.daily_goal || 50;
        dailyXP = data.daily_xp || 0;
      }
    } catch (err) {
      console.warn('⚠️ Goal endpoint недоступен, используем fallback', err);
      dailyXP = parseInt(localStorage.getItem('dailyXP') || '30');
    }

    const xpEarned = completionData?.xpEarned ?? Number(lesson.xp_reward || 0);
    const totalXP = completionData?.totalXP ?? userXP;

    setCompleteData({
      lessonTitle: lesson.title,
      nextLessonTitle,
      xpEarned,
      accuracy,
      timeSpent: timeFormatted,
      correctAnswers: lessonStats.correctAnswers,
      totalAnswers: lessonStats.totalAnswers,
      totalXP,
      previousXP: completionData?.previousXP ?? totalXP - xpEarned,
      dailyXP,
      dailyGoal,
      streakDays: streak,
    });

    setCompleted(true);
    setCompleting(false);
  };

  // Loading
  if (loading) {
    return (
      <div className="lesson-task page-container">
        <div className="app-container">
          <p style={{ textAlign: 'center', marginTop: 100 }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  // Completing (идёт запрос к серверу)
  if (completing) {
    return (
      <div className="lesson-task page-container">
        <div className="app-container">
          <p style={{ textAlign: 'center', marginTop: 100 }}>Завершаем урок...</p>
        </div>
      </div>
    );
  }

  // Completed — показываем красивый экран
  if (completed && completeData) {
    return (
      <LessonComplete
        lessonTitle={completeData.lessonTitle}
        nextLessonTitle={completeData.nextLessonTitle}
        xpEarned={completeData.xpEarned}
        accuracy={completeData.accuracy}
        timeSpent={completeData.timeSpent}
        correctAnswers={completeData.correctAnswers}
        totalAnswers={completeData.totalAnswers}
        totalXP={completeData.totalXP}
        previousXP={completeData.previousXP}
        dailyXP={completeData.dailyXP}
        dailyGoal={completeData.dailyGoal}
        streakDays={completeData.streakDays}
        onNext={() => navigate(`/lesson/${lesson.number + 1}`)}
        onReview={() => navigate('/practice')}
      />
    );
  }

  // Нет заданий
  if (!currentTask) {
    return (
      <div className="lesson-task page-container">
        <div className="app-container">
          <p style={{ textAlign: 'center', marginTop: 100 }}>Задания не найдены</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-task page-container">
      <div className="app-container">
        {/* ШАПКА */}
        <div className="task-header">
          <button className="close-btn" onClick={() => navigate('/lesson')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#afafaf" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="task-progress-track">
            <div className="task-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="task-progress-label">
            {currentTaskIndex + 1} / {totalTasks}
          </span>
        </div>

        {/* МАСКОТ */}
        <div className="mascot-section">
          <div className="mascot">
            <img src={robot} width="80" height={80} alt="Robot" />
          </div>
          <div className="mascot-bubble">
            <p>{currentTask.explanation || "Let's practice!"}</p>
          </div>
        </div>

        {/* КОД (если есть переносы в вопросе) */}
        {currentTask.question.includes('\n') ? (
          <div className="code-block">
            <pre>{currentTask.question}</pre>
          </div>
        ) : (
          <h1 className="task-question-title">{currentTask.question}</h1>
        )}

        {/* ВАРИАНТЫ ОТВЕТОВ */}
        <div className="answer-options">
          {currentTask.options.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            return (
              <button
                key={idx}
                className={`answer-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  if (!feedback) setSelectedAnswer(option);
                }}
                disabled={!!feedback}
                type="button"
              >
                <div className="option-radio">
                  {isSelected && (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#58cc02" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="option-text">{option}</span>
              </button>
            );
          })}
        </div>

        {/* ОБРАТНАЯ СВЯЗЬ */}
        {feedback && (
          <div className={`task-feedback ${feedback}`}>
            <div className="feedback-header">
              <span className="feedback-icon">{feedback === 'correct' ? '✅' : '❌'}</span>
              <strong className="feedback-title">
                {feedback === 'correct' ? 'Great job!' : 'Not quite right'}
              </strong>
            </div>
            {feedback === 'wrong' && (
              <p className="feedback-explanation">
                Correct answer: <strong>{currentTask.correct_answer}</strong>
              </p>
            )}
          </div>
        )}

        {/* НАВИГАЦИЯ */}
        <nav className="bottom-nav">
          <div className={`task-footer ${feedback || ''}`}>
            {!feedback ? (
              <button
                className="task-check-btn"
                onClick={handleCheck}
                disabled={!selectedAnswer}
                type="button"
              >
                Check
              </button>
            ) : (
              <button
                className={`task-continue-btn ${feedback}`}
                onClick={handleContinue}
                type="button"
              >
                Continue
              </button>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
