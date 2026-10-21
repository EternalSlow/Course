import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './style/style.css';

const API_BASE = '/api';

export default function Settings() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || '');
  const [language, setLanguage] = useState('Python');
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.body.classList.add('settings');
    return () => document.body.classList.remove('settings');
  }, []);

  useEffect(() => {
    if (!user?.userId) return;
    fetch(`${API_BASE}/user/${user.userId}`)
      .then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить настройки');
        return response.json();
      })
      .then((profile) => {
        setUsername(profile.username || '');
        setLanguage(profile.language || 'Python');
      })
      .catch(() => setError('Не удалось загрузить настройки.'))
      .finally(() => setLoading(false));
  }, [user?.userId]);

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);

    try {
      const profileResponse = await fetch(`${API_BASE}/user/${user.userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const profileData = await profileResponse.json();
      if (!profileResponse.ok) throw new Error(profileData.error || 'Не удалось изменить имя.');

      const languageResponse = await fetch(`${API_BASE}/user/${user.userId}/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const languageData = await languageResponse.json();
      if (!languageResponse.ok) throw new Error(languageData.error || 'Не удалось изменить язык.');

      if (avatar) {
        const formData = new FormData();
        formData.append('avatar', avatar);
        const avatarResponse = await fetch(`${API_BASE}/user/${user.userId}/avatar`, {
          method: 'POST',
          body: formData,
        });
        const avatarData = await avatarResponse.json();
        if (!avatarResponse.ok) throw new Error(avatarData.error || 'Не удалось изменить аватар.');
      }

      login({ ...user, username: profileData.username });
      setAvatar(null);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof TypeError
        ? 'Не удалось связаться с сервером. Проверьте соединение.'
        : saveError.message || 'Не удалось сохранить настройки.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/first-page', { replace: true });
  };

  return (
    <div className="settings page-container">
      <div className="app-container settings-content">
        <Link className="settings-back" to="/profile">← Профиль</Link>
        <h1 className="header-title">Настройки</h1>

        {loading ? <p>Загрузка настроек...</p> : (
          <form className="settings-form" onSubmit={handleSave}>
            <label className="settings-field">
              <span>Имя</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                maxLength={32}
                autoComplete="username"
                required
              />
            </label>

            <label className="settings-field">
              <span>Язык программирования</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="Python">Python</option>
                <option value="JavaScript">JavaScript</option>
                <option value="TypeScript">TypeScript</option>
              </select>
            </label>

            <label className="settings-field">
              <span>Аватар</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => setAvatar(event.target.files?.[0] || null)}
              />
            </label>

            {error && <p className="settings-error" role="alert">{error}</p>}
            {saved && <p className="settings-success" role="status">Настройки сохранены.</p>}

            <button className="btn-primary green" type="submit" disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить настройки'}
            </button>
          </form>
        )}

        <button className="settings-logout" type="button" onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  );
}