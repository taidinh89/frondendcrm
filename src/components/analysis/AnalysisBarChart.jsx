// src/components/analysis/AnalysisBarChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload[0]) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-sm text-blue-600">
          {payload[0].value.toLocaleString('vi-VN')} {unit}
        </p>
      </div>
    );
  }
  return null;
};

export const AnalysisBarChart = ({ data, dataKey, nameKey, unit }) => {
  if (!data || data.length === 0) return <div className="text-center text-gray-500">Không có dữ liệu</div>;

  const formattedData = data.map(item => {
    // === FIX LỖI LENGTH: Đảm bảo name là chuỗi trước khi gọi .length ===
    const name = String(item[nameKey] || 'N/A'); 
    
    return {
      name: name.length > 20 ? name.slice(0, 18) + '...' : name,
      value: parseFloat(item[dataKey]) || 0,
      fullName: name,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={formattedData} layout="horizontal" margin={{ top: 10, right: 30, left: 80, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          type="category" 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={80}
          tick={{ fontSize: 11 }}
        />
        <YAxis 
          type="number" 
          tickFormatter={(val) => {
            if (unit === 'đ') {
              if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(0)} Tỷ`;
              if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(0)} Tr`;
              if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(0)} K`;
              return val.toLocaleString();
            }
            return val;
          }}
          tick={{ fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} />
        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
          {formattedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};