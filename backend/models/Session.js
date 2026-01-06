/**
 * 会话模型
 */
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: '新对话',
    maxlength: 100,
  },
  model: {
    type: String,
    default: 'deepseek-r1:1.5b',
  },
}, {
  timestamps: true,
});

// 索引优化查询
sessionSchema.index({ userId: 1, updatedAt: -1 });

const Session = mongoose.model('Session', sessionSchema);

export default Session;
