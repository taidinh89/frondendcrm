import { useState, useMemo } from 'react';

const ROW_MIN_HEIGHT = 48;
const DEFAULT_COLUMN_WIDTHS = {
    source: 100,
    sku: 140,
    product: 250,
    dynamic: 120,
};

export function useResizableTable(columns) {
    const [columnWidths, setColumnWidths] = useState({});
    const [rowHeight, setRowHeight] = useState(ROW_MIN_HEIGHT);

    const getWidth = (id) => columnWidths[id] || DEFAULT_COLUMN_WIDTHS[id] || DEFAULT_COLUMN_WIDTHS.dynamic;

    const createColumnResizeHandler = (columnId) => (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = getWidth(columnId);
        const onMouseMove = (moveEvent) => {
            setColumnWidths(p => ({ ...p, [columnId]: Math.max(startWidth + (moveEvent.clientX - startX), 50) }));
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const createRowResizeHandler = () => (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = rowHeight;
        const onMouseMove = (moveEvent) => {
            setRowHeight(Math.max(startHeight + (moveEvent.clientY - startY), ROW_MIN_HEIGHT));
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const totalColumnsWidth = useMemo(() => {
        return columns.reduce((total, col) => total + getWidth(col.id), 0);
    }, [columnWidths, columns]);

    return {
        rowHeight,
        getWidth,
        createColumnResizeHandler,
        createRowResizeHandler,
        totalColumnsWidth
    };
}