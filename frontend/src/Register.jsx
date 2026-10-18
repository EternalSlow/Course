import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './style/App.css';
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
        username,
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
    <div className="auth-container">
      <h2>Создайте аккаунт</h2>
      <p className="subtitle">Начните свой путь в программировании</p>

      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          minLength={3}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
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

        {error && <p className="form-error">{error}</p>}

        <button
          type="submit"
          className="btn-primary green"
          disabled={loading}
        >
          {loading ? 'Регистрация…' : 'Зарегистрироваться'}
        </button>
      </form>

      <p style={{ marginTop: 12, textAlign: 'center' }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
};

export default Register;