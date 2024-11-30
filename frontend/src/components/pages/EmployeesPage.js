import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Layout, Row, Col, Card, Typography, Button, Spin } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({});

  useEffect(() => {
    // Загрузка сотрудников
    const fetchEmployees = async () => {
      try {
        const employeesCollection = collection(db, 'workers');
        const unsubscribeEmployees = onSnapshot(employeesCollection, (snapshot) => {
          const employeesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setEmployees(employeesData);
        });
      } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error);
        setLoading(false);
      }
    };

    // Загрузка финансовых данных сотрудников
    const fetchEmployeeBalances = async () => {
      try {
        const financialsCollection = collection(db, 'financials');
        const financialsQuery = query(financialsCollection, where('source', '==', 'company'));
        const unsubscribeFinancials = onSnapshot(financialsQuery, (snapshot) => {
          const balancesMap = {};
          snapshot.docs.forEach((doc) => {
            const financial = doc.data();
            const workerId = financial.workerId;
            if (!balancesMap[workerId]) {
              balancesMap[workerId] = 0;
            }
            if (financial.type === 'income') {
              balancesMap[workerId] += financial.amount;
            } else if (financial.type === 'expense') {
              balancesMap[workerId] -= financial.amount;
            }
          });
          setBalances(balancesMap);
          setLoading(false);
        });
      } catch (error) {
        console.error('Ошибка загрузки финансовых данных сотрудников:', error);
        setLoading(false);
      }
    };

    fetchEmployees();
    fetchEmployeeBalances();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20%' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ padding: '50px', maxWidth: '1100px', margin: '0 auto', background: '#fafafa' }}>
      <Typography.Title level={1} style={{ textAlign: 'center', marginBottom: '40px' }}>
        Список сотрудников
      </Typography.Title>
      <Row gutter={[16, 16]}>
        {employees.map((employee) => {
          const balance = balances[employee.id] || 0;

          return (
            <Col xs={24} sm={12} md={8} key={employee.id}>
              <Card
                hoverable
                title={employee.name}
                style={{ marginBottom: '20px' }}
                bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <div style={{ flexGrow: 1 }}>
                  <Typography.Paragraph>
                    <Typography.Text strong>Баланс:</Typography.Text> {balance.toFixed(2)} руб.
                  </Typography.Paragraph>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Link to={`/employee/${employee.id}`}>
                    <Button type="primary">
                      Подробнее <ArrowRightOutlined />
                    </Button>
                  </Link>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Layout>
  );
}

export default EmployeesPage;
