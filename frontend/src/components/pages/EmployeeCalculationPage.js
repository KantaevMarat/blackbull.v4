import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';  // Подключение контекста авторизации
import '../css/CalculationPage.css';
import LoadingSpinner from '../LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

function EmployeeCalculationPage() {
  const { currentUser } = useAuth();  // Получаем текущего пользователя из контекста
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      const transactionsCollection = collection(db, 'transactions');
      // Фильтруем транзакции по текущему пользователю
      const q = query(transactionsCollection, where('employeeId', '==', currentUser.uid));
      const unsubscribeTransactions = onSnapshot(
        q,
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
      return () => unsubscribeTransactions();
    }
  }, [currentUser]);

  const doughnutData = {
    labels: ['Доходы', 'Расходы'],
    datasets: [
      {
        data: [income, expenses],
        backgroundColor: ['#4caf50', '#f44336'],
        hoverBackgroundColor: ['#66bb6a', '#ef5350'],
      },
    ],
  };

  const doughnutOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10,
      },
    },
  };

  if (transactionsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="calculation-page">
      <ToastContainer />
      <h1>Ваши Финансы</h1>

      <div className="financial-chart">
        <h2>Финансовая статистика</h2>
        <div className="doughnut-chart">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      </div>

      <h2>Общий баланс: {balance.toFixed(2)} руб.</h2>

      <h2>История расчетов</h2>
      <div className="history-section">
        {history.length > 0 ? (
          history
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((record) => (
              <div key={record.id} className={`history-item ${record.type}`}>
                <div className="history-details">
                  <p>
                    {new Date(record.date).toLocaleString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p>{record.category}</p>
                  {record.comment && <p className="comment">{record.comment}</p>}
                </div>
                <p className={`amount ${record.type}`}>
                  {record.type === 'income' ? `+${record.amount}` : `-${record.amount}`}
                </p>
              </div>
            ))
        ) : (
          <p>Транзакции не найдены.</p>
        )}
      </div>
    </div>
  );
}

export default EmployeeCalculationPage;
