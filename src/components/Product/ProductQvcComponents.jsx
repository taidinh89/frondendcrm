import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Icon } from '../ui';
import { Input, Textarea } from '../ui.jsx'; // Đảm bảo đường dẫn import đúng tới file ui.jsx của bạn

// ==========================================================
// === 1. CÁC HÀM HELPER (Xuất ra để file chính dùng) ===
// ==========================================================
export const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p ?? 0) + ' đ';
export const formatDate = (dateStr) => dateStr ? new Date(dateStr).toISOString().substring(0, 10) : '';
export const isNullOrUndefined = (value) => value === null || value === undefined;

// ==========================================================
// === 2. COMPONENT CON: TabButton ===
// ==========================================================
export const TabButton = ({ title, name, activeTab, setActiveTab }) => (
    <button
        className={`px-5 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${activeTab === name
            ? 'border-blue-600 text-blue-600 bg-white'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
        onClick={() => setActiveTab(name)}
    >
        {title}
    </button>
);

// ==========================================================
// === 3. COMPONENT CON: EditableField ===
// ==========================================================
export const EditableField = ({
    label,
    value, // Thêm hỗ trợ value trực tiếp
    localValue,
    originalWebValue,
    name,
    type = 'text',
    onChange,
    onBlur,
    isUpdating,
    isCustom,
    children,
    placeholder,
    rows = 3,
    hideOriginal = false // Thêm option ẩn phần Web/Gốc
}) => {
    // Ưu tiên: value mới -> localValue -> originalWebValue
    const val = value !== undefined ? value : (!isNullOrUndefined(localValue) ? localValue : (originalWebValue || ''));

    const webValueText = type === 'number' ? formatPrice(originalWebValue) : (originalWebValue || '-');
    const displayValue = type === 'date' ? formatDate(val) : val;

    const hasChanged = !isNullOrUndefined(localValue) && String(localValue) !== String(originalWebValue || '');

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{label}</label>
            <div className={`transition-all duration-300 bg-gray-50/50 rounded-2xl border-2 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 ${hasChanged ? 'border-orange-200' : 'border-transparent'}`}>
                {isCustom ? (
                    <div className="p-4">{children}</div>
                ) : (
                    type === 'textarea' ? (
                        <textarea
                            name={name}
                            value={displayValue}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder || "Nhập nội dung..."}
                            className={`w-full p-4 bg-transparent outline-none text-sm font-bold min-h-[100px] resize-y ${name === 'specialOffer' ? 'min-h-[200px]' : ''}`}
                            disabled={isUpdating}
                            rows={rows}
                        />
                    ) : (
                        <input
                            name={name}
                            type={type}
                            value={displayValue}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder || ""}
                            className="w-full p-4 bg-transparent outline-none text-sm font-black"
                            disabled={isUpdating}
                        />
                    )
                )}
            </div>

            {!hideOriginal && originalWebValue !== undefined && (
                <div className="px-2 py-1 flex items-center justify-between">
                    <div className="text-[9px] text-gray-400 font-bold truncate">
                        <span className="opacity-60 uppercase tracking-tighter mr-1">Web:</span>
                        {String(webValueText)}
                    </div>
                    {hasChanged && <span className="text-[9px] text-orange-600 font-black uppercase tracking-tighter">Đã sửa</span>}
                </div>
            )}
        </div>
    );
};

// ==========================================================
// === 4. COMPONENT CON: ToggleSwitch ===
// ==========================================================
export const ToggleSwitch = ({ label, checked, onChange, color = 'blue' }) => {
    const colorClasses = {
        blue: 'peer-checked:bg-blue-600',
        green: 'peer-checked:bg-green-600',
        orange: 'peer-checked:bg-orange-600',
        red: 'peer-checked:bg-red-600',
    };

    return (
        <label className="flex items-center justify-between cursor-pointer group p-1">
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{label}</span>
            <div className="relative inline-flex items-center">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked == 1 || checked === true}
                    onChange={(e) => onChange(e.target.checked ? 1 : 0)}
                />
                <div className={`w-12 h-6.5 bg-gray-200/50 rounded-2xl peer ${colorClasses[color] || colorClasses.blue} peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner ring-1 ring-gray-100`}></div>
            </div>
        </label>
    );
};

// ==========================================================
// === 5. COMPONENT CON: SearchableSelect (Chọn có ảnh) ===
// ==========================================================
export const SearchableSelect = ({ label, options, value, onChange, placeholder = "Tìm kiếm...", type = 'brand', multiple = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    const filteredOptions = useMemo(() => {
        return (options || []).filter(opt =>
            (opt.name || opt.code || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);

    // Lọc các bản ghi đã chọn
    const selectedOptions = useMemo(() => {
        if (multiple) {
            const values = Array.isArray(value) ? value : (value ? String(value).split(',').filter(Boolean) : []);
            return (options || []).filter(opt => values.includes(String(opt.code)));
        }
        return (options || []).find(opt => String(opt.code) === String(value));
    }, [options, value, multiple]);

    const isSelected = (code) => {
        if (multiple) {
            const values = Array.isArray(value) ? value : (value ? String(value).split(',').filter(Boolean) : []);
            return values.includes(String(code));
        }
        return String(value) === String(code);
    };

    const handleSelect = (code) => {
        if (multiple) {
            let values = Array.isArray(value) ? [...value] : (value ? String(value).split(',').filter(Boolean) : []);
            const codeStr = String(code);
            if (values.includes(codeStr)) {
                values = values.filter(v => v !== codeStr);
            } else {
                values.push(codeStr);
            }
            onChange(values);
        } else {
            onChange(code);
            setIsOpen(false);
            setSearch('');
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col gap-1.5 w-full relative" ref={containerRef}>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{label}</label>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`transition-all duration-300 bg-gray-50/50 rounded-2xl border-2 p-3 flex items-center justify-between cursor-pointer ${isOpen ? 'bg-white border-blue-500 ring-4 ring-blue-50' : 'border-transparent hover:bg-white hover:shadow-sm'}`}
            >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className="w-8 h-8 rounded-xl bg-white border shadow-inner flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {!multiple && selectedOptions?.image ? (
                            <img src={selectedOptions.image} className="w-full h-full object-contain p-1" alt="" />
                        ) : (
                            <Icon name={type === 'brand' ? 'award' : 'folder'} className="w-4 h-4 text-gray-300" />
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1 items-center overflow-hidden">
                        {multiple ? (
                            selectedOptions.length > 0 ? (
                                selectedOptions.map(opt => (
                                    <span key={opt.code} className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-1 rounded-lg border border-blue-100 whitespace-nowrap">
                                        {opt.name}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm font-bold text-gray-400">{placeholder}</span>
                            )
                        ) : (
                            <span className={`text-sm font-black truncate ${selectedOptions ? 'text-gray-900' : 'text-gray-400 font-bold'}`}>
                                {selectedOptions?.name || placeholder}
                            </span>
                        )}
                    </div>
                </div>
                <Icon name={isOpen ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
            </div>

            {isOpen && (
                <div className="absolute z-[100] top-full mt-2 w-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn">
                    <div className="p-3 border-b bg-gray-50/50">
                        <input
                            className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-bold"
                            placeholder="Gõ để tìm nhanh..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-72 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {!multiple && (
                            <div
                                onClick={() => { onChange(''); setIsOpen(false); }}
                                className="p-3 rounded-xl text-[10px] font-black text-red-500 hover:bg-red-50 cursor-pointer text-center uppercase tracking-widest mb-1 border-b-2 border-dashed border-red-50"
                            >
                                --- BỎ CHỌN / HỦY ---
                            </div>
                        )}
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => {
                                const active = isSelected(opt.code);
                                return (
                                    <div
                                        key={opt.code}
                                        onClick={() => handleSelect(opt.code)}
                                        className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 scale-[0.98]' : 'text-gray-700 hover:bg-blue-50/50'}`}
                                    >
                                        {multiple && (
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${active ? 'bg-white border-white' : 'border-gray-200 bg-white'}`}>
                                                {active && <Icon name="check" className="w-3.5 h-3.5 text-blue-600 font-black" />}
                                            </div>
                                        )}
                                        <div className="w-8 h-8 rounded-lg bg-white border flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
                                            {opt.image ? (
                                                <img src={opt.image} className="w-full h-full object-contain p-1" alt="" />
                                            ) : (
                                                <Icon name={type === 'brand' ? 'award' : 'folder'} className={`w-4 h-4 ${active ? 'text-blue-200' : 'text-gray-300'}`} />
                                            )}
                                        </div>
                                        <span className="text-sm font-bold truncate flex-1">{opt.name}</span>
                                        {!multiple && active && <Icon name="check" className="w-4 h-4" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest italic">Không thấy dữ liệu</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


