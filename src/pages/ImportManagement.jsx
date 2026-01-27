import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
// Giữ lại component UI cũ của bạn nếu muốn, hoặc dùng class Tailwind trực tiếp như dưới đây để đảm bảo hiển thị đúng
import { Icon } from '../components/ui'; 

const ImportManagement = ({ setAppTitle }) => {
    // --- STATE QUẢN LÝ ---
    const [file, setFile] = useState(null);
    const [importType, setImportType] = useState('PURCHASE'); // 'PURCHASE' | 'SALE'
    const [isDebug, setIsDebug] = useState(true); // Mặc định bật chế độ soi lỗi
    const [uploading, setUploading] = useState(false);
    const [serverResult, setServerResult] = useState(null);
    const [viewMode, setViewMode] = useState('ui'); // 'ui' | 'raw'

    // Set tiêu đề trang
    useEffect(() => {
        if (setAppTitle) setAppTitle('Kiểm toán & Nhập liệu V2');
    }, [setAppTitle]);

    // --- XỬ LÝ FILE ---
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setServerResult(null); // Reset kết quả cũ khi chọn file mới
        }
    };

    // --- GỬI API (QUAN TRỌNG) ---
    const handleUpload = async () => {
        if (!file) {
            toast.warn("Vui lòng chọn file Excel/CSV trước!");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        // Gửi cờ debug: 1 (Soi) hoặc 0 (Chạy thật)
        formData.append('debug', isDebug ? '1' : '0'); 

        // Chọn API Endpoint dựa trên loại nhập (Đúng như bạn yêu cầu)
        const apiEndpoint = importType === 'PURCHASE' 
            ? '/api/security/import/purchases'
            : '/api/security/import/sales';

        try {
            const res = await axios.post(apiEndpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setServerResult(res.data);
            
            // Thông báo toast
            if (res.data.status === 'success') {
                toast.success(isDebug ? 'Đã phân tích xong!' : 'Đã nhập kho thành công!');
            } else if (res.data.status === 'preview') {
                toast.info('Đã tải dữ liệu xem trước.');
            }

        } catch (error) {
            console.error("Upload Error:", error);
            const msg = error.response?.data?.message || error.message;
            toast.error(`Lỗi: ${msg}`);
            setServerResult(error.response?.data || null);
        } finally {
            setUploading(false);
        }
    };

    // --- RENDER GIAO DIỆN ---
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
            
            {/* 1. THANH ĐIỀU KHIỂN TRUNG TÂM */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-2xl">📥</span> Trung Tâm Nhập Liệu Kho
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Hệ thống V2: Auto-Master, Unit Watchdog & Ledger Sync</p>
                    </div>

                    {/* Nút chuyển chế độ Mua/Bán */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => { setImportType('PURCHASE'); setServerResult(null); }}
                            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
                                importType === 'PURCHASE' 
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            🚛 Nhập Mua Hàng
                        </button>
                        <button
                            onClick={() => { setImportType('SALE'); setServerResult(null); }}
                            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
                                importType === 'SALE' 
                                ? 'bg-white text-green-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            🛒 Nhập Bán Hàng
                        </button>
                    </div>
                </div>

                {/* Khu vực Upload & Cấu hình */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Dropzone */}
                    <div className="lg:col-span-2 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors hover:bg-blue-50 hover:border-blue-300">
                        <input 
                            type="file" 
                            id="fileInput" 
                            className="hidden" 
                            accept=".csv, .xlsx, .xls"
                            onChange={handleFileChange}
                        />
                        
                        {!file ? (
                            <label htmlFor="fileInput" className="cursor-pointer space-y-3">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-3xl">
                                    📂
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700">Click để chọn file Excel/CSV</p>
                                    <p className="text-xs text-gray-400 mt-1">Hỗ trợ định dạng .xlsx, .csv</p>
                                </div>
                            </label>
                        ) : (
                            <div className="w-full flex items-center justify-between bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded flex items-center justify-center font-bold text-xs">XLS</div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-800 truncate max-w-[200px]">{file.name}</p>
                                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button onClick={() => { setFile(null); setServerResult(null); }} className="text-gray-400 hover:text-red-500 p-2">
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Bảng điều khiển (Toggle Debug) */}
                    <div className="flex flex-col justify-center space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-gray-700">Chế độ hoạt động</span>
                                {/* Toggle Switch Custom */}
                                <button 
                                    onClick={() => setIsDebug(!isDebug)}
                                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${isDebug ? 'bg-yellow-400' : 'bg-blue-600'}`}
                                >
                                    <span 
                                        className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 transform ${isDebug ? 'translate-x-6' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                            <p className={`text-xs ${isDebug ? 'text-yellow-700' : 'text-blue-700'} font-medium`}>
                                {isDebug 
                                    ? "🔍 DEBUG (SOI LỖI): Không lưu vào DB, chỉ kiểm tra logic." 
                                    : "🚀 CHẠY THẬT: Dữ liệu sẽ được lưu vào hệ thống."}
                            </p>
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={uploading || !file}
                            className={`w-full py-3 px-4 rounded-lg text-white font-bold shadow-lg transform transition-transform active:scale-95 flex items-center justify-center gap-2 ${
                                uploading ? 'bg-gray-400 cursor-not-allowed' :
                                isDebug ? 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {uploading ? (
                                <>⏳ Đang xử lý...</>
                            ) : (
                                <>{isDebug ? '🔍 PHÂN TÍCH FILE' : '🚀 TIẾN HÀNH NHẬP KHO'}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. KHU VỰC KẾT QUẢ (HIỂN THỊ THÔNG MINH) */}
            {serverResult && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in-up">
                    {/* Header Kết quả */}
                    <div className={`px-6 py-4 border-b flex justify-between items-center ${
                        serverResult.status === 'success' ? 'bg-green-50' : 
                        serverResult.status === 'preview' ? 'bg-yellow-50' : 'bg-red-50'
                    }`}>
                        <div>
                            <h3 className={`font-bold ${
                                serverResult.status === 'success' ? 'text-green-800' : 
                                serverResult.status === 'preview' ? 'text-yellow-800' : 'text-red-800'
                            }`}>
                                {serverResult.message || 'Kết quả xử lý'}
                            </h3>
                            {serverResult.debug_data && (
                                <p className="text-xs text-gray-600 mt-1">
                                    Đã quét {serverResult.debug_data.total_rows} dòng.
                                </p>
                            )}
                        </div>
                        
                        {/* Tab Switcher: UI vs Raw */}
                        <div className="flex bg-white/50 p-1 rounded-md">
                            <button onClick={() => setViewMode('ui')} className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'ui' ? 'bg-white shadow' : 'text-gray-500'}`}>Giao diện</button>
                            <button onClick={() => setViewMode('raw')} className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'raw' ? 'bg-white shadow' : 'text-gray-500'}`}>Raw JSON</button>
                        </div>
                    </div>

                    {/* VIEW MODE: UI TABLE */}
                    {viewMode === 'ui' && serverResult.debug_data?.samples ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">#</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">Trạng thái</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider text-xs w-1/4">Dữ liệu Gốc (Excel)</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider text-xs w-1/4">Dữ liệu Đích (DB)</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">Phân tích Hệ thống</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {serverResult.debug_data.samples.map((row, idx) => (
                                        <tr key={idx} className={`hover:bg-gray-50 transition-colors ${
                                            row.status === 'ERROR' ? 'bg-red-50/50' : 
                                            !row.final_db ? 'bg-gray-50 opacity-60' : ''
                                        }`}>
                                            <td className="px-4 py-3 font-mono text-gray-500">{row.row_index}</td>
                                            
                                            <td className="px-4 py-3">
                                                {row.status === 'OK' && <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">HỢP LỆ</span>}
                                                {row.status === 'ERROR' && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold animate-pulse">LỖI</span>}
                                                {!row.final_db && !row.error_msg && <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs font-bold">BỎ QUA</span>}
                                            </td>

                                            {/* Dữ liệu Gốc */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {Object.entries(row.original).slice(0, 3).map(([k, v]) => (
                                                        <div key={k} className="flex gap-2 text-xs">
                                                            <span className="text-gray-400 font-mono shrink-0">{k}:</span>
                                                            <span className="text-gray-700 truncate max-w-[150px]" title={v}>{v}</span>
                                                        </div>
                                                    ))}
                                                    {Object.keys(row.original).length > 3 && <div className="text-xs text-gray-400 italic">...và các cột khác</div>}
                                                </div>
                                            </td>

                                            {/* Dữ liệu Đích (Mapped) */}
                                            <td className="px-4 py-3">
                                                {row.final_db ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400 w-8">Ngày:</span>
                                                            <span className="font-bold text-blue-600">{row.final_db.txn_date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400 w-8">Mã:</span>
                                                            <span className="font-bold bg-gray-100 px-1 rounded">{row.final_db.prod_cd}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400 w-8">SL:</span>
                                                            <span className={`font-bold ${row.final_db.qty_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {row.final_db.qty_change}
                                                            </span>
                                                            <span className="text-xs text-gray-500">({row.final_db.raw_unit})</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">-- Không tạo dữ liệu --</span>
                                                )}
                                            </td>

                                            {/* Phân tích lỗi */}
                                            <td className="px-4 py-3">
                                                {row.error_msg ? (
                                                    <div className="text-red-600 text-xs font-bold flex items-start gap-1">
                                                        <span>⛔</span>
                                                        <span>{row.error_msg}</span>
                                                    </div>
                                                ) : row.final_db ? (
                                                    <div className="space-y-1">
                                                        <div className="text-green-600 text-xs flex items-center gap-1">
                                                            <span>✅</span> <span>Mapping chuẩn</span>
                                                        </div>
                                                        {row.final_db.extra_data?.specs_origin && (
                                                            <div className="text-xs text-gray-500 pl-4 border-l-2 border-gray-200">
                                                                Đã tách specs: {row.final_db.extra_data.specs_origin.substring(0, 30)}...
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-yellow-600 text-xs italic">
                                                        ⚠️ Dòng tiêu đề hoặc dữ liệu rỗng
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : viewMode === 'ui' && serverResult.status === 'success' ? (
                        <div className="p-10 text-center">
                            <div className="text-5xl mb-4">🎉</div>
                            <h3 className="text-xl font-bold text-green-700">Nhập kho thành công!</h3>
                            <p className="text-gray-600 mt-2">Dữ liệu đã được lưu vào hệ thống an toàn.</p>
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg inline-block text-left text-sm">
                                <p>🔹 Tổng dòng xử lý: <strong>{serverResult.result_summary?.processed || 0}</strong></p>
                                <p>🔹 Số dòng lỗi: <strong className="text-red-600">{serverResult.result_summary?.failed || 0}</strong></p>
                                <p>🔹 Batch ID: <strong className="font-mono">{serverResult.log_detail?.batch_id || 'N/A'}</strong></p>
                            </div>
                        </div>
                    ) : null}

                    {/* VIEW MODE: RAW JSON */}
                    {viewMode === 'raw' && (
                        <div className="p-0">
                            <textarea 
                                readOnly 
                                className="w-full h-96 bg-gray-900 text-green-400 font-mono text-xs p-4 focus:outline-none"
                                value={JSON.stringify(serverResult, null, 2)}
                            />
                        </div>
                    )}
                </div>
            )}
            
            {/* CỐ VẤN THÔNG MINH (Chỉ hiện khi có lỗi) */}
            {serverResult?.debug_data?.samples?.some(s => s.status === 'ERROR') && (
                <div className="bg-gradient-to-r from-red-50 to-white border-l-4 border-red-500 p-4 shadow-sm rounded-r-lg">
                    <div className="flex items-start gap-4">
                        <div className="text-3xl">🤖</div>
                        <div>
                            <h4 className="font-bold text-red-700 text-sm uppercase tracking-wide mb-1">TRỢ LÝ AI CỐ VẤN</h4>
                            <p className="text-sm text-gray-700">
                                Tôi phát hiện file Excel của bạn có dòng bị lỗi.
                                <br/>
                                👉 <strong>Nguyên nhân phổ biến:</strong> Mã sản phẩm mới chưa từng nhập (Master Data thiếu), hoặc Định dạng ngày tháng bị sai cột.
                                <br/>
                                👉 <strong>Đề xuất:</strong> Hãy kiểm tra kỹ cột <code className="bg-red-100 px-1 rounded text-red-800 font-bold">Mã mặt hàng</code> và <code className="bg-red-100 px-1 rounded text-red-800 font-bold">Ngày chứng từ</code>. Hệ thống V2 sẽ tự động tạo Master Data nếu mã hợp lệ, nhưng nếu mã rỗng hoặc chứa ký tự lạ, nó sẽ chặn lại.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportManagement;