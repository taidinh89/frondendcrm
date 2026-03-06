import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Tag, List, Space, message, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import chatApi from '../../services/chatApi';
import './TagsManagerModal.css';

/**
 * Tags Manager Modal
 * Quản lý danh sách tags - GIỐNG FACEBOOK
 */
const TagsManagerModal = ({ visible, onClose, onTagSelected }) => {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#1890ff');

    useEffect(() => {
        if (visible) {
            console.log('[TagsManagerModal] 🏷️ Modal opened');
            loadTags();
        } else {
            console.log('[TagsManagerModal] ❌ Modal closed');
        }
    }, [visible]);

    const loadTags = async () => {
        console.log('[TagsManagerModal] 🔄 Loading tags...');
        setLoading(true);
        try {
            const response = await chatApi.get('v1/omnichannel/tags');
            console.log('[TagsManagerModal] ✅ Loaded tags:', response.data?.length || 0);
            setTags(response.data || []);
        } catch (error) {
            console.error('[TagsManagerModal] ❌ Load failed:', error);
            message.error('Lỗi tải danh sách nhãn');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) {
            message.warning('Vui lòng nhập tên nhãn');
            return;
        }

        try {
            const response = await chatApi.post('v1/omnichannel/tags', {
                name: newTagName,
                color: newTagColor
            });
            message.success('Đã tạo nhãn mới');
            setTags([...tags, response.data]);
            setNewTagName('');
            setNewTagColor('#1890ff');
        } catch (error) {
            message.error('Lỗi tạo nhãn');
        }
    };

    const handleUpdateTag = async (tagId, updates) => {
        try {
            const response = await chatApi.put(`v1/omnichannel/tags/${tagId}`, updates);
            message.success('Đã cập nhật nhãn');
            setTags(tags.map(t => t.id === tagId ? response.data : t));
            setEditingTag(null);
        } catch (error) {
            message.error('Lỗi cập nhật nhãn');
        }
    };

    const handleDeleteTag = async (tagId) => {
        if (!window.confirm('Bạn có chắc muốn xóa nhãn này?')) return;

        try {
            await chatApi.delete(`v1/omnichannel/tags/${tagId}`);
            message.success('Đã xóa nhãn');
            setTags(tags.filter(t => t.id !== tagId));
        } catch (error) {
            message.error('Lỗi xóa nhãn');
        }
    };

    const colorOptions = [
        '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
        '#eb2f96', '#13c2c2', '#fa8c16', '#a0d911', '#2f54eb'
    ];

    return (
        <Modal
            title="Quản lý nhãn"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
            className="tags-manager-modal"
        >
            {/* Create Section */}
            <div className="create-tag-section">
                <Input
                    placeholder="Nhập tên nhãn mới..."
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    onPressEnter={handleCreateTag}
                    style={{ flex: 1 }}
                />
                <div className="color-picker">
                    {colorOptions.map(color => (
                        <div
                            key={color}
                            className={`color-option ${newTagColor === color ? 'selected' : ''}`}
                            style={{ background: color }}
                            onClick={() => setNewTagColor(color)}
                        />
                    ))}
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateTag}
                >
                    Tạo mới tag
                </Button>
            </div>

            {/* Tags List */}
            <div className="tags-list-section">
                <div className="section-header">
                    <span>Danh sách nhãn ({tags.length})</span>
                </div>
                <List
                    loading={loading}
                    dataSource={tags}
                    renderItem={tag => (
                        <List.Item
                            actions={[
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => setEditingTag(tag.id)}
                                />,
                                <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDeleteTag(tag.id)}
                                />
                            ]}
                        >
                            {editingTag === tag.id ? (
                                <Space>
                                    <Input
                                        size="small"
                                        defaultValue={tag.name}
                                        onBlur={e => handleUpdateTag(tag.id, { name: e.target.value })}
                                        autoFocus
                                    />
                                </Space>
                            ) : (
                                <Space>
                                    <Tag color={tag.color}>{tag.name}</Tag>
                                    <span className="tag-usage">
                                        {tag.conversations_count || 0} hội thoại
                                    </span>
                                </Space>
                            )}
                        </List.Item>
                    )}
                />
            </div>

            {/* Footer */}
            <div className="modal-footer">
                <a href="#" className="manage-link">
                    Quản lý danh sách Tag
                </a>
            </div>
        </Modal>
    );
};

export default TagsManagerModal;
