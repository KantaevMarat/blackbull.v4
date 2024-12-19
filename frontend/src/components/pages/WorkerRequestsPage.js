// src/components/pages/WorkerRequestsPage.jsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  Layout,
  Card,
  List,
  Typography,
  Spin,
  Row,
  Col,
  Tag,
  Avatar,
  Button,
  Space
} from 'antd';
import {
  CarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  DollarCircleOutlined,
  ToolOutlined
} from '@ant-design/icons';
import moment from 'moment';
import 'moment/locale/ru';
import { useNavigate } from 'react-router-dom';
import '../css/WorkerRequestsPage.css';

const { Content } = Layout;
const { Title, Text } = Typography;

const WorkerRequestsPage = () => {
  const { currentUser } = useAuth();
  const [activeRequests, setActiveRequests] = useState([]);
  const [workerFinances, setWorkerFinances] = useState({});
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  
  moment.locale('ru');

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const workerIdentifier = currentUser.uid;
      if (!workerIdentifier) {
        console.warn('У текущего пользователя нет uid');
        setLoading(false);
        return;
      }

      try {
        // Загружаем рабочих
        const workersSnapshot = await getDocs(collection(db, 'workers'));
        const fetchedWorkers = workersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setWorkers(fetchedWorkers);

        // Загружаем заявки, к которым назначен текущий рабочий
        const activeQuery = query(
          collection(db, 'requests'),
          where('assignedWorkers', 'array-contains', currentUser.workerId) // используем currentUser.workerId, предположим он есть
        );
        const activeSnapshot = await getDocs(activeQuery);
        const fetchedActiveRequests = activeSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setActiveRequests(fetchedActiveRequests);

        // Загружаем финансовые записи для текущего рабочего
        const financesQuery = query(
          collection(db, 'financials'),
          where('workerId', '==', currentUser.workerId) // используем workerId, по аналогии с кодом
        );
        const financesSnapshot = await getDocs(financesQuery);
        const fetchedWorkerFinances = financesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const paymentsByRequestId = {};

        fetchedWorkerFinances.forEach((record) => {
          if (record.requestId) {
            if (!Array.isArray(paymentsByRequestId[record.requestId])) {
              paymentsByRequestId[record.requestId] = [];
            }
            paymentsByRequestId[record.requestId].push(record);
          }
        });

        setWorkerFinances(paymentsByRequestId);

      } catch (error) {
        console.error('Ошибка загрузки заявок или финансов:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const calculateWorkerShare = (financials = [], assignedWorkers, currentWorkerId) => {
    if (!Array.isArray(financials)) {
      console.error('Ожидается массив financials, но получено: ', financials);
      return 0;
    }

    const totalIncome = financials
      .filter((record) => record.type === 'income')
      .reduce((sum, record) => sum + parseFloat(record.amount), 0);

    const totalExpense = financials
      .filter((record) => record.type === 'expense')
      .reduce((sum, record) => sum + parseFloat(record.amount), 0);

    const netIncome = totalIncome - totalExpense;

    if (netIncome <= 0 || !assignedWorkers || assignedWorkers.length === 0) {
      return 0;
    }

    // Находим всех назначенных работников
    const assignedWorkersData = assignedWorkers.map((workerId) =>
      workers.find((w) => w.id === workerId)
    ).filter(Boolean); // отфильтровываем тех, кого не нашли

    // Считаем суммарную ставку всех назначенных работников
    const totalWorkerRate = assignedWorkersData.reduce((sum, w) => sum + (w.rate || 0), 0);

    if (totalWorkerRate === 0) {
      return 0;
    }

    // Доля текущего рабочего
    const currentWorker = workers.find((w) => w.id === currentWorkerId);
    if (!currentWorker || currentWorker.rate === undefined) {
      return 0;
    }

    // Рассчитываем долю по ставке
    const workerShare = Math.floor((netIncome * currentWorker.rate) / 100);
    return workerShare;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="Загрузка..." />
      </div>
    );
  }

  return (
    <Layout className="worker-requests-layout">
      <Content className="worker-requests-content">
        <Title level={2} className="page-title">
          Мои заявки
        </Title>

        <Card
          title="Активные заявки"
          className="active-requests-card"
          headStyle={{ textAlign: 'center', fontSize: '1.5rem' }}
        >
          {activeRequests.length > 0 ? (
            <List
              dataSource={activeRequests}
              renderItem={(request) => {
                const financials = workerFinances[request.id] || [];
                // Вместо perWorkerShare считаем индивидуальную долю данного рабочего
                const workerIndividualShare = calculateWorkerShare(
                  financials,
                  request.assignedWorkers,
                  currentUser.workerId // предполагаем что у currentUser есть workerId
                );

                return (
                  <List.Item>
                    <Card className="request-card" hoverable bordered={false}>
                      <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={4} className="avatar-col">
                          <Avatar
                            size={64}
                            style={{ backgroundColor: '#1890ff' }}
                            icon={<CarOutlined />}
                          />
                        </Col>
                        <Col xs={24} md={14} className="info-col">
                          <Title level={4} className="request-title">
                            {request.carModel} ({request.carYear})
                          </Title>
                          <Text className="request-description">
                            <FileTextOutlined /> {request.issue}
                          </Text>
                          <div className="request-date">
                            <CalendarOutlined />{' '}
                            {request.startDateTime
                              ? moment(request.startDateTime.toDate()).format('LL')
                              : 'Дата не указана'}
                          </div>
                        </Col>
                        <Col xs={24} md={6} className="status-col">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Tag color="blue" className="status-tag">
                              {request.status === 'pending'
                                ? 'В сервисе'
                                : request.status === 'new'
                                ? 'Новая'
                                : request.status}
                            </Tag>
                            {workerIndividualShare > 0 ? (
                              <div className="amount-badge">
                                <DollarCircleOutlined
                                  style={{
                                    fontSize: '36px',
                                    color: '#52c41a',
                                  }}
                                />
                                <Text strong className="amount-text">
                                  {workerIndividualShare} ₽
                                </Text>
                              </div>
                            ) : (
                              <Text type="secondary">
                                Ожидаемая выплата не указана
                              </Text>
                            )}

                            {/* Кнопка перехода на диагностическую карту */}
                            <Button
                              type="text"
                              icon={<ToolOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                              onClick={() => navigate(`/request/${request.id}/diagnostic`)}
                              title="Диагностическая карта"
                            />
                          </Space>
                        </Col>
                      </Row>
                    </Card>
                  </List.Item>
                );
              }}
            />
          ) : (
            <Text>Нет активных заявок.</Text>
          )}
        </Card>
      </Content>
    </Layout>
  );
};

export default WorkerRequestsPage;
