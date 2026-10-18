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
    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Ошибка');
    doLogin({ token: data.token, userId: data.userId, username: data.username });
    navigate('/home');
  };

  return (
    <div className="page-container">
      <div className="app-container" style={{ padding: 24 }}>
        <h1 className="page-title">Вход</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          <input value={login} onChange={(e) => setLogin(e.target.value)}
                 placeholder="Email или username" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                 placeholder="Пароль" required />
          {error && <p style={{ color: '#ff4b4b' }}>{error}</p>}
          <button type="submit" className="btn-primary green">Войти</button>
        </form>
        <p style={{ marginTop: 12, textAlign: 'center' }}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}