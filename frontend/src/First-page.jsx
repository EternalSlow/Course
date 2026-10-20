import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './style/style.css';
import robot from './assets/Big-robot.svg';

export default function FirstPage() {
  const navigate = useNavigate();
  const handleStart = () => {
    navigate('/register');
  };

  return (
    <div className="home">
      <div className="app-container">
        <div className="page-container welcome-page">
          <div style={{ marginBottom: '8px' }}>
            <div className="page-title">Byte</div>
            <div className="course-tag">МАЛЕНЬКИЕ УРОКИ — БОЛЬШИЕ ИДЕИ</div>
          </div>

          <div className="welcome-image-container">
            <img
              src={robot}
              alt="Робот"
              width={300}
              height={245}
            />
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h2 className="page-title">
              Немного кода.
              <br />
              Много возможностей.
            </h2>
            <p className="description">
              Изучайте Python и JavaScript с помощью коротких и интересных заданий.
            </p>
          </div>

          <div className="welcome-action-block">
            <button
              type="button"
              className="btn-primary green"
              onClick={handleStart}
            >
              <span style={{ fontSize: '18px', marginRight: '-4px' }}>➔</span>
              Начать учиться
            </button>
            <Link to="/login" className="course-tag">
              У меня уже есть аккаунт
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}