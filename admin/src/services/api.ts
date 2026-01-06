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
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/admin/knowledge', { params }),
  
  // 获取单个文档详情
  getById: (id: string) => api.get(`/admin/knowledge/${id}`),
  
  // 更新文档信息
  update: (id: string, data: { name?: string; content?: string }) =>
    api.put(`/admin/knowledge/${id}`, data),
  
  // 删除文档
  delete: (id: string) => api.delete(`/admin/knowledge/${id}`),
  
  // 上传新文档
  upload: (formData: FormData) =>
    api.post('/admin/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
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

export default api;
