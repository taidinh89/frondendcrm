import React, { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer, FileSpreadsheet, Settings, CheckCircle } from 'lucide-react';
import { QuotationPrintTemplate } from '../Trading/QuotationPrintTemplate';
import { exportQuotationToExcel } from '../../services/quotationExportService'; // Đảm bảo đường dẫn đúng

// ==========================================================================
// 1. CẤU HÌNH GIAO DIỆN MODAL (SỬA TẠI ĐÂY)
// ==========================================================================
const UI_CONFIG = {
    title: "XEM TRƯỚC VÀ IN ẤN",
    subTitle: "Hệ thống quản lý báo giá chuyên nghiệp",
    logoUrl: "/logo.png",
    colors: {
        primary: "text-blue-800",
        bgHeader: "bg-white"
    }
};

export const PrintPreviewModal = ({ isOpen, onClose, data }) => {
    // [FIX QUAN TRỌNG] Khởi tạo ref với giá trị null
    const componentRef = useRef(null);
    
    // State cấu hình
    const [settings, setSettings] = useState({
        templateType: 'images', // standard, technical, images, minimal
        vatMode: 'total_only',    // total_only, excluded, included
        showCompanyInfo: true,
        showSignatures: true,
        showNote: true
    });

    // Reset settings khi mở modal
    useEffect(() => {
        if (isOpen) {
            setSettings({
                templateType: 'images',
                vatMode: 'total_only',
                showCompanyInfo: true,
                showSignatures: true,
                showNote: true
            });
        }
    }, [isOpen]);

    // Phím tắt ESC
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // [FIX LOGIC IN ẤN] 
    // Dùng contentRef thay vì content() để sửa lỗi "did not receive contentRef"
    const handlePrint = useReactToPrint({
        contentRef: componentRef, 
        documentTitle: `Bao_Gia_${data?.code || 'Draft'}`,
        onAfterPrint: () => console.log('In thành công!'),
    });

    const handleExportExcel = () => {
        exportQuotationToExcel(data, settings);
    };

    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col animate-in fade-in duration-200">
            
            {/* HEADER MODAL */}
            <div className={`h-16 border-b px-6 flex justify-between items-center shadow-sm flex-shrink-0 ${UI_CONFIG.colors.bgHeader}`}>
                <div className="flex items-center gap-4">
                    <img src={UI_CONFIG.logoUrl} alt="Logo" className="h-10 w-auto" onError={(e) => e.target.style.display = 'none'} />
                    <div>
                        <h2 className={`text-lg font-bold leading-tight ${UI_CONFIG.colors.primary}`}>{UI_CONFIG.title}</h2>
                        <span className="text-xs text-gray-500 font-medium uppercase">{UI_CONFIG.subTitle}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleExportExcel} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium text-sm transition-colors shadow-sm">
                        <FileSpreadsheet size={18} /> Xuất Excel
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm">
                        <Printer size={18} /> In Ngay
                    </button>
                    <div className="w-px h-8 bg-gray-300 mx-1"></div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* SIDEBAR SETTINGS (Bên trái) */}
                <div className="w-80 bg-white border-r flex flex-col flex-shrink-0 overflow-y-auto">
                    <div className="p-5 border-b bg-gray-50">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2"><Settings size={18} /> Tùy chọn bản in</h3>
                    </div>
                    
                    <div className="p-5 space-y-6">
                        {/* 1. Mẫu in */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Mẫu báo giá</label>
                            <div className="space-y-2">
                                {[
                                    { id: 'standard', label: 'Tiêu chuẩn (Có đơn giá)' },
                                    { id: 'technical', label: 'Kỹ thuật (Ẩn giá)' },
                                    { id: 'images', label: 'Có hình ảnh sản phẩm' },
                                    { id: 'minimal', label: 'Tối giản (Tiết kiệm mực)' }
                                ].map(type => (
                                    <label key={type.id} className={`flex items-center p-3 rounded border cursor-pointer transition-all ${settings.templateType === type.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="templateType" className="hidden" checked={settings.templateType === type.id} onChange={() => setSettings({...settings, templateType: type.id})} />
                                        <div className="flex-1 text-sm font-medium text-gray-700">{type.label}</div>
                                        {settings.templateType === type.id && <CheckCircle size={16} className="text-blue-600" />}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 2. Hiển thị */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Hiển thị thông tin</label>
                            <div className="space-y-3 bg-gray-50 p-3 rounded border border-gray-100">
                                <label className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded">
                                    <input type="checkbox" checked={settings.showCompanyInfo} onChange={e => setSettings({...settings, showCompanyInfo: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                                    <span className="ml-2 text-sm text-gray-700">Header Công ty</span>
                                </label>
                                <label className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded">
                                    <input type="checkbox" checked={settings.showSignatures} onChange={e => setSettings({...settings, showSignatures: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                                    <span className="ml-2 text-sm text-gray-700">Chữ ký xác nhận</span>
                                </label>
                                <label className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded">
                                    <input type="checkbox" checked={settings.showNote} onChange={e => setSettings({...settings, showNote: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                                    <span className="ml-2 text-sm text-gray-700">Ghi chú & Điều khoản</span>
                                </label>
                            </div>
                        </div>

                        {/* 3. Thuế VAT */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Chế độ thuế VAT</label>
                            <select className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={settings.vatMode} onChange={e => setSettings({...settings, vatMode: e.target.value})}>
                                <option value="total_only">Chỉ hiện tổng tiền</option>
                                <option value="included">Giá đã bao gồm VAT</option>
                                <option value="excluded">Giá chưa gồm VAT</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* PREVIEW AREA (Bên phải) */}
                <div className="flex-1 bg-gray-200 overflow-auto flex justify-center p-8 custom-scrollbar">
                    {/* Component được in phải nằm trong div này */}
                    <div className="shadow-2xl print:shadow-none bg-white transition-all duration-300 ease-in-out origin-top w-fit h-fit">
                        <QuotationPrintTemplate 
                            ref={componentRef} // [QUAN TRỌNG] Gắn ref vào đây
                            data={data} 
                            settings={settings} // Truyền settings xuống để Template render theo tùy chọn
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};