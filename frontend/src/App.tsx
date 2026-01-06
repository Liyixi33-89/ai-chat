import { useEffect, useState, useCallback } from 'react';
import { ConfigProvider, App as AntApp, message } from 'antd';
import { XProvider } from '@ant-design/x';
import zhCN from 'antd/locale/zh_CN';
import Login from './components/Login';
import ChatContainer from './components/ChatContainer';
import { initRemAdapter } from './utils/rem';
import { logout, getCurrentUser } from './services/api';
import './App.css';

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 初始化 rem 适配
  useEffect(() => {
    initRemAdapter();
  }, []);

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        await getCurrentUser();
        setIsAuthenticated(true);
      } catch {
        // token 无效，清除并跳转到登录
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      message.success('已退出登录');
    } catch {
      // 即使 API 失败也要清除本地状态
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
    }
  }, []);

  // 加载中状态
  if (isAuthenticated === null) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {isAuthenticated ? (
        <ChatContainer onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <XProvider>
        <AntApp>
          <AppContent />
        </AntApp>
      </XProvider>
    </ConfigProvider>
  );
};

export default App;
