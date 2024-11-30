import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { Layout, Card, Typography, Spin, List, Result } from 'antd';

const { Content } = Layout;
const { Title, Text } = Typography;

function EmployeeDetailsPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [financials, setFinancials] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const employeeDoc = doc(db, 'workers', id);
    const unsubscribeEmployee = onSnapshot(employeeDoc, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setEmployee(docSnapshot.data());
      } else {
        setEmployee(null);
        setLoading(false);
      }
    });

    const financialsQuery = query(
      collection(db, 'financials'),
      where('workerId', '==', id),
      where('source', '==', 'company')
    );

    const unsubscribeFinancials = onSnapshot(
      financialsQuery,
      (querySnapshot) => {
        const financialsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFinancials(financialsData);

        const calculatedBalance = financialsData.reduce((acc, financial) => {
          if (financial.type === 'income') {
            return acc + financial.amount;
          } else if (financial.type === 'expense') {
            return acc - financial.amount;
          } else {
            return acc;
          }
        }, 0);

        setBalance(calculatedBalance);
        setLoading(false);
      },
      (error) => {
        console.error('Ошибка загрузки финансовых данных:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeEmployee();
      unsubscribeFinancials();
    };
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20%' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!employee) {
    return (
      <Result
        status="404"
        title="Сотрудник не найден"
        subTitle="Извините, сотрудник с таким ID не найден."
      />
    );
  }

  const displayedFinancials = financials.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Layout style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Content>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '20px',marginTop: '50px' }}>
          Детали сотрудника
        </Title>
        <Card style={{ marginBottom: '30px' }}>
          <Title level={3}>{employee.name}</Title>
          <Text>
            <Text strong>Баланс:</Text> {balance.toFixed(2)} руб.
          </Text>
          <br />
          <Text>
            <Text strong>Должность:</Text> {employee.position || 'Не указана'}
          </Text>
        </Card>

        <Title level={3} style={{ marginBottom: '20px' }}>
          История финансов
        </Title>
        {displayedFinancials.length > 0 ? (
          <List
            itemLayout="vertical"
            dataSource={displayedFinancials}
            renderItem={(financial) => (
              <Card
                key={financial.id}
                style={{ marginBottom: '15px' }}
                type="inner"
                title={`${financial.type === 'income' ? 'Доход' : 'Расход'}: ${financial.amount.toFixed(2)} руб.`}
              >
                <Text>
                  <Text strong>Описание:</Text> {financial.description}
                </Text>
                <br />
                <Text>
                  <Text strong>Дата:</Text>{' '}
                  {new Date(financial.date).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Card>
            )}
          />
        ) : (
          <Result
            status="info"
            title="Финансовые записи не найдены"
            subTitle="Для этого сотрудника пока нет финансовых транзакций."
          />
        )}
      </Content>
    </Layout>
  );
}

export default EmployeeDetailsPage;
