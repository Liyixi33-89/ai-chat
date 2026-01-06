/**
 * 管理员路由
 * 提供后台管理系统所需的 API
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Knowledge from '../models/Knowledge.js';
import VectorChunk from '../models/VectorChunk.js';
import { getEmbedding } from '../services/ragService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ai-chat-secret-key-2024';

// 管理员认证中间件
const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '请先登录' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '无权限访问' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: '认证失败' });
  }
};

// ==================== 认证相关 ====================

// 管理员登录
router.post('/auth/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: '非管理员账户，无权登录' });
    }

    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({ error: '登录失败，请重试' });
  }
});

// ==================== 统计数据 ====================

// 获取系统概览统计
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const [totalDocuments, totalChunks, totalUsers] = await Promise.all([
      Knowledge.countDocuments(),
      VectorChunk.countDocuments(),
      User.countDocuments(),
    ]);

    // 按文件类型统计
    const documentsByType = await Knowledge.aggregate([
      { $group: { _id: '$fileType', count: { $sum: 1 } } },
    ]);

    // 最近上传的文档
    const recentDocuments = await Knowledge.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name status createdAt');

    res.json({
      totalDocuments,
      totalChunks,
      totalUsers,
      documentsByType: documentsByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentDocuments,
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// ==================== 文档管理 ====================

// 获取所有文档列表
router.get('/admin/knowledge', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = search
      ? { name: { $regex: search, $options: 'i' } }
      : {};

    const [documents, total] = await Promise.all([
      Knowledge.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'username'),
      Knowledge.countDocuments(query),
    ]);

    res.json({ documents, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ error: '获取文档列表失败' });
  }
});

// 获取单个文档详情
router.get('/admin/knowledge/:id', adminAuth, async (req, res) => {
  try {
    const document = await Knowledge.findById(req.params.id)
      .populate('userId', 'username');
    
    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }

    res.json({ document });
  } catch (error) {
    console.error('获取文档详情失败:', error);
    res.status(500).json({ error: '获取文档详情失败' });
  }
});

// 更新文档信息
router.put('/admin/knowledge/:id', adminAuth, async (req, res) => {
  try {
    const { name, content } = req.body;
    const document = await Knowledge.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }

    // 更新文档信息
    if (name) document.name = name;
    
    // 如果内容有变化，需要重新生成向量
    if (content && content !== document.content) {
      document.content = content;
      document.status = 'processing';
      await document.save();

      // 异步重新处理向量
      processDocumentVectors(document).catch(err => {
        console.error('重新处理向量失败:', err);
      });
    } else {
      await document.save();
    }

    res.json({ success: true, document });
  } catch (error) {
    console.error('更新文档失败:', error);
    res.status(500).json({ error: '更新文档失败' });
  }
});

// 删除文档
router.delete('/admin/knowledge/:id', adminAuth, async (req, res) => {
  try {
    const document = await Knowledge.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }

    // 删除关联的向量块
    await VectorChunk.deleteMany({ knowledgeId: document._id });
    
    // 删除文档
    await Knowledge.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('删除文档失败:', error);
    res.status(500).json({ error: '删除文档失败' });
  }
});

// ==================== 向量块管理 ====================

// 获取文档的所有向量块
router.get('/admin/chunks/:knowledgeId', adminAuth, async (req, res) => {
  try {
    const chunks = await VectorChunk.find({ knowledgeId: req.params.knowledgeId })
      .select('-embedding') // 不返回向量数据，太大
      .sort({ chunkIndex: 1 });

    res.json({ chunks });
  } catch (error) {
    console.error('获取向量块失败:', error);
    res.status(500).json({ error: '获取向量块失败' });
  }
});

// 更新向量块内容
router.put('/admin/chunks/:id', adminAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const chunk = await VectorChunk.findById(req.params.id);

    if (!chunk) {
      return res.status(404).json({ error: '向量块不存在' });
    }

    // 更新内容并重新生成向量
    chunk.content = content;
    const embedding = await getEmbedding(content);
    chunk.embedding = embedding;
    await chunk.save();

    res.json({ success: true, chunk: { ...chunk.toObject(), embedding: undefined } });
  } catch (error) {
    console.error('更新向量块失败:', error);
    res.status(500).json({ error: '更新向量块失败' });
  }
});

// 删除向量块
router.delete('/admin/chunks/:id', adminAuth, async (req, res) => {
  try {
    const chunk = await VectorChunk.findById(req.params.id);
    
    if (!chunk) {
      return res.status(404).json({ error: '向量块不存在' });
    }

    // 更新文档的分块数量
    await Knowledge.findByIdAndUpdate(chunk.knowledgeId, {
      $inc: { chunkCount: -1 },
    });

    await VectorChunk.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('删除向量块失败:', error);
    res.status(500).json({ error: '删除向量块失败' });
  }
});

// 添加新向量块
router.post('/admin/chunks', adminAuth, async (req, res) => {
  try {
    const { knowledgeId, content } = req.body;

    const document = await Knowledge.findById(knowledgeId);
    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }

    // 获取当前最大的 chunkIndex
    const lastChunk = await VectorChunk.findOne({ knowledgeId })
      .sort({ chunkIndex: -1 });
    const chunkIndex = lastChunk ? lastChunk.chunkIndex + 1 : 0;

    // 生成向量
    const embedding = await getEmbedding(content);

    // 创建新向量块
    const chunk = new VectorChunk({
      knowledgeId,
      userId: document.userId,
      content,
      chunkIndex,
      embedding,
    });
    await chunk.save();

    // 更新文档的分块数量
    await Knowledge.findByIdAndUpdate(knowledgeId, {
      $inc: { chunkCount: 1 },
    });

    res.json({ success: true, chunk: { ...chunk.toObject(), embedding: undefined } });
  } catch (error) {
    console.error('添加向量块失败:', error);
    res.status(500).json({ error: '添加向量块失败' });
  }
});

// ==================== 用户管理 ====================

// 获取所有用户
router.get('/admin/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 删除用户
router.delete('/admin/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: '不能删除管理员账户' });
    }

    // 删除用户的所有数据
    const knowledgeIds = await Knowledge.find({ userId: user._id }).distinct('_id');
    await VectorChunk.deleteMany({ knowledgeId: { $in: knowledgeIds } });
    await Knowledge.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// ==================== 辅助函数 ====================

// 重新处理文档向量
async function processDocumentVectors(document) {
  try {
    // 删除旧的向量块
    await VectorChunk.deleteMany({ knowledgeId: document._id });

    // 分块
    const chunks = splitTextIntoChunks(document.content);
    
    // 批量生成向量
    const batchSize = 10;
    let chunkCount = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await Promise.all(
        batch.map(chunk => getEmbedding(chunk))
      );

      // 保存向量块
      await VectorChunk.insertMany(
        batch.map((content, index) => ({
          knowledgeId: document._id,
          userId: document.userId,
          content,
          chunkIndex: i + index,
          embedding: embeddings[index],
        }))
      );

      chunkCount += batch.length;
    }

    // 更新文档状态
    document.chunkCount = chunkCount;
    document.status = 'ready';
    await document.save();

    console.log(`文档 ${document.name} 向量重新生成完成，共 ${chunkCount} 个分块`);
  } catch (error) {
    document.status = 'error';
    document.errorMessage = error.message;
    await document.save();
    throw error;
  }
}

// 文本分块函数
function splitTextIntoChunks(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('。', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const lastEnglishPeriod = text.lastIndexOf('.', end);
      
      const breakPoint = Math.max(lastPeriod, lastNewline, lastEnglishPeriod);
      
      if (breakPoint > start + chunkSize * 0.5) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter(chunk => chunk.length > 0);
}

export default router;
