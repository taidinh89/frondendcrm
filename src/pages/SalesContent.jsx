import React, { useState, useMemo } from 'react';
import { useApiData } from '../hooks/useApiData.jsx';
import { Icon, Modal, Button, Checkbox, Pagination } from '../components/ui.jsx';

const SalesToolbar = ({ selectedCount, onAction, onSearchChange }) => {
    const actions = [
        { id: 'add', label: 'Thêm mới', icon: 'M12 4.5v15m7.5-7.5h-15' },
        { id: 'confirm', label: 'Xác nhận', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'cancel', label: 'Hủy', icon: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'print', label: 'In hóa đơn', icon: 'M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6 18.25m10.56-4.421l.5 4.421m-11-4.421a2.25 2.25 0 012.25-2.25h6.5a2.25 2.25 0 012.25 2.25m-11 0a2.25 2.25 0 002.25 2.25h6.5a2.25 2.25 0 002.25-2.25m0 0l-.5-4.421m0 0a2.25 2.25 0 01-2.25-2.25h-6.5a2.25 2.25 0 01-2.25 2.25M6 13.5v1.875a.375.375 0 00.375.375h11.25a.375.375 0 00.375-.375V13.5' },
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
                        disabled={selectedCount === 0 && action.id !== 'add'}
                    >
                        <Icon path={action.icon} className="w-4 h-4 mr-2" />
                        {action.label}
                    </Button>
                ))}
            </div>
            <div className="w-1/3">
                 <input 
                    type="text" 
                    placeholder="Tìm theo số phiếu, tên khách hàng..." 
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => onSearchChange(e.target.value)}
                 />
            </div>
        </div>
    );
};

export const SalesContent = () => {
    const { data: sales, isLoading, error, pagination, setSearchQuery, setCurrentPage } = useApiData('/api/v1/sales', { include: 'customer,items.product' });
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);

    const handleSelectAll = (e) => {
        if (e.target.checked) { setSelectedIds(new Set(sales.map(s => s.id))); } 
        else { setSelectedIds(new Set()); }
    };

    const handleSelectOne = (id) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) { newSelectedIds.delete(id); } 
        else { newSelectedIds.add(id); }
        setSelectedIds(newSelectedIds);
    };

    const handleRowClick = (sale) => {
        setSelectedSale(sale);
        setIsModalOpen(true);
    };
    
    const handleToolbarAction = (action) => {
        if (action === 'add') {
            setSelectedSale(null);
            setIsModalOpen(true);
        } else {
            alert(`Thực hiện hành động: ${action} cho ${selectedIds.size} đơn hàng.`);
        }
    };

    const isAllSelected = useMemo(() => sales && sales.length > 0 && selectedIds.size === sales.length, [sales, selectedIds]);
    const isIndeterminate = useMemo(() => selectedIds.size > 0 && !isAllSelected, [selectedIds, isAllSelected]);
    
    if (isLoading && !sales?.length) { return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>; }
    if (error) { return <div className="p-6 text-red-600 bg-red-50 rounded-md m-4"><strong>Lỗi:</strong> {error}</div>; }

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 relative pb-20">
            <SalesToolbar selectedCount={selectedIds.size} onAction={handleToolbarAction} onSearchChange={setSearchQuery} />
            <div className="border rounded-lg bg-white shadow-sm flex-1 flex flex-col">
                <div className="p-3 border-b"><Pagination pagination={pagination} onPageChange={setCurrentPage} /></div>
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-3 w-10 text-center"><Checkbox checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleSelectAll} /></th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Ngày / Số phiếu</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Tên Khách Hàng</th>
                                <th className="py-2 px-3 text-right font-medium text-gray-600">Tổng cộng</th>
                                <th className="py-2 px-3 text-center font-medium text-gray-600">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sales && sales.map((sale) => (
                                <tr key={sale.id} className={`hover:bg-blue-50 ${selectedIds.has(sale.id) ? 'bg-blue-100' : ''}`}>
                                    <td className="p-3 text-center"><Checkbox checked={selectedIds.has(sale.id)} onChange={() => handleSelectOne(sale.id)} /></td>
                                    <td className="py-2 px-3">
                                        <button onClick={() => handleRowClick(sale)} className="text-blue-600 hover:underline font-mono">{sale.order_code}</button>
                                        <div className="text-gray-500 text-xs">{new Date(sale.order_date).toLocaleDateString('vi-VN')}</div>
                                    </td>
                                    <td className="py-2 px-3 font-medium text-gray-800">{sale.customer?.name || 'Khách lẻ'}</td>
                                    <td className="py-2 px-3 text-right font-medium text-gray-800">{new Intl.NumberFormat('vi-VN').format(sale.total_amount || 0)} đ</td>
                                    <td className="py-2 px-3 text-center">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                            sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            sale.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>{sale.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="p-3 border-t"><Pagination pagination={pagination} onPageChange={setCurrentPage} /></div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedSale ? `Chi tiết: ${selectedSale.order_code}` : "Tạo đơn hàng mới"}>
                {selectedSale ? <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">{JSON.stringify(selectedSale, null, 2)}</pre> : <div>Form tạo mới ở đây.</div>}
            </Modal>
        </div>
    );
};