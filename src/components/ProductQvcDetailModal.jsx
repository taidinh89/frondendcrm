// src/components/products/ProductQvcDetailModal.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { debounce } from 'lodash';
import { Modal, Button, Icon } from './ui.jsx';
import { toast } from 'react-hot-toast';

// --- IMPORTS MỚI ---
import { productApi } from '../api/admin/productApi.js';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Import component con (Giữ nguyên component cũ của bạn)
import { EditableField, TabButton } from './ProductQvcComponents.jsx';

// ==========================================================
// === CẤU HÌNH ===
// ==========================================================
const API_CAT_URL = 'https://qvc.vn/listcat.php';

export const ProductQvcDetailModal = ({ product, isOpen, onClose }) => {
    const [detailProduct, setDetailProduct] = useState(product);
    const [localData, setLocalData] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(true);
    const [activeTab, setActiveTab] = useState('basic');
    const [categories, setCategories] = useState([]);

    // State riêng cho Media
    const [isUploading, setIsUploading] = useState(false);

    // ----------------------------------------------------
    // --- 1. LOAD DỮ LIỆU ĐẦY ĐỦ ---
    // ----------------------------------------------------
    const fetchFullDetail = useCallback(async () => {
        // Chỉ hiện loading nếu chưa có ảnh (để tránh nháy màn hình khi thao tác ảnh)
        if (!detailProduct.full_images) setIsLoadingDetail(true);

        try {
            const response = await productApi.getDetail(product.id);
            const fullData = response.data;

            // Logic tìm trạng thái isOn
            let currentIsOn = fullData.isOn;
            if (currentIsOn === undefined || currentIsOn === null) {
                currentIsOn = fullData.details?.isOn;
            }
            if (currentIsOn === undefined) currentIsOn = 1;

            const preparedLocalData = {
                ...fullData,
                isOn: currentIsOn
            };

            setDetailProduct(fullData);
            setLocalData(preparedLocalData);

        } catch (error) {
            console.error("Lỗi tải chi tiết:", error);
            toast.error("Không thể tải dữ liệu chi tiết.");
        } finally {
            setIsLoadingDetail(false);
        }
    }, [product.id]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get(API_CAT_URL);
                const rawCategories = response.data.map(cat => ({
                    value: String(cat.value),
                    label: cat.label
                }));
                setCategories(rawCategories);
            } catch (error) { console.error("Lỗi danh mục:", error); }
        };

        if (isOpen) {
            fetchFullDetail();
            if (categories.length === 0) fetchCategories();
        }
    }, [product.id, isOpen, fetchFullDetail]);

    // ----------------------------------------------------
    // --- 2. XỬ LÝ SYNC (AUTO-SAVE) ---
    // ----------------------------------------------------
    const executeSync = async (name, value) => {
        const payload = { [name]: value };
        const originalValue = detailProduct[name];

        if (value == originalValue) return;

        try {
            setIsUpdating(true);
            const response = await productApi.update(detailProduct.id, payload);

            const updatedProduct = response.data.product;
            // Merge cẩn thận để không mất full_images
            setDetailProduct(prev => ({ ...prev, ...updatedProduct, full_images: prev.full_images }));
            setLocalData(prev => ({ ...updatedProduct, isOn: value }));

        } catch (error) {
            console.error(`Sync lỗi ${name}:`, error);
            setDetailProduct(prev => ({ ...prev, needs_sync: true })); // Đánh dấu lỗi
        } finally {
            setIsUpdating(false);
        }
    };

    const syncFieldDebounced = useMemo(() => debounce(executeSync, 1500), [detailProduct.id]);

    const handleLocalChange = useCallback((e) => {
        const { name, value, type } = e.target;
        let processedValue = value;

        if (type === 'number') {
            processedValue = value === '' ? null : (name.includes('quantity') || name.includes('ordering') ? parseInt(value) : parseFloat(value));
        } else if (type === 'radio') {
            processedValue = (value === '1' || value === 'true') ? 1 : 0;
        }

        setLocalData(prev => ({ ...prev, [name]: processedValue }));
        syncFieldDebounced(name, processedValue);
    }, [syncFieldDebounced]);

    const handleBlur = (e) => {
        const { name } = e.target;
        syncFieldDebounced.cancel();
        executeSync(name, localData[name]);
    };

    // --- HANDLER CHO EDITOR & TAGS ---
    const handleDescriptionChange = (content) => setLocalData(prev => ({ ...prev, description: content }));

    const saveDescription = () => {
        executeSync('description', localData.description);
        toast.success("Đã lưu bài viết mô tả!");
    };

    const handleCategoryChange = (selectedOptions) => {
        const newIds = selectedOptions.map(opt => opt.value).join(',');
        executeSync('product_cat', newIds);
    };

    // ----------------------------------------------------
    // --- 3. QUẢN LÝ ẢNH (GỌI API THẬT) ---
    // ----------------------------------------------------
    const handleUploadImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setIsUploading(true);
        const toastId = toast.loading("Đang tải ảnh lên & Sync QVC...");

        try {
            await productApi.uploadImage(detailProduct.id, formData);
            toast.success("Upload thành công!", { id: toastId });
            fetchFullDetail(); // Reload để thấy ảnh mới
        } catch (error) {
            toast.error("Lỗi upload: " + (error.response?.data?.message || error.message), { id: toastId });
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    const handleSetMainImage = async (mediaId) => {
        try {
            await productApi.setMainImage(detailProduct.id, mediaId);
            toast.success("Đã cập nhật ảnh đại diện");
            fetchFullDetail();
        } catch (error) {
            toast.error("Lỗi đặt ảnh chính");
        }
    };

    const handleDeleteImage = async (mediaId, imageName = null) => {
        if (!window.confirm("CẢNH BÁO: Ảnh sẽ bị xóa vĩnh viễn khỏi Web QVC. Tiếp tục?")) return;

        const toastId = toast.loading("Đang xóa ảnh...");
        try {
            if (mediaId) {
                // Xóa ảnh Mới (Có ID)
                await productApi.deleteImage(detailProduct.id, mediaId);
            } else if (imageName) {
                // Xóa ảnh Cũ (Dựa theo tên)
                await productApi.deleteOldImageByName(detailProduct.id, imageName);
            }

            toast.success("Đã xóa ảnh thành công!", { id: toastId });
            fetchFullDetail(); // Reload lại danh sách
        } catch (error) {
            console.error(error);
            toast.error("Lỗi xóa ảnh: " + (error.response?.data?.message || "Lỗi hệ thống"), { id: toastId });
        }
    };

    // ----------------------------------------------------
    // --- 4. RENDER GIAO DIỆN ---
    // ----------------------------------------------------
    const renderHeader = () => {
        const productUrl = detailProduct.request_path
            ? `https://qvc.vn${detailProduct.request_path.startsWith('/') ? '' : '/'}${detailProduct.request_path}`
            : `https://qvc.vn/${detailProduct.url}.html`;

        return (
            <a href={productUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-800 hover:text-blue-600 transition-colors">
                <span className="font-semibold text-lg truncate">{detailProduct.proName}</span>
                <Icon name="external-link" className="w-4 h-4 flex-shrink-0" />
            </a>
        );
    };

    const renderContent = () => {
        const checkIsOn = (val) => val === 1 || val === '1' || val === true;

        switch (activeTab) {
            case 'basic':
                return (
                    <div className="grid grid-cols-2 gap-4 h-full">
                        <div className="space-y-4">
                            <EditableField label="Tên sản phẩm" localValue={localData.proName} originalWebValue={detailProduct.proName} name="proName" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} type="text" />
                            <EditableField label="Mã SKU (StoreSKU)" localValue={localData.storeSKU} originalWebValue={detailProduct.storeSKU} name="storeSKU" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} type="text" />
                        </div>
                        <div className="h-full">
                            <EditableField label="Tóm tắt ngắn" localValue={localData.proSummary} originalWebValue={detailProduct.proSummary} name="proSummary" type="textarea" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} rows={5} />
                        </div>
                    </div>
                );

            case 'content': // TAB BÀI VIẾT (EDITOR)
                return (
                    <div className="flex flex-col h-full space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-700">Mô tả chi tiết (HTML)</label>
                            <Button size="sm" onClick={saveDescription} disabled={isUpdating} variant="primary">
                                <Icon name="save" className="mr-1" /> Lưu bài viết
                            </Button>
                        </div>
                        <div className="flex-1 bg-white border rounded-lg overflow-hidden flex flex-col">
                            <ReactQuill
                                theme="snow"
                                value={localData.description || ''}
                                onChange={handleDescriptionChange}
                                className="h-full flex flex-col react-quill-container"
                                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                modules={{
                                    toolbar: [
                                        [{ 'header': [1, 2, 3, false] }],
                                        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                                        [{ 'color': [] }, { 'background': [] }],
                                        ['link', 'image', 'video'],
                                        ['clean']
                                    ],
                                }}
                            />
                        </div>
                        <style>{`.react-quill-container .ql-container { flex: 1; overflow-y: auto; }`}</style>
                    </div>
                );

            case 'images': // TAB HÌNH ẢNH (LIVE DATA)
                const images = detailProduct.full_images || [];
                return (
                    <div className="bg-white p-4 rounded-lg border h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <div>
                                <h3 className="font-medium text-gray-800">Thư viện ảnh ({images.length})</h3>
                                <p className="text-xs text-gray-500">Ảnh đã được đồng bộ 2 chiều với QVC</p>
                            </div>
                            <label className={`btn bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Icon name="upload" className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
                                {isUploading ? 'Đang xử lý...' : 'Tải ảnh lên'}
                                <input type="file" className="hidden" accept="image/*" onChange={handleUploadImage} disabled={isUploading} />
                            </label>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            {images.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded border border-dashed text-gray-400">
                                    <Icon name="image" className="w-12 h-12 mb-2 opacity-50" />
                                    <span>Chưa có hình ảnh nào.</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {images.map((img, idx) => (
                                        <div key={img.id || idx} className={`relative group border rounded-lg overflow-hidden aspect-square bg-gray-100 shadow-sm transition-shadow ${img.is_main ? 'ring-2 ring-green-500' : 'hover:shadow-md'}`}>
                                            <img
                                                src={img.url}
                                                alt={img.name}
                                                className="w-full h-full object-contain p-1"
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.target.onerror = null; // 1. QUAN TRỌNG: Ngắt vòng lặp ngay lập tức
                                                    // 2. Thay bằng ảnh màu xám đơn giản (Base64 SVG) - Không cần gọi server nào cả
                                                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
                                                }}
                                            />

                                            {/* Overlay Actions */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                                <a href={img.url} target="_blank" rel="noreferrer" className="text-white text-xs hover:underline mb-1">Xem lớn</a>

                                                {/* Nút Đặt đại diện (Chỉ hiện cho ảnh mới có ID) */}
                                                {!img.is_main && img.id && (
                                                    <button onClick={() => handleSetMainImage(img.id)} className="bg-white text-blue-600 text-xs px-3 py-1.5 rounded shadow font-medium w-full hover:bg-blue-50">Đặt đại diện</button>
                                                )}

                                                {/* Nút Xóa (Dùng chung cho cả 2 loại) */}
                                                <button
                                                    onClick={() => handleDeleteImage(img.id, img.name)}
                                                    className="bg-white text-red-600 text-xs px-3 py-1.5 rounded shadow font-medium w-full hover:bg-red-50"
                                                >
                                                    {img.id ? 'Xóa ảnh' : 'Xóa ảnh cũ'}
                                                </button>
                                            </div>
                                            {img.is_main && <div className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10">Đại diện</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'seo': // TAB SEO & TAGS (MỚI)
                return (
                    <div className="space-y-4">
                        <EditableField label="Thẻ Tags (Ngăn cách bằng dấu phẩy)" localValue={localData.tags} originalWebValue={detailProduct.tags} name="tags" type="text" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} />
                        <div className="border-t pt-4"></div>
                        <EditableField label="Meta Title (Tiêu đề SEO)" localValue={localData.meta_title} originalWebValue={detailProduct.meta_title} name="meta_title" type="text" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} />
                        <EditableField label="Meta Keyword (Từ khóa)" localValue={localData.meta_keyword} originalWebValue={detailProduct.meta_keyword} name="meta_keyword" type="textarea" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} rows={2} />
                        <EditableField label="Meta Description (Mô tả SEO)" localValue={localData.meta_description} originalWebValue={detailProduct.meta_description} name="meta_description" type="textarea" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} rows={3} />
                    </div>
                );

            case 'category':
                const currentCategoryIds = detailProduct.product_cat_web ? String(detailProduct.product_cat_web).split(',').map(id => id.trim()).filter(Boolean) : [];
                const selectedCategoryOptions = currentCategoryIds.map(id => categories.find(cat => String(cat.value) === id)).filter(Boolean);
                return (
                    <div className="p-4 border rounded-lg bg-white h-full">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quản lý Danh mục</label>
                        <div className="h-[400px]">
                            <Select options={categories} isMulti value={selectedCategoryOptions} onChange={handleCategoryChange} isDisabled={isUpdating} placeholder="Tích chọn danh mục..." className="text-sm" menuPortalTarget={document.body} styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} />
                        </div>
                    </div>
                );

            case 'promo_warranty': // TAB KHUYẾN MÃI & TRẠNG THÁI
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="space-y-4 col-span-1">
                            <div className="p-4 border rounded-lg bg-white shadow-sm">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái Hiển thị</label>
                                <div className="flex flex-col space-y-2 mt-2">
                                    <label className="inline-flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <input type="radio" name="isOn" value="1" checked={checkIsOn(localData.isOn)} onChange={handleLocalChange} className="form-radio text-blue-600 h-4 w-4" />
                                        <span className="ml-2 text-sm text-gray-800">Hiển thị (On)</span>
                                    </label>
                                    <label className="inline-flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <input type="radio" name="isOn" value="0" checked={!checkIsOn(localData.isOn)} onChange={handleLocalChange} className="form-radio text-red-600 h-4 w-4" />
                                        <span className="ml-2 text-sm text-gray-800">Ẩn (Off)</span>
                                    </label>
                                </div>
                            </div>
                            <EditableField label="Bảo hành" localValue={localData.warranty_edit} originalWebValue={detailProduct.warranty_web} name="warranty_edit" type="textarea" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} rows={3} />
                        </div>
                        <div className="col-span-1 lg:col-span-2">
                            <EditableField label="Khuyến mại đặc biệt" localValue={localData.specialOffer} originalWebValue={detailProduct.specialOffer} name="specialOffer" type="textarea" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} rows={10} />
                        </div>
                    </div>
                );

            case 'advanced':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-6">
                            <EditableField label="Giá bán (Price)" localValue={localData.price_edit} originalWebValue={detailProduct.price_web} name="price_edit" type="number" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} />
                            <EditableField label="Tồn kho (Quantity)" localValue={localData.quantity_edit} originalWebValue={detailProduct.quantity_web} name="quantity_edit" type="number" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} />
                            <EditableField label="Giá nhập" localValue={localData.purchase_price_edit} originalWebValue={detailProduct.purchase_price_web} name="purchase_price_edit" type="number" onChange={handleLocalChange} onBlur={handleBlur} isUpdating={isUpdating} />
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    if (!detailProduct || isLoadingDetail) return <Modal isOpen={isOpen} onClose={onClose} title="Đang tải..." maxWidthClass="max-w-4xl"><div className="p-10 text-center text-gray-500">Đang tải dữ liệu đầy đủ...</div></Modal>;

    return (
        <Modal isOpen={isOpen} onClose={() => onClose()} title={renderHeader()} maxWidthClass="max-w-7xl" isFullHeight={true} className="sm:min-h-full">
            <div className="flex border-b flex-wrap bg-gray-50">
                <TabButton title="Cơ bản" name="basic" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton title="Bài viết (Mô tả)" name="content" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton title="Hình ảnh" name="images" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton title="SEO & Tags" name="seo" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton title="Khuyến mãi & BH" name="promo_warranty" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton title="Danh mục" name="category" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton title="Giá & Nâng cao" name="advanced" activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            <div className="p-6 space-y-6 overflow-y-auto bg-gray-50/50" style={{ maxHeight: 'calc(100vh - 150px)', minHeight: '500px' }}>
                <div className="text-sm text-blue-600 mb-2 flex items-center justify-between">
                    <div className="flex items-center"><Icon name="info" className="w-4 h-4 mr-1" /><span>{isUpdating ? 'Đang đồng bộ...' : 'Thay đổi sẽ tự động đồng bộ sau 1.5s.'}</span></div>
                    <span className="text-xs text-gray-400">ID: {detailProduct.id}</span>
                </div>
                {renderContent()}
            </div>

            <div className="p-4 border-t flex justify-end space-x-3 bg-white">
                <Button variant="secondary" onClick={() => onClose()}>Đóng</Button>
            </div>
        </Modal>
    );
};