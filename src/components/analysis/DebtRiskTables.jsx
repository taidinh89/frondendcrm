import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnalysisCard } from './AnalysisCard.jsx';
import { Tabs } from './Tabs.jsx';
import { Button, Icon } from '../ui.jsx';

const fmt = (v) => new Intl.NumberFormat('vi-VN').format(Number(v) || 0);

// Cấu hình Cột: [Key, Label hiển thị, Màu Text, Màu Excel]
// Dùng &lt; thay cho < trong nhãn để an toàn với HTML parser
const COLS = [
    ['future', 'Trong hạn', 'teal-700'], 
    ['safe', '&lt; 3 ngày', 'green-600'], 
    ['early', '3-7 ngày', 'blue-600'], 
    ['quick', '7-15 ngày', 'purple-600'], 
    ['warning', '15-30 ngày', 'yellow-600'], 
    ['risk', '30-60 ngày', 'orange-600'], 
    ['critical', '60-90 ngày', 'red-600'], 
    ['lost', '&gt; 90 ngày', 'red-800'] 
];

// --- 1. UI COMPONENTS ---

const MultiDrop = ({ label, opts, val, setVal }) => {
    const [open, setOpen] = useState(false);
    const [txt, setTxt] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", fn); 
        return () => document.removeEventListener("mousedown", fn);
    }, []);

    const fOpts = opts.filter(o => o.toLowerCase().includes(txt.toLowerCase()));
    const tog = (o) => setVal(val.includes(o) ? val.filter(i => i !== o) : [...val, o]);

    return (
        <div className="relative" ref={ref}>
            <div 
                onClick={() => setOpen(!open)} 
                className={`flex items-center justify-between w-32 md:w-40 px-2 py-1.5 text-xs border rounded shadow-sm bg-white cursor-pointer hover:bg-gray-50 ${val.length ? 'border-blue-500 ring-1 ring-blue-200 text-blue-700 font-bold' : 'border-gray-300 text-gray-600'}`}
            >
                <span className="truncate">{val.length === 0 ? label : `${label} (${val.length})`}</span>
                <div className="flex items-center gap-1">
                    {val.length > 0 && (
                        <span onClick={(e) => { e.stopPropagation(); setVal([]); }} className="hover:text-red-500 px-1 font-bold" title="Xóa bộ lọc">✕</span>
                    )}
                    <span className="text-[10px]">▼</span>
                </div>
            </div>
            {open && (
                <div className="absolute z-50 mt-1 w-56 bg-white border rounded shadow-xl max-h-60 flex flex-col animate-fadeIn">
                    <div className="p-2 border-b bg-gray-50">
                        <input className="w-full px-2 py-1 text-xs border rounded outline-none focus:border-blue-500" placeholder="Tìm..." value={txt} onChange={e => setTxt(e.target.value)} autoFocus />
                    </div>
                    <div className="p-1 border-b bg-gray-50 flex justify-between">
                        <button onClick={() => setVal(val.length === opts.length ? [] : opts)} className="text-[10px] font-bold text-blue-600 px-2 py-1 hover:underline">
                            {val.length === opts.length ? 'Bỏ hết' : 'Chọn hết'}
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        {fOpts.map(o => (
                            <div key={o} onClick={() => tog(o)} className={`flex items-center px-2 py-1 cursor-pointer rounded text-xs mb-0.5 ${val.includes(o) ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
                                <input type="checkbox" checked={val.includes(o)} readOnly className="mr-2 h-3 w-3 pointer-events-none" />
                                <span>{o}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const SearchInput = ({ val, setVal }) => (
    <div className="relative flex-1 min-w-[150px]">
        <input 
            className="w-full pl-2 pr-8 border rounded py-1.5 text-xs outline-none focus:border-blue-500 transition-colors" 
            placeholder="Tìm tên, mã khách..." 
            value={val} 
            onChange={e => setVal(e.target.value)} 
        />
        {val && (
            <button onClick={() => setVal('')} className="absolute right-2 top-1.5 text-gray-400 hover:text-red-500 font-bold">✕</button>
        )}
    </div>
);

const SevenBar = ({ b, t }) => {
    const p = (v) => ((v || 0) / (t || 1)) * 100;
    return (
        <div className="w-24 h-4 flex rounded bg-gray-100 border relative overflow-hidden group cursor-help">
            {COLS.map(([k, l, c], i) => (
                <div 
                    key={i} 
                    style={{ width: `${p(b?.[k])}%` }} 
                    className={`bg-${c.split('-')[0]}-${c === 'red-800' ? '900' : c.split('-')[1]}`} 
                    title={`${l.replace(/&[lg]t;/g, m => m === '&lt;' ? '<' : '>')}: ${fmt(b?.[k])}`} 
                />
            ))}
        </div>
    );
};

const BigRiskBar = ({ buckets: b }) => {
    const p = (v) => ((v || 0) / ((b.future||0)+(b.safe||0)+(b.early||0)+(b.quick||0)+(b.warning||0)+(b.risk||0)+(b.critical||0)+(b.lost||0) || 1)) * 100;
    const safe = (b.future || 0) + (b.safe || 0) + (b.early || 0) + (b.quick || 0) + (b.warning || 0);
    const risk = (b.risk || 0) + (b.critical || 0);
    const lost = (b.lost || 0);
    return (
        <div className="w-full mt-2">
            <div className="flex w-full h-4 rounded-full overflow-hidden bg-gray-100 border shadow-inner">
                {p(lost) > 0 && <div style={{ width: `${p(lost)}%` }} className="bg-red-700" />}
                {p(risk) > 0 && <div style={{ width: `${p(risk)}%` }} className="bg-orange-500" />}
                {p(safe) > 0 && <div style={{ width: `${p(safe)}%` }} className="bg-green-500" />}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-medium">
                <div>🟢 An toàn ({Math.round(p(safe))}%)</div>
                <div>🟠 Rủi ro ({Math.round(p(risk))}%)</div>
                <div>🔴 Mất vốn ({Math.round(p(lost))}%)</div>
            </div>
        </div>
    );
};

// --- 2. TABLE HELPERS ---
const Th = ({ c, w, txt = 'left', bg = 'gray-100', cl = 'gray-700' }) => (
    <th 
        className={`px-2 py-3 border text-xs font-bold ${w} text-${txt} bg-${bg} text-${cl} sticky top-0 z-10 whitespace-nowrap`} 
        dangerouslySetInnerHTML={{ __html: c }} 
    />
);

const Td = ({ c, b, col, click, txt = 'left', bg }) => (
    <td 
        onClick={click} 
        className={`px-2 py-1.5 border text-xs text-${txt} ${b ? 'font-bold' : ''} ${col} ${bg} ${click ? 'cursor-pointer hover:underline' : ''} truncate`}
    >
        {c}
    </td>
);

const TdNum = ({ val, ...p }) => <Td c={val ? fmt(val) : '-'} txt="right" {...p} />;

export const DebtRiskTables = ({ filteredList, groupOptions, employeeOptions, onViewEvidence }) => {
    const [tab, setTab] = useState('dashboard');
    const [search, setSearch] = useState('');
    const [flt, setFlt] = useState({ grp: [], emp: [] });
    const [expand, setExpand] = useState({});

    // --- 3. DATA PROCESSING ---
    const { list, stats, flatSales, sumSales, byEmp, byGrp, flatSalesTotals } = useMemo(() => {
        let res = [], flat = [], t = 0, b = { future: 0, safe: 0, early: 0, quick: 0, warning: 0, risk: 0, critical: 0, lost: 0 };
        let gEmp = {}, gGrp = {};

        (filteredList || []).forEach(org => {
            const s = search.toLowerCase();
            if ((search && !org.name?.toLowerCase().includes(s) && !org.code?.toLowerCase().includes(s))) return;
            if (flt.grp.length > 0 && !flt.grp.includes(org.group)) return;

            // Logic Smart Filter: Lọc theo nhiều nhân viên
            let row = { ...org, d_debt: org.debt, d_bkt: org.detail_buckets, is_flt: false };
            if (flt.emp.length > 0) {
                const subs = org.salesman_breakdown?.filter(sb => flt.emp.includes(sb.name));
                if (!subs || subs.length === 0) return; // Không khớp -> Bỏ

                // Cộng dồn nợ (nếu chọn nhiều sales)
                row.d_debt = subs.reduce((sum, s) => sum + s.total, 0);
                let tempB = { future: 0, safe: 0, early: 0, quick: 0, warning: 0, risk: 0, critical: 0, lost: 0 };
                subs.forEach(sub => { for (let k in tempB) tempB[k] += (sub.detail_buckets?.[k] || 0); });
                row.d_bkt = tempB; row.is_flt = true;
                row.display_manager = flt.emp.length === 1 ? flt.emp[0] : `(${flt.emp.length}) NV`;
            } else {
                row.display_manager = row.manager;
            }

            // Pivot Sales (Cho tab Kế toán & Tổng hợp)
            (org.salesman_breakdown || []).forEach(sb => {
                if (flt.emp.length > 0 && !flt.emp.includes(sb.name)) return;
                flat.push({ ...org, sale: sb.name, s_debt: sb.total, s_bkt: sb.detail_buckets });
            });
            if (!org.salesman_breakdown?.length && flt.emp.length === 0) flat.push({ ...org, sale: org.manager, s_debt: org.debt, s_bkt: org.detail_buckets });

            // Stats
            t += row.d_debt;
            const db = row.d_bkt || {};
            for (let k in b) b[k] += (db[k] || 0);

            // Grouping
            if (!gEmp[row.manager]) gEmp[row.manager] = { name: row.manager, list: [], total: 0 };
            gEmp[row.manager].list.push(row);
            gEmp[row.manager].total += row.d_debt;

            const gk = row.group || 'Khác';
            if (!gGrp[gk]) gGrp[gk] = { name: gk, cnt: 0, total: 0, bk: { future: 0, safe: 0, early: 0, quick: 0, warning: 0, risk: 0, critical: 0, lost: 0 } };
            gGrp[gk].cnt++;
            gGrp[gk].total += row.d_debt;
            for (let k in b) gGrp[gk].bk[k] += (db[k] || 0);

            res.push(row);
        });

        // Sum Pivot
        const sumObj = flat.reduce((a, i) => {
            if (!a[i.sale]) a[i.sale] = { name: i.sale, cnt: 0, total: 0, bad: 0, bk: { future: 0, safe: 0, early: 0, quick: 0, warning: 0, risk: 0, critical: 0, lost: 0 } };
            a[i.sale].cnt++;
            a[i.sale].total += i.s_debt;
            a[i.sale].bad += (i.s_bkt?.lost || 0);
            for (let k in a[i.sale].bk) a[i.sale].bk[k] += (i.s_bkt?.[k] || 0);
            return a;
        }, {});

        const flatSalesTotals = flat.reduce((acc, currentRow) => {
            acc.s_debt += currentRow.s_debt || 0;
            acc.debt += currentRow.debt || 0;
            COLS.forEach(([key]) => {
                acc.buckets[key] = (acc.buckets[key] || 0) + (currentRow.s_bkt?.[key] || 0);
            });
            return acc;
        }, {
            s_debt: 0,
            debt: 0,
            buckets: COLS.reduce((acc, [key]) => ({...acc, [key]: 0}), {})
        });

        return {
            list: res,
            flatSales: flat.sort((a, b) => a.sale.localeCompare(b.sale)),
            sumSales: Object.values(sumObj).sort((a, b) => b.total - a.total),
            stats: { total: t, buckets: b },
            byEmp: Object.values(gEmp).sort((a, b) => b.total - a.total),
            byGrp: Object.values(gGrp).sort((a, b) => b.total - a.total),
            flatSalesTotals,
        };
    }, [filteredList, search, flt]);

    // --- 4. EXPORT EXCEL ---
    const handleExport = async () => {
        const { default: XLSX } = await import('xlsx-js-style');
        const wb = XLSX.utils.book_new();
        // Styles
        const sH = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2F75B5" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };
        const sN = { numFmt: "#,##0", border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };
        const sB = { ...sN, font: { color: { rgb: "9C0006" } }, fill: { fgColor: { rgb: "FFC7CE" } } };
        const sT = { ...sN, font: { bold: true }, fill: { fgColor: { rgb: "FFFFCC" } } };

        const genSheet = (name, headers, rows, tot) => {
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, tot]);
            ws['!cols'] = headers.map((_, i) => ({ wch: i === 1 ? 35 : 14 }));
            const r = XLSX.utils.decode_range(ws['!ref']);
            for (let R = r.s.r; R <= r.e.r; ++R) {
                for (let C = r.s.c; C <= r.e.c; ++C) {
                    const ref = XLSX.utils.encode_cell({ c: C, r: R });
                    if (!ws[ref]) continue;
                    if (R === 0) ws[ref].s = sH;
                    else if (R === r.e.r) ws[ref].s = sT;
                    else if (C >= headers.length - 8 && ws[ref].v > 0 && C === headers.length - 1) ws[ref].s = sB;
                    else ws[ref].s = sN;
                }
            }
            XLSX.utils.book_append_sheet(wb, ws, name);
        };

        const colLabs = COLS.map(c => c[1].replace(/&[lg]t;/g, m => m === '&lt;' ? '<' : '>'));

        // Sheet 1: Truy Gốc
        genSheet("1.Truy Gốc",
            ["Mã KH", "Tên Khách Hàng", "Phụ Trách", "Tổng Nợ KH", "Nợ (Lọc)", ...colLabs],
            list.map(r => [r.code, r.name, r.display_manager, r.debt, r.d_debt, ...COLS.map(k => r.d_bkt?.[k[0]] || 0)]),
            ["TỔNG", "", "", "", stats.total, ...COLS.map(k => stats.buckets[k[0]])]
        );

        // Sheet 2: Kế toán Sale
        genSheet("2.Kế toán Sale",
            ["Salesman", "Tên Khách Hàng", "Mã KH", "Tổng Nợ KH", "Nợ Sales Bán", ...colLabs],
            flatSales.map(r => [r.sale, r.name, r.code, r.debt, r.s_debt, ...COLS.map(k => r.s_bkt?.[k[0]] || 0)]),
            ["TỔNG", "", "", "", flatSales.reduce((a, b) => a + b.s_debt, 0), ...COLS.map((k, i) => flatSales.reduce((a, b) => a + (b.s_bkt?.[k[0]] || 0), 0))]
        );

        // Sheet 3: Tổng hợp Sales
        const d3 = sumSales.map(r => [
            r.name, r.cnt, r.total, r.bad, r.total ? (r.bad / r.total) : 0, 
            ...COLS.map(k => r.bk?.[k[0]] || 0)
        ]);
        const t3 = [
            "TỔNG", "", d3.reduce((a, b) => a + b[2], 0), d3.reduce((a, b) => a + b[3], 0), "", 
            ...COLS.map((k, i) => d3.reduce((a, b) => a + b[5 + i], 0))
        ];
        genSheet("3.Tổng hợp Sales", ["Salesman", "Số Khách", "Tổng Doanh Số", "Nợ Xấu (>90d)", "Tỷ lệ", ...colLabs], d3, t3);

        const lblEmp = flt.emp.length ? flt.emp.join('+') : 'All';
        XLSX.writeFile(wb, `CongNo_${lblEmp}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
    };

    return (
        <div className="flex flex-col space-y-4">
            {/* FILTER BAR NÂNG CẤP */}
            <div className="bg-white p-2 rounded border shadow-sm flex flex-wrap gap-2 sticky top-0 z-40 items-center">
                <SearchInput val={search} setVal={setSearch} />
                <MultiDrop label="Nhóm" opts={groupOptions} val={flt.grp} setVal={v => setFlt({ ...flt, grp: v })} />
                <MultiDrop label="Nhân viên" opts={employeeOptions} val={flt.emp} setVal={v => setFlt({ ...flt, emp: v })} />
                {(search || flt.grp.length > 0 || flt.emp.length > 0) && (
                    <button 
                        onClick={() => { setSearch(''); setFlt({ grp: [], emp: [] }); }} 
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-full border border-transparent hover:border-red-200" 
                        title="Reset bộ lọc"
                    >
                        <Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className="w-4 h-4" />
                    </button>
                )}
                <Button className="bg-green-600 text-white py-1.5 px-3 text-xs shadow shrink-0" onClick={handleExport}>Xuất Excel</Button>
            </div>

            <div className="bg-white rounded border shadow-sm min-h-screen flex flex-col">
                <div className="border-b bg-gray-50 px-2 pt-1">
                    <Tabs activeTab={tab} onTabChange={setTab} items={[
                        { id: 'dashboard', label: '📊 Tổng quan' }, { id: 'sales_trace', label: '🔍 Truy gốc' }, 
                        { id: 'acc_sales', label: '🧑‍💼 Theo Sale' }, { id: 'sales_sum', label: '∑ Tổng hợp' }, 
                        { id: 'acc_pro', label: '🧾 Kế toán Pro' }, { id: 'staff_audit', label: '👮‍♂️ Đối chiếu NV' }, 
                        { id: 'bad_debt', label: '☠️ Sổ Nợ Xấu' }, { id: 'card', label: '📇 Card' }, { id: 'raw', label: '🛠 Raw' }
                    ]} />
                </div>

                <div className="p-0 overflow-x-auto">
                    {/* 1. DASHBOARD */}
                    {tab === 'dashboard' && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <AnalysisCard className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
                                <div className="text-xs font-bold text-blue-800">TỔNG NỢ ({flt.emp.length ? 'Đã lọc' : 'Toàn bộ'})</div>
                                <div className="text-3xl font-bold text-blue-900 mt-2">{fmt(stats.total)}</div>
                                <BigRiskBar buckets={stats.buckets} total={stats.total} />
                            </AnalysisCard>
                            <AnalysisCard className="bg-gradient-to-br from-red-50 to-white border-red-200">
                                <div className="text-xs font-bold text-red-800">MẤT VỐN (&gt; 90 ngày)</div>
                                <div className="text-3xl font-bold text-red-600 mt-2">{fmt(stats.buckets.lost)}</div>
                            </AnalysisCard>
                            <AnalysisCard className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
                                <div className="text-xs font-bold text-orange-800">RỦI RO (30-90 ngày)</div>
                                <div className="text-3xl font-bold text-orange-600 mt-2">{fmt(stats.buckets.risk + stats.buckets.critical)}</div>
                            </AnalysisCard>
                        </div>
                    )}

                    {/* 2. TRUY GỐC */}
                    {tab === 'sales_trace' && (
                        <table className="min-w-[1600px] border-collapse">
                            <thead className="bg-gray-100 sticky top-0 shadow-sm">
                                <tr>
                                    <Th c="Mã KH" />
                                    <Th c="Tên KH" />
                                    <Th c={flt.emp.length ? "Sales" : "Phụ trách"} />
                                    {flt.emp.length > 0 && <Th c="TỔNG NỢ KH" txt="right" bg="gray-200" cl="gray-800" />}
                                    <Th c="NỢ (LỌC)" txt="right" bg="blue-50" cl="blue-800" />
                                    {COLS.map(([k, l], i) => <Th key={i} c={l} txt="right" />)}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                <tr className="bg-yellow-50 font-bold border-b-2">
                                    <td colSpan={3} className="text-right px-2">TỔNG:</td>
                                    {flt.emp.length > 0 && <td />}
                                    <TdNum val={stats.total} b col="text-blue-800" />
                                    {COLS.map(([k], i) => <TdNum key={i} val={stats.buckets[k]} />)}
                                </tr>
                                {list.map((r, i) => (
                                    <tr key={i} className="hover:bg-blue-50">
                                        <Td c={r.code} b col="text-blue-700" click={() => setSearch(r.code)} />
                                        <Td c={r.name} col="text-blue-600" click={() => onViewEvidence(r)} />
                                        <Td c={r.display_manager} />
                                        {r.is_flt && <TdNum val={r.debt} col="text-gray-500" />}
                                        <TdNum val={r.d_debt} b col="text-blue-800 bg-blue-50" />
                                        {COLS.map(([k, l, c], j) => (
                                            <TdNum key={j} val={r.d_bkt?.[k]} col={`text-${c.split('-')[0]}-${c === 'red-800' ? '700' : c.split('-')[1]}`} />
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* 3. KẾ TOÁN (THEO SALES) */}
                    {tab === 'acc_sales' && (
                        <table className="min-w-[1600px] border-collapse text-xs">
                            <thead className="bg-gray-100 sticky top-0 shadow-sm">
                                <tr>
                                    <Th c="Salesman" bg="yellow-50" />
                                    <Th c="Khách Hàng" />
                                    <Th c="Mã KH" />
                                    <Th c="TỔNG NỢ KH" txt="right" bg="gray-200" />
                                    <Th c="NỢ SALES NÀY" txt="right" bg="blue-50" cl="blue-800" />
                                    {COLS.map(([k, l], i) => <Th key={i} c={l} txt="right" />)}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                <tr className="bg-yellow-50 font-bold border-b-2">
                                    <td colSpan={3} className="px-2 text-right">TỔNG:</td>
                                    <TdNum val={flatSalesTotals.debt} b />
                                    <TdNum val={flatSalesTotals.s_debt} b col="text-blue-800" />
                                    {COLS.map(([k], i) => <TdNum key={i} val={flatSalesTotals.buckets[k]} b />)}
                                </tr>
                                {flatSales.map((r, i) => (
                                    <tr key={i} className="hover:bg-blue-50 border-b">
                                        <Td c={r.sale} b col="text-blue-700 bg-yellow-50" />
                                        <Td c={r.name} col="text-blue-600" click={() => onViewEvidence(r)} />
                                        <Td c={r.code} click={() => setSearch(r.code)} />
                                        <TdNum val={r.debt} col="text-gray-600 bg-gray-50" />
                                        <TdNum val={r.s_debt} b col="text-blue-800 bg-blue-50" />
                                        {COLS.map(([k, l, c], j) => (
                                            <TdNum key={j} val={r.s_bkt?.[k]} col={`text-${c.split('-')[0]}-${c === 'red-800' ? '700' : c.split('-')[1]}`} />
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* 4. CÁC TAB KHÁC */}
                    {tab === 'acc_pro' && (
                        <table className="min-w-[1600px] border-collapse">
                            <thead className="bg-gray-50">
                                <tr>
                                    <Th c="Mã KH" />
                                    <Th c="Tên KH" />
                                    <Th c="Phụ trách" />
                                    <Th c="TỔNG NỢ" txt="right" />
                                    <Th c="Thanh Tuổi Nợ" />
                                    {COLS.slice(5).map(([k, l], i) => <Th key={i} c={l} txt="right" />)}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {list.map((c, i) => (
                                    <tr key={i} className="hover:bg-blue-50">
                                        <Td c={c.code} b click={() => setSearch(c.code)} />
                                        <Td c={c.name} col="text-blue-600" click={() => onViewEvidence(c)} />
                                        <Td c={c.display_manager} />
                                        <TdNum val={c.d_debt} b />
                                        <Td c={<SevenBar b={c.d_bkt} t={c.d_debt} />} />
                                        {COLS.slice(5).map(([k], j) => <TdNum key={j} val={c.d_bkt?.[k]} col="text-red-600" />)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === 'sales_sum' && (
                        <table className="min-w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <Th c="#" />
                                    <Th c="Salesman" />
                                    <Th c="Số Khách" />
                                    <Th c="Tổng Bán" txt="right" />
                                    <Th c="Nợ Xấu (&gt; 90d)" txt="right" />
                                    <Th c="Tỷ lệ" txt="center" />
                                    <Th c="Thanh Rủi Ro" />
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {sumSales.map((s, i) => (
                                    <tr key={i} className="hover:bg-gray-50 border-b">
                                        <Td c={i + 1} txt="center" />
                                        <Td c={s.name} b />
                                        <Td c={s.cnt} txt="center" />
                                        <TdNum val={s.total} b />
                                        <TdNum val={s.bad} col="text-red-600" />
                                        <Td c={s.total ? `${Math.round(s.bad / s.total * 100)}%` : '-'} txt="center" />
                                        <Td c={<SevenBar b={s.bk} t={s.total} />} />
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === 'staff_audit' && (
                        <div className="p-2 space-y-4">
                            {byEmp.map((e, i) => (
                                <div key={i} className="border rounded shadow-sm">
                                    <div className="bg-gray-100 px-3 py-1 font-bold flex justify-between">
                                        <span>{e.name}</span>
                                        <span className="text-blue-700">{fmt(e.total)}</span>
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody>
                                            {e.list.map((c, j) => (
                                                <tr key={j} className="border-b hover:bg-gray-50">
                                                    <Td c={c.name} col="text-blue-600 cursor-pointer hover:underline" click={() => onViewEvidence(c)} />
                                                    <TdNum val={c.d_debt} b />
                                                    <Td c={<SevenBar b={c.d_bkt} t={c.d_debt} />} />
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'bad_debt' && (
                        <table className="w-full">
                            <thead className="bg-red-50 text-red-900">
                                <tr>
                                    <Th c="Khách" />
                                    <Th c="Phụ trách" />
                                    <Th c="Nợ" txt="right" />
                                    <Th c="Nợ Xấu (&gt; 30d)" txt="right" />
                                    <Th c="Action" />
                                </tr>
                            </thead>
                            <tbody>
                                {list.filter(c => ((c.d_bkt?.risk || 0) + (c.d_bkt?.critical || 0) + (c.d_bkt?.lost || 0)) > 0).map((c, i) => (
                                    <tr key={i} className="hover:bg-red-50">
                                        <Td c={c.name} col="text-blue-600 cursor-pointer hover:underline" b click={() => onViewEvidence(c)} />
                                        <Td c={c.manager} />
                                        <TdNum val={c.d_debt} />
                                        <TdNum val={(c.d_bkt?.risk || 0) + (c.d_bkt?.critical || 0) + (c.d_bkt?.lost || 0)} b col="text-red-600" />
                                        <Td c={<button className="border border-red-500 text-red-500 px-2 rounded" onClick={() => onViewEvidence(c)}>Đòi</button>} />
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === 'card' && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50">
                            {byEmp.map((e, i) => (
                                <div key={i} className="bg-white p-3 rounded border shadow cursor-pointer transition-shadow hover:shadow-md" onClick={() => setExpand({ ...expand, [e.name]: !expand[e.name] })}>
                                    <div className="flex justify-between font-bold mb-1 border-b pb-1">
                                        <span>{e.name}</span>
                                        <span className="text-blue-700">{fmt(e.total)}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 flex justify-between">
                                        <span>{e.list.length} Khách</span>
                                        <span>{expand[e.name] ? '▼' : '▶'}</span>
                                    </div>
                                    {expand[e.name] && (
                                        <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                                            {e.list.map((c, j) => (
                                                <div key={j} className="flex justify-between text-xs hover:bg-gray-100 p-1 rounded" onClick={(ev) => { ev.stopPropagation(); onViewEvidence(c); }}>
                                                    <span className="truncate w-2/3 text-blue-600 cursor-pointer hover:underline">{c.name}</span>
                                                    <span className="font-bold">{fmt(c.d_debt)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'raw' && (
                        <div className="p-2">
                            <textarea className="w-full h-96 text-xs font-mono border p-2 bg-gray-50 rounded" value={JSON.stringify(list.slice(0, 50), null, 2)} readOnly />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};