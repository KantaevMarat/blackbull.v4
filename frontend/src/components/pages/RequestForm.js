// RequestForm.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { Input, Button, Form, DatePicker, Typography, TimePicker } from 'antd';
import { useSound } from '../SoundContext';
import LoadingSpinner from '../LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import { useAuth } from '../auth/AuthContext';
import 'react-toastify/dist/ReactToastify.css';
import locale from 'antd/es/date-picker/locale/ru_RU';
import '../css/RequestForm.css';
import moment from 'moment';
import 'moment/locale/ru';

const { Title } = Typography;

const RequestForm = () => {
  const { currentUser } = useAuth();
  const [form] = Form.useForm();
  const [occupiedSlots, setOccupiedSlots] = useState({});
  const { playSound } = useSound();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOccupiedSlots = async () => {
      try {
        const requestsCollection = collection(db, 'requests');
        const snapshot = await getDocs(requestsCollection);

        const occupied = snapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          if (data.startDateTime && data.endDateTime) {
            const start = data.startDateTime.toDate(); // Предполагается, что это Firestore Timestamp
            const end = data.endDateTime.toDate();
            const dateStr = start.toLocaleDateString('ru-RU');

            if (!acc[dateStr]) {
              acc[dateStr] = [];
            }

            acc[dateStr].push({ start, end });
          }
          return acc;
        }, {});

        setOccupiedSlots(occupied);
      } catch (error) {
        toast.error('Ошибка при загрузке данных: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOccupiedSlots();
  }, []);

  const handleSubmit = async (values) => {
    const { userName, phone, carModel, carYear, issue, date, time } = values;

    if (!date || !time) {
      toast.error('Выберите дату и время.');
      return;
    }

    try {
      // Извлекаем компоненты даты
      const year = date.year();
      const month = date.month(); // Месяцы 0-11
      const day = date.date();

      // Извлекаем компоненты времени
      const hour = time.hour();
      const minute = time.minute();

      // Создаём объект Date с выбранными датой и временем (локальное время)
      const startDateTime = new Date(year, month, day, hour, minute, 0, 0);

      // Создаём endDateTime (на 60 минут позже)
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60000); // Добавляем 60 минут

      // Проверяем, что выбранная дата не в прошлом
      const now = new Date();
      if (startDateTime < now) {
        toast.error('Выбранная дата и время уже прошли. Пожалуйста, выберите будущее время.');
        return;
      }

      // Добавляем данные в Firestore с использованием Timestamp
      await addDoc(collection(db, 'requests'), {
        userName,
        phone: phone || 'Не указан', // Сохраняем "Не указан", если телефон не введён
        carModel,
        carYear,
        issue,
        status: 'new',
        startDateTime: Timestamp.fromDate(startDateTime),
        endDateTime: Timestamp.fromDate(endDateTime),
      });

      // Сбрасываем форму, воспроизводим звук и показываем сообщение об успехе
      form.resetFields();
      playSound();
      toast.success('Заявка успешно отправлена!');
    } catch (error) {
      console.error('Ошибка при отправке заявки:', error);
      toast.error('Ошибка при отправке заявки: ' + error.message);
    }
  };

  const disabledDate = (current) => {
    return current && current < moment().startOf('day');
  };

  const disabledHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      if (i < 10 || i >= 20) {
        hours.push(i);
      }
    }
    return hours;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <ToastContainer />
      <div className="request-form">
        <Title level={2} className="form-title">
          Заявка на автосервис
        </Title>
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="Ваше имя"
            name="userName"
            rules={[{ required: true, message: 'Введите ваше имя' }]}
          >
            <Input placeholder="Введите ваше имя" />
          </Form.Item>

          <Form.Item
            label="Телефон"
            name="phone"
            rules={[{ required: false }]} // Поле не является обязательным
          >
            <Input placeholder="Введите номер телефона" />
          </Form.Item>

          <Form.Item
            label="Модель автомобиля"
            name="carModel"
            rules={[{ required: true, message: 'Введите модель автомобиля' }]}
          >
            <Input placeholder="Введите модель автомобиля" />
          </Form.Item>

          <Form.Item
            label="Год выпуска автомобиля"
            name="carYear"
            rules={[{ required: true, message: 'Введите год выпуска автомобиля' }]}
          >
            <Input placeholder="Введите год выпуска автомобиля" />
          </Form.Item>

          <Form.Item
            label="Описание проблемы"
            name="issue"
            rules={[{ required: true, message: 'Опишите проблему' }]}
          >
            <Input.TextArea placeholder="Опишите проблему" rows={4} />
          </Form.Item>

          <Form.Item
            label="Дата"
            name="date"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <DatePicker
              format="DD MMMM YYYY"
              locale={locale}
              disabledDate={disabledDate}
              placeholder="Выберите дату"
              getPopupContainer={(trigger) => trigger.parentNode}
            />
          </Form.Item>

          <Form.Item
            label="Время"
            name="time"
            rules={[{ required: true, message: 'Выберите время' }]}
          >
            <TimePicker
              format="HH:mm"
              locale={locale}
              disabledHours={disabledHours}
              placeholder="Выберите время"
              getPopupContainer={(trigger) => trigger.parentNode}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="submit-button">
              Отправить заявку
            </Button>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

export default RequestForm;
