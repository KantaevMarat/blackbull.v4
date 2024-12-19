// frontend/src/components/pages/AdminLoginPage.jsx

import React, { useState } from 'react';
import { Button, Form, Input, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase'; // Подключение к Firebase Auth
import { signInWithCustomToken } from 'firebase/auth';
import '../css/LoginPage.css';
const API_URL = process.env.REACT_APP_API_URL;

const { Title } = Typography;

const AdminLoginPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const navigate = useNavigate();

  // Функция для отправки OTP через сервер
  const handleSendCode = async () => {
    console.log('Нажата кнопка "Отправить код"');
    console.log('Номер телефона для отправки OTP:', phoneNumber);

    if (!phoneNumber) {
      message.error('Введите номер телефона');
      console.log('Ошибка: Номер телефона не введён');
      return;
    }

    try {
      console.log('Отправка запроса на сервер для отправки OTP...');
      const response = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, role: 'admin' }),
      });

      const result = await response.json();
      console.log('Ответ от сервера при отправке OTP:', result);

      if (response.ok) {
        message.success(result.message);
        setIsCodeSent(true);
        console.log('OTP успешно отправлен');
      } else {
        message.error(result.message || 'Ошибка при отправке OTP');
        console.log('Ошибка при отправке OTP:', result.message || 'Неизвестная ошибка');
      }
    } catch (error) {
      message.error('Ошибка при отправке кода: ' + error.message);
      console.log('Ошибка при отправке кода:', error);
    }
  };

  // Функция для проверки OTP через сервер и входа в систему
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      message.error('Введите код подтверждения');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp: verificationCode, role: 'admin' }),
      });

      const result = await response.json();

      if (response.ok && result.token) {
        // Вход в Firebase Auth с Custom Token
        await signInWithCustomToken(auth, result.token);

        message.success('Доступ разрешен');
        navigate('/'); // Перенаправление на панель администратора
      } else {
        message.error(result.message || 'Ошибка верификации');
        console.log('Ошибка при верификации:', result.message || 'Неизвестная ошибка');
      }
    } catch (error) {
      message.error('Ошибка при подтверждении кода: ' + error.message);
      console.log('Ошибка при верификации:', error);
    }
  };

  const handleSwitchToWorkerLogin = () => {
    console.log('Переключение на страницу входа для сотрудников.');
    navigate('/worker-login');
  };

  return (
    <div className="login-container">
      <Title level={2} style={{ textAlign: 'center' }}>Авторизация администратора</Title>
      {!isCodeSent ? (
        <Form layout="vertical" onFinish={handleSendCode} className="login-form">
          <Form.Item
            label="Номер телефона"
            name="phone"
            rules={[
              { required: true, message: 'Введите номер телефона' },
              { pattern: /^\+?\d{10,15}$/, message: 'Введите корректный номер телефона' },
            ]}
          >
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+7(999)999-99-99"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" className="login-button" block>
            Отправить код
          </Button>
        </Form>
      ) : (
        <Form layout="vertical" onFinish={handleVerifyCode} className="login-form">
          <Form.Item
            label="Код подтверждения"
            name="code"
            rules={[{ required: true, message: 'Введите код подтверждения' }]}
          >
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Введите код"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" className="login-button" block>
            Войти
          </Button>
        </Form>
      )}
      <Button type="link" onClick={handleSwitchToWorkerLogin} className="switch-button">
        Вход для сотрудников
      </Button>
    </div>
  );
};

export default AdminLoginPage;
