import { useEffect } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { XProvider } from '@ant-design/x';
import zhCN from 'antd/locale/zh_CN';
import ChatContainer from './components/ChatContainer';
import { initRemAdapter } from './utils/rem';
import './App.css';

const AppContent: React.FC = () => {
  // 初始化 rem 适配
  useEffect(() => {
    initRemAdapter();
  }, []);

  return (
    <div className="app">
      <ChatContainer />
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
