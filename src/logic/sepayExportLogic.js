// src/logic/sepayExportLogic.js
import { exportToExcelWithStyles } from '../utils/excelExporter';
import { dateUtils } from '../utils/dateUtils';

/**
 * Xử lý xuất báo cáo SePay (Giao dịch & Số dư)
 * @param {Array} transactions List giao dịch từ API
 * @param {Object} bankStats Thông tin số dư hiện tại (Optional)
 * @param {Object} filters Bộ lọc ngày tháng (để ghi vào file)
 */
export const handleSepayExport = async (transactions, bankStats, filters) => {
    if (!transactions || transactions.length === 0) {
        alert("Không có dữ liệu giao dịch để xuất!");
        return;
    }

    // --- SHEET 1: CHI TIẾT GIAO DỊCH ---
    const mappedData = transactions.map((item, index) => {
        // Logic phân loại Tiền vào/ra để hiển thị đẹp
        const amount = item.amount_in > 0 ? item.amount_in : (0 - item.amount_out);
        
        return {
            "STT": index + 1,
            "Mã Giao Dịch (SePay)": item.sepay_id,
            "Ngày Giao Dịch": item.transaction_date, // ExcelJS tự hiểu string date
            "Ngân Hàng": item.bank_account_id, // Hoặc map với tên bank nếu có
            "Số Tiền (+/-)": amount, // Số âm sẽ tự được tô đỏ nhờ excelExporter
            "Nội Dung CK": item.content,
            "Mã Đơn Hàng": item.qr_request ? item.qr_request.order_code : '---',
            "Trạng Thái": item.qr_request ? '✅ Đã khớp' : '⚠️ Chưa khớp',
        };
    });

    // --- SHEET 2: TỔNG HỢP SỐ DƯ (Nếu có) ---
    let summaryData = [];
    if (bankStats && Array.isArray(bankStats)) {
        summaryData = bankStats.map(bank => ({
            "Ngân Hàng": bank.bank_name,
            "Số Tài Khoản": bank.account_number,
            "Chủ Tài Khoản": bank.account_owner,
            "Số Dư Hiện Tại (CRM)": parseFloat(bank.balance),
            "Trạng Thái": bank.is_active ? 'Hoạt động' : 'Tạm khóa'
        }));
    }

    // --- SHEET 3: THÔNG TIN BÁO CÁO ---
    const metaData = [
        { "Mục": "BÁO CÁO", "Nội dung": "ĐỐI SOÁT GIAO DỊCH NGÂN HÀNG (SEPAY)" },
        { "Mục": "Ngày xuất", "Nội dung": new Date().toLocaleString('vi-VN') },
        { "Mục": "Phạm vi ngày", "Nội dung": `Từ ${filters.date_from} đến ${filters.date_to}` },
        { "Mục": "", "Nội dung": "" },
        { "Mục": "Ghi chú", "Nội dung": "Số tiền màu đỏ thể hiện khoản chi (Tiền ra)." }
    ];

    // Đóng gói Payload
    const exportPayload = [
        { sheetName: "Lich_Su_Giao_Dich", data: mappedData },
        { sheetName: "Thong_Tin_Bao_Cao", data: metaData }
    ];

    // Nếu có thông tin số dư thì thêm sheet số dư
    if (summaryData.length > 0) {
        exportPayload.splice(1, 0, { sheetName: "Tong_Hop_So_Du", data: summaryData });
    }

    // Tên file: SePay_Report_YYYY-MM-DD
    const fileName = `SePay_Report_${filters.date_to}`;

    // Gọi hàm xuất có Style
    await exportToExcelWithStyles(exportPayload, fileName);
};