// src/components/ui/SuperTable.jsx
import React, { useState, useMemo } from 'react';
import { Icon } from '../ui'; // Hoặc import icon từ thư viện bạn đang dùng

const SuperTable = ({ 
  data = [], 
  columns = [], 
  isLoading = false,
  onEdit, 
  onDelete, 
  onClone,
  pageSize = 10,
  actionWidth = "150px"
}) => {
  // --- STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // --- LOGIC: XỬ LÝ DỮ LIỆU (Filter -> Sort -> Paginate) ---
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Tìm kiếm
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(item => 
        Object.keys(item).some(key => 
          String(item[key]).toLowerCase().includes(lowerSearch)
        )
      );
    }

    // 2. Sắp xếp
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchText, sortConfig]);

  // 3. Phân trang
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice(
    (currentPage - 1) * pageSize, 
    currentPage * pageSize
  );

  // --- HELPER: SORT HANDLE ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- HELPER: RENDER TRẠNG THÁI (ĐÈN GIAO THÔNG) ---
  const renderStatusBadge = (status) => {
    const configs = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: '🟢 Active' },
      maintenance: { bg: 'bg-red-100', text: 'text-red-700', label: '🔴 Bảo trì' },
      unprotected: { bg: 'bg-red-50', text: 'text-red-600 animate-pulse', label: '⚠️ Rủi ro' },
      deprecated: { bg: 'bg-gray-100', text: 'text-gray-500 line-through', label: '⚫ Rác' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '⚪ Chờ' },
    };
    const conf = configs[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${conf.bg} ${conf.text} border border-transparent`}>
        {conf.label}
      </span>
    );
  };

  // --- RENDER ---
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col">
      
      {/* 1. TOOLBAR */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <div className="relative">
          <input 
            type="text" 
            placeholder="🔍 Tìm kiếm nhanh..." 
            className="pl-3 pr-4 py-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
        <div className="text-xs text-gray-500">
          Hiển thị <b>{paginatedData.length}</b> / <b>{processedData.length}</b> bản ghi
        </div>
      </div>

      {/* 2. TABLE CONTENT */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider border-b">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`p-4 font-bold cursor-pointer hover:bg-gray-200 transition ${col.className || ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.accessor)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {sortConfig.key === col.accessor && (
                      <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete || onClone) && <th className="p-4 text-right" style={{ width: actionWidth }}>Thao tác</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-gray-400">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="mt-2 text-xs">Đang tải dữ liệu...</div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-gray-400 italic">
                  Không tìm thấy dữ liệu phù hợp.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr key={row.id || rIdx} className="hover:bg-blue-50 transition-colors group">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="p-4 text-sm text-gray-700">
                      {col.type === 'status' ? (
                        renderStatusBadge(row[col.accessor])
                      ) : col.render ? (
                        col.render(row)
                      ) : (
                        row[col.accessor]
                      )}
                    </td>
                  ))}

                  {(onEdit || onDelete || onClone) && (
                    <td className="p-4 text-right flex justify-end gap-2 opacity-100">
                      {onClone && (
                        <button onClick={() => onClone(row)} title="Nhân bản" className="p-1.5 text-purple-600 hover:bg-purple-100 rounded">
                          📑
                        </button>
                      )}
                      {onEdit && (
                        <button onClick={() => onEdit(row)} title="Chỉnh sửa" className="p-1.5 text-blue-600 hover:bg-blue-100 rounded">
                          ✏️
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(row)} title="Xóa" className="p-1.5 text-red-600 hover:bg-red-100 rounded">
                          🗑️
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. PAGINATION */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-gray-100 flex justify-end gap-1 bg-gray-50 rounded-b-lg">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs"
          >
            Trước
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 border rounded text-xs font-bold ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}
            >
              {page}
            </button>
          ))}

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default SuperTable;