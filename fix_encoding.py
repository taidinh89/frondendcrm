import sys

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        fixed = content.encode('windows-1252').decode('utf-8')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f"Fixed {filepath}")
    except Exception as e:
        print(f"Failed to fix {filepath}: {e}")

fix_file(r"f:\project\frontend\src\components\Product\ProductMobileDetailV3.jsx")
fix_file(r"f:\project\frontend\src\archive\components\ProductMobileDetail.jsx")
