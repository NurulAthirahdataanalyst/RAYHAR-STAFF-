with open('src/pages/TeamAttendance.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_render = """<TableCell>{isNoGPS ? "-" : "N/A"}</TableCell>"""
new_render = """<TableCell>{isNoGPS ? "-" : (distance !== null ? `${Math.round(distance)} m` : "N/A")}</TableCell>"""

if old_render in text:
    text = text.replace(old_render, new_render)
    with open('src/pages/TeamAttendance.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Updated render!')
else:
    print('Render block not found')
