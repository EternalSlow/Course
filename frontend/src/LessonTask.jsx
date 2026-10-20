import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './style/style.css';
import robot from './assets/robot.svg';
import LessonComplete from './LessonComplete';

// Fallback данные — работают БЕЗ сервера
const FALLBACK_LESSON = {
  id: 3,
  number: 3,
  title: 'Условия',
  subtitle: 'Принимайте решения с помощью кода',
  xp_reward: 50,
};

const FALLBACK_TASKS = [
  {
    id: 1,
    type: 'multiple_choice',
    question: 'Какое ключевое слово проверяет условие в Python?',
    options: ['if', 'when', 'check', 'loop'],
    correct_answer: 'if',
    explanation: 'Ключевое слово «if» проверяет условия в Python.',
  },
  {
    id: 2,
    type: 'multiple_choice',
    question: 'Что выведет этот код?\n\nif age > 18:\n    print("Adult")\n\nage = 20',
    options: ['Adult', 'Child', 'Nothing', 'Error'],
    correct_answer: 'Adult',
    explanation: 'Так как 20 > 18, условие истинно.',
  },
  {
    id: 3,
    type: 'multiple_choice',
    question: 'Какой вариант записи на Python правильный?',
    options: ['if x > 5:', 'if (x > 5)', 'if x > 5 then:', 'when x > 5:'],
    correct_answer: 'if x > 5:',
    explanation: 'В Python после условия if ставится двоеточие.',
  },
];

const API_BASE = 'http://localhost:5000';

export default function LessonTask() {
  const { id } = useParams(); // номер урока из URL
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.userId;
  const practiceTaskId = Number(searchParams.get('practice'));
  const practiceMode = Number.isSafeInteger(practiceTaskId) && practiceTaskId > 0;

  const [lesson, setLesson] = useState(FALLBACK_LESSON);
  const [tasks, setTasks] = useState(FALLBACK_TASKS);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [answerError, setAnswerError] = useState('');
  const [loading, setLoading] = useState(true);
  const [answerTrackingReady, setAnswerTrackingReady] = useState(false);
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
    setAnswerTrackingReady(false);
    setLesson(FALLBACK_LESSON);
    setTasks(FALLBACK_TASKS);
    setCurrentTaskIndex(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setAnswerError('');
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

    const taskUrl = practiceMode
      ? `${API_BASE}/api/user/${userId}/practice/${practiceTaskId}`
      : `${API_BASE}/api/user/${userId}/lesson/${id}/tasks`;
    fetch(taskUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Unable to load lesson tasks (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (practiceMode && data.lesson && data.task) {
          setAnswerTrackingReady(true);
          setLesson({
            id: data.lesson.id,
            number: data.lesson.number,
            title: data.lesson.title,
            subtitle: data.lesson.subtitle,
            xp_reward: data.lesson.xp_reward,
          });
          setTasks([data.task]);
        } else if (data.lesson && Array.isArray(data.tasks) && data.tasks.length > 0) {
          setAnswerTrackingReady(true);
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
          if (practiceMode) setTasks([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, practiceMode, practiceTaskId, userId]);

  const currentTask = tasks[currentTaskIndex];
  const totalTasks = tasks.length;
  const progressPercent = (currentTaskIndex / totalTasks) * 100;

  const handleCheck = async () => {
    if (!selectedAnswer || !currentTask) return;

    setAnswerError('');
    let isCorrect = selectedAnswer === currentTask.correct_answer;
    if (userId && currentTask.id && answerTrackingReady) {
      try {
        const response = await fetch(`${API_BASE}/api/user/${userId}/task/${currentTask.id}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: selectedAnswer }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Не удалось сохранить ответ');
        isCorrect = data.correct;
      } catch (requestError) {
        setAnswerError(requestError instanceof TypeError
          ? 'Не удалось сохранить ответ. Проверьте соединение и попробуйте ещё раз.'
          : `Не удалось сохранить ответ. ${requestError.message}`);
        if (practiceMode) return;
      }
    }
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
      if (practiceMode) {
        setCompleted(true);
        return;
      }
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
    let nextLessonTitle = 'Следующий урок';
    try {
      const res = await fetch(`${API_BASE}/api/user/${userId}/lesson/${nextLessonNumber}`);
      if (res.ok) {
        const data = await res.json();
        nextLessonTitle = data.title || `Урок ${nextLessonNumber}`;
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

  if (completed && practiceMode) {
    return (
      <div className="lesson-complete page-container">
        <div className="app-container">
          <h1 className="complete-title">Отлично!</h1>
          <p className="complete-subtitle">Вы ответили правильно. Вопрос удалён из списка повторения.</p>
          <button className="btn-primary green" type="button" onClick={() => navigate('/practice')}>
            Вернуться к практике
          </button>
        </div>
      </div>
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
          <button
            className="close-btn"
            aria-label="Закрыть урок"
            onClick={() => {
              const message = practiceMode
                ? 'Выйти из повтора? Вопрос останется в списке.'
                : 'Закрыть урок? Текущий прогресс не сохранится.';
              if (window.confirm(message)) {
                navigate('/lesson');
              }
            }}
          >
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
            <img src={robot} width="80" height={80} alt="Робот" />
          </div>
          <div className="mascot-bubble">
            <p>{currentTask.explanation || 'Давайте попрактикуемся!'}</p>
          </div>
        </div>

        {currentTask.code && (
          <div className="code-block">
            <pre>{currentTask.code}</pre>
          </div>
        )}
        {currentTask.question.includes('\n') && !currentTask.code ? (
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

        {answerError && <p className="error-banner" role="alert">{answerError}</p>}

        {/* ОБРАТНАЯ СВЯЗЬ */}
        {feedback && (
          <div className={`task-feedback ${feedback}`}>
            <div className="feedback-header">
              <span className="feedback-icon">{feedback === 'correct' ? '✅' : '❌'}</span>
              <strong className="feedback-title">
                {feedback === 'correct' ? 'Отлично!' : 'Почти получилось'}
              </strong>
            </div>
            {feedback === 'wrong' && (
              <p className="feedback-explanation">
                Правильный ответ: <strong>{currentTask.correct_answer}</strong>
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
                Проверить
              </button>
            ) : (
              <button
                className={`task-continue-btn ${feedback}`}
                onClick={handleContinue}
                type="button"
              >
                Продолжить
              </button>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
