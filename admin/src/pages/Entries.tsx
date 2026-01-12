import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Space,
  Tag,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Tooltip,
  Badge,
  Typography,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '../services/api';

const { TextArea } = Input;
const { Text } = Typography;

interface Entry {
  _id: string;
  keywords: string[];
  question: string;
  answer: string;
  matchType: 'exact' | 'contains' | 'regex';
  priority: number;
  category: string;
  isActive: boolean;
  hitCount: number;
  remark: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    username: string;
  };
}

const Entries = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [categories, setCategories] = useState<string[]>([]);
  
  // 筛选条件
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [filterActive, setFilterActive] = useState<string | undefined>();
  
  // 模态框
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [form] = Form.useForm();
  
  // 测试匹配
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // 获取词条列表
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (searchKeyword) params.keyword = searchKeyword;
      if (filterCategory) params.category = filterCategory;
      if (filterActive !== undefined) params.isActive = filterActive;
      
      const response = await adminApi.getEntries(params);
      setEntries(response.entries || []);
      setTotal(response.total || 0);
      setCategories(response.categories || []);
    } catch (error: any) {
      message.error(error.message || '获取词条列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [page, pageSize]);

  // 搜索
  const handleSearch = () => {
    setPage(1);
    fetchEntries();
  };

  // 重置筛选
  const handleReset = () => {
    setSearchKeyword('');
    setFilterCategory(undefined);
    setFilterActive(undefined);
    setPage(1);
    fetchEntries();
  };

  // 打开创建/编辑模态框
  const handleOpenModal = (entry?: Entry) => {
    if (entry) {
      setEditingEntry(entry);
      form.setFieldsValue({
        ...entry,
        keywords: entry.keywords.join(', '),
      });
    } else {
      setEditingEntry(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 保存词条
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理关键词
      const keywords = values.keywords
        .split(/[,，]/)
        .map((k: string) => k.trim())
        .filter((k: string) => k);
      
      const data = {
        ...values,
        keywords,
      };
      
      if (editingEntry) {
        await adminApi.updateEntry(editingEntry._id, data);
        message.success('词条更新成功');
      } else {
        await adminApi.createEntry(data);
        message.success('词条创建成功');
      }
      
      setModalVisible(false);
      fetchEntries();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || '保存失败');
    }
  };

  // 删除词条
  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteEntry(id);
      message.success('词条删除成功');
      fetchEntries();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  // 切换启用状态
  const handleToggle = async (entry: Entry) => {
    try {
      await adminApi.toggleEntry(entry._id);
      message.success(entry.isActive ? '词条已禁用' : '词条已启用');
      fetchEntries();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 测试匹配
  const handleTestMatch = async () => {
    if (!testInput.trim()) {
      message.warning('请输入测试内容');
      return;
    }
    
    setTestLoading(true);
    try {
      const result = await adminApi.testEntryMatch(testInput);
      setTestResult(result);
    } catch (error: any) {
      message.error(error.message || '测试失败');
    } finally {
      setTestLoading(false);
    }
  };

  // 表格列定义
  const columns: ColumnsType<Entry> = [
    {
      title: '关键词',
      dataIndex: 'keywords',
      key: 'keywords',
      width: 150,
      render: (keywords: string[]) => (
        <Space wrap size={[4, 4]}>
          {keywords.slice(0, 3).map((kw, i) => (
            <Tag key={i} color="blue">{kw}</Tag>
          ))}
          {keywords.length > 3 && (
            <Tooltip title={keywords.slice(3).join(', ')}>
              <Tag>+{keywords.length - 3}</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '问题',
      dataIndex: 'question',
      key: 'question',
      width: 200,
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip title={text}>
          <Text>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: '答案预览',
      dataIndex: 'answer',
      key: 'answer',
      width: 200,
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip title={text}>
          <Text>{text.length > 50 ? text.slice(0, 50) + '...' : text}</Text>
        </Tooltip>
      ),
    },
    {
      title: '匹配类型',
      dataIndex: 'matchType',
      key: 'matchType',
      width: 100,
      render: (type) => {
        const typeMap = {
          exact: { color: 'green', label: '精确匹配' },
          contains: { color: 'blue', label: '包含匹配' },
          regex: { color: 'purple', label: '正则匹配' },
        };
        const config = typeMap[type as keyof typeof typeMap];
        return <Tag color={config?.color}>{config?.label}</Tag>;
      },
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => <Tag>{category}</Tag>,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a, b) => a.priority - b.priority,
    },
    {
      title: '命中次数',
      dataIndex: 'hitCount',
      key: 'hitCount',
      width: 90,
      render: (count) => <Badge count={count} showZero color="#52c41a" />,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggle(record)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此词条吗？"
            onConfirm={() => handleDelete(record._id)}
          >
            <Tooltip title="删除">
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计数据
  const activeCount = entries.filter(e => e.isActive).length;
  const totalHits = entries.reduce((sum, e) => sum + e.hitCount, 0);

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card>
            <Statistic title="词条总数" value={total} prefix={<QuestionCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="启用词条" value={activeCount} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="禁用词条" value={entries.length - activeCount} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总命中次数" value={totalHits} prefix={<ExperimentOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
      </Row>

      {/* 搜索和操作栏 */}
      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Input
              placeholder="搜索关键词/问题/答案"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择分类"
              value={filterCategory}
              onChange={setFilterCategory}
              allowClear
              style={{ width: '100%' }}
            >
              {categories.map(cat => (
                <Select.Option key={cat} value={cat}>{cat}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择状态"
              value={filterActive}
              onChange={setFilterActive}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="true">已启用</Select.Option>
              <Select.Option value="false">已禁用</Select.Option>
            </Select>
          </Col>
          <Col span={10}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
              <Divider type="vertical" />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
                新建词条
              </Button>
              <Button icon={<ExperimentOutlined />} onClick={() => setTestModalVisible(true)}>
                测试匹配
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 词条列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={entries}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* 创建/编辑模态框 */}
      <Modal
        title={editingEntry ? '编辑词条' : '新建词条'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ matchType: 'contains', priority: 0, isActive: true, category: '默认' }}>
          <Form.Item
            name="keywords"
            label="关键词"
            rules={[{ required: true, message: '请输入关键词' }]}
            extra="多个关键词用逗号分隔，如：liyixi, 李一熙, 最帅"
          >
            <Input placeholder="输入关键词，多个用逗号分隔" />
          </Form.Item>
          
          <Form.Item
            name="question"
            label="问题/触发语句"
            rules={[{ required: true, message: '请输入问题' }]}
            extra="用于匹配用户输入，支持部分匹配"
          >
            <Input placeholder="例如：liyixi是不是最帅的" />
          </Form.Item>
          
          <Form.Item
            name="answer"
            label="预设答案"
            rules={[{ required: true, message: '请输入答案' }]}
          >
            <TextArea rows={6} placeholder="输入预设的回复内容..." />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="matchType" label="匹配类型">
                <Select>
                  <Select.Option value="exact">精确匹配</Select.Option>
                  <Select.Option value="contains">包含匹配</Select.Option>
                  <Select.Option value="regex">正则匹配</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="category" label="分类">
                <Input placeholder="默认" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="优先级">
                <InputNumber min={0} max={999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isActive" label="是否启用" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="remark" label="备注">
            <TextArea rows={2} placeholder="可选备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 测试匹配模态框 */}
      <Modal
        title="测试词条匹配"
        open={testModalVisible}
        onCancel={() => {
          setTestModalVisible(false);
          setTestInput('');
          setTestResult(null);
        }}
        footer={null}
        width={600}
      >
        <div className="mb-4">
          <Input.Search
            placeholder="输入测试内容，如：liyixi是不是最帅的男人"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onSearch={handleTestMatch}
            enterButton="测试"
            loading={testLoading}
            size="large"
          />
        </div>
        
        {testResult && (
          <Card className={testResult.matched ? 'border-green-500' : 'border-red-500'}>
            {testResult.matched ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleOutlined className="text-green-500 text-xl" />
                  <Text strong className="text-green-600">匹配成功！</Text>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="mb-2">
                    <Text type="secondary">匹配问题：</Text>
                    <Text>{testResult.entry?.question}</Text>
                  </div>
                  <div className="mb-2">
                    <Text type="secondary">分类：</Text>
                    <Tag>{testResult.entry?.category}</Tag>
                  </div>
                  <div>
                    <Text type="secondary">预设答案：</Text>
                    <div className="mt-1 p-2 bg-white rounded border">
                      {testResult.entry?.answer}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CloseCircleOutlined className="text-red-500 text-xl" />
                <Text type="secondary">未匹配到任何词条，将走 AI 回复流程</Text>
              </div>
            )}
          </Card>
        )}
      </Modal>
    </div>
  );
};

export default Entries;
