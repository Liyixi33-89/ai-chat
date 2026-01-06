/**
 * 会话路由
 */
import express from 'express';
import { Session, Message } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 所有会话路由需要认证
router.use(authMiddleware);

/**
 * 获取用户的所有会话列表
 * GET /api/sessions
 */
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .lean();

    // 获取每个会话的最后一条消息
    const sessionsWithLastMessage = await Promise.all(
      sessions.map(async (session) => {
        const lastMessage = await Message.findOne({ sessionId: session._id })
          .sort({ createdAt: -1 })
          .lean();
        
        const messageCount = await Message.countDocuments({ sessionId: session._id });
        
        return {
          ...session,
          lastMessage: lastMessage?.content?.substring(0, 50) || '',
          messageCount,
        };
      })
    );

    res.json({ sessions: sessionsWithLastMessage });
  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({ error: '获取会话列表失败' });
  }
});

/**
 * 创建新会话
 * POST /api/sessions
 */
router.post('/', async (req, res) => {
  try {
    const { title, model } = req.body;

    const session = new Session({
      userId: req.userId,
      title: title || '新对话',
      model: model || 'deepseek-r1:1.5b',
    });

    await session.save();

    res.status(201).json({
      message: '会话创建成功',
      session,
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({ error: '创建会话失败' });
  }
});

/**
 * 获取单个会话详情（包含所有消息）
 * GET /api/sessions/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    const messages = await Message.find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      session,
      messages,
    });
  } catch (error) {
    console.error('获取会话详情失败:', error);
    res.status(500).json({ error: '获取会话详情失败' });
  }
});

/**
 * 更新会话信息
 * PUT /api/sessions/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, model } = req.body;

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        ...(title && { title }),
        ...(model && { model }),
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    res.json({
      message: '会话更新成功',
      session,
    });
  } catch (error) {
    console.error('更新会话失败:', error);
    res.status(500).json({ error: '更新会话失败' });
  }
});

/**
 * 删除会话（同时删除相关消息）
 * DELETE /api/sessions/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    // 删除会话的所有消息
    await Message.deleteMany({ sessionId: session._id });
    
    // 删除会话
    await Session.deleteOne({ _id: session._id });

    res.json({ message: '会话删除成功' });
  } catch (error) {
    console.error('删除会话失败:', error);
    res.status(500).json({ error: '删除会话失败' });
  }
});

export default router;
