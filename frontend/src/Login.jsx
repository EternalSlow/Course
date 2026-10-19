import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './style/style.css';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login: doLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Ошибка');
      doLogin({ ...data, isAdmin: data.isAdmin, mustChangePassword: data.mustChangePassword });
      navigate(data.isAdmin ? '/admin' : '/home', { replace: true });
    } catch {
      setError('Не удалось связаться с сервером. Проверьте соединение.');
    }
  };

  return (
    <div className="auth-page page-container">
      <div className="app-container auth-panel">
        <p className="course-tag">Byte</p>
        <h1 className="header-title">Вход</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input value={login} onChange={(e) => setLogin(e.target.value)}
                 placeholder="Email или username" autoComplete="username" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                 placeholder="Пароль" autoComplete="current-password" required />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="btn-primary green">Войти</button>
        </form>
        <p className="auth-switch">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}