import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Search, Copy, Edit, Printer, Trash2 
} from 'lucide-react';

// Import Component Modal In (Đã có tính năng xuất Excel)
import { PrintPreviewModal } from '../components/PrintPreviewModal';

// --- HÀM TÌM THÔNG TIN SẢN PHẨM (Sử dụng API mới tối ưu) ---
const fetchProductInfo = async (sku) => {
    if (!sku) return null;
    try {
        // Gọi API lookup mới đã viết ở Backend
        const res = await axios.get('/api/v1/productqvc/lookup', { params: { sku } });
        
        // API trả về: { data: { image, warranty, name, ... } }
        // Backend đã xử lý logic ghép link ảnh và chọn bảo hành rồi, Frontend chỉ việc dùng.
        return res.data.data;
    } catch (e) {
        return null;
    }
};

export const QuotationList = () => {
    const navigate = useNavigate();
    
    // State dữ liệu
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State Modal
    const [previewData, setPreviewData] = useState(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false); // Loading khi đang làm giàu dữ liệu

    // --- 1. LOAD DATA ---
    useEffect(() => { 
        fetchQuotes(); 
    }, []);

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v2/quotations', { params: { code: searchTerm } }); 
            setQuotes(res.data.data || []);
        } catch (error) { 
            console.error("Lỗi tải danh sách:", error); 
        } finally { 
            setLoading(false); 
        }
    };

    // --- 2. XỬ LÝ KHI BẤM NÚT IN / XEM ---
    const handlePrintPreview = async (id) => {
        setIsPreparing(true); // Bật loading overlay
        try {
            // Bước 1: Lấy chi tiết báo giá từ Database
            const res = await axios.get(`/api/v2/quotations/${id}`);
            let data = res.data;

            // Bước 2: "Làm giàu" dữ liệu (Tìm ảnh & Bảo hành từ API Lookup mới)
            // Chạy song song (Promise.all) để tối ưu tốc độ
            const enrichedItems = await Promise.all(data.items.map(async (item) => {
                // Chỉ gọi API nếu thiếu ảnh HOẶC thiếu bảo hành
                // (Giúp tiết kiệm request nếu dữ liệu đã đủ)
                if (!item.image || !item.warranty) {
                    const sku = item.product_code || item.sku;
                    const info = await fetchProductInfo(sku);

                    if (info) {
                        return { 
                            ...item, 
                            image: info.image || item.image,       // Ưu tiên ảnh từ API Lookup
                            warranty: info.warranty || item.warranty, // Ưu tiên bảo hành từ API
                            // product_name: info.name || item.product_name // (Tuỳ chọn: Cập nhật tên mới nhất)
                        };
                    }
                }
                return item;
            }));

            // Bước 3: Cập nhật lại data hoàn chỉnh
            data = { ...data, items: enrichedItems };

            // Bước 4: Mở Modal
            setPreviewData(data);
            setIsPrintModalOpen(true); 
        } catch (error) { 
            console.error(error);
            alert("Lỗi tải dữ liệu báo giá!"); 
        } finally {
            setIsPreparing(false);
        }
    };

    // --- 3. XỬ LÝ XÓA ---
    const handleDelete = async (id) => {
        if (!confirm("Chắc chắn xóa báo giá này?")) return;
        try {
            await axios.delete(`/api/v2/quotations/${id}`);
            setQuotes(prev => prev.filter(q => q.id !== id));
        } catch (e) { 
            alert("Lỗi xóa báo giá!"); 
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Danh sách Báo Giá</h1>
                <button onClick={() => navigate('/quotations/create')} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-blue-700 transition-colors">
                    <Plus size={18} /> Tạo mới
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm theo mã phiếu..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && fetchQuotes()}
                    />
                </div>
            </div>

            {/* Table List */}
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 relative">
                
                {/* Loading Overlay khi đang chuẩn bị in */}
                {isPreparing && (
                    <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-sm font-semibold text-blue-700 animate-pulse">Đang đồng bộ dữ liệu ảnh & bảo hành...</span>
                    </div>
                )}

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-bold uppercase border-b">
                            <tr>
                                <th className="px-6 py-3">Mã phiếu</th>
                                <th className="px-6 py-3">Khách hàng</th>
                                <th className="px-6 py-3 text-right">Tổng tiền</th>
                                <th className="px-6 py-3 text-center">Trạng thái</th>
                                <th className="px-6 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {quotes.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400 italic">Không có dữ liệu báo giá</td>
                                </tr>
                            ) : (
                                quotes.map((q) => (
                                    <tr key={q.id} className="hover:bg-blue-50 transition duration-150">
                                        <td className="px-6 py-4 font-bold text-blue-600 cursor-pointer" onClick={() => handlePrintPreview(q.id)}>
                                            {q.code}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{q.customer_name}</div>
                                            <div className="text-xs text-gray-500">{new Date(q.date).toLocaleDateString('vi-VN')}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold">
                                            {new Intl.NumberFormat('vi-VN').format(q.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${q.status === 'Đã chốt' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {q.status || 'Mới'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handlePrintPreview(q.id)} 
                                                    title="In phiếu & Xuất Excel" 
                                                    className="p-2 text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded transition-colors"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => navigate(`/quotations/create?source_id=${q.id}`)} 
                                                    title="Sao chép" 
                                                    className="p-2 text-gray-600 hover:text-green-600 bg-gray-100 hover:bg-green-50 rounded transition-colors"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => navigate(`/quotations/edit/${q.id}`)} 
                                                    title="Chỉnh sửa" 
                                                    className="p-2 text-gray-600 hover:text-orange-600 bg-gray-100 hover:bg-orange-50 rounded transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(q.id)} 
                                                    title="Xóa" 
                                                    className="p-2 text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* --- COMPONENT MODAL IN & XUẤT EXCEL --- */}
            <PrintPreviewModal 
                isOpen={isPrintModalOpen} 
                onClose={() => setIsPrintModalOpen(false)} 
                data={previewData} 
            />
        </div>
    );
};