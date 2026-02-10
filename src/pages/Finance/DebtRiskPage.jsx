import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useApiData } from '../../hooks/useApiData.jsx';
import { AnalysisCard } from '../../components/analysis/AnalysisCard.jsx';
import { DebtRiskTables } from '../../components/analysis/DebtRiskTables.jsx'; 
import { DebtEvidenceModal } from '../../components/analysis/DebtEvidenceModal.jsx';
import { Icon } from '../../components/ui.jsx'; 

const COLORS = { FUTURE:'#0f766e', SAFE:'#10b981', EARLY:'#3b82f6', QUICK:'#8b5cf6', WARNING:'#eab308', RISK:'#f97316', CRITICAL:'#ef4444', LOST:'#7f1d1d' };
const fmt = (v) => new Intl.NumberFormat('vi-VN').format(Number(v)||0);

// --- HELPER: SYNC STATUS (FIX TIMEZONE & FORMAT) ---
const getSyncStatusInfo = (dateStr) => {
    if(!dateStr) return { cls: 'bg-white', txt: 'Chưa có dữ liệu' };
    // Fix lỗi Safari/iOS: đổi - thành /
    const syncDate = new Date(dateStr.replace(/-/g, '/'));
    if(isNaN(syncDate.getTime())) return { cls: 'bg-white', txt: dateStr };
    
    const diff = (new Date() - syncDate) / 60000; // minutes
    let cls = diff<30 ? 'bg-green-50 text-green-800 border-green-200' : diff<180 ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-red-50 text-red-800 border-red-200';
    let txt = diff<1 ? 'Vừa xong' : diff<60 ? `${Math.floor(diff)} phút trước` : diff<1440 ? `${Math.floor(diff/60)} giờ trước` : new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(syncDate);
    return { cls, txt };
};

// --- COMPONENT: MULTI-SELECT DROPDOWN ---
const MultiDrop = ({ label, opts, val, setVal }) => {
    const [open, setOpen] = useState(false);
    const [txt, setTxt] = useState('');
    const ref = useRef(null);
    useEffect(() => {
        const fn = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn);
    }, []);
    
    const fOpts = opts.filter(o => o.toLowerCase().includes(txt.toLowerCase()));
    const tog = (o) => setVal(val.includes(o) ? val.filter(i=>i!==o) : [...val,o]);
    const clr = (e) => { e.stopPropagation(); setVal([]); };

    return (
        <div className="relative" ref={ref}>
            <div onClick={() => setOpen(!open)} className={`flex items-center justify-between w-full md:w-48 px-3 py-2 text-sm border rounded shadow-sm bg-white cursor-pointer hover:bg-gray-50 ${val.length?'border-blue-500 ring-1 ring-blue-200':'border-gray-300'}`}>
                <span className={`truncate ${val.length?'text-blue-700 font-bold':'text-gray-600'}`}>{val.length===0?label:`${label} (${val.length})`}</span>
                <div className="flex items-center gap-1">
                    {val.length>0 && <span onClick={clr} title="Xóa chọn" className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full font-bold">✕</span>}
                    <span className="text-gray-400 text-xs">▼</span>
                </div>
            </div>
            {open && <div className="absolute z-50 mt-1 w-64 bg-white border rounded shadow-xl max-h-80 flex flex-col animate-fadeIn">
                <div className="p-2 border-b bg-gray-50"><input className="w-full px-2 py-1 text-xs border rounded outline-none focus:border-blue-500" placeholder={`Tìm ${label}...`} value={txt} onChange={e=>setTxt(e.target.value)} autoFocus/></div>
                <div className="p-2 border-b bg-gray-50 flex justify-between"><button onClick={()=>setVal(val.length===opts.length?[]:opts)} className="text-xs font-bold text-blue-600 hover:underline">{val.length===opts.length?'Bỏ chọn':'Chọn hết'}</button><span className="text-[10px] text-gray-500">{val.length} chọn</span></div>
                <div className="overflow-y-auto flex-1 p-1">{fOpts.length===0?<div className="p-2 text-xs text-gray-400 text-center">Trống</div>:fOpts.map(o=>(
                    <div key={o} onClick={()=>tog(o)} className={`flex items-center px-2 py-1.5 cursor-pointer rounded text-sm mb-0.5 ${val.includes(o)?'bg-blue-50 text-blue-700 font-medium':'text-gray-700 hover:bg-gray-100'}`}>
                        <input type="checkbox" checked={val.includes(o)} readOnly className="mr-2 h-4 w-4 text-blue-600 rounded pointer-events-none"/><span>{o}</span>
                    </div>
                ))}</div>
            </div>}
        </div>
    );
};

export const DebtRiskPage = ({ setAppTitle }) => {
    const [mode, setMode] = useState('ALL'); 
    const [grps, setGrps] = useState([]); 
    const [emps, setEmps] = useState([]); 
    const [viewCus, setViewCus] = useState(null);
    const { data: api, pagination: meta, isLoading } = useApiData('/api/v2/debt-analysis', { type:'receivable', min_debt:100000 });

    useEffect(() => setAppTitle('Dashboard Phân tích Rủi ro'), [setAppTitle]);

    // 1. CHUẨN HÓA DATA
    const { list, grpOpts, empOpts, syncTime } = useMemo(() => {
        const raw = api?.all_customers||[];
        const norm = raw.map(c => ({
            ...c, 
            name: c.partner_name||c.name||'?', 
            code: c.partner_code||c.code, 
            debt: Number(c.closing_balance||c.debt||0), 
            group: c.customer_group||c.group||'Khác', 
            manager: c.manager||c.nhan_vien_phu_trach||'N/A'
        }));
        
        // Lấy danh sách nhân viên đầy đủ (Phụ trách + Salesman breakdown)
        const empSet = new Set();
        norm.forEach(c => {
            if(c.manager && c.manager!=='N/A') empSet.add(c.manager);
            c.salesman_breakdown?.forEach(s => { 
                if(s.name && s.name!=='Nợ Tồn (Không rõ đơn)') empSet.add(s.name); 
            });
        });
        
        return {
            list: norm, 
            grpOpts: [...new Set(norm.map(c=>c.group))].sort(), 
            empOpts: [...empSet].sort(),
            syncTime: getSyncStatusInfo(api?.meta?.date)
        };
    }, [api]);

    // 2. FILTER & KPI LOGIC
    const { fltList, kpi, charts, cmp } = useMemo(() => {
        let sD=0, sB=0, pD=0, pB=0;
        
        const res = list.filter(c => {
            // Filter Mode
            const isState = ['nhà nước','cơ quan','ubnd','sở','phòng'].some(k=>(c.group+' '+c.name).toLowerCase().includes(k));
            if(mode==='STATE' && !isState) return false; 
            if(mode==='PRIVATE' && isState) return false;
            
            // Filter Multi-Select Group
            if(grps.length > 0 && !grps.includes(c.group)) return false;
            
            // Filter Multi-Select Employee (Manager OR Breakdown)
            if(emps.length > 0) {
                const isMgr = emps.includes(c.manager);
                const isSold = c.salesman_breakdown?.some(s => emps.includes(s.name));
                if(!isMgr && !isSold) return false;
            }

            // Stats comparison
            if(isState) { sD+=c.debt; if(c.overdue_days>30) sB+=c.debt; } 
            else { pD+=c.debt; if(c.overdue_days>30) pB+=c.debt; }
            return true;
        });

        // Buckets Calculation
        let b={future:0,safe:0,early:0,quick:0,warning:0,risk:0,critical:0,lost:0}, t=0;
        res.forEach(c => {
            t += c.debt; 
            const db = c.detail_buckets;
            if(db) { for(let k in b) b[k]+=(db[k]||0); } 
            else { 
                // Fallback buckets
                const d=c.overdue_days, v=c.debt; 
                if(d>90) b.lost+=v; else if(d>60) b.critical+=v; else if(d>30) b.risk+=v; 
                else if(d>15) b.warning+=v; else if(d>7) b.quick+=v; else if(d>3) b.early+=v; 
                else if(d>0) b.safe+=v; else b.future+=v; 
            }
        });

        return {
            fltList: res, 
            kpi: {t, ...b},
            charts: [
                {name:'Chưa đến hạn',v:b.future,c:COLORS.FUTURE}, {name:'< 3 ngày',v:b.safe,c:COLORS.SAFE}, {name:'3-7 ngày',v:b.early,c:COLORS.EARLY},
                {name:'7-15 ngày',v:b.quick,c:COLORS.QUICK}, {name:'15-30 ngày',v:b.warning,c:COLORS.WARNING}, {name:'30-60 ngày',v:b.risk,c:COLORS.RISK},
                {name:'60-90 ngày',v:b.critical,c:COLORS.CRITICAL}, {name:'> 90 ngày',v:b.lost,c:COLORS.LOST}
            ],
            cmp: [{name:'Nhà Nước',t:sD,b:sB},{name:'Tư Nhân',t:pD,b:pB}]
        };
    }, [list, mode, grps, emps]);

    if(isLoading && !list.length) return <div className="h-screen flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 font-inter pb-10">
            <div className="flex-none p-4 space-y-4">
                {/* HEADER & FILTERS */}
                <div className={`flex flex-col xl:flex-row justify-between items-center p-4 rounded-xl shadow-sm transition-colors border ${syncTime.cls}`}>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Icon path="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" className="w-6 h-6 text-blue-600"/> 
                            Phân Tích Rủi Ro
                        </h1>
                        <div className="text-sm text-gray-500 mt-1">Cập nhật: <b>{syncTime.txt}</b> • Xem: <b>{fltList.length}</b>/{list.length} KH</div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto items-center mt-3 xl:mt-0">
                        <MultiDrop label="Nhóm" opts={grpOpts} val={grps} setVal={setGrps}/>
                        <MultiDrop label="Nhân viên" opts={empOpts} val={emps} setVal={setEmps}/>
                        <div className="flex bg-gray-200 p-1 rounded-md">
                            {['ALL','PRIVATE','STATE'].map(m=><button key={m} onClick={()=>setMode(m)} className={`px-3 py-2 text-xs font-bold rounded ${mode===m?'bg-white shadow text-blue-700':'text-gray-500 hover:text-gray-700'}`}>{m==='ALL'?'Tất cả':m==='PRIVATE'?'Tư Nhân':'Nhà Nước'}</button>)}
                        </div>
                        {/* NÚT RESET TỔNG */}
                        {(grps.length>0 || emps.length>0 || mode!=='ALL') && (
                            <button onClick={()=>{setGrps([]);setEmps([]);setMode('ALL');}} className="p-2 text-red-500 hover:bg-red-50 rounded-full border border-transparent hover:border-red-200 transition-all" title="Reset bộ lọc">
                                <Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className="w-5 h-5"/>
                            </button>
                        )}
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2">
                    <AnalysisCard className="col-span-2 md:col-span-2 lg:col-span-1 bg-gray-800 text-black border-gray-700">
                        <div className="text-[10px] uppercase font-bold text-gray-400">TỔNG NỢ ĐANG XEM</div><div className="text-base font-bold truncate" title={fmt(kpi.t)}>{fmt(kpi.t)}</div>
                    </AnalysisCard>
                    {[
                        {l:'TRONG HẠN',v:kpi.future,c:'teal'},{l:'< 3 NGÀY',v:kpi.safe,c:'green'},{l:'3-7 NGÀY',v:kpi.early,c:'blue'},
                        {l:'7-15 NGÀY',v:kpi.quick,c:'purple'},{l:'15-30 NGÀY',v:kpi.warning,c:'yellow'},{l:'30-60 NGÀY',v:kpi.risk,c:'orange'},
                        {l:'60-90 NGÀY',v:kpi.critical,c:'red'},{l:'> 90 NGÀY',v:kpi.lost,c:'red',b:'bg-red-100 text-red-900'}
                    ].map((i,x)=><AnalysisCard key={x} className={`${i.b||`bg-${i.c}-50 text-${i.c}-800 border-${i.c}-200`} border`}><div className="text-[9px] font-bold uppercase">{i.l}</div><div className="text-xs font-bold">{fmt(i.v)}</div></AnalysisCard>)}
                </div>

                {/* CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <AnalysisCard title="Tư nhân vs Nhà nước" className="lg:col-span-1"><div className="h-60 w-full"><ResponsiveContainer>
                        <BarChart layout="vertical" data={cmp} margin={{top:5,right:30,left:0,bottom:5}}><XAxis type="number" hide/><YAxis dataKey="name" type="category" width={80} style={{fontSize:10, fontWeight:'bold'}}/><Tooltip formatter={(v)=>fmt(v)} cursor={{fill:'transparent'}}/><Bar dataKey="t" name="Tổng" fill="#e5e7eb" radius={[0,4,4,0]} barSize={20}/><Bar dataKey="b" name="Nợ xấu" fill="#ef4444" radius={[0,4,4,0]} barSize={12}/></BarChart>
                    </ResponsiveContainer></div></AnalysisCard>
                    <AnalysisCard title="Phân bổ 8 Mức Tuổi Nợ" className="lg:col-span-2"><div className="h-60 w-full"><ResponsiveContainer>
                        <BarChart data={charts} margin={{top:10,right:10,left:0,bottom:0}}><XAxis dataKey="name" style={{fontSize:10}} interval={0} tickLine={false} axisLine={false}/><Tooltip formatter={(v)=>fmt(v)} cursor={{fill:'#f3f4f6'}}/><Bar dataKey="v" radius={[4,4,0,0]}>{charts.map((e,i)=><Cell key={i} fill={e.c}/>)}</Bar></BarChart>
                    </ResponsiveContainer></div></AnalysisCard>
                </div>
            </div>

            {/* TABLE & MODAL */}
            <div className="flex-1 px-4">
                <DebtRiskTables filteredList={fltList} groupOptions={grpOpts} employeeOptions={empOpts} onViewEvidence={setViewCus}/>
            </div>
            <DebtEvidenceModal customer={viewCus} isOpen={!!viewCus} onClose={()=>setViewCus(null)}/>
        </div>
    );
};