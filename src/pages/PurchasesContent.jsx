import React, { useState, useMemo } from 'react';
import { useApiData } from '../hooks/useApiData.jsx';
import { Icon, Modal, Button, Checkbox, Pagination } from '../components/ui.jsx';

const PurchaseToolbar = ({ selectedCount, onAction, onSearchChange }) => {
    const actions = [
        { id: 'add', label: 'Thêm mới', icon: 'M12 4.5v15m7.5-7.5h-15' },
        { id: 'approve', label: 'Phê duyệt', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'cancel', label: 'Hủy', icon: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
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
                    placeholder="Tìm theo số PO, nhà cung cấp..." 
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => onSearchChange(e.target.value)}
                 />
            </div>
        </div>
    );
};

export const PurchasesContent = () => {
    const { data: orders, isLoading, error, pagination, setSearchQuery, setCurrentPage } = useApiData('/api/v1/purchase_orders', { include: 'customer' });
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const handleSelectAll = (e) => {
        if (e.target.checked) { setSelectedIds(new Set(orders.map(o => o.id))); } 
        else { setSelectedIds(new Set()); }
    };

    const handleSelectOne = (id) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) { newSelectedIds.delete(id); } 
        else { newSelectedIds.add(id); }
        setSelectedIds(newSelectedIds);
    };

    const handleRowClick = (order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };
    
    const handleToolbarAction = (action) => {
        if (action === 'add') {
            setSelectedOrder(null);
            setIsModalOpen(true);
        } else {
            alert(`Thực hiện hành động: ${action} cho ${selectedIds.size} đơn hàng.`);
        }
    };

    const isAllSelected = useMemo(() => orders && orders.length > 0 && selectedIds.size === orders.length, [orders, selectedIds]);
    const isIndeterminate = useMemo(() => selectedIds.size > 0 && !isAllSelected, [selectedIds, isAllSelected]);

    if (isLoading && !orders?.length) { return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>; }
    if (error) { return <div className="p-6 text-red-600 bg-red-50 rounded-md m-4"><strong>Lỗi:</strong> {error}</div>; }

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50">
            <PurchaseToolbar selectedCount={selectedIds.size} onAction={handleToolbarAction} onSearchChange={setSearchQuery} />
            <div className="border rounded-lg bg-white shadow-sm flex-1 flex flex-col">
                <div className="p-3 border-b"><Pagination pagination={pagination} onPageChange={setCurrentPage} /></div>
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-3 w-10 text-center"><Checkbox checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleSelectAll} /></th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Ngày / Số PO</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Tên Nhà Cung Cấp</th>
                                <th className="py-2 px-3 text-right font-medium text-gray-600">Tổng cộng</th>
                                <th className="py-2 px-3 text-center font-medium text-gray-600">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {orders && orders.map((order) => (
                                <tr key={order.id} className={`hover:bg-blue-50 ${selectedIds.has(order.id) ? 'bg-blue-100' : ''}`}>
                                    <td className="p-3 text-center"><Checkbox checked={selectedIds.has(order.id)} onChange={() => handleSelectOne(order.id)} /></td>
                                    <td className="py-2 px-3">
                                        <button onClick={() => handleRowClick(order)} className="text-blue-600 hover:underline font-mono">{order.po_code}</button>
                                        <div className="text-gray-500 text-xs">{new Date(order.order_date).toLocaleDateString('vi-VN')}</div>
                                    </td>
                                    <td className="py-2 px-3 font-medium text-gray-800">{order.customer?.name || 'N/A'}</td>
                                    <td className="py-2 px-3 text-right font-medium text-gray-800">{new Intl.NumberFormat('vi-VN').format(order.total_amount || 0)} đ</td>
                                    <td className="py-2 px-3 text-center">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                            order.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>{order.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="p-3 border-t"><Pagination pagination={pagination} onPageChange={setCurrentPage} /></div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedOrder ? `Chi tiết: ${selectedOrder.po_code}` : "Tạo đơn mua hàng mới"}>
                {selectedOrder ? <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">{JSON.stringify(selectedOrder, null, 2)}</pre> : <div>Form tạo mới ở đây.</div>}
            </Modal>
        </div>
    );
};