// src/components/analysis/ProductAnalysisBarChart.jsx

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Hàm định dạng tiền tệ (Giữ nguyên)
const formatCurrency = (value, unit) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (unit === 'đ') {
        if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)} Tỷ`;
        if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(0)} Tr`;
        return new Intl.NumberFormat('vi-VN').format(num);
    }
    return new Intl.NumberFormat('vi-VN').format(num); 
};

// Tooltip Tùy chỉnh (Giữ nguyên)
const CustomBarTooltip = ({ active, payload, unit, nameKey }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const value = data[payload[0].dataKey];
        const label = data[nameKey];
        
        return (
            <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-xs z-50">
                <p className="font-bold text-gray-800 mb-1 max-w-[200px] truncate">{label}</p>
                <p className="text-gray-500">
                    Giá trị: <b className={value >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(value, unit)} {unit}</b>
                </p>
            </div>
        );
    }
    return null;
};

// === COMPONENT NHÃN TÙY CHỈNH MỚI ===
const CustomBarLabel = ({ x, y, width, height, name }) => {
    // Rút gọn tên nếu quá dài
    const maxLen = 30;
    const labelText = name.length > maxLen ? name.substring(0, maxLen) + '...' : name;

    // Quyết định vị trí và màu chữ: Nếu cột đủ rộng (>100px), đặt tên bên trong (màu trắng).
    const isInside = width > 120;
    const textX = isInside ? x + width - 5 : x + 5; // Vị trí X (bên trong hoặc bắt đầu từ bên trái)
    const fill = isInside ? '#FFF' : '#333'; // Màu chữ
    const anchor = isInside ? 'end' : 'start'; // Căn chỉnh văn bản

    // Vị trí Y (ở giữa cột)
    const textY = y + height / 2;

    return (
        <text 
            x={textX} 
            y={textY} 
            dy={3} 
            fill={fill}
            fontSize={10} 
            textAnchor={anchor} 
            fontWeight="bold"
        >
            {labelText}
        </text>
    );
};
// ====================================

export const ProductAnalysisBarChart = ({ data, dataKey, nameKey, unit = '', layout = 'horizontal', barColor = '#3b82f6' }) => {
    if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu</div>;

    const isVertical = layout === 'vertical';
    const PrimaryAxis = isVertical ? YAxis : XAxis; 
    const ValueAxis = isVertical ? XAxis : YAxis;
    const legendName = isVertical ? data[0][nameKey] : 'Giá trị';
    
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={data}
                layout={layout}
                // Tăng left margin nếu đang ở layout ngang và muốn nhãn nằm ngoài
                margin={{ top: 10, right: 30, left: isVertical ? 0 : 10, bottom: isVertical ? 5 : 40 }}
            >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                
                {/* TRỤC CHÍNH (Tên Sản phẩm): Ẩn nhãn và ticks khi layout="vertical" */}
                <PrimaryAxis 
                    dataKey={nameKey} 
                    type="category"
                    // ẨN TICKS và TRỤC KHI LÀ BIỂU ĐỒ CỘT NGANG (để loại bỏ clutter)
                    tick={isVertical ? false : { fontSize: 11 }}
                    hide={isVertical} 
                    width={isVertical ? 0 : 'auto'} 
                />
                
                {/* TRỤC GIÁ TRỊ (Lợi nhuận): Giữ nguyên */}
                <ValueAxis 
                    dataKey={dataKey}
                    type="number" 
                    unit={unit === 'đ' ? '' : unit} 
                    tickFormatter={(val) => formatCurrency(val, unit)}
                    tick={{ fontSize: 11 }}
                />
                
                <Tooltip content={<CustomBarTooltip unit={unit} nameKey={nameKey} />} />
                
                <Bar 
                dataKey={dataKey} 
                fill={barColor} 
                name={legendName}
                minPointSize={1}
                // THÊM KIỂM TRA ĐIỀU KIỆN AN TOÀN TRƯỚC KHI RENDER NHÃN
                label={isVertical ? { 
                    position: 'insideRight', 
                    // Đảm bảo e.payload tồn tại VÀ e.payload[nameKey] tồn tại
                    content: e => (e.payload && e.payload[nameKey] !== undefined ? (
                        // Thay thế z.jsx(DG, {...}) bằng cách gọi component CustomBarLabel của bạn
                        // Giả định component CustomBarLabel của bạn là DG, và bạn đang dùng z.jsx
                        // Nếu bạn dùng JSX thông thường, code sẽ là:
                        <CustomBarLabel 
                            x={e.x} 
                            y={e.y} 
                            width={e.width} 
                            height={e.height} 
                            name={e.payload[nameKey]} 
                        />
                    ) : null) // Nếu không hợp lệ, trả về null
                } : null}
            />
            </BarChart>
        </ResponsiveContainer>
    );
};