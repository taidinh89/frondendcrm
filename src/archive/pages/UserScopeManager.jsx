// src/archive/pages/UserScopeManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// 1. TỪ ĐIỂN PHẠM VI (SCOPE DICTIONARY) - Kế thừa từ kế hoạch tổng thể [cite: 101]
const SCOPE_DICTIONARY = [
    { key: 'branches', label: 'Chi nhánh', dbColumn: 'branch_id', module: 'Đơn hàng/Khách hàng' },
    { key: 'banks', label: 'Ngân hàng (Sepay)', dbColumn: 'bank_brand_name', module: 'Dòng tiền' },
    { key: 'warehouses', label: 'Kho hàng', dbColumn: 'warehouse_id', module: 'Tồn kho' },
];

// 2. DANH SÁCH CHÍNH SÁCH (POLICIES) - Lớp 3 [cite: 76]
const POLICY_LIST = [
    { key: 'block_excel', label: 'Chặn Xuất Excel', desc: 'Ẩn nút và chặn API tải file' },
    { key: 'mask_phone', label: 'Ẩn Số Điện Thoại', desc: 'Hiển thị dạng 090***123' },
    { key: 'hide_financial_data', label: 'Ẩn Giá Vốn/Lợi Nhuận', desc: 'Chỉ xem được doanh thu' },
];

const UserScopeManager = () => {
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [config, setConfig] = useState({ data_scopes: {}, access_policies: {} });
    const [loading, setLoading] = useState(true);

    // Lấy danh sách nhóm từ Backend (Kế thừa từ các nhóm đã tạo ở PermissionManager) [cite: 40]
    useEffect(() => {
        const loadRoles = async () => {
            try {
                const res = await axios.get('/api/v2/security/roles?per_page=100');
                const filteredRoles = res.data.data.filter(r => r.name !== 'Super Admin');
                setRoles(filteredRoles);
                if (filteredRoles.length > 0) handleSelectRole(filteredRoles[0]);
            } catch (e) { toast.error("Không thể tải danh sách nhóm"); }
            finally { setLoading(false); }
        };
        loadRoles();
    }, []);

    const handleSelectRole = (role) => {
        setSelectedRole(role);
        // Load cấu hình JSON của Role đó
        setConfig({
            data_scopes: role.data_scopes || {},
            access_policies: role.access_policies || {}
        });
    };

    const handleSave = async () => {
        try {
            await axios.put(`/api/v2/security/roles/${selectedRole.id}/scopes`, config);
            toast.success(`Đã cập nhật phạm vi cho nhóm ${selectedRole.name}`);
            // Cập nhật lại list roles tại chỗ
            setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, ...config } : r));
        } catch (e) { toast.error("Lỗi khi lưu cấu hình"); }
    };

    if (loading) return <div className="p-6">Đang tải dữ liệu...</div>;

    return (
        <div className="flex h-full bg-gray-50 min-h-screen p-6 gap-6 animate-fadeIn">
            {/* CỘT TRÁI: DANH SÁCH NHÓM (Kế thừa từ PermissionManager) */}
            <div className="w-1/4 bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-100 border-b font-bold text-gray-700">👥 Chọn Nhóm Quyền</div>
                <div className="flex-1 overflow-y-auto">
                    {roles.map(role => (
                        <button
                            key={role.id}
                            onClick={() => handleSelectRole(role)}
                            className={`w-full text-left px-4 py-3 border-b transition-all ${selectedRole?.id === role.id ? 'bg-blue-50 border-r-4 border-r-blue-600 text-blue-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                        >
                            {role.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* CỘT PHẢI: CẤU HÌNH CHI TIẾT */}
            <div className="flex-1 space-y-6">
                {selectedRole && (
                    <>
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Cấu hình: {selectedRole.name}</h2>
                                    <p className="text-sm text-gray-500">Thiết lập phạm vi dữ liệu và các hạn chế đặc biệt cho nhóm này.</p>
                                </div>
                                <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-all">
                                    💾 Lưu Cấu Hình Nhóm
                                </button>
                            </div>

                            {/* PHẦN 1: LỚP 2 - PHẠM VI DỮ LIỆU (DATA SCOPES) */}
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-2">📦 Lớp 2: Phạm vi Dữ liệu (Dòng dữ liệu)</h3>

                                <div className="space-y-4">
                                    {/* Chế độ xem tổng quát */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="font-medium text-gray-700">Chế độ xem mặc định:</span>
                                        <select
                                            className="border rounded p-1 text-sm bg-white"
                                            value={config.data_scopes.view_type || 'own_only'}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                data_scopes: { ...config.data_scopes, view_type: e.target.value }
                                            })}
                                        >
                                            <option value="all">Toàn bộ hệ thống (View All)</option>
                                            <option value="own_only">Chỉ dữ liệu do mình tạo (Own Only)</option>
                                            <option value="custom">Giới hạn theo danh sách bên dưới</option>
                                        </select>
                                    </div>

                                    {/* Lọc theo danh sách chi tiết (Chỉ hiện khi chọn custom) */}
                                    {config.data_scopes.view_type === 'custom' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-fadeIn">
                                            {SCOPE_DICTIONARY.map(scope => (
                                                <div key={scope.key} className="border p-4 rounded-lg bg-white shadow-sm">
                                                    <label className="block font-bold text-gray-700 mb-2">{scope.label}</label>
                                                    <input
                                                        className="w-full border p-2 rounded text-sm placeholder:text-gray-300"
                                                        placeholder="VD: VCB, MB (cách nhau bằng dấu phẩy)"
                                                        value={config.data_scopes[scope.key]?.join(', ') || ''}
                                                        onChange={(e) => {
                                                            const vals = e.target.value.split(',').map(v => v.trim()).filter(v => v !== "");
                                                            setConfig({
                                                                ...config,
                                                                data_scopes: { ...config.data_scopes, [scope.key]: vals }
                                                            });
                                                        }}
                                                    />
                                                    <p className="text-[10px] text-gray-400 mt-1 italic">Áp dụng cho module: {scope.module}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* PHẦN 2: LỚP 3 - CHÍNH SÁCH HẠN CHẾ (ACCESS POLICIES) */}
                            <div>
                                <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-4 border-b pb-2">🛡️ Lớp 3: Chính sách & Hạn chế (Hành động)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {POLICY_LIST.map(policy => (
                                        <div key={policy.key} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
                                            onClick={() => setConfig({
                                                ...config,
                                                access_policies: { ...config.access_policies, [policy.key]: !config.access_policies[policy.key] }
                                            })}
                                        >
                                            <input
                                                type="checkbox"
                                                className="mt-1 w-4 h-4 text-orange-600"
                                                checked={config.access_policies[policy.key] || false}
                                                onChange={() => { }} // Handle by div click
                                            />
                                            <div>
                                                <div className="font-bold text-gray-800 text-sm">{policy.label}</div>
                                                <div className="text-[10px] text-gray-500 leading-tight">{policy.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export { UserScopeManager };