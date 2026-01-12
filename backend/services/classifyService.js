/**
 * 文档分类服务
 * 使用 AI 对文档进行自动分类
 */

// Ollama 配置
const OLLAMA_BASE_URL = 'http://localhost:11434';
const CHAT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

/**
 * 使用 AI 对文档内容进行分类
 * @param {string} content - 文档内容
 * @param {string} prompt - 分类 Prompt
 * @param {string[]} categories - 可用分类列表
 * @returns {Promise<string>} - 分类结果
 */
export const classifyDocument = async (content, prompt, categories) => {
  try {
    console.log('开始文档分类，分类选项:', categories);
    
    // 检查参数
    if (!content || content.trim() === '') {
      throw new Error('文档内容为空');
    }
    if (!prompt) {
      throw new Error('分类 Prompt 为空');
    }
    if (!categories || categories.length === 0) {
      throw new Error('分类选项为空');
    }
    
    // 截取文档内容（避免太长）
    const maxContentLength = 3000;
    const truncatedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '...'
      : content;

    // 构建分类提示词
    const systemPrompt = `${prompt}

可用的分类选项：
${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

请注意：
1. 只返回一个分类名称，不要返回其他内容
2. 必须从上述分类选项中选择一个
3. 如果文档内容不属于任何分类，请返回"未分类"`;

    const userPrompt = `请对以下文档内容进行分类：

${truncatedContent}

请直接返回分类名称：`;

    console.log('调用 Ollama API，模型:', CHAT_MODEL);
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: {
          temperature: 0.1, // 低温度以获得更确定的结果
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama API 错误响应:', errorText);
      throw new Error(`AI API 请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Ollama API 响应:', JSON.stringify(data).substring(0, 200));
    
    const result = data.message?.content?.trim() || '';

    // 验证返回的分类是否在可用列表中
    const normalizedResult = result.replace(/['"]/g, '').trim();
    
    // 查找匹配的分类
    const matchedCategory = categories.find(
      c => c.toLowerCase() === normalizedResult.toLowerCase() ||
           normalizedResult.toLowerCase().includes(c.toLowerCase())
    );

    const finalCategory = matchedCategory || '未分类';
    console.log('分类结果:', finalCategory, '(原始响应:', normalizedResult, ')');
    
    return finalCategory;
  } catch (error) {
    console.error('文档分类失败:', error.message);
    throw error;
  }
};

/**
 * 批量分类文档
 * @param {Array<{id: string, content: string}>} documents - 文档列表
 * @param {string} prompt - 分类 Prompt
 * @param {string[]} categories - 可用分类列表
 * @returns {Promise<Array<{id: string, category: string}>>} - 分类结果
 */
export const batchClassifyDocuments = async (documents, prompt, categories) => {
  const results = [];
  
  for (const doc of documents) {
    try {
      const category = await classifyDocument(doc.content, prompt, categories);
      results.push({ id: doc.id, category, success: true });
    } catch (error) {
      results.push({ id: doc.id, error: error.message, success: false });
    }
  }
  
  return results;
};

export default {
  classifyDocument,
  batchClassifyDocuments,
};
