import { useState, useEffect, useRef } from 'react';
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
  Spin,
  Upload,
  Typography,
  Tooltip,
  Popconfirm,
  Drawer,
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
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { knowledgeApi } from '../services/api';

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
  createdAt: string;
  updatedAt: string;
  userId: {
    _id: string;
    username: string;
  };
}

const Documents = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const limit = 10;

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await knowledgeApi.getAll({ page, limit, search });
      setDocuments(response.data.documents);
      setTotal(response.data.total);
    } catch (error) {
      console.error('获取文档列表失败:', error);
      messageApi.error('获取文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, search]);

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
    });
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    
    try {
      const values = await form.validateFields();
      setSaving(true);
      await knowledgeApi.update(selectedDoc._id, values);
      messageApi.success('保存成功！文档内容已更新，向量数据将重新生成。');
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
        <div className="flex items-center justify-between">
          <Input
            placeholder="搜索文档..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Upload {...uploadProps}>
            <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
              上传文档
            </Button>
          </Upload>
        </div>
      </Card>

      {/* 文档列表 */}
      <Card bordered={false} className="shadow-sm">
        <Table
          dataSource={documents}
          columns={columns}
          rowKey="_id"
          loading={loading}
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
            name="content"
            label="文档内容"
            rules={[{ required: true, message: '请输入文档内容' }]}
          >
            <TextArea rows={16} placeholder="请输入文档内容" className="font-mono" />
          </Form.Item>
          <Text type="secondary">
            * 修改内容后，系统将自动重新生成向量嵌入
          </Text>
        </Form>
      </Modal>
    </div>
  );
};

export default Documents;
