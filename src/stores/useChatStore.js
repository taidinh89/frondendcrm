import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import chatApi from '../services/chatApi';
import { createChatEcho } from '../services/echo';
import { message as antMessage } from 'antd';

// RAM hard limits to prevent memory issues, similar to mobile app
const RAM_MSG_LIMIT = 120;
const RAM_CONVO_LIMIT = 200;

export const useChatStore = create(
    persist(
        (set, get) => ({
            // --- OMNICHANNEL CHAT STATE ---
            conversations: [],
            activeMessages: [],
            isLoadingConvos: false,
            isLoadingMessages: false,
            lastSync: null,
            typingStatus: {},
            activeConversationId: null,

            // --- INTERNAL CHAT & NOTIFICATION STATE ---
            internalConversations: [],
            unreadInternalCount: 0,
            notifications: [],
            unreadNotifyCount: 0,

            // --- GLOBAL SOCKET ---
            globalEcho: null,
            activeConvoChannelName: null,
            connectionStatus: 'disconnected', // 'connected', 'connecting', 'disconnected', 'error'

            // ==========================================
            // 1. GLOBAL INITIALIZATION (Call once on login/mount)
            // ==========================================
            initGlobalData: async (options = {}) => {
                const { 
                    force = false, 
                    statusFilter = 'open', 
                    platformFilter = 'all', 
                    channelIdFilter = null 
                } = options;

                const state = get();
                if (state.isLoadingConvos) return;

                // Tối ưu hóa Throttling: Dựa trên thời gian Cache 6 tiếng đã nâng cấp ở Backend
                // Chỉ buộc fetch lại nếu force=true hoặc dữ liệu đã cũ hơn 30 phút (để đảm bảo tính mới)
                const now = Date.now();
                const lastSyncTime = state.lastSync ? new Date(state.lastSync).getTime() : 0;
                if (!force && (now - lastSyncTime < 1800000)) { // 30 minutes
                    console.debug("[ChatStore] ⏩ Bỏ qua init global (Dữ liệu còn trong hạn 30p)");
                    return;
                }

                set({ isLoadingConvos: true });
                console.info("%c[ChatStore] 🔄 Đang đồng bộ dữ liệu Chat/Thông báo...", "color: #2196f3; font-weight: bold;");

                try {
                    let omniUrl = `v1/omnichannel/conversations?status=${statusFilter}`;
                    if (platformFilter !== 'all') omniUrl += `&platform=${platformFilter}`;
                    if (channelIdFilter) omniUrl += `&channel_id=${channelIdFilter}`;

                    // Fetch song song 3 nguồn dữ liệu đề tăng tốc
                    const [omniRes, internalRes, notifyRes] = await Promise.allSettled([
                        chatApi.get(omniUrl),
                        chatApi.get('v1/internal/conversations'),
                        chatApi.get('v1/notifications')
                    ]);

                    const updates = { isLoadingConvos: false, lastSync: new Date().toISOString() };

                    // Parse Omnichannel
                    if (omniRes.status === 'fulfilled') {
                        const raw = omniRes.value.data;
                        const list = Array.isArray(raw) ? raw : (raw?.data || []);
                        updates.conversations = list.slice(0, RAM_CONVO_LIMIT);
                    }

                    // Parse Internal
                    if (internalRes.status === 'fulfilled') {
                        const raw = internalRes.value.data ?? [];
                        const internalList = Array.isArray(raw) ? raw : (Array.isArray(raw.data) ? raw.data : []);
                        updates.internalConversations = internalList;
                        updates.unreadInternalCount = (raw && raw.unread_total !== undefined)
                            ? raw.unread_total
                            : internalList.reduce((acc, c) => acc + (c.unread_count || 0), 0);
                    }

                    // Parse Notifications
                    if (notifyRes.status === 'fulfilled') {
                        const raw = notifyRes.value.data?.data ?? notifyRes.value.data ?? [];
                        const notifyList = Array.isArray(raw) ? raw : [];
                        updates.notifications = notifyList;
                        updates.unreadNotifyCount = notifyList.filter(n => !n.read_at).length;
                    }

                    set(updates);

                    // Nếu thành công, tự động khởi động Socket nếu chưa có
                    if (!state.globalEcho) {
                        const userId = (state.conversations[0]?.participants?.find(p => p.role === 'admin')?.user_id) || 
                                     JSON.parse(localStorage.getItem('user') || '{}')?.id;
                        if (userId) get().initGlobalSocket(userId);
                    }

                } catch (error) {
                    console.error("[ChatStore] Lỗi đồng bộ Global", error);
                    set({ isLoadingConvos: false, connectionStatus: 'error' });
                }
            },

            initGlobalSocket: (userId) => {
                if (!userId) return;

                // Tránh khởi tạo chồng chéo
                if (get().globalEcho) return;

                const echoInstance = createChatEcho();
                if (!echoInstance) {
                    set({ connectionStatus: 'error' });
                    return;
                }

                console.info('%c[GlobalStore] 📡 Khởi tạo kết nối Realtime (Socket)...', 'color: #9c27b0; font-weight: bold;');

                const channel = echoInstance.private(`user.${userId}`);

                channel.listen('.IncomingCall', (e) => {
                    console.warn('%c[GlobalStore] 📞 CUỘC GỌI MIẾN PHÍ:', 'color: red; font-weight: bold; font-size: 1.2em;', e);
                    window.dispatchEvent(new CustomEvent('global-incoming-call', { detail: e }));
                });

                channel.notification((payload) => {
                    const state = get();
                    if (payload.unread_total !== undefined) {
                        set({ unreadInternalCount: payload.unread_total });
                    }
                    if (payload.type === 'NewMessage' && payload.message) {
                        get().addMessage(payload.message.conversation_id, payload.message);
                        if (payload.message.sender_id !== userId && String(state.activeConversationId) !== String(payload.message.conversation_id)) {
                            antMessage.success({
                                content: `💬 ${payload.message.sender?.name || 'Ai đó'}: ${payload.message.content?.substring(0, 30)}...`,
                                duration: 4
                            });
                        }
                    } else {
                        set({ unreadNotifyCount: state.unreadNotifyCount + 1 });
                        if (payload.title) antMessage.info(payload.title);
                        get().refreshNotifications();
                    }
                });

                set({ globalEcho: echoInstance });

                // Theo dõi trạng thái kết nối
                echoInstance.connector.pusher.connection.bind('state_change', (states) => {
                    console.info('[Socket] Trạng thái:', states.previous, '→', states.current);
                    let status = 'disconnected';
                    if (states.current === 'connected') status = 'connected';
                    else if (states.current === 'connecting') status = 'connecting';
                    else if (states.current === 'unavailable' || states.current === 'failed') status = 'error';
                    set({ connectionStatus: status });
                });
            },

            // --- Quản lý Kênh Trò Chuyện Riêng Biệt (Room Channel) ---
            subscribeToConvo: (convoId) => {
                const { globalEcho, activeConvoChannelName } = get();
                if (!globalEcho || !convoId) return;

                const newChannelName = `private-conversation.${convoId}`;
                if (activeConvoChannelName === newChannelName) return; // Đã subscribe rồi

                // 1. Unsubscribe kênh cũ nếu có
                if (activeConvoChannelName) {
                    globalEcho.leave(activeConvoChannelName.replace('private-', ''));
                    console.debug(`[Socket] 🔴 Rời kênh: ${activeConvoChannelName}`);
                }

                // 2. Join kênh mới
                const channel = globalEcho.private(`conversation.${convoId}`);
                console.info(`%c[Socket] 🟢 Tham gia kênh: ${newChannelName}`, 'color: #4caf50; font-weight: bold;');

                channel.listen('.MessageSent', (e) => {
                    console.debug('[Socket] 💬 MessageSent event:', e);
                    get().addMessage(convoId, e.message);
                });

                channel.listenForWhisper('typing', (e) => {
                    set((s) => ({ typingStatus: { ...s.typingStatus, [convoId]: e.name } }));
                    setTimeout(() => {
                        set((s) => {
                            const newStatus = { ...s.typingStatus };
                            delete newStatus[convoId];
                            return { typingStatus: newStatus };
                        });
                    }, 3000);
                });

                set({ activeConvoChannelName: newChannelName });
            },

            unsubscribeFromConvo: () => {
                const { globalEcho, activeConvoChannelName } = get();
                if (globalEcho && activeConvoChannelName) {
                    globalEcho.leave(activeConvoChannelName.replace('private-', ''));
                    set({ activeConvoChannelName: null, typingStatus: {} });
                    console.debug(`[Socket] 🔴 Ngắt kết nối kênh room: ${activeConvoChannelName}`);
                }
            },

            clearGlobalSocket: (userId) => {
                const { globalEcho, unsubscribeFromConvo } = get();
                if (globalEcho) {
                    unsubscribeFromConvo();
                    if (userId) globalEcho.leave(`user.${userId}`);
                    set({ globalEcho: null });
                }
            },

            // ==========================================
            // 2. OMNICHANNEL CHAT ACTIONS
            // ==========================================

            // fetchConversations is now mostly handled by initGlobalData, 
            // but we keep it for manual refresh
            fetchConversations: async (statusFilter = 'open', platformFilter = 'all', channelIdFilter = null) => {
                set({ isLoadingConvos: true });
                try {
                    let url = `v1/omnichannel/conversations?status=${statusFilter}`;
                    if (platformFilter !== 'all') url += `&platform=${platformFilter}`;
                    if (channelIdFilter) url += `&channel_id=${channelIdFilter}`;

                    const res = await chatApi.get(url);
                    const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);

                    set({
                        conversations: list.slice(0, RAM_CONVO_LIMIT),
                        lastSync: new Date().toISOString()
                    });
                } catch (error) {
                    console.error("[ChatStore] Fetch convos err", error);
                } finally {
                    set({ isLoadingConvos: false });
                }
            },

            fetchMessages: async (convoId) => {
                set({ isLoadingMessages: true });
                try {
                    const res = await chatApi.get(`v1/omnichannel/messages?conversation_id=${convoId}`);
                    const rawData = res.data;
                    const msgList = Array.isArray(rawData) ? rawData : (rawData?.data || []);

                    const fetchedMessages = [...msgList].reverse();

                    set((state) => {
                        const optimistic = state.activeMessages.filter(m => m.status === 'sending');
                        const merged = [...fetchedMessages, ...optimistic];

                        const uniqueMap = new Map();
                        merged.forEach(m => {
                            const key = m.id || m.optimistic_id;
                            if (key) uniqueMap.set(key, m);
                        });

                        const uniqueMessages = Array.from(uniqueMap.values());
                        return { activeMessages: uniqueMessages.slice(-RAM_MSG_LIMIT) };
                    });
                } catch (error) {
                    console.error("[ChatStore] Fetch messages err", error);
                } finally {
                    set({ isLoadingMessages: false });
                }
            },

            addMessage: (convoId, msg) => {
                set((state) => {
                    const isForActiveConvo = String(state.activeConversationId) === String(convoId);

                    let newActiveMsgs = state.activeMessages;

                    if (isForActiveConvo) {
                        const existsIndex = state.activeMessages.findIndex(m =>
                            (m.id && m.id === msg.id) ||
                            (m.optimistic_id && m.optimistic_id === msg.optimistic_id)
                        );

                        if (existsIndex !== -1) {
                            newActiveMsgs = [...state.activeMessages];
                            newActiveMsgs[existsIndex] = { ...newActiveMsgs[existsIndex], ...msg };
                        } else {
                            newActiveMsgs = [...state.activeMessages, msg].slice(-RAM_MSG_LIMIT);
                        }
                    }

                    return { activeMessages: newActiveMsgs };
                });

                get().updateConversationLatest(convoId, msg);
            },

            updateConversationLatest: async (convoId, message) => {
                const state = get();

                // 1. Kiểm tra Omnichannel list
                const index = state.conversations.findIndex(c => c.id === convoId);
                if (index !== -1) {
                    set((s) => {
                        const newList = [...s.conversations];
                        const c = newList[index];
                        newList.splice(index, 1);
                        const updated = {
                            ...c,
                            last_message_content: message.type === 'image' ? '[Hình ảnh]' : (message.content || ''),
                            last_message_at: message.created_at,
                        };
                        return { conversations: [updated, ...newList] };
                    });
                }

                // 2. Kiểm tra Internal list
                const internalIndex = state.internalConversations.findIndex(c => c.id === convoId);
                if (internalIndex !== -1) {
                    set((s) => {
                        const newList = [...s.internalConversations];
                        const c = newList[internalIndex];
                        newList.splice(internalIndex, 1);
                        const updated = {
                            ...c,
                            last_message_content: message.type === 'image' ? '[Hình ảnh]' : (message.content || ''),
                            last_message_at: message.created_at,
                            unread_count: (c.id === s.activeConversationId) ? 0 : (c.unread_count || 0)
                        };
                        return { internalConversations: [updated, ...newList] };
                    });
                }

                // 3. Nếu không thấy đâu, có thể là convo mới hoàn toàn
                if (index === -1 && internalIndex === -1 && message.conversation_platform !== 'internal') {
                    // Fetch detay convo cho Omnichannel
                    try {
                        const res = await chatApi.get(`v1/omnichannel/conversations?id=${convoId}`);
                        if (res.data && res.data.length > 0) {
                            const newConvo = res.data.find(c => c.id === convoId);
                            if (newConvo) set(s => ({ conversations: [newConvo, ...s.conversations] }));
                        }
                    } catch (e) { }
                }
            },

            updateMessageStatus: (idOrOptimisticId, status) => {
                set((state) => ({
                    activeMessages: state.activeMessages.map((m) =>
                        (m.id === idOrOptimisticId || m.optimistic_id === idOrOptimisticId)
                            ? { ...m, status } : m
                    ),
                }));
            },

            setTyping: (convoId, userName) => {
                set((state) => ({
                    typingStatus: { ...state.typingStatus, [convoId]: userName },
                }));
            },

            setActiveConversation: (convo) => {
                const state = get();
                if (!convo) {
                    state.unsubscribeFromConvo();
                    set({ activeMessages: [], activeConversationId: null });
                    return;
                }
                set({ activeMessages: [], activeConversationId: convo.id });
                state.subscribeToConvo(convo.id);
                get().fetchMessages(convo.id);
            },

            // ==========================================
            // 3. INTERNAL & NOTIFY ACTIONS
            // ==========================================
            refreshNotifications: async () => {
                try {
                    const res = await chatApi.get('v1/notifications');
                    const raw = res.data?.data ?? res.data ?? [];
                    const notifyList = Array.isArray(raw) ? raw : [];
                    set({
                        notifications: notifyList,
                        unreadNotifyCount: notifyList.filter(n => !n.read_at).length
                    });
                } catch (e) {
                    console.error('refresh notify err', e);
                }
            },

            markAllInternalRead: async () => {
                const { internalConversations } = get();
                const unreads = internalConversations.filter(c => c.unread_count > 0);
                if (unreads.length === 0) return;

                try {
                    await Promise.all(unreads.map(c => chatApi.post(`v1/internal/conversations/${c.id}/read`)));
                    // Update locally
                    set(state => ({
                        internalConversations: state.internalConversations.map(c => ({ ...c, unread_count: 0 })),
                        unreadInternalCount: 0
                    }));
                } catch (e) { }
            },

            markAllNotifyRead: async () => {
                try {
                    await chatApi.post('v1/notifications/read');
                    get().refreshNotifications();
                } catch (e) { }
            },

            markNotifyReadLocal: (id) => {
                set(state => {
                    const newNotes = state.notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n);
                    return {
                        notifications: newNotes,
                        unreadNotifyCount: newNotes.filter(n => !n.read_at).length
                    };
                });
            },

            // ==========================================
            // 4. INTERNAL CHAT SPECIFIC ACTIONS
            // ==========================================
            fetchInternalMessages: async (convoId, page = 1) => {
                if (page === 1) set({ activeConversationId: convoId });
                set({ isLoadingMessages: true });
                try {
                    const res = await chatApi.get(`v1/internal/conversations/${convoId}/messages?page=${page}&limit=50`);
                    const raw = res.data;
                    const msgList = Array.isArray(raw) ? raw : (raw?.data || []);

                    // Reversed because we display from bottom up
                    const fetchedMessages = [...msgList].reverse();

                    set((state) => {
                        if (page === 1) {
                            return { activeMessages: fetchedMessages };
                        } else {
                            // Prepend old messages
                            return { activeMessages: [...fetchedMessages, ...state.activeMessages].slice(-RAM_MSG_LIMIT * 2) };
                        }
                    });
                    return { hasMore: raw.last_page ? page < raw.last_page : false };
                } catch (error) {
                    console.error("[ChatStore] Fetch internal messages err", error);
                    return { hasMore: false };
                } finally {
                    set({ isLoadingMessages: false });
                }
            },

            renameInternalConversation: async (convoId, newName) => {
                try {
                    await chatApi.post(`v1/internal/conversations/${convoId}/rename`, { name: newName });
                    set(state => ({
                        internalConversations: state.internalConversations.map(c =>
                            c.id === convoId ? { ...c, name: newName } : c
                        )
                    }));
                    antMessage.success('Đã đổi tên hội thoại');
                } catch (e) {
                    antMessage.error('Không thể đổi tên');
                }
            },

            fetchInternalResources: async (convoId, type = 'media') => {
                try {
                    const res = await chatApi.get(`v1/internal/conversations/${convoId}/resources?type=${type}`);
                    return res.data?.data || [];
                } catch (e) {
                    return [];
                }
            }
        }),
        {
            name: 'chat-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                conversations: state.conversations,
                internalConversations: state.internalConversations,
                notifications: state.notifications,
                lastSync: state.lastSync
            }),
        }
    )
);
