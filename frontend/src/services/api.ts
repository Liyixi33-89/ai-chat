import axios from 'axios';
import type { AxiosInstance } from 'axios';

// API 基础配置
const API_BASE_URL = 'http://localhost:8000';

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2分钟超时，因为大模型响应可能较慢
  headers: {
    'Content-Type': 'application/json',
  },
});

// 消息类型
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// 聊天请求类型
export interface ChatRequest {
  messages: Message[];
  model?: string;
  stream?: boolean;
}

// 聊天响应类型
export interface ChatResponse {
  content: string;
  model: string;
}

// 模型详细信息
export interface ModelInfo {
  name: string;
  size: string;
  sizeBytes: number;
  modifiedAt: string;
  family: string;
  parameterSize: string;
}

// 模型列表响应
export interface ModelsResponse {
  models: ModelInfo[];
  defaultModel?: string;
  error?: string;
}

/**
 * 获取可用模型列表
 */
export const getModels = async (): Promise<ModelsResponse> => {
  try {
    const response = await apiClient.get<ModelsResponse>('/api/models');
    return response.data;
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return { models: [], error: '获取模型列表失败' };
  }
};

/**
 * 发送聊天消息（非流式）
 */
export const sendMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const response = await apiClient.post<ChatResponse>('/api/chat', request);
  return response.data;
};

/**
 * 发送聊天消息（流式）
 */
export const sendMessageStream = async (
  request: ChatRequest,
  onMessage: (content: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              onMessage(data.content);
            }
            if (data.done) {
              onDone();
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    onError(errorMessage);
  }
};

/**
 * 健康检查
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health');
    return response.data.status === 'ok';
  } catch {
    return false;
  }
};

export default apiClient;
