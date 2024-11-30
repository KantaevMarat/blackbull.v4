// src/components/pages/ConfirmationRequestsPage.js

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import {
  Typography,
  Button,
  Card,
  Space,
  Spin,
  Modal,
  Row,
  Col,
  List,
  Tag, 
  Descriptions,
} from 'antd';
import { CheckOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../css/ConfirmationRequestsPage.css'; // Для дополнительных пользовательских стилей

const { Title, Text } = Typography;
const { confirm } = Modal;

function ConfirmationRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0); // Общий баланс компании

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [requestsSnapshot, workersSnapshot, transactionsSnapshot] =
          await Promise.all([
            getDocs(
              query(
                collection(db, 'requests'),
                where('status', '==', 'confirmation')
              )
            ),
            getDocs(collection(db, 'workers')),
            getDocs(collection(db, 'transactions')), // Получаем транзакции компании
          ]);

        // Заявки на подтверждение
        setRequests(
          requestsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );

        // Работники
        setWorkers(
          workersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );

        // Рассчитываем общий баланс только для доходов и расходов
        const total = transactionsSnapshot.docs.reduce((sum, transactionDoc) => {
          const transaction = transactionDoc.data();
          if (transaction.type === 'income') {
            return sum + transaction.amount;
          } else if (transaction.type === 'expense') {
            return sum - transaction.amount;
          }
          return sum; // Игнорируем записи типа calculation
        }, 0);

        setTotalBalance(total);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        toast.error('Ошибка при загрузке данных.', {
          position: 'top-center',
          autoClose: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateShares = (financialsData, assignedWorkers) => {
    const totalIncome = financialsData.reduce((sum, record) => {
      return record.type === 'income' ? sum + record.amount : sum;
    }, 0);

    const totalWorkerRate = assignedWorkers.reduce((sum, workerId) => {
      const worker = workers.find((w) => w.id === workerId);
      return sum + (worker?.rate || 0);
    }, 0);

    const companyShare = totalIncome; // Полная сумма идет компании

    const workerShares = assignedWorkers.map((workerId) => {
      const worker = workers.find((w) => w.id === workerId);
      const workerRate = worker?.rate || 0;
      const workerShare = Math.floor((totalIncome * workerRate) / 100);
      return {
        workerId,
        name: worker?.name || 'Неизвестный',
        share: workerShare,
      };
    });

    return {
      companyShare,
      workerShares,
    };
  };

  const confirmRequest = async (id) => {
    try {
      const requestDoc = doc(db, 'requests', id);
      const archivedDoc = doc(db, 'archiveRequests', id);
      const requestSnapshot = await getDoc(requestDoc);

      if (!requestSnapshot.exists()) {
        toast.error('Заявка не найдена.', {
          position: 'top-center',
          autoClose: 3000,
        });
        return;
      }

      const requestData = requestSnapshot.data();
      const assignedWorkers = requestData.assignedWorkers || [];
      const requestId = id;

      if (assignedWorkers.length === 0) {
        toast.error('Нет назначенных работников для этой заявки.', {
          position: 'top-center',
          autoClose: 3000,
        });
        return;
      }

      const financialsQuery = query(
        collection(db, 'financials'),
        where('requestId', '==', requestId)
      );
      const financialsSnapshot = await getDocs(financialsQuery);
      const financialsData = financialsSnapshot.docs.map((doc) => doc.data());

      const { companyShare, workerShares } = calculateShares(
        financialsData,
        assignedWorkers
      );

      const batch = writeBatch(db);

      // 100% дохода идет компании
      const companyTransactionRef = doc(collection(db, 'transactions'));
      batch.set(companyTransactionRef, {
        type: 'income',
        amount: companyShare,
        description: `Доход компании от заявки ${requestId}`,
        date: new Date().toISOString(),
      });

      // Добавляем расчеты долей работников в общую коллекцию financials
      workerShares.forEach(({ workerId, share }) => {
        const financialRecordRef = doc(collection(db, 'financials'));
        batch.set(financialRecordRef, {
          workerId,
          requestId,
          type: 'income', // Тип должен быть 'income', чтобы учитывался в балансе
          amount: share,
          description: `Выплата за работу по заявке ${requestId}`,
          date: new Date().toISOString(),
          auto: true,
          source: 'company',
        });
      });

      // Архивируем заявку
      const archivedData = {
        ...requestData,
        archivedAt: new Date().toISOString(),
        status: 'archived',
        financials: {
          companyShare,
          workerShares,
        },
      };

      batch.set(archivedDoc, archivedData);

      // Удаление оригинальной заявки после архивирования
      batch.delete(requestDoc);

      await batch.commit();

      setRequests((prev) => prev.filter((req) => req.id !== id));
      setTotalBalance((prev) => prev + companyShare); // Обновляем общий баланс
      toast.success('Заявка успешно подтверждена и перемещена в архив.', {
        position: 'top-center',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Ошибка подтверждения заявки:', error);
      toast.error('Ошибка при подтверждении заявки.', {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  const showConfirmModal = (id) => {
    confirm({
      title: 'Вы уверены, что хотите подтвердить эту заявку?',
      icon: <ExclamationCircleOutlined />,
      content: 'После подтверждения заявка будет перемещена в архив.',
      okText: 'Да, подтвердить',
      okType: 'primary',
      cancelText: 'Отмена',
      onOk() {
        confirmRequest(id);
      },
    });
  };

  if (loading) {
    return (
      <div className="spin-container">
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="confirmation-container">
        <Title level={2} className="balance-title">
          Баланс компании: {totalBalance.toFixed(2)} ₽
        </Title>
        <Card className="no-requests-card">
          <ExclamationCircleOutlined className="no-requests-icon" />
          <Text type="secondary" className="no-requests-text">
            Нет заявок на подтверждение
          </Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="confirmation-container">
      <ToastContainer />
      <Title
        level={2}
        className="main-title"
      >
        Подтверждение заявок
      </Title>
      <Title level={4} className="balance-title">
        Баланс компании: {totalBalance.toFixed(2)} ₽
      </Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={[16, 16]} justify="center">
          {requests.map((request) => (
            <Col
              key={request.id}
              xs={24}
              sm={24}
              md={12}
              lg={8}
              xl={6}
              className="request-col"
            >
              <Card
                title={`Заявка от ${request.name}`}
                bordered
                hoverable
                className="confirmation-card"
                actions={[
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => showConfirmModal(request.id)}
                    className="confirm-button"
                  >
                    Подтвердить
                  </Button>,
                ]}
              >
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Телефон">
                    {request.phone}
                  </Descriptions.Item>
                  <Descriptions.Item label="Дата">
                    {request.startDateTime
                      ? new Date(request.startDateTime).toLocaleString('ru-RU')
                      : 'Не указано'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Модель авто">
                    {request.carModel}
                  </Descriptions.Item>
                  <Descriptions.Item label="Год авто">
                    {request.carYear}
                  </Descriptions.Item>
                  <Descriptions.Item label="Статус">
                    <Tag color="blue">Подтверждение</Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          ))}
        </Row>
      </Space>
    </div>
  );
}

export default ConfirmationRequestsPage;
