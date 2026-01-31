import React, { useState, useEffect, useCallback } from 'react';
import { mediaApi } from '../../api/admin/mediaApi';
import { toast } from 'react-hot-toast';
import {
    Trash2, Search, RefreshCw, FileImage,
    AlertCircle, CheckCircle, Link as LinkIcon,
    X, Info, ExternalLink, Copy, Calendar, FileText,
    Image as ImageIcon, Filter, Layout, MessageSquare
} from 'lucide-react';
import ProductMobileDetail from '../../components/ProductMobileDetail';

const STATIC_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

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
    const [selectedFile, setSelectedFile] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);

    // --- 1. LOAD DATA ---
    const fetchFiles = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const params = {
                page,
                search: search || undefined,
                usage_type: filterMode !== 'all' ? filterMode : undefined
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

    const handleCopyUrl = (url, id) => {
        navigator.clipboard.writeText(window.location.origin + url);
        setCopiedId(id);
        toast.success("Đã sao chép link ảnh");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // --- RENDER ---
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* HEADER TOOLBAR */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <FileImage className="w-8 h-8" />
                        </div>
                        Thư viện Media
                    </h1>
                    <p className="text-gray-500 mt-2 flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                        Đang quản lý <span className="font-bold text-gray-800">{pagination.total}</span> tài liệu kỹ thuật số
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
                    {/* Search */}
                    <div className="relative flex-grow lg:flex-grow-0 lg:w-96 group">
                        <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên file, tên sản phẩm sử dụng..."
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-gray-50/50 hover:bg-white text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Filter Type */}
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-400 ml-2" />
                        <select
                            className="bg-transparent border-none focus:ring-0 outline-none pr-8 py-1.5 text-sm font-semibold text-gray-700 cursor-pointer transition-all"
                            value={filterMode}
                            onChange={(e) => setFilterMode(e.target.value)}
                        >
                            <option value="all">Tất cả Media</option>
                            <option value="product">📦 Dùng cho Sản phẩm</option>
                            <option value="post">📝 Dùng cho Bài viết</option>
                            <option value="unused">🗑️ File chưa sử dụng</option>
                        </select>
                    </div>

                    {/* Sync Button */}
                    <button
                        onClick={handleSyncFromSource}
                        disabled={isSyncing}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all shadow-lg hover:shadow-xl text-sm
                            ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                    >
                        <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Đang sync...' : 'Đồng bộ từ QVC'}
                    </button>
                </div>
            </div>

            {/* GRID LAYOUT */}
            <div className="flex gap-6 relative">
                <div className={`transition-all duration-300 ${selectedFile ? 'w-2/3 lg:w-3/4' : 'w-full'}`}>
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ImageIcon className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Không tìm thấy file nào</h3>
                            <p className="text-gray-500 mt-2">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    onClick={() => setSelectedFile(file)}
                                    className={`group relative bg-white rounded-2xl shadow-sm border-2 transition-all overflow-hidden cursor-pointer
                                        ${selectedFile?.id === file.id ? 'border-blue-500 ring-4 ring-blue-50 shadow-md' : 'border-gray-100 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1'}`}
                                >
                                    {/* Image Preview */}
                                    <div className="aspect-square bg-gray-50 relative overflow-hidden">
                                        <img
                                            src={file.preview_url || STATIC_PLACEHOLDER}
                                            alt={file.original_name}
                                            className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => e.target.src = STATIC_PLACEHOLDER}
                                        />

                                        {/* Quick Actions Badge */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-2">
                                            {file.usage_count > 0 ? (
                                                <div className="bg-green-500/90 text-white p-1.5 rounded-lg backdrop-blur-sm shadow-sm" title="Đang sử dụng">
                                                    <LinkIcon className="w-3.5 h-3.5" />
                                                </div>
                                            ) : (
                                                <div className="bg-orange-500/90 text-white p-1.5 rounded-lg backdrop-blur-sm shadow-sm" title="File rác">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Meta Info */}
                                    <div className="p-4 bg-white">
                                        <p className="text-sm font-bold text-gray-800 truncate mb-1" title={file.original_name}>
                                            {file.original_name}
                                        </p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs font-medium text-gray-400 px-2 py-1 bg-gray-50 rounded-lg">
                                                {Math.round(file.size_kb)} KB
                                            </span>
                                            <span className="text-[10px] text-gray-300 font-mono">
                                                #{file.id}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SIDEBAR DETAIL */}
                {selectedFile && (
                    <div className="w-1/3 lg:w-1/4 sticky top-6 h-[calc(100vh-120px)] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Detail Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-500" />
                                Chi tiết Media
                            </h3>
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Large Image */}
                            <div className="aspect-square bg-gray-50 rounded-2xl border border-gray-100 p-4 relative group">
                                <img
                                    src={selectedFile.preview_url}
                                    className="w-full h-full object-contain"
                                    alt="Preview"
                                />
                                <a
                                    href={selectedFile.preview_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl"
                                >
                                    <div className="bg-white p-3 rounded-full text-blue-600 shadow-xl">
                                        <ExternalLink className="w-6 h-6" />
                                    </div>
                                </a>
                            </div>

                            {/* Info List */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
                                    <FileText className="w-5 h-5 text-gray-400 mt-1" />
                                    <div className="overflow-hidden">
                                        <p className="text-xs text-gray-400 uppercase font-bold">Tên tệp gốc</p>
                                        <p className="text-sm font-medium text-gray-800 break-words">{selectedFile.original_name}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Định dạng & Kích thước</p>
                                        <p className="text-sm font-medium text-gray-800 italic uppercase">
                                            {selectedFile.mime_type} • {Math.round(selectedFile.size_kb)} KB
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Ngày cập nhật</p>
                                        <p className="text-sm font-medium text-gray-800">{formatDate(selectedFile.updated_at)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* USAGE SECTION */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-900 border-l-4 border-blue-500 pl-3 flex items-center justify-between">
                                    Đang sử dụng tại
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {selectedFile.usage_count} vị trí
                                    </span>
                                </h4>

                                {selectedFile.used_in && selectedFile.used_in.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedFile.used_in.map((use, idx) => (
                                            <div
                                                key={idx}
                                                className="group/item flex flex-col p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-blue-50 hover:border-blue-100 transition-all"
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className={`p-2 rounded-lg ${use.type === 'QvcProduct' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                                        {use.type === 'QvcProduct' ? <Layout className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                                                            {use.type === 'QvcProduct' ? 'Sản phẩm QVC' : 'Bài viết / Tin tức'}
                                                        </p>
                                                        <p className="text-sm font-bold text-gray-800 truncate" title={use.name}>
                                                            {use.name}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (use.type === 'QvcProduct') {
                                                                setViewingProduct({ id: use.id, proName: use.name });
                                                            } else {
                                                                toast.info("Tính năng xem nhanh bài viết đang phát triển");
                                                            }
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                                    >
                                                        <Search className="w-3.5 h-3.5" />
                                                        Xem nhanh
                                                    </button>
                                                    <a
                                                        href={use.link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all shadow-sm"
                                                        title="Sửa ở tab mới"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-center gap-3 text-orange-700">
                                        <AlertCircle className="w-5 h-5" />
                                        <p className="text-sm font-medium">Ảnh này là file rác, chưa được sử dụng trong hệ thống.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Detail Actions */}
                        <div className="p-6 border-t bg-gray-50 flex flex-col gap-3">
                            <button
                                onClick={() => handleCopyUrl(selectedFile.preview_url, selectedFile.id)}
                                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition-all shadow-sm"
                            >
                                {copiedId === selectedFile.id ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                {copiedId === selectedFile.id ? 'Đã copy!' : 'Sao chép đường dẫn'}
                            </button>

                            <button
                                onClick={() => handleDelete(selectedFile.id)}
                                className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold transition-all shadow-md
                                    ${selectedFile.usage_count > 0
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-red-500 hover:bg-red-600 text-white active:scale-95'}`}
                                disabled={selectedFile.usage_count > 0}
                            >
                                <Trash2 className="w-5 h-5" />
                                {selectedFile.usage_count > 0 ? 'Không thể xóa khi đang dùng' : 'Xóa vĩnh viễn'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination (Hiện đại hơn) */}
            <div className="mt-12 flex items-center justify-center gap-4">
                <button
                    disabled={pagination.current_page === 1}
                    onClick={() => fetchFiles(pagination.current_page - 1)}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                >
                    Trước
                </button>

                <div className="flex items-center gap-2">
                    <span className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">
                        {pagination.current_page}
                    </span>
                    <span className="text-gray-400 font-bold px-2">/</span>
                    <span className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 text-gray-600 rounded-xl font-bold">
                        {pagination.last_page}
                    </span>
                </div>

                <button
                    disabled={pagination.current_page === pagination.last_page}
                    onClick={() => fetchFiles(pagination.current_page + 1)}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                >
                    Sau
                </button>
            </div>
            {/* MODALS */}
            {viewingProduct && (
                <ProductMobileDetail
                    isOpen={!!viewingProduct}
                    onClose={() => setViewingProduct(null)}
                    product={viewingProduct}
                    mode="edit"
                    onRefresh={() => fetchFiles(pagination.current_page)}
                />
            )}
        </div>
    );
};

export default MediaLibrary;