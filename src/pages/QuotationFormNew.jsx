import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

// --- IMPORT CÁC COMPONENT CON ---
import { CustomerSearch } from '../components/CustomerSearch';
import { ProductSearch } from '../components/ProductSearch';
import { PrintPreviewModal } from '../components/PrintPreviewModal'; 

import { 
    Save, ArrowLeft, Warehouse, History, Image as ImageIcon, 
    Eye, Printer, RefreshCw, HelpCircle, Clock, Keyboard, X, 
    Trash2, Edit, Tag, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// =================================================================================
// 1. UTILS & CACHING
// =================================================================================

const PRODUCT_INFO_CACHE = new Map();

// Hàm gọi API Lookup (Backend đã sửa để chấp nhận mọi loại mã)
const fetchProductInfo = async (sku) => {
    if (!sku) return null;
    if (PRODUCT_INFO_CACHE.has(sku)) return PRODUCT_INFO_CACHE.get(sku);

    try {
        const res = await axios.get('/api/v1/productqvc/lookup', { params: { sku } });
        if (res.data && res.data.data) {
            PRODUCT_INFO_CACHE.set(sku, res.data.data);
            return res.data.data;
        }
    } catch (e) {
        console.warn(`Lookup failed for ${sku}`);
    }
    return null;
};

// Component hiển thị ảnh (Tối ưu render)
const ProductImageDisplay = ({ src, alt }) => {
    const [imgSrc, setImgSrc] = useState(src);
    useEffect(() => { setImgSrc(src); }, [src]);

    if (!imgSrc) return <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300"><ImageIcon size={16} /></div>;
    
    return (
        <img 
            src={imgSrc} 
            className="w-full h-full object-cover"
            onError={() => setImgSrc(null)} 
            alt={alt}
        />
    );
};

// Format tiền tệ & số
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
const formatNumber = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);

// =================================================================================
// CÁC MODAL HỖ TRỢ (GIỮ NGUYÊN)
// =================================================================================
const GuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex justify-between items-center">
                    <h3 className="font-bold text-xl flex items-center gap-2"><HelpCircle/> Hướng dẫn & Logic</h3>
                    <button onClick={onClose}><X/></button>
                </div>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2 border-b pb-1 flex items-center gap-2"><Keyboard size={18}/> Phím tắt</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between p-2 bg-gray-50 rounded border"><span className="font-bold">F1</span> <span>Mở hướng dẫn</span></div>
                            <div className="flex justify-between p-2 bg-gray-50 rounded border"><span className="font-bold">F2</span> <span>Sửa chi tiết dòng</span></div>
                            <div className="flex justify-between p-2 bg-gray-50 rounded border"><span className="font-bold">F4</span> <span>Bật/Tắt Soi Lợi Nhuận</span></div>
                            <div className="flex justify-between p-2 bg-gray-50 rounded border"><span className="font-bold">Ctrl + S</span> <span>Lưu phiếu</span></div>
                            <div className="flex justify-between p-2 bg-gray-50 rounded border"><span className="font-bold">Ctrl + P</span> <span>Lưu & In phiếu</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HistoryModal = ({ isOpen, onClose, onRestore }) => {
    const [drafts, setDrafts] = useState([]);
    useEffect(() => { if (isOpen) try { setDrafts(JSON.parse(localStorage.getItem('qvc_drafts') || '[]')); } catch { setDrafts([]); } }, [isOpen]);
    
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="bg-orange-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><History/> Lịch sử bản nháp</h3>
                    <button onClick={onClose}><X/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {drafts.map(d => (
                        <div key={d.id} className="bg-white p-3 rounded border hover:border-blue-500 shadow-sm flex justify-between items-center group">
                            <div><p className="font-bold text-sm text-gray-800">{d.preview || 'Bản nháp'}</p><p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock size={10}/> {d.timestamp}</p></div>
                            <button onClick={() => { onRestore(d.data); onClose(); }} className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded border border-orange-200 font-bold hover:bg-orange-200 flex items-center gap-1"><RefreshCw size={12}/> Khôi phục</button>
                        </div>
                    ))}
                    {drafts.length===0 && <p className="text-center text-gray-400">Trống.</p>}
                </div>
            </div>
        </div>
    );
};

const ItemEditModal = ({ isOpen, onClose, item, onSave }) => {
    const [localItem, setLocalItem] = useState(item);
    useEffect(() => { setLocalItem(item); }, [item]);
    if (!isOpen || !localItem) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="bg-white rounded-lg w-full max-w-2xl p-6 space-y-5 shadow-xl">
                <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Edit size={18}/> Chỉnh sửa chi tiết sản phẩm</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tên hiển thị:</label>
                    <textarea className="w-full border rounded p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={2} value={localItem.product_name || ''} onChange={e => setLocalItem({...localItem, product_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bảo hành:</label><input className="w-full border rounded p-2 text-sm" value={localItem.warranty || ''} onChange={e => setLocalItem({...localItem, warranty: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ghi chú dòng:</label><input className="w-full border rounded p-2 text-sm" value={localItem.note || ''} onChange={e => setLocalItem({...localItem, note: e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100 text-sm font-medium">Hủy bỏ</button>
                    <button onClick={() => onSave(localItem)} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 text-sm shadow">Lưu thay đổi</button>
                </div>
            </div>
        </div>
    );
};

// =================================================================================
// 2. MAIN FORM COMPONENT
// =================================================================================
export const QuotationFormNew = () => {
    const { id } = useParams(); 
    const [searchParams] = useSearchParams();
    const sourceId = searchParams.get('source_id');
    const navigate = useNavigate();
    const qtyInputRefs = useRef([]); 
    
    // --- DATA STATE ---
    const [formData, setFormData] = useState({
        code: 'Tự động sinh',
        date: new Date().toISOString().split('T')[0],
        warehouse_code: '', 
        note: '',
        status: 'Mới'
    });
    const [customer, setCustomer] = useState(null);
    const [items, setItems] = useState([]); 
    const [warehouses, setWarehouses] = useState([]);
    
    // --- UI STATE ---
    const [loading, setLoading] = useState(false);
    const [showImages, setShowImages] = useState(true);
    const [showProfit, setShowProfit] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    
    const [hoverIndex, setHoverIndex] = useState(-1);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editingIndex, setEditingIndex] = useState(-1);
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);

    // Auto Save Ref
    const autoSaveTimer = useRef(null);

    // --- COMPUTED ---
    const summary = useMemo(() => {
        let total = 0, totalProfit = 0;
        items.forEach(i => {
            const lineTotal = i.quantity * i.price;
            total += lineTotal;
            totalProfit += (lineTotal - (i.quantity * (i.original_cost_price || 0)));
        });
        return { total, totalProfit };
    }, [items]);

    // --- 1. KHỞI TẠO ---
    useEffect(() => {
        axios.get('/api/v1/warehouses').then(res => {
            const valid = (res.data.data || []).filter(w => w.code).sort((a,b) => a.source==='ecount'?-1:1);
            setWarehouses(valid);
            if(!formData.warehouse_code) setFormData(p=>({...p, warehouse_code: '02'}));
        });
        
        const loadId = id || sourceId;
        if (loadId) loadQuotationData(loadId, !!sourceId);
        else {
            try {
                const drafts = JSON.parse(localStorage.getItem('qvc_drafts') || '[]');
                if (drafts.length > 0) toast(t => (
                    <div className="flex flex-col gap-1 text-sm">
                        <span>Bản nháp {drafts[0].timestamp}</span>
                        <button onClick={() => { handleRestore(drafts[0].data); toast.dismiss(t.id); }} className="bg-blue-600 text-white px-2 py-1 rounded shadow text-xs">Khôi phục</button>
                    </div>
                ), { icon: '📂', duration: 6000 });
            } catch {}
        }
    }, [id, sourceId]);

    // --- 2. LOAD DATA ---
    const loadQuotationData = useCallback(async (targetId, isCopy) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v2/quotations/${targetId}`);
            const data = res.data;
            
            setFormData(prev => ({
                ...prev,
                code: isCopy ? 'Tự động sinh' : data.code,
                date: isCopy ? new Date().toISOString().split('T')[0] : (data.date?.split('T')[0]),
                warehouse_code: data.warehouse_code || '02', 
                note: isCopy ? `Sao chép từ ${data.code}` : (data.note || ''),
                status: isCopy ? 'Mới' : data.status,
            }));

            if (data.customer_id) {
                setCustomer({ 
                    id: data.customer_id, 
                    ma_khncc: data.customer_code, 
                    ten_cong_ty_khach_hang: data.customer_name,
                    dien_thoai: data.customer_phone || '',
                    dia_chi: data.customer_address || ''
                });
            }

            // Map Items & Enrich
            const enrichedItems = await Promise.all(data.items.map(async (i) => {
                const orig = typeof i.original_data === 'string' ? JSON.parse(i.original_data) : (i.original_data || {});
                
                // Logic thông minh: Nếu thiếu ảnh hoặc bảo hành, tự gọi Lookup bù vào
                let img = orig.image_url || i.image;
                let war = i.warranty;

                if (!img || !war) {
                    const info = await fetchProductInfo(i.product_code);
                    if (info) {
                        img = img || info.image;
                        war = war || info.warranty;
                    }
                }

                return {
                    id: isCopy ? null : i.id,
                    product_code: i.product_code,
                    product_name: i.product_name,
                    unit: i.unit,
                    quantity: Number(i.quantity),
                    price: Number(i.price),
                    image_url: img, 
                    warranty: war,
                    
                    total_stock: orig.total_stock || 0,
                    _raw_locations: orig.locations || [],
                    original_cost_price: Number(i.original_cost_price || orig.ref_prices?.cost || 0),
                    ref_prices: orig.ref_prices || {},
                    original_data: { ...orig, image_url: img }
                };
            }));

            setItems(enrichedItems);

        } catch (e) { toast.error("Lỗi tải dữ liệu!"); } 
        finally { setLoading(false); }
    }, []);

    // --- 3. ADD PRODUCT (GỌI LOOKUP ĐỂ LẤY ẢNH CHUẨN) ---
    const handleAddProduct = async (p, priceKey) => {
        const newItem = {
            product_code: p.product_code,
            product_name: p.display_name,
            unit: p.unit,
            quantity: 1,
            price: p.dataSources?.ecount?.prices?.[priceKey] || p.dataSources?.ecount?.prices?.out_price || 0,
            image_url: null, // Sẽ update sau khi lookup
            warranty: '',
            ref_prices: {
                retail: p.dataSources?.ecount?.prices?.out_price || 0,
                cost: p.dataSources?.ecount?.prices?.in_price || 0
            },
            original_cost_price: p.dataSources?.ecount?.prices?.in_price || 0,
            total_stock: p.inventorySummary?.total_ecount_quantity || 0,
            _raw_locations: p.inventorySummary?.locations || [],
            original_data: p
        };

        setItems(prev => [...prev, newItem]);
        toast.success(`Đã thêm ${p.product_code}`);

        // [QUAN TRỌNG] Gọi API Lookup để lấy ảnh chuẩn và bảo hành
        const extraInfo = await fetchProductInfo(p.product_code);
        if (extraInfo) {
            setItems(currentItems => {
                // Update item vừa thêm (cuối cùng)
                if (currentItems.length > 0) {
                    const lastIdx = currentItems.length - 1;
                    const updated = [...currentItems];
                    updated[lastIdx] = { 
                        ...updated[lastIdx],
                        product_code: extraInfo.sku, // Chuẩn hóa mã
                        image_url: extraInfo.image, 
                        warranty: extraInfo.warranty,
                        original_data: { ...updated[lastIdx].original_data, image_url: extraInfo.image }
                    };
                    return updated;
                }
                return currentItems;
            });
        }
    };

    // --- 4. HANDLE SAVE (TRẢ VỀ KẾT QUẢ ĐỂ PRINT DÙNG) ---
    const handleSave = async (isSilent = false) => {
        if (!customer) { toast.error("Vui lòng chọn khách hàng!"); return false; }
        if (items.length === 0) { toast.error("Chưa có sản phẩm nào!"); return false; }

        setLoading(true);

        const payload = {
            ...formData,
            // Backend nhận customer_id đơn lẻ
            customer_id: customer.id, 
            customer_code: customer.ma_khncc || 'KHACHLE',
            customer_name: customer.ten_cong_ty_khach_hang || 'Khách lẻ',
            customer_phone: customer.dien_thoai || '',
            customer_address: customer.dia_chi || '',
            
            items: items.map(item => ({
                product_code: item.product_code,
                product_name: item.product_name, 
                unit: item.unit || 'Cái',
                quantity: item.quantity,
                price: item.price,
                vat_rate: 0,
                note: item.note || '',
                warranty: item.warranty || '',
                
                // Lưu JSON original_data kèm ảnh
                original_data: {
                    ...(item.original_data || {}),
                    image_url: item.image_url, 
                }
            })),
            total_amount: items.reduce((sum, i) => sum + (i.quantity * i.price), 0)
        };

        try {
            let res;
            if (id) {
                // Update
                res = await axios.put(`/api/v2/quotations/${id}`, payload);
                if(!isSilent) toast.success("Cập nhật thành công!");
                return { success: true, id: id, code: formData.code };
            } else {
                // Create
                res = await axios.post('/api/v2/quotations', payload);
                if(!isSilent) toast.success("Lưu thành công!");
                localStorage.removeItem('qvc_drafts');
                
                // Điều hướng sang trang edit nhưng trả về info ngay
                if (res.data.id) {
                    navigate(`/quotations/edit/${res.data.id}`, { replace: true });
                    // Cập nhật ngay formData để Modal in có mã phiếu
                    setFormData(p => ({ ...p, code: res.data.code }));
                    return { success: true, id: res.data.id, code: res.data.code };
                }
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            toast.error(`Lỗi lưu: ${msg}`);
            return { success: false };
        } finally {
            setLoading(false);
        }
    };

    // --- 5. HANDLE PRINT & SAVE (TÍNH NĂNG MỚI) ---
    const handlePrintAndSave = async () => {
        // Gọi lưu trước
        const result = await handleSave(true); // true = silent toast (hoặc hiện cũng được)
        
        if (result && result.success) {
            // Lưu xong mới mở modal
            setPrintModalOpen(true);
        }
    };

    const handleRestore = (data) => {
        setFormData(data.formData);
        setCustomer(data.customer);
        setItems(data.items);
        toast.success("Đã khôi phục dữ liệu!");
    };

    // --- SHORTCUTS ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F1') { e.preventDefault(); setGuideModalOpen(true); }
            if (e.key === 'F4') { e.preventDefault(); setShowProfit(prev => !prev); }
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
            // [QUAN TRỌNG] Ctrl + P: Lưu rồi In
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); handlePrintAndSave(); }
            
            if (e.key === 'F2' && hoverIndex !== -1 && items[hoverIndex]) {
                e.preventDefault();
                setEditingItem(items[hoverIndex]); setEditingIndex(hoverIndex); setEditModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items, hoverIndex, customer, formData, id]); // Dependencies quan trọng cho handleSave

    // --- AUTO SAVE ---
    useEffect(() => {
        if ((items.length > 0 || customer) && !loading && !id) {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
            autoSaveTimer.current = setTimeout(() => {
                const draft = { id: Date.now(), timestamp: new Date().toLocaleString('vi-VN'), preview: customer?.ten_cong_ty_khach_hang, data: { formData, customer, items } };
                localStorage.setItem('qvc_drafts', JSON.stringify([draft].slice(0, 5)));
            }, 3000);
        }
    }, [items, customer, formData, loading, id]);

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-sm pb-20">
            {/* Modal In */}
            <PrintPreviewModal 
                isOpen={printModalOpen} 
                onClose={() => setPrintModalOpen(false)} 
                data={{
                    code: formData.code,
                    date: formData.date,
                    customer_name: customer?.ten_cong_ty_khach_hang,
                    customer_address: customer?.dia_chi,
                    customer_phone: customer?.dien_thoai,
                    items: items.map(i => ({ ...i, image: i.image_url, name: i.product_name })),
                    total_amount: summary.total,
                    note: formData.note,
                    creator_name: 'Phòng Kinh Doanh'
                }} 
            />
            
            <GuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
            <HistoryModal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} onRestore={handleRestore} />
            <ItemEditModal isOpen={editModalOpen} item={editingItem} onClose={() => setEditModalOpen(false)} 
                onSave={(u) => { const n = [...items]; n[editingIndex] = u; setItems(n); setEditModalOpen(false); toast.success("Đã cập nhật!"); }} 
            />

            {/* HEADER */}
            <div className="bg-white shadow-sm border-b p-3 flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/quotations')} className="text-gray-500 hover:text-blue-600"><ArrowLeft size={20}/></button>
                    <div>
                        <h1 className="font-bold text-lg text-gray-800">{id ? `Sửa: ${formData.code}` : 'Tạo Mới'}</h1>
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Warehouse size={12}/> {warehouses.find(w => w.code === formData.warehouse_code)?.name || 'Kho 02'}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setHistoryModalOpen(true)} className="p-2 text-orange-600 hover:bg-orange-50 rounded" title="Lịch sử"><History size={20}/></button>
                    <button onClick={()=>setShowImages(!showImages)} className={`p-2 rounded border ${showImages?'bg-blue-50 text-blue-600':''}`} title="Ảnh"><ImageIcon size={18}/></button>
                    <button onClick={()=>setShowProfit(!showProfit)} className={`p-2 rounded border ${showProfit?'bg-yellow-50 text-yellow-600':''}`} title="Soi Lãi (F4)"><Eye size={18}/></button>
                    
                    {/* NÚT IN & LƯU */}
                    <button onClick={handlePrintAndSave} className="bg-green-600 text-white px-3 rounded flex gap-2 items-center font-bold hover:bg-green-700 shadow">
                        <Printer size={18}/> Lưu & In
                    </button>
                    
                    <button type="button" onClick={()=>handleSave(false)} disabled={loading} className={`bg-blue-600 text-white px-4 rounded flex gap-2 items-center font-bold hover:bg-blue-700 shadow ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {loading ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
                        {loading ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </div>

            {/* BODY */}
            <div className="p-4 max-w-7xl mx-auto space-y-4">
                <div className="bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-200">
                    <div><label className="font-bold block mb-1">Khách hàng *</label><CustomerSearch selectedCustomer={customer} onSelect={setCustomer} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="font-bold block mb-1">Ngày</label><input type="date" className="w-full border rounded p-2" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} /></div>
                        <div>
                            <label className="font-bold block mb-1">Kho xuất</label>
                            <select className="w-full border rounded p-2 bg-indigo-50" value={formData.warehouse_code} onChange={e=>setFormData({...formData, warehouse_code: e.target.value})}>
                                {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div><label className="font-bold block mb-1">Ghi chú</label><textarea className="w-full border rounded p-2 h-[74px]" value={formData.note} onChange={e=>setFormData({...formData, note: e.target.value})} /></div>
                </div>

                <ProductSearch onAddProduct={handleAddProduct} selectedWarehouseCode={formData.warehouse_code} />
                
                <div className="bg-white rounded shadow overflow-x-auto border border-gray-200 min-h-[400px]">
                    <table className="w-full text-sm min-w-[900px]">
                        <thead className="bg-gray-100 font-bold sticky top-0 z-10 border-b">
                            <tr>
                                <th className="p-3 w-10 text-center">#</th>
                                {showImages && <th className="p-3 w-16 text-center">Ảnh</th>}
                                <th className="p-3 text-left">Sản phẩm</th>
                                <th className="p-3 w-20 text-center">ĐVT</th>
                                <th className="p-3 w-24 text-center">SL</th>
                                <th className="p-3 w-32 text-right">Giá</th>
                                <th className="p-3 w-32 text-right">Thành tiền</th>
                                {showProfit && <th className="p-3 w-28 text-right bg-yellow-50 text-yellow-800">Lãi</th>}
                                <th className="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map((item, idx) => {
                                const profit = (item.price - (item.original_cost_price||0)) * item.quantity;
                                const isLowStock = item.quantity > item.total_stock; // Logic tạm
                                
                                return (
                                    <tr key={idx} className="hover:bg-blue-50/30 group" onMouseEnter={()=>setHoverIndex(idx)} onMouseLeave={()=>setHoverIndex(-1)}>
                                        <td className="p-3 text-center text-gray-400">{idx+1}</td>
                                        
                                        {showImages && (
                                            <td className="p-3 text-center relative">
                                                <div className="w-10 h-10 bg-gray-100 rounded border mx-auto overflow-hidden group/img cursor-pointer flex items-center justify-center">
                                                    <ProductImageDisplay src={item.image_url} alt={item.product_code} />
                                                    <div className="absolute hidden group-hover/img:block z-50 left-10 top-0 w-32 h-32 bg-white shadow-xl border rounded p-1">
                                                        <ProductImageDisplay src={item.image_url} alt={item.product_code} />
                                                    </div>
                                                </div>
                                            </td>
                                        )}

                                        <td className="p-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold">{item.product_code}</span>
                                                </div>
                                                <div className="cursor-pointer hover:text-blue-600 hover:underline decoration-dashed" onClick={()=>{setEditingItem(item); setEditingIndex(idx); setEditModalOpen(true);}}>
                                                    {item.product_name}
                                                </div>
                                                <div className="flex gap-2 mt-1">
                                                    {item.warranty && <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-500"><Tag size={10} className="inline"/> {item.warranty}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">{item.unit}</td>
                                        <td className="p-3">
                                            <input type="number" ref={el => qtyInputRefs.current[idx] = el} className={`w-full border rounded text-center font-bold ${isLowStock?'border-red-500 text-red-600 bg-red-50':''}`} value={item.quantity} onChange={e=>{const n=[...items]; n[idx].quantity=Number(e.target.value); setItems(n)}}/>
                                        </td>
                                        <td className="p-3"><input type="number" className="w-full border rounded text-right" value={item.price} onChange={e=>{const n=[...items]; n[idx].price=Number(e.target.value); setItems(n)}}/></td>
                                        <td className="p-3 text-right font-bold">{formatCurrency(item.quantity*item.price)}</td>
                                        {showProfit && (
                                            <td className={`p-3 text-right text-xs font-bold ${profit<0?'text-red-600':'text-green-600'}`}>
                                                {formatCurrency(profit)}
                                            </td>
                                        )}
                                        <td className="p-3 text-center"><button onClick={()=>setItems(items.filter((_,i)=>i!==idx))} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end mt-4">
                    <div className="bg-white p-4 rounded shadow border w-full md:w-1/3">
                         <div className="flex justify-between items-center text-xl font-black text-red-600"><span>TỔNG CỘNG:</span><span>{formatCurrency(summary.total)}</span></div>
                         {showProfit && <div className="flex justify-between text-sm font-bold text-green-700 border-t pt-2 mt-2"><span>Lãi dự kiến:</span><span>{formatCurrency(summary.totalProfit)}</span></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};