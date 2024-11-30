// src/components/ArchivedRequestDetailsPage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import '../css/ArchivedRequestDetailsPage.css';
import {
  Button,
  Typography,
  Card,
  Descriptions,
  Tag,
  Tooltip,
  Spin,
  notification,
  Grid,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography; // Добавлено Text
const { useBreakpoint } = Grid;

function ArchivedRequestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true); // Состояние для загрузки
  const screens = useBreakpoint(); // Для определения размера экрана

  // Функция для получения статуса на русском
  const getRussianStatus = (status) => {
    switch (status) {
      case 'new':
        return 'Новая';
      case 'pending':
        return 'В ожидании';
      case 'completed':
        return 'Завершено';
      case 'canceled':
        return 'Отменено';
      case 'confirmation':
        return 'Подтверждено';
      default:
        return status;
    }
  };

  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        const requestDocRef = doc(db, 'archiveRequests', id);
        const requestSnapshot = await getDoc(requestDocRef);
        if (requestSnapshot.exists()) {
          const requestData = requestSnapshot.data();
          setRequest({
            id,
            ...requestData,
            archivedAt: requestData.archivedAt
              ? new Date(requestData.archivedAt)
              : null,
            date: requestData.date ? new Date(requestData.date) : null,
          });
        } else {
          setRequest(null);
          notification.error({
            message: 'Ошибка',
            description: 'Архивированная заявка не найдена.',
            placement: 'topCenter',
            duration: 3,
          });
        }
      } catch (error) {
        console.error('Ошибка при получении данных заявки:', error);
        notification.error({
          message: 'Ошибка',
          description: 'Произошла ошибка при загрузке данных заявки.',
          placement: 'topCenter',
          duration: 3,
        });
      }
    };

    const fetchWorkers = async () => {
      try {
        const workersCollection = collection(db, 'workers');
        const workersSnapshot = await getDocs(workersCollection);
        const workersList = workersSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setWorkers(workersList);
      } catch (error) {
        console.error('Ошибка при получении данных работников:', error);
        notification.error({
          message: 'Ошибка',
          description: 'Произошла ошибка при загрузке данных работников.',
          placement: 'topCenter',
          duration: 3,
        });
      }
    };

    const loadData = async () => {
      await Promise.all([fetchRequestDetails(), fetchWorkers()]);
      setLoading(false);
    };

    loadData();
  }, [id]);

  // Функция для получения имен работников по их ID
  const getWorkerNames = (workerIds) => {
    return workerIds
      .map((workerId) => {
        const worker = workers.find((w) => w.id === workerId);
        return worker ? worker.name : 'Неизвестный работник';
      })
      .join(', ');
  };

  const formatBalance = (companyShare) => {
    return companyShare ? `${companyShare.toFixed(2)} руб.` : '0.00 руб.';
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <Spin size="large" tip="Загрузка..." />
      </div>
    ); // Показываем спиннер, пока данные загружаются
  }

  if (!request) {
    return (
      <div className="details-container">
        <Title level={2} className="not-found-title">
          Заявка не найдена.
        </Title>
      </div>
    );
  }

  const formattedDate = request.date
    ? request.date.toLocaleString('ru-RU')
    : 'Не указано';
  const archiveDate = request.archivedAt
    ? request.archivedAt.toLocaleString('ru-RU')
    : 'Не указано';

  return (
    <div className="details-container">
      <Title level={2} className="request-title">
        Детали архивированной заявки
      </Title>

      {/* Кнопка "Назад" для десктопа */}
      {screens.md && (
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="back-button-desktop"
        >
          Назад
        </Button>
      )}

      {/* Кнопка "Назад" для мобильных устройств */}
      {!screens.md && (
        <div className="back-button-mobile-container">
          <Tooltip title="Назад">
            <Button
              type="primary"
              shape="circle"
              icon={<ArrowLeftOutlined />}
              size="large"
              onClick={() => navigate(-1)}
              aria-label="Назад"
            />
          </Tooltip>
        </div>
      )}

      {/* Отображение деталей заявки */}
      {screens.md ? (
        // Десктоп: Используем Descriptions
        <Card className="details-card" hoverable>
          <Descriptions
            bordered
            column={1}
            labelStyle={{ background: '#f0f2f5', fontWeight: 'bold' }}
          >
            <Descriptions.Item label="Имя">{request.name}</Descriptions.Item>
            {request.phone && (
              <Descriptions.Item label="Телефон">{request.phone}</Descriptions.Item>
            )}
            <Descriptions.Item label="Модель авто">
              {request.carModel} ({request.carYear})
            </Descriptions.Item>
            <Descriptions.Item label="Описание проблемы">
              {request.issue}
            </Descriptions.Item>
            <Descriptions.Item label="Дата создания">{formattedDate}</Descriptions.Item>
            <Descriptions.Item label="Дата архивирования">{archiveDate}</Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag color="blue">{getRussianStatus(request.status)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Баланс">
              {formatBalance(request.financials?.companyShare)}
            </Descriptions.Item>
            <Descriptions.Item label="Работники">
              {getWorkerNames(request.assignedWorkers || [])
                .split(', ')
                .map((worker, index) => (
                  <Tag color="green" key={index}>
                    {worker}
                  </Tag>
                ))}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ) : (
        // Мобильные устройства: Используем Карточки
        <div className="mobile-cards-container">
          <Card className="details-card" hoverable>
            <Title level={4}>Имя</Title>
            <Text>{request.name}</Text>
          </Card>

          {request.phone && (
            <Card className="details-card" hoverable>
              <Title level={4}>Телефон</Title>
              <Text>{request.phone}</Text>
            </Card>
          )}

          <Card className="details-card" hoverable>
            <Title level={4}>Модель авто</Title>
            <Text>
              {request.carModel} ({request.carYear})
            </Text>
          </Card>

          <Card className="details-card" hoverable>
            <Title level={4}>Описание проблемы</Title>
            <Text>{request.issue}</Text>
          </Card>

          <Card className="details-card" hoverable>
            <Title level={4}>Дата создания</Title>
            <Text>{formattedDate}</Text>
          </Card>

          <Card className="details-card" hoverable>
            <Title level={4}>Дата архивирования</Title>
            <Text>{archiveDate}</Text>
          </Card>

          <Card className="details-card" hoverable>
            <Title level={4}>Статус</Title>
            <Tag color="blue">{getRussianStatus(request.status)}</Tag>
          </Card>

          <Card className="details-card" hoverable>
            <Title level={4}>Баланс</Title>
            <Text>{formatBalance(request.financials?.companyShare)}</Text>
          </Card>

          <Card className="details-card" hoverable>
            <Title level={4}>Работники</Title>
            {getWorkerNames(request.assignedWorkers || [])
              .split(', ')
              .map((worker, index) => (
                <Tag color="green" key={index}>
                  {worker}
                </Tag>
              ))}
          </Card>
        </div>
      )}
    </div>
  );
}

export default ArchivedRequestDetailsPage;
