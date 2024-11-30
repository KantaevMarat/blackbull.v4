// src/components/pages/MainPage.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Layout,
  Row,
  Col,
  Card,
  Statistic,
  Spin,
  Input,
  Select,
  Space,
  Typography,
  Divider,
  List,
  Avatar,
  Tag,
} from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  CarOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import moment from 'moment';
import 'moment/locale/ru';
import { useMediaQuery } from 'react-responsive';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../css/MainPage.css';

const { Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

const MainPage = () => {
  // Финансовые состояния
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [totalCompletedOrders, setTotalCompletedOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  // История автомобилей
  const [carHistory, setCarHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('Последние 12 месяцев');
  const [filteredCarHistory, setFilteredCarHistory] = useState([]);

  moment.locale('ru');

  const isMobile = useMediaQuery({ maxWidth: 767 });

  // Отдельные состояния загрузки
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingCarHistory, setLoadingCarHistory] = useState(true);

  // Fetch financial data from Firestore (transactions)
  useEffect(() => {
    const unsubscribeTransactions = onSnapshot(
      collection(db, 'transactions'),
      (snapshot) => {
        let incomeSum = 0;
        let expenseSum = 0;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            const dateObj = new Date(data.date);
            if (!isNaN(dateObj)) {
              const month = moment(dateObj).format('MMMM YYYY');
              if (data.type === 'income') {
                incomeSum += parseFloat(data.amount) || 0;
              } else if (data.type === 'expense') {
                expenseSum += parseFloat(data.amount) || 0;
              }
            } else {
              console.warn('Некорректная дата:', data.date);
            }
          } else {
            console.warn('Отсутствует дата в записи:', data);
          }
        });

        setTotalIncome(incomeSum);
        setTotalExpense(expenseSum);
        setBalance(incomeSum - expenseSum);
        setLoadingTransactions(false);
      },
      (error) => {
        console.error('Ошибка при получении данных из финансовой системы:', error);
        setLoadingTransactions(false);
        toast.error('Ошибка загрузки финансовых данных.', {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    );

    return () => {
      unsubscribeTransactions();
    };
  }, []);

  // Fetch car history data from Firestore (archiveRequests)
  useEffect(() => {
    const unsubscribeArchivedRequests = onSnapshot(
      collection(db, 'archiveRequests'),
      (snapshot) => {
        let completedOrdersCount = snapshot.docs.length;

        const fetchedCarHistory = snapshot.docs.map((doc) => {
          const data = doc.data();
          let archivedDate = data.archivedAt ? new Date(data.archivedAt) : new Date();

          if (!archivedDate || isNaN(archivedDate)) {
            archivedDate = new Date();
          }

          return {
            key: doc.id,
            carModel: data.carModel || 'Не указано',
            carDescription: data.issue || 'Описание отсутствует',
            clientName: data.name || 'Не указано',
            requestId: doc.id,
            balance: parseFloat(data.financials?.companyShare) || 0, // Используем financials.companyShare
            date: archivedDate,
          };
        });

        setCarHistory(fetchedCarHistory);
        setTotalCompletedOrders(completedOrdersCount);
        setLoadingCarHistory(false);
      },
      (error) => {
        console.error('Ошибка при получении архивных заявок:', error);
        setLoadingCarHistory(false);
        toast.error('Ошибка загрузки истории автомобилей.', {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    );

    return () => {
      unsubscribeArchivedRequests();
    };
  }, []);

  // Устанавливаем состояние загрузки на false, когда все данные загружены
  useEffect(() => {
    if (!loadingTransactions && !loadingCarHistory) {
      setLoading(false);
    }
  }, [loadingTransactions, loadingCarHistory]);

  // Filter car history data
  useEffect(() => {
    const now = new Date();
    let pastDate = new Date();

    switch (filterPeriod) {
      case 'Последние 3 месяца':
        pastDate.setMonth(now.getMonth() - 3);
        break;
      case 'Последние 6 месяцев':
        pastDate.setMonth(now.getMonth() - 6);
        break;
      case 'Последние 12 месяцев':
      default:
        pastDate.setMonth(now.getMonth() - 12);
    }

    const filteredByDate = carHistory.filter((car) => car.date >= pastDate);

    const filteredBySearch = filteredByDate.filter(
      (car) =>
        car.carModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        car.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedCarHistory = filteredBySearch.sort((a, b) => b.date - a.date);

    setFilteredCarHistory(sortedCarHistory);
  }, [searchTerm, filterPeriod, carHistory]);

  // Calculate monthly balance for Line chart
  const [monthlyBalance, setMonthlyBalance] = useState([]);

  useEffect(() => {
    const calculateMonthlyBalance = () => {
      const monthlyData = {};

      // Используем balance из carHistory для расчета баланса по месяцам
      carHistory.forEach((entry) => {
        const month = moment(entry.date).format('MMMM YYYY');
        if (!monthlyData[month]) {
          monthlyData[month] = 0;
        }
        monthlyData[month] += entry.balance;
      });

      const sortedMonths = Object.keys(monthlyData).sort(
        (a, b) => moment(a, 'MMMM YYYY').toDate() - moment(b, 'MMMM YYYY').toDate()
      );

      const balanceData = sortedMonths.map((month) => ({
        month,
        balance: monthlyData[month],
      }));

      setMonthlyBalance(balanceData);
    };

    calculateMonthlyBalance();
  }, [carHistory]);

  // Данные и опции для Doughnut диаграммы (Доходы vs Расходы)
  const pieOptions = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ₽ ({d}%)',
    },
    legend: {
      orient: 'horizontal',
      bottom: '5%',
      left: 'center',
      textStyle: {
        fontSize: isMobile ? 10 : 14,
      },
      data: ['Доходы', 'Расходы'],
    },
    series: [
      {
        name: 'Финансы',
        type: 'pie',
        radius: isMobile ? ['30%', '60%'] : ['40%', '70%'],
        label: {
          show: true,
          fontSize: isMobile ? 10 : 12,
        },
        data: [
          { value: totalIncome, name: 'Доходы' },
          { value: totalExpense, name: 'Расходы' },
        ],
        color: ['#52c41a', '#ff4d4f'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        labelLine: {
          show: true,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: isMobile ? 14 : 16,
            fontWeight: 'bold',
          },
        },
      },
    ],
  };

  // Данные и опции для Line диаграммы (Баланс по месяцам)
  const lineOptions = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c} ₽',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: monthlyBalance.map((item) => item.month),
      axisLabel: {
        fontSize: isMobile ? 10 : 12,
        rotate: isMobile ? 45 : 0,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: isMobile ? 10 : 12,
      },
    },
    series: [
      {
        name: 'Баланс',
        type: 'line',
        data: monthlyBalance.map((item) => item.balance),
        smooth: true,
        symbolSize: isMobile ? 6 : 10,
        lineStyle: {
          color: '#1890ff',
        },
        itemStyle: {
          color: '#1890ff',
        },
        areaStyle: {
          color: 'rgba(24, 144, 255, 0.2)',
        },
      },
    ],
  };

  // Данные для статистических карточек
  const statisticsData = [
    {
      icon: <RiseOutlined style={{ color: '#3f8600', fontSize: 36 }} />,
      title: 'Доходы',
      value: totalIncome ? `${totalIncome.toFixed(2)} ₽` : '0.00 ₽',
      color: '#3f8600',
    },
    {
      icon: <FallOutlined style={{ color: '#cf1322', fontSize: 36 }} />,
      title: 'Расходы',
      value: totalExpense ? `${totalExpense.toFixed(2)} ₽` : '0.00 ₽',
      color: '#cf1322',
    },
    {
      icon: (
        <WalletOutlined
          style={{
            color: balance >= 0 ? '#3f8600' : '#cf1322',
            fontSize: 36,
          }}
        />
      ),
      title: 'Баланс',
      value: balance ? `${balance.toFixed(2)} ₽` : '0.00 ₽',
      color: balance >= 0 ? '#3f8600' : '#cf1322',
    },
    {
      icon: <CheckCircleOutlined style={{ color: '#1890ff', fontSize: 36 }} />,
      title: 'Завершенные заявки',
      value: totalCompletedOrders,
      color: '#1890ff',
    },
  ];

  // Опции для фильтрации периода
  const periodOptions = [
    { label: 'Последние 3 месяца', value: 'Последние 3 месяца' },
    { label: 'Последние 6 месяцев', value: 'Последние 6 месяцев' },
    { label: 'Последние 12 месяцев', value: 'Последние 12 месяцев' },
  ];

  // Функция рендеринга карточки статистики
  const renderStatisticCard = (item, index) => (
    <Col xs={24} sm={12} md={6} key={index}>
      <Card className="stat-card" hoverable>
        <Statistic title={item.title} value={item.value} valueStyle={{ color: item.color }} prefix={item.icon} />
      </Card>
    </Col>
  );

  // Функция рендеринга элемента истории автомобилей
  const renderCarHistoryItem = (car) => (
    <List.Item key={car.key}>
      <Card className="car-history-card" hoverable>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6} md={6} lg={6}>
            <Avatar size={64} icon={<CarOutlined />} style={{ backgroundColor: '#1890ff' }} />
          </Col>
          <Col xs={24} sm={18} md={18} lg={18}>
            <Title level={5}>{car.carModel}</Title>
            <Text strong>Описание:</Text> <Text>{car.carDescription}</Text>
            <br />
            <Text strong>Клиент:</Text> <Text>{car.clientName}</Text>
            <br />
            <Text strong>Баланс:</Text>{' '}
            <Tag color={car.balance >= 0 ? 'green' : 'red'}>
              {car.balance >= 0 ? `+${car.balance.toFixed(2)}` : `${car.balance.toFixed(2)}`} ₽
            </Tag>
            <br />
            <Text strong>Дата:</Text> <Text>{moment(car.date).format('DD.MM.YYYY')}</Text>
          </Col>
        </Row>
      </Card>
    </List.Item>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="Загрузка..." />
      </div>
    );
  }

  return (
    <Layout className="main-layout">
      <Content className="main-page-content">
        <div className="wrapper">
          <Title level={2} className="main-page-title">
            Салам Алейкум!
          </Title>

          {/* Статистические карточки */}
          <Row gutter={[16, 16]} justify="center">
            {statisticsData.map((item, index) => renderStatisticCard(item, index))}
          </Row>

          {/* Графики */}
          <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
            {/* Круговая диаграмма Доходы и Расходы */}
            <Col xs={24} lg={12}>
              <Card bordered={false} title="Доходы и Расходы">
                <div className="chart-container">
                  <ReactECharts
                    option={pieOptions}
                    style={{ width: '100%', height: isMobile ? '250px' : '400px' }}
                  />
                </div>
              </Card>
            </Col>
            {/* Линейный график Баланса по месяцам */}
            <Col xs={24} lg={12}>
              <Card bordered={false} title="Баланс по месяцам">
                <div className="chart-container">
                  <ReactECharts
                    option={lineOptions}
                    style={{ width: '100%', height: isMobile ? '250px' : '400px' }}
                  />
                </div>
              </Card>
            </Col>
          </Row>

          <Divider orientation="left" className="section-divider">
            <Title level={4}>История автомобилей</Title>
          </Divider>

          {/* Поиск и фильтр */}
          <div className="search-filter-container">
            <Space direction="horizontal" size="large" style={{ width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Поиск по модели или клиенту"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                allowClear
                style={{ width: 200 }}
              />
              <Select
                value={filterPeriod}
                onChange={(value) => setFilterPeriod(value)}
                className="filter-select"
                style={{ width: 200 }}
              >
                {periodOptions.map((option) => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Space>
          </div>

          {/* Список истории автомобилей */}
          <List
            itemLayout="vertical"
            size="large"
            dataSource={filteredCarHistory}
            renderItem={renderCarHistoryItem}
            locale={{ emptyText: 'Нет данных для отображения' }}
          />
        </div>
      </Content>
      <ToastContainer /> {/* Добавлен ToastContainer */}
    </Layout>
  );
};

export default MainPage;
