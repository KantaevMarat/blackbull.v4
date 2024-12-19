// src/components/pages/DiagnosticCardPage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import {
  Card,
  Form,
  Radio,
  Button,
  Typography,
  Space,
  Spin,
  Row,
  Col,
  Input,
  notification,
} from 'antd';
import 'antd/dist/reset.css';

const { Title } = Typography;

/*
  Senior Developer Comments:
  Ниже представлен полный код страницы для создания "Диагностической карты" автомобиля.
  На данной странице представлен подробный список пунктов диагностики. Каждый пункт можно
  отметить как "Исправно" или "Не исправно" с помощью Radio.

  После заполнения формы пользователь может сохранить данные в Firestore. Данные будут 
  сохранены в коллекцию "diagnostics" с привязкой к конкретному requestId. При необходимости 
  можно расширить данную логику и хранить детальные данные о каждом пункте, или использовать 
  поддокументы.

  Обратите внимание:
  1. Массив diagnosticItems можно расширять или изменять по мере необходимости.
  2. При сохранении мы создаем или обновляем документ в коллекции "diagnostics", связанный с заявкой.
  3. Мы предполагаем, что в Firestore коллекция "diagnostics" будет иметь структуру:
     { 
       requestId: <ID заявки>,
       createdAt: <Timestamp>,
       items: [
         {
           name: <string>,
           status: <'Исправно' | 'Не исправно'>
         },
         ...
       ]
     }
  4. Вызов обновления или создания документа происходит при отправке формы.
  5. Этот компонент использует ANTD для стилей, как просил пользователь.
*/

const diagnosticItems = [
  'Проверка амортизаторов',
  'Проверка рулевого управления',
  'Шаровые опоры',
  'Редуктор',
  'Приводной вал',
  'Коробка передач (протечки)',
  'Двигатель (протечки)',
  'Шрусы (приводные валы)',
  'Подшипники ступиц',
  'Сайлентблоки рычагов',
  'Состояние пружин',
  'Тормозные диски/барабаны',
  'Тормозные колодки',
  'Состояние шлангов и трубок',
  'Гидравлика (тормозная жидкость)',
  'Рулевые наконечники',
  'Стойки стабилизатора',
  'Втулки стабилизатора',
  'Приводной ремень генератора',
  'Радиатор (протечки)',
  'Шланги системы охлаждения',
  'Уровень охлаждающей жидкости',
  'Аккумулятор',
  'Уровень моторного масла',
  'Уровень жидкости ГУР',
  'Уровень тормозной жидкости',
  'Состояние выпускной системы',
  'Состояние подвески',
  'Шины (износ, трещины)',
  'Компьютерная диагностика',
];

function DiagnosticCardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState({});

  useEffect(() => {
    // Загрузка данных диагностики, если уже есть
    const fetchDiagnostic = async () => {
      try {
        const q = query(collection(db, 'diagnostics'), where('requestId', '==', id));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          const loadedItems = {};
          docData.items.forEach((item) => {
            loadedItems[item.name] = item.status;
          });
          setInitialValues(loadedItems);
        }
      } catch (error) {
        console.error('Ошибка загрузки диагностических данных:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDiagnostic();
  }, [id]);

  const handleFinish = async (values) => {
    // Преобразуем данные формы в массив объектов [{name, status}, ...]
    const itemsArray = diagnosticItems.map((itemName) => ({
      name: itemName,
      status: values[itemName] || 'Исправно', // по умолчанию Исправно, если не выбрано
    }));

    try {
      // Проверяем, есть ли уже документ для этой заявки
      const q = query(collection(db, 'diagnostics'), where('requestId', '==', id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Обновляем существующий документ
        const diagnosticDocRef = doc(db, 'diagnostics', querySnapshot.docs[0].id);
        await updateDoc(diagnosticDocRef, {
          items: itemsArray,
        });
      } else {
        // Создаем новый документ
        const diagnosticCollectionRef = collection(db, 'diagnostics');
        await addDoc(diagnosticCollectionRef, {
          requestId: id,
          createdAt: Timestamp.now(),
          items: itemsArray,
        });
      }

      notification.success({
        message: 'Сохранено',
        description: 'Диагностическая карта успешно сохранена.',
      });

      // Можно по завершении вернуться на страницу деталей заявки
      navigate(`/request/${id}`);
    } catch (error) {
      console.error('Ошибка при сохранении диагностической карты:', error);
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось сохранить диагностическую карту.',
      });
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      <Title level={2} style={{ textAlign: 'center', marginTop: '50px' }}>
        Диагностическая карта автомобиля
      </Title>
      <Card bordered={false}>
        <Form
          layout="vertical"
          onFinish={handleFinish}
          initialValues={initialValues}
        >
          {diagnosticItems.map((item, index) => (
            <Row gutter={[16, 16]} key={index} style={{ marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
              <Col xs={24} sm={12}>
                <Form.Item label={item} name={item}>
                  <Radio.Group>
                    <Radio value="Исправно">Исправно</Radio>
                    <Radio value="Не исправно">Не исправно</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
          ))}

          <Row style={{ marginTop: '24px' }}>
            <Col xs={24} sm={12}>
              <Button type="primary" htmlType="submit" block>
                Сохранить
              </Button>
            </Col>
            <Col xs={24} sm={12}>
              <Button type="default" onClick={() => navigate(`/requests/${id}`)} block>
                Отмена
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
}

export default DiagnosticCardPage;
