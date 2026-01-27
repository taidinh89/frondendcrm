// src/components/dashboard/SalesTrendChart.jsx
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Hàm helper
const formatPriceForChart = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}tr`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value;
};
const formatTooltipPrice = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};
const formatXAxisDate = (date) => {
    // Chỉ lấy ngày và tháng
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export const SalesTrendChart = ({ data }) => {
    // Chuyển đổi sales (string) thành number
    const chartData = data.map(item => ({
        ...item,
        date: formatXAxisDate(item.date),
        DoanhThu: parseFloat(item.total_sales) || 0,
    }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }} // Điều chỉnh lề
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    stroke="#6b7280"
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis 
                    tickFormatter={formatPriceForChart}
                    fontSize={12}
                    stroke="#6b7280"
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip 
                    formatter={(value) => formatTooltipPrice(value)} 
                    labelStyle={{ color: '#374151' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    contentStyle={{ borderRadius: '0.5rem', borderColor: '#e5e7eb' }}
                />
                <Line 
                    type="monotone" 
                    dataKey="DoanhThu" 
                    stroke="#3b82f6" // Blue
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, fill: '#3b82f6' }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};