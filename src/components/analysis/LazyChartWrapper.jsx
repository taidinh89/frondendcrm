import React, { useState, useEffect, useRef } from 'react';

export const LazyChartWrapper = ({ children, height = 400 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect(); // Load xong thì thôi ko theo dõi nữa
                }
            },
            { rootMargin: '100px' } // Load trước khi cuộn tới 100px
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} style={{ minHeight: height, width: '100%' }}>
            {isVisible ? children : (
                <div className="flex items-center justify-center h-full bg-gray-50 rounded animate-pulse">
                    <span className="text-gray-400 text-sm">Đang tải biểu đồ...</span>
                </div>
            )}
        </div>
    );
};