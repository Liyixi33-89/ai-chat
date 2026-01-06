import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Tag,
  message,
  Typography,
  Tooltip,
  Popconfirm,
  Breadcrumb,
  Spin,
  Empty,
  Drawer,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HomeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { chunkApi, knowledgeApi } from '../services/api';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface Chunk {
  _id: string;
  content: string;
  chunkIndex: number;
  createdAt: string;
}

interface Document {
  _id: string;
  name: string;
  originalName: string;
}

const Chunks = () => {
  const { knowledgeId } = useParams<{ knowledgeId: string }>();
  const navigate = useNavigate();
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChunk, setSelectedChunk] = useState<Chunk | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchData = async () => {
    if (!knowledgeId) return;

    setLoading(true);
    try {
      const [chunksRes, docRes] = await Promise.all([
        chunkApi.getByKnowledgeId(knowledgeId),
        knowledgeApi.getById(knowledgeId),
      ]);
      setChunks(chunksRes.data.chunks);
      setDocument(docRes.data.document);
    } catch (error) {
      console.error('获取数据失败:', error);
      messageApi.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [knowledgeId]);

  const handleViewDetail = (chunk: Chunk) => {
    setSelectedChunk(chunk);
    setDetailVisible(true);
  };

  const handleEdit = (chunk: Chunk) => {
    setSelectedChunk(chunk);
    form.setFieldsValue({ content: chunk.content });
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!selectedChunk) return;

    try {
      const values = await form.validateFields();
      setSaving(true);
      await chunkApi.update(selectedChunk._id, values.content);
      messageApi.success('保存成功！向量已重新生成。');
      setEditVisible(false);
      fetchData();
    } catch (error) {
      console.error('保存失败:', error);
      messageApi.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await chunkApi.delete(id);
      messageApi.success('删除成功');
      fetchData();
    } catch (error) {
      console.error('删除失败:', error);
      messageApi.error('删除失败，请重试');
    }
  };

  const handleAdd = async () => {
    if (!knowledgeId) return;

    try {
      const values = await addForm.validateFields();
      setSaving(true);
      await chunkApi.create(knowledgeId, values.content);
      messageApi.success('添加成功！');
      setAddVisible(false);
      addForm.resetFields();
      fetchData();
    } catch (error) {
      console.error('添加失败:', error);
      messageApi.error('添加失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'chunkIndex',
      key: 'chunkIndex',
      width: 80,
      render: (index: number) => <Tag color="blue">#{index}</Tag>,
    },
    {
      title: '内容预览',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text.substring(0, 200) + (text.length > 200 ? '...' : '')}>
          <Text ellipsis className="max-w-[400px]">{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: '字符数',
      dataIndex: 'content',
      key: 'length',
      width: 100,
      render: (content: string) => <Tag>{content.length}</Tag>,
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
      width: 150,
      render: (_: unknown, record: Chunk) => (
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
          <Popconfirm
            title="确定要删除这个分块吗？"
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

      {/* 面包屑导航 */}
      <Breadcrumb
        items={[
          {
            title: (
              <span className="cursor-pointer" onClick={() => navigate('/')}>
                <HomeOutlined /> 首页
              </span>
            ),
          },
          {
            title: (
              <span className="cursor-pointer" onClick={() => navigate('/documents')}>
                <FileTextOutlined /> 文档管理
              </span>
            ),
          },
          {
            title: document?.name || '向量分块',
          },
        ]}
      />

      {/* 工具栏 */}
      <Card bordered={false} className="shadow-sm">
        <div className="flex items-center justify-between">
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/documents')}
            >
              返回
            </Button>
            {document && (
              <div className="ml-4">
                <Text strong className="text-lg">{document.name}</Text>
                <Text type="secondary" className="ml-2">共 {chunks.length} 个分块</Text>
              </div>
            )}
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddVisible(true)}
          >
            添加分块
          </Button>
        </div>
      </Card>

      {/* 分块列表 */}
      <Card bordered={false} className="shadow-sm">
        <Table
          dataSource={chunks}
          columns={columns}
          rowKey="_id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: <Empty description="暂无分块数据" />,
          }}
        />
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        title={`分块详情 #${selectedChunk?.chunkIndex}`}
        placement="right"
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={
          <Button onClick={() => {
            setDetailVisible(false);
            if (selectedChunk) handleEdit(selectedChunk);
          }}>
            编辑
          </Button>
        }
      >
        {selectedChunk && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card size="small" title="分块索引">
                <Tag color="blue" className="text-lg">#{selectedChunk.chunkIndex}</Tag>
              </Card>
              <Card size="small" title="字符数">
                <Tag className="text-lg">{selectedChunk.content.length}</Tag>
              </Card>
            </div>
            <Card size="small" title="创建时间">
              {new Date(selectedChunk.createdAt).toLocaleString('zh-CN')}
            </Card>
            <Card size="small" title="分块内容">
              <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded">
                <Paragraph>
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {selectedChunk.content}
                  </pre>
                </Paragraph>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 编辑弹窗 */}
      <Modal
        title={`编辑分块 #${selectedChunk?.chunkIndex}`}
        open={editVisible}
        onOk={handleSave}
        onCancel={() => setEditVisible(false)}
        confirmLoading={saving}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="content"
            label="分块内容"
            rules={[{ required: true, message: '请输入分块内容' }]}
          >
            <TextArea rows={14} placeholder="请输入分块内容" className="font-mono" />
          </Form.Item>
          <Text type="secondary">
            * 修改内容后，系统将自动重新生成向量嵌入
          </Text>
        </Form>
      </Modal>

      {/* 添加弹窗 */}
      <Modal
        title="添加新分块"
        open={addVisible}
        onOk={handleAdd}
        onCancel={() => {
          setAddVisible(false);
          addForm.resetFields();
        }}
        confirmLoading={saving}
        width={700}
        okText="添加"
        cancelText="取消"
      >
        <Form form={addForm} layout="vertical">
          <Form.Item
            name="content"
            label="分块内容"
            rules={[{ required: true, message: '请输入分块内容' }]}
          >
            <TextArea rows={10} placeholder="请输入分块内容..." className="font-mono" />
          </Form.Item>
          <Text type="secondary">
            * 添加后，系统将自动生成向量嵌入
          </Text>
        </Form>
      </Modal>
    </div>
  );
};

export default Chunks;
