// src/utils/exportUtils.js

/**
 * Hàm này sẽ tự động tính toán độ rộng cột cho file Excel
 * để dữ liệu hiển thị đẹp hơn.
 */
const autoFitColumns = (data, ws) => {
    // === FIX 1: Thêm kiểm tra an toàn để tránh lỗi khi data rỗng ===
    if (!data || data.length === 0) return;
    
    // Đảm bảo truy cập phần tử đầu tiên an toàn
    const firstRow = data[0]; 
    if (!firstRow) return;

    // 1. Lấy tiêu đề cột
    const headers = Object.keys(firstRow); 
    
    if (headers.length === 0) return;

    // 2. Tính toán độ rộng
    const colWidths = headers.map(key => {
        // Lấy độ dài của tiêu đề
        const headerLength = key.length;

        // Lấy độ dài lớn nhất của dữ liệu trong cột đó
        const dataLength = Math.max(
            ...data.map(row => (row[key] ? String(row[key]).length : 0))
        );

        // Lấy độ rộng lớn hơn (tiêu đề hoặc dữ liệu) và cộng thêm 2 ký tự đệm
        const width = Math.max(headerLength, dataLength) + 2;
        
        // Giới hạn độ rộng tối đa (ví dụ 50) để tránh cột quá rộng
        return { wch: Math.min(width, 50) }; 
    });

    ws['!cols'] = colWidths;
};

/**
 * Xuất dữ liệu sang file Excel (.xlsx) hỗ trợ cả Single-sheet cũ và Multi-sheet mới.
 * * Nếu data là:
 * 1. Array<Object> (Cấu trúc cũ): Tự động chuyển thành một sheet tên "Sheet1".
 * 2. Array<SheetObject> (Cấu trúc mới): Xử lý từng sheet.
 * * * @param {Array<Object> | Array<SheetObject>} data - Dữ liệu để xuất.
 * @param {string} fileName - Tên file (không bao gồm .xlsx).
 */
export const exportToExcel = async (data, fileName) => {
    if (!data || data.length === 0) {
        console.error("Không có dữ liệu để xuất.");
        return;
    }

    try {
        // Tải động thư viện (tách code)
        const XLSX = await import('xlsx');
        const { saveAs } = await import('file-saver');

        // === BƯỚC 1: XỬ LÝ TÍNH TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY) ===
        let sheetsArray;
        
        // Kiểm tra xem đầu vào có phải là cấu trúc Multi-Sheet mới hay không
        const isMultiSheetStructure = Array.isArray(data) && data.length > 0 && 
                                     data.every(item => item && item.sheetName && Array.isArray(item.data));

        if (isMultiSheetStructure) {
            sheetsArray = data; // Dùng cấu trúc mới trực tiếp
        } else {
            // Đây là cấu trúc Single-Sheet cũ (Array<Object> phẳng)
            sheetsArray = [{
                sheetName: "Sheet1",
                data: data 
            }];
        }
        // ====================================================================

        // 2. Tạo workbook mới
        const wb = XLSX.utils.book_new();
        let sheetsAdded = 0; 

        // 3. Lặp qua mảng sheets để tạo và thêm từng sheet vào workbook
        sheetsArray.forEach((sheet, index) => {
            const sheetData = sheet.data || [];
            const sheetName = sheet.sheetName || `Sheet${index + 1}`;
            
            // Chỉ thêm sheet nếu có dữ liệu
            if (sheetData.length > 0) {
                // Tạo worksheet từ dữ liệu
                const ws = XLSX.utils.json_to_sheet(sheetData);
                
                // Tự động điều chỉnh độ rộng cột
                autoFitColumns(sheetData, ws);
                
                // Thêm sheet vào workbook
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
                sheetsAdded++;
            } else {
                console.warn(`Sheet "${sheetName}" rỗng và đã bị bỏ qua.`);
            }
        });
        
        // 4. Kiểm tra nếu workbook rỗng
        if (sheetsAdded === 0) {
            console.error(`Lỗi: Không có sheet nào được thêm vào workbook.`);
            alert(`Lỗi xuất Excel: Không có dữ liệu để tạo workbook.`);
            return;
        }

        // 5. Ghi file Excel ra buffer
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        // 6. Tạo Blob và kích hoạt tải file
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
        });

        saveAs(blob, `${fileName}.xlsx`);

    } catch (err) {
        console.error("Lỗi khi xuất Excel:", err);
        alert("Có lỗi xảy ra khi chuẩn bị file Excel.");
    }
};