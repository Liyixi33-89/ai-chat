import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout, Select, Typography, Alert, Badge, Tag, Tooltip, Avatar, message, Spin } from 'antd';
import { Sender, Welcome, Prompts } from '@ant-design/x';
import { 
  RobotOutlined, 
  ThunderboltOutlined, 
  DatabaseOutlined,
  UserOutlined,
  BulbOutlined,
  EditOutlined,
  CodeOutlined,
  DeleteOutlined,
  MenuOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import Sidebar from '../Sidebar';
import { 
  getModels, 
  healthCheck, 
  getSessions, 
  createSession, 
  getSessionDetail, 
  deleteSession,
  sendMessageStream,
  type ModelInfo, 
  type Message, 
  type Session,
  type User
} from '../../services/api';
import 'highlight.js/styles/github-dark.css';
import './ChatContainer.css';

const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;

// 代码块组件
const CodeBlock: React.FC<{ children: string; className?: string }> = ({ children, className }) => {
  const [copied, setCopied] = useState(false);
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
        <button 
          className="copy-button" 
          onClick={handleCopy} 
          aria-label="复制代码" 
          tabIndex={0}
        >
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
        return (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            {...props}
          >
            {children}
          </a>
        );
      },
      table({ children, ...props }) {
        return (
          <div className="table-wrapper">
            <table {...props}>{children}</table>
          </div>
        );
      },
    }}
  >
    {content}
  </ReactMarkdown>
);

// 单条消息组件
interface MessageItemProps {
  message: Message;
  isLoading?: boolean;
  user?: User | null;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isLoading = false, user }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`message-item ${isUser ? 'message-user' : 'message-assistant'}`}>
      {/* AI 头像 - 左侧 */}
      {!isUser && (
        <div className="message-avatar message-avatar-left">
          <Avatar 
            size={40} 
            icon={<RobotOutlined />} 
            className="avatar-ai"
          />
        </div>
      )}
      
      {/* 消息内容 */}
      <div className={`message-content-wrapper ${isUser ? 'content-user' : 'content-assistant'}`}>
        <div className="message-header">
          <span className="message-role">
            {isUser ? (user?.username || '你') : 'AI 助手'}
          </span>
        </div>
        <div className={`message-bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
          {isLoading && !message.content ? (
            <div className="message-loading">
              <Spin indicator={<LoadingOutlined spin />} size="small" />
              <span>思考中...</span>
            </div>
          ) : isUser ? (
            <div className="message-text">{message.content}</div>
          ) : (
            <div className="message-markdown">
              <MarkdownContent content={message.content} />
            </div>
          )}
        </div>
      </div>
      
      {/* 用户头像 - 右侧 */}
      {isUser && (
        <div className="message-avatar message-avatar-right">
          <Avatar 
            size={40} 
            icon={<UserOutlined />} 
            className="avatar-user"
          />
        </div>
      )}
    </div>
  );
};

// 消息列表组件
interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  user?: User | null;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, user }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <MessageItem
          key={msg._id || index}
          message={msg}
          isLoading={isLoading && msg.role === 'assistant' && index === messages.length - 1}
          user={user}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

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

interface ChatContainerProps {
  onLogout: () => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ onLogout }) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [currentModel, setCurrentModel] = useState('deepseek-r1:1.5b');
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // 会话相关状态
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 用户信息
  const [user] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    try {
      const response = await getSessions();
      setSessions(response.sessions);
    } catch (err) {
      console.error('加载会话列表失败:', err);
    }
  }, []);

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
        
        await loadSessions();
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, [currentModel, loadSessions]);

  // 选择会话
  const handleSelectSession = async (sessionId: string) => {
    try {
      const response = await getSessionDetail(sessionId);
      setCurrentSessionId(sessionId);
      setMessages(response.messages);
      if (response.session.model) {
        setCurrentModel(response.session.model);
      }
    } catch (err) {
      console.error('加载会话详情失败:', err);
      message.error('加载会话失败');
    }
  };

  // 创建新会话
  const handleCreateSession = async () => {
    try {
      const response = await createSession('新对话', currentModel);
      setSessions(prev => [response.session, ...prev]);
      setCurrentSessionId(response.session._id);
      setMessages([]);
    } catch (err) {
      console.error('创建会话失败:', err);
      message.error('创建会话失败');
    }
  };

  // 删除会话
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      
      if (sessionId === currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      
      message.success('会话已删除');
    } catch (err) {
      console.error('删除会话失败:', err);
      message.error('删除会话失败');
    }
  };

  // 发送消息
  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading || !isServerOnline) return;

    let sessionId = currentSessionId;

    if (!sessionId) {
      try {
        const response = await createSession('新对话', currentModel);
        sessionId = response.session._id;
        setCurrentSessionId(sessionId);
        setSessions(prev => [response.session, ...prev]);
      } catch (err) {
        message.error('创建会话失败');
        return;
      }
    }

    const userMessage: Message = { role: 'user', content: content.trim() };
    const assistantMessage: Message = { role: 'assistant', content: '' };
    
    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const allMessages = [...messages, userMessage];
      
      await sendMessageStream(
        { 
          messages: allMessages, 
          model: currentModel,
          sessionId: sessionId
        },
        (chunk) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content += chunk;
            }
            return updated;
          });
        },
        () => {
          setIsLoading(false);
          loadSessions();
        },
        (errMsg) => {
          setError(errMsg);
          setIsLoading(false);
          setMessages(prev => prev.filter(m => m.content !== ''));
        }
      );
    } catch (err) {
      setError('发送消息失败');
      setIsLoading(false);
    }
  };

  // 清空当前会话消息
  const handleClearMessages = () => {
    setMessages([]);
  };

  const handleModelChange = (value: string) => {
    setCurrentModel(value);
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

  return (
    <Layout className="chat-layout">
      <Sider
        width={280}
        collapsedWidth={0}
        collapsed={sidebarCollapsed}
        className="chat-sider"
        trigger={null}
      >
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          user={user}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          onLogout={onLogout}
        />
      </Sider>

      <Layout className="chat-main">
        <Header className="chat-header">
          <div className="header-left">
            <button
              className="menu-toggle-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label="切换侧边栏"
              tabIndex={0}
            >
              <MenuOutlined />
            </button>
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
            onClose={() => setError(null)}
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
              <MessageList 
                messages={messages} 
                isLoading={isLoading} 
                user={user}
              />
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
                        onClick={handleClearMessages}
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
    </Layout>
  );
};

export default ChatContainer;
