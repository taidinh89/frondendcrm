import React, { useEffect, useState } from 'react';
import securityService from '../../services/securityService';
import {
  Shield,
  Activity,
  Lock,
  Users,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ActionCard = ({ title, desc, icon: Icon, to, color }) => (
  <Link
    to={to}
    className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-300"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-90`}>
        <Icon className="w-6 h-6" />
      </div>
      <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
    </div>
    <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    <div className="mt-4 flex items-center text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
      BẮT ĐẦU NGAY <ChevronRight className="w-3 h-3 ml-1" />
    </div>
  </Link>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await securityService.getSystemHealth();
      setStats(res.overview);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!window.confirm("Hành động này sẽ thêm các API mới vào danh sách quản lý.\n\nHoàn toàn AN TOÀN và KHÔNG ảnh hưởng user đang dùng.\n\nBạn chắc chắn chứ?")) return;

    setSyncing(true);
    try {
      const res = await securityService.syncPermissions();
      alert(res.message);
      loadStats();
    } catch (error) {
      alert("Lỗi: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4 shadow-sm"></div>
      <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Đang quét hệ thống bảo mật...</p>
    </div>
  );

  const healthScore = stats ? Math.round((stats.secured / stats.total_routes) * 100) : 0;
  const isHealthy = healthScore >= 95 && (stats?.unprotected === 0);

  return (
    <div className="p-6 lg:p-10 bg-[#f8fafc] min-h-screen font-sans">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-3xl ${isHealthy ? 'bg-green-500 shadow-green-200' : 'bg-red-500 shadow-red-200'} shadow-lg text-white`}>
            <Shield className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
              Security <span className="text-blue-600">Commander</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Giám sát tính toàn vẹn hệ thống & Phân quyền tập trung
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={loadStats}
            className="flex-1 md:flex-none bg-white text-slate-700 px-6 py-3 rounded-2xl font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`flex-1 md:flex-none ${isHealthy ? 'bg-slate-800' : 'bg-blue-600 shadow-blue-200'} text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            <Database className="w-4 h-4" />
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ API'}
          </button>
        </div>
      </div>

      {/* ALERT STRIP */}
      {!isHealthy && (
        <div className="mb-10 bg-red-600 text-white p-6 rounded-[2rem] shadow-xl shadow-red-100 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-5 text-center md:text-left">
            <div className="p-3 bg-white bg-opacity-20 rounded-2xl">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wide">Phát hiện Rủi ro Bảo mật</h2>
              <p className="text-red-100 font-medium">Tìm thấy <b>{stats?.unprotected} API</b> mới chưa được gán quyền bảo vệ. Hệ thống đang ở trạng thái phơi nhiễm.</p>
            </div>
          </div>
          <button
            onClick={handleSync}
            className="bg-white text-red-600 px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto"
          >
            VÁ LỖI TỰ ĐỘNG NGAY
          </button>
        </div>
      )}

      {/* HEALTH SCORE & QUICK STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">

        {/* Main Health Card */}
        <div className="lg:col-span-1 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <Shield className="w-64 h-64 rotate-12" />
          </div>

          <div className="relative mb-6">
            <svg className="w-48 h-48">
              <circle className="text-slate-100" strokeWidth="12" stroke="currentColor" fill="transparent" r="80" cx="96" cy="96" />
              <circle
                className={isHealthy ? 'text-green-500' : 'text-blue-600'}
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 80}
                strokeDashoffset={2 * Math.PI * 80 * (1 - healthScore / 100)}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="80"
                cx="96"
                cy="96"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-slate-800">{healthScore}%</span>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Health Score</span>
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-2">
            {isHealthy ? 'Hệ thống An toàn' : 'Cần can thiệp bảo mật'}
          </h3>
          <p className="text-sm text-slate-400 font-medium px-6 leading-relaxed">
            Mức độ bao phủ bảo vệ dựa trên tổng số endpoint đã được cấu hình trong Ma trận Kiểm soát.
          </p>
        </div>

        {/* Detailed Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Activity className="w-5 h-5" /></div>
              <span className="text-[10px] font-black text-slate-300 uppercase letter-wider">Total</span>
            </div>
            <div>
              <h2 className="text-4xl font-black text-slate-800">{stats?.total_routes || 0}</h2>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tighter">API Endpoints</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-green-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-green-50 text-green-500 rounded-2xl"><CheckCircle className="w-5 h-5" /></div>
              <span className="text-[10px] font-black text-slate-300 uppercase letter-wider">Secured</span>
            </div>
            <div>
              <h2 className="text-4xl font-black text-green-600">{stats?.secured || 0}</h2>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tighter">Active Protection</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-red-50 text-red-500 rounded-2xl"><AlertTriangle className="w-5 h-5" /></div>
              <span className="text-[10px] font-black text-slate-300 uppercase letter-wider">Unprotected</span>
            </div>
            <div>
              <h2 className="text-4xl font-black text-red-600">{stats?.unprotected || 0}</h2>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tighter">Risk Findings</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl"><Lock className="w-5 h-5" /></div>
              <span className="text-[10px] font-black text-slate-300 uppercase letter-wider">Status</span>
            </div>
            <div>
              <h2 className="text-4xl font-black text-slate-800">
                {isHealthy ? 'SHIELDED' : 'EXPOSED'}
              </h2>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tighter">Security State</p>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Trung tâm Chỉ huy Phân quyền</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <ActionCard
          title="Ma trận Kiểm soát"
          desc="Quản lý chi tiết từng API endpoint, bật/tắt trạng thái bảo trì và giám sát rủi ro code mới."
          icon={Activity}
          to="/security/permission-matrix"
          color="text-blue-600 bg-blue-600"
        />
        <ActionCard
          title="Quản lý Vai trò"
          desc="Định nghĩa các Chức danh (Roles), gán quyền hạn và cấu hình phạm vi dữ liệu (Scopes) cho nhân sự."
          icon={Users}
          to="/security/roles"
          color="text-indigo-600 bg-indigo-600"
        />
        <ActionCard
          title="Phiên Đăng nhập"
          desc="Giám sát thời gian thực các thiết bị đang truy cập, cưỡng bức đăng xuất (Revoke) các phiên nghi vấn."
          icon={Smartphone}
          to="/security/sessions"
          color="text-orange-600 bg-orange-600"
        />
      </div>

      {/* BOTTOM TIP */}
      <div className="bg-slate-800 text-slate-300 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none"></div>
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="p-5 bg-white bg-opacity-10 rounded-3xl">
            <Shield className="w-12 h-12 text-blue-400" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">Kỹ thuật Zero-Trust Architecture</h4>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
              Hệ thống được thiết kế theo mô hình <b>Zero-Trust</b>. Mọi yêu cầu đều phải đi qua 3 lớp kiểm tra:
              (1) Định danh, (2) Quyền hạn API trong Ma trận, và (3) Phạm vi dữ liệu (Scope).
              Nhấn nút <code className="bg-slate-700 px-2 py-0.5 rounded text-blue-400">Đồng bộ API</code> sau mỗi lần Deploy để cập nhật Ma trận.
            </p>
          </div>
          <Link to="/security/permission-matrix" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/40">
            KIỂM TRA MA TRẬN
          </Link>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
