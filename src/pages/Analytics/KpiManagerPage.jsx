import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import moment from 'moment';
import { Icon } from '../../components/ui.jsx';

// ============================================================
// CONSTANTS
// ============================================================
const METRIC_LABELS = {
    revenue:       { label: 'Doanh thu',       unit: 'VNĐ',  color: 'blue',    icon: '💰' },
    profit:        { label: 'Lợi nhuận',       unit: 'VNĐ',  color: 'emerald', icon: '📈' },
    quantity:      { label: 'Số lượng bán',    unit: 'SP',   color: 'violet',  icon: '📦' },
    order_count:   { label: 'Số đơn hàng',     unit: 'Đơn',  color: 'amber',   icon: '🧾' },
    new_customers: { label: 'Khách hàng mới',  unit: 'KH',   color: 'pink',    icon: '👥' },
};
const TYPE_LABELS = {
    employee:          '👤 Nhân viên',
    product_group_l2:  '📂 Nhóm SP L2',
    product_group_l3:  '📁 Nhóm SP L3',
    brand:             '🏷️ Thương hiệu',
    product:           '📦 Sản phẩm',
    customer_group:    '🤝 Nhóm KH',
    global:            '🌐 Toàn Công Ty',
};
const PERIOD_OPTIONS = [
    { value: 'month',   label: 'Tháng' },
    { value: 'quarter', label: 'Quý' },
    { value: 'year',    label: 'Năm' },
    { value: 'week',    label: 'Tuần' },
];
const STATUS_STYLES = {
    achieved:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    on_track:  'bg-amber-100 text-amber-700 border-amber-200',
    behind:    'bg-rose-100 text-rose-600 border-rose-200',
};
const STATUS_LABELS = {
    achieved: '✅ Đạt',
    on_track: '⚠️ Theo dõi',
    behind:   '🔴 Chưa đạt',
};

// ============================================================
// HELPER — Format số
// ============================================================
const fmt = (v) => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));
const fmtCompact = (v) => {
    if (!v) return '0';
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
    return String(Math.round(v));
};

// ============================================================
// SUB: Progress Bar
// ============================================================
const KpiProgressBar = ({ pct, status }) => {
    const width = Math.min(pct, 100);
    const color = status === 'achieved' ? 'bg-emerald-500' : status === 'on_track' ? 'bg-amber-400' : 'bg-rose-500';
    return (
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden w-full">
            <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${width}%` }}
            />
            {pct > 100 && (
                <div className="absolute right-0 top-0 h-full w-1 bg-emerald-700 opacity-70" />
            )}
        </div>
    );
};

// ============================================================
// SUB: KPI Card (một dòng KPI)
// ============================================================
const KpiRow = ({ item, onEdit, onDelete }) => {
    const mInfo = METRIC_LABELS[item.metric] || {};
    return (
        <div className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between gap-4 mb-3">
                {/* Left */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="text-xl shrink-0">{mInfo.icon || '🎯'}</div>
                    <div className="min-w-0">
                        <div className="font-black text-slate-800 text-sm truncate">
                            {item.target_name || item.target_key || 'Toàn công ty'}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {TYPE_LABELS[item.target_type]} · {mInfo.label}
                            {item.is_suggested && <span className="ml-1 text-violet-500">✨ Gợi ý AI</span>}
                            {item.kpi_scope === 'personal' && <span className="ml-1 text-blue-500">👤 Cá nhân</span>}
                        </div>
                    </div>
                </div>

                {/* Right: Status + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${STATUS_STYLES[item.status]}`}>
                        {item.pct}%
                    </span>
                    <button onClick={() => onEdit(item)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all p-1 rounded">
                        <Icon name="plus" className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all p-1 rounded">
                        <Icon name="trash" className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Progress */}
            <KpiProgressBar pct={item.pct} status={item.status} />

            {/* Values */}
            <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>Thực tế: <strong className="text-slate-800">{fmtCompact(item.actual_value)}</strong></span>
                <span>Mục tiêu: <strong className="text-slate-800">{fmtCompact(item.target_value)}</strong> {mInfo.unit}</span>
            </div>
        </div>
    );
};

// ============================================================
// SUB: Suggestion Card (Gợi ý AI)
// ============================================================
const SuggestionCard = ({ s, onAccept }) => (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
            <div className="text-sm font-black text-violet-800">✨ {s.target_name || s.target_key}</div>
            <div className="text-xs text-violet-600 mt-0.5">{s.basis}</div>
        </div>
        <div className="text-right shrink-0">
            <div className="text-sm font-black text-violet-700">{fmtCompact(s.suggested_value)} đ</div>
            <button
                onClick={() => onAccept(s)}
                className="text-[10px] font-black uppercase tracking-widest text-white bg-violet-600 px-3 py-1 rounded-lg hover:bg-violet-700 transition-all mt-1"
            >
                Áp dụng
            </button>
        </div>
    </div>
);

// ============================================================
// SUB: KPI Form Modal
// ============================================================
const KpiFormModal = ({ initial, onClose, onSaved }) => {
    const [form, setForm] = useState({
        target_type: 'employee',
        target_key: '',
        target_name: '',
        metric: 'revenue',
        target_value: '',
        period_type: 'month',
        period_year: moment().year(),
        period_value: moment().month() + 1,
        kpi_scope: 'global',
        note: '',
        ...initial,
    });
    const [targets, setTargets]     = useState([]);
    const [saving, setSaving]       = useState(false);
    const [excelText, setExcelText] = useState('');  // paste từ Excel dạng CSV

    // Load targets
    useEffect(() => {
        axios.get('/api/v2/kpi/lookup', { params: { type: form.target_type } })
            .then(r => setTargets(r.data || []))
            .catch(() => setTargets([]));
    }, [form.target_type]);

    const handleSave = async () => {
        if (!form.target_value || Number(form.target_value) <= 0) {
            alert('Vui lòng nhập Giá trị mục tiêu > 0'); return;
        }
        setSaving(true);
        try {
            const method = form.id ? 'put' : 'post';
            const url    = form.id ? `/api/v2/kpi/targets/${form.id}` : '/api/v2/kpi/targets';
            await axios[method](url, form);
            onSaved();
            onClose();
        } catch (e) {
            alert('Lỗi: ' + (e.response?.data?.message || e.message));
        } finally {
            setSaving(false);
        }
    };

    // Import từ paste Excel (CSV)
    const handlePasteImport = async () => {
        const rows = excelText.trim().split('\n').map(line => {
            const cols = line.split('\t');
            return {
                target_type:  form.target_type,
                target_key:   cols[0]?.trim(),
                target_name:  cols[1]?.trim() || cols[0]?.trim(),
                metric:       form.metric,
                target_value: parseFloat(cols[2]?.replace(/[,\.]/g, '').trim()) || 0,
                period_type:  form.period_type,
                period_year:  form.period_year,
                period_value: form.period_value,
                kpi_scope:    form.kpi_scope,
            };
        }).filter(r => r.target_key && r.target_value > 0);

        if (!rows.length) { alert('Không đọc được dữ liệu. Format: [Mã]\t[Tên]\t[Số tiền]'); return; }
        setSaving(true);
        try {
            const res = await axios.post('/api/v2/kpi/bulk-import', { rows });
            alert(res.data.message);
            onSaved(); onClose();
        } catch (e) {
            alert('Lỗi: ' + (e.response?.data?.message || e.message));
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800">
                        {form.id ? '✏️ Sửa KPI' : '🎯 Đặt Mục tiêu / KPI'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 p-2 rounded-xl transition"><Icon name="x" className="w-5 h-5"/></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Scope */}
                    <div className="flex gap-2">
                        {['global', 'personal'].map(s => (
                            <button key={s} onClick={() => setForm(f => ({ ...f, kpi_scope: s }))}
                                className={`flex-1 py-2 rounded-xl text-sm font-black border transition-all ${
                                    form.kpi_scope === s ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}>
                                {s === 'global' ? '🌐 KPI Chung (Công ty)' : '👤 KPI Cá nhân'}
                            </button>
                        ))}
                    </div>

                    {/* Loại đối tượng */}
                    <div>
                        <label className="label-xs">Đặt mục tiêu cho</label>
                        <select className="input-base w-full" value={form.target_type} onChange={e => setForm(f => ({ ...f, target_type: e.target.value, target_key: '', target_name: '' }))}>
                            {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                    </div>

                    {/* Đối tượng cụ thể */}
                    {form.target_type !== 'global' && (
                        <div>
                            <label className="label-xs">Chọn {TYPE_LABELS[form.target_type]}</label>
                            <select className="input-base w-full" value={form.target_key}
                                onChange={e => {
                                    const t = targets.find(x => x.key === e.target.value);
                                    setForm(f => ({ ...f, target_key: e.target.value, target_name: t?.name || e.target.value }));
                                }}>
                                <option value="">-- Chọn --</option>
                                {targets.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* 2 Cột: Chỉ số + Kỳ */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Chỉ số */}
                        <div>
                            <label className="label-xs">Chỉ số đo lường</label>
                            <select className="input-base w-full" value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}>
                                {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                            </select>
                        </div>
                        {/* Chu kỳ */}
                        <div>
                            <label className="label-xs">Loại chu kỳ</label>
                            <select className="input-base w-full" value={form.period_type} onChange={e => setForm(f => ({ ...f, period_type: e.target.value }))}>
                                {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Period detail */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-xs">Năm</label>
                            <input type="number" className="input-base w-full" value={form.period_year}
                                onChange={e => setForm(f => ({ ...f, period_year: parseInt(e.target.value) }))} />
                        </div>
                        {form.period_type === 'month' && (
                            <div>
                                <label className="label-xs">Tháng (1-12)</label>
                                <input type="number" min={1} max={12} className="input-base w-full" value={form.period_value}
                                    onChange={e => setForm(f => ({ ...f, period_value: parseInt(e.target.value) }))} />
                            </div>
                        )}
                        {form.period_type === 'quarter' && (
                            <div>
                                <label className="label-xs">Quý (1-4)</label>
                                <input type="number" min={1} max={4} className="input-base w-full" value={form.period_value}
                                    onChange={e => setForm(f => ({ ...f, period_value: parseInt(e.target.value) }))} />
                            </div>
                        )}
                        {form.period_type === 'week' && (
                            <div>
                                <label className="label-xs">Tuần ISO (1-53)</label>
                                <input type="number" min={1} max={53} className="input-base w-full" value={form.period_value}
                                    onChange={e => setForm(f => ({ ...f, period_value: parseInt(e.target.value) }))} />
                            </div>
                        )}
                    </div>

                    {/* Giá trị */}
                    <div>
                        <label className="label-xs">Giá trị mục tiêu</label>
                        <input type="number" className="input-base w-full text-lg font-black" placeholder="Nhập số tiền / số lượng..."
                            value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} />
                        {form.target_value && <p className="text-xs text-slate-400 mt-1">{fmt(form.target_value)} {METRIC_LABELS[form.metric]?.unit}</p>}
                    </div>

                    {/* Ghi chú */}
                    <div>
                        <label className="label-xs">Ghi chú (tuỳ chọn)</label>
                        <input type="text" className="input-base w-full" placeholder="VD: Dựa trên Q1 năm ngoái x 120%"
                            value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                    </div>

                    {/* Import nhiều dòng từ Excel */}
                    {!form.id && (
                        <div className="border-t pt-4">
                            <label className="label-xs text-violet-600">📋 Nhập hàng loạt từ Excel (Paste dữ liệu)</label>
                            <p className="text-[10px] text-slate-400 mb-2">Format: [Mã]<kbd>Tab</kbd>[Tên]<kbd>Tab</kbd>[Số tiền] — Mỗi dòng một người/nhóm</p>
                            <textarea rows={5} className="input-base w-full font-mono text-xs" placeholder={"NV_HUNG\tNguyễn Văn Hùng\t100000000\nNV_LAN\tTrần Thị Lan\t80000000"}
                                value={excelText} onChange={e => setExcelText(e.target.value)} />
                            <button onClick={handlePasteImport} disabled={!excelText.trim() || saving}
                                className="mt-2 w-full py-2 bg-violet-600 text-white rounded-xl font-black text-sm disabled:opacity-50 hover:bg-violet-700 transition">
                                {saving ? '⏳ Đang import...' : '⏫ Import Hàng Loạt'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t bg-slate-50 rounded-b-2xl">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">Hủy</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg hover:bg-blue-700 transition disabled:opacity-50">
                        {saving ? '⏳ Đang lưu...' : form.id ? '✅ Cập nhật KPI' : '🎯 Lưu Mục tiêu'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// MAIN PAGE
// ============================================================
export const KpiManagerPage = () => {
    const [dash, setDash]           = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm]   = useState(false);
    const [editItem, setEditItem]   = useState(null);
    const [activeTab, setActiveTab] = useState('all');  // 'all' | 'global' | 'personal' | 'suggestions'

    // Filters
    const [periodType,  setPeriodType]  = useState('month');
    const [periodYear,  setPeriodYear]  = useState(moment().year());
    const [periodValue, setPeriodValue] = useState(moment().month() + 1);

    const fetchDashboard = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/v2/kpi/dashboard', {
                params: { period_type: periodType, period_year: periodYear, period_value: periodValue }
            });
            setDash(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [periodType, periodYear, periodValue]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const handleDelete = async (id) => {
        if (!confirm('Xóa KPI này?')) return;
        await axios.delete(`/api/v2/kpi/targets/${id}`);
        fetchDashboard();
    };

    const handleEdit = (item) => {
        setEditItem(item);
        setShowForm(true);
    };

    const handleAcceptSuggestion = (s) => {
        setEditItem({
            target_type:  s.target_type,
            target_key:   s.target_key,
            target_name:  s.target_name,
            metric:       s.metric,
            target_value: s.suggested_value,
            period_type:  s.period_type,
            period_year:  s.period_year,
            period_value: s.period_value,
            kpi_scope:    'global',
        });
        setShowForm(true);
    };

    // --- Tổng quan stats ---
    const summary = dash?.summary || [];
    const totalAchieved     = summary.filter(s => s.status === 'achieved').length;
    const totalOnTrack      = summary.filter(s => s.status === 'on_track').length;
    const totalBehind       = summary.filter(s => s.status === 'behind').length;
    const suggestions       = dash?.suggestions || [];
    const byType            = dash?.by_type || {};

    // Filter tab
    const filteredSummary = activeTab === 'all' ? summary
        : activeTab === 'global'   ? summary.filter(s => s.kpi_scope === 'global')
        : activeTab === 'personal' ? summary.filter(s => s.kpi_scope === 'personal')
        : [];

    return (
        <div className="p-6 space-y-6 min-h-full bg-slate-50">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">🎯 Quản lý KPI & Mục tiêu</h1>
                    <p className="text-sm text-slate-500">Theo dõi định kỳ · So sánh Thực tế vs. Kế hoạch · Gợi ý AI</p>
                </div>
                <button onClick={() => { setEditItem(null); setShowForm(true); }}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                    <Icon name="plus" className="w-4 h-4" /> Đặt Mục tiêu Mới
                </button>
            </div>

            {/* Period Selector */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Kỳ báo cáo</div>
                <select className="input-base" value={periodType} onChange={e => { setPeriodType(e.target.value); setPeriodValue(moment().month() + 1); }}>
                    {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {periodType === 'month' && (
                    <select className="input-base" value={periodValue} onChange={e => setPeriodValue(Number(e.target.value))}>
                        {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                    </select>
                )}
                {periodType === 'quarter' && (
                    <select className="input-base" value={periodValue} onChange={e => setPeriodValue(Number(e.target.value))}>
                        {[1,2,3,4].map(q => <option key={q} value={q}>Quý {q}</option>)}
                    </select>
                )}
                {periodType === 'week' && (
                    <input type="number" min={1} max={53} className="input-base w-20" value={periodValue} onChange={e => setPeriodValue(Number(e.target.value))} />
                )}
                <input type="number" className="input-base w-24" value={periodYear} onChange={e => setPeriodYear(Number(e.target.value))} />
                <button onClick={fetchDashboard} className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition">
                    Xem
                </button>
                {dash?.period && (
                    <span className="text-xs text-slate-400 ml-auto">
                        {dash.period.dateFrom} → {dash.period.dateTo}
                    </span>
                )}
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Tổng KPI', value: summary.length, color: 'blue', icon: '📋' },
                    { label: 'Đã đạt', value: totalAchieved, color: 'emerald', icon: '✅' },
                    { label: 'Đang theo dõi', value: totalOnTrack, color: 'amber', icon: '⚠️' },
                    { label: 'Chưa đạt', value: totalBehind, color: 'rose', icon: '🔴' },
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="text-2xl mb-2">{c.icon}</div>
                        <div className={`text-3xl font-black text-${c.color}-600`}>{c.value}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b flex overflow-x-auto no-scrollbar">
                    {[
                        { id: 'all', label: '🗂️ Tất cả' },
                        { id: 'global', label: '🌐 KPI Chung' },
                        { id: 'personal', label: '👤 Cá nhân' },
                        { id: 'suggestions', label: `✨ Gợi ý AI ${suggestions.length > 0 ? `(${suggestions.length})` : ''}` },
                    ].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${
                                activeTab === t.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="text-center py-20 text-slate-400 font-bold animate-pulse uppercase text-xs">Đang nạp dữ liệu KPI...</div>
                    ) : activeTab === 'suggestions' ? (
                        <div className="space-y-3">
                            {suggestions.length > 0 ? suggestions.map((s, i) => (
                                <SuggestionCard key={i} s={s} onAccept={handleAcceptSuggestion} />
                            )) : (
                                <div className="text-center py-20 text-slate-300 italic">Không có gợi ý nào — Hệ thống cần ít nhất 1 tháng dữ liệu để tạo gợi ý.</div>
                            )}
                        </div>
                    ) : filteredSummary.length > 0 ? (
                        // Nhóm theo target_type
                        Object.entries(
                            filteredSummary.reduce((acc, item) => {
                                const g = item.target_type;
                                if (!acc[g]) acc[g] = [];
                                acc[g].push(item);
                                return acc;
                            }, {})
                        ).map(([type, items]) => (
                            <div key={type} className="mb-8">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    {TYPE_LABELS[type]}
                                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px]">{items.length} KPI</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {items.map(item => (
                                        <KpiRow key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20">
                            <div className="text-5xl mb-4">🎯</div>
                            <p className="text-slate-400 font-bold">Chưa có KPI nào trong kỳ này</p>
                            <button onClick={() => { setEditItem(null); setShowForm(true); }}
                                className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition">
                                + Đặt mục tiêu đầu tiên
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showForm && (
                <KpiFormModal
                    initial={editItem || { period_type: periodType, period_year: periodYear, period_value: periodValue }}
                    onClose={() => { setShowForm(false); setEditItem(null); }}
                    onSaved={fetchDashboard}
                />
            )}
        </div>
    );
};

// Inline styles for reuse
const styles = `
.label-xs { display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px; }
.input-base { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 600; color: #334155; outline: none; transition: all 0.15s; }
.input-base:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
`;
// Inject styles once
if (!document.getElementById('kpi-styles')) {
    const s = document.createElement('style');
    s.id = 'kpi-styles';
    s.textContent = styles;
    document.head.appendChild(s);
}

export default KpiManagerPage;
