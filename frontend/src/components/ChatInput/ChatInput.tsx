import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Input, Button, Tooltip } from 'antd';
import { SendOutlined, ClearOutlined, LoadingOutlined } from '@ant-design/icons';
import './ChatInput.css';

const { TextArea } = Input;

interface ChatInputProps {
  onSend: (content: string) => void;
  onClear: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onClear,
  isLoading,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // 自动聚焦
  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading || disabled) return;
    onSend(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <TextArea
          ref={textAreaRef as React.RefObject<HTMLTextAreaElement & { resizableTextArea: { textArea: HTMLTextAreaElement } }>}
          className="chat-input"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
          autoSize={{ minRows: 1, maxRows: 6 }}
          disabled={disabled}
        />
        <div className="chat-input-actions">
          <Tooltip title="清空对话">
            <Button
              type="text"
              icon={<ClearOutlined />}
              onClick={onClear}
              className="action-btn clear-btn"
              aria-label="清空对话"
              tabIndex={0}
            />
          </Tooltip>
          <Button
            type="primary"
            icon={isLoading ? <LoadingOutlined spin /> : <SendOutlined />}
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || disabled}
            className="action-btn send-btn"
            aria-label="发送消息"
            tabIndex={0}
          >
            {isLoading ? '生成中' : '发送'}
          </Button>
        </div>
      </div>
      <div className="chat-input-hint">
        基于本地 Ollama 大模型 · 数据完全私密
      </div>
    </div>
  );
};

export default ChatInput;
