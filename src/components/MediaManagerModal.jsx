import React from 'react';
import { Modal } from './ui';
import MediaManager from './MediaManager';

const MediaManagerModal = ({ isOpen, onClose, onSelect, multiple = false, type = 'all', title = "Hệ thống Media Library" }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} isFullScreen={true} title={null}>
            <div className="flex flex-col h-full">
                {/* Header trong Modal */}
                <div className="h-14 bg-white border-b px-6 flex items-center justify-between z-20">
                    <h2 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                        <Icon name="x" className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <MediaManager
                        onSelect={(data) => {
                            onSelect(data);
                            onClose();
                        }}
                        multiple={multiple}
                        type={type}
                        isStandalone={false}
                    />
                </div>
            </div>
        </Modal>
    );
};

// Cần import Icon cho Header
import { Icon } from './ui';

export default MediaManagerModal;
