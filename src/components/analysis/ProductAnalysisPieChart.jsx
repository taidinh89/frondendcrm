import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Hàm định dạng tiền tệ (cần giống với hàm trong Content)
const formatValue = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)} Tỷ`;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(0)} Tr`;
    return new Intl.NumberFormat('vi-VN').format(num);
};

// Dãy màu sắc đẹp mắt cho các lát cắt
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF0054', '#8884d8'];

// Tooltip Tùy chỉnh
const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const name = data.name || 'Không tên';
        const value = data.value;
        const percent = payload[0].percent * 100;

        return (
            <div className="bg-white p-2 border border-gray-100 shadow-lg rounded-lg text-xs z-50">
                <p className="font-bold text-gray-800">{name}</p>
                <p className="text-gray-600">
                    Giá trị: <b>{formatValue(value)} đ</b> ({percent.toFixed(1)}%)
                </p>
            </div>
        );
    }
    return null;
};

export const ProductAnalysisPieChart = ({ data, dataKey, nameKey }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu để phân tích tỷ trọng.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    dataKey={dataKey}
                    nameKey={nameKey}
                    cx="50%" 
                    cy="50%" 
                    outerRadius={100} 
                    fill="#8884d8"
                    labelLine={false} 
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right" 
                    wrapperStyle={{ fontSize: 11 }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};