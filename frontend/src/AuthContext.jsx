import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // При загрузке приложения читаем localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');

    if (token && userId) {
      setUser({
        token,
        userId: Number(userId),
        username: username || '',
        isAdmin: localStorage.getItem('isAdmin') === 'true',
        mustChangePassword: localStorage.getItem('mustChangePassword') === 'true',
      });
    }
    setLoading(false);
  }, []);

  const login = ({ token, userId, username, isAdmin = false, mustChangePassword = false }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', String(userId));
    localStorage.setItem('username', username || '');
    localStorage.setItem('isAdmin', String(isAdmin));
    localStorage.setItem('mustChangePassword', String(mustChangePassword));
    setUser({ token, userId: Number(userId), username: username || '', isAdmin, mustChangePassword });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('mustChangePassword');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);