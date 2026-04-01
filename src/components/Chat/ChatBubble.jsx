import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import chatApi from '../../services/chatApi';
import { useChatStore } from '../../stores/useChatStore';
import { Badge, Modal, Button, Avatar, message as antMessage, Tabs, List, Spin, Popover } from 'antd'; import { MessageOutlined, PhoneOutlined, NotificationOutlined, CheckCircleOutlined, FullscreenOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import './ChatBubble.css';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const ChatBubble = ({ user }) => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [yPosition, setYPosition] = useState(window.innerHeight / 2 - 50);
    const [side, setSide] = useState('right'); // 'left' or 'right'
    const [isDragging, setIsDragging] = useState(false);

    // Global Store Bindings (Optimized)
    const {
        internalConversations: staffConversations,
        unreadInternalCount: unreadStaffCount,
        notifications,
        unreadNotifyCount,
        initGlobalData,
        initGlobalSocket,
        markAllInternalRead,
        markAllNotifyRead,
        markNotifyReadLocal
    } = useChatStore();

    // 1. Khởi tạo Global Data & Socket (Delayed for performance)
    useEffect(() => {
        if (!user.id) return;

        // Trì hoãn việc gọi API để ưu tiên tài nguyên cho trang hiện tại tải xong
        // (Tránh tranh chấp băng thông/CPU ngay lúc vừa vào trang)
        const initTimeout = setTimeout(() => {
            console.log("[ChatWidget] 🚀 Initializing global data (deferred)...");
            initGlobalData();
            initGlobalSocket(user.id);
        }, 2200); // Trì hoãn ~2.2 giây

        // Định kỳ sync lại (ví dụ 5 phút 1 lần) làm backup cho Socket
        const syncInterval = setInterval(() => {
            console.log("[ChatWidget] ⏳ Periodic sync triggered...");
            initGlobalData({ force: true });
        }, 5 * 60 * 1000);

        // Lắng nghe window event nếu có cuộc gọi đến
        const handleCall = (e) => {
            setIncomingCall(e.detail);
            setIsCallModalOpen(true);
            setIsOpen(true);
        };
        window.addEventListener('global-incoming-call', handleCall);

        // 2. [Web-Push] Request Notification Permission & Subscribe (Non-blocking)
        import('../../utils/pushManager').then(({ checkNotificationPermission, subscribeUserToPush }) => {
            checkNotificationPermission().then(permission => {
                if (permission === 'granted') subscribeUserToPush();
            });
        }).catch(err => console.debug('[ChatWidget] PushManager skip:', err));

        // 3. [FCM] Listen for Foreground Messages
        import('../../services/firebase').then(({ onMessageListener }) => {
            onMessageListener((payload) => {
                antMessage.info({
                    content: (
                        <div>
                            <div style={{ fontWeight: 'bold' }}>{payload.notification?.title || 'Thông báo mới'}</div>
                            <div>{payload.notification?.body}</div>
                        </div>
                    ),
                    duration: 5,
                    icon: <NotificationOutlined style={{ color: '#1890ff' }} />
                });
            });
        }).catch(err => console.debug('[ChatWidget] FCM skip:', err));

        // Dọn dẹp
        return () => {
            clearTimeout(initTimeout);
            clearInterval(syncInterval);
            window.removeEventListener('global-incoming-call', handleCall);
        };
    }, [user.id, initGlobalData, initGlobalSocket]);

    // DRAG EVENT HANDLER (Horizontal Snapping + Vertical Move)
    const handleStartDrag = (e) => {
        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        if (!isTouch && e.button !== 0) return;

        setIsDragging(false);
        let hasMoved = false;
        const startY = clientY - yPosition;

        const onMove = (moveEvent) => {
            const currentX = isTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            
            if (Math.abs(currentY - clientY) > 5 || Math.abs(currentX - clientX) > 20) {
                setIsDragging(true);
                hasMoved = true;
            }

            // Always update Y
            let newY = currentY - startY;
            newY = Math.max(50, Math.min(newY, window.innerHeight - 150));
            setYPosition(newY);

            // X-axis snapping preview on release, but we can visual feedback here if needed
        };

        const onEnd = (endEvent) => {
            const finalX = isTouch ? endEvent.changedTouches[0].clientX : endEvent.clientX;
            
            if (hasMoved) {
                // Snap to Side
                if (finalX < window.innerWidth / 2) setSide('left');
                else setSide('right');
            }

            document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
            document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
        };

        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: false });
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
    };

    const handleMarkAllRead = async (type = 'chat') => {
        try {
            if (type === 'chat') {
                await markAllInternalRead();
                antMessage.success('Đã đánh dấu đọc tất cả tin nhắn nội bộ');
            } else {
                await markAllNotifyRead();
                antMessage.success('Đã đánh dấu đọc tất cả thông báo');
            }
        } catch (err) {
            antMessage.error('Thao tác thất bại');
        }
    };

    const handleAcceptCall = () => {
        setIsCallModalOpen(false);
        navigate('/chat-v2');
    };

    const renderConversationList = (dataSource, typeLabel) => (
        <div className="widget-tab-content">
            <div className="widget-header-actions">
                <div className="tab-title-tag">{typeLabel}</div>
                <div className="action-group">
                    <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleMarkAllRead('chat')}>Đọc hết</Button>
                    <Button type="link" size="small" icon={<FullscreenOutlined />} onClick={() => { setIsOpen(false); navigate('/internal-chat'); }}>Mở rộng</Button>
                </div>
            </div>
            <List
                className="widget-list"
                dataSource={dataSource}
                locale={{ emptyText: `Chưa có cuộc hội thoại ${typeLabel.toLowerCase()} nào` }}
                renderItem={item => {
                    const otherParticipant = item.participants?.find(p => p.user_id !== user.id)?.user;
                    const lastMsg = item.messages?.[0];
                    return (
                        <List.Item
                            onClick={async () => {
                                if (item.unread_count > 0) await chatApi.post(`v1/internal/conversations/${item.id}/read`);
                                setIsOpen(false);
                                navigate(`/internal-chat?conversation_id=${item.id}`);
                            }}
                            className={item.unread_count > 0 ? 'unread' : ''}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Badge dot={item.unread_count > 0} color="#ff4d4f">
                                        <Avatar
                                            src={otherParticipant?.avatar}
                                            icon={!otherParticipant?.avatar && <MessageOutlined />}
                                            className={item.platform !== 'internal' ? 'customer-avatar' : ''}
                                        />
                                    </Badge>
                                }
                                title={
                                    <div className="item-title">
                                        <span className="name-truncate">{item.name || otherParticipant?.name || 'Vãng lai'}</span>
                                        {item.platform !== 'internal' && <span className={`platform-tag ${item.platform}`}>{item.platform}</span>}
                                    </div>
                                }
                                description={
                                    <div className="item-desc-wrapper">
                                        <div className="item-desc">{lastMsg?.content || 'Chưa có tin nhắn'}</div>
                                        <div className="item-time">{lastMsg ? dayjs(lastMsg.created_at).fromNow(true) : ''}</div>
                                    </div>
                                }
                            />
                        </List.Item>
                    );
                }}
            />
        </div>
    );

    const content = (
        <div className="chat-widget-panel">
            <Tabs defaultActiveKey="staff" size="small" className="widget-main-tabs" items={[
                {
                    key: 'staff',
                    label: (
                        <Badge count={unreadStaffCount} size="small" offset={[10, 0]}>
                            <span>Hội thoại nội bộ</span>
                        </Badge>
                    ),
                    children: renderConversationList(staffConversations, 'Nội bộ')
                },
                {
                    key: 'notify',
                    label: (
                        <Badge count={unreadNotifyCount} size="small" offset={[10, 0]}>
                            <span>Thông báo</span>
                        </Badge>
                    ),
                    children: (
                        <div className="widget-tab-content">
                            <div className="widget-header-actions">
                                <span className="tab-title-tag">Hệ thống</span>
                                <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleMarkAllRead('notify')}>Đọc hết</Button>
                            </div>
                            <List
                                className="widget-list"
                                dataSource={notifications}
                                renderItem={item => (
                                    <List.Item
                                        className={!item.read_at ? 'unread' : ''}
                                        onClick={async () => {
                                            if (!item.read_at) {
                                                markNotifyReadLocal(item.id);
                                                chatApi.post(`v1/notifications/${item.id}/read`).catch(console.error);
                                            }
                                            if (item.data?.url) {
                                                if (item.data.url.startsWith('/')) {
                                                    window.location.href = item.data.url;
                                                } else {
                                                    window.open(item.data.url, '_blank');
                                                }
                                                setIsOpen(false);
                                            }
                                        }}
                                    >
                                        <List.Item.Meta
                                            avatar={<Avatar icon={<NotificationOutlined />} style={{ backgroundColor: '#87d068' }} />}
                                            title={<div className="item-title"><span>{item.data?.title || 'Thông báo hệ thống'}</span></div>}
                                            description={
                                                <div className="item-desc-wrapper">
                                                    <div className="item-desc">{item.data?.message || item.data?.content || ''}</div>
                                                    <div className="item-time">{dayjs(item.created_at).fromNow(true)}</div>
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        </div>
                    )
                }
            ]} />
        </div>
    );

    if (!user.id) return null;

    const sideStyles = side === 'left' ? { left: 6, right: 'auto' } : { right: 6, left: 'auto' };

    return (
        <>
            <div className="chat-side-widget-container" style={{ ...sideStyles, top: yPosition, bottom: 'auto', transform: 'none' }}>
                {/* Chat/Support Tab */}
                <Popover
                    content={content}
                    trigger="click"
                    open={isOpen}
                    onOpenChange={(open) => !isDragging && setIsOpen(open)}
                    placement={side === 'left' ? "rightTop" : "leftTop"}
                    overlayClassName="chat-widget-popover"
                >
                    <div
                        className={`chat-side-tab messenger ${isOpen ? 'active' : ''} ${isDragging ? 'dragging' : ''} side-${side}`}
                        onMouseDown={handleStartDrag}
                        onTouchStart={handleStartDrag}
                    >
                        <div className="tab-content">
                            <Badge count={(unreadStaffCount || 0) + (unreadNotifyCount || 0)} offset={side === 'left' ? [5, 5] : [-5, 5]}>
                                <div className="status-indicator" title="Online"></div>
                                <span className="tab-label">Hỗ trợ</span>
                            </Badge>
                        </div>
                    </div>
                </Popover>
            </div>

            {/* Global Incoming Call Modal */}
            <Modal
                title="📞 Cuộc gọi đang đến..."
                open={isCallModalOpen}
                onCancel={() => setIsCallModalOpen(false)}
                centered
                closable={false}
                maskClosable={false}
                footer={[
                    <Button key="decline" danger size="large" onClick={() => setIsCallModalOpen(false)}>Từ chối</Button>,
                    <Button key="accept" type="primary" size="large" icon={<PhoneOutlined />} onClick={handleAcceptCall}>Chấp nhận</Button>
                ]}
            >
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <Avatar size={80} src={incomingCall?.caller_avatar} style={{ border: '4px solid #1890ff' }} />
                    <h2 style={{ marginTop: 20 }}>{incomingCall?.caller_name}</h2>
                    <p>Đang gọi {incomingCall?.type === 'video' ? 'Video' : 'Audio'} cho bạn...</p>
                </div>
            </Modal>
        </>
    );
};

export default ChatBubble;
