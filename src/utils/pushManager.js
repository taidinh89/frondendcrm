// src/utils/pushManager.js
import chatApi from '../services/chatApi';
import { requestForToken } from '../services/firebase';
import { message } from 'antd';

export const subscribeUserToPush = async () => {
    console.log('%c[PushManager] 🚀 Bắt đầu quy trình đăng ký Push...', 'color: #2196f3; font-weight: bold;');

    try {
        // 1. Kiểm tra môi trường
        if (!('serviceWorker' in navigator)) {
            console.error('[PushManager] Trình duyệt không hỗ trợ Service Worker');
            return null;
        }

        // 2. Lấy FCM Token từ Firebase
        const token = await requestForToken();

        if (token) {
            console.log('%c[PushManager] ✅ Đã lấy được FCM Token:', 'color: #4caf50;', token);
            await sendTokenToBackend(token);
            return token;
        } else {
            console.warn('[PushManager] ⚠️ Không lấy được Token (Có thể do chưa Whitelist domain hoặc User chặn thông báo)');
        }
    } catch (error) {
        console.error('[PushManager] ❌ Lỗi nghiêm trọng khi đăng ký Push:', error);
    }
    return null;
};

const sendTokenToBackend = async (token) => {
    // Tránh gửi lặp lại cùng 1 token trong 1 phiên làm việc
    const lastSentToken = sessionStorage.getItem('last_fcm_token');
    if (lastSentToken === token) {
        console.debug('[PushManager] ℹ️ Token đã được đồng bộ trước đó, bỏ qua.');
        return;
    }

    try {
        const payload = {
            token: token,
            platform: 'web',
            device_model: navigator.userAgent.substring(0, 100)
        };

        console.log('[PushManager] 📡 Đang gửi Token về VPS Chat...', payload);

        // Sử dụng cờ skipToast: true để không hiện popup lỗi khi server bảo trì/timeout
        // Vì token push là một tác vụ chạy ngầm, không nên làm phiền User nếu nó thất bại
        await chatApi.post('v1/notifications/push-tokens', payload, { skipToast: true });

        console.log('%c[PushManager] 🎉 VPS Chat đã xác nhận lưu Token thành công!', 'color: #4caf50; font-weight: bold;');
        sessionStorage.setItem('last_fcm_token', token);

    } catch (error) {
        // Log Error ra console nhưng không re-throw để tránh crash các flow khác
        console.warn('[PushManager] ⚠️ Không thể lưu Token (có thể do server bảo trì hoặc timeout):', error.message);
        // Lưu ý: chatApi interceptor vẫn sẽ báo Toast đỏ. 
        // Nếu muốn hết hẳn toast "Lỗi kết nối", cần chỉnh interceptor của chatApi.
    }
};

export const checkNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('Trình duyệt này không hỗ trợ thông báo Desktop');
        return 'denied';
    }

    let permission = Notification.permission;
    if (permission === 'default') {
        console.log('[PushManager] 🔔 Đang xin quyền thông báo...');
        permission = await Notification.requestPermission();
    }
    return permission;
};
