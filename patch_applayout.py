import re

file_path = r'C:\Users\HP\ATTENDANCE_SYSTEM\src\components\layout\AppLayout.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the header structure
old_header = '''<header className="hidden lg:flex sticky top-0 z-30 w-full bg-gradient-to-r from-[#800A7A] via-[#7B0099] to-[#3d0052] py-2.5 px-3 items-center justify-between shadow-md relative overflow-hidden border-b border-[#7B0099]/15">
            <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
            
            <div className="flex items-center gap-3 relative z-10 w-full justify-end">
              <div className="flex items-center gap-4 relative z-10 ml-auto">'''

new_header = '''<header className="hidden lg:flex sticky top-0 z-30 w-full bg-gradient-to-r from-[#800A7A] via-[#7B0099] to-[#3d0052] py-2.5 px-3 items-center justify-between shadow-md relative overflow-hidden border-b border-[#7B0099]/15">
            <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10 w-full">
              <div className="flex-1">
                {location.pathname === "/analytics" && (
                  <div className="flex items-center text-[11px] font-medium text-purple-200/70 uppercase tracking-widest pl-2">
                    <span className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate("/")}>Home</span>
                    <ChevronRight className="w-3.5 h-3.5 mx-1.5 opacity-50" />
                    <span className="hover:text-white cursor-pointer transition-colors">Analytics</span>
                    <ChevronRight className="w-3.5 h-3.5 mx-1.5 opacity-50" />
                    <span className="text-white font-bold opacity-100">Employee Analytics</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 ml-auto shrink-0">'''

if old_header in content:
    content = content.replace(old_header, new_header)
    print("Header replaced")
else:
    print("Header not found")

# 2. Hide PageHeader for /analytics
old_page_header = '''<div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3 transition-all duration-500 ease-in-out w-full">
                <PageHeader />'''

new_page_header = '''<div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3 transition-all duration-500 ease-in-out w-full">
                {location.pathname !== "/analytics" && <PageHeader />}'''

if old_page_header in content:
    content = content.replace(old_page_header, new_page_header)
    print("PageHeader replaced")
else:
    print("PageHeader not found")


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
