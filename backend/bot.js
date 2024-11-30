// backend/bot.js

import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Инициализация Firebase Admin SDK (если не инициализирован ранее)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Хранилище состояний пользователей (можно использовать Redis в продакшене)
const waitingForPhoneNumber = {};

// Команда /start
bot.start(async (ctx) => {
  const chat_id = ctx.chat.id;
  await ctx.reply('Добро пожаловать! Пожалуйста, введите свой номер телефона в формате +7(999)99-99 для связывания с аккаунтом.');
  waitingForPhoneNumber[chat_id] = 'link';
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  const chat_id = ctx.chat.id;
  const state = waitingForPhoneNumber[chat_id];

  if (state === 'link') {
    const phoneNumber = ctx.message.text.trim();

    // Проверка формата номера телефона
    const phoneRegex = /^\+?\d{10,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      await ctx.reply('Некорректный формат номера телефона. Пожалуйста, введите его в формате +7(999)99-99.');
      return;
    }

    try {
      // Поиск пользователя по номеру телефона
      // Сначала ищем в коллекции 'workers'
      let userDoc;
      let role;

      const workersCollection = db.collection('workers');
      const workersSnapshot = await workersCollection.where('phoneNumber', '==', phoneNumber).get();

      if (!workersSnapshot.empty) {
        userDoc = workersSnapshot.docs[0];
        role = 'worker';
      } else {
        // Если не найдено, ищем в коллекции 'roles' для администратора
        const rolesCollection = db.collection('roles');
        const rolesSnapshot = await rolesCollection.where('phoneNumber', '==', phoneNumber).get();

        if (!rolesSnapshot.empty) {
          userDoc = rolesSnapshot.docs[0];
          role = 'admin';
        } else {
          await ctx.reply('Пользователь с таким номером телефона не найден. Пожалуйста, обратитесь к администратору.');
          delete waitingForPhoneNumber[chat_id];
          return;
        }
      }

      // Обновление chat_id пользователя
      await userDoc.ref.update({ chat_id });

      await ctx.reply('Ваш Telegram-аккаунт успешно связан с номером телефона.');
      delete waitingForPhoneNumber[chat_id];
    } catch (error) {
      console.error('Ошибка при связывании Telegram-аккаунта:', error);
      await ctx.reply('Произошла ошибка при связывании. Пожалуйста, попробуйте позже.');
      delete waitingForPhoneNumber[chat_id];
    }
  } else {
    await ctx.reply('Пожалуйста, используйте команду /start для начала регистрации.');
  }
});

// Запуск бота
bot.launch();
console.log('Telegram-бот запущен.');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
