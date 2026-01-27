// src/components/analysis/AnalysisPieChart.jsx
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6']; // Palette hài hòa hơn: xanh dương, xanh lá, vàng, đỏ, tím
const RADIAL_GRADIENTS = [
  'url(#gradient1)', 'url(#gradient2)', 'url(#gradient3)', 'url(#gradient4)', 'url(#gradient5)'
];

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';

const CustomTooltip = ({ active, payload, label, total }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    const percentage = ((value / total) * 100).toFixed(1);
    return (
      <div className="bg-white p-3 border rounded-lg shadow-md text-sm">
        <p className="font-semibold text-gray-800">{name}</p>
        <p className="text-gray-600">Lợi nhuận: {formatPrice(value)}</p>
        <p className="text-gray-600">Tỷ trọng: {percentage}%</p>
      </div>
    );
  }
  return null;
};

const CustomLabel = ({ viewBox, value, percentage }) => {
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} dy={-4} textAnchor="middle" fill="#333" fontSize={14} fontWeight="bold">
      {percentage}%
    </text>
  );
};

export const AnalysisPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">Không có dữ liệu.</div>;
  }

  // *** ĐÃ SỬA LỖI Ở ĐÂY ***
  const chartData = data.slice(0, 5).map(item => {
    // Đảm bảo 'ten' luôn là một chuỗi (string) trước khi đọc .length
    const ten = item.ten_mat_hang || 'Không có tên'; 
    
    return {
      name: ten.length > 30 ? `${ten.slice(0, 30)}...` : ten, // Giờ 'ten' đã an toàn
      value: parseFloat(item.total_profit) || 0 // Thêm || 0 để an toàn
    };
  });

  const totalProfit = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        {/* Định nghĩa gradients cho màu đẹp hơn */}
        <defs>
          {COLORS.map((color, index) => (
            <radialGradient id={`gradient${index + 1}`} key={index}>
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={0.4} />
            </radialGradient>
          ))}
        </defs>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={120} // Tăng kích thước để dễ nhìn
          innerRadius={60} // Thêm lỗ giữa để kiểu donut, đẹp hơn
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} // Label % trên slice
          labelLine={true} // Kết nối line đến label
          animationDuration={800} // Animation mượt
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={RADIAL_GRADIENTS[index % RADIAL_GRADIENTS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip total={totalProfit} />} cursor={{ fill: 'rgba(255,255,255,0.2)' }} />
        <Legend 
          layout="vertical" // Di chuyển sang phải
          align="right" 
          verticalAlign="middle" 
          iconType="circle" 
          wrapperStyle={{ fontSize: '13px', paddingLeft: '10px' }} // Tăng font, thêm padding
          formatter={(value) => <span className="text-gray-700">{value}</span>} // Style nhãn
        />
      </PieChart>
    </ResponsiveContainer>
  );
};