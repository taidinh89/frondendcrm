import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const formatCompact = (value) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(value);
const formatFull = (value) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';

export const AnalysisStackedBarChart = ({ data }) => {
    if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu</div>;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    tickFormatter={(val) => new Date(val).getDate()} 
                />
                <YAxis 
                    tickFormatter={formatCompact} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip 
                    formatter={(value) => formatFull(value)}
                    labelFormatter={(label) => `Ngày ${new Date(label).toLocaleDateString('vi-VN')}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                <Bar dataKey="total_cost" name="Giá vốn" stackId="a" fill="#94a3b8" radius={[0, 0, 4, 4]} />
                <Bar dataKey="total_profit" name="Lợi nhuận" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};