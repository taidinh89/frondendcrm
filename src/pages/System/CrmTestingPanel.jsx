// src/pages/System/CrmTestingPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    PlayCircle, ShieldAlert, Monitor, Type, CheckCircle, 
    RefreshCcw, Download, History, Calendar, Settings, 
    Trash2, ExternalLink, Clock, Activity, FileText, X,
    ShieldCheck, Zap, Terminal, Box
} from 'lucide-react';

const CrmTestingPanel = () => {
    const [activeTab, setActiveTab] = useState('run');
    const [isRunning, setIsRunning] = useState(false);
    const [currentRunId, setCurrentRunId] = useState(null);
    const [logs, setLogs] = useState([]);
    const [history, setHistory] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedRunLogs, setSelectedRunLogs] = useState('');
    
    // Test Config
    const [selectedPlaybook, setSelectedPlaybook] = useState('login_only.json');
    const [selectedVersion, setSelectedVersion] = useState('main');
    
    // Schedule Form
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [newSchedule, setNewSchedule] = useState({ task_type: 'crm_test', cron_expression: '0 0 * * *', payload: { playbook: 'login_only.json', version: 'main' }, is_active: 1 });

    const terminalRef = useRef(null);
    const pollInterval = useRef(null);

    const playbooks = [
        { name: 'Login Only', file: 'login_only.json', desc: 'Kiểm tra đăng nhập & 2FA bypass' },
        { name: 'Sync Ecount', file: 'sync_ecount.json', desc: 'Test luồng đồng bộ từ Ecount' },
        { name: 'Inventory Check', file: 'inventory_check.json', desc: 'Kiểm tra bảng tồn kho' },
        { name: 'KPI Dashboard', file: 'kpi_report_check.json', desc: 'Kiểm tra tải dữ liệu KPI' },
        { name: 'Customer Portal', file: 'customer_portal_check.json', desc: 'Kiểm tra vùng khách hàng' },
        { name: 'Invoice Check', file: 'invoice_dashboard_check.json', desc: 'Kiểm tra hóa đơn V2' },
    ];

    useEffect(() => {
        if (activeTab === 'run') {
            pollLogs();
        } else if (activeTab === 'history') {
            fetchHistory();
        } else if (activeTab === 'schedule') {
            fetchSchedules();
        }
        
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [activeTab]);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/crm-tester/history');
            setHistory(res.data);
        } catch (e) {
            console.error("Fetch History Error", e);
        }
    };

    const fetchSchedules = async () => {
        try {
            const res = await axios.get('/api/crm-tester/schedules');
            setSchedules(res.data);
        } catch (e) {
            console.error("Fetch Schedules Error", e);
        }
    };

    const pollLogs = async () => {
        try {
            const params = currentRunId ? { run_id: currentRunId } : {};
            const res = await axios.get('/api/crm-tester/logs', { params });
            if (res.data.logs) {
                const newLogs = res.data.logs.split('\n');
                setLogs(newLogs);
                
                if (terminalRef.current) {
                    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
                }

                const lastText = newLogs.slice(-5).join(' ').toLowerCase();
                if (lastText.includes('dong trinh duyet') || lastText.includes('playbook completed') || lastText.includes('playbook failed')) {
                    setIsRunning(false);
                    if (pollInterval.current) clearInterval(pollInterval.current);
                }
            }
        } catch (e) {
            console.error("Poller Error", e);
        }
    };

    const startPolling = (runId) => {
        setCurrentRunId(runId);
        if (pollInterval.current) clearInterval(pollInterval.current);
        pollInterval.current = setInterval(pollLogs, 1500);
    };

    const runTask = async () => {
        setIsRunning(true);
        setLogs([`> QA BOT INITIATED: [${selectedPlaybook}] on [${selectedVersion.toUpperCase()}] at ${new Date().toLocaleTimeString()}`]);
        try {
            const res = await axios.post('/api/crm-tester/run', { 
                playbook: selectedPlaybook,
                version: selectedVersion
            });
            startPolling(res.data.run_id);
        } catch (error) {
            setLogs(prev => [...prev, `❌ Connection Error: ${error}`]);
            setIsRunning(false);
        }
    };

    const viewLogDetail = async (runId) => {
        try {
            const res = await axios.get('/api/crm-tester/logs', { params: { run_id: runId } });
            setSelectedRunLogs(res.data.logs);
            setShowLogModal(true);
        } catch (e) {
            alert("Không thể tải log.");
        }
    };

    const saveSchedule = async () => {
        try {
            await axios.post('/api/crm-tester/schedules', newSchedule);
            setShowScheduleModal(false);
            fetchSchedules();
        } catch (e) {
            alert("Lỗi khi lưu lịch trình.");
        }
    };

    const deleteSchedule = async (id) => {
        if (!confirm("Xóa lịch trình test này?")) return;
        try {
            await axios.delete(`/api/crm-tester/schedules/${id}`);
            fetchSchedules();
        } catch (e) {
            alert("Lỗi khi xóa.");
        }
    };

    const formatLogLine = (text) => {
        if (!text || text.trim() === '') return null;
        let colorClass = 'text-[#8b949e]';
        
        if (text.includes('FAIL') || text.includes('ERROR') || text.includes('❌')) colorClass = 'text-[#ff7b72] font-bold';
        else if (text.includes('SUCCESS') || text.includes('✅') || text.includes('[OK]')) colorClass = 'text-[#2ea043] font-bold';
        else if (text.includes('STEP') || text.includes('Action:')) colorClass = 'text-[#79c0ff]';
        else if (text.startsWith('>')) colorClass = 'text-[#a5d6ff] font-bold';
        else if (text.includes('INFO -')) {
            const parts = text.split('INFO -');
            return <span>{parts[0]}<span className="text-[#3fb950]">INFO -</span>{parts[1]}</span>;
        }

        return <span className={colorClass}>{text}</span>;
    };

    return (
        <div className="p-6 bg-[#f8fafc] min-h-screen font-sans">
            {/* HEADER */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center">
                        <Box className="mr-3 text-indigo-600" size={32} />
                        CRM QA Intelligence
                    </h1>
                    <p className="text-slate-500 mt-1 flex items-center font-medium">
                        <Zap size={16} className="mr-2 text-amber-500" /> 
                        Hệ thống Kiểm thử E2E Tự động v2.5 (Headless Chrome)
                    </p>
                </div>
                
                <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200">
                    <button 
                        id="crm-tab-run"
                        onClick={() => setActiveTab('run')}
                        className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'run' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Activity size={18} className="mr-2" /> Trình chạy
                    </button>
                    <button 
                        id="crm-tab-history"
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Database size={18} className="mr-2" /> Nhật ký
                    </button>
                    <button 
                        id="crm-tab-schedule"
                        onClick={() => setActiveTab('schedule')}
                        className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'schedule' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Calendar size={18} className="mr-2" /> Lập lịch
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: RUN */}
            {activeTab === 'run' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100">
                            <h2 className="font-black text-slate-800 mb-6 flex items-center uppercase tracking-wider text-sm">
                                <Settings size={18} className="mr-2 text-indigo-500" /> Cấu hình Bản Test
                            </h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Môi trường</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['main', 'dev', 'test'].map(v => (
                                            <button 
                                                key={v}
                                                onClick={() => setSelectedVersion(v)}
                                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${selectedVersion === v ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                                            >
                                                {v.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Kịch bản (Playbook)</label>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {playbooks.map((p) => (
                                            <button 
                                                key={p.file}
                                                onClick={() => setSelectedPlaybook(p.file)}
                                                className={`w-full p-4 rounded-2xl text-left border transition-all duration-300 ${selectedPlaybook === p.file ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-white'}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="font-bold text-sm tracking-tight">{p.name}</div>
                                                    {selectedPlaybook === p.file && <CheckCircle size={14} className="text-indigo-200" />}
                                                </div>
                                                <div className={`text-[10px] mt-1.5 font-medium leading-relaxed ${selectedPlaybook === p.file ? 'text-indigo-100' : 'text-slate-400'}`}>{p.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={runTask} 
                                disabled={isRunning}
                                className="w-full mt-8 bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-3 active:scale-[0.98]"
                            >
                                {isRunning ? <RefreshCcw size={20} className="animate-spin" /> : <Play size={22} fill="currentColor" />}
                                <span className="tracking-wide">KÍCH HOẠT KIỂM THỬ</span>
                            </button>
                        </div>

                        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                            <h4 className="text-amber-700 font-bold text-xs flex items-center mb-2">
                                <ShieldAlert size={14} className="mr-2" /> Lưu ý Quan trọng
                            </h4>
                            <p className="text-[11px] text-amber-600 leading-relaxed font-medium">
                                Bot sẽ tự động thực thi các lệnh giả lập chuột/phím trong môi trường Headless. Kết quả sẽ được đẩy về Telegram nếu có lỗi nghiêm trọng.
                            </p>
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        <div className="bg-[#0d1117] rounded-[2rem] shadow-2xl border border-[#30363d] overflow-hidden flex flex-col h-[750px]">
                            <div className="bg-[#161b22]/80 backdrop-blur-md px-8 py-5 flex justify-between items-center border-b border-[#30363d]">
                                <div className="flex space-x-2.5">
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56]"></div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]"></div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f]"></div>
                                </div>
                                <div className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                    <Terminal size={14} className="mr-2 text-indigo-500" /> 
                                    {isRunning ? `EXECUTING PLAYBOOK: ${selectedPlaybook}` : 'QA ENGINE STANDBY'}
                                </div>
                                <button onClick={() => setLogs([])} className="text-xs font-bold text-amber-500/70 hover:text-amber-400 transition-colors uppercase tracking-widest">Clear</button>
                            </div>

                            <div className="p-8 flex-1 overflow-y-auto font-mono text-sm leading-8 custom-scrollbar-dark" ref={terminalRef}>
                                {logs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-[#484f58]">
                                        <div className="p-6 bg-[#161b22] rounded-full mb-6 opacity-40">
                                            <Monitor size={48} />
                                        </div>
                                        <p className="italic font-bold tracking-[0.3em] text-[10px] uppercase">Waiting for Test Initiation...</p>
                                    </div>
                                ) : (
                                    logs.map((line, idx) => (
                                        <div key={idx} className="whitespace-pre-wrap">{formatLogLine(line)}</div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: HISTORY */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[600px]">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <h2 className="font-black text-slate-800 text-xl tracking-tight">Nhật ký Kiểm thử (E2E)</h2>
                        <button onClick={fetchHistory} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm"><RefreshCcw size={20} /></button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">ID</th>
                                    <th className="px-8 py-5">Kịch bản & Môi trường</th>
                                    <th className="px-8 py-5">Kết quả</th>
                                    <th className="px-8 py-5">Thời gian thực thi</th>
                                    <th className="px-8 py-5 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {history.map((run) => (
                                    <tr key={run.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6 font-mono text-slate-400 font-bold">#{run.id}</td>
                                        <td className="px-8 py-6">
                                            <span className="font-black text-slate-700 block">{run.payload?.playbook?.replace('.json', '')}</span>
                                            <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase">{run.payload?.version || 'main'}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                                run.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                                                run.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                                {run.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-slate-500 font-bold">
                                            <div className="flex items-center"><Clock size={14} className="mr-2 opacity-40"/> {new Date(run.started_at).toLocaleString()}</div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button 
                                                onClick={() => viewLogDetail(run.id)}
                                                className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-black text-xs uppercase tracking-wider bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                                            >
                                                <FileText size={16} className="mr-2" /> Log Chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr><td colSpan="5" className="p-20 text-center text-slate-300 italic font-medium uppercase tracking-[0.2em] text-xs">Chưa có bản ghi kiểm thử nào</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SCHEDULE */}
            {activeTab === 'schedule' && (
                <div className="space-y-8">
                    <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Lập lịch Kiểm thử Tự động</h2>
                            <p className="text-slate-500 font-medium text-sm mt-1">Cấu hình QA Bot tự động săn lỗi định kỳ hàng đêm.</p>
                        </div>
                        <button 
                            onClick={() => {
                                setNewSchedule({ task_type: 'crm_test', cron_expression: '0 0 * * *', payload: { playbook: 'login_only.json', version: 'main' }, is_active: 1 });
                                setShowScheduleModal(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center transition-all transform hover:scale-[1.02]"
                        >
                            <Calendar size={20} className="mr-3" /> Đăng ký Test định kỳ
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {schedules.map((s) => (
                            <div key={s.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                            <ShieldCheck size={28} />
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${s.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                            {s.is_active ? 'ACTIVE' : 'DISABLED'}
                                        </div>
                                    </div>
                                    <h3 className="font-black text-slate-800 text-lg">{s.payload?.playbook?.replace('.json', '')}</h3>
                                    <div className="mt-6 space-y-3">
                                        <div className="flex items-center text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 font-bold font-mono group-hover:bg-white transition-colors">
                                            <Clock size={16} className="mr-3 text-indigo-500" /> 
                                            CRON: {s.cron_expression}
                                        </div>
                                        <div className="flex items-center space-x-2 px-1">
                                            <div className="text-[10px] font-black text-slate-300 uppercase">Last Result:</div>
                                            <div className="text-[11px] font-bold text-slate-500">
                                                {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never Executed'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-10 flex gap-3">
                                    <button 
                                        onClick={() => {
                                            setNewSchedule(s);
                                            setShowScheduleModal(true);
                                        }}
                                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-3.5 rounded-2xl text-xs font-black transition-all uppercase tracking-widest"
                                    >Cấu hình</button>
                                    <button 
                                        onClick={() => deleteSchedule(s.id)}
                                        className="p-3.5 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-2xl transition-all shadow-sm"
                                    ><Trash2 size={20} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL: LOG DETAIL */}
            {showLogModal && (
                <div className="fixed inset-0 z-[999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#0d1117] w-full max-w-6xl rounded-[2.5rem] shadow-3xl border border-[#30363d] overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
                        <div className="bg-[#161b22]/90 backdrop-blur-lg px-8 py-6 flex justify-between items-center border-b border-[#30363d]">
                            <div>
                                <h3 className="text-white font-black text-lg flex items-center tracking-tight">
                                    <FileText size={22} className="mr-3 text-indigo-400" /> 
                                    DEBUG CONSOLE
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 ml-9">Full Execution Traceability</p>
                            </div>
                            <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white p-3 bg-[#21262d] rounded-2xl transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-10 flex-1 overflow-y-auto font-mono text-sm leading-8 whitespace-pre custom-scrollbar-dark">
                            {selectedRunLogs.split('\n').map((line, idx) => (
                                <div key={idx} className="py-0.5">{formatLogLine(line)}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: SCHEDULE FORM */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-indigo-600 px-10 py-8 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-black flex items-center text-xl tracking-tight">
                                    <Calendar size={24} className="mr-3" /> QA Scheduler Setup
                                </h3>
                                <p className="text-indigo-200 text-[11px] font-bold uppercase tracking-widest mt-1 ml-9">Đăng ký kiểm thử tự động</p>
                            </div>
                            <button onClick={() => setShowScheduleModal(false)} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl text-white transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Kịch bản Test</label>
                                    <select 
                                        value={newSchedule.payload?.playbook}
                                        onChange={(e) => setNewSchedule({...newSchedule, payload: { ...newSchedule.payload, playbook: e.target.value }})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-slate-700 transition-all cursor-pointer"
                                    >
                                        {playbooks.map(p => <option key={p.file} value={p.file}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Môi trường</label>
                                    <select 
                                        value={newSchedule.payload?.version}
                                        onChange={(e) => setNewSchedule({...newSchedule, payload: { ...newSchedule.payload, version: e.target.value }})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-slate-700 transition-all cursor-pointer"
                                    >
                                        <option value="main">MAIN (Production)</option>
                                        <option value="dev">DEV (Staging)</option>
                                        <option value="test">TEST (QA)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Biểu thức CRON (Server Time)</label>
                                <input 
                                    type="text"
                                    value={newSchedule.cron_expression}
                                    placeholder="VD: 0 0 * * * (0 giờ đêm hàng ngày)"
                                    onChange={(e) => setNewSchedule({...newSchedule, cron_expression: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none font-mono font-black text-slate-800 transition-all"
                                />
                                <p className="text-[10px] text-slate-400 italic px-1">Phút | Giờ | Ngày | Tháng | Thứ</p>
                            </div>

                            <div onClick={() => setNewSchedule({...newSchedule, is_active: newSchedule.is_active ? 0 : 1})} className={`flex items-center space-x-4 p-5 rounded-3xl border transition-all cursor-pointer ${newSchedule.is_active ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                                <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${newSchedule.is_active ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${newSchedule.is_active ? 'left-7' : 'left-1'}`}></div>
                                </div>
                                <div className="flex-1">
                                    <div className={`font-black text-sm uppercase tracking-wider ${newSchedule.is_active ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {newSchedule.is_active ? 'Lập lịch đã kích hoạt' : 'Lập lịch tạm dừng'}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-tight">Kịch bản này sẽ tự động chạy theo lịch Chrome Headless.</div>
                                </div>
                            </div>

                            <button 
                                onClick={saveSchedule}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-[2rem] font-black shadow-2xl shadow-indigo-100 transition-all uppercase tracking-[0.2em] transform active:scale-95"
                            >Lưu cấu hình QA</button>
                        </div>
                    </div>
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                
                .custom-scrollbar-dark::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: #0d1117; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #30363d; border-radius: 10px; border: 2px solid #0d1117; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: #484f58; }
            `}} />
        </div>
    );
};

export default CrmTestingPanel;
