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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  moment.locale('ru');

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const workerUid = currentUser.uid;
      if (!workerUid) {
        console.warn('У текущего пользователя нет uid');
        setLoading(false);
        return;
      }

      try {
        // Загружаем заявки, где assignedWorkers содержит uid текущего рабочего
        const activeQuery = query(
          collection(db, 'requests'),
          where('assignedWorkers', 'array-contains', workerUid)
        );
        const activeSnapshot = await getDocs(activeQuery);
        const fetchedActiveRequests = activeSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setActiveRequests(fetchedActiveRequests);
      } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [currentUser]);

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
                // Так как мы сохраняем workerShares в документе заявки,
                // Найдём долю текущего рабочего среди workerShares
                let currentWorkerShare = 0;
                if (request.workerShares && Array.isArray(request.workerShares)) {
                  const currentWorkerData = request.workerShares.find(
                    (w) => w.uid === currentUser.uid
                  );
                  if (currentWorkerData) {
                    currentWorkerShare = currentWorkerData.share;
                  }
                }

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
                            {currentWorkerShare > 0 ? (
                              <div className="amount-badge">
                                <DollarCircleOutlined
                                  style={{
                                    fontSize: '36px',
                                    color: '#52c41a',
                                  }}
                                />
                                <Text strong className="amount-text">
                                  {currentWorkerShare} ₽
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
