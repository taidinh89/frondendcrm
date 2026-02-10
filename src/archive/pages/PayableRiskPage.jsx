import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, ComposedChart, Line 
} from 'recharts';

import { useApiData } from '../../hooks/useApiData.jsx';
import { AnalysisCard } from '../../components/analysis/AnalysisCard.jsx';
import { Tabs } from '../../components/analysis/Tabs.jsx';
import { Button, Modal, Icon } from '../../components/ui.jsx';
import { exportToExcel } from '../../utils/exportUtils.js';

const formatPrice = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

// Màu sắc phân biệt cho trang Phải Trả (Tím - Cam - Đỏ)
const COLORS = {
    SAFE: '#8b5cf6', // Tím nhạt (Trong hạn)
    EARLY: '#6366f1', // Indigo (Sắp đến hạn)
    OVERDUE: '#f59e0b', // Cam (Quá hạn)
    BAD: '#ef4444', // Đỏ (Nợ xấu - mất uy tín)
    LOST: '#7f1d1d' // Đỏ đậm
};

// =============================================================================
// SUB-COMPONENT 1: EDITABLE CELL
// =============================================================================
const EditableCell = ({ initialValue, onSave, rowData }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { setValue(initialValue || ''); }, [initialValue]);

    const handleSave = async () => {
        if (value === (initialValue || '')) { setIsEditing(false); return; }
        setIsLoading(true);
        try {
            await onSave(value, rowData);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert("Lỗi lưu ghi chú.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') { setValue(initialValue || ''); setIsEditing(false); }
    };

    if (isEditing) {
        return (
            <div className="relative w-full">
                <input autoFocus type="text" className="w-full text-xs border border-purple-500 rounded px-2 py-1 shadow-sm outline-none" value={value} onChange={(e) => setValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} disabled={isLoading} />
            </div>
        );
    }

    return (
        <div onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="cursor-pointer hover:bg-purple-50 p-1.5 rounded min-h-[28px] text-xs text-gray-700 flex items-center group border border-transparent hover:border-purple-200 w-full">
            <span className="truncate w-full">{value || <span className="text-gray-300 italic">Ghi chú...</span>}</span>
            <Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" className="w-3 h-3 text-gray-300 ml-1 opacity-0 group-hover:opacity-100" />
        </div>
    );
};

// =============================================================================
// SUB-COMPONENT 2: CREDIT BAR (Hạn mức NCC cấp cho mình)
// =============================================================================
const CreditBar = ({ balance, limit, overdueDays }) => {
    if (!limit || limit === 0) return <span className="text-[10px] text-gray-400 italic">Không giới hạn</span>;
    
    const percent = Math.min((balance / limit) * 100, 100);
    const isOverLimit = balance > limit;
    
    let color = 'bg-purple-500'; 
    if (percent > 80) color = 'bg-yellow-500';
    if (isOverLimit) color = 'bg-red-500'; // Vượt hạn mức nợ NCC cho phép -> Nguy hiểm

    return (
        <div className="w-full max-w-[140px]">
            <div className="flex justify-between text-[10px] mb-0.5 text-gray-600">
                <span className={isOverLimit ? 'text-red-600 font-bold' : ''}>{percent.toFixed(0)}%</span>
                <span title={`Hạn mức NCC cấp: ${formatPrice(limit)}`}>HM: {(limit/1e6).toFixed(0)}M</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden relative">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
            </div>
            {isOverLimit && <div className="text-[10px] text-red-600 font-bold mt-0.5">Vượt: {formatPrice(balance - limit)}</div>}
        </div>
    );
};

// =============================================================================
// MAIN PAGE: PAYABLE RISK (PHẢI TRẢ)
// =============================================================================
export const PayableRiskPage = ({ setAppTitle }) => {
    const [activeTab, setActiveTab] = useState('all_suppliers'); 
    const [filterGroup, setFilterGroup] = useState('ALL');
    const [filterEmployee, setFilterEmployee] = useState('ALL'); 
    const [filterSearch, setFilterSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); 

    const [evidenceSupplier, setEvidenceSupplier] = useState(null);
    const [evidenceList, setEvidenceList] = useState([]);
    const [loadingEvidence, setLoadingEvidence] = useState(false);

    // 🔥 GỌI API VỚI TYPE = PAYABLE
    const { data: apiData, pagination: rawMeta, isLoading } = useApiData('/api/v2/debt-analysis', { 
        type: 'payable', // <-- KHÁC BIỆT DUY NHẤT Ở ĐÂY
        min_debt: 1000000 
    });

    const meta = apiData?.meta || rawMeta || { 
        total_system_debt: 0, total_system_overdue: 0, total_system_over_limit: 0, 
        aging_buckets: { safe: 0, early: 0, overdue: 0, bad: 0, lost: 0 },
        date: new Date().toISOString().split('T')[0]
    };

    // Map lại tên biến cho đúng ngữ cảnh Nhà Cung Cấp
    const allSuppliers = apiData?.all_customers || []; // API trả về key chung là all_customers
    const byPurchaser = apiData?.by_employee || [];    // NV Mua hàng
    const byGroup = apiData?.by_group || [];
    const groupOptions = apiData?.filter_options?.groups || [];
    const purchaserOptions = apiData?.filter_options?.employees || [];

    useEffect(() => { setAppTitle('Quản trị Công nợ Phải trả (NCC)'); }, [setAppTitle]);

    // --- CHART DATA ---
    const agingData = [
        { name: 'Trong hạn (<3 ngày)', value: meta.aging_buckets.safe, color: COLORS.SAFE },
        { name: 'Sắp đến hạn (3-7 ngày)', value: meta.aging_buckets.early, color: COLORS.EARLY },
        { name: 'Quá hạn (7-30 ngày)', value: meta.aging_buckets.overdue, color: COLORS.OVERDUE },
        { name: 'Quá hạn lâu (>30 ngày)', value: meta.aging_buckets.bad + meta.aging_buckets.lost, color: COLORS.BAD },
    ];

    const revenueVsDebtData = byGroup.slice(0, 10).map(g => ({
        name: g.name,
        import_val: g.revenue, // Giá trị nhập
        debt: g.debt,
    }));

    // --- FILTER ---
    const filteredList = useMemo(() => {
        return allSuppliers.filter(c => {
            if (filterGroup !== 'ALL' && c.group !== filterGroup) return false;
            if (filterEmployee !== 'ALL' && c.employee !== filterEmployee) return false;
            if (filterSearch) {
                const term = filterSearch.toLowerCase();
                if (!c.name.toLowerCase().includes(term) && !c.code.toLowerCase().includes(term)) return false;
            }
            if (filterStatus === 'OVERDUE' && c.overdue_days <= 7) return false;
            if (filterStatus === 'BAD' && c.overdue_days <= 30) return false;
            return true;
        });
    }, [allSuppliers, filterGroup, filterEmployee, filterSearch, filterStatus]);

    // --- HANDLERS ---
    const handleChartGroupClick = (data) => {
        if (data && data.activeLabel) {
            setFilterGroup(data.activeLabel);
            setActiveTab('all_suppliers');
        }
    };

    const handleViewEvidence = async (supplier) => {
        setEvidenceSupplier(supplier);
        setLoadingEvidence(true);
        try {
            const res = await axios.get(`/api/v2/debt-analysis/evidence/${supplier.code}`, { params: { type: 'payable' } });
            setEvidenceList(res.data);
        } catch (e) { console.error(e); setEvidenceList([]); } 
        finally { setLoadingEvidence(false); }
    };

    const handleUpdateNote = async (newNote, supplier) => {
        await axios.post('/api/v2/debt-analysis/update-note', {
            partner_code: supplier.code,
            date: meta.date,
            type: 'payable', // Lưu ý type
            note: newNote
        });
        supplier.notes = newNote; 
    };

    const handleExport = async () => {
        if (filteredList.length === 0) return alert("Không có dữ liệu");
        const excelData = filteredList.map(c => ({
            "Mã NCC": c.code, "Tên NCC": c.name, "Nhóm": c.group, "NV Mua Hàng": c.employee,
            "Phải Trả": c.debt, "Giá Trị Nhập 30d": c.revenue,
            "Quá Hạn (ngày)": c.overdue_days, "Hạn Mức NCC Cấp": c.limit, "Ghi Chú": c.notes
        }));
        await exportToExcel([{ sheetName: "Phai_Tra_NCC", data: excelData }], `Phai_Tra_${meta.date}`);
    };

    if (isLoading && !apiData) return <div className="h-screen flex items-center justify-center text-purple-600 font-medium">Đang tải dữ liệu công nợ phải trả...</div>;

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AnalysisCard className="border-l-4 border-purple-600">
                    <div className="text-xs font-bold text-gray-500 uppercase">Tổng Phải Trả</div>
                    <div className="text-xl font-bold text-purple-700">{formatPrice(meta.total_system_debt)}</div>
                </AnalysisCard>
                <AnalysisCard className="border-l-4 border-yellow-500">
                    <div className="text-xs font-bold text-yellow-600 uppercase">Quá Hạn Thanh Toán</div>
                    <div className="text-xl font-bold text-yellow-700">{formatPrice(meta.total_system_overdue)}</div>
                </AnalysisCard>
                <AnalysisCard className="border-l-4 border-red-500 bg-red-50">
                    <div className="text-xs font-bold text-red-600 uppercase">Vượt Hạn Mức Tín Dụng</div>
                    <div className="text-xl font-bold text-red-700">{formatPrice(meta.total_system_over_limit)}</div>
                    <div className="text-[10px] text-red-400 italic">Rủi ro bị cắt hàng</div>
                </AnalysisCard>
                <AnalysisCard className="border-l-4 border-gray-500">
                    <div className="text-xs font-bold text-gray-500 uppercase">Số Lượng NCC</div>
                    <div className="text-xl font-bold text-gray-700">{allSuppliers.length}</div>
                </AnalysisCard>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalysisCard title="Cấu trúc Tuổi nợ Phải trả">
                    <div className="h-64 w-full flex justify-center items-center">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={agingData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                                    {agingData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip formatter={(v) => formatPrice(v)} />
                                <Legend layout="vertical" verticalAlign="middle" align="right"/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </AnalysisCard>

                <AnalysisCard title="Tương quan Giá trị Nhập (Cột) vs Phải trả (Dây)">
                    <div className="h-64 w-full">
                        <ResponsiveContainer>
                            <ComposedChart data={revenueVsDebtData} margin={{top: 20, right: 20, bottom: 20, left: 20}} onClick={handleChartGroupClick}>
                                <CartesianGrid stroke="#f5f5f5" />
                                <XAxis dataKey="name" scale="band" tick={{fontSize: 10}} interval={0} />
                                <YAxis yAxisId="left" orientation="left" tickFormatter={(v) => (v/1e6).toFixed(0)+'M'} />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => (v/1e6).toFixed(0)+'M'} />
                                <Tooltip formatter={(v) => formatPrice(v)} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="import_val" name="Giá trị nhập 30 ngày" barSize={30} fill="#8884d8" className="cursor-pointer hover:opacity-80"/>
                                <Line yAxisId="right" type="monotone" dataKey="debt" name="Tổng phải trả hiện tại" stroke="#ff7300" strokeWidth={3} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </AnalysisCard>
            </div>

            {/* TABLE */}
            <AnalysisCard>
                <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg flex flex-col md:flex-row justify-between items-center gap-4">
                    <Tabs 
                        items={[
                            { id: 'all_suppliers', label: 'Danh Sách Tổng Hợp' },
                            { id: 'by_group', label: 'Theo Nhóm NCC' },
                            { id: 'by_purchaser', label: 'Theo NV Mua Hàng' }
                        ]} 
                        activeTab={activeTab} 
                        onTabChange={setActiveTab} 
                    />
                    
                    {activeTab === 'all_suppliers' && (
                        <div className="flex flex-wrap gap-2 items-center justify-end w-full lg:w-auto">
                            <select className="text-xs border rounded px-2 py-1.5 h-8" value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
                                <option value="ALL">-- Tất cả Nhóm --</option>
                                {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <select className="text-xs border rounded px-2 py-1.5 h-8" value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
                                <option value="ALL">-- Tất cả NV Mua --</option>
                                {purchaserOptions.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                            <input type="text" placeholder="Tìm tên, mã..." className="text-xs border rounded pl-2 py-1.5 w-28 h-8" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
                            <Button size="xs" variant="primary" onClick={handleExport} className="bg-purple-600 hover:bg-purple-700 h-8">Excel</Button>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {activeTab === 'all_suppliers' && (
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left w-64">Nhà Cung Cấp</th>
                                    <th className="px-4 py-3 text-left w-40">Nhóm / NV Mua</th>
                                    <th className="px-4 py-3 text-right">Tổng Phải Trả</th>
                                    <th className="px-4 py-3 text-right">Giá Trị Nhập 30d</th>
                                    <th className="px-4 py-3 text-center">Tuổi Nợ</th>
                                    <th className="px-4 py-3 w-40 text-center">Hạn Mức NCC</th>
                                    <th className="px-4 py-3 w-48 text-left">Ghi Chú</th>
                                    <th className="px-4 py-3 text-center w-16">Soi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y bg-white">
                                {filteredList.slice(0, 100).map((c, idx) => (
                                    <tr key={c.code} className="hover:bg-purple-50 transition-colors">
                                        <td className="px-4 py-2">
                                            <div className="font-bold text-gray-800 line-clamp-1" onClick={() => handleViewEvidence(c)} title="Click để soi công nợ" style={{cursor: 'pointer'}}>{c.name}</div>
                                            <div className="text-[10px] text-gray-400 font-mono">{c.code}</div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="text-gray-600">{c.group}</div>
                                            <div className="text-purple-600 font-medium">{c.employee}</div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-bold text-gray-800">{formatPrice(c.debt)}</td>
                                        <td className="px-4 py-2 text-right text-gray-600">{formatPrice(c.revenue)}</td>
                                        <td className="px-4 py-2 text-center font-bold">
                                            {c.overdue_days > 0 ? <span className="text-red-600">{c.overdue_days} ngày</span> : <span className="text-green-600">Trong hạn</span>}
                                        </td>
                                        <td className="px-4 py-2"><CreditBar balance={c.debt} limit={c.limit} overdueDays={c.overdue_days} /></td>
                                        <td className="px-4 py-2"><EditableCell initialValue={c.notes} rowData={c} onSave={handleUpdateNote} /></td>
                                        <td className="px-4 py-2 text-center"><button onClick={() => handleViewEvidence(c)} className="text-gray-400 hover:text-purple-600"><Icon path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" className="w-4 h-4" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    
                    {/* BẢNG NHÓM & NHÂN VIÊN (Tương tự trang trước nhưng đổi màu text) */}
                    {activeTab === 'by_group' && (
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left">Nhóm NCC</th>
                                    <th className="px-4 py-3 text-center">Số lượng</th>
                                    <th className="px-4 py-3 text-right">Tổng Phải Trả</th>
                                    <th className="px-4 py-3 text-right">Giá Trị Nhập 30d</th>
                                    <th className="px-4 py-3 text-center">Tác vụ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y">
                                {byGroup.map(g => (
                                    <tr key={g.name} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-bold">{g.name}</td>
                                        <td className="px-4 py-3 text-center">{g.count}</td>
                                        <td className="px-4 py-3 text-right font-bold text-purple-700">{formatPrice(g.debt)}</td>
                                        <td className="px-4 py-3 text-right">{formatPrice(g.revenue)}</td>
                                        <td className="px-4 py-3 text-center"><button className="text-purple-600 hover:underline text-xs" onClick={() => { setFilterGroup(g.name); setActiveTab('all_suppliers'); }}>Xem NCC</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'by_purchaser' && (
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left">NV Mua Hàng</th>
                                    <th className="px-4 py-3 text-right">Tổng Phải Trả</th>
                                    <th className="px-4 py-3 text-right">Giá Trị Nhập 30d</th>
                                    <th className="px-4 py-3 text-center text-red-600 font-bold">NCC Quá Hạn Trả</th>
                                    <th className="px-4 py-3 text-center">Tác vụ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y">
                                {byPurchaser.map(emp => (
                                    <tr key={emp.name} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{emp.name}</td>
                                        <td className="px-4 py-3 text-right font-bold text-purple-700">{formatPrice(emp.debt)}</td>
                                        <td className="px-4 py-3 text-right">{formatPrice(emp.revenue)}</td>
                                        <td className="px-4 py-3 text-center font-bold text-red-600">{emp.overdue_count}</td>
                                        <td className="px-4 py-3 text-center"><button className="text-purple-600 hover:underline text-xs" onClick={() => { setFilterEmployee(emp.name); setActiveTab('all_suppliers'); }}>Xem NCC</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </AnalysisCard>

            <Modal isOpen={!!evidenceSupplier} onClose={() => setEvidenceSupplier(null)} title={evidenceSupplier ? `Đối chiếu Phải Trả: ${evidenceSupplier.name}` : ''} maxWidthClass="max-w-5xl">
                <div className="p-4">
                    <div className="bg-purple-50 border-l-4 border-purple-400 p-3 mb-4 text-sm text-purple-800 flex justify-between items-center">
                        <div><strong>Tổng Phải Trả:</strong> <span className="text-xl font-bold ml-2">{evidenceList.partner ? formatPrice(evidenceList.partner.total_debt) : '...'}</span></div>
                        <div className="text-right text-xs italic opacity-80">Phân bổ ngược (Reverse FIFO)</div>
                    </div>
                    {loadingEvidence ? <div className="py-8 text-center text-purple-600">Đang truy vết đơn nhập hàng...</div> : (
                        <div className="overflow-x-auto border rounded-lg shadow-sm">
                            <table className="min-w-full text-xs">
                                <thead className="bg-gray-100">
                                    <tr><th className="px-3 py-2 text-left">Ngày Nhập</th><th className="px-3 py-2 text-left">Số Phiếu</th><th className="px-3 py-2 text-left">NV Mua</th><th className="px-3 py-2 text-right">Giá Trị</th><th className="px-3 py-2 text-right font-bold">Còn Nợ</th><th className="px-3 py-2 text-center">Trạng Thái</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(evidenceList.orders || []).map((order, idx) => (
                                        <tr key={idx} className={order.debt_allocated > 0 ? "bg-red-50" : "hover:bg-gray-50 text-gray-500"}>
                                            <td className="px-3 py-2 font-mono">{order.ngay}</td>
                                            <td className="px-3 py-2 font-bold">{order.so_phieu}</td>
                                            <td className="px-3 py-2">{order.nguoi_phu_trach}</td>
                                            <td className="px-3 py-2 text-right">{formatPrice(order.tong_tien_truoc_thue)}</td>
                                            <td className="px-3 py-2 text-right font-bold text-red-600">{order.debt_allocated > 0 ? formatPrice(order.debt_allocated) : '-'}</td>
                                            <td className="px-3 py-2 text-center text-[10px] font-bold">{order.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="px-4 pb-4 flex justify-end bg-gray-50 pt-3 rounded-b-lg border-t"><Button variant="secondary" onClick={() => setEvidenceSupplier(null)}>Đóng</Button></div>
            </Modal>
        </div>
    );
};