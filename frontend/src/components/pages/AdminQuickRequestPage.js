// src/components/pages/AdminQuickRequestPage.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  Form,
  Input,
  Typography,
  Row,
  Col,
  Card,
  DatePicker,
  TimePicker,
  Button,
  List,
  Tag,
  Checkbox,
  InputNumber,
  Select,
  Space
} from 'antd';
import moment from 'moment';
import 'moment/locale/ru';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'antd/dist/reset.css';
import {
  PlusOutlined,
  CheckOutlined,
  EditOutlined,
  SaveOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * Компонент: AdminQuickRequestPage
 * 
 * 1) Заполняется форма клиента (имя, телефон, авто, проблема, дата/время).
 * 2) Выбираются несколько работников (Checkbox).
 * 3) Добавляются фин. записи (доходы/расходы).
 * 4) Отображается расчёт долей (компании и работников).
 * 5) По кнопке "Завершить запись" создаётся заявка со статусом "confirmation", 
 *    чтобы далее появиться на ConfirmationRequestsPage.
 */

const AdminQuickRequestPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Список всех работников из Firestore (коллекция 'workers')
  const [workers, setWorkers] = useState([]);
  // ID выбранных работников
  const [selectedWorkers, setSelectedWorkers] = useState([]);

  // Массив фин. записей (income/expense)
  const [financials, setFinancials] = useState([]);
  // Новая фин. запись
  const [newFinancial, setNewFinancial] = useState({
    type: 'income',
    amount: '',
    description: '',
  });

  // Доли компании и работников
  const [companyShare, setCompanyShare] = useState(0);
  const [workerShares, setWorkerShares] = useState([]);

  // Редактирование ставки
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [editingWorkerRate, setEditingWorkerRate] = useState(null);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'workers'));
        const allWorkers = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Неизвестно',
            rate: typeof data.rate === 'number' ? data.rate : 0
          };
        });
        setWorkers(allWorkers);
      } catch (error) {
        console.error('Ошибка загрузки работников:', error);
        toast.error('Не удалось загрузить список работников.');
      }
    };
    fetchWorkers();
  }, []);

  // Пересчитываем доли при изменении фин. записей / списка выбранных работников
  useEffect(() => {
    if (financials.length === 0 || selectedWorkers.length === 0) {
      setCompanyShare(0);
      setWorkerShares([]);
      return;
    }
    calculateShares();
  }, [financials, selectedWorkers]);

  // Расчёт долей
  const calculateShares = () => {
    const totalIncome = financials
      .filter((f) => f.type === 'income')
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    const totalExpense = financials
      .filter((f) => f.type === 'expense')
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    const netIncome = totalIncome - totalExpense;
    if (netIncome <= 0 || selectedWorkers.length === 0) {
      setCompanyShare(0);
      setWorkerShares([]);
      return;
    }

    // Собираем данные о назначенных работниках
    const assigned = selectedWorkers
      .map((wid) => workers.find((w) => w.id === wid))
      .filter(Boolean);

    const totalRate = assigned.reduce((sum, w) => sum + (w.rate || 0), 0);
    const compShare = Math.floor((netIncome * (100 - totalRate)) / 100);

    const ws = assigned.map((w) => ({
      uid: w.id,
      name: w.name,
      share: Math.floor((netIncome * w.rate) / 100),
    }));

    setCompanyShare(compShare);
    setWorkerShares(ws);
  };

  // При вводе новой фин. записи
  const handleFinancialChange = (e) => {
    setNewFinancial({ ...newFinancial, [e.target.name]: e.target.value });
  };
  const handleFinancialTypeChange = (val) => {
    setNewFinancial({ ...newFinancial, type: val });
  };

  // Кнопка "Добавить запись"
  const handleAddFinancial = () => {
    if (!newFinancial.amount || !newFinancial.description) {
      toast.error('Заполните сумму и описание!');
      return;
    }
    const record = {
      type: newFinancial.type,
      amount: parseFloat(newFinancial.amount),
      description: newFinancial.description,
      date: new Date(),
    };
    setFinancials((prev) => [...prev, record]);
    setNewFinancial({ type: 'income', amount: '', description: '' });
  };

  // Выбор / отмена выбора работника
  const handleWorkerSelect = (workerId) => {
    let updated = [...selectedWorkers];
    if (updated.includes(workerId)) {
      updated = updated.filter((id) => id !== workerId);
    } else {
      updated.push(workerId);
    }
    setSelectedWorkers(updated);
  };

  // Редактирование ставки
  const handleEditWorkerRate = (workerId, currentRate) => {
    setEditingWorkerId(workerId);
    setEditingWorkerRate(currentRate);
  };
  const handleSaveWorkerRate = async (workerId) => {
    try {
      await updateDoc(doc(db, 'workers', workerId), {
        rate: Number(editingWorkerRate),
      });
      const updated = workers.map((w) =>
        w.id === workerId ? { ...w, rate: Number(editingWorkerRate) } : w
      );
      setWorkers(updated);
      setEditingWorkerId(null);
      setEditingWorkerRate(null);

      toast.success('Ставка успешно обновлена');
    } catch (error) {
      console.error('Ошибка обновления ставки:', error);
      toast.error('Не удалось обновить ставку работника.');
    }
  };

  // При сабмите всей формы -> создаём заявку со статусом "confirmation"
  const handleFinish = async (values) => {
    try {
      const { date, time } = values;
      if (!date || !time) {
        toast.error('Укажите дату и время!');
        return;
      }
      const startDateTime = combineDateTime(date, time);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

      // Создаём документ заявки
      const requestData = {
        userName: values.userName,
        phone: values.phone || 'Не указан',
        carModel: values.carModel,
        carYear: values.carYear,
        issue: values.issue,
        startDateTime: Timestamp.fromDate(startDateTime),
        endDateTime: Timestamp.fromDate(endDateTime),
        status: 'confirmation',
        assignedWorkers: selectedWorkers, 
        companyShare,
        workerShares,
        createdAt: Timestamp.now(),
      };

      // Сохраняем заявку
      const docRef = await addDoc(collection(db, 'requests'), requestData);
      const requestId = docRef.id;

      // Сохраняем financials
      for (const f of financials) {
        await addDoc(collection(db, 'financials'), {
          requestId,
          type: f.type,
          amount: f.amount,
          description: f.description,
          date: Timestamp.fromDate(f.date),
        });
      }

      toast.success('Заявка успешно создана и отправлена на подтверждение!', {
        autoClose: 3000
      });
      form.resetFields();
      setFinancials([]);
      setSelectedWorkers([]);
      setCompanyShare(0);
      setWorkerShares([]);

      // Опционально: navigate('/confirmations') или другое действие
    } catch (error) {
      console.error('Ошибка при создании заявки:', error);
      toast.error('Не удалось создать заявку.');
    }
  };

  // Утилита объединения даты + времени
  const combineDateTime = (dateMoment, timeMoment) => {
    const year = dateMoment.year();
    const month = dateMoment.month();
    const day = dateMoment.date();

    const hour = timeMoment.hour();
    const minute = timeMoment.minute();

    return new Date(year, month, day, hour, minute, 0, 0);
  };

  return (
    <div style={{ padding: 16 }}>
      <ToastContainer />
      <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
        Быстрая заявка (статус = confirmation)
      </Title>
      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleFinish} 
        autoComplete="off"
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Информация о клиенте" bordered={false}>
              <Form.Item
                label="Имя клиента"
                name="userName"
                rules={[{ required: true, message: 'Введите имя клиента' }]}
              >
                <Input placeholder="Имя клиента" />
              </Form.Item>
              <Form.Item label="Телефон" name="phone">
                <Input placeholder="Необязательно" />
              </Form.Item>
              <Form.Item
                label="Модель авто"
                name="carModel"
                rules={[{ required: true, message: 'Введите модель авто' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Год выпуска"
                name="carYear"
                rules={[{ required: true, message: 'Введите год выпуска' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Описание проблемы"
                name="issue"
                rules={[{ required: true, message: 'Опишите проблему' }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Дата и время" bordered={false}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Дата"
                    name="date"
                    rules={[{ required: true, message: 'Укажите дату' }]}
                  >
                    <DatePicker 
                      format="DD.MM.YYYY" 
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Время"
                    name="time"
                    rules={[{ required: true, message: 'Укажите время' }]}
                  >
                    <TimePicker
                      format="HH:mm"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Card title="Назначить работников" bordered={false}>
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
                dataSource={workers}
                renderItem={(worker) => (
                  <List.Item>
                    <Card
                      hoverable
                      style={{
                        background: selectedWorkers.includes(worker.id)
                          ? '#e6f7ff'
                          : '#fff',
                        border: selectedWorkers.includes(worker.id)
                          ? '2px solid #1890ff'
                          : '1px solid #f0f0f0',
                        textAlign: 'center'
                      }}
                    >
                      <Checkbox
                        checked={selectedWorkers.includes(worker.id)}
                        onChange={() => handleWorkerSelect(worker.id)}
                      >
                        {worker.name}
                      </Checkbox>
                      <div style={{ marginTop: 8 }}>
                        {editingWorkerId === worker.id ? (
                          <>
                            <InputNumber
                              min={0}
                              max={100}
                              value={editingWorkerRate}
                              onChange={(val) => setEditingWorkerRate(val)}
                            />
                            <Button
                              type="text"
                              icon={<SaveOutlined style={{ color: 'green' }} />}
                              onClick={() => handleSaveWorkerRate(worker.id)}
                            />
                          </>
                        ) : (
                          <>
                            <Tag color="geekblue" style={{ marginRight: 8 }}>
                              {worker.rate}%
                            </Tag>
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => handleEditWorkerRate(worker.id, worker.rate)}
                            />
                          </>
                        )}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Финансовые записи" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Select
                    value={newFinancial.type}
                    onChange={handleFinancialTypeChange}
                    style={{ width: '110px' }}
                  >
                    <Option value="income">Доход</Option>
                    <Option value="expense">Расход</Option>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Сумма"
                    name="amount"
                    value={newFinancial.amount}
                    onChange={handleFinancialChange}
                    style={{ width: '100px' }}
                  />
                  <Input
                    placeholder="Описание"
                    name="description"
                    value={newFinancial.description}
                    onChange={handleFinancialChange}
                    style={{ flex: 1 }}
                  />
                  <Button 
                    icon={<PlusOutlined />} 
                    onClick={handleAddFinancial}
                  >
                    Добавить
                  </Button>
                </div>

                <List
                  dataSource={financials}
                  renderItem={(item, idx) => (
                    <List.Item>
                      <Tag color={item.type === 'income' ? 'green' : 'red'}>
                        {item.type === 'income' ? 'Доход' : 'Расход'}
                      </Tag>
                      <Text strong style={{ marginRight: 8 }}>
                        {item.amount} ₽
                      </Text>
                      <Text type="secondary">{item.description}</Text>
                    </List.Item>
                  )}
                />
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <Card title="Расчёт долей" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Text strong>Доля компании:</Text>
                  <Tag color="blue">{companyShare} ₽</Tag>
                </Space>
                <Space>
                  <Text strong>Доли работников:</Text>
                  {workerShares.map((ws) => (
                    <Tag color="green" key={ws.uid}>
                      {ws.name}: {ws.share} ₽
                    </Tag>
                  ))}
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row style={{ marginTop: 24 }}>
          <Col xs={24}>
            <Form.Item>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                htmlType="submit"
                block
              >
                Завершить запись (статус = confirmation)
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default AdminQuickRequestPage;
