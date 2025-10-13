import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApiData } from '../hooks/useApiData.jsx';
import * as UI from '../components/ui.jsx';
import Select from 'react-select';
import { useVirtualizer } from '@tanstack/react-virtual';

// Hook tùy chỉnh để trì hoãn việc cập nhật giá trị (debounce)
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

// Các hằng số về layout
const DEFAULT_WAREHOUSE_NAMES = ["Hàng hóa", "Kho Tổng 21", "Kho chi nhánh 204", "Kho di động xe tải"];
const SOURCE_COL_MIN_WIDTH = 120;
const SKU_COL_MIN_WIDTH = 150;
const PRODUCT_COL_MIN_WIDTH = 350;
const WAREHOUSE_COL_MIN_WIDTH = 150;

// Component hiển thị các tag Nguồn
const SourceTags = ({ sources }) => (
    <div className="flex flex-wrap gap-1 items-center">{sources.map(source => (
        <span key={source} className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
            source === 'misa' ? 'bg-green-100 text-green-800' :
            source === 'ecount' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
        }`}>{source.toUpperCase()}</span>
    ))}</div>
);

export const InventoriesContent = () => {
    // States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWarehouses, setSelectedWarehouses] = useState([]);
    const [columnWidths, setColumnWidths] = useState({});

    const isInitialMount = useRef(true);
    const parentRef = useRef(null);
    const headerRef = useRef(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Tải dữ liệu
    const { data: allWarehouses, isLoading: warehousesLoading } = useApiData('/api/v1/warehouses', { per_page: -1 });
    const selectedWarehouseCodes = useMemo(() => selectedWarehouses.map(wh => wh.value).join(','), [selectedWarehouses]);
    const { data: summarizedInventory, isLoading: inventoryLoading, error, fetchData: refetchInventory } = useApiData('/api/v1/products/inventory-summary', {
        search: debouncedSearchTerm, per_page: -1, warehouse_codes: selectedWarehouseCodes,
    });

    // Xử lý lựa chọn kho yêu thích
    useEffect(() => {
        if (allWarehouses.length > 0) {
            const saved = localStorage.getItem('favoriteWarehouses');
            let initial = saved ? JSON.parse(saved).map(c => allWarehouses.find(wh => wh.code === c)).filter(Boolean).map(wh => ({ value: wh.code, label: wh.name }))
                                : allWarehouses.filter(wh => DEFAULT_WAREHOUSE_NAMES.includes(wh.name)).map(wh => ({ value: wh.code, label: wh.name }));
            setSelectedWarehouses(initial);
        }
    }, [allWarehouses]);
    
    useEffect(() => {
        if (isInitialMount.current) { isInitialMount.current = false; return; }
        localStorage.setItem('favoriteWarehouses', JSON.stringify(selectedWarehouses.map(wh => wh.value)));
    }, [selectedWarehouses]);

    const displayedWarehouses = useMemo(() => {
        if (selectedWarehouses.length > 0) return selectedWarehouses.map(sw => allWarehouses.find(aw => aw.code === sw.value)).filter(Boolean);
        return allWarehouses;
    }, [selectedWarehouses, allWarehouses]);

    const warehouseOptions = useMemo(() => allWarehouses.map(wh => ({ value: wh.code, label: wh.name })), [allWarehouses]);
    const isLoading = warehousesLoading || inventoryLoading;

    // Thiết lập Virtualizer
    const rowVirtualizer = useVirtualizer({
        count: summarizedInventory.length, getScrollElement: () => parentRef.current, estimateSize: () => 60, overscan: 10,
    });

    // Đồng bộ cuộn ngang
    useEffect(() => {
        const parent = parentRef.current, header = headerRef.current;
        if (!parent || !header) return;
        const syncScroll = () => { header.scrollLeft = parent.scrollLeft; };
        parent.addEventListener('scroll', syncScroll);
        return () => parent.removeEventListener('scroll', syncScroll);
    }, []);
    
    // Logic thay đổi độ rộng cột
    const createResizeHandler = (columnId, minWidth) => (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = columnWidths[columnId] || minWidth;
        const onMouseMove = (moveEvent) => setColumnWidths(p => ({ ...p, [columnId]: Math.max(startWidth + (moveEvent.clientX - startX), minWidth) }));
        const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    if (error) return <div className="p-6 text-red-600 bg-red-50 rounded-md m-4"><strong>Lỗi:</strong> {error}</div>;
    
    // Tính toán độ rộng và vị trí các cột cố định
    const sourceColWidth = columnWidths.source || SOURCE_COL_MIN_WIDTH;
    const skuColWidth = columnWidths.sku || SKU_COL_MIN_WIDTH;
    const productColWidth = columnWidths.product || PRODUCT_COL_MIN_WIDTH;

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <UI.Button variant='secondary' onClick={() => alert('Xuất Excel')}>
                        <UI.Icon path='M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3' className="w-4 h-4 mr-2" /> Excel
                    </UI.Button>
                     <UI.Button variant='secondary' onClick={refetchInventory}>
                        <UI.Icon path='M16.023 9.348h4.992v-.001a.75.75 0 01.088.06l.49.49a.75.75 0 01-.06.98l-7.5 7.5a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 01-.06-.98l.49-.49a.75.75 0 01.088-.06h4.992c.313 0 .618.033.916.096a4.502 4.502 0 016.32 6.32.75.75 0 01-1.06 1.06 6 6 0 00-8.484-8.484A.75.75 0 016.75 9.348' className="w-4 h-4 mr-2" /> Làm mới
                    </UI.Button>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 flex-grow">
                    <div className="min-w-[400px]">
                        {/* SỬA LỖI Z-INDEX */}
                        <Select isMulti options={warehouseOptions} placeholder="Chọn kho để xem..." onChange={setSelectedWarehouses} value={selectedWarehouses} isLoading={warehousesLoading} className="text-sm" classNamePrefix="react-select" styles={{ menu: base => ({ ...base, zIndex: 50 }) }} />
                    </div>
                    <input type="text" placeholder="Tìm theo SKU, tên sản phẩm..." className="w-64 px-3 py-1.5 border border-gray-300 rounded-md text-sm" onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="border rounded-lg bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
                {/* HIỂN THỊ SỐ LƯỢNG KẾT QUẢ */}
                <div className="p-2 border-b text-sm text-gray-600">
                    Tìm thấy <strong>{summarizedInventory.length.toLocaleString('vi-VN')}</strong> sản phẩm.
                </div>
                <div ref={parentRef} className="flex-1 w-full overflow-auto">
                    <div ref={headerRef} className="sticky top-0 z-20 flex bg-gray-100 font-semibold text-gray-700 text-sm select-none">
                        <div className="relative flex items-center py-2 px-3 sticky left-0 z-30 bg-gray-100 border-b border-r" style={{ width: `${sourceColWidth}px` }}>
                            Nguồn <div onMouseDown={createResizeHandler('source', SOURCE_COL_MIN_WIDTH)} className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-300" />
                        </div>
                        <div className="relative flex items-center py-2 px-3 sticky z-20 bg-gray-100 border-b border-r" style={{ width: `${skuColWidth}px`, left: `${sourceColWidth}px` }}>
                            Mã SP <div onMouseDown={createResizeHandler('sku', SKU_COL_MIN_WIDTH)} className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-300" />
                        </div>
                        <div className="relative flex items-center py-2 px-3 sticky z-20 bg-gray-100 border-b border-r" style={{ width: `${productColWidth}px`, left: `${sourceColWidth + skuColWidth}px` }}>
                            Sản Phẩm <div onMouseDown={createResizeHandler('product', PRODUCT_COL_MIN_WIDTH)} className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-300" />
                        </div>
                        {displayedWarehouses.map(wh => (
                            <div key={wh.code} className="relative flex items-center justify-end py-2 px-3 border-b" style={{ width: `${columnWidths[wh.code] || WAREHOUSE_COL_MIN_WIDTH}px`, flexShrink: 0 }}>
                                <span className="pr-2">{wh.name}</span>
                                <div onMouseDown={createResizeHandler(wh.code, WAREHOUSE_COL_MIN_WIDTH)} className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-300" />
                            </div>
                        ))}
                    </div>

                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }} className="w-full relative">
                        {isLoading ? <div className="p-10 text-center text-gray-500">Đang tải dữ liệu...</div>
                        : rowVirtualizer.getVirtualItems().map(virtualRow => {
                            const product = summarizedInventory[virtualRow.index];
                            const rowBgClass = virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                            return (
                                <div key={virtualRow.index} style={{ transform: `translateY(${virtualRow.start}px)` }} className="absolute top-0 left-0 w-full flex">
                                    <div className={`py-2 px-3 sticky left-0 z-10 border-b border-r flex items-center ${rowBgClass}`} style={{ width: `${sourceColWidth}px` }}>
                                        <SourceTags sources={product.source_systems || []} />
                                    </div>
                                    <div className={`py-2 px-3 sticky z-10 border-b border-r flex items-center font-mono text-xs ${rowBgClass}`} style={{ width: `${skuColWidth}px`, left: `${sourceColWidth}px` }}>
                                        {product.product_code}
                                    </div>
                                    <div className={`py-2 px-3 sticky z-10 border-b border-r ${rowBgClass}`} style={{ width: `${productColWidth}px`, left: `${sourceColWidth + skuColWidth}px` }}>
                                        {product.product_name}
                                    </div>
                                    {displayedWarehouses.map(wh => {
                                        const location = product.inventory_locations.find(loc => loc.warehouse_code === wh.code);
                                        return (
                                            <div key={wh.code} className={`py-2 px-3 text-right font-medium text-gray-800 border-b ${rowBgClass}`} style={{ width: `${columnWidths[wh.code] || WAREHOUSE_COL_MIN_WIDTH}px`, flexShrink: 0 }}>
                                                {location ? new Intl.NumberFormat('vi-VN').format(location.quantity) : <span className="text-gray-300">-</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};