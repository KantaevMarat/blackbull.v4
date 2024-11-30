// src/components/ReportPage.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import {
  Layout,
  Row,
  Col,
  Card,
  DatePicker,
  Select,
  Typography,
  Statistic,
  Spin,
  Avatar,
  Table,
} from 'antd';
import {
  PieChartOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import ReactECharts from 'echarts-for-react';
import moment from 'moment';
import 'moment/locale/ru';
import { useMediaQuery } from 'react-responsive';
import '../css/ReportPage.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

const StyledContent = styled(Content)`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background: linear-gradient(135deg, #f0f2f5 0%, #ffffff 100%);
`;

const StyledCard = styled(Card)`
  border-radius: 12px;
  overflow: hidden;
`;

const StyledStatistic = styled(Statistic)`
  .ant-statistic-title {
    font-size: 16px;
    color: #888;
  }
  .ant-statistic-content {
    font-size: 24px;
    font-weight: bold;
  }
`;

const CategorySelect = styled(Select)`
  .ant-select-selector {
    border-radius: 8px !important;
    display: flex;
    align-items: center;
  }
`;

const ReportPage = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [month, setMonth] = useState(null);
  const [category, setCategory] = useState('Все');
  const [categories, setCategories] = useState([]);
  const [categorySums, setCategorySums] = useState({ income: 0, expense: 0 });
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery({ maxWidth: 767 });

  moment.locale('ru');

  useEffect(() => {
    if (currentUser && currentUser.workerId) {
      const transactionsQuery = collection(
        db,
        `workers/${currentUser.workerId}/financials`
      );

      const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
        const fetchedTransactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const sortedTransactions = fetchedTransactions.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        setTransactions(sortedTransactions);

        const uniqueCategories = [
          'Все',
          ...new Set(
            sortedTransactions
              .map((tx) => tx.category)
              .filter((cat) => cat !== undefined && cat !== null)
          ),
        ];
        setCategories(uniqueCategories);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const filtered = transactions.filter((record) => {
      const recordDate = new Date(record.date);
      const isMonthMatch = month
        ? recordDate.getMonth() === month.month() &&
          recordDate.getFullYear() === month.year()
        : true;
      const isCategoryMatch = category === 'Все' || record.category === category;

      return isMonthMatch && isCategoryMatch;
    });

    setFilteredTransactions(filtered);
    calculateCategorySums(filtered);
  }, [month, category, transactions]);

  const calculateCategorySums = (filtered) => {
    const sums = { income: 0, expense: 0 };

    filtered.forEach((tx) => {
      if (tx.type === 'income') {
        sums.income += tx.amount;
      } else if (tx.type === 'expense') {
        sums.expense += tx.amount;
      }
    });

    setCategorySums(sums);
  };

  // Опции для круговой диаграммы
  const pieOptions = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ₽ ({d}%)',
    },
    legend: {
      bottom: '0%',
      left: 'center',
      textStyle: {
        fontSize: 12,
      },
    },
    series: [
      {
        name: 'Доходы и расходы',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: [
          { value: categorySums.income, name: 'Доходы' },
          { value: categorySums.expense, name: 'Расходы' },
        ],
        color: ['#52c41a', '#ff4d4f'],
        label: {
          fontSize: 12,
        },
      },
    ],
  };

  // Опции для линейного графика
  const lineOptions = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['Доходы', 'Расходы'],
      textStyle: {
        fontSize: 12,
      },
    },
    xAxis: {
      type: 'category',
      data: filteredTransactions.map((tx) =>
        new Date(tx.date).toLocaleDateString('ru-RU')
      ),
      axisLabel: {
        fontSize: 10,
        rotate: isMobile ? 45 : 0, // Поворот меток оси X для лучшего отображения на мобильных устройствах
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 10,
      },
    },
    series: [
      {
        name: 'Доходы',
        type: 'line',
        data: filteredTransactions
          .filter((tx) => tx.type === 'income')
          .map((tx) => tx.amount),
        smooth: true,
        color: '#52c41a',
      },
      {
        name: 'Расходы',
        type: 'line',
        data: filteredTransactions
          .filter((tx) => tx.type === 'expense')
          .map((tx) => tx.amount),
        smooth: true,
        color: '#ff4d4f',
      },
    ],
  };

  const columns = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (text) => new Date(text).toLocaleDateString('ru-RU'),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      render: (text) => text || 'Неизвестно',
      sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
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
  ];

  // Функция для отображения иконки рядом с категорией
  const renderCategoryOption = (cat) => (
    <span>
      <Avatar
        size="small"
        style={{ backgroundColor: '#1890ff', marginRight: 8 }}
      >
        {cat ? cat.charAt(0) : '?'}
      </Avatar>
      {cat || 'Неизвестно'}
    </span>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="Загрузка..." />
      </div>
    );
  }

  return (
    <Layout>
      <StyledContent>
        <Title
          level={2}
          style={{ marginTop: '50px', textAlign: 'center', marginBottom: '30px' }}
        >
          Финансовый отчет
        </Title>

        <Row gutter={[16, 16]} style={{ marginBottom: '30px' }}>
          <Col xs={24} sm={8}>
            <StyledCard>
              <StyledStatistic
                title="Баланс"
                value={(categorySums.income - categorySums.expense).toFixed(2)}
                suffix="₽"
                valueStyle={{ color: '#1890ff' }}
                prefix="₽"
              />
            </StyledCard>
          </Col>
          <Col xs={24} sm={8}>
            <StyledCard>
              <StyledStatistic
                title="Доходы"
                value={categorySums.income.toFixed(2)}
                suffix="₽"
                valueStyle={{ color: '#52c41a' }}
                prefix="₽"
              />
            </StyledCard>
          </Col>
          <Col xs={24} sm={8}>
            <StyledCard>
              <StyledStatistic
                title="Расходы"
                value={categorySums.expense.toFixed(2)}
                suffix="₽"
                valueStyle={{ color: '#ff4d4f' }}
                prefix="₽"
              />
            </StyledCard>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: '30px' }}>
          <Col xs={24} sm={12}>
            <DatePicker
              picker="month"
              onChange={(date) => setMonth(date)}
              style={{ width: '100%' }}
              placeholder="Выберите месяц"
              size="large"
              allowClear
            />
          </Col>
          <Col xs={24} sm={12}>
            <CategorySelect
              value={category}
              onChange={(value) => setCategory(value)}
              style={{ width: '100%' }}
              placeholder="Выберите категорию"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children[1]
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              size="large"
            >
              {categories.map((cat, idx) => (
                <Option key={idx} value={cat}>
                  {renderCategoryOption(cat)}
                </Option>
              ))}
            </CategorySelect>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: '30px' }}>
          <Col xs={24} md={12}>
            <StyledCard
              title="Доходы и расходы"
              extra={<PieChartOutlined />}
              style={{ height: '100%' }}
            >
              <ReactECharts
                option={pieOptions}
                style={{ height: '300px', width: '100%' }}
              />
            </StyledCard>
          </Col>
          <Col xs={24} md={12}>
            <StyledCard
              title="График транзакций"
              extra={<LineChartOutlined />}
              style={{ height: '100%' }}
            >
              <ReactECharts
                option={lineOptions}
                style={{ height: '300px', width: '100%' }}
              />
            </StyledCard>
          </Col>
        </Row>

        <StyledCard title="Транзакции">
          {isMobile ? (
            <div className="transaction-cards">
              {filteredTransactions.map((record) => (
                <Card key={record.id} className="transaction-card">
                  <p>
                    <strong>Дата:</strong>{' '}
                    {new Date(record.date).toLocaleDateString('ru-RU')}
                  </p>
                  <p>
                    <strong>Категория:</strong>{' '}
                    {record.category || 'Неизвестно'}
                  </p>
                  {record.description && (
                    <p>
                      <strong>Описание:</strong> {record.description}
                    </p>
                  )}
                  <p>
                    <strong>Сумма:</strong>{' '}
                    <Text
                      type={record.type === 'income' ? 'success' : 'danger'}
                    >
                      {record.type === 'income'
                        ? `+${record.amount}`
                        : `-${record.amount}`}{' '}
                      ₽
                    </Text>
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Table
              dataSource={filteredTransactions}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              scroll={{ x: 500 }}
            />
          )}
        </StyledCard>
      </StyledContent>
    </Layout>
  );
};

export default ReportPage;
