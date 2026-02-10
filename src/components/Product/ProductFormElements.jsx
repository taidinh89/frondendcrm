import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '../ui';

// --- HIỆU ỨNG PHONG CÁCH TƯƠNG LAI ---
export const SectionHeader = ({ title, icon, color = "blue" }) => {
    const colors = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        green: "text-green-600 bg-green-50 border-green-100",
        orange: "text-orange-600 bg-orange-50 border-orange-100",
        purple: "text-purple-600 bg-purple-50 border-purple-100",
        red: "text-red-600 bg-red-50 border-red-100"
    };
    return (
        <div className={`flex items-center gap-2 p-2 px-4 rounded-2xl border mb-4 ${colors[color] || colors.blue}`}>
            <Icon name={icon} className="w-4 h-4" />
            <h3 className="text-[11px] font-black uppercase tracking-widest">{title}</h3>
        </div>
    );
};

export const FormField = ({ label, name, value, onChange, type = "text", placeholder, options, multiple = false, isBrand = false, onManage, isDirty = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const out = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', out);
        return () => document.removeEventListener('mousedown', out);
    }, []);

    const filtered = useMemo(() => {
        if (!options) return [];
        return options.filter(o => {
            const searchStr = (o.name || o.proName || '').toLowerCase();
            return searchStr.includes(search.toLowerCase()) || String(o.code || o.id).includes(search);
        });
    }, [options, search]);

    const selectedItems = useMemo(() => {
        if (!options || !value) return [];
        const vals = Array.isArray(value) ? value.map(String) : String(value).split(',').filter(Boolean);
        return options.filter(o => vals.includes(String(o.code || o.id)));
    }, [value, options]);

    return (
        <div className="space-y-1.5 w-full group relative" ref={ref}>
            <div className="flex items-center justify-between px-1">
                <label className={`text-[9px] font-black uppercase tracking-[0.1em] transition-colors ${isDirty ? 'text-orange-600' : 'text-gray-500 group-focus-within:text-indigo-600'}`}>
                    {label} {isDirty && <span className="ml-1 text-orange-500 animate-pulse">●</span>}
                </label>
                {type === 'select' && onManage && (
                    <button type="button" onClick={onManage} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 hover:underline transition-all uppercase">Quản lý</button>
                )}
            </div>

            {type === 'select' ? (
                <div className="relative">
                    <div
                        onClick={() => setIsOpen(!isOpen)}
                        className={`w-full min-h-[64px] px-5 py-3 bg-gray-50/50 border-2 rounded-[1.75rem] flex items-center justify-between transition-all cursor-pointer 
                            ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-50 bg-white' : (isDirty ? 'border-orange-300 bg-orange-50/20' : 'border-gray-100 hover:bg-white hover:border-indigo-100 shadow-sm')}`}
                    >
                        <div className="flex flex-wrap gap-2 overflow-hidden flex-1 mr-2">
                            {multiple ? (
                                selectedItems.length > 0 ? (
                                    selectedItems.map(item => (
                                        <div key={item.code || item.id} className="flex items-center gap-1.5 pl-2 pr-1 py-1.5 bg-indigo-600 text-white rounded-xl shadow-md animate-scaleIn">
                                            <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px]">{item.name || item.proName}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const oCode = String(item.code || item.id);
                                                    const vals = (Array.isArray(value) ? value : String(value).split(',').filter(Boolean))
                                                        .filter(v => String(v) !== oCode);
                                                    onChange(vals);
                                                }}
                                                className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                            >
                                                <Icon name="plus" className="w-3 h-3 rotate-45" />
                                            </button>
                                        </div>
                                    ))
                                ) : <span className="text-sm font-black text-gray-300">{placeholder}</span>
                            ) : (
                                <div className="flex items-center gap-3">
                                    {value && (
                                        <div className="w-8 h-8 rounded-xl bg-white overflow-hidden flex-shrink-0 flex items-center justify-center p-1.5 shadow-sm border border-gray-100">
                                            {selectedItems[0]?.image ? (
                                                <img src={selectedItems[0].image} className="w-full h-full object-contain" alt="" />
                                            ) : <Icon name={isBrand ? "award" : "folder"} className="w-4 h-4 text-indigo-300" />}
                                        </div>
                                    )}
                                    <span className={`text-sm font-black truncate ${!value ? 'text-gray-300' : 'text-gray-900 group-hover:text-indigo-600'}`}>
                                        {selectedItems[0]?.name || selectedItems[0]?.proName || placeholder}
                                    </span>
                                </div>
                            )}
                        </div>
                        <Icon name={isOpen ? "chevronUp" : "chevronDown"} className={`w-4 h-4 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'text-indigo-600' : 'text-gray-400'}`} />
                    </div>

                    {isOpen && (
                        <div className="absolute z-[1000] bottom-full lg:bottom-auto lg:top-[110%] mb-2 lg:mb-0 left-0 right-0 min-w-[320px] lg:min-w-[450px] bg-white border-2 border-indigo-50 rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] overflow-hidden animate-slideUp">
                            <div className="p-5 border-b bg-gray-50/50 backdrop-blur-xl flex gap-4">
                                <div className="relative flex-1">
                                    <input
                                        autoFocus
                                        className="w-full p-4 pl-12 bg-white border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-black outline-none transition-all shadow-sm placeholder:text-gray-300"
                                        placeholder="Tìm nhanh..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                    <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                </div>
                            </div>
                            <div className="max-h-[350px] overflow-y-auto p-3 space-y-1.5 custom-scrollbar bg-white">
                                {filtered.length > 0 ? filtered.map(o => {
                                    const oCode = String(o.code || o.id);
                                    const isSel = multiple
                                        ? (Array.isArray(value) ? value.map(String).includes(oCode) : (value ? String(value).split(',').filter(Boolean).includes(oCode) : false))
                                        : String(value) === oCode;

                                    return (
                                        <div
                                            key={oCode}
                                            onClick={() => {
                                                if (multiple) {
                                                    let vals = Array.isArray(value) ? [...value].map(String) : (value ? String(value).split(',').filter(Boolean) : []);
                                                    if (vals.includes(oCode)) {
                                                        vals = vals.filter(v => v !== oCode);
                                                    } else {
                                                        vals.push(oCode);
                                                    }
                                                    onChange(vals);
                                                } else {
                                                    onChange(oCode);
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`p-4 rounded-2xl cursor-pointer flex items-center gap-5 transition-all group/item ${isSel ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[0.98]' : 'hover:bg-indigo-50 border border-transparent hover:border-indigo-100'}`}
                                        >
                                            <div className="w-12 h-12 bg-white border rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center p-2 shadow-sm group-hover/item:scale-110 transition-transform">
                                                {o.image ? (
                                                    <img src={o.image} className="w-full h-full object-contain" alt="" />
                                                ) : <Icon name={isBrand ? "award" : "folder"} className={`w-6 h-6 ${isSel ? 'text-indigo-400' : 'text-gray-200'}`} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-black truncate group-hover/item:translate-x-1 transition-transform">{o.name || o.proName}</div>
                                                <div className={`text-[10px] font-black uppercase tracking-wider ${isSel ? 'text-white/60' : 'text-gray-400'}`}>ID: #{oCode}</div>
                                            </div>
                                            {isSel && (
                                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                                    <Icon name="check" className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="py-20 flex flex-col items-center justify-center gap-5 opacity-40">
                                        <Icon name="search" className="w-16 h-16 text-indigo-300" />
                                        <span className="text-xs font-black uppercase tracking-widest text-indigo-900">Không tìm thấy</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 bg-gray-50/80 backdrop-blur-md border-t flex justify-between items-center px-8">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filtered.length} kết quả</span>
                                <button type="button" onClick={() => { setIsOpen(false); onManage?.(); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100">
                                    <Icon name="plus" className="w-3 h-3" /> QUẢN LÝ
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : type === 'textarea' ? (
                <textarea
                    className={`w-full p-4 bg-white border-2 rounded-2xl text-sm font-bold text-gray-800 placeholder:text-gray-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none min-h-[160px] resize-y shadow-sm
                        ${isDirty ? 'border-orange-300 bg-orange-50/10' : 'border-gray-100'}`}
                    placeholder={placeholder}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                />
            ) : (
                <input
                    type={type}
                    className={`w-full p-4 bg-white border-2 rounded-2xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none shadow-sm
                        ${isDirty ? 'border-orange-300 bg-orange-50/10' : 'border-gray-100'}`}
                    placeholder={placeholder}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                />
            )}
        </div>
    );
};

export const ToggleField = ({ label, checked, onChange, color = "indigo", isDirty = false }) => {
    const colors = {
        indigo: "peer-checked:bg-indigo-600",
        green: "peer-checked:bg-green-600",
        orange: "peer-checked:bg-orange-600",
        red: "peer-checked:bg-red-600",
        blue: "peer-checked:bg-blue-600",
        purple: "peer-checked:bg-purple-600"
    };
    return (
        <label className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer hover:bg-white border-2 transition-all ${isDirty ? 'bg-orange-50/40 border-orange-200' : 'bg-gray-50 border-transparent hover:border-gray-100'}`}>
            <span className={`text-xs font-black uppercase tracking-widest ${isDirty ? 'text-orange-700' : 'text-gray-600'}`}>
                {label} {isDirty && <span className="ml-1 text-orange-500">●</span>}
            </span>
            <div className="relative inline-flex items-center">
                <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className={`w-12 h-6 bg-gray-300 rounded-full peer ${colors[color] || colors.indigo} peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-sm`}></div>
            </div>
        </label>
    );
};
