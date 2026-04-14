import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer, 
    AreaChart, Area, LineChart, Line, BarChart, Bar 
} from 'recharts';
import { 
    TrendingUp, Package, AlertCircle, ArrowUpRight, ArrowDownRight, 
    Filter, Calendar, Search, Clock, ExternalLink, ChevronUp, ChevronDown, 
    RefreshCw, Tag, ShoppingCart, DollarSign
} from 'lucide-react';
import moment from 'moment';
import { Modal, Pagination } from '../../components/ui.jsx';
import { InvoiceModal } from '../../components/modals/InvoiceModal';

const ProductAnalyticsPage = ({ setAppTitle }) => {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        start_date: moment().startOf('year').format('YYYY-MM-DD'),
        end_date: moment().format('YYYY-MM-DD'),
        search: '',
        category: '',
        page: 1,
        per_page: 20
    });

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [productHistory, setProductHistory] = useState(null);

    // Invoice Viewer Modal
    const [invoiceModal, setInvoiceModal] = useState({ open: false, data: null, mode: 'html', html: null, loading: false });
    const [formData, setFormData] = useState({ misa_status: '', notes: '' });
    const iframeRef = useRef(null);

    useEffect(() => {
        if (setAppTitle) setAppTitle('Phân tích Sản phẩm (Hóa đơn)');
        fetchProducts();
    }, [filters.page, filters.category, filters.start_date, filters.end_date]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v2/invoice-products', { params: filters });
            // Sau khi v2 chuẩn hóa, res.data là mảng (do interceptor unpack)
            // và phân trang nằm trong _pagination (do interceptor gắn thêm)
            setProducts(res.data || []);
            setPagination(res.data._pagination || {});
        } catch (error) {
            console.error('Fetch products error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProductHistory = async (name) => {
        setHistoryLoading(true);
        try {
            const res = await axios.get('/api/v2/invoice-products/history', { params: { name } });
            // Sau khi v2 chuẩn hóa, res.data đã là { product_name, history, chart }
            setProductHistory(res.data);
        } catch (error) {
            console.error('Fetch history error:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleViewHtml = async (invoice) => {
        setInvoiceModal(m => ({ ...m, open: true, loading: true, mode: 'html', data: invoice }));
        try {
            const uuid = invoice.invoice_uuid;
            if (!uuid) throw new Error('Mã định danh hóa đơn (UUID) không tồn tại');
            
            const res = await axios.get(`/api/v1/invoices/${uuid}/html`);
            // API V1 qua interceptor sẽ trả về đối tượng có thuộc tính html hoặc chính nó
            const htmlContent = res.data?.html || res.data || '';
            setInvoiceModal(prev => ({ ...prev, loading: false, html: htmlContent }));
        } catch (err) {
            console.error('View invoice error:', err);
            setInvoiceModal(m => ({ ...m, loading: false, html: '<div class="p-10 text-center text-red-500 font-bold">Lỗi tải bản thể hiện hóa đơn. Kiểm tra lại UUID.</div>' }));
        }
    };

    const handleSearch = () => {
        setFilters(prev => ({ ...prev, page: 1 }));
        fetchProducts();
    };

    const formatCurrency = (val) => {
        if (val === undefined || val === null || val === '') return '0 đ';
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' đ';
    };

    const categories = [
        { key: '', label: 'TẤT CẢ' },
        { key: 'petrol', label: '⛽ XĂNG DẦU' },
        { key: 'toll', label: '🎫 CẦU ĐƯỜNG / VÉ' },
        { key: 'telecom', label: '📡 VIỄN THÔNG' },
        { key: 'standard', label: '📦 THÔNG DỤNG' },
    ];

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                        <Tag size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">PHÂN TÍCH SẢN PHẨM HÓA ĐƠN</h1>
                        <p className="text-slate-500 text-sm font-semibold flex items-center gap-1">
                            <Clock size={14} /> Dữ liệu bóc tách trực tiếp từ XML GDT
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <input 
                            type="date" 
                            className="text-xs font-bold p-1 bg-transparent outline-none"
                            value={filters.start_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                        />
                        <span className="px-2 text-slate-300">→</span>
                        <input 
                            type="date" 
                            className="text-xs font-bold p-1 bg-transparent outline-none"
                            value={filters.end_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                    </div>
                    
                    <button 
                        onClick={fetchProducts}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 transition-colors shadow-sm"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard 
                    title="TỔNG MẶT HÀNG" 
                    value={pagination.total || 0}
                    icon={<Package className="text-indigo-500" />}
                    desc="Số lượng tên hàng duy nhất"
                    color="blue"
                />
                <StatCard 
                    title="MẶT HÀNG TOP ĐẦU" 
                    value={products[0]?.product_name ? (products[0].product_name.substring(0, 15) + '...') : 'N/A'}
                    icon={<TrendingUp className="text-emerald-500" />}
                    desc={`Doanh số: ${formatCurrency(products[0]?.total_amount || 0)}`}
                    color="emerald"
                />
            </div>

            {/* Filter & Table Area */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Tìm tên mặt hàng..." 
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-72 pl-12 pr-6 py-3 border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none transition-all shadow-inner bg-white/50"
                            />
                        </div>

                        <div className="flex gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => setFilters(prev => ({ ...prev, category: cat.key, page: 1 }))}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                        filters.category === cat.key 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-6">MẶT HÀNG</th>
                                <th className="px-4 py-6">SỐ LƯỢNG</th>
                                <th className="px-4 py-6">GIÁ TRUNG BÌNH</th>
                                <th className="px-4 py-6">GIÁ MIN - MAX</th>
                                <th className="px-4 py-6">TỔNG THÀNH TIỀN</th>
                                <th className="px-4 py-6">SỐ LẦN XUẤT HIỆN</th>
                                <th className="px-8 py-6 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {products.map((item, idx) => (
                                <tr key={idx} 
                                    onClick={() => {
                                        setSelectedProduct(item.product_name);
                                        fetchProductHistory(item.product_name);
                                    }}
                                    className="hover:bg-indigo-50/50 transition-all cursor-pointer group last:border-0"
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <Package size={14} />
                                            </div>
                                            <div>
                                                <div className="font-black uppercase text-xs text-slate-700 group-hover:text-indigo-600 transition-colors">{item.product_name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">Mã gợi ý: {item.product_code || '---'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 text-slate-600 font-bold text-[11px]">
                                        {new Intl.NumberFormat('vi-VN').format(item.total_quantity)}
                                    </td>
                                    <td className="px-4 py-6 text-indigo-600 font-black text-[12px]">
                                        {formatCurrency(item.avg_price)}
                                    </td>
                                    <td className="px-4 py-6">
                                        <div className="text-[10px] font-bold text-slate-400">
                                            {formatCurrency(item.min_price)} / {formatCurrency(item.max_price)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 text-slate-800 font-black text-[12px]">
                                        {formatCurrency(item.total_amount)}
                                    </td>
                                    <td className="px-4 py-6 text-slate-400 font-bold text-[11px]">
                                        {item.invoice_count} Hóa đơn
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <ChevronDown size={16} className="text-slate-300 group-hover:text-indigo-500 transition-all -rotate-90" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-slate-50/50">
                    <Pagination 
                        pagination={pagination} 
                        onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))} 
                    />
                </div>
            </div>

            {/* History Modal */}
            <Modal
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                title={`PHÂN TÍCH GIÁ: ${selectedProduct}`}
                maxWidthClass="max-w-5xl"
            >
                {historyLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                        <RefreshCw className="animate-spin mb-4" size={32} />
                        <span className="font-bold">Đang tổng hợp dữ liệu lịch sử...</span>
                    </div>
                ) : productHistory && (
                    <div className="p-6 space-y-8">
                        {/* Summary Info Row */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giá trung bình</p>
                                <p className="text-lg font-black text-indigo-600">
                                    {formatCurrency(productHistory.history?.reduce((acc, curr) => acc + curr.price, 0) / (productHistory.history?.length || 1))}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng số lượng</p>
                                <p className="text-lg font-black text-slate-700">
                                    {productHistory.history?.reduce((acc, curr) => acc + curr.quantity, 0)} {productHistory.history?.[0]?.unit}
                                </p>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-50">
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
                                <TrendingUp size={16} className="text-indigo-500" />
                                XU HƯỚNG BIẾN ĐỘNG GIÁ (VND)
                            </h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={productHistory.chart}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8', fontWeight: '900'}} />
                                        <YAxis fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={v => formatCurrency(v)} tick={{fill: '#94a3b8', fontWeight: '900'}} />
                                        <ReTooltip 
                                            formatter={v => formatCurrency(v)} 
                                            contentStyle={{ borderRadius: '16px', border: 'none', background: 'rgba(255,255,255,0.95)', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Line type="monotone" dataKey="avg_price" name="Giá" stroke="#4f46e5" strokeWidth={4} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 8 }} animationDuration={1000} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Invoices Table */}
                        <div className="space-y-4">
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2 px-2">
                                <Clock size={16} className="text-indigo-500" />
                                LỊCH SỬ GIAO DỊCH CHI TIẾT
                            </h3>
                            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                        <tr>
                                            <th className="px-6 py-4">NGÀY</th>
                                            <th className="px-6 py-4">HÓA ĐƠN</th>
                                            <th className="px-6 py-4">ĐỐI TÁC (NCC/KH)</th>
                                            <th className="px-6 py-4">ĐƠN GIÁ</th>
                                            <th className="px-6 py-4">SỐ LƯỢNG</th>
                                            <th className="px-6 py-4 text-right">THÀNH TIỀN</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 bg-white">
                                        {productHistory.history?.map((h, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                                    {moment(h.invoice_date).format('DD/MM/YYYY')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button 
                                                        onClick={() => handleViewHtml(h)}
                                                        className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4"
                                                    >
                                                        #{h.invoice_number}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[11px] font-bold text-slate-700 line-clamp-1 italic uppercase">
                                                        {h.invoice_type.startsWith('sale') ? h.buyer_name : h.seller_name}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 uppercase font-black mt-0.5">
                                                        {h.invoice_type.startsWith('sale') ? 'KHÁCH HÀNG' : 'NHÀ CUNG CẤP'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] font-black text-slate-800">
                                                    {formatCurrency(h.price)}
                                                </td>
                                                <td className="px-6 py-4 text-[11px] font-bold text-slate-500">
                                                    {h.quantity} {h.unit}
                                                </td>
                                                <td className="px-6 py-4 text-right text-[11px] font-black">
                                                    {formatCurrency(h.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Invoice Detail Modal */}
            <InvoiceModal
                isOpen={invoiceModal.open}
                onClose={() => setInvoiceModal(m => ({ ...m, open: false }))}
                selectedInvoice={invoiceModal.data}
                modalViewMode={invoiceModal.mode}
                setModalViewMode={mode => setInvoiceModal(m => ({ ...m, mode }))}
                modalFormData={formData}
                setModalFormData={setFormData}
                invoiceHtml={invoiceModal.html}
                isHtmlLoading={invoiceModal.loading}
                iframeRef={iframeRef}
                handleFetchInvoiceHtml={handleViewHtml}
                handleUpdateInvoice={() => {}}
            />
        </div>
    );
};

const StatCard = ({ title, value, icon, desc, color = 'blue' }) => {
    const schemes = {
        blue: 'border-blue-100 text-blue-600',
        emerald: 'border-emerald-100 text-emerald-600',
        indigo: 'border-indigo-100 text-indigo-600',
    };
    
    return (
        <div className={`p-6 rounded-3xl border bg-white shadow-xl shadow-slate-100 flex flex-col justify-between h-40 hover:-translate-y-1 transition-all duration-300 group ${schemes[color] || schemes.blue}`}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-current">{title}</span>
                <div className="p-3 rounded-2xl bg-slate-50 group-hover:bg-current group-hover:text-white transition-colors">
                    {icon}
                </div>
            </div>
            
            <div>
                <div className="text-2xl font-black text-slate-800 mb-1 tracking-tighter">{value}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{desc}</div>
            </div>
        </div>
    );
};

export default ProductAnalyticsPage;
