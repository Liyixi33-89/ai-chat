/**
 * 知识库文档模型
 * 存储上传文档的元数据
 */
import mongoose from 'mongoose';

const knowledgeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
    enum: ['pdf', 'txt', 'md', 'docx'],
  },
  fileSize: {
    type: Number,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  chunkCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'error'],
    default: 'processing',
  },
  errorMessage: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Mongoose 9.x 中间件不需要 next 回调，直接返回即可
knowledgeSchema.pre('save', function() {
  this.updatedAt = new Date();
});

const Knowledge = mongoose.model('Knowledge', knowledgeSchema);
export default Knowledge;
