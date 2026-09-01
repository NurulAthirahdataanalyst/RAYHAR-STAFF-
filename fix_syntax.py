with open('src/pages/TeamAttendance.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('fetch(${API_BASE_URL}/api/branches)', 'fetch(`${API_BASE_URL}/api/branches`)')

with open('src/pages/TeamAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
