import React, { useState, useEffect, useMemo } from 'react';
import { AnalysisCard } from '../../components/analysis/AnalysisCard.jsx';
import { Button, Icon, Input } from '../../components/ui.jsx';
import { useApiData } from '../../hooks/useApiData.jsx';
import axios from 'axios';

// ============================================================================
// 1. COMPONENT MULTI-DROP (GIỮ NGUYÊN - ĐÃ TỐI ƯU)
// ============================================================================
const MultiDrop = ({ label, opts = [], val = [], setVal }) => {
    const [open, setOpen] = useState(false);
    const [txt, setTxt] = useState('');
    
    const fOpts = useMemo(() => {
        let items = opts.filter(o => 
            String(o.name || '').toLowerCase().includes(txt.toLowerCase()) || 
            String(o.code).toLowerCase().includes(txt.toLowerCase())
        );
        return items.sort((a, b) => {
            const aS = val.includes(a.code), bS = val.includes(b.code);
            if (aS && !bS) return -1;
            if (!aS && bS) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [opts, txt, val]);

    const tog = (c) => setVal(val.includes(c) ? val.filter(i => i !== c) : [...val, c]);
    const selCount = val.length;

    return (
        <div className="relative">
            <div onClick={() => setOpen(!open)} className={`border px-3 py-2 rounded cursor-pointer text-sm flex justify-between items-center bg-white shadow-sm ${selCount ? 'border-blue-500 ring-1 ring-blue-100 text-blue-700 font-bold' : 'border-gray-300'}`}>
                <span className="truncate mr-2">{selCount ? `${label} (${selCount})` : label}</span>
                <span className="text-[10px] text-gray-400">▼</span>
            </div>
            {open && (
                <div className="absolute z-50 mt-1 w-72 bg-white border rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col animate-fadeIn">
                    <div className="p-2 border-b bg-gray-50"><input className="w-full text-xs border p-2 rounded focus:border-blue-500 outline-none" placeholder="Tìm..." value={txt} onChange={e => setTxt(e.target.value)} autoFocus /></div>
                    <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                        {fOpts.map((o, idx) => {
                            const isSel = val.includes(o.code);
                            const showDiv = !isSel && idx > 0 && val.includes(fOpts[idx - 1].code);
                            return (
                                <React.Fragment key={o.code}>
                                    {showDiv && <div className="border-t border-dashed border-gray-300 my-1 mx-2"></div>}
                                    <div onClick={() => tog(o.code)} className={`flex items-center p-2 cursor-pointer hover:bg-blue-50 text-xs rounded mb-0.5 ${isSel ? 'bg-blue-50 font-bold text-blue-700 pl-1.5 border-l-4 border-blue-500' : 'text-gray-700 pl-2.5'}`}>
                                        <div className="flex flex-col"><span>{o.name}</span>{o.name !== o.code && <span className="text-[10px] text-gray-400 font-normal">{o.code}</span>}</div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                    <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(false)}></div>
                </div>
            )}
            {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>}
        </div>
    );
};

// ============================================================================
// 2. TRANG CHÍNH
// ============================================================================
export const DictionaryManagementPage = ({ setAppTitle }) => {
    const [activeTab, setActiveTab] = useState('dictionary'); 
    useEffect(() => { setAppTitle('Cấu hình & Từ điển'); }, [setAppTitle]);

    return (
        <div className="p-6 bg-gray-100 min-h-screen space-y-6 font-sans text-gray-800">
            <div className="flex justify-center mb-6">
                <div className="bg-white p-1 rounded-lg shadow-sm inline-flex border border-gray-200">
                    <button onClick={() => setActiveTab('dictionary')} className={`px-6 py-2 text-sm font-semibold rounded-md transition-all ${activeTab==='dictionary' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>Quản lý Từ điển</button>
                    <button onClick={() => setActiveTab('presets')} className={`px-6 py-2 text-sm font-semibold rounded-md transition-all ${activeTab==='presets' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>Quản lý Nhóm Lọc</button>
                </div>
            </div>
            <div className="animate-fade-in">
                {activeTab === 'dictionary' ? <DictionaryTab /> : <PresetsTab />}
            </div>
        </div>
    );
};

// ============================================================================
// 3. TAB TỪ ĐIỂN (FIX LỖI CRASH + THÊM MỚI)
// ============================================================================
const DictionaryTab = () => {
    const { data: dictData, isLoading, refresh } = useApiData('/api/v2/dictionary/list', {}, 0);
    
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [sortOrder, setSortOrder] = useState('PENDING_FIRST');
    
    // State cho Form Sửa/Thêm
    const [editingItem, setEditingItem] = useState(null); // null = ko sửa, object = đang sửa
    const [isCreating, setIsCreating] = useState(false);  // true = đang thêm mới
    
    // State Form Data
    const [formData, setFormData] = useState({ code: '', name: '', type: 'BRAND' });
    const [isSaving, setIsSaving] = useState(false);

    // Xử lý hiển thị danh sách
    const processedData = useMemo(() => {
        if (!dictData) return [];
        let data = [...dictData];
        if (filterType !== 'ALL') data = data.filter(i => i.type === filterType);
        if (search) {
            const s = search.toLowerCase();
            data = data.filter(i => i.code.toLowerCase().includes(s) || i.current_name.toLowerCase().includes(s));
        }
        data.sort((a, b) => {
            if (sortOrder === 'NAME_AZ') return (a.current_name||a.code).localeCompare(b.current_name||b.code);
            if (sortOrder === 'CODE_AZ') return a.code.localeCompare(b.code);
            // Default: Pending First
            if (a.is_defined === b.is_defined) return a.type === b.type ? a.code.localeCompare(b.code) : a.type.localeCompare(b.type);
            return a.is_defined ? 1 : -1;
        });
        return data;
    }, [dictData, search, filterType, sortOrder]);

    // Bắt đầu Thêm mới
    const startCreate = () => {
        setIsCreating(true);
        setEditingItem(null); // Reset sửa
        setFormData({ code: '', name: '', type: 'BRAND' }); // Reset form
    };

    // Bắt đầu Sửa
    const startEdit = (item) => {
        setIsCreating(false);
        setEditingItem(item);
        setFormData({ code: item.code, name: item.current_name || item.code, type: item.type });
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingItem(null);
    };

    const handleSave = async () => {
        if (!formData.code.trim() || !formData.name.trim()) return alert("Vui lòng nhập đủ Mã và Tên");
        setIsSaving(true);
        try {
            const res = await axios.post('/api/v2/dictionary/update', {
                code: formData.code,
                name: formData.name,
                type: formData.type
            });
            
            if (res.data.success) {
                // [FIX LỖI CRASH] Kiểm tra refresh có phải function không trước khi gọi
                if (typeof refresh === 'function') {
                    refresh();
                } else {
                    // Fallback nếu hook lỗi: reload nhẹ
                    window.location.reload(); 
                }
                handleCancel();
            } else {
                alert('Lỗi Server: ' + res.data.message);
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi kết nối: ' + (e.response?.data?.message || e.message)); 
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnalysisCard title={
            <div className="flex justify-between items-center w-full">
                <span>Danh sách Mã Hệ thống & Tên Hiển thị</span>
                <Button onClick={startCreate} size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow">
                    + Thêm Mới
                </Button>
            </div>
        }>
            <div className="p-4">
                {/* TOOLBAR */}
                <div className="flex flex-col xl:flex-row gap-3 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex gap-2 flex-1">
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border p-2 rounded text-sm outline-none focus:ring-2 ring-blue-500">
                            <option value="ALL">Tất cả Loại</option>
                            <option value="BRAND">Nhóm L1 (Hãng)</option>
                            <option value="CAT_L2">Nhóm L2</option>
                            <option value="CAT_L3">Nhóm L3</option>
                        </select>
                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="border p-2 rounded text-sm outline-none focus:ring-2 ring-blue-500">
                            <option value="PENDING_FIRST">Chưa đặt tên trước</option>
                            <option value="NAME_AZ">Tên A-Z</option>
                            <option value="CODE_AZ">Mã A-Z</option>
                        </select>
                    </div>
                    <Input placeholder="🔍 Tìm kiếm..." value={search} onChange={e=>setSearch(e.target.value)} className="xl:w-80" />
                </div>

                {/* FORM THÊM MỚI (Hiện khi bấm nút Thêm) */}
                {isCreating && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm animate-fadeIn">
                        <h4 className="font-bold text-green-800 mb-3 text-sm uppercase">✨ Tạo Mã Mới (Thủ công)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Loại Nhóm</label>
                                <select 
                                    className="w-full p-2 border rounded text-sm"
                                    value={formData.type} 
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="BRAND">Nhóm L1 (Hãng)</option>
                                    <option value="CAT_L2">Nhóm L2 (Loại)</option>
                                    <option value="CAT_L3">Nhóm L3 (Chi tiết)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Mã Code (Viết tắt)</label>
                                <input 
                                    className="w-full p-2 border rounded text-sm font-mono uppercase"
                                    placeholder="VD: HUA, SAM..." 
                                    value={formData.code} 
                                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Tên Hiển thị (Tiếng Việt)</label>
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 p-2 border rounded text-sm"
                                        placeholder="VD: Huawei, Samsung..." 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    />
                                    <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white px-4">Lưu</Button>
                                    <Button onClick={handleCancel} variant="secondary" className="px-4">Hủy</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TABLE */}
                <div className="overflow-hidden border rounded-lg bg-white shadow-sm">
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Loại</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase w-48">Mã Hệ Thống</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Tên Tiếng Việt</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase w-32">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {processedData.map((item) => {
                                    const isEditing = editingItem?.unique_id === item.unique_id;
                                    return (
                                        <tr key={item.unique_id} className={`hover:bg-blue-50 transition-colors ${!item.is_defined ? 'bg-orange-50' : ''} ${isEditing ? 'bg-blue-100' : ''}`}>
                                            <td className="px-6 py-3 text-xs">
                                                <span className={`px-2 py-1 rounded border font-bold text-[10px] ${
                                                    item.type==='BRAND'?'bg-purple-100 text-purple-700 border-purple-200':
                                                    (item.type==='CAT_L2'?'bg-blue-100 text-blue-700 border-blue-200':'bg-green-100 text-green-700 border-green-200')
                                                }`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-sm font-mono font-bold text-gray-700">{item.code}</td>
                                            <td className="px-6 py-3 text-sm text-gray-900">
                                                {isEditing ? (
                                                    <input 
                                                        className="w-full p-1.5 border border-blue-500 rounded focus:ring-2 focus:ring-blue-200 outline-none" 
                                                        value={formData.name} 
                                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                                        autoFocus 
                                                        onKeyDown={e => e.key==='Enter' && handleSave()} 
                                                    />
                                                ) : (
                                                    item.current_name || <span className="text-gray-400 italic text-xs">-- Chưa đặt tên --</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right text-sm">
                                                {isEditing ? (
                                                    <div className="flex gap-1 justify-end">
                                                        <button onClick={handleSave} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Lưu</button>
                                                        <button onClick={handleCancel} className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400">Hủy</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => startEdit(item)} className="text-blue-600 hover:bg-blue-100 px-3 py-1 rounded transition-colors text-xs font-medium border border-transparent hover:border-blue-200">
                                                        Sửa
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AnalysisCard>
    );
};

// ============================================================================
// 4. TAB PRESETS (Giữ nguyên logic ổn định của version trước)
// ============================================================================
const PresetsTab = () => {
    const { data: rawOptions } = useApiData('/api/v2/dictionary/list', {}, 0);
    const { data: presets, refresh } = useApiData('/api/v2/dictionary/presets', {}, 0);
    
    const [isEditingId, setIsEditingId] = useState(null); 
    const [pName, setPName] = useState('');
    const [selBrands, setSelBrands] = useState([]);
    const [selL2, setSelL2] = useState([]);
    const [selL3, setSelL3] = useState([]);

    const options = useMemo(() => {
        if (!rawOptions) return { brands: [], l2: [], l3: [] };
        return {
            brands: rawOptions.filter(i=>i.type==='BRAND').map(i=>({code:i.code, name:i.current_name||i.code})),
            l2: rawOptions.filter(i=>i.type==='CAT_L2').map(i=>({code:i.code, name:i.current_name||i.code})),
            l3: rawOptions.filter(i=>i.type==='CAT_L3').map(i=>({code:i.code, name:i.current_name||i.code})),
        };
    }, [rawOptions]);

    const resetForm = () => { setIsEditingId(null); setPName(''); setSelBrands([]); setSelL2([]); setSelL3([]); };

    const handleEdit = (p) => {
        setIsEditingId(p.id); setPName(p.name);
        setSelBrands(p.filter_config.brand || []);
        setSelL2(p.filter_config.category || []);
        setSelL3(p.filter_config.l3 || []);
    };

    const handleSubmit = async () => {
        if (!pName.trim()) return alert('Thiếu tên nhóm');
        if (selBrands.length===0 && selL2.length===0 && selL3.length===0) return alert('Chọn ít nhất 1 điều kiện');
        const payload = { name: pName, filter_config: { brand: selBrands, category: selL2, l3: selL3 } };
        const url = isEditingId ? `/api/v2/dictionary/preset/update/${isEditingId}` : '/api/v2/dictionary/preset/save';
        try { await axios.post(url, payload); refresh(); resetForm(); } catch (e) { alert('Lỗi: ' + (e.response?.data?.message || e.message)); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa nhóm này?')) return;
        try { await axios.delete(`/api/v2/dictionary/preset/${id}`); refresh(); } catch(e){}
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
                <AnalysisCard title={isEditingId ? `✏️ Đang sửa: ${pName}` : "➕ Tạo Nhóm Mới"}>
                    <div className="p-5 space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Tên Nhóm (Gợi nhớ)</label>
                            <Input value={pName} onChange={e=>setPName(e.target.value)} placeholder="VD: Điện lạnh Cao Cấp 2025..." className="font-semibold text-gray-800" />
                        </div>
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 mb-2"><div className="h-px flex-1 bg-gray-200"></div><span className="text-xs text-gray-400 font-medium">CẤU HÌNH BỘ LỌC</span><div className="h-px flex-1 bg-gray-200"></div></div>
                            <MultiDrop label="Nhóm L1 (Hãng)" opts={options.brands} val={selBrands} setVal={setSelBrands} />
                            <MultiDrop label="Nhóm L2 (Loại)" opts={options.l2} val={selL2} setVal={setSelL2} />
                            <MultiDrop label="Nhóm L3 (Chi tiết)" opts={options.l3} val={selL3} setVal={setSelL3} />
                        </div>
                        <div className="pt-6 flex gap-2">
                            <Button onClick={handleSubmit} className={`flex-1 h-10 shadow-md ${isEditingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold tracking-wide`}>
                                {isEditingId ? 'CẬP NHẬT' : 'LƯU MỚI'}
                            </Button>
                            {isEditingId && <Button onClick={resetForm} variant="secondary" className="px-4 h-10">Hủy</Button>}
                        </div>
                    </div>
                </AnalysisCard>
            </div>
            <div className="lg:col-span-8">
                <AnalysisCard title="📂 Danh sách Nhóm đã tạo">
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {presets?.map(p => (
                            <div key={p.id} className={`border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-all relative group ${isEditingId===p.id ? 'ring-2 ring-orange-400 bg-orange-50' : 'hover:border-blue-300'}`}>
                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={()=>handleEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="Sửa"><Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" className="w-4 h-4"/></button>
                                    <button onClick={()=>handleDelete(p.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition-colors" title="Xóa"><Icon path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" className="w-4 h-4"/></button>
                                </div>
                                <h3 className="font-bold text-gray-800 text-lg mb-3 flex items-center gap-2">{p.name}{isEditingId===p.id && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase tracking-wide">Đang sửa</span>}</h3>
                                <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {p.filter_config.brand?.length > 0 && <div className="flex gap-2"><span className="font-semibold text-purple-600 min-w-[30px]">L1:</span> <span className="truncate text-gray-800">{p.filter_config.brand.join(', ')}</span></div>}
                                    {p.filter_config.category?.length > 0 && <div className="flex gap-2"><span className="font-semibold text-blue-600 min-w-[30px]">L2:</span> <span className="truncate text-gray-800">{p.filter_config.category.join(', ')}</span></div>}
                                    {p.filter_config.l3?.length > 0 && <div className="flex gap-2"><span className="font-semibold text-green-600 min-w-[30px]">L3:</span> <span className="truncate text-gray-800">{p.filter_config.l3.join(', ')}</span></div>}
                                    {(!p.filter_config.brand?.length && !p.filter_config.category?.length && !p.filter_config.l3?.length) && <span className="text-gray-400 italic">Chưa có cấu hình lọc</span>}
                                </div>
                            </div>
                        ))}
                        {presets?.length === 0 && <div className="col-span-2 text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">Chưa có nhóm nào được tạo. Hãy thêm mới bên trái.</div>}
                    </div>
                </AnalysisCard>
            </div>
        </div>
    );
};