import React, { useState, useEffect, useRef } from 'react';
import { Layout, Select, Typography, Alert, Badge, Tag, Tooltip, Avatar } from 'antd';
import { Bubble, Sender, Welcome, Prompts } from '@ant-design/x';
import { 
  RobotOutlined, 
  ThunderboltOutlined, 
  DatabaseOutlined,
  UserOutlined,
  BulbOutlined,
  EditOutlined,
  CodeOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useChat } from '../../hooks/useChat';
import { getModels, healthCheck } from '../../services/api';
import type { ModelInfo, Message } from '../../services/api';
import 'highlight.js/styles/github.css';
import './ChatContainer.css';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

// 代码块组件
const CodeBlock: React.FC<{ children: string; className?: string }> = ({ children, className }) => {
  const [copied, setCopied] = React.useState(false);
  const language = className?.replace('language-', '') || 'text';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-language">{language}</span>
        <button className="copy-button" onClick={handleCopy} aria-label="复制代码" tabIndex={0}>
          {copied ? '✓ 已复制' : '复制'}
        </button>
      </div>
      <pre className={className}>
        <code>{children}</code>
      </pre>
    </div>
  );
};

// Markdown 渲染组件
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeHighlight]}
    components={{
      code({ className, children, ...props }) {
        const isInline = !className;
        const codeString = String(children).replace(/\n$/, '');
        if (isInline) {
          return <code className="inline-code" {...props}>{children}</code>;
        }
        return <CodeBlock className={className}>{codeString}</CodeBlock>;
      },
      a({ children, href, ...props }) {
        return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
      },
      table({ children, ...props }) {
        return <div className="table-wrapper"><table {...props}>{children}</table></div>;
      },
    }}
  >
    {content}
  </ReactMarkdown>
);

// 快捷提示配置
const PROMPTS_ITEMS = [
  {
    key: '1',
    icon: <BulbOutlined style={{ color: '#FFD700' }} />,
    label: '你可以问我任何问题',
  },
  {
    key: '2',
    icon: <EditOutlined style={{ color: '#1890ff' }} />,
    label: '帮你写作、翻译、总结',
  },
  {
    key: '3',
    icon: <CodeOutlined style={{ color: '#52c41a' }} />,
    label: '解答编程问题',
  },
];

const ChatContainer: React.FC = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    currentModel,
    sendMessage,
    clearMessages,
    setCurrentModel,
  } = useChat();

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 检查服务器状态和获取模型列表
  useEffect(() => {
    const checkServer = async () => {
      const isOnline = await healthCheck();
      setIsServerOnline(isOnline);

      if (isOnline) {
        const response = await getModels();
        if (response.models.length > 0) {
          setModels(response.models);
          const modelNames = response.models.map(m => m.name);
          if (!modelNames.includes(currentModel)) {
            setCurrentModel(response.defaultModel || modelNames[0]);
          }
        }
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, [currentModel, setCurrentModel]);

  const handleModelChange = (value: string) => {
    setCurrentModel(value);
  };

  const handleSend = (content: string) => {
    if (!content.trim() || isLoading || !isServerOnline) return;
    sendMessage(content.trim());
    setInputValue('');
  };

  const handlePromptClick = (info: { data: { label?: string } }) => {
    if (info.data.label) {
      setInputValue(`请${info.data.label}`);
    }
  };

  // 获取当前模型信息
  const currentModelInfo = models.find(m => m.name === currentModel);

  // 根据模型大小返回颜色标签
  const getSizeTagColor = (sizeBytes: number): string => {
    if (sizeBytes < 1024 * 1024 * 1024) return 'green';
    if (sizeBytes < 3 * 1024 * 1024 * 1024) return 'blue';
    if (sizeBytes < 5 * 1024 * 1024 * 1024) return 'orange';
    return 'red';
  };

  // 模型选择下拉框的选项渲染
  const modelOptions = models.map(model => ({
    value: model.name,
    label: (
      <div className="model-option">
        <span className="model-option-name">{model.name}</span>
        <Tag color={getSizeTagColor(model.sizeBytes)} className="model-option-size">
          {model.size}
        </Tag>
      </div>
    ),
  }));

  // Bubble.List 的 roles 配置
  const roles = {
    user: {
      placement: 'end' as const,
      avatar: <Avatar icon={<UserOutlined />} style={{ background: '#1890ff' }} />,
    },
    assistant: {
      placement: 'start' as const,
      avatar: <Avatar icon={<RobotOutlined />} style={{ background: '#52c41a' }} />,
      messageRender: (content: React.ReactNode) => (
        <div className="markdown-content">{content}</div>
      ),
    },
  };

  // 将消息转换为 Bubble.List 格式
  const bubbleItems = messages.map((msg: Message, index: number) => ({
    key: index.toString(),
    role: msg.role,
    loading: isLoading && msg.role === 'assistant' && index === messages.length - 1 && msg.content === '',
    content: msg.role === 'user' ? msg.content : <MarkdownContent content={msg.content} />,
  }));

  return (
    <Layout className="chat-container">
        <Header className="chat-header">
          <div className="header-left">
            <RobotOutlined className="logo-icon" />
            <Title level={4} className="header-title">AI 智能助手</Title>
          </div>
          
          <div className="header-center">
            <div className="model-selector-wrapper">
              <DatabaseOutlined className="model-selector-icon" />
              <Select
                value={currentModel}
                onChange={handleModelChange}
                className="model-selector"
                disabled={!isServerOnline || models.length === 0}
                placeholder="选择模型"
                options={modelOptions}
                popupMatchSelectWidth={false}
                styles={{ popup: { root: { minWidth: 200 } } }}
              />
              {currentModelInfo && (
                <Tooltip title={`参数量: ${currentModelInfo.parameterSize}`}>
                  <Tag color={getSizeTagColor(currentModelInfo.sizeBytes)} className="current-model-size">
                    <ThunderboltOutlined /> {currentModelInfo.size}
                  </Tag>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="header-right">
            <Badge
              status={isServerOnline === null ? 'processing' : isServerOnline ? 'success' : 'error'}
              text={
                <Text className="server-status-text">
                  {isServerOnline === null ? '检测中' : isServerOnline ? '在线' : '离线'}
                </Text>
              }
              className="server-status"
            />
          </div>
        </Header>

        {!isServerOnline && isServerOnline !== null && (
          <Alert
            message="服务未连接"
            description="请确保 Ollama 服务已启动，后端服务正在运行 (http://localhost:8000)"
            type="error"
            showIcon
            className="server-alert"
          />
        )}

        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            showIcon
            closable
            className="error-alert"
          />
        )}

        <Content className="chat-content">
          {messages.length === 0 ? (
            <div className="welcome-container">
              <Welcome
                icon={<RobotOutlined style={{ fontSize: '4rem', color: '#1890ff' }} />}
                title="AI 智能助手"
                description="基于本地大模型，保护您的隐私"
                className="welcome-component"
              />
              <Prompts
                items={PROMPTS_ITEMS}
                onItemClick={handlePromptClick}
                className="prompts-component"
                wrap
              />
            </div>
          ) : (
            <div className="messages-container">
              <Bubble.List
                items={bubbleItems}
                roles={roles}
                className="bubble-list"
              />
              <div ref={messagesEndRef} />
            </div>
          )}
        </Content>

        <Footer className="chat-footer">
          <div className="sender-wrapper">
            <Sender
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSend}
              loading={isLoading}
              disabled={!isServerOnline}
              placeholder="输入消息，按 Enter 发送..."
              className="chat-sender"
              actions={(_, info) => {
                const { SendButton, LoadingButton } = info.components;
                return (
                  <div className="sender-actions">
                    <Tooltip title="清空对话">
                      <button
                        className="clear-btn"
                        onClick={clearMessages}
                        aria-label="清空对话"
                        tabIndex={0}
                      >
                        <DeleteOutlined />
                      </button>
                    </Tooltip>
                    {isLoading ? <LoadingButton /> : <SendButton />}
                  </div>
                );
              }}
            />
            <div className="chat-input-hint">
              基于本地 Ollama 大模型 · 当前模型: {currentModel} · 数据完全私密
            </div>
          </div>
        </Footer>
    </Layout>
  );
};

export default ChatContainer;
