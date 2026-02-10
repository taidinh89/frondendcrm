import React, { useState, useRef } from 'react';
import { Modal, Icon } from '../ui';
import { mediaApi } from '../../api/admin/mediaApi';
import { productApi } from '../../api/admin/productApi';
import { toast } from 'react-hot-toast';

const MediaStudioModal = ({ isOpen, onClose, sourceFile, onSuccess, files = [] }) => {
    const [studioLoading, setStudioLoading] = useState(false);
    const [studioType, setStudioType] = useState('frame'); // 'frame' | 'watermark'
    const [studioOverlay, setStudioOverlay] = useState(null);
    const [localFiles, setLocalFiles] = useState(files);
    const [uploadingOverlay, setUploadingOverlay] = useState(false);
    const [resultFile, setResultFile] = useState(null); // Để lưu kết quả xử lý
    const fileInputRef = useRef(null);

    const handleApplyEffect = async () => {
        if (!sourceFile || !studioOverlay) return toast.error("Vui lòng chọn đủ nguyên liệu (Ảnh gốc & Khung/Logo)");

        setStudioLoading(true);
        const tid = toast.loading("Đang 'chế' ảnh, vui lòng chờ...");

        try {
            const res = await mediaApi.applyEffect({
                source_id: sourceFile.id,
                overlay_id: studioOverlay.id,
                type: studioType
            });

            toast.success("Thành công! Hãy kiểm tra lại tác phẩm.", { id: tid });

            if (res.data?.data) {
                setResultFile(res.data.data); // Hiển thị màn hình kết quả
            }
        } catch (e) {
            toast.error(e.response?.data?.message || "Lỗi xử lý ảnh", { id: tid });
        } finally {
            setStudioLoading(false);
        }
    };

    const handleUseResult = () => {
        if (resultFile) {
            onSuccess(resultFile);
            onClose();
        }
    };

    const handleQuickUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingOverlay(true);
        const tid = toast.loading("Đang tải nguyên liệu...");
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('source', 'studio_quick_upload');
            formData.append('temp_context', 'Studio Resource');

            const res = await productApi.smartUpload(formData);

            if (res.data?.success) {
                const newOverlay = {
                    id: res.data.id,
                    preview_url: res.data.url,
                    original_name: res.data.original_name,
                    is_image: true,
                    mime_type: res.data.mime_type
                };
                setLocalFiles(prev => [newOverlay, ...prev]);
                setStudioOverlay(newOverlay);
                toast.success("Đã nạp nguyên liệu mới!", { id: tid });
            }
        } catch (err) {
            toast.error("Lỗi tải lên nguyên liệu", { id: tid });
        } finally {
            setUploadingOverlay(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // --- MÀN HÌNH KẾT QUẢ ---
    if (resultFile) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title={null} isFullScreen={true}>
                <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
                    {/* Header Result */}
                    <div className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900 z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-900/40 animate-pulse-slow">
                                <Icon name="check" className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-black text-sm uppercase tracking-widest text-emerald-400">Tác phẩm hoàn tất</h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Xem lại & Xác nhận sử dụng</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white">
                            <Icon name="x" className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Main Image View */}
                    <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-[url('https://transparenttextures.com/patterns/cubes.png')]">
                        <div className="absolute inset-0 bg-slate-950/90 z-0"></div>
                        <div className="relative z-10 w-full h-full p-10 flex items-center justify-center">
                            <img
                                src={resultFile.preview_url}
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border-4 border-slate-800 animate-slideUp"
                                style={{ maxHeight: 'calc(100vh - 200px)' }}
                                alt="Result"
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-6 z-20">
                        <button
                            onClick={() => setResultFile(null)}
                            className="px-8 py-4 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2"
                        >
                            <Icon name="arrow-up-down" className="w-4 h-4 rotate-90" /> Chỉnh sửa lại
                        </button>
                        <button
                            onClick={handleUseResult}
                            className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <Icon name="check" className="w-5 h-5" /> Sử dụng ảnh này
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    // --- MÀN HÌNH CHÍNH (STUDIO) ---
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={null} isFullScreen={true}>
            <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
                {/* Header */}
                <div className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-900/20">
                            <Icon name="wand" className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-sm uppercase tracking-widest">Media Studio <span className="text-indigo-400">Pro</span></h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Hệ thống xử lý ảnh sản phẩm vạn năng</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white">
                        <Icon name="x" className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Left Column: Preview & Source (Tăng width lên 40%) */}
                    <div className="w-[40%] border-r border-slate-800 p-8 flex flex-col gap-8 bg-slate-950/30">
                        <div className="flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-4 h-4 bg-slate-800 rounded-full flex items-center justify-center text-[8px] text-white">1</span>
                                    Ảnh gốc sản phẩm
                                </h4>
                                <span className="text-[8px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full uppercase">Source</span>
                            </div>
                            {/* Ảnh gốc hiển thị TO HẾT CỠ */}
                            <div className="flex-1 bg-slate-900 rounded-[2rem] border-4 border-slate-800 shadow-2xl overflow-hidden relative group p-2 flex items-center justify-center">
                                <img src={sourceFile?.preview_url} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" alt="Source" />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 to-transparent p-6 translate-y-full group-hover:translate-y-0 transition-transform">
                                    <p className="text-[10px] font-bold text-white truncate text-center">{sourceFile?.original_name}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Column: Controls */}
                    <div className="w-[25%] p-6 flex flex-col gap-6 bg-slate-900 border-r border-slate-800">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-4 h-4 bg-slate-800 rounded-full flex items-center justify-center text-[8px] text-white">2</span>
                                Cấu hình
                            </h4>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => setStudioType('frame')}
                                    className={`relative overflow-hidden group p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${studioType === 'frame' ? 'border-indigo-600 bg-indigo-600/10' : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'}`}
                                >
                                    <div className={`p-3 rounded-xl ${studioType === 'frame' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        <Icon name="layout" className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <span className={`block text-[11px] font-black uppercase tracking-widest ${studioType === 'frame' ? 'text-white' : 'text-slate-500'}`}>Ốp Khung</span>
                                        <span className="text-[8px] font-medium text-slate-500">Phủ kín toàn bộ</span>
                                    </div>
                                    {studioType === 'frame' && <div className="absolute right-4 text-indigo-400"><Icon name="check-circle" className="w-4 h-4" /></div>}
                                </button>

                                <button
                                    onClick={() => setStudioType('watermark')}
                                    className={`relative overflow-hidden group p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${studioType === 'watermark' ? 'border-indigo-600 bg-indigo-600/10' : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'}`}
                                >
                                    <div className={`p-3 rounded-xl ${studioType === 'watermark' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        <Icon name="shield" className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <span className={`block text-[11px] font-black uppercase tracking-widest ${studioType === 'watermark' ? 'text-white' : 'text-slate-500'}`}>Đóng Dấu</span>
                                        <span className="text-[8px] font-medium text-slate-500">Logo góc dưới</span>
                                    </div>
                                    {studioType === 'watermark' && <div className="absolute right-4 text-indigo-400"><Icon name="check-circle" className="w-4 h-4" /></div>}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-end gap-4">
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-dashed border-slate-700 text-center">
                                <p className="text-[9px] font-bold text-slate-400 mb-2">Trạng thái sẵn sàng</p>
                                <div className="flex justify-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${sourceFile ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                                    <div className={`w-2 h-2 rounded-full ${studioOverlay ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                                </div>
                            </div>

                            <button
                                disabled={!studioOverlay || studioLoading}
                                onClick={handleApplyEffect}
                                className={`group relative w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] overflow-hidden transition-all shadow-2xl ${!studioOverlay ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-105 active:scale-95 shadow-indigo-900/40'}`}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {studioLoading ? 'ĐANG XỬ LÝ...' : 'XP. BẢN BIẾN THỂ'}
                                    <Icon name="arrow-right" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Overlay Selection (35%) */}
                    <div className="flex-1 border-l border-slate-800 p-8 flex flex-col gap-6 bg-slate-950/30">
                        <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-4 h-4 bg-slate-800 rounded-full flex items-center justify-center text-[8px] text-white">3</span>
                                Nguyên liệu (Khung/Logo)
                            </h4>
                            <div className="flex gap-2">
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleQuickUpload} accept="image/*" />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingOverlay}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl transition-all shadow-lg"
                                    title="Nạp thêm nguyên liệu"
                                >
                                    <Icon name="plus" className="w-4 h-4" />
                                </button>
                                {studioOverlay && (
                                    <button
                                        onClick={() => setStudioOverlay(null)}
                                        className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-xl transition-all"
                                        title="Bỏ chọn"
                                    >
                                        <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-800 p-4 overflow-y-auto custom-scrollbar-dark min-h-0">
                            {uploadingOverlay ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                                    <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <span className="text-[10px] font-bold uppercase tracking-tight">Đang đồng bộ...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {localFiles.filter(f => f.is_image).map(file => (
                                        <div
                                            key={file.id}
                                            onClick={() => setStudioOverlay(file)}
                                            className={`aspect-square rounded-2xl border-2 transition-all cursor-pointer overflow-hidden p-2 relative group ${studioOverlay?.id === file.id ? 'border-indigo-600 bg-indigo-600/10 scale-[1.02] shadow-xl shadow-indigo-900/20' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
                                        >
                                            <img src={file.preview_url} className="w-full h-full object-contain" alt="Overlay" />
                                            {studioOverlay?.id === file.id && (
                                                <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5">
                                                    <Icon name="check" className="w-3 h-3" />
                                                </div>
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 p-2 bg-slate-900/90 text-[8px] font-medium truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                {file.original_name}
                                            </div>
                                        </div>
                                    ))}
                                    {localFiles.filter(f => f.is_image).length === 0 && (
                                        <div className="col-span-2 h-40 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                                            <Icon name="image" className="w-8 h-8 mb-2" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-center px-4">Chưa có nguyên liệu.<br />Hãy tải ảnh khung/logo lên.</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {studioOverlay && (
                            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 animate-slideUp">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Đã chọn:</p>
                                <p className="text-[10px] font-bold text-indigo-400 truncate">{studioOverlay.original_name}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default MediaStudioModal;
