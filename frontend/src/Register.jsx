import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './style/style.css';
import { useAuth } from './AuthContext';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth(); // ✅ хук на верхнем уровне компонента

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Не удалось зарегистрироваться');
        return;
      }

      // ✅ данные берём из ответа сервера + локальный username
      login({
        token: data.token,
        userId: data.userId,
        username: data.username || username,
      });
      // ✅ localStorage не трогаем — это уже делает AuthContext.login()

      navigate('/select-language', { replace: true });
    } catch (err) {
      setError('Не удалось связаться с сервером. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page page-container">
      <div className="app-container auth-panel">
      <p className="course-tag">Byte</p>
      <h1 className="header-title">Создайте аккаунт</h1>
      <p className="auth-subtitle">Начните свой путь в программировании</p>

      <form className="auth-form" onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          maxLength={254}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={6}
        />

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button
          type="submit"
          className="btn-primary green"
          disabled={loading}
        >
          {loading ? 'Регистрация…' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="auth-switch">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
      </div>
    </div>
  );
};

export default Register;