import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, 
  ShieldAlert, RefreshCw, Download, Eye, X, Terminal,
  Zap, ArrowDownCircle, ArrowUpCircle, Wifi
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import monitorService from '../services/monitorService';

// --- HELPER: Màu sắc nhất quán ---
const stringToColor = (str) => {
  if (str === 'SEPAY') return '#7c3aed'; // Màu tím đặc trưng cho SePay
  if (str === 'MISA') return '#2563eb';  // Màu xanh cho MISA
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const SystemIntelligenceDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedService, setSelectedService] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const result = await monitorService.getSystemHealth(); // Gọi API getIntelligence cũ
      setData(result);
    } catch (error) {
      console.error("Failed to load intelligence data", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  // --- LOGIC LỌC ---
  const filteredLogs = useMemo(() => {
    if (!data?.recent_errors) return [];
    if (selectedService === 'ALL') return data.recent_errors;
    return data.recent_errors.filter(log => log.service === selectedService);
  }, [data, selectedService]);

  const filteredPerformance = useMemo(() => {
    if (!data?.performance) return [];
    if (selectedService === 'ALL') return data.performance;
    return data.performance.filter(p => p.service === selectedService);
  }, [data, selectedService]);

  // --- EXPORT CSV ---
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["Time", "Service", "Scope", "Method", "Status", "Duration(ms)", "Endpoint", "Error Detail"];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString('vi-VN'),
      log.service,
      log.scope,
      log.method || 'GET',
      log.status_code,
      log.duration_ms,
      log.endpoint,
      `"${(log.error_message || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `System_Logs_${selectedService}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // --- RENDER CARD THÔNG MINH ---
  const renderServiceCard = (service) => {
    const isActive = selectedService === service.service;
    const isSepay = service.service === 'SEPAY';
    const color = stringToColor(service.service);

    // Chuẩn hóa dữ liệu hiển thị (Vì SePay cấu trúc hơi khác MISA)
    let totalRequests = service.total;
    let errorCount = service.errors;
    let subText = "Requests (24h)";

    // Nếu là SePay, lấy dữ liệu từ webhook_24h
    if (isSepay && service.webhook_24h) {
      totalRequests = service.webhook_24h.total;
      errorCount = service.webhook_24h.failed;
      subText = "Webhooks (24h)";
    }

    return (
      <div 
        key={service.service} 
        onClick={() => setSelectedService(isActive ? 'ALL' : service.service)}
        className={`
          cursor-pointer relative p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[140px]
          ${isActive ? 'ring-2 ring-indigo-500 shadow-md transform scale-[1.02]' : 'hover:shadow-md border-gray-200 bg-white'}
        `}
        style={{ borderLeftWidth: '5px', borderLeftColor: color }}
      >
        {/* Header Card */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SERVICE</span>
              {isSepay && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded flex items-center gap-1"><Zap size={10}/> FINTECH</span>}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mt-1 flex items-center gap-2">
              {service.service}
            </h3>
          </div>
          
          {/* Status Icon */}
          <div className="flex flex-col items-end">
             {service.status === 'HEALTHY' 
                ? <CheckCircle className="w-6 h-6 text-green-500" />
                : <AlertTriangle className={`w-6 h-6 ${service.status === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'}`} />
             }
          </div>
        </div>

        {/* Body Card: Hiển thị khác biệt cho SePay */}
        <div className="mt-4">
          {isSepay ? (
            <div className="bg-gray-50 rounded p-2 border border-gray-100 mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 flex items-center gap-1"><Activity size={12}/> Nhịp tim cuối</span>
                <span className="text-xs font-medium text-gray-700">{service.last_transaction_at}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${service.status === 'HEALTHY' ? 'bg-green-500' : 'bg-red-500'}`} 
                  style={{ width: '100%' }} // Animation pulse could be added here
                ></div>
              </div>
              <div className="text-[10px] text-gray-400 mt-1 text-right">{service.message}</div>
            </div>
          ) : (
            // Layout chuẩn cho MISA/ECOUNT
            <div className="mb-2 h-8"></div> 
          )}

          {/* Footer Card: Metrics */}
          <div className="flex justify-between items-end border-t pt-2 border-gray-100">
            <div>
              <p className="text-xl font-bold text-gray-800">{totalRequests?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500">{subText}</p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${errorCount > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                {errorCount}
              </p>
              <p className="text-xs text-gray-500">Lỗi</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center animate-pulse">
        <Activity className="h-12 w-12 text-indigo-500 mb-4" />
        <span className="text-gray-500 font-medium">Đang kết nối vệ tinh giám sát...</span>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6 font-sans">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Wifi className="w-7 h-7 text-indigo-600" />
            Trung tâm Giám sát (Observer Core)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Realtime monitoring for <b>{data?.services?.length || 0}</b> services including Payment Gateways.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="btn-white flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm text-sm">
            <Download className="w-4 h-4" /> Log 24h
          </button>
          <button 
            onClick={fetchData} 
            disabled={refreshing}
            className={`p-2 rounded-full hover:bg-gray-200 transition-all ${refreshing ? 'animate-spin text-indigo-600' : 'text-gray-600'}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- 1. SERVICE CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data?.services?.map(service => renderServiceCard(service))}
      </div>

      {/* --- 2. MAIN DASHBOARD --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LOG TABLE */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Nhật ký Sự kiện ({selectedService})
            </h3>
            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">Live Logs</span>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Source / Scope</th>
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, index) => {
                    // Logic màu sắc cho Scope
                    const isIncoming = log.scope === 'INCOMING_WEBHOOK';
                    const scopeColor = isIncoming ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-100';
                    const ScopeIcon = isIncoming ? ArrowDownCircle : ArrowUpCircle;

                    return (
                      <tr key={index} className="hover:bg-indigo-50 transition-colors group">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          <div className="font-medium">{new Date(log.created_at).toLocaleTimeString('vi-VN')}</div>
                          <div className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleDateString('vi-VN')}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-gray-800 block">{log.service}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 w-fit mt-1 ${scopeColor}`}>
                            <ScopeIcon size={10} /> {log.scope || 'DEFAULT'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400">{log.method}</span>
                            <div className="max-w-[180px] truncate font-mono text-xs text-gray-600" title={log.endpoint}>
                              {log.endpoint}
                            </div>
                            <span className="text-[10px] text-gray-400">{log.duration_ms}ms</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border
                            ${log.status_code >= 500 ? 'bg-red-50 text-red-600 border-red-100' : 
                              log.status_code >= 400 ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                              'bg-green-50 text-green-600 border-green-100'}`}>
                            {log.status_code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => setSelectedLog(log)}
                            className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-indigo-100 transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center">
                        <CheckCircle className="w-10 h-10 mb-2 text-green-400 opacity-50" />
                        <p>Hệ thống hoạt động ổn định.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PERFORMANCE CHART */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              API Latency (Top Slowest)
            </h3>
          </div>
          <div className="p-4 flex-1">
            {filteredPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredPerformance} layout="vertical" margin={{ left: 0, right: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" unit="ms" hide />
                  <YAxis 
                    type="category" 
                    dataKey="endpoint" 
                    width={110} 
                    tick={{fontSize: 10, fill: '#6b7280'}} 
                    tickFormatter={(val) => val.length > 20 ? '...' + val.slice(-15) : val}
                  />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border shadow-lg rounded text-xs z-50">
                            <p className="font-bold text-gray-800">{payload[0].payload.endpoint}</p>
                            <p className="text-blue-600 font-medium">Avg: {payload[0].value.toFixed(2)} ms</p>
                            <p className="text-gray-500 mt-1">{payload[0].payload.service}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avg_time" radius={[0, 4, 4, 0]} barSize={20}>
                     {filteredPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avg_time > 2000 ? '#ef4444' : stringToColor(entry.service)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Terminal className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Chưa có dữ liệu độ trễ</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- DETAIL MODAL --- */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-gray-600" />
                Log Details <span className="text-gray-400 font-normal">#{selectedLog.id || 'RAW'}</span>
              </h3>
              <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="flex gap-4">
                 <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400">Service</label>
                    <div className="text-lg font-bold text-indigo-900">{selectedLog.service}</div>
                 </div>
                 <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400">Timestamp</label>
                    <div className="text-sm font-medium text-gray-700">{new Date(selectedLog.created_at).toLocaleString('vi-VN')}</div>
                 </div>
                 <div className="text-right">
                    <label className="text-[10px] uppercase font-bold text-gray-400">Status</label>
                    <div className={`text-lg font-bold ${selectedLog.status_code >= 400 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedLog.status_code}
                    </div>
                 </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Request Info</label>
                <div className="flex items-center gap-2 mb-2">
                   <span className="bg-white border px-2 py-0.5 rounded text-xs font-bold">{selectedLog.method || 'GET'}</span>
                   <span className="text-sm font-mono break-all text-gray-700">{selectedLog.endpoint}</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 border-t pt-2 border-gray-200">
                   <span>Duration: <b>{selectedLog.duration_ms}ms</b></span>
                   <span>Payload Size: <b>{selectedLog.data_size || 0} bytes</b></span>
                   <span>Scope: <b>{selectedLog.scope}</b></span>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-red-500 mb-1 block flex items-center gap-1">
                    <AlertTriangle size={12}/> Exception Trace
                  </label>
                  <pre className="bg-slate-900 text-red-300 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-slate-700 whitespace-pre-wrap">
                    {selectedLog.error_message}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
               <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700 text-sm font-medium shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemIntelligenceDashboard;