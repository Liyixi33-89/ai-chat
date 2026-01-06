/**
 * 数据库连接配置
 */
import mongoose from 'mongoose';
import { User } from '../models/index.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat';

/**
 * 连接数据库
 */
export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ MongoDB 连接成功');
    
    // 初始化默认用户
    await initDefaultUser();
    
    return true;
  } catch (error) {
    console.error('✗ MongoDB 连接失败:', error.message);
    return false;
  }
};

/**
 * 初始化默认管理员用户
 */
const initDefaultUser = async () => {
  try {
    const existingUser = await User.findOne({ username: 'admin' });
    
    if (!existingUser) {
      const defaultUser = new User({
        username: 'admin',
        password: '123123',
      });
      await defaultUser.save();
      console.log('✓ 默认用户已创建 (admin/123123)');
    }
  } catch (error) {
    console.error('初始化默认用户失败:', error.message);
  }
};

/**
 * 断开数据库连接
 */
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB 已断开连接');
  } catch (error) {
    console.error('断开 MongoDB 连接失败:', error.message);
  }
};

export default { connectDB, disconnectDB };
