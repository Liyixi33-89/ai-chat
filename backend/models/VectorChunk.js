/**
 * 向量块模型
 * 存储文档分块和对应的向量
 */
import mongoose from 'mongoose';

const vectorChunkSchema = new mongoose.Schema({
  // 关联知识库文档
  knowledgeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Knowledge',
    required: true,
    index: true,
  },
  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // 块内容
  content: {
    type: String,
    required: true,
  },
  // 块索引（在文档中的顺序）
  chunkIndex: {
    type: Number,
    required: true,
  },
  // 向量嵌入 (768维向量，nomic-embed-text 输出)
  embedding: {
    type: [Number],
    required: true,
  },
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 复合索引优化查询
vectorChunkSchema.index({ userId: 1, knowledgeId: 1 });

export default mongoose.model('VectorChunk', vectorChunkSchema);
