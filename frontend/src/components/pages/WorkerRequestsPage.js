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
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  
  moment.locale('ru');

  useEffect(() => {
    const fetchRequests = async () => {
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
        const activeQuery = query(
          collection(db, 'requests'),
          where('assignedWorkers', 'array-contains', workerIdentifier)
        );
        const activeSnapshot = await getDocs(activeQuery);
        const fetchedActiveRequests = activeSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setActiveRequests(fetchedActiveRequests);

        const financesQuery = query(
          collection(db, 'financials'),
          where('workerId', '==', workerIdentifier)
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

    fetchRequests();
  }, [currentUser]);

  const calculateShares = (financials = [], assignedWorkers) => {
    if (!Array.isArray(financials)) {
      console.error('Ожидается массив financials, но получено: ', financials);
      return { companyShare: 0, perWorkerShare: 0 };
    }

    const totalIncome = financials
      .filter((record) => record.type === 'income')
      .reduce((sum, record) => sum + parseFloat(record.amount), 0);

    const totalExpense = financials
      .filter((record) => record.type === 'expense')
      .reduce((sum, record) => sum + parseFloat(record.amount), 0);

    const netIncome = totalIncome - totalExpense;
    const companyShare = Math.floor(netIncome * 0.5);
    const workerTotal = Math.floor(netIncome * 0.5);

    const perWorkerShare =
      assignedWorkers && assignedWorkers.length > 0
        ? Math.floor(workerTotal / assignedWorkers.length)
        : 0;

    return { companyShare, perWorkerShare };
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
                const { perWorkerShare } = calculateShares(
                  financials,
                  request.assignedWorkers
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
                            {perWorkerShare > 0 ? (
                              <div className="amount-badge">
                                <DollarCircleOutlined
                                  style={{
                                    fontSize: '36px',
                                    color: '#52c41a',
                                  }}
                                />
                                <Text strong className="amount-text">
                                  {perWorkerShare} ₽
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
