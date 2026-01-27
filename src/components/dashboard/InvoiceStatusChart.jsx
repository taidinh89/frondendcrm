// src/components/dashboard/InvoiceStatusChart.jsx
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = {
    'Chưa nhập': '#f59e0b', // Yellow-500
    'Đã nhập': '#10b981',   // Green-500
    'Lỗi': '#ef4444',       // Red-500
};
const RADIAN = Math.PI / 180;

// Custom label
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    // ... (code giữ nguyên) ...
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export const InvoiceStatusChart = ({ data }) => {
    
    const chartData = data.map(item => ({
        name: item.status,
        value: item.count
    }));

    // [SỬA] Thêm xử lý khi không có dữ liệu
    if (!chartData || chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Không có dữ liệu.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    fill="#8884d8"
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomizedLabel}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#d1d5db'} stroke={COLORS[entry.name]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
            </PieChart>
        </ResponsiveContainer>
    );
};