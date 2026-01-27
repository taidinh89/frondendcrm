// src/components/analysis/AnalysisDataTable.jsx
import React from 'react';

const formatPrice = (value) => {
   const num = parseFloat(value);
   if (isNaN(num)) return 'N/A';
   return new Intl.NumberFormat('vi-VN').format(num.toFixed(0));
};

const formatQty = (value) => {
   const num = parseFloat(value);
   if (isNaN(num)) return 'N/A';
   return new Intl.NumberFormat('vi-VN').format(num);
}

// Định nghĩa các cột dựa trên "loại" (type)
const columnConfig = {
   products: [
     { header: 'Sản phẩm', key: 'ten_mat_hang', align: 'left' },
     { header: 'Doanh thu', key: 'total_revenue', format: formatPrice, align: 'right' },
     { header: 'Giá vốn', key: 'total_cost', format: formatPrice, align: 'right' },
     { header: 'Lợi nhuận', key: 'total_profit', format: formatPrice, align: 'right' },
     { header: 'SL Bán', key: 'total_quantity', format: formatQty, align: 'center' },
   ],
   frequency: [
     { header: 'Sản phẩm', key: 'ten_mat_hang', align: 'left' },
     { header: 'Số đơn hàng', key: 'order_frequency', format: formatQty, align: 'center' },
     { header: 'Tổng SL Bán', key: 'total_quantity', format: formatQty, align: 'center' },
   ],
   employees: [
     { header: 'Nhân viên', key: 'nguoi_phu_trach', align: 'left' },
     { header: 'Doanh thu', key: 'total_revenue', format: formatPrice, align: 'right' },
     { header: 'Lợi nhuận', key: 'total_profit', format: formatPrice, align: 'right' },
     { header: 'Số đơn', key: 'order_count', format: formatQty, align: 'center' },
     { header: 'Đơn TB', key: 'aov', format: formatPrice, align: 'right' },
   ],
};

export const AnalysisDataTable = ({ data, type = 'products' }) => {
   const columns = columnConfig[type] || columnConfig.products;

   if (!data || data.length === 0) {
     return <div className="text-center text-gray-500 py-8">Không có dữ liệu.</div>;
   }

   return (
     <div className="max-h-[70vh] overflow-auto rounded-lg border">
       <table className="min-w-full divide-y divide-gray-200">
         <thead className="bg-gray-50 sticky top-0">
           <tr>
             {columns.map((col) => (
               <th 
                 key={col.key} 
                 scope="col" 
                 className={`px-4 py-3 text-${col.align} text-xs font-medium text-gray-500 uppercase tracking-wider`}
               >
                 {col.header}
               </th>
             ))}
           </tr>
         </thead>
         <tbody className="bg-white divide-y divide-gray-200">
           {data.map((item, idx) => (
             <tr key={idx} className="hover:bg-gray-50">
               {columns.map((col) => {
                 const value = item[col.key];
                 const isProfit = col.key === 'total_profit';
                 return (
                   <td 
                     key={col.key} 
                     className={`px-4 py-3 whitespace-nowrap text-sm text-${col.align} ${
                       isProfit ? (value >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-900'
                     } ${col.key === 'ten_mat_hang' || col.key === 'nguoi_phu_trach' ? 'font-medium' : ''}`}
                   >
                     {col.format ? col.format(value) : value}
                   </td>
                 );
               })}
             </tr>
           ))}
         </tbody>
       </table>
     </div>
   );
};