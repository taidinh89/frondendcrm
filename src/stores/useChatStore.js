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

            // --- INTERNAL CHAT & NOTIFICATION STATE ---
            internalConversations: [],
            unreadInternalCount: 0,
            notifications: [],
            unreadNotifyCount: 0,

            // --- GLOBAL SOCKET ---
            globalEcho: null,

            // ==========================================
            // 1. GLOBAL INITIALIZATION (Call once on login/mount)
            // ==========================================
            initGlobalData: async (statusFilter = 'open', platformFilter = 'all', channelIdFilter = null) => {
                set({ isLoadingConvos: true });
                try {
                    let omniUrl = `v1/omnichannel/conversations?status=${statusFilter}`;
                    if (platformFilter !== 'all') omniUrl += `&platform=${platformFilter}`;
                    if (channelIdFilter) omniUrl += `&channel_id=${channelIdFilter}`;

                    // Fetch all 3 data sources concurrently to save time (Promise.all)
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

                } catch (error) {
                    console.error("[ChatStore] Global init error", error);
                    set({ isLoadingConvos: false });
                }
            },

            initGlobalSocket: (userId) => {
                if (!userId) return;

                // Prevent multiple connections
                if (get().globalEcho) return;

                const echoInstance = createChatEcho();
                if (!echoInstance) return;

                console.info('%c[GlobalStore] 📡 Khởi tạo Global Echo...', 'color: #9c27b0; font-weight: bold;');

                const channel = echoInstance.private(`user.${userId}`);

                channel.listen('.IncomingCall', (e) => {
                    console.warn('%c[GlobalStore] 📞 NHẬN CUỘC GỌI:', 'color: red; font-weight: bold; font-size: 1.2em;', e);
                    // Có thể dispatch event ra UI hoặc lưu state
                    window.dispatchEvent(new CustomEvent('global-incoming-call', { detail: e }));
                });

                channel.notification((payload) => {
                    console.info('%c[Fast-Socket] ⚡ Nhận tin mới:', 'color: #4caf50; font-weight: bold;', payload);

                    const state = get();

                    // Update Badge immediate
                    if (payload.unread_total !== undefined) {
                        set({ unreadInternalCount: payload.unread_total });
                    }

                    // If it's a new message
                    if (payload.type === 'NewMessage' && payload.message) {
                        const incomingMsg = payload.message;
                        const convoId = incomingMsg.conversation_id;
                        const isCustomer = incomingMsg.conversation_platform && incomingMsg.conversation_platform !== 'internal';

                        // 1. Update active view if viewing this chat
                        get().addMessage(convoId, incomingMsg);

                        // 2. Update conversation list preview
                        if (isCustomer) {
                            // Update Omni list (already handled by addMessage -> updateConversationLatest, 
                            // but we might need to handle new incoming convos that aren't in the list)
                            get().updateConversationLatest(convoId, incomingMsg);
                        } else {
                            // Update Internal List
                            const prevList = state.internalConversations;
                            const existingIndex = prevList.findIndex(c => c.id === convoId);
                            let newList = [...prevList];
                            let targetConvo;

                            if (existingIndex > -1) {
                                targetConvo = {
                                    ...newList[existingIndex],
                                    unread_count: (newList[existingIndex].unread_count || 0) + 1,
                                    messages: [incomingMsg]
                                };
                                newList.splice(existingIndex, 1);
                            } else {
                                targetConvo = {
                                    id: convoId,
                                    name: incomingMsg.sender?.name || 'Hội thoại mới',
                                    unread_count: 1,
                                    messages: [incomingMsg],
                                    platform: 'internal',
                                    participants: [{ user: incomingMsg.sender, user_id: incomingMsg.sender_id }]
                                };
                            }
                            set({
                                internalConversations: [targetConvo, ...newList],
                                unreadInternalCount: state.unreadInternalCount + 1
                            });
                        }

                        // 3. Show Toast if not the sender
                        if (incomingMsg.sender_id !== userId) {
                            antMessage.success({
                                content: `💬 ${incomingMsg.sender?.name || 'Ai đó'}: ${incomingMsg.sender?.content?.substring(0, 30) || incomingMsg.content?.substring(0, 30)}`,
                                duration: 5
                            });
                        }

                    } else {
                        // System notification
                        set({
                            unreadNotifyCount: state.unreadNotifyCount + 1
                        });
                        antMessage.info(payload.title || 'Bạn có thông báo mới');
                        // Tạm thời refetch notify để có full data
                        get().refreshNotifications();
                    }
                });

                set({ globalEcho: echoInstance });
            },

            clearGlobalSocket: (userId) => {
                const { globalEcho } = get();
                if (globalEcho && userId) {
                    globalEcho.leave(`user.${userId}`);
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
                    const isForActiveConvo = state.activeMessages.length > 0 &&
                        state.activeMessages[0].conversation_id === convoId;

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
                const index = state.conversations.findIndex(c => c.id === convoId);

                if (index === -1) {
                    // New Conversation: Fetch details
                    try {
                        const res = await chatApi.get(`v1/omnichannel/conversations?id=${convoId}`);
                        if (res.data && res.data.length > 0) {
                            const newConvo = res.data.find(c => c.id === convoId);
                            if (newConvo) {
                                set(s => ({ conversations: [newConvo, ...s.conversations] }));
                            }
                        }
                    } catch (e) {
                        console.error('[ChatStore] Error fetching new convo', e);
                    }
                    return;
                }

                set((s) => {
                    const idx = s.conversations.findIndex(c => c.id === convoId);
                    if (idx === -1) return s;

                    const c = s.conversations[idx];
                    const updatedConvo = {
                        ...c,
                        last_message_content: message.type === 'image' ? '[Hình ảnh]' : message.content,
                        last_message_at: message.created_at,
                    };

                    const newList = [...s.conversations];
                    newList.splice(idx, 1);
                    return { conversations: [updatedConvo, ...newList] };
                });
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
                if (!convo) {
                    set({ activeMessages: [] });
                    return;
                }
                set({ activeMessages: [] });
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
