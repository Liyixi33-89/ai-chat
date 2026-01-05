# 🤖 AI Chat App

基于 **Ollama 本地大模型** 的智能对话应用，支持多模型切换、流式输出、Markdown 渲染等功能。

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)
![Ant Design](https://img.shields.io/badge/Ant%20Design-6.1-0170FE?logo=antdesign)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
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
| 🔒 **本地部署** | 数据完全本地化，隐私安全 |

---

## 📁 项目结构

```
ai-chat-app/
├── backend/                # 后端服务
│   ├── server.js          # Express 服务器（API 接口）
│   └── package.json       # 后端依赖配置
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/    # React 组件
│   │   │   ├── ChatContainer/  # 聊天容器（主组件）
│   │   │   ├── ChatInput/      # 输入框组件
│   │   │   └── MessageList/    # 消息列表组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   │   └── useChat.ts      # 聊天逻辑 Hook
│   │   ├── services/      # API 服务
│   │   │   └── api.ts          # 接口封装
│   │   └── App.tsx        # 应用入口
│   └── package.json       # 前端依赖配置
└── README.md              # 项目说明文档
```

---

## 🔧 环境要求

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 18.0.0 |
| npm | >= 8.0.0 |
| Ollama | 最新版 |

---

## 📦 安装指南

### 1️⃣ 安装 Ollama

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
**或者**
```powershell
#使用  （只在当前窗口使用）
 $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
 ```

**方式二：命令行设置（管理员权限）**
```powershell
# 设置模型存储路径（避免占用C盘空间）
[System.Environment]::SetEnvironmentVariable('OLLAMA_MODELS', 'D:\ollama\models', 'User')

# 设置监听地址（允许局域网访问）
[System.Environment]::SetEnvironmentVariable('OLLAMA_HOST', '0.0.0.0:11434', 'User')

# 设置后需要重启 Ollama 服务
```

##### macOS / Linux 配置

```bash
# 编辑 shell 配置文件（~/.bashrc 或 ~/.zshrc）
nano ~/.zshrc

# 添加以下内容
export OLLAMA_MODELS="/path/to/your/models"    # 自定义模型存储路径
export OLLAMA_HOST="0.0.0.0:11434"             # 允许局域网访问
export OLLAMA_ORIGINS="*"                       # 允许跨域请求
export OLLAMA_NUM_PARALLEL=2                    # 并行请求数
export OLLAMA_MAX_LOADED_MODELS=2               # 最大同时加载模型数

# 保存后执行
source ~/.zshrc

# 重启 Ollama 服务
ollama serve
```

##### 常用环境变量说明

| 环境变量 | 说明 | 默认值 | 示例 |
|----------|------|--------|------|
| `OLLAMA_MODELS` | 模型存储路径 | `~/.ollama/models` | `D:\ollama\models` |
| `OLLAMA_HOST` | 服务监听地址 | `127.0.0.1:11434` | `0.0.0.0:11434` |
| `OLLAMA_ORIGINS` | 允许的跨域来源 | 无 | `*` 或 `http://localhost:3000` |
| `OLLAMA_NUM_PARALLEL` | 并行处理请求数 | `1` | `2` |
| `OLLAMA_MAX_LOADED_MODELS` | 最大同时加载模型数 | `1` | `2` |
| `OLLAMA_DEBUG` | 开启调试模式 | `false` | `true` |
| `OLLAMA_KEEP_ALIVE` | 模型保持加载时间 | `5m` | `10m` 或 `0`（一直保持） |
| `HTTPS_PROXY` | HTTPS 代理地址 | 无 | `http://127.0.0.1:7890` |
| `HTTP_PROXY` | HTTP 代理地址 | 无 | `http://127.0.0.1:7890` |

##### 常见配置场景

**场景 1：模型存储到其他磁盘（Windows）**
```powershell
# 避免 C 盘空间不足
[System.Environment]::SetEnvironmentVariable('OLLAMA_MODELS', 'D:\AI\ollama\models', 'User')
```

**场景 2：允许局域网其他设备访问**
```bash
# 设置监听所有网卡
export OLLAMA_HOST="0.0.0.0:11434"
# 允许跨域
export OLLAMA_ORIGINS="*"
```

**场景 3：使用代理下载模型**
```bash
# 设置代理（加速模型下载）
export HTTPS_PROXY="http://127.0.0.1:7890"
export HTTP_PROXY="http://127.0.0.1:7890"
```

**场景 4：低内存设备优化**
```bash
# 限制并行数和加载模型数，减少内存占用
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_MAX_LOADED_MODELS=1
```

> 💡 **提示**：修改环境变量后，需要**重启 Ollama 服务**才能生效。Windows 用户可能需要在任务管理器中结束 Ollama 进程后重新启动。

---

### 2️⃣ 下载 AI 模型

根据你的硬件配置选择合适的模型：

#### 🔋 轻量模型（推荐低配置设备）

适用于：核显 / 2G 内存 / 轻量服务器

| 模型 | 参数量 | 内存需求 | 特点 | 下载命令 |
|------|--------|----------|------|----------|
| **Qwen2.5:0.5b** | 0.5B | <500MB | 极致轻量，中文优化 | `ollama pull qwen2.5:0.5b` |
| **TinyLlama** | 1.1B | 1-1.5GB | 超轻量，英文为主 | `ollama pull tinyllama` |
| **Qwen2.5:1.5b** | 1.5B | 1-2GB | 性价比高，中文优秀 | `ollama pull qwen2.5:1.5b` |
| **DeepSeek-R1:1.5b** | 1.5B | 1-2GB | 推理能力强 | `ollama pull deepseek-r1:1.5b` |
| **Gemma:2b** | 2B | 1.5GB | Google 出品，多语言 | `ollama pull gemma:2b` |

#### 🚀 标准模型（推荐中等配置）

适用于：独显 / 8G+ 内存

| 模型 | 参数量 | 内存需求 | 特点 | 下载命令 |
|------|--------|----------|------|----------|
| **Qwen2.5:7b** | 7B | 4-6GB | 中文能力强 | `ollama pull qwen2.5:7b` |
| **Llama3:8b** | 8B | 5-7GB | Meta 开源，综合能力强 | `ollama pull llama3:8b` |
| **DeepSeek-R1:7b** | 7B | 4-6GB | 推理优秀 | `ollama pull deepseek-r1:7b` |

#### 💪 大型模型（高配置设备）

适用于：高端显卡 / 16G+ 内存

| 模型 | 参数量 | 内存需求 | 下载命令 |
|------|--------|----------|----------|
| **Qwen2.5:14b** | 14B | 10-12GB | `ollama pull qwen2.5:14b` |
| **Llama3:70b** | 70B | 40GB+ | `ollama pull llama3:70b` |

#### 快速开始（推荐）

```bash
# 下载推荐的轻量模型（中文优化）
ollama pull deepseek-r1:1.5b

# 或者下载更轻量的模型
ollama pull qwen2.5:0.5b
```

#### 查看已安装模型

```bash
ollama list
```

---

### 3️⃣ 安装项目依赖

```bash
# 克隆项目（如果是从 Git 获取）
git clone https://github.com/Liyixi33-89/ai-chat.git
cd ai-chat-app

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

---

## 🚀 启动项目

### 方式一：分别启动（推荐开发时使用）

#### 1. 确保 Ollama 服务运行中

```bash
# Windows: Ollama 安装后会自动后台运行
# 手动启动（如需要）
ollama serve
```

#### 2. 启动后端服务

```bash
cd backend
npm start

# 或开发模式（支持热重载）
npm run dev
```

后端服务启动后会显示：
```
╔════════════════════════════════════════════════╗
║       AI Chat 后端服务已启动                    ║
╠════════════════════════════════════════════════╣
║  地址: http://localhost:8000                   ║
║  健康检查: http://localhost:8000/health        ║
║  默认模型: deepseek-r1:1.5b                    ║
╚════════════════════════════════════════════════╝
```

#### 3. 启动前端服务

```bash
cd frontend
npm run dev
```

前端服务启动后访问：**http://localhost:3000**

---

## 📡 API 接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/models` | GET | 获取可用模型列表 |
| `/api/chat` | POST | 非流式对话 |
| `/api/chat/stream` | POST | 流式对话（SSE） |

### 请求示例

```bash
# 获取模型列表
curl http://localhost:8000/api/models

# 发送对话（非流式）
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-r1:1.5b",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

---

## 🛠️ 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Ant Design 6** - UI 组件库
- **@ant-design/x** - AI 专用组件
- **React Markdown** - Markdown 渲染
- **Highlight.js** - 代码高亮

### 后端
- **Node.js 18+** - 运行时
- **Express** - Web 框架
- **Ollama API** - 本地大模型接口

---

## ❓ 常见问题

### Q1: 启动 Ollama 提示端口被占用？

```
Error: listen tcp 127.0.0.1:11434: bind: Only one usage of each socket address...
```

**解决方案**：这说明 Ollama 服务已在后台运行，无需手动启动。直接启动后端和前端服务即可。

### Q2: 模型下载很慢？

**解决方案**：
- 检查网络连接
- 使用代理加速
- 先下载轻量模型测试

### Q3: 内存不足导致模型加载失败？

**解决方案**：
- 选择更小的模型（如 `qwen2.5:0.5b`）
- 关闭其他占用内存的程序
- 增加系统虚拟内存

### Q4: 前端 `npm run dev` 报错？

**解决方案**：
```bash
# 清理依赖重新安装
rm -rf node_modules package-lock.json
npm install
```

---

## 📄 License

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<p align="center">
  Made with ❤️ using Ollama + React + Ant Design
</p>
