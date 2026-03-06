import axios from 'axios';
import { message } from 'antd';

/**
 * Chat API V2 Service
 * Chi viện cho hệ thống 3 cột Omnichannel
 * Tuân thủ chuẩn JSON Envelope (API_STANDARD.md)
 */
const chatApi = axios.create({
    baseURL: 'https://chat.maytinhquocviet.com/api',
    timeout: 15000, // Tăng thêm 5s cho ổn định
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// --- 1. Request Interceptor: Bảo mật & Debug ---
chatApi.interceptors.request.use(config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Trace ID: Giúp Backend log vết request
    config.headers['X-Trace-ID'] = `gui_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // WebSocket Sync: Ngăn chặn nhận lại tin nhắn của chính mình
    if (window.Echo && window.Echo.socketId()) {
        config.headers['X-Socket-ID'] = window.Echo.socketId();
    }

    if (process.env.NODE_ENV === 'development') {
        console.debug(`%c[ChatAPI] >> ${config.method.toUpperCase()} ${config.url}`, 'color: #00bcd4; font-size: 10px;', config.data || '');
    }

    // Multipart handling
    if (config.data instanceof FormData) {
        config.headers['Content-Type'] = 'multipart/form-data';
        config.timeout = 0; // Upload không giới hạn thời gian
    }

    return config;
}, error => {
    return Promise.reject(error);
});

// --- 2. Response Interceptor: Unwrap & Robust Error Handling ---
chatApi.interceptors.response.use(response => {
    const { data: body } = response;

    // A. Xử lý chuẩn Envelope: { code, status, data, meta }
    if (body && typeof body === 'object' && body.status === 'success') {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`%c[ChatAPI] << Response OK: ${response.config.url}`, 'color: #4caf50; font-size: 10px;');
        }

        // Đính kèm meta (ví dụ: pagination) vào data để component sử dụng
        const result = body.data;
        if (body.meta && (typeof result === 'object' || Array.isArray(result)) && result !== null) {
            result._meta = body.meta;
        }

        return { ...response, data: result };
    }

    // B. Xử lý fallback cho API cũ vẫn trả về trực tiếp
    return response;

}, error => {
    const { response } = error;
    let errorMsg = 'Lỗi kết nối máy chủ Chat';
    let errorCode = 'NETWORK_ERROR';

    if (response) {
        const body = response.data;

        // 1. Nếu Backend trả về chuẩn Envelope lỗi
        if (body && body.error) {
            errorMsg = body.error.message || errorMsg;
            errorCode = body.error.code || 'UNKNOWN_ERROR';

            // Log chi tiết lỗi validation nếu có
            if (body.error.details) {
                console.warn('[ChatAPI] Validation Details:', body.error.details);
            }
        }
        // 2. Nếu Backend trả về lỗi thô (VD: 404, 500 Laravel default)
        else if (body && body.message) {
            errorMsg = body.message;
        }

        // Thông báo cho user nếu là lỗi quan trọng (Defensive)
        if (response.status === 401) {
            errorMsg = 'Phiên làm việc hết hạn. Vui lòng đăng nhập lại.';
        } else if (response.status >= 500 && errorMsg === 'Lỗi kết nối máy chủ Chat') {
            // Chỉ ghi đè nếu chưa lấy được message cụ thể từ backend
            errorMsg = 'Hệ thống Chat đang bảo trì (500)';
        }
    }

    // Chỉ Toast lỗi nếu không phải là request bị hủy
    if (!axios.isCancel(error)) {
        message.error({ content: errorMsg, key: errorCode });
        console.error(`%c[ChatAPI] !! Error ${response?.status || '???'} [${errorCode}]:`, 'color: #f44336; font-weight: bold;', errorMsg);
    }

    return Promise.reject(error);
});

export default chatApi;
