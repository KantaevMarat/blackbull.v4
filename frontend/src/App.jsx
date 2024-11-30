// src/App.js

import './App.css';
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import RequestsPage from './components/pages/RequestsPage';
import RequestForm from './components/pages/RequestForm';
import ArchivedRequestsPage from './components/pages/ArchivedRequestsPage';
import ArchivedRequestDetailsPage from './components/pages/ArchivedRequestDetailsPage';
import RequestDetailsPage from './components/pages/RequestDetailsPage';
import ConfirmationRequestsPage from './components/pages/ConfirmationRequestsPage';
import EmployeesPage from './components/pages/EmployeesPage';
import EmployeeDetailsPage from './components/pages/EmployeeDetailsPage';
import MainPage from './components/pages/MainPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLoginPage from './components/auth/AdminLoginPage';
import WorkerLoginPage from './components/auth/WorkerLoginPage';
import CalculationPage from './components/pages/CalculationPage';
import { AuthProvider } from './components/auth/AuthContext';
import EmployeeManagementPage from './components/pages/EmployeeManagementPage';
import SettingsPage from './components/pages/SettingsPage';
import WorkerFinancesPage from './components/pages/WorkerFinancesPage';
import WorkerRequestsPage from './components/pages/WorkerRequestsPage';
import ReportPage from './components/pages/ReportPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Sidebar />
        <div className="content">
          <Routes>
            {/* Администраторские страницы */}
            <Route path="/" element={<ProtectedRoute adminOnly><MainPage /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute adminOnly><RequestsPage /></ProtectedRoute>} />
            <Route path="/request/:id" element={<ProtectedRoute adminOnly><RequestDetailsPage /></ProtectedRoute>} />
            <Route path="/request-form" element={<RequestForm />} />
            <Route path="/archived-requests" element={<ProtectedRoute adminOnly><ArchivedRequestsPage /></ProtectedRoute>} />
            <Route path="/archived-requests/:id" element={<ProtectedRoute adminOnly><ArchivedRequestDetailsPage /></ProtectedRoute>} />
            <Route path="/confirmations" element={<ProtectedRoute adminOnly><ConfirmationRequestsPage /></ProtectedRoute>} />
            <Route path="/calculations" element={<ProtectedRoute adminOnly><CalculationPage /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute adminOnly><EmployeesPage /></ProtectedRoute>} />
            <Route path="/employee/:id" element={<ProtectedRoute adminOnly><EmployeeDetailsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
            <Route path="/settings/employees" element={<ProtectedRoute adminOnly><EmployeeManagementPage /></ProtectedRoute>} />

            {/* Страницы для сотрудников */}
            <Route path="/worker-finances" element={<ProtectedRoute workerOnly><WorkerFinancesPage /></ProtectedRoute>} />
            <Route path="/worker-requests" element={<ProtectedRoute workerOnly><WorkerRequestsPage /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute workerOnly><ReportPage /></ProtectedRoute>} />

            {/* Страницы логина */}
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/worker-login" element={<WorkerLoginPage />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
