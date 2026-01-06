import React, { useState } from 'react';
import { Menu, Button, Modal, Typography, Tooltip, Empty } from 'antd';
import {
  PlusOutlined,
  MessageOutlined,
  DeleteOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { Session, User } from '../../services/api';
import './Sidebar.css';

const { Text } = Typography;

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  user: User | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  user,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onLogout,
}) => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete);
    }
    setDeleteModalVisible(false);
    setSessionToDelete(null);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  const menuItems = sessions.map((session) => ({
    key: session._id,
    icon: <MessageOutlined />,
    label: (
      <div className="session-item">
        <div className="session-info">
          <Text ellipsis className="session-title" title={session.title}>
            {session.title}
          </Text>
          <Text type="secondary" className="session-time">
            {formatTime(session.updatedAt)}
          </Text>
        </div>
        <Tooltip title="删除会话">
          <button
            className="session-delete-btn"
            onClick={(e) => handleDeleteClick(e, session._id)}
            aria-label="删除会话"
            tabIndex={0}
          >
            <DeleteOutlined />
          </button>
        </Tooltip>
      </div>
    ),
  }));

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateSession}
          block
          className="new-chat-btn"
        >
          新建对话
        </Button>
      </div>

      <div className="sidebar-content">
        {sessions.length > 0 ? (
          <Menu
            mode="inline"
            selectedKeys={currentSessionId ? [currentSessionId] : []}
            items={menuItems}
            onClick={({ key }) => onSelectSession(key)}
            className="session-menu"
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无对话记录"
            className="empty-sessions"
          />
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <UserOutlined className="user-icon" />
          <Text className="username">{user?.username || '未登录'}</Text>
        </div>
        <Tooltip title="退出登录">
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={onLogout}
            className="logout-btn"
            danger
          />
        </Tooltip>
      </div>

      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleConfirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除这个会话吗？删除后将无法恢复。</p>
      </Modal>
    </div>
  );
};

export default Sidebar;
