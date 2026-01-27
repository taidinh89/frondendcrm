import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Button, Icon } from '../../components/ui';
import { useV2Paginator } from '../../hooks/useV2Paginator'; 
import { exportToExcel } from '../../utils/exportUtils';

// Hàm định dạng tiền tệ chuyên nghiệp
const fmtMoney = (v) => {
    if (!v) return '0';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v).replace('₫', '');
};

const generateRandomCode = () => `PAY${Math.floor(Math.random() * 10000)}`;

export const SepayCashier = ({ setAppTitle }) => {
    useEffect(() => { setAppTitle && setAppTitle('POS Thu Ngân & Tạo QR'); }, [setAppTitle]);

    // ================= STATE QUẢN LÝ DỮ LIỆU =================
    const [banks, setBanks] = useState([]);
    const [selectedBankId, setSelectedBankId] = useState('');
    const [amount, setAmount] = useState('');
    const [content, setContent] = useState('');
    const [note, setNote] = useState('');
    const [template, setTemplate] = useState('compact2');
    const [targetInfo, setTargetInfo] = useState({ type: 'custom', id: null }); 
    const [refData, setRefData] = useState({ code: '', name: '', extra: '' }); 
    const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'customers'
    const [searchTerm, setSearchTerm] = useState('');
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // ================= HOOKS & API =================
    const apiEndpoint = activeTab === 'orders' ? '/api/v2/sales-orders' : '/api/v2/customers';
    
    const filters = useMemo(() => ({
        search: searchTerm, 
        per_page: 8 
    }), [activeTab, searchTerm]);

    const { data: listData, isLoading: listLoading, pagination, changePage } = useV2Paginator(apiEndpoint, filters);

    // [QUAN TRỌNG] Reset về trang 1 khi gõ tìm kiếm hoặc đổi tab để tránh lỗi mất dữ liệu
    useEffect(() => {
        if (pagination && pagination.current_page !== 1) {
            changePage(1);
        }
    }, [searchTerm, activeTab]);

    useEffect(() => {
        loadBanks();
        fetchHistory();
        const interval = setInterval(fetchHistory, 15000);
        return () => clearInterval(interval);
    }, []);

    const loadBanks = async () => {
        try {
            const res = await axios.get('/api/v2/admin/sepay/balance');
            const list = res.data.data || [];
            setBanks(list);
            const def = list.find(b => b.is_default);
            if (def) setSelectedBankId(def.id);
            else if (list.length > 0) setSelectedBankId(list[0].id);
        } catch (e) { console.error(e); }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/v2/sepay/history', { params: { per_page: 20 } });
            setHistory(res.data.data);
        } catch (e) { console.error(e); }
    };

    // ================= HANDLERS (SỬA LỖI MAPPING JSON) =================
    const handleSelectOrder = (order) => {
        // Ánh xạ đúng các trường từ JSON mới: tong_cong và so_phieu
        const finalAmount = order.tong_cong || 0;
        const orderCode = order.so_phieu || '';
        const customerName = order.ten_khncc || 'Khách hàng';

        setAmount(finalAmount);
        setContent(orderCode); 
        setNote(`Thu tiền đơn ${orderCode}`); 
        setTargetInfo({ type: 'order_id', id: order.id });
        setRefData({ 
            code: orderCode, 
            name: customerName,
            extra: order.ma_khncc 
        });
    };

    const handleSelectCustomer = (cust) => {
        setAmount('');
        const custCode = cust.ma_khncc || '';
        const custName = cust.ten_cong_ty_khach_hang || 'Khách lẻ';

        setContent(`NAP ${custCode}`); 
        setNote(`Nạp tiền khách hàng`);
        setTargetInfo({ type: 'user_id', id: cust.id });
        setRefData({ code: custCode, name: custName });
    };

    const handleCreate = async () => {
        if (!selectedBankId) return alert("Vui lòng chọn ngân hàng nhận tiền");
        setIsLoading(true);
        try {
            const selectedBank = banks.find(b => b.id == selectedBankId);
            const finalContent = content.trim() || generateRandomCode();
            
            await axios.post('/api/v2/sepay/static-qr', {
                account_number: selectedBank.account_number,
                amount: amount || 0,
                value: finalContent,
                type: targetInfo.type, 
                target_id: targetInfo.id,
                note: note,
                reference_code: refData.code || 'KHÁCH LẺ',
                reference_name: refData.name || 'Khách vãng lai'
            });

            if (!content) setContent(finalContent);
            await fetchHistory(); 
        } catch (error) {
            alert("Lỗi: " + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Xóa lịch sử này?")) return;
        try {
            await axios.delete(`/api/v2/sepay/history/${id}`);
            setHistory(prev => prev.filter(i => i.id !== id));
        } catch (e) { alert(e.message); }
    };

    const qrCardRef = useRef(null);
    const downloadQrCard = async () => {
        if (!qrCardRef.current) return;
        try {
            const { toPng } = await import('html-to-image');
            const dataUrl = await toPng(qrCardRef.current, { backgroundColor: '#ffffff', cacheBust: true });
            const link = document.createElement('a');
            link.download = `QR_${content || 'pay'}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) { console.error(err); }
    };

    const selectedBank = useMemo(() => banks.find(b => b.id == selectedBankId), [banks, selectedBankId]);
    const qrUrl = useMemo(() => {
        if (!selectedBank) return null;
        const q = new URLSearchParams({
            acc: selectedBank.account_number,
            bank: selectedBank.bank_name,
            amount: amount || 0,
            des: content || 'QUOCVIET_PAY',
            template: template
        });
        return `https://qr.sepay.vn/img?${q.toString()}`;
    }, [selectedBank, amount, content, template]);

    return (
        <div className="h-screen flex flex-col bg-[#f0f2f5] overflow-hidden font-sans">
            
            {/* --- PHẦN TRÊN: 2 CỘT LÀM VIỆC --- */}
            <div className="flex-1 flex overflow-hidden p-3 gap-3">
                
                {/* CỘT TRÁI: DANH SÁCH ĐƠN / KHÁCH */}
                <div className="w-1/2 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50/50 space-y-3">
                        <div className="flex bg-gray-200/60 p-1.5 rounded-xl">
                            <button onClick={() => setActiveTab('orders')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab==='orders' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📦 ĐƠN HÀNG</button>
                            <button onClick={() => setActiveTab('customers')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab==='customers' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>👥 KHÁCH HÀNG</button>
                        </div>
                        <div className="relative">
                            <Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="w-5 h-5 absolute left-3 top-2.5 text-gray-400"/>
                            <input type="text" placeholder="Tìm kiếm nhanh..." className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all shadow-inner bg-gray-50/50" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {listLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 font-bold italic"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>Đang tải...</div>
                        ) : (
                            <>
                                {(!listData || listData.length === 0) && <div className="text-center py-20 text-gray-400 italic">Không tìm thấy dữ liệu</div>}
                                {(listData || []).map(item => (
                                    <div key={item.id} onClick={() => activeTab==='orders' ? handleSelectOrder(item) : handleSelectCustomer(item)} className="bg-white p-4 rounded-xl border-2 border-gray-50 hover:border-blue-400 cursor-pointer shadow-sm group transition-all">
                                        <div className="flex justify-between items-center">
                                            <div className="flex-1">
                                                <div className="font-black text-slate-800 text-base group-hover:text-blue-700 leading-tight">
                                                    {activeTab==='orders' ? (item.so_phieu) : item.ten_cong_ty_khach_hang}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1.5 font-bold flex gap-2">
                                                    <span className="bg-gray-100 px-1.5 rounded">{activeTab==='orders' ? item.ma_khncc : item.ma_khncc}</span>
                                                    <span className="truncate max-w-[200px]">{activeTab==='orders' ? item.ten_khncc : ''}</span>
                                                </div>
                                            </div>
                                            <div className="text-right ml-4">
                                                {activeTab==='orders' ? (
                                                    <div className="font-mono font-black text-blue-600 text-sm bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                                        {fmtMoney(item.tong_cong)} đ
                                                    </div>
                                                ) : <Button size="sm" variant="secondary" className="rounded-lg font-bold">CHỌN</Button>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    <div className="p-3 border-t bg-white flex justify-between items-center text-xs">
                        <button disabled={!pagination || pagination.current_page <= 1} onClick={() => changePage(pagination.current_page - 1)} className="px-4 py-2 border rounded-xl hover:bg-gray-50 disabled:opacity-30 font-bold uppercase">Trước</button>
                        <span className="text-slate-500 font-black">Trang {pagination?.current_page || 1} / {pagination?.last_page || 1}</span>
                        <button disabled={!pagination || pagination.current_page >= pagination.last_page} onClick={() => changePage(pagination.current_page + 1)} className="px-4 py-2 border rounded-xl hover:bg-gray-50 disabled:opacity-30 font-bold uppercase">Sau</button>
                    </div>
                </div>

                {/* CỘT PHẢI: CHI TIẾT & QR (SỬA LỖI CỤT) */}
                <div className="w-1/2 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col overflow-y-auto custom-scrollbar">
                    
                    {/* KHUNG XÁC NHẬN CHUẨN POS */}
                    <div className={`mb-5 p-5 rounded-3xl border-2 transition-all ${refData.name ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-1">Xác nhận thanh toán</p>
                                <h4 className="text-2xl font-black text-slate-800 leading-tight">{refData.name || "CHƯA CHỌN THÔNG TIN"}</h4>
                                {refData.code && (
                                    <div className="flex gap-3 mt-3">
                                        <span className="text-xs font-black bg-white text-blue-700 px-3 py-1 rounded-lg border border-blue-200 shadow-sm">MÃ: {refData.code}</span>
                                        {refData.extra && <span className="text-xs font-bold text-slate-400 mt-1 italic">Mã KH: {refData.extra}</span>}
                                    </div>
                                )}
                            </div>
                            {refData.name && <button onClick={() => { setRefData({code:'', name:''}); setAmount(''); setContent(''); }} className="p-2 hover:bg-red-100 text-red-500 rounded-full transition-all"><Icon path="M6 18L18 6M6 6l12 12" className="w-7 h-7"/></button>}
                        </div>
                    </div>

                    {/* VÙNG QR TO RÕ (KHÔNG BỊ CỤT) */}
                    <div className="flex-shrink-0 bg-slate-100 rounded-[2.5rem] border-2 border-slate-200 flex flex-col items-center justify-center relative group p-8 mb-6">
                        <button onClick={downloadQrCard} className="absolute top-5 right-5 z-10 p-4 bg-white hover:bg-blue-600 text-slate-600 hover:text-white rounded-2xl shadow-xl transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 font-black text-xs uppercase tracking-wider"><Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" className="w-5 h-5"/> Tải ảnh QR</button>

                        <div ref={qrCardRef} className="bg-white p-10 rounded-[3.5rem] shadow-2xl flex flex-col items-center w-full max-w-[400px] border-t-[14px] border-blue-700">
                            <div className="text-center mb-8">
                                <h5 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedBank?.bank_name}</h5>
                                <p className="text-xs text-slate-500 font-bold mt-1">CHỦ TK: <span className="text-slate-800">{selectedBank?.account_owner}</span></p>
                            </div>
                            
                            <div className="relative mb-8 p-3 bg-slate-50 rounded-3xl border border-slate-100">
                                {selectedBank ? <img src={qrUrl} alt="QR Code" className="w-64 h-64 object-contain mix-blend-multiply transition-all" /> : <div className="w-64 h-64 flex items-center justify-center text-slate-300 italic text-sm text-center">Đang đợi chọn ngân hàng...</div>}
                            </div>

                            <div className="w-full text-center border-t-2 border-dashed border-slate-100 pt-8">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Số tiền cần thanh toán</p>
                                <p className="text-5xl font-black text-blue-700 leading-none mb-4">{new Intl.NumberFormat('vi-VN').format(amount || 0)} <span className="text-xl">đ</span></p>
                                <div className="bg-blue-50 py-3 px-6 rounded-2xl inline-block border border-blue-100">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Nội dung chuyển khoản</p>
                                    <p className="font-mono text-2xl font-black text-blue-800 uppercase leading-none tracking-widest">{content || '...'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-6 px-2">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ngân hàng nhận tiền</label>
                            <select value={selectedBankId} onChange={e=>setSelectedBankId(e.target.value)} className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition-all">
                                {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number} ({b.account_owner})</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Sửa số tiền</label>
                                <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full border-2 border-slate-100 rounded-xl p-3 font-black text-blue-700" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Mã tham chiếu</label>
                                <input value={content} onChange={e=>setContent(e.target.value)} className="w-full border-2 border-slate-100 rounded-xl p-3 font-mono font-bold" />
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleCreate} disabled={isLoading || !refData.name} className="w-full py-6 text-xl font-black bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-[1.5rem] shadow-xl shadow-blue-200 active:scale-[0.97] transition-all disabled:opacity-40 uppercase tracking-widest">
                        {isLoading ? 'ĐANG LƯU...' : 'Xác nhận & Lưu lịch sử'}
                    </Button>
                </div>
            </div>

            {/* --- NHẬT KÝ LỊCH SỬ --- */}
            <div className="h-[300px] p-3 pt-0">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
                    <div className="px-5 py-3 border-b bg-gray-50 flex justify-between items-center">
                        <h4 className="font-black text-slate-700 text-[11px] uppercase flex items-center gap-2"><Icon path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4"/> Lịch sử tạo mã gần đây</h4>
                        <div className="flex gap-4">
                            <button onClick={fetchHistory} className="text-blue-600 text-[11px] font-bold uppercase hover:underline">Làm mới</button>
                            <button onClick={() => exportToExcel([{sheetName:'QR_Log', data: history}], 'QR_History')} className="text-green-600 text-[11px] font-bold uppercase hover:underline">Xuất Excel</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar text-[11px]">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-slate-400 font-black uppercase sticky top-0 z-10 border-b">
                                <tr>
                                    <th className="p-3 w-36">Thời gian</th>
                                    <th className="p-3">Đối tượng</th>
                                    <th className="p-3">Nội dung chuyển khoản</th>
                                    <th className="p-3 text-right">Số tiền</th>
                                    <th className="p-3 text-center">Trạng thái</th>
                                    <th className="p-3 text-center w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {history.map(item => (
                                    <tr key={item.id} className={`hover:bg-blue-50/40 transition-colors ${item.status === 'paid' ? 'bg-emerald-50/50' : ''}`}>
                                        <td className="p-3 text-slate-400 font-medium">{new Date(item.created_at).toLocaleString('vi-VN')}</td>
                                        <td className="p-3">
                                            <div className="font-black text-slate-700">{item.reference_name}</div>
                                            <div className="text-[9px] text-slate-400 bg-gray-100 px-1 py-0.5 rounded mt-1 inline-block border font-bold uppercase">{item.reference_code}</div>
                                        </td>
                                        <td className="p-3 font-mono text-blue-600 font-black tracking-widest uppercase">{item.order_code}</td>
                                        <td className="p-3 text-right font-black text-slate-800">{item.amount > 0 ? fmtMoney(item.amount) + ' đ' : 'Tùy ý'}</td>
                                        <td className="p-3 text-center">
                                            {item.status === 'paid' ? <span className="inline-flex bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-black text-[9px] border border-emerald-200">THÀNH CÔNG</span> : <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[9px] border border-amber-200 font-bold animate-pulse">ĐANG CHỜ...</span>}
                                        </td>
                                        <td className="p-3 text-center"><button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};