import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useApiData } from '../hooks/useApiData.jsx';
import { Icon, Modal, Button, Checkbox, Pagination } from '../components/ui.jsx';

// Component Form cho việc Thêm/Sửa Khách hàng
const CustomerForm = ({ customer, onSave, onCancel, apiErrors }) => {
    const [formData, setFormData] = useState({
        code: '', name: '', tax_code: '', email: '', phone_1: '', address_1: ''
    });

    useEffect(() => {
        if (customer) {
            setFormData({
                code: customer.code || '',
                name: customer.name || '',
                tax_code: customer.tax_code || '',
                email: customer.email || '',
                phone_1: customer.phone_1 || '',
                address_1: customer.address_1 || '',
            });
        } else {
            setFormData({ code: '', name: '', tax_code: '', email: '', phone_1: '', address_1: '' });
        }
    }, [customer]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const renderError = (field) => {
        if (apiErrors && apiErrors[field]) {
            return <p className="text-red-500 text-xs mt-1">{apiErrors[field][0]}</p>;
        }
        return null;
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mã khách hàng</label>
                    <input type="text" name="code" value={formData.code} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                    {renderError('code')}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tên khách hàng (*)</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                    {renderError('name')}
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Mã số thuế</label>
                    <input type="text" name="tax_code" value={formData.tax_code} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                    {renderError('tax_code')}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Điện thoại</label>
                    <input type="text" name="phone_1" value={formData.phone_1} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                    {renderError('phone_1')}
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                    {renderError('email')}
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                    <input type="text" name="address_1" value={formData.address_1} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                    {renderError('address_1')}
                </div>
            </div>
            <div className="flex justify-end pt-4 space-x-2">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit" variant="primary">Lưu thay đổi</Button>
            </div>
        </form>
    );
};

// Component Toolbar không đổi
const CustomerToolbar = ({ selectedCount, onAction, onSearchChange }) => {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
                <Button variant='primary' onClick={() => onAction('add')}>
                    <Icon path='M12 4.5v15m7.5-7.5h-15' className="w-4 h-4 mr-2" /> Thêm mới
                </Button>
                 <Button variant='danger' onClick={() => onAction('delete')} disabled={selectedCount === 0}>
                    <Icon path='M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.54 0c-.265.04-.529.083-.793.13l-1.992 5.23a.75.75 0 00.443.954l.56.21a.75.75 0 00.954-.443L7.85 5.79m11.386 0c-1.258-.233-2.544-.42-3.864-.562' className="w-4 h-4 mr-2" /> Xóa ({selectedCount})
                </Button>
                <Button variant='secondary' onClick={() => onAction('export')}>
                    <Icon path='M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3' className="w-4 h-4 mr-2" /> Excel
                </Button>
            </div>
            <div className="w-1/3">
                 <input 
                    type="text" 
                    placeholder="Tìm theo mã, tên, MST, điện thoại..." 
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => onSearchChange(e.target.value)}
                 />
            </div>
        </div>
    );
};

// Component chính
export const CustomersContent = () => {
    const { data: customers, isLoading, error, pagination, setSearchQuery, setCurrentPage, fetchData } = useApiData('/api/v1/customers');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [apiErrors, setApiErrors] = useState(null);

    const handleSelectAll = (e) => {
        if (e.target.checked) { setSelectedIds(new Set(customers.map(c => c.id))); } 
        else { setSelectedIds(new Set()); }
    };

    const handleSelectOne = (id) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) { newSelectedIds.delete(id); } 
        else { newSelectedIds.add(id); }
        setSelectedIds(newSelectedIds);
    };

    const handleRowClick = (customer) => {
        setApiErrors(null);
        setSelectedCustomer(customer);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCustomer(null);
        setApiErrors(null);
    };

    const handleSaveCustomer = async (formData) => {
        try {
            if (selectedCustomer) { // Update
                await axios.put(`/api/v1/customers/${selectedCustomer.id}`, formData);
            } else { // Create
                await axios.post('/api/v1/customers', formData);
            }
            fetchData(); // Refresh data
            handleCloseModal();
        } catch (err) {
            if (err.response && err.response.status === 422) {
                setApiErrors(err.response.data.errors);
            } else {
                alert(`Lỗi: ${err.response?.data?.message || err.message}`);
            }
        }
    };

    const handleDeleteCustomers = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} khách hàng đã chọn?`)) {
            try {
                // API thường hỗ trợ xóa nhiều qua body hoặc query param
                // Giả sử API hỗ trợ xóa qua body với một mảng Ids
                await axios.delete('/api/v1/customers', { data: { ids: Array.from(selectedIds) } });
                fetchData(); // Refresh
                setSelectedIds(new Set());
            } catch (err) {
                 alert(`Lỗi khi xóa: ${err.response?.data?.message || err.message}`);
            }
        }
    };
    
    const handleToolbarAction = (action) => {
        if (action === 'add') {
            setSelectedCustomer(null);
            setApiErrors(null);
            setIsModalOpen(true);
        } else if(action === 'delete') {
            handleDeleteCustomers();
        }
        else {
            alert(`Thực hiện hành động: ${action} cho ${selectedIds.size} khách hàng.`);
        }
    };

    const isAllSelected = useMemo(() => customers && customers.length > 0 && selectedIds.size === customers.length, [customers, selectedIds]);
    const isIndeterminate = useMemo(() => selectedIds.size > 0 && !isAllSelected, [selectedIds, isAllSelected]);

    if (isLoading && !customers?.length) { return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>; }
    if (error) { return <div className="p-6 text-red-600 bg-red-50 rounded-md m-4"><strong>Lỗi:</strong> {error}</div>; }

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50">
            <CustomerToolbar selectedCount={selectedIds.size} onAction={handleToolbarAction} onSearchChange={setSearchQuery} />
            <div className="border rounded-lg bg-white shadow-sm flex-1 flex flex-col">
                <div className="p-3 border-b"><Pagination pagination={pagination} onPageChange={setCurrentPage} /></div>
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-3 w-10 text-center"><Checkbox checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleSelectAll} /></th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Mã</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Tên Khách Hàng</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Mã Số Thuế</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Điện Thoại</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-600">Địa chỉ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {customers && customers.map((customer) => (
                                <tr key={customer.id} className={`hover:bg-blue-50 ${selectedIds.has(customer.id) ? 'bg-blue-100' : ''}`}>
                                    <td className="p-3 text-center"><Checkbox checked={selectedIds.has(customer.id)} onChange={() => handleSelectOne(customer.id)} /></td>
                                    <td className="py-2 px-3">
                                        <button onClick={() => handleRowClick(customer)} className="text-blue-600 hover:underline font-mono">{customer.code}</button>
                                    </td>
                                    <td className="py-2 px-3 font-medium text-gray-800">{customer.name}</td>
                                    <td className="py-2 px-3 text-gray-600">{customer.tax_code}</td>
                                    <td className="py-2 px-3 text-gray-600">{customer.phone_1}</td>
                                    <td className="py-2 px-3 text-gray-600 truncate max-w-xs">{customer.address_1}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="p-3 border-t"><Pagination pagination={pagination} onPageChange={setCurrentPage} /></div>
            </div>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedCustomer ? `Cập nhật: ${selectedCustomer.name}` : "Tạo khách hàng mới"}>
                <CustomerForm 
                    customer={selectedCustomer} 
                    onSave={handleSaveCustomer}
                    onCancel={handleCloseModal}
                    apiErrors={apiErrors}
                />
            </Modal>
        </div>
    );
};