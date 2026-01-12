/**
 * 管理员路由
 * 提供后台管理系统所需的 API
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import User from '../models/User.js';
import Knowledge from '../models/Knowledge.js';
import VectorChunk from '../models/VectorChunk.js';
import CategoryPrompt from '../models/CategoryPrompt.js';
import { getEmbedding, processDocument } from '../services/ragService.js';
import { classifyDocument } from '../services/classifyService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt', '.md', '.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PDF、TXT、MD、Excel(xlsx/xls)、CSV 格式的文件'));
    }
  },
});

/**
 * 解码文件名（处理中文乱码问题）
 */
const decodeFileName = (filename) => {
  try {
    const buffer = Buffer.from(filename, 'latin1');
    const decoded = buffer.toString('utf-8');
    if (decoded && !decoded.includes('\ufffd')) {
      return decoded;
    }
  } catch (e) {}
  
  try {
    return decodeURIComponent(filename);
  } catch (e) {}
  
  return filename;
};

/**
 * 解析表格文件（Excel/CSV）
 */
const parseSpreadsheet = (buffer, fileType) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allSheetsText = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (jsonData.length === 0) return;

    const headers = jsonData[0].map((h, i) => h || `列${i + 1}`);
    const sheetText = [];
    sheetText.push(`【工作表: ${sheetName}】`);
    sheetText.push(`表头: ${headers.join(' | ')}`);
    sheetText.push('');

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row.every(cell => cell === '' || cell === null || cell === undefined)) continue;
      
      const rowParts = [];
      headers.forEach((header, j) => {
        const value = row[j];
        if (value !== '' && value !== null && value !== undefined) {
          rowParts.push(`${header}: ${value}`);
        }
      });
      
      if (rowParts.length > 0) {
        sheetText.push(`第${i}行: ${rowParts.join(', ')}`);
      }
    }

    if (sheetText.length > 2) {
      allSheetsText.push(sheetText.join('\n'));
    }
  });

  return allSheetsText.join('\n\n');
};

/**
 * 使用 pdfjs-dist 解析 PDF
 */
const parsePDF = async (buffer) => {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      } catch (pageError) {
        console.error(`PDF 第 ${i} 页解析失败:`, pageError.message);
        // 继续处理其他页面
      }
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF 解析失败:', error);
    throw new Error(`PDF 解析失败: ${error.message}`);
  }
};

/**
 * 解析文件内容
 */
const parseFileContent = async (filePath, fileType) => {
  try {
    const buffer = fs.readFileSync(filePath);

    switch (fileType) {
      case 'pdf':
        return await parsePDF(buffer);
      case 'txt':
      case 'md':
        return buffer.toString('utf-8');
      case 'xlsx':
      case 'xls':
      case 'csv':
        return parseSpreadsheet(buffer, fileType);
      default:
        throw new Error(`不支持的文件类型: ${fileType}`);
    }
  } catch (error) {
    console.error('文件解析失败:', error);
    throw new Error(`文件解析失败: ${error.message}`);
  }
};

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ai-chat-secret-key-2024';

// 管理员认证中间件
const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '请先登录' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '无权限访问' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: '认证失败' });
  }
};

// ==================== 认证相关 ====================

// 管理员登录
router.post('/auth/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: '非管理员账户，无权登录' });
    }

    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({ error: '登录失败，请重试' });
  }
});

// ==================== 统计数据 ====================

// 获取系统概览统计
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const [totalDocuments, totalChunks, totalUsers] = await Promise.all([
      Knowledge.countDocuments(),
      VectorChunk.countDocuments(),
      User.countDocuments(),
    ]);

    // 按文件类型统计
    const documentsByType = await Knowledge.aggregate([
      { $group: { _id: '$fileType', count: { $sum: 1 } } },
    ]);

    // 最近上传的文档
    const recentDocuments = await Knowledge.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name status createdAt');

    res.json({
      totalDocuments,
      totalChunks,
      totalUsers,
      documentsByType: documentsByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentDocuments,
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// ==================== 文档管理 ====================

// 上传新文档（管理员）
router.post('/admin/knowledge/upload', adminAuth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // 处理 multer 错误
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ 
            error: '文件过大，最大支持 100MB',
            code: 'FILE_TOO_LARGE'
          });
        }
        return res.status(400).json({ error: `上传错误: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }
    // 没有错误才继续执行后续处理
    next();
  });
}, async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }

    const { originalname, size, path: uploadedPath } = req.file;
    filePath = uploadedPath;
    
    // 解码文件名，处理中文乱码
    const decodedOriginalName = decodeFileName(originalname);
    const ext = path.extname(decodedOriginalName).toLowerCase().slice(1);
    const docName = req.body.name || decodedOriginalName.replace(/\.[^/.]+$/, '');

    // 先解析文件内容
    const content = await parseFileContent(filePath, ext);
    
    if (!content || content.trim().length === 0) {
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(400).json({ error: '文件内容为空，请检查文件' });
    }

    // 创建知识库记录（使用管理员的 userId）
    const knowledge = new Knowledge({
      userId: req.user._id,
      name: docName,
      originalName: decodedOriginalName,
      fileType: ext,
      fileSize: size,
      content: content,
      status: 'processing',
    });

    await knowledge.save();

    // 删除临时文件
    try { fs.unlinkSync(filePath); } catch (e) {}
    filePath = null;

    // 异步处理向量化
    (async () => {
      try {
        await processDocument(knowledge._id, req.user._id, content);
        console.log(`[Admin] 文档 "${docName}" 向量化处理完成`);
      } catch (error) {
        console.error('[Admin] 向量化处理失败:', error);
        knowledge.status = 'error';
        knowledge.errorMessage = error.message;
        await knowledge.save();
      }
    })();

    res.json({
      success: true,
      document: {
        _id: knowledge._id,
        name: knowledge.name,
        status: knowledge.status,
      },
      message: '文档上传成功，正在处理向量化...',
    });
  } catch (error) {
    console.error('[Admin] 上传文档失败:', error);
    if (filePath) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    res.status(500).json({ error: error.message });
  }
});

// 获取所有文档列表
router.get('/admin/knowledge', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (category) {
      query.category = category;
    }

    const [documents, total, categories] = await Promise.all([
      Knowledge.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'username'),
      Knowledge.countDocuments(query),
      Knowledge.distinct('category'),
    ]);

    res.json({ documents, total, page: Number(page), limit: Number(limit), categories });
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ error: '获取文档列表失败' });
  }
});

// 获取单个文档详情
router.get('/admin/knowledge/:id', adminAuth, async (req, res) => {
  try {
    const document = await Knowledge.findById(req.params.id)
      .populate('userId', 'username');
    
    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }

    res.json({ document });
  } catch (error) {
    console.error('获取文档详情失败:', error);
    res.status(500).json({ error: '获取文档详情失败' });
  }
});

// 更新文档信息
router.put('/admin/knowledge/:id', adminAuth, async (req, res) => {
  try {
    const { name, content, category } = req.body;
    const document = await Knowledge.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }

    // 更新文档信息
    if (name) document.name = name;
    if (category !== undefined) document.category = category;
    
    // 如果内容有变化，需要重新生成向量
    if (content && content !== document.content) {
      document.content = content;
      document.status = 'processing';
      await document.save();

      // 异步重新处理向量
      processDocumentVectors(document).catch(err => {
        console.error('重新处理向量失败:', err);
      });
    } else {
      await document.save();
    }

    res.json({ success: true, document });
  } catch (error) {
    console.error('更新文档失败:', error);
    res.status(500).json({ error: '更新文档失败' });
  }
});

// 删除文档
router.delete('/admin/knowledge/:id', adminAuth, async (req, res) => {
  try {
    const document = await Knowledge.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }

    // 删除关联的向量块
    await VectorChunk.deleteMany({ knowledgeId: document._id });
    
    // 删除文档
    await Knowledge.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('删除文档失败:', error);
    res.status(500).json({ error: '删除文档失败' });
  }
});

// ==================== 向量块管理 ====================

// 获取文档的所有向量块
router.get('/admin/chunks/:knowledgeId', adminAuth, async (req, res) => {
  try {
    const chunks = await VectorChunk.find({ knowledgeId: req.params.knowledgeId })
      .select('-embedding') // 不返回向量数据，太大
      .sort({ chunkIndex: 1 });

    res.json({ chunks });
  } catch (error) {
    console.error('获取向量块失败:', error);
    res.status(500).json({ error: '获取向量块失败' });
  }
});

// 更新向量块内容
router.put('/admin/chunks/:id', adminAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const chunk = await VectorChunk.findById(req.params.id);

    if (!chunk) {
      return res.status(404).json({ error: '向量块不存在' });
    }

    // 更新内容并重新生成向量
    chunk.content = content;
    const embedding = await getEmbedding(content);
    chunk.embedding = embedding;
    await chunk.save();

    res.json({ success: true, chunk: { ...chunk.toObject(), embedding: undefined } });
  } catch (error) {
    console.error('更新向量块失败:', error);
    res.status(500).json({ error: '更新向量块失败' });
  }
});

// 删除向量块
router.delete('/admin/chunks/:id', adminAuth, async (req, res) => {
  try {
    const chunk = await VectorChunk.findById(req.params.id);
    
    if (!chunk) {
      return res.status(404).json({ error: '向量块不存在' });
    }

    // 更新文档的分块数量
    await Knowledge.findByIdAndUpdate(chunk.knowledgeId, {
      $inc: { chunkCount: -1 },
    });

    await VectorChunk.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('删除向量块失败:', error);
    res.status(500).json({ error: '删除向量块失败' });
  }
});

// 添加新向量块
router.post('/admin/chunks', adminAuth, async (req, res) => {
  try {
    const { knowledgeId, content } = req.body;

    const document = await Knowledge.findById(knowledgeId);
    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }

    // 获取当前最大的 chunkIndex
    const lastChunk = await VectorChunk.findOne({ knowledgeId })
      .sort({ chunkIndex: -1 });
    const chunkIndex = lastChunk ? lastChunk.chunkIndex + 1 : 0;

    // 生成向量
    const embedding = await getEmbedding(content);

    // 创建新向量块
    const chunk = new VectorChunk({
      knowledgeId,
      userId: document.userId,
      content,
      chunkIndex,
      embedding,
    });
    await chunk.save();

    // 更新文档的分块数量
    await Knowledge.findByIdAndUpdate(knowledgeId, {
      $inc: { chunkCount: 1 },
    });

    res.json({ success: true, chunk: { ...chunk.toObject(), embedding: undefined } });
  } catch (error) {
    console.error('添加向量块失败:', error);
    res.status(500).json({ error: '添加向量块失败' });
  }
});

// ==================== 分类管理 ====================

// 获取所有分类 Prompt
router.get('/admin/category-prompts', adminAuth, async (req, res) => {
  try {
    const prompts = await CategoryPrompt.find()
      .sort({ isDefault: -1, createdAt: -1 })
      .populate('createdBy', 'username');
    res.json({ prompts });
  } catch (error) {
    console.error('获取分类 Prompt 失败:', error);
    res.status(500).json({ error: '获取分类 Prompt 失败' });
  }
});

// 创建分类 Prompt
router.post('/admin/category-prompts', adminAuth, async (req, res) => {
  try {
    const { name, prompt, categories, isDefault } = req.body;
    
    if (!name || !prompt || !categories || categories.length === 0) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      await CategoryPrompt.updateMany({}, { isDefault: false });
    }

    const categoryPrompt = new CategoryPrompt({
      name,
      prompt,
      categories,
      isDefault: isDefault || false,
      createdBy: req.user._id,
    });

    await categoryPrompt.save();
    res.json({ success: true, prompt: categoryPrompt });
  } catch (error) {
    console.error('创建分类 Prompt 失败:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Prompt 名称已存在' });
    }
    res.status(500).json({ error: '创建分类 Prompt 失败' });
  }
});

// 更新分类 Prompt
router.put('/admin/category-prompts/:id', adminAuth, async (req, res) => {
  try {
    const { name, prompt, categories, isDefault } = req.body;
    const categoryPrompt = await CategoryPrompt.findById(req.params.id);

    if (!categoryPrompt) {
      return res.status(404).json({ error: 'Prompt 不存在' });
    }

    // 如果设为默认，先取消其他默认
    if (isDefault && !categoryPrompt.isDefault) {
      await CategoryPrompt.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    }

    if (name) categoryPrompt.name = name;
    if (prompt) categoryPrompt.prompt = prompt;
    if (categories) categoryPrompt.categories = categories;
    if (isDefault !== undefined) categoryPrompt.isDefault = isDefault;

    await categoryPrompt.save();
    res.json({ success: true, prompt: categoryPrompt });
  } catch (error) {
    console.error('更新分类 Prompt 失败:', error);
    res.status(500).json({ error: '更新分类 Prompt 失败' });
  }
});

// 删除分类 Prompt
router.delete('/admin/category-prompts/:id', adminAuth, async (req, res) => {
  try {
    const prompt = await CategoryPrompt.findById(req.params.id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt 不存在' });
    }

    await CategoryPrompt.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('删除分类 Prompt 失败:', error);
    res.status(500).json({ error: '删除分类 Prompt 失败' });
  }
});

// 获取所有分类列表
router.get('/admin/categories', adminAuth, async (req, res) => {
  try {
    const categories = await Knowledge.distinct('category');
    res.json({ categories: categories.filter(c => c) });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

// 批量更新文档分类
router.put('/admin/knowledge/batch-category', adminAuth, async (req, res) => {
  try {
    const { documentIds, category } = req.body;
    
    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({ error: '请选择要更新的文档' });
    }

    await Knowledge.updateMany(
      { _id: { $in: documentIds } },
      { $set: { category: category || '未分类' } }
    );

    res.json({ success: true, message: `已更新 ${documentIds.length} 个文档的分类` });
  } catch (error) {
    console.error('批量更新分类失败:', error);
    res.status(500).json({ error: '批量更新分类失败' });
  }
});

// 使用 AI 自动分类文档
router.post('/admin/knowledge/auto-classify', adminAuth, async (req, res) => {
  try {
    const { documentIds, promptId } = req.body;
    
    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({ error: '请选择要分类的文档' });
    }

    // 获取分类 Prompt
    let categoryPrompt;
    if (promptId) {
      categoryPrompt = await CategoryPrompt.findById(promptId);
    } else {
      // 使用默认 Prompt
      categoryPrompt = await CategoryPrompt.findOne({ isDefault: true });
    }

    if (!categoryPrompt) {
      return res.status(400).json({ error: '请先创建分类 Prompt 或指定一个 Prompt' });
    }

    // 获取文档
    const documents = await Knowledge.find({ _id: { $in: documentIds } });
    
    // 使用 AI 进行分类
    const results = [];
    for (const doc of documents) {
      try {
        const category = await classifyDocument(doc.content, categoryPrompt.prompt, categoryPrompt.categories);
        doc.category = category;
        await doc.save();
        results.push({ id: doc._id, name: doc.name, category, success: true });
      } catch (error) {
        console.error(`文档 ${doc.name} 分类失败:`, error);
        results.push({ id: doc._id, name: doc.name, error: error.message, success: false });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('自动分类失败:', error);
    res.status(500).json({ error: '自动分类失败' });
  }
});

// ==================== 用户管理 ====================

// 获取所有用户
router.get('/admin/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 删除用户
router.delete('/admin/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: '不能删除管理员账户' });
    }

    // 删除用户的所有数据
    const knowledgeIds = await Knowledge.find({ userId: user._id }).distinct('_id');
    await VectorChunk.deleteMany({ knowledgeId: { $in: knowledgeIds } });
    await Knowledge.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// ==================== 辅助函数 ====================

// 重新处理文档向量
async function processDocumentVectors(document) {
  try {
    // 删除旧的向量块
    await VectorChunk.deleteMany({ knowledgeId: document._id });

    // 分块
    const chunks = splitTextIntoChunks(document.content);
    
    // 批量生成向量
    const batchSize = 10;
    let chunkCount = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await Promise.all(
        batch.map(chunk => getEmbedding(chunk))
      );

      // 保存向量块
      await VectorChunk.insertMany(
        batch.map((content, index) => ({
          knowledgeId: document._id,
          userId: document.userId,
          content,
          chunkIndex: i + index,
          embedding: embeddings[index],
        }))
      );

      chunkCount += batch.length;
    }

    // 更新文档状态
    document.chunkCount = chunkCount;
    document.status = 'ready';
    await document.save();

    console.log(`文档 ${document.name} 向量重新生成完成，共 ${chunkCount} 个分块`);
  } catch (error) {
    document.status = 'error';
    document.errorMessage = error.message;
    await document.save();
    throw error;
  }
}

// 文本分块函数
function splitTextIntoChunks(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('。', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const lastEnglishPeriod = text.lastIndexOf('.', end);
      
      const breakPoint = Math.max(lastPeriod, lastNewline, lastEnglishPeriod);
      
      if (breakPoint > start + chunkSize * 0.5) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter(chunk => chunk.length > 0);
}

export default router;
