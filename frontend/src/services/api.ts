import axios from 'axios';
import type { AxiosInstance } from 'axios';

// API 基础配置
const API_BASE_URL = 'http://localhost:8000';

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理 401 错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============ 类型定义 ============

// 消息类型
export interface Message {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

// 会话类型
export interface Session {
  _id: string;
  userId: string;
  title: string;
  model: string;
  lastMessage?: string;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

// 用户类型
export interface User {
  _id: string;
  username: string;
  createdAt: string;
}

// 知识库类型
export interface Knowledge {
  id: string;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  chunkCount: number;
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
  contentPreview?: string;
  content?: string; // 完整内容（需要 fullContent=true 参数）
  category?: string; // 文档分类
  createdAt: string;
  updatedAt?: string;
}

// 分析模板变量类型
export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  required: boolean;
  defaultValue: string;
}

// 分析模板类型
export interface AnalysisTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: TemplateVariable[];
  exampleInput?: string;
  exampleOutput?: string;
  isSystem: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
}

// 知识库搜索结果
export interface KnowledgeSearchResult {
  content: string;
  score: string;
  knowledgeId: string;
  knowledgeName: string;
  chunkIndex: number;
}

// RAG 上下文
export interface RAGContext {
  content: string;
  score: string;
  knowledgeName: string;
}

// 聊天请求类型
export interface ChatRequest {
  messages: Message[];
  model?: string;
  sessionId?: string;
  useKnowledge?: boolean;
  knowledgeIds?: string[];
}

// 聊天响应类型
export interface ChatResponse {
  content: string;
  model: string;
  contexts?: RAGContext[];
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

// 登录响应
export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

// 会话列表响应
export interface SessionsResponse {
  sessions: Session[];
}

// 会话详情响应
export interface SessionDetailResponse {
  session: Session;
  messages: Message[];
}

// ============ 认证 API ============

/**
 * 用户登录
 */
export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/api/auth/login', {
    username,
    password,
  });
  return response.data;
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (): Promise<{ user: User }> => {
  const response = await apiClient.get<{ user: User }>('/api/auth/me');
  return response.data;
};

/**
 * 退出登录
 */
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/api/auth/logout');
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// ============ 会话 API ============

/**
 * 获取会话列表
 */
export const getSessions = async (): Promise<SessionsResponse> => {
  const response = await apiClient.get<SessionsResponse>('/api/sessions');
  return response.data;
};

/**
 * 创建新会话
 */
export const createSession = async (title?: string, model?: string): Promise<{ session: Session }> => {
  const response = await apiClient.post<{ message: string; session: Session }>('/api/sessions', {
    title,
    model,
  });
  return { session: response.data.session };
};

/**
 * 获取会话详情
 */
export const getSessionDetail = async (sessionId: string): Promise<SessionDetailResponse> => {
  const response = await apiClient.get<SessionDetailResponse>(`/api/sessions/${sessionId}`);
  return response.data;
};

/**
 * 更新会话
 */
export const updateSession = async (sessionId: string, data: { title?: string; model?: string }): Promise<{ session: Session }> => {
  const response = await apiClient.put<{ message: string; session: Session }>(`/api/sessions/${sessionId}`, data);
  return { session: response.data.session };
};

/**
 * 删除会话
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  await apiClient.delete(`/api/sessions/${sessionId}`);
};

// ============ 消息 API ============

/**
 * 获取会话消息
 */
export const getMessages = async (sessionId: string): Promise<{ messages: Message[] }> => {
  const response = await apiClient.get<{ messages: Message[] }>(`/api/messages/${sessionId}`);
  return response.data;
};

/**
 * 清空会话消息
 */
export const clearMessages = async (sessionId: string): Promise<void> => {
  await apiClient.delete(`/api/messages/${sessionId}`);
};

// ============ 模型 API ============

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

// ============ 知识库 API ============

/**
 * 获取知识库列表
 */
export const getKnowledgeList = async (): Promise<Knowledge[]> => {
  const response = await apiClient.get<{ success: boolean; data: Knowledge[] }>('/api/knowledge');
  return response.data.data;
};

/**
 * 获取知识库详情
 * @param id 知识库ID
 * @param fullContent 是否获取完整内容（默认 false）
 */
export const getKnowledgeDetail = async (id: string, fullContent = false): Promise<Knowledge> => {
  const params = fullContent ? '?fullContent=true' : '';
  const response = await apiClient.get<{ success: boolean; data: Knowledge }>(`/api/knowledge/${id}${params}`);
  return response.data.data;
};

/**
 * 上传文档到知识库
 */
export const uploadKnowledge = async (file: File, name?: string): Promise<Knowledge> => {
  const formData = new FormData();
  formData.append('file', file);
  if (name) {
    formData.append('name', name);
  }

  const response = await apiClient.post<{ success: boolean; data: Knowledge; message: string }>(
    '/api/knowledge/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5分钟超时
    }
  );
  return response.data.data;
};

/**
 * 删除知识库
 */
export const deleteKnowledge = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/knowledge/${id}`);
};

/**
 * 搜索知识库
 */
export const searchKnowledge = async (
  query: string,
  knowledgeIds?: string[],
  topK?: number
): Promise<KnowledgeSearchResult[]> => {
  const response = await apiClient.post<{ success: boolean; data: KnowledgeSearchResult[] }>(
    '/api/knowledge/search',
    { query, knowledgeIds, topK }
  );
  return response.data.data;
};

/**
 * 重新处理知识库文档
 */
export const reprocessKnowledge = async (id: string): Promise<void> => {
  await apiClient.post(`/api/knowledge/${id}/reprocess`);
};

// ============ 分析模板 API ============

/**
 * 获取分析模板列表
 */
export const getAnalysisTemplates = async (category?: string): Promise<{ data: AnalysisTemplate[]; categories: string[] }> => {
  const response = await apiClient.get<{ success: boolean; data: AnalysisTemplate[]; categories: string[] }>(
    '/api/knowledge/templates',
    { params: { category } }
  );
  return { data: response.data.data, categories: response.data.categories };
};

/**
 * 获取单个分析模板
 */
export const getAnalysisTemplate = async (id: string): Promise<AnalysisTemplate> => {
  const response = await apiClient.get<{ success: boolean; data: AnalysisTemplate }>(
    `/api/knowledge/templates/${id}`
  );
  return response.data.data;
};

/**
 * 创建分析模板
 */
export const createAnalysisTemplate = async (template: Partial<AnalysisTemplate>): Promise<AnalysisTemplate> => {
  const response = await apiClient.post<{ success: boolean; data: AnalysisTemplate }>(
    '/api/knowledge/templates',
    template
  );
  return response.data.data;
};

/**
 * 更新分析模板
 */
export const updateAnalysisTemplate = async (id: string, template: Partial<AnalysisTemplate>): Promise<void> => {
  await apiClient.put(`/api/knowledge/templates/${id}`, template);
};

/**
 * 删除分析模板
 */
export const deleteAnalysisTemplate = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/knowledge/templates/${id}`);
};

// ============ 聊天 API ============

/**
 * 发送聊天消息（非流式）
 */
export const sendMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const response = await apiClient.post<ChatResponse>('/api/chat', request);
  return response.data;
};

/**
 * 发送聊天消息（流式，支持 RAG）
 */
export const sendMessageStream = async (
  request: ChatRequest,
  onMessage: (content: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  onContexts?: (contexts: RAGContext[]) => void
): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
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
        // 处理 RAG 上下文事件
        if (line.startsWith('event: contexts')) {
          continue;
        }
        if (line.startsWith('data: ') && onContexts) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.contexts) {
              onContexts(data.contexts);
              continue;
            }
          } catch {
            // 忽略解析错误
          }
        }
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
