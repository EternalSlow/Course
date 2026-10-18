import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style/App.css';

const languages = [
  { id: 'python', name: 'Python', icon: '🐍', color: '#306998' },
  { id: 'javascript', name: 'JavaScript', icon: '🟨', color: '#f7df1e' },
  { id: 'java', name: 'Java', icon: '☕', color: '#007396' },
  { id: 'cpp', name: 'C++', icon: '⚙️', color: '#00599C' },
];

const LanguageSelection = () => {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const handleSelect = async (lang) => {
    setSelected(lang.name);
    const response = await fetch(`http://localhost:5000/api/user/${userId}/language`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang.name }),
    });
    
    if (response.ok) {
      // Небольшая задержка для визуального подтверждения выбора
      setTimeout(() => navigate('/home'), 600); 
    }
  };

  return (
    <div className="language-container">
      <h2>Выберите язык программирования</h2>
      <p className="subtitle">Это настроит вашу персональную программу обучения.</p>
      <div className="language-grid">
        {languages.map((lang) => (
          <div
            key={lang.id}
            className={`language-card ${selected === lang.name ? 'selected' : ''}`}
            onClick={() => handleSelect(lang)}
            style={{ 
              borderColor: selected === lang.name ? lang.color : '#e5e5e5',
              backgroundColor: selected === lang.name ? `${lang.color}15` : '#fafafa'
            }}
          >
            <span className="lang-icon">{lang.icon}</span>
            <span className="lang-name">{lang.name}</span>
          </div>
        ))}
      </div>
      {selected && (
        <button className="btn-primary green" style={{marginTop: '24px'}} onClick={() => navigate('/home')}>
          Продолжить
        </button>
      )}
    </div>
  );
};

export default LanguageSelection;