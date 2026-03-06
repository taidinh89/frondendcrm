import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useApiData } from '../../hooks/useApiData';
import UnifiedMediaManagerModal from '../../components/Modals/UnifiedMediaManagerModal';

export default function NewsFeedManager() {
    const { data: resp, isLoading, refetch } = useApiData('/api/v3/admin/news-feed');
    const posts = Array.isArray(resp) ? resp : (resp?.data || []);
    const [isDeleting, setIsDeleting] = useState(null);

    const [content, setContent] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const [isPosting, setIsPosting] = useState(false);

    const handleCreatePost = async () => {
        if (!content.trim() && selectedImages.length === 0) {
            return toast.error("Vui lòng nhập nội dung hoặc chọn ảnh!");
        }
        setIsPosting(true);
        try {
            await axios.post('/api/v3/app/news-feed', {
                content,
                images: selectedImages.map(img => img.url || img.preview_url)
            });
            toast.success('Đã đăng bài viết mới thành công! 🎉');
            setContent('');
            setSelectedImages([]);
            refetch();
        } catch (e) {
            toast.error('Lỗi khi đăng bài viết!');
        } finally {
            setIsPosting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Anh có chắc muốn xóa bài viết này vĩnh viễn không?')) return;
        setIsDeleting(id);
        try {
            await axios.delete(`/api/v3/admin/news-feed/${id}`);
            toast.success('Đã xóa bài viết! 🗑️');
            refetch();
        } catch (e) {
            toast.error('Lỗi khi xóa bài viết');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleToggleStatus = async (post) => {
        const newStatus = post.status === 'active' ? 'hidden' : 'active';
        try {
            await axios.put(`/api/v3/admin/news-feed/${post.id}`, { status: newStatus });
            toast.success(`Đã ${newStatus === 'active' ? 'Kích hoạt' : 'Ẩn'} bài viết!`);
            refetch();
        } catch (e) {
            toast.error('Lỗi khi cập nhật trạng thái');
        }
    };

    if (isLoading) return <div className="p-20 text-center font-black animate-pulse text-slate-300">ĐANG TẢI BẢNG TIN...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded italic">MODERATION</span>
                        <h1 className="text-5xl font-black text-slate-800 tracking-tighter italic">News Feed <span className="text-blue-600">Admin</span></h1>
                    </div>
                    <p className="text-slate-500 font-bold ml-1">Kiểm duyệt và quản lý toàn bộ bài đăng từ cộng đồng QVC</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-10 px-8">
                        <div className="text-center">
                            <div className="text-2xl font-black text-slate-800">{posts.length}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng bài viết</div>
                        </div>
                        <div className="text-center border-l border-slate-100 pl-10">
                            <div className="text-2xl font-black text-emerald-500">{posts.filter(p => p.status === 'active').length}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang hiển thị</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Post Form */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8 flex flex-col gap-4">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Bạn đang nghĩ gì?"
                    className="w-full bg-slate-50 border-none rounded-3xl p-6 outline-none resize-none h-32 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400"
                />

                {/* Image Preview Area */}
                {selectedImages.length > 0 && (
                    <div className="flex gap-4 overflow-x-auto py-2">
                        {selectedImages.map((img, idx) => (
                            <div key={idx} className="relative w-28 h-28 rounded-2xl overflow-hidden border-4 border-white shadow-md shrink-0 group">
                                <img src={img.url || img.preview_url} className="w-full h-full object-cover" alt="" />
                                <button
                                    onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >✕</button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-2">
                    <button
                        onClick={() => setIsMediaOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[11px] uppercase tracking-wider hover:bg-emerald-100 transition-colors"
                    >
                        🖼️ Thêm Ảnh / Media
                    </button>
                    <button
                        onClick={handleCreatePost}
                        disabled={isPosting || (!content.trim() && selectedImages.length === 0)}
                        className="px-10 py-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 font-black text-[13px] uppercase tracking-wider hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-blue-600"
                    >
                        {isPosting ? 'ĐANG ĐĂNG...' : 'ĐĂNG BÀI'}
                    </button>
                </div>
            </div>

            <UnifiedMediaManagerModal
                isOpen={isMediaOpen}
                onClose={() => setIsMediaOpen(false)}
                onSelect={(images) => {
                    const newImages = Array.isArray(images) ? images : [images];
                    // Lọc những ảnh đã có
                    const existingUrls = selectedImages.map(img => img.url || img.preview_url);
                    const filtered = newImages.filter(img => !existingUrls.includes(img.url || img.preview_url));
                    setSelectedImages(prev => [...prev, ...filtered]);
                }}
            />

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map(post => (
                    <div key={post.id} className={`bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:border-blue-100 group ${post.status !== 'active' ? 'opacity-60 bg-slate-50' : ''}`}>
                        {/* Post Header */}
                        <div className="p-6 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-md">
                                    {post.user?.avatar ? (
                                        <img src={post.user.avatar} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-slate-400 to-slate-500 text-white font-black">
                                            {post.user?.name?.charAt(0) || 'U'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{post.user?.name || 'Vô danh'}</span>
                                    <span className="text-[9px] font-bold text-slate-400 italic">{new Date(post.created_at).toLocaleString('vi-VN')}</span>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${post.status === 'active' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-200 text-slate-500'}`}>
                                {post.status === 'active' ? 'Đang hiện' : 'Đã ẩn'}
                            </div>
                        </div>

                        {/* Post Content */}
                        <div className="px-6 flex-1">
                            <p className="text-sm font-bold text-slate-600 leading-relaxed mb-4 line-clamp-3 italic">"{post.content}"</p>

                            {/* Images grid (if any) */}
                            {post.images && post.images.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-4 rounded-3xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                                    {post.images.slice(0, 4).map((img, i) => (
                                        <div key={i} className="aspect-square bg-slate-100 overflow-hidden border border-slate-50">
                                            <img src={img} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {post.images.length > 4 && (
                                        <div className="absolute bottom-6 right-6 bg-black/60 text-white text-[10px] font-black px-2 py-1 rounded-lg">+{post.images.length - 4}</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Stats & Actions */}
                        <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-blue-500 text-xs">👍</span>
                                    <span className="text-[10px] font-black text-slate-400 tracking-tighter">{post.likes_count || 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                                    <span className="text-slate-400 text-xs">💬</span>
                                    <span className="text-[10px] font-black text-slate-400 tracking-tighter">{post.comments_count || 0}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleToggleStatus(post)}
                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all ${post.status === 'active' ? 'bg-white text-slate-400 hover:text-amber-500' : 'bg-emerald-500 text-white shadow-emerald-200'}`}
                                    title={post.status === 'active' ? 'Ẩn bài viết' : 'Hiện bài viết'}
                                >
                                    {post.status === 'active' ? '👁️' : '✨'}
                                </button>
                                <button
                                    onClick={() => handleDelete(post.id)}
                                    disabled={isDeleting === post.id}
                                    className="w-10 h-10 bg-white text-red-400 rounded-2xl shadow-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                >
                                    {isDeleting === post.id ? '...' : '🗑️'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {posts.length === 0 && (
                    <div className="col-span-full py-40 text-center bg-white border-2 border-dashed border-slate-100 rounded-[60px]">
                        <span className="text-6xl grayscale opacity-20 block mb-6">🏜️</span>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Bảng tin hiện đang trống</p>
                    </div>
                )}
            </div>
        </div>
    );
}
