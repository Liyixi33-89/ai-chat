/**
 * AI Chat 后端服务
 * 使用 Express + Ollama 本地大模型 + MongoDB + RAG
 */
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';
import { authMiddleware } from './middleware/auth.js';
import { Session, Message } from './models/index.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import messageRoutes from './routes/messages.js';
import knowledgeRoutes from './routes/knowledge.js';
import adminRoutes from './routes/admin.js';
import { semanticSearch, generateRAGPrompt } from './services/ragService.js';

const app = express();
const PORT = 8000;

// Ollama 配置
const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'deepseek-r1:1.5b';

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查（无需认证）
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

// 格式化文件大小
const formatSize = (bytes) => {
  if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
  }
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

// 获取可用模型列表（无需认证）
app.get('/api/models', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    
    if (response.ok) {
      const data = await response.json();
      const models = (data.models || []).map((model) => ({
        name: model.name,
        size: formatSize(model.size),
        sizeBytes: model.size,
        modifiedAt: model.modified_at,
        family: model.details?.family || 'unknown',
        parameterSize: model.details?.parameter_size || 'unknown',
      }));
      models.sort((a, b) => a.sizeBytes - b.sizeBytes);
      res.json({ models, defaultModel: DEFAULT_MODEL });
    } else {
      res.json({ models: [], error: '无法获取模型列表' });
    }
  } catch (error) {
    res.json({ models: [], error: error.message });
  }
});

// 认证路由
app.use('/api/auth', authRoutes);

// 会话路由
app.use('/api/sessions', sessionRoutes);

// 消息路由
app.use('/api/messages', messageRoutes);

// 知识库路由
app.use('/api/knowledge', knowledgeRoutes);

// 管理员路由
app.use('/api', adminRoutes);

// 非流式聊天（需认证，支持 RAG）
app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { messages, model = DEFAULT_MODEL, sessionId, useKnowledge = false, knowledgeIds = [] } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages 参数必须是数组' });
    }

    // 获取最后一条用户消息
    const lastUserMessage = messages[messages.length - 1];
    let finalMessages = [...messages];
    let contexts = [];

    // RAG 检索增强
    if (useKnowledge && lastUserMessage?.role === 'user') {
      try {
        contexts = await semanticSearch(lastUserMessage.content, req.userId, {
          topK: 5,
          minScore: 0.5,
          knowledgeIds: knowledgeIds.length > 0 ? knowledgeIds : null,
        });

        if (contexts.length > 0) {
          const ragPrompt = generateRAGPrompt(lastUserMessage.content, contexts);
          finalMessages = [
            ...messages.slice(0, -1),
            { role: 'user', content: ragPrompt },
          ];
        }
      } catch (ragError) {
        console.error('RAG 检索失败:', ragError);
      }
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: finalMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: false,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const aiContent = data.message.content;

      // 如果提供了 sessionId，保存消息到数据库
      if (sessionId) {
        const session = await Session.findOne({ _id: sessionId, userId: req.userId });
        if (session) {
          if (lastUserMessage && lastUserMessage.role === 'user') {
            await Message.insertMany([
              { sessionId, role: 'user', content: lastUserMessage.content },
              { sessionId, role: 'assistant', content: aiContent },
            ]);
            
            session.updatedAt = new Date();
            await session.save();
          }
        }
      }

      res.json({ 
        content: aiContent, 
        model,
        contexts: contexts.map(c => ({
          content: c.content.substring(0, 200) + '...',
          score: c.score,
          knowledgeName: c.knowledgeName,
        })),
      });
    } else {
      res.status(500).json({ error: '模型响应失败' });
    }
  } catch (error) {
    res.status(500).json({ error: `连接 Ollama 失败: ${error.message}` });
  }
});

// 流式聊天 (SSE)（需认证，支持 RAG）
app.post('/api/chat/stream', authMiddleware, async (req, res) => {
  const { messages, model = DEFAULT_MODEL, sessionId, useKnowledge = false, knowledgeIds = [] } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages 参数必须是数组' });
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  let fullContent = '';
  const userId = req.userId;
  const lastUserMessage = messages[messages.length - 1];
  let finalMessages = [...messages];
  let contexts = [];

  // RAG 检索增强
  if (useKnowledge && lastUserMessage?.role === 'user') {
    try {
      contexts = await semanticSearch(lastUserMessage.content, userId, {
        topK: 5,
        minScore: 0.5,
        knowledgeIds: knowledgeIds.length > 0 ? knowledgeIds : null,
      });

      if (contexts.length > 0) {
        const ragPrompt = generateRAGPrompt(lastUserMessage.content, contexts);
        finalMessages = [
          ...messages.slice(0, -1),
          { role: 'user', content: ragPrompt },
        ];

        // 发送检索到的上下文信息
        res.write(`event: contexts\ndata: ${JSON.stringify({
          contexts: contexts.map(c => ({
            content: c.content.substring(0, 200) + '...',
            score: c.score.toFixed(4),
            knowledgeName: c.knowledgeName,
          })),
        })}\n\n`);
      }
    } catch (ragError) {
      console.error('RAG 检索失败:', ragError);
    }
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: finalMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: '模型响应失败' })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const processStream = async () => {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // 流结束，保存消息到数据库
          if (sessionId && fullContent) {
            try {
              const session = await Session.findOne({ _id: sessionId, userId });
              if (session) {
                if (lastUserMessage && lastUserMessage.role === 'user') {
                  const existingCount = await Message.countDocuments({ sessionId });
                  
                  await Message.insertMany([
                    { sessionId, role: 'user', content: lastUserMessage.content },
                    { sessionId, role: 'assistant', content: fullContent },
                  ]);
                  
                  if (existingCount === 0) {
                    session.title = lastUserMessage.content.substring(0, 30) + 
                      (lastUserMessage.content.length > 30 ? '...' : '');
                  }
                  session.updatedAt = new Date();
                  await session.save();
                }
              }
            } catch (dbError) {
              console.error('保存消息到数据库失败:', dbError);
            }
          }
          
          res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.message?.content) {
              fullContent += data.message.content;
              res.write(`event: message\ndata: ${JSON.stringify({
                content: data.message.content,
                done: data.done || false,
              })}\n\n`);
            }

            if (data.done) {
              // 保存消息到数据库
              if (sessionId && fullContent) {
                try {
                  const session = await Session.findOne({ _id: sessionId, userId });
                  if (session) {
                    if (lastUserMessage && lastUserMessage.role === 'user') {
                      const existingCount = await Message.countDocuments({ sessionId });
                      
                      await Message.insertMany([
                        { sessionId, role: 'user', content: lastUserMessage.content },
                        { sessionId, role: 'assistant', content: fullContent },
                      ]);
                      
                      if (existingCount === 0) {
                        session.title = lastUserMessage.content.substring(0, 30) + 
                          (lastUserMessage.content.length > 30 ? '...' : '');
                      }
                      session.updatedAt = new Date();
                      await session.save();
                    }
                  }
                } catch (dbError) {
                  console.error('保存消息到数据库失败:', dbError);
                }
              }
              
              res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
              res.end();
              return;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    };

    await processStream();
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// 处理客户端断开连接
app.use((req, res, next) => {
  req.on('close', () => {
    if (!res.writableEnded) {
      res.end();
    }
  });
  next();
});

// 启动服务
const startServer = async () => {
  // 连接数据库
  const dbConnected = await connectDB();
  
  if (!dbConnected) {
    console.warn('⚠ 数据库连接失败，部分功能可能不可用');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════╗
║       AI Chat 后端服务已启动                    ║
╠════════════════════════════════════════════════╣
║  地址: http://localhost:${PORT}                  ║
║  健康检查: http://localhost:${PORT}/health       ║
║  默认模型: ${DEFAULT_MODEL}                      ║
║  数据库: ${dbConnected ? 'MongoDB 已连接' : '未连接'}              ║
║  默认账号: admin / 123123                       ║
║  知识库: RAG 功能已启用                         ║
╚════════════════════════════════════════════════╝
    `);
  });
};

startServer();
