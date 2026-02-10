// src/components/analysis/DebtEvidenceModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
// ĐÃ XÓA: import * as XLSX from 'xlsx';  <-- Để giảm dung lượng file build ban đầu
import { Modal, Button, Icon } from '../ui.jsx';
import { Tabs } from './Tabs.jsx';

// [MỚI] Import Modal Chi tiết đơn hàng (để dùng chung logic với Dashboard)
import { SalesOrderDetailModal } from '../../components/Modals/SalesOrderDetailModal.jsx';

// Helper format tiền
const formatPrice = (val) => new Intl.NumberFormat('vi-VN').format(Number(val) || 0);
const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(Number(val) || 0);

export const DebtEvidenceModal = ({ customer, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview'); 
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ orders: [], logs: [], partner: {} });
    const [expandedRows, setExpandedRows] = useState({});

    // [MỚI] State để quản lý việc xem chi tiết đơn hàng (popup chồng popup)
    const [viewingOrderDetailId, setViewingOrderDetailId] = useState(null);

    // 1. Fetch dữ liệu khi mở Modal
    useEffect(() => {
        if (isOpen && customer) {
            setLoading(true);
            axios.get(`/api/v2/debt-analysis/evidence/${customer.code}`, { 
                params: { type: 'receivable', mode: 'full' } 
            })
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
        } else {
            setData({ orders: [], logs: [], partner: {} });
        }
    }, [isOpen, customer]);

    // [QUAN TRỌNG] Chuyển thành async để dùng dynamic import
    const handleExportMultiSheet = async () => {
        if (!data.orders || data.orders.length === 0) return;
        
        try {
            // [QUAN TRỌNG] Load thư viện XLSX động tại đây để giảm 3.8MB bundle size
            const XLSX = await import('xlsx');

            const wb = XLSX.utils.book_new();
            const now = new Date();
            const dateStr = now.toLocaleDateString('vi-VN');

            // Helper: Tính tổng tiền theo điều kiện số ngày quá hạn
            // Logic: d >= min && d < max (để không bị trùng lắp)
            const sumDebtByDays = (min, max) => {
                return data.orders.reduce((sum, o) => {
                    const d = o.overdue_days;
                    // Nếu max là null thì chỉ cần >= min (cho trường hợp > 90 ngày)
                    if (max === null) {
                        return d >= min ? sum + (Number(o.debt_allocated) || 0) : sum;
                    }
                    // Trường hợp khoảng
                    return (d >= min && d < max) ? sum + (Number(o.debt_allocated) || 0) : sum;
                }, 0);
            };

            // Helper: Tính tổng trong hạn (<= 0 ngày)
            const sumFutureDebt = () => {
                return data.orders.reduce((sum, o) => {
                    return o.overdue_days <= 0 ? sum + (Number(o.debt_allocated) || 0) : sum;
                }, 0);
            };

            const totalValue = data.orders.reduce((sum, o) => sum + (Number(o.tong_tien_truoc_thue) || 0), 0);
            const totalDebt = data.orders.reduce((sum, o) => sum + (Number(o.debt_allocated) || 0), 0);

            // =========================================================
            // SHEET 1: BIÊN BẢN ĐỐI CHIẾU (CHI TIẾT 8 MỨC)
            // =========================================================
            const sheet1Data = [
                ["CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"],
                ["Độc lập - Tự do - Hạnh phúc"],
                [],
                ["BIÊN BẢN ĐỐI CHIẾU CÔNG NỢ"],
                [`Ngày lập: ${dateStr}`],
                [],
                ["Kính gửi:", customer?.name],
                ["Mã khách hàng:", customer?.code],
                [],
                ["Chúng tôi gồm có:"],
                ["Bên A (Bên bán):", "CÔNG TY TNHH CÔNG NGHỆ QUỐC VIỆT"], 
                ["Bên B (Bên mua):", customer?.name],
                [],
                [`Tính đến ngày ${dateStr}, số liệu công nợ như sau:`],
                [],
                ["NỘI DUNG", "SỐ TIỀN (VND)"],
                ["1. Tổng giá trị các đơn hàng trong kỳ:", formatNumber(totalValue)],
                ["2. Tổng số dư nợ cuối kỳ (Phải thu):", formatNumber(totalDebt)],
                [],
                ["PHÂN TÍCH TUỔI NỢ CHI TIẾT:"],
                // --- CÁC MỨC TUỔI NỢ BẠN YÊU CẦU ---
                ["- Gần đây :", formatNumber(sumFutureDebt())], 
                ["-     hạn < 3 ngày:",         formatNumber(sumDebtByDays(1, 3))],   // 1 đến 2 ngày
                ["-     hạn 3 - 7 ngày:",       formatNumber(sumDebtByDays(3, 7))],   // 3 đến 6 ngày
                ["-     hạn 7 - 15 ngày:",      formatNumber(sumDebtByDays(7, 15))],  // 7 đến 14 ngày
                ["-     hạn 15 - 30 ngày:",     formatNumber(sumDebtByDays(15, 30))], // 15 đến 29 ngày
                ["-     hạn 30 - 60 ngày:",     formatNumber(sumDebtByDays(30, 60))], // 30 đến 59 ngày
                ["-     hạn 60 - 90 ngày:",     formatNumber(sumDebtByDays(60, 90))], // 60 đến 89 ngày
                ["-     hạn > 90 ngày:",        formatNumber(sumDebtByDays(90, null))], // Từ 90 ngày trở lên
                [],
                ["Đề nghị quý khách kiểm tra và xác nhận số liệu trên."],
                [],
                [],
                ["ĐẠI DIỆN BÊN A", "", "ĐẠI DIỆN BÊN B"],
                ["(Ký, đóng dấu)", "", "(Ký, đóng dấu)"],
            ];

            const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
            ws1['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, ws1, "1. Biên Bản Đối Chiếu");


            // =========================================================
            // SHEET 2: BẢNG KÊ CHI TIẾT (Cập nhật cột Trạng thái)
            // =========================================================
            const getStatusLabel = (days) => {
                if (days <= 0) return 'Trong hạn';
                if (days < 3) return '< 3 Ngày';
                if (days < 7) return '3-7 Ngày';
                if (days < 15) return '7-15 Ngày';
                if (days < 30) return '15-30 Ngày';
                if (days < 60) return '30-60 Ngày';
                if (days < 90) return '60-90 Ngày';
                return '> 90 Ngày (Xấu)';
            };

            const sheet2Raw = data.orders.map((o, index) => ({
                'STT': index + 1,
                'Ngày chứng từ': o.ngay,
                'Số phiếu': o.so_phieu,
                'Diễn giải': o.dien_giai,
                'Phụ trách': o.nguoi_phu_trach,
                'Ngày quá hạn': o.overdue_days > 0 ? o.overdue_days : 0,
                'Phân loại nợ': getStatusLabel(o.overdue_days), // Cập nhật nhãn phân loại mới
                'Giá trị đơn hàng': Number(o.tong_tien_truoc_thue),
                'Số tiền còn nợ': Number(o.debt_allocated)
            }));

            sheet2Raw.push({
                'STT': '', 'Ngày chứng từ': '',
                'Số phiếu': 'TỔNG CỘNG',
                'Diễn giải': '', 'Phụ trách': '', 'Ngày quá hạn': '', 'Phân loại nợ': '',
                'Giá trị đơn hàng': totalValue,
                'Số tiền còn nợ': totalDebt
            });

            const ws2 = XLSX.utils.json_to_sheet(sheet2Raw);
            ws2['!cols'] = [
                { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, 
                { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 18 }
            ];
            XLSX.utils.book_append_sheet(wb, ws2, "2. Bảng Kê Đơn Hàng");

            // =========================================================
            // SHEET 3 & 4 (GIỮ NGUYÊN)
            // =========================================================
            const sheet3Raw = [];
            let totalItemValue = 0;
            data.orders.forEach(o => {
                if (o.items && o.items.length > 0) {
                    o.items.forEach(item => {
                        const itemVal = Number(item.so_tien_truoc_thue) || 0;
                        totalItemValue += itemVal;
                        sheet3Raw.push({
                            'Thuộc Số Phiếu': o.so_phieu,
                            'Ngày': o.ngay, 'Mã Hàng': item.ma_mat_hang, 'Tên Hàng Hóa': item.ten_mat_hang,
                            'ĐVT': item.don_vi_tinh, 'Số lượng': Number(item.so_luong), 'Đơn giá': Number(item.don_gia),
                            'Thành tiền': itemVal
                        });
                    });
                }
            });
            if (sheet3Raw.length > 0) {
                sheet3Raw.push({
                    'Thuộc Số Phiếu': 'TỔNG CỘNG', 'Thành tiền': totalItemValue
                });
                const ws3 = XLSX.utils.json_to_sheet(sheet3Raw);
                ws3['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 18 }];
                XLSX.utils.book_append_sheet(wb, ws3, "3. Chi Tiết Mặt Hàng");
            }

            const sheet4Raw = data.logs?.map(l => ({
                'Thời gian': l.date, 'Mã Phiếu': l.key, 'Loại thay đổi': l.type, 'Chi tiết': JSON.stringify(l.details)
            })) || [];
            if (sheet4Raw.length > 0) {
                const ws4 = XLSX.utils.json_to_sheet(sheet4Raw);
                ws4['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 60 }];
                XLSX.utils.book_append_sheet(wb, ws4, "4. Lịch Sử Biến Động");
            }

            // Xuất file
            const safeName = customer?.code ? customer.code.replace(/[^a-z0-9]/gi, '_') : 'KhachHang';
            XLSX.writeFile(wb, `DoiChieu_${safeName}_${now.toISOString().slice(0,10)}.xlsx`);
            
        } catch (error) {
            console.error("Lỗi khi tải thư viện xuất Excel:", error);
            alert("Không thể tải module xuất Excel. Vui lòng kiểm tra kết nối mạng.");
        }
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={onClose} 
                maxWidthClass="max-w-6xl"
                title={
                    <div className="flex justify-between items-center w-full pr-8">
                        <span>
                            Soi đơn: <span className="font-bold text-blue-700">{customer?.name}</span> 
                            <span className="text-gray-400 text-sm ml-2">({customer?.code})</span>
                        </span>
                        <Button 
                            onClick={handleExportMultiSheet} 
                            className="bg-green-600 hover:bg-green-700 text-white text-xs flex items-center shadow-sm px-3 py-1.5"
                        >
                            <Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" className="w-4 h-4 mr-2"/>
                            Xuất Excel (3 Góc độ)
                        </Button>
                    </div>
                }
            >
                <div className="h-[70vh] flex flex-col bg-gray-50">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500">Đang tải dữ liệu chi tiết...</div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="bg-white border-b px-4 pt-2 sticky top-0 z-10">
                                <Tabs 
                                    items={[
                                        { id: 'overview', label: '📋 Tổng hợp (Cũ)' },
                                        { id: 'details', label: '📦 Chi tiết mặt hàng' },
                                        { id: 'changes', label: '🕒 Lịch sử biến động' }
                                    ]} 
                                    activeTab={activeTab} 
                                    onTabChange={setActiveTab} 
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                
                                {/* --- TAB 1: VIEW TỔNG HỢP (CÓ CLICK XEM CHI TIẾT) --- */}
                                {activeTab === 'overview' && (
                                    <table className="w-full text-xs text-left border-collapse bg-white shadow-sm">
                                        <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0">
                                            <tr>
                                                <th className="p-3 border-b">Ngày</th>
                                                <th className="p-3 border-b">Số phiếu</th>
                                                <th className="p-3 border-b text-right">Giá trị</th>
                                                <th className="p-3 border-b text-right text-red-600">Nợ Gán</th>
                                                <th className="p-3 border-b text-center">Tuổi nợ</th>
                                                <th className="p-3 border-b">Diễn giải</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {data.orders.map((o, i) => (
                                                <tr key={i} className="hover:bg-blue-50 transition-colors">
                                                    <td className="p-3 text-gray-500 w-24">{o.ngay}</td>
                                                    
                                                    {/* [MỚI] CỘT SỐ PHIẾU CLICKABLE */}
                                                    <td 
                                                        className="p-3 font-bold text-blue-600 cursor-pointer hover:underline hover:text-blue-800"
                                                        title="Bấm để xem chi tiết phiếu"
                                                        onClick={() => setViewingOrderDetailId(o.unique_order_key || o.so_phieu)}
                                                    >
                                                        {o.so_phieu}
                                                    </td>

                                                    <td className="p-3 text-right">{formatPrice(o.tong_tien_truoc_thue)}</td>
                                                    <td className="p-3 text-right font-bold text-red-600 bg-red-50/50">{formatPrice(o.debt_allocated)}</td>
                                                    <td className={`p-3 text-center font-bold ${o.overdue_days > 30 ? 'text-red-600':'text-gray-600'}`}>
                                                        {o.overdue_days} ngày
                                                    </td>
                                                    <td className="p-3 text-gray-500 max-w-xs truncate" title={o.dien_giai}>{o.dien_giai}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {/* --- TAB 2: VIEW CHI TIẾT --- */}
                                {activeTab === 'details' && (
                                    <div className="space-y-2">
                                        {data.orders.map((o) => (
                                            <div key={o.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                                <div 
                                                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                                    onClick={() => toggleRow(o.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`transition-transform text-gray-400 ${expandedRows[o.id] ? 'rotate-90 text-blue-600' : ''}`}>▶</span>
                                                        <div>
                                                            <div className="font-bold text-blue-700 text-sm hover:underline" onClick={(e) => {
                                                                e.stopPropagation(); // Tránh toggle row khi bấm vào mã
                                                                setViewingOrderDetailId(o.unique_order_key || o.so_phieu);
                                                            }}>
                                                                {o.so_phieu} <span className="text-gray-400 font-normal text-xs">({o.ngay})</span>
                                                            </div>
                                                            <div className="text-xs text-gray-500 italic max-w-md truncate">{o.dien_giai}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-sm">{formatPrice(o.tong_tien_truoc_thue)}</div>
                                                        <div className={`text-xs ${o.debt_allocated > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                                                            {o.debt_allocated > 0 ? `Còn nợ: ${formatPrice(o.debt_allocated)}` : 'Đã xong'}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {expandedRows[o.id] && (
                                                    <div className="bg-gray-50 border-t p-2 pl-8">
                                                        <table className="w-full text-xs bg-white border rounded-md">
                                                            <thead className="text-gray-400 bg-gray-100/50">
                                                                <tr>
                                                                    <th className="p-2 text-left">Mã hàng</th>
                                                                    <th className="p-2 text-left">Tên hàng hóa</th>
                                                                    <th className="p-2 text-center">ĐVT</th>
                                                                    <th className="p-2 text-right">SL</th>
                                                                    <th className="p-2 text-right">Đơn giá</th>
                                                                    <th className="p-2 text-right">Thành tiền</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                                {o.items?.map((item, idx) => (
                                                                    <tr key={idx} className="hover:bg-gray-50">
                                                                        <td className="p-2 text-gray-500 font-mono">{item.ma_mat_hang}</td>
                                                                        <td className="p-2 font-medium">{item.ten_mat_hang}</td>
                                                                        <td className="p-2 text-center text-gray-400">{item.don_vi_tinh}</td>
                                                                        <td className="p-2 text-right">{formatNumber(item.so_luong)}</td>
                                                                        <td className="p-2 text-right text-gray-400">{formatPrice(item.don_gia)}</td>
                                                                        <td className="p-2 text-right font-bold text-gray-700">{formatPrice(item.so_tien_truoc_thue)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* --- TAB 3: LOGS --- */}
                                {activeTab === 'changes' && (
                                    <div className="space-y-3">
                                        {data.logs?.map((log, i) => (
                                            <div key={i} className="bg-white p-3 rounded border shadow-sm">
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span className="font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => setViewingOrderDetailId(log.key)}>
                                                        {log.key}
                                                    </span>
                                                    <span>{log.date}</span>
                                                </div>
                                                <pre className="text-[10px] bg-gray-100 p-2 rounded overflow-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            </div>
                                        ))}
                                        {(!data.logs || data.logs.length === 0) && (
                                            <div className="text-center text-gray-400 italic mt-4">Chưa có ghi nhận thay đổi nào</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-3 bg-gray-100 border-t flex justify-end rounded-b-lg">
                    <Button onClick={onClose} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100">Đóng</Button>
                </div>
            </Modal>

            {/* --- MODAL CHI TIẾT ĐƠN HÀNG (STACKED) --- */}
            {viewingOrderDetailId && (
                <SalesOrderDetailModal 
                    orderIdentifier={viewingOrderDetailId} 
                    onClose={() => setViewingOrderDetailId(null)}
                />
            )}
        </>
    );
};