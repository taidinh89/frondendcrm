import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import './MediaUploader.css';

/**
 * MediaUploader Component
 * Simple file upload button for chat toolbar
 */
const MediaUploader = ({ onUploadComplete, acceptTypes = "image/*,video/*,application/pdf" }) => {
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (file.size > maxSize) {
            alert('File quá lớn! Giới hạn 10MB');
            return;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);

        if (onUploadComplete) {
            onUploadComplete(file, previewUrl);
        }

        // Reset input
        e.target.value = '';
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept={acceptTypes}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />
            <Paperclip
                size={18}
                title="Đính kèm ảnh/file"
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
            />
        </>
    );
};

export default MediaUploader;
