// src/components/dashboard/ComparisonDonutChart.jsx
import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

// Hàm format linh động
const formatValue = (value, format) => { // Error: Expected a semicolon or an implicit semicolon after a statement, but found none
    if (format === 'price') {
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} Tỷ`;
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)} Tr`;
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
    }
    // format === 'number'
    return new Intl.NumberFormat('vi-VN').format(value || 0);
};

const RADIAN = Math.PI / 180;

// Custom label
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Ẩn % quá nhỏ
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export const ComparisonDonutChart = ({ data, colors, format = 'number' }) => {
    
    // Tính tổng giá trị để hiển thị ở giữa
    const totalValue = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

    if (!data || data.length === 0 || totalValue === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <span className="text-2xl font-bold">0</span>
                <span>Không có dữ liệu</span>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                {/* Hiển thị tổng giá trị ở giữa */}
                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-900">
                    {formatValue(totalValue, format)}
                </text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="text-sm fill-gray-500">
                    Tổng cộng
                </text>

                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomizedLabel}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length] || '#d1d5db'} stroke="#fff" />
                    ))}
                </Pie>
                <Tooltip 
                    formatter={(value) => [formatValue(value, format), null]}
                    contentStyle={{ borderRadius: '0.5rem', borderColor: '#e5e7eb' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
            </PieChart>
        </ResponsiveContainer>
    );
};