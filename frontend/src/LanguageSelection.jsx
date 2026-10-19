import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style/style.css';

const languages = [
  {
    id: 'python',
    name: 'Python',
    icon: 'Py',
    iconClass: 'language-icon-python',
    topics: '6 topics',
    level: 'Beginner friendly',
    description: 'From your first print to powerful ideas. Great for automation, data and curious minds.',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: 'JS',
    iconClass: 'language-icon-js',
    topics: '6 topics',
    level: 'Beginner friendly',
    description: 'Bring the web to life. Build interactive websites and turn clicks into possibilities.',
  },
];

const topics = ['Hello World', 'Variables', 'Conditions', 'Loops', 'Functions', 'Arrays'];

const LanguageSelection = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const handleLanguageSelect = (langId) => {
    setSelectedLanguage(langId);
  };

  const handleContinue = async () => {
    const selectedLang = languages.find(lang => lang.id === selectedLanguage);
    
    if (userId) {
      const response = await fetch(`http://localhost:5000/api/user/${userId}/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLang.name }),
      });

      if (response.ok) {
        setTimeout(() => navigate('/home'), 600);
      }
    } else {
      navigate('/home');
    }
  };

  const selectedLang = languages.find(lang => lang.id === selectedLanguage);

  return (
    <div className="language-picker-container">
      {/* Header */}
      <div className="language-picker-header">
        <div className="language-picker-subtitle">LET'S MAKE IT YOURS</div>
        <div className="language-picker-title-row">
          <span className="language-picker-back-arrow">←</span>
          <h1 className="language-picker-title">Pick your first language</h1>
        </div>
        <p className="language-picker-description">Start with one. You can always add another.</p>
      </div>

      {/* Language Cards */}
      <div className="language-cards-container">
        {languages.map((lang) => (
          <div
            key={lang.id}
            className={`language-card ${
              selectedLanguage === lang.id
                ? 'language-card-selected'
                : 'language-card-unselected'
            }`}
            onClick={() => handleLanguageSelect(lang.id)}
          >
            <div className="language-card-top">
              <div className={`language-icon ${lang.iconClass}`}>
                {lang.icon}
              </div>
              <div className="language-card-info">
                <div className="language-card-title-row">
                  <span className="language-card-title">{lang.name}</span>
                  <div className="language-radio">
                    {selectedLanguage === lang.id ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#7CB342" strokeWidth="2.5" />
                        <path
                          d="M7 12l3 3 7-7"
                          stroke="#7CB342"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#D0D5DD" strokeWidth="2" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="language-card-meta">
                  {lang.topics} · {lang.level}
                </span>
              </div>
            </div>
            <p className="language-card-description">{lang.description}</p>
          </div>
        ))}
      </div>

      {/* Topics Section */}
      <div className="topics-section">
        <h3 className="topics-title">YOUR FIRST SIX TOPICS</h3>
        <div className="topics-grid">
          {topics.map((topic) => (
            <span key={topic} className="topic-tag">
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="language-picker-footer">
        <p className="language-picker-footer-text">
          No experience needed. Just a little curiosity.
        </p>
        <button className="continue-button" onClick={handleContinue}>
          Continue with {selectedLang?.name}
        </button>
      </div>
    </div>
  );
};

export default LanguageSelection;
