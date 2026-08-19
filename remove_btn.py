import re

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Try to find the exact index or use dotall regex
pattern = r'\{activeSession && \(\s*<div className="absolute -bottom-12 w-full flex justify-center">\s*<Button\s*type="button"\s*onClick=\{handleUpdateLocation\}\s*disabled=\{outstationLocationLoading\}\s*className="[^"]+"\s*>\s*\{outstationLocationLoading \? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />\}\s*Update My Location\s*</Button>\s*</div>\s*\)\}'
content = re.sub(pattern, '', content)

with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
