import React, { useState, useEffect, useRef } from 'react';
import { Search, ZapIcon } from 'lucide-react';
import chatApi from '../../services/chatApi';
import './QuickReplySelector.css';

/**
 * QuickReplySelector Component  
 * Trigger với "/" để hiển thị tin nhắn mẫu
 */
const QuickReplySelector = ({ onSelect, triggerChar = '/' }) => {
    const [quickReplies, setQuickReplies] = useState([]);
    const [filteredReplies, setFilteredReplies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectorRef = useRef(null);

    useEffect(() => {
        loadQuickReplies();
    }, []);

    useEffect(() => {
        if (searchTerm) {
            const filtered = quickReplies.filter(r =>
                r.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.content.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredReplies(filtered);
        } else {
            setFilteredReplies(quickReplies);
        }
        setSelectedIndex(0);
    }, [searchTerm, quickReplies]);

    const loadQuickReplies = async () => {
        try {
            const response = await chatApi.get('v1/omnichannel/quick-replies');
            const data = response.data || [];
            setQuickReplies(data);
            setFilteredReplies(data);
        } catch (error) {
            console.error('[QuickReply] Load failed:', error);
            // Fallback to demo data if API fails
            const demoData = [
                { id: 1, shortcut: 'xinchaо', content: 'Xin chào! Tôi có thể giúp gì cho bạn?', category: 'Chào hỏi' },
                { id: 2, shortcut: 'camon', content: 'Cảm ơn bạn đã liên hệ!', category: 'Kết thúc' },
                { id: 3, shortcut: 'gia', content: 'Để tôi kiểm tra giá cho bạn nhé!', category: 'Sản phẩm' },
            ];
            setQuickReplies(demoData);
            setFilteredReplies(demoData);
        }
    };

    const handleSelect = (reply) => {
        if (onSelect) {
            onSelect(reply.content);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredReplies.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredReplies[selectedIndex]) {
                handleSelect(filteredReplies[selectedIndex]);
            }
        }
    };

    if (filteredReplies.length === 0) {
        return (
            <div className="quick-reply-selector empty">
                <p>Không tìm thấy tin nhắn mẫu</p>
                <small>Gõ để tìm kiếm hoặc ESC để đóng</small>
            </div>
        );
    }

    return (
        <div className="quick-reply-selector" ref={selectorRef} onKeyDown={handleKeyDown} tabIndex={0}>
            <div className="selector-header">
                <ZapIcon size={16} />
                <span>Tin nhắn mẫu</span>
                <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="selector-list">
                {filteredReplies.map((reply, index) => (
                    <div
                        key={reply.id}
                        className={`reply-item ${index === selectedIndex ? 'selected' : ''}`}
                        onClick={() => handleSelect(reply)}
                        onMouseEnter={() => setSelectedIndex(index)}
                    >
                        <div className="reply-shortcut">/{reply.shortcut}</div>
                        <div className="reply-content">{reply.content}</div>
                        {reply.category && (
                            <span className="reply-category">{reply.category}</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="selector-footer">
                <small>↑↓ để di chuyển • Enter để chọn • ESC để đóng</small>
            </div>
        </div>
    );
};

export default QuickReplySelector;
