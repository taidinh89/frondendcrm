// src/pages/PartnerAnalysisContent.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line, Area, AreaChart, Treemap } from 'recharts';
import { AnalysisCard } from '../../components/analysis/AnalysisCard.jsx';
import { Tabs } from '../../components/analysis/Tabs.jsx';
import { PartnerAnalysisDataTable } from '../../components/analysis/PartnerAnalysisDataTable.jsx';
import { SupplierDetailModal } from '../../components/Modals/SupplierDetailModal.jsx';
import { CustomerDetailModal } from '../../components/Modals/CustomerDetailModal.jsx';
import { Button, Icon } from '../../components/ui.jsx';
import { dateUtils } from '../../utils/dateUtils.js';
import { handlePartnerExport } from '../../utils/partnerExportLogic.js';
import { useApiData } from '../../hooks/useApiData.jsx';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];
const fmt = (v) => new Intl.NumberFormat('vi-VN').format(v || 0);

// --- COMPONENT MULTI DROP ---
const MultiDrop = ({ label, opts=[], val=[], setVal, k='code', n='name' }) => {
    const [open, setOpen] = useState(false);
    const [txt, setTxt] = useState('');
    const ref = useRef(null);
    useEffect(() => { const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn); }, []);
    const fOpts = useMemo(() => {
        let res = opts.filter(o => !txt || String(o[n]||'').toLowerCase().includes(txt.toLowerCase()) || String(o[k]||'').toLowerCase().includes(txt.toLowerCase()));
        return res.sort((a,b) => (val.includes(a[k])===val.includes(b[k])) ? 0 : val.includes(a[k]) ? -1 : 1);
    }, [opts, txt, val, k, n]);
    const tog = (o) => setVal(val.includes(o[k]) ? val.filter(i=>i!==o[k]) : [...val, o[k]]);
    return (
        <div className="relative" ref={ref}>
            <div onClick={()=>setOpen(!open)} className={`flex justify-between items-center min-w-[140px] max-w-[220px] px-3 py-2 text-sm border rounded cursor-pointer shadow-sm ${val.length?'border-blue-500 ring-1 ring-blue-200 text-blue-700 font-bold':'border-gray-300 bg-white'}`}>
                <span className="truncate mr-2">{val.length===0 ? label : `${label} (${val.length})`}</span>
                <div className="flex items-center gap-1">{val.length>0 && <span onClick={(e)=>{e.stopPropagation();setVal([])}} className="hover:text-red-500 font-bold px-1">✕</span>}<span className="text-[10px] text-gray-400">▼</span></div>
            </div>
            {open && (
                <div className="absolute z-50 mt-1 w-80 bg-white border rounded-lg shadow-xl max-h-[400px] flex flex-col overflow-hidden left-0 animate-fadeIn">
                    <div className="p-2 border-b bg-gray-50"><input className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 outline-none" placeholder={`Tìm ${label}...`} value={txt} onChange={e=>setTxt(e.target.value)} autoFocus/></div>
                    <div className="p-2 border-b flex justify-between text-xs text-gray-500"><span>Đã chọn: <b className="text-blue-600">{val.length}</b></span><button onClick={()=>setVal(val.length===opts.length?[]:opts.map(o=>o[k]))} className="text-blue-600 font-bold">{val.length===opts.length?'Bỏ hết':'Chọn hết'}</button></div>
                    <div className="overflow-y-auto flex-1 p-1">{fOpts.map(o => {
                        const isSel = val.includes(o[k]);
                        return <div key={o[k]} onClick={()=>tog(o)} className={`flex items-center px-3 py-2 cursor-pointer rounded text-sm mb-0.5 ${isSel?'bg-blue-50 text-blue-800 font-bold border-l-4 border-blue-500':'text-gray-700 hover:bg-gray-100'}`}><input type="checkbox" checked={isSel} readOnly className="mr-2 pointer-events-none"/><span className="truncate">{o[k]===o[n]?o[n]:<>{o[n]} <span className="text-gray-400 font-normal text-xs">({o[k]})</span></>}</span></div>
                    })}</div>
                </div>
            )}
        </div>
    );
};

// --- HELPERS ---
const aggPie = (d) => { if(!d?.length) return []; const t = d.reduce((s,i)=>s+i.value,0); let res=[], o=0; d.forEach(i => (i.value/t >= 0.02) ? res.push(i) : o+=i.value); if(o>0) res.push({name:'Khác', value:o}); return res; };
const TreeContent = ({ x, y, width, height, index, name, value }) => (<g><rect x={x} y={y} width={width} height={height} style={{fill:COLORS[index%COLORS.length], stroke:'#fff'}}/>{width>50 && height>30 && <><text x={x+width/2} y={y+height/2-10} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">{name}</text><text x={x+width/2} y={y+height/2+10} textAnchor="middle" fill="#fff" fontSize={11}>{fmt(value)}</text></>}</g>);

export const PartnerAnalysisContent = ({ setAppTitle }) => {
    const def = dateUtils.getLast30Days();
    const [d, setD] = useState(def);
    const [fil, setFil] = useState({ brand: [], category: [], l3: [] });
    const [pId, setPId] = useState('');
    const [apiP, setApiP] = useState({ date_from: def.from, date_to: def.to });
    
    // [NEW] Search State
    const [searchTerm, setSearchTerm] = useState('');
    
    // API
    const { data: full, isLoading } = useApiData('/api/v2/sales-group-analysis', apiP, 300);
    const { data: preList } = useApiData('/api/v2/dictionary/presets', {}, 0);

    // UI State
    const [tab, setTab] = useState('by_supplier'); 
    const [step, setStep] = useState(0);
    const [vCus, setVCus] = useState(null);
    const [vSup, setVSup] = useState(null);

    useEffect(() => { setAppTitle('Trung tâm Chỉ huy Mua hàng'); }, []);
    useEffect(() => { if(full) { setStep(0); setTimeout(()=>setStep(1),100); setTimeout(()=>setStep(2),300); setTimeout(()=>setStep(3),600); } }, [full]);

    const onApply = () => setApiP({ date_from: d.from, date_to: d.to, brand: fil.brand.join(',')||undefined, category: fil.category.join(',')||undefined, l3: fil.l3.join(',')||undefined });
    const onReset = () => { setFil({brand:[], category:[], l3:[]}); setPId(''); setSearchTerm(''); setApiP(p=>({...p, brand:undefined, category:undefined, l3:undefined})); };
    const onPreset = (e) => { const id=e.target.value; setPId(id); const p=preList?.find(x=>String(x.id)===String(id)); if(p) setFil({ brand: p.filter_config.brand||[], category: p.filter_config.category||[], l3: p.filter_config.l3||[] }); };
    
    const onDatePre = (e) => {
        const t = e.target.value; const today = new Date(); const fd = d => d.toISOString().split('T')[0];
        let f='', tD=fd(today);
        switch(t){
            case 'today': f=tD; break;
            case 'yesterday': const y=new Date(); y.setDate(y.getDate()-1); f=tD=fd(y); break;
            case 'last3': const d3=new Date(); d3.setDate(d3.getDate()-2); f=fd(d3); break;
            case 'last7': const d7=new Date(); d7.setDate(d7.getDate()-6); f=fd(d7); break;
            case 'last30': const d30=new Date(); d30.setDate(d30.getDate()-29); f=fd(d30); break;
            case 'thisWeek': const dw=today.getDay()||7; if(dw!==1) today.setHours(-24*(dw-1)); f=fd(today); break;
            case 'thisMonth': f=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`; break;
            case 'lastMonth': const lm=new Date(today.getFullYear(),today.getMonth()-1,1); const le=new Date(today.getFullYear(),today.getMonth(),0); f=fd(lm); tD=fd(le); break;
            case 'thisQuarter': f=fd(new Date(today.getFullYear(), Math.floor(today.getMonth()/3)*3, 1)); break;
            case 'thisYear': f=`${today.getFullYear()}-01-01`; break;
            case 'lastYear': f=`${today.getFullYear()-1}-01-01`; tD=`${today.getFullYear()-1}-12-31`; break;
            default: return;
        }
        setD({ from: f, to: tD });
    };

    const list = useMemo(() => full?.[tab] || [], [full, tab]);
    const opts = full?.filter_options || { brands:[], categories:[], sub_categories:[] };
    const mac = full?.charts_macro || {};
    const trd = full?.charts_trend || {};
    const kpi = useMemo(() => { const l=full?.by_supplier||[]; return { c:l.length, i:l.reduce((s,x)=>s+(x.net_revenue||0),0), p:l.reduce((s,x)=>s+(x.total_profit||0),0), r:l.reduce((s,x)=>s+Math.abs(x.return_value||0),0) }; }, [full]);

    return (
        <div className="p-4 space-y-6 bg-gray-100 min-h-screen">
            {/* TOOLBAR: Giao diện Cũ (3 Cột) - KHÔNG Sticky */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 relative flex flex-col xl:flex-row gap-4">
                
                {/* COL 1: Date */}
                <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 font-bold text-gray-700"><Icon path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" className="w-5 h-5 text-blue-600"/>Thời gian</div>
                        <select onChange={onDatePre} defaultValue="custom" className="text-xs border border-blue-300 bg-blue-50 text-blue-700 rounded px-2 py-1 font-bold outline-none cursor-pointer">
                            <option value="custom" disabled>⚡ Chọn nhanh...</option>
                            <optgroup label="Ngắn hạn"><option value="today">Hôm nay</option><option value="yesterday">Hôm qua</option><option value="last3">3 ngày qua</option><option value="last7">7 ngày qua</option></optgroup>
                            <optgroup label="Trung hạn"><option value="thisWeek">Tuần này</option><option value="thisMonth">Tháng này</option><option value="lastMonth">Tháng trước</option><option value="last30">30 ngày qua</option></optgroup>
                            <optgroup label="Dài hạn"><option value="thisQuarter">Quý này</option><option value="thisYear">Năm nay</option><option value="lastYear">Năm ngoái</option></optgroup>
                        </select>
                    </div>
                    <div className="flex gap-2 items-center bg-gray-50 p-1 rounded border w-full shadow-sm">
                        <input type="date" value={d.from} onChange={e=>setD({...d, from:e.target.value})} className="bg-transparent text-sm font-bold w-full outline-none"/> ➜ <input type="date" value={d.to} onChange={e=>setD({...d, to:e.target.value})} className="bg-transparent text-sm font-bold w-full outline-none text-right"/>
                    </div>
                </div>

                {/* COL 2: Filters & Search */}
                <div className="flex-[2] space-y-2 border-l pl-4 border-gray-100">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 font-bold text-gray-700">
                            <Icon path="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75" className="w-5 h-5 text-purple-600"/>Bộ lọc
                            {preList?.length>0 && <select value={pId} onChange={onPreset} className="ml-2 text-xs border-orange-300 bg-orange-50 text-orange-800 rounded px-2 py-0.5 font-bold outline-none"><option value="">-- Lọc nhanh --</option>{preList.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}
                        </div>
                        
                        {/* [NEW] SEARCH BOX ADDED HERE */}
                        <div className="flex gap-2 items-center">
                            <div className="relative">
                                <Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Tìm nhanh..." 
                                    className="pl-7 pr-5 py-0.5 text-sm border border-gray-300 rounded shadow-sm outline-none focus:border-blue-500 w-32 focus:w-48 transition-all" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && <button onClick={()=>setSearchTerm('')} className="absolute right-1 top-1 text-gray-400 hover:text-red-500 font-bold text-xs">✕</button>}
                            </div>
                            <button onClick={onReset} className="text-xs text-red-500 hover:underline whitespace-nowrap">Đặt lại</button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <MultiDrop label="Nhóm L1" opts={opts.brands} val={fil.brand} setVal={v=>setFil({...fil, brand:v})} />
                        <MultiDrop label="Nhóm L2" opts={opts.categories} val={fil.category} setVal={v=>setFil({...fil, category:v})} />
                        <MultiDrop label="Nhóm L3" opts={opts.sub_categories} val={fil.l3} setVal={v=>setFil({...fil, l3:v})} />
                    </div>
                </div>

                {/* COL 3: Actions */}
                <div className="flex flex-col justify-end gap-2 min-w-[120px]">
                    <Button onClick={onApply} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">{isLoading?'Loading...':'ÁP DỤNG'}</Button>
                    <Button onClick={()=>handlePartnerExport(list, tab, apiP, fil.brand.join('_'))} variant="secondary" className="w-full border-green-600 text-green-700 h-8 text-xs">Excel</Button>
                </div>
            </div>

            {/* CONTENT BODY */}
            {!full ? (isLoading ? <div className="h-64 flex center text-blue-500">Đang tải...</div> : <div className="text-center p-10 text-gray-400">Không có dữ liệu</div>) : (
                <div className="space-y-6 animate-fade-in">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[{l:'NCC Hoạt động',v:kpi.c,c:'orange'},{l:'Tổng Nhập',v:fmt(kpi.i),c:'blue'},{l:'Trả hàng',v:fmt(kpi.r),c:'red',bg:'bg-red-50'},{l:'Lợi nhuận gộp',v:fmt(kpi.p),c:'green'}].map((k,i)=><AnalysisCard key={i} className={`py-3 pl-4 border-l-4 border-${k.c}-500 ${k.bg||''}`}><p className="text-xs font-bold text-gray-500 uppercase">{k.l}</p><p className={`text-xl font-bold text-${k.c}-700`}>{k.v}</p></AnalysisCard>)}
                    </div>

                    {/* Charts */}
                    {step>=1 && <div className="grid lg:grid-cols-3 gap-6">
                        <AnalysisCard title="Dòng tiền Nhập" className="lg:col-span-2"><div className="h-64"><ResponsiveContainer><AreaChart data={trd.purchase_trend}><defs><linearGradient id="cImp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={d=>d.slice(8)}/><YAxis width={40} tickFormatter={v=>(v/1e6).toFixed(0)+'M'}/><Tooltip formatter={fmt}/><Area type="monotone" dataKey="total_import" stroke="#3b82f6" fill="url(#cImp)"/></AreaChart></ResponsiveContainer></div></AnalysisCard>
                        <AnalysisCard title="Tần suất (PO)"><div className="h-64"><ResponsiveContainer><BarChart data={trd.purchase_trend}><Tooltip/><Bar dataKey="po_count" fill="#82ca9d"/></BarChart></ResponsiveContainer></div></AnalysisCard>
                    </div>}

                    {step>=2 && <div className="grid lg:grid-cols-2 gap-6">
                        <AnalysisCard title="Cơ cấu Nhập (Treemap)"><div className="h-72"><ResponsiveContainer><Treemap data={mac.system_category_breakdown} dataKey="value" aspectRatio={4/3} stroke="#fff" content={<TreeContent/>}><Tooltip formatter={fmt}/></Treemap></ResponsiveContainer></div></AnalysisCard>
                        <AnalysisCard title="Tỷ trọng Nhóm"><div className="h-72"><ResponsiveContainer><PieChart><Pie data={aggPie(mac.system_category_breakdown)} innerRadius={60} outerRadius={100} dataKey="value">{aggPie(mac.system_category_breakdown).map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={fmt}/><Legend/></PieChart></ResponsiveContainer></div></AnalysisCard>
                    </div>}

                    {/* {step>=3 && <div className="grid lg:grid-cols-2 gap-6">
                         <AnalysisCard title="Hiệu quả vs Lỗi"><div className="h-80"><ResponsiveContainer><ComposedChart data={full.by_supplier.slice(0,15)}><CartesianGrid stroke="#f5f5f5"/><XAxis dataKey="supplier_name" angle={-15} textAnchor="end" height={60} tick={{fontSize:10}}/><YAxis yAxisId="l" tickFormatter={v=>(v/1e6).toFixed(0)+'M'}/><YAxis yAxisId="r" orientation="right" tickFormatter={v=>v+'%'}/><Tooltip/><Legend/><Bar yAxisId="l" dataKey="net_revenue" name="Doanh số" fill="#3b82f6"/><Line yAxisId="r" type="monotone" dataKey="return_rate_percent" name="% Trả" stroke="#ef4444"/></ComposedChart></ResponsiveContainer></div></AnalysisCard>
                         <AnalysisCard title="Top 5 NCC Cơ cấu"><div className="h-80"><ResponsiveContainer><BarChart data={mac.top_suppliers_breakdown}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tickFormatter={v=>(v/1e6).toFixed(0)+'M'}/><Tooltip formatter={fmt}/><Legend/>{Object.keys(mac.top_suppliers_breakdown[0]||{}).filter(k=>k!=='name').map((k,i)=><Bar key={k} dataKey={k} stackId="a" fill={COLORS[i%COLORS.length]}/>)}</BarChart></ResponsiveContainer></div></AnalysisCard>
                    </div>} */}

                    {/* TABLE AREA */}
                    <AnalysisCard title="Chi tiết dữ liệu">
                        <div className="px-4 pt-2 border-b bg-gray-50"><Tabs items={[{id:'by_supplier',label:'Hiệu quả NCC'},{id:'top_customers',label:'DS Khách Hàng'}]} activeTab={tab} onTabChange={setTab}/></div>
                        <div className="p-4">
                            <PartnerAnalysisDataTable 
                                data={list} 
                                type={tab} 
                                productList={full?.by_product_list || []} 
                                searchTerm={searchTerm}
                                onItemClick={(t,id,n)=>{if(t==='customer')setVCus(id);else{setVSup(id);}}}
                            />
                        </div>
                    </AnalysisCard>

                    {/* RISK WARNING */}
                    {step>=1 && mac.dependency_risks?.length>0 && (
                        <div className="bg-red-50 border border-red-200 rounded p-4 mt-4">
                            <h3 className="font-bold text-red-800 flex items-center gap-2 uppercase mb-2"><Icon path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" className="w-6 h-6"/>Cảnh báo Rủi ro Độc quyền</h3>
                            <div className="grid md:grid-cols-3 gap-4">{mac.dependency_risks.map((r,i)=><div key={i} className="bg-white p-3 rounded border-l-4 border-red-500 shadow-sm"><div className="flex justify-between text-xs text-gray-500 uppercase font-bold"><span>{r.category}</span><span className="bg-red-100 text-red-700 px-1 rounded">{r.level}</span></div><div className="mt-2 text-sm">Độc quyền bởi: <b className="text-blue-600">{r.supplier}</b></div><div className="mt-1 text-2xl font-bold text-red-600">{r.share}%</div></div>)}</div>
                        </div>
                    )}
                </div>
            )}
            {vCus && <CustomerDetailModal customerIdentifier={vCus} onClose={()=>setVCus(null)}/>}
            {vSup && <SupplierDetailModal supplierIdentifier={vSup} onClose={()=>setVSup(null)}/>}
        </div>
    );
};