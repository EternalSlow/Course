import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './style/style.css';

const API_BASE = 'http://localhost:5000/api';

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
        if (!response.ok) throw new Error('Unable to load settings');
        return response.json();
      })
      .then((profile) => {
        setUsername(profile.username || '');
        setLanguage(profile.language || 'Python');
      })
      .catch(() => setError('Unable to load your settings.'))
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
      if (!profileResponse.ok) throw new Error(profileData.error || 'Unable to update your name.');

      const languageResponse = await fetch(`${API_BASE}/user/${user.userId}/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const languageData = await languageResponse.json();
      if (!languageResponse.ok) throw new Error(languageData.error || 'Unable to update your language.');

      if (avatar) {
        const formData = new FormData();
        formData.append('avatar', avatar);
        const avatarResponse = await fetch(`${API_BASE}/user/${user.userId}/avatar`, {
          method: 'POST',
          body: formData,
        });
        const avatarData = await avatarResponse.json();
        if (!avatarResponse.ok) throw new Error(avatarData.error || 'Unable to update your icon.');
      }

      login({ ...user, username: profileData.username });
      setAvatar(null);
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your settings.');
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
        <Link className="settings-back" to="/profile">← Profile</Link>
        <h1 className="header-title">Settings</h1>

        {loading ? <p>Loading settings...</p> : (
          <form className="settings-form" onSubmit={handleSave}>
            <label className="settings-field">
              <span>Name</span>
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
              <span>Programming language</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="Python">Python</option>
                <option value="JavaScript">JavaScript</option>
              </select>
            </label>

            <label className="settings-field">
              <span>Your icon</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => setAvatar(event.target.files?.[0] || null)}
              />
            </label>

            {error && <p className="settings-error" role="alert">{error}</p>}
            {saved && <p className="settings-success" role="status">Settings saved.</p>}

            <button className="btn-primary green" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </form>
        )}

        <button className="settings-logout" type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}