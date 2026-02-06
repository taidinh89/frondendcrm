import axios from 'axios';

// ==========================================================================
// 1. CẤU HÌNH THÔNG TIN CÔNG TY (SỬA TẠI ĐÂY)
// ==========================================================================
const COMPANY_CONFIG = {
    logoPath: '/logo.png', // Logo trong thư mục public
    info: [
        { text: 'CÔNG TY TNHH CÔNG NGHỆ QUỐC VIỆT', font: { size: 16, bold: true, color: { argb: 'FF1E40AF' } }, align: 'bottom' },
        { text: '📍Số 21  Đường Nguyễn Đức Cảnh Phường, Phường Thành Vinh, Tỉnh Nghệ An', font: { size: 10, color: { argb: 'FF374151' } }, align: 'middle' },
        { text: '☎️ 0238.3.59.58.59 - 0912.22.10.11', font: { size: 10, color: { argb: 'FF374151' } }, align: 'middle' },
        { text: '🌐 www.qvc.vn | 📧 sales@qvc.vn', font: { size: 10, color: { argb: 'FF374151' } }, align: 'top' }
    ],
    signTitle: 'XÁC NHẬN CỦA QUỐC VIỆT'
};

// ==========================================================================
// 2. CẤU HÌNH KÍCH THƯỚC & STYLE
// ==========================================================================
const DIMS = {
    rowHeightImage: 60,
    logoWidth: 120,
    logoHeight: 60,
    prodImgWidth: 80,
    prodImgHeight: 60
};

const STYLES = {
    tableHead: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
    fillBlue: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } },
    border: {
        top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        right: { style: 'thin', color: { argb: 'FF9CA3AF' } }
    },
    alignCenter: { vertical: 'middle', horizontal: 'center' },
    currency: '#,##0 "₫"'
};

// ==========================================================================
// 3. HÀM TẢI ẢNH (ĐÃ FIX LỖI 404/CORS)
// ==========================================================================
const fetchImageBuffer = async (url) => {
    if (!url) return null;
    try {
        let response;
        // Ảnh nội bộ
        if (url.startsWith('/') || url.includes(window.location.origin)) {
            response = await axios.get(url, { responseType: 'arraybuffer' });
        }
        // Ảnh ngoại vi -> Qua Proxy (Đường dẫn chuẩn Laravel API v1)
        else {
            response = await axios.get('/api/v1/proxy-image', {
                params: { url: url },
                responseType: 'arraybuffer'
            });
        }
        if (response.status === 200 && response.data) return response.data;
        return null;
    } catch (error) {
        console.warn(`[Excel] ⚠️ Lỗi tải ảnh ${url}:`, error.message);
        return null;
    }
};

// ==========================================================================
// 4. HÀM XUẤT EXCEL CHÍNH
// ==========================================================================
export const exportQuotationToExcel = async (data, settings) => {
    if (!data) return;

    // Tải động thư viện
    const [ExcelJS, { saveAs }] = await Promise.all([
        import('exceljs'),
        import('file-saver')
    ]);

    console.log("=== BẮT ĐẦU XUẤT EXCEL (UPDATED) ===");

    // A. LỌC DỮ LIỆU & TẢI ẢNH
    // Kiểm tra settings: Nếu là mẫu "images" thì mới tải ảnh
    const isImages = settings.templateType === 'images';
    let itemsToExport = [...data.items];

    if (isImages) {
        const promises = itemsToExport.map(async (item) => {
            let imgUrl = item.image;
            if (!imgUrl && item.proThum) {
                imgUrl = item.proThum.startsWith('http') ? item.proThum : `https://qvc.vn/p/250_${item.proThum}`;
            }
            const buffer = await fetchImageBuffer(imgUrl);
            return { ...item, _imgBuffer: buffer };
        });
        itemsToExport = await Promise.all(promises);
    }

    const logoBuffer = await fetchImageBuffer(COMPANY_CONFIG.logoPath);

    // B. KHỞI TẠO
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo Giá', { views: [{ showGridLines: false }] });

    // C. CẤU HÌNH CỘT (Dựa trên templateType)
    const columns = [{ key: 'stt', width: 6 }]; // A

    if (isImages) {
        columns.push({ key: 'image', width: 15 }); // B
        columns.push({ key: 'name', width: 45 }); // C
    } else {
        columns.push({ key: 'name', width: 60 }); // B
    }

    columns.push({ key: 'unit', width: 10 });     // D
    columns.push({ key: 'qty', width: 10 });      // E

    // Nếu KHÔNG phải mẫu Kỹ thuật -> Hiện giá
    if (settings.templateType !== 'technical') {
        columns.push({ key: 'price', width: 16 }); // F
        columns.push({ key: 'amount', width: 20 });// G
    }

    worksheet.columns = columns;
    const lastColLetter = worksheet.getColumn(columns.length).letter;

    // D. HEADER CÔNG TY (Kiểm tra settings.showCompanyInfo)
    let currentRow = 1;

    if (settings.showCompanyInfo) {
        const logoMergeEndCol = isImages ? 'B' : 'A';
        const infoMergeStartCol = isImages ? 'C' : 'B';

        // Logo
        worksheet.mergeCells(`A1:${logoMergeEndCol}4`);
        if (logoBuffer) {
            const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
            worksheet.addImage(logoId, {
                tl: { col: 0.2, row: 0.2 },
                ext: { width: DIMS.logoWidth, height: DIMS.logoHeight },
                editAs: 'absolute'
            });
        }

        // Thông tin công ty (Loop qua mảng config)
        COMPANY_CONFIG.info.forEach((line, idx) => {
            const r = idx + 1;
            worksheet.mergeCells(`${infoMergeStartCol}${r}:${lastColLetter}${r}`);
            const cell = worksheet.getCell(`${infoMergeStartCol}${r}`);
            cell.value = line.text;
            cell.font = line.font;
            cell.alignment = { vertical: line.align, horizontal: 'right' };
        });

        // Kẻ line xanh
        const lineRow = worksheet.getRow(5);
        lineRow.height = 2;
        for (let c = 1; c <= columns.length; c++) lineRow.getCell(c).fill = STYLES.fillBlue;
        currentRow = 7;
    }

    // E. TIÊU ĐỀ PHIẾU
    worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
    const title = worksheet.getCell(`A${currentRow}`);
    title.value = settings.templateType === 'technical' ? 'BẢNG KÊ THÔNG SỐ' : 'BẢNG BÁO GIÁ';
    title.font = { name: 'Arial', size: 22, bold: true, color: { argb: 'FF111827' } };
    title.alignment = STYLES.alignCenter;
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
    const subTitle = worksheet.getCell(`A${currentRow}`);
    subTitle.value = `Số: ${data.code}  |  Ngày: ${new Date(data.date).toLocaleDateString('vi-VN')}`;
    subTitle.font = { italic: true, size: 11, color: { argb: 'FF4B5563' } };
    subTitle.alignment = STYLES.alignCenter;
    currentRow += 2;

    // F. KHÁCH HÀNG
    const valueColIndex = isImages ? 3 : 2;
    const customerFields = [
        { label: 'Kính gửi:', val: data.customer_name || 'Khách lẻ' },
        { label: 'Địa chỉ:', val: data.customer_address || '-' },
        { label: 'Điện thoại:', val: data.customer_phone || '-' }
    ];

    customerFields.forEach((field) => {
        const labelCell = worksheet.getCell(`A${currentRow}`);
        labelCell.value = field.label;
        labelCell.font = { bold: true };

        const valCell = worksheet.getRow(currentRow).getCell(valueColIndex);
        valCell.value = field.val;
        valCell.font = { bold: true, size: 11 };
        valCell.alignment = { horizontal: 'left', vertical: 'middle' };
        currentRow++;
    });
    currentRow++;

    // G. HEADER BẢNG
    const headerRow = worksheet.getRow(currentRow);
    let c = 1;
    headerRow.getCell(c++).value = 'STT';
    if (isImages) headerRow.getCell(c++).value = 'Hình ảnh';
    headerRow.getCell(c++).value = 'Tên hàng hóa / Quy cách';
    headerRow.getCell(c++).value = 'ĐVT';
    headerRow.getCell(c++).value = 'SL';
    if (settings.templateType !== 'technical') {
        headerRow.getCell(c++).value = 'Đơn giá';
        headerRow.getCell(c++).value = 'Thành tiền';
    }

    headerRow.height = 30;
    headerRow.eachCell((cell) => {
        cell.fill = STYLES.fillBlue;
        cell.font = STYLES.tableHead;
        cell.alignment = STYLES.alignCenter;
        cell.border = STYLES.border;
    });
    currentRow++;

    // H. DỮ LIỆU & ẢNH
    let totalAmount = 0;

    for (let i = 0; i < itemsToExport.length; i++) {
        const item = itemsToExport[i];
        const row = worksheet.getRow(currentRow);
        const hasImg = isImages && item._imgBuffer;

        row.height = hasImg ? DIMS.rowHeightImage : 35;

        let col = 1;
        // STT
        const cellSTT = row.getCell(col++);
        cellSTT.value = i + 1;
        cellSTT.alignment = STYLES.alignCenter;
        cellSTT.border = STYLES.border;

        // ẢNH
        if (isImages) {
            const cellImg = row.getCell(col++);
            cellImg.border = STYLES.border;
            if (hasImg) {
                const imgId = workbook.addImage({ buffer: item._imgBuffer, extension: 'png' });
                worksheet.addImage(imgId, {
                    tl: { col: col - 2 + 0.1, row: currentRow - 1 + 0.1 },
                    ext: { width: DIMS.prodImgWidth, height: DIMS.prodImgHeight },
                    editAs: 'oneCell'
                });
            }
        }

        // TÊN
        const cellName = row.getCell(col++);
        const richText = [
            { text: item.product_name || item.name || '', font: { bold: true, size: 10 } }
        ];
        if (item.product_code) richText.push({ text: `\nCode: ${item.product_code}`, font: { italic: true, size: 9, color: { argb: 'FF6B7280' } } });
        if (item.warranty) richText.push({ text: `\nBảo hành: ${item.warranty}`, font: { color: { argb: 'FF1E40AF' }, size: 9 } });
        // Kiểm tra settings.showNote trước khi in ghi chú
        if (settings.showNote && item.note) richText.push({ text: `\nGhi chú: ${item.note}`, font: { italic: true, size: 9 } });

        cellName.value = { richText: richText };
        cellName.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cellName.border = STYLES.border;

        // ĐVT & SL
        const cellUnit = row.getCell(col++);
        cellUnit.value = item.unit;
        cellUnit.alignment = STYLES.alignCenter;
        cellUnit.border = STYLES.border;

        const cellQty = row.getCell(col++);
        cellQty.value = Number(item.quantity);
        cellQty.alignment = STYLES.alignCenter;
        cellQty.font = { bold: true };
        cellQty.border = STYLES.border;

        // GIÁ (Nếu không phải Technical)
        if (settings.templateType !== 'technical') {
            const lineTotal = Number(item.quantity) * Number(item.price);
            totalAmount += lineTotal;

            const cellPrice = row.getCell(col++);
            cellPrice.value = Number(item.price);
            cellPrice.numFmt = STYLES.currency;
            cellPrice.alignment = { vertical: 'middle', horizontal: 'right' };
            cellPrice.border = STYLES.border;

            const cellAmt = row.getCell(col++);
            cellAmt.value = lineTotal;
            cellAmt.numFmt = STYLES.currency;
            cellAmt.font = { bold: true };
            cellAmt.alignment = { vertical: 'middle', horizontal: 'right' };
            cellAmt.border = STYLES.border;
        }
        currentRow++;
    }

    // I. FOOTER TỔNG TIỀN (Chỉ hiện khi không phải Technical)
    if (settings.templateType !== 'technical') {
        const startMergeCol = 'A';
        const endMergeCol = String.fromCharCode(lastColLetter.charCodeAt(0) - 1);

        worksheet.mergeCells(`${startMergeCol}${currentRow}:${endMergeCol}${currentRow}`);
        const labelTotal = worksheet.getCell(`${startMergeCol}${currentRow}`);
        labelTotal.value = 'TỔNG THANH TOÁN:';
        labelTotal.alignment = { vertical: 'middle', horizontal: 'right' };
        labelTotal.font = { bold: true, size: 11 };
        labelTotal.border = STYLES.border;

        const cellTotal = worksheet.getCell(`${lastColLetter}${currentRow}`);
        cellTotal.value = totalAmount;
        cellTotal.numFmt = STYLES.currency;
        cellTotal.font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
        cellTotal.alignment = { vertical: 'middle', horizontal: 'right' };
        cellTotal.border = STYLES.border;

        // Logic VAT
        if (settings.vatMode === 'included') {
            currentRow++;
            worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
            const vatNote = worksheet.getCell(`A${currentRow}`);
            vatNote.value = '(Giá trên đã bao gồm thuế GTGT)';
            vatNote.font = { italic: true, size: 9 };
            vatNote.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (settings.vatMode === 'excluded') {
            currentRow++;
            worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
            const vatNote = worksheet.getCell(`A${currentRow}`);
            vatNote.value = '(Giá trên chưa bao gồm thuế GTGT)';
            vatNote.font = { italic: true, size: 9, color: { argb: 'FFEF4444' } }; // Màu đỏ
            vatNote.alignment = { vertical: 'middle', horizontal: 'right' };
        }
    }

    // J. CHỮ KÝ (Kiểm tra settings.showSignatures)
    if (settings.showSignatures) {
        currentRow += 3;
        const signColStart = String.fromCharCode(lastColLetter.charCodeAt(0) - 2);
        worksheet.mergeCells(`${signColStart}${currentRow}:${lastColLetter}${currentRow}`);
        const signTitle = worksheet.getCell(`${signColStart}${currentRow}`);
        signTitle.value = COMPANY_CONFIG.signTitle;
        signTitle.alignment = STYLES.alignCenter;
        signTitle.font = { bold: true };

        currentRow++;
        worksheet.mergeCells(`${signColStart}${currentRow}:${lastColLetter}${currentRow}`);
        const signSub = worksheet.getCell(`${signColStart}${currentRow}`);
        signSub.value = '(Ký, đóng dấu)';
        signSub.alignment = STYLES.alignCenter;
        signSub.font = { italic: true, size: 9 };
    }

    // SAVE
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Bao_Gia_${data.code || 'Draft'}.xlsx`);
    console.log("=== XUẤT EXCEL THÀNH CÔNG ===");
};