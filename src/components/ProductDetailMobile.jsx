import React, { useState, useEffect } from 'react';
import { TabButton, EditableField, ToggleSwitch, SearchableSelect } from './ProductQvcComponents';
import { Modal, Button, Icon } from './ui';
import { toast } from 'react-hot-toast';
import { productApi } from '../api/admin/productApi';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Ảnh placeholder tĩnh (Base64 SVG) - Tuyệt đối không gọi tới bên thứ 3
const STATIC_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

const ProductDetailMobile = ({ isOpen, onClose, product, mode, onRefresh, dictionary }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Init Data
    useEffect(() => {
        if (mode === 'create') {
            setFormData({
                isOn: 1, proName: '', storeSKU: '', price: "0.00", quantity: 0,
                is_hot: 0, is_new: 1, is_best_sell: 0, is_sale_off: 0,
                is_student_support: 0, is_installment_0: 0,
                market_price: "0.00", purchase_price: "0.00", warranty: '',
                proSummary: '', specialOffer: '',
                ordering: 100,
                ...product
            });
        } else if (product) {
            // Mặc định nạp dữ liệu từ props list trước
            setFormData({ ...product });
            const fetchDetail = async () => {
                try {
                    const res = await productApi.getDetail(product.id);
                    // Backend trả về mapping mới, đảm bảo field khớp hoàn toàn
                    const fullData = res.data;
                    setFormData({
                        ...fullData,
                        // Mapping chuẩn từ JSON thực tế Backend trả về
                        brandId: fullData.brandId,
                        // Hỗ trợ Đa danh mục: Lấy toàn bộ chuỗi ,ID1,ID2, từ product_cat_web
                        catId: fullData.product_cat_web || (fullData.categories_list ? `,${fullData.categories_list.join(',')},` : ''),

                        price: fullData.price_web || fullData.price,
                        quantity: fullData.quantity_web || fullData.quantity,
                        warranty: fullData.warranty_web || fullData.warranty,
                        ordering: fullData.ordering_web || fullData.ordering_edit || fullData.ordering || 100,
                        specialOffer: fullData.specialOffer || fullData.details?.specialOffer || '',
                        // Add description and spec for Rich Text Editing
                        description: fullData.description || fullData.details?.description || '',
                        spec: fullData.spec || fullData.details?.spec || ''
                    });
                } catch (error) {
                    console.error("Lỗi fetch chi tiết:", error);
                    toast.error("Không thể tải chi tiết sản phẩm");
                }
            };
            if (product.id) fetchDetail();
        }
    }, [product, mode]);

    const handleSave = async () => {
        setIsSaving(true);
        // Chuẩn bị payload khớp 100% Backend mapping
        // Xử lý chuỗi catId cho Đa danh mục: [,12,34,]
        const catIds = Array.isArray(formData.catId) ? formData.catId : (formData.catId ? String(formData.catId).split(',').filter(Boolean) : []);
        const catIdString = catIds.length > 0 ? `,${catIds.join(',')},` : '';

        const payload = {
            ...formData,
            // Đảm bảo gửi đúng các trường Backend mong đợi
            catId: catIdString, // Gửi chuỗi IDs ngăn cách bởi dấu phẩy
            product_cat_web: catIdString, // Đảm bảo ghi đè trường này nếu Backend dùng nó
            price: formData.price,
            quantity: formData.quantity,
            ordering: formData.ordering,
            isOn: formData.isOn ? 1 : 0,
            is_hot: formData.is_hot ? 1 : 0,
            is_new: formData.is_new ? 1 : 0,
            is_best_sell: formData.is_best_sell ? 1 : 0,
            is_sale_off: formData.is_sale_off ? 1 : 0,
            is_student_support: formData.is_student_support ? 1 : 0,
            is_installment_0: formData.is_installment_0 ? 1 : 0,
            description: formData.description,
            spec: formData.spec
        };

        try {
            if (mode === 'create') {
                await productApi.create(payload);
                toast.success("Tạo mới thành công!");
            } else {
                await productApi.update(product.id, payload);
                toast.success("Cập nhật thành công!");
            }
            onRefresh();
            onClose();
        } catch (error) {
            toast.error("Lỗi lưu dữ liệu: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6 p-6 font-black">
                        <section className="bg-white p-6 rounded-3xl border-4 border-blue-50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Icon name="package" className="w-20 h-20" />
                            </div>
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                                Nhãn hàng & Định danh
                            </h4>
                            <div className="space-y-5 relative z-10">
                                <EditableField label="Tên sản phẩm hiển thị *" name="proName" localValue={formData.proName} originalWebValue={formData.proName} onChange={(v) => handleChange('proName', v)} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <EditableField label="Mã SKU (Quản lý) *" name="storeSKU" localValue={formData.storeSKU} originalWebValue={formData.storeSKU} onChange={(v) => handleChange('storeSKU', v)} />
                                    <SearchableSelect
                                        label="Nhãn hàng (Brand)"
                                        options={dictionary?.brands}
                                        value={formData.brandId}
                                        onChange={(v) => handleChange('brandId', v)}
                                        type="brand"
                                    />
                                </div>
                                <SearchableSelect
                                    label="Danh mục (Multi-Category)"
                                    options={dictionary?.categories}
                                    value={formData.catId}
                                    onChange={(v) => handleChange('catId', v)}
                                    type="category"
                                    multiple={true}
                                    placeholder="Chọn một hoặc nhiều danh mục..."
                                />
                            </div>
                        </section>

                        <section className="bg-white p-6 rounded-3xl border-4 border-orange-50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Icon name="shopping-cart" className="w-20 h-20" />
                            </div>
                            <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                                Thương mại & Kho vận
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                <EditableField label="Giá Bán niêm yết" name="price" type="number" localValue={formData.price} onChange={(v) => handleChange('price', v)} />
                                <EditableField label="Số lượng tồn kho" name="quantity" type="number" localValue={formData.quantity} onChange={(v) => handleChange('quantity', v)} />
                                <EditableField label="Giá Vốn (Purchase)" name="purchase_price" type="number" localValue={formData.purchase_price} onChange={(v) => handleChange('purchase_price', v)} />
                                <EditableField label="Thứ tự hiển thị (STT)" name="ordering" type="number" localValue={formData.ordering} onChange={(v) => handleChange('ordering', v)} />
                                <div className="md:col-span-2">
                                    <EditableField label="Chế độ Bảo hành" name="warranty" localValue={formData.warranty} onChange={(v) => handleChange('warranty', v)} />
                                </div>
                            </div>
                        </section>
                    </div>
                );

            case 'marketing':
                return (
                    <div className="p-6 space-y-6 font-black">
                        <section className="bg-white rounded-[2.5rem] border-4 border-green-50 p-8 shadow-sm relative overflow-hidden">
                            <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-8 flex items-center gap-2">
                                <Icon name="filter" className="w-4 h-4" />
                                Quản lý Trạng thái & Quảng cáo (Flags)
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                <div className="space-y-6 border-r pr-6 border-dashed border-gray-100">
                                    <ToggleSwitch label="CÔNG KHAI TRÊN WEB (ISON)" checked={formData.isOn == 1} onChange={(v) => handleChange('isOn', v ? 1 : 0)} color="green" />
                                    <ToggleSwitch label="Sản phẩm MỚI (NEW)" checked={formData.is_new == 1} onChange={(v) => handleChange('is_new', v ? 1 : 0)} color="blue" />
                                    <ToggleSwitch label="Sản phẩm HOT (Mạnh)" checked={formData.is_hot == 1} onChange={(v) => handleChange('is_hot', v ? 1 : 0)} color="orange" />
                                </div>
                                <div className="space-y-6">
                                    <ToggleSwitch label="HÀNG BÁN CHẠY (BEST)" checked={formData.is_best_sell == 1} onChange={(v) => handleChange('is_best_sell', v ? 1 : 0)} color="yellow" />
                                    <ToggleSwitch label="XẢ HÀNG (SALE OFF)" checked={formData.is_sale_off == 1} onChange={(v) => handleChange('is_sale_off', v ? 1 : 0)} color="red" />
                                    <ToggleSwitch label="HỖ TRỢ SINH VIÊN" checked={formData.is_student_support == 1} onChange={(v) => handleChange('is_student_support', v ? 1 : 0)} color="purple" />
                                    <ToggleSwitch label="TRẢ GÓP 0 ĐỒNG" checked={formData.is_installment_0 == 1} onChange={(v) => handleChange('is_installment_0', v ? 1 : 0)} color="indigo" />
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2.5rem] border-4 border-gray-50 p-8 shadow-sm">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Khuyến mãi & Quà tặng (specialOffer)</h4>
                            <textarea
                                className="w-full bg-gray-50 border-none rounded-3xl p-6 text-sm font-bold focus:bg-white focus:ring-4 ring-blue-50 outline-none transition-all min-h-[120px] leading-relaxed shadow-inner"
                                placeholder="Nhập quà tặng kèm, các thông tin ưu đãi hiển thị trên Web..."
                                value={formData.specialOffer || ''}
                                onChange={(e) => handleChange('specialOffer', e.target.value)}
                            />
                        </section>

                        <section className="bg-white rounded-[2.5rem] border-4 border-gray-50 p-8 shadow-sm">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Mô tả tóm tắt kỹ thuật (proSummary)</h4>
                            <textarea
                                className="w-full bg-gray-50 border-none rounded-3xl p-6 text-sm font-bold focus:bg-white focus:ring-4 ring-blue-50 outline-none transition-all min-h-[180px] leading-relaxed shadow-inner"
                                placeholder="Nhập các thông số nổi bật dưới dạng gạch đầu dòng..."
                                value={formData.proSummary || ''}
                                onChange={(e) => handleChange('proSummary', e.target.value)}
                            />
                        </section>
                    </div>
                );

            case 'content':
                return (
                    <div className="p-6 space-y-8 animate-fadeIn">
                        <section className="bg-white rounded-[2.5rem] border-4 border-blue-50 p-6 shadow-sm">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Icon name="file-text" className="w-4 h-4" />
                                BÀI VIẾT MÔ TẢ CHI TIẾT (DESCRIPTION)
                            </h4>
                            <div className="bg-gray-50 rounded-3xl overflow-hidden border-2 border-gray-100 focus-within:border-blue-500 transition-all">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.description || ''}
                                    onChange={(v) => handleChange('description', v)}
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, false] }],
                                            ['bold', 'italic', 'underline', 'strike'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                            ['link', 'image'],
                                            ['clean']
                                        ],
                                    }}
                                    placeholder="Viết mô tả sản phẩm tại đây..."
                                    className="bg-white"
                                />
                            </div>
                        </section>

                        <section className="bg-white rounded-[2.5rem] border-4 border-purple-50 p-6 shadow-sm">
                            <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Icon name="list" className="w-4 h-4" />
                                THÔNG SỐ KỸ THUẬT (SPECIFICATIONS)
                            </h4>
                            <div className="bg-gray-50 rounded-3xl overflow-hidden border-2 border-gray-100 focus-within:border-purple-500 transition-all">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.spec || ''}
                                    onChange={(v) => handleChange('spec', v)}
                                    modules={{
                                        toolbar: [
                                            ['bold', 'italic', 'underline'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                            ['clean']
                                        ],
                                    }}
                                    placeholder="Nhập thông số kỹ thuật chi tiết..."
                                    className="bg-white"
                                />
                            </div>
                        </section>

                        <style>{`
                            .ql-container { border-bottom-left-radius: 1.5rem; border-bottom-right-radius: 1.5rem; border: none !important; font-family: inherit; font-size: 0.875rem; min-h-[300px]; }
                            .ql-toolbar { border-top-left-radius: 1.5rem; border-top-right-radius: 1.5rem; border: none !important; border-bottom: 1px solid #f3f4f6 !important; background: #f9fafb; padding: 12px !important; }
                            .ql-editor { min-height: 300px; padding: 20px !important; line-height: 1.6; }
                            .ql-editor.ql-blank::before { color: #9ca3af; font-style: normal; font-weight: 600; }
                        `}</style>
                    </div>
                );

            case 'media':
                return (
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {formData.full_images?.map((img, idx) => (
                                <div key={idx} className="aspect-square rounded-[2rem] border-4 border-white overflow-hidden relative group hover:scale-105 transition-all bg-white shadow-lg">
                                    <img
                                        src={img.url}
                                        alt={img.alt || ""}
                                        className="w-full h-full object-contain p-2"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = STATIC_PLACEHOLDER;
                                        }}
                                    />
                                    {img.is_main && (
                                        <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">Bìa</div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                        <Button size="xs" variant="primary" className="rounded-full shadow-xl">Xem lớn</Button>
                                        <button className="text-white text-[10px] font-black uppercase hover:underline">Xóa ảnh</button>
                                    </div>
                                </div>
                            ))}
                            <button className="aspect-square rounded-[2rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400 hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all gap-3 bg-gray-50 shadow-inner group">
                                <div className="p-4 bg-gray-200 rounded-full group-hover:bg-blue-50 transition-colors">
                                    <Icon name="plus" className="w-8 h-8" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Upload Media</span>
                            </button>
                        </div>
                    </div>
                );

            case 'stats':
                return (
                    <div className="p-6 space-y-8 font-black">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Lượt xem (Visit)', value: formData.view_count || formData.details?.visit, color: 'text-blue-600', bg: 'bg-blue-50', icon: 'eye' },
                                { label: 'Yêu thích', value: formData.like_count, color: 'text-red-500', bg: 'bg-red-50', icon: 'heart' },
                                { label: 'Sản lượng Bán', value: formData.sold_count, color: 'text-green-600', bg: 'bg-green-50', icon: 'shopping-bag' },
                                { label: 'Kế hoạch Order', value: formData.order_count || 0, color: 'text-purple-600', bg: 'bg-purple-50', icon: 'clock' },
                            ].map((s, i) => (
                                <div key={i} className={`${s.bg} p-8 rounded-[2.5rem] border-4 border-white shadow-xl flex flex-col items-center justify-center gap-2 relative overflow-hidden group`}>
                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform">
                                        <Icon name={s.icon} className="w-24 h-24" />
                                    </div>
                                    <div className={`text-4xl font-black ${s.color} relative z-10`}>{s.value || 0}</div>
                                    <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] relative z-10">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Đồng bộ Hệ thống lần cuối</span>
                                <span className="text-xl font-black">{formData.updated_at || formData.details?.lastUpdate || '---'}</span>
                            </div>
                            <button onClick={() => toast.info('Chức năng lịch sử chỉnh sửa sắp ra mắt')} className="bg-white/10 hover:bg-white/20 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Xem Log lịch sử</button>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            isFullScreen={true}
            title={
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
                        <Icon name={mode === 'create' ? "plus" : "edit"} className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em]">QVC Admin Product Engine</div>
                            {formData.id && <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded font-black text-gray-500">ID: #{formData.id}</span>}
                        </div>
                        <h2 className="text-xl font-black text-gray-900 truncate pr-8 leading-tight">
                            {mode === 'create' ? "KHỞI TẠO SẢN PHẨM" : formData.proName}
                        </h2>
                    </div>
                </div>
            }
        >
            <div className="flex flex-col h-full bg-[#f8fafc]">
                <div className="flex border-b overflow-x-auto no-scrollbar bg-white/80 backdrop-blur-md sticky top-0 z-50 px-4 pt-4">
                    <TabButton title="📦 Cơ bản" activeTab={activeTab} name="general" setActiveTab={setActiveTab} />
                    <TabButton title="🚀 Marketing" activeTab={activeTab} name="marketing" setActiveTab={setActiveTab} />
                    <TabButton title="📝 Nội dung" activeTab={activeTab} name="content" setActiveTab={setActiveTab} />
                    <TabButton title="🎞️ Gallery" activeTab={activeTab} name="media" setActiveTab={setActiveTab} />
                    <TabButton title="💡 Thống kê" activeTab={activeTab} name="stats" setActiveTab={setActiveTab} />
                </div>

                <div className="flex-1 overflow-y-auto pb-32">
                    <div className="max-w-5xl mx-auto">
                        {renderContent()}
                    </div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t-2 border-gray-100 flex gap-4 z-[60] shadow-[0_-20px_40px_rgba(0,0,0,0.08)]">
                    <div className="max-w-5xl mx-auto w-full flex gap-4">
                        <Button variant="secondary" onClick={onClose} className="flex-1 py-5 text-xs font-black uppercase tracking-widest rounded-3xl border-4 border-gray-50 hover:bg-gray-50 transition-all">
                            Đóng lại
                        </Button>
                        <Button variant="primary" onClick={handleSave} className="flex-[3] py-5 text-xs font-black uppercase tracking-widest rounded-3xl shadow-2xl shadow-blue-200 transition-all hover:-translate-y-1 active:translate-y-0" disabled={isSaving}>
                            {isSaving ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>ĐANG ĐỒNG BỘ...</span>
                                </div>
                            ) : (mode === 'create' ? 'Tạo sản phẩm & Sync Web' : 'Lưu thay đổi & Sync Web')}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
export default ProductDetailMobile;
