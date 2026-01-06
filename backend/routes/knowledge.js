/**
 * 知识库路由
 * 处理文档上传、管理和检索
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { authMiddleware } from '../middleware/auth.js';
import { Knowledge, VectorChunk } from '../models/index.js';
import { processDocument, semanticSearch } from '../services/ragService.js';

/**
 * 解码文件名（处理中文乱码问题）
 * Multer 2.x 对中文文件名可能使用 Latin1 编码，需要转换为 UTF-8
 */
const decodeFileName = (filename) => {
  try {
    // 尝试将 Latin1 编码的字符串转换为 UTF-8
    const buffer = Buffer.from(filename, 'latin1');
    const decoded = buffer.toString('utf-8');
    // 检查是否是有效的 UTF-8 字符串（非乱码）
    if (decoded && !decoded.includes('\ufffd')) {
      return decoded;
    }
  } catch (e) {
    // 转换失败
  }
  
  try {
    // 尝试 URL 解码（某些情况下文件名可能被 URL 编码）
    return decodeURIComponent(filename);
  } catch (e) {
    // 解码失败，返回原始文件名
  }
  
  return filename;
};

/**
 * 解析表格文件（Excel/CSV）
 * 将表格转换为结构化文本，便于向量化检索
 */
const parseSpreadsheet = (buffer, fileType) => {
  // 读取工作簿
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allSheetsText = [];

  // 遍历所有工作表
  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const worksheet = workbook.Sheets[sheetName];
    
    // 获取工作表范围
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // 将工作表转换为 JSON 数组（包含表头）
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (jsonData.length === 0) return;

    // 获取表头（第一行）
    const headers = jsonData[0].map((h, i) => h || `列${i + 1}`);
    
    // 构建结构化文本
    const sheetText = [];
    sheetText.push(`【工作表: ${sheetName}】`);
    sheetText.push(`表头: ${headers.join(' | ')}`);
    sheetText.push('');

    // 处理数据行（跳过表头）
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      // 跳过空行
      if (row.every(cell => cell === '' || cell === null || cell === undefined)) continue;
      
      // 将每行转换为「字段名: 值」的格式，便于语义理解
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
 * 解析表格文件为简洁的行式文本（适合大表格）
 * 每行作为独立的检索单元
 */
const parseSpreadsheetByRows = (buffer, fileType) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allRows = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (jsonData.length < 2) return;

    const headers = jsonData[0].map((h, i) => h || `列${i + 1}`);
    
    // 每行数据作为独立文本块
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row.every(cell => cell === '' || cell === null || cell === undefined)) continue;
      
      const rowText = headers
        .map((header, j) => {
          const value = row[j];
          return value !== '' && value !== null && value !== undefined ? `${header}:${value}` : null;
        })
        .filter(Boolean)
        .join('; ');
      
      if (rowText) {
        allRows.push(`[${sheetName}] ${rowText}`);
      }
    }
  });

  return allRows.join('\n');
};

// 使用 pdfjs-dist 解析 PDF（更稳定）
const parsePDF = async (buffer) => {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  // 将 Buffer 转换为 Uint8Array
  const uint8Array = new Uint8Array(buffer);
  
  // 加载 PDF 文档
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;
  
  // 提取所有页面的文本
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText.trim();
};

const router = express.Router();
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
 * 解析文件内容
 */
const parseFileContent = async (filePath, fileType) => {
  const buffer = fs.readFileSync(filePath);

  switch (fileType) {
    case 'pdf':
      // 使用 pdfjs-dist 解析 PDF
      const pdfText = await parsePDF(buffer);
      return pdfText;

    case 'txt':
    case 'md':
      return buffer.toString('utf-8');

    case 'xlsx':
    case 'xls':
    case 'csv':
      // 解析表格文件，转换为结构化文本
      const spreadsheetText = parseSpreadsheet(buffer, fileType);
      console.log(`表格解析完成，文本长度: ${spreadsheetText.length}`);
      return spreadsheetText;

    default:
      throw new Error(`不支持的文件类型: ${fileType}`);
  }
};

/**
 * 获取知识库列表
 * GET /api/knowledge
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const knowledges = await Knowledge.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: knowledges.map(k => ({
        id: k._id,
        name: k.name,
        originalName: k.originalName,
        fileType: k.fileType,
        fileSize: k.fileSize,
        chunkCount: k.chunkCount,
        status: k.status,
        errorMessage: k.errorMessage,
        createdAt: k.createdAt,
      })),
    });
  } catch (error) {
    console.error('获取知识库列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 上传文档
 * POST /api/knowledge/upload
 */
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请选择文件' });
    }

    const { originalname, size, path: uploadedPath } = req.file;
    filePath = uploadedPath;
    
    // 解码文件名，处理中文乱码
    const decodedOriginalName = decodeFileName(originalname);
    console.log('原始文件名:', originalname);
    console.log('解码后文件名:', decodedOriginalName);
    
    const ext = path.extname(decodedOriginalName).toLowerCase().slice(1);
    const docName = req.body.name || decodedOriginalName.replace(/\.[^/.]+$/, '');

    // 先解析文件内容
    const content = await parseFileContent(filePath, ext);
    
    if (!content || content.trim().length === 0) {
      // 删除临时文件
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(400).json({ success: false, error: '文件内容为空，请检查文件' });
    }

    // 创建知识库记录（包含内容）
    const knowledge = new Knowledge({
      userId: req.userId,
      name: docName,
      originalName: decodedOriginalName,  // 使用解码后的文件名
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
        await processDocument(knowledge._id, req.userId, content);
        console.log(`文档 "${docName}" 向量化处理完成`);
      } catch (error) {
        console.error('向量化处理失败:', error);
        knowledge.status = 'error';
        knowledge.errorMessage = error.message;
        await knowledge.save();
      }
    })();

    res.json({
      success: true,
      data: {
        id: knowledge._id,
        name: knowledge.name,
        status: knowledge.status,
      },
      message: '文档上传成功，正在处理向量化...',
    });
  } catch (error) {
    console.error('上传文档失败:', error);
    // 清理临时文件
    if (filePath) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取单个知识库详情
 * GET /api/knowledge/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const knowledge = await Knowledge.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).lean();

    if (!knowledge) {
      return res.status(404).json({ success: false, error: '知识库不存在' });
    }

    res.json({
      success: true,
      data: {
        id: knowledge._id,
        name: knowledge.name,
        originalName: knowledge.originalName,
        fileType: knowledge.fileType,
        fileSize: knowledge.fileSize,
        chunkCount: knowledge.chunkCount,
        status: knowledge.status,
        errorMessage: knowledge.errorMessage,
        contentPreview: knowledge.content?.substring(0, 500) + '...',
        createdAt: knowledge.createdAt,
        updatedAt: knowledge.updatedAt,
      },
    });
  } catch (error) {
    console.error('获取知识库详情失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 删除知识库
 * DELETE /api/knowledge/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const knowledge = await Knowledge.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!knowledge) {
      return res.status(404).json({ success: false, error: '知识库不存在' });
    }

    // 删除关联的向量块
    await VectorChunk.deleteMany({ knowledgeId: req.params.id });

    // 删除知识库记录
    await Knowledge.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: '知识库删除成功' });
  } catch (error) {
    console.error('删除知识库失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 知识库搜索
 * POST /api/knowledge/search
 */
router.post('/search', authMiddleware, async (req, res) => {
  try {
    const { query, knowledgeIds, topK = 5, minScore = 0.5 } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: '请输入搜索内容' });
    }

    const results = await semanticSearch(query, req.userId, {
      topK,
      minScore,
      knowledgeIds,
    });

    res.json({
      success: true,
      data: results.map(r => ({
        content: r.content,
        score: r.score.toFixed(4),
        knowledgeId: r.knowledgeId,
        knowledgeName: r.knowledgeName,
        chunkIndex: r.chunkIndex,
      })),
    });
  } catch (error) {
    console.error('知识库搜索失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 重新处理文档
 * POST /api/knowledge/:id/reprocess
 */
router.post('/:id/reprocess', authMiddleware, async (req, res) => {
  try {
    const knowledge = await Knowledge.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!knowledge) {
      return res.status(404).json({ success: false, error: '知识库不存在' });
    }

    // 删除旧的向量块
    await VectorChunk.deleteMany({ knowledgeId: req.params.id });

    // 重置状态
    knowledge.status = 'processing';
    knowledge.chunkCount = 0;
    knowledge.errorMessage = '';
    await knowledge.save();

    // 异步重新处理
    (async () => {
      try {
        await processDocument(knowledge._id, req.userId, knowledge.content);
        console.log(`文档 "${knowledge.name}" 重新处理完成`);
      } catch (error) {
        console.error('重新处理文档失败:', error);
        knowledge.status = 'error';
        knowledge.errorMessage = error.message;
        await knowledge.save();
      }
    })();

    res.json({ success: true, message: '文档正在重新处理中...' });
  } catch (error) {
    console.error('重新处理文档失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
