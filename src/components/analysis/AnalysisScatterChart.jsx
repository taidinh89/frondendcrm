import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value);

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        // Kiểm tra xem data có phải là data sản phẩm không
        if (!data || !data.ten_mat_hang) return null; 
        
        // Định dạng lại giá trị lợi nhuận cho tooltip
        const formattedProfit = data.total_profit ? formatPrice(data.total_profit) : '0';
        
        return (
            <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-xs z-50">
                <p className="font-bold text-gray-800 mb-1 max-w-[200px] truncate">{data.ten_mat_hang}</p>
                <p className="text-gray-500 mb-2">{data.ma_mat_hang}</p>
                <div className="flex justify-between gap-4">
                    <span className="text-blue-600">SL: <b>{data.total_quantity}</b></span>
                    <span className="text-green-600">Lãi: <b>{formattedProfit}</b></span>
                </div>
            </div>
        );
    }
    return null;
};

export const AnalysisScatterChart = ({ data }) => {
    if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu</div>;

    return (
        <ResponsiveContainer width="100%" height="100%">
            {/* Tăng left margin để hiển thị nhãn trục Y */}
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}> 
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                
                {/* SỬA ĐỔI TRỤC X: Bắt đầu từ 0 và thêm nhãn tường minh */}
                <XAxis 
                    type="number" 
                    dataKey="total_quantity" 
                    name="Số lượng" 
                    unit="" 
                    tick={{ fontSize: 11 }}
                    domain={[0, 'auto']} // Chỉ hiển thị giá trị >= 0 (Số lượng)
                    label={{ 
                        value: 'Số lượng bán (Total Quantity)', 
                        position: 'bottom', 
                        offset: 0, 
                        style: { fontSize: 12, fontWeight: 'bold' } 
                    }}
                />
                
                {/* SỬA ĐỔI TRỤC Y: Thêm nhãn tường minh */}
                <YAxis 
                    type="number" 
                    dataKey="total_profit" 
                    name="Lợi nhuận" 
                    unit="" 
                    tickFormatter={(val) => (val/1000000).toFixed(0) + 'M'} 
                    tick={{ fontSize: 11 }}
                    label={{ 
                        value: 'Lợi nhuận ròng (Total Profit)', 
                        angle: -90, // Xoay 90 độ
                        position: 'left', 
                        style: { fontSize: 12, fontWeight: 'bold' } 
                    }}
                />
                
                {/* ZAxis (kích thước điểm) giữ nguyên */}
                <ZAxis type="number" range={[60, 400]} /> 
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                
                {/* SỬA ĐỔI MÀU SẮC: Màu xanh dương đậm hơn và độ mờ 0.7 */}
                <Scatter name="Sản phẩm (Top 50)" data={data} fill="#4f46e5" fillOpacity={0.7} />
            </ScatterChart>
        </ResponsiveContainer>
    );
};