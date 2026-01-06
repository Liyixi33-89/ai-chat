/**
 * 消息路由
 */
import express from 'express';
import { Session, Message } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 所有消息路由需要认证
router.use(authMiddleware);

/**
 * 获取会话的所有消息
 * GET /api/messages/:sessionId
 */
router.get('/:sessionId', async (req, res) => {
  try {
    // 验证会话所属权
    const session = await Session.findOne({
      _id: req.params.sessionId,
      userId: req.userId,
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    const messages = await Message.find({ sessionId: req.params.sessionId })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ messages });
  } catch (error) {
    console.error('获取消息列表失败:', error);
    res.status(500).json({ error: '获取消息列表失败' });
  }
});

/**
 * 添加消息到会话
 * POST /api/messages/:sessionId
 */
router.post('/:sessionId', async (req, res) => {
  try {
    const { role, content } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: '角色和内容不能为空' });
    }

    if (!['user', 'assistant'].includes(role)) {
      return res.status(400).json({ error: '无效的角色类型' });
    }

    // 验证会话所属权
    const session = await Session.findOne({
      _id: req.params.sessionId,
      userId: req.userId,
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    // 创建消息
    const message = new Message({
      sessionId: req.params.sessionId,
      role,
      content,
    });

    await message.save();

    // 更新会话时间和标题（如果是第一条用户消息）
    const messageCount = await Message.countDocuments({ sessionId: session._id });
    if (messageCount === 1 && role === 'user') {
      // 使用第一条消息内容作为标题
      session.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
      await session.save();
    } else {
      // 更新会话时间
      session.updatedAt = new Date();
      await session.save();
    }

    res.status(201).json({
      message: '消息添加成功',
      data: message,
    });
  } catch (error) {
    console.error('添加消息失败:', error);
    res.status(500).json({ error: '添加消息失败' });
  }
});

/**
 * 批量添加消息（用于保存用户消息和 AI 回复）
 * POST /api/messages/:sessionId/batch
 */
router.post('/:sessionId/batch', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '消息列表不能为空' });
    }

    // 验证会话所属权
    const session = await Session.findOne({
      _id: req.params.sessionId,
      userId: req.userId,
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    // 批量创建消息
    const messageDocs = messages.map((msg) => ({
      sessionId: req.params.sessionId,
      role: msg.role,
      content: msg.content,
    }));

    const savedMessages = await Message.insertMany(messageDocs);

    // 更新会话标题（如果需要）
    const totalCount = await Message.countDocuments({ sessionId: session._id });
    if (totalCount === messages.length) {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      if (firstUserMsg) {
        session.title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
        await session.save();
      }
    } else {
      session.updatedAt = new Date();
      await session.save();
    }

    res.status(201).json({
      message: '消息批量添加成功',
      data: savedMessages,
    });
  } catch (error) {
    console.error('批量添加消息失败:', error);
    res.status(500).json({ error: '批量添加消息失败' });
  }
});

/**
 * 清空会话消息
 * DELETE /api/messages/:sessionId
 */
router.delete('/:sessionId', async (req, res) => {
  try {
    // 验证会话所属权
    const session = await Session.findOne({
      _id: req.params.sessionId,
      userId: req.userId,
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    await Message.deleteMany({ sessionId: req.params.sessionId });

    // 重置会话标题
    session.title = '新对话';
    await session.save();

    res.json({ message: '消息清空成功' });
  } catch (error) {
    console.error('清空消息失败:', error);
    res.status(500).json({ error: '清空消息失败' });
  }
});

export default router;
