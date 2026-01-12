import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Typography, Button, theme } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  MessageOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;
const { Title, Text } = Typography;

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: '文档管理',
    },
    {
      key: '/templates',
      icon: <AppstoreOutlined />,
      label: '分析模板',
    },
    {
      key: '/entries',
      icon: <MessageOutlined />,
      label: '词条管理',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
  ];

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return '/';
    if (path.startsWith('/documents')) return '/documents';
    if (path.startsWith('/templates')) return '/templates';
    if (path.startsWith('/entries')) return '/entries';
    if (path.startsWith('/users')) return '/users';
    return path;
  };

  return (
    <AntLayout className="min-h-screen">
      <Sider
        theme="light"
        width={240}
        className="border-r border-gray-200"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo 区域 */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <DatabaseOutlined className="text-2xl text-blue-500" />
            <div>
              <Title level={5} className="!mb-0">RAG 管理后台</Title>
              <Text type="secondary" className="text-xs">知识库数据管理</Text>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ 
            border: 'none',
            marginTop: 8,
          }}
        />

        {/* 退出登录按钮 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            block
            className="text-left"
          >
            退出登录
          </Button>
        </div>
      </Sider>

      <AntLayout style={{ marginLeft: 240 }}>
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Title level={4} className="!mb-0">
            {menuItems.find(item => item.key === getSelectedKey())?.label || ''}
          </Title>
        </Header>

        <Content
          style={{
            margin: 24,
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
