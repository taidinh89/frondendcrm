import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, List, Tabs, Space, message, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import chatApi from '../../services/chatApi';
import './QuickRepliesManagerModal.css';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

/**
 * Quick Replies Manager Modal
 * Quản lý Mẫu tin nhắn - GIỐNG FACEBOOK
 */
const QuickRepliesManagerModal = ({ visible, onClose, onReplySelected }) => {
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingReply, setEditingReply] = useState(null);

    // Creating new reply
    const [isCreating, setIsCreating] = useState(false);
    const [newShortcut, setNewShortcut] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState('Chào hỏi');

    const categories = ['Chào hỏi', 'Sản phẩm', 'Giá cả', 'Giao hàng', 'Kết thúc', 'Khác'];

    useEffect(() => {
        if (visible) {
            console.log('[QuickRepliesManagerModal] 📝 Modal opened');
            loadReplies();
        } else {
            console.log('[QuickRepliesManagerModal] ❌ Modal closed');
        }
    }, [visible]);

    const loadReplies = async () => {
        console.log('[QuickRepliesManagerModal] 🔄 Loading quick replies...');
        setLoading(true);
        try {
            const response = await chatApi.get('v1/omnichannel/quick-replies');
            console.log('[QuickRepliesManagerModal] ✅ Loaded replies:', response.data?.length || 0);
            setReplies(response.data || []);
        } catch (error) {
            console.error('[QuickRepliesManagerModal] ❌ Load failed:', error);
            message.error('Lỗi tải mẫu tin nhắn');
            // Fallback demo data
            const demoData = [
                { id: 1, shortcut: '5', content: 'Ban vui lòng liên hệ hotline chăm sóc khách hàng để được hỗ trợ nhé 0968691011', category: 'Chào hỏi' },
                { id: 2, shortcut: '6', content: 'Bên mình sẵn hàng bạn nhé', category: 'Sản phẩm' },
                { id: 3, shortcut: '7', content: 'Để bên mình kiểm tra rồi báo lại bạn nhé', category: 'Sản phẩm' },
            ];
            console.log('[QuickRepliesManagerModal] 📋 Using demo data:', demoData.length);
            setReplies(demoData);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateReply = async () => {
        if (!newShortcut.trim() || !newContent.trim()) {
            message.warning('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        try {
            const response = await chatApi.post('v1/omnichannel/quick-replies', {
                shortcut: newShortcut,
                content: newContent,
                category: newCategory
            });
            message.success('Đã tạo mẫu tin nhắn mới');
            setReplies([...replies, response.data]);
            setNewShortcut('');
            setNewContent('');
            setIsCreating(false);
        } catch (error) {
            message.error('Lỗi tạo mẫu tin nhắn');
        }
    };

    const handleUpdateReply = async (replyId, updates) => {
        try {
            const response = await chatApi.put(`v1/omnichannel/quick-replies/${replyId}`, updates);
            message.success('Đã cập nhật mẫu tin nhắn');
            setReplies(replies.map(r => r.id === replyId ? response.data : r));
            setEditingReply(null);
        } catch (error) {
            message.error('Lỗi cập nhật mẫu tin nhắn');
        }
    };

    const handleDeleteReply = async (replyId) => {
        if (!window.confirm('Bạn có chắc muốn xóa mẫu tin nhắn này?')) return;

        try {
            await chatApi.delete(`v1/omnichannel/quick-replies/${replyId}`);
            message.success('Đã xóa mẫu tin nhắn');
            setReplies(replies.filter(r => r.id !== replyId));
        } catch (error) {
            message.error('Lỗi xóa mẫu tin nhắn');
        }
    };

    const filteredReplies = replies.filter(r =>
        r.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal
            title="Mẫu tin nhắn"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
            className="quick-replies-manager-modal"
        >
            <div className="modal-description">
                Gia tăng tốc độ và sự chính xác khi trả lời khách hàng với các tin nhắn mẫu phù hợp.
            </div>

            {/* Search */}
            <Input
                prefix={<SearchOutlined />}
                placeholder="Tìm theo từ khóa"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ marginBottom: 16 }}
            />

            {/* Tabs */}
            <Tabs
                defaultActiveKey="all"
                tabBarExtraContent={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsCreating(true)}
                    >
                        Tạo mới
                    </Button>
                }
            >
                <TabPane tab="Tất cả mẫu" key="all">
                    {isCreating && (
                        <div className="create-reply-form">
                            <Input
                                placeholder="Shortcut (vd: /5)"
                                value={newShortcut}
                                onChange={e => setNewShortcut(e.target.value)}
                                style={{ marginBottom: 12 }}
                                prefix={<span>/</span>}
                            />
                            <TextArea
                                placeholder="Nội dung tin nhắn..."
                                value={newContent}
                                onChange={e => setNewContent(e.target.value)}
                                rows={3}
                                style={{ marginBottom: 12 }}
                            />
                            <Space>
                                <Select
                                    value={newCategory}
                                    onChange={setNewCategory}
                                    style={{ width: 150 }}
                                >
                                    {categories.map(cat => (
                                        <Option key={cat} value={cat}>{cat}</Option>
                                    ))}
                                </Select>
                                <Button type="primary" onClick={handleCreateReply}>
                                    Lưu
                                </Button>
                                <Button onClick={() => setIsCreating(false)}>
                                    Hủy
                                </Button>
                            </Space>
                        </div>
                    )}

                    <List
                        loading={loading}
                        dataSource={filteredReplies}
                        renderItem={reply => (
                            <List.Item
                                className="reply-item"
                                actions={[
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() => setEditingReply(reply.id)}
                                    />,
                                    <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleDeleteReply(reply.id)}
                                    />
                                ]}
                            >
                                <div className="reply-content">
                                    <div className="reply-shortcut">/{reply.shortcut}</div>
                                    {editingReply === reply.id ? (
                                        <TextArea
                                            defaultValue={reply.content}
                                            onBlur={e => handleUpdateReply(reply.id, { content: e.target.value })}
                                            autoSize
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="reply-text">{reply.content}</div>
                                    )}
                                    {reply.category && (
                                        <div className="reply-meta">
                                            Chia sẻ bởi {reply.created_by || 'duclm@qvc.vn'}
                                        </div>
                                    )}
                                </div>
                            </List.Item>
                        )}
                    />

                    <div className="footer-info">
                        Tổng số: {filteredReplies.length} bản ghi
                    </div>
                </TabPane>

                <TabPane tab="Mẫu tin nhắn" key="messages">
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                        Chức năng đang phát triển
                    </div>
                </TabPane>

                <TabPane tab="Mẫu email" key="emails">
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                        Chức năng đang phát triển
                    </div>
                </TabPane>
            </Tabs>
        </Modal>
    );
};

export default QuickRepliesManagerModal;
