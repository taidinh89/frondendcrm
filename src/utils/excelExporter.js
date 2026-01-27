// src/utils/excelExporter.js
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Xuất Excel chuyên nghiệp với Style (Màu sắc, Border, Format số)
 * @param {Array} sheets - Mảng chứa các sheet: [{ sheetName: 'ABC', data: [] }]
 * @param {String} fileName - Tên file (không cần đuôi .xlsx)
 */
export const exportToExcelWithStyles = async (sheets, fileName) => {
    if (!sheets || sheets.length === 0) return;

    // 1. Khởi tạo Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QuocVietCRM System';
    workbook.created = new Date();

    // 2. Duyệt qua từng Sheet
    sheets.forEach((sheetData) => {
        const { sheetName, data } = sheetData;
        const worksheet = workbook.addWorksheet(sheetName || 'Sheet1');

        if (!data || data.length === 0) return;

        // --- A. TẠO CỘT (COLUMNS) ---
        // Lấy keys từ dòng đầu tiên để làm header
        const headers = Object.keys(data[0]);
        
        worksheet.columns = headers.map(key => {
            // Tính độ rộng cột dựa trên độ dài dữ liệu (Auto fit đơn giản)
            const maxLength = Math.max(
                key.length, 
                ...data.map(row => (row[key] ? String(row[key]).length : 0))
            );
            return { 
                header: key, 
                key: key, 
                width: Math.min(Math.max(maxLength + 2, 12), 60) // Min 12, Max 60
            };
        });

        // --- B. ĐỔ DỮ LIỆU ---
        data.forEach(row => {
            worksheet.addRow(row);
        });

        // --- C. STYLING (TÔ MÀU & KẺ KHUNG) ---
        
        // C.1 Style cho Header (Dòng 1)
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            // Nền Xanh đậm (Blue 700 của Tailwind ~ #1D4ED8)
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1D4ED8' } 
            };
            // Chữ Trắng, In đậm
            cell.font = {
                color: { argb: 'FFFFFFFF' },
                bold: true,
                size: 12
            };
            // Căn giữa
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            // Border
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        headerRow.height = 25; // Cao hơn chút cho đẹp

        // C.2 Style cho các dòng dữ liệu
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Bỏ qua header

            row.eachCell((cell, colNumber) => {
                // Border mỏng cho tất cả
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // Format số & Màu sắc logic
                const val = cell.value;
                
                // Nếu là số (Tiền tệ)
                if (typeof val === 'number') {
                    cell.numFmt = '#,##0'; // Format 1,000,000
                    
                    // Logic màu: Âm thì Đỏ, Dương thì Đen (hoặc Xanh nếu muốn)
                    if (val < 0) {
                        cell.font = { color: { argb: 'FFFF0000' } }; // Đỏ
                    }
                }
            });
            
            // Zebra Striping (Dòng chẵn lẻ cho dễ nhìn) - Optional
            if (rowNumber % 2 === 0) {
                // Tô nền xám cực nhạt cho dòng chẵn
                row.eachCell(cell => {
                    // cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                });
            }
        });
    });

    // 3. Xuất file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}.xlsx`);
};