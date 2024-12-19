// src/components/pages/RequestDetailsPage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import moment from 'moment';
import 'moment/locale/ru';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  List,
  Typography,
  Space,
  Spin,
  Modal,
  Tag,
  Tooltip,
  Checkbox,
  Row,
  Col,
  Divider,
  InputNumber,
} from 'antd';
import {
  CloseOutlined,
  CheckOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import LoadingSpinner from '../LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'antd/dist/reset.css'; 
import '../css/RequestDetailsPage.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

function RequestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [newFinancial, setNewFinancial] = useState({
    type: 'income',
    amount: '',
    description: '',
  });
  const [startDateTime, setStartDateTime] = useState(null);
  const [endDateTime, setEndDateTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState([]);
  const [companyShare, setCompanyShare] = useState(0);
  const [workerShare, setWorkerShare] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);

  // Состояние для редактирования ставки работника
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [editingWorkerRate, setEditingWorkerRate] = useState(null);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const requestDocRef = doc(db, 'requests', id);
        const requestSnapshot = await getDoc(requestDocRef);
        if (requestSnapshot.exists()) {
          const requestData = requestSnapshot.data();
          setRequest({
            id,
            ...requestData,
            startDateTime: requestData.startDateTime
              ? requestData.startDateTime.toDate()
              : null,
            endDateTime: requestData.endDateTime
              ? requestData.endDateTime.toDate()
              : null,
            createdAt: requestData.createdAt
              ? requestData.createdAt.toDate()
              : null,
            difficulty: requestData.difficulty || 1,
            urgency: requestData.urgency || 1,
          });
          setSelectedWorkers(requestData.assignedWorkers || []);
        } else {
          toast.error('Заявка не найдена.', {
            position: 'top-center',
            autoClose: 3000,
          });
          navigate('/requests');
        }
      } catch (error) {
        console.error('Ошибка загрузки заявки:', error);
        toast.error('Произошла ошибка при загрузке заявки.', {
          position: 'top-center',
          autoClose: 3000,
        });
        navigate('/requests');
      }
    };

    const fetchWorkers = async () => {
      try {
        const workersCollection = await getDocs(collection(db, 'workers'));
        setWorkers(
          workersCollection.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      } catch (error) {
        console.error('Ошибка загрузки работников:', error);
        toast.error('Произошла ошибка при загрузке работников.', {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    };

    const fetchFinancials = async () => {
      try {
        const financialsQuery = query(
          collection(db, 'financials'),
          where('requestId', '==', id)
        );
        const financialsSnapshot = await getDocs(financialsQuery);
        const fetchedFinancials = financialsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date ? doc.data().date.toDate() : null,
        }));
        setFinancials(fetchedFinancials);

        if (fetchedFinancials.length > 0 && selectedWorkers.length > 0) {
          calculateShares(fetchedFinancials);
        }
      } catch (error) {
        console.error('Ошибка загрузки финансовых записей:', error);
      }
    };

    const loadData = async () => {
      await Promise.all([fetchRequest(), fetchWorkers(), fetchFinancials()]);
      setLoading(false);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  useEffect(() => {
    if (financials.length > 0 && selectedWorkers.length > 0) {
      calculateShares(financials);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financials, selectedWorkers]);

  const calculateShares = (financials) => {
    const totalIncome = financials
      .filter((record) => record.type === 'income')
      .reduce((sum, record) => sum + parseFloat(record.amount), 0);

    const totalExpense = financials
      .filter((record) => record.type === 'expense')
      .reduce((sum, record) => sum + parseFloat(record.amount), 0);

    const netIncome = totalIncome - totalExpense;

    if (netIncome <= 0 || selectedWorkers.length === 0) {
      setCompanyShare(0);
      setWorkerShare([]);
      return;
    }

    const totalWorkerRate = selectedWorkers.reduce((sum, workerId) => {
      const worker = workers.find((w) => w.id === workerId);
      return sum + (worker?.rate || 0);
    }, 0);

    const companyShare = Math.floor((netIncome * (100 - totalWorkerRate)) / 100);

    const workerShares = selectedWorkers.map((workerId) => {
      const worker = workers.find((w) => w.id === workerId);
      const rate = worker?.rate || 0;
      return {
        id: workerId,
        name: worker?.name || 'Неизвестно',
        share: Math.floor((netIncome * rate) / 100),
      };
    });

    setCompanyShare(companyShare);
    setWorkerShare(workerShares);
  };

  const handleFinancialChange = (e) => {
    setNewFinancial({ ...newFinancial, [e.target.name]: e.target.value });
  };

  const handleAddFinancial = async () => {
    const { type, amount, description } = newFinancial;

    if (!amount || !description) {
      toast.error('Пожалуйста, заполните все поля финансовой записи.', {
        position: 'top-center',
        autoClose: 3000,
      });
      return;
    }

    const financialRecord = {
      requestId: id,
      type,
      amount: parseFloat(amount),
      description,
      date: Timestamp.fromDate(new Date()),
    };

    try {
      const financialsCollectionRef = collection(db, 'financials');
      await addDoc(financialsCollectionRef, financialRecord);

      setFinancials((prevFinancials) => {
        const updatedFinancials = [...prevFinancials, financialRecord];
        calculateShares(updatedFinancials);
        return updatedFinancials;
      });

      setNewFinancial({
        type: 'income',
        amount: '',
        description: '',
      });

      toast.success('Финансовая запись добавлена успешно!', {
        position: 'top-center',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Ошибка добавления финансовой записи:', error);
      toast.error('Произошла ошибка при добавлении записи.', {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  const handleWorkerClick = async (workerId) => {
    let updatedWorkers = [...selectedWorkers];

    if (selectedWorkers.includes(workerId)) {
      updatedWorkers = updatedWorkers.filter((id) => id !== workerId);
    } else {
      updatedWorkers.push(workerId);
    }

    setSelectedWorkers(updatedWorkers);

    try {
      const requestDocRef = doc(db, 'requests', id);
      await updateDoc(requestDocRef, {
        assignedWorkers: updatedWorkers,
      });
      toast.success('Работники успешно обновлены.', {
        position: 'top-center',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Ошибка обновления работников:', error);
      toast.error('Ошибка при обновлении списка работников.', {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  const calculateTimeLeft = () => {
    if (!request.endDateTime) return 'Дедлайн не указан';

    const now = new Date();
    const timeDifference = request.endDateTime - now;

    if (timeDifference <= 0) {
      return 'Время истекло';
    }

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor(
      (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
    );

    let result = '';
    if (days > 0) result += `${days} дн `;
    if (hours > 0) result += `${hours} ч `;
    if (minutes > 0) result += `${minutes} мин`;

    return `Осталось: ${result.trim()}`;
  };

  const handleStartDateTimeChange = (date) => {
    setStartDateTime(date);
  };

  const handleEndDateTimeChange = (date) => {
    setEndDateTime(date);
  };

  const handleCompleteOrder = async () => {
    try {
      await updateDoc(doc(db, 'requests', id), {
        status: 'confirmation',
      });

      toast.success('Заявка успешно выполнена и отправлена на подтверждение!', {
        position: 'top-center',
        autoClose: 3000,
      });

      navigate('/confirmations');
    } catch (error) {
      console.error('Ошибка выполнения заявки:', error);
      toast.error('Произошла ошибка при выполнении заявки.', {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  const showConfirm = () => {
    confirm({
      title: 'Вы уверены, что хотите завершить заказ?',
      icon: <ExclamationCircleOutlined />,
      content: 'После завершения заказ будет отправлен на подтверждение.',
      okText: 'Да, завершить',
      okType: 'primary',
      cancelText: 'Отмена',
      onOk() {
        handleCompleteOrder();
      },
    });
  };

  const handleEditWorkerRate = (workerId, currentRate) => {
    setEditingWorkerId(workerId);
    setEditingWorkerRate(currentRate);
  };

  const handleSaveWorkerRate = async (workerId) => {
    const workerRef = doc(db, 'workers', workerId);

    try {
      await updateDoc(workerRef, {
        rate: Number(editingWorkerRate),
      });
      const updatedWorkers = workers.map((w) =>
        w.id === workerId ? { ...w, rate: Number(editingWorkerRate) } : w
      );
      setWorkers(updatedWorkers);
      setEditingWorkerId(null);
      setEditingWorkerRate(null);
      toast.success('Ставка работника успешно обновлена!', {
        position: 'top-center',
        autoClose: 3000,
      });

      calculateShares(financials);
    } catch (error) {
      console.error('Ошибка обновления ставки работника:', error);
      toast.error('Произошла ошибка при обновлении ставки.', {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  if (loading || !request) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      <ToastContainer />

      <Title level={2} style={{ textAlign: 'center', marginTop: '50px' }}>
        Детали заявки
      </Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Информация о клиенте" bordered={false}>
              <Row gutter={[8, 8]}>
                <Col span={24}>
                  <Text strong>Имя:</Text> {request.userName}
                </Col>
                <Col span={24}>
                  <Text strong>Телефон:</Text> {request.phone}
                </Col>
                <Col span={24}>
                  <Text strong>Модель авто:</Text> {request.carModel}
                </Col>
                <Col span={24}>
                  <Text strong>Год авто:</Text> {request.carYear}
                </Col>
                <Col span={24}>
                  <Text strong>Описание проблемы:</Text> {request.issue}
                </Col>
                <Col span={24}>
                  <Text strong>Время создания заявки:</Text>{' '}
                  {request.createdAt
                    ? request.createdAt.toLocaleString('ru-RU')
                    : 'Не указано'}
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Управление заявкой" bordered={false}>
              <Form layout="vertical">
                <Form.Item label="Статус">
                  <Select
                    value={request.status}
                    onChange={async (value) => {
                      try {
                        await updateDoc(doc(db, 'requests', id), {
                          status: value,
                        });
                        toast.success('Статус заявки обновлен.', {
                          position: 'top-center',
                          autoClose: 3000,
                        });
                      } catch (error) {
                        console.error('Ошибка обновления статуса:', error);
                        toast.error('Ошибка при обновлении статуса.', {
                          position: 'top-center',
                          autoClose: 3000,
                        });
                      }
                    }}
                  >
                    <Option value="new">Новая</Option>
                    <Option value="pending">В сервисе</Option>
                    <Option value="canceled">Отменено</Option>
                    <Option value="confirmation">Подтверждение</Option>
                    <Option value="completed">Отдана клиенту</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="Дата и время начала">
                  <DatePicker
                    showTime
                    value={startDateTime ? moment(startDateTime) : null}
                    onChange={handleStartDateTimeChange}
                    format="DD.MM.YYYY HH:mm"
                    style={{ width: '100%' }}
                    placeholder="Не указано"
                  />
                </Form.Item>

                <Form.Item label="Дата и время окончания">
                  <DatePicker
                    showTime
                    value={endDateTime ? moment(endDateTime) : null}
                    onChange={handleEndDateTimeChange}
                    format="DD.MM.YYYY HH:mm"
                    style={{ width: '100%' }}
                    placeholder="Не указано"
                  />
                </Form.Item>

                <Form.Item label="Дедлайн">
                  <Text>{calculateTimeLeft()}</Text>
                </Form.Item>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Button
                      type="default"
                      onClick={() => setShowCalendar(!showCalendar)}
                      block
                    >
                      {showCalendar ? 'Отмена' : 'Изменить дату и время'}
                    </Button>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Button
                      type="primary"
                      danger
                      icon={<CheckOutlined />}
                      onClick={showConfirm}
                      block
                    >
                      Выполнить заказ
                    </Button>
                  </Col>
                </Row>
              </Form>

              {showCalendar && (
                <Space
                  direction="vertical"
                  size="large"
                  style={{ marginTop: '16px', width: '100%' }}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <DatePicker
                        showTime
                        value={startDateTime ? moment(startDateTime) : null}
                        onChange={handleStartDateTimeChange}
                        format="DD.MM.YYYY HH:mm"
                        style={{ width: '100%' }}
                        placeholder="Выберите дату и время начала"
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                      <DatePicker
                        showTime
                        value={endDateTime ? moment(endDateTime) : null}
                        onChange={handleEndDateTimeChange}
                        format="DD.MM.YYYY HH:mm"
                        style={{ width: '100%' }}
                        placeholder="Выберите дату и время окончания"
                      />
                    </Col>
                  </Row>
                  <Button
                    type="primary"
                    onClick={async () => {
                      if (startDateTime && endDateTime) {
                        try {
                          await updateDoc(doc(db, 'requests', id), {
                            startDateTime: Timestamp.fromDate(
                              startDateTime.toDate()
                            ),
                            endDateTime: Timestamp.fromDate(endDateTime.toDate()),
                          });
                          setShowCalendar(false);
                          toast.success('Даты успешно обновлены.', {
                            position: 'top-center',
                            autoClose: 3000,
                          });
                        } catch (error) {
                          console.error('Ошибка обновления дат:', error);
                          toast.error('Произошла ошибка при обновлении дат.', {
                            position: 'top-center',
                            autoClose: 3000,
                          });
                        }
                      } else {
                        toast.error('Пожалуйста, выберите обе даты.', {
                          position: 'top-center',
                          autoClose: 3000,
                        });
                      }
                    }}
                    block
                  >
                    Сохранить
                  </Button>
                </Space>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Назначить работников" bordered={false}>
              <List
                grid={{
                  gutter: 16,
                  xs: 1,
                  sm: 2,
                  md: 3,
                  lg: 4,
                  xl: 4,
                  xxl: 6,
                }}
                dataSource={workers}
                renderItem={(worker) => (
                  <List.Item>
                    <Card
                      hoverable
                      style={{
                        background: selectedWorkers.includes(worker.id)
                          ? '#e6f7ff'
                          : '#fff',
                        border:
                          selectedWorkers.includes(worker.id) && '2px solid #1890ff',
                      }}
                    >
                      <Checkbox
                        checked={selectedWorkers.includes(worker.id)}
                        onChange={() => handleWorkerClick(worker.id)}
                        style={{ marginBottom: '8px' }}
                      >
                        {worker.name}
                      </Checkbox>
                      {worker.rate !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {editingWorkerId === worker.id ? (
                            <>
                              <InputNumber
                                min={0}
                                max={100}
                                value={editingWorkerRate}
                                onChange={(value) => setEditingWorkerRate(value)}
                                style={{ width: '60px' }}
                              />
                              <Button
                                type="text"
                                icon={<SaveOutlined style={{ color: 'green' }} />}
                                onClick={() => handleSaveWorkerRate(worker.id)}
                              />
                            </>
                          ) : (
                            <>
                              <Tag color="geekblue">{worker.rate}%</Tag>
                              <Button
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() =>
                                  handleEditWorkerRate(worker.id, worker.rate)
                                }
                              />
                            </>
                          )}
                        </div>
                      )}
                    </Card>
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Добавить финансовую запись" bordered={false}>
              <Form layout="vertical" onFinish={handleAddFinancial}>
                <Form.Item label="Тип" required>
                  <Select
                    name="type"
                    value={newFinancial.type}
                    onChange={(value) =>
                      setNewFinancial({ ...newFinancial, type: value })
                    }
                  >
                    <Option value="income">Доход</Option>
                    <Option value="expense">Расход</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Сумма" required>
                  <Input
                    name="amount"
                    type="number"
                    min="0"
                    value={newFinancial.amount}
                    onChange={handleFinancialChange}
                    placeholder="Сумма"
                  />
                </Form.Item>
                <Form.Item label="Описание" required>
                  <Input
                    name="description"
                    value={newFinancial.description}
                    onChange={handleFinancialChange}
                    placeholder="Описание"
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                    block
                  >
                    Добавить
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card title="История доходов и расходов" bordered={false}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Space>
                  <Text strong>Доля компании:</Text>
                  <Tag color="blue">{companyShare} руб.</Tag>
                </Space>
                <Space>
                  <Text strong>Доли рабочих:</Text>
                  {workerShare.map((worker) => (
                    <Tag color="green" key={worker.id}>
                      {worker.name}: {worker.share} руб.
                    </Tag>
                  ))}
                </Space>
                <List
                  itemLayout="horizontal"
                  dataSource={financials}
                  renderItem={(financial) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            {financial.type === 'income' ? (
                              <Tag color="green">Доход</Tag>
                            ) : (
                              <Tag color="red">Расход</Tag>
                            )}
                            <Text>{financial.amount} руб.</Text>
                          </Space>
                        }
                        description={
                          financial.date
                            ? `${financial.description} - ${financial.date.toLocaleString(
                                'ru-RU'
                              )}`
                            : financial.description
                        }
                      />
                    </List.Item>
                  )}
                />
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Кнопка перехода на страницу диагностики */}
        <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
          <Col xs={24}>
            <Button type="primary" block onClick={() => navigate(`/requests/${id}/diagnostic`)}>
              Перейти к диагностической карте
            </Button>
          </Col>
        </Row>
      </Space>
    </div>
  );
}

export default RequestDetailsPage;
