// src/components/modals/InvoiceModal.jsx
import React from 'react';
import * as UI from '../ui.jsx';

const formatPrice = (price) => {
    if (price === null || price === undefined) return <span className="text-gray-400">N/A</span>;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

const formatNumber = (num) => {
    if (num === null || num === undefined) return <span className="text-gray-400">N/A</span>;
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num);
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch (e) {
        return dateString;
    }
};

export const InvoiceModal = ({
    isOpen,
    onClose,
    selectedInvoice,
    isModalLoading,
    modalFormData,
    setModalFormData,
    isUpdating,
    updateError,
    updateSuccess,
    modalViewMode,
    setModalViewMode,
    invoiceHtml,
    isHtmlLoading,
    iframeRef,
    handleFetchInvoiceHtml,
    handleUpdateInvoice,
    onPartnerClick,
}) => {
    const [subViewMode, setSubViewMode] = React.useState('gdt');

    // Tự động set subViewMode dựa trên tính khả dụng nếu cần (Ưu tiên PDF gốc)
    React.useEffect(() => {
        if (modalViewMode === 'html' && selectedInvoice) {
            if (selectedInvoice.has_pdf) {
                setSubViewMode('pdf');
            } else if (selectedInvoice.has_xml) {
                setSubViewMode('gdt');
            }
        }
    }, [modalViewMode, selectedInvoice?.id]);

    if (!isOpen) return null;

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
    };

    // [V2.1] Sử dụng cờ check chính xác từ backend (tồn tại vật lý)
    const isHtmlAvailable = selectedInvoice && (selectedInvoice.has_pdf || selectedInvoice.has_xml);

    // Dynamic props for printing since it wasn't clearly passed but used in footer
    const handlePrintInvoice = () => {
        if (iframeRef.current) {
            iframeRef.current.contentWindow.print();
        }
    };

    return (
        <UI.Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedInvoice ? `HĐ: ${selectedInvoice.data?.shdon || selectedInvoice.invoice_number} · ${selectedInvoice.seller_name || 'Hóa đơn'}` : 'Đang tải...'}
            maxWidthClass={modalViewMode === 'html' ? "max-w-none" : "max-w-4xl"}
            isFullScreen={modalViewMode === 'html'}
            hideHeader={modalViewMode === 'html'}
            footer={
                modalViewMode === 'details' ? (
                    <div className="flex justify-end space-x-2 p-4 border-t bg-gray-50 rounded-b-lg">
                        <UI.Button variant="secondary" onClick={onClose} type="button">Hủy</UI.Button>
                        <UI.Button variant="primary" type="submit" form="invoice-update-form" disabled={isUpdating}>
                            {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </UI.Button>
                    </div>
                ) : null // Hide footer in full screen mode to save space
            }
        >
            {isModalLoading && (
                <div className="flex justify-center items-center p-10">
                    <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="ml-3 text-gray-700">Đang tải chi tiết...</span>
                </div>
            )}

            {selectedInvoice && (
                <>
                    {/* [V2.3] HEADER CÔ ĐẶC: Chỉ hiện Tabs khi ở Detail mode, Html mode dùng toolbar riêng */}
                    {modalViewMode === 'details' && (
                        <div className="flex border-b flex-shrink-0 bg-slate-50/50">
                            <button
                                onClick={() => setModalViewMode('details')}
                                className={`py-3 px-6 text-sm font-black uppercase tracking-tight transition-colors ${modalViewMode === 'details' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Chi tiết & Sửa
                            </button>
                            <button
                                onClick={() => {
                                    if (!invoiceHtml) handleFetchInvoiceHtml(selectedInvoice);
                                    setModalViewMode('html');
                                }}
                                disabled={!isHtmlAvailable}
                                className={`py-3 px-6 text-sm font-black uppercase tracking-tight transition-colors ${modalViewMode === 'html' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-gray-400 hover:text-gray-600 disabled:opacity-30'}`}
                            >
                                Xem Hóa đơn từ CQT/PDF
                            </button>
                        </div>
                    )}

                    {modalViewMode === 'html' && (
                        <div className="flex-1 min-h-0 flex flex-col">
                            {/* [V2.3] TOOLBAR SIÊU GỌN: Kết hợp mọi tầng điều hướng vào 1 dòng */}
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white flex-shrink-0">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setModalViewMode('details')}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-black uppercase transition-all"
                                    >
                                        <UI.Icon name="chevronLeft" className="w-3.5 h-3.5" /> Thống kê
                                    </button>
                                    
                                    <div className="flex flex-col border-l border-white/20 pl-4 hidden sm:flex">
                                        <span className="text-[11px] font-black text-white leading-none uppercase tracking-tighter">HĐ: {selectedInvoice.invoice_number}</span>
                                        <span className="text-[9px] font-bold text-white/50 leading-tight truncate max-w-[200px]">{selectedInvoice.seller_name}</span>
                                    </div>
                                    
                                    <div className="h-4 w-[1px] bg-white/20" />

                                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                        <button 
                                            onClick={() => setSubViewMode('gdt')}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${subViewMode === 'gdt' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                        >
                                            Bản GDT
                                        </button>
                                        <button 
                                            onClick={() => { if (selectedInvoice.has_pdf) setSubViewMode('pdf'); }}
                                            disabled={!selectedInvoice.has_pdf}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${!selectedInvoice.has_pdf ? 'opacity-20 cursor-not-allowed' : (subViewMode === 'pdf' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/50 hover:text-white')}`}
                                        >
                                            Bản PDF Gốc
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {selectedInvoice.xml_download_url && (
                                        <button 
                                            onClick={() => window.open(selectedInvoice.xml_download_url)} 
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all" 
                                            title="Tải XML GDT"
                                        >
                                            <UI.Icon name="download" className="w-3.5 h-3.5" /> XML
                                        </button>
                                    )}
                                    {selectedInvoice.download_url && (
                                        <button 
                                            onClick={() => window.open(selectedInvoice.download_url)} 
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all" 
                                            title="Tải PDF Gốc"
                                        >
                                            <UI.Icon name="download" className="w-3.5 h-3.5" /> PDF
                                        </button>
                                    )}
                                    <button onClick={handlePrintInvoice} className="p-2 bg-white/5 hover:bg-white/20 text-white rounded-lg transition-all" title="In hóa đơn">
                                        <UI.Icon name="print" className="w-4 h-4" path="M6.72 3.978c-.37-.03-1.026-.062-1.72-.062-.693 0-1.35.033-1.72.062a.75.75 0 0 0-.66.639v1.89c0 .601.43 1.112 1.025 1.196.48.067 1.01.107 1.355.107s.875-.04 1.355-.107c.595-.084 1.025-.595 1.025-1.196v-1.89a.75.75 0 0 0-.66-.639zM18 9a.75.75 0 0 0 0 1.5h.008a.75.75 0 0 0 0-1.5H18z M12 3v15m0 0l-6.75-6.75M12 19.5l6.75-6.75" />
                                    </button>
                                    <button onClick={onClose} className="ml-2 p-2 bg-rose-500/10 hover:bg-rose-50 text-rose-500 rounded-lg transition-all flex items-center justify-center" title="Đóng">
                                        <UI.Icon name="x" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-hidden w-full bg-slate-100 flex-1 relative">
                                {isHtmlLoading ? (
                                    <div className="flex flex-col justify-center items-center h-full text-slate-400 space-y-4">
                                        <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="text-sm font-black uppercase tracking-widest">Đang tải bản thể hiện...</span>
                                    </div>
                                ) : (
                                    <iframe
                                        ref={iframeRef}
                                        src={subViewMode === 'pdf' ? `${selectedInvoice.download_url}&mode=inline` : undefined}
                                        srcDoc={subViewMode === 'gdt' ? (invoiceHtml || '<div style="color:#334155;text-align:center;padding:100px;font-family:sans-serif;"><h3>Không có dữ liệu HTML</h3><p>Hệ thống không tìm thấy bản trích xuất từ GDT.</p></div>') : undefined}
                                        title="Xem trước hóa đơn"
                                        className="absolute inset-0 w-full h-full"
                                        style={{ border: 'none' }}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {modalViewMode === 'details' && (
                        <form id="invoice-update-form" onSubmit={handleUpdateInvoice} className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-6 pb-6 border-b">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ngày HĐ</label>
                                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedInvoice.data?.tdlap || selectedInvoice.invoice_date)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Loại HĐ</label>
                                    <p className="mt-1 text-sm">
                                        {selectedInvoice.invoice_type === 'purchase' ? (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">Mua vào</span>
                                        ) : selectedInvoice.invoice_type === 'sale_cash_register' ? (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">MTT</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Bán ra</span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ký hiệu</label>
                                    <p className="mt-1 text-sm text-gray-900">{selectedInvoice.data?.khhdon || selectedInvoice.invoice_series || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Số HĐ</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900">{selectedInvoice.data?.shdon || selectedInvoice.invoice_number || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 text-indigo-700 font-black uppercase tracking-tight text-[10px]">Người bán (Click để xem thống kê)</label>
                                    <p 
                                        className="mt-1 text-sm text-indigo-600 font-bold hover:underline cursor-pointer bg-indigo-50/50 p-2 rounded-lg border border-indigo-100"
                                        onClick={() => onPartnerClick({ 
                                            tax_code: selectedInvoice.data?.nbmst || selectedInvoice.seller_tax_code, 
                                            name: selectedInvoice.data?.nbten || selectedInvoice.seller_name 
                                        })}
                                    >
                                        {selectedInvoice.data?.nbten || selectedInvoice.seller_name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">MST Người bán</label>
                                    <p className="mt-1 text-sm text-gray-700 font-mono">{selectedInvoice.data?.nbmst || selectedInvoice.seller_tax_code || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 text-indigo-700 font-black uppercase tracking-tight text-[10px]">Người mua (Click để xem thống kê)</label>
                                    <p 
                                        className="mt-1 text-sm text-indigo-600 font-bold hover:underline cursor-pointer bg-indigo-50/50 p-2 rounded-lg border border-indigo-100"
                                        onClick={() => onPartnerClick({ 
                                            tax_code: selectedInvoice.data?.nmmst || selectedInvoice.buyer_tax_code, 
                                            name: selectedInvoice.data?.nmten || selectedInvoice.buyer_name || selectedInvoice.buyer_name_display 
                                        })}
                                    >
                                        {selectedInvoice.data?.nmten || selectedInvoice.buyer_name || selectedInvoice.buyer_name_display || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">MST Người mua</label>
                                    <p className="mt-1 text-sm text-gray-700 font-mono">{selectedInvoice.data?.nmmst || selectedInvoice.buyer_tax_code || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tổng tiền</label>
                                    <p className="mt-1 text-sm font-bold text-slate-900">{formatPrice(selectedInvoice.total_amount)}</p>
                                </div>
                            </div>
                            
                            {/* Original File Download Status & Action */}
                            <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                                <div>
                                    <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">File gốc nhà cung cấp (MISA)</h4>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${selectedInvoice.original_download_status === 'success' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                        <span className="text-sm font-bold text-slate-700">
                                            {selectedInvoice.original_download_status === 'success' ? 'Đã sẵn sàng' : (selectedInvoice.original_download_status === 'failed' ? 'Lỗi tải về' : 'Đang xử lý/Chưa tải')}
                                        </span>
                                        {selectedInvoice.original_download_message && (
                                            <span className="text-xs text-slate-400 italic"> - {selectedInvoice.original_download_message}</span>
                                        )}
                                    </div>
                                </div>
                                <UI.Button 
                                    variant={selectedInvoice.download_url ? "primary" : "secondary"} 
                                    size="sm"
                                    disabled={!selectedInvoice.download_url}
                                    onClick={() => window.open(selectedInvoice.download_url)}
                                >
                                    <UI.Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" className="w-4 h-4 mr-2" />
                                    Tải PDF Gốc
                                </UI.Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label htmlFor="misa_status" className="block text-sm font-medium text-gray-700">Trạng thái MISA</label>
                                    <select
                                        id="misa_status"
                                        name="misa_status"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={modalFormData.misa_status}
                                        onChange={handleFormChange}
                                    >
                                        <option value="">Chưa nhập</option>
                                        <option value="Đã nhập">Đã nhập</option>
                                        <option value="Lỗi">Lỗi</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Ghi chú</label>
                                    <input
                                        type="text"
                                        id="notes"
                                        name="notes"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={modalFormData.notes}
                                        onChange={handleFormChange}
                                    />
                                </div>
                            </div>

                            {selectedInvoice.data?.dshang && selectedInvoice.data.dshang.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Chi tiết hàng hóa</h3>
                                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-[10px] font-black text-slate-500 uppercase">STT</th>
                                                    <th className="px-3 py-2 text-left text-[10px] font-black text-slate-500 uppercase">Tên hàng</th>
                                                    <th className="px-3 py-2 text-right text-[10px] font-black text-slate-500 uppercase">SL</th>
                                                    <th className="px-3 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Đơn giá</th>
                                                    <th className="px-3 py-2 text-right text-[10px] font-black text-slate-500 uppercase">Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {selectedInvoice.data.dshang.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-3 py-2 text-xs text-gray-500">{idx + 1}</td>
                                                        <td className="px-3 py-2 text-xs text-slate-700 font-medium">{item.thten || 'N/A'}</td>
                                                        <td className="px-3 py-2 text-xs text-slate-700 text-right font-bold">{formatNumber(item.sl)}</td>
                                                        <td className="px-3 py-2 text-xs text-slate-700 text-right">{formatPrice(item.dg)}</td>
                                                        <td className="px-3 py-2 text-xs text-indigo-600 text-right font-black">{formatPrice(item.sttien)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {selectedInvoice.data?.tongthue && (
                                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tổng hợp thuế & Thanh toán</h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Chưa thuế</span>
                                            <p className="mt-1 font-bold text-slate-700">{formatPrice(selectedInvoice.data.tongtien)}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Thuế GTGT</span>
                                            <p className="mt-1 font-bold text-indigo-600">{formatPrice(selectedInvoice.data.tongthue)}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Tổng thanh toán</span>
                                            <p className="mt-1 font-black text-slate-900 text-lg">{formatPrice(selectedInvoice.total_amount)}</p>
                                        </div>
                                        <div className="lg:col-span-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Bằng chữ</span>
                                            <p className="mt-1 text-xs text-slate-500 italic leading-snug">{selectedInvoice.data?.tongtienchu || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {updateError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-xl font-bold">
                                    Lỗi: {updateError}
                                </div>
                            )}
                            {updateSuccess && (
                                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 rounded-xl font-bold">
                                    Thành công: {updateSuccess}
                                </div>
                            )}
                        </form>
                    )}
                </>
            )}
        </UI.Modal>
    );
};
