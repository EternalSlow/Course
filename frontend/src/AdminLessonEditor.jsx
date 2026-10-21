import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './style/style.css';

const API_BASE = '/api';
const emptyTask = () => ({ code: '', question: '', correct_answer: '', options: '', explanation: '' });
const emptyLesson = () => ({
  language: 'Python',
  lesson_number: '',
  title: '',
  subtitle: '',
  content: '',
  xp_reward: 50,
});

async function lessonApi(token, path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос');
  return data;
}

function toTaskForm(task) {
  return {
    code: task.code || '',
    question: task.question || '',
    correct_answer: task.correct_answer || '',
    options: (task.options || []).join('\n'),
    explanation: task.explanation || '',
  };
}

export default function AdminLessonEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [lesson, setLesson] = useState(emptyLesson);
  const [tasks, setTasks] = useState([emptyTask()]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.add('admin');
    return () => document.body.classList.remove('admin');
  }, []);

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    lessonApi(user?.token, `/admin/lessons/${id}`)
      .then(({ lesson: lessonData, tasks: taskData }) => {
        if (!active) return;
        setLesson({
          language: lessonData.language,
          lesson_number: lessonData.lesson_number,
          title: lessonData.title,
          subtitle: lessonData.subtitle || '',
          content: lessonData.content || '',
          xp_reward: lessonData.xp_reward,
        });
        setTasks(taskData.map(toTaskForm));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [editing, id, user?.token]);

  const updateTask = (index, field, value) => {
    setTasks((current) => current.map((task, taskIndex) => (
      taskIndex === index ? { ...task, [field]: value } : task
    )));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...lesson,
      tasks: tasks.map((task) => ({
        ...task,
        options: task.options.split('\n').map((option) => option.trim()).filter(Boolean),
      })),
    };

    try {
      await lessonApi(user?.token, editing ? `/admin/lessons/${id}` : '/admin/lessons', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      navigate('/admin', { replace: true });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const previewTask = tasks[0] || emptyTask();
  const previewOptions = previewTask.options.split('\n').map((option) => option.trim()).filter(Boolean);

  return (
    <div className="admin page-container">
      <div className="app-container admin-content">
        <header className="admin-header">
          <div>
            <button className="admin-secondary" type="button" onClick={() => navigate('/admin')}>← К панели</button>
            <h1 className="header-title">{editing ? 'Изменить урок' : 'Создать урок'}</h1>
          </div>
        </header>

        {loading ? <p>Загрузка урока...</p> : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-row">
              <label className="admin-editor-field">
                Язык
                <select value={lesson.language} onChange={(event) => setLesson({ ...lesson, language: event.target.value })} disabled={editing}>
                  <option>Python</option>
                  <option>JavaScript</option>
                  <option>TypeScript</option>
                </select>
              </label>
              <label className="admin-editor-field">
                Номер урока
                <input type="number" min="1" value={lesson.lesson_number} onChange={(event) => setLesson({ ...lesson, lesson_number: Number(event.target.value) })} disabled={editing} required />
              </label>
            </div>
            <label className="admin-editor-field">
              Название
              <input value={lesson.title} onChange={(event) => setLesson({ ...lesson, title: event.target.value })} maxLength={100} required />
            </label>
            <label className="admin-editor-field">
              Подзаголовок
              <input value={lesson.subtitle} onChange={(event) => setLesson({ ...lesson, subtitle: event.target.value })} maxLength={180} />
            </label>
            <label className="admin-editor-field">
              Содержание урока
              <textarea value={lesson.content} onChange={(event) => setLesson({ ...lesson, content: event.target.value })} maxLength={5000} />
            </label>
            <label className="admin-inline-field">
              Награда XP
              <input type="number" min="0" max="10000" value={lesson.xp_reward} onChange={(event) => setLesson({ ...lesson, xp_reward: Number(event.target.value) })} required />
            </label>

            <section className="admin-editor-tasks">
              <h2>Задания</h2>
              {tasks.map((task, index) => {
                const options = task.options.split('\n').map((option) => option.trim()).filter(Boolean);
                return (
                  <fieldset className="admin-task" key={index}>
                    <legend>Задание {index + 1}</legend>
                    <label className="admin-editor-field">
                      Блок кода (необязательно)
                      <textarea value={task.code} onChange={(event) => updateTask(index, 'code', event.target.value)} maxLength={2000} />
                    </label>
                    <label className="admin-editor-field">
                      Вопрос
                      <textarea value={task.question} onChange={(event) => updateTask(index, 'question', event.target.value)} maxLength={1000} required />
                    </label>
                    <label className="admin-editor-field">
                      Варианты ответа (каждый с новой строки)
                      <textarea value={task.options} onChange={(event) => updateTask(index, 'options', event.target.value)} maxLength={1540} required />
                    </label>
                    <label className="admin-editor-field">
                      Правильный вариант
                      <select value={task.correct_answer} onChange={(event) => updateTask(index, 'correct_answer', event.target.value)} required>
                        <option value="">Выберите вариант ответа</option>
                        {options.map((option, optionIndex) => <option key={`${option}-${optionIndex}`} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="admin-editor-field">
                      Объяснение (необязательно)
                      <textarea value={task.explanation} onChange={(event) => updateTask(index, 'explanation', event.target.value)} maxLength={500} />
                    </label>
                    {tasks.length > 1 && (
                      <button className="admin-secondary" type="button" onClick={() => setTasks((current) => current.filter((_, taskIndex) => taskIndex !== index))}>
                        Удалить задание
                      </button>
                    )}
                  </fieldset>
                );
              })}
              <button className="admin-secondary" type="button" onClick={() => setTasks((current) => [...current, emptyTask()])} disabled={tasks.length >= 30}>
                Добавить задание
              </button>
            </section>

            <section className="admin-task-preview" aria-label="Предпросмотр задания">
              <h2>Предпросмотр</h2>
              {previewTask.code && <pre className="code-block"><code>{previewTask.code}</code></pre>}
              <h3>{previewTask.question || 'Текст вопроса появится здесь'}</h3>
              <div className="admin-preview-options">
                {previewOptions.map((option, index) => <span key={`${option}-${index}`}>{option}</span>)}
                {previewOptions.length === 0 && <span>Варианты ответа появятся здесь</span>}
              </div>
            </section>

            {error && <p className="admin-error" role="alert">{error}</p>}
            <button className="btn-primary green" type="submit" disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить урок'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
