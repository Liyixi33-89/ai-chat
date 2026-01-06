# 🤖 AI Chat App

基于 **Ollama 本地大模型** 的智能对话应用，支持多模型切换、流式输出、Markdown 渲染、用户认证、会话历史记录等功能。

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)
![Ant Design](https://img.shields.io/badge/Ant%20Design-6.1-0170FE?logo=antdesign)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47A248?logo=mongodb)
![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-000000)

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 🎯 **多模型支持** | 动态获取 Ollama 已安装的模型，支持实时切换 |
| 🌊 **流式输出** | 实时显示 AI 回复，打字机效果体验 |
| 📝 **Markdown 渲染** | 支持代码高亮、表格、列表等丰富格式 |
| 🎨 **现代化 UI** | 使用 Ant Design X 专业 AI 对话组件 |
| 💡 **快捷提示** | 内置常用提示词，快速开始对话 |
| 📱 **响应式设计** | 完美适配桌面端和移动端 |
| 🔒 **用户认证** | JWT 登录认证，保护用户数据 |
| 📚 **历史记录** | MongoDB 存储会话历史，支持多会话管理 |
| 🗑️ **会话管理** | 创建、切换、删除会话，数据持久化 |
| 🔐 **本地部署** | 数据完全本地化，隐私安全 |

---

## 📁 项目结构

```
ai-chat-app/
├── backend/                    # 后端服务
│   ├── config/
│   │   └── database.js         # MongoDB 数据库连接配置
│   ├── middleware/
│   │   └── auth.js             # JWT 认证中间件
│   ├── models/
│   │   ├── User.js             # 用户模型
│   │   ├── Session.js          # 会话模型
│   │   ├── Message.js          # 消息模型
│   │   └── index.js            # 模型统一导出
│   ├── routes/
│   │   ├── auth.js             # 认证路由（登录/登出）
│   │   ├── sessions.js         # 会话 CRUD 路由
│   │   └── messages.js         # 消息路由
│   ├── server.js               # Express 主服务
│   └── package.json            # 后端依赖配置
├── frontend/                    # 前端应用
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatContainer/  # 聊天主容器
│   │   │   ├── Login/          # 登录页面
│   │   │   ├── Sidebar/        # 侧边栏（历史记录）
│   │   │   ├── ChatInput/      # 输入框组件
│   │   │   └── MessageList/    # 消息列表组件
│   │   ├── hooks/              # 自定义 Hooks
│   │   ├── services/
│   │   │   └── api.ts          # API 接口封装
│   │   └── App.tsx             # 应用入口
│   └── package.json            # 前端依赖配置
└── README.md                    # 项目说明文档
```

---

## 🗄️ 数据库设计

### 数据表结构

```
┌─────────────────────────────────────────────────────────────┐
│                        Users (用户表)                        │
├─────────────────────────────────────────────────────────────┤
│  _id          │ ObjectId   │ 主键                           │
│  username     │ String     │ 用户名（唯一）                  │
│  password     │ String     │ 密码（bcrypt 加密）             │
│  createdAt    │ Date       │ 创建时间                       │
│  updatedAt    │ Date       │ 更新时间                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Sessions (会话表)                       │
├─────────────────────────────────────────────────────────────┤
│  _id          │ ObjectId   │ 主键                           │
│  userId       │ ObjectId   │ 关联用户 ID                    │
│  title        │ String     │ 会话标题（自动生成）            │
│  model        │ String     │ 使用的模型名称                  │
│  createdAt    │ Date       │ 创建时间                       │
│  updatedAt    │ Date       │ 更新时间                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Messages (消息表)                       │
├─────────────────────────────────────────────────────────────┤
│  _id          │ ObjectId   │ 主键                           │
│  sessionId    │ ObjectId   │ 关联会话 ID                    │
│  role         │ String     │ 角色 ('user' | 'assistant')    │
│  content      │ String     │ 消息内容                       │
│  createdAt    │ Date       │ 创建时间                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 环境要求

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 18.0.0 |
| npm | >= 8.0.0 |
| MongoDB | >= 6.0 |
| Ollama | 最新版 |

---

## 📦 安装指南

### 1️⃣ 安装 MongoDB

#### Windows 安装

1. 访问 [MongoDB 官网](https://www.mongodb.com/try/download/community)
2. 下载 MongoDB Community Server（Windows 版）
3. 运行安装程序，选择 "Complete" 安装
4. 勾选 "Install MongoDB as a Service"（推荐）
5. 安装 MongoDB Compass（可选，图形化管理工具）

**验证安装：**
```powershell
# 检查 MongoDB 服务状态
Get-Service MongoDB

# 或使用 mongosh 连接测试
mongosh
```

#### macOS 安装

```bash
# 使用 Homebrew 安装
brew tap mongodb/brew
brew install mongodb-community

# 启动 MongoDB 服务
brew services start mongodb-community
```

#### Linux 安装

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y mongodb

# 启动服务
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Docker 安装（推荐）

```bash
# 拉取并运行 MongoDB 容器
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest

# 验证运行状态
docker ps
```

---

### 2️⃣ 安装 Ollama

Ollama 是一个轻量级的本地大模型运行框架，支持在本地运行各种开源大模型。

#### Windows 安装

1. 访问 [Ollama 官网](https://ollama.com/download)
2. 下载 Windows 安装包（`OllamaSetup.exe`）
3. 双击运行安装程序，按提示完成安装
4. 安装完成后，Ollama 会自动在后台运行

#### macOS 安装

```bash
# 方式一：官网下载
# 访问 https://ollama.com/download 下载 dmg 安装包

# 方式二：Homebrew 安装
brew install ollama
```

#### Linux 安装

```bash
# 一键安装脚本
curl -fsSL https://ollama.com/install.sh | sh
```

#### 验证安装

```bash
# 检查 Ollama 是否安装成功
ollama --version

# 查看 Ollama 服务状态
ollama serve

# 关闭
taskkill /IM ollama.exe /F
```

> ⚠️ **注意**：如果提示端口 11434 已被占用，说明 Ollama 服务已在后台运行，无需重复启动。

#### 🔧 配置环境变量（可选但推荐）

配置环境变量可以自定义 Ollama 的行为，如修改监听地址、模型存储位置等。

##### Windows 配置

**方式一：图形界面设置**
1. 右键点击 **此电脑** → **属性** → **高级系统设置**
2. 点击 **环境变量**
3. 在 **系统变量** 或 **用户变量** 中点击 **新建**
4. 添加需要的环境变量（见下表）
5. 点击 **确定** 保存，**重启 Ollama 服务**生效

**方式二：命令行设置（管理员权限）**
```powershell
# 设置模型存储路径（避免占用C盘空间）
[System.Environment]::SetEnvironmentVariable('OLLAMA_MODELS', 'D:\ollama\models', 'User')

# 设置监听地址（允许局域网访问）
[System.Environment]::SetEnvironmentVariable('OLLAMA_HOST', '0.0.0.0:11434', 'User')

# 刷新环境变量
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

##### macOS / Linux 配置

```bash
# 编辑 shell 配置文件（~/.bashrc 或 ~/.zshrc）
nano ~/.zshrc

# 添加以下内容
export OLLAMA_MODELS="/path/to/your/models"    # 自定义模型存储路径
export OLLAMA_HOST="0.0.0.0:11434"             # 允许局域网访问
export OLLAMA_ORIGINS="*"                       # 允许跨域请求

# 保存后执行
source ~/.zshrc
```

##### 常用环境变量说明

| 环境变量 | 说明 | 默认值 | 示例 |
|----------|------|--------|------|
| `OLLAMA_MODELS` | 模型存储路径 | `~/.ollama/models` | `D:\ollama\models` |
| `OLLAMA_HOST` | 服务监听地址 | `127.0.0.1:11434` | `0.0.0.0:11434` |
| `OLLAMA_ORIGINS` | 允许的跨域来源 | 无 | `*` |
| `OLLAMA_NUM_PARALLEL` | 并行处理请求数 | `1` | `2` |
| `OLLAMA_MAX_LOADED_MODELS` | 最大同时加载模型数 | `1` | `2` |
| `OLLAMA_KEEP_ALIVE` | 模型保持加载时间 | `5m` | `10m` |

---

### 3️⃣ 下载 AI 模型

根据你的硬件配置选择合适的模型：

#### 🔋 轻量模型（推荐低配置设备）

适用于：核显 / 2G 内存 / 轻量服务器

| 模型 | 参数量 | 内存需求 | 特点 | 下载命令 |
|------|--------|----------|------|----------|
| **Qwen2.5:0.5b** | 0.5B | <500MB | 极致轻量，中文优化 | `ollama pull qwen2.5:0.5b` |
| **TinyLlama** | 1.1B | 1-1.5GB | 超轻量，英文为主 | `ollama pull tinyllama` |
| **Qwen2.5:1.5b** | 1.5B | 1-2GB | 性价比高，中文优秀 | `ollama pull qwen2.5:1.5b` |
| **DeepSeek-R1:1.5b** | 1.5B | 1-2GB | 推理能力强 | `ollama pull deepseek-r1:1.5b` |

#### 🚀 标准模型（推荐中等配置）

适用于：独显 / 8G+ 内存

| 模型 | 参数量 | 内存需求 | 特点 | 下载命令 |
|------|--------|----------|------|----------|
| **Qwen2.5:7b** | 7B | 4-6GB | 中文能力强 | `ollama pull qwen2.5:7b` |
| **Llama3:8b** | 8B | 5-7GB | Meta 开源，综合能力强 | `ollama pull llama3:8b` |

#### 快速开始（推荐）

```bash
# 下载推荐的轻量模型
ollama pull deepseek-r1:1.5b
```

---

### 4️⃣ 安装项目依赖

```bash
# 克隆项目
git clone https://github.com/Liyixi33-89/ai-chat.git
cd ai-chat-app

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd frontend
npm install
```

---

## 🚀 启动项目

### 1. 确保服务运行

```bash
# 确保 MongoDB 服务运行中
# Windows: 服务默认自动启动
# macOS: brew services start mongodb-community

# 确保 Ollama 服务运行中
ollama serve
```

### 2. 启动后端服务

```bash
cd backend
npm start

# 或开发模式
npm run dev
```

后端启动成功显示：
```
╔════════════════════════════════════════════════╗
║       AI Chat 后端服务已启动                    ║
╠════════════════════════════════════════════════╣
║  地址: http://localhost:8000                   ║
║  健康检查: http://localhost:8000/health        ║
║  默认模型: deepseek-r1:1.5b                    ║
║  数据库: MongoDB 已连接                         ║
║  默认账号: admin / 123123                       ║
╚════════════════════════════════════════════════╝
```

### 3. 启动前端服务

```bash
cd frontend
npm run dev
```

访问：**http://localhost:3000**

---

## 🔐 默认账号

| 用户名 | 密码 |
|--------|------|
| admin | 123123 |

> 首次启动时系统会自动创建默认管理员账号

---

## 📡 API 接口

### 认证接口

| 接口 | 方法 | 描述 | 认证 |
|------|------|------|------|
| `/api/auth/login` | POST | 用户登录 | ❌ |
| `/api/auth/me` | GET | 获取当前用户信息 | ✅ |
| `/api/auth/logout` | POST | 退出登录 | ✅ |

### 会话接口

| 接口 | 方法 | 描述 | 认证 |
|------|------|------|------|
| `/api/sessions` | GET | 获取会话列表 | ✅ |
| `/api/sessions` | POST | 创建新会话 | ✅ |
| `/api/sessions/:id` | GET | 获取会话详情 | ✅ |
| `/api/sessions/:id` | PUT | 更新会话 | ✅ |
| `/api/sessions/:id` | DELETE | 删除会话 | ✅ |

### 消息接口

| 接口 | 方法 | 描述 | 认证 |
|------|------|------|------|
| `/api/messages/:sessionId` | GET | 获取会话消息 | ✅ |
| `/api/messages/:sessionId` | DELETE | 清空会话消息 | ✅ |

### 聊天接口

| 接口 | 方法 | 描述 | 认证 |
|------|------|------|------|
| `/api/chat` | POST | 非流式对话 | ✅ |
| `/api/chat/stream` | POST | 流式对话（SSE） | ✅ |
| `/api/models` | GET | 获取模型列表 | ❌ |

---

## 🛠️ 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Ant Design 6** - UI 组件库
- **@ant-design/x** - AI 专用组件
- **React Markdown** - Markdown 渲染
- **Axios** - HTTP 客户端

### 后端
- **Node.js 18+** - 运行时
- **Express** - Web 框架
- **MongoDB** - 数据库
- **Mongoose** - ODM 框架
- **JWT** - 用户认证
- **bcryptjs** - 密码加密

---

## ❓ 常见问题

### Q1: MongoDB 连接失败？

**解决方案**：
```bash
# 检查 MongoDB 服务是否运行
# Windows
Get-Service MongoDB

# macOS
brew services list | grep mongodb

# 手动启动
mongod --dbpath /data/db
```

### Q2: 登录后提示 Token 无效？

**解决方案**：
- 清除浏览器 localStorage
- 检查后端 JWT 密钥配置
- 重新登录

### Q3: 会话消息未保存？

**解决方案**：
- 检查 MongoDB 连接状态
- 查看后端控制台日志
- 确保 sessionId 正确传递

---

## 📄 License

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<p align="center">
  Made with ❤️ using Ollama + React + MongoDB + Ant Design
</p>
