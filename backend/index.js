// backend/index.js

import express from 'express';
import admin from 'firebase-admin';
import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';

// Инициализация переменных окружения
dotenv.config();

const app = express();
app.use(
    cors({
    origin: [`${process.env.REACT_URL_DOMAIN}`, 'https://theblackbull.store']
  })
);
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Инициализация Firebase Admin SDK
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Инициализация Telegram-бота
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Middleware для проверки аутентификации администратора
async function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Нет доступа' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    // Проверяем, является ли пользователь администратором, используя коллекцию 'roles'
    const rolesRef = db.collection('roles').doc(decodedToken.uid);
    const rolesDoc = await rolesRef.get();

    if (!rolesDoc.exists || rolesDoc.data().role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return res.status(401).json({ message: 'Неверный токен' });
  }
}

// Функция для отправки сообщения через Telegram-бота
async function sendMessageToTelegram(chat_id, message) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat_id,
          text: message,
        }),
      }
    );
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    console.log(`Сообщение отправлено в chat_id ${chat_id}: ${message}`);
  } catch (error) {
    console.error(`Ошибка при отправке сообщения в Telegram chat_id ${chat_id}:`, error);
  }
}

// Хранилище OTP (используйте Redis в продакшене)
const otpStorage = new Map();

// Генерация случайного OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Эндпоинт для отправки OTP (публичный, не требует аутентификации)
app.post('/api/send-otp', async (req, res) => {
  const { phoneNumber, role } = req.body;

  if (!phoneNumber || !role) {
    return res.status(400).json({ message: 'Номер телефона и роль обязательны' });
  }

  try {
    // Поиск пользователя по номеру телефона и роли
    let userDoc;
    if (role === 'admin') {
      const rolesCollection = db.collection('roles');
      const querySnapshot = await rolesCollection
        .where('phoneNumber', '==', phoneNumber)
        .where('role', '==', 'admin')
        .get();

      if (querySnapshot.empty) {
        return res.status(400).json({ message: 'Администратор не найден' });
      }
      userDoc = querySnapshot.docs[0];
    } else if (role === 'worker') {
      const workersCollection = db.collection('workers');
      const querySnapshot = await workersCollection
        .where('phoneNumber', '==', phoneNumber)
        .get();

      if (querySnapshot.empty) {
        return res.status(400).json({ message: 'Рабочий не найден' });
      }
      userDoc = querySnapshot.docs[0];
    } else {
      return res.status(400).json({ message: 'Неверная роль' });
    }

    const userData = userDoc.data();

    if (!userData.chat_id) {
      return res.status(400).json({ message: 'Пользователь не связан с Telegram-аккаунтом' });
    }

    const otp = generateOtp();
    otpStorage.set(`${phoneNumber}-${role}`, otp);

    await sendMessageToTelegram(userData.chat_id, `Ваш код подтверждения: ${otp}`);

    res.status(200).json({ message: 'OTP успешно отправлен через Telegram' });
  } catch (error) {
    console.error('Ошибка при отправке OTP:', error);
    res.status(500).json({ message: 'Ошибка при отправке OTP' });
  }
});

// Эндпоинт для проверки OTP
app.post('/api/verify-otp', async (req, res) => {
  const { phoneNumber, otp, role } = req.body;

  if (!phoneNumber || !otp || !role) {
    return res.status(400).json({ message: 'Номер телефона, OTP и роль обязательны' });
  }

  const storedOtp = otpStorage.get(`${phoneNumber}-${role}`);

  if (!storedOtp) {
    return res.status(400).json({ message: 'OTP не найден. Пожалуйста, запросите новый код.' });
  }

  if (storedOtp !== otp) {
    return res.status(400).json({ message: 'Неверный OTP' });
  }

  // Успешная верификация
  otpStorage.delete(`${phoneNumber}-${role}`);

  try {
    let userDoc;
    if (role === 'admin') {
      const rolesCollection = db.collection('roles');
      const querySnapshot = await rolesCollection
        .where('phoneNumber', '==', phoneNumber)
        .where('role', '==', 'admin')
        .get();

      if (querySnapshot.empty) {
        return res.status(400).json({ message: 'Администратор не найден' });
      }
      userDoc = querySnapshot.docs[0];
    } else if (role === 'worker') {
      const workersCollection = db.collection('workers');
      const querySnapshot = await workersCollection
        .where('phoneNumber', '==', phoneNumber)
        .get();

      if (querySnapshot.empty) {
        return res.status(400).json({ message: 'Рабочий не найден' });
      }
      userDoc = querySnapshot.docs[0];
    } else {
      return res.status(400).json({ message: 'Неверная роль' });
    }

    const userData = userDoc.data();

    // Генерируем Firebase Custom Token для аутентификации на клиенте
    const customToken = await admin.auth().createCustomToken(userDoc.id, { role: role });

    res.status(200).json({ message: 'OTP подтвержден', token: customToken });
  } catch (error) {
    console.error('Ошибка при подтверждении OTP:', error);
    res.status(500).json({ message: 'Ошибка при подтверждении OTP' });
  }
});

// Другие эндпоинты можно оставить без изменений или обновить аналогично

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
