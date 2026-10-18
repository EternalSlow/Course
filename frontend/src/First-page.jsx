import React from 'react';
import './style/style.css';
import robot from './assets/Big-robot.svg';

export default function FirstPage() {
  const handleStart = () => {
    window.location.href = 'language.html';
  };

  return (
    <div className="home">
      <div className="app-container">
        <div className="page-container welcome-page">
          <div style={{ marginBottom: '8px' }}>
            <div className="page-title">Byte</div>
            <div className="course-tag">SMALL LESSONS, BIG IDEAS.</div>
          </div>

          <div className="welcome-image-container">
            <img
              src={robot}
              alt="Robot Icon"
              width={300}
              height={245}
            />
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h2 className="page-title">
              A little code.
              <br />
              A lot of possibility.
            </h2>
            <p className="description">
              Learn Python &amp; JavaScript, one fun, bite-sized challenge at a
              time.
            </p>
          </div>

          <div className="welcome-action-block">
            <button
              type="button"
              className="btn-primary green"
              onClick={handleStart}
            >
              <span style={{ fontSize: '18px', marginRight: '-4px' }}>➔</span>
              {"Let's start coding"}
            </button>
            <a href="#" className="course-tag">
              I already have an account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}