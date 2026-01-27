import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Input, Icon } from '../ui'; // Tái sử dụng UI chuẩn
import { NumericFormat } from 'react-number-format';

export const StaticQrModal = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [qrImage, setQrImage] = useState(null);
    const [bankList, setBankList] = useState([]);
    
    // Form Data
    const [formData, setFormData] = useState({
        account_number: '', // Để trống sẽ lấy mặc định
        template: 'compact', // compact, print
        type: 'custom',      // custom, user_id, order_id
        value: '',           // Nội dung chuyển khoản
        amount: ''
    });

    // Load danh sách ngân hàng để chọn
    useEffect(() => {
        if (isOpen) {
            axios.get('/api/v2/admin/sepay/balance').then(res => {
                setBankList(res.data.data || []);
                // Chọn mặc định tài khoản đầu tiên
                if (res.data.data?.length > 0) {
                    setFormData(prev => ({...prev, account_number: res.data.data[0].account_number}));
                }
            });
            setQrImage(null); // Reset ảnh cũ
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!formData.value) return alert("Vui lòng nhập nội dung chuyển khoản!");
        
        setLoading(true);
        try {
            const res = await axios.post('/api/v2/sepay/static-qr', {
                ...formData,
                amount: formData.amount || 0
            });
            setQrImage(res.data.data.qr_url);
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi tạo QR");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        if (!qrImage) return;
        const win = window.open('');
        win.document.write(`<img src="${qrImage}" style="width:100%; max-width:500px;" onload="window.print();window.close()" />`);
        win.document.close();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tạo Mã QR Tĩnh (In ấn / Gửi nhanh)">
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CỘT TRÁI: FORM NHẬP LIỆU */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tài khoản thụ hưởng</label>
                            <select 
                                className="w-full px-3 py-2 border rounded text-sm"
                                value={formData.account_number}
                                onChange={e => setFormData({...formData, account_number: e.target.value})}
                            >
                                {bankList.map(b => (
                                    <option key={b.id} value={b.account_number}>
                                        {b.bank_name} - {b.account_number}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Loại nội dung</label>
                            <div className="flex gap-2">
                                <button onClick={()=>setFormData({...formData, type:'custom'})} className={`px-3 py-1 text-xs rounded border ${formData.type==='custom'?'bg-blue-100 border-blue-500 text-blue-700':'bg-white'}`}>Tùy ý</button>
                                <button onClick={()=>setFormData({...formData, type:'user_id'})} className={`px-3 py-1 text-xs rounded border ${formData.type==='user_id'?'bg-blue-100 border-blue-500 text-blue-700':'bg-white'}`}>Nạp User</button>
                                <button onClick={()=>setFormData({...formData, type:'order_id'})} className={`px-3 py-1 text-xs rounded border ${formData.type==='order_id'?'bg-blue-100 border-blue-500 text-blue-700':'bg-white'}`}>Đơn hàng</button>
                            </div>
                        </div>

                        <Input 
                            label={formData.type === 'user_id' ? "Nhập ID User / Mã KH" : "Nội dung chuyển khoản"}
                            value={formData.value}
                            onChange={e => setFormData({...formData, value: e.target.value})}
                            placeholder={formData.type === 'user_id' ? "VD: 12345" : "VD: NAP TIEN..."}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (Để 0 nếu muốn khách tự nhập)</label>
                            <NumericFormat
                                value={formData.amount}
                                onValueChange={(v) => setFormData({...formData, amount: v.floatValue})}
                                thousandSeparator={true}
                                suffix={' VNĐ'}
                                className="w-full px-3 py-2 border rounded font-bold text-gray-700"
                                placeholder="0 VNĐ"
                            />
                        </div>

                        <Button onClick={handleGenerate} disabled={loading} className="w-full mt-2">
                            {loading ? 'Đang tạo...' : 'Tạo QR Code'}
                        </Button>
                    </div>

                    {/* CỘT PHẢI: KẾT QUẢ QR */}
                    <div className="flex flex-col items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300 min-h-[250px] p-4">
                        {qrImage ? (
                            <>
                                <img src={qrImage} alt="QR" className="w-48 h-48 object-contain mb-3 shadow-lg border rounded-lg"/>
                                <div className="flex gap-2 w-full">
                                    <Button onClick={handlePrint} variant="secondary" size="xs" className="flex-1">
                                        <Icon path="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" className="w-4 h-4 mr-1"/>
                                        In Ngay
                                    </Button>
                                    <a href={qrImage} download="qr_code.png" target="_blank" rel="noreferrer" className="flex-1">
                                        <Button variant="primary" size="xs" className="w-full">Tải Ảnh</Button>
                                    </a>
                                </div>
                            </>
                        ) : (
                            <div className="text-gray-400 text-sm text-center">
                                <Icon path="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                                Nhập thông tin và bấm tạo để xem trước
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
                <Button variant="secondary" onClick={onClose}>Đóng</Button>
            </div>
        </Modal>
    );
};