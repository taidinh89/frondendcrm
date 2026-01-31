import React, { useState, useEffect, useCallback } from 'react';
import { metaApi } from '../api/admin/metaApi';
import { Icon, Button, Modal } from './ui';
import { ToggleSwitch, EditableField } from './ProductQvcComponents';
import { toast } from 'react-hot-toast';
import { productApi } from '../api/admin/productApi';
import axios from 'axios';

const BrandManager = () => {
    const [brands, setBrands] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    // Modal states
    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Xử lý Paste Event
    useEffect(() => {
        if (!isModalOpen) return;

        const handlePaste = async (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // A. Paste File
            if (e.clipboardData.files.length > 0) {
                e.preventDefault();
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    console.log("[DEBUG] Paste Image File into Brand:", file.name);
                    smartUploadHandler(file);
                }
            }
            // B. Paste URL
            else {
                const text = e.clipboardData.getData('text');
                if (text && (text.match(/\.(jpeg|jpg|gif|png|webp)$/i) || text.startsWith('http'))) {
                    console.log("[DEBUG] Paste Image URL into Brand:", text);
                    if (window.confirm(`Sử dụng ảnh từ liên kết này?\n${text}`)) {
                        uploadUrlHandler(text);
                    }
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [isModalOpen, formData.id]);

    const smartUploadHandler = async (file) => {
        if (!file) return;
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);
        formDataUpload.append('temp_context', `Brand ${formData.name || 'New'}`);
        formDataUpload.append('source', 'brand_manager');

        console.log("[DEBUG] Brand Smart Uploading:", file.name);
        const tid = toast.loading("Đang đẩy logo lên server...");
        try {
            const res = await productApi.smartUpload(formDataUpload);
            console.log("[DEBUG] Brand Smart Upload Success:", res.data);

            const newImage = res.data;
            // image_url hoặc url tùy backend trả về, ưu tiên url
            const finalUrl = newImage.url || newImage.image_url;
            setFormData(prev => ({ ...prev, image: finalUrl }));
            toast.success("Đã cập nhật Logo tạm (Bấm Lưu để hoàn tất)", { id: tid });
        } catch (e) {
            console.error("[DEBUG] Brand Smart Upload Error:", e);
            toast.error("Lỗi: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const uploadUrlHandler = async (url) => {
        if (!url) return;
        console.log("[DEBUG] Brand Link Detection:", url);
        setFormData(prev => ({ ...prev, image: url }));
        toast.success("Đã nhận link logo! Bấm Lưu để đồng bộ.");
    };

    const fetchBrands = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const res = await metaApi.getBrands({
                search: search || undefined,
                page,
                per_page: 24
            });
            setBrands(res.data.data || []);
            setPagination({
                current_page: res.data.current_page,
                last_page: res.data.last_page,
                total: res.data.total
            });
        } catch (error) {
            toast.error("Không thể tải danh sách thương hiệu");
        } finally {
            setIsLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(() => fetchBrands(1), 500);
        return () => clearTimeout(timer);
    }, [fetchBrands]);

    const handleEdit = (brand) => {
        setSelectedItem(brand);
        setFormData({ ...brand });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        console.log("[DEBUG] Saving Brand:", formData.id, "Payload:", formData);
        try {
            await metaApi.updateBrand(selectedItem.id, formData);
            console.log("[DEBUG] Brand Update Success");
            toast.success("Cập nhật thương hiệu thành công!");
            setIsModalOpen(false);
            fetchBrands(pagination.current_page);
        } catch (error) {
            console.error("[DEBUG] Brand Save Error:", error);
            toast.error("Lỗi cập nhật: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    // Hàm chuẩn hóa URL hiển thị
    const getDisplayUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url.replace(/\\/g, '/');
        if (url.startsWith('//')) return `https:${url}`.replace(/\\/g, '/');
        if (url.startsWith('/storage')) return (window.location.origin + url).replace(/\\/g, '/');
        if (url.startsWith('/media')) return `https://qvc.vn${url}`.replace(/\\/g, '/');
        return (window.location.origin + '/storage/' + url).replace(/\\/g, '/');
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-24 font-sans text-gray-900">
            {/* Header */}
            <div className="bg-white border-b px-6 py-8 shadow-sm sticky top-0 md:static z-[40]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-600 p-2 rounded-xl text-white shadow-lg shadow-orange-100">
                                <Icon name="award" className="w-6 h-6" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase">Thương hiệu QVC</h1>
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1 ml-11">Hệ thống đối tác & Nhãn hàng chiến lược</p>
                    </div>
                    <div className="bg-orange-50/50 px-8 py-4 rounded-[2.5rem] border-4 border-white flex items-center gap-8 shadow-inner ring-1 ring-orange-100">
                        <div className="text-center group">
                            <div className="text-3xl font-black text-orange-600 group-hover:scale-110 transition-transform">{pagination.total}</div>
                            <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest text-center">Nhãn hàng</div>
                        </div>
                        <div className="w-[2px] h-10 bg-orange-100/50 rounded-full"></div>
                        <button className="bg-orange-600 text-white p-4 rounded-3xl shadow-xl shadow-orange-200 hover:bg-orange-700 active:scale-90 transition-all">
                            <Icon name="plus" className="w-7 h-7" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="max-w-7xl mx-auto px-4 mt-10">
                <div className="bg-white/60 backdrop-blur-2xl p-4 rounded-[3rem] shadow-2xl border-4 border-white flex flex-col md:flex-row gap-4 items-center mb-12">
                    <div className="flex-1 w-full relative group">
                        <Icon name="search" className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-orange-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Gõ tên nhãn hàng cần tìm..."
                            className="w-full pl-16 pr-8 py-5 bg-gray-50 border-transparent rounded-[2.2rem] text-sm font-black focus:bg-white focus:ring-8 ring-orange-50 transition-all outline-none shadow-inner"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-48 gap-8">
                        <div className="w-20 h-20 border-[8px] border-orange-50 border-t-orange-600 rounded-full animate-spin"></div>
                        <p className="text-gray-400 font-extrabold text-[10px] uppercase tracking-[0.4em] animate-pulse">Loading Brands...</p>
                    </div>
                ) : brands.length === 0 ? (
                    <div className="text-center py-48 bg-white rounded-[4rem] border-8 border-dashed border-gray-50 flex flex-col items-center justify-center shadow-inner scale-95 opacity-60 font-black">
                        <Icon name="search" className="w-24 h-24 text-gray-200 mb-8" />
                        <p className="text-gray-900 text-2xl uppercase tracking-widest">Không có nhãn hàng</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8">
                        {brands.map(brand => (
                            <div key={brand.id}
                                onClick={() => handleEdit(brand)}
                                className="bg-white rounded-[3rem] p-6 shadow-xl border-4 border-white hover:border-orange-500/10 transition-all group cursor-pointer flex flex-col items-center text-center relative overflow-hidden"
                            >
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                                        <Icon name="edit" className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className="w-24 h-24 rounded-[2rem] bg-gray-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 overflow-hidden border-4 border-white shadow-inner relative">
                                    {brand.image ? (
                                        <img src={getDisplayUrl(brand.image)} alt={brand.name} className="w-full h-full object-contain p-4" />
                                    ) : (
                                        <Icon name="award" className="w-10 h-10 text-gray-200" />
                                    )}
                                </div>

                                <h3 className="text-sm font-black text-gray-900 group-hover:text-orange-600 transition-colors uppercase leading-tight line-clamp-2 min-h-[2.5rem] px-2">
                                    {brand.name}
                                </h3>

                                <div className={`mt-4 text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${brand.is_active ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-gray-100 text-gray-400'}`}>
                                    {brand.is_active ? 'Công khai' : 'Tạm ẩn'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.last_page > 1 && (
                    <div className="mt-16 flex flex-wrap justify-center gap-3">
                        {Array.from({ length: pagination.last_page }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => fetchBrands(i + 1)}
                                className={`w-12 h-12 rounded-2xl font-black text-xs transition-all border-4 ${pagination.current_page === i + 1 ? 'bg-orange-600 border-orange-100 text-white shadow-2xl scale-125 z-10' : 'bg-white border-white text-gray-400 shadow-lg hover:border-orange-100'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Edit Brand - Beautiful Redesign */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                isFullScreen={true}
                title={
                    <div className="flex items-center gap-4 text-left">
                        <div className="bg-orange-600 p-2.5 rounded-2xl text-white shadow-lg shadow-orange-100">
                            <Icon name="award" className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Brand Engine</div>
                            <h2 className="text-xl font-black text-gray-900 truncate uppercase mt-0.5 max-w-[300px] md:max-w-md">{formData.name || 'Thương hiệu'}</h2>
                        </div>
                    </div>
                }
            >
                <div className="flex flex-col h-full bg-[#f8fafc]">
                    <div className="flex-1 overflow-y-auto pb-32 pt-6">
                        <div className="max-w-4xl mx-auto px-6 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* Logo Section */}
                                <section
                                    className="bg-white rounded-[2.8rem] p-8 shadow-xl border border-gray-100/50 flex flex-col items-center justify-center text-center group relative overflow-hidden transition-all hover:bg-orange-50/5 cursor-pointer"
                                    onClick={() => document.getElementById('brand-logo-upload').click()}
                                >
                                    <div className="w-36 h-36 rounded-[2.5rem] bg-gray-50 flex items-center justify-center mb-0 border-4 border-white shadow-inner relative group-hover:scale-105 transition-transform duration-500">
                                        {formData.image ? (
                                            <img src={getDisplayUrl(formData.image)} className="w-full h-full object-contain p-6" />
                                        ) : (
                                            <Icon name="image" className="w-12 h-12 text-gray-200" />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-orange-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2.8rem]">
                                        <span className="text-white font-black text-[9px] uppercase tracking-widest">Thay đổi Logo</span>
                                    </div>
                                    <input
                                        type="file"
                                        id="brand-logo-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files[0]) smartUploadHandler(e.target.files[0]);
                                            e.target.value = null;
                                        }}
                                    />
                                </section>

                                {/* Core Config */}
                                <section className="md:col-span-3 bg-white rounded-[2.8rem] p-8 shadow-xl border border-gray-100/50 space-y-8 flex flex-col justify-center">
                                    <EditableField label="Tên Thương hiệu *" value={formData.name} onChange={(v) => setFormData(p => ({ ...p, name: v }))} hideOriginal />

                                    <div className="pt-6 border-t border-gray-50 flex items-center justify-between px-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái đối tác</span>
                                            <span className="text-[9px] font-bold text-gray-400 italic">Hiển thị Thương hiệu này ngoài website</span>
                                        </div>
                                        <ToggleSwitch label="" checked={formData.is_active} onChange={(v) => setFormData(p => ({ ...p, is_active: v }))} color="orange" />
                                    </div>
                                </section>
                            </div>

                            {/* SEO Deep Panel */}
                            <section className="bg-white rounded-[2.8rem] p-10 shadow-xl border border-gray-100/50 space-y-10">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Icon name="search" className="w-4 h-4" />
                                    Marketing & SEO Profile
                                </h4>

                                <div className="space-y-10">
                                    <EditableField label="Mô tả tóm tắt (Summary)" type="textarea" value={formData.summary} onChange={(v) => setFormData(p => ({ ...p, summary: v }))} hideOriginal rows={2} />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-8">
                                            <EditableField label="SEO Meta Title" value={formData.meta_title} onChange={(v) => setFormData(p => ({ ...p, meta_title: v }))} hideOriginal />
                                            <EditableField label="SEO Keywords" type="textarea" value={formData.meta_keyword} onChange={(v) => setFormData(p => ({ ...p, meta_keyword: v }))} hideOriginal rows={3} />
                                        </div>
                                        <EditableField label="SEO Description" type="textarea" value={formData.meta_description} onChange={(v) => setFormData(p => ({ ...p, meta_description: v }))} hideOriginal rows={6} />
                                    </div>
                                </div>
                            </section>

                            {/* System Status */}
                            <div className="bg-gray-900 rounded-[2.8rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                                    <Icon name="award" className="w-48 h-48" />
                                </div>
                                <div className="flex flex-col gap-1 relative z-10">
                                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.4em]">Brand Database Index</span>
                                    <span className="text-xl font-black text-orange-400">PARTNER ID: #{formData.id}</span>
                                </div>
                                <div className="flex flex-col items-center md:items-end gap-1 relative z-10 font-black">
                                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">Thời gian đồng bộ</span>
                                    <span className="text-xs italic text-gray-400">{formData.updated_at ? new Date(formData.updated_at).toLocaleString('vi-VN') : '---'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-3xl border-t-2 z-[60] shadow-[0_-30px_60px_rgba(0,0,0,0.1)]">
                        <div className="max-w-4xl mx-auto flex gap-5">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-[2.2rem] font-black uppercase text-xs tracking-widest border-4 border-gray-50 bg-white">Đóng lại</Button>
                            <Button variant="primary" onClick={handleSave} className="bg-orange-600 flex-[3] py-5 rounded-[2.2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-orange-200 hover:-translate-y-1 transition-all" disabled={isSaving}>
                                {isSaving ? "Đang xử lý..." : "Cập nhật & Đồng bộ QVC"}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default BrandManager;
