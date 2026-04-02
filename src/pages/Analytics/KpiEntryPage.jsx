import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import moment from 'moment';
import { Icon } from '../../components/ui.jsx';

// --- MODALS FOR DRILL-DOWN ---
import { ProductDetailModal } from '../../components/modals/ProductDetailModal.jsx';
import { CustomerDetailModal } from '../../components/modals/CustomerDetailModal.jsx';
import { SupplierDetailModal } from '../../components/modals/SupplierDetailModal.jsx';
import { EmployeePerformanceModal } from '../../components/modals/EmployeePerformanceModal.jsx';

const DEPARTMENTS = [
    { value: 'sales',      label: 'Kinh doanh', icon: '💰' },
    { value: 'accounting', label: 'Kế toán',    icon: '📊' },
    { value: 'purchasing', label: 'Mua hàng',   icon: '🛒' },
    { value: 'hr',         label: 'Nhân sự',    icon: '👥' },
];

const TARGET_TYPES = [
    { value: 'employee',          label: '👤 Nhân viên' },
    { value: 'employee_group',    label: '👥 Nhóm NV' },
    { value: 'customer',          label: '🏪 Khách hàng' },
    { value: 'customer_group',    label: '🤝 Nhóm KH' },
    { value: 'supplier',          label: '🚛 Nhà cung cấp' },
    { value: 'supplier_group',    label: '🏢 Nhóm Nhà CC' },
    { value: 'brand',             label: '🏷️ Thương hiệu' },
    { value: 'product',           label: '📦 Sản phẩm' },
    { value: 'product_group_l2',  label: '📂 Nhóm SP L2' },
    { value: 'global',            label: '🌐 Toàn Công Ty' },
];

const PERIOD_TYPES = [
    { value: 'month',   label: 'Tháng' },
    { value: 'quarter', label: 'Quý' },
    { value: 'year',    label: 'Năm' },
    { value: 'week',    label: 'Tuần' },
    { value: 'day',     label: 'Ngày' },
];

const fmt = (v) => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));

export const KpiEntryPage = () => {
    const [department, setDepartment]   = useState('sales');
    const [metric, setMetric]           = useState('');
    const [periodType, setPeriodType]   = useState('month');
    const [periodYear, setPeriodYear]   = useState(moment().year());
    const [periodValue, setPeriodValue] = useState(moment().month() + 1);
    const [targetType, setTargetType]   = useState('employee');
    const [scope, setScope]             = useState('global');
    
    const [metrics, setMetrics]         = useState([]);
    const [entities, setEntities]       = useState([]);
    const [targets, setTargets]         = useState([]); // Dữ liệu hiện có ở DB
    const [gridData, setGridData]       = useState([]); // Dữ liệu đang hiển thị trên lưới (kết hợp cả dòng chưa có target)
    const [loading, setLoading]         = useState(false);
    const [saving, setSaving]           = useState(false);
    const [searchTerm, setSearchTerm]   = useState('');

    const [viewingProductId, setViewingProductId] = useState(null);
    const [viewingCustomerId, setViewingCustomerId] = useState(null);
    const [viewingSupplierId, setViewingSupplierId] = useState(null);
    const [viewingEmployeeId, setViewingEmployeeId] = useState(null);
    const [viewingType,       setViewingType]       = useState('employee');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // 1. Load metrics list when department changes
    useEffect(() => {
        axios.get('/api/v2/kpi/metrics', { params: { department } })
            .then(r => {
                setMetrics(r.data);
                if (r.data.length > 0) setMetric(r.data[0].metric_code);
            });
    }, [department]);

    // 2. Load entities and current targets
    const fetchData = useCallback(async () => {
        if (!metric || !targetType) return;
        setLoading(true);
        try {
            // 1. Lấy danh sách thực thể kèm DỮ LIỆU THAM CHIẾU (Actual T-1, Actual LY)
            const resEntities = await axios.get('/api/v2/kpi/lookup', { 
                params: { 
                    type: targetType, 
                    department,
                    metric,
                    period_type: periodType,
                    period_year: periodYear,
                    period_value: periodValue
                } 
            });
            const lookupEntities = resEntities.data || [];
            setEntities(lookupEntities);

            // 2. Lấy các targets hiện có trong DB cho kỳ này
            const resTargets = await axios.get('/api/v2/kpi/targets', {
                params: { department, metric, target_type: targetType, period_type: periodType, period_year: periodYear, period_value: periodValue, kpi_scope: scope }
            });
            const dbTargets = resTargets.data || [];
            setTargets(dbTargets);

            // 3. Xây dựng gridData: hợp nhất entities với dbTargets + historical actuals
            const grid = lookupEntities.map(entity => {
                const target = dbTargets.find(t => t.target_key === entity.key);
                return {
                    key: entity.key,
                    name: entity.name,
                    target_id: target?.id || null,
                    value: target?.target_value || '', 
                    note: target?.note || '',
                    
                    // Historical refs
                    actual_prev: entity.actual_prev || 0,
                    actual_ly: entity.actual_ly || 0,
                    forecast_val: entity.forecast_val || 0,
                    
                    is_modified: false
                };
            });
            setGridData(grid);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [department, metric, targetType, periodType, periodYear, periodValue, scope]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // 3. Edit handler
    const handleGridEdit = (key, field, val) => {
        setGridData(prev => prev.map(row => {
            if (row.key === key) {
                return { ...row, [field]: val, is_modified: true };
            }
            return row;
        }));
    };

    // 4. Multi Edit Actions
    const applyBulkOperation = (type, value) => {
        if (type === 'forecast') {
            setGridData(prev => prev.map(row => ({
                ...row,
                value: Math.round(row.forecast_val),
                is_modified: true
            })));
            return;
        }

        const valNum = parseFloat(value);
        if (isNaN(valNum)) return;

        setGridData(prev => prev.map(row => {
            let newVal = row.value || 0;
            if (type === 'percent') {
                newVal = newVal * (1 + valNum / 100);
            } else if (type === 'add') {
                newVal = (parseFloat(newVal) || 0) + valNum;
            } else if (type === 'set') {
                newVal = valNum;
            }
            return { ...row, value: Math.round(newVal), is_modified: true };
        }));
    };

    // 5. Save all
    const saveAll = async () => {
        const modifiedRows = gridData.filter(row => row.is_modified);
        if (modifiedRows.length === 0) return alert('Không có thay đổi nào để lưu.');

        setSaving(true);
        try {
            const rows = modifiedRows.map(row => ({
                department,
                target_type: targetType,
                target_key: row.key,
                target_name: row.name,
                metric,
                target_value: row.value || 0,
                period_type: periodType,
                period_year: periodYear,
                period_value: periodValue,
                kpi_scope: scope,
                note: row.note
            }));

            await axios.post('/api/v2/kpi/bulk-import', { rows });
            alert('Đã lưu ' + rows.length + ' mục tiêu thành công.');
            fetchData();
        } catch (e) {
            alert('Lỗi: ' + (e.response?.data?.message || e.message));
        } finally {
            setSaving(false);
        }
    };

    // 6. Excel Paste Handler
    const handlePaste = (e) => {
        const text = e.clipboardData.getData('text');
        if (!text) return;
        
        const lines = text.trim().split('\n');
        if (lines.length <= 1 && !lines[0].includes('\t')) return; // Không phải dạng bảng
        
        e.preventDefault();
        const mapping = {};
        lines.forEach(line => {
            const cols = line.split('\t');
            if (cols.length >= 2) {
                const key = cols[0].trim();
                const val = parseFloat(cols[1].replace(/[,\.%]/g, '').trim()) || 0;
                mapping[key] = val;
            }
        });

        // Áp dụng vào gridData
        setGridData(prev => prev.map(row => {
            if (mapping[row.key] !== undefined) {
                return { ...row, value: mapping[row.key], is_modified: true };
            }
            return row;
        }));
        
        alert('Đã khớp và điền giá trị cho ' + Object.keys(mapping).length + ' thực thể từ Clipboard.');
    };



    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleEntityClick = (row) => {
        const key = row.key;
        if (targetType === 'product') setViewingProductId(key);
        else if (targetType === 'customer') setViewingCustomerId(key);
        else if (targetType === 'supplier') setViewingSupplierId(key);
        else if (['employee', 'employee_group', 'customer_group', 'brand', 'product_group_l2'].includes(targetType)) {
            setViewingType(targetType);
            setViewingEmployeeId(key);
        }
    };

    const SortIcon = ({ col }) => {
        if (sortConfig.key !== col) return <Icon name="chevron-down" className="inline-block ml-1 w-2.5 h-2.5 text-slate-200 opacity-0 group-hover:opacity-100" />;
        return <Icon name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} className="inline-block ml-1 w-2.5 h-2.5 text-blue-600" />;
    };

    const sortedGrid = React.useMemo(() => {
        let items = [...gridData].filter(row => 
            row.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.key?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (sortConfig.key) {
            items.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                
                // Xử lý null/undefined
                const aClean = aVal === null || aVal === undefined ? -Infinity : aVal;
                const bClean = bVal === null || bVal === undefined ? -Infinity : bVal;

                if (aClean < bClean) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aClean > bClean) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [gridData, searchTerm, sortConfig]);

    const modifiedCount = gridData.filter(r => r.is_modified).length;

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-full flex flex-col overflow-hidden">
            {/* Header Control Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-end gap-5 shrink-0">
                <div className="space-y-1.5 flex-1 min-w-[150px]">
                    <label className="label-xs">🏢 Bộ phận & Kỳ</label>
                    <div className="flex gap-2">
                        <select className="input-base pr-8" value={department} onChange={e => setDepartment(e.target.value)}>
                            {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.icon} {d.label}</option>)}
                        </select>
                        <select className="input-base pr-8" value={periodType} onChange={e => setPeriodType(e.target.value)}>
                            {PERIOD_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        <input type="number" className="input-base w-24" value={periodYear} onChange={e => setPeriodYear(parseInt(e.target.value))} />
                        {periodType !== 'year' && (
                            <input type="number" className="input-base w-20" value={periodValue} onChange={e => setPeriodValue(parseInt(e.target.value))} />
                        )}
                    </div>
                </div>

                <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <label className="label-xs">🎯 Chỉ số & Phạm vi</label>
                    <div className="flex gap-2">
                        <select className="input-base flex-1" value={metric} onChange={e => setMetric(e.target.value)}>
                            {metrics.map(m => <option key={m.metric_code} value={m.metric_code}>{m.name} ({m.unit})</option>)}
                        </select>
                        <select className="input-base" value={scope} onChange={e => setScope(e.target.value)}>
                            <option value="global">Chung (Cty)</option>
                            <option value="personal">Cá nhân tự đặt</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-1.5 shrink-0">
                    <label className="label-xs">👥 Đối tượng</label>
                    <div className="flex gap-2">
                        <select className="input-base" value={targetType} onChange={e => setTargetType(e.target.value)}>
                            {TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <button onClick={saveAll} disabled={modifiedCount === 0 || saving} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-sm transition-all ${
                            modifiedCount > 0 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                            {saving ? <Icon name="loader" className="w-4 h-4 animate-spin"/> : <Icon name="save" className="w-4 h-4"/>}
                            LƯU {modifiedCount > 0 ? modifiedCount : ''} THAY ĐỔI
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden relative" onPaste={handlePaste}>
                {/* Search & Bulk Ops Bar */}
                <div className="p-4 border-b flex items-center justify-between gap-4 shrink-0 bg-slate-50/50">
                    <div className="relative w-72">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" className="input-base w-full pl-10 h-10" 
                            placeholder="Tìm kiếm đối tượng..." 
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thao tác nhanh hội đồng:</div>
                        <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden text-[11px] font-black">
                            <button onClick={() => applyBulkOperation('forecast')} className="px-3 py-2 border-r hover:bg-emerald-50 text-emerald-600 flex items-center gap-1">
                                <Icon name="wand" className="w-3 h-3" /> Gợi ý AI
                            </button>
                            <button onClick={() => applyBulkOperation('percent', 10)} className="px-3 py-2 border-r hover:bg-slate-50 text-blue-600">+10%</button>
                            <button onClick={() => applyBulkOperation('percent', -10)} className="px-3 py-2 border-r hover:bg-slate-50 text-rose-500">-10%</button>
                            <button onClick={() => {
                                const val = prompt('Nhập % tăng/giảm (VD: 5 hoặc -5):');
                                if (val) applyBulkOperation('percent', val);
                            }} className="px-3 py-2 hover:bg-slate-50">Tùy biến %</button>
                        </div>
                        <div className="text-[10px] text-slate-300 italic">Ctrl+V để Paste từ Excel</div>
                    </div>
                </div>

                {/* Table Grid */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr className="text-left border-b bg-slate-50/80">
                                <th className="px-6 py-3 text-[10px] uppercase font-black tracking-widest text-slate-500 w-16">#</th>
                                <th 
                                    onClick={() => requestSort('name')}
                                    className="px-6 py-3 text-[10px] uppercase font-black tracking-widest text-slate-500 min-w-[200px] cursor-pointer hover:bg-slate-100 transition-all group"
                                >
                                    Đối tượng <SortIcon col="name" />
                                </th>
                                <th 
                                    onClick={() => requestSort('actual_prev')}
                                    className="px-6 py-3 text-[10px] uppercase font-black tracking-widest text-slate-400 font-bold border-l bg-slate-100/50 cursor-pointer hover:bg-slate-200 transition-all group"
                                >
                                    Thực đạt T-1 <SortIcon col="actual_prev" />
                                </th>
                                <th 
                                    onClick={() => requestSort('actual_ly')}
                                    className="px-6 py-3 text-[10px] uppercase font-black tracking-widest text-slate-400 font-bold bg-slate-100/50 cursor-pointer hover:bg-slate-200 transition-all group"
                                >
                                    Cùng kỳ LY <SortIcon col="actual_ly" />
                                </th>
                                <th 
                                    onClick={() => requestSort('value')}
                                    className="px-6 py-3 text-[10px] uppercase font-black tracking-widest text-blue-600 w-64 border-l bg-blue-50/20 cursor-pointer hover:bg-blue-100 transition-all group"
                                >
                                    Mục tiêu ({metrics.find(m => m.metric_code === metric)?.unit}) <SortIcon col="value" />
                                </th>
                                <th className="px-6 py-3 text-[10px] uppercase font-black tracking-widest text-slate-500">Ghi chú</th>
                                <th className="px-6 py-3 text-[10px] uppercase font-black tracking-widest text-slate-500 w-24">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-slate-300 font-bold animate-pulse">ĐANG TẢI DỮ LIỆU...</td>
                                </tr>
                            ) : sortedGrid.length > 0 ? sortedGrid.map((row, idx) => (
                                <tr key={row.key} className={`group hover:bg-blue-50/30 transition-all ${row.is_modified ? 'bg-orange-50/50' : ''}`}>
                                    <td className="px-6 py-3 text-xs font-bold text-slate-300">{idx + 1}</td>
                                    <td className="px-6 py-3">
                                        <div 
                                            onClick={() => handleEntityClick(row)}
                                            className="font-black text-sm text-blue-600 hover:text-blue-800 cursor-pointer hover:underline transition-all"
                                        >
                                            {row.name}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{row.key}</div>
                                    </td>
                                    
                                    {/* Historical Actuals */}
                                    <td className="px-6 py-3 border-l bg-slate-50/30">
                                        <div className="text-xs font-bold text-slate-500">{fmt(row.actual_prev)}</div>
                                    </td>
                                    <td className="px-6 py-3 bg-slate-50/30">
                                        <div className="text-xs font-bold text-slate-400">{fmt(row.actual_ly)}</div>
                                    </td>

                                    <td className="px-6 py-3 border-l bg-blue-50/10">
                                        <div className="relative group/input flex items-center gap-2">
                                            <input 
                                                type="text" 
                                                className={`flex-1 bg-transparent border-b border-transparent focus:border-blue-400 outline-none p-1 font-black text-lg text-blue-700 transition-all ${row.value === '' ? 'placeholder:text-slate-200' : ''}`}
                                                placeholder="Đặt mục tiêu..."
                                                value={row.value === 0 ? '0' : (row.value || '')}
                                                onChange={e => {
                                                    const v = e.target.value.replace(/[^\d\.]/g, '');
                                                    handleGridEdit(row.key, 'value', v === '' ? '' : parseFloat(v));
                                                }}
                                            />
                                            {row.value && row.actual_prev > 0 && (
                                                <div className={`text-[10px] font-black px-1.5 py-0.5 rounded ${row.value > row.actual_prev ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                    {((row.value / row.actual_prev - 1) * 100).toFixed(0)}%
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-0.5">Click để sửa số</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <input 
                                            type="text" 
                                            className="w-full bg-transparent border-b border-transparent focus:border-blue-200 outline-none p-1 text-xs text-slate-500 italic"
                                            placeholder="Thêm ghi chú..."
                                            value={row.note || ''}
                                            onChange={e => handleGridEdit(row.key, 'note', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        {row.is_modified ? (
                                            <span className="flex items-center gap-1 text-[9px] font-black text-orange-500 uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"/> Sửa</span>
                                        ) : row.target_id ? (
                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">OK</span>
                                        ) : (
                                            <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">TRỐNG</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-slate-300 italic">Không tìm thấy dữ liệu phù hợp</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Status Bar */}
                <div className="p-3 bg-slate-50 border-t flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div>Tổng hiển thị: {sortedGrid.length} dòng</div>
                    <div className="flex gap-4">
                        <span className="text-emerald-500">Đã có mục tiêu: {gridData.filter(r => r.target_id).length}</span>
                        <span className="text-orange-500">Đang chờ lưu: {modifiedCount}</span>
                    </div>
                </div>
            </div>

            {/* Modals Drill-down */}
            {viewingProductId && <ProductDetailModal productId={viewingProductId} onClose={() => setViewingProductId(null)} />}
            {viewingCustomerId && <CustomerDetailModal customerId={viewingCustomerId} onClose={() => setViewingCustomerId(null)} />}
            {viewingSupplierId && <SupplierDetailModal supplierId={viewingSupplierId} onClose={() => setViewingSupplierId(null)} />}
            {viewingEmployeeId && (
                <EmployeePerformanceModal 
                    employeeId={viewingEmployeeId} 
                    onClose={() => setViewingEmployeeId(null)} 
                    type={viewingType}
                    dateRange={{
                        date_from: moment().set({ year: periodYear, month: periodValue - 1 }).startOf(periodType === 'month' ? 'month' : 'year').format('YYYY-MM-DD'),
                        date_to: moment().set({ year: periodYear, month: periodValue - 1 }).endOf(periodType === 'month' ? 'month' : 'year').format('YYYY-MM-DD')
                    }}
                />
            )}

            <style>{`
                .label-xs { display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 2px; }
                .input-base { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 700; color: #334155; outline: none; transition: all 0.2s; }
                .input-base:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px;}
                .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; border: 2px solid #f8fafc; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default KpiEntryPage;
