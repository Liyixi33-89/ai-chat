/**
 * 初始化管理员账户脚本
 * 运行: node scripts/init-admin.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123123';

async function initAdmin() {
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');

    // 检查管理员是否已存在
    const existingAdmin = await User.findOne({ username: ADMIN_USERNAME });
    
    if (existingAdmin) {
      // 强制更新为管理员角色
      existingAdmin.role = 'admin';
      await User.updateOne(
        { _id: existingAdmin._id },
        { $set: { role: 'admin' } }
      );
      console.log(`用户 "${ADMIN_USERNAME}" 已设置为管理员`);
    } else {
      // 创建新管理员
      const admin = new User({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        role: 'admin',
      });
      await admin.save();
      console.log(`管理员账户创建成功！`);
      console.log(`用户名: ${ADMIN_USERNAME}`);
      console.log(`密码: ${ADMIN_PASSWORD}`);
    }

    console.log('\n初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
}

initAdmin();
