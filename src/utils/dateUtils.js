// src/utils/dateUtils.js

/**
 * Định dạng một đối tượng Date thành chuỗi YYYY-MM-DD
 */
const formatDate = (date) => {
    if (!date || !(date instanceof Date)) return '';
    return date.toISOString().split('T')[0];
};

const getLastNDays = (n) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (n > 0 ? n - 1 : 0)); // n-1 ngày trước + hôm nay = n ngày
    return { from: formatDate(start), to: formatDate(end) };
};


export const dateUtils = {
    /**
     * Trả về { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
     */
    getToday: () => {
        const today = new Date();
        const dateStr = formatDate(today);
        return { from: dateStr, to: dateStr };
    },

    getYesterday: () => {
        const today = new Date();
        today.setDate(today.getDate() - 1);
        const dateStr = formatDate(today);
        return { from: dateStr, to: dateStr };
    },

    getLast3Days: () => getLastNDays(3),

    getLast7Days: () => getLastNDays(7),

    getLast30Days: () => getLastNDays(30),
    
    getThisMonth: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(); // Đến ngày hôm nay
        return { from: formatDate(start), to: formatDate(end) };
    },
    
    getFullThisMonth: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Ngày cuối của tháng
        return { from: formatDate(start), to: formatDate(end) };
    },

    getLastMonth: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: formatDate(start), to: formatDate(end) };
    },

    getThisQuarter: () => {
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), quarter * 3, 1);
        const end = new Date(); // Đến ngày hôm nay
        return { from: formatDate(start), to: formatDate(end) };
    },

    getFullThisQuarter: () => {
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), quarter * 3, 1);
        const end = new Date(now.getFullYear(), quarter * 3 + 3, 0); // Ngày cuối của quý
        return { from: formatDate(start), to: formatDate(end) };
    },

    getThisYear: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1); // Ngày 1/1
        const end = new Date(); // Đến ngày hôm nay
        return { from: formatDate(start), to: formatDate(end) };
    },
    
    getFullThisYear: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1); // Ngày 1/1
        const end = new Date(now.getFullYear(), 11, 31); // Ngày 31/12
        return { from: formatDate(start), to: formatDate(end) };
    },

    getLastYear: () => {
        const now = new Date();
        const lastYear = now.getFullYear() - 1;
        const start = new Date(lastYear, 0, 1);
        const end = new Date(lastYear, 11, 31);
        return { from: formatDate(start), to: formatDate(end) };
    }
};
