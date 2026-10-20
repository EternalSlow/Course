import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';

import Register from './Register';
import LanguageSelection from './LanguageSelection';
import Home from './Home';
import Profile from './Profile';
import Lesson from './Lesson';
import LessonTask from './LessonTask';
import Firstpage from './First-page';
import League from './League';
import Practice from './Practice';
import Settings from './Settings';
import Admin from './Admin';
import AdminLessonEditor from './AdminLessonEditor';
import './style/App.css';
import Login from './Login';


const protect = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/first-page" replace />} />
          <Route path="/first-page" element={<Firstpage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/select-language" element={protect(<LanguageSelection />)} />
          <Route path="/home"     element={protect(<Home />)} />
          <Route path="/profile"  element={protect(<Profile />)} />
          <Route path="/settings" element={protect(<Settings />)} />
          <Route path="/admin"    element={protect(<Admin />)} />
          <Route path="/admin/lessons/new" element={protect(<AdminLessonEditor />)} />
          <Route path="/admin/lessons/:id/edit" element={protect(<AdminLessonEditor />)} />
          <Route path="/lesson"   element={protect(<Lesson />)} />
          <Route path="/lesson/:id" element={protect(<Lesson />)} />
          <Route path="/task/:id" element={protect(<LessonTask />)} />
          <Route path="/league"   element={protect(<League />)} />
          <Route path="/practice" element={protect(<Practice />)} />
          <Route path="*" element={<Navigate to="/home" replace />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;