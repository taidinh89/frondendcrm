// src/utils/format.js
export const formatPrice = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0 đ';
    if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(1)} Tỷ`;
    if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)} Tỷ`;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(0)} Tr`;
    if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(0)} K`;
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };