import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Input,
  Tag,
  Space,
  Modal,
  Form,
  Descriptions,
  message,
  Upload,
  Typography,
  Tooltip,
  Popconfirm,
  Drawer,
  Select,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileMarkdownOutlined,
  TagsOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { UploadProps, TableRowSelection } from 'antd';
import { knowledgeApi, categoryPromptApi } from '../services/api';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface Document {
  _id: string;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  content: string;
  chunkCount: number;
  status: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  userId: {
    _id: string;
    username: string;
  };
}

interface CategoryPrompt {
  _id: string;
  name: string;
  prompt: string;
  categories: string[];
  isDefault: boolean;
}

const Documents = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // 分类相关状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [categoryPrompts, setCategoryPrompts] = useState<CategoryPrompt[]>([]);
  const [batchCategoryVisible, setBatchCategoryVisible] = useState(false);
  const [autoClassifyVisible, setAutoClassifyVisible] = useState(false);
  const [promptManageVisible, setPromptManageVisible] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [batchCategory, setBatchCategory] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [promptForm] = Form.useForm();
  const [editingPrompt, setEditingPrompt] = useState<CategoryPrompt | null>(null);

  const limit = 10;

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await knowledgeApi.getAll({ page, limit, search, category: categoryFilter });
      setDocuments(response.data.documents);
      setTotal(response.data.total);
      if (response.data.categories) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('获取文档列表失败:', error);
      messageApi.error('获取文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryPrompts = async () => {
    try {
      const response = await categoryPromptApi.getAll();
      setCategoryPrompts(response.data.prompts || []);
    } catch (error) {
      console.error('获取分类 Prompt 失败:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchCategoryPrompts();
  }, [page, search, categoryFilter]);

  const handleDelete = async (id: string) => {
    try {
      await knowledgeApi.delete(id);
      messageApi.success('删除成功');
      fetchDocuments();
    } catch (error) {
      console.error('删除文档失败:', error);
      messageApi.error('删除失败，请重试');
    }
  };

  const handleEdit = (doc: Document) => {
    setSelectedDoc(doc);
    form.setFieldsValue({
      name: doc.name,
      content: doc.content,
      category: doc.category || '未分类',
    });
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    
    try {
      const values = await form.validateFields();
      setSaving(true);
      await knowledgeApi.update(selectedDoc._id, values);
      messageApi.success('保存成功！');
      setEditVisible(false);
      fetchDocuments();
    } catch (error) {
      console.error('保存失败:', error);
      messageApi.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetail = (doc: Document) => {
    setSelectedDoc(doc);
    setDetailVisible(true);
  };

  // 批量更新分类
  const handleBatchCategory = async () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('请先选择文档');
      return;
    }
    try {
      setSaving(true);
      await knowledgeApi.batchUpdateCategory(selectedRowKeys as string[], batchCategory);
      messageApi.success(`已更新 ${selectedRowKeys.length} 个文档的分类`);
      setBatchCategoryVisible(false);
      setSelectedRowKeys([]);
      fetchDocuments();
    } catch (error) {
      console.error('批量更新分类失败:', error);
      messageApi.error('批量更新失败');
    } finally {
      setSaving(false);
    }
  };

  // AI 自动分类
  const handleAutoClassify = async () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('请先选择文档');
      return;
    }
    if (!selectedPromptId && categoryPrompts.length > 0) {
      messageApi.warning('请选择分类 Prompt');
      return;
    }
    try {
      setClassifying(true);
      const response = await knowledgeApi.autoClassify(selectedRowKeys as string[], selectedPromptId);
      const results = response.data.results || [];
      const successCount = results.filter((r: { success: boolean }) => r.success).length;
      messageApi.success(`自动分类完成：成功 ${successCount}/${results.length}`);
      setAutoClassifyVisible(false);
      setSelectedRowKeys([]);
      fetchDocuments();
    } catch (error) {
      console.error('自动分类失败:', error);
      messageApi.error('自动分类失败');
    } finally {
      setClassifying(false);
    }
  };

  // 保存分类 Prompt
  const handleSavePrompt = async () => {
    try {
      const values = await promptForm.validateFields();
      const categoriesArray = values.categories.split(/[,，\n]/).map((c: string) => c.trim()).filter((c: string) => c);
      
      if (categoriesArray.length === 0) {
        messageApi.warning('请至少添加一个分类选项');
        return;
      }

      setSaving(true);
      if (editingPrompt) {
        await categoryPromptApi.update(editingPrompt._id, {
          ...values,
          categories: categoriesArray,
        });
        messageApi.success('更新成功');
      } else {
        await categoryPromptApi.create({
          ...values,
          categories: categoriesArray,
        });
        messageApi.success('创建成功');
      }
      promptForm.resetFields();
      setEditingPrompt(null);
      fetchCategoryPrompts();
    } catch (error) {
      console.error('保存 Prompt 失败:', error);
      messageApi.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除分类 Prompt
  const handleDeletePrompt = async (id: string) => {
    try {
      await categoryPromptApi.delete(id);
      messageApi.success('删除成功');
      fetchCategoryPrompts();
    } catch (error) {
      console.error('删除 Prompt 失败:', error);
      messageApi.error('删除失败');
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.pdf,.txt,.md,.docx,.xlsx,.xls,.csv',
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file as Blob);

      try {
        await knowledgeApi.upload(formData);
        messageApi.success('上传成功！');
        fetchDocuments();
        onSuccess?.({});
      } catch (error) {
        console.error('上传失败:', error);
        messageApi.error('上传失败，请重试');
        onError?.(error as Error);
      } finally {
        setUploading(false);
      }
    },
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      pdf: <FilePdfOutlined className="text-red-500" />,
      txt: <FileTextOutlined className="text-gray-500" />,
      md: <FileMarkdownOutlined className="text-purple-500" />,
      xlsx: <FileExcelOutlined className="text-green-500" />,
      xls: <FileExcelOutlined className="text-green-500" />,
      csv: <FileExcelOutlined className="text-yellow-500" />,
    };
    return icons[type] || <FileTextOutlined />;
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      ready: { color: 'success', text: '就绪' },
      processing: { color: 'processing', text: '处理中' },
      error: { color: 'error', text: '错误' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const getCategoryColor = (category: string) => {
    const colors = ['blue', 'green', 'orange', 'purple', 'cyan', 'magenta', 'gold', 'lime'];
    const index = category ? category.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const rowSelection: TableRowSelection<Document> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const columns = [
    {
      title: '文档名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Document) => (
        <div className="flex items-center gap-2">
          {getFileIcon(record.fileType)}
          <Tooltip title={text}>
            <Text ellipsis className="max-w-[200px]">{text}</Text>
          </Tooltip>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color={getCategoryColor(category || '未分类')}>
          {category || '未分类'}
        </Tag>
      ),
    },
    {
      title: '类型',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 80,
      render: (type: string) => <Tag className="uppercase">{type}</Tag>,
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '分块数',
      dataIndex: 'chunkCount',
      key: 'chunkCount',
      width: 80,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '上传者',
      dataIndex: 'userId',
      key: 'userId',
      width: 100,
      render: (user: { username: string }) => user?.username || '未知',
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
      width: 200,
      render: (_: unknown, record: Document) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
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
          <Tooltip title="管理分块">
            <Button
              type="text"
              size="small"
              icon={<DatabaseOutlined />}
              onClick={() => navigate(`/documents/${record._id}/chunks`)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个文档吗？"
            description="相关的向量数据也会被删除。"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
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
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Input
                placeholder="搜索文档..."
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
                  <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                icon={<SettingOutlined />} 
                onClick={() => setPromptManageVisible(true)}
              >
                管理分类 Prompt
              </Button>
              <Upload {...uploadProps}>
                <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
                  上传文档
                </Button>
              </Upload>
            </div>
          </div>
          
          {/* 批量操作栏 */}
          {selectedRowKeys.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-blue-50 rounded">
              <Text>已选择 {selectedRowKeys.length} 个文档</Text>
              <Button 
                icon={<TagsOutlined />}
                onClick={() => setBatchCategoryVisible(true)}
              >
                批量设置分类
              </Button>
              <Button 
                icon={<RobotOutlined />}
                onClick={() => setAutoClassifyVisible(true)}
              >
                AI 自动分类
              </Button>
              <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
            </div>
          )}
        </div>
      </Card>

      {/* 文档列表 */}
      <Card bordered={false} className="shadow-sm">
        <Table
          dataSource={documents}
          columns={columns}
          rowKey="_id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: page,
            total: total,
            pageSize: limit,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        title="文档详情"
        placement="right"
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={
          <Space>
            <Button onClick={() => {
              setDetailVisible(false);
              if (selectedDoc) handleEdit(selectedDoc);
            }}>
              编辑
            </Button>
            <Button 
              type="primary"
              onClick={() => {
                if (selectedDoc) navigate(`/documents/${selectedDoc._id}/chunks`);
              }}
            >
              管理分块
            </Button>
          </Space>
        }
      >
        {selectedDoc && (
          <div className="space-y-6">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="文件名" span={2}>{selectedDoc.name}</Descriptions.Item>
              <Descriptions.Item label="原始文件名" span={2}>{selectedDoc.originalName}</Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag color={getCategoryColor(selectedDoc.category || '未分类')}>
                  {selectedDoc.category || '未分类'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="文件类型">{selectedDoc.fileType.toUpperCase()}</Descriptions.Item>
              <Descriptions.Item label="文件大小">{formatFileSize(selectedDoc.fileSize)}</Descriptions.Item>
              <Descriptions.Item label="分块数量">{selectedDoc.chunkCount}</Descriptions.Item>
              <Descriptions.Item label="状态">{getStatusTag(selectedDoc.status)}</Descriptions.Item>
              <Descriptions.Item label="上传者">{selectedDoc.userId?.username || '未知'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedDoc.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            <Card title="文档内容预览" size="small">
              <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded">
                <Paragraph>
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {selectedDoc.content.substring(0, 3000)}
                    {selectedDoc.content.length > 3000 && '...'}
                  </pre>
                </Paragraph>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑文档"
        open={editVisible}
        onOk={handleSave}
        onCancel={() => setEditVisible(false)}
        confirmLoading={saving}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="文档名称"
            rules={[{ required: true, message: '请输入文档名称' }]}
          >
            <Input placeholder="请输入文档名称" />
          </Form.Item>
          <Form.Item
            name="category"
            label="文档分类"
          >
            <Select placeholder="选择分类" allowClear>
              {categories.map((cat) => (
                <Select.Option key={cat} value={cat}>{cat}</Select.Option>
              ))}
              <Select.Option value="未分类">未分类</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="文档内容"
            rules={[{ required: true, message: '请输入文档内容' }]}
          >
            <TextArea rows={12} placeholder="请输入文档内容" className="font-mono" />
          </Form.Item>
          <Text type="secondary">
            * 修改内容后，系统将自动重新生成向量嵌入
          </Text>
        </Form>
      </Modal>

      {/* 批量设置分类弹窗 */}
      <Modal
        title="批量设置分类"
        open={batchCategoryVisible}
        onOk={handleBatchCategory}
        onCancel={() => setBatchCategoryVisible(false)}
        confirmLoading={saving}
        okText="确定"
        cancelText="取消"
      >
        <div className="py-4">
          <Text className="block mb-2">已选择 {selectedRowKeys.length} 个文档，设置为：</Text>
          <Select
            placeholder="选择分类"
            value={batchCategory || undefined}
            onChange={setBatchCategory}
            style={{ width: '100%' }}
            allowClear
          >
            {categories.map((cat) => (
              <Select.Option key={cat} value={cat}>{cat}</Select.Option>
            ))}
          </Select>
          <Input
            placeholder="或输入新分类名称"
            value={batchCategory}
            onChange={(e) => setBatchCategory(e.target.value)}
            className="mt-2"
          />
        </div>
      </Modal>

      {/* AI 自动分类弹窗 */}
      <Modal
        title="AI 自动分类"
        open={autoClassifyVisible}
        onOk={handleAutoClassify}
        onCancel={() => setAutoClassifyVisible(false)}
        confirmLoading={classifying}
        okText="开始分类"
        cancelText="取消"
      >
        <div className="py-4 space-y-4">
          <Text className="block">已选择 {selectedRowKeys.length} 个文档</Text>
          
          {categoryPrompts.length === 0 ? (
            <div className="text-center py-4">
              <Text type="secondary">暂无分类 Prompt，请先创建</Text>
              <Button 
                type="link" 
                onClick={() => {
                  setAutoClassifyVisible(false);
                  setPromptManageVisible(true);
                }}
              >
                去创建
              </Button>
            </div>
          ) : (
            <Select
              placeholder="选择分类 Prompt"
              value={selectedPromptId || undefined}
              onChange={setSelectedPromptId}
              style={{ width: '100%' }}
            >
              {categoryPrompts.map((prompt) => (
                <Select.Option key={prompt._id} value={prompt._id}>
                  {prompt.name} {prompt.isDefault && <Tag color="blue">默认</Tag>}
                </Select.Option>
              ))}
            </Select>
          )}
          
          {selectedPromptId && (
            <div className="bg-gray-50 p-3 rounded">
              <Text type="secondary" className="block mb-2">可用分类：</Text>
              <div className="flex flex-wrap gap-1">
                {categoryPrompts.find(p => p._id === selectedPromptId)?.categories.map((cat) => (
                  <Tag key={cat} color={getCategoryColor(cat)}>{cat}</Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 分类 Prompt 管理抽屉 */}
      <Drawer
        title="分类 Prompt 管理"
        placement="right"
        width={700}
        open={promptManageVisible}
        onClose={() => {
          setPromptManageVisible(false);
          setEditingPrompt(null);
          promptForm.resetFields();
        }}
      >
        <div className="space-y-6">
          {/* 创建/编辑表单 */}
          <Card title={editingPrompt ? '编辑 Prompt' : '创建新 Prompt'} size="small">
            <Form form={promptForm} layout="vertical">
              <Form.Item
                name="name"
                label="Prompt 名称"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input placeholder="例如：技术文档分类" />
              </Form.Item>
              <Form.Item
                name="prompt"
                label="分类提示词"
                rules={[{ required: true, message: '请输入提示词' }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="请描述如何对文档进行分类，例如：你是一个文档分类专家，请根据文档内容判断其所属类别。"
                />
              </Form.Item>
              <Form.Item
                name="categories"
                label="可用分类（每行一个或用逗号分隔）"
                rules={[{ required: true, message: '请输入分类选项' }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="技术文档&#10;产品文档&#10;用户手册&#10;API文档"
                />
              </Form.Item>
              <Form.Item
                name="isDefault"
                valuePropName="checked"
              >
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...promptForm.register?.('isDefault')} />
                  <span>设为默认 Prompt</span>
                </label>
              </Form.Item>
              <div className="flex gap-2">
                <Button type="primary" onClick={handleSavePrompt} loading={saving}>
                  {editingPrompt ? '更新' : '创建'}
                </Button>
                {editingPrompt && (
                  <Button onClick={() => {
                    setEditingPrompt(null);
                    promptForm.resetFields();
                  }}>
                    取消编辑
                  </Button>
                )}
              </div>
            </Form>
          </Card>

          <Divider />

          {/* Prompt 列表 */}
          <Card title="已有 Prompt" size="small">
            {categoryPrompts.length === 0 ? (
              <Text type="secondary">暂无分类 Prompt</Text>
            ) : (
              <div className="space-y-4">
                {categoryPrompts.map((prompt) => (
                  <div key={prompt._id} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Text strong>{prompt.name}</Text>
                        {prompt.isDefault && <Tag color="blue">默认</Tag>}
                      </div>
                      <Space>
                        <Button 
                          size="small" 
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingPrompt(prompt);
                            promptForm.setFieldsValue({
                              name: prompt.name,
                              prompt: prompt.prompt,
                              categories: prompt.categories.join('\n'),
                              isDefault: prompt.isDefault,
                            });
                          }}
                        >
                          编辑
                        </Button>
                        <Popconfirm
                          title="确定删除此 Prompt？"
                          onConfirm={() => handleDeletePrompt(prompt._id)}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            删除
                          </Button>
                        </Popconfirm>
                      </Space>
                    </div>
                    <Text type="secondary" className="block mb-2 text-sm">
                      {prompt.prompt.substring(0, 100)}...
                    </Text>
                    <div className="flex flex-wrap gap-1">
                      {prompt.categories.map((cat) => (
                        <Tag key={cat} color={getCategoryColor(cat)}>{cat}</Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Drawer>
    </div>
  );
};

export default Documents;
