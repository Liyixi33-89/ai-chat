/**
 * 知识库查询组件
 * 支持文档查看、选择、搜索（上传/编辑/删除功能已移至后台管理系统）
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Button,
  List,
  Tag,
  Empty,
  Input,
  Space,
} from 'antd';
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileMarkdownOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  getKnowledgeList,
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
  xlsx: <FileExcelOutlined style={{ color: '#52c41a' }} />,
  xls: <FileExcelOutlined style={{ color: '#52c41a' }} />,
  csv: <FileExcelOutlined style={{ color: '#13c2c2' }} />,
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
    } finally {
      setSearching(false);
    }
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    const readyIds = knowledgeList.filter((k) => k.status === 'ready').map((k) => k.id);
    if (selectedIds.length === readyIds.length) {
      onSelectChange([]);
    } else {
      onSelectChange(readyIds);
    }
  };

  const readyCount = knowledgeList.filter((k) => k.status === 'ready').length;
  const isAllSelected = readyCount > 0 && selectedIds.length === readyCount;

  return (
    <Drawer
      title="📚 知识库"
      placement="right"
      width={480}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button 
            onClick={handleSelectAll}
            disabled={readyCount === 0}
          >
            {isAllSelected ? '取消全选' : '全选'}
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadKnowledgeList}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
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

        {/* 已选提示 */}
        {selectedIds.length > 0 && (
          <div className="selected-hint">
            <Tag color="blue">已选择 {selectedIds.length} 个知识库用于对话</Tag>
          </div>
        )}

        {/* 知识库列表 */}
        <div className="knowledge-list-header">
          <span>文档列表 ({knowledgeList.length})</span>
        </div>

        <List
          className="knowledge-list"
          loading={loading}
          dataSource={knowledgeList}
          locale={{ emptyText: <Empty description="暂无知识库文档" /> }}
          renderItem={(item) => {
            const status = statusConfig[item.status];
            const isSelected = selectedIds.includes(item.id);
            const isReady = item.status === 'ready';

            return (
              <List.Item
                className={`knowledge-item ${isSelected ? 'selected' : ''} ${isReady ? 'clickable' : 'disabled'}`}
                onClick={() => isReady && handleToggleSelect(item.id)}
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
                </div>
              </List.Item>
            );
          }}
        />

        {/* 提示信息 */}
        <div className="knowledge-tips">
          <p>� 点击文档可选择用于对话的知识库</p>
          <p>� 文档管理请访问后台管理系统</p>
        </div>
      </div>
    </Drawer>
  );
};

export default KnowledgeManager;
