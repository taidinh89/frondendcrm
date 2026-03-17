import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Input, Button, List, Avatar, Badge, Tabs, Tag, Dropdown, Menu, Modal, Typography, Space, Tooltip, Select, Checkbox, Divider, message as antMessage } from 'antd';
import {
    SearchOutlined, MoreOutlined, SendOutlined, PaperClipOutlined,
    CheckCircleOutlined, FilterOutlined, UserOutlined, PhoneOutlined,
    MailOutlined, TagOutlined, EditOutlined, HistoryOutlined, FullscreenOutlined,
    FacebookFilled, MessageFilled, SmileOutlined, ShopOutlined, CheckOutlined,
    SmileFilled, ExclamationCircleOutlined
} from '@ant-design/icons';
import { MessageCircle, Phone, Mail, MoreHorizontal, Filter, Search, Paperclip, ChevronDown, ExternalLink, Clock, Zap } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import chatApi from '../../services/chatApi';
import EmojiPicker from './EmojiPicker';
import MediaUploader from './MediaUploader';
import QuickReplySelector from './QuickReplySelector';
import TagsManagerModal from './TagsManagerModal';
import QuickRepliesManagerModal from './QuickRepliesManagerModal';
import { useChatStore } from '../../stores/useChatStore';
import './OmnichannelChatPage.css';

dayjs.extend(relativeTime);
const { Text, Title } = Typography;
const { Option } = Select;

const ChatBoxV2 = ({ currentUser }) => {
    // --- States ---
    // --- States (Zustand) ---
    const {
        conversations,
        activeMessages: messages,
        isLoadingConvos,
        isLoadingMessages: loading,
        fetchConversations,
        fetchMessages,
        addMessage,
        updateMessageStatus,
        setActiveConversation,
        globalEcho,
        typingStatus,
        connectionStatus
    } = useChatStore();

    const [activeConvo, setActiveConvo] = useState(null);
    const [inputText, setInputText] = useState('');
    const [statusFilter, setStatusFilter] = useState('open');
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);

    // CRM Real-data State
    const [timeline, setTimeline] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
    const [stats, setStats] = useState({ unread: 0, total: 0 });
    const [showQuickReply, setShowQuickReply] = useState(false);
    const [showMediaUploader, setShowMediaUploader] = useState(false);
    const [crmTab, setCrmTab] = useState('customer'); // State for CRM tab selector

    const [channels, setChannels] = useState([]);
    const [platformFilter, setPlatformFilter] = useState('all');
    const [channelIdFilter, setChannelIdFilter] = useState(null);

    // Manager Modals
    const [isTagsManagerOpen, setIsTagsManagerOpen] = useState(false);
    const [isQuickRepliesManagerOpen, setIsQuickRepliesManagerOpen] = useState(false);

    const activeConvoRef = useRef(null);
    const fileInputRef = useRef(null);
    const scrollRef = useRef(null);

    // Sync Ref
    useEffect(() => {
        activeConvoRef.current = activeConvo;
    }, [activeConvo]);

    const user = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();
    const location = useLocation();

    // New State for Member Search
    const [searchMemberQuery, setSearchMemberQuery] = useState('');
    const [foundMembers, setFoundMembers] = useState([]);

    const [allStaff, setAllStaff] = useState([]); // Cache for all staff

    const fetchAllStaff = async () => {
        try {
            const res = await chatApi.get('v1/internal/users/all?limit=200'); // Load more for dropdown initialization
            const raw = res.data;
            const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
            setAllStaff(list);
        } catch (err) {
            console.error("Failed to fetch all staff", err);
        }
    };

    const handleSearchMember = async (e) => {
        const value = e.target.value;
        setSearchMemberQuery(value);

        // If empty, show all staff (excluding current members)
        if (value.trim().length === 0) {
            const existingIds = groupMembers.map(m => m.user?.id || m.id);
            const available = allStaff.filter(u => !existingIds.includes(u.id));
            setFoundMembers(available);
            return;
        }

        // If typing, filter client-side or call API (Hybrid approach)
        if (value.trim().length > 0) {
            // Client-side filter first for speed if we have allStaff
            if (allStaff.length > 0) {
                const lowerVal = value.toLowerCase();
                const existingIds = groupMembers.map(m => m.user?.id || m.id);
                const results = allStaff.filter(u =>
                    !existingIds.includes(u.id) &&
                    (u.name.toLowerCase().includes(lowerVal) || u.email?.toLowerCase().includes(lowerVal))
                );
                setFoundMembers(results);
            } else {
                // Fallback to API if allStaff wasn't loaded
                try {
                    const res = await chatApi.get(`v1/internal/users/search?q=${value}`);
                    const raw = res.data;
                    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
                    const existingIds = groupMembers.map(m => m.user?.id || m.id);
                    const results = list.filter(u => !existingIds.includes(u.id));
                    setFoundMembers(results);
                } catch (err) {
                    console.error("Link search failed", err);
                }
            }
        } else {
            setFoundMembers([]);
        }
    };

    // Open Modal Handlers
    const openMembersModal = () => {
        setIsMembersModalOpen(true);
        // Load staff list immediately for suggestion
        if (allStaff.length === 0) {
            fetchAllStaff().then(res => {
                // Initialize dropdown with all available staff immediately after fetch
                // Note: state update is async, so we might need to rely on the user focusing or Effect
            });
        } else {
            // If already loaded, reset search to show all
            setSearchMemberQuery('');
            const existingIds = groupMembers.map(m => m.user?.id || m.id);
            setFoundMembers(allStaff.filter(u => !existingIds.includes(u.id)));
        }
    };

    // Effect to update foundMembers when allStaff loads or Modal opens
    useEffect(() => {
        if (isMembersModalOpen && allStaff.length > 0 && searchMemberQuery === '') {
            const existingIds = groupMembers.map(m => m.user?.id || m.id);
            setFoundMembers(allStaff.filter(u => !existingIds.includes(u.id)));
        }
    }, [isMembersModalOpen, allStaff, groupMembers]);

    const handleAddMember = async (user) => {
        try {
            await chatApi.post('v1/internal/conversations/participants', {
                conversation_id: activeConvo.id,
                user_id: user.id
            });

            // Optimistic Update
            const newMember = {
                user: user, // Structure matches API response
                user_id: user.id,
                role: 'member',
                online: true // Assume online when added
            };
            setGroupMembers([...groupMembers, newMember]);
            setSearchMemberQuery('');
            setFoundMembers([]);
            antMessage.success(`Đã thêm ${user.name} vào nhóm`);
        } catch (err) {
            antMessage.error(err.response?.data?.message || 'Lỗi thêm thành viên');
        }
    };

    const handleRemoveMember = async (memberItem) => {
        try {
            const targetUserId = memberItem.user?.id || memberItem.id;
            await chatApi.delete('v1/internal/conversations/participants', {
                data: {
                    conversation_id: activeConvo.id,
                    user_id: targetUserId
                }
            });
            antMessage.success(`Đã mời ${memberItem.user?.name || memberItem.name} rời nhóm`);
            setGroupMembers(prev => prev.filter(m => (m.user?.id || m.id) !== targetUserId));
        } catch (err) {
            antMessage.error('Không thể xóa thành viên (Cần quyền Admin)');
        }
    };

    // [REFACTOR] Removed redundantly listening to `user.${user.id}` for `.MessageSent` 
    // because `useChatStore` already handles `NewMessage` notifications and adds it.

    // --- Actions ---
    useEffect(() => {
        if (!activeConvo) return;

        // 1. Gửi Presence ngay lập tức khi vào phòng
        chatApi.post(`v1/omnichannel/conversations/${activeConvo.id}/presence`).catch(e => console.error(e));

        // 2. Heartbeat: 60 giây một lần để Backend giữ Cache
        const presenceInterval = setInterval(() => {
            chatApi.post(`v1/omnichannel/conversations/${activeConvo.id}/presence`).catch(e => console.error(e));
        }, 60000);

        return () => clearInterval(presenceInterval);
    }, [activeConvo]);

    // --- Sync Group Members from Active Convo ---
    useEffect(() => {
        if (activeConvo && activeConvo.participants) {
            setGroupMembers(activeConvo.participants);
        } else {
            setGroupMembers([]);
        }
    }, [activeConvo]);

    const getConversations = async () => {
        await fetchConversations(statusFilter, platformFilter, channelIdFilter);

        // Handle URL selection
        const urlConvoId = new URLSearchParams(location.search).get('conversation_id');
        if (urlConvoId) {
            const list = useChatStore.getState().conversations;
            const target = list.find(c => String(c.id) === String(urlConvoId));
            if (target) {
                setActiveConvo(target);
                setActiveConversation(target);
            }
        }
    };

    const fetchChannels = async () => {
        try {
            const res = await chatApi.get('v1/omnichannel/channels');
            setChannels(res.data || []);
        } catch (err) {
            console.error("Failed to fetch channels", err);
        }
    };

    useEffect(() => {
        getConversations();
    }, [statusFilter, platformFilter, channelIdFilter]);

    useEffect(() => {
        fetchChannels();
        fetchAllStaff();
    }, []);

    useEffect(() => {
        if (activeConvo) {
            setActiveConversation(activeConvo);
            if (activeConvo.customer) {
                fetchTimeline(activeConvo.customer.id);
            }
            fetchTags();
        }
    }, [activeConvo]);

    const fetchTimeline = async (customerId) => {
        try {
            const res = await chatApi.get(`v1/omnichannel/customers/${customerId}/timeline`);
            setTimeline(res.data);
        } catch (err) {
            console.error('Lỗi tải timeline', err);
        }
    };

    const fetchTags = async () => {
        try {
            const res = await chatApi.get('v1/omnichannel/tags');
            setAvailableTags(res.data);
        } catch (err) {
            console.error('Lỗi tải nhãn', err);
        }
    };

    // fetchMessages removed as it's now in the store action fetchMessages called by setActiveConversation

    const updateConversationListLocally = (message) => {
        addMessage(message.conversation_id, message);
    };



    const handleSend = async () => {
        if (!inputText.trim() || !activeConvo) {
            console.warn('[ChatBoxV2] ⚠️ Cannot send - empty input or no active conversation');
            return;
        }
        const msgText = inputText;
        const optimisticId = 'opt_' + Date.now() + Math.random().toString(36).substr(2, 5);

        const optimisticMsg = {
            id: null,
            optimistic_id: optimisticId,
            content: msgText,
            sender_id: user.id,
            sender: user,
            conversation_id: activeConvo.id,
            created_at: new Date().toISOString(),
            status: 'sending',
            type: 'text'
        };

        addMessage(activeConvo.id, optimisticMsg);
        setInputText('');
        setIsEmojiPickerOpen(false);
        setTimeout(scrollToBottom, 50);

        try {
            const res = await chatApi.post('v1/omnichannel/messages', {
                conversation_id: activeConvo.id,
                content: msgText,
                type: 'text',
                optimistic_id: optimisticId
            });

            // Store will handle the update via addMessage if we use the same optimistic_id
            addMessage(activeConvo.id, res.data);
        } catch (err) {
            updateMessageStatus(optimisticId, 'failed');
        }
    };

    const handleTyping = () => {
        if (!globalEcho || !activeConvo) return;
        globalEcho.private(`conversation.${activeConvo.id}`)
            .whisper('typing', {
                user_id: user.id,
                name: user.name
            });
    };

    const getPlatformUrl = (convo) => {
        if (!convo || !convo.platform) return null;
        const { platform, channel_id, platform_conversation_id, channel } = convo;

        if (platform === 'facebook') {
            // business_id nếu có trong metadata thì ưu tiên dùng
            const businessId = channel?.metadata?.business_id;
            const baseUrl = businessId
                ? `https://business.facebook.com/latest/inbox/messenger?business_id=${businessId}`
                : `https://business.facebook.com/latest/inbox/messenger`;

            return `${baseUrl}&asset_id=${channel_id}&selected_item_id=${platform_conversation_id}`;
        }

        if (platform === 'zalo') {
            // Zalo OA Chat URL
            return `https://oa.zalo.me/chatv2?uid=${platform_conversation_id}&oaid=${channel_id}`;
        }

        return null;
    };

    const handleUpdateCustomer = async (field, value) => {
        if (!activeConvo?.customer) return;
        try {
            const res = await chatApi.put(`v1/omnichannel/customers/${activeConvo.customer.id}`, {
                [field]: value
            });
            antMessage.success('Đã cập nhật thông tin khách hàng');
            // Update local state
            const updatedConvo = { ...activeConvo, customer: res.data };
            setActiveConvo(updatedConvo);
            setConversations(prev => prev.map(c => c.id === updatedConvo.id ? updatedConvo : c));
        } catch (err) {
            antMessage.error('Cập nhật thất bại');
        }
    };

    const handleToggleTag = async (tagId) => {
        if (!activeConvo) return;
        const hasTag = activeConvo.tags?.some(t => t.id === tagId);
        try {
            if (hasTag) {
                await chatApi.delete(`v1/omnichannel/conversations/${activeConvo.id}/tags/${tagId}`);
            } else {
                await chatApi.post(`v1/omnichannel/conversations/${activeConvo.id}/tags`, { tag_id: tagId });
            }
            fetchConversations(); // Reload to get updated tags
            setIsTagSelectorOpen(false);
        } catch (err) {
            antMessage.error('Lỗi cập nhật nhãn');
        }
    };

    const handleMediaUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeConvo) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversation_id', activeConvo.id);

        try {
            const res = await chatApi.post('v1/omnichannel/messages', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessages(prev => [...prev, res.data]);
            scrollToBottom();
            fetchConversations();
        } catch (err) {
            antMessage.error('Gửi file thất bại');
        }
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    // --- Render Helpers ---
    const resolveAvatar = (url) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('blob:')) return url;
        // Adjust this base URL as needed based on your environment
        return `${window.location.origin}/storage/${url}`;
    };

    const renderMessageContent = (msg) => {
        if (msg.type === 'image') {
            return (
                <div className="msg-content-image">
                    <img
                        src={resolveAvatar(msg.content)}
                        alt="attachment"
                        style={{ maxWidth: '100%', borderRadius: 8, cursor: 'pointer' }}
                        onClick={() => window.open(resolveAvatar(msg.content), '_blank')}
                    />
                </div>
            );
        }
        if (msg.type === 'file') {
            return (
                <div className="msg-content-file">
                    <a href={resolveAvatar(msg.content)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 underline">
                        <PaperClipOutlined />
                        {msg.content.split('/').pop()}
                    </a>
                </div>
            );
        }
        // Check for URL in text using simple regex
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        if (msg.content && msg.content.match(urlRegex) && (msg.content.match(urlRegex)[0] === msg.content)) {
            // If entire message is a URL and looks like an image from FB
            if (msg.content.includes('fbcdn') || msg.content.match(/\.(jpeg|jpg|gif|png)$/) != null) {
                return (
                    <div className="msg-content-image">
                        <img
                            src={msg.content}
                            alt="attachment"
                            style={{ maxWidth: '200px', borderRadius: 8, cursor: 'pointer' }}
                            onClick={() => window.open(msg.content, '_blank')}
                        />
                    </div>
                );
            }
        }

        return msg.content;
    };

    const renderPlatformIconMini = (platform) => {
        switch (platform) {
            case 'facebook': return <div className="platform-badge-mini facebook"><FacebookFilled /></div>;
            case 'zalo': return <div className="platform-badge-mini zalo">Z</div>;
            default: return null;
        }
    };

    return (
        <div className="chat-v2-container">
            {/* COLUMN 1: SIDEBAR */}
            <div className="chat-v2-sidebar">
                <div className="sidebar-header-v2">
                    <div className="title-row-v2">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Checkbox className="convo-checkbox-v2" />
                            <Title level={4} style={{ margin: 0 }}>Hội thoại</Title>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="unread-stats-badge">{conversations.filter(c => c.unread_count > 0).length} Chưa đọc</span>
                            <Button icon={<Filter size={18} />} type="text" />
                        </div>
                    </div>

                    <div className="flex gap-1 mb-2 overflow-x-auto custom-scroll pb-1">
                        <Button
                            size="small"
                            type={statusFilter === 'open' ? 'primary' : 'default'}
                            shape="round"
                            onClick={() => setStatusFilter('open')}
                        >
                            Đang mở
                        </Button>
                        <Button
                            size="small"
                            type={statusFilter === 'closed' ? 'primary' : 'default'}
                            shape="round"
                            onClick={() => setStatusFilter('closed')}
                        >
                            Đã đóng
                        </Button>
                        <Divider type="vertical" className="h-6" />
                        <Button
                            size="small"
                            type={platformFilter === 'all' && !channelIdFilter ? 'primary' : 'default'}
                            shape="round"
                            onClick={() => { setPlatformFilter('all'); setChannelIdFilter(null); }}
                        >
                            Tất cả
                        </Button>
                        {channels.map(ch => (
                            <Button
                                key={ch.id}
                                size="small"
                                type={channelIdFilter === ch.channel_id ? 'primary' : 'default'}
                                shape="round"
                                style={channelIdFilter === ch.channel_id ? {} : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                                onClick={() => {
                                    setChannelIdFilter(ch.channel_id);
                                    setPlatformFilter(ch.platform);
                                }}
                            >
                                <Space size={4}>
                                    {ch.platform === 'facebook' ? <FacebookFilled style={{ fontSize: 12, color: channelIdFilter === ch.channel_id ? '#fff' : '#1877f2' }} /> : <Badge status="processing" size="small" />}
                                    {ch.name}
                                </Space>
                            </Button>
                        ))}
                    </div>

                    <div style={{ marginTop: 8 }}>
                        <Input
                            prefix={<Search size={14} color="#94a3b8" />}
                            placeholder="Tìm khách hàng..."
                            variant="filled"
                            style={{ borderRadius: 8 }}
                        />
                    </div>
                </div>

                <div className="convo-list-v2 custom-scroll">
                    {conversations.map(c => (
                        <div
                            key={c.id}
                            className={`convo-item-v2 ${activeConvo?.id === c.id ? 'active' : ''}`}
                            onClick={() => setActiveConvo(c)}
                        >
                            <Checkbox className="absolute left-2 top-4 z-10" />
                            <div className="avatar-wrapper" style={{ marginLeft: 20 }}>
                                <Avatar size={48} src={resolveAvatar(c.customer?.avatar || c.avatar)} />
                                {renderPlatformIconMini(c.platform)}
                            </div>
                            <div className="convo-main-info">
                                <div className="convo-name-row">
                                    <span className="convo-name">{c.customer?.name || c.name || 'Người dùng'}</span>
                                    <span className="convo-meta">{c.last_message_at ? dayjs(c.last_message_at).format('HH:mm') : '2 ngày'}</span>
                                </div>
                                <span className="convo-source-label">
                                    {c.platform === 'facebook' ? 'Facebook' : (c.platform === 'zalo' ? 'Zalo' : 'Hệ thống')}
                                    {c.channel?.name ? ` - ${c.channel.name}` : ''}
                                </span>
                                <div className="convo-preview-row">
                                    <span className="convo-preview-text">{c.last_message_content || 'Chưa có tin nhắn'}</span>
                                    {c.unread_count > 0 ? (
                                        <div className="unread-dot" />
                                    ) : (
                                        <div className={`status-dot-v2 ${c.id % 2 === 0 ? 'online' : 'offline'}`} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* MEMBERS MODAL */}
                <Modal
                    title={<div style={{ fontSize: 16, fontWeight: 700 }}>Thành viên ({groupMembers.length})</div>}
                    open={isMembersModalOpen}
                    onCancel={() => setIsMembersModalOpen(false)}
                    footer={null}
                    width={500}
                    centered
                    className="members-modal"
                >
                    <div style={{ marginBottom: 16, position: 'relative' }}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder="Tìm và thêm nhân viên..."
                            style={{ borderRadius: 8, background: '#f5f5f5', border: 'none', height: 40 }}
                            value={searchMemberQuery}
                            onChange={handleSearchMember}
                            onFocus={() => {
                                if (searchMemberQuery === '') {
                                    const existingIds = groupMembers.map(m => m.user?.id || m.id);
                                    setFoundMembers(allStaff.filter(u => !existingIds.includes(u.id)));
                                }
                            }}
                        />
                        {/* Search Results Dropdown */}
                        {foundMembers.length > 0 && (
                            <div style={{
                                position: 'absolute', top: 45, left: 0, right: 0,
                                background: 'white', borderRadius: 8,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10,
                                maxHeight: 250, overflowY: 'auto', padding: 8
                            }}>
                                <div style={{ fontSize: 11, color: '#888', marginBottom: 4, paddingLeft: 8 }}>
                                    {searchMemberQuery ? 'Kết quả tìm kiếm' : 'Nhân viên đề xuất'}
                                </div>
                                {foundMembers.map(u => (
                                    <div
                                        key={u.id}
                                        onClick={() => handleAddMember(u)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer', borderRadius: 4 }}
                                        className="hover:bg-slate-50"
                                    >
                                        <Avatar src={u.avatar} size={32} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                                            <div style={{ fontSize: 11, color: '#888' }}>{u.email}</div>
                                        </div>
                                        <Button size="small" type="link" style={{ marginLeft: 'auto' }}>Thêm</Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <List
                            itemLayout="horizontal"
                            dataSource={groupMembers}
                            renderItem={(item) => (
                                <List.Item
                                    actions={[
                                        item.role !== 'admin' ? (
                                            <Button
                                                danger
                                                size="small"
                                                type="primary"
                                                style={{ borderRadius: 4, height: 28, fontSize: 12 }}
                                                onClick={() => handleRemoveMember(item)}
                                            >
                                                Rời
                                            </Button>
                                        ) : <Tag color="blue">Admin</Tag>
                                    ]}
                                    style={{ borderBottom: 'none', padding: '8px 0' }}
                                >
                                    <List.Item.Meta
                                        avatar={
                                            <div style={{ position: 'relative' }}>
                                                <Avatar src={resolveAvatar(item.user?.avatar || item.avatar)} size={40} />
                                                {/* <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: '#52c41a', borderRadius: '50%', border: '2px solid #fff' }} /> */}
                                            </div>
                                        }
                                        title={<span style={{ fontWeight: 600, fontSize: 14 }}>{item.user?.name || item.name}</span>}
                                        description={
                                            <div>
                                                <div style={{ fontSize: 12, color: '#003366', fontWeight: 500 }}>{item.user?.email || item.email}</div>
                                                <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                                                    {item.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                                                </div>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                </Modal>
            </div>

            {/* COLUMN 2: CHAT BOX */}
            <div className="chat-v2-main">
                {activeConvo ? (
                    <>
                        <div className="chat-header-v2">
                            <div className="header-user-info">
                                <Avatar size={42} src={resolveAvatar(activeConvo.customer?.avatar || activeConvo.avatar)} />
                                <div className="header-user-details">
                                    <div className="user-name">{activeConvo.customer?.name || activeConvo.name}</div>
                                    <div className="platform-link">
                                        {typingStatus[activeConvo.id] ? (
                                            <span style={{ color: '#22c55e', fontWeight: 600 }}>{typingStatus[activeConvo.id]} đang gõ...</span>
                                        ) : (
                                            <a
                                                href={getPlatformUrl(activeConvo) || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="header-external-link"
                                                onClick={(e) => !getPlatformUrl(activeConvo) && e.preventDefault()}
                                            >
                                                {activeConvo.platform === 'facebook' ? <FacebookFilled style={{ color: '#1877f2', fontSize: 14 }} /> : <MessageCircle size={14} />}
                                                <span>
                                                    {activeConvo.platform === 'facebook' ? 'Facebook' : 'Hệ thống'}
                                                    {activeConvo.channel?.name ? ` - ${activeConvo.channel.name}` : ''}
                                                </span>
                                                <ExternalLink size={12} style={{ opacity: 0.6 }} />
                                            </a>
                                        )}
                                        {activeConvo.channel ? (
                                            <Space split={<Divider type="vertical" />}>
                                                <Badge
                                                    status={activeConvo.channel.is_active ? 'success' : 'error'}
                                                    text={activeConvo.channel.name}
                                                    style={{ fontWeight: 600 }}
                                                />
                                                <Badge
                                                    status={connectionStatus === 'connected' ? 'success' : (connectionStatus === 'connecting' ? 'processing' : 'error')}
                                                    text={connectionStatus === 'connected' ? 'Máy chủ: OK' : 'Máy chủ: Lỗi'}
                                                    style={{ fontSize: '11px', opacity: 0.8 }}
                                                />
                                            </Space>
                                        ) : (
                                            <Space split={<Divider type="vertical" />}>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>Khách vãng lai</span>
                                                <Badge
                                                    status={connectionStatus === 'connected' ? 'success' : (connectionStatus === 'connecting' ? 'processing' : 'error')}
                                                    text={connectionStatus === 'connected' ? 'Máy chủ: OK' : 'Máy chủ: Lỗi'}
                                                    style={{ fontSize: '11px', opacity: 0.8 }}
                                                />
                                            </Space>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div
                                    style={{ display: 'flex', position: 'relative', marginRight: 8, cursor: 'pointer' }}
                                    onClick={openMembersModal}
                                >
                                    <Tooltip title="Quản lý thành viên">
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <Avatar.Group maxCount={3} size={24} maxStyle={{ color: '#f56a00', backgroundColor: '#fde3cf', fontSize: 10, width: 24, height: 24, lineHeight: '24px' }}>
                                                {groupMembers.map(mem => (
                                                    <Tooltip key={mem.id} title={mem.user?.name || mem.name}>
                                                        <Avatar src={resolveAvatar(mem.user?.avatar || mem.avatar)} style={{ border: '2px solid #fff' }} />
                                                    </Tooltip>
                                                ))}
                                            </Avatar.Group>
                                            <Avatar
                                                size={24}
                                                style={{ backgroundColor: '#f0f0f0', color: '#8c8c8c', border: '2px solid #fff', marginLeft: groupMembers.length > 0 ? -8 : 0, cursor: 'pointer' }}
                                                icon={<UserOutlined style={{ fontSize: 12 }} />}
                                            />
                                        </div>
                                    </Tooltip>
                                </div>
                                <Select
                                    defaultValue="open"
                                    size="small"
                                    variant="borderless"
                                    dropdownStyle={{ minWidth: 120 }}
                                    prefix={<div style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%', marginRight: 4 }} />}
                                    options={[
                                        { value: 'open', label: 'Đang mở' },
                                        { value: 'pending', label: 'Chờ xử lý' },
                                        { value: 'closed', label: 'Đã đóng' },
                                    ]}
                                />
                                <Button icon={<MoreHorizontal size={20} />} type="text" />
                            </div>
                        </div>

                        <div className="chat-sub-header">
                            <Button
                                size="small"
                                type="text"
                                icon={<TagOutlined />}
                                onClick={() => setIsTagsManagerOpen(true)}
                            >
                                Thêm Tags
                            </Button>
                            <Tooltip title="Quản lý mẫu tin nhắn">
                                <Button
                                    size="small"
                                    type="text"
                                    icon={<MessageFilled />}
                                    onClick={() => setIsQuickRepliesManagerOpen(true)}
                                >
                                    Mẫu tin nhắn
                                </Button>
                            </Tooltip>
                        </div>

                        <div className="message-thread-v2 custom-scroll" ref={scrollRef}>
                            <div className="system-event">Hệ thống bắt đầu phiên làm việc</div>
                            {messages.map((m, idx) => {
                                const isMe = m.sender_id === user.id;
                                return (
                                    <div key={m.id || idx} className={`msg-group ${isMe ? 'msg-sent' : 'msg-received'}`}>
                                        {!isMe && (
                                            <div className="msg-info-v2">
                                                {m.sender?.name || 'Khách hàng'} • {dayjs(m.created_at).format('HH:mm')}
                                            </div>
                                        )}

                                        <div className={`msg-bubble-v2 ${m.status === 'sending' ? 'msg-sending' : ''} ${m.type === 'image' ? 'msg-image-bubble' : ''}`}>
                                            {renderMessageContent(m)}

                                            {isMe && (
                                                <div className="msg-status-icon">
                                                    {m.status === 'sending' ? (
                                                        <Clock size={10} style={{ opacity: 0.7 }} />
                                                    ) : (m.status === 'error' || m.status === 'failed') ? (
                                                        <Tooltip title="Gửi tin thất bại. Vui lòng kiểm tra lại kết nối hoặc Token.">
                                                            <ExclamationCircleOutlined style={{ fontSize: 12, color: '#ff4d4f' }} />
                                                        </Tooltip>
                                                    ) : (
                                                        <CheckOutlined style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }} />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {isMe && (
                                            <div className="msg-info-v2" style={{ marginTop: 4, textAlign: 'right' }}>
                                                {dayjs(m.created_at).format('HH:mm')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="chat-input-v2" style={{ position: 'relative' }}>
                            {/* Quick Reply Selector */}
                            {showQuickReply && (
                                <QuickReplySelector
                                    onSelect={(content) => {
                                        setInputText(content);
                                        setShowQuickReply(false);
                                    }}
                                />
                            )}

                            <div className="chat-input-toolbar">
                                <MediaUploader
                                    onUploadComplete={async (file) => {
                                        if (!activeConvo) return;
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        formData.append('conversation_id', activeConvo.id);
                                        try {
                                            const res = await chatApi.post('v1/omnichannel/messages', formData);
                                            // Ensure we use the normalized data to avoid double item in list
                                            addMessage(activeConvo.id, res.data);
                                            scrollToBottom();
                                        } catch (err) {
                                            antMessage.error('Gửi file thất bại');
                                        }
                                    }}
                                />

                                <EmojiPicker
                                    onEmojiSelect={(emoji) => setInputText(prev => prev + emoji)}
                                />

                                <Tooltip title="Tin nhắn mẫu (Gõ / để mở)">
                                    <div
                                        className={`toolbar-icon-btn ${showQuickReply ? 'active' : ''}`}
                                        onClick={() => setShowQuickReply(!showQuickReply)}
                                    >
                                        <Zap size={20} />
                                    </div>
                                </Tooltip>
                            </div>

                            {/* Input */}
                            <Input
                                placeholder="Nhập @ để chat riêng, / để chọn tin mẫu..."
                                size="large"
                                value={inputText}
                                onChange={e => {
                                    const value = e.target.value;
                                    setInputText(value);
                                    handleTyping();

                                    // Detect "/" trigger
                                    if (value.startsWith('/') && value.length >= 1) {
                                        setShowQuickReply(true);
                                    } else {
                                        setShowQuickReply(false);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setShowQuickReply(false);
                                    }
                                }}
                                onPressEnter={handleSend}
                                variant="borderless"
                                style={{ padding: '0 12px' }}
                                suffix={<SendOutlined style={{ color: '#0084ff', fontSize: 20, cursor: 'pointer' }} onClick={handleSend} />}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 items-center justify-center bg-slate-50">
                        <div className="text-center">
                            <MessageCircle size={48} color="#cbd5e1" className="mx-auto mb-4" />
                            <Text type="secondary">Chọn một hội thoại để bắt đầu</Text>
                        </div>
                    </div>
                )}
            </div>

            {/* COLUMN 3: CRM PANEL */}
            <div className="chat-v2-crm custom-scroll">
                <div className="crm-tabs-header">
                    <Tabs
                        centered
                        activeKey={crmTab}
                        onChange={setCrmTab}
                        items={[
                            { key: 'customer', label: 'Khách' },
                            { key: 'staff', label: 'Nhân sự' }
                        ]}
                    />
                </div>

                {activeConvo ? (
                    <div className="crm-content">
                        {crmTab === 'customer' ? (
                            <>
                                {/* Hero Section */}
                                <div className="crm-profile-hero">
                                    <div className="hero-avatar-container">
                                        <Avatar size={90} src={resolveAvatar(activeConvo?.customer?.avatar)} icon={<UserOutlined />} />
                                        <div className="online-ring" />
                                    </div>
                                    <div className="hero-name">{activeConvo?.customer?.name || activeConvo?.name || 'Khách hàng'}</div>
                                    <div className="hero-actions">
                                        <Button icon={<FacebookFilled style={{ color: '#1877f2' }} />} shape="circle" size="middle" />
                                        <Button icon={<MoreHorizontal size={16} />} shape="circle" size="middle" />
                                    </div>
                                    <Button
                                        type="primary"
                                        icon={<MessageFilled />}
                                        className="mt-4 w-full h-9 font-semibold"
                                        style={{ background: '#22c55e', borderColor: '#22c55e', borderRadius: '6px' }}
                                    >
                                        Nhắn tin
                                    </Button>
                                </div>

                                {/* Detailed Info */}
                                <div className="crm-data-section">
                                    <div className="data-row items-center">
                                        <span className="data-label flex items-center gap-2"><Mail size={14} /> Email</span>
                                        <Input
                                            size="small"
                                            variant="borderless"
                                            defaultValue={activeConvo?.customer?.email}
                                            onBlur={(e) => handleUpdateCustomer('email', e.target.value)}
                                            placeholder="Click để sửa"
                                            style={{ textAlign: 'right', color: '#3b82f6', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div className="data-row items-center">
                                        <span className="data-label flex items-center gap-2"><Phone size={14} /> SĐT</span>
                                        <Input
                                            size="small"
                                            variant="borderless"
                                            defaultValue={activeConvo?.customer?.phone}
                                            onBlur={(e) => handleUpdateCustomer('phone', e.target.value)}
                                            placeholder="Click để sửa"
                                            style={{ textAlign: 'right', color: '#3b82f6', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div className="data-row items-center">
                                        <span className="data-label flex items-center gap-2">Giai đoạn</span>
                                        <Select
                                            size="small"
                                            variant="borderless"
                                            defaultValue={activeConvo?.customer?.type || 'lead'}
                                            onChange={(val) => handleUpdateCustomer('type', val)}
                                            className="funnel-select"
                                            popupClassName="funnel-popup"
                                            options={[
                                                { value: 'lead', label: 'TIỀM NĂNG' },
                                                { value: 'customer', label: 'KHÁCH HÀNG' },
                                                { value: 'returning', label: 'QUAY LẠI' },
                                            ]}
                                            style={{ minWidth: 100, textAlign: 'right', color: '#3b82f6' }}
                                        />
                                    </div>
                                    <div className="data-row">
                                        <span className="data-label">Ảnh đại diện</span>
                                        <div className="flex items-center gap-1 cursor-pointer hover:underline text-blue-500 text-xs">
                                            <Avatar size={16} src={resolveAvatar(activeConvo?.customer?.avatar)} />
                                            <span>Thay đổi</span>
                                        </div>
                                    </div>
                                    <div className="text-blue-500 text-xs mt-2 cursor-pointer hover:underline font-medium">Hiển thị thêm</div>
                                </div>

                                {/* Tags */}
                                <div className="crm-data-section">
                                    <div className="section-head">
                                        <span>Nhãn</span>
                                        <div
                                            onClick={() => setIsTagSelectorOpen(true)}
                                            className="cursor-pointer text-slate-400 hover:text-blue-500"
                                        >
                                            <TagOutlined />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {activeConvo?.tags?.map(tag => (
                                            <Tag
                                                key={tag.id}
                                                color={tag.color || 'blue'}
                                                closable
                                                onClose={() => handleToggleTag(tag.id)}
                                                style={{ borderRadius: 4, margin: 0, fontSize: '11px' }}
                                            >
                                                {tag.name}
                                            </Tag>
                                        ))}
                                        {!activeConvo?.tags?.length && !isTagSelectorOpen && (
                                            <div onClick={() => setIsTagSelectorOpen(true)} className="text-xs text-slate-400 italic cursor-pointer">Thêm nhãn...</div>
                                        )}
                                        {isTagSelectorOpen && (
                                            <Select
                                                autoOpen
                                                size="small"
                                                placeholder="Chọn nhãn..."
                                                onSelect={(val) => handleToggleTag(val)}
                                                onBlur={() => setIsTagSelectorOpen(false)}
                                                style={{ width: 120 }}
                                            >
                                                {availableTags
                                                    .filter(t => !activeConvo?.tags?.some(at => at.id === t.id))
                                                    .map(t => (
                                                        <Option key={t.id} value={t.id}>{t.name}</Option>
                                                    ))
                                                }
                                            </Select>
                                        )}
                                    </div>
                                </div>

                                {/* Assignment */}
                                <div className="crm-data-section">
                                    <div className="section-head"><span>Phụ trách</span></div>
                                    <div className="flex items-center justify-between">
                                        <Space>
                                            <Avatar size={24} src={currentUser?.avatar} icon={<UserOutlined />} />
                                            <span className="text-sm">{currentUser?.name || "Chưa phân công"}</span>
                                        </Space>
                                        <EditOutlined className="text-slate-400 cursor-pointer" onClick={() => setIsMembersModalOpen(true)} />
                                    </div>
                                </div>

                                {/* Tasks, Notes, Orders */}
                                <div className="crm-data-section">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[13px] font-bold text-slate-600">Nhắc việc</span>
                                        <span className="text-blue-500 text-xs cursor-pointer hover:underline">Tạo mới</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[13px] font-bold text-slate-600">Ghi chú</span>
                                        <span className="text-blue-500 text-xs cursor-pointer hover:underline">Thêm ghi chú</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-bold text-slate-600">Đơn hàng <Tag className="m-0 ml-1 bg-slate-100 border-none text-[10px]">0</Tag></span>
                                        <span className="text-blue-500 text-xs cursor-pointer hover:underline">Tạo đơn</span>
                                    </div>
                                    <Text type="secondary" className="text-[11px] italic block mt-2 text-slate-400">Chưa tạo đơn hàng nào</Text>
                                </div>

                                {/* Conversation History */}
                                <div className="crm-data-section" style={{ borderBottom: 'none' }}>
                                    <div className="section-head">
                                        <span>Lịch sử hội thoại </span>
                                        <span className="bg-slate-100 text-slate-500 px-1.5 rounded-full text-[10px]">{timeline.length}</span>
                                    </div>
                                    {timeline.length > 0 ? (
                                        <div className="history-list">
                                            {timeline.map((item, idx) => (
                                                <div key={idx} className="history-item-v2 relative pl-4 pb-4 last:pb-0">
                                                    {idx !== timeline.length - 1 && <div className="absolute left-[3px] top-[14px] bottom-0 w-[1px] bg-slate-100" />}
                                                    <div className="absolute left-0 top-[6px] w-[7px] h-[7px] bg-blue-400 rounded-full" />
                                                    <div className="history-title text-slate-800 font-medium text-[13px] mb-0.5">
                                                        {item.title}
                                                    </div>
                                                    <div className="history-meta text-slate-400 text-[11px]">
                                                        {item.content} • {dayjs(item.time).fromNow()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-slate-400 italic text-xs bg-slate-50 rounded">Chưa có lịch sử tương tác</div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="crm-staff-section p-4">
                                <div className="section-head mb-4"><span>Thành viên hội thoại</span></div>
                                <List
                                    itemLayout="horizontal"
                                    dataSource={groupMembers}
                                    renderItem={item => (
                                        <List.Item>
                                            <List.Item.Meta
                                                avatar={<Avatar src={resolveAvatar(item.user?.avatar || item.avatar)} />}
                                                title={item.user?.name || item.name}
                                                description={item.user?.email || "Nhân viên"}
                                            />
                                        </List.Item>
                                    )}
                                />

                                <div className="section-head mt-8 mb-4"><span>Phân công phụ trách</span></div>
                                <div className="assignment-section bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Avatar icon={<UserOutlined />} src={currentUser?.avatar} />
                                        <div>
                                            <div className="text-sm font-semibold">{currentUser?.name}</div>
                                            <div className="text-xs text-slate-500">Đang phụ trách</div>
                                        </div>
                                    </div>
                                    <Button size="small" className="w-full text-xs" onClick={() => setIsMembersModalOpen(true)}>
                                        Chuyển người phụ trách
                                    </Button>
                                </div>

                                <div className="section-head mt-8 mb-4"><span>Cộng tác viên</span></div>
                                <Text type="secondary" className="text-xs italic">Chưa có cộng tác viên nào</Text>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-400">
                        <UserOutlined style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }} />
                        <div>Chọn hội thoại để xem thông tin</div>
                    </div>
                )}
            </div>

            {/* MANAGER MODALS */}
            <TagsManagerModal
                visible={isTagsManagerOpen}
                onClose={() => {
                    setIsTagsManagerOpen(false);
                    fetchConversations(); // Reload to get updated tags
                }}
            />

            <QuickRepliesManagerModal
                visible={isQuickRepliesManagerOpen}
                onClose={() => setIsQuickRepliesManagerOpen(false)}
            />
        </div >
    );
};

export default ChatBoxV2;
