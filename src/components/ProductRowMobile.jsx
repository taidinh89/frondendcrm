import React from 'react';
import { Icon, Button } from './ui';

const STATIC_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

const ProductRowMobile = ({ product, onEdit, onSync, dictionary }) => {
    // Tìm thông tin từ dictionary
    const brand = dictionary?.brands?.find(b => String(b.code) === String(product.brandId));
    // Xử lý đa danh mục: Lấy danh sách ID
    const catIds = product.categories_list || (product.product_cat_web ? product.product_cat_web.split(',').filter(Boolean) : [product.catId]).filter(Boolean);
    const firstCat = dictionary?.categories?.find(c => String(c.code) === String(catIds[0]));
    const extraCatsCount = catIds.length > 1 ? catIds.length - 1 : 0;

    const formatPrice = (p) => {
        if (!p || p === "0.00") return <span className="text-gray-400">Liên hệ</span>;
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);
    };

    const getProductImage = () => {
        const resolve = (path, isProThum = false) => {
            if (!path || path === '0') return null;
            if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) return path;

            let clean = path;
            if (isProThum) {
                clean = `/p/250_${path}`;
            } else {
                clean = path.startsWith('/') ? path : `/${path}`;
            }

            // Normalization: Remove double slashes and fix backslashes
            const finalPath = clean.replace(/\\/g, '/').replace(/\/+/g, '/');
            return `${window.location.origin}${finalPath}`;
        };

        // 1. New Media Structure (Priority 1)
        const mainMedia = product.media?.find(m => m.is_main) || product.media?.[0];
        const mediaSrc = mainMedia?.master_file?.paths?.original || mainMedia?.url;
        if (mediaSrc) return resolve(mediaSrc);

        // 2. CRM Chosen Image
        if (product.image) return resolve(product.image);

        // 3. Image Collection
        const collectionImg = product.image_collection?.[0] || product.full_images?.[0];
        const collectionSrc = collectionImg?.relative_path || collectionImg?.url || collectionImg?.image_name;
        if (collectionSrc) {
            // Case: just a filename
            if (!collectionSrc.includes('/') && !collectionSrc.startsWith('http')) {
                return resolve(`media/product/${collectionSrc}`);
            }
            return resolve(collectionSrc);
        }

        // 4. Legacy proThum
        if (product.proThum && product.proThum !== '0') {
            return resolve(product.proThum, true);
        }

        return STATIC_PLACEHOLDER;
    };

    const isPriceDiff = product.price_web !== product.target_price && product.target_price !== null;
    const isQtyDiff = product.quantity_web !== product.target_qty && product.target_qty !== null;
    const webUrl = product.request_path ? `${window.location.origin}${product.request_path}` : '#';

    return (
        <div className={`bg-white border-b hover:bg-blue-50/30 transition-colors group flex items-center p-3 gap-4 ${product.needs_sync ? 'bg-red-50/20' : ''}`}>
            {/* Ảnh nhỏ */}
            <div className="w-12 h-12 flex-shrink-0 bg-white border rounded-lg overflow-hidden p-0.5">
                <img
                    src={getProductImage()}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => { e.target.onerror = null; e.target.src = STATIC_PLACEHOLDER; }}
                />
            </div>

            {/* Thông tin chính */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <a
                        href={webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-gray-900 truncate hover:text-blue-600 active:text-blue-800 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {product.proName}
                    </a>
                    {product.isOn ? <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> : <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-mono">#{product.id}</span>
                    <span className="text-[10px] text-blue-600 font-black">SKU: {product.storeSKU || 'Sẵn có'}</span>
                    {brand && <span className="text-[9px] text-orange-600 font-black uppercase tracking-tighter bg-orange-50 px-1.5 rounded-full border border-orange-100">{brand.name}</span>}
                    {firstCat && (
                        <span className="text-[9px] text-blue-400 font-black uppercase tracking-tighter bg-blue-50 px-1.5 rounded-full border border-blue-100 flex items-center gap-1">
                            {firstCat.name}
                            {extraCatsCount > 0 && <span className="opacity-60">+{extraCatsCount}</span>}
                        </span>
                    )}
                </div>
            </div>

            {/* Giá & Kho */}
            <div className="hidden md:flex items-center gap-8 px-4">
                <div className="text-right min-w-[100px]">
                    <div className="text-[9px] text-gray-400 uppercase font-black">Giá Web</div>
                    <div className={`text-xs font-black ${isPriceDiff ? 'text-red-600' : 'text-blue-700'}`}>{formatPrice(product.price_web)}</div>
                </div>
                <div className="text-right min-w-[80px]">
                    <div className="text-[9px] text-gray-400 uppercase font-black">Tồn Kho</div>
                    <div className={`text-xs font-black ${isQtyDiff ? 'text-orange-600' : 'text-gray-700'}`}>{product.quantity_web} / {product.target_qty || 0}</div>
                </div>
            </div>

            {/* Thao tác nhanh */}
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onSync(product.id)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-all active:scale-90"
                    title="Đồng bộ"
                >
                    <Icon name="refresh" className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onEdit()}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Chi tiết"
                >
                    <Icon name="edit" className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ProductRowMobile;
