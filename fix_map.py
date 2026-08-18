import re

files = [
    "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx",
    "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Settings.tsx"
]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix MapContainer zIndex
    content = content.replace('style={{ height: "100%", width: "100%", zIndex: 1 }}', 'style={{ height: "100%", width: "100%" }}')
    
    # Fix Save button cut off
    content = content.replace('className="flex-1 h-11 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/90 text-[10px] font-black uppercase tracking-wider shadow-md whitespace-nowrap">Save Branch Location</Button>', 'className="flex-1 h-11 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/90 text-[10px] font-black uppercase tracking-wider shadow-md">Save</Button>')

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Fixed map z-index and save button")
