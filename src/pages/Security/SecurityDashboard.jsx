import React, { useEffect, useState } from 'react';
import securityService from '../../services/securityService';

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
      loadStats(); // Reload lại số liệu sau khi đồng bộ
    } catch (error) {
      alert("Lỗi: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 text-gray-500">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p>Đang tải dữ liệu an ninh...</p>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
            <span className="text-3xl">🛡️</span> Trung tâm An ninh
          </h1>
          <p className="text-gray-500 text-sm mt-1">Giám sát tính toàn vẹn hệ thống (Integrity Monitor)</p>
        </div>
        <button 
          onClick={loadStats}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 transition flex items-center gap-2"
        >
          🔄 Quét & Đồng bộ Hệ thống
        </button>
      </div>

      {/* 1. KHUNG CẢNH BÁO THÔNG MINH */}
      {stats && stats.unprotected > 0 ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm mb-8 animate-fade-in-down">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-red-800 flex items-center gap-2">
                ⚠️ PHÁT HIỆN {stats.unprotected} TÍNH NĂNG MỚI CẦN BẢO VỆ
              </h3>
              <p className="text-red-700 mt-1 text-sm">
                Có <b>{stats.unprotected} API</b> mới được Developer thêm vào Code nhưng chưa được khai báo trong Database.
              </p>
            </div>
            
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg transform transition hover:-translate-y-0.5 whitespace-nowrap"
            >
              {syncing ? '⏳ Đang vá lỗi...' : 'VÁ LỖI NGAY (AUTO SYNC)'}
            </button>
          </div>

          <div className="mt-4 bg-white p-3 rounded border border-red-100 text-xs text-red-600 font-mono">
             CÁC API BỊ ẢNH HƯỞNG: <span className="bg-red-100 px-1 rounded">api.security.*</span>, <span className="bg-red-100 px-1 rounded">report.export</span>...
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl shadow-sm mb-8 flex items-center gap-4">
          <div className="text-4xl">✅</div>
          <div>
            <h3 className="text-lg font-bold text-green-800">Hệ thống An toàn Tuyệt đối</h3>
            <p className="text-green-700 text-sm">100% API đã được phân quyền và kiểm soát. Không phát hiện bất thường.</p>
          </div>
        </div>
      )}

      {/* 2. CÁC THẺ SỐ LIỆU */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Tổng quan */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-400 text-xs font-bold uppercase mb-2">Tổng API</p>
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-black text-gray-800">{stats?.total_routes || 0}</h2>
            <span className="text-xs text-gray-400 mb-1">endpoints</span>
          </div>
        </div>

        {/* Card 2: Đã bảo vệ */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-200 border-l-4 border-l-green-500">
          <p className="text-green-600 text-xs font-bold uppercase mb-2">Đã Bảo vệ</p>
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-black text-green-700">{stats?.secured || 0}</h2>
            <span className="text-xs text-green-600 mb-1">Active</span>
          </div>
        </div>

         {/* Card 3: Đang bảo trì */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-yellow-200 border-l-4 border-l-yellow-500">
          <p className="text-yellow-600 text-xs font-bold uppercase mb-2">Đang Bảo trì</p>
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-black text-yellow-700">{(stats?.total_routes - stats?.secured - stats?.unprotected) || 0}</h2>
            <span className="text-xs text-yellow-600 mb-1">Pending</span>
          </div>
        </div>

        {/* Card 4: Rác */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-400 text-xs font-bold uppercase mb-2">Rác / Dư thừa</p>
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-black text-gray-400">{stats?.deprecated || 0}</h2>
            <span className="text-xs text-gray-400 mb-1">Deprecated</span>
          </div>
        </div>
      </div>

      {/* 3. BIỂU ĐỒ THANH NGANG */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="flex justify-between items-end mb-4">
            <h3 className="font-bold text-gray-800">Độ phủ An ninh Hệ thống</h3>
            <span className="text-3xl font-black text-gray-800">
                {stats && stats.total_routes > 0 ? Math.round((stats.secured / stats.total_routes) * 100) : 0}%
            </span>
        </div>
        <div className="w-full bg-gray-100 h-6 rounded-full overflow-hidden flex">
            <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${stats ? (stats.secured / stats.total_routes) * 100 : 0}%` }}></div>
            <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${stats ? (stats.unprotected / stats.total_routes) * 100 : 0}%` }}></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>0% (Nguy hiểm)</span>
            <span>100% (Tuyệt đối)</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">Tỷ lệ API đã được phân quyền & kiểm soát</p>
      </div>

      {/* 4. HƯỚNG DẪN XỬ LÝ (Thay cho Link) */}
      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
        <h3 className="font-bold text-indigo-900 mb-4">QUY TRÌNH XỬ LÝ CHUẨN</h3>
        <div className="space-y-3">
            <div className="flex gap-3">
                <span className="bg-indigo-200 text-indigo-800 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">1</span>
                <p className="text-sm text-indigo-800">Nhấn nút <b>Quét & Đồng bộ</b> ở góc trên mỗi khi Developer thông báo vừa cập nhật code mới.</p>
            </div>
            <div className="flex gap-3">
                <span className="bg-indigo-200 text-indigo-800 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">2</span>
                <p className="text-sm text-indigo-800">Nếu thấy đèn <b className="text-red-600">Đỏ (Risk)</b>, hãy bấm vào menu <b>"Ma trận Phân quyền"</b> ở cột bên trái để kích hoạt chúng.</p>
            </div>
            <div className="flex gap-3">
                <span className="bg-indigo-200 text-indigo-800 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">3</span>
                <p className="text-sm text-indigo-800">Thường xuyên vào <b>"Quản lý Vai trò"</b> để kiểm tra xem có ai được cấp quyền "Toàn cục" (Global) nhầm không.</p>
            </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;