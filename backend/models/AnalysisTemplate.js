/**
 * 分析模板模型
 * 存储用于文档分析的 Prompt 配置
 */
import mongoose from 'mongoose';

const analysisTemplateSchema = new mongoose.Schema({
  // 模板名称
  name: {
    type: String,
    required: true,
  },
  // 模板描述
  description: {
    type: String,
    default: '',
  },
  // 系统 Prompt（角色设定）
  systemPrompt: {
    type: String,
    required: true,
  },
  // 用户 Prompt 模板（支持变量如 {title}、{content}）
  userPromptTemplate: {
    type: String,
    required: true,
  },
  // 模板变量定义
  variables: [{
    name: { type: String, required: true },  // 变量名
    label: { type: String, required: true }, // 显示名称
    type: { type: String, enum: ['text', 'textarea', 'select'], default: 'text' }, // 输入类型
    options: [String], // select 类型的选项
    required: { type: Boolean, default: false },
    defaultValue: { type: String, default: '' },
  }],
  // 模板分类（如：产品经理、教育、写作等）
  category: {
    type: String,
    default: '通用',
  },
  // 示例输入
  exampleInput: {
    type: String,
    default: '',
  },
  // 示例输出
  exampleOutput: {
    type: String,
    default: '',
  },
  // 是否公开（所有用户可见）
  isPublic: {
    type: Boolean,
    default: true,
  },
  // 是否为系统预设模板
  isSystem: {
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

analysisTemplateSchema.pre('save', function() {
  this.updatedAt = new Date();
});

const AnalysisTemplate = mongoose.model('AnalysisTemplate', analysisTemplateSchema);
export default AnalysisTemplate;
