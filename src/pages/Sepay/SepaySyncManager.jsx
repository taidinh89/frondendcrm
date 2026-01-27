import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button, Icon } from '../../components/ui'; // Giả định đường dẫn components
import { BankBalanceModal } from '../../components/sepay/BankBalanceModal';

// --- UTILS ---
const fmt = (v) => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));
const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : 'N/A';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : 'N/A';

// --- SUB-COMPONENT: HEALTH CARD ---
const HealthCard = ({ title, value, sub, icon, color = 'blue', loading }) => (
    <div className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden`}>
        <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
            {loading ? <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-6 h-6 animate-spin" /> : icon}
        </div>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
            <p className="text-lg font-black text-slate-700">{value}</p>
            {sub && <p className="text-[11px] text-slate-500 font-medium">{sub}</p>}
        </div>
    </div>
);

// --- SUB-COMPONENT: CONFIG MODAL ---
const ConfigModal = ({ isOpen, onClose, currentConfig, onSave }) => {
    const [form, setForm] = useState({ plan_name: '', quota_per_month: 0, expired_at: '' });

    useEffect(() => {
        if (isOpen && currentConfig) {
            setForm({
                plan_name: currentConfig.plan_name || '',
                quota_per_month: currentConfig.quota_per_month || 0,
                expired_at: currentConfig.expired_at ? currentConfig.expired_at.split('T')[0] : ''
            });
        }
    }, [isOpen, currentConfig]);

    const handleSubmit = () => {
        onSave(form);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Cấu hình Gói SePay</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Tên gói cước</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={form.plan_name}
                            onChange={e => setForm({...form, plan_name: e.target.value})}
                            placeholder="Ví dụ: SV1, SV2..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Giới hạn GD/tháng (Quota)</label>
                        <input 
                            type="number" 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={form.quota_per_month}
                            onChange={e => setForm({...form, quota_per_month: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Ngày hết hạn</label>
                        <input 
                            type="date" 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={form.expired_at}
                            onChange={e => setForm({...form, expired_at: e.target.value})}
                        />
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                    <Button onClick={onClose} className="bg-white border hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl">Hủy</Button>
                    <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl shadow-lg shadow-blue-200">Lưu cấu hình</Button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export const SepaySyncManager = ({ setAppTitle }) => {
    // 1. Initial Setup
    useEffect(() => { 
        if (setAppTitle) setAppTitle('Trung tâm Đối soát & Quản trị SePay'); 
    }, [setAppTitle]);

    // 2. States
    const [dashboard, setDashboard] = useState(null); // Data tổng quan
    const [banks, setBanks] = useState([]);
    const [selectedBankId, setSelectedBankId] = useState('');
    
    const [recon, setRecon] = useState(null); // Data đối soát chi tiết
    
    // Loading States
    const [loadingDash, setLoadingDash] = useState(false);
    const [loadingRecon, setLoadingRecon] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [syncingList, setSyncingList] = useState(false); // Sync danh sách TK
    const [syncingId, setSyncingId] = useState(null); // Sync transaction lẻ

    // Modals & Tools
    const [missingTxs, setMissingTxs] = useState([]);
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);

    // 3. API Actions
    
    // A. Load Dashboard & Config
    const loadDashboard = async () => {
        setLoadingDash(true);
        try {
            const res = await axios.get('/api/v2/admin/sepay/dashboard-info');
            setDashboard(res.data);
        } catch (e) {
            console.error("Dashboard Err:", e);
        } finally {
            setLoadingDash(false);
        }
    };

    // B. Load Bank List
    const loadBanks = async () => {
        try {
            const res = await axios.get('/api/v2/admin/sepay/balance');
            const list = res.data.data || [];
            setBanks(list);
            if (list.length > 0 && !selectedBankId) setSelectedBankId(list[0].id);
        } catch (e) {
            console.error("Bank List Err:", e);
        }
    };

    // C. Sync Bank List (Account Names, New Accounts)
    const handleSyncAccounts = async () => {
        setSyncingList(true);
        try {
            const res = await axios.post('/api/v2/admin/sepay/accounts/sync');
            alert(res.data.message);
            await loadBanks();
            await loadDashboard(); // Reload để cập nhật số lượng TK
        } catch (e) {
            alert("Lỗi sync danh sách: " + (e.response?.data?.message || e.message));
        } finally {
            setSyncingList(false);
        }
    };

    // D. Save Config
    const handleSaveConfig = async (data) => {
        try {
            await axios.post('/api/v2/admin/sepay/config/update', data);
            loadDashboard(); // Reload UI
        } catch (e) {
            alert("Lỗi lưu cấu hình");
        }
    };

    // E. Reconciliation Data (Khi đổi ngân hàng)
    const fetchRecon = useCallback(async () => {
        if (!selectedBankId) return;
        setLoadingRecon(true);
        try {
            const res = await axios.get('/api/v2/admin/sepay/reconciliation', { params: { id: selectedBankId } });
            setRecon(res.data);
            if (res.data.comparison.sepay.total_transactions === res.data.comparison.local.count) {
                setMissingTxs([]);
            }
        } catch (e) {
            console.error("Recon Err:", e);
        } finally {
            setLoadingRecon(false);
        }
    }, [selectedBankId]);

    // F. Deep Scan
    const handleDeepScan = async () => {
        setScanning(true);
        setMissingTxs([]);
        try {
            const res = await axios.post('/api/v2/admin/sepay/deep-scan', { id: selectedBankId });
            const found = res.data.missing_transactions || [];
            setMissingTxs(found);
            if (found.length === 0) alert(`Đã quét ${res.data.checked_count} giao dịch, không tìm thấy lỗi.`);
        } catch (e) {
            alert("Lỗi Deep Scan: " + e.message);
        } finally {
            setScanning(false);
        }
    };

    // G. Sync Single
    const handleSyncOne = async (tx) => {
        setSyncingId(tx.id);
        try {
            await axios.post('/api/v2/admin/sepay/sync-single', tx);
            setMissingTxs(prev => prev.filter(t => t.id !== tx.id));
            fetchRecon();
        } catch (e) {
            alert("Lỗi sync: " + e.message);
        } finally {
            setSyncingId(null);
        }
    };

    // 4. Effects
    useEffect(() => { loadBanks(); loadDashboard(); }, []);
    useEffect(() => { fetchRecon(); }, [fetchRecon]);

    // 5. Render Helpers
    const getWebhookStatusColor = (status) => {
        if (status === 'healthy') return 'emerald';
        if (status === 'warning') return 'amber';
        return 'rose';
    };

    // Render Logic
    if (!dashboard && loadingDash) return <div className="p-12 text-center text-slate-400">Đang tải dữ liệu hệ thống...</div>;
    
    const { config, health } = dashboard || { config: {}, health: {} };
    const webhookColor = getWebhookStatusColor(health.webhook_status);
    const quotaPercent = config?.quota_per_month > 0 ? (health.usage_this_month / config.quota_per_month) * 100 : 0;

    return (
        <div className="p-6 bg-[#f8fafc] min-h-screen space-y-8 font-sans">
            
            {/* ================= HEADER & STATS ================= */}
            <div>
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">SePay Operations Center</h1>
                        <p className="text-sm text-slate-500">Giám sát sức khỏe kết nối và đối soát dòng tiền tự động</p>
                    </div>
                    <Button onClick={() => setShowConfigModal(true)} className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all">
                        <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" className="w-4 h-4" />
                        Cấu hình Gói
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Webhook Health */}
                    <HealthCard 
                        title="Trạng thái Webhook"
                        value={health.webhook_status === 'healthy' ? 'Hoạt động tốt' : (health.webhook_status === 'warning' ? 'Cảnh báo chậm' : 'Mất kết nối')}
                        sub={`Giao dịch cuối: ${formatDateTime(health.last_received_at)}`}
                        color={webhookColor}
                        icon={<Icon path="M13 10V3L4 14h7v7l9-11h-7z" className="w-6 h-6" />}
                        loading={loadingDash}
                    />

                    {/* Card 2: Usage / Quota */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Dung lượng tháng</span>
                            <span className="text-xs font-bold text-slate-600">{health.usage_this_month} / {config.quota_per_month || '∞'}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
                            <div className="bg-blue-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${Math.min(quotaPercent, 100)}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400">{quotaPercent > 90 ? 'Sắp hết dung lượng!' : 'Trạng thái ổn định'}</p>
                    </div>

                    {/* Card 3: Plan Info */}
                    <HealthCard 
                        title="Gói cước SePay"
                        value={config.plan_name || 'Free / Chưa ĐK'}
                        sub={`Hết hạn: ${formatDate(config.expired_at)}`}
                        color="purple"
                        icon={<Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-6 h-6" />}
                        loading={loadingDash}
                    />

                     {/* Card 4: Accounts */}
                     <HealthCard 
                        title="Tài khoản Ngân hàng"
                        value={`${health.active_accounts} / ${health.total_accounts}`}
                        sub="Đang kích hoạt / Tổng số"
                        color="indigo"
                        icon={<Icon path="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" className="w-6 h-6" />}
                        loading={loadingDash}
                    />
                </div>
            </div>

            <hr className="border-slate-200" />

            {/* ================= CONTROLS & SELECTION ================= */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 sticky top-4 z-30">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="hidden md:block bg-slate-100 p-2.5 rounded-xl text-slate-500">
                        <Icon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chọn tài khoản đối soát</h2>
                        <select 
                            className="w-full md:w-auto text-lg font-bold text-slate-800 bg-transparent focus:ring-0 cursor-pointer outline-none pr-8 py-1"
                            value={selectedBankId}
                            onChange={e => setSelectedBankId(e.target.value)}
                        >
                            {banks.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.bank_name} - {b.account_number} {b.account_owner ? `(${b.account_owner})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                     <Button 
                        onClick={handleSyncAccounts} 
                        disabled={syncingList} 
                        className="flex-1 md:flex-none justify-center px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-white hover:shadow-sm transition-all text-xs font-bold uppercase gap-2"
                        title="Cập nhật tên chủ tài khoản và danh sách mới từ SePay"
                    >
                         <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className={`w-4 h-4 ${syncingList ? 'animate-spin' : ''}`} />
                         {syncingList ? 'Đang tải...' : 'Sync DS Bank'}
                    </Button>

                    <Button 
                        onClick={fetchRecon} 
                        disabled={loadingRecon} 
                        className="flex-1 md:flex-none justify-center px-6 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-bold gap-2"
                    >
                        {loadingRecon ? <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-5 h-5 animate-spin" /> : <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-5 h-5" />}
                        Check Dữ Liệu
                    </Button>
                </div>
            </div>

            {/* ================= RECONCILIATION DASHBOARD ================= */}
            {recon ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    
                    {/* 1. LOCAL */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full hover:shadow-md transition-all group">
                        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center group-hover:bg-white transition-colors">
                            <span className="font-bold text-slate-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span> DỮ LIỆU LOCAL
                            </span>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">ERP System</span>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Tổng giao dịch</p>
                                <p className="text-4xl font-black text-slate-800">{recon.comparison.local.count}</p>
                            </div>
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Đầu kỳ:</span>
                                    <span className="font-mono font-bold text-slate-600">{fmt(recon.comparison.local.initial_balance)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Vào/Ra:</span>
                                    <span className="font-mono font-bold">
                                        <span className="text-emerald-600">+{fmt(recon.comparison.local.total_in)}</span> / <span className="text-rose-500">-{fmt(recon.comparison.local.total_out)}</span>
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Số dư tính toán</span>
                                    <span className="text-lg font-black text-blue-600 font-mono">{fmt(recon.comparison.local.calculated_balance)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. SEPAY */}
                    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm flex flex-col h-full hover:shadow-indigo-100 transition-all ring-2 ring-indigo-50/50">
                        <div className="px-6 py-4 border-b bg-indigo-600 flex justify-between items-center text-white">
                            <span className="font-bold flex items-center gap-2">
                                <Icon path="M13 10V3L4 14h7v7l9-11h-7z" className="w-4 h-4" /> SEPAY LIVE
                            </span>
                            <span className="text-[10px] bg-indigo-500 px-2 py-0.5 rounded font-bold uppercase">Real-time</span>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                            <div>
                                <p className="text-xs text-indigo-400 font-bold uppercase mb-1">Giao dịch ghi nhận</p>
                                <p className="text-4xl font-black text-indigo-900">
                                    {recon.comparison.sepay.connected ? recon.comparison.sepay.total_transactions : <span className="text-slate-300">---</span>}
                                </p>
                            </div>
                            
                            <div className="mt-auto">
                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 mb-2">
                                    <p className="text-xs text-indigo-400 font-bold uppercase mb-2">Số dư thực tế (Bank)</p>
                                    <p className="text-3xl font-black text-indigo-700 font-mono tracking-tight">
                                        {recon.comparison.sepay.connected ? fmt(recon.comparison.sepay.accumulated) : 'N/A'} <span className="text-lg text-indigo-400">đ</span>
                                    </p>
                                </div>
                                <p className="text-[10px] text-slate-400 italic text-center">* Dữ liệu được API SePay lấy từ sao kê ngân hàng.</p>
                            </div>
                        </div>
                    </div>

                    {/* 3. CENTER */}
                    <div className="bg-slate-900 rounded-2xl shadow-xl shadow-slate-200 flex flex-col text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-32 h-32" />
                        </div>
                        <div className="px-6 py-4 border-b border-slate-700 font-bold text-slate-300 uppercase tracking-widest text-xs">Trung tâm đối chiếu</div>
                        <div className="p-6 flex-1 flex flex-col gap-6 relative z-10">
                            
                            {/* Comparison 1: Count */}
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${recon.comparison.sepay.total_transactions - recon.comparison.local.count === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                    <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">Trạng thái số lượng</p>
                                    <p className={`text-lg font-bold ${recon.comparison.sepay.total_transactions - recon.comparison.local.count === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {recon.comparison.sepay.total_transactions - recon.comparison.local.count === 0 ? 'Khớp hoàn toàn' : `Lệch ${Math.abs(recon.comparison.sepay.total_transactions - recon.comparison.local.count)} GD`}
                                    </p>
                                </div>
                            </div>

                             {/* Comparison 2: Balance */}
                             <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${Math.abs(recon.comparison.diff) < 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                    <Icon path="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">Chênh lệch số dư</p>
                                    <p className={`text-lg font-bold font-mono ${Math.abs(recon.comparison.diff) < 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {fmt(recon.comparison.diff)} đ
                                    </p>
                                </div>
                                <button onClick={() => setShowBalanceModal(true)} className="ml-auto p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-300">
                                    <Icon path="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Action Button */}
                            <div className="mt-auto pt-4 border-t border-slate-700">
                                {(recon.comparison.sepay.total_transactions - recon.comparison.local.count !== 0) ? (
                                    <Button onClick={handleDeepScan} disabled={scanning} className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-900/20">
                                        {scanning ? 'Đang quét dữ liệu...' : 'Quét sâu tìm lỗi (Deep Scan)'}
                                    </Button>
                                ) : (
                                    <div className="text-center text-sm text-emerald-400 font-bold bg-slate-800 py-3 rounded-xl">
                                        Hệ thống hoạt động ổn định
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            ) : (
                // Empty State when loading recon
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
                    <div className="text-center">
                        <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Chọn tài khoản để xem đối soát</p>
                    </div>
                </div>
            )}

            {/* ================= MISSING TXs TABLE ================= */}
            {missingTxs.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-rose-100 shadow-xl shadow-rose-50 overflow-hidden animate-in fade-in slide-in-from-bottom-8">
                    <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
                        <div className="flex items-center gap-3 text-rose-800">
                            <span className="bg-rose-200 p-1.5 rounded text-rose-700"><Icon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" className="w-5 h-5" /></span>
                            <h3 className="font-bold text-lg">Phát hiện {missingTxs.length} giao dịch bị thiếu</h3>
                        </div>
                        <Button onClick={() => setMissingTxs([])} className="text-xs text-rose-500 hover:text-rose-700 font-bold">Bỏ qua</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b">
                                <tr>
                                    <th className="px-6 py-4">Thời gian</th>
                                    <th className="px-6 py-4">Nội dung CK</th>
                                    <th className="px-6 py-4 text-right">Số tiền</th>
                                    <th className="px-6 py-4 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {missingTxs.map(tx => (
                                    <tr key={tx.id} className="hover:bg-rose-50/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-500">{tx.transaction_date}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-700">{tx.transaction_content}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Ref: {tx.reference_number || 'N/A'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-mono font-bold px-2 py-1 rounded ${tx.amount_in > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {tx.amount_in > 0 ? '+' : '-'}{fmt(tx.amount_in > 0 ? tx.amount_in : tx.amount_out)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Button 
                                                onClick={() => handleSyncOne(tx)}
                                                disabled={syncingId === tx.id}
                                                className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm"
                                            >
                                                {syncingId === tx.id ? 'Đang sync...' : 'Đồng bộ lại'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}
            <ConfigModal 
                isOpen={showConfigModal} 
                onClose={() => setShowConfigModal(false)} 
                currentConfig={config}
                onSave={handleSaveConfig}
            />
            
            <BankBalanceModal 
                isOpen={showBalanceModal} 
                onClose={() => setShowBalanceModal(false)} 
                bankAccount={recon?.bank_info} 
                onSuccess={fetchRecon} 
            />
        </div>
    );
};