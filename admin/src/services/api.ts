import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 请求拦截器 - 添加token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/admin/login', { username, password }),
};

// 知识库文档管理
export const knowledgeApi = {
  // 获取所有文档列表（管理员）
  getAll: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
    api.get('/admin/knowledge', { params }),
  
  // 获取单个文档详情
  getById: (id: string) => api.get(`/admin/knowledge/${id}`),
  
  // 更新文档信息
  update: (id: string, data: { name?: string; content?: string; category?: string }) =>
    api.put(`/admin/knowledge/${id}`, data),
  
  // 删除文档
  delete: (id: string) => api.delete(`/admin/knowledge/${id}`),
  
  // 上传新文档
  upload: (formData: FormData) =>
    api.post('/admin/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // 批量更新分类
  batchUpdateCategory: (documentIds: string[], category: string) =>
    api.put('/admin/knowledge/batch-category', { documentIds, category }),

  // AI 自动分类
  autoClassify: (documentIds: string[], promptId?: string) =>
    api.post('/admin/knowledge/auto-classify', { documentIds, promptId }),
};

// 分类 Prompt 管理
export const categoryPromptApi = {
  // 获取所有分类 Prompt
  getAll: () => api.get('/admin/category-prompts'),

  // 创建分类 Prompt
  create: (data: { name: string; prompt: string; categories: string[]; isDefault?: boolean }) =>
    api.post('/admin/category-prompts', data),

  // 更新分类 Prompt
  update: (id: string, data: { name?: string; prompt?: string; categories?: string[]; isDefault?: boolean }) =>
    api.put(`/admin/category-prompts/${id}`, data),

  // 删除分类 Prompt
  delete: (id: string) => api.delete(`/admin/category-prompts/${id}`),
};

// 分类管理
export const categoryApi = {
  // 获取所有分类
  getAll: () => api.get('/admin/categories'),
};

// 分析模板管理
export const analysisTemplateApi = {
  // 获取所有分析模板
  getAll: (category?: string) =>
    api.get('/admin/analysis-templates', { params: { category } }),

  // 创建分析模板
  create: (data: {
    name: string;
    description?: string;
    category?: string;
    systemPrompt: string;
    userPromptTemplate: string;
    variables?: Array<{
      name: string;
      label: string;
      type: 'text' | 'textarea' | 'select';
      options?: string[];
      required: boolean;
      defaultValue?: string;
    }>;
    exampleInput?: string;
    exampleOutput?: string;
    isPublic?: boolean;
    isSystem?: boolean;
  }) => api.post('/admin/analysis-templates', data),

  // 更新分析模板
  update: (id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    systemPrompt?: string;
    userPromptTemplate?: string;
    variables?: Array<{
      name: string;
      label: string;
      type: 'text' | 'textarea' | 'select';
      options?: string[];
      required: boolean;
      defaultValue?: string;
    }>;
    exampleInput?: string;
    exampleOutput?: string;
    isPublic?: boolean;
    isSystem?: boolean;
  }) => api.put(`/admin/analysis-templates/${id}`, data),

  // 删除分析模板
  delete: (id: string) => api.delete(`/admin/analysis-templates/${id}`),

  // 初始化系统预设模板
  initSystem: () => api.post('/admin/analysis-templates/init-system'),
};

// 向量块管理
export const chunkApi = {
  // 获取文档的所有向量块
  getByKnowledgeId: (knowledgeId: string) =>
    api.get(`/admin/chunks/${knowledgeId}`),
  
  // 更新向量块内容
  update: (id: string, content: string) =>
    api.put(`/admin/chunks/${id}`, { content }),
  
  // 删除向量块
  delete: (id: string) => api.delete(`/admin/chunks/${id}`),
  
  // 添加新向量块
  create: (knowledgeId: string, content: string) =>
    api.post('/admin/chunks', { knowledgeId, content }),
};

// 用户管理
export const userApi = {
  // 获取所有用户
  getAll: () => api.get('/admin/users'),
  
  // 删除用户
  delete: (id: string) => api.delete(`/admin/users/${id}`),
};

// 统计数据
export const statsApi = {
  // 获取系统统计
  getOverview: () => api.get('/admin/stats'),
};

// 词条管理
export const entryApi = {
  // 获取词条列表
  getAll: (params?: { page?: number; pageSize?: number; keyword?: string; category?: string; isActive?: string }) =>
    api.get('/admin/entries', { params }).then(res => res.data),

  // 获取单个词条详情
  getById: (id: string) => api.get(`/admin/entries/${id}`).then(res => res.data),

  // 创建词条
  create: (data: {
    keywords: string[];
    question: string;
    answer: string;
    matchType?: 'exact' | 'contains' | 'regex';
    priority?: number;
    category?: string;
    isActive?: boolean;
    remark?: string;
  }) => api.post('/admin/entries', data).then(res => res.data),

  // 更新词条
  update: (id: string, data: {
    keywords?: string[];
    question?: string;
    answer?: string;
    matchType?: 'exact' | 'contains' | 'regex';
    priority?: number;
    category?: string;
    isActive?: boolean;
    remark?: string;
  }) => api.put(`/admin/entries/${id}`, data).then(res => res.data),

  // 删除词条
  delete: (id: string) => api.delete(`/admin/entries/${id}`).then(res => res.data),

  // 批量删除词条
  batchDelete: (ids: string[]) => api.post('/admin/entries/batch-delete', { ids }).then(res => res.data),

  // 切换词条启用状态
  toggle: (id: string) => api.put(`/admin/entries/${id}/toggle`).then(res => res.data),

  // 测试词条匹配
  testMatch: (input: string) => api.post('/admin/entries/test-match', { input }).then(res => res.data),
};

// 统一导出 adminApi（方便在页面中使用）
export const adminApi = {
  ...knowledgeApi,
  ...categoryPromptApi,
  ...categoryApi,
  ...analysisTemplateApi,
  ...chunkApi,
  ...userApi,
  ...statsApi,
  // 词条管理
  getEntries: entryApi.getAll,
  getEntry: entryApi.getById,
  createEntry: entryApi.create,
  updateEntry: entryApi.update,
  deleteEntry: entryApi.delete,
  batchDeleteEntries: entryApi.batchDelete,
  toggleEntry: entryApi.toggle,
  testEntryMatch: entryApi.testMatch,
};

export default api;
