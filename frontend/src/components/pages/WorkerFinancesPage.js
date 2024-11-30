// src/components/pages/WorkerFinancesPage.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import {
  Layout,
  Row,
  Col,
  Card,
  Form,
  Input,
  Select,
  Button,
  Statistic,
  Table,
  Spin,
  Typography,
  Divider,
  Tag,
  Avatar,
  List,
} from 'antd';
import {
  PlusCircleOutlined,
  MinusCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import moment from 'moment';
import 'moment/locale/ru';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useMediaQuery } from 'react-responsive';
import '../css/WorkerFinancesPage.css';

const { Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

const WorkerFinancesPage = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categorySums, setCategorySums] = useState({ income: 0, expense: 0 });
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const isMobile = useMediaQuery({ maxWidth: 767 });

  moment.locale('ru');

  useEffect(() => {
    if (currentUser && currentUser.uid) {
      const transactionsCollection = collection(
        db,
        `workers/${currentUser.uid}/financials`
      );

      const unsubscribe = onSnapshot(transactionsCollection, (snapshot) => {
        const fetchedTransactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const sortedTransactions = fetchedTransactions.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        setTransactions(sortedTransactions);

        let totalIncome = 0;
        let totalExpenses = 0;
        const totalBalance = sortedTransactions.reduce((acc, record) => {
          if (record.type === 'income') {
            totalIncome += record.amount;
            return acc + record.amount;
          } else if (record.type === 'expense') {
            totalExpenses += record.amount;
            return acc - record.amount;
          }
          return acc;
        }, 0);

        setCategorySums({ income: totalIncome, expense: totalExpenses });
        setBalance(totalBalance);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const handleAddTransaction = async (type) => {
    try {
      const values = await form.validateFields();

      const transactionRecord = {
        // workerId больше не нужен, так как мы храним данные в подколлекции рабочего
        type: type, // 'income' или 'expense'
        amount: parseFloat(values.amount),
        description: values.description || '',
        category: values.category,
        date: new Date().toISOString(),
      };

      const workerFinancesCollection = collection(
        db,
        `workers/${currentUser.uid}/financials`
      );
      await addDoc(workerFinancesCollection, transactionRecord);

      form.resetFields();

      toast.success('Транзакция успешно добавлена!', {
        position: 'top-center',
        autoClose: 3000,
      });
    } catch (error) {
      if (error.errorFields) {
        // Ошибки валидации формы
        toast.error('Пожалуйста, заполните все обязательные поля.', {
          position: 'top-center',
          autoClose: 3000,
        });
      } else {
        // Другие ошибки
        toast.error('Ошибка при добавлении транзакции.', {
          position: 'top-center',
          autoClose: 3000,
        });
      }
      console.error('Ошибка при добавлении транзакции:', error);
    }
  };

  // Остальной код компонента остаётся без изменений
  // ...

  // Отслеживание значения категории
  const category = Form.useWatch('category', form);

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="Загрузка..." />
      </div>
    );
  }

  return (
    <Layout>
      <Content className="worker-finances-content">
        <ToastContainer />
        <Title level={2} className="page-title">
          Финансовая система рабочего
        </Title>

        {/* Секция статистики */}
        <Row gutter={[16, 16]} className="statistics-row">
          <Col xs={24} sm={8}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="Баланс"
                value={balance.toFixed(2)}
                prefix="₽"
                valueStyle={{ color: '#1890ff', fontSize: '1.5rem' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="Доходы"
                value={categorySums.income.toFixed(2)}
                prefix="₽"
                valueStyle={{ color: '#52c41a', fontSize: '1.5rem' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="Расходы"
                value={categorySums.expense.toFixed(2)}
                prefix="₽"
                valueStyle={{ color: '#ff4d4f', fontSize: '1.5rem' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Секция диаграммы */}
        <Card title="Финансовая статистика" className="chart-card">
          <div className="chart-container">
            <div className="chart-content">
              <ReactECharts
                option={{
                  tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} ₽ ({d}%)',
                  },
                  legend: {
                    bottom: '5%',
                    left: 'center',
                    textStyle: {
                      color: '#595959',
                      fontSize: 12,
                    },
                  },
                  series: [
                    {
                      name: 'Финансы',
                      type: 'pie',
                      radius: ['40%', '70%'],
                      center: ['50%', '50%'],
                      avoidLabelOverlap: false,
                      label: {
                        show: false,
                        position: 'center',
                      },
                      emphasis: {
                        label: {
                          show: true,
                          fontSize: '14',
                          fontWeight: 'bold',
                        },
                      },
                      labelLine: {
                        show: false,
                      },
                      data: [
                        { value: categorySums.income, name: 'Доходы' },
                        { value: categorySums.expense, name: 'Расходы' },
                      ],
                      color: ['#52c41a', '#ff4d4f'],
                    },
                  ],
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </Card>

        {/* Форма добавления транзакции */}
        <Card title="Добавить транзакцию" className="transaction-form-card">
          <Form form={form} layout="vertical" className="transaction-form">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={6}>
                <Form.Item
                  name="category"
                  label="Категория"
                  rules={[{ required: true, message: 'Пожалуйста, выберите категорию' }]}
                >
                  <Select placeholder="Выберите категорию">
                    <Option value="Продукты">Продукты</Option>
                    <Option value="Авто">Авто</Option>
                    <Option value="Компания">Компания</Option>
                    <Option value="Разное">Разное</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item
                  name="amount"
                  label="Сумма"
                  rules={[{ required: true, message: 'Пожалуйста, введите сумму' }]}
                >
                  <Input type="number" placeholder="Введите сумму" suffix="₽" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                {/* Условное отображение поля описания */}
                {['Авто', 'Компания', 'Разное'].includes(category) && (
                  <Form.Item
                    name="description"
                    label="Описание"
                    rules={[{ required: true, message: 'Пожалуйста, введите описание' }]}
                  >
                    <Input placeholder="Введите описание" />
                  </Form.Item>
                )}
              </Col>
            </Row>
            <Row gutter={[16, 16]} justify="end">
              <Col xs={24} sm={12} md={6}>
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  block
                  size="large"
                  onClick={() => handleAddTransaction('income')}
                >
                  Добавить доход
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button
                  type="danger"
                  icon={<MinusCircleOutlined />}
                  block
                  size="large"
                  onClick={() => handleAddTransaction('expense')}
                >
                  Добавить расход
                </Button>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* Секция истории транзакций */}
        <Card title="История расчетов" className="transactions-history-card">
          {isMobile ? (
            // Отображение карточек на мобильных устройствах
            <List
              dataSource={transactions}
              renderItem={(item) => (
                <Card key={item.id} className="transaction-card" hoverable bordered={false}>
                  <div className="card-header">
                    <Avatar
                      size={40}
                      style={{
                        backgroundColor: item.type === 'income' ? '#52c41a' : '#ff4d4f',
                      }}
                      icon={item.type === 'income' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    />
                    <div className="transaction-info">
                      <strong>{item.category}</strong>
                      <br />
                      <span className="description-text">
                        {item.description || 'Без описания'}
                      </span>
                    </div>
                  </div>
                  <Divider />
                  <div className="card-content">
                    <p className="card-date">
                      <strong>Дата:</strong> {moment(item.date).format('DD.MM.YYYY HH:mm')}
                    </p>
                    <p className="card-amount">
                      <strong>Сумма:</strong>{' '}
                      <Tag
                        color={item.type === 'income' ? 'green' : 'red'}
                        style={{ fontSize: '0.9rem' }}
                      >
                        {item.type === 'income' ? `+${item.amount}` : `-${item.amount}`} ₽
                      </Tag>
                    </p>
                  </div>
                </Card>
              )}
            />
          ) : (
            // Отображение таблицы на больших экранах
            <Table
              dataSource={transactions}
              columns={[
                {
                  title: 'Дата',
                  dataIndex: 'date',
                  key: 'date',
                  render: (text) => moment(text).format('DD.MM.YYYY HH:mm'),
                  sorter: (a, b) => new Date(a.date) - new Date(b.date),
                },
                {
                  title: 'Категория',
                  dataIndex: 'category',
                  key: 'category',
                  filters: [
                    { text: 'Продукты', value: 'Продукты' },
                    { text: 'Авто', value: 'Авто' },
                    { text: 'Компания', value: 'Компания' },
                    { text: 'Разное', value: 'Разное' },
                  ],
                  onFilter: (value, record) => record.category === value,
                  sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
                  render: (text) => <strong>{text}</strong>,
                },
                {
                  title: 'Описание',
                  dataIndex: 'description',
                  key: 'description',
                  render: (text) => text || '-',
                  sorter: (a, b) => (a.description || '').localeCompare(b.description || ''),
                },
                {
                  title: 'Сумма',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: (text, record) => (
                    <Text type={record.type === 'income' ? 'success' : 'danger'}>
                      {record.type === 'income' ? `+${text}` : `-${text}`} ₽
                    </Text>
                  ),
                  sorter: (a, b) => a.amount - b.amount,
                },
              ]}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              scroll={{ x: 800 }}
              size="middle"
              bordered
            />
          )}
        </Card>
      </Content>
    </Layout>
  );
};

export default WorkerFinancesPage;
