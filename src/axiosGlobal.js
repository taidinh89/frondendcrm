import axios from 'axios';
import { message } from 'antd';

// =============================================================================
// 1. CẤU HÌNH HỆ THỐNG
// =============================================================================
const CACHE_TIME = 5000; // Thời gian Cache: 5 giây
const ENABLE_LOG = false; // <--- ĐỔI THÀNH TRUE NẾU MUỐN XEM LOG

// Hàm log (Chỉ chạy khi bật log)
const logger = (type, message, data = '') => {
    if (!ENABLE_LOG) return;
    const styles = {
        info: 'color: #03a9f4; font-weight: bold;',
        success: 'color: #4caf50; font-weight: bold;',
        warning: 'color: #ff9800; font-weight: bold;',
        error: 'color: #f44336; font-weight: bold;',
        network: 'color: #9c27b0; font-weight: bold;'
    };
    console.log(`%c[SmartAPI] ${type}:`, styles[type] || '', message, data);
};

// =============================================================================
// 2. DANH SÁCH ĐEN (BLACKLIST) - LUÔN GỌI SERVER
// =============================================================================
const BLACKLIST_URLS = [
    '/sanctum/csrf-cookie',
    '/login',
    '/logout',
    '/user',
    '/api/user'
];

// =============================================================================
// 3. LẤY ADAPTER GỐC (FIX LỖI BUILD)
// =============================================================================
const getOriginalAdapter = () => {
    // Cách 1: Axios cũ (adapter là function)
    if (typeof axios.defaults.adapter === 'function') {
        return axios.defaults.adapter;
    }

    // Cách 2: Axios mới v1+ (adapter là mảng/chuỗi -> dùng hàm getAdapter lấy function)
    if (typeof axios.getAdapter === 'function') {
        return axios.getAdapter(axios.defaults.adapter);
    }

    // Fallback an toàn: Nếu không tìm thấy, trả về lỗi thay vì crash build
    return async () => {
        throw new Error("Critical: Không tìm thấy Network Adapter của Axios!");
    };
};

const originalAdapter = getOriginalAdapter();

// =============================================================================
// 4. KHO LƯU TRỮ & XỬ LÝ KEY THÔNG MINH
// =============================================================================
const cacheStorage = new Map();
const pendingStorage = new Map();

// Hàm sắp xếp params để đảm bảo key luôn giống nhau dù thứ tự params đảo lộn
// Giúp fix lỗi trang Phòng ban bị gọi lặp do params lộn xộn
const sortObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortObject);
    return Object.keys(obj).sort().reduce((result, key) => {
        result[key] = sortObject(obj[key]);
        return result;
    }, {});
};

const generateKey = (config) => {
    const safeUrl = config.url ? config.url.replace(/\/+$/, '') : ''; // Xóa dấu / ở cuối
    const safeParams = config.params ? JSON.stringify(sortObject(config.params)) : '{}';
    return `${config.method}:${safeUrl}:${safeParams}`;
};

// =============================================================================
// 5. ADAPTER THÔNG MINH
// =============================================================================
const smartAdapter = async (config) => {
    // --- BƯỚC 1: KIỂM TRA BLACKLIST ---
    const isBlacklisted = BLACKLIST_URLS.some(url => config.url && config.url.includes(url));
    if (isBlacklisted) {
        return originalAdapter(config);
    }

    // --- BƯỚC 2: CHỈ XỬ LÝ GET ---
    if (config.method === 'get') {
        const key = generateKey(config);
        const now = Date.now();

        // A. DEDUPLICATION (Chống gọi trùng khi đang load)
        if (pendingStorage.has(key)) {
            logger('info', `🛡️ DEDUPE - Chặn gọi trùng: ${config.url}`);
            return pendingStorage.get(key);
        }

        // B. CACHING (Lấy từ RAM nếu mới tải xong)
        if (cacheStorage.has(key)) {
            const { data, timestamp } = cacheStorage.get(key);
            if (now - timestamp < CACHE_TIME) {
                logger('success', `⚡ CACHE HIT: ${config.url}`);
                return Promise.resolve({
                    data: data,
                    status: 200,
                    statusText: 'OK from SmartCache',
                    headers: {},
                    config,
                    request: {}
                });
            } else {
                cacheStorage.delete(key);
            }
        }

        // C. NETWORK CALL (Gọi thật)
        logger('network', `🌐 CALL SERVER: ${config.url}`);

        const requestPromise = originalAdapter(config)
            .then(response => {
                try {
                    // Clone data an toàn để tránh lỗi reference
                    let dataToCache = response.data;
                    try { dataToCache = JSON.parse(JSON.stringify(response.data)); } catch (e) { }

                    cacheStorage.set(key, { data: dataToCache, timestamp: Date.now() });
                } catch (e) {
                    console.error("[SmartAPI] Cache Error:", e);
                }
                return response;
            })
            .catch(error => {
                pendingStorage.delete(key); // Xóa pending nếu lỗi
                return Promise.reject(error);
            })
            .finally(() => {
                pendingStorage.delete(key); // Xóa pending khi xong
            });

        pendingStorage.set(key, requestPromise);
        return requestPromise;
    }

    // --- BƯỚC 3: METHOD KHÁC (POST/PUT...) -> XÓA CACHE ---
    if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
        logger('warning', `🧹 CLEAR CACHE: ${config.method.toUpperCase()} ${config.url}`);
        cacheStorage.clear();
    }

    return originalAdapter(config);
};

// =============================================================================
// 6. CẤU HÌNH ĐỊNH DẠNG RESPONSE CHUẨN (ENVELOPE HANDLER)
// =============================================================================

// --- Global Response Interceptor ---
axios.interceptors.response.use(response => {
    const { data: body } = response;

    // A. Xử lý chuẩn Envelope: { code, status, data, meta }
    if (body && typeof body === 'object' && (body.status === 'success' || body.success === true)) {
        // Gán meta ngầm vào data (kể cả mảng) để component dùng (VD: pagination)
        const result = body.data;
        if (body.meta && typeof result === 'object' && result !== null) {
            result._meta = body.meta;
        }

        // Cập nhật lại response.data bằng data thực sự
        return { ...response, data: result };
    }

    // B. Mặc định trả về response gốc
    return response;
}, error => {
    // --- BỔ SUNG: KHÔNG BÁO LỖI NẾU REQUEST BỊ HỦY CHỦ ĐỘNG (AbortController) ---
    if (axios.isCancel(error)) {
        logger('warning', '🚫 REQUEST ABORTED - Bỏ qua thông báo lỗi');
        return Promise.reject(error);
    }

    const { response } = error;
    let errorMsg = 'Lỗi hệ thống';
    let errorCode = 'SYSTEM_ERROR';

    if (response) {
        const body = response.data;

        // Xử lý báo lỗi chuẩn Envelope
        if (body && (body.error || body.message)) {
            errorMsg = (body.error?.message) || body.message || errorMsg;
            errorCode = (body.error?.code) || errorCode;
        }

        // Thông báo cho user qua Toast (Defensive UI)
        if (response.status === 401) {
            // Layout handled redirect
        } else if (response.status === 403) {
            message.error('Bạn không có quyền thực hiện hành động này');
        } else if (response.status >= 500) {
            message.error('Lỗi máy chủ: ' + errorMsg);
        } else {
            message.error(errorMsg);
        }
    } else {
        message.error('Không thể kết nối tới máy chủ');
    }

    return Promise.reject(error);
});

// =============================================================================
// 7. ÁP DỤNG
// =============================================================================
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.adapter = smartAdapter;

export default axios;
