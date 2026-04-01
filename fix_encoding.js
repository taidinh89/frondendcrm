const fs = require('fs');
const path = require('path');

const mapping = {
    "áº£": "ả", "á»—": "ỗ", "Ã´": "ô", "Ä‘": "đ", "Æ°": "ư", "á»£": "ợ",
    "á»¯": "ữ", "Ã ": "à", "Ã¡": "á", "Ã¢": "â", "Ã£": "ã", "Ã¨": "è",
    "Ã©": "é", "Ãª": "ê", "Ã¬": "ì", "Ã­": "í", "Ã²": "ò", "Ã³": "ó",
    "Ãµ": "õ", "Ã¹": "ù", "Ãº": "ú", "Ã½": "ý", "Äƒ": "ă", "Ä ": "Đ",
    "áº¡": "ạ", "áº¥": "ấ", "áº§": "ầ", "áº©": "ẩ", "áº«": "ẫ", "áº­": "ậ",
    "áº¯": "ắ", "áº±": "ằ", "áº³": "ẳ", "áºµ": "ẵ", "áº·": "ặ", "áº¹": "ẹ",
    "áº»": "ẻ", "áº½": "ẽ", "áº¿": "ế", "á» ": "ề", "á»ƒ": "ể", "á»…": "ễ",
    "á»‡": "ệ", "á»‰": "ỉ", "á»‹": "ị", "á» ": "ọ", "á» ": "ỏ", "á»‘": "ố",
    "á»“": "ồ", "á»•": "ổ", "á»—": "ỗ", "á»™": "ộ", "á»›": "ớ", "á» ": "ờ",
    "á»Ÿ": "ở", "á»¡": "ỡ", "á»£": "ợ", "á»¥": "ụ", "á»§": "ủ", "á»©": "ứ",
    "á»«": "ừ", "á»­": "ử", "á»¯": "ữ", "á»±": "ự", "á»³": "ỳ", "á»µ": "ỵ",
    "á»·": "ỷ", "á»¹": "ỹ"
};

function fixText(text) {
    let result = text;

    // Try encoding string as binary and decoding as UTF-8
    try {
        const better = decodeURIComponent(escape(text));
        // If it changed, use it, as it's the exact conversion
        if (better !== text) {
            return better;
        }
    } catch (e) { }

    // Fallback to manual replacement if decodeURIComponent(escape(text)) fails for some characters
    for (const [wrong, right] of Object.entries(mapping)) {
        result = result.split(wrong).join(right);
    }
    return result;
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    let count = 0;
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            count += processDirectory(fullPath);
        } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');

            let hasError = false;
            for (const wrong of Object.keys(mapping)) {
                if (content.includes(wrong) || content.includes('_')) { // Just checking if mapping exists basically
                    if (content.includes(wrong)) {
                        hasError = true;
                        break;
                    }
                }
            }

            // try replacing
            const fixed = fixText(content);
            if (fixed !== content) {
                fs.writeFileSync(fullPath, fixed, 'utf8');
                console.log(`Fixed: ${fullPath}`);
                count++;
            }
        }
    }
    return count;
}

const count = processDirectory('src');
console.log('Fixed ' + count + ' files total.');
