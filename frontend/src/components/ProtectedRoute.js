// src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

const ProtectedRoute = ({ children, adminOnly, workerOnly, adminOrWorker }) => {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    // Если нет пользователя, перенаправляем на соответствующую страницу логина
    if (adminOnly) {
      return <Navigate to="/admin-login" replace />;
    } else if (workerOnly) {
      return <Navigate to="/worker-login" replace />;
    } else if (adminOrWorker) {
      // В этом случае доступ имеют либо админ, либо рабочий
      // Если пользователь не залогинен — пусть идет на логин рабочего или админа.
      // Предположим, что админ/рабочий — разные входы. Можно выбрать один из логинов или сделать общую страницу логина.
      // Для примера пусть будет admin-login:
      return <Navigate to="/admin-login" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  // Проверка на админскую роль
  if (adminOnly && userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Проверка на роль сотрудника
  if (workerOnly && userRole !== 'worker') {
    return <Navigate to="/" replace />;
  }

  // Проверка на роль админ или рабочий
  if (adminOrWorker && userRole !== 'admin' && userRole !== 'worker') {
    return <Navigate to="/" replace />;
  }

  // Если все проверки прошли, рендерим дочерний компонент
  return children;
};

export default ProtectedRoute;
