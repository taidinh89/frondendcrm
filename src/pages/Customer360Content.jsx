// src/pages/Customer360Content.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react'; 
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts'; 

import { SalesAnalysisFilterBar } from '../components/analysis/SalesAnalysisFilterBar.jsx';
import { AnalysisCard } from '../components/analysis/AnalysisCard.jsx';
import { Button, Icon } from '../components/ui.jsx';
import { CustomerAnalysisModal } from '../components/CustomerAnalysisModal.jsx'; 
import { dateUtils } from '../utils/dateUtils.js';
import { exportToExcel } from '../utils/exportUtils.js'; 
import { useApiData } from '../hooks/useApiData.jsx';

const API_ENDPOINT = '/api/v2/customer-analysis';

const SEGMENT_CONFIG = {
    'CHAMPION': { color: '#10b981', icon: '💎', label: 'Champions (VIP)', desc: 'Mua nhiều, mua gần đây' },
    'LOYAL':    { color: '#3b82f6', icon: '❤️', label: 'Trung Thành', desc: 'Mua thường xuyên' },
    'WHALE':    { color: '#f59e0b', icon: '💰', label: 'Đại Gia (Whales)', desc: 'Ít mua nhưng đơn to' },
    'NEW':      { color: '#8b5cf6', icon: '🌱', label: 'Khách Mới', desc: 'Mới mua lần đầu' },
    'SLEEP':    { color: '#6b7280', icon: '💤', label: 'Ngủ Đông', desc: 'Lâu không quay lại' },
    'LOST':     { color: '#ef4444', icon: '⚠️', label: 'Rời Bỏ', desc: 'Mất tích > 6 tháng' },
    'REGULAR':  { color: '#9ca3af', icon: '👤', label: 'Vãng Lai', desc: 'Khách bình thường' }
};

const formatPrice = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

// --- 1. UI COMPONENTS (FILTER) ---
const MultiDrop = ({ label, opts, val, setVal }) => {
    const [open, setOpen] = useState(false);
    const [txt, setTxt] = useState('');
    const ref = useRef(null);
    useEffect(() => {
        const fn = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn);
    }, []);
    
    // Map options object to array if needed (cho Segment)
    const optionsArray = Array.isArray(opts) ? opts : Object.keys(opts);
    const fOpts = optionsArray.filter(o => {
        const labelStr = (typeof opts === 'object' && !Array.isArray(opts)) ? opts[o].label : o;
        return String(labelStr).toLowerCase().includes(txt.toLowerCase());
    });

    const tog = (o) => setVal(val.includes(o) ? val.filter(i=>i!==o) : [...val,o]);
    
    return (
        <div className="relative" ref={ref}>
            <div onClick={() => setOpen(!open)} className={`flex items-center justify-between w-full md:w-40 px-2 py-1.5 text-xs border rounded shadow-sm bg-white cursor-pointer hover:bg-gray-50 ${val.length?'border-blue-500 ring-1 ring-blue-200 text-blue-700 font-bold':'border-gray-300 text-gray-600'}`}>
                <span className="truncate">{val.length===0?label:`${label} (${val.length})`}</span>
                <div className="flex items-center gap-1">
                    {val.length>0 && <span onClick={(e)=>{e.stopPropagation();setVal([])}} className="hover:text-red-500 px-1 font-bold" title="Xóa">✕</span>}
                    <span className="text-[10px]">▼</span>
                </div>
            </div>
            {open && <div className="absolute z-50 mt-1 w-56 bg-white border rounded shadow-xl max-h-60 flex flex-col animate-fadeIn">
                <div className="p-2 border-b bg-gray-50"><input className="w-full px-2 py-1 text-xs border rounded outline-none focus:border-blue-500" placeholder="Tìm..." value={txt} onChange={e=>setTxt(e.target.value)} autoFocus/></div>
                <div className="p-1 border-b bg-gray-50 flex justify-between"><button onClick={()=>setVal(val.length===optionsArray.length?[]:optionsArray)} className="text-[10px] font-bold text-blue-600 px-2 py-1 hover:underline">{val.length===optionsArray.length?'Bỏ hết':'Chọn hết'}</button></div>
                <div className="overflow-y-auto flex-1 p-1">{fOpts.map(o=> {
                    const displayLabel = (typeof opts === 'object' && !Array.isArray(opts)) ? opts[o].label : o;
                    return (
                        <div key={o} onClick={()=>tog(o)} className={`flex items-center px-2 py-1 cursor-pointer rounded text-xs mb-0.5 ${val.includes(o)?'bg-blue-50 text-blue-700 font-bold':'text-gray-700 hover:bg-gray-100'}`}>
                            <input type="checkbox" checked={val.includes(o)} readOnly className="mr-2 h-3 w-3 pointer-events-none"/><span>{displayLabel}</span>
                        </div>
                    );
                })}</div>
            </div>}
        </div>
    );
};

const SearchInput = ({ val, setVal }) => (
    <div className="relative flex-1 min-w-[200px]">
        <input className="w-full pl-2 pr-8 border rounded py-1.5 text-xs outline-none focus:border-blue-500 transition-colors" placeholder="Tìm tên, SĐT, mã..." value={val} onChange={e=>setVal(e.target.value)}/>
        {val && <button onClick={()=>setVal('')} className="absolute right-2 top-1.5 text-gray-400 hover:text-red-500 font-bold">✕</button>}
    </div>
);

// --- MAIN COMPONENT ---
export const Customer360Content = ({ setAppTitle }) => {
    const defaultDates = dateUtils.getLast30Days();
    const [filters, setFilters] = useState({ date_from: defaultDates.from, date_to: defaultDates.to, debug: true });
    const { data: fullData, isLoading } = useApiData(API_ENDPOINT, filters, 300);
    
    // STATE BỘ LỌC (MULTI-SELECT)
    const [fltSeg, setFltSeg] = useState([]);   
    const [fltGrp, setFltGrp] = useState([]);       
    const [fltMgr, setFltMgr] = useState([]);       
    const [fltSeller, setFltSeller] = useState([]); 
    const [recency, setRecency] = useState('ALL'); // Giữ single cho recency logic
    const [search, setSearch] = useState('');            
    const [viewCusId, setViewCusId] = useState(null);

    useEffect(() => { setAppTitle('Chân dung Khách hàng 360'); }, [setAppTitle]);

    const customerList = fullData?.customers || [];
    const segmentsStats = fullData?.segments_stats || [];
    const acquisitionStats = fullData?.acquisition_stats || { new: 0, returning: 0 };

    // 1. EXTRACT OPTIONS
    const { grpOpts, mgrOpts, sellerOpts } = useMemo(() => {
        const g = new Set(), m = new Set(), s = new Set();
        customerList.forEach(c => {
            if(c.group) g.add(c.group);
            if(c.manager_name && c.manager_name !== 'Chưa gán') m.add(c.manager_name);
            if(c.last_salesman) s.add(c.last_salesman);
        });
        return { 
            grpOpts: Array.from(g).sort(), 
            mgrOpts: Array.from(m).sort(), 
            sellerOpts: Array.from(s).sort() 
        };
    }, [customerList]);

    // 2. FILTER LOGIC
    const filteredCustomers = useMemo(() => {
        if (!customerList) return [];
        return customerList.filter(c => {
            // Multi-select logic: Rỗng = Chọn tất cả
            if (fltSeg.length > 0 && !fltSeg.includes(c.segment_code)) return false;
            if (fltGrp.length > 0 && !fltGrp.includes(c.group || 'Chưa phân nhóm')) return false;
            if (fltMgr.length > 0 && !fltMgr.includes(c.manager_name)) return false;
            if (fltSeller.length > 0 && !fltSeller.includes(c.last_salesman)) return false;

            // Recency logic
            if (recency !== 'ALL') {
                const days = c.days_inactive || 0;
                if (recency === 'HOT' && days > 7) return false;        
                if (recency === 'WARM' && (days <= 7 || days > 30)) return false; 
                if (recency === 'COLD' && days <= 30) return false;     
            }

            // Search logic
            if (search) {
                const s = search.toLowerCase();
                return (c.name || '').toLowerCase().includes(s) || (c.phone || '').toLowerCase().includes(s) || (c.id || '').toLowerCase().includes(s);
            }
            return true;
        });
    }, [customerList, fltSeg, fltGrp, fltMgr, fltSeller, recency, search]);

    const handleExportExcel = async () => {
        if (filteredCustomers.length === 0) { alert("Không có dữ liệu!"); return; }
        const excelData = filteredCustomers.map((c, idx) => ({
            "STT": idx + 1, "Mã Khách": c.id, "Tên Khách Hàng": c.name, "SĐT": c.phone,
            "Người Phụ Trách": c.manager_name, "NV Bán Gần Nhất": c.last_salesman,
            "Nhóm": c.group, "Phân Khúc": c.segment_name, "Doanh Số": c.revenue,
            "Lợi Nhuận %": c.profit_margin + '%', "Công Nợ HT": c.current_debt,
            "Ngày Mua Cuối": c.last_buy_date,
        }));
        await exportToExcel([{ sheetName: "DS_Khach_Hang", data: excelData }], 'DS_Khach_Hang_360');
    };

    // Helper Reset
    const clearFilters = () => {
        setFltGrp([]); setFltMgr([]); setFltSeller([]); setFltSeg([]); setRecency('ALL'); setSearch('');
    };

    // Click Card to Toggle Filter
    const handleCardClick = (code) => {
        setFltSeg(prev => prev.includes(code) ? prev.filter(c=>c!==code) : [code]); // Toggle selection
    };

    // Charts Data
    const pieData = segmentsStats.filter(s => s.count > 0).map(s => ({ name: s.name, value: s.count, color: s.color }));
    const acqData = [{ name: 'Khách Mới', value: acquisitionStats.new, fill: '#8b5cf6' }, { name: 'Khách Cũ', value: acquisitionStats.returning, fill: '#3b82f6' }];

    if (isLoading && !fullData) return <div className="h-96 flex items-center justify-center text-blue-600">Đang phân tích dữ liệu...</div>;

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen font-inter">
            {/* 1. TOP FILTER BAR (Date) */}
            <div className="flex justify-between items-end">
                <div className="w-full md:w-3/4"><SalesAnalysisFilterBar initialFilters={filters} onApplyFilters={setFilters} isLoading={isLoading} /></div>
                <div className="hidden md:block mb-6 text-right"><div className="text-2xl font-bold text-blue-800">{customerList.length}</div><div className="text-xs text-gray-500 uppercase font-semibold">Khách hàng</div></div>
            </div>

            {/* 2. SEGMENT CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {segmentsStats.map((seg) => {
                    const config = SEGMENT_CONFIG[seg.code] || SEGMENT_CONFIG.REGULAR;
                    const isActive = fltSeg.includes(seg.code);
                    return (
                        <div key={seg.code} onClick={() => setFltSeg([seg.code])} className={`relative p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${isActive ? 'bg-white border-blue-500 ring-2 ring-blue-100' : 'bg-white border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-1"><span className="text-xl">{config.icon}</span><span className="text-lg font-bold" style={{color: config.color}}>{seg.count}</span></div>
                            <h4 className="text-xs font-bold text-gray-700 truncate" title={seg.name}>{seg.name}</h4>
                            {isActive && <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5"><Icon path="M4.5 12.75l6 6 9-13.5" className="w-3 h-3" /></div>}
                        </div>
                    );
                })}
            </div>

            {/* 3. CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <AnalysisCard title="Tỷ trọng Phân khúc">
                    <div className="h-48 w-full"><ResponsiveContainer><PieChart><Pie data={pieData} innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">{pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip/><Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize:'10px'}}/></PieChart></ResponsiveContainer></div>
                </AnalysisCard>
                <AnalysisCard title="Tăng trưởng (Mới vs Cũ)">
                    <div className="h-48 w-full"><ResponsiveContainer><BarChart data={acqData} layout="vertical" margin={{top:5,right:30,left:5,bottom:5}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" hide/><YAxis dataKey="name" type="category" width={80} tick={{fontSize:11}}/><Tooltip cursor={{fill:'transparent'}}/><Bar dataKey="value" barSize={20} radius={[0,4,4,0]}>{acqData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart></ResponsiveContainer></div>
                </AnalysisCard>
                <AnalysisCard title="Hành động nhanh">
                    <div className="space-y-2">
                        <div className="p-3 bg-red-50 rounded border border-red-100 flex justify-between items-center"><div><div className="text-xs font-bold text-red-700">KHÁCH RỜI BỎ</div><div className="text-[10px] text-red-500">&gt; 6 tháng chưa mua</div></div><Button size="xs" className="bg-white border-red-200 text-red-600" onClick={()=>{setFltSeg(['LOST']);setRecency('ALL');}}>Lọc</Button></div>
                        <div className="p-3 bg-blue-50 rounded border border-blue-100 flex justify-between items-center"><div><div className="text-xs font-bold text-blue-700">KHÁCH MỚI</div><div className="text-[10px] text-blue-500">Mua lần đầu</div></div><Button size="xs" className="bg-white border-blue-200 text-blue-600" onClick={()=>{setFltSeg(['NEW']);setRecency('HOT');}}>Lọc</Button></div>
                    </div>
                </AnalysisCard>
            </div>

            {/* 4. MAIN LIST & FILTERS */}
            <AnalysisCard>
                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-wrap gap-2 items-center">
                    <SearchInput val={search} setVal={setSearch} />
                    <MultiDrop label="Nhóm" opts={grpOpts} val={fltGrp} setVal={setFltGrp}/>
                    <MultiDrop label="Phụ trách" opts={mgrOpts} val={fltMgr} setVal={setFltMgr}/>
                    <MultiDrop label="Bán cuối" opts={sellerOpts} val={fltSeller} setVal={setFltSeller}/>
                    <MultiDrop label="Phân hạng" opts={SEGMENT_CONFIG} val={fltSeg} setVal={setFltSeg}/>
                    
                    <select className={`block w-32 py-1.5 px-2 border rounded text-xs focus:ring-blue-500 ${recency!=='ALL'?'border-blue-500 text-blue-700 font-bold bg-white':'border-gray-300 text-gray-600'}`} value={recency} onChange={(e)=>setRecency(e.target.value)}>
                        <option value="ALL">-- Thời gian --</option><option value="HOT">🔥 &le; 7 ngày</option><option value="WARM">⚠️ 7-30 ngày</option><option value="COLD">❄️ &gt; 30 ngày</option>
                    </select>

                    <div className="flex gap-2 ml-auto">
                        {(fltGrp.length>0 || fltMgr.length>0 || fltSeller.length>0 || fltSeg.length>0 || recency!=='ALL' || search) && (
                            <button onClick={clearFilters} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full border border-transparent hover:border-red-200" title="Reset bộ lọc">
                                <Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className="w-4 h-4"/>
                            </button>
                        )}
                        <Button variant="primary" size="xs" onClick={handleExportExcel} className="shadow-sm"><Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" className="w-4 h-4 mr-1"/>Excel</Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-gray-600 w-10">#</th>
                                <th className="px-4 py-3 text-left font-bold text-gray-600">Khách Hàng</th>
                                <th className="px-4 py-3 text-left font-bold text-gray-600">Phụ Trách / Bán Cuối</th>
                                <th className="px-4 py-3 text-center font-bold text-gray-600">Phân Hạng</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-600">Doanh Số / Nợ</th>
                                <th className="px-4 py-3 text-center font-bold text-gray-600">Mua Gần Nhất</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredCustomers.slice(0, 50).map((cust, idx) => (
                                <tr key={cust.id} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => setViewCusId(cust.id)}>
                                    <td className="px-4 py-3 text-center text-gray-500">{idx + 1}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-800">{cust.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">{cust.group || 'Chưa nhóm'}</span>
                                            <span className="text-xs text-gray-400">{cust.phone}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span><span className="font-semibold text-gray-700">{cust.manager_name}</span></div>
                                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300"></span><span className="text-blue-600">{cust.last_salesman || '-'}</span></div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center"><span className="px-2 py-1 rounded-full text-xs font-bold border" style={{backgroundColor: `${cust.segment_color}10`, color: cust.segment_color, borderColor: `${cust.segment_color}40`}}>{cust.segment_name}</span></td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="font-mono font-bold text-gray-700">{formatPrice(cust.revenue)}</div>
                                        {cust.current_debt > 0 && <div className="text-xs font-bold text-red-500 mt-1 bg-red-50 inline-block px-1 rounded">Nợ: {formatPrice(cust.current_debt)}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="text-gray-800">{new Date(cust.last_buy_date).toLocaleDateString('vi-VN')}</div>
                                        <div className={`text-xs font-bold mt-1 ${cust.profit_margin >= 10 ? 'text-green-600' : 'text-orange-500'}`}>Margin: {cust.profit_margin}%</div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCustomers.length === 0 && <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-400 italic">Không tìm thấy khách hàng nào.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </AnalysisCard>

            {viewCusId && <CustomerAnalysisModal customerIdentifier={viewCusId} onClose={() => setViewCusId(null)} />}
        </div>
    );
};