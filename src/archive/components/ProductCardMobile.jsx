import React from 'react';
import { Icon, Button } from '../../components/ui';

// Ảnh placeholder tĩnh (Base64 SVG) - Nội bộ 100%
const STATIC_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

const ProductCardMobile = ({ product, onEdit, onSync, dictionary }) => {
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
    const webUrl = product.request_path ? `https://qvc.vn${product.request_path}` : '#';

    return (
        <div className={`bg-white rounded-2xl shadow-sm border transition-all group overflow-hidden flex flex-col ${product.needs_sync ? 'border-red-200 bg-red-50/10' : 'border-gray-100'}`}>

            {/* 1. Header: Trạng thái hiển thị & Badge */}
            <div className="px-4 py-2 bg-gray-50/50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${product.isOn ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`}></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                        {product.isOn ? 'Đang hiển thị' : 'Đang ẩn'}
                    </span>
                </div>
                <div className="flex gap-1">
                    <a href={webUrl} target="_blank" rel="noopener noreferrer" className="p-1 px-2 bg-white border border-gray-200 rounded text-[9px] font-bold text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-1">
                        <Icon name="external-link" className="w-2.5 h-2.5" />
                        Xem Web
                    </a>
                </div>
            </div>

            <div className="p-4 flex gap-4">
                {/* 2. Cột trái: Ảnh & Quick Info */}
                <div className="space-y-3">
                    <div className="w-24 h-24 bg-white rounded-xl border p-1 relative group-hover:border-blue-300 transition-colors">
                        <img
                            src={getProductImage()}
                            alt={product.proName}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => { e.target.onerror = null; e.target.src = STATIC_PLACEHOLDER; }}
                        />
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Lượt xem</div>
                        <div className="text-xs font-black text-gray-700">{product.details?.visit || 0}</div>
                    </div>
                </div>

                {/* 3. Cột phải: Thông tin chính */}
                <div className="flex-1 min-w-0">
                    <div className="mb-2">
                        <a href={webUrl} target="_blank" rel="noopener noreferrer" className="block active:scale-[0.98] transition-all">
                            <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors" title={product.proName}>
                                {product.proName}
                            </h3>
                        </a>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">#{product.id}</span>
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black">SKU: {product.storeSKU || 'Sẵn có'}</span>
                            {brand && (
                                <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full font-black border border-orange-100 flex items-center gap-1 uppercase tracking-tighter">
                                    <Icon name="award" className="w-2.5 h-2.5" />
                                    {brand.name}
                                </span>
                            )}
                            {firstCat && (
                                <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-black border border-blue-100 flex items-center gap-1 uppercase tracking-tighter" title={catIds.length > 1 ? "Đa danh mục" : firstCat.name}>
                                    <Icon name="folder" className="w-2.5 h-2.5" />
                                    {firstCat.name}
                                    {extraCatsCount > 0 && <span className="ml-1 opacity-60">+{extraCatsCount}</span>}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2 border-t border-gray-50">
                        <div>
                            <span className="text-[10px] text-gray-400 block">Giá Website</span>
                            <span className={`text-xs font-black ${isPriceDiff ? 'text-red-600' : 'text-blue-800'}`}>
                                {formatPrice(product.price_web)}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-400 block">Tồn Web / MT</span>
                            <span className={`text-xs font-black ${isQtyDiff ? 'text-orange-600' : 'text-green-600'}`}>
                                {product.quantity_web || 0} / {product.target_qty || 0}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-400 block">Bảo hành</span>
                            <span className="text-xs font-bold text-gray-700">{product.warranty_web || '0T'}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-400 block">VAT</span>
                            <span className="text-xs font-bold text-gray-700">{product.hasVAT === 2 ? 'Có VAT' : 'Chưa VAT'}</span>
                        </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Icon name="clock" className="w-3 h-3" />
                            Cập nhật: {product.details?.lastUpdate || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. Footer Actions */}
            <div className="px-4 py-3 bg-gray-50/30 flex items-center justify-between border-t border-gray-100">
                <div className="flex-1">
                    {product.needs_sync ? (
                        <div className="text-[10px] text-red-600 font-black italic animate-pulse">Cần đồng bộ lên Web ngay!</div>
                    ) : (
                        <div className="text-[10px] text-green-600 font-bold">Dữ liệu đã khớp</div>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        size="xs"
                        variant="secondary"
                        className="bg-white border text-[10px] font-bold h-8 px-3"
                        onClick={() => onEdit()}
                    >
                        Chi tiết
                    </Button>
                    <Button
                        size="xs"
                        variant="primary"
                        className="bg-blue-600 hover:bg-blue-700 text-[10px] font-black h-8 px-4 shadow-md shadow-blue-100"
                        onClick={() => onSync(product.id)}
                    >
                        Sync
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ProductCardMobile;
