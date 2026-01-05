import { useState, useCallback, useRef } from 'react';
import { sendMessageStream } from '../services/api';
import type { Message, ChatRequest } from '../services/api';

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  currentModel: string;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setCurrentModel: (model: string) => void;
  stopGeneration: () => void;
}

export const useChat = (defaultModel: string = 'deepseek-r1:1.5b'): UseChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState(defaultModel);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    // 创建助手消息占位
    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMessage]);

    const request: ChatRequest = {
      messages: newMessages,
      model: currentModel,
      stream: true,
    };

    try {
      await sendMessageStream(
        request,
        // onMessage: 接收到内容片段
        (chunk: string) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex]?.role === 'assistant') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: updated[lastIndex].content + chunk,
              };
            }
            return updated;
          });
        },
        // onDone: 完成
        () => {
          setIsLoading(false);
        },
        // onError: 错误
        (errorMsg: string) => {
          setError(errorMsg);
          setIsLoading(false);
          // 移除空的助手消息
          setMessages(prev => {
            const updated = [...prev];
            if (updated[updated.length - 1]?.content === '') {
              updated.pop();
            }
            return updated;
          });
        }
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '发送消息失败';
      setError(errorMsg);
      setIsLoading(false);
    }
  }, [messages, isLoading, currentModel]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    currentModel,
    sendMessage,
    clearMessages,
    setCurrentModel,
    stopGeneration,
  };
};
