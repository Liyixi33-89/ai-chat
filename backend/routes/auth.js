/**
 * 用户认证路由
 */
import express from 'express';
import { User } from '../models/index.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成 token
    const token = generateToken(user._id);

    res.json({
      message: '登录成功',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

/**
 * 退出登录（可选，主要是前端清除 token）
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: '退出成功' });
});

export default router;
