import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { BankBalanceModal } from '../../components/sepay/BankBalanceModal';
import { StaticQrModal } from '../../components/sepay/StaticQrModal';
import { handleSepayExport } from '../../logic/sepayExportLogic';
import { dateUtils } from '../../utils/dateUtils';
import { Button, Icon } from '../../components/ui';

// --- UTILS ---
const fmtMoney = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);

export const SepayDashboard = ({ setAppTitle }) => {
    // 1. Tránh gọi setAppTitle làm re-render vô hạn
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            setAppTitle && setAppTitle('Quản Lý Dòng Tiền');
            isFirstRun.current = false;
        }
    }, [setAppTitle]);

    // --- STATE ---
    const [dateRange, setDateRange] = useState(dateUtils.getThisMonth());
    const [selectedBankId, setSelectedBankId] = useState('');
    // [MỚI] State lọc loại giao dịch (in/out)
    const [filterType, setFilterType] = useState(''); 
    
    const [stats, setStats] = useState({ period: {}, balance: {} });
    const [bankAccounts, setBankAccounts] = useState([]);
    const [transactionList, setTransactionList] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Modal State
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [showQrModal, setShowQrModal] = useState(false);

    // --- FETCH DATA (Gộp lại để tối ưu network) ---
    const fetchData = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            // [QUAN TRỌNG] Params này sẽ gửi xuống cả API Stats và API List
            // Giúp cả 2 phần dữ liệu đều được lọc đồng bộ
            const params = {
                from_date: dateRange.from,
                to_date: dateRange.to,
                account_number: selectedBankId || undefined,
                type: filterType || undefined, // Gửi type (in/out) xuống backend
                page, 
                per_page: 25,
            };

            // Gọi đồng thời 3 API: Tài khoản, Thống kê, Danh sách
            const [accRes, statsRes, transRes] = await Promise.all([
                axios.get('/api/v2/admin/sepay/balance'),
                axios.get('/api/v2/admin/sepay/stats', { params }),
                axios.get('/api/v2/admin/sepay/bank-transactions', { params })
            ]);

            setBankAccounts(accRes.data.data || []);
            setStats(statsRes.data.data || { period: {}, balance: {} });
            
            // Xử lý dữ liệu từ API Resource
            const transData = transRes.data;
            setTransactionList(transData.data || []);
            
            // Lấy thông tin phân trang
            const meta = transData.meta || transData;
            setPagination({
                current_page: meta.current_page || 1,
                last_page: meta.last_page || 1,
                total: meta.total || 0
            });

        } catch (e) {
            console.error("Lỗi API Dashboard:", e);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange.from, dateRange.to, selectedBankId, filterType]); // Thêm filterType vào dependency

    // Load dữ liệu khi bộ lọc thay đổi
    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    // --- ACTIONS ---
    const handleSync = async () => {
        if (!confirm('Hệ thống sẽ quét giao dịch 2 ngày gần nhất & tính toán lại số dư. Tiếp tục?')) return;
        setIsSyncing(true);
        try {
            await axios.post('/api/v2/admin/sepay/balance/sync');
            alert('Đồng bộ hoàn tất!');
            fetchData(1); // Reload lại dữ liệu
        } catch (e) { 
            alert('Lỗi đồng bộ: ' + (e.response?.data?.message || e.message)); 
        } finally { 
            setIsSyncing(false); 
        }
    };

    const onDatePre = (e) => {
        const val = e.target.value;
        const now = new Date();
        const fd = d => d.toISOString().split('T')[0];
        if (val === 'today') setDateRange({ from: fd(now), to: fd(now) });
        else if (val === 'yesterday') { 
            const y = new Date(now); y.setDate(y.getDate()-1); 
            setDateRange({ from: fd(y), to: fd(y) }); 
        }
        else if (val === 'thisMonth') setDateRange(dateUtils.getThisMonth());
    };

    const netCashFlow = (stats.period?.net || 0);

    return (
        <div className="p-4 bg-gray-50 min-h-screen font-sans text-gray-800 space-y-6">
            
            {/* ================= 1. FILTER BAR (THANH CÔNG CỤ) ================= */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Chọn nhanh ngày */}
                    <select onChange={onDatePre} className="border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50 outline-none hover:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all">
                        <option value="thisMonth">Tháng này</option>
                        <option value="today">Hôm nay</option>
                        <option value="yesterday">Hôm qua</option>
                    </select>

                    {/* Chọn khoảng ngày */}
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 px-3 py-2 rounded text-sm hover:border-blue-400 transition-all">
                        <input type="date" value={dateRange.from} onChange={e=>setDateRange({...dateRange, from:e.target.value})} className="bg-transparent outline-none cursor-pointer"/>
                        <span className="text-gray-400">➜</span>
                        <input type="date" value={dateRange.to} onChange={e=>setDateRange({...dateRange, to:e.target.value})} className="bg-transparent outline-none cursor-pointer"/>
                    </div>

                    {/* [MỚI] Dropdown Lọc Loại Giao Dịch */}
                    <div className="relative">
                        <select 
                            value={filterType} 
                            onChange={e => setFilterType(e.target.value)}
                            className={`border rounded px-3 py-2 text-sm font-medium outline-none appearance-none pr-8 cursor-pointer transition-all ${filterType ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 hover:border-blue-400'}`}
                        >
                            <option value="">Tất cả loại</option>
                            <option value="in">💰 Tiền vào (+)</option>
                            <option value="out">💸 Tiền ra (-)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            <Icon path="M19.5 8.25l-7.5 7.5-7.5-7.5" className="w-3 h-3"/>
                        </div>
                    </div>

                    {/* Chọn Tài khoản */}
                    <select 
                        value={selectedBankId} onChange={e=>setSelectedBankId(e.target.value)}
                        className={`border rounded px-3 py-2 text-sm font-semibold w-48 outline-none transition-all ${selectedBankId ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 hover:border-blue-400'}`}
                    >
                        <option value="">Tất cả tài khoản</option>
                        {bankAccounts.map(acc => (
                            <option key={acc.id} value={acc.account_number}>{acc.bank_name} - {acc.account_number}</option>
                        ))}
                    </select>
                </div>

                {/* Các nút chức năng */}
                <div className="flex gap-2">
                    <Button onClick={handleSync} disabled={isSyncing} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-sm">
                        {isSyncing ? 'Đang quét...' : '🔄 Đồng bộ'}
                    </Button>
                    <Button onClick={() => handleSepayExport(transactionList, bankAccounts, dateRange)} className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 shadow-sm">
                        📥 Xuất Excel
                    </Button>
                    <Button onClick={() => setShowQrModal(true)} className="bg-blue-600 text-white shadow-md hover:bg-blue-700 transform hover:scale-105 transition-all">
                        📷 Tạo QR
                    </Button>
                </div>
            </div>

            {/* ================= 2. STATS CARDS (BIỂU ĐỒ SỐ) ================= */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Tổng số dư (Snapshot hiện tại - Có thể bị ảnh hưởng bởi lọc Bank, không ảnh hưởng bởi Date) */}
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm transition-transform hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Icon path="M12 21v-8.25M5.84 8.16l8.16 8.16m0 0l8.16-8.16" className="w-24 h-24"/></div>
                    <div className="text-gray-500 text-xs uppercase font-bold tracking-wider relative z-10">Tổng Số Dư Thực Tế</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1 relative z-10">{fmtMoney(stats.balance?.current)}</div>
                </div>

                {/* Tiền vào (Bị ảnh hưởng bởi TOÀN BỘ FILTER) */}
                <div className={`bg-white p-5 rounded-lg border-l-4 border-emerald-500 shadow-sm transition-all hover:-translate-y-1 ${filterType === 'out' ? 'opacity-50 grayscale' : ''}`}>
                    <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">Tiền Vào (Theo lọc)</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">+{fmtMoney(stats.period?.total_in)}</div>
                </div>

                {/* Tiền ra (Bị ảnh hưởng bởi TOÀN BỘ FILTER) */}
                <div className={`bg-white p-5 rounded-lg border-l-4 border-red-500 shadow-sm transition-all hover:-translate-y-1 ${filterType === 'in' ? 'opacity-50 grayscale' : ''}`}>
                    <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">Tiền Ra (Theo lọc)</div>
                    <div className="text-2xl font-bold text-red-600 mt-1">-{fmtMoney(stats.period?.total_out)}</div>
                </div>

                {/* Chênh lệch */}
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">Chênh lệch (Net)</div>
                    <div className={`text-2xl font-bold mt-1 ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {netCashFlow > 0 ? '+' : ''}{fmtMoney(netCashFlow)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* ================= 3. DANH SÁCH TÀI KHOẢN (SIDEBAR) ================= */}
                <div className="xl:col-span-1">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="px-4 py-3 bg-gray-50 font-bold text-sm border-b flex justify-between items-center">
                            <span>Tài khoản</span>
                            <button onClick={()=>setShowBalanceModal(true)} className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">+ Thêm</button>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar flex-1">
                            {bankAccounts.map(acc => (
                                <div 
                                    key={acc.id} 
                                    className={`p-3 cursor-pointer hover:bg-blue-50 transition-colors group ${selectedBankId == acc.account_number ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`} 
                                    onClick={() => setSelectedBankId(acc.account_number)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold text-sm text-gray-800 group-hover:text-blue-700">{acc.bank_name}</div>
                                        <button 
                                            onClick={(e)=>{e.stopPropagation(); setEditingAccount(acc); setShowBalanceModal(true);}} 
                                            className="text-gray-300 hover:text-blue-600 p-1 rounded hover:bg-blue-100"
                                            title="Chỉnh sửa số dư"
                                        >
                                            <Icon path="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" className="w-4 h-4"/>
                                        </button>
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono mb-1">{acc.account_number}</div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-right font-bold text-gray-700">{fmtMoney(acc.balance)}</div>
                                        {acc.is_default === 1 && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 rounded border border-yellow-200">Mặc định</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ================= 4. BẢNG GIAO DỊCH CHÍNH (CONTENT) ================= */}
                <div className="xl:col-span-3">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-gray-700">Nhật Ký Giao Dịch</h3>
                                {filterType && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${filterType === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                        {filterType === 'in' ? 'CHỈ TIỀN VÀO' : 'CHỈ TIỀN RA'}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">
                                Tổng: <b>{pagination.total}</b> dòng
                            </span>
                        </div>
                        
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-500 uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-4 py-3 w-32">Thời gian</th>
                                        <th className="px-4 py-3 w-32">Ngân hàng</th>
                                        <th className="px-4 py-3 text-right w-36">Số tiền</th>
                                        <th className="px-4 py-3">Nội dung giao dịch</th>
                                        <th className="px-4 py-3 w-28 text-center">Đối soát</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-gray-400">
                                                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                <div>Đang tải dữ liệu...</div>
                                            </td>
                                        </tr>
                                    ) : transactionList.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-gray-400 italic bg-gray-50/50">
                                                Không có dữ liệu giao dịch nào khớp với bộ lọc.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactionList.map((tx) => {
                                            const isIncome = tx.type === 'in';
                                            
                                            return (
                                                <tr key={tx.id} className="hover:bg-blue-50/50 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <div className="font-semibold text-gray-700 font-mono text-xs">{tx.display_date}</div>
                                                        <div className="text-xs text-gray-400">{tx.display_time}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-xs text-gray-700">{tx.bank_info?.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono">{tx.bank_info?.acc_num}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-sm">
                                                        <span className={isIncome ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded' : 'text-red-600'}>
                                                            {isIncome ? '+' : '-'}{tx.amount_formatted}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-gray-800 font-medium text-xs line-clamp-2 group-hover:line-clamp-none transition-all" title={tx.content}>
                                                            {tx.content || 'N/A'}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1">
                                                            <span>Ref: {tx.reference_number || '---'}</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span>Gateway: {tx.gateway}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {tx.order_code ? (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded border border-blue-200 whitespace-nowrap">
                                                                {tx.order_code}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination Footer */}
                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center text-xs">
                            <Button 
                                variant="secondary" 
                                size="sm"
                                disabled={pagination.current_page <= 1} 
                                onClick={() => fetchData(pagination.current_page - 1)}
                            >
                                « Trước
                            </Button>
                            <span className="text-gray-500 font-medium">
                                Trang {pagination.current_page} / {pagination.last_page}
                            </span>
                            <Button 
                                variant="secondary" 
                                size="sm"
                                disabled={pagination.current_page >= pagination.last_page} 
                                onClick={() => fetchData(pagination.current_page + 1)}
                            >
                                Sau »
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <BankBalanceModal 
                isOpen={showBalanceModal} 
                onClose={() => {setShowBalanceModal(false); setEditingAccount(null);}} 
                bankAccount={editingAccount} 
                onSuccess={() => fetchData(1)} 
            />
            <StaticQrModal 
                isOpen={showQrModal} 
                onClose={() => setShowQrModal(false)} 
            />
        </div>
    );
};