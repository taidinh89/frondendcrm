// src/components/ui.jsx

import React, { useRef, useEffect } from 'react';
import { useApiData as originalUseApiData } from '../hooks/useApiData.jsx'; // Dùng tên khác khi import

// ==========================================================
// === HOOK ĐỂ XỬ LÝ CLICK RA NGOÀI (Cho Dropdown) ===
// ==========================================================
export const useClickOutside = (ref, callback) => {
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, callback]);
};
// ==========================================================

// ==========================================================
// === TẠO ALIAS CHO useApiData ĐỂ TRÁNH LỖI IMPORT ===
// ==========================================================
export const useApiData = originalUseApiData;
// ==========================================================


const ICONS = {
    search: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
    filter: "M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z",
    plus: "M12 4.5v15m7.5-7.5h-15",
    edit: "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
    "external-link": "M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25",
    save: "M17.598 2.112a1.021 1.021 0 0 1 .833.303l.707.707a1.01 1.01 0 0 1 .303.833L18.5 5.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9.5a1 1 0 0 1 .707.293l.391.391a1 1 0 0 1 .282.707V4.5a.5.5 0 0 0 1 0V3.5h.5a1.02 1.02 0 0 1 .218-.388ZM7 18h10v-5H7v5ZM9 4v4h6V4H9Z",
    upload: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
    image: "m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
    info: "m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
    chevronLeft: "M15.75 19.5L8.25 12l7.5-7.5",
    chevronRight: "M8.25 4.5l7.5 7.5-7.5 7.5",
    chevronUp: "M4.5 15.75l7.5-7.5 7.5 7.5",
    chevronDown: "M19.5 8.25l-7.5 7.5-7.5-7.5",
    package: "M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9",
    award: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
    "file-text": "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-.75a3.375 3.375 0 00-3.375-3.375H9m1.5 4.5H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9",
    list: "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
    "shopping-cart": "M2.25 2.25h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.1-.73 2.37-1.824l1.654-6.751A.75.75 0 0019.25 5.25H4.25m4.5 13.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
    eye: "M2.036 12.322a1.012 1.012 0 010-.644C3.399 8.049 7.31 5.25 12 5.25c4.69 0 8.601 2.809 9.964 6.428.061.162.061.326 0 .488-1.363 3.619-5.273 6.419-9.964 6.419-4.69 0-8.601-2.801-9.964-6.419z M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z",
    heart: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
    sliders: "M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0m-9.75 0h9.75",
    "arrow-up-down": "M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m9-6L21 15m0 0-4.5 4.5M21 15V3",
    flame: "M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z",
    gift: "M21 11.25s0-2.25-1.5-2.25H15a3 3 0 0 0-3-3V5.25m6 6V15a.75.75 0 0 1-.75.75h-3.75M21 11.25H3.375a1.125 1.125 0 0 1-1.125-1.125V5.625A1.125 1.125 0 0 1 3.375 4.5H9.75m11.25 6.75h-1.125l-1.125 1.125H3.375m11.25-6.75h1.125a1.125 1.125 0 0 1 1.125 1.125v4.5m-11.25 0V15a.75.75 0 0 0 .75.75h3.75M3 11.25h1.125L5.25 12.375M12 15.75V21m-1.5-1.125h3m-3 1.5h3",
    "bar-chart": "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
    "cloud-upload": "M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z",
    activity: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    "cash-multiple": "M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z",
    "chart-bar": "M22,21H2V3H4V19H6V10H10V19H12V14H16V19H18V7H22V21Z",
    percent: "M18.5,3.5L3.5,18.5L5.5,20.5L20.5,5.5L18.5,3.5M7,4A3,3 0 0,0 4,7A3,3 0 0,0 7,10A3,3 0 0,0 10,7A3,3 0 0,0 7,4M17,14A3,3 0 0,0 14,17A3,3 0 0,0 17,20A3,3 0 0,0 20,17A3,3 0 0,0 17,14Z",
    "list-numbered": "M7,13V11H21V13H7M7,19V17H21V19H7M7,7V5H21V7H7M3,8V5H2V4H4V8H3M2,17V16H5V20H2V19H4V18.5H3V17.5H4V17H2M2,11H3.5L2,13.1V14H5V13H3.5L5,10.9V10H2V11Z",
    "export-variant": "M12,1L8,5H11V14H13V5H16L12,1M18,23H6C4.89,23 4,22.1 4,21V9C4,7.89 4.89,7 6,7H9V9H6V21H18V9H15V7H18A2,2 0 0,1 20,9V21A2,2 0 0,1 18,23Z",
    "filter-variant": "M6,13H18V11H6M3,6V8H21V6M10,18H14V16H10V18Z",
    tag: "M9.504 21.08l11.578-11.578a2.25 2.25 0 0 1 0-3.182L17.698 2.92a2.25 2.25 0 0 1-3.181 0L2.939 14.5c-.299.299-.546.632-.731.996l-.859 1.693c-.477.938.452 1.867 1.39 1.39l1.693-.859c.364-.185.697-.432.996-.731l1.094-1.094m4.184-4.184l3.182 3.182m-10.932 4.09l9.546-9.546",
    terminal: "M6.75 7.5l3 3.75-3 3.75m4.5-3.75h7.5",
    globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 16.5h6a3.987 3.987 0 0 1 1.951 3.012A8.949 8.949 0 0 1 12 21Zm0-18a8.949 8.949 0 0 0-4.951 1.488A3.987 3.987 0 0 0 9 7.5h6a3.987 3.987 0 0 0 1.951-3.012A8.949 8.949 0 0 0 12 3Z",
    "alert-triangle": "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 12.376ZM12 15.75h.007v.008H12v-.008Z",
    "eye-off": "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88",
    "sidebar-open": "M3.75 3.75v16.5m1.5-16.5v16.5M7.5 3.75v16.5a2.25 2.25 0 0 1 2.25-2.25h9a2.25 2.25 0 0 1 2.25 2.25v-13.5A2.25 2.25 0 0 0 18.75 4.5h-9a2.25 2.25 0 0 0-2.25 2.25",
    "sidebar-close": "M3.75 3.75v16.5m1.5-16.5v16.5M18.75 3.75v16.5a2.25 2.25 0 0 0 2.25-2.25v-12a2.25 2.25 0 0 0-2.25-2.25",
    trash: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
    link: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
    copy: "M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75",
    x: "M6 18L18 6M6 6l12 12",
    check: "m4.5 12.75 6 6 9-13.5",
    grid: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
    maximize: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15m-11.25 5.25h4.5m-4.5 0v-4.5m0 4.5L9 15",
    download: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 9.75V15m0 0 3-3m-3 3-3-3M12 2.25V8.25",
    wand: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z",
    "check-circle": "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    refresh: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99",
    logout: "M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6.75A2.25 2.25 0 0 0 4.5 5.25v13.5A2.25 2.25 0 0 0 6.75 21h6.75a2.25 2.25 0 0 0 2.25-2.25V15m3-3 3-3m0 0-3-3m3 3H9",
    bell: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75v-.7V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
    chat: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-1.074-.771 5.978 5.978 0 011.025-2.61C3.663 16.115 3 14.135 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
    users: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
    user: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
    lock: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
    cog: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
    database: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75",
    layout: "M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6C10.5 6 10.5 6.504 10.5 7.125v12.75c0 .621-.504 1.125-1.125 1.125h-6A1.125 1.125 0 012.25 19.875V7.125zM13.5 7.125c0-.621.504-1.125 1.125-1.125h6c.621 0 1.125.504 1.125 1.125v12.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125V7.125z",
    navigation: "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5",
    "credit-card": "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.188-12.75h14.375c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125H3.375a1.125 1.125 0 01-1.125-1.125V5.625c0-.621.504-1.125 1.125-1.125z",
    home: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
    shield: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.002z",
    folder: "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-19.5 0A2.25 2.25 0 004.5 15h15a2.25 2.25 0 002.25-2.25m-19.5 0v.25a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25v-.25m-19.5 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0120.25 6v6.75",
    monitor: "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25",
    dashboard: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
    "message-square": "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
    compass: "M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.983-4.5 1.583a.75.75 0 0 1-.941-.941l1.583-4.5a.75.75 0 0 1 1.057-.406l4.5 2.25a.75.75 0 0 1 .301 1.014z",
    bug: "M12 3.375a.75.75 0 0 1 .75.75v2.246c.553.076 1.085.24 1.579.479L15.6 5.4a.75.75 0 0 1 1.05-.15l1.05.75a.75.75 0 0 1 .15 1.05l-1.321 1.849a6.012 6.012 0 0 1 1.47 3.351h2.251a.75.75 0 0 1 0 1.5h-2.251a6.011 6.011 0 0 1-1.47 3.351l1.321 1.849a.75.75 0 1 1-1.2 0l-1.321-1.849a5.95 5.95 0 0 1-1.579.479v2.246a.75.75 0 0 1-1.5 0v-2.246a5.95 5.95 0 0 1-1.579-.479l-1.321 1.849a.75.75 0 1 1-1.2 0l1.321-1.849A6.011 6.011 0 0 1 5.251 13.5H3a.75.75 0 0 1 0-1.5h2.251a6.012 6.012 0 0 1 1.47-3.351L5.4 6.8a.75.75 0 1 1 1.2-1.05l1.271 1.451a5.95 5.95 0 0 1 1.579-.479V4.125a.75.75 0 0 1 .75-.75Z",
    clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    "shopping-bag": "M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
    truck: "M16.5 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM15 12h1.5h3.375A1.125 1.125 0 0 1 21 13.125v1.5a1.125 1.125 0 0 1-1.125 1.125H16.5v2.246a.75.75 0 0 1-1.5 0V15h-9v2.246a.75.75 0 0 1-1.5 0v-6.746a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 .75.75v3.746ZM15 6h.008v.008H15V6Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM15 9h.008v.008H15V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
    "clipboard-list": "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 18 4.5h-2.25a2.25 2.25 0 0 0-2.25 2.25v.75m-4.5 0v-.75A2.25 2.25 0 0 1 11.25 4.5H13.5m-4.5 0H6.75a2.25 2.25 0 0 0-2.25 2.25v2.25m2.25 2.25v-.75a3.375 3.375 0 0 1 3.375-3.375h1.5a1.125 1.125 0 0 1 1.125 1.125v.75a3.375 3.375 0 0 1-3.375 3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125Z",
    "plus-circle": "M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    "arrow-up": "M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18",
    "arrow-down": "M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3",
    list: "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
    "shopping-cart": "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
};
export const Icon = ({ name, path, className = "w-6 h-6" }) => {
    const d = path || ICONS[name] || "";
    // Heuristic: If path contains 'Z' (close path) or is MDI-like, treat as fill. 
    // Otherwise, treat as stroke to avoid making standard icons (like 'X') invisible.
    const isFillIcon = d.includes('Z') || d.includes('z') || name?.includes('mdi-');

    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={{...(isFillIcon ? { fill: 'currentColor', stroke: 'none' } : {})}}>
            <path strokeLinecap="round" strokeLinejoin="round" d={d} fill={isFillIcon ? 'currentColor' : 'none'} />
        </svg>
    );
};

export const Modal = ({ isOpen, onClose, title, children, footer, maxWidthClass = 'max-w-lg', isFullScreen = false, hideHeader = false }) => {
    if (!isOpen) return null;

    const containerClasses = isFullScreen
        ? "fixed inset-0 z-[1000] flex flex-col bg-white"
        : "fixed inset-0 bg-black bg-opacity-50 z-[1000] flex justify-center items-center p-4";

    const contentClasses = isFullScreen
        ? "w-full h-full flex flex-col overflow-hidden"
        : `bg-white rounded-lg shadow-xl w-full ${maxWidthClass} max-h-[95vh] flex flex-col`;

    return (
        <div className={containerClasses}>
            <div className={contentClasses}>
                {!hideHeader && (
                    <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                        <div className="flex-1 truncate pr-4 text-lg font-semibold text-gray-800">{title}</div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all active:scale-90"
                            title="Đóng (ESC)"
                        >
                            <Icon name="x" className="w-6 h-6" />
                        </button>
                    </div>
                )}
                <div className={`${isFullScreen ? 'flex-1 flex flex-col min-h-0' : 'overflow-y-auto flex-1 h-full'}`}>
                    {children}
                </div>
                {footer && (
                    <div className="flex justify-end space-x-3 border-t bg-gray-50 rounded-b-lg flex-shrink-0 p-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', type = "button", size = "md" }) => {
    const baseClasses = 'text-sm font-medium rounded-md flex items-center justify-center border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    let paddingClasses = 'px-3 py-1.5';
    if (size === 'xs') {
        paddingClasses = 'px-2.5 py-1 text-xs';
    }

    const variantClasses = {
        primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
        danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500',
        success: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
        warning: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 focus:ring-amber-400',
    };
    const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={`${baseClasses} ${paddingClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
        >
            {children}
        </button>
    );
};

export const Checkbox = React.forwardRef(({ indeterminate, label, ...rest }, ref) => {
    const defaultRef = useRef();
    const resolvedRef = ref || defaultRef;

    useEffect(() => {
        if (resolvedRef.current) {
            resolvedRef.current.indeterminate = indeterminate;
        }
    }, [resolvedRef, indeterminate]);

    const checkboxElement = (
        <input
            type="checkbox"
            ref={resolvedRef}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            {...rest}
        />
    );

    if (label) {
        return (
            <label className="inline-flex items-center">
                {checkboxElement}
                <span className="ml-2 text-sm text-gray-700">{label}</span>
            </label>
        );
    }

    return checkboxElement;
});

export const Pagination = ({ pagination, onPageChange }) => {
    if (!pagination || pagination.last_page <= 1) return null;
    const { current_page, last_page, total, from, to } = pagination;

    return (
        <div className="flex items-center justify-between text-sm text-gray-600">
            <p>
                Hiển thị từ <strong>{from}</strong> đến <strong>{to}</strong> trên tổng số <strong>{total}</strong> kết quả
            </p>
            <div className="flex items-center space-x-2">
                <button onClick={() => onPageChange(1)} disabled={current_page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                    <Icon path="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" className="w-5 h-5" />
                </button>
                <button onClick={() => onPageChange(current_page - 1)} disabled={current_page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                    <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
                </button>
                <span>Trang {current_page} / {last_page}</span>
                <button onClick={() => onPageChange(current_page + 1)} disabled={current_page === last_page} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                    <Icon path="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-5 h-5" />
                </button>
                <button onClick={() => onPageChange(last_page)} disabled={current_page === last_page} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                    <Icon path="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


// === KHÔI PHỤC COMPONENT INPUT ===
export const Input = ({ label, name, type = "text", value, onChange, placeholder, className = "" }) => (
    <div className="w-full">
        {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <input
            type={type}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 ${className}`}
        />
    </div>
);

export const Textarea = ({ label, name, value, onChange, placeholder, className = "", rows = 3 }) => (
    <div className="w-full">
        {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <textarea
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className={`w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y ${className}`}
        />
    </div>
);

// --- NEW COMPONENT FOR KPI/CURRENCY ENTRY ---
export const NumericInput = ({ 
    label, 
    value, 
    onChange, 
    placeholder = "0", 
    className = "", 
    helperClassName = "text-blue-600",
    prefix = "" 
}) => {
    // Format number to '1.000.000' style
    const formatDisplay = (val) => {
        if (val === null || val === undefined || val === '') return '';
        return new Intl.NumberFormat('vi-VN').format(val);
    };

    // Convert number to words (triệu, tỷ)
    const toWords = (val) => {
        if (!val || isNaN(val)) return '';
        const num = parseFloat(val);
        if (num >= 1000000000) return (num / 1000000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ VNĐ';
        if (num >= 1000000) return (num / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' triệu VNĐ';
        if (num >= 1000) return (num / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' nghìn VNĐ';
        return num.toLocaleString('vi-VN') + ' VNĐ';
    };

    const handleChange = (e) => {
        // Remove all non-numeric characters except for the decimal point
        const raw = e.target.value.replace(/[^\d]/g, '');
        const num = raw === '' ? '' : parseInt(raw, 10);
        onChange(num);
    };

    return (
        <div className="w-full space-y-1">
            {label && <label className="block text-sm font-bold text-gray-600 mb-1 uppercase tracking-tight">{label}</label>}
            <div className="relative">
                {prefix && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">
                        {prefix}
                    </div>
                )}
                <input
                    type="text"
                    inputMode="numeric"
                    value={formatDisplay(value)}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className={`w-full ${prefix ? 'pl-8' : 'px-4'} py-3 border border-gray-300 rounded-xl text-lg font-black text-slate-700 shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all ${className}`}
                />
            </div>
            {value > 0 && (
                <div className={`text-[11px] font-black italic px-1 ${helperClassName}`}>
                    ≈ {toWords(value)}
                </div>
            )}
        </div>
    );
};