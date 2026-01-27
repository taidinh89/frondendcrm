import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios'; 

// --- IMPORTS UI COMPONENTS ---
import { Button, Icon } from '../components/ui.jsx';
import { AnalysisCard } from '../components/analysis/AnalysisCard.jsx';
import { ProductAnalysisPieChart } from '../components/analysis/ProductAnalysisPieChart.jsx';
import { ProductAnalysisBarChart } from '../components/analysis/ProductAnalysisBarChart.jsx';
import { SalesOrderDetailModal } from '../components/SalesOrderDetailModal.jsx'; 

// --- CONFIG ---
const API_ENDPOINT = '/api/v2/monitor';

const ERROR_CONFIG = {
    'price_shock': { label: 'Giá Sốc (>20%)', color: 'bg-red-100 text-red-800', chartColor: '#ef4444' },
    'negative_margin': { label: 'Bán Lỗ', color: 'bg-orange-100 text-orange-800', chartColor: '#f97316' },
    'high_profit_risk': { label: 'Lãi Ảo (>80%)', color: 'bg-yellow-100 text-yellow-800', chartColor: '#eab308' },
    'negative_stock': { label: 'Âm Kho', color: 'bg-purple-100 text-purple-800', chartColor: '#a855f7' },
    'unit_mismatch': { label: 'Sai Đơn Vị', color: 'bg-blue-100 text-blue-800', chartColor: '#3b82f6' },
    'SOC_GIA': { label: 'Sốc Giá (Lỗi Nhập)', color: 'bg-red-100 text-red-800', chartColor: '#dc2626' },
    'HEALED': { label: 'Đã Tự Sửa (Auto-Fix)', color: 'bg-green-100 text-green-800', chartColor: '#22c55e' },
    'AM_KHO': { label: 'Âm Kho Hệ Thống', color: 'bg-purple-100 text-purple-800', chartColor: '#9333ea' },
    'SAI_DON_VI': { label: 'Sai Đơn Vị Tính', color: 'bg-blue-100 text-blue-800', chartColor: '#2563eb' },
    'LAI_AO': { label: 'Lãi Ảo / Sai Giá Vốn', color: 'bg-yellow-100 text-yellow-800', chartColor: '#ca8a04' },
    'zero_price': { label: 'Giá 0đ', color: 'bg-gray-100 text-gray-800', chartColor: '#6b7280' },
};

const AnomalyBadge = ({ type }) => {
    const safeType = type || 'UNKNOWN';
    const config = ERROR_CONFIG[safeType] || { label: safeType, color: 'bg-gray-100 text-gray-800' };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border border-opacity-20 ${config.color}`}>
            {config.label}
        </span>
    );
};

export const SystemMonitorPage = ({ setAppTitle }) => {
    // --- STATE ---
    const [debugMode, setDebugMode] = useState(false); // [DEBUG] State bật tắt debug
    const [debugLog, setDebugLog] = useState('');      // [DEBUG] Log dữ liệu
    
    const [stats, setStats] = useState(null);
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [isResolving, setIsResolving] = useState(null); 
    const [viewingOrderId, setViewingOrderId] = useState(null);
    
    const [anomalyFilters, setAnomalyFilters] = useState({
        type: '',
        search: '',
        status: 'pending', 
        limit: 50
    });

    useEffect(() => { 
        if(setAppTitle) setAppTitle('Trung tâm Kiểm soát Sức khỏe Hệ thống'); 
    }, [setAppTitle]);

    // --- FETCH DATA (Dùng Axios trực tiếp để kiểm soát lỗi) ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get Stats
            const statsRes = await axios.get(`${API_ENDPOINT}/stats`);
            setStats(statsRes.data);

            // 2. Get Anomalies (Build Query String thủ công)
            const params = new URLSearchParams();
            params.append('status', anomalyFilters.status);
            params.append('limit', anomalyFilters.limit);
            if(anomalyFilters.type) params.append('type', anomalyFilters.type);
            if(anomalyFilters.search) params.append('search', anomalyFilters.search);

            const url = `${API_ENDPOINT}/anomalies?${params.toString()}`;
            console.log("Calling URL:", url); // Xem trong Console F12

            const anomaliesRes = await axios.get(url);
            
            // [DEBUG] Ghi lại log để hiển thị ra màn hình
            setDebugLog(JSON.stringify({
                url: url,
                data_length: anomaliesRes.data?.data?.length,
                raw_data_sample: anomaliesRes.data?.data?.[0] || 'No Data',
                full_response: anomaliesRes.data
            }, null, 2));

            // Set dữ liệu an toàn
            if (anomaliesRes.data && anomaliesRes.data.data) {
                setAnomalies(anomaliesRes.data.data);
            } else {
                setAnomalies([]);
            }

        } catch (error) {
            console.error("API Error:", error);
            setDebugLog(`ERROR: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Gọi API khi filter thay đổi
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300); // Debounce
        return () => clearTimeout(timer);
    }, [anomalyFilters]);

    // --- ACTIONS ---
    const handleResolve = async (id) => {
        setIsResolving(id);
        try {
            await axios.post(`${API_ENDPOINT}/anomalies/${id}/resolve`);
            fetchData(); // Reload
        } catch (e) {
            alert('Lỗi: ' + e.message);
        } finally {
            setIsResolving(null);
        }
    };

    // --- CHARTS ---
    const chartData = useMemo(() => {
        if (!stats?.overview) return [];
        return Object.entries(stats.overview)
            .map(([key, value]) => ({
                name: ERROR_CONFIG[key]?.label || key,
                value: value,
                fill: ERROR_CONFIG[key]?.chartColor || '#9ca3af'
            }))
            .sort((a, b) => b.value - a.value);
    }, [stats]);

    const getSumStats = (keys) => {
        if (!stats?.overview) return 0;
        return keys.reduce((acc, key) => acc + (stats.overview[key] || 0), 0);
    };

    // --- RENDER TABLE ---
    const renderTable = () => {
        if (loading) return <tr><td colSpan="6" className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr>;
        
        if (!anomalies || anomalies.length === 0) {
            return (
                <tr>
                    <td colSpan="6" className="p-12 text-center text-gray-400 italic">
                        Không tìm thấy dữ liệu.
                    </td>
                </tr>
            );
        }

        return anomalies.map(item => {
            const safeDetails = item.details || {}; 
            const hasDetails = safeDetails && typeof safeDetails === 'object' && Object.keys(safeDetails).length > 0;

            return (
                <tr key={item.id} className="hover:bg-gray-50 border-b">
                    <td className="px-6 py-4"><AnomalyBadge type={item.type} /></td>
                    <td className="px-6 py-4 font-mono font-bold text-blue-600 cursor-pointer" onClick={() => setViewingOrderId(item.record_ref)}>
                        {item.record_ref || 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{item.product_code}</td>
                    <td className="px-6 py-4">
                        <div className="text-sm font-medium">{item.description}</div>
                        {hasDetails && (
                            <div className="mt-1 text-xs bg-gray-100 p-1 rounded font-mono">
                               {Object.entries(safeDetails).map(([k, v]) => (
                                   <span key={k} className="mr-2"><b>{k}:</b> {String(v)}</span>
                               ))}
                            </div>
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                        {item.created_at}
                    </td>
                    <td className="px-6 py-4 text-right">
                         {/* Check cả chuỗi "1" và số 1 */}
                        {item.is_resolved == 1 ? (
                            <span className="text-xs font-bold text-gray-400">Đã xong</span>
                        ) : (
                            <Button 
                                variant="secondary" 
                                className="text-xs px-2 py-1"
                                disabled={isResolving === item.id}
                                onClick={() => handleResolve(item.id)}
                            >
                                {isResolving === item.id ? '...' : 'Xử lý'}
                            </Button>
                        )}
                    </td>
                </tr>
            );
        });
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen font-sans text-gray-800">
            {/* HEADER & DEBUG TOGGLE */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Icon path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" className="w-8 h-8 text-red-600" />
                    Health Check Center
                </h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setDebugMode(!debugMode)}
                        className={`px-3 py-1 rounded text-sm font-bold ${debugMode ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        {debugMode ? 'TẮT DEBUG' : 'BẬT DEBUG'}
                    </button>
                    <Button onClick={fetchData} variant="white">Làm mới</Button>
                </div>
            </div>

            {/* --- DEBUG BOX (CHỈ HIỆN KHI BẬT) --- */}
            {debugMode && (
                <div className="bg-black text-green-400 p-4 rounded text-xs font-mono overflow-auto h-64 border-2 border-red-500 mb-4 shadow-xl">
                    <h3 className="font-bold text-white border-b border-gray-700 pb-2 mb-2">DEBUG CONSOLE (Gửi ảnh này nếu lỗi)</h3>
                    <pre>{debugLog}</pre>
                </div>
            )}

            {/* CARDS */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <AnalysisCard className="border-l-4 border-red-500 bg-white">
                        <p className="text-sm text-gray-500 uppercase">Lỗi Nghiêm trọng</p>
                        <p className="text-3xl font-bold text-red-600">{stats.critical_count || 0}</p>
                    </AnalysisCard>
                    <AnalysisCard className="border-l-4 border-orange-400 bg-white">
                        <p className="text-sm text-gray-500 uppercase">Bán Lỗ</p>
                        <p className="text-3xl font-bold text-gray-800">{getSumStats(['negative_margin', 'BAN_LO'])}</p>
                    </AnalysisCard>
                    <AnalysisCard className="border-l-4 border-blue-400 bg-white">
                        <p className="text-sm text-gray-500 uppercase">Tự sửa (Healed)</p>
                        <p className="text-3xl font-bold text-gray-800">{getSumStats(['HEALED'])}</p>
                    </AnalysisCard>
                    <AnalysisCard className="border-l-4 border-purple-400 bg-white">
                        <p className="text-sm text-gray-500 uppercase">Âm Kho</p>
                        <p className="text-3xl font-bold text-gray-800">{getSumStats(['negative_stock', 'AM_KHO'])}</p>
                    </AnalysisCard>
                </div>
            )}

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalysisCard title="Tỷ trọng Lỗi">
                    <div className="h-64 p-2">
                        <ProductAnalysisPieChart data={chartData} dataKey="value" nameKey="name" />
                    </div>
                </AnalysisCard>
                <AnalysisCard title="Top Lỗi">
                    <div className="h-64 p-2">
                        <ProductAnalysisBarChart data={chartData} dataKey="value" nameKey="name" unit=" lỗi" layout="vertical" barColor="#6366f1"/>
                    </div>
                </AnalysisCard>
            </div>

            {/* TABLE */}
            <AnalysisCard title="Danh sách Chi tiết">
                {/* Filter Bar */}
                <div className="p-4 border-b bg-gray-50 flex gap-4">
                    <select 
                        className="bg-white border rounded px-3 py-2"
                        value={anomalyFilters.type} 
                        onChange={(e) => setAnomalyFilters({...anomalyFilters, type: e.target.value})}
                    >
                        <option value="">-- Tất cả --</option>
                        {Object.entries(ERROR_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <input 
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="Tìm kiếm..."
                        value={anomalyFilters.search}
                        onChange={(e) => setAnomalyFilters({...anomalyFilters, search: e.target.value})}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Loại</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ref</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mã Hàng</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mô tả</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Thời gian</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {renderTable()}
                        </tbody>
                    </table>
                </div>
            </AnalysisCard>

            {viewingOrderId && (
                <SalesOrderDetailModal 
                    orderIdentifier={viewingOrderId} 
                    onClose={() => setViewingOrderId(null)}
                    onSaveSuccess={() => fetchData()}
                />
            )}
        </div>
    );
};