import re

files = [
    "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx",
    "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Settings.tsx"
]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the MapContainer and change zoom level
    content = content.replace('zoom={10}', 'zoom={16}')

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Updated zoom level to 16")
