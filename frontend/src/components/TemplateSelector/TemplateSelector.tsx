/**
 * 分析模板选择器组件
 * 用于在使用知识库时选择不同的分析模板
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Card,
  Tag,
  Empty,
  Input,
  Tabs,
  Button,
  Form,
  Modal,
  Space,
  Tooltip,
  message,
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  RobotOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';
import {
  getAnalysisTemplates,
  createAnalysisTemplate,
  updateAnalysisTemplate,
  deleteAnalysisTemplate,
  type AnalysisTemplate,
  type TemplateVariable,
} from '../../services/api';
import './TemplateSelector.css';

const { TextArea } = Input;

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  selectedTemplate: AnalysisTemplate | null;
  onSelectTemplate: (template: AnalysisTemplate | null) => void;
  onApplyTemplate: (systemPrompt: string, userPrompt: string) => void;
  knowledgeContent?: string; // 知识库内容，用于填充模板
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onClose,
  selectedTemplate,
  onSelectTemplate,
  onApplyTemplate,
  knowledgeContent = '',
}) => {
  const [templates, setTemplates] = useState<AnalysisTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AnalysisTemplate | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // 加载模板列表
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAnalysisTemplates();
      setTemplates(result.data);
      setCategories(['全部', ...result.categories]);
    } catch (error) {
      console.error('加载模板失败:', error);
      messageApi.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, loadTemplates]);

  // 当选择模板时，初始化变量值
  useEffect(() => {
    if (selectedTemplate) {
      const initialValues: Record<string, string> = {};
      selectedTemplate.variables.forEach((v) => {
        // 如果变量名是 content，自动填充知识库内容
        if (v.name === 'content' && knowledgeContent) {
          initialValues[v.name] = knowledgeContent;
        } else {
          initialValues[v.name] = v.defaultValue || '';
        }
      });
      setVariableValues(initialValues);
    }
  }, [selectedTemplate, knowledgeContent]);

  // 过滤模板
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === '全部' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // 应用模板
  const handleApplyTemplate = () => {
    if (!selectedTemplate) {
      messageApi.warning('请先选择一个模板');
      return;
    }

    // 检查必填变量
    const missingRequired = selectedTemplate.variables.filter(
      (v) => v.required && !variableValues[v.name]
    );
    if (missingRequired.length > 0) {
      messageApi.warning(`请填写必填项: ${missingRequired.map(v => v.label).join(', ')}`);
      return;
    }

    // 替换模板中的变量
    let userPrompt = selectedTemplate.userPromptTemplate;
    Object.entries(variableValues).forEach(([key, value]) => {
      userPrompt = userPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });

    onApplyTemplate(selectedTemplate.systemPrompt, userPrompt);
    messageApi.success('模板已应用');
    onClose();
  };

  // 打开编辑模态框
  const handleOpenEdit = (template?: AnalysisTemplate) => {
    setEditingTemplate(template || null);
    if (template) {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        category: template.category,
        systemPrompt: template.systemPrompt,
        userPromptTemplate: template.userPromptTemplate,
        variablesText: template.variables.map(v => `${v.name}:${v.label}:${v.type}:${v.required}`).join('\n'),
      });
    } else {
      form.resetFields();
    }
    setEditModalVisible(true);
  };

  // 保存模板
  const handleSaveTemplate = async () => {
    try {
      const values = await form.validateFields();
      
      // 解析变量定义
      const variables: TemplateVariable[] = values.variablesText
        ? values.variablesText.split('\n').filter((line: string) => line.trim()).map((line: string) => {
            const [name, label, type = 'text', required = 'false'] = line.split(':').map((s: string) => s.trim());
            return {
              name,
              label: label || name,
              type: type as 'text' | 'textarea' | 'select',
              required: required === 'true',
              defaultValue: '',
            };
          })
        : [];

      const templateData = {
        name: values.name,
        description: values.description || '',
        category: values.category || '自定义',
        systemPrompt: values.systemPrompt,
        userPromptTemplate: values.userPromptTemplate,
        variables,
      };

      if (editingTemplate) {
        await updateAnalysisTemplate(editingTemplate.id, templateData);
        messageApi.success('模板更新成功');
      } else {
        await createAnalysisTemplate(templateData);
        messageApi.success('模板创建成功');
      }

      setEditModalVisible(false);
      loadTemplates();
    } catch (error) {
      console.error('保存模板失败:', error);
      messageApi.error('保存失败');
    }
  };

  // 删除模板
  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteAnalysisTemplate(id);
      messageApi.success('删除成功');
      if (selectedTemplate?.id === id) {
        onSelectTemplate(null);
      }
      loadTemplates();
    } catch (error) {
      console.error('删除模板失败:', error);
      messageApi.error('删除失败');
    }
  };

  const renderVariableInput = (variable: TemplateVariable) => {
    const value = variableValues[variable.name] || '';
    const handleChange = (val: string) => {
      setVariableValues((prev) => ({ ...prev, [variable.name]: val }));
    };

    if (variable.type === 'textarea') {
      return (
        <TextArea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`请输入${variable.label}`}
          rows={4}
          className="variable-input"
        />
      );
    }

    if (variable.type === 'select' && variable.options) {
      return (
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="variable-select"
        >
          <option value="">请选择{variable.label}</option>
          {variable.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`请输入${variable.label}`}
        className="variable-input"
      />
    );
  };

  return (
    <Drawer
      title="📋 分析模板"
      placement="right"
      width={560}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => handleOpenEdit()}>
            新建模板
          </Button>
        </Space>
      }
    >
      {contextHolder}
      <div className="template-selector">
        {/* 搜索框 */}
        <div className="template-search">
          <Input
            placeholder="搜索模板..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>

        {/* 分类标签 */}
        <Tabs
          activeKey={activeCategory}
          onChange={setActiveCategory}
          size="small"
          items={categories.map((cat) => ({
            key: cat,
            label: cat,
          }))}
        />

        {/* 模板列表 */}
        <div className="template-list">
          {loading ? (
            <div className="loading-placeholder">加载中...</div>
          ) : filteredTemplates.length === 0 ? (
            <Empty description="暂无模板" />
          ) : (
            filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => onSelectTemplate(template)}
                hoverable
              >
                <div className="template-header">
                  <div className="template-title">
                    {template.isSystem ? (
                      <StarFilled className="system-icon" />
                    ) : (
                      <FileTextOutlined />
                    )}
                    <span>{template.name}</span>
                  </div>
                  <div className="template-actions">
                    {!template.isSystem && (
                      <>
                        <Tooltip title="编辑">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(template);
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="删除">
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                          />
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>
                <div className="template-desc">{template.description}</div>
                <div className="template-tags">
                  <Tag color="blue">{template.category}</Tag>
                  {template.isSystem && <Tag color="gold">系统预设</Tag>}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* 选中模板的变量配置 */}
        {selectedTemplate && (
          <div className="template-config">
            <div className="config-title">
              <RobotOutlined /> 配置参数
            </div>
            
            {selectedTemplate.variables.length === 0 ? (
              <div className="no-variables">该模板无需配置参数</div>
            ) : (
              <div className="variables-form">
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable.name} className="variable-item">
                    <label className={variable.required ? 'required' : ''}>
                      {variable.label}
                    </label>
                    {renderVariableInput(variable)}
                  </div>
                ))}
              </div>
            )}

            {selectedTemplate.exampleInput && (
              <div className="example-section">
                <div className="example-title">示例输入</div>
                <div className="example-content">{selectedTemplate.exampleInput}</div>
              </div>
            )}

            <Button
              type="primary"
              block
              icon={<RobotOutlined />}
              onClick={handleApplyTemplate}
              className="apply-btn"
            >
              应用模板并发送
            </Button>
          </div>
        )}
      </div>

      {/* 编辑模态框 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '新建模板'}
        open={editModalVisible}
        onOk={handleSaveTemplate}
        onCancel={() => setEditModalVisible(false)}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="例如：产品需求文档" />
          </Form.Item>
          <Form.Item name="description" label="模板描述">
            <Input placeholder="简要描述模板用途" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="例如：产品、教育、技术" />
          </Form.Item>
          <Form.Item
            name="systemPrompt"
            label="系统提示词（角色设定）"
            rules={[{ required: true, message: '请输入系统提示词' }]}
          >
            <TextArea
              rows={4}
              placeholder="定义 AI 的角色和行为，例如：你是一位资深的产品经理..."
            />
          </Form.Item>
          <Form.Item
            name="userPromptTemplate"
            label="用户提示词模板"
            rules={[{ required: true, message: '请输入用户提示词模板' }]}
            extra="使用 {变量名} 表示需要用户填写的内容，例如 {title}、{content}"
          >
            <TextArea
              rows={8}
              placeholder="请根据以下资料为「{title}」撰写..."
            />
          </Form.Item>
          <Form.Item
            name="variablesText"
            label="变量定义"
            extra="每行一个变量，格式：变量名:显示名称:类型:是否必填，例如 title:标题:text:true"
          >
            <TextArea
              rows={4}
              placeholder="title:标题:text:true&#10;content:内容:textarea:false"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};

export default TemplateSelector;
