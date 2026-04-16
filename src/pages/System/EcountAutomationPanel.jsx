// src/pages/System/EcountAutomationPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    PlayCircle, ShieldAlert, Monitor, Type, CheckCircle, 
    RefreshCcw, Download, History, Calendar, Settings, 
    Trash2, ExternalLink, Clock, Activity, FileText, X, Cpu, Zap,
    ShoppingCart, ShoppingBag, ArrowUp, ArrowDown, Users, CreditCard, AlertTriangle
} from 'lucide-react';

const EcountAutomationPanel = () => {
    const [activeTab, setActiveTab] = useState('run');
    const [isRunning, setIsRunning] = useState(false);
    const [isStale, setIsStale] = useState(false);
    const [currentRunId, setCurrentRunId] = useState(null);
    const [runProgress, setRunProgress] = useState(0);
    const [errorDetails, setErrorDetails] = useState('');
    const [runPid, setRunPid] = useState(null);
    const [logs, setLogs] = useState([]);
    const [history, setHistory] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [selectedRunLogs, setSelectedRunLogs] = useState('');
    const [stats, setStats] = useState({
        sales_today: 0,
        purchases_today: 0,
        total_records: 0,
        last_sync_at: null,
        session_status: 'checking',
        health_score: 100
    });
    const [logFilter, setLogFilter] = useState('all'); // all | info | warn | error
    const [previewSnapshot, setPreviewSnapshot] = useState(null);
    
    // [V2 ELITE] State Management
    const [v2Status, setV2Status] = useState('RUNNING'); // RUNNING | PAUSE
    const [v2Info, setV2Info] = useState({ port: null, heartbeat: null, debug: false });
    const [showInjectInput, setShowInjectInput] = useState(false);
    const [jsInjectCode, setJsInjectCode] = useState('');
    
    // Date Range for custom tasks
    const [dateRangeLabel, setDateRangeLabel] = useState('today');
    
    // Schedule Form
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [newSchedule, setNewSchedule] = useState({ task_type: 'ecount_sync', cron_expression: '0 8 * * *', payload: { report: 'all' } });
    const [cronMode, setCronMode] = useState('preset'); // preset | custom

    const terminalRef = useRef(null);
    const pollTimeout = useRef(null); // Thay đổi từ Interval sang Timeout
    const errorCountRef = useRef(0); // Đếm số lần lỗi mạng liên tiếp
    const lastLogsRef = useRef(''); // Dùng ref để so sánh log cũ tránh re-render giật giật
    const isMounted = useRef(true); // Tracking để tránh rò rỉ bộ nhớ
    const currentRunIdRef = useRef(null); // [V35 ELITE] Bắt buộc dùng Ref để tránh Stale Closure trong async loop

    useEffect(() => {
        isMounted.current = true;
        console.info('DASHBOARD_MOUNTED');
        fetchStats();
        const statsInterval = setInterval(fetchStats, 30000); // 30s cập nhật stats

        // Auto-resume polling nếu có task đang chạy
        const checkActiveTask = async () => {
            try {
                const res = await axios.get('/api/v1/ecount-manager/status');
                if (res.data && (res.data.status === 'running' || res.data.status === 'processing')) {
                    setIsRunning(true);
                    startPolling(res.data.run_id);
                }
            } catch (e) {
                console.error("Auto-polling check failed", e);
            }
        };

        if (activeTab === 'run') {
            checkActiveTask();
        } else if (activeTab === 'history') {
            fetchHistory();
        } else if (activeTab === 'schedule') {
            fetchSchedules();
        }
        
        return () => {
            isMounted.current = false;
            if (pollTimeout.current) clearTimeout(pollTimeout.current);
            clearInterval(statsInterval);
        };
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/v1/ecount-manager/stats');
            setStats(res.data);
        } catch (e) {
            console.error("Fetch Stats Error", e);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/v1/ecount-manager/history');
            if (Array.isArray(res.data)) {
                setHistory(res.data);
            } else {
                console.warn("History API did not return an array", res.data);
                setHistory([]);
            }
        } catch (e) {
            console.error("Fetch History Error", e);
            setHistory([]);
        }
    };

    const fetchSchedules = async () => {
        try {
            const res = await axios.get('/api/v1/ecount-manager/schedules');
            if (Array.isArray(res.data)) {
                setSchedules(res.data);
            } else {
                setSchedules([]);
            }
        } catch (e) {
            console.error("Fetch Schedules Error", e);
            setSchedules([]);
        }
    };

    const pollLogs = async (forceId = null) => {
        if (!isMounted.current) return;

        const isDebug = window.location.search.includes('debug=1');
        const targetId = forceId || currentRunIdRef.current;
        let isFinished = false;

        try {
            // [V35 ELITE] GỌI API SIÊU NHẸ (Chỉ DB, không đọc file vật lý)
            const params = targetId ? { run_id: targetId, _t: Date.now() } : { _t: Date.now() };
            
            if (isDebug) {
                console.log(`[DEBUG UI] 🚀 Đang gọi API lấy trạng thái cho ID #${targetId || 'latest'}...`);
            }

            const res = await axios.get('/api/v1/ecount-manager/status', { 
                params,
                timeout: 10000 
            });
            
            if (isDebug) {
                console.log('[DEBUG UI] 📥 Status Response:', res?.data);
            }

            if (!res || !res.data) {
                throw new Error('Empty response from server');
            }

            const { status, progress, pid_alive, run_id, last_log, control_port, heartbeat_at, debug_mode } = res.data;
            if (isDebug) console.log(`[DEBUG UI] 🔍 Current Status: "${status}" | Progress: ${progress}%`);

            // [V2 ELITE] Sync V2 Info
            setV2Info({ 
                port: control_port, 
                heartbeat: heartbeat_at, 
                debug: debug_mode 
            });

            // [V39 ELITE] Khôi phục Heartbeat Log (Bug #1 Fix)
            if (last_log && last_log !== '💓' && last_log !== '') {
                setLogs(prev => {
                    const lastLine = prev.length > 0 ? prev[prev.length - 1] : '';
                    if (lastLine === last_log) return prev;
                    return [...prev, last_log];
                });
            }

            // Đồng bộ state run_id nếu chưa có (Trường hợp auto-resume poll)
            if (run_id && !currentRunIdRef.current) {
                currentRunIdRef.current = run_id;
                setCurrentRunId(run_id);
            }
            
            setRunProgress(progress || 0);
            setRunPid(pid_alive ? (res.data.pid || 'Active') : null);
            setIsStale(res.data.is_stale || false);

            if (status === 'success' || status === 'failed') {
                console.log(`[DEBUG UI] 🎯 TRẠNG THÁI HOÀN TẤT PHÁT HIỆN: ${status.toUpperCase()} cho ID #${run_id || targetId}`);
                isFinished = true;
                setIsRunning(false);
                setRunProgress(100);
                
                // [V35 ELITE] Bơm thẳng log hoàn tất vào UI trước khi chờ API Logs
                const finalMsg = status === 'success' ? '✨ [SYSTEM]: Tác vụ đã hoàn tất thành công 100%.' : '⚠️ [SYSTEM]: Tác vụ kết thúc với lỗi.';
                setLogs(prev => [...prev, `[STATUS_CHANGE] -> ${status.toUpperCase()}`, finalMsg]);

                // KHI XONG HOẶC LỖI -> MỚI FETCH LOG CHI TIẾT 1 LẦN DUY NHẤT
                try {
                    if (isDebug) console.log(`[DEBUG UI] 📝 Đang lấy bản lưu log cuối cùng...`);
                    const logRes = await axios.get('/api/v1/ecount-manager/logs', { 
                        params: { run_id: run_id || targetId, _t: Date.now() },
                        timeout: 30000 
                    });
                    
                    if (logRes.data && logRes.data.logs) {
                        const rawLogs = typeof logRes.data.logs === 'string' ? logRes.data.logs : (Array.isArray(logRes.data.logs) ? logRes.data.logs.join('\n') : '');
                        const logLines = rawLogs.split('\n');
                        setLogs(logLines);
                        // Cuộn xuống
                        setTimeout(() => {
                            if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
                        }, 100);
                    }
                } catch (logErr) {
                    console.error("Final log fetch failed", logErr);
                }
                
                fetchHistory();
                fetchStats();
                return; 
            }

            errorCountRef.current = 0; 

        } catch (e) {
            errorCountRef.current += 1;
            const isDebug = window.location.search.includes('debug=1');
            if (isDebug) console.error(`[DEBUG UI] Lỗi kết nối lần ${errorCountRef.current}:`, e.message);

            // [V40 ELITE] CHỊU LỖI 10 LẦN LIÊN TIẾP (Khoảng 50s)
            if (errorCountRef.current >= 10) {
                setLogs(prev => [...prev, '⚠️ [HỆ THỐNG]: Mất kết nối tới Server quá lâu. Giao diện tạm dừng theo dõi, tiến trình ngầm có thể vẫn đang chạy.']);
                setIsRunning(false); 
                return; 
            }
            
            if (errorCountRef.current === 3) {
                 setLogs(prev => [...prev, '⏳ [MẠNG CHẬM]: Đang đợi server phản hồi...']);
            }
        }

        // Tự động poll tiếp sau 5s nếu chưa xong
        if (isMounted.current && !isFinished) {
            pollTimeout.current = setTimeout(() => pollLogs(), 5000); 
        }
    };

    const startPolling = (runId) => {
        const isDebug = window.location.search.includes('debug=1');
        if (isDebug) console.log(`[DEBUG UI] 🏁 Bắt đầu Polling cho ID: ${runId}`);
        currentRunIdRef.current = runId;
        setCurrentRunId(runId);
        errorCountRef.current = 0;
        if (pollTimeout.current) clearTimeout(pollTimeout.current);
        pollLogs(runId); // Truyền trực tiếp ID để tránh React delay
    };

    const viewLogDetail = async (runId) => {
        try {
            const res = await axios.get(`/api/v1/ecount-manager/runs/${runId}`);
            setLogs(res.data.logs || []);
            currentRunIdRef.current = runId;
            setCurrentRunId(runId);
            setRunProgress(100);
            setActiveTab('run');
        } catch (error) {
            console.error("View log error:", error);
        }
    };

    const runTask = async (type, params = {}) => {
        setIsRunning(true);
        setRunProgress(0);
        setErrorDetails('');
        setRunPid(null);
        const displayType = type === 'all' ? 'FULL BATCH SYNC' : type.toUpperCase();
        setLogs([`> SYSTEM COMMAND: initiate [${displayType}] at ${new Date().toLocaleTimeString()}`]);
        try {
            const payload = { 
                task_type: 'ecount_sync',
                payload: {
                    report: type,
                    ...params
                }
            };
            const res = await axios.post('/api/v1/ecount-manager/run-task', payload);
            startPolling(res.data.run_id);
            // Refresh stats sau 5s và khi xong
            setTimeout(fetchStats, 5000);
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || "Lỗi kết nối bộ não!";
            const isCooldown = error.response?.status === 422 && errorMsg.includes('COOLDOWN');
            
            setLogs(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return [
                    ...safePrev, 
                    isCooldown ? `⏳ [COOLDOWN ACTIVE]` : `⚠️ [SYSTEM_ERROR]`,
                    `> ${errorMsg}`
                ];
            });
            setIsRunning(false);
        }
    };

    const forceTask = async () => {
        const targetId = currentRunIdRef.current;
        if (!targetId) return;
        if (!window.confirm("Sếp có chắc chắn muốn 'Hủy diệt' tiến trình này không? Giao diện sẽ được reset.")) return;
        
        try {
            const res = await axios.post(`/api/v1/ecount-manager/runs/${targetId}/kill`);
            if (res.data.status === 'success') {
                setLogs(prev => [...prev, `💀 [FORCE_KILL]: ${res.data.message}`]);
                setIsRunning(false);
                setIsStale(false);
            }
        } catch (error) {
            console.error("Force kill error:", error);
            alert("Không thể dừng tiến trình. Có thể nó đã chết trước đó.");
        }
    };

    const sendV2Command = async (cmd, jsCode = null) => {
        const targetId = currentRunIdRef.current;
        if (!targetId) return;

        try {
            const res = await axios.post(`/api/v1/ecount-manager/runs/${targetId}/send-command`, {
                cmd: cmd,
                js_code: jsCode
            });
            
            if (res.data.status === 'ok') {
                if (cmd === 'PAUSE') setV2Status('PAUSE');
                if (cmd === 'RESUME') setV2Status('RUNNING');
                
                setLogs(prev => [...prev, `🚀 [CONTROL_SENT]: ${cmd} signal transmitted successfully.`]);
                if (jsCode) {
                    setJsInjectCode('');
                    setShowInjectInput(false);
                }
            }
        } catch (error) {
            const msg = error.response?.data?.message || "Lỗi giao tiếp với Robot (Flask Connection Refused)";
            setLogs(prev => [...prev, `❌ [CONTROL_FAIL]: ${msg}`]);
        }
    };

    const cleanupTasks = async () => {
        try {
            setLogs(prev => [...prev, `🧹 ACTION: Master Cleanup started...`]);
            const excludeParam = currentRunId ? `?exclude_id=${currentRunId}` : '';
            const res = await axios.get(`/api/v1/ecount-manager/cleanup${excludeParam}`);
            const msg = res.data?.data?.message || res.data?.message || 'Done';
            setLogs(prev => [...prev, `[CLEANUP_SUCCESS] ${msg}`]);
            fetchHistory();
        } catch (e) {
            setLogs(prev => [...prev, `❌ CLEANUP FAILED:`, `> ${e.response?.data?.message || e.message}`]);
        }
    };

    const saveSchedule = async () => {
        try {
            await axios.post('/api/v1/ecount-manager/schedules', newSchedule);
            setShowScheduleModal(false);
            fetchSchedules();
        } catch (e) {
            alert("Lỗi khi lưu lịch trình.");
        }
    };

    const deleteSchedule = async (id) => {
        if (!confirm("Xóa lịch trình này?")) return;
        try {
            await axios.delete(`/api/v1/ecount-manager/schedules/${id}`);
            fetchSchedules();
        } catch (e) {
            alert("Lỗi khi xóa.");
        }
    };

    const formatLogLine = (text) => {
        if (!text || text.trim() === '') return null;

        // Lọc log theo level
        if (logFilter !== 'all') {
            const isError = text.includes('ERROR') || text.includes('❌') || text.includes('net::ERR');
            const isWarn = text.includes('WARN') || text.includes('⚠️');
            const isInfo = !isError && !isWarn;
            
            if (logFilter === 'error' && !isError) return null;
            if (logFilter === 'warn' && !isWarn) return null;
            if (logFilter === 'info' && !isInfo) return null;
        }

        // [V16 ELITE] Tường minh Snapshot lỗi Automation
        if (text.includes('📸 [ERROR_SNAPSHOT]:') || text.includes('📸 Snapshot:')) {
            const filename = text.split('📸')[1].split(':')[1].trim();
            const imageUrl = `/api/v1/ecount-manager/snapshots/${filename}`;
            
            // --- BẮT ĐẦU THÊM MỚI TỪ ĐÂY ---
            // Chỉ hiển thị UI, không set state ở đây để tránh Render Loop. 
            // User click trực tiếp vào ảnh để mở Preview (Logic onClick đã có sẵn ở dưới)
            // --- KẾT THÚC THÊM MỚI ---

            return (
                <div className="my-4 p-4 bg-red-900/20 border-l-4 border-red-500 rounded-r-xl">
                    <p className="text-red-400 font-bold mb-2 flex items-center text-xs">
                        <ShieldAlert size={14} className="mr-2" /> 
                        HỆ THỐNG PHÁT HIỆN BẤT THƯỜNG & ĐÃ CHỤP ẢNH:
                    </p>
                    <div className="relative group overflow-hidden rounded-lg border border-red-500/30 max-w-xl">
                        <img 
                            src={imageUrl} 
                            alt="Ecount Error Snapshot" 
                            className="w-full transition-transform duration-500 group-hover:scale-110 cursor-zoom-in"
                            onClick={() => setPreviewSnapshot(imageUrl)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Zap className="text-white" size={24} />
                        </div>
                    </div>
                </div>
            );
        }

        // [V16 ELITE] Tường minh Auth thành công
        if (text.includes('✅ [AUTH_SUCCESS]') || text.includes('🔑 [SESSION_ALIVE]')) {
            return (
                <div className="my-2 p-3 bg-emerald-500/10 border-l-4 border-emerald-500 rounded-r-lg flex items-center">
                    <CheckCircle size={18} className="text-emerald-500 mr-3" />
                    <span className="text-emerald-400 font-bold text-xs">{text}</span>
                </div>
            );
        }

        // [V31 PRO] Tường minh Về đích rõ ràng
        if (text.includes('🏁 [SYNC_FINISH]') || text.includes('🏁 [STEP')) {
            const isStep = text.includes('[STEP');
            return (
                <div className={`my-4 p-4 ${isStep ? 'bg-blue-500/10 border-blue-500/30' : 'bg-indigo-500/10 border-indigo-500/30'} border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center`}>
                    <Zap size={32} className={`${isStep ? 'text-blue-500' : 'text-indigo-500'} mb-2 animate-pulse`} />
                    <span className={`${isStep ? 'text-blue-400' : 'text-indigo-400'} font-black text-sm uppercase tracking-widest`}>{text}</span>
                    <div className={`mt-2 text-[10px] ${isStep ? 'text-blue-300/50' : 'text-indigo-300/50'} font-mono uppercase tracking-tighter`}>
                        {isStep ? 'REAL-TIME PROGRESS SENSING ACTIVATED' : 'DATA INTEGRITY VERIFIED - CLOUD SYNCED'}
                    </div>
                </div>
            );
        }

        // [V31 PRO] Highlight các bước nhỏ
        if (text.includes('[STEP')) {
            return (
                <div className="my-1 py-1 px-3 bg-blue-500/5 border-l-2 border-blue-400 text-blue-300 italic text-[11px] flex items-center">
                    <Activity size={12} className="mr-2 opacity-50" />
                    {text}
                </div>
            )
        }

        let colorClass = 'text-[#8b949e]';
        
        if (text.includes('ERROR') || text.includes('❌') || text.includes('fail')) colorClass = 'text-[#ff7b72]';
        else if (text.includes('WARN') || text.includes('⚠️')) colorClass = 'text-[#d2a8ff]';
        else if (text.includes('✅') || text.includes('Success') || text.includes('DONE')) colorClass = 'text-[#56d364] font-bold';
        else if (text.includes('🚗 Navigating')) colorClass = 'text-cyan-400 italic';
        else if (text.startsWith('>')) colorClass = 'text-[#a5d6ff] font-bold';
        else if (text.includes('━━━━━━━━━')) colorClass = 'text-indigo-400 font-black';

        return <span className={`${colorClass} text-[12px] leading-relaxed`}>{text}</span>;
    };

    return (
        <div className="p-6 bg-[#f8fafc] min-h-screen font-sans">
            {/* V26 ELITE - TOP DASHBOARD KPI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center group hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <Clock className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đồng Bộ Cuối</p>
                        <h3 className="text-sm font-bold text-slate-800">{stats.last_sync_at ? new Date(stats.last_sync_at).toLocaleTimeString() : 'Chưa có'}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center group hover:shadow-md transition-all">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 ${
                        stats.session_status === 'alive' ? 'bg-emerald-50' : 
                        stats.session_status === 'warning' ? 'bg-amber-50' : 'bg-red-50'
                    }`}>
                        <Users className={
                            stats.session_status === 'alive' ? 'text-emerald-600' : 
                            stats.session_status === 'warning' ? 'text-amber-600' : 'text-red-600'
                        } size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ecount Session</p>
                        <h3 className={`text-xs font-black uppercase tracking-tighter ${
                            stats.session_status === 'alive' ? 'text-emerald-600' : 
                            stats.session_status === 'warning' ? 'text-amber-600' : 'text-red-600'
                        }`}>
                            {stats.session_status}
                        </h3>
                    </div>
                    <div className="ml-auto">
                        <div className={`w-2 h-2 rounded-full ${
                             stats.session_status === 'alive' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                        }`}></div>
                    </div>
                </div>
            </div>

            {/* HEADER */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
                        Ecount Control <span className="ml-2 px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg shadow-lg shadow-indigo-100">V26 ELITE</span>
                    </h1>
                    <p className="text-[#64748b] mt-1 flex items-center text-sm font-medium">
                        <Activity size={14} className="mr-2 text-indigo-500" /> 
                        Operational Intelligence & Automation Engine
                    </p>
                </div>
                
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                    <button 
                        id="ecount-tab-run"
                        onClick={() => setActiveTab('run')}
                        className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'run' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Cpu size={18} className="mr-2" /> Vận hành
                    </button>
                    <button 
                        id="ecount-tab-history"
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <History size={18} className="mr-2" /> Lịch sử
                    </button>
                    <button 
                        id="ecount-tab-schedule"
                        onClick={() => setActiveTab('schedule')}
                        className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'schedule' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Calendar size={18} className="mr-2" /> Lập lịch
                    </button>

                    <div className="ml-4 pl-4 border-l border-slate-200 flex items-center">
                        <div id="system-status-indicator" className={`flex items-center px-4 py-2 rounded-xl font-black text-[10px] tracking-tighter uppercase transition-all duration-500 ${isRunning ? 'bg-amber-500/10 text-amber-600 animate-pulse border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${isRunning ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                            {isRunning ? 'SYSTEM_BUSY' : 'SYSTEM_READY'}
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB CONTENT: RUN */}
            {activeTab === 'run' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        {/* [V31 PRO] CẢNH BÁO TREO HỆ THỐNG */}
                        {isStale && isRunning && (
                            <div className="p-4 bg-orange-500/20 border border-orange-500/50 rounded-2xl flex items-center animate-pulse mb-6">
                                <Clock size={20} className="text-orange-400 mr-3 shrink-0" />
                                <div>
                                    <p className="text-orange-400 font-bold text-[10px] uppercase tracking-wider">HỆ THỐNG PHẢN HỒI CHẬM</p>
                                    <p className="text-gray-600 text-[10px] leading-tight mt-1">Phát hiện tiến trình Python không có log mới trong 3 phút. Bot có thể đang đợi Ecount hoặc bị treo.</p>
                                </div>
                            </div>
                        )}
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-bold text-gray-800 flex items-center">
                                    <Settings size={20} className="mr-2 text-blue-500" /> Tác vụ nhanh
                                </h2>
                                <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                            </div>
                            
                            <div className="space-y-3">
                                <button 
                                    id="ecount-btn-download-vouchers"
                                    onClick={() => runTask('vouchers', { date_range: dateRangeLabel })} 
                                    disabled={isRunning}
                                    className="w-full flex items-center justify-center p-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 transition-all duration-300 disabled:opacity-50 active:scale-[0.98] mb-4"
                                >
                                    <FileText size={20} className="mr-2" /> <span>Tải Phiếu Kế Toán</span>
                                </button>

                                <button 
                                    id="ecount-btn-keepalive"
                                    onClick={() => runTask('keep_alive')} 
                                    disabled={isRunning}
                                    className="w-full flex items-center justify-between p-4 bg-white/60 backdrop-blur-md border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-bold rounded-2xl shadow-sm transition-all duration-300 disabled:opacity-50 group"
                                >
                                    <div className="flex items-center">
                                        <div className="p-2 bg-purple-100 rounded-lg mr-3 group-hover:bg-purple-200 transition-colors">
                                            <RefreshCcw size={18} className="text-purple-600 group-hover:rotate-180 transition-transform duration-700" />
                                        </div>
                                        <span>Giữ Session</span>
                                    </div>
                                    <ExternalLink size={16} className="text-slate-300" />
                                </button>

                                <button 
                                    id="ecount-btn-syncall"
                                    onClick={() => runTask('all')} 
                                    disabled={isRunning}
                                    className="w-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all duration-300 disabled:opacity-50 active:scale-[0.98]"
                                >
                                    <Zap size={20} className="mr-2" /> <span>Đồng bộ Tất cả</span>
                                </button>

                                <button 
                                    id="ecount-btn-ai-sensing"
                                    onClick={() => runTask('ai_sensing', { playbook: 'v31_full_automation_test.json' })} 
                                    disabled={isRunning}
                                    className="w-full flex items-center justify-center p-4 bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold rounded-2xl shadow-xl shadow-purple-100 transition-all duration-300 disabled:opacity-50 active:scale-[0.98] mb-4"
                                >
                                    <Eye size={20} className="mr-2" /> <span>Deep Audit (AI Sensing)</span>
                                </button>

                                <button 
                                    id="ecount-btn-cleanup"
                                    onClick={cleanupTasks} 
                                    className="w-full flex items-center justify-center p-3 mt-0 bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-md"
                                >
                                    <Trash2 size={18} className="mr-2" /> <span>Dọn rác & Reset</span>
                                </button>
                            </div>

                            <div className="mt-8">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                    <Calendar size={14} className="mr-2" /> Chọn thời gian
                                </h3>
                                <div className="mb-4">
                                    <select 
                                        value={dateRangeLabel}
                                        onChange={(e) => setDateRangeLabel(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="today">Hôm nay</option>
                                        <option value="yesterday">Hôm qua</option>
                                        <option value="this_month">Tháng này</option>
                                        <option value="last_month">Tháng trước</option>
                                        <option value="this_year">Năm nay</option>
                                    </select>
                                </div>

                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Mô-đun riêng lẻ</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {['sales', 'purchases', 'cash_receipts', 'cash_payments', 'receivable', 'payable', 'customers'].map((m) => (
                                        <button 
                                            key={m}
                                            id={`ecount-btn-sync-${m}`}
                                            onClick={() => runTask(m, { date_range: dateRangeLabel })} 
                                            disabled={isRunning}
                                            className="w-full bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700 p-3 rounded-xl text-sm font-bold transition-all text-left flex items-center justify-between"
                                        >
                                            <span className="capitalize">{m.replace('_', ' ')}</span>
                                            <Download size={14} className="opacity-40" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        <div className="bg-[#0d1117] rounded-3xl shadow-2xl border border-[#30363d] overflow-hidden flex flex-col h-[750px]">
                            <div className="bg-[#161b22] px-6 py-3 flex justify-between items-center border-b border-[#30363d]">
                                <div className="flex items-center space-x-4">
                                    <div className="flex space-x-1.5 mr-4">
                                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                    </div>
                                    
                                    {/* LOG FILTERS */}
                                    <div className="flex p-1 bg-[#0d1117] rounded-lg border border-[#30363d]">
                                        {['all', 'info', 'warn', 'error'].map(f => (
                                            <button 
                                                key={f}
                                                onClick={() => setLogFilter(f)}
                                                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    logFilter === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center text-[10px] font-mono text-gray-400 uppercase tracking-widest bg-[#1c2128] px-3 py-1 rounded-md border border-[#30363d]">
                                    <Monitor size={12} className="mr-2 text-blue-400" /> 
                                    {isRunning ? (
                                        <div className="flex items-center space-x-3">
                                            <span>PORT: <span className="text-white font-bold">{v2Info.port || '---'}</span></span>
                                            <span className="text-[#30363d]">|</span>
                                            <span className="flex items-center space-x-1">
                                                <span>HEARTBEAT:</span>
                                                <span className={`${v2Info.heartbeat ? 'text-emerald-400' : 'text-gray-500'} font-bold`}>
                                                    {v2Info.heartbeat ? new Date(v2Info.heartbeat).toLocaleTimeString() : 'WAITING...'}
                                                </span>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-ping' : 'bg-gray-700'}`}></div>
                                            </span>
                                        </div>
                                    ) : 'ENGINE_IDLE'}
                                </div>
                                <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-mono">
                                    <span className={isRunning ? "text-emerald-400 animate-pulse" : ""}>
                                        {isRunning ? "RUNNING" : "IDLE"}
                                    </span>
                                    <span>|</span>
                                    <span>ID: #{currentRunId || '---'}</span>
                                    {runPid && (
                                        <>
                                            <span>|</span>
                                            <span className="text-blue-400 font-bold">PID: {runPid}</span>
                                        </>
                                    )}
                                    {isStale && isRunning && (
                                        <>
                                            <span>|</span>
                                            <span className="text-red-500 font-black animate-pulse">⚠️ STALE</span>
                                        </>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setLogs([])}
                                    className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-tighter transition-colors"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* [V33 ELITE] STALE ALERT PANEL */}
                            {isStale && isRunning && (
                                <div className="bg-red-900/40 border-y border-red-500/30 px-6 py-4 flex items-center justify-between backdrop-blur-sm animate-in fade-in slide-in-from-top duration-500">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-red-500 rounded-full animate-bounce">
                                            <AlertTriangle size={16} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-white text-sm font-bold">⚠️ PHÁT HIỆN HIỆN TƯỢNG TREO</h4>
                                            <p className="text-red-200 text-[11px]">Robot không phản hồi trong 60 giây. Sếp có thể đợi thêm hoặc dừng cưỡng bức.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={forceTask}
                                        className="px-4 py-2 bg-white text-red-600 font-black text-xs rounded-xl hover:bg-red-50 transition-all shadow-lg active:scale-95"
                                    >
                                        DỪNG CƯỠNG BỨC
                                    </button>
                                </div>
                            )}

                            {/* PROGRESS BAR & ERROR SECTION */}
                            {(isRunning || runProgress > 0 || errorDetails) && (
                                <div className="bg-[#1c2128] px-6 py-4 border-b border-[#30363d]">
                                    {isRunning && (
                                        <div className="mb-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tiến độ nạp dữ liệu</span>
                                                <span className="text-sm font-bold text-blue-400">{runProgress}%</span>
                                            </div>
                                            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                                    style={{ width: `${runProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    {errorDetails && (
                                        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-start">
                                            <ShieldAlert className="text-red-500 mr-3 mt-0.5" size={20} />
                                            <div>
                                                <h4 className="text-sm font-bold text-red-400">CHI TIẾT LỖI TỪ ENGINE:</h4>
                                                <p className="text-xs text-red-300/80 mt-1 font-mono leading-relaxed">{errorDetails}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* [V2 ELITE] CONTROL TOOLBAR */}
                            {isRunning && v2Info.port && (
                                <div className="bg-[#1c2128] border-b border-[#30363d] px-6 py-3 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {v2Status === 'RUNNING' ? (
                                            <button 
                                                onClick={() => sendV2Command('PAUSE')}
                                                className="flex items-center px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-tighter rounded-xl border border-amber-500/30 transition-all border-dashed"
                                            >
                                                ⏸️ Tạm dừng Robot
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => sendV2Command('RESUME')}
                                                className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                                            >
                                                ▶️ Tiếp tục chạy
                                            </button>
                                        )}
                                        
                                        <button 
                                            onClick={() => setShowInjectInput(!showInjectInput)}
                                            className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-black uppercase tracking-tighter rounded-xl border border-slate-600 transition-all"
                                        >
                                            💉 {showInjectInput ? 'Hủy Bơm Script' : 'Bơm Script (Inject)'}
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center text-[10px] text-gray-500 font-mono italic">
                                            <ShieldAlert size={12} className="mr-1" />
                                            {v2Info.debug ? "DEBUG_MODE_ON" : "PRODUCTION_MODE"}
                                        </div>
                                        <button 
                                            onClick={forceTask}
                                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-tighter rounded-xl border border-red-500/30 transition-all"
                                        >
                                            Khai tử PID
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* JS INJECTION INPUT */}
                            {showInjectInput && (
                                <div className="bg-[#1c2128] border-b border-[#30363d] p-6 animate-in slide-in-from-top duration-300">
                                    <h4 className="text-blue-400 text-[10px] font-black uppercase mb-3 flex items-center">
                                        <Zap size={14} className="mr-2" /> JavaScript Injection (Playwright page.evaluate)
                                    </h4>
                                    <textarea 
                                        value={jsInjectCode}
                                        onChange={(e) => setJsInjectCode(e.target.value)}
                                        placeholder="// VD: console.log('Hello from UI'); alert('Bot is here');"
                                        className="w-full h-32 bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 text-[#a5d6ff] font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                    <div className="mt-3 flex justify-end">
                                        <button 
                                            onClick={() => sendV2Command('RUNNING', jsInjectCode)}
                                            disabled={!jsInjectCode.trim()}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                                        >
                                            🚀 Thực thi Ngay lập tức
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="p-6 flex-1 overflow-y-auto font-mono text-sm leading-relaxed" ref={terminalRef}>
                                {logs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-[#484f58]">
                                        <Type size={48} className="mb-4 opacity-20" />
                                        <p className="italic uppercase tracking-widest text-xs">Waiting for command initiation...</p>
                                    </div>
                                ) : (
                                    logs.map((line, idx) => (
                                        <div key={idx} className="whitespace-pre-wrap py-0.5">{formatLogLine(line)}</div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: HISTORY */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 text-xl">Nhật ký hoạt động</h2>
                        <button onClick={fetchHistory} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><RefreshCcw size={18} /></button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Loại Tác vụ</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4">Thời gian Bắt đầu</th>
                                    <th className="px-6 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {history?.map((run) => (
                                    <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-gray-400">#{run.id}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-700 capitalize">{run.task_type.replace('_', ' ')}</span>
                                            <p className="text-xs text-gray-400 mt-1">{run.payload?.report || '---'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                                run.status === 'success' ? 'bg-green-100 text-green-700' : 
                                                run.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {run.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono">
                                            {new Date(run.started_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => viewLogDetail(run.id)}
                                                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-bold"
                                            >
                                                <FileText size={16} className="mr-1" /> Log chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">Chưa có lịch sử hoạt động nào.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SCHEDULE */}
            {activeTab === 'schedule' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Cấu hình lập lịch chạy động</h2>
                        <button 
                            id="ecount-btn-add-schedule"
                            onClick={() => {
                                setNewSchedule({ task_type: 'ecount_sync', cron_expression: '0 8 * * *', payload: { report: 'all' }, is_active: 1 });
                                setShowScheduleModal(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100 flex items-center transition-all"
                        >
                            <Calendar size={18} className="mr-2" /> Thêm lịch chạy mới
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {schedules?.map((s) => (
                            <div key={s.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                            <Clock size={24} />
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {s.is_active ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-lg capitalize">{s.task_type.replace('_', ' ')}</h3>
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono">
                                            <Calendar size={14} className="mr-2 text-blue-500" /> 
                                            Cron: {s.cron_expression}
                                        </div>
                                        <p className="text-xs text-gray-400 flex items-center px-1">
                                            Lần cuối: {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Chưa chạy'}
                                        </p>
                                        <div className="flex items-center text-[11px] text-emerald-600 font-bold px-1 py-1 bg-emerald-50 rounded-lg">
                                            <PlayCircle size={12} className="mr-1.5" />
                                            Sắp tới: {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : '---'}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex gap-2 border-t pt-4">
                                    <button 
                                        onClick={() => runTask(s.payload?.report || 'all', s.payload || {})}
                                        className="flex-[1.5] bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center shadow-lg shadow-indigo-100"
                                    >
                                        <PlayCircle size={16} className="mr-2" /> Chạy ngay
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setNewSchedule(s);
                                            setShowScheduleModal(true);
                                        }}
                                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 p-2.5 rounded-xl text-sm font-bold transition-all"
                                    >Sửa</button>
                                    <button 
                                        onClick={() => deleteSchedule(s.id)}
                                        className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all"
                                    ><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                        {schedules.length === 0 && (
                            <div className="col-span-full bg-white rounded-2xl p-20 text-center border-2 border-dashed border-gray-200">
                                <Calendar size={48} className="mx-auto mb-4 text-gray-300 opacity-50" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Chưa đăng ký lịch chạy nào</p>
                                <p className="text-gray-300 text-xs mt-2 italic">Máy chủ Windows của sếp đang chờ được lập lịch...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: LOG DETAIL */}
            {showLogModal && (
                <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0d1117] w-full max-w-5xl rounded-3xl shadow-2xl border border-[#30363d] overflow-hidden flex flex-col h-[80vh]">
                        <div className="bg-[#161b22] px-6 py-4 flex justify-between items-center border-b border-[#30363d]">
                            <h3 className="text-gray-200 font-bold flex items-center">
                                <FileText size={18} className="mr-2 text-blue-400" /> Nhật ký chi tiết
                            </h3>
                            <button id="ecount-modal-close-log" onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-white p-2 bg-[#21262d] rounded-xl"><X size={20} /></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre">
                            {selectedRunLogs.split('\n').map((line, idx) => (
                                <div key={idx} className="py-0.5">{formatLogLine(line)}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: SCHEDULE FORM */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
                        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center text-lg">
                                <Calendar size={20} className="mr-2" /> Thiết lập lịch chạy
                            </h3>
                            <button id="ecount-modal-close-sched" onClick={() => setShowScheduleModal(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl text-white transition-all"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Loại tác vụ</label>
                                <select 
                                    id="ecount-sched-type"
                                    value={newSchedule.task_type}
                                    onChange={(e) => setNewSchedule({...newSchedule, task_type: e.target.value})}
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                                >
                                    <option value="ecount_sync">Đồng bộ Ecount (Sync)</option>
                                    <option value="keep_alive">Giữ Session (Keep-Alive)</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Thời gian chạy (Tần suất)</label>
                                
                                {/* Chọn Nhanh */}
                                <select 
                                    id="ecount-sched-freq"
                                    value={
                                        ['*/5 * * * *', '*/15 * * * *', '*/30 * * * *', '0 * * * *', '0 8 * * *', '0 13 * * *', '0 17 * * *', '0 21 * * *']
                                        .includes(newSchedule.cron_expression) ? newSchedule.cron_expression : 'custom'
                                    }
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if(val === 'custom') setCronMode('custom');
                                        else {
                                            setCronMode('preset');
                                            setNewSchedule({...newSchedule, cron_expression: val});
                                        }
                                    }}
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-gray-700"
                                >
                                    <optgroup label="Chạy liên tục">
                                        <option value="*/5 * * * *">⚡ Chạy lặp lại: Mỗi 5 phút</option>
                                        <option value="*/15 * * * *">⌚ Chạy lặp lại: Mỗi 15 phút</option>
                                        <option value="*/30 * * * *">⏳ Chạy lặp lại: Mỗi 30 phút</option>
                                        <option value="0 * * * *">⏰ Chạy lặp lại: Mỗi 1 Tiếng tròn</option>
                                    </optgroup>
                                    <optgroup label="Chạy cố định hàng ngày">
                                        <option value="0 8 * * *">🌅 Buổi sáng: Đúng 08:00 mỗi ngày</option>
                                        <option value="0 13 * * *">☀️ Buổi trưa: Đúng 13:00 mỗi ngày</option>
                                        <option value="0 17 * * *">🌇 Buổi chiều: Đúng 17:00 mỗi ngày</option>
                                        <option value="0 21 * * *">🌙 Buổi tối: Đúng 21:00 mỗi ngày</option>
                                    </optgroup>
                                    <optgroup label="Nâng cao">
                                        <option value="custom">⚙️ Chuyên gia: Tự nhập mã Cron thủ công...</option>
                                    </optgroup>
                                </select>

                                {/* Nhập thủ công nếu chọn 'custom' hoặc cron cũ không khớp mảng */}
                                {(!['*/5 * * * *', '*/15 * * * *', '*/30 * * * *', '0 * * * *', '0 8 * * *', '0 13 * * *', '0 17 * * *', '0 21 * * *']
                                    .includes(newSchedule.cron_expression) || cronMode === 'custom') && (
                                    <div className="pt-2 animate-fade-in">
                                        <input 
                                            id="ecount-sched-cron"
                                            type="text"
                                            value={newSchedule.cron_expression}
                                            placeholder="VD: 0 8 * * * (8h sáng hàng ngày)"
                                            onChange={(e) => setNewSchedule({...newSchedule, cron_expression: e.target.value})}
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-bold text-blue-600"
                                        />
                                        <p className="text-[10px] text-gray-400 italic mt-2 ml-1">
                                            Cấu trúc: Phút | Giờ | Ngày | Tháng | Thứ (Sử dụng biểu thức Cron chuẩn)
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tham số (Report)</label>
                                <select 
                                    value={newSchedule.payload?.report || 'all'}
                                    onChange={(e) => setNewSchedule({...newSchedule, payload: { ...newSchedule.payload, report: e.target.value }})}
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                                >
                                    <option value="all">Tất cả [ALL]</option>
                                    <option value="sales">Bán hàng</option>
                                    <option value="purchases">Mua hàng</option>
                                    <option value="inventory">Tồn kho</option>
                                    <option value="keep_alive">Chế độ Ping Keep-Alive</option>
                                </select>
                            </div>

                            <div className="flex items-center space-x-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                <input 
                                    type="checkbox" 
                                    id="active_cb"
                                    checked={newSchedule.is_active}
                                    onChange={(e) => setNewSchedule({...newSchedule, is_active: e.target.checked ? 1 : 0})}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="active_cb" className="font-bold text-gray-700 flex-1 cursor-pointer">Kích hoạt lịch trình này</label>
                            </div>

                            <button 
                                onClick={saveSchedule}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-black shadow-xl shadow-blue-100 transition-all uppercase tracking-widest mt-4"
                            >Xác nhận lưu cấu hình</button>
                        </div>
                    </div>
                </div>
            )}
             {/* MODAL: SNAPSHOT VIEWER */}
             {previewSnapshot && (
                <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-8" onClick={() => setPreviewSnapshot(null)}>
                    <div className="relative max-w-7xl max-h-full">
                        <img src={previewSnapshot} className="rounded-2xl shadow-2xl border-4 border-white/10" alt="Snapshot Preview" />
                        <button className="absolute -top-12 right-0 text-white flex items-center text-sm font-black uppercase tracking-widest px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                            <X className="mr-2" size={18} /> Đóng
                        </button>
                    </div>
                </div>
             )}
        </div>
    );
};

const reports = [
    { id: 'sales', name: 'Tình hình bán hàng', icon: <ShoppingCart /> },
    { id: 'purchases', name: 'Tình hình mua hàng', icon: <ShoppingBag /> },
    { id: 'cash_receipts', name: 'Nhật ký thu tiền', icon: <ArrowUp /> },
    { id: 'cash_payments', name: 'Nhật ký chi tiền', icon: <ArrowDown /> },
    { id: 'receivable', name: 'Công nợ phải thu', icon: <Users /> },
    { id: 'payable', name: 'Công nợ phải trả', icon: <CreditCard /> },
];

export default EcountAutomationPanel;
