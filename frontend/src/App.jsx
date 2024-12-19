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
import DiagnosticCardPage from './components/pages/DiagnosticCardPage';
import { Layout } from 'antd';

const { Content } = Layout;

function App() {
  return (
    <AuthProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar />
        <Layout style={{ padding: '24px' }}>
          <Content style={{ background: 'transparent', padding: 12 }}>
            <Routes>
              {/* Администраторские страницы */}
              <Route path="/" element={<MainPage />} />
              <Route path="/requests" element={<RequestsPage />} />
              <Route path="/request/:id" element={<RequestDetailsPage />} />
              <Route path="/request-form" element={<RequestForm />} />
              <Route path="/archived-requests" element={<ArchivedRequestsPage />} />
              <Route path="/archived-requests/:id" element={<ArchivedRequestDetailsPage />} />
              <Route path="/confirmations" element={<ConfirmationRequestsPage />} />
              <Route path="/calculations" element={<CalculationPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/employee/:id" element={<EmployeeDetailsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/employees" element={<EmployeeManagementPage />} />
              <Route path="/request/:id/diagnostic" element={<DiagnosticCardPage />} />

              {/* Страницы для сотрудников */}
              <Route path="/worker-finances" element={<WorkerFinancesPage />} />
              <Route path="/worker-requests" element={<WorkerRequestsPage />} />
              <Route path="/report" element={<ReportPage />} />

              {/* Страницы логина */}
              <Route path="/admin-login" element={<AdminLoginPage />} />
              <Route path="/worker-login" element={<WorkerLoginPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </AuthProvider>
  );
}

export default App;
