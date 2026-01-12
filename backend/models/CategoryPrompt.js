/**
 * 分类 Prompt 模型
 * 存储用于文档分类的 Prompt 配置
 */
import mongoose from 'mongoose';

const categoryPromptSchema = new mongoose.Schema({
  // Prompt 名称
  name: {
    type: String,
    required: true,
    unique: true,
  },
  // Prompt 内容
  prompt: {
    type: String,
    required: true,
  },
  // 可用的分类选项
  categories: [{
    type: String,
    required: true,
  }],
  // 是否为默认 Prompt
  isDefault: {
    type: Boolean,
    default: false,
  },
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

categoryPromptSchema.pre('save', function() {
  this.updatedAt = new Date();
});

const CategoryPrompt = mongoose.model('CategoryPrompt', categoryPromptSchema);
export default CategoryPrompt;
