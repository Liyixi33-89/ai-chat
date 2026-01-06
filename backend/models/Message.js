/**
 * 消息模型
 */
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// 索引优化查询
messageSchema.index({ sessionId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
