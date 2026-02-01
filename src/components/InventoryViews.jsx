import React, { useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import * as UI from './ui.jsx';

const formatPrice = (price) => {
    if (price === null || price === undefined || price <= 0) return <span className="text-gray-300">-</span>;
    return new Intl.NumberFormat('vi-VN').format(price);
};

const formatQty = (qty) => {
    if (qty === null || qty === undefined) return <span className="text-gray-300">0</span>;
    return new Intl.NumberFormat('vi-VN').format(qty);
};

const StatusBadge = ({ diff }) => {
    if (diff === 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">KHỚP</span>;
    if (diff > 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">DƯ MISA</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">HỤT MISA</span>;
};

/* 1. Chi tiết dạng Card */
export const InventoryDetailCard = ({ item, onSelectCode }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow mb-4">
        <div className={`px-4 py-3 border-b flex items-center justify-between ${item.reconciliation?.diff === 0 ? 'bg-green-50/10' : 'bg-orange-50/10'}`}>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => onSelectCode?.(item)}
                    className="font-mono text-lg font-bold text-blue-800 bg-white px-3 py-1 rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors flex items-center gap-2 group"
                >
                    {item.ecount_code || item.primary_code}
                    <UI.Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" className="w-3 h-3 group-hover:scale-110 transition-transform" />
                </button>
                <h3 className="font-bold text-gray-800 text-sm hidden md:block">{item.product_name || item.ecount?.product?.prod_des}</h3>
                {item.reconciliation && <StatusBadge diff={item.reconciliation.diff} />}
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Tổng Ecount</div>
                    <div className="text-lg font-bold text-blue-600">{formatQty(item.ecount?.total_quantity)}</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Tổng Misa</div>
                    <div className="text-lg font-bold text-green-600 font-mono">{formatQty(item.misa?.total_quantity)}</div>
                </div>
                <div className="text-right pl-4 border-l border-gray-200">
                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Chênh lệch</div>
                    <div className={`text-lg font-bold ${item.reconciliation?.diff === 0 ? 'text-gray-400' : (item.reconciliation?.diff > 0 ? 'text-blue-600' : 'text-red-600')}`}>
                        {item.reconciliation?.diff > 0 ? '+' : ''}{formatQty(item.reconciliation?.diff)}
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x border-b border-gray-100">
            {/* Ecount Side */}
            <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                    <h4 className="font-bold text-blue-900 uppercase text-[10px] tracking-widest">ECOUNT MASTER</h4>
                </div>
                {item.ecount ? (
                    <div className="space-y-3">
                        <div className="bg-blue-50/20 p-2 rounded-lg border border-blue-100/30 text-xs">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div><span className="text-gray-500">Đơn vị:</span> {item.ecount.product.unit}</div>
                                <div><span className="text-gray-500">Hãng:</span> <span className="font-bold">{item.brand_name || item.ecount.product.class_cd}</span></div>
                                <div className="col-span-2"><span className="text-gray-500">Mã liên kết Misa:</span> <span className="font-mono font-bold text-purple-700">{item.ecount.product.cont3 || 'Không có'}</span></div>
                            </div>
                        </div>
                        <table className="w-full text-[10px] border-collapse">
                            <thead className="bg-gray-100/50">
                                <tr>
                                    <th className="text-left py-1 px-2 border border-gray-100">Mã Kho</th>
                                    <th className="text-left py-1 px-2 border border-gray-100">Tên Kho</th>
                                    <th className="text-right py-1 px-2 border border-gray-100">Tồn</th>
                                </tr>
                            </thead>
                            <tbody>
                                {item.ecount.stock?.length > 0 ? (
                                    item.ecount.stock.map((s, i) => (
                                        <tr key={i} className="hover:bg-blue-50/20">
                                            <td className="py-1 px-2 border border-gray-100 font-mono">{s.wh_cd}</td>
                                            <td className="py-1 px-2 border border-gray-100">{s.wh_des}</td>
                                            <td className="py-1 px-2 border border-gray-100 font-bold text-right text-blue-700">{formatQty(s.bal_qty)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="3" className="py-2 text-center text-gray-400 italic">Hết hàng</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : <div className="py-8 text-center text-gray-400 italic text-xs">Không có dữ liệu Ecount</div>}
            </div>

            {/* Misa Side */}
            <div className="p-4 bg-green-50/5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
                    <h4 className="font-bold text-green-900 uppercase text-[10px] tracking-widest">MISA INVENTORY ({item.misa?.links?.length || 0} mã)</h4>
                </div>
                {item.misa?.links?.length > 0 ? (
                    <div className="space-y-4">
                        {item.misa.links.map((link, idx) => (
                            <div key={idx} className="space-y-2 border-b border-green-100/50 pb-3 last:border-0 last:pb-0">
                                <div className="bg-green-50/30 p-2 rounded-lg border border-green-100/30">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="text-xs font-bold text-gray-800">{link.item.inventory_item_name}</div>
                                        <div className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded shadow-sm border border-green-200">{link.item.inventory_item_code}</div>
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex gap-4">
                                        <span>Đơn vị: {link.item.unit_name}</span>
                                        <span>Thuế: <span className="font-bold text-blue-600">{link.item.fixed_vat_rate || 0}%</span></span>
                                        <span>Tồn tổng: <span className="font-bold text-green-700">{formatQty(link.total_stock)}</span></span>
                                    </div>
                                </div>
                                <table className="w-full text-[10px] border-collapse bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left py-0.5 px-2 border border-gray-100">Kho</th>
                                            <th className="text-right py-0.5 px-2 border border-gray-100">Tồn</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {link.stock?.length > 0 ? (
                                            link.stock.map((s, i) => (
                                                <tr key={i}>
                                                    <td className="py-0.5 px-2 border border-gray-100">{s.stock_name}</td>
                                                    <td className="py-0.5 px-2 border border-gray-100 font-bold text-right text-green-700">{formatQty(s.quantity_balance)}</td>
                                                </tr>
                                            ))
                                        ) : <tr><td colSpan="2" className="py-1 text-center text-gray-300">Không có tồn kho</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                ) : <div className="py-8 text-center text-gray-400 italic text-xs">Chưa liên kết / Không có dữ liệu Misa</div>}
            </div>
        </div>
        {/* Prices Row */}
        {item.ecount?.product && (
            <div className="px-4 py-2 bg-gray-50/50 flex flex-wrap gap-x-6 gap-y-2 md:items-center">
                <div className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-gray-400 uppercase">Giá Nhập:</span> <span className="text-xs font-bold text-gray-600">{formatPrice(item.ecount.product.in_price)}</span></div>
                <div className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-gray-400 uppercase">Giá Lẻ:</span> <span className="text-xs font-bold text-blue-700">{formatPrice(item.ecount.product.out_price)}</span></div>
                <div className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-gray-400 uppercase">Barcode:</span> <span className="text-xs font-mono text-gray-500">{item.ecount.product.bar_code || '-'}</span></div>
                <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Cont1:</span>
                    {item.ecount.cont1_link ? (
                        <a href={item.ecount.cont1_link.startsWith('http') ? item.ecount.cont1_link : `https://${item.ecount.cont1_link}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[200px]">
                            {item.ecount.cont1_link}
                        </a>
                    ) : <span className="text-xs text-gray-300">N/A</span>}
                </div>
            </div>
        )}
    </div>
);

/* 2. Dạng Bảng Đối Soát (Standard Table) */
export const InventoryDenseTable = ({ data, onSelectCode }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
            <thead className="bg-gray-100 text-gray-600 font-bold uppercase tracking-tighter">
                <tr>
                    <th className="text-left py-3 px-4 border-b">Mã SP</th>
                    <th className="text-left py-3 px-4 border-b">Tên Sản Phẩm</th>
                    <th className="text-left py-3 px-4 border-b">Hãng / Nhóm</th>
                    <th className="text-right py-3 px-4 border-b">Tồn Ecount</th>
                    <th className="text-right py-3 px-4 border-b">Tồn Misa</th>
                    <th className="text-right py-3 px-4 border-b">Chênh lệch</th>
                    <th className="text-center py-3 px-4 border-b">Trạng thái</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                            <button
                                onClick={() => onSelectCode?.(item)}
                                className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-1 group"
                            >
                                {item.ecount_code || item.primary_code}
                                <UI.Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-700 max-w-md truncate">{item.product_name || item.ecount?.product?.prod_des}</td>
                        <td className="py-3 px-4">
                            <div className="text-[10px] text-gray-500 font-bold">{item.brand_name || '-'}</div>
                            <div className="text-[9px] text-gray-400">{item.category_name || '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600">{formatQty(item.ecount?.total_quantity)}</td>
                        <td className="py-3 px-4 text-right font-bold text-green-600 font-mono">{formatQty(item.misa?.total_quantity)}</td>
                        <td className={`py-3 px-4 text-right font-bold ${item.reconciliation?.diff === 0 ? 'text-gray-400' : (item.reconciliation?.diff > 0 ? 'text-blue-600' : 'text-red-500')}`}>
                            {item.reconciliation?.diff > 0 ? '+' : ''}{formatQty(item.reconciliation?.diff)}
                        </td>
                        <td className="py-3 px-4 text-center">
                            <StatusBadge diff={item.reconciliation?.diff} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/* 3. Dạng Bảng Ảo Hóa (Virtualized Table - Superior Mode) */
export const InventoryVirtualizedTable = ({ data, onSelectCode, parentRef }) => {
    const rowVirtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 50,
        overscan: 10
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="relative overflow-x-auto overflow-y-hidden">
                <table className="w-full text-xs border-collapse">
                    <thead className="bg-gray-100 text-gray-600 font-black uppercase tracking-widest sticky top-0 z-10 border-b border-gray-200">
                        <tr>
                            <th className="text-left py-4 px-4 w-32 min-w-[128px]">Mã Sản Phẩm</th>
                            <th className="text-left py-4 px-4">Tên Sản Phẩm</th>
                            <th className="text-left py-4 px-4 w-48 min-w-[192px]">Hãng / Nhóm</th>
                            <th className="text-right py-4 px-4 w-28 min-w-[112px]">Tồn Ecount</th>
                            <th className="text-right py-4 px-4 w-28 min-w-[112px]">Tồn Misa</th>
                            <th className="text-right py-4 px-4 w-28 min-w-[112px]">Chênh lệch</th>
                            <th className="text-center py-4 px-4 w-24 min-w-[96px]">Status</th>
                        </tr>
                    </thead>
                    <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const item = data[virtualRow.index];
                            return (
                                <tr
                                    key={virtualRow.key}
                                    className="hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0 absolute w-full"
                                    style={{
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <td className="py-2 px-4 w-32 min-w-[128px] overflow-hidden">
                                        <button
                                            onClick={() => onSelectCode?.(item)}
                                            className="font-mono font-bold text-blue-600 hover:underline truncate w-full text-left"
                                        >
                                            {item.ecount_code || item.primary_code}
                                        </button>
                                    </td>
                                    <td className="py-2 px-4 flex-1 truncate font-medium text-gray-800">
                                        {item.product_name || item.ecount?.product?.prod_des}
                                    </td>
                                    <td className="py-2 px-4 w-48 min-w-[192px] overflow-hidden whitespace-nowrap">
                                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-600 mr-2 max-w-[80px] truncate inline-block align-middle">{item.brand_name}</span>
                                        <span className="text-[10px] max-w-[80px] truncate inline-block align-middle text-gray-400 italic">{item.category_name}</span>
                                    </td>
                                    <td className="py-2 px-4 w-28 min-w-[112px] text-right font-black text-blue-600">
                                        {formatQty(item.ecount?.total_quantity)}
                                    </td>
                                    <td className="py-2 px-4 w-28 min-w-[112px] text-right font-black text-green-600 font-mono">
                                        {formatQty(item.misa?.total_quantity)}
                                    </td>
                                    <td className={`py-2 px-4 w-28 min-w-[112px] text-right font-black ${item.reconciliation?.diff === 0 ? 'text-gray-300' : (item.reconciliation?.diff > 0 ? 'text-blue-500' : 'text-red-500')}`}>
                                        {formatQty(item.reconciliation?.diff)}
                                    </td>
                                    <td className="py-2 px-4 w-24 min-w-[96px] text-center">
                                        <div className={`w-3 h-3 rounded-full mx-auto shadow-sm ${item.reconciliation?.diff === 0 ? 'bg-green-400' : (item.reconciliation?.diff > 0 ? 'bg-blue-400 animate-pulse' : 'bg-red-400 animate-pulse')}`}></div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/* 4. Dạng Danh sách Xem Nhanh */
export const InventoryCompactList = ({ data, onSelectCode }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {data.map((item, idx) => (
            <div
                key={idx}
                className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                onClick={() => onSelectCode?.(item)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-blue-600 group-hover:underline">{item.ecount_code || item.primary_code}</span>
                        <div className={`w-2 h-2 rounded-full ${item.reconciliation?.diff === 0 ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                    </div>
                    <div className="text-[11px] font-bold text-gray-800 truncate">{item.product_name || item.ecount?.product?.prod_des}</div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-[9px] text-gray-400 font-bold uppercase leading-none mb-1">Diff</div>
                        <div className={`text-sm font-black ${item.reconciliation?.diff === 0 ? 'text-gray-300' : (item.reconciliation?.diff > 0 ? 'text-blue-500' : 'text-red-500')}`}>
                            {formatQty(item.reconciliation?.diff)}
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <UI.Icon path="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-4 h-4" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const DetailField = ({ label, value, isMono = false, isHighlight = false }) => (
    <div>
        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">{label}</label>
        <div className={`text-sm font-bold ${isMono ? 'font-mono' : ''} ${isHighlight ? 'text-blue-600 underline decoration-blue-200' : 'text-gray-700'}`}>
            {value || <span className="text-gray-300 font-normal">N/A</span>}
        </div>
    </div>
);

/* 5. Modal Chi tiết Sản phẩm (Upgraded with Raw Data) */
export const ProductDetailModal = ({ item, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('inventory');

    if (!isOpen || !item) return null;

    const tabs = [
        { id: 'inventory', label: 'Đối soát Tồn', icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z' },
        { id: 'ecount', label: 'Ecount Data', icon: 'M9 12h3.75M9 15.75h3.75M9 19.5h3.75M6.75 6.75h10.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25zM10.5 3v3.75' },
        { id: 'misa', label: `Misa mapping (${item.misa?.links?.length || 0})`, icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
        { id: 'raw', label: 'Raw JSON', icon: 'M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-xl font-black text-blue-600 bg-white px-4 py-1 rounded-xl shadow-sm border border-blue-100">
                            {item.ecount_code || item.primary_code}
                        </span>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 leading-tight">
                                {item.product_name || item.ecount?.product?.prod_des}
                            </h2>
                            <p className="text-xs text-gray-400 font-bold font-mono tracking-widest uppercase italic">Advanced Stock Intelligence</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors">
                        <UI.Icon path="M6 18L18 6M6 6l12 12" className="w-6 h-6" />
                    </button>
                </div>

                <div className="px-6 bg-white border-b border-gray-100 flex gap-1 pt-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        >
                            <UI.Icon path={tab.icon} className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
                    {activeTab === 'inventory' && <InventoryDetailCard item={item} />}

                    {activeTab === 'ecount' && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-black text-blue-900 mb-4 uppercase italic flex items-center gap-2">
                                    <UI.Icon path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5 text-blue-500" />
                                    Master Profile (Ecount)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <DetailField label="Mã Hàng (Ecount)" value={item.ecount?.product?.prod_cd} isMono />
                                    <DetailField label="Tên Hàng" value={item.ecount?.product?.prod_des} />
                                    <DetailField label="Đơn vị tính" value={item.ecount?.product?.unit} />
                                    <DetailField label="Hãng (Mã)" value={item.ecount?.product?.class_cd} isMono />
                                    <DetailField label="Hãng (Tên)" value={item.brand_name} isHighlight />
                                    <DetailField label="Nhóm (Mã)" value={item.ecount?.product?.class_cd2} isMono />
                                    <DetailField label="Nhóm (Tên)" value={item.category_name} isHighlight />
                                    <DetailField label="Nhà cung cấp" value={item.ecount?.product?.cust} />
                                    <DetailField label="Mã Misa liên kết" value={item.ecount?.product?.cont3} isMono />
                                    <DetailField label="Barcode" value={item.ecount?.product?.bar_code} isMono />
                                    <DetailField label="Thời gian bảo hành" value={item.ecount?.product?.cont2} />
                                    <DetailField label="Phòng/Bộ phận" value={item.ecount?.product?.cont4} />
                                </div>
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-2">Cont1 Link (QVC/Product)</label>
                                    {item.ecount?.cont1_link ? (
                                        <a href={item.ecount.cont1_link.startsWith('http') ? item.ecount.cont1_link : `https://${item.ecount.cont1_link}`} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-2">
                                            <UI.Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" className="w-4 h-4" />
                                            {item.ecount.cont1_link}
                                        </a>
                                    ) : <span className="text-gray-300 italic">Chưa cấu hình Link</span>}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-black text-blue-900 mb-4 uppercase italic flex items-center gap-2">
                                    <UI.Icon path="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75m0 1.5v.75m0 1.5v.75m0 1.5V15m1.5-1.5h.75m1.5 0h.75m1.5 0h.75m1.5 0H15m-1.5-1.5V12m0-1.5v-.75m0-1.5v-.75m0-1.5V4.5m-1.5 1.5h-.75m-1.5 0h-.75m-1.5 0h-.75m-1.5 0H3.75m10.5 0h.75m1.5 0h.75m1.5 0h.75m1.5 0h2.25m-15 10.5h.75m1.5 0h.75m1.5 0h.75m1.5 0H15" className="w-5 h-5 text-blue-500" />
                                    Pricing Policy (Ecount)
                                </h3>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <DetailField label="Giá Nhập" value={formatPrice(item.ecount?.product?.in_price)} isHighlight />
                                    <DetailField label="Giá Lẻ (Niêm yết)" value={formatPrice(item.ecount?.product?.out_price)} isHighlight />
                                    <DetailField label="Giá Sỉ 1" value={formatPrice(item.ecount?.product?.out_price1)} />
                                    <DetailField label="Giá Sỉ 2" value={formatPrice(item.ecount?.product?.out_price2)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'misa' && (
                        <div className="space-y-6">
                            {item.misa?.links?.map((link, i) => (
                                <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-black text-green-900 mb-4 uppercase italic flex items-center justify-between">
                                        <span>Source Node: {link.item.inventory_item_code}</span>
                                        <StatusBadge diff={link.total_stock > 0 ? 1 : 0} />
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                                        <DetailField label="Mã Misa" value={link.item.inventory_item_code} isMono />
                                        <DetailField label="Tên Misa" value={link.item.inventory_item_name} />
                                        <DetailField label="Đơn vị" value={link.item.unit_name} />
                                        <DetailField label="VAT Rate" value={`${link.item.fixed_vat_rate || 0}%`} isHighlight />
                                        <DetailField label="Giá bán 1" value={formatPrice(link.item.sale_price_1)} />
                                        <DetailField label="Giá bán 2" value={formatPrice(link.item.sale_price_2)} />
                                        <DetailField label="Giá mua gần nhất" value={formatPrice(link.item.purchase_price)} />
                                        <DetailField label="Tồn tổng cộng" value={formatQty(link.total_stock)} isHighlight />
                                    </div>
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 px-2 border-l-2 border-green-500">Inventory Distribution (Misa)</h4>
                                    <div className="overflow-hidden border border-gray-100 rounded-xl">
                                        <table className="w-full text-xs border-collapse">
                                            <thead className="bg-gray-50/80">
                                                <tr>
                                                    <th className="text-left p-3 border-b border-gray-100">Kho hàng</th>
                                                    <th className="text-right p-3 border-b border-gray-100">Số dư hiện tại</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {link.stock?.map((s, j) => (
                                                    <tr key={j} className="hover:bg-green-50/20">
                                                        <td className="p-3 border-b border-gray-100 font-medium">{s.stock_name} ({s.stock_code})</td>
                                                        <td className="p-3 border-b border-gray-100 text-right font-black text-green-600">{formatQty(s.quantity_balance)}</td>
                                                    </tr>
                                                ))}
                                                {(!link.stock || link.stock.length === 0) && (
                                                    <tr><td colSpan="2" className="p-6 text-center text-gray-400 italic">Kho hàng đang trống</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                            {(!item.misa?.links || item.misa.links.length === 0) && (
                                <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4">
                                    <UI.Icon path="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" className="w-12 h-12 text-gray-200" />
                                    <p className="font-bold italic">Mã này chưa được cấu hình liên kết với hệ thống Misa</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'raw' && (
                        <div className="space-y-6">
                            {item.ecount?.raw && (
                                <div className="bg-slate-900 rounded-2xl p-6 overflow-hidden border border-slate-800 shadow-xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black text-blue-400 uppercase italic">Raw Ecount Record</h3>
                                        <button className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-bold">RAW JSON</button>
                                    </div>
                                    <pre className="text-[11px] text-green-400 font-mono overflow-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-700">
                                        {JSON.stringify(item.ecount.raw, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {item.misa?.links?.map((l, i) => (
                                <div key={i} className="bg-slate-900 rounded-2xl p-6 overflow-hidden border border-slate-800 shadow-xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black text-green-400 uppercase italic">Raw Misa Record: {l.item.inventory_item_code}</h3>
                                        <button className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-bold">RAW JSON</button>
                                    </div>
                                    <pre className="text-[11px] text-green-400 font-mono overflow-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-700">
                                        {JSON.stringify(l.raw, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-8 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-black hover:bg-black transition-all shadow-lg active:scale-95">ĐÓNG CỬA SỔ</button>
                </div>
            </div>
        </div>
    );
};

// ==========================================================================
// == LEGACY STYLE TABLE (MIMICS /inventories)
// ==========================================================================

const SortIcon = ({ direction }) => {
    if (!direction) return null;
    const path = direction === 'asc' ? "M4.5 15.75l7.5-7.5 7.5 7.5" : "M19.5 8.25l-7.5 7.5-7.5-7.5";
    return <UI.Icon path={path} className="w-3 h-3 ml-1 text-gray-400" />;
};

export const InventoryLegacyTable = ({
    data = [],
    isLoading,
    sortBy,
    sortDirection,
    onSort,
    onSelectCode,
    parentRef
}) => {
    // 1. Define fixed widths for columns
    const COL_WIDTHS = {
        source: 80,
        sku: 140,
        name_ecount: 350,
        name_misa: 350,
        status: 100,
        total_ecount: 100,
        total_vat: 100,
        diff: 100,
        warehouse: 140,
        price: 110
    };

    // 2. Determine dynamic warehouses from the first 50 items (optimization)
    const warehouseColumns = useMemo(() => {
        const warehouses = new Map();
        if (Array.isArray(data)) {
            data.slice(0, 50).forEach(item => {
                const locations = item.inventorySummary?.locations || [];
                locations.forEach(loc => {
                    if (loc.source === 'ecount' && !warehouses.has(loc.warehouse_code)) {
                        warehouses.set(loc.warehouse_code, loc.warehouse_name);
                    }
                });
            });
        }
        return Array.from(warehouses.entries()).map(([code, name]) => ({ code, name }));
    }, [data]);

    // 3. Calculate total width
    const totalWidth = useMemo(() => {
        let width = COL_WIDTHS.source + COL_WIDTHS.sku + COL_WIDTHS.name_ecount + COL_WIDTHS.name_misa +
            COL_WIDTHS.status + COL_WIDTHS.total_ecount + COL_WIDTHS.total_vat + COL_WIDTHS.diff +
            (COL_WIDTHS.price * 2);
        width += warehouseColumns.length * COL_WIDTHS.warehouse;
        return width;
    }, [warehouseColumns]);

    const rowVirtualizer = useVirtualizer({
        count: Array.isArray(data) ? data.length : 0,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60,
        overscan: 10
    });

    const formatQty = (qty) => {
        if (qty === null || qty === undefined || qty === 0) return <span className="text-gray-300">-</span>;
        return new Intl.NumberFormat('vi-VN').format(qty);
    };

    if (isLoading && (!data || data.length === 0)) {
        return <div className="flex justify-center items-center h-64 text-gray-400 font-bold uppercase tracking-widest animate-pulse">Initializing Data Stream...</div>;
    }

    if (!data || data.length === 0) {
        return <div className="flex justify-center items-center h-64 text-gray-400">Empty Dataset</div>;
    }

    const HeaderCell = ({ width, children, className = "", onClick, sortKey }) => (
        <div
            style={{ width }}
            className={`px-4 py-3 font-black text-[10px] uppercase tracking-wider text-slate-500 flex items-center shrink-0 border-r border-slate-200/60 bg-slate-50/80 ${className}`}
            onClick={onClick}
        >
            {children}
            {sortKey && <SortIcon direction={sortBy === sortKey ? sortDirection : null} />}
        </div>
    );

    const DataCell = ({ width, children, className = "", isSticky, left = 0 }) => (
        <div
            style={{
                width,
                left: isSticky ? left : undefined,
                position: isSticky ? 'sticky' : 'relative',
                zIndex: isSticky ? 10 : undefined
            }}
            className={`px-4 py-3 flex items-center shrink-0 border-r border-slate-100 h-full truncate ${isSticky ? 'bg-white' : ''} ${className}`}
        >
            {children}
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Scroll Container */}
            <div className="flex-1 overflow-auto bg-slate-50/30" ref={parentRef}>
                <div style={{ width: totalWidth, minWidth: '100%', position: 'relative' }}>

                    {/* Header: Separate from rows to stay static vertically if needed, but here we want it sticky */}
                    <div className="flex sticky top-0 z-30 bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <HeaderCell width={COL_WIDTHS.source} className="sticky left-0 z-40">Nguồn</HeaderCell>
                        <HeaderCell width={COL_WIDTHS.sku} className="sticky left-[80px] z-40">Mã SKU</HeaderCell>
                        <HeaderCell width={COL_WIDTHS.name_ecount} className="sticky left-[220px] z-40" onClick={() => onSort('product_name')} sortKey="product_name">Tên Ecount</HeaderCell>
                        <HeaderCell width={COL_WIDTHS.name_misa}>Tên Misa</HeaderCell>
                        <HeaderCell width={COL_WIDTHS.status} className="justify-center">Trạng thái</HeaderCell>
                        <HeaderCell width={COL_WIDTHS.total_ecount} className="justify-end text-blue-600" onClick={() => onSort('total_ecount_quantity')} sortKey="total_ecount_quantity">Tồn Ecount</HeaderCell>
                        <HeaderCell width={COL_WIDTHS.total_vat} className="justify-end text-red-600" onClick={() => onSort('total_misa_quantity')} sortKey="total_misa_quantity">Kho VAT</HeaderCell>
                        <HeaderCell width={COL_WIDTHS.diff} className="justify-end text-purple-600 font-black" onClick={() => onSort('ecount_misa_diff')} sortKey="ecount_misa_diff">Chênh Lệch</HeaderCell>

                        {warehouseColumns.map(wh => (
                            <HeaderCell key={wh.code} width={COL_WIDTHS.warehouse} className="justify-end text-slate-400">{wh.name}</HeaderCell>
                        ))}

                        <HeaderCell width={COL_WIDTHS.price} className="justify-end">Giá Lẻ</HeaderCell>
                        <HeaderCell width={COL_WIDTHS.price} className="justify-end border-r-0">Giá Sỉ 1</HeaderCell>
                    </div>

                    {/* Virtualized Body */}
                    <div style={{ height: `${rowVirtualizer.getTotalSize() + 400}px`, width: '100%', position: 'relative' }}>
                        {rowVirtualizer.getVirtualItems().map(virtualRow => {
                            const product = data[virtualRow.index];
                            if (!product) return null;
                            const summary = product.inventorySummary || {};
                            const ecountPrice = product.ecount?.product?.prices || {};

                            return (
                                <div
                                    key={virtualRow.key}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`
                                    }}
                                    onClick={() => onSelectCode?.(product)}
                                    className="flex hover:bg-blue-50/50 transition-colors border-b border-slate-100 bg-white group cursor-pointer"
                                >
                                    <DataCell width={COL_WIDTHS.source} isSticky left={0} className="border-r-slate-200">
                                        {product.misa?.links?.length > 0 ? (
                                            <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Both</span>
                                        ) : (
                                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Ecount</span>
                                        )}
                                    </DataCell>
                                    <DataCell width={COL_WIDTHS.sku} isSticky left={80} className="border-r-slate-200">
                                        <div className="flex flex-col text-[10px] items-start w-full">
                                            {product.misa?.links?.length > 0 && <span className="text-slate-400 truncate w-full">M: {product.misa.links[0].item.inventory_item_code}</span>}
                                            <span className="font-mono font-black text-slate-800 truncate w-full">E: {product.ecount_code}</span>
                                        </div>
                                    </DataCell>
                                    <DataCell width={COL_WIDTHS.name_ecount} isSticky left={220} className="font-bold text-slate-900 border-r-slate-200 text-xs">
                                        {product.product_name}
                                    </DataCell>
                                    <DataCell width={COL_WIDTHS.name_misa} className="text-slate-500 text-[11px] italic">
                                        {product.misa?.links?.[0]?.item?.inventory_item_name || '-'}
                                    </DataCell>
                                    <DataCell width={COL_WIDTHS.status} className="justify-center">
                                        <div className={`w-2 h-2 rounded-full ${summary.total_ecount_quantity > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                    </DataCell>
                                    <DataCell width={COL_WIDTHS.total_ecount} className="justify-end font-bold text-blue-700 text-sm">{formatQty(summary.total_ecount_quantity)}</DataCell>
                                    <DataCell width={COL_WIDTHS.total_vat} className="justify-end font-bold text-red-600 text-sm">{formatQty(summary.total_misa_quantity)}</DataCell>
                                    <DataCell width={COL_WIDTHS.diff} className="justify-end">
                                        <span className={`font-black text-sm ${summary.ecount_misa_diff > 0 ? 'text-green-600' : summary.ecount_misa_diff < 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                            {summary.ecount_misa_diff > 0 ? '+' : ''}{formatQty(summary.ecount_misa_diff)}
                                        </span>
                                    </DataCell>

                                    {warehouseColumns.map(wh => {
                                        const loc = summary.locations?.find(l => l.warehouse_code === wh.code && l.source === 'ecount');
                                        return <DataCell key={wh.code} width={COL_WIDTHS.warehouse} className="justify-end text-slate-600 font-mono text-xs">{formatQty(loc?.quantity)}</DataCell>;
                                    })}

                                    <DataCell width={COL_WIDTHS.price} className="justify-end font-bold text-slate-700">{formatQty(ecountPrice.out_price)}</DataCell>
                                    <DataCell width={COL_WIDTHS.price} className="justify-end font-medium text-slate-400 border-r-0">{formatQty(ecountPrice.out_price1)}</DataCell>
                                </div>
                            );
                        })}
                        {/* Final Space Indicator */}
                        <div
                            style={{
                                position: 'absolute',
                                top: rowVirtualizer.getTotalSize(),
                                left: 0,
                                width: '100%',
                                height: '200px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#94a3b8',
                                fontSize: '11px',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}
                        >
                            {/* Visual cue that more could load */}
                            --- End of Current Batch ---
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading Overlay for Pagination */}
            {isLoading && data && data.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-2 rounded-full shadow-2xl text-[10px] font-black uppercase tracking-[0.2em] z-50 border border-slate-700 animate-bounce">
                    Synchronizing...
                </div>
            )}
        </div>
    );
};
