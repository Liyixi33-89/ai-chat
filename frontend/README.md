# AI Chat App - Frontend

> 基于 React + TypeScript + Ant Design X 的 AI 对话前端应用

📖 **完整文档请查看项目根目录的 [README.md](../README.md)**

---

## 🚀 快速启动

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 构建生产版本
npm run build
```

---

## 📦 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.3 | UI 框架 |
| TypeScript | 5.6 | 类型安全 |
| Vite | 6.0 | 构建工具 |
| Ant Design | 6.1 | UI 组件库 |
| @ant-design/x | 2.1 | AI 专用组件 |
| React Markdown | 10.1 | Markdown 渲染 |
| Highlight.js | 11.11 | 代码高亮 |
| Axios | 1.7 | HTTP 客户端 |

---

## 📁 目录结构

```
src/
├── components/          # React 组件
│   ├── ChatContainer/   # 聊天主容器
│   │   ├── ChatContainer.tsx
│   │   └── ChatContainer.css
│   ├── ChatInput/       # 输入框组件
│   └── MessageList/     # 消息列表组件
├── hooks/               # 自定义 Hooks
│   └── useChat.ts       # 聊天逻辑
├── services/            # API 服务
│   └── api.ts           # 接口封装
├── utils/               # 工具函数
├── App.tsx              # 应用入口
└── main.tsx             # 渲染入口
```

---

## 🎨 主要功能

- ✅ 多模型选择（动态获取 Ollama 已安装模型）
- ✅ 流式输出（实时显示 AI 回复）
- ✅ Markdown 渲染（代码高亮、表格、列表）
- ✅ 快捷提示词
- ✅ 响应式设计
- ✅ 暗色主题

---

## 🔧 配置

### 环境变量

在 `vite.config.ts` 中配置：

```typescript
export default defineConfig({
  server: {
    port: 3000,  // 前端端口
  },
})
```

### API 地址

在 `src/services/api.ts` 中配置后端地址：

```typescript
const API_BASE_URL = 'http://localhost:8000';
```

---

## 📝 开发命令

```bash
# 开发模式
npm run dev

# 类型检查 + 构建
npm run build

# 代码检查
npm run lint

# 预览构建结果
npm run preview
```
