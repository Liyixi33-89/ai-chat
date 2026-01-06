import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Avatar,
  message,
  Popconfirm,
  Tooltip,
  Spin,
} from 'antd';
import {
  UserOutlined,
  DeleteOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { userApi } from '../services/api';

interface User {
  _id: string;
  username: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getAll();
      setUsers(response.data.users);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      messageApi.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string, username: string) => {
    if (username === 'admin') {
      messageApi.warning('不能删除管理员账户');
      return;
    }

    try {
      await userApi.delete(id);
      messageApi.success('删除成功');
      fetchUsers();
    } catch (error) {
      console.error('删除用户失败:', error);
      messageApi.error('删除失败，请重试');
    }
  };

  const getAvatarColor = (username: string) => {
    const colors = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const columns = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: User) => (
        <div className="flex items-center gap-3">
          <Avatar
            style={{ backgroundColor: getAvatarColor(username) }}
            icon={<UserOutlined />}
          >
            {username.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{username}</span>
              {(username === 'admin' || record.role === 'admin') && (
                <Tag color="purple" icon={<CrownOutlined />}>
                  管理员
                </Tag>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'purple' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '最后更新',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: User) => (
        <Space>
          {record.username === 'admin' || record.role === 'admin' ? (
            <Tooltip title="管理员账户不能删除">
              <Button type="text" size="small" disabled icon={<DeleteOutlined />} />
            </Tooltip>
          ) : (
            <Popconfirm
              title="确定要删除该用户吗？"
              description="该用户的所有数据都会被删除。"
              onConfirm={() => handleDelete(record._id, record.username)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contextHolder}

      {/* 统计信息 */}
      <Card bordered={false} className="shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <UserOutlined className="text-2xl text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{users.length}</div>
              <div className="text-gray-500">用户总数</div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">
                {users.filter(u => u.username === 'admin' || u.role === 'admin').length}
              </div>
              <div className="text-gray-500 text-sm">管理员</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                {users.filter(u => u.username !== 'admin' && u.role !== 'admin').length}
              </div>
              <div className="text-gray-500 text-sm">普通用户</div>
            </div>
          </div>
        </div>
      </Card>

      {/* 用户列表 */}
      <Card bordered={false} className="shadow-sm" title="用户列表">
        <Table
          dataSource={users}
          columns={columns}
          rowKey="_id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default Users;
