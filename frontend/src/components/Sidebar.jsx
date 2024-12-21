// src/components/Sidebar.jsx

import React, { useState } from 'react';
import { Layout, Menu, Drawer, Button, Grid } from 'antd';
import {
  MenuOutlined,
  HomeOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  UsergroupAddOutlined,
  SettingOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthContext';

const { Sider } = Layout;
const { useBreakpoint } = Grid;

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { currentUser, userRole, logout } = useAuth();
  const screens = useBreakpoint();

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Ошибка выхода:", error);
    }
  };

  const adminMenuItems = [
    { key: 'home', icon: <HomeOutlined />, label: <Link to="/">Главная</Link> },
    { key: 'new-request', icon: <PlusCircleOutlined />, label: <Link to="/request-form">Новая заявка</Link> },
    { key: 'requests', icon: <UnorderedListOutlined />, label: <Link to="/requests">Список заявок</Link> },
    { key: 'archived-requests', icon: <InboxOutlined/>, label: <Link to="/archived-requests">Архив заявок</Link> },
    { key: 'confirmations', icon: <CheckCircleOutlined />, label: <Link to="/confirmations">Подтверждения</Link> },
    { key: 'calculations', icon: <CalculatorOutlined />, label: <Link to="/calculations">Расчётная система</Link> },
    { key: 'employees', icon: <UsergroupAddOutlined />, label: <Link to="/employees">Сотрудники</Link> },
    { key: 'admin-quick-request', icon: <PlusCircleOutlined />, label: <Link to="/admin-quick-request">Быстрая заявка (confirmation)</Link> },
    { key: 'settings', icon: <SettingOutlined />, label: <Link to="/settings">Настройки</Link> },
    { key: 'logout', icon: <LogoutOutlined />, label: <span onClick={handleLogout}>Выйти</span> },
  ];

  const workerMenuItems = [
    { key: 'worker-finances', icon: <CalculatorOutlined />, label: <Link to="/worker-finances">Система расчетов</Link> },
    { key: 'worker-requests', icon: <UnorderedListOutlined />, label: <Link to="/worker-requests">Мои заявки</Link> },
    { key: 'report', icon: <FileTextOutlined />, label: <Link to="/report">Отчёты</Link> },
    { key: 'logout', icon: <LogoutOutlined />, label: <span onClick={handleLogout}>Выйти</span> },
  ];

  const guestMenuItems = [
    { key: 'login', icon: <LoginOutlined />, label: <Link to="/worker-login">Войти</Link> },
    { key: 'new-request', icon: <PlusCircleOutlined />, label: <Link to="/request-form">Новая заявка</Link> },
  ];

  let menuItems = [];
  if (!currentUser) {
    menuItems = guestMenuItems;
  } else if (userRole === 'admin') {
    menuItems = adminMenuItems;
  } else if (userRole === 'worker') {
    menuItems = workerMenuItems;
  }

  const isMobile = !screens.lg;

  return (
    <>
      {isMobile ? (
        <>
          <div 
            style={{ 
              position: 'fixed', 
              top: 10, 
              left: 10, 
              zIndex: 999 
            }}
          >
            <Button 
              type="text"
              icon={<MenuOutlined style={{ color: '#000' }} />} 
              onClick={showDrawer}
              style={{ 
                backgroundColor: '#fff', 
                borderColor: '#fff' 
              }}
            />
          </div>
          <Drawer
            placement="left"
            closable={true}
            onClose={closeDrawer}
            open={drawerVisible}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ height: '64px', margin: '16px', color: '#000', textAlign: 'center', fontSize: '1.2em' }}>
              BBull
            </div>
            <Menu
              mode="inline"
              defaultSelectedKeys={['home']}
              items={menuItems}
              style={{ height: '100%', borderRight: 0 }}
              onClick={() => closeDrawer()}
            />
          </Drawer>
        </>
      ) : (
        // На больших экранах используем обычный Sider AntD без position fixed
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={toggleCollapsed}
          breakpoint="lg"
          collapsedWidth="80"
        >
          <div style={{ height: '64px', margin: '16px', color: '#fff', textAlign: 'center', fontSize: '1.2em' }}>
            BBull
          </div>
          <Menu
            theme="dark"
            defaultSelectedKeys={['home']}
            mode="inline"
            items={menuItems}
          />
        </Sider>
      )}
    </>
  );
};

export default Sidebar;
