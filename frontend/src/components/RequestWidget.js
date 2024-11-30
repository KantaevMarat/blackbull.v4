import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';


const RequestWidget = () => {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const requestsQuery = query(
      collection(db, 'requests'),
      where('status', '==', 'pending') // Или другой статус, который ты хочешь отобразить
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const fetchedRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(fetchedRequests);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="request-widget">
      <h2>Активные заявки</h2>
      {requests.length === 0 ? (
        <p>Нет активных заявок.</p>
      ) : (
        <ul>
          {requests.map((request) => (
            <li key={request.id}>
              <span>{request.name} - {request.carModel} ({request.carYear})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RequestWidget;
