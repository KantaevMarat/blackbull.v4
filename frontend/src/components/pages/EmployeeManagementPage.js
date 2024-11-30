// src/components/pages/EmployeeManagementPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';  // Убедитесь, что путь правильный
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  getDocs,
  where,
} from 'firebase/firestore';
import {
  Layout,
  Table,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Typography,
  notification,
  Card,
  Row,
  Col,
  Grid,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import debounce from 'lodash.debounce';
import LoadingSpinner from '../LoadingSpinner';

const { Content } = Layout;
const { Title } = Typography;
const { useBreakpoint } = Grid;

const EmployeeManagementPage = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const screens = useBreakpoint();

  // Функция для открытия уведомлений
  const openNotificationWithIcon = (type, message, description) => {
    notification[type]({
      message,
      description,
      placement: 'topRight',
      duration: 3,
    });
  };

  useEffect(() => {
    const workersCollection = collection(db, 'workers');
    const unsubscribe = onSnapshot(
      workersCollection,
      (snapshot) => {
        const workersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setWorkers(workersData);
        setFilteredWorkers(workersData);
        setLoading(false);
      },
      (error) => {
        console.error('Ошибка загрузки рабочих:', error);
        openNotificationWithIcon('error', 'Ошибка', 'Не удалось загрузить рабочих.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Функция для добавления нового рабочего
  const handleAddWorker = async (values) => {
    try {
      const { name, phoneNumber, rate } = values;

      // Проверка, существует ли уже рабочий с таким номером телефона
      const workersQuery = query(
        collection(db, 'workers'),
        where('phoneNumber', '==', phoneNumber.trim())
      );
      const querySnapshot = await getDocs(workersQuery);
      if (!querySnapshot.empty) {
        openNotificationWithIcon('error', 'Ошибка', 'Рабочий с таким номером телефона уже существует.');
        return;
      }

      // Добавление рабочего в Firestore
      await addDoc(collection(db, 'workers'), {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        rate: rate || 50, // Устанавливаем ставку по умолчанию 50%
        chat_id: null, // Пока нет связанного Telegram-аккаунта
      });

      openNotificationWithIcon('success', 'Успех', 'Рабочий успешно добавлен.');
      form.resetFields();
      setIsAddModalVisible(false);
    } catch (error) {
      console.error('Ошибка при добавлении рабочего:', error);
      openNotificationWithIcon('error', 'Ошибка', 'Не удалось добавить рабочего. Попробуйте снова.');
    }
  };

  // Функция для удаления рабочего
  const handleDeleteWorker = async (id) => {
    try {
      await deleteDoc(doc(db, 'workers', id));
      openNotificationWithIcon('success', 'Успех', 'Рабочий успешно удален.');
    } catch (error) {
      console.error('Ошибка при удалении рабочего:', error);
      openNotificationWithIcon('error', 'Ошибка', 'Не удалось удалить рабочего. Попробуйте снова.');
    }
  };

  // Функция для открытия модального окна редактирования
  const handleEditWorker = (worker) => {
    setEditingWorker(worker);
    setIsEditModalVisible(true);
    editForm.setFieldsValue({
      name: worker.name,
      phoneNumber: worker.phoneNumber,
      rate: worker.rate,
    });
  };

  // Функция для обновления рабочего
  const handleUpdateWorker = async (values) => {
    try {
      const { name, phoneNumber, rate } = values;
      const { id } = editingWorker;

      // Проверка, не существует ли другого рабочего с таким номером телефона
      const workersQuery = query(
        collection(db, 'workers'),
        where('phoneNumber', '==', phoneNumber.trim())
      );
      const querySnapshot = await getDocs(workersQuery);
      const existingWorker = querySnapshot.docs.find((doc) => doc.id !== id);
      if (existingWorker) {
        openNotificationWithIcon('error', 'Ошибка', 'Другой рабочий с таким номером телефона уже существует.');
        return;
      }

      // Обновление рабочего в Firestore
      const workerDoc = doc(db, 'workers', id);
      await updateDoc(workerDoc, {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        rate: rate || 50, // Устанавливаем ставку по умолчанию 50%
      });

      openNotificationWithIcon('success', 'Успех', 'Данные рабочего успешно обновлены.');
      setEditingWorker(null);
      setIsEditModalVisible(false);
    } catch (error) {
      console.error('Ошибка при обновлении рабочего:', error);
      openNotificationWithIcon('error', 'Ошибка', 'Не удалось обновить данные рабочего.');
    }
  };

  // Функция для поиска рабочих с debounce
  // Используем useCallback, чтобы debounce не создавался заново при каждом рендере
  const debouncedSearch = useCallback(
    debounce((value) => {
      const filtered = workers.filter(
        (worker) =>
          worker.name.toLowerCase().includes(value.toLowerCase()) ||
          worker.phoneNumber.includes(value)
      );
      setFilteredWorkers(filtered);
    }, 300),
    [workers]
  );

  const handleSearch = (e) => {
    const { value } = e.target;
    setSearchText(value);
    debouncedSearch(value);
  };

  // Определение колонок для таблицы
  const columns = [
    {
      title: 'Имя',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Номер телефона',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      sorter: (a, b) => a.phoneNumber.localeCompare(b.phoneNumber),
    },
    {
      title: 'Ставка (%)',
      dataIndex: 'rate',
      key: 'rate',
      sorter: (a, b) => a.rate - b.rate,
      render: (rate) => `${rate}%`,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEditWorker(record)}
            size="small"
          >
            Изменить
          </Button>
          <Button
            type="danger"
            icon={<DeleteOutlined />}
            onClick={() => showDeleteConfirm(record.id)}
            size="small"
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  // Функция для отображения подтверждения удаления с использованием Modal.confirm
  const showDeleteConfirm = (id) => {
    Modal.confirm({
      title: 'Подтвердите удаление',
      content: 'Вы уверены, что хотите удалить этого рабочего?',
      okText: 'Да',
      okType: 'danger',
      cancelText: 'Нет',
      onOk() {
        handleDeleteWorker(id);
      },
      onCancel() {
        // Ничего не делаем
      },
      centered: true,
      destroyOnClose: true,
    });
  };

  // Определение, является ли устройство мобильным
  const isMobile = !screens.md; // md - >= 768px

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Layout style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5' }}>
      <Content>
        <Title style={{ marginTop: '50px' }} level={2}>Управление рабочими</Title>

        {/* Кнопка для открытия модального окна добавления рабочего */}
        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddModalVisible(true)}
          >
            Добавить рабочего
          </Button>
          <Input
            placeholder="Поиск по имени или телефону"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={handleSearch}
            allowClear
            style={{ width: isMobile ? '100%' : 300, minWidth: '200px' }}
          />
        </Space>

        {/* Таблица или карточки с рабочими */}
        {isMobile ? (
          <Row gutter={[16, 16]}>
            {filteredWorkers.map((worker) => (
              <Col xs={24} sm={12} md={8} lg={6} key={worker.id}>
                <Card
                  title={worker.name}
                  actions={[
                    <EditOutlined key="edit" onClick={() => handleEditWorker(worker)} />,
                    <DeleteOutlined key="delete" onClick={() => showDeleteConfirm(worker.id)} />,
                  ]}
                  hoverable
                >
                  <p>
                    <strong>Телефон:</strong> {worker.phoneNumber || 'Не указан'}
                  </p>
                  <p>
                    <strong>Ставка:</strong> {worker.rate}% 
                  </p>
                  <p>
                    <strong>Telegram ID:</strong> {worker.chat_id || 'Не указан'}
                  </p>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Table
            dataSource={filteredWorkers}
            columns={columns}
            rowKey="id"
            bordered
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />
        )}

        {/* Модальное окно добавления рабочего */}
        <Modal
          title="Добавить рабочего"
          visible={isAddModalVisible}
          onCancel={() => setIsAddModalVisible(false)}
          footer={null}
          destroyOnClose
          centered
          width={isMobile ? '90%' : 600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddWorker}
          >
            <Form.Item
              name="name"
              label="Имя"
              rules={[{ required: true, message: 'Пожалуйста, введите имя' }]}
            >
              <Input placeholder="Введите имя рабочего" />
            </Form.Item>

            <Form.Item
              name="phoneNumber"
              label="Номер телефона"
              rules={[
                { required: true, message: 'Пожалуйста, введите номер телефона' },
                { pattern: /^\+?\d{10,15}$/, message: 'Введите корректный номер телефона в формате +1234567890' },
              ]}
            >
              <Input placeholder="+1234567890" />
            </Form.Item>

            <Form.Item
              name="rate"
              label="Ставка (%)"
              rules={[
                { required: true, message: 'Пожалуйста, введите ставку' },
                { type: 'number', min: 0, max: 100, message: 'Ставка должна быть от 0 до 100' },
              ]}
            >
              <InputNumber placeholder="Введите ставку" min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Добавить
                </Button>
                <Button onClick={() => setIsAddModalVisible(false)}>
                  Отмена
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Модальное окно редактирования рабочего */}
        <Modal
          title="Редактировать рабочего"
          visible={isEditModalVisible}
          onCancel={() => setIsEditModalVisible(false)}
          footer={null}
          destroyOnClose
          centered
          width={isMobile ? '90%' : 600}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleUpdateWorker}
          >
            <Form.Item
              name="name"
              label="Имя"
              rules={[{ required: true, message: 'Пожалуйста, введите имя' }]}
            >
              <Input placeholder="Введите имя рабочего" />
            </Form.Item>

            <Form.Item
              name="phoneNumber"
              label="Номер телефона"
              rules={[
                { required: true, message: 'Пожалуйста, введите номер телефона' },
                { pattern: /^\+?\d{10,15}$/, message: 'Введите корректный номер телефона в формате +1234567890' },
              ]}
            >
              <Input placeholder="+1234567890" />
            </Form.Item>

            <Form.Item
              name="rate"
              label="Ставка (%)"
              rules={[
                { required: true, message: 'Пожалуйста, введите ставку' },
                { type: 'number', min: 0, max: 100, message: 'Ставка должна быть от 0 до 100' },
              ]}
            >
              <InputNumber placeholder="Введите ставку" min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Сохранить
                </Button>
                <Button onClick={() => setIsEditModalVisible(false)}>
                  Отмена
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default EmployeeManagementPage;
