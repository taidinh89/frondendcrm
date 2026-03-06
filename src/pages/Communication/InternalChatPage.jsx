import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout, Input, Button, List, Avatar, Badge, Typography, Space, message as antMessage, Modal, Spin, Drawer, Tabs, Tooltip, Dropdown, Menu } from 'antd';
import {
    SendOutlined, UserOutlined, PlusOutlined, GroupOutlined, MessageOutlined,
    LoadingOutlined, InfoCircleOutlined, EditOutlined, FolderOpenOutlined,
    FileOutlined, PictureOutlined, TeamOutlined, MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import chatApi from '../../services/chatApi';
import { useChatStore } from '../../stores/useChatStore';
import { createChatEcho } from '../../services/echo';
import '../../components/Chat/OmnichannelChatPage.css';

dayjs.extend(relativeTime);
const { Sider, Content } = Layout;
const { Text, Title } = Typography;

const INTERNAL_PER_PAGE = 50;

const InternalChatPage = ({ currentUser }) => {
    // --- Global Store ---
    const {
        internalConversations: conversations,
        internalConversationsSync: syncConversations,
        activeMessages: messages,
        fetchInternalMessages,
        renameInternalConversation,
        fetchInternalResources,
        addMessage
    } = useChatStore();

    // --- Local UI State ---
    const [activeConvo, setActiveConvo] = useState(null);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [msgPage, setMsgPage] = useState(1);

    const [infoDrawerVisible, setInfoDrawerVisible] = useState(false);
    const [resources, setResources] = useState({ media: [], files: [] });
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState('');

    const [allStaff, setAllStaff] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState([]);
    const [groupName, setGroupName] = useState('');

    const user = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
    const scrollRef = useRef(null);
    const echoRef = useRef(null);
    const location = useLocation();

    // --- Initialization ---
    useEffect(() => {
        fetchAllStaff();
        const echoInstance = createChatEcho();
        if (echoInstance) echoRef.current = echoInstance;

        return () => {
            echoRef.current?.disconnect();
        };
    }, []);

    // --- Handle Deep Linking & Initial Convo ---
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const convoId = params.get('conversation_id');
        if (convoId && conversations.length > 0) {
            const target = conversations.find(c => String(c.id) === String(convoId));
            if (target) setActiveConvo(target);
        }
    }, [location.search, conversations.length]);

    // --- Auto-scroll ---
    useEffect(() => {
        if (scrollRef.current && msgPage === 1) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, msgPage]);

    // --- Active Conversation Logic ---
    useEffect(() => {
        if (!activeConvo) return;

        setMsgPage(1);
        loadMessages(activeConvo.id, 1);
        setupRealtime(activeConvo.id);

        // Mark as read
        chatApi.post(`v1/internal/conversations/${activeConvo.id}/read`).catch(() => { });

        // Load resources if drawer open
        if (infoDrawerVisible) loadResources(activeConvo.id);
    }, [activeConvo?.id]);

    const loadMessages = async (id, page) => {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const res = await fetchInternalMessages(id, page);
        if (res) setHasMoreMessages(res.hasMore);

        setLoading(false);
        setLoadingMore(false);
    };

    const setupRealtime = (convoId) => {
        if (!echoRef.current) return;

        // Global store already listens to broadcast events for general list updates,
        // but here we ensure the active room's specific messages are captured.
        // Actually, store.js handles MessageSent and adds it to activeMessages if ID matches.
        // So we just need to ensure we're joined to the private channel.
        echoRef.current.private(`conversation.${convoId}`);
    };

    const loadResources = async (convoId) => {
        const media = await fetchInternalResources(convoId, 'media');
        const files = await fetchInternalResources(convoId, 'file');
        setResources({ media, files });
    };

    const fetchAllStaff = async () => {
        try {
            const res = await chatApi.get('v1/internal/users/all?limit=200');
            const list = res.data?.data || [];
            setAllStaff(list.filter(u => u.id !== user.id));
        } catch (err) {
            console.error('[InternalChat] fetchAllStaff failed', err);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || !activeConvo) return;
        const msgText = inputText;
        const tempId = 'optimistic_' + Date.now();
        setInputText('');

        // Optimistic UI handled by store usually, but let's do local sync for speed
        const optimistic = {
            id: tempId,
            user_id: user.id,
            content: msgText,
            type: 'text',
            created_at: new Date().toISOString(),
            status: 'sending',
            sender: user
        };
        addMessage(activeConvo.id, optimistic);

        try {
            const res = await chatApi.post('v1/internal/messages', {
                conversation_id: activeConvo.id,
                content: msgText,
                type: 'text',
            });
            const sent = res?.data ?? res;
            addMessage(activeConvo.id, { ...sent, status: 'sent', optimistic_id: tempId });
        } catch {
            antMessage.error('Không thể gửi tin nhắn');
        }
    };

    const handleRename = async () => {
        if (!newName.trim() || !activeConvo) return;
        await renameInternalConversation(activeConvo.id, newName);
        setIsRenaming(false);
        setActiveConvo(prev => ({ ...prev, name: newName }));
    };

    const handleCreateConversation = async () => {
        if (selectedStaff.length === 0) return;
        try {
            const res = await chatApi.post('v1/internal/conversations', {
                user_ids: selectedStaff,
                name: selectedStaff.length > 1 ? (groupName || 'Nhóm mới') : null,
                type: selectedStaff.length > 1 ? 'group' : 'individual',
            });
            const created = res?.data?.data || res?.data || res;
            setActiveConvo(created);
            setIsCreateModalOpen(false);
            setSelectedStaff([]);
            setGroupName('');
            syncConversations(); // Refresh list
        } catch {
            antMessage.error('Lỗi tạo hội thoại');
        }
    };

    // --- Render Helpers ---
    const getConvoTitle = (item) => {
        if (item.name) return item.name;
        const others = item.participants?.filter(p => p.user_id !== user.id) || [];
        if (item.type === 'individual') return others[0]?.user?.name || 'Đồng nghiệp';
        return others.slice(0, 2).map(p => p.user?.name).join(', ') + (others.length > 2 ? ` (+${others.length - 2})` : '');
    };

    const dropdownMenuItems = [
        {
            key: 'rename',
            icon: <EditOutlined />,
            label: 'Đổi tên nhóm',
        },
        {
            key: 'info',
            icon: <InfoCircleOutlined />,
            label: 'Thông tin & Tài nguyên',
        },
    ];

    const handleMenuClick = ({ key }) => {
        if (key === 'rename') {
            setNewName(activeConvo?.name || '');
            setIsRenaming(true);
        } else if (key === 'info') {
            setInfoDrawerVisible(true);
        }
    };

    return (
        <Layout className="chat-box-v2-container" style={{ height: 'calc(100vh - 64px)', background: '#f0f2f5' }}>
            {/* SIDEBAR */}
            <Sider width={320} theme="light" className="chat-sider" style={{ borderRight: '1px solid #e8e8e8' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0, fontSize: 18 }}>Trò chuyện</Title>
                        <Tooltip title="Tạo chat mới">
                            <span style={{ display: 'inline-block' }}>
                                <Button type="primary" shape="circle" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)} />
                            </span>
                        </Tooltip>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <Input.Search placeholder="Tìm kiếm hội thoại..." variant="filled" style={{ borderRadius: 8 }} />
                    </div>
                </div>

                <List
                    className="convo-list"
                    style={{ overflowY: 'auto', height: 'calc(100% - 100px)' }}
                    dataSource={conversations}
                    renderItem={item => {
                        const isSelected = activeConvo?.id === item.id;
                        const others = item.participants?.filter(p => p.user_id !== user.id) || [];
                        return (
                            <List.Item
                                className={`convo-item ${isSelected ? 'active' : ''}`}
                                onClick={() => setActiveConvo(item)}
                                style={{
                                    cursor: 'pointer',
                                    padding: '12px 16px',
                                    transition: 'all 0.2s',
                                    backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                                    borderLeft: isSelected ? '4px solid #1890ff' : '4px solid transparent'
                                }}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Badge count={item.unread_count} overflowCount={9} offset={[-2, 32]}>
                                            <Avatar
                                                size={48}
                                                src={item.type === 'individual' ? others[0]?.user?.avatar : null}
                                                icon={item.type === 'individual' ? <UserOutlined /> : <GroupOutlined />}
                                                style={{ backgroundColor: item.type === 'group' ? '#1890ff' : '#ccc' }}
                                            />
                                        </Badge>
                                    }
                                    title={<Text strong style={{ fontSize: 14, color: isSelected ? '#1890ff' : '#262626' }}>{getConvoTitle(item)}</Text>}
                                    description={
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text type="secondary" ellipsis style={{ fontSize: 13, flex: 1 }}>
                                                {item.last_message_content || 'Chưa có tin nhắn'}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                                {item.last_message_at ? dayjs(item.last_message_at).fromNow(true) : ''}
                                            </Text>
                                        </div>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            </Sider>

            {/* MAIN CONTENT */}
            <Content className="chat-content" style={{ display: 'flex', flexDirection: 'column' }}>
                {activeConvo ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
                        {/* Header */}
                        <div className="chat-header" style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Avatar
                                    size={40}
                                    src={activeConvo.type === 'individual' ? activeConvo.participants?.find(p => p.user_id !== user.id)?.user?.avatar : null}
                                    icon={activeConvo.type === 'group' ? <GroupOutlined /> : <UserOutlined />}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 16 }}>{getConvoTitle(activeConvo)}</div>
                                    <div style={{ fontSize: 12, color: '#52c41a' }}><Badge status="processing" color="#52c41a" /> Đang hoạt động</div>
                                </div>
                            </div>
                            <Space>
                                <Button type="text" icon={<FolderOpenOutlined />} onClick={() => setInfoDrawerVisible(true)}>Tài liệu</Button>
                                <Dropdown menu={{ items: dropdownMenuItems, onClick: handleMenuClick }} placement="bottomRight">
                                    <Button type="text" icon={<MoreOutlined />} />
                                </Dropdown>
                            </Space>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f9f9f9' }}
                            onScroll={e => {
                                if (e.target.scrollTop < 50 && !loadingMore && hasMoreMessages) {
                                    const nextPage = msgPage + 1;
                                    setMsgPage(nextPage);
                                    loadMessages(activeConvo.id, nextPage);
                                }
                            }}
                        >
                            {loadingMore && <div style={{ textAlign: 'center', padding: 10 }}><Spin size="small" /></div>}
                            {loading ? (
                                <div style={{ textAlign: 'center', marginTop: 50 }}><Spin tip="Đang tải tin nhắn..." /></div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.user_id === user.id;
                                    const showTime = idx === 0 || dayjs(msg.created_at).diff(dayjs(messages[idx - 1].created_at), 'minute') > 10;
                                    return (
                                        <div key={msg.id || idx}>
                                            {showTime && (
                                                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                                                    <Badge count={dayjs(msg.created_at).format('HH:mm, DD MMM')} style={{ backgroundColor: '#e8e8e8', color: '#8c8c8c' }} />
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 8, alignItems: 'flex-end', gap: 8 }}>
                                                {!isMe && <Avatar src={msg.sender?.avatar} size={32} icon={<UserOutlined />} />}
                                                <div style={{ maxWidth: '70%' }}>
                                                    {!isMe && activeConvo.type === 'group' && (
                                                        <div style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 4, marginBottom: 2 }}>{msg.sender?.name}</div>
                                                    )}
                                                    <div style={{
                                                        padding: '10px 14px',
                                                        borderRadius: isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                                        background: isMe ? '#1890ff' : '#fff',
                                                        color: isMe ? '#fff' : '#262626',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                        fontSize: 14,
                                                        lineHeight: 1.5,
                                                        wordBreak: 'break-word'
                                                    }}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer / Input */}
                        <div style={{ padding: '16px 20px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                                <Input.TextArea
                                    autoSize={{ minRows: 1, maxRows: 6 }}
                                    placeholder="Soạn tin nhắn..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onPressEnter={e => {
                                        if (!e.shiftKey) { e.preventDefault(); handleSend(); }
                                    }}
                                    style={{ borderRadius: 12, padding: '10px 16px', resize: 'none' }}
                                />
                                <Button
                                    type="primary"
                                    size="large"
                                    shape="circle"
                                    icon={<SendOutlined />}
                                    onClick={handleSend}
                                    disabled={!inputText.trim()}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f5f5f5' }}>
                        <div style={{ textAlign: 'center' }}>
                            <Avatar size={100} icon={<MessageOutlined />} style={{ background: '#bfbfbf', marginBottom: 24 }} />
                            <Title level={3} style={{ color: '#595959' }}>Chat Nội Bộ QVC</Title>
                            <Text type="secondary">Chọn một hội thoại bên trái để bắt đầu trao đổi công việc nhanh chóng.</Text>
                            <div style={{ marginTop: 24 }}>
                                <Button type="primary" size="large" onClick={() => setIsCreateModalOpen(true)} icon={<PlusOutlined />}>Bắt đầu Chat ngay</Button>
                            </div>
                        </div>
                    </div>
                )}
            </Content>

            {/* INFO DRAWER (App-like features) */}
            <Drawer
                title="Thông tin hội thoại"
                placement="right"
                onClose={() => setInfoDrawerVisible(false)}
                open={infoDrawerVisible}
                width={360}
            >
                <Tabs items={[
                    {
                        key: 'members',
                        label: <span><TeamOutlined /> Thành viên</span>,
                        children: (
                            <List
                                dataSource={activeConvo?.participants || []}
                                renderItem={p => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<Avatar src={p.user?.avatar} icon={<UserOutlined />} />}
                                            title={p.user?.name}
                                            description={<span>{p.user?.role || 'Nhân viên'} {p.role === 'admin' && <Badge status="warning" text="Quản trị" />}</span>}
                                        />
                                    </List.Item>
                                )}
                            />
                        )
                    },
                    {
                        key: 'media',
                        label: <span><PictureOutlined /> Ảnh</span>,
                        children: (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                {resources.media.map(m => (
                                    <div key={m.id} style={{ paddingBottom: '100%', position: 'relative', background: '#eee', borderRadius: 4 }}>
                                        <img src={m.content} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} alt="Shared" />
                                    </div>
                                ))}
                            </div>
                        )
                    },
                    {
                        key: 'files',
                        label: <span><FileOutlined /> Files</span>,
                        children: (
                            <List
                                dataSource={resources.files}
                                renderItem={f => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<Avatar icon={<FileOutlined />} />}
                                            title={<a href={f.content} target="_blank" rel="noreferrer">{f.file_name || 'Tài liệu'}</a>}
                                            description={dayjs(f.created_at).format('DD/MM/YYYY')}
                                        />
                                    </List.Item>
                                )}
                            />
                        )
                    }
                ]} />
            </Drawer>

            {/* RENAME MODAL */}
            <Modal
                title="Đổi tên hội thoại"
                open={isRenaming}
                onCancel={() => setIsRenaming(false)}
                onOk={handleRename}
            >
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nhập tên mới..." />
            </Modal>

            {/* CREATE MODAL */}
            <Modal
                title="Bắt đầu hội thoại mới"
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                onOk={handleCreateConversation}
                width={500}
            >
                {selectedStaff.length > 1 && (
                    <Input placeholder="Tên nhóm (ví dụ: Team Marketing)" value={groupName} onChange={e => setGroupName(e.target.value)} style={{ marginBottom: 16 }} />
                )}
                <Input.Search placeholder="Tìm đồng nghiệp..." style={{ marginBottom: 12 }} />
                <List
                    style={{ maxHeight: 300, overflowY: 'auto' }}
                    dataSource={allStaff}
                    renderItem={item => (
                        <List.Item actions={[
                            <Button shape="circle" type={selectedStaff.includes(item.id) ? 'primary' : 'default'} icon={<PlusOutlined />} onClick={() => setSelectedStaff(p => p.includes(item.id) ? p.filter(id => id !== item.id) : [...p, item.id])} />
                        ]}>
                            <List.Item.Meta avatar={<Avatar src={item.avatar} />} title={item.name} description={item.email} />
                        </List.Item>
                    )}
                />
            </Modal>
        </Layout>
    );
};

export default InternalChatPage;
