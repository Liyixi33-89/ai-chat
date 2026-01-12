import mongoose from 'mongoose';

// 词条模型 - 用于自定义问答
const entrySchema = new mongoose.Schema({
  // 关键词列表（支持多个关键词匹配同一个词条）
  keywords: [{
    type: String,
    required: true,
    trim: true
  }],
  // 问题/触发语句（用于模糊匹配）
  question: {
    type: String,
    required: true,
    trim: true
  },
  // 预设答案
  answer: {
    type: String,
    required: true
  },
  // 匹配类型：exact（精确匹配）、contains（包含匹配）、regex（正则匹配）
  matchType: {
    type: String,
    enum: ['exact', 'contains', 'regex'],
    default: 'contains'
  },
  // 优先级（数字越大优先级越高）
  priority: {
    type: Number,
    default: 0
  },
  // 分类标签
  category: {
    type: String,
    default: '默认'
  },
  // 是否启用
  isActive: {
    type: Boolean,
    default: true
  },
  // 使用次数统计
  hitCount: {
    type: Number,
    default: 0
  },
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // 备注
  remark: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 创建索引以提高搜索效率
entrySchema.index({ keywords: 1 });
entrySchema.index({ question: 'text' });
entrySchema.index({ isActive: 1, priority: -1 });

// 检查用户输入是否匹配词条
entrySchema.statics.findMatchingEntry = async function(userInput) {
  const input = userInput.trim().toLowerCase();
  
  // 获取所有启用的词条，按优先级排序
  const entries = await this.find({ isActive: true }).sort({ priority: -1 });
  
  for (const entry of entries) {
    let isMatch = false;
    
    switch (entry.matchType) {
      case 'exact':
        // 精确匹配：关键词或问题完全一致
        isMatch = entry.keywords.some(kw => kw.toLowerCase() === input) ||
                  entry.question.toLowerCase() === input;
        break;
        
      case 'contains':
        // 包含匹配：用户输入包含任意关键词，或包含问题
        isMatch = entry.keywords.some(kw => input.includes(kw.toLowerCase())) ||
                  input.includes(entry.question.toLowerCase()) ||
                  entry.question.toLowerCase().includes(input);
        break;
        
      case 'regex':
        // 正则匹配
        try {
          const regex = new RegExp(entry.question, 'i');
          isMatch = regex.test(input);
        } catch (e) {
          // 正则表达式无效，跳过
          isMatch = false;
        }
        break;
    }
    
    if (isMatch) {
      // 更新命中次数
      await this.findByIdAndUpdate(entry._id, { $inc: { hitCount: 1 } });
      return entry;
    }
  }
  
  return null;
};

const Entry = mongoose.model('Entry', entrySchema);

export default Entry;
