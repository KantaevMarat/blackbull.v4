// src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

const ProtectedRoute = ({ children, adminOnly, workerOnly }) => {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    // Если нет пользователя, перенаправляем на соответствующую страницу логина
    if (adminOnly) {
      return <Navigate to="/admin-login" />;
    } else if (workerOnly) {
      return <Navigate to="/worker-login" />;
    } else {
      return <Navigate to="/" />;
    }
  }

  // Проверка на админскую роль
  if (adminOnly && userRole !== 'admin') {
    return <Navigate to="/" />;
  }

  // Проверка на роль сотрудника
  if (workerOnly && userRole !== 'worker') {
    return <Navigate to="/" />;
  }

  // Если все проверки прошли, рендерим дочерний компонент
  return children;
};

export default ProtectedRoute;
