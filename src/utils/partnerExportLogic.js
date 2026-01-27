// src/utils/partnerExportLogic.js

import { exportToExcel } from './exportUtils.js';

/**
 * Hàm định dạng tiền tệ cho Excel (Dạng số nguyên để Sếp có thể Sum được)
 */
const formatNumber = (val) => Math.round(val || 0);

/**
 * Hàm tính toán và chuẩn bị dữ liệu xuất Excel cho Báo cáo Đối tác
 * LOGIC "CHỐNG CÃI":
 * 1. Tính ngược ra Doanh thu Gộp (Gross) từ Net + Trả lại.
 * 2. Tách Sheet "Cảnh báo" riêng để highlight vấn đề.
 * 3. Thêm Sheet "Giải thích" để đối chiếu công thức.
 * * @param {Array} rawData - Dữ liệu gốc từ API (đã filter ở frontend)
 * @param {String} type - Loại báo cáo ('by_supplier', 'top_customers', 'by_customer_group')
 * @param {Object} filters - Bộ lọc thời gian (để ghi vào file)
 * @param {String} groupName - Tên nhóm đang lọc (nếu có)
 */
export const handlePartnerExport = async (rawData, type, filters, groupName = null) => {
    if (!rawData || rawData.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }

    // --- BƯỚC 1: CHẾ BIẾN DỮ LIỆU (DATA PROCESSING) ---
    // Mục tiêu: Tạo ra các cột "Gộp", "Trả lại", "Thuần" khớp nhau tuyệt đối
    const processedList = rawData.map((item, index) => {
        // 1. Lấy số liệu gốc (đảm bảo không NaN)
        const netRevenue = parseFloat(item.net_revenue || item.total_revenue || 0);
        const profit = parseFloat(item.total_profit || 0);
        
        // Return Value trong DB thường là số ÂM. Ta lấy trị tuyệt đối để hiển thị Excel cho dễ nhìn.
        const returnValueAbs = Math.abs(parseFloat(item.return_value || 0)); 
        
        // 2. Tính ngược Doanh thu Gộp (Gross)
        // Công thức: Net = Gross - Returns  =>  Gross = Net + Returns
        const grossRevenue = parseFloat(item.gross_revenue || (netRevenue + returnValueAbs));

        // 3. Tính lại tỷ lệ % (Re-calculate để chính xác đến từng số lẻ)
        let returnRate = 0;
        if (grossRevenue > 0) {
            returnRate = (returnValueAbs / grossRevenue) * 100;
        }

        let margin = 0;
        if (netRevenue > 0) {
            margin = (profit / netRevenue) * 100;
        }

        // 4. Gắn cờ Cảnh báo (Risk Tagging)
        let riskLabel = "Bình thường";
        if (returnRate > 5) riskLabel = "⚠️ TRẢ HÀNG CAO";
        else if (profit < 0) riskLabel = "⚠️ LỖ VỐN";
        else if (type === 'top_customers' && item.segment_code === 'AT_RISK') riskLabel = "⚠️ SẮP RỜI BỎ";

        // 5. Chuẩn hóa tên cột theo loại báo cáo
        let code = "", name = "", category = "";
        
        if (type === 'by_supplier') {
            code = item.supplier_code;
            name = item.supplier_name;
            category = "Nhà Cung Cấp";
        } else if (type === 'top_customers') {
            code = item.ma_khncc;
            name = item.ten_khncc;
            category = item.segment_name || "Khách hàng";
        } else {
            code = item.group_code;
            name = item.group_name;
            category = "Nhóm/Vùng";
        }

        return {
            stt: index + 1,
            code,
            name,
            category, // Phân hạng hoặc Nhóm
            orderCount: item.order_count || 0,
            quantity: item.total_quantity || 0,
            
            // Cụm tài chính (Quan trọng)
            grossRevenue: formatNumber(grossRevenue),
            returnValue: formatNumber(returnValueAbs), // Xuất số dương
            netRevenue: formatNumber(netRevenue),
            cost: formatNumber(netRevenue - profit), // Giá vốn = Net - Lãi
            profit: formatNumber(profit),
            
            // Chỉ số hiệu quả
            margin: margin.toFixed(2) + '%',
            returnRate: returnRate.toFixed(2) + '%',
            
            // Cột chốt hạ
            riskLabel
        };
    });

    // --- BƯỚC 2: TÁCH SHEET "CẢNH BÁO RỦI RO" (THE BLACKLIST) ---
    // Chỉ lấy những dòng có vấn đề để Sếp xem trước
    const riskList = processedList.filter(item => 
        item.riskLabel.startsWith("⚠️")
    ).sort((a,b) => parseFloat(b.returnRate) - parseFloat(a.returnRate)); // Sắp xếp theo mức độ trả hàng giảm dần


    // --- BƯỚC 3: ĐỊNH NGHĨA CẤU TRÚC EXCEL (MAPPING) ---
    const mapToExcelRow = (item) => ({
        "STT": item.stt,
        "Mã Đối Tượng": item.code,
        "Tên Đối Tượng": item.name,
        "Phân Loại/Nhóm": item.category,
        
        "Số Đơn": item.orderCount,
        "Số Lượng": item.quantity,
        
        // Cụm này Sếp cộng trừ là khớp ngay
        "Doanh Thu Gộp (A)": item.grossRevenue,
        "Giá Trị Trả Lại (B)": item.returnValue,
        "Doanh Thu Thuần (C=A-B)": item.netRevenue,
        
        "Giá Vốn (D)": item.cost,
        "Lợi Nhuận (E=C-D)": item.profit,
        
        "% Margin": item.margin,
        "% Trả Hàng": item.returnRate,
        "Đánh Giá Rủi Ro": item.riskLabel
    });

    // --- BƯỚC 4: TẠO SHEET "GIẢI THÍCH" (GLOSSARY) ---
    const glossaryData = [
        { "Mục": "THÔNG TIN BÁO CÁO", "Nội dung": "" },
        { "Mục": "Người xuất", "Nội dung": "Hệ thống QuocVietCRM" },
        { "Mục": "Ngày xuất", "Nội dung": new Date().toLocaleString('vi-VN') },
        { "Mục": "Khoảng thời gian", "Nội dung": `Từ ${filters.date_from} đến ${filters.date_to}` },
        { "Mục": "Phạm vi lọc", "Nội dung": groupName ? `Đang lọc theo: ${groupName}` : "Toàn bộ dữ liệu" },
        { "Mục": "", "Nội dung": "" },
        
        { "Mục": "CÔNG THỨC & NGUYÊN TẮC", "Nội dung": "---" },
        { "Mục": "1. Doanh Thu Gộp (A)", "Nội dung": "Tổng giá trị các đơn bán hàng/nhập hàng thành công (Chưa trừ trả lại)." },
        { "Mục": "2. Giá Trị Trả Lại (B)", "Nội dung": "Tổng giá trị các đơn hoàn/trả/hủy (Được thể hiện là số dương để dễ trừ)." },
        { "Mục": "3. Doanh Thu Thuần (C)", "Nội dung": "Bằng (A) trừ đi (B). Đây là con số thực tế ghi nhận doanh số." },
        { "Mục": "4. Lợi Nhuận (E)", "Nội dung": "Bằng Doanh thu thuần (C) trừ đi Giá vốn đích danh (D) của từng sản phẩm trong đơn." },
        { "Mục": "5. % Trả Hàng", "Nội dung": "Tỷ lệ hàng bị trả lại so với tổng bán ra = (B / A) * 100." },
        { "Mục": "", "Nội dung": "" },
        
        { "Mục": "CẢNH BÁO RỦI RO", "Nội dung": "---" },
        { "Mục": "⚠️ TRẢ HÀNG CAO", "Nội dung": "Đối tượng có tỷ lệ trả hàng > 5%. Cần kiểm tra chất lượng sản phẩm hoặc hành vi khách hàng." },
        { "Mục": "⚠️ LỖ VỐN", "Nội dung": "Lợi nhuận âm. Giá bán thấp hơn giá vốn hoặc bị trả hàng quá nhiều." }
    ];

    // --- BƯỚC 5: ĐÓNG GÓI PAYLOAD ---
    const exportPayload = [
        // Sheet 1: Tổng hợp tất cả
        { 
            sheetName: "Bang_Tong_Hop_Chi_Tiet", 
            data: processedList.map(mapToExcelRow) 
        },
        // Sheet 2: Danh sách đen (Chỉ xuất hiện nếu có rủi ro)
        { 
            sheetName: "DANH_SACH_CANH_BAO", 
            data: riskList.length > 0 ? riskList.map(mapToExcelRow) : [{ "Thông báo": "Tuyệt vời! Không có đối tượng nào vi phạm ngưỡng rủi ro." }]
        },
        // Sheet 3: Giải thích
        { 
            sheetName: "Giai_Thich_Cong_Thuc", 
            data: glossaryData 
        }
    ];

    // Tạo tên file chuẩn
    let fileName = 'Bao_Cao_Doi_Tac';
    if (type === 'by_supplier') fileName = 'Bao_Cao_Hieu_Qua_NCC';
    else if (type === 'top_customers') fileName = 'Bao_Cao_Phan_Khuc_Khach_Hang';
    
    if (groupName) fileName += `_${groupName.replace(/\s/g, '_')}`; // Append tên nhóm nếu có
    
    // Gọi hàm xuất Utils (File exportUtils.js không cần sửa)
    await exportToExcel(exportPayload, fileName);
};