# RAG 知识库管理后台

独立的后台管理系统，用于管理 RAG 知识库数据。

## 功能特性

### 🎯 核心功能

1. **仪表盘**
   - 系统概览统计（文档数、向量块数、用户数）
   - 文档类型分布
   - 最近上传的文档

2. **文档管理**
   - 查看所有用户上传的文档
   - 编辑文档名称和内容
   - 删除文档（同时删除关联的向量数据）
   - 上传新文档
   - 搜索文档

3. **向量分块管理**
   - 查看文档的所有向量分块
   - 编辑分块内容（自动重新生成向量）
   - 删除分块
   - 添加新分块

4. **用户管理**
   - 查看所有用户
   - 删除用户（同时删除用户的所有数据）

## 快速开始

### 安装依赖

```bash
cd admin
npm install
```

### 启动开发服务器

```bash
npm run dev
```

服务将在 http://localhost:5174 启动

### 登录

- 用户名：`admin`
- 密码：`123123`

## 技术栈

- React 19
- TypeScript
- TailwindCSS 4
- React Router 7
- Axios
- Vite

## 项目结构

```
admin/
├── src/
│   ├── components/      # 公共组件
│   │   └── Layout.tsx   # 布局组件
│   ├── pages/           # 页面组件
│   │   ├── Login.tsx    # 登录页
│   │   ├── Dashboard.tsx # 仪表盘
│   │   ├── Documents.tsx # 文档管理
│   │   ├── Chunks.tsx   # 向量分块管理
│   │   └── Users.tsx    # 用户管理
│   ├── services/        # API 服务
│   │   └── api.ts       # API 请求封装
│   ├── App.tsx          # 应用入口
│   ├── main.tsx         # 主入口
│   └── index.css        # 全局样式
├── package.json
└── vite.config.ts       # Vite 配置
```

## API 接口

后台管理系统使用独立的管理员 API：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/admin/login | 管理员登录 |
| GET | /api/admin/stats | 获取统计数据 |
| GET | /api/admin/knowledge | 获取文档列表 |
| GET | /api/admin/knowledge/:id | 获取文档详情 |
| PUT | /api/admin/knowledge/:id | 更新文档 |
| DELETE | /api/admin/knowledge/:id | 删除文档 |
| GET | /api/admin/chunks/:knowledgeId | 获取向量分块 |
| PUT | /api/admin/chunks/:id | 更新分块 |
| DELETE | /api/admin/chunks/:id | 删除分块 |
| POST | /api/admin/chunks | 添加分块 |
| GET | /api/admin/users | 获取用户列表 |
| DELETE | /api/admin/users/:id | 删除用户 |
