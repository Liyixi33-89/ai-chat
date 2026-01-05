import React, { useEffect, useRef } from 'react';
import { Avatar, Typography } from 'antd';
import { UserOutlined, RobotOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message } from '../../services/api';
import 'highlight.js/styles/github.css';
import './MessageList.css';

const { Paragraph } = Typography;

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

// 代码块组件，带复制功能
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
        <button 
          className="copy-button" 
          onClick={handleCopy}
          aria-label="复制代码"
          tabIndex={0}
        >
          {copied ? <CheckOutlined /> : <CopyOutlined />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className={className}>
        <code>{children}</code>
      </pre>
    </div>
  );
};

// Markdown 渲染组件
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // 自定义代码块渲染
        code({ node, className, children, ...props }) {
          const isInline = !className;
          const codeString = String(children).replace(/\n$/, '');
          
          if (isInline) {
            return <code className="inline-code" {...props}>{children}</code>;
          }
          
          return <CodeBlock className={className}>{codeString}</CodeBlock>;
        },
        // 自定义链接，新窗口打开
        a({ node, children, href, ...props }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          );
        },
        // 自定义表格样式
        table({ node, children, ...props }) {
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
};

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 空状态
  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <RobotOutlined className="empty-icon" />
        <h2>AI 智能助手</h2>
        <p>基于本地大模型，保护您的隐私</p>
        <div className="suggestions">
          <span className="suggestion-item">💡 你可以问我任何问题</span>
          <span className="suggestion-item">📝 帮你写作、翻译、总结</span>
          <span className="suggestion-item">💻 解答编程问题</span>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`message-item ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
        >
          <Avatar
            className="message-avatar"
            icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
            style={{
              backgroundColor: message.role === 'user' ? '#1890ff' : '#52c41a',
            }}
          />
          <div className="message-content">
            {message.role === 'user' ? (
              // 用户消息：纯文本
              <Paragraph
                className="message-text"
                style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
              >
                {message.content}
              </Paragraph>
            ) : (
              // AI消息：Markdown渲染
              <div className="markdown-content">
                <MarkdownContent content={message.content} />
                {isLoading && index === messages.length - 1 && (
                  <span className="cursor-blink">|</span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
