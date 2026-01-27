import React, { forwardRef } from 'react';

export const QuotationPrintTemplate = forwardRef(
  ({ data, settings }, ref) => {
    if (!data) return <div ref={ref} className="p-10 text-center text-gray-400">Không có dữ liệu in...</div>;

    const { templateType, vatMode, showCompanyInfo, showSignatures, showNote } = settings;
    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    const isTechnical = templateType === 'technical';
    const isImages = templateType === 'images'; 
    const isMinimal = templateType === 'minimal';

    return (
      <div 
        ref={ref} 
        className={`bg-white text-gray-900 print:text-black leading-relaxed font-sans ${isMinimal ? 'p-8 text-xs' : 'p-10 text-sm'}`} 
        style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }} // Chuẩn khổ A4
      >
        {/* ================= HEADER CÔNG TY (ĐÃ KHÔI PHỤC) ================= */}
        {showCompanyInfo && (
            <div className="flex justify-between items-start border-b-2 border-blue-900 pb-4 mb-6">
                {/* LOGO (Trái) */}
                <div className="w-1/3">
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className="h-20 w-auto object-contain"
                        onError={(e) => e.target.style.display = 'none'} 
                    />
                </div>

                {/* THÔNG TIN (Phải) */}
                <div className="w-2/3 text-right space-y-1">
                    <h1 className="font-bold text-lg text-blue-900 uppercase tracking-wide">CÔNG TY TNHH CÔNG NGHỆ QUỐC VIỆT</h1>
                    <p className="text-gray-600 text-xs font-medium">📍số 21 đường Nguyễn Đức Cảnh ,Phường Thành Vinh, Tỉnh Nghệ An</p>
                    <p className="text-gray-600 text-xs">☎️ 0238.3.59.58.59 - 0912.22.10.11</p>
                    <p className="text-gray-600 text-xs">🌐 www.qvc.vn | 📧 sales@qvc.vn</p>
                </div>
            </div>
        )}

        {/* ================= TIÊU ĐỀ PHIẾU ================= */}
        <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-wider mb-2">
                {isTechnical ? 'BẢNG THÔNG SỐ KỸ THUẬT' : 'BẢNG BÁO GIÁ'}
            </h2>
            <p className="text-gray-500 italic text-xs">
                Số: <span className="font-bold text-gray-700">{data.code}</span> &nbsp;|&nbsp; 
                Ngày: <span className="font-bold text-gray-700">{new Date(data.date).toLocaleDateString('vi-VN')}</span>
            </p>
        </div>
        
        {/* ================= THÔNG TIN KHÁCH HÀNG (BOX) ================= */}
        <div className={`mb-6 rounded-lg border border-gray-200 ${isMinimal ? 'p-3' : 'bg-gray-50 p-5'}`}>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="font-bold text-blue-800 uppercase text-[10px] mb-1 tracking-wider">Kính gửi khách hàng:</p>
                    <p className="text-base font-bold text-gray-900">{data.customer_name || 'Quý khách hàng'}</p>
                    <p className="text-xs text-gray-600 mt-1"><span className="font-semibold">Địa chỉ:</span> {data.customer_address || '---'}</p>
                    <p className="text-xs text-gray-600"><span className="font-semibold">Điện thoại:</span> {data.customer_phone || '---'}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-blue-800 uppercase text-[10px] mb-1 tracking-wider">Nhân viên kinh doanh:</p>
                    <p className="text-base font-bold text-gray-900">{data.creator_name || 'BP Kinh Doanh'}</p>
                    <p className="text-xs text-gray-600 mt-1">Hotline: 0912.22.10.11</p>
                    <p className="text-xs text-gray-600">Email: sales@qvc.vn</p>
                </div>
            </div>
        </div>

        {/* ================= BẢNG SẢN PHẨM ================= */}
        <table className="w-full mb-6 border-collapse overflow-hidden rounded-t-lg">
          <thead>
            <tr className="bg-blue-900 text-white text-xs uppercase tracking-wider">
              <th className="py-3 px-2 border border-blue-900 w-12 text-center">STT</th>
              {isImages && <th className="py-3 px-2 border border-blue-900 w-24 text-center">Hình ảnh</th>}
              <th className="py-3 px-3 border border-blue-900 text-left">Tên hàng hóa / Quy cách</th>
              <th className="py-3 px-2 border border-blue-900 w-16 text-center">ĐVT</th>
              <th className="py-3 px-2 border border-blue-900 w-16 text-center">SL</th>
              {!isTechnical && (
                <>
                  <th className="py-3 px-2 border border-blue-900 w-28 text-right">Đơn giá</th>
                  <th className="py-3 px-2 border border-blue-900 w-32 text-right">Thành tiền</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.items.map((item, idx) => (
              <tr key={idx} className={`border-b border-gray-200 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                {/* STT */}
                <td className="py-3 px-2 border-l border-r border-gray-200 text-center font-medium text-gray-500">{idx + 1}</td>
                
                {/* ẢNH */}
                {isImages && (
                  <td className="py-2 px-2 border-l border-r border-gray-200 text-center align-middle">
                    {item.image ? (
                        <div className="w-20 h-16 mx-auto bg-white rounded border border-gray-200 overflow-hidden flex items-center justify-center p-0.5">
                             <img 
                                src={item.image} 
                                alt="SP" 
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.src = "https://placehold.co/80x60?text=NoImg";
                                }} 
                             />
                        </div>
                    ) : (
                        <div className="w-20 h-16 mx-auto bg-gray-50 rounded flex items-center justify-center text-[9px] text-gray-300 border border-dashed">
                            No Image
                        </div>
                    )}
                  </td>
                )}

                {/* TÊN HÀNG */}
                <td className="py-3 px-3 border-l border-r border-gray-200 align-top">
                  <p className="font-bold text-gray-800 text-sm">{item.product_name}</p>
                  <div className="mt-1 space-y-0.5">
                      <p className="text-[11px] text-gray-500 font-mono">Code: {item.product_code}</p>
                      {item.warranty && <p className="text-[11px] text-blue-600 font-medium">Bảo hành: {item.warranty}</p>}
                      {item.note && <p className="text-[11px] text-gray-500 italic">Ghi chú: {item.note}</p>}
                  </div>
                </td>

                {/* ĐVT & SL */}
                <td className="py-3 px-2 border-l border-r border-gray-200 text-center text-gray-600 align-top pt-4">{item.unit}</td>
                <td className="py-3 px-2 border-l border-r border-gray-200 text-center font-bold text-gray-800 align-top pt-4">{new Intl.NumberFormat('vi-VN').format(item.quantity)}</td>
                
                {/* GIÁ & TIỀN */}
                {!isTechnical && (
                  <>
                    <td className="py-3 px-3 border-l border-r border-gray-200 text-right text-gray-700 align-top pt-4">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="py-3 px-3 border-l border-r border-gray-200 text-right font-bold text-gray-900 align-top pt-4">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          
          {/* TFOOT: TỔNG TIỀN */}
          {!isTechnical && (
            <tfoot>
              {/* Dòng Tổng tiền hàng */}
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td colSpan={isImages ? 5 : 4} className="py-3 px-4 text-right font-bold text-gray-600 uppercase text-xs">Cộng tiền hàng</td>
                <td colSpan={2} className="py-3 px-4 text-right font-bold text-base text-gray-800">
                  {formatCurrency(data.total_amount)}
                </td>
              </tr>
              
              {/* Dòng Thuế VAT & Tổng thanh toán */}
              {vatMode !== 'total_only' && (
                  <tr className="bg-blue-50 border-t border-blue-100">
                    <td colSpan={isImages ? 5 : 4} className="py-3 px-4 text-right font-bold text-blue-800 uppercase text-xs">
                        Tổng thanh toán {vatMode === 'included' ? '(Đã gồm VAT)' : '(Chưa gồm VAT)'}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-right font-black text-lg text-blue-900">
                      {/* Nếu mode=included thì giữ nguyên, excluded thì có thể nhân thêm nếu logic data chưa nhân */}
                      {formatCurrency(data.total_amount)}
                    </td>
                  </tr>
              )}
            </tfoot>
          )}
        </table>
        
        {/* ================= FOOTER: ĐIỀU KHOẢN & CHỮ KÝ ================= */}
        <div className="grid grid-cols-12 gap-8 mt-8 avoid-break">
             {/* Điều khoản */}
             <div className="col-span-7">
                {showNote && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 h-full">
                    <h4 className="font-black text-xs text-blue-900 uppercase mb-2 tracking-wide">Điều khoản thương mại & Ghi chú:</h4>
                    <ul className="text-[11px] text-gray-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                        <li>Báo giá có hiệu lực trong vòng <strong>03 ngày</strong>.</li>
                        <li>Giao hàng tại kho bên bán hoặc theo thỏa thuận.</li>
                        <li>Thanh toán 100% trước khi giao hàng hoặc theo hợp đồng.</li>
                        <li>Bảo hành theo tiêu chuẩn nhà sản xuất tại TTBH Quốc Việt.</li>
                        {data.note && <li className="font-bold text-gray-800 italic">{data.note}</li>}
                    </ul>
                </div>
                )}
            </div>

            {/* Chữ ký */}
            <div className="col-span-5 text-center">
                 {showSignatures && (
                    <div className="flex flex-col justify-between h-full min-h-[140px] border border-dashed border-gray-200 rounded-lg p-4">
                        <div>
                            <p className="font-black text-xs uppercase text-gray-800">Xác nhận của Quốc Việt</p>
                            <p className="text-[10px] text-gray-400 italic mt-1">(Ký,họ tên)</p>
                        </div>
                        <div className="mt-auto pt-8">
                            {/* Chừa chỗ ký */}
                            <p className="font-bold text-blue-900 text-sm uppercase">{data.creator_name || 'Phòng Kinh Doanh'}</p>
                        </div>
                    </div>
                 )}
            </div>
        </div>

        <div className="mt-12 text-center border-t border-gray-100 pt-2 opacity-60 text-[9px] text-gray-400">
          <p>Hệ thống quản lý báo giá - In lúc: {new Date().toLocaleString('vi-VN')}</p>
        </div>
      </div>
    );
  }
);