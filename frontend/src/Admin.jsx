import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { API_BASE, apiFetch, assetUrl } from './api';
import './style/style.css';

async function adminApi(token, path, options = {}) {
  const headers = { Authorization: `Bearer ${token}`, ...options.headers };
  const response = await apiFetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос');
  return data;
}

export default function Admin() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '' });
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
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    try {
      await adminApi(user?.token, '/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      login({ ...user, mustChangePassword: false });
      setNewPassword('');
      setConfirmPassword('');
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
    const username = window.prompt('Новое имя пользователя', targetUser.username);
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
    if (!window.confirm(`Удалить пользователя ${targetUser.username}?`)) return;
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

  const handleDeleteLesson = async (lesson) => {
    if (!window.confirm(`Удалить урок «${lesson.title}»?`)) return;
    setError('');
    try {
      await adminApi(user?.token, `/admin/lessons/${lesson.id}`, { method: 'DELETE' });
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  if (!user?.isAdmin) {
    return <div className="admin page-container"><div className="app-container admin-content"><p>Требуется доступ администратора.</p></div></div>;
  }

  if (user.mustChangePassword) {
    return (
      <div className="admin page-container">
        <div className="app-container admin-content">
          <p className="course-tag">Учётная запись администратора</p>
          <h1 className="header-title">Измените пароль</h1>
          <p className="admin-copy">Задайте новый пароль, чтобы открыть панель администратора.</p>
          <form className="admin-form" onSubmit={handlePasswordChange}>
            <input type="password" placeholder="Новый пароль (не менее 12 символов)" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} autoComplete="new-password" required />
            <input type="password" placeholder="Повторите новый пароль" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} autoComplete="new-password" required />
            {error && <p className="admin-error" role="alert">{error}</p>}
            <button className="btn-primary green" type="submit">Изменить пароль</button>
          </form>
          <button className="settings-logout" type="button" onClick={() => { logout(); navigate('/login'); }}>Выйти</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin page-container">
      <div className="app-container admin-content">
        <header className="admin-header">
          <div><p className="course-tag">Byte</p><h1 className="header-title">Администратор</h1></div>
          <button className="settings-logout admin-logout" type="button" onClick={() => { logout(); navigate('/login'); }}>Выйти</button>
        </header>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {loading ? <p>Загрузка данных...</p> : (
          <>
            <section className="admin-section">
              <h2>Пользователи</h2>
              <form className="admin-form" onSubmit={handleCreateUser}>
                <input placeholder="Имя" value={userForm.username} onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} minLength={3} maxLength={32} required />
                <input type="email" placeholder="Электронная почта" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} maxLength={254} required />
                <input type="password" placeholder="Временный пароль" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} minLength={8} required />
                <button className="btn-primary green" type="submit">Создать пользователя</button>
              </form>
              <div className="admin-list">
                {users.map((item) => (
                  <article className="admin-row" key={item.id}>
                    <div className="admin-user-info">
                      {item.avatar && <img src={assetUrl(item.avatar)} alt="" />}
                      <div><strong>{item.username}</strong><span>{item.email}</span></div>
                    </div>
                    <div className="admin-actions">
                      <button type="button" onClick={() => handleRenameUser(item)}>Изменить имя</button>
                      <label className="admin-upload">Аватар<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => handleUserAvatar(item, event.target.files?.[0])} /></label>
                      {item.avatar && <button type="button" onClick={() => handleDeleteAvatar(item)}>Удалить аватар</button>}
                      {!item.is_admin && <button type="button" onClick={() => handleDeleteUser(item)}>Удалить</button>}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-section">
              <h2>Уроки</h2>
              <button className="btn-primary green" type="button" onClick={() => navigate('/admin/lessons/new')}>
                Создать урок
              </button>
              <div className="admin-list">
                {lessons.map((lesson) => (
                  <article className="admin-row" key={lesson.id}>
                    <div><strong>{lesson.title}</strong><span>{lesson.language} · Урок {lesson.lesson_number} · {lesson.xp_reward} XP</span></div>
                    <div className="admin-actions">
                      <button type="button" onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)}>Изменить</button>
                      <button type="button" onClick={() => handleDeleteLesson(lesson)}>Удалить</button>
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