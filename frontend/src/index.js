import React from 'react';
import { createRoot } from 'react-dom/client'; // Импортируем createRoot из 'react-dom/client'
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import { SoundProvider } from './components/SoundContext';
import { AuthProvider } from './components/auth/AuthContext';

// src/index.js или src/App.js
import 'antd/dist/reset.css';
import 'antd-mobile/es/global'; // Или 'antd-mobile/es/global'

const root = createRoot(document.getElementById('root')); 
// Используем createRoot для инициализации
root.render(
  <AuthProvider>
    <SoundProvider>
      <Router>
        <App />
      </Router>
    </SoundProvider>
  </AuthProvider>
);
