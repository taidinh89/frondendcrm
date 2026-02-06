import React, { useState, useEffect } from 'react';
import { Icon, Button, Modal, Pagination } from '../components/ui';
import axios from 'axios';
import { toast } from 'react-toastify';

/**
 * ImportLogViewer.jsx - Nhật ký nạp liệu hệ thống (V2.2)
 * Vai trò: Theo dõi Data Lifecycle, chẩn đoán lỗi nạp Excel[cite: 414].
 */
const ImportLogViewer = () => {
    // --- 1. STATES ---
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState(null);
    const [filter, setFilter] = useState({ source_type: '', status: '' });

    // State cho Modal chi tiết lỗi
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- 2. LOAD DATA ---
    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v2/security/import-logs', {
                params: { ...filter, page }
            });
            // Giả định backend trả về dữ liệu paginate chuẩn
            setLogs(res.data?.data || (Array.isArray(res.data) ? res.data : []));
            setPagination(res.data.meta || res.data);
        } catch (error) {
            toast.error("Không thể tải nhật ký nạp liệu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [filter]);

    // --- 3. ACTIONS ---
    const openErrorDetail = (log) => {
        setSelectedLog(log);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-blue-600 text-white rounded-2xl shadow-lg">📋</span>
                        Nhật ký Nạp liệu (Lifecycle)
                    </h1>
                    <p className="text-slate-400 text-xs mt-1 font-bold">Theo dõi lịch sử nạp Excel Bán hàng & Mua hàng [cite: 416]</p>
                </div>
                <div className="flex gap-3">
                    <select
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none"
                        value={filter.source_type}
                        onChange={(e) => setFilter({ ...filter, source_type: e.target.value })}
                    >
                        <option value="">Tất cả Nguồn</option>
                        <option value="SALE">Bán hàng (Sale)</option>
                        <option value="PURCHASE">Mua hàng (Purchase)</option>
                    </select>
                    <select
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none"
                        value={filter.status}
                        onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    >
                        <option value="">Tất cả Trạng thái</option>
                        <option value="SUCCESS">Thành công</option>
                        <option value="FAILED">Thất bại</option>
                    </select>
                </div>
            </div>

            {/* BẢNG NHẬT KÝ */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 border-b">
                                <th className="px-8 py-4">Mã Lô (Batch ID)</th>
                                <th className="px-6 py-4">Tên File Excel</th>
                                <th className="px-6 py-4">Loại dữ liệu</th>
                                <th className="px-6 py-4">Số dòng</th>
                                <th className="px-6 py-4">Khoảng thời gian</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-8 py-4 text-right">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="7" className="py-20 text-center animate-pulse font-bold text-slate-400">Đang quét dữ liệu nhật ký...</td></tr>
                            ) : logs.length > 0 ? logs.map((log) => (
                                <tr key={log.batch_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-4 font-mono text-xs text-slate-500">#{log.batch_id} [cite: 415]</td>
                                    <td className="px-6 py-4 font-bold text-slate-700 text-sm">{log.file_name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${log.source_type === 'SALE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {log.source_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-black text-slate-800">{log.row_count} dòng [cite: 418]</td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{log.data_date_range || 'N/A'} </td>
                                    <td className="px-6 py-4">
                                        {log.status === 'SUCCESS' ? (
                                            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-[9px] font-black uppercase">SUCCESS</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[9px] font-black uppercase">FAILED</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <button
                                            onClick={() => openErrorDetail(log)}
                                            className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1 justify-end"
                                        >
                                            Xem Log <Icon path="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" className="py-20 text-center text-slate-400 italic">Không có lịch sử nạp liệu.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-6 bg-slate-50/30">
                    <Pagination pagination={pagination} onPageChange={(p) => fetchLogs(p)} />
                </div>
            </div>

            {/* MODAL CHI TIẾT LỖI NẠP LIỆU */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`CHI TIẾT LÔ NẠP #${selectedLog?.batch_id}`}
                footer={<Button onClick={() => setIsModalOpen(false)}>Đóng</Button>}
                maxWidthClass="max-w-2xl"
            >
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                            <div className="text-[10px] font-black text-slate-400 uppercase">Thời gian nạp</div>
                            <div className="text-sm font-bold text-slate-700">{selectedLog?.created_at}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                            <div className="text-[10px] font-black text-slate-400 uppercase">File gốc</div>
                            <div className="text-sm font-bold text-slate-700 truncate">{selectedLog?.file_name}</div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase mb-3">Tóm tắt lỗi / Thông báo</h4>
                        <div className="bg-slate-900 text-green-400 p-5 rounded-2xl font-mono text-xs leading-relaxed overflow-x-auto border-4 border-slate-800 shadow-inner">
                            {selectedLog?.status === 'SUCCESS' ? (
                                <div>&gt; Nạp liệu thành công: {selectedLog?.row_count} bản ghi đã được xử lý.</div>
                            ) : (
                                <div className="text-red-400 whitespace-pre-wrap">
                                    {selectedLog?.error_summary ? JSON.stringify(selectedLog.error_summary, null, 2) : (selectedLog?.error_log || '> Lỗi không xác định khi bóc tách file Excel.')}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3 items-center">
                        <div className="text-2xl">💡</div>
                        <p className="text-[11px] text-indigo-700 font-medium">
                            <b>Gợi ý:</b> Nếu file báo lỗi định dạng ngày tháng, hãy kiểm tra lại cột "Ngày" trong Excel đã được format về dạng YYYY-MM-DD chưa.
                        </p>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default ImportLogViewer;