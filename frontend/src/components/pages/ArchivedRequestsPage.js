import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import {
  Table,
  Card,
  Spin,
  Typography,
  Button,
  Tag,
  Tooltip,
  message,
  Row,
  Col,
} from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons'; // Используем Ant Design иконку
import '../css/ArchivedRequestsPage.css'; // Убедитесь, что этот файл подключен

const { Title, Text } = Typography;

function ArchivedRequestsPage() {
  const [archivedRequests, setArchivedRequests] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArchivedRequestsAndWorkers = async () => {
      try {
        // Получаем архивированные заявки
        const archivedRequestsCollection = collection(db, 'archiveRequests');
        const archivedRequestsSnapshot = await getDocs(archivedRequestsCollection);
        const archivedRequestsList = archivedRequestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setArchivedRequests(archivedRequestsList);

        // Получаем работников
        const workersCollection = collection(db, 'workers');
        const workersSnapshot = await getDocs(workersCollection);
        const workersList = workersSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setWorkers(workersList);
      } catch (error) {
        console.error('Ошибка при получении данных:', error);
        message.error('Не удалось загрузить данные. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedRequestsAndWorkers();
  }, []);

  // Функция для получения имен работников по их ID
  const getWorkerNames = (workerIds) => {
    return workerIds
      .map(workerId => {
        const worker = workers.find(w => w.id === workerId);
        return worker ? worker.name : 'Неизвестный работник';
      })
      .join(', ');
  };

  // Функция для форматирования баланса
  const formatBalance = (companyShare) => {
    return companyShare ? `${companyShare.toFixed(2)} руб.` : '0.00 руб.';
  };

  // Определение колонок для таблицы Ant Design
  const columns = [
    {
      title: 'Имя',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: text => <Text strong>{text}</Text>,
    },
    {
      title: 'Модель авто',
      dataIndex: 'carModel',
      key: 'carModel',
      sorter: (a, b) => a.carModel.localeCompare(b.carModel),
      render: (text, record) => (
        <span>
          {text} ({record.carYear})
        </span>
      ),
    },
    {
      title: 'Описание проблемы',
      dataIndex: 'issue',
      key: 'issue',
      ellipsis: true,
      render: text => (
        <Tooltip title={text}>
          <Text className="table-text">{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Работники',
      dataIndex: 'assignedWorkers',
      key: 'assignedWorkers',
      render: workerIds => (
        <>
          {workerIds && workerIds.length > 0 ? (
            workerIds.map(id => {
              const worker = workers.find(w => w.id === id);
              return worker ? (
                <Tag color="blue" key={id} className="worker-tag">
                  {worker.name}
                </Tag>
              ) : (
                <Tag color="gray" key={id}>
                  Неизвестный работник
                </Tag>
              );
            })
          ) : (
            <Text type="secondary">Нет назначенных работников</Text>
          )}
        </>
      ),
    },
    {
      title: 'Дата архивации',
      dataIndex: 'archivedAt',
      key: 'archivedAt',
      sorter: (a, b) => new Date(a.archivedAt) - new Date(b.archivedAt),
      render: date => new Date(date).toLocaleString('ru-RU'),
      responsive: ['md'],
    },
    {
      title: 'Общий баланс',
      dataIndex: 'financials', // Обновил на financials
      key: 'companyShare', // Обновил на companyShare
      sorter: (a, b) => a.financials.companyShare - b.financials.companyShare, // Сортировка по companyShare
      render: (financials) => <Text>{formatBalance(financials?.companyShare)}</Text>, // Отображаем через companyShare
      responsive: ['lg'],
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (text, record) => (
        <Tooltip title="Подробнее">
          <Link to={`/archived-requests/${record.id}`}>
            <Button
              type="primary"
              shape="circle"
              icon={<ExclamationCircleOutlined />}
              size="small"
              className="details-button" // Добавляем уникальный класс
              aria-label="Подробнее"
            />
          </Link>
        </Tooltip>
      ),
    },
  ];

  return (
    <Row justify="center">
      <Col xs={24} sm={22} md={20} lg={18} xl={16}>
        <div className="archived-requests-container">
          <Title level={2} className="archived-title">
            Архив заявок
          </Title>
          {loading ? (
            <div className="spinner-container">
              <Spin size="large" tip="Загрузка..." />
            </div>
          ) : archivedRequests.length === 0 ? (
            <div className="no-requests-container">
              <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#dc3545' }} />
              <Text className="no-requests-text">Нет архивированных заявок.</Text>
            </div>
          ) : (
            <>
              {/* Таблица для десктопа и планшетов */}
              <Table
                columns={columns}
                dataSource={archivedRequests}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: '100%' }}
                className="archived-requests-table"
                bordered
              />

              {/* Карточки для мобильных устройств */}
              <div className="archived-requests-cards">
                <Row gutter={[16, 16]} justify="center">
                  {archivedRequests.map(request => (
                    <Col xs={24} sm={20} md={16} lg={12} key={request.id}>
                      <Card
                        title={<Text strong className="card-title">{request.name}</Text>}
                        extra={
                          <Tooltip title="Подробнее">
                            <Link to={`/archived-requests/${request.id}`}>
                              <Button
                                type="primary"
                                shape="circle"
                                icon={<ExclamationCircleOutlined />}
                                size="small"
                                className="details-button" // Добавляем уникальный класс
                                aria-label="Подробнее"
                              />
                            </Link>
                          </Tooltip>
                        }
                        bordered={false}
                        className="request-card"
                      >
                        <p className="card-text">
                          <Text strong>Модель:</Text> {request.carModel} ({request.carYear})
                        </p>
                        <p className="card-text">
                          <Text strong>Описание:</Text> {request.issue}
                        </p>
                        <p className="card-text">
                          <Text strong>Работники:</Text>{' '}
                          {getWorkerNames(request.assignedWorkers || [])}
                        </p>
                        <p className="card-text">
                          <Text strong>Дата архивации:</Text>{' '}
                          {new Date(request.archivedAt).toLocaleString('ru-RU')}
                        </p>
                        <p className="card-text">
                          <Text strong>Баланс:</Text> {formatBalance(request.financials?.companyShare)} {/* Отображаем через companyShare */}
                        </p>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </>
          )}
        </div>
      </Col>
    </Row>
  );
}

export default ArchivedRequestsPage;
