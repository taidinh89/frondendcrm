// src/components/analysis/ProfitTrendChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload[0]) {
    const value = payload[0].value;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-sm">{label}</p>
        <p className={`text-sm font-bold ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {value >= 0 ? '+' : ''}{value.toLocaleString('vi-VN')} đ
        </p>
      </div>
    );
  }
  return null;
};

export const ProfitTrendChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-center text-gray-500">Không có dữ liệu</div>;

  const formattedData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }),
    profit: parseFloat(item.total_profit) || 0,
  }));

  const maxProfit = Math.max(...formattedData.map(d => d.profit), 0);
  const minProfit = Math.min(...formattedData.map(d => d.profit), 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={formattedData} margin={{ top: 10, right: 30, left: 50, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          tickFormatter={(val) => {
            if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(0)} Tỷ`;
            if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(0)} Tr`;
            if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(0)} K`;
            return val.toLocaleString();
          }}
          domain={[minProfit * 1.1, maxProfit * 1.1]}
          tick={{ fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={2} />
        <Line 
          type="monotone" 
          dataKey="profit" 
          stroke="#10b981" 
          strokeWidth={3}
          dot={{ fill: '#10b981', r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};