/**
 * RAG 服务
 * 处理文档向量化和语义检索
 */
import { Knowledge, VectorChunk } from '../models/index.js';

// Ollama 配置
const OLLAMA_BASE_URL = 'http://localhost:11434';
const EMBEDDING_MODEL = 'nomic-embed-text';

/**
 * 文本分块
 * 将长文本分割成适合向量化的小块
 */
export const splitTextIntoChunks = (text, options = {}) => {
  const {
    chunkSize = 500,      // 每块字符数
    chunkOverlap = 50,    // 重叠字符数
  } = options;

  const chunks = [];
  let start = 0;

  // 清理文本
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  while (start < cleanText.length) {
    let end = start + chunkSize;
    
    // 尝试在句子边界处断开
    if (end < cleanText.length) {
      const lastPeriod = cleanText.lastIndexOf('。', end);
      const lastNewline = cleanText.lastIndexOf('\n', end);
      const lastDot = cleanText.lastIndexOf('. ', end);
      
      const breakPoint = Math.max(lastPeriod, lastNewline, lastDot);
      
      if (breakPoint > start + chunkSize / 2) {
        end = breakPoint + 1;
      }
    }

    const chunk = cleanText.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - chunkOverlap;
  }

  return chunks;
};

/**
 * 获取文本的向量嵌入
 */
export const getEmbedding = async (text) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.embeddings[0];
  } catch (error) {
    console.error('获取向量嵌入失败:', error);
    throw error;
  }
};

/**
 * 批量获取向量嵌入
 */
export const getEmbeddings = async (texts) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.embeddings;
  } catch (error) {
    console.error('批量获取向量嵌入失败:', error);
    throw error;
  }
};

/**
 * 计算向量余弦相似度
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) {
    throw new Error('向量维度不匹配');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
};

/**
 * 处理文档并创建向量
 * @param {string} knowledgeId - 知识库文档ID
 * @param {string} userId - 用户ID
 * @param {string} content - 文档内容
 */
export const processDocument = async (knowledgeId, userId, content) => {
  try {
    // 分块
    const chunks = splitTextIntoChunks(content);
    console.log(`文档分块完成，共 ${chunks.length} 块`);

    // 批量处理（每批10个）
    const batchSize = 10;
    const vectorChunks = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await getEmbeddings(batch);

      for (let j = 0; j < batch.length; j++) {
        vectorChunks.push({
          knowledgeId,
          userId,
          content: batch[j],
          chunkIndex: i + j,
          embedding: embeddings[j],
        });
      }

      console.log(`向量化进度: ${Math.min(i + batchSize, chunks.length)}/${chunks.length}`);
    }

    // 批量插入向量块
    await VectorChunk.insertMany(vectorChunks);

    // 更新知识库状态
    await Knowledge.findByIdAndUpdate(knowledgeId, {
      status: 'ready',
      chunkCount: chunks.length,
    });

    console.log(`文档处理完成，共创建 ${vectorChunks.length} 个向量块`);
    return vectorChunks.length;
  } catch (error) {
    console.error('处理文档失败:', error);
    
    // 更新状态为错误
    await Knowledge.findByIdAndUpdate(knowledgeId, {
      status: 'error',
      errorMessage: error.message,
    });

    throw error;
  }
};

/**
 * 语义搜索
 * @param {string} query - 查询文本
 * @param {string} userId - 用户ID
 * @param {Object} options - 搜索选项
 */
export const semanticSearch = async (query, userId, options = {}) => {
  const {
    topK = 5,              // 返回最相似的K个结果
    minScore = 0.5,        // 最低相似度阈值
    knowledgeIds = null,   // 限定知识库ID（可选）
  } = options;

  try {
    // 获取查询向量
    const queryEmbedding = await getEmbedding(query);

    // 构建查询条件
    const filter = { userId };
    if (knowledgeIds && knowledgeIds.length > 0) {
      filter.knowledgeId = { $in: knowledgeIds };
    }

    // 获取所有相关向量块
    const chunks = await VectorChunk.find(filter).lean();

    if (chunks.length === 0) {
      return [];
    }

    // 计算相似度并排序
    const results = chunks
      .map(chunk => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .filter(chunk => chunk.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // 获取关联的知识库信息
    const knowledgeMap = {};
    const knowledgeIdsToFetch = [...new Set(results.map(r => r.knowledgeId.toString()))];
    
    if (knowledgeIdsToFetch.length > 0) {
      const knowledges = await Knowledge.find({ _id: { $in: knowledgeIdsToFetch } }).lean();
      knowledges.forEach(k => {
        knowledgeMap[k._id.toString()] = k;
      });
    }

    // 返回结果（不包含向量数据，减少传输量）
    return results.map(({ embedding, ...rest }) => ({
      ...rest,
      knowledgeName: knowledgeMap[rest.knowledgeId.toString()]?.name || '未知文档',
    }));
  } catch (error) {
    console.error('语义搜索失败:', error);
    throw error;
  }
};

/**
 * 生成 RAG 增强的提示词
 * @param {string} query - 用户问题
 * @param {Array} contexts - 检索到的上下文
 */
export const generateRAGPrompt = (query, contexts) => {
  if (!contexts || contexts.length === 0) {
    return query;
  }

  const contextText = contexts
    .map((ctx, i) => `[文档${i + 1}: ${ctx.knowledgeName}]\n${ctx.content}`)
    .join('\n\n---\n\n');

  return `基于以下知识库内容回答用户的问题。如果知识库中没有相关信息，请如实告知用户。

## 知识库内容
${contextText}

---

## 用户问题
${query}

## 回答要求
1. 优先使用知识库中的信息来回答
2. 如果知识库信息不足，可以结合你的知识补充
3. 明确标注哪些内容来自知识库`;
};

export default {
  splitTextIntoChunks,
  getEmbedding,
  getEmbeddings,
  cosineSimilarity,
  processDocument,
  semanticSearch,
  generateRAGPrompt,
};
