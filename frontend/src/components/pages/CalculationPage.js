// src/components/pages/CalculationPage.js

import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { db } from '../../firebase';
import * as XLSX from 'xlsx';
import {
  collection,
  doc,
  getDoc,
  addDoc,
  onSnapshot,
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
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Divider,
  Tooltip,
} from 'antd';
import {
  MinusOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../css/CalculationPage.css"

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

function CalculationPage() {
  const [workers, setWorkers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [workersLoading, setWorkersLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState({ start: '', end: '' });

  const [form] = Form.useForm();

  useEffect(() => {
    const workersCollection = collection(db, 'workers');
    const unsubscribeWorkers = onSnapshot(
      workersCollection,
      (snapshot) => {
        const fetchedWorkers = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          rate: doc.data().rate || 0,
        }));
        setWorkers(fetchedWorkers);
        setWorkersLoading(false);
      },
      (error) => {
        console.error('Ошибка загрузки работников:', error);
        toast.error('Ошибка загрузки работников.', {
          position: 'top-center',
          autoClose: 3000,
        });
        setWorkersLoading(false);
      }
    );

    const transactionsCollection = collection(db, 'transactions');
    const unsubscribeTransactions = onSnapshot(
      transactionsCollection,
      (snapshot) => {
        const fetchedHistory = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHistory(fetchedHistory);

        let totalIncome = 0;
        let totalExpenses = 0;
        const totalBalance = fetchedHistory.reduce((acc, record) => {
          if (record.type === 'income') {
            totalIncome += record.amount;
            return acc + record.amount;
          } else if (record.type === 'expense') {
            totalExpenses += record.amount;
            return acc - record.amount;
          }
          return acc;
        }, 0);
        setBalance(totalBalance);
        setIncome(totalIncome);
        setExpenses(totalExpenses);
        setTransactionsLoading(false);
      },
      (error) => {
        console.error('Ошибка загрузки истории транзакций:', error);
        toast.error('Ошибка загрузки истории транзакций.', {
          position: 'top-center',
          autoClose: 3000,
        });
        setTransactionsLoading(false);
      }
    );

    // Загрузка заявок
    const requestsCollection = collection(db, 'requests');
    const unsubscribeRequests = onSnapshot(
      requestsCollection,
      (snapshot) => {
        const fetchedRequests = snapshot.docs.map((doc) => ({
          id: doc.id,
          carModel: doc.data().carModel,
        }));
        setRequests(fetchedRequests);
        setRequestsLoading(false);
      },
      (error) => {
        console.error('Ошибка загрузки заявок:', error);
        toast.error('Ошибка загрузки заявок.', {
          position: 'top-center',
          autoClose: 3000,
        });
        setRequestsLoading(false);
      }
    );

    return () => {
      unsubscribeWorkers();
      unsubscribeTransactions();
      unsubscribeRequests();
    };
  }, []);

  const showConfirmModal = (values) => {
    confirm({
      title: 'Вы уверены, что хотите добавить эту транзакцию?',
      icon: <ExclamationCircleOutlined />,
      content: 'После подтверждения транзакция будет добавлена.',
      okText: 'Да, добавить',
      okType: 'primary',
      cancelText: 'Отмена',
      onOk() {
        handleAddTransaction(values);
      },
    });
  };

  const playSound = () => {
    const audio = new Audio('/sounds/money.mp3');
    audio.play();
  };

  const handleAddTransaction = async (values) => {
    const { category, amount, comment, type } = values;

    if (!amount || !category) {
      toast.error('Пожалуйста, введите сумму и выберите категорию', {
        position: 'top-center',
        autoClose: 3000,
      });
      return;
    }

    const transactionRecord = {
      type, // 'income' или 'expense'
      amount: parseFloat(amount),
      category,
      comment: category === 'Разное' || category === 'company' ? comment : '',
      date: new Date().toISOString(),
    };

    try {
      // Добавляем запись в транзакции компании
      await addDoc(collection(db, 'transactions'), transactionRecord);

      playSound();

      form.resetFields();

      toast.success('Финансовая запись добавлена!', {
        position: 'top-center',
        autoClose: 3000,
      });

      // Проверяем, если категория соответствует работнику, обновляем его личные транзакции
      const workerId = category; // Считаем, что в category передается ID работника
      if (category !== 'Разное' && category !== 'company') {
        const workerDocRef = doc(db, 'workers', workerId);
        const workerSnapshot = await getDoc(workerDocRef);

        if (workerSnapshot.exists()) {
          const workerData = workerSnapshot.data();

          let workerTransactionType;
          if (type === 'expense') {
            workerTransactionType = 'income'; // Расход компании - доход работника
          } else {
            workerTransactionType = 'expense'; // Доход компании - расход работника
          }

          // Добавляем запись в личную финансовую историю работника
          await addDoc(collection(db, `workers/${workerId}/financials`), {
            type: workerTransactionType, // Тип транзакции для работника
            amount: parseFloat(amount),
            description:
              comment ||
              (workerTransactionType === 'income'
                ? 'Доход от компании'
                : 'Расход от компании'),
            date: new Date().toISOString(),
            auto: true, // Автоматическая запись
          });

          // Обновляем общую финансовую историю (для отображения на странице сотрудника)
          await addDoc(collection(db, 'financials'), {
            workerId,
            type, // Оригинальный тип транзакции компании
            amount: parseFloat(amount),
            description: `Операция через систему компании: ${
              comment || 'обновление баланса'
            }`,
            date: new Date().toISOString(),
            source: 'company', // Источник транзакции
            auto: true,
          });

          toast.success(
            `Баланс и финансовая запись работника ${workerData.name} обновлены!`,
            {
              position: 'top-center',
              autoClose: 3000,
            }
          );
        } else {
          console.error('Работник не найден!');
          toast.error('Работник не найден.', {
            position: 'top-center',
            autoClose: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Ошибка добавления транзакции или обновления баланса работника:', error);
      toast.error('Ошибка при добавлении транзакции.', {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  const handleDownloadReport = () => {
    const filteredHistory = history.filter((record) => {
      const recordDate = new Date(record.date);
      const startDate = selectedDateRange.start ? new Date(selectedDateRange.start) : null;
      const endDate = selectedDateRange.end ? new Date(selectedDateRange.end) : null;
      return (
        (!startDate || recordDate >= startDate) &&
        (!endDate || recordDate <= endDate)
      );
    });

    const data = filteredHistory.map((record) => ({
      Дата: new Date(record.date).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      Категория: getCategoryName(record.category),
      Комментарий: record.comment ? getUpdatedComment(record.comment) : '',
      Сумма: record.type === 'income' ? `+${record.amount} ₽` : `-${record.amount} ₽`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');
    XLSX.writeFile(
      workbook,
      `financial_report_${selectedDateRange.start || 'start'}_to_${
        selectedDateRange.end || 'end'
      }.xlsx`
    );
  };

  const getCategoryName = (categoryId) => {
    switch (categoryId) {
      case 'Разное':
      case 'Запчасти':
      case 'Продукты':
        return categoryId;
      case 'company':
        return 'Компания';
      default:
        const worker = workers.find((worker) => worker.id === categoryId);
        return worker ? worker.name : 'Неизвестная категория';
    }
  };

  const getUpdatedComment = (comment) => {
    // Обновленные регулярные выражения
    const requestIdMatch = comment.match(/заявки ([\w-]+)/);
    const workerIdMatch = comment.match(/\(работник ([\w-]+)\)/);

    if (requestIdMatch && workerIdMatch) {
      const requestId = requestIdMatch[1];
      const workerId = workerIdMatch[1];

      const request = requests.find((req) => req.id === requestId);
      const worker = workers.find((w) => w.id === workerId);

      const carModel = request ? request.carModel : 'Неизвестная машина';
      const workerName = worker ? worker.name : 'Неизвестный работник';

      return `Доход от заявки ${carModel} (работник ${workerName})`;
    }

    return comment;
  };

  if (workersLoading || transactionsLoading || requestsLoading) {
    return (
      <div className="spin-container">
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    );
  }

  // Настройка диаграммы ReactECharts с использованием renderMode: 'html' для tooltip
  const pieOption = {
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        return `<div style="font-size: 14px; color: #333;">
                  <strong>${params.seriesName}</strong><br/>
                  <strong>${params.name}:</strong> ${params.value} ₽ <br/>
                  <strong>Доля:</strong> ${params.percent}%<br/>
                </div>`;
      },
      renderMode: 'html',
    }
    ,
    legend: {
      orient: 'horizontal',
      bottom: 10,
      left: 'center',
      textStyle: {
        fontSize: 14,
      },
      itemWidth: 15,  // Размер значков в легенде
      itemHeight: 15, // Размер значков в легенде
      icon: 'circle', // Форма значков в легенде
    },
    series: [
      {
        name: 'Финансы',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center', // Отображение меток в центре (если нужно)
          fontSize: 16,
          fontWeight: 'bold',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold',
          },
          labelLine: {
            show: true, // Показывать линию при наведении
          },
        },
        labelLine: {
          show: false, // Линии подписей не показываются по умолчанию
        },
        data: [
          { value: income, name: 'Доходы' },
          { value: expenses, name: 'Расходы' },
        ],
        color: ['#52c41a', '#f5222d'],
      },
    ],
  };
  

  return (
    <div className="calculation-page">
      <ToastContainer />
      <Title level={2} className="main-title">
        Расчетная система
      </Title>

      {/* Финансовая статистика */}
      <Row gutter={[16, 16]} justify="center">
        <Col xs={24} lg={12}>
          <Card title="Финансовая статистика" bordered>
            <div className="echarts-container">
              <ReactECharts
                option={pieOption}
                style={{ height: '300px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </div>
            <Divider />
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Доходы">
                <Text type="success">{income.toFixed(2)} ₽</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Расходы">
                <Text type="danger">{expenses.toFixed(2)} ₽</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Общий баланс">
                <Text strong>{balance.toFixed(2)} ₽</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Добавление транзакции */}
      <Row gutter={[16, 16]} justify="center" style={{ marginTop: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Добавить транзакцию" bordered>
            <Form
              form={form}
              layout="vertical"
              onFinish={showConfirmModal}
              initialValues={{ type: 'income' }}
            >
              <Form.Item
                label="Тип"
                name="type"
                rules={[{ required: true, message: 'Пожалуйста, выберите тип!' }]}
              >
                <Select>
                  <Option value="income">Доход</Option>
                  <Option value="expense">Расход</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Категория"
                name="category"
                rules={[{ required: true, message: 'Пожалуйста, выберите категорию!' }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите категорию"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  <Option value="Разное">Разное</Option>
                  <Option value="Запчасти">Запчасти</Option>
                  <Option value="Продукты">Продукты</Option>
                  <Option value="company">Компания</Option>
                  {workers.map((worker) => (
                    <Option key={worker.id} value={worker.id}>
                      {worker.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {(form.getFieldValue('category') === 'Разное' ||
                form.getFieldValue('category') === 'company') && (
                <Form.Item
                  label="Комментарий"
                  name="comment"
                  rules={[{ required: false }]}
                >
                  <Input placeholder="Введите комментарий" />
                </Form.Item>
              )}

              <Form.Item
                label="Сумма"
                name="amount"
                rules={[{ required: true, message: 'Пожалуйста, введите сумму!' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Введите сумму"
                  min={0}
                  formatter={(value) => `₽ ${value}`}
                  parser={(value) => value.replace(/\₽\s?|(,*)/g, '')}
                />
              </Form.Item>

              <Form.Item>
                <Row gutter={[8, 8]} justify="center">
                  <Col xs={12} sm={6}>
                    <Tooltip title="Добавить Доход">
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<PlusOutlined />}
                        block
                        onClick={() => form.setFieldsValue({ type: 'income' })}
                        className="add-button"
                      >
                        {/* Пустой текст, отображается только иконка */}
                      </Button>
                    </Tooltip>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Tooltip title="Добавить Расход">
                      <Button
                        type="danger"
                        htmlType="submit"
                        icon={<MinusOutlined />}
                        block
                        onClick={() => form.setFieldsValue({ type: 'expense' })}
                        className="add-button"
                      >
                        {/* Пустой текст, отображается только иконка */}
                      </Button>
                    </Tooltip>
                  </Col>
                </Row>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* История расчетов */}
      <Row gutter={[16, 16]} justify="center" style={{ marginTop: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="История расчетов" bordered>
            {history.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={history.sort((a, b) => new Date(b.date) - new Date(a.date))}
                renderItem={(record) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Дата">
                            {new Date(record.date).toLocaleString('ru-RU', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Descriptions.Item>
                          <Descriptions.Item label="Категория">
                            {getCategoryName(record.category)}
                          </Descriptions.Item>
                          {record.comment && (
                            <Descriptions.Item label="Комментарий">
                              {getUpdatedComment(record.comment)}
                            </Descriptions.Item>
                          )}
                        </Descriptions>
                      }
                      description={
                        <Text
                          type={record.type === 'income' ? 'success' : 'danger'}
                          strong
                        >
                          {record.type === 'income' ? `+${record.amount} ₽` : `-${record.amount} ₽`}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">Транзакции не найдены.</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Фильтр по датам и Скачать отчет */}
      <Row gutter={[16, 16]} justify="center" style={{ marginTop: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Фильтр по датам" bordered>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={[8, 8]} justify="center" className="date-filter-row">
                <Col xs={24} sm={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Начальная дата:</Text>
                    <DatePicker
                      onChange={(date, dateString) =>
                        setSelectedDateRange({ ...selectedDateRange, start: dateString })
                      }
                      style={{ width: '100%' }}
                    />
                  </Space>
                </Col>
                <Col xs={24} sm={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Конечная дата:</Text>
                    <DatePicker
                      onChange={(date, dateString) =>
                        setSelectedDateRange({ ...selectedDateRange, end: dateString })
                      }
                      style={{ width: '100%' }}
                    />
                  </Space>
                </Col>
              </Row>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadReport}
                block
              >
                Скачать отчет
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default CalculationPage;
