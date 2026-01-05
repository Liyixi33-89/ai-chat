/**
 * AI Chat 后端服务
 * 使用 Express + Ollama 本地大模型
 */
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 8000;

// Ollama 配置
const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'deepseek-r1:1.5b'; // 默认使用轻量模型

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
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

// 获取可用模型列表（包含详细信息）
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
      // 按大小排序，小的在前
      models.sort((a, b) => a.sizeBytes - b.sizeBytes);
      res.json({ models, defaultModel: DEFAULT_MODEL });
    } else {
      res.json({ models: [], error: '无法获取模型列表' });
    }
  } catch (error) {
    res.json({ models: [], error: error.message });
  }
});

// 非流式聊天
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = DEFAULT_MODEL } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages 参数必须是数组' });
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: false,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      res.json({
        content: data.message.content,
        model,
      });
    } else {
      res.status(500).json({ error: '模型响应失败' });
    }
  } catch (error) {
    res.status(500).json({ error: `连接 Ollama 失败: ${error.message}` });
  }
});

// 流式聊天 (SSE)
app.post('/api/chat/stream', async (req, res) => {
  const { messages, model = DEFAULT_MODEL } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages 参数必须是数组' });
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map((msg) => ({
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
              res.write(`event: message\ndata: ${JSON.stringify({
                content: data.message.content,
                done: data.done || false,
              })}\n\n`);
            }

            if (data.done) {
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════╗
║       AI Chat 后端服务已启动                    ║
╠════════════════════════════════════════════════╣
║  地址: http://localhost:${PORT}                  ║
║  健康检查: http://localhost:${PORT}/health       ║
║  默认模型: ${DEFAULT_MODEL}                      ║
╚════════════════════════════════════════════════╝
  `);
});
