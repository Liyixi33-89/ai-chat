import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Spin, Typography, Empty } from 'antd';
import {
  FileTextOutlined,
  DatabaseOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { statsApi } from '../services/api';

const { Title } = Typography;

interface Stats {
  totalDocuments: number;
  totalChunks: number;
  totalUsers: number;
  documentsByType: Record<string, number>;
  recentDocuments: Array<{
    _id: string;
    name: string;
    createdAt: string;
    status: string;
  }>;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await statsApi.getOverview();
        setStats(response.data);
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      ready: { color: 'success', text: '就绪' },
      processing: { color: 'processing', text: '处理中' },
      error: { color: 'error', text: '错误' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const recentColumns = [
    {
      title: '文档名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
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
    <div className="space-y-6">
      {/* 统计卡片 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="文档总数"
              value={stats?.totalDocuments || 0}
              prefix={<FileTextOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="向量块总数"
              value={stats?.totalChunks || 0}
              prefix={<DatabaseOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="用户总数"
              value={stats?.totalUsers || 0}
              prefix={<UserOutlined className="text-purple-500" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 详细信息 */}
      <Row gutter={[24, 24]}>
        {/* 文档类型分布 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div className="flex items-center gap-2">
                <FileTextOutlined />
                <span>文档类型分布</span>
              </div>
            }
            bordered={false} 
            className="shadow-sm h-full"
          >
            {stats?.documentsByType && Object.keys(stats.documentsByType).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.documentsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <Tag className="uppercase">{type}</Tag>
                    <span className="font-medium text-gray-700">{count} 个</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>

        {/* 最近上传 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div className="flex items-center gap-2">
                <ClockCircleOutlined />
                <span>最近上传</span>
              </div>
            }
            bordered={false} 
            className="shadow-sm h-full"
          >
            <Table
              dataSource={stats?.recentDocuments || []}
              columns={recentColumns}
              rowKey="_id"
              pagination={false}
              size="small"
              locale={{ emptyText: <Empty description="暂无数据" /> }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
