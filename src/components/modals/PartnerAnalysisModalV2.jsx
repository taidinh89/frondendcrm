import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
    Users, TrendingUp, Clock, ExternalLink, RefreshCw, 
    CreditCard, ShoppingBag, Hash, UserCheck, ShieldCheck, Mail, Phone, ArrowRight
} from 'lucide-react';
import moment from 'moment';
import { Modal, Button } from '../ui.jsx';

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f59e0b', '#10b981', '#06b6d4', '#4f46e5'];

export const PartnerAnalysisModalV2 = ({ taxCode, partnerName, isOpen, onClose, onInvoiceClick, onViewCRMDetail }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && taxCode) {
            fetchData();
        } else if (isOpen && !taxCode) {
            setError("Không tìm thấy mã số thuế của đối tác này.");
            setLoading(false);
        }
    }, [isOpen, taxCode]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const res = await axios.get(`/api/v2/invoices/partner/${taxCode}`);
            // axiosGlobal.js interceptor might unwrap the response {status, data} into just the data part.
            // We handle both cases here.
            const payload = res.data?.data || res.data;
            
            if (payload && (payload.tax_code || payload.summary)) {
                setData(payload);
            } else {
                console.error('Invalid response structure:', res.data);
                setError("Máy chủ trả về dữ liệu không hợp lệ hoặc đối tác chưa có dữ liệu giao dịch.");
            }
        } catch (error) {
            console.error('Fetch partner analysis error:', error);
            setError(error.response?.data?.message || "Lỗi khi truy xuất dữ liệu từ máy chủ.");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Users size={18} />
                    </div>
                    <div>
                        <span className="text-sm font-black uppercase tracking-tight text-slate-800">Phân tích Đối tác: {partnerName || taxCode}</span>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Hệ thống phân tích 360°</div>
                    </div>
                </div>
            }
            maxWidthClass="max-w-6xl"
        >
            <div className="min-h-[500px] flex flex-col bg-slate-50/50">
                {loading ? (
                    <div className="p-32 flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="relative">
                            <RefreshCw className="animate-spin text-indigo-500" size={48} strokeWidth={1} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Users size={16} className="text-indigo-600" />
                            </div>
                        </div>
                        <span className="mt-6 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500 animate-pulse">Đang định danh đối tác...</span>
                    </div>
                ) : error ? (
                    <div className="p-20 flex-1 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-xl">
                            <ShieldCheck className="text-rose-500" size={32} />
                        </div>
                        <h3 className="text-slate-800 font-black uppercase text-sm mb-2">{error}</h3>
                        <p className="text-xs text-slate-400 max-w-sm text-center font-medium">Chúng tôi không thể tìm thấy dữ liệu liên quan đến Mã số thuế này trong hệ thống hóa đơn.</p>
                        <Button 
                            variant="primary"
                            onClick={fetchData}
                            className="mt-8 px-8 py-3 rounded-2xl shadow-lg shadow-indigo-100 uppercase tracking-widest text-[10px] font-black"
                        >
                            <RefreshCw size={14} className="mr-2" /> Thử lại
                        </Button>
                    </div>
                ) : data ? (
                    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 flex-1">
                        {/* 1. Header & CRM Link */}
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Partner Info Card */}
                            <div className="flex-1 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl md:shadow-2xl shadow-slate-200/50 border border-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 md:p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                    <Users size={80} md:size={120} />
                                </div>
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Hash size={12} className="text-indigo-400" />
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Mã số thuế: {taxCode}</span>
                                    </div>
                                    <h2 className="text-lg md:text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight mb-4 md:mb-6">
                                        {partnerName || 'Đối tác chưa tên'}
                                    </h2>
                                    <div className="flex flex-wrap gap-2 md:gap-3">
                                        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 flex items-center gap-2">
                                            <CreditCard size={14} className="text-indigo-500" />
                                            <span className="text-xs font-black text-slate-700">{formatCurrency(data.summary?.total_buy)}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Mua</span>
                                        </div>
                                        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 flex items-center gap-2">
                                            <ShoppingBag size={14} className="text-emerald-500" />
                                            <span className="text-xs font-black text-slate-700">{formatCurrency(data.summary?.total_sell)}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Bán</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CRM Status Card */}
                            <div className={`w-full lg:w-[380px] p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border ${data.crm_customer ? 'bg-indigo-600 border-indigo-500 shadow-xl md:shadow-2xl shadow-indigo-200 text-white' : 'bg-white border-dashed border-slate-200 text-slate-800'}`}>
                                {data.crm_customer ? (
                                    <div className="h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                                                    <UserCheck size={16} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Đối tác đã đăng ký</span>
                                            </div>
                                            <p className="text-sm font-black mb-1 opacity-90">{data.crm_customer.ten_cong_ty_khach_hang}</p>
                                            <p className="text-[11px] font-bold opacity-60 flex items-center gap-1.5">
                                                <Hash size={12} /> {data.crm_customer.ma_khncc}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => onViewCRMDetail(data.crm_customer.ma_khncc)}
                                            className="mt-8 w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-xl"
                                        >
                                            Xem hồ sơ chi tiết <ArrowRight size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                            <Users size={24} className="text-slate-300" />
                                        </div>
                                        <h4 className="font-black text-xs uppercase text-slate-400">Chưa có trong CRM</h4>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Đối tác này chưa được định danh trong hệ thống khách hàng.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Analytics Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Top Items List */}
                            <div className="lg:col-span-2 bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-lg shadow-slate-200/40 border border-white">
                                <div className="flex items-center justify-between mb-6 md:mb-8">
                                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px] flex items-center gap-2">
                                        <TrendingUp size={16} className="text-indigo-500" /> TOP MẶT HÀNG GIAO DỊCH
                                    </h3>
                                    <div className="text-[10px] font-bold text-slate-400">TỔNG {data.top_items?.length || 0} MÃ HÀNG</div>
                                </div>
                                <div className="space-y-3 md:space-y-4">
                                    {data.top_items?.slice(0, 5).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 group cursor-default">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors uppercase italic">{item.product_name || 'Không rõ tên'}</p>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="flex items-center gap-1.5 overflow-hidden w-full bg-slate-50 rounded-full h-1.5">
                                                        <div 
                                                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                                            style={{ width: `${Math.min(100, (item.revenue / (data.top_items[0].revenue || 1)) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <p className="text-xs font-black text-slate-800">{formatCurrency(item.revenue)}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{item.quantity} {item.unit || 'Đơn vị'}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!data.top_items || data.top_items.length === 0) && (
                                        <div className="p-12 text-center text-slate-300 font-black uppercase text-[10px] border-2 border-dashed border-slate-100 rounded-[2rem]">
                                            Chưa có dữ liệu giao dịch chi tiết
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Invoices List */}
                            <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-lg shadow-slate-200/40 border border-white flex flex-col">
                                <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px] mb-6 md:mb-8 flex items-center gap-2">
                                    <Clock size={16} className="text-amber-500" /> HÓA ĐƠN GẦN NHẤT
                                </h3>
                                <div className="space-y-2 md:space-y-3 flex-1">
                                    {data.recent_invoices?.map((inv, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => onInvoiceClick(inv)}
                                            className="p-4 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase italic">{moment(inv.invoice_date).format('DD/MM/YYYY')}</span>
                                                <ExternalLink size={12} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-sm font-black text-slate-800 font-mono">{inv.invoice_number}</span>
                                                <span className="text-sm font-black text-indigo-600">{formatCurrency(inv.total_amount)}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!data.recent_invoices || data.recent_invoices.length === 0) && (
                                        <div className="p-10 text-center text-slate-300 font-black uppercase text-[10px] italic">
                                            Trống
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
};
