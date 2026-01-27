// src/utils/salesExportLogic.js

import { exportToExcel } from './exportUtils.js';

const formatNumber = (val) => Math.round(val || 0);

/**
 * Logic xuất Excel cho trang Phân tích Kinh doanh (Sản phẩm, Đơn hàng, Nhân viên)
 * ĐIỂM NHẤN:
 * 1. Tự động tách Sheet "Đơn Trả Lại" khi xuất danh sách Đơn hàng.
 * 2. Tự động tách Sheet "Sản phẩm Rủi ro" khi xuất danh sách Sản phẩm.
 */
export const handleSalesExport = async (rawData, type, filters) => {
    if (!rawData || rawData.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }

    let mainSheetName = "Du_Lieu_Chi_Tiet";
    let warningSheetName = ""; // Tên sheet cảnh báo (nếu có)
    let warningList = [];      // Dữ liệu cảnh báo
    let fileName = "Bao_Cao_Kinh_Doanh";

    // --- BƯỚC 1: MAPPING DỮ LIỆU THEO TỪNG LOẠI ---
    const mappedData = rawData.map((item, index) => {
        const base = {
            "STT": index + 1,
        };

        // A. NẾU LÀ SẢN PHẨM
        if (type.includes('products')) {
            fileName = "Bao_Cao_San_Pham";
            mainSheetName = "Danh_Sach_San_Pham";
            warningSheetName = "SP_Bi_Tra_Nhieu";

            base["Mã Sản Phẩm"] = item.ma_mat_hang;
            base["Tên Sản Phẩm"] = item.ten_mat_hang;
            base["Thương Hiệu"] = item.brand_code;
            
            base["SL Bán (Net)"] = item.net_quantity || item.total_quantity;
            base["Giá Vốn BQ"] = formatNumber(item.total_cost / (item.net_quantity || 1)); // Ước tính
            
            base["Doanh Thu Gộp"] = formatNumber(item.gross_revenue);
            base["Giá Trị Trả Lại"] = formatNumber(Math.abs(item.return_value || 0));
            base["Doanh Thu Thuần"] = formatNumber(item.net_revenue || item.total_revenue);
            base["Lợi Nhuận"] = formatNumber(item.total_profit);
            
            base["% Margin"] = (item.profit_margin || 0) + '%';
            
            // Tính lại % Trả hàng (Frontend tính để đảm bảo real-time)
            let returnRate = 0;
            if (item.gross_revenue > 0) {
                returnRate = (Math.abs(item.return_value || 0) / item.gross_revenue) * 100;
            }
            base["% Trả Hàng"] = returnRate.toFixed(2) + '%';

            // Logic lọc cảnh báo: Trả > 5% và Doanh số > 1tr (để tránh rác)
            if (returnRate > 5 && item.gross_revenue > 1000000) {
                warningList.push(base);
            }
        } 
        // B. NẾU LÀ ĐƠN HÀNG (QUAN TRỌNG NHẤT)
        else if (type.includes('Order')) {
            fileName = "Bao_Cao_Don_Hang";
            mainSheetName = "Danh_Sach_Don_Hang";
            warningSheetName = "Chi_Tiet_Don_Tra_Lai"; // <-- Sheet bạn cần đây

            base["Số Phiếu"] = item.so_phieu;
            base["Ngày"] = item.ngay; // YYYY-MM-DD
            base["Khách Hàng"] = item.ten_khncc;
            
            base["Doanh Thu Thuần"] = formatNumber(item.net_revenue || item.total_revenue);
            base["Giá Vốn"] = formatNumber(item.total_cost);
            base["Lợi Nhuận"] = formatNumber(item.total_profit);
            
            // Logic lọc đơn trả lại:
            // Nếu Doanh thu thuần < 0 HOẶC Lợi nhuận < 0 (thường là đơn trả hàng hoặc giảm giá sâu)
            if ((item.net_revenue || 0) < 0 || (item.total_profit || 0) < 0) {
                base["Ghi chú"] = "ĐƠN TRẢ / ĐIỀU CHỈNH GIẢM";
                warningList.push(base);
            }
        }
        // C. NẾU LÀ NHÂN VIÊN / KHÁCH HÀNG
        else {
            fileName = type.includes('employee') ? "Bao_Cao_Nhan_Vien" : "Bao_Cao_Khach_Hang";
            base["Mã/Tên"] = item.nguoi_phu_trach || item.ten_khncc;
            base["Số Đơn"] = item.order_count;
            base["Doanh Thu"] = formatNumber(item.net_revenue || item.total_revenue);
            base["Lợi Nhuận"] = formatNumber(item.total_profit);
        }

        return base;
    });

    // --- BƯỚC 2: CHUẨN BỊ PAYLOAD ---
    const exportPayload = [
        { sheetName: mainSheetName, data: mappedData }
    ];

    // Nếu có danh sách cảnh báo (Đơn trả lại / SP lỗi), thêm Sheet riêng
    if (warningList.length > 0) {
        exportPayload.push({
            sheetName: warningSheetName,
            data: warningList
        });
    }

    // --- BƯỚC 3: SHEET GIẢI THÍCH ---
    const glossaryData = [
        { "Mục": "THÔNG TIN", "Nội dung": `Dữ liệu từ ${filters.date_from} đến ${filters.date_to}` },
        { "Mục": "", "Nội dung": "" },
        { "Mục": "LƯU Ý QUAN TRỌNG", "Nội dung": "---" },
        { "Mục": "Sheet 'Chi_Tiet_Don_Tra_Lai'", "Nội dung": "Liệt kê các phiếu có giá trị âm (Khách trả hàng) hoặc lợi nhuận âm." },
        { "Mục": "Sheet 'SP_Bi_Tra_Nhieu'", "Nội dung": "Liệt kê các sản phẩm có tỷ lệ hoàn hàng > 5% (Cần xem xét chất lượng)." },
    ];
    exportPayload.push({ sheetName: "Huong_Dan_Doc_Bao_Cao", data: glossaryData });

    // Xuất file
    await exportToExcel(exportPayload, fileName);
};