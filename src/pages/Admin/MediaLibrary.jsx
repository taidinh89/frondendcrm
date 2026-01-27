import React, { useState, useEffect, useCallback } from 'react';
import { mediaApi } from '../../api/admin/mediaApi';
import { toast } from 'react-hot-toast';
import { 
    Trash2, Search, RefreshCw, FileImage, 
    AlertCircle, CheckCircle, Link as LinkIcon 
} from 'lucide-react';

export const MediaLibrary = () => {
    // State
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Filter State
    const [search, setSearch] = useState('');
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unused'
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0
    });

    // --- 1. LOAD DATA ---
    const fetchFiles = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const params = {
                page,
                search: search || undefined,
                filter: filterMode === 'unused' ? 'unused' : undefined
            };
            
            const res = await mediaApi.getLibrary(params);
            setFiles(res.data.data);
            setPagination({
                current_page: res.data.current_page,
                last_page: res.data.last_page,
                total: res.data.total
            });
        } catch (error) {
            toast.error("Không thể tải kho ảnh");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [search, filterMode]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchFiles(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchFiles]);

    // --- 2. XÓA ẢNH (XỬ LÝ LỖI 422) ---
    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn file này?")) return;

        try {
            await mediaApi.deleteMedia(id);
            toast.success("Đã xóa file thành công (Dọn rác OK)");
            fetchFiles(pagination.current_page); // Reload
        } catch (error) {
            // Xử lý lỗi chặn xóa (FILE_IN_USE)
            if (error.response && error.response.status === 422) {
                const msg = error.response.data.message;
                // Hiển thị toast lỗi dài để người dùng đọc được tên sản phẩm đang dùng
                toast.error(msg, { duration: 6000, icon: '🔒' });
            } else {
                toast.error("Lỗi xóa file: " + error.message);
            }
        }
    };

    // --- 3. ĐỒNG BỘ TỪ QVC (MASS SYNC) ---
    const handleSyncFromSource = async () => {
        if (!window.confirm("Hành động này sẽ quét toàn bộ QVC để tải ảnh gốc về. Có thể mất vài phút. Tiếp tục?")) return;
        
        setIsSyncing(true);
        const toastId = toast.loading("Đang đồng bộ dữ liệu từ QVC...");
        
        try {
            const res = await mediaApi.syncFromSource();
            toast.success(`Đồng bộ hoàn tất! Đã xử lý ${res.data.total} sản phẩm.`, { id: toastId });
            fetchFiles(1);
        } catch (error) {
            toast.error("Lỗi đồng bộ: " + (error.response?.data?.error || error.message), { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    };

    // --- RENDER ---
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* HEADER TOOLBAR */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileImage className="w-8 h-8 text-blue-600" />
                        Kho Media Chung
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Tổng cộng: <span className="font-semibold">{pagination.total}</span> files
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Tìm theo tên file..." 
                            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Filter Unused */}
                    <select 
                        className="px-4 py-2 border rounded-lg bg-white"
                        value={filterMode}
                        onChange={(e) => setFilterMode(e.target.value)}
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="unused">🗑️ Chỉ hiện ảnh rác (Chưa dùng)</option>
                    </select>

                    {/* Sync Button */}
                    <button 
                        onClick={handleSyncFromSource}
                        disabled={isSyncing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all
                            ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md'}`}
                    >
                        <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ từ Web'}
                    </button>
                </div>
            </div>

            {/* GRID LAYOUT */}
            {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {files.map((file) => (
                        <div key={file.id} className="group relative bg-white rounded-xl shadow-sm border hover:shadow-md transition-all overflow-hidden">
                            {/* Image Preview */}
                            <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                <img 
                                    src={file.preview_url || '/placeholder.png'} 
                                    alt={file.original_name}
                                    className="w-full h-full object-contain p-2"
                                    onError={(e) => e.target.src = 'https://placehold.co/400?text=Error'}
                                />
                                
                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button 
                                        onClick={() => window.open(file.preview_url, '_blank')}
                                        className="p-2 bg-white/20 text-white rounded-full hover:bg-blue-600 backdrop-blur-sm"
                                        title="Xem ảnh lớn"
                                    >
                                        <Search className="w-5 h-5" />
                                    </button>
                                    
                                    {/* Nút Xóa: Chỉ hiện rõ nếu là ảnh rác, mờ nếu đang dùng */}
                                    <button 
                                        onClick={() => handleDelete(file.id)}
                                        className={`p-2 rounded-full backdrop-blur-sm transition-colors
                                            ${file.usage_count > 0 
                                                ? 'bg-red-900/50 text-red-200 cursor-not-allowed' 
                                                : 'bg-white/20 text-white hover:bg-red-600'
                                            }`}
                                        title={file.usage_count > 0 ? "Ảnh đang được sử dụng (Bấm để xem chi tiết)" : "Xóa vĩnh viễn"}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Meta Info */}
                            <div className="p-3">
                                <p className="text-sm font-medium text-gray-700 truncate" title={file.original_name}>
                                    {file.original_name}
                                </p>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-gray-400">
                                        {Math.round(file.size_kb)} KB
                                    </span>
                                    
                                    {/* Usage Badge */}
                                    {file.usage_count > 0 ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                                            <LinkIcon className="w-3 h-3" />
                                            Dùng: {file.usage_count}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border">
                                            <AlertCircle className="w-3 h-3" />
                                            Rác
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination (Đơn giản) */}
            <div className="mt-8 flex justify-center gap-2">
                <button 
                    disabled={pagination.current_page === 1}
                    onClick={() => fetchFiles(pagination.current_page - 1)}
                    className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-100"
                >
                    Trước
                </button>
                <span className="px-4 py-2 text-gray-600">
                    Trang {pagination.current_page} / {pagination.last_page}
                </span>
                <button 
                    disabled={pagination.current_page === pagination.last_page}
                    onClick={() => fetchFiles(pagination.current_page + 1)}
                    className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-100"
                >
                    Sau
                </button>
            </div>
        </div>
    );
};

export default MediaLibrary;