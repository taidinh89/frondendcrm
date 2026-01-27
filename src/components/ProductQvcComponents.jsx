import React from 'react';
import { Input, Textarea } from './ui.jsx'; // Đảm bảo đường dẫn import đúng tới file ui.jsx của bạn

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
// === 3. COMPONENT CON: EditableField (Xử lý ô nhập liệu) ===
// ==========================================================
export const EditableField = ({
    label,
    webValue,
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
    rows = 3
}) => {

    // Logic hiển thị giá trị mặc định nếu chưa sửa (fallback về giá trị gốc)
    const inputValue = !isNullOrUndefined(localValue) ? localValue : (originalWebValue || '');

    const webValueText = type === 'number' ? formatPrice(originalWebValue) : (originalWebValue || '-');
    const displayValue = type === 'date' ? formatDate(inputValue) : inputValue;

    // Logic so sánh để hiện chữ (Đã sửa)
    const localValueStr = String(inputValue);
    const originalWebValueStr = String(originalWebValue || '');
    const hasChanged = localValueStr !== originalWebValueStr;

    // Tăng chiều cao cho textarea đặc biệt (như specialOffer)
    const textareaClass = name === 'specialOffer' ? "min-h-[250px]" : "min-h-[100px]";

    return (
        <div className="col-span-1 border rounded-lg p-3 bg-white shadow-sm h-full flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

            <div className="flex-1 flex items-start space-x-2">
                {isCustom ? children : (
                    type === 'textarea' ? (
                        <Textarea
                            name={name}
                            value={displayValue}
                            onChange={onChange}
                            onBlur={onBlur}
                            placeholder={placeholder || "Nhập nội dung..."}
                            className={`w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y ${textareaClass}`}
                            disabled={isUpdating}
                            rows={rows}
                        />
                    ) : (
                        <Input
                            name={name}
                            type={type}
                            value={displayValue}
                            onChange={onChange}
                            onBlur={onBlur}
                            placeholder={placeholder || ""}
                            className="flex-1"
                            disabled={isUpdating}
                            {...(type === 'number' ? { min: 0 } : {})}
                        />
                    )
                )}
            </div>

            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                <span className="font-semibold">Web/Gốc:</span>
                <span className="ml-1 line-clamp-1 inline-block align-bottom" title={String(webValueText)}>
                    {String(webValueText).substring(0, 50)}{String(webValueText).length > 50 ? '...' : ''}
                </span>
                {hasChanged && <span className="ml-2 text-red-500 font-bold text-[10px] uppercase tracking-wider">(Đã sửa)</span>}
            </div>
        </div>
    );
};

// ==========================================================
// === 4. COMPONENT CON: ToggleSwitch (Gạt công tắc) ===
// ==========================================================
export const ToggleSwitch = ({ label, checked, onChange, color = 'blue' }) => {
    const colorClasses = {
        blue: 'peer-checked:bg-blue-600',
        green: 'peer-checked:bg-green-600',
        red: 'peer-checked:bg-red-600',
    };

    return (
        <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <div className="relative inline-flex items-center">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked == 1 || checked === true}
                    onChange={(e) => onChange(e.target.checked ? 1 : 0)}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer ${colorClasses[color] || colorClasses.blue} peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </div>
        </label>
    );
};
