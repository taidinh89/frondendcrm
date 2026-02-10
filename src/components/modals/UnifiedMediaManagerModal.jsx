import React from 'react';
import { Modal } from '../ui';
import UnifiedMediaManager from '../Core/UnifiedMediaManager';
import { Icon } from '../ui';

const UnifiedMediaManagerModal = ({ isOpen, onClose, onSelect, multiple = true }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} isFullScreen={true} title={null}>
            <div className="flex flex-col h-full bg-slate-50">
                {/* Header */}
                <div className="h-14 bg-white border-b px-6 flex items-center justify-between shadow-sm z-20">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Icon name="image" className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Unified Media Manager</h2>
                            <p className="text-[9px] text-slate-400 font-bold">SMART LIBRARY V3</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all">
                        <Icon name="x" className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden p-4">
                    <UnifiedMediaManager
                        onSelect={(data) => {
                            onSelect(data);
                            onClose();
                        }}
                        multiple={multiple}
                        onClose={onClose}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default UnifiedMediaManagerModal;
