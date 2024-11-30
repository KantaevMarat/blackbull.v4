// src/components/pages/RequestsPage.js

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import {
  Card,
  Button,
  Select,
  List,
  Typography,
  Space,
  Spin,
  Modal,
  Tag,
  Tooltip,
} from 'antd';
import {
  CloseOutlined,
  FireOutlined,
  ToolOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import LoadingSpinner from '../LoadingSpinner';
import '../css/RequestsPage.css'; // Если необходимо оставить некоторые пользовательские стили

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [financials, setFinancials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requestsCollection = collection(db, 'requests');
    const workersCollection = collection(db, 'workers');
    const financialsCollection = collection(db, 'financials');

    const unsubscribeRequests = onSnapshot(
      requestsCollection,
      (snapshot) => {
        const fetchedRequests = snapshot.docs.map((doc) => {
          const requestData = doc.data();
          return {
            id: doc.id,
            ...requestData,
            // Корректное преобразование Timestamp в Date
            startDateTime: requestData.startDateTime
              ? requestData.startDateTime.toDate()
              : null,
            endDateTime: requestData.endDateTime
              ? requestData.endDateTime.toDate()
              : null,
          };
        });

        setRequests(fetchedRequests);
        setLoading(false);
      },
      (error) => {
        console.error('Ошибка при получении заявок:', error);
        setLoading(false);
      }
    );

    const unsubscribeWorkers = onSnapshot(
      workersCollection,
      (snapshot) => {
        const fetchedWorkers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setWorkers(fetchedWorkers);
      },
      (error) => {
        console.error('Ошибка при получении работников:', error);
      }
    );

    const unsubscribeFinancials = onSnapshot(
      financialsCollection,
      (snapshot) => {
        const fetchedFinancials = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFinancials(fetchedFinancials);
      },
      (error) => {
        console.error('Ошибка при получении финансовых данных:', error);
      }
    );

    return () => {
      unsubscribeRequests();
      unsubscribeWorkers();
      unsubscribeFinancials();
    };
  }, []);

  const cancelRequest = (request, event) => {
    event.preventDefault();
    event.stopPropagation();
    confirm({
      title: 'Вы уверены, что хотите отменить эту заявку?',
      content: 'Она будет перенесена в архив.',
      okText: 'Да, отменить',
      okType: 'danger',
      cancelText: 'Нет',
      onOk: async () => {
        try {
          await addDoc(collection(db, 'archiveRequests'), {
            ...request,
            archivedAt: new Date().toISOString(),
            status: 'canceled',
          });

          await deleteDoc(doc(db, 'requests', request.id));

          Modal.success({
            title: 'Успех',
            content: 'Заявка успешно перенесена в архив.',
          });
        } catch (error) {
          console.error('Ошибка при отмене заявки:', error);
          Modal.error({
            title: 'Ошибка',
            content: 'Произошла ошибка при отмене заявки. Попробуйте позже.',
          });
        }
      },
    });
  };

  const calculateBalance = (requestId) => {
    const requestFinancials = financials.filter(
      (financial) => financial.requestId === requestId
    );
    const totalBalance = requestFinancials.reduce((balance, financial) => {
      return financial.type === 'income'
        ? balance + financial.amount
        : balance - financial.amount;
    }, 0);

    return totalBalance ? `${totalBalance} руб.` : 'Не указан';
  };

  const getWorkerNames = (workerIds) => {
    return workerIds
      .map((workerId) => {
        const worker = workers.find((w) => w.id === workerId);
        return worker ? worker.name : 'Неизвестный';
      })
      .join(', ');
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
  };

  const calculateTimeLeft = (endDateTime) => {
    if (!endDateTime) return null;

    const now = new Date();
    const diff = endDateTime - now;

    if (diff <= 0) {
      return 'Время истекло';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let result = '';
    if (days > 0) result += `${days} дн `;
    if (hours > 0) result += `${hours} ч `;
    if (minutes > 0) result += `${minutes} мин`;

    return result.trim();
  };

  const filteredRequests = useMemo(() => {
    const filtered = requests.filter((request) => {
      if (statusFilter !== 'all' && request.status !== statusFilter) {
        return false;
      }
      return request.status !== 'canceled';
    });

    return filtered.sort((a, b) => (b.urgency || 1) - (a.urgency || 1));
  }, [requests, statusFilter]);

  const getDifficultyIcon = (level) => {
    return <DashboardOutlined style={{ color: '#fff', fontSize: '1.5rem' }} />;
  };

  const getUrgencyIcon = (level) => {
    return <FireOutlined style={{ color: '#fff', fontSize: '1.5rem' }} />;
  };

  // Функция для получения градиента по уровню
  function getGradientByLevel(level) {
    const gradients = [
      '',
      'linear-gradient(45deg, #4caf50, #8bc34a)',
      'linear-gradient(45deg, #8bc34a, #cddc39)',
      'linear-gradient(45deg, #ffeb3b, #ffc107)',
      'linear-gradient(45deg, #ff9800, #ff5722)',
      'linear-gradient(45deg, #f44336, #e91e63)',
    ];
    return gradients[level] || '#ccc';
  }

  // Функция для получения русского названия статуса
  function getRussianStatus(status) {
    switch (status) {
      case 'new':
        return <Tag color="blue">Новая</Tag>;
      case 'pending':
        return (
          <Tag color="orange">
            <ToolOutlined /> В сервисе
          </Tag>
        );
      case 'completed':
        return <Tag color="green">Отдана клиенту</Tag>;
      default:
        return status;
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50 }}>
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} className='title'>Список заявок</Title>

      <Space style={{ marginBottom: '16px' }}>
        <Text>Фильтр по статусам:</Text>
        <Select
          value={statusFilter}
          onChange={handleStatusChange}
          style={{ width: 200 }}
        >
          <Option value="all">Все</Option>
          <Option value="new">Новые</Option>
          <Option value="pending">В сервисе</Option>
          <Option value="completed">Отдана клиенту</Option>
        </Select>
      </Space>

      {filteredRequests.length === 0 ? (
        <Card>
          <Text type="secondary">Нет заявок.</Text>
        </Card>
      ) : (
        <List
          grid={{
            gutter: 16,
            xs: 1,
            sm: 1,
            md: 2,
            lg: 2,
            xl: 3,
            xxl: 3,
          }}
          dataSource={filteredRequests}
          renderItem={(request) => (
            <List.Item>
              <Link to={`/request/${request.id}`}>
                <Card
                  title={request.userName}
                  extra={
                    <Tooltip title="Отменить заявку">
                      <Button
                        type="text"
                        danger
                        icon={<CloseOutlined />}
                        onClick={(event) => cancelRequest(request, event)}
                      />
                    </Tooltip>
                  }
                  style={{
                    borderLeft: `4px solid ${
                      request.status === 'new'
                        ? '#1890ff'
                        : request.status === 'pending'
                        ? '#faad14'
                        : '#52c41a'
                    }`,
                  }}
                >
                  <p>
                    <Text strong>Телефон:</Text> {request.phone}
                  </p>
                  <p>
                    <Text strong>Дата:</Text>{' '}
                    {request.startDateTime
                      ? request.startDateTime.toLocaleString('ru-RU')
                      : 'Не указана'}
                  </p>
                  <p>
                    <Text strong>Модель авто:</Text> {request.carModel || 'Не указана'}
                  </p>
                  <p>
                    <Text strong>Год авто:</Text> {request.carYear || 'Не указан'}
                  </p>
                  <p>
                    <Text strong>Статус:</Text> {getRussianStatus(request.status)}
                  </p>
                  <p>
                    <Text strong>Работники:</Text> {getWorkerNames(request.assignedWorkers || [])}
                  </p>
                  {request.endDateTime && (
                    <p>
                      <ClockCircleOutlined /> Дедлайн: {calculateTimeLeft(request.endDateTime)}
                    </p>
                  )}
                  <div style={{ marginTop: '16px' }}>
                    <Space>
                      <Tooltip title="Уровень срочности">
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: getGradientByLevel(request.urgency || 1),
                          }}
                        >
                          {getUrgencyIcon(request.urgency || 1)}
                        </div>
                      </Tooltip>
                      <Tooltip title="Уровень сложности">
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: getGradientByLevel(request.difficulty || 1),
                          }}
                        >
                          {getDifficultyIcon(request.difficulty || 1)}
                        </div>
                      </Tooltip>
                    </Space>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <Text strong>Баланс:</Text> {calculateBalance(request.id)}
                  </div>
                </Card>
              </Link>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}

// Дополнительные функции остаются без изменений

export default RequestsPage;
