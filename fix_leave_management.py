with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\LeaveManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace("localStorage.setItem('latestNoTelefon', data.phone);", "localStorage.setItem('latestNoTelefon_' + userId, data.phone);")
text = text.replace("localStorage.setItem('latestNoTelefon', dataLegacy.phone);", "localStorage.setItem('latestNoTelefon_' + userId, dataLegacy.phone);")
text = text.replace("localStorage.setItem('latestNoTelefon', formData.noTelefon.trim());", "localStorage.setItem('latestNoTelefon_' + (userId || ''), formData.noTelefon.trim());")
with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\LeaveManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
