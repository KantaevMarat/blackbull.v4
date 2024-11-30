// src/components/pages/SettingsPage.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/SettingsPage.css';

function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="settings-page">
      <h1 className='title-main'>Настройки приложения</h1>
      <div className="settings-section">
        <div className="settings-item" onClick={() => navigate('/settings/employees')}>
          <h2>Сотрудники</h2>
          <p>Управляйте сотрудниками: добавляйте, изменяйте и удаляйте сотрудников.</p>
        </div>
        {/* Можно добавить больше разделов настроек в будущем */}
      </div>
    </div>
  );
}

export default SettingsPage;
