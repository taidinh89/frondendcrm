// src/pages/QuotationForm.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';
import { CustomerSearch } from '../components/CustomerSearch';
import { ProductSearch } from '../components/ProductSearch';
import { EmployeeSearch } from '../components/EmployeeSearch';
import { QuotationPrintTemplate } from '../components/QuotationPrintTemplate';
import { 
    Maximize2, X, Star, ChevronDown, Plus, 
    FileText, Trash2, Calendar, ChevronUp
} from 'lucide-react';

export const QuotationForm = ({ setAppTitle, quotationIdentifier }) => {
  // --- 1. STATE DỮ LIỆU ---
  const [customer, setCustomer] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [isInfoCardCollapsed, setIsInfoCardCollapsed] = useState(false);
  
  // Form Data
  const [warehouseId, setWarehouseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vatInvoice, setVatInvoice] = useState('');
  const [note, setNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  // Chi tiết sản phẩm
  const [items, setItems] = useState([]);
  const [taxRate, setTaxRate] = useState(10); 

  // --- 2. INIT DATA ---
  useEffect(() => {
    const fetchMasterData = async () => {
        try {
            const whRes = await axios.get('/api/v1/warehouses');
            const whData = whRes.data.data || whRes.data;
            setWarehouses(whData);

            // Find and set default warehouse by its code
            const defaultWarehouseCode = "02";
            const defaultWarehouse = whData.find(w => (w.code || w.warehouse_code) === defaultWarehouseCode);
            
            if (defaultWarehouse) {
                setWarehouseId(defaultWarehouse.id);
            } else if (whData.length > 0) {
                // Fallback to the first one if not found
                setWarehouseId(whData[0].id);
            }
        } catch (err) {
            console.error("Lỗi tải danh mục:", err);
        }
    };
    fetchMasterData();
    if (setAppTitle) setAppTitle("Tạo Báo Giá Mới");
  }, [setAppTitle]);

  // --- 3. LOGIC NGHIỆP VỤ ---

  // [QUAN TRỌNG] Tìm ra 'code' của kho để truyền xuống component tìm kiếm
  const selectedWarehouseCode = useMemo(() => {
      if (!warehouses.length || !warehouseId) return '';
      const wh = warehouses.find(w => w.id == warehouseId); 
      return wh ? (wh.code || wh.warehouse_code) : '';
  }, [warehouses, warehouseId]);

  // Auto-fill địa chỉ
  useEffect(() => {
    if (customer) {
      setDeliveryAddress(customer.dia_chi_cong_ty_1 || customer.address || '');
    }
  }, [customer]);

  // Tính toán tiền
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [items]);
  const grandTotal = subtotal * (1 + taxRate / 100);

  // --- 4. HANDLERS ---

    const handleAddProduct = (product) => {
        setItems(prevItems => {
            const newItem = { 
                ...product, 
                rowId: `${product.id}_${Date.now()}`, 
                quantity: 1, 
                discount: 0, 
                note: '', 
                serial: '' 
            };
            const existingIndex = prevItems.findIndex(p => p.id === product.id && p.price === product.price);
            if (existingIndex > -1) {
                 const updatedItems = [...prevItems];
                 updatedItems[existingIndex] = {
                     ...updatedItems[existingIndex],
                     quantity: updatedItems[existingIndex].quantity + 1
                 };
                 return updatedItems;
            }
            return [...prevItems, newItem];
        });
    };

    const handleRemoveItem = (itemToRemove) => {
        setItems(prev => prev.filter(item => {
            if (item.rowId && itemToRemove.rowId) {
                return item.rowId !== itemToRemove.rowId;
            }
            return item.id !== itemToRemove.id;
        }));
    };

    const handleUpdateItem = (itemToUpdate, field, value) => {
        setItems(prev => prev.map(item => {
            const isMatch = (item.rowId && itemToUpdate.rowId) 
                ? item.rowId === itemToUpdate.rowId 
                : item.id === itemToUpdate.id;
            if (isMatch) return { ...item, [field]: value };
            return item;
        }));
    };

    const handleSave = async () => {
        const payload = {
            customer_id: customer?.id || customer?.ma_khncc,
            warehouse_id: warehouseId,
            staff_id: employee?.id,
            order_date: date,
            items: items,
            note: note,
            internal_note: internalNote,
            delivery_address: deliveryAddress
        };
        console.log("Saving:", payload);
        alert("Đang xử lý lưu...");
    };

    // --- PRINTING LOGIC ---
    const printRef = useRef();
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    const printSettings = {
        templateType: 'standard',
        showCompanyInfo: true,
        showSignatures: true,
        showNote: true,
        vatMode: 'included',
    };

    const quotationDataForPrint = {
        code: quotationIdentifier || 'QT-NEW-2025',
        date: date,
        customer_name: customer?.name || customer?.customer_name || 'Khách lẻ',
        customer_phone: customer?.dien_thoai || customer?.phone,
        customer_address: deliveryAddress,
        creator_name: employee?.name || employee?.ten_nhan_vien || 'Kinh doanh',
        note: note,
        total_amount: grandTotal,
        items: items.map(item => ({
            product_code: item.sku,
            product_name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            price: item.price,
            note: item.note,
        })),
    };

  // --- 5. RENDER (GIAO DIỆN DESIGN GỐC) ---
  return (
    <div className="max-w-[1400px] mx-auto bg-white shadow-xl rounded-lg overflow-hidden flex flex-col h-[calc(100vh-2rem)] font-sans">
      <div style={{ display: 'none' }}>
        <QuotationPrintTemplate ref={printRef} data={quotationDataForPrint} settings={printSettings} />
      </div>
      
      {/* --- TOP BAR (XANH DƯƠNG) --- */}
      <div className="bg-blue-600 h-8 flex items-center justify-between px-2 select-none">
          <div className="text-white text-xs font-semibold pl-2">Bán hàng mới</div>
          <div className="flex gap-2">
              <Maximize2 size={14} className="text-white opacity-75 hover:opacity-100 cursor-pointer" />
              <X size={14} className="text-white opacity-75 hover:opacity-100 cursor-pointer" />
          </div>
      </div>

      {/* --- HEADER ACTIONS --- */}
      <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex items-center gap-2">
            <Star className="text-yellow-500 fill-current" size={18} />
            <h1 className="text-lg font-bold text-gray-800">Bán hàng mới</h1>
        </div>
        <div className="flex gap-2">
            <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm">Tùy chọn</button>
            <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm">Trợ giúp</button>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="px-4 pt-3 pb-1 flex gap-2 border-b border-gray-200 bg-white">
        <div className="bg-blue-600 text-white px-4 py-1.5 rounded-t-md text-sm font-medium flex items-center gap-2 shadow-sm cursor-default">
            Bán hàng mới 2025 <ChevronDown size={14} />
        </div>
        <div className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-t-md text-sm font-medium flex items-center gap-2 hover:bg-gray-200 cursor-pointer border-t border-r border-l border-gray-200 transition-colors">
            Hóa đơn 1 <ChevronDown size={14} />
        </div>
        <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-t-md text-sm font-medium hover:bg-gray-200 cursor-pointer border-t border-r border-l border-gray-200">
            <Plus size={16} />
        </div>
      </div>

      {/* --- FORM AREA (SCROLLABLE) --- */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
          
          {/* INFO CARD */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
            <div 
              className="px-5 py-3 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50"
              onClick={() => setIsInfoCardCollapsed(!isInfoCardCollapsed)}
            >
              <h3 className="text-base font-semibold text-gray-700">Thông tin chung</h3>
              <button className="text-gray-500 hover:text-gray-700">
                {isInfoCardCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>

            {!isInfoCardCollapsed && (
              <div className="p-5">
                <div className="grid grid-cols-12 gap-x-6 gap-y-4 text-sm">
                
                    {/* Row 1: Khách hàng */}
                    <div className="col-span-12 md:col-span-12 flex items-center">
                        <label className="w-32 md:w-40 text-gray-600 font-semibold">Khách hàng/NCC</label>
                        <div className="flex-1">
                            <CustomerSearch selectedCustomer={customer} onSelect={setCustomer} />
                        </div>
                    </div>

                    {/* Row 2: Kho & Ngày */}
                    <div className="col-span-12 md:col-span-6 flex items-center">
                        <label className="w-32 md:w-40 text-gray-600 font-semibold">Kho xuất hàng</label>
                        <div className="flex-1 flex gap-1">
                            {/* Input hiển thị mã kho (Readonly) */}
                            <div className="w-24 relative">
                                 <input type="text" value={selectedWarehouseCode} readOnly className="w-full border border-gray-300 rounded px-2 py-1.5 bg-gray-100 text-gray-500 font-mono text-xs text-center" title="Mã kho hệ thống" />
                            </div>
                            <select 
                                className="flex-1 border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                value={warehouseId}
                                onChange={(e) => setWarehouseId(e.target.value)}
                            >
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.warehouse_name || w.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="col-span-12 md:col-span-6 flex items-center md:pl-8">
                         <label className="w-24 text-gray-600 font-semibold">Ngày</label>
                         <div className="flex-1 relative">
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                         </div>
                    </div>

                    {/* Row 3: Hóa đơn & Nhân viên */}
                    <div className="col-span-12 md:col-span-6 flex items-center">
                        <label className="w-32 md:w-40 text-gray-600 font-semibold">Hóa đơn GTGT</label>
                        <input 
                            type="text" 
                            placeholder="Số hóa đơn..."
                            value={vatInvoice}
                            onChange={(e) => setVatInvoice(e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none" 
                        />
                    </div>
                    <div className="col-span-12 md:col-span-6 flex items-center md:pl-8">
                         <label className="w-24 text-gray-600 font-semibold">Phụ trách</label>
                         <div className="flex-1">
                            <EmployeeSearch selectedEmployee={employee} onSelect={setEmployee} />
                         </div>
                    </div>

                    {/* Row 4: Ghi chú */}
                    <div className="col-span-12 flex items-center">
                        <label className="w-32 md:w-40 text-gray-600 font-semibold">Ghi chú phiếu</label>
                        <input 
                            type="text" 
                            placeholder="Ghi chú in trên phiếu..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    
                    {/* Row 5: Ghi chú nội bộ */}
                    <div className="col-span-12 flex items-center">
                        <label className="w-32 md:w-40 text-gray-600 font-semibold">Ghi chú nội bộ</label>
                        <input 
                            type="text" 
                            placeholder="Thông tin nội bộ (không in)..."
                            value={internalNote}
                            onChange={(e) => setInternalNote(e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none bg-yellow-50"
                        />
                    </div>

                    {/* Row 6: Địa chỉ */}
                    <div className="col-span-12 flex items-center">
                        <label className="w-32 md:w-40 text-gray-600 font-semibold">Địa chỉ giao</label>
                        <input 
                            type="text" 
                            placeholder="Địa chỉ giao hàng..."
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
              </div>
            )}
          </div>

          {/* TABLE SECTION */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col min-h-[400px]">
             
             {/* Toolbar */}
             <div className="border-b border-gray-200 p-2 flex flex-wrap gap-2 items-center bg-gray-50/80">
                 {['Tìm(F3)', 'Sắp xếp', 'Xem GD', 'Tải phiếu', 'Mua hàng', 'Lưu tạm', 'Giảm giá'].map(btn => (
                     <button key={btn} className="bg-white border border-gray-300 rounded px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-sm">
                        {btn}
                     </button>
                 ))}
                 <div className="flex-1"></div>
             </div>

             {/* PRODUCT SEARCH BAR */}
             <div className="p-3 border-b border-gray-200 bg-blue-50/30">
                 <ProductSearch 
                    onAddProduct={handleAddProduct} 
                    selectedWarehouseCode={selectedWarehouseCode} 
                 />
             </div>

             {/* TABLE CONTENT */}
             <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200 border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="w-10 px-2 py-2 border-r border-gray-200 text-center"><input type="checkbox" className="rounded" /></th>
                            <th className="w-10 px-2 py-2 border-r border-gray-200"></th>
                            <th className="px-4 py-2 border-r border-gray-200 text-left text-xs font-bold text-gray-600 uppercase">Mã hàng</th>
                            <th className="px-4 py-2 border-r border-gray-200 text-left text-xs font-bold text-gray-600 uppercase w-1/3">Tên hàng</th>
                            <th className="px-4 py-2 border-r border-gray-200 text-center text-xs font-bold text-gray-600 uppercase w-20">ĐVT</th>
                            <th className="px-4 py-2 border-r border-gray-200 text-right text-xs font-bold text-gray-600 uppercase w-24">SL</th>
                            <th className="px-4 py-2 border-r border-gray-200 text-right text-xs font-bold text-gray-600 uppercase w-32">Đơn giá</th>
                            <th className="px-4 py-2 border-r border-gray-200 text-right text-xs font-bold text-gray-600 uppercase w-32">Thành tiền</th>
                            <th className="px-4 py-2 border-r border-gray-200 text-left text-xs font-bold text-gray-600 uppercase">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                         {items.length === 0 ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="h-10">
                                    <td className="border-r border-gray-100 bg-gray-50 px-2 text-center text-xs text-gray-400">{i + 1}</td>
                                    <td className="border-r border-gray-100"></td>
                                    <td className="border-r border-gray-100"></td>
                                    <td className="border-r border-gray-100"></td>
                                    <td className="border-r border-gray-100"></td>
                                    <td className="border-r border-gray-100"></td>
                                    <td className="border-r border-gray-100"></td>
                                    <td className="border-r border-gray-100"></td>
                                    <td className="border-r border-gray-100"></td>
                                </tr>
                            ))
                         ) : (
                            items.map((item, index) => (
                                <tr key={item.rowId} className="hover:bg-blue-50 group transition-colors">
                                    <td className="px-2 py-1 border-r border-gray-200 text-center">
                                        <div className="bg-gray-100 border border-gray-300 w-5 h-5 flex items-center justify-center text-xs text-gray-600 rounded-sm mx-auto">
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1 border-r border-gray-200 text-center">
                                        <button onClick={() => handleRemoveItem(item)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-1 border-r border-gray-200 font-medium text-gray-700">{item.sku}</td>
                                    <td className="px-4 py-1 border-r border-gray-200">{item.name}</td>
                                    <td className="px-4 py-1 border-r border-gray-200 text-center">{item.unit}</td>
                                    <td className="px-4 py-1 border-r border-gray-200 p-0">
                                        <input 
                                            type="number"
                                            className="w-full h-full text-right border-0 bg-transparent focus:ring-2 focus:ring-inset focus:ring-blue-500 text-sm font-semibold text-gray-900 px-2 py-1.5"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateItem(item, 'quantity', parseInt(e.target.value, 10) || 0)}
                                        />
                                    </td>
                                    <td className="px-4 py-1 border-r border-gray-200 p-0">
                                        <input
                                            type="number"
                                            className="w-full h-full text-right border-0 bg-transparent focus:ring-2 focus:ring-inset focus:ring-blue-500 text-sm font-semibold text-gray-900 px-2 py-1.5"
                                            value={item.price}
                                            onChange={(e) => handleUpdateItem(item, 'price', parseFloat(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td className="px-4 py-1 border-r border-gray-200 text-right font-bold text-blue-800">
                                        {new Intl.NumberFormat('vi-VN').format(item.price * item.quantity)}
                                    </td>
                                    <td className="px-4 py-1 border-r border-gray-200 p-0">
                                        <input 
                                            type="text"
                                            className="w-full h-full border-0 bg-transparent focus:ring-2 focus:ring-inset focus:ring-blue-500 text-sm italic text-gray-500 px-2"
                                            placeholder="..."
                                            value={item.note}
                                            onChange={(e) => handleUpdateItem(item, 'note', e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))
                         )}
                    </tbody>
                </table>
             </div>
             
             {/* Total Bar */}
             <div className="bg-gray-100 border-t border-gray-200 p-3 flex justify-end gap-8 text-sm font-medium text-gray-700 pr-8">
                <div>Cộng tiền hàng: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}</div>
                <div className="text-blue-700 font-bold text-lg">Tổng thanh toán: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(grandTotal)}</div>
             </div>
          </div>
      </div>

      {/* --- FOOTER ACTIONS --- */}
      <div className="bg-white border-t border-gray-200 p-3 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
           <div className="flex gap-2">
                <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors">
                    <FileText size={18} />
                </button>
           </div>
           
           <div className="flex gap-2">
                <div className="relative group">
                    <button onClick={handleSave} className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium py-2 px-6 rounded flex items-center gap-2 shadow-md transition-colors">
                        Lưu (F8)
                        <div className="border-l border-blue-600 pl-2 ml-2">
                            <ChevronDown size={14} />
                        </div>
                    </button>
                </div>
                
                <button onClick={handlePrint} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium py-2 px-4 rounded shadow-sm transition-colors">
                    Lưu & In (F7)
                </button>
                
                <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium py-2 px-4 rounded shadow-sm transition-colors">
                    Nhập lại
                </button>
                
                <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium py-2 px-4 rounded shadow-sm transition-colors">
                    Đóng
                </button>
           </div>
      </div>
    </div>
  );
};
