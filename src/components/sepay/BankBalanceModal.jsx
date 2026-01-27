// src/components/sepay/BankBalanceModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { NumericFormat } from 'react-number-format';
import axios from 'axios';

export const BankBalanceModal = ({ isOpen, onClose, bankAccount, onSuccess }) => {
    const isEdit = !!bankAccount;
    
    const [formData, setFormData] = useState({
        bank_name: 'MBBank',
        account_number: '',
        account_owner: '',
        balance: ''
    });
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (bankAccount) {
                setFormData({
                    bank_name: bankAccount.bank_name,
                    account_number: bankAccount.account_number,
                    account_owner: bankAccount.account_owner || '',
                    balance: bankAccount.balance // Lấy số nguyên gốc từ DB
                });
            } else {
                setFormData({
                    bank_name: 'MBBank',
                    account_number: '',
                    account_owner: '',
                    balance: ''
                });
            }
        }
    }, [isOpen, bankAccount]);

    const handleSubmit = async () => {
        // 1. Thêm Xác nhận
        if (!window.confirm(`Bạn có chắc chắn muốn cập nhật số dư thành: ${formData.balance} không?`)) {
            return;
        }

        setLoading(true);
        try {
            if (isEdit) {
                await axios.post('/api/v2/admin/sepay/balance/update', {
                    id: bankAccount.id,
                    balance: formData.balance,
                    account_owner: formData.account_owner
                });
            } else {
                await axios.post('/api/v2/admin/sepay/balance/create', {
                    bank_name: formData.bank_name,
                    account_number: formData.account_number,
                    account_owner: formData.account_owner,
                    balance: formData.balance
                });
            }
            
            alert(isEdit ? 'Cập nhật thành công!' : 'Thêm tài khoản thành công!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Lỗi: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isEdit ? `Hiệu chỉnh: ${formData.bank_name}` : "Thêm Tài Khoản Ngân Hàng"}
        >
            <div className="p-4 space-y-4">
                {/* Form Ngân hàng & Số TK (Chỉ hiện khi thêm mới) */}
                {!isEdit && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
                            <select 
                                className="w-full px-3 py-2 border rounded"
                                value={formData.bank_name}
                                onChange={e => setFormData({...formData, bank_name: e.target.value})}
                            >
                                <option value="MBBank">MBBank</option>
                                <option value="Vietcombank">Vietcombank</option>
                                <option value="Techcombank">Techcombank</option>
                                <option value="ACB">ACB</option>
                                <option value="VPBank">VPBank</option>
                                <option value="TPBank">TPBank</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 border rounded font-mono"
                                value={formData.account_number}
                                onChange={e => setFormData({...formData, account_number: e.target.value})}
                                placeholder="VD: 0333..."
                            />
                        </div>
                    </div>
                )}

                {/* Tên chủ tài khoản */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên chủ tài khoản</label>
                    <input 
                        type="text" 
                        className="w-full px-3 py-2 border rounded uppercase"
                        value={formData.account_owner}
                        onChange={(e) => setFormData({...formData, account_owner: e.target.value})}
                        placeholder="VD: NGUYEN VAN A"
                    />
                </div>

                {/* [SỬA ĐỔI] Nhập số dư: Bỏ dấu phẩy/chấm, VNĐ ra ngoài */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isEdit ? "Số dư thực tế (Nhập số liền, không dấu)" : "Số dư ban đầu"}
                    </label>
                    <div className="flex items-center">
                        <NumericFormat
                            value={formData.balance}
                            onValueChange={(values) => setFormData({...formData, balance: values.floatValue})}
                            thousandSeparator={false} // TẮT DẤU PHẨY
                            decimalScale={0}          // TẮT SỐ THẬP PHÂN (DẤU CHẤM)
                            allowNegative={false}
                            className="flex-1 px-3 py-2 border rounded-l font-bold text-lg text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nhập số tiền..."
                        />
                        <span className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r text-gray-600 font-bold text-lg">
                            VNĐ
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Ví dụ: Nhập <strong>1000000</strong> (Không nhập 1.000.000)
                    </p>
                </div>
            </div>

            <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50 rounded-b-lg">
                <Button variant="secondary" onClick={onClose} disabled={loading}>Hủy</Button>
                <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Đang lưu...' : (isEdit ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản')}
                </Button>
            </div>
        </Modal>
    );
};