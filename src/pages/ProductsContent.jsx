import React, { useState, useMemo } from 'react';
import { useApiData } from '../hooks/useApiData.jsx';
import { Icon, Modal, Button, Checkbox, Pagination } from '../components/ui.jsx';

const ProductToolbar = ({ selectedCount, onAction, onSearchChange }) => {
    const actions = [
        { id: 'add', label: 'Thêm mới', icon: 'M12 4.5v15m7.5-7.5h-15' },
        { id: 'import', label: 'Nhập file', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
        { id: 'export', label: 'Excel', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3' },
    ];

    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
                {actions.map(action => (
                    <Button 
                        key={action.id}
                        variant={action.id === 'add' ? 'primary' : 'secondary'}
                        onClick={() => onAction(action.id)}
                        disabled={selectedCount === 0 && !['add', 'import'].includes(action.id)}
                    >
                        <Icon path={action.icon} className="w-4 h-4 mr-2" />
                        {action.label}
                    </Button>
                ))}
            </div>
            <div className="w-1/3">
                 <input 
                    type="text" 
                    placeholder="Tìm theo SKU, tên sản phẩm..." 
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => onSearchChange(e.target.value)}
                 />
            </div>
        </div>
    );
};

export const ProductsContent = () => {
    const { data: products, isLoading, error, pagination, setSearchQuery, setCurrentPage } = useApiData('/api/v1/products');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const handleSelectAll = (e) => {
        if (e.target.checked) { setSelectedIds(new Set(products.map(p => p.id))); } 
        else { setSelectedIds(new Set()); }
    };

    const handleSelectOne = (id) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) { newSelectedIds.delete(id); } 
        else { newSelectedIds.add(id); }
        setSelectedIds(newSelectedIds);
    };

    const handleRowClick = (product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };
    
    const handleToolbarAction = (action) => {
        if (action === 'add') {
            setSelectedProduct(null);
            setIsModalOpen(true);
        } else {
            alert(`Thực hiện hành động: ${action} cho ${selectedIds.size} sản phẩm.`);
        }
    };

    const isAllSelected = useMemo(() => products && products.length > 0 && selectedIds.size === products.length, [products, selectedIds]);
    const isIndeterminate = useMemo(() => selectedIds.size > 0 && !isAllSelected, [selectedIds, isAllSelected]);

    if (isLoading && !products?.length) { return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>; }
    if (error) { return <div className="p-6 text-red-600 bg-red-50 rounded-md m-4"><strong>Lỗi:</strong> {error}</div>; }

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50">
            <ProductToolbar selectedCount={selectedIds.size} onAction={handleToolbarAction} onSearchChange={setSearchQuery} />
            <div className="border rounded-lg bg-white shadow-sm flex-1 flex flex-col">
                <div className="p-3 border-b"><Pagination pagination={pagination} onPageChange={setCurrentPage} /></div>
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-3 w-10 text-center"><Checkbox checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleSelectAll} /></th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">SKU</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Tên Sản Phẩm</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Đơn vị</th>
                                <th className="py-2 px-3 text-right font-medium text-gray-600">Giá Bán</th>
                                <th className="py-2 px-3 text-center font-medium text-gray-600">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {products && products.map((product) => (
                                <tr key={product.id} className={`hover:bg-blue-50 ${selectedIds.has(product.id) ? 'bg-blue-100' : ''}`}>
                                    <td className="p-3 text-center"><Checkbox checked={selectedIds.has(product.id)} onChange={() => handleSelectOne(product.id)} /></td>
                                    <td className="py-2 px-3">
                                        <button onClick={() => handleRowClick(product)} className="text-blue-600 hover:underline font-mono">{product.sku}</button>
                                    </td>
                                    <td className="py-2 px-3 font-medium text-gray-800">{product.name}</td>
                                    <td className="py-2 px-3 text-gray-600">{product.unit}</td>
                                    <td className="py-2 px-3 text-right font-medium text-gray-800">{new Intl.NumberFormat('vi-VN').format(product.out_price || 0)}</td>
                                    <td className="py-2 px-3 text-center">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{product.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="p-3 border-t"><Pagination pagination={pagination} onPageChange={setCurrentPage} /></div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProduct ? `Chi tiết: ${selectedProduct.name}` : "Tạo sản phẩm mới"}>
                {selectedProduct ? <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">{JSON.stringify(selectedProduct, null, 2)}</pre> : <div>Form tạo mới ở đây.</div>}
            </Modal>
        </div>
    );
};