// src/components/Sidebar.js

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './css/Sidebar.css';
import { FaBars, FaHome, FaList, FaArchive, FaCheckCircle, FaUserFriends, FaSignInAlt, FaSignOutAlt, FaCog, FaPlusCircle } from 'react-icons/fa';
import { AiFillCalculator, AiOutlineFileText } from 'react-icons/ai';
import { useAuth } from '../components/auth/AuthContext';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);  // Состояние для открытия и закрытия сайдбара
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);  // Определение мобильного устройства
  const { currentUser, userRole, logout } = useAuth();  // Получение данных пользователя и его роли
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);  // Переключение состояния сайдбара
  };

  const handleResize = () => {
    setIsMobile(window.innerWidth <= 768);  // Проверка размера окна для мобильного устройства
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);  // Добавление обработчика изменения размера

    return () => {
      window.removeEventListener('resize', handleResize);  // Удаление обработчика при размонтировании
    };
  }, []);

  useEffect(() => {
    const appElement = document.querySelector('.App');
    if (isOpen) {
      appElement.classList.add('sidebar-open');
    } else {
      appElement.classList.remove('sidebar-open');
    }
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/worker-login');  // Перенаправление на страницу входа для сотрудников после выхода
    } catch (error) {
      console.error("Ошибка выхода из системы:", error);
    }
  };

  return (
    <>
      <div className="top-bar">
        <div
          className={`menu-icon ${isOpen && isMobile ? 'open' : ''} ${isMobile ? 'mobile' : 'desktop'}`}
          onClick={toggleSidebar}  // Переключение сайдбара при клике
        >
          <FaBars />
        </div>
      </div>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <ul className="menu-items">
          {currentUser && (
            <>
              {userRole === 'admin' && (
                <>
                  <li className="menu-item home">
                    <Link to="/" onClick={() => setIsOpen(false)}>
                      <FaHome className="icon" />
                      <span className="link-text">Главная</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/request-form" onClick={() => setIsOpen(false)}>
                      <FaPlusCircle className="icon" />
                      <span className="link-text">Новая заявка</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/requests" onClick={() => setIsOpen(false)}>
                      <FaList className="icon" />
                      <span className="link-text">Список заявок</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/archived-requests" onClick={() => setIsOpen(false)}>
                      <FaArchive className="icon" />
                      <span className="link-text">Архив заявок</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/confirmations" onClick={() => setIsOpen(false)}>
                      <FaCheckCircle className="icon" />
                      <span className="link-text">Подтверждения</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/calculations" onClick={() => setIsOpen(false)}>
                      <AiFillCalculator className="icon large-icon" />
                      <span className="link-text">Расчётная система</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/employees" onClick={() => setIsOpen(false)}>
                      <FaUserFriends className="icon" />
                      <span className="link-text">Сотрудники</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/settings" onClick={() => setIsOpen(false)}>
                      <FaCog className="icon" />
                      <span className="link-text">Настройки</span>
                    </Link>
                  </li>
                </>
              )}

              {userRole === 'worker' && (
                <>
                  <li>
                    <Link to="/worker-finances" onClick={() => setIsOpen(false)}>
                      <AiFillCalculator className="icon" />
                      <span className="link-text">Система расчетов</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/worker-requests" onClick={() => setIsOpen(false)}>
                      <FaList className="icon" />
                      <span className="link-text">Мои заявки</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/report" onClick={() => setIsOpen(false)}>
                      <AiOutlineFileText className="icon" />
                      <span className="link-text">Отчеты</span>
                    </Link>
                  </li>
                </>
              )}
              <li className="menu-item logout">
                <Link to="#" onClick={handleLogout}>
                  <FaSignOutAlt className="icon" />
                  <span className="link-text">Выйти</span>
                </Link>
              </li>
            </>
          )}

          {!currentUser && (
            <>
              <li className="menu-item login">
                <Link to="/worker-login" onClick={() => setIsOpen(false)}>
                  <FaSignInAlt className="icon" />
                  <span className="link-text">Войти</span>
                </Link>
              </li>
              <li>
                <Link to="/request-form" onClick={() => setIsOpen(false)}>
                  <FaPlusCircle className="icon" />
                  <span className="link-text">Новая заявка</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </>
  );
};

export default Sidebar;