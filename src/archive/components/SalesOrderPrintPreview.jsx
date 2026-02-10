// src/archive/components/SalesOrderPrintPreview.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as UI from '../../components/ui.jsx'; 
import { useReactToPrint } from 'react-to-print';
import axios from 'axios'; 

// --- DANH SÁCH BẢN IN ---
const printTemplates = [
    { id: 'default', name: 'Mẫu mặc định (Nội bộ)' },
    { id: 'invoice_A4.html', name: 'Mẫu Hóa Đơn A4 (Tùy chỉnh)' },
];

// --- HÀM HỖ TRỢ ---
const formatPrice = (price) => {
    if (price === null || price === undefined || price === 0) return "0 đ";
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

const mergeTemplate = (html, order) => {
    if (!order) return html;
    let mergedHtml = html;
    const totalAmount = order.items.reduce((sum, item) => sum + (item.so_luong * item.don_gia), 0);
    mergedHtml = mergedHtml.replace(/{{order\.(\w+)}}/g, (match, key) => {
        if (key === 'ngay_formatted') {
            return new Date(order.ngay).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        const value = order[key];
        if (value === '00' || !value) return '';
        return value;
    });
    mergedHtml = mergedHtml.replace('{{summary.total_formatted}}', formatPrice(totalAmount));
    const tbodyRegex = /<tbody>([\s\S]*?)<\/tbody>/;
    const tbodyMatch = mergedHtml.match(tbodyRegex);
    if (tbodyMatch) {
        const tbodyInner = tbodyMatch[1].trim(); 
        let itemsHtml = ''; 
        order.items.forEach((item) => {
            let itemHtml = tbodyInner;
            itemHtml = itemHtml.replace(/{{item\.(\w+)}}/g, (match, key) => item[key] || '');
            itemHtml = itemHtml.replace('{{item.don_gia_formatted}}', formatPrice(item.don_gia));
            itemHtml = itemHtml.replace('{{item.thanh_tien_formatted}}', formatPrice(item.so_luong * item.don_gia));
            itemsHtml += itemHtml; 
        });
        const newTbody = `<tbody>${itemsHtml}</tbody>`;
        mergedHtml = mergedHtml.replace(tbodyRegex, newTbody);
    }
    return mergedHtml;
};

// CSS DÙNG RIÊNG CHO IN ẤN
const pageStyle = `
  @page {
    margin: 0.5in;
  }
  .printable-content {
    display: block !important;
  }
  .printable-sales-order table {
    display: table !important;
    width: 100% !important;
  }
  .printable-sales-order thead {
    display: table-header-group !important;
  }
  .printable-sales-order tbody {
    display: table-row-group !important;
  }
  .printable-sales-order tr {
    display: table-row !important;
  }
  .printable-sales-order th, .printable-sales-order td {
    display: table-cell !important;
  }
  .printable-sales-order .grid, .printable-sales-order .flex {
    display: block !important;
  }
  .printable-sales-order .grid-cols-2 {
    display: block !important;
  }
  .printable-sales-order .grid-cols-2 > div {
    display: inline-block !important;
    width: 49% !important; 
    vertical-align: top !important;
    page-break-inside: avoid !important;
  }
`;

// --- COMPONENT CHÍNH ---
export const SalesOrderPrintPreview = ({ order, onClose }) => {
    
    const [selectedTemplate, setSelectedTemplate] = useState(printTemplates[0].id); 
    const [mergedCustomHtml, setMergedCustomHtml] = useState(null);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
    
    const defaultRef = useRef(null); // [SỬA: Đảm bảo null explicit]
    const iframeRef = useRef(null);

    // [SỬA CHÍNH: Dùng contentRef thay vì content callback - Fix lỗi "did not receive a contentRef"]
    const defaultHandlePrint = useReactToPrint({
        contentRef: defaultRef, // Thay vì content: () => defaultRef.current
        pageStyle: pageStyle, 
        removeAfterPrint: true,
    });

    useEffect(() => {
        if (selectedTemplate === 'default' || !order) {
            setMergedCustomHtml(null); 
            return;
        }
        const loadCustomTemplate = async () => {
            setIsLoadingTemplate(true);
            try {
                const response = await fetch(`/print_templates/${selectedTemplate}`); 
                if (!response.ok) {
                    throw new Error(`Không thể tải template: ${selectedTemplate}`);
                }
                const htmlTemplate = await response.text();
                const finalHtml = mergeTemplate(htmlTemplate, order);
                setMergedCustomHtml(finalHtml);
            } catch (err) {
                console.error(err);
                setMergedCustomHtml(`<p>Lỗi tải template: ${err.message}. Hãy chắc chắn file ${selectedTemplate} tồn tại trong thư mục /public/print_templates/</p>`);
            } finally {
                setIsLoadingTemplate(false);
            }
        };
        loadCustomTemplate();
    }, [selectedTemplate, order]); 

    // Hàm xử lý in chung
    const handlePrint = () => {
        if (selectedTemplate === 'default') {
            defaultHandlePrint();
        } else {
            const iframe = iframeRef.current;
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } else {
                console.error('Iframe chưa sẵn sàng để in');
                alert('Vui lòng chờ template tải xong trước khi in.');
            }
        }
    };

    return (
        <div className="print-preview-container">
            {/* Thanh công cụ (Sẽ bị ẩn khi in) */}
            <div className="p-4 border-b flex justify-between items-center print-hide">
                <div>
                    <label htmlFor="template_select" className="text-sm font-medium text-gray-700 mr-2">
                        Chọn mẫu in:
                    </label>
                    <select
                        id="template_select"
                        className="p-2 border border-gray-300 rounded-md text-sm"
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        disabled={!order}
                    >
                        {printTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex space-x-3">
                    <UI.Button type="button" variant="secondary" onClick={onClose}>
                        Đóng
                    </UI.Button>
                    <UI.Button 
                        type="button" 
                        variant="primary" 
                        onClick={handlePrint} 
                        disabled={!order || (selectedTemplate !== 'default' && isLoadingTemplate)}
                    >
                        <UI.Icon path="M6.72 13.86l.24-1.14H17.04l.24 1.14H6.72zM4 6h16v6H4V6zm1 1v4h14V7H5zm-1 8h16v6H4v-6zm1 1v4h14v-4H5z" className="w-5 h-5 mr-2" />
                        In Phiếu
                    </UI.Button>
                </div>
            </div>

            {/* Vùng hiển thị bản in */}
            <div className="print-content-area">
                {/* 1. MẪU MẶC ĐỊNH (JSX) - Luôn mount để ref ổn định */}
                <div style={{ display: selectedTemplate === 'default' ? 'block' : 'none' }}>
                    {order ? (
                        <div ref={defaultRef} className="printable-content">
                            <DefaultPrintTemplate order={order} />
                        </div>
                    ) : (
                        <div className="p-6 text-center text-gray-500">Đang tải dữ liệu đơn hàng...</div>
                    )}
                </div>
                
                {/* 2. MẪU TÙY CHỈNH (HTML) - Iframe cho preview, print riêng */}
                <div style={{ display: selectedTemplate !== 'default' ? 'block' : 'none' }}>
                    {isLoadingTemplate ? (
                        <div className="p-6 text-center">Đang tải template...</div>
                    ) : (
                        <iframe
                            ref={iframeRef}
                            srcDoc={mergedCustomHtml || ''}
                            title="Print Preview"
                            className="w-full h-[600px] border-0"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT CON: MẪU MẶC ĐỊNH --- (Giữ nguyên)
const DefaultPrintTemplate = ({ order }) => {
    
    const totalAmount = useMemo(() => {
        if (!order || !order.items) return 0;
        return order.items.reduce((sum, item) => sum + (item.so_luong * item.don_gia), 0);
    }, [order]);

    const projectDept = [order.du_an, order.phong_ban]
        .filter(val => val && val !== '00') 
        .join(' / ');

    return (
        <div className="printable-sales-order p-4 md:p-6 break-inside-avoid">
            <h2 className="text-2xl font-bold text-center mb-2">PHIẾU BÁN HÀNG</h2>
            <div className="text-center text-sm text-gray-600 mb-6">
                Mã phiếu: <strong>{order.composite_key}</strong> | Ngày: <strong>{new Date(order.ngay).toLocaleDateString('vi-VN')}</strong>
            </div>

            <div className="grid grid-cols-2 gap-x-6 border-b pb-4">
                <InfoRow label="Khách hàng" value={`${order.ten_khncc} (${order.ma_khncc})`} />
                <InfoRow label="Kho xuất" value={order.kho_xuat_hh_nvl} />
                <InfoRow label="Địa chỉ giao hàng" value={order.dia_chi_giao_hang} />
                <InfoRow label="Dự án / Phòng ban" value={projectDept} />
            </div>

            <div className="grid grid-cols-1 gap-x-6 border-b py-4">
                 <InfoRow label="Ghi chú" value={order.ghi_chu_tren_phieu} />
            </div>

            <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Chi tiết sản phẩm</h3>
                <table className="w-full text-left print-table">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 text-sm font-semibold">Sản phẩm</th>
                            <th className="p-2 text-sm font-semibold text-right">Số lượng</th>
                            <th className="p-2 text-sm font-semibold text-right">Đơn giá</th>
                            <th className="p-2 text-sm font-semibold text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <tr key={index} className="border-b">
                                <td className="p-2">
                                    <div className="text-sm font-medium">{item.ten_mat_hang}</div>
                                    <div className="text-xs text-gray-600">({item.ma_mat_hang})</div>
                                </td>
                                <td className="p-2 text-right">{item.so_luong}</td>
                                <td className="p-2 text-right">{formatPrice(item.don_gia)}</td>
                                <td className="p-2 text-right font-medium">{formatPrice(item.so_luong * item.don_gia)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end mt-6">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                        <span>Tổng cộng:</span>
                        <span>{formatPrice(totalAmount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component `InfoRow` đơn giản
const InfoRow = ({ label, value }) => (
    <div className="py-2">
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className="text-sm text-gray-900">{value || '-'}</div>
    </div>
);