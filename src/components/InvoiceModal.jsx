// src/components/InvoiceModal.jsx
import React, { useRef } from 'react';
import * as UI from './ui.jsx';

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
    handleUpdateInvoice,
    handlePrintInvoice,
    handleFetchInvoiceHtml,
}) => {
    if (!isOpen) return null;

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
    };

    const isHtmlAvailable = selectedInvoice && (selectedInvoice.invoice_xml || selectedInvoice.original_invoice_path);

    return (
        <UI.Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedInvoice ? `Chi tiết HĐ: ${selectedInvoice.data?.shdon || selectedInvoice.invoice_number}` : 'Đang tải...'}
            
            maxWidthClass={modalViewMode === 'html' ? "max-w-6xl" : "max-w-4xl"}
            
            footer={
                modalViewMode === 'details' ? (
                    <div className="flex justify-end space-x-2 p-4 border-t bg-gray-50 rounded-b-lg">
                        <UI.Button variant="secondary" onClick={onClose} type="button">Hủy</UI.Button>
                        <UI.Button variant="primary" type="submit" form="invoice-update-form" disabled={isUpdating}>
                            {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </UI.Button>
                    </div>
                ) : (
                     <div className="flex justify-end space-x-2 p-4 border-t bg-gray-50 rounded-b-lg">
                        <UI.Button variant="secondary" onClick={handlePrintInvoice} type="button">
                            <UI.Icon path="M6 2.25v1.5a1.5 1.5 0 00-1.5 1.5H3.75c-.414 0-.75.336-.75.75v3c0 .414.336.75.75.75H5.25a1.5 1.5 0 001.5 1.5v3a1.5 1.5 0 001.5 1.5h1.5a1.5 1.5 0 001.5-1.5v-3.75m1.5 0V7.5a1.5 1.5 0 00-1.5-1.5H9.75M16.5 7.5a1.5 1.5 0 00-1.5-1.5h-1.5a1.5 1.5 0 00-1.5 1.5v3.75m0 0H7.5" className="w-4 h-4 mr-1.5"/>
                            In Hóa đơn
                        </UI.Button>
                        <UI.Button variant="secondary" onClick={onClose} type="button">Đóng</UI.Button>
                     </div>
                )
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
                    {/* Tab Selector */}
                    <div className="flex border-b flex-shrink-0">
                        <button
                            onClick={() => setModalViewMode('details')}
                            className={`py-3 px-6 text-sm font-medium transition-colors ${modalViewMode === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            Chi tiết & Sửa
                        </button>
                        <button
                            onClick={() => handleFetchInvoiceHtml(selectedInvoice)}
                            disabled={!isHtmlAvailable}
                            className={`py-3 px-6 text-sm font-medium transition-colors ${modalViewMode === 'html' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800 disabled:opacity-50'}`}
                        >
                            Xem Hóa đơn từ CQT/PDF
                        </button>
                    </div>

                    {modalViewMode === 'html' && (
                        <div className="flex-1 min-h-0">
                            <div className="overflow-hidden w-full bg-white">
                                {isHtmlLoading ? (
                                    <div className="flex justify-center items-center h-96">
                                        <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="ml-3 text-gray-700">Đang tải nội dung hóa đơn...</span>
                                    </div>
                                ) : (
                                    <iframe
                                        ref={iframeRef}
                                        srcDoc={invoiceHtml || '<p class="p-4 text-center text-gray-500">Không có nội dung HTML/PDF.</p>'}
                                        title="Xem trước hóa đơn gốc"
                                        className="w-full h-[85vh]"
                                        style={{ border: 'none' }}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {modalViewMode === 'details' && (
                        <form id="invoice-update-form" onSubmit={handleUpdateInvoice} className="p-6 overflow-y-auto">
                            {/* === Thông tin cơ bản === */}
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
                                    <label className="block text-sm font-medium text-gray-700">Người bán</label>
                                    <p className="mt-1 text-sm text-gray-700">{selectedInvoice.data?.nbten || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">MST Người bán</label>
                                    <p className="mt-1 text-sm text-gray-700">{selectedInvoice.data?.nbmst || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Người mua</label>
                                    <p className="mt-1 text-sm text-gray-700">{selectedInvoice.data?.nmten || selectedInvoice.buyer_name_display || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">MST Người mua</label>
                                    <p className="mt-1 text-sm text-gray-700">{selectedInvoice.buyer_tax_code || selectedInvoice.data?.nmmst || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tổng tiền</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900">{formatPrice(selectedInvoice.total_amount)}</p>
                                </div>
                            </div>

                            {/* === Trạng thái MISA & Ghi chú === */}
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

                            {/* === Bảng chi tiết hàng hóa === */}
                            {selectedInvoice.data?.dshang && selectedInvoice.data.dshang.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">Chi tiết hàng hóa</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên hàng</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">SL</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {selectedInvoice.data.dshang.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-3 py-2 text-sm text-gray-900">{idx + 1}</td>
                                                        <td className="px-3 py-2 text-sm text-gray-700">{item.thten || 'N/A'}</td>
                                                        <td className="px-3 py-2 text-sm text-gray-700 text-right">{formatNumber(item.sl)}</td>
                                                        <td className="px-3 py-2 text-sm text-gray-700 text-right">{formatPrice(item.dg)}</td>
                                                        <td className="px-3 py-2 text-sm text-gray-700 text-right">{formatPrice(item.sttien)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* === Tổng hợp VAT === */}
                            {selectedInvoice.data?.tongthue && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">Tổng hợp thuế</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium text-gray-700">Tổng tiền chưa thuế:</span>
                                            <p className="mt-1">{formatPrice(selectedInvoice.data.tongtien)}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Tổng thuế GTGT:</span>
                                            <p className="mt-1">{formatPrice(selectedInvoice.data.tongthue)}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Tổng cộng:</span>
                                            <p className="mt-1 font-medium">{formatPrice(selectedInvoice.total_amount)}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Bằng chữ:</span>
                                            <p className="mt-1 text-gray-600 italic">{selectedInvoice.data?.tongtienchu || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* === Thông báo cập nhật === */}
                            {updateError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded">
                                    <strong>Lỗi:</strong> {updateError}
                                </div>
                            )}
                            {updateSuccess && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-sm text-green-700 rounded">
                                    <strong>Thành công:</strong> {updateSuccess}
                                </div>
                            )}
                        </form>
                    )}
                </>
            )}
        </UI.Modal>
    );
};