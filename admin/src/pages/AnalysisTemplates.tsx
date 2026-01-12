import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Tag,
  Space,
  Modal,
  Form,
  message,
  Typography,
  Tooltip,
  Popconfirm,
  Drawer,
  Select,
  Switch,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  ReloadOutlined,
} from '@ant-design/icons';
import { analysisTemplateApi } from '../services/api';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  required: boolean;
  defaultValue?: string;
}

interface AnalysisTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: TemplateVariable[];
  exampleInput?: string;
  exampleOutput?: string;
  isPublic: boolean;
  isSystem: boolean;
  createdBy?: { username: string };
  createdAt: string;
}

const AnalysisTemplates = () => {
  const [templates, setTemplates] = useState<AnalysisTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editVisible, setEditVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AnalysisTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await analysisTemplateApi.getAll(categoryFilter || undefined);
      setTemplates(response.data.templates);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('获取模板列表失败:', error);
      messageApi.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter]);

  // 初始化系统模板
  const handleInitSystem = async () => {
    try {
      const response = await analysisTemplateApi.initSystem();
      messageApi.success(response.data.message);
      fetchTemplates();
    } catch (error) {
      console.error('初始化系统模板失败:', error);
      messageApi.error('初始化失败');
    }
  };

  // 打开编辑弹窗
  const handleEdit = (template?: AnalysisTemplate) => {
    setSelectedTemplate(template || null);
    if (template) {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        category: template.category,
        systemPrompt: template.systemPrompt,
        userPromptTemplate: template.userPromptTemplate,
        variablesText: template.variables
          .map((v) => `${v.name}:${v.label}:${v.type}:${v.required}`)
          .join('\n'),
        exampleInput: template.exampleInput,
        exampleOutput: template.exampleOutput,
        isPublic: template.isPublic,
        isSystem: template.isSystem,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isPublic: true, isSystem: false });
    }
    setEditVisible(true);
  };

  // 保存模板
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // 解析变量定义
      const variables: TemplateVariable[] = values.variablesText
        ? values.variablesText
            .split('\n')
            .filter((line: string) => line.trim())
            .map((line: string) => {
              const [name, label, type = 'text', required = 'false'] = line
                .split(':')
                .map((s: string) => s.trim());
              return {
                name,
                label: label || name,
                type: type as 'text' | 'textarea' | 'select',
                required: required === 'true',
                defaultValue: '',
              };
            })
        : [];

      const templateData = {
        name: values.name,
        description: values.description || '',
        category: values.category || '通用',
        systemPrompt: values.systemPrompt,
        userPromptTemplate: values.userPromptTemplate,
        variables,
        exampleInput: values.exampleInput,
        exampleOutput: values.exampleOutput,
        isPublic: values.isPublic,
        isSystem: values.isSystem,
      };

      if (selectedTemplate) {
        await analysisTemplateApi.update(selectedTemplate._id, templateData);
        messageApi.success('模板更新成功');
      } else {
        await analysisTemplateApi.create(templateData);
        messageApi.success('模板创建成功');
      }

      setEditVisible(false);
      fetchTemplates();
    } catch (error) {
      console.error('保存模板失败:', error);
      messageApi.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除模板
  const handleDelete = async (id: string) => {
    try {
      await analysisTemplateApi.delete(id);
      messageApi.success('删除成功');
      fetchTemplates();
    } catch (error) {
      console.error('删除模板失败:', error);
      messageApi.error('删除失败');
    }
  };

  // 查看详情
  const handleViewDetail = (template: AnalysisTemplate) => {
    setSelectedTemplate(template);
    setDetailVisible(true);
  };

  // 过滤模板
  const filteredTemplates = templates.filter((t) =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: AnalysisTemplate) => (
        <div className="flex items-center gap-2">
          {record.isSystem ? (
            <StarFilled className="text-yellow-500" />
          ) : (
            <StarOutlined className="text-gray-400" />
          )}
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200,
    },
    {
      title: '变量数',
      dataIndex: 'variables',
      key: 'variables',
      width: 80,
      render: (vars: TemplateVariable[]) => <Tag>{vars?.length || 0}</Tag>,
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_: unknown, record: AnalysisTemplate) => (
        <Space>
          {record.isSystem && <Tag color="gold">系统</Tag>}
          {record.isPublic ? <Tag color="green">公开</Tag> : <Tag>私有</Tag>}
        </Space>
      ),
    },
    {
      title: '创建者',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 100,
      render: (user: { username: string }) => user?.username || '系统',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: AnalysisTemplate) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<SearchOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个模板吗？"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {contextHolder}

      {/* 工具栏 */}
      <Card bordered={false} className="shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              placeholder="搜索模板..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder="按分类筛选"
              value={categoryFilter || undefined}
              onChange={(value) => setCategoryFilter(value || '')}
              style={{ width: 150 }}
              allowClear
            >
              {categories.map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {cat}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<ReloadOutlined />} onClick={handleInitSystem}>
              初始化系统模板
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleEdit()}>
              新建模板
            </Button>
          </div>
        </div>
      </Card>

      {/* 模板列表 */}
      <Card bordered={false} className="shadow-sm">
        <Table
          dataSource={filteredTemplates}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 编辑弹窗 */}
      <Modal
        title={selectedTemplate ? '编辑模板' : '新建模板'}
        open={editVisible}
        onOk={handleSave}
        onCancel={() => setEditVisible(false)}
        confirmLoading={saving}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="模板名称"
              rules={[{ required: true, message: '请输入模板名称' }]}
            >
              <Input placeholder="例如：产品需求文档" />
            </Form.Item>
            <Form.Item name="category" label="分类">
              <Input placeholder="例如：产品、教育、技术" />
            </Form.Item>
          </div>
          <Form.Item name="description" label="描述">
            <Input placeholder="简要描述模板用途" />
          </Form.Item>
          <Form.Item
            name="systemPrompt"
            label="系统提示词（角色设定）"
            rules={[{ required: true, message: '请输入系统提示词' }]}
          >
            <TextArea
              rows={4}
              placeholder="定义 AI 的角色和行为，例如：你是一位资深的产品经理..."
            />
          </Form.Item>
          <Form.Item
            name="userPromptTemplate"
            label="用户提示词模板"
            rules={[{ required: true, message: '请输入用户提示词模板' }]}
            extra="使用 {变量名} 表示需要用户填写的内容，例如 {title}、{content}"
          >
            <TextArea rows={8} placeholder="请根据以下资料为「{title}」撰写..." />
          </Form.Item>
          <Form.Item
            name="variablesText"
            label="变量定义"
            extra="每行一个变量，格式：变量名:显示名称:类型:是否必填，例如 title:标题:text:true"
          >
            <TextArea
              rows={4}
              placeholder="title:标题:text:true&#10;content:内容:textarea:false"
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="exampleInput" label="示例输入">
              <TextArea rows={3} placeholder="输入示例" />
            </Form.Item>
            <Form.Item name="exampleOutput" label="示例输出">
              <TextArea rows={3} placeholder="输出示例" />
            </Form.Item>
          </div>
          <div className="flex gap-4">
            <Form.Item name="isPublic" valuePropName="checked" label="公开">
              <Switch checkedChildren="公开" unCheckedChildren="私有" />
            </Form.Item>
            <Form.Item name="isSystem" valuePropName="checked" label="系统模板">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title="模板详情"
        placement="right"
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={
          <Button onClick={() => {
            setDetailVisible(false);
            if (selectedTemplate) handleEdit(selectedTemplate);
          }}>
            编辑
          </Button>
        }
      >
        {selectedTemplate && (
          <div className="space-y-6">
            <div>
              <Text type="secondary">模板名称</Text>
              <div className="flex items-center gap-2 mt-1">
                {selectedTemplate.isSystem && <StarFilled className="text-yellow-500" />}
                <Text strong>{selectedTemplate.name}</Text>
              </div>
            </div>
            <div>
              <Text type="secondary">分类</Text>
              <div className="mt-1">
                <Tag color="blue">{selectedTemplate.category}</Tag>
              </div>
            </div>
            <div>
              <Text type="secondary">描述</Text>
              <Paragraph className="mt-1">{selectedTemplate.description || '无'}</Paragraph>
            </div>
            <Divider />
            <div>
              <Text type="secondary">系统提示词</Text>
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <pre className="whitespace-pre-wrap text-sm">
                  {selectedTemplate.systemPrompt}
                </pre>
              </div>
            </div>
            <div>
              <Text type="secondary">用户提示词模板</Text>
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <pre className="whitespace-pre-wrap text-sm">
                  {selectedTemplate.userPromptTemplate}
                </pre>
              </div>
            </div>
            {selectedTemplate.variables.length > 0 && (
              <div>
                <Text type="secondary">变量定义</Text>
                <div className="mt-2 space-y-2">
                  {selectedTemplate.variables.map((v) => (
                    <div key={v.name} className="flex items-center gap-2">
                      <Tag>{v.name}</Tag>
                      <Text>{v.label}</Text>
                      <Tag color="blue">{v.type}</Tag>
                      {v.required && <Tag color="red">必填</Tag>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedTemplate.exampleInput && (
              <div>
                <Text type="secondary">示例输入</Text>
                <div className="mt-2 p-3 bg-blue-50 rounded">
                  <pre className="whitespace-pre-wrap text-sm">
                    {selectedTemplate.exampleInput}
                  </pre>
                </div>
              </div>
            )}
            {selectedTemplate.exampleOutput && (
              <div>
                <Text type="secondary">示例输出</Text>
                <div className="mt-2 p-3 bg-green-50 rounded">
                  <pre className="whitespace-pre-wrap text-sm">
                    {selectedTemplate.exampleOutput}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AnalysisTemplates;
