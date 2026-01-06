import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, DatabaseOutlined } from '@ant-design/icons';
import { authApi } from '../services/api';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
}

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      const response = await authApi.login(values.username, values.password);
      localStorage.setItem('admin_token', response.data.token);
      messageApi.success('登录成功！');
      setTimeout(() => navigate('/'), 500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      messageApi.error(error.response?.data?.error || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      {contextHolder}
      <Card 
        className="w-full max-w-md shadow-2xl"
        styles={{ body: { padding: '40px' } }}
      >
        <div className="text-center mb-8">
          <DatabaseOutlined className="text-5xl text-blue-500 mb-4" />
          <Title level={2} className="!mb-2">RAG 知识库管理</Title>
          <Text type="secondary">管理员登录</Text>
        </div>

        <Form
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined className="text-gray-400" />} 
              placeholder="请输入管理员用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined className="text-gray-400" />} 
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item className="!mb-0">
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              size="large"
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
