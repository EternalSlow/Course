import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './style/style.css';

const API_BASE = 'http://localhost:5000/api';
const emptyTask = () => ({ question: '', correct_answer: '', options: '', explanation: '' });

async function adminApi(token, path, options = {}) {
  const headers = { Authorization: `Bearer ${token}`, ...options.headers };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function Admin() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '' });
  const [lessonForm, setLessonForm] = useState({
    language: 'Python', lesson_number: '', title: '', subtitle: '', content: '', xp_reward: 50,
  });
  const [tasks, setTasks] = useState([emptyTask()]);
  const [editingLessonId, setEditingLessonId] = useState(null);

  const loadData = useCallback(async () => {
    const [userData, lessonData] = await Promise.all([
      adminApi(user?.token, '/admin/users'),
      adminApi(user?.token, '/admin/lessons'),
    ]);
    setUsers(userData.users);
    setLessons(lessonData.lessons);
  }, [user?.token]);

  useEffect(() => {
    document.body.classList.add('admin');
    return () => document.body.classList.remove('admin');
  }, []);

  useEffect(() => {
    if (!user?.isAdmin || user.mustChangePassword) return;
    let active = true;
    Promise.all([
      adminApi(user.token, '/admin/users'),
      adminApi(user.token, '/admin/lessons'),
    ])
      .then(([userData, lessonData]) => {
        if (!active) return;
        setUsers(userData.users);
        setLessons(lessonData.lessons);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user?.isAdmin, user?.mustChangePassword, user?.token]);

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await adminApi(user?.token, '/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      login({ ...user, mustChangePassword: false });
      setCurrentPassword('');
      setNewPassword('');
      await loadData();
    } catch (changeError) {
      setError(changeError.message);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await adminApi(user?.token, '/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      setUserForm({ username: '', email: '', password: '' });
      await loadData();
    } catch (createError) {
      setError(createError.message);
    }
  };

  const handleRenameUser = async (targetUser) => {
    const username = window.prompt('New user name', targetUser.username);
    if (!username || username === targetUser.username) return;
    setError('');
    try {
      await adminApi(user?.token, `/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      await loadData();
    } catch (renameError) {
      setError(renameError.message);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Delete ${targetUser.username}?`)) return;
    setError('');
    try {
      await adminApi(user?.token, `/admin/users/${targetUser.id}`, { method: 'DELETE' });
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleUserAvatar = async (targetUser, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    setError('');
    try {
      await adminApi(user?.token, `/admin/users/${targetUser.id}/avatar`, { method: 'POST', body: formData });
      await loadData();
    } catch (avatarError) {
      setError(avatarError.message);
    }
  };

  const handleDeleteAvatar = async (targetUser) => {
    setError('');
    try {
      await adminApi(user?.token, `/admin/users/${targetUser.id}/avatar`, { method: 'DELETE' });
      await loadData();
    } catch (avatarError) {
      setError(avatarError.message);
    }
  };

  const handleLessonSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = { ...lessonForm };
    if (!editingLessonId) {
      payload.tasks = tasks.map((task) => ({
        ...task,
        options: task.options.split(',').map((option) => option.trim()).filter(Boolean),
      }));
    }
    try {
      await adminApi(user?.token, editingLessonId ? `/admin/lessons/${editingLessonId}` : '/admin/lessons', {
        method: editingLessonId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setEditingLessonId(null);
      setLessonForm({ language: 'Python', lesson_number: '', title: '', subtitle: '', content: '', xp_reward: 50 });
      setTasks([emptyTask()]);
      await loadData();
    } catch (lessonError) {
      setError(lessonError.message);
    }
  };

  const handleEditLesson = (lesson) => {
    setEditingLessonId(lesson.id);
    setLessonForm({
      language: lesson.language,
      lesson_number: lesson.lesson_number,
      title: lesson.title,
      subtitle: lesson.subtitle || '',
      content: lesson.content || '',
      xp_reward: lesson.xp_reward,
    });
  };

  const handleDeleteLesson = async (lesson) => {
    if (!window.confirm(`Delete ${lesson.title}?`)) return;
    setError('');
    try {
      await adminApi(user?.token, `/admin/lessons/${lesson.id}`, { method: 'DELETE' });
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  if (!user?.isAdmin) {
    return <div className="admin page-container"><div className="app-container admin-content"><p>Admin access required.</p></div></div>;
  }

  if (user.mustChangePassword) {
    return (
      <div className="admin page-container">
        <div className="app-container admin-content">
          <p className="course-tag">Admin account</p>
          <h1 className="header-title">Change your password</h1>
          <p className="admin-copy">Set a new password before you use the admin panel.</p>
          <form className="admin-form" onSubmit={handlePasswordChange}>
            <input type="password" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
            <input type="password" placeholder="New password (12 characters minimum)" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} autoComplete="new-password" required />
            {error && <p className="admin-error" role="alert">{error}</p>}
            <button className="btn-primary green" type="submit">Update password</button>
          </form>
          <button className="settings-logout" type="button" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin page-container">
      <div className="app-container admin-content">
        <header className="admin-header">
          <div><p className="course-tag">Byte</p><h1 className="header-title">Admin</h1></div>
          <button className="settings-logout admin-logout" type="button" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </header>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {loading ? <p>Loading admin data...</p> : (
          <>
            <section className="admin-section">
              <h2>Users</h2>
              <form className="admin-form" onSubmit={handleCreateUser}>
                <input placeholder="Name" value={userForm.username} onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} minLength={3} required />
                <input type="email" placeholder="Email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} required />
                <input type="password" placeholder="Temporary password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} minLength={8} required />
                <button className="btn-primary green" type="submit">Create user</button>
              </form>
              <div className="admin-list">
                {users.map((item) => (
                  <article className="admin-row" key={item.id}>
                    <div className="admin-user-info">
                      {item.avatar && <img src={`http://localhost:5000${item.avatar}`} alt="" />}
                      <div><strong>{item.username}</strong><span>{item.email}</span></div>
                    </div>
                    <div className="admin-actions">
                      <button type="button" onClick={() => handleRenameUser(item)}>Rename</button>
                      <label className="admin-upload">Icon<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => handleUserAvatar(item, event.target.files?.[0])} /></label>
                      {item.avatar && <button type="button" onClick={() => handleDeleteAvatar(item)}>Remove icon</button>}
                      {!item.is_admin && <button type="button" onClick={() => handleDeleteUser(item)}>Delete</button>}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-section">
              <h2>{editingLessonId ? 'Edit lesson' : 'Create lesson'}</h2>
              <form className="admin-form" onSubmit={handleLessonSubmit}>
                <div className="admin-form-row">
                  <select value={lessonForm.language} onChange={(event) => setLessonForm({ ...lessonForm, language: event.target.value })} disabled={Boolean(editingLessonId)}>
                    <option>Python</option><option>JavaScript</option>
                  </select>
                  <input type="number" min="1" placeholder="Lesson number" value={lessonForm.lesson_number} onChange={(event) => setLessonForm({ ...lessonForm, lesson_number: Number(event.target.value) })} disabled={Boolean(editingLessonId)} required />
                </div>
                <input placeholder="Lesson title" value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} required />
                <input placeholder="Subtitle" value={lessonForm.subtitle} onChange={(event) => setLessonForm({ ...lessonForm, subtitle: event.target.value })} />
                <textarea placeholder="Lesson content" value={lessonForm.content} onChange={(event) => setLessonForm({ ...lessonForm, content: event.target.value })} />
                <label className="admin-inline-field">XP reward<input type="number" min="0" value={lessonForm.xp_reward} onChange={(event) => setLessonForm({ ...lessonForm, xp_reward: Number(event.target.value) })} /></label>
                {!editingLessonId && tasks.map((task, index) => (
                  <div className="admin-task" key={index}>
                    <h3>Task {index + 1}</h3>
                    <textarea placeholder="Question" value={task.question} onChange={(event) => setTasks(tasks.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item))} required />
                    <input placeholder="Options, separated by commas" value={task.options} onChange={(event) => setTasks(tasks.map((item, itemIndex) => itemIndex === index ? { ...item, options: event.target.value } : item))} required />
                    <input placeholder="Correct answer" value={task.correct_answer} onChange={(event) => setTasks(tasks.map((item, itemIndex) => itemIndex === index ? { ...item, correct_answer: event.target.value } : item))} required />
                    <input placeholder="Explanation" value={task.explanation} onChange={(event) => setTasks(tasks.map((item, itemIndex) => itemIndex === index ? { ...item, explanation: event.target.value } : item))} />
                    {tasks.length > 1 && <button type="button" onClick={() => setTasks(tasks.filter((_, itemIndex) => itemIndex !== index))}>Remove task</button>}
                  </div>
                ))}
                {!editingLessonId && <button type="button" className="admin-secondary" onClick={() => setTasks([...tasks, emptyTask()])}>Add task</button>}
                <button className="btn-primary green" type="submit">{editingLessonId ? 'Save lesson' : 'Create lesson'}</button>
                {editingLessonId && <button type="button" className="admin-secondary" onClick={() => { setEditingLessonId(null); setLessonForm({ language: 'Python', lesson_number: '', title: '', subtitle: '', content: '', xp_reward: 50 }); }}>Cancel</button>}
              </form>
              <div className="admin-list">
                {lessons.map((lesson) => (
                  <article className="admin-row" key={lesson.id}>
                    <div><strong>{lesson.title}</strong><span>{lesson.language} · Lesson {lesson.lesson_number} · {lesson.xp_reward} XP</span></div>
                    <div className="admin-actions">
                      <button type="button" onClick={() => handleEditLesson(lesson)}>Edit</button>
                      <button type="button" onClick={() => handleDeleteLesson(lesson)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}