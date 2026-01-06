/**
 * 知识库管理组件
 * 支持文档上传、查看、删除
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Upload,
  Button,
  List,
  Tag,
  Popconfirm,
  message,
  Progress,
  Empty,
  Tooltip,
  Input,
  Space,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileMarkdownOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import {
  getKnowledgeList,
  uploadKnowledge,
  deleteKnowledge,
  reprocessKnowledge,
  searchKnowledge,
  type Knowledge,
  type KnowledgeSearchResult,
} from '../../services/api';
import './Knowledge.css';

interface KnowledgeManagerProps {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
}

// 文件图标映射
const fileIconMap: Record<string, React.ReactNode> = {
  pdf: <FilePdfOutlined style={{ color: '#f5222d' }} />,
  txt: <FileTextOutlined style={{ color: '#1890ff' }} />,
  md: <FileMarkdownOutlined style={{ color: '#722ed1' }} />,
};

// 状态标签配置
const statusConfig = {
  processing: { color: 'processing', icon: <LoadingOutlined />, text: '处理中' },
  ready: { color: 'success', icon: <CheckCircleOutlined />, text: '已就绪' },
  error: { color: 'error', icon: <CloseCircleOutlined />, text: '失败' },
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({
  open,
  onClose,
  selectedIds,
  onSelectChange,
}) => {
  const [knowledgeList, setKnowledgeList] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // 加载知识库列表
  const loadKnowledgeList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getKnowledgeList();
      setKnowledgeList(list);
    } catch (error) {
      console.error('加载知识库失败:', error);
      message.error('加载知识库失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开时加载列表
  useEffect(() => {
    if (open) {
      loadKnowledgeList();
    }
  }, [open, loadKnowledgeList]);

  // 定时刷新处理中的文档
  useEffect(() => {
    if (!open) return;

    const hasProcessing = knowledgeList.some((k) => k.status === 'processing');
    if (!hasProcessing) return;

    const timer = setInterval(() => {
      loadKnowledgeList();
    }, 3000);

    return () => clearInterval(timer);
  }, [open, knowledgeList, loadKnowledgeList]);

  // 上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.pdf,.txt,.md',
    showUploadList: false,
    beforeUpload: async (file) => {
      // 检查文件大小
      if (file.size > 10 * 1024 * 1024) {
        message.error('文件大小不能超过 10MB');
        return false;
      }

      setUploading(true);
      try {
        await uploadKnowledge(file);
        message.success('文档上传成功，正在处理中...');
        loadKnowledgeList();
      } catch (error) {
        console.error('上传失败:', error);
        message.error('上传失败');
      } finally {
        setUploading(false);
      }

      return false;
    },
  };

  // 删除知识库
  const handleDelete = async (id: string) => {
    try {
      await deleteKnowledge(id);
      message.success('删除成功');
      // 从选中列表中移除
      onSelectChange(selectedIds.filter((sid) => sid !== id));
      loadKnowledgeList();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 重新处理
  const handleReprocess = async (id: string) => {
    try {
      await reprocessKnowledge(id);
      message.success('重新处理中...');
      loadKnowledgeList();
    } catch (error) {
      console.error('重新处理失败:', error);
      message.error('重新处理失败');
    }
  };

  // 选择/取消选择
  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectChange([...selectedIds, id]);
    }
  };

  // 搜索知识库
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchKnowledge(searchQuery, selectedIds.length > 0 ? selectedIds : undefined, 5);
      setSearchResults(results);
    } catch (error) {
      console.error('搜索失败:', error);
      message.error('搜索失败');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Drawer
      title="📚 知识库管理"
      placement="right"
      width={480}
      open={open}
      onClose={onClose}
      extra={
        <Upload {...uploadProps}>
          <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
            上传文档
          </Button>
        </Upload>
      }
    >
      <div className="knowledge-manager">
        {/* 搜索区域 */}
        <div className="knowledge-search">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入内容搜索知识库..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" onClick={handleSearch} loading={searching}>
              搜索
            </Button>
          </Space.Compact>
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <div className="search-results-title">搜索结果 ({searchResults.length})</div>
            {searchResults.map((result, index) => (
              <div key={index} className="search-result-item">
                <div className="result-header">
                  <span className="result-source">{result.knowledgeName}</span>
                  <Tag color="blue">相似度: {result.score}</Tag>
                </div>
                <div className="result-content">{result.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* 知识库列表 */}
        <div className="knowledge-list-header">
          <span>文档列表 ({knowledgeList.length})</span>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={loadKnowledgeList}
            loading={loading}
            size="small"
          >
            刷新
          </Button>
        </div>

        <List
          className="knowledge-list"
          loading={loading}
          dataSource={knowledgeList}
          locale={{ emptyText: <Empty description="暂无文档，请上传" /> }}
          renderItem={(item) => {
            const status = statusConfig[item.status];
            const isSelected = selectedIds.includes(item.id);

            return (
              <List.Item
                className={`knowledge-item ${isSelected ? 'selected' : ''}`}
                onClick={() => item.status === 'ready' && handleToggleSelect(item.id)}
              >
                <div className="item-content">
                  <div className="item-icon">
                    {fileIconMap[item.fileType] || <FileTextOutlined />}
                  </div>
                  <div className="item-info">
                    <div className="item-name">
                      {item.name}
                      {isSelected && <Tag color="blue" style={{ marginLeft: 8 }}>已选</Tag>}
                    </div>
                    <div className="item-meta">
                      <span>{formatFileSize(item.fileSize)}</span>
                      <span>·</span>
                      <span>{item.chunkCount} 块</span>
                      <span>·</span>
                      <Tag icon={status.icon} color={status.color}>
                        {status.text}
                      </Tag>
                    </div>
                    {item.status === 'error' && item.errorMessage && (
                      <div className="item-error">{item.errorMessage}</div>
                    )}
                  </div>
                  <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                    {item.status === 'error' && (
                      <Tooltip title="重新处理">
                        <Button
                          type="text"
                          icon={<ReloadOutlined />}
                          onClick={() => handleReprocess(item.id)}
                        />
                      </Tooltip>
                    )}
                    <Popconfirm
                      title="确定删除此文档吗？"
                      description="删除后将无法恢复"
                      onConfirm={() => handleDelete(item.id)}
                      okText="删除"
                      cancelText="取消"
                    >
                      <Tooltip title="删除">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>
                {item.status === 'processing' && (
                  <Progress percent={50} status="active" showInfo={false} size="small" />
                )}
              </List.Item>
            );
          }}
        />

        {/* 提示信息 */}
        <div className="knowledge-tips">
          <p>💡 支持 PDF、TXT、MD 格式，单文件最大 10MB</p>
          <p>📌 点击文档可选择用于对话的知识库</p>
        </div>
      </div>
    </Drawer>
  );
};

export default KnowledgeManager;
