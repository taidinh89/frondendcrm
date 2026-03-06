import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import './EmojiPicker.css';

/**
 * EmojiPicker Component
 * Native Emoji selector without external library
 */
const EmojiPicker = ({ onEmojiSelect }) => {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef(null);

    // Common emojis grouped by category
    const emojiCategories = {
        'Cảm xúc': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
        'Cử chỉ': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
        'Đồ vật': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '❤️‍🔥', '❤️‍🩹', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭'],
        'Biểu tượng': ['✅', '☑️', '✔️', '✖️', '❎', '➕', '➖', '➗', '✳️', '✴️', '❇️', '‼️', '⁉️', '❓', '❔', '❕', '❗', '〰️', '💱', '💲', '⚕️', '♻️', '⚜️', '🔱', '📛', '🔰', '⭐', '🌟', '✨', '⚡', '🔥', '💥', '☄️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔', '☂️', '🌊', '🌫️']
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setShowPicker(false);
            }
        };

        if (showPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPicker]);

    const handleEmojiClick = (emoji) => {
        if (onEmojiSelect) {
            onEmojiSelect(emoji);
        }
        setShowPicker(false);
    };

    return (
        <div className="emoji-picker-container" ref={pickerRef}>
            <button
                type="button"
                className="emoji-trigger-btn"
                onClick={() => setShowPicker(!showPicker)}
                title="Chọn emoji"
            >
                <Smile size={20} />
            </button>

            {showPicker && (
                <div className="emoji-picker-popup">
                    <div className="emoji-picker-header">
                        <span>Chọn Emoji</span>
                    </div>

                    <div className="emoji-categories">
                        {Object.entries(emojiCategories).map(([category, emojis]) => (
                            <div key={category} className="emoji-category">
                                <div className="category-title">{category}</div>
                                <div className="emoji-grid">
                                    {emojis.map((emoji, index) => (
                                        <button
                                            key={`${emoji}-${index}`}
                                            className="emoji-button"
                                            onClick={() => handleEmojiClick(emoji)}
                                            title={emoji}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmojiPicker;
