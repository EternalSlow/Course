import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './style/style.css';
import robot from './assets/robot.svg';


// Fallback данные — работают БЕЗ сервера
const FALLBACK_LESSON = {
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

export default function LessonTask() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(FALLBACK_LESSON);
  const [tasks, setTasks] = useState(FALLBACK_TASKS);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    console.log('📦 LessonTask mounted, id =', id);

    // Пытаемся загрузить с сервера, но fallback уже установлен
    fetch(`http://localhost:5000/api/user/1/lesson/${id}/tasks`)
      .then(res => res.json())
      .then(data => {
        console.log('📡 Данные с сервера:', data);
        if (data.lesson && data.tasks && data.tasks.length > 0) {
          setLesson(data.lesson);
          setTasks(data.tasks);
        } else {
          console.warn('⚠️ Сервер вернул пустые данные, используем fallback');
        }
      })
      .catch(err => {
        console.warn('⚠️ Сервер недоступен, используем fallback данные');
      })
      .finally(() => {
        setLoading(false);
        console.log('✅ Loading finished');
      });
  }, [id]);

  const currentTask = tasks[currentTaskIndex];
  const totalTasks = tasks.length;
  const progressPercent = ((currentTaskIndex) / totalTasks) * 100;

  console.log(' currentTask:', currentTask);
  console.log('📊 currentTaskIndex:', currentTaskIndex, 'totalTasks:', totalTasks);

  const handleCheck = () => {
    if (!selectedAnswer || !currentTask) return;
    const isCorrect = selectedAnswer === currentTask.correct_answer;
    console.log('✅ Проверка:', selectedAnswer, '===', currentTask.correct_answer, '→', isCorrect);
    setFeedback(isCorrect ? 'correct' : 'wrong');
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
      setCompleted(true);
    }
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

  // Completed
  if (completed) {
    return (
      <div className="lesson-task page-container">
        <div className="app-container lesson-complete">
          <div className="complete-icon">🎉</div>
          <h1 className="complete-title">Lesson complete!</h1>
          <p className="complete-subtitle">You earned {lesson.xp_reward} XP</p>
          <button className="task-continue-btn correct" onClick={() => navigate('/lesson')}>
            Continue
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
            <img src={robot} width="80"height={80} ></img>
          </div>
          <div className="mascot-bubble">
            <p>{currentTask.explanation || "Let's practice!"}</p>
          </div>
        </div>

        {/* КОД (если есть переносы в вопросе) */}
        {currentTask.question.includes('\n') ? (
          <>
            <div className="code-block">
              <pre>{currentTask.question}</pre>
            </div>
          </>
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
      <nav class="bottom-nav">
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