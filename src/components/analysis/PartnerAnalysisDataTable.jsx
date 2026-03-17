// src/components/analysis/PartnerAnalysisDataTable.jsx
import React, { useState, useMemo } from 'react';
import { Icon, Button } from '../ui.jsx';

const fmt = v => new Intl.NumberFormat('vi-VN').format(v || 0);
const fmtCur = v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0).replace('₫', '').trim();

const MarginBar = ({ value }) => {
    const v = parseFloat(value || 0), w = Math.min(Math.abs(v), 100), c = v >= 15 ? 'bg-green-500' : v > 5 ? 'bg-blue-500' : 'bg-red-500';
    return <div className="w-24 flex flex-col justify-center"><div className={`flex justify-end text-[10px] font-bold mb-0.5 ${v < 0 ? 'text-red-500' : 'text-gray-600'}`}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</div><div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden"><div style={{ width: `${w}%` }} className={`h-full ${c}`} /></div></div>;
};

const RiskBar = ({ returnValue, netRevenue }) => {
    const ret = Math.abs(parseFloat(returnValue || 0)), net = parseFloat(netRevenue || 0), tot = net + ret, r = tot ? (ret / tot) * 100 : 0, c = r > 5 ? 'bg-red-600' : r > 2 ? 'bg-orange-400' : 'bg-green-400';
    return <div className="w-24 flex flex-col"><div className="flex justify-between text-[10px]"><span className="text-gray-400">{fmt(ret / 1000)}k</span><span className={`font-bold ${r > 5 ? 'text-red-600' : 'text-gray-600'}`}>{r.toFixed(1)}%</span></div><div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-0.5 border border-gray-200"><div style={{ width: `${Math.min(r * 5, 100)}%` }} className={`h-full ${c}`} /></div></div>;
};

const TABS = { FINANCE: { id: 'finance', label: '💰 Tài chính', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }, DEBT: { id: 'debt', label: '⚖️ Công Nợ', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' }, QUALITY: { id: 'quality', label: '🛡️ Chất lượng', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }, PRODUCT_CAT: { id: 'product_cat', label: '📊 Cơ cấu Nhóm', icon: 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9' }, PRODUCT_LIST: { id: 'product_list', label: '📦 DS Sản phẩm', icon: 'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-9 0v-6.75' } };

const getCols = (v, t) => {
    const p = [{ id: 'idx', label: '#', align: 'center', width: 'w-10' }, { id: 'name', label: t === 'top_customers' ? 'Khách Hàng' : 'Nhà Cung Cấp', key: t === 'top_customers' ? 'ten_khncc' : 'supplier_name', align: 'left', sortable: true }];
    const prod = [{ id: 'idx', label: '#', align: 'center', width: 'w-10' }, { id: 'code', label: 'Mã SP', key: 'ma_mat_hang', align: 'left', width: 'w-24', sortable: true }, { id: 'name', label: 'Tên Sản Phẩm', key: 'ten_mat_hang', align: 'left', sortable: true }, { id: 'group', label: 'Nhóm', key: 'ten_nhom', align: 'left', width: 'w-32', sortable: true }];
    switch (v) {
        case 'finance': return [...p, { id: 'net', label: 'Doanh Số', key: 'net_revenue', type: 'money', sortable: true }, { id: 'cost', label: 'Giá Vốn', key: 'total_cost', type: 'money', sortable: true }, { id: 'prof', label: 'Lợi Nhuận', key: 'total_profit', type: 'money', sortable: true, highlight: true }, { id: 'margin', label: '% Margin', key: 'profit_margin', type: 'bar' }];
        case 'debt': return [...p, { id: 'vol', label: t === 'by_supplier' ? 'Tổng Vốn Mua' : 'Tổng Bán Ra', key: t === 'by_supplier' ? 'total_cost' : 'net_revenue', type: 'money', sortable: true }, { id: 'debt', label: t === 'by_supplier' ? 'Phải Trả (Nợ)' : 'Phải Thu (Nợ)', key: 'current_debt', type: 'money', sortable: true, highlight: true }, { id: 'limit', label: 'Hạn Mức', key: 'credit_limit', type: 'money', sortable: true }, { id: 'bal', label: 'Còn Được Mua', key: 'balance', type: 'balance' }];
        case 'quality': return [...p, { id: 'gross', label: 'Tổng Bán (Gộp)', key: 'gross_revenue', type: 'money', sortable: true }, { id: 'ord', label: 'SL Đơn', key: 'order_count', align: 'center', sortable: true }, { id: 'ret', label: 'Giá Trị Trả', key: 'return_value', type: 'money', sortable: true, textClass: 'text-red-600' }, { id: 'err', label: 'Tỷ Lệ Lỗi', key: 'return_rate_percent', type: 'risk_bar' }];
        case 'product_cat': return [...p, { id: 'net', label: 'Doanh Số Tổng', key: 'net_revenue', type: 'money', sortable: true }, { id: 'top1', label: '🏆 Top 1 (Chủ lực)', key: 'top1_val', type: 'cat_rank', idx: 0 }, { id: 'top2', label: '🥈 Top 2', type: 'cat_rank', idx: 1 }, { id: 'top3', label: '🥉 Top 3', type: 'cat_rank', idx: 2 }];
        case 'product_list': return [...prod, { id: 'qty', label: 'SL Bán', key: 'total_quantity', align: 'center', sortable: true, type: 'number' }, { id: 'net', label: 'Doanh Số', key: 'net_revenue', type: 'money', sortable: true }, { id: 'prof', label: 'Lợi Nhuận', key: 'total_profit', type: 'money', sortable: true, highlight: true }, { id: 'margin', label: '% Margin', key: 'profit_margin', type: 'bar' }];
        default: return [];
    }
};

export const PartnerAnalysisDataTable = ({ data = [], type, productList = [], searchTerm = '', onItemClick, onProductClick }) => {
    const [viewMode, setViewMode] = useState('finance'), [sort, setSort] = useState({ key: 'net_revenue', dir: 'desc' }), [expRows, setExpRows] = useState({}), [page, setPage] = useState(1), perPage = 20;
    const [localSearch, setLocalSearch] = useState('');

    // --- [NEW] Filter Logic ---
    const rawData = useMemo(() => {
        const src = viewMode === 'product_list' ? productList : data;
        if (!src?.length) return [];
        const s = localSearch || searchTerm;
        if (!s) return src;
        const lower = s.toLowerCase();
        return src.filter(i => {
            const n = viewMode === 'product_list' ? i.ten_mat_hang : (type === 'top_customers' ? i.ten_khncc : i.supplier_name);
            const c = viewMode === 'product_list' ? i.ma_mat_hang : (type === 'top_customers' ? i.ma_khncc : i.supplier_code);
            return (n && String(n).toLowerCase().includes(lower)) || (c && String(c).toLowerCase().includes(lower));
        });
    }, [viewMode, data, productList, type, searchTerm, localSearch]);

    const sortedData = useMemo(() => {
        let items = [...rawData];
        if (sort.key) items.sort((a, b) => {
            let av = a[sort.key], bv = b[sort.key];
            if (sort.key === 'top1_val') { const g = o => o.cat_breakdown ? Math.max(...Object.values(o.cat_breakdown)) : 0; av = g(a); bv = g(b) }
            if (av == null) av = -Infinity; if (bv == null) bv = -Infinity;
            if (typeof av !== 'number') { av = String(av).toLowerCase(); bv = String(bv).toLowerCase() }
            return (av < bv ? -1 : 1) * (sort.dir === 'asc' ? 1 : -1);
        });
        return items;
    }, [rawData, sort]);

    const paginated = useMemo(() => sortedData.slice((page - 1) * perPage, page * perPage), [sortedData, page]);
    const totalPg = Math.ceil(sortedData.length / perPage);

    const totals = useMemo(() => sortedData.reduce((a, i) => {
        a.net += (i.net_revenue || 0); a.cost += (i.total_cost || 0); a.prof += (i.total_profit || 0); a.gross += (i.gross_revenue || 0); a.ret += Math.abs(i.return_value || 0); a.qty += (i.total_quantity || 0); a.ord += (i.order_count || 0); a.debt += (i.current_debt || 0); return a;
    }, { net: 0, cost: 0, prof: 0, gross: 0, ret: 0, qty: 0, ord: 0, debt: 0 }), [sortedData]);
    totals.margin = totals.net ? (totals.prof / totals.net) * 100 : 0; totals.errRate = totals.gross ? (totals.ret / totals.gross) * 100 : 0;

    const handleSort = k => k && setSort({ key: k, dir: sort.key === k && sort.dir === 'desc' ? 'asc' : 'desc' });
    const toggleRow = id => setExpRows(p => ({ ...p, [id]: !p[id] }));

    const exportExcel = async () => {
        const { default: XLSX } = await import('xlsx-js-style');
        const cols = getCols(viewMode, type), wb = XLSX.utils.book_new();
        const wsData = [cols.map(c => ({ v: c.label, s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2F75B5" } } } }))];
        sortedData.forEach((d, i) => {
            wsData.push(cols.map(c => {
                if (c.id === 'idx') return { v: i + 1 };
                let v = d[c.key]; if (c.key === 'return_value') v = Math.abs(v);
                if (c.type === 'cat_rank') { const x = d.cat_breakdown ? Object.entries(d.cat_breakdown).sort((a, b) => b[1] - a[1]) : []; v = x[c.idx] ? `${x[c.idx][0]} (${fmt(x[c.idx][1])})` : ''; }
                if (c.id === 'bal') v = (d.credit_limit || 0) - (d.current_debt || 0);
                if (c.id === 'margin' || c.id === 'err') v = (v || 0) / 100;
                return { v: v || (c.type === 'money' || c.type === 'number' ? 0 : ''), s: c.id === 'margin' || c.id === 'err' ? { numFmt: "0.0%" } : { numFmt: c.type === 'money' ? "#,##0" : undefined } };
            }))
        });
        const ws = XLSX.utils.aoa_to_sheet(wsData); ws['!cols'] = cols.map(c => ({ wch: 20 })); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, `Export_${viewMode}.xlsx`);
    };

    const renderCell = (d, c) => {
        const v = d[c.key];
        switch (c.type) {
            case 'money': return <span className={`font-mono text-sm ${c.highlight && v < 0 ? 'text-red-600 font-bold' : (c.highlight && v > 0 ? 'text-green-600 font-bold' : c.textClass || 'text-gray-700')}`}>{fmtCur(v)}</span>;
            case 'number': return <span className="font-bold text-purple-700">{fmt(v)}</span>;
            case 'bar': return <div className="flex justify-end"><MarginBar value={v} /></div>;
            case 'risk_bar': return <div className="flex justify-end"><RiskBar returnValue={d.return_value} netRevenue={d.net_revenue} /></div>;
            case 'cat_rank': const cats = d.cat_breakdown ? Object.entries(d.cat_breakdown).sort((a, b) => b[1] - a[1]) : [], cat = cats[c.idx]; return cat ? <div className="text-xs border-l border-dashed pl-2"><div className="font-medium text-gray-700 truncate w-32" title={cat[0]}>{cat[0]}</div><div className="text-gray-400">{fmt(cat[1])}</div></div> : <span className="text-gray-300 text-xs">--</span>;
            case 'balance': const bal = (d.credit_limit || 0) - (d.current_debt || 0); return <span className={`font-mono text-sm font-bold ${bal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{d.credit_limit ? fmtCur(bal) : '--'}</span>;
            default: return <span className="text-sm text-gray-700">{v}</span>;
        }
    };

    const cols = getCols(viewMode, type);
    const getId = i => viewMode === 'product_list' ? i.ma_mat_hang : (type === 'top_customers' ? i.ma_khncc : i.supplier_code);
    const getName = i => viewMode === 'product_list' ? i.ten_mat_hang : (type === 'top_customers' ? i.ten_khncc : i.supplier_name);

    return (
        <div className="bg-white border rounded-lg shadow-sm flex flex-col h-full">
            <div className="flex border-b bg-gray-50 px-2 pt-2 gap-1 overflow-x-auto justify-between items-center flex-shrink-0">
                <div className="flex gap-1">{Object.values(TABS).map(t => (<button key={t.id} onClick={() => { setViewMode(t.id); setPage(1) }} className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-t-lg transition-all ${viewMode === t.id ? 'bg-white text-blue-700 border-t border-l border-r border-gray-200 shadow-sm relative top-px' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}><Icon path={t.icon} className={`w-3.5 h-3.5 ${viewMode === t.id ? 'text-blue-600' : 'text-gray-400'}`} /> {t.label}</button>))}</div>
                <div className="pb-1 pr-1 flex items-center gap-2">
                    <div className="relative group">
                        <Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="absolute left-2 top-2 w-3 h-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm trong bảng..."
                            className="pl-7 pr-7 py-1 text-[11px] border border-gray-300 rounded shadow-sm outline-none focus:border-blue-500 w-32 focus:w-48 transition-all"
                            value={localSearch}
                            onChange={e => { setLocalSearch(e.target.value); setPage(1); }}
                        />
                        {localSearch && <button onClick={() => { setLocalSearch(''); setPage(1); }} className="absolute right-1 top-1.5 text-gray-400 hover:text-red-500 font-bold text-xs px-1">✕</button>}
                    </div>
                    <Button onClick={exportExcel} variant="secondary" className="h-7 px-2 text-[11px] bg-green-50 text-green-700 border-green-200 font-bold hover:bg-green-100 flex items-center gap-1"><Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" className="w-3 h-3" /> Excel</Button>
                </div>
            </div>

            {!rawData.length ? (
                <div className="p-12 text-center text-gray-400 border-dashed m-4 rounded bg-gray-50 flex flex-col items-center gap-2 border-2">
                    <Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="w-8 h-8 text-gray-300" />
                    <span className="text-sm font-medium">Không tìm thấy kết quả phù hợp cho "{localSearch || searchTerm}"</span>
                    <button onClick={() => { setLocalSearch(''); setPage(1); }} className="text-blue-600 text-xs hover:underline font-bold">Xóa tìm kiếm</button>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto flex-1 overflow-y-auto min-h-[400px]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="sticky top-0 z-10 shadow-sm bg-gray-50"><tr><th className="px-2 py-3 border-b-2 border-gray-200 bg-gray-50 w-8"></th>{cols.map(c => (<th key={c.id} className={`px-3 py-3 border-b-2 border-gray-200 bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider ${c.align === 'center' ? 'text-center' : (c.align === 'right' || c.type === 'money' || c.type === 'number' ? 'text-right' : 'text-left')} ${c.width || ''} ${c.sortable ? 'cursor-pointer hover:bg-gray-100 hover:text-blue-600' : ''}`} onClick={() => c.sortable && handleSort(c.key)}><div className={`flex items-center ${c.align === 'center' ? 'justify-center' : (c.align === 'right' || c.type === 'money' || c.type === 'number' ? 'justify-end' : 'justify-start')} gap-1`}>{c.label} {sort.key === c.key && <span className="text-blue-600">{sort.dir === 'asc' ? '▲' : '▼'}</span>}</div></th>))}</tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginated.map((d, i) => {
                                    const id = getId(d), exp = expRows[id], sub = viewMode !== 'product_list' && d.cat_breakdown && Object.keys(d.cat_breakdown).length > 0;
                                    return (<React.Fragment key={id || i}>
                                        <tr className={`hover:bg-blue-50 transition-colors ${exp ? 'bg-blue-50' : ''}`}><td className="px-2 py-3 text-center cursor-pointer text-gray-400 hover:text-blue-600" onClick={() => sub && toggleRow(id)}>{sub && <span className="text-xs">{exp ? '▼' : '▶'}</span>}</td>
                                            {cols.map(c => <td key={c.id} className={`px-3 py-3 ${c.align === 'center' ? 'text-center' : (c.align === 'right' || c.type === 'money' || c.type === 'number' || c.type === 'balance' ? 'text-right' : 'text-left')}`}>{c.id === 'idx' ? <span className="text-xs text-gray-500">{(page - 1) * perPage + i + 1}</span> : c.id === 'name' && viewMode !== 'product_list' ? <div className="flex flex-col"><span className="text-sm font-bold text-blue-700 cursor-pointer hover:underline" onClick={() => onItemClick && onItemClick(type === 'top_customers' ? 'customer' : 'supplier', getId(d), getName(d))}>{getName(d)}</span><span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1 rounded w-fit">{getId(d)}</span></div> : c.id === 'code' && viewMode === 'product_list' ? <button onClick={() => onProductClick?.('history', d.ma_mat_hang)} className="font-mono text-xs text-blue-700 font-bold hover:underline bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{d.ma_mat_hang}</button> : c.id === 'name' && viewMode === 'product_list' ? <span onClick={() => onProductClick?.('reconcile', d)} className="text-sm font-bold text-gray-800 cursor-pointer hover:underline hover:text-blue-700">{d.ten_mat_hang}</span> : renderCell(d, c)}</td>)}
                                        </tr>
                                        {exp && sub && <tr className="bg-gray-50"><td colSpan={cols.length + 1} className="px-4 py-3 border-b"><div className="pl-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">{Object.entries(d.cat_breakdown).sort((a, b) => b[1] - a[1]).map(([k, v], i) => <div key={i} className="bg-white p-2 border rounded shadow-sm flex flex-col"><span className="text-xs text-gray-600 truncate" title={k}>{k}</span><span className="text-sm font-bold text-blue-800 text-right">{fmt(v)}</span></div>)}</div></td></tr>}
                                    </React.Fragment>)
                                })}
                                <tr className="bg-yellow-50 font-bold border-t-2 border-gray-300 sticky bottom-0 z-10 shadow-sm"><td className="px-2 py-3"></td>{cols.map((c, i) => { if (i === 0) return <td key={i} className="px-3 py-3 text-center text-xs uppercase text-gray-500">Tổng</td>; if (c.id === 'name') return <td key={i}></td>; let v = 0; if (c.key === 'net_revenue') v = totals.net; else if (c.key === 'total_cost') v = totals.cost; else if (c.key === 'total_profit') v = totals.prof; else if (c.key === 'current_debt') v = totals.debt; else if (c.key === 'total_quantity') v = totals.qty; else if (c.key === 'order_count') v = totals.ord; else if (c.key === 'gross_revenue') v = totals.gross; else if (c.key === 'return_value') v = totals.ret; if (c.id === 'margin') v = totals.margin; if (c.id === 'err') v = totals.errRate; if (c.type === 'cat_rank' || c.id === 'code' || c.id === 'group' || c.id === 'limit' || c.id === 'bal') return <td key={i}></td>; return <td key={i} className={`px-3 py-3 ${c.align === 'center' ? 'text-center' : 'text-right'} text-sm`}>{c.type === 'money' ? <span className={c.key === 'total_profit' ? 'text-green-700' : (c.key === 'current_debt' ? 'text-red-600' : 'text-gray-800')}>{fmtCur(v)}</span> : c.type === 'number' ? <span>{fmt(v)}</span> : c.type === 'bar' || c.type === 'risk_bar' ? <span>{v.toFixed(1)}%</span> : ''}</td> })}</tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t bg-gray-50 px-4 py-2 flex justify-between items-center flex-shrink-0">
                        <div className="text-xs text-gray-500">Hiển thị <strong>{(page - 1) * perPage + 1}</strong> - <strong>{Math.min(page * perPage, sortedData.length)}</strong> / <strong>{sortedData.length}</strong></div>
                        {totalPg > 1 && <div className="flex gap-1"><Button size="xs" variant="secondary" disabled={page === 1} onClick={() => setPage(1)}>«</Button><Button size="xs" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</Button><span className="px-2 py-1 text-xs font-bold bg-white border rounded flex items-center">{page}/{totalPg}</span><Button size="xs" variant="secondary" disabled={page === totalPg} onClick={() => setPage(page + 1)}>›</Button><Button size="xs" variant="secondary" disabled={page === totalPg} onClick={() => setPage(totalPg)}>»</Button></div>}
                    </div>
                </>
            )}
        </div>
    );
};
