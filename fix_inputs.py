import os
import glob

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Search for any <input type="month" ... />
    import re
    # We will use re.sub with a custom function to parse the value and onChange props
    
    # Actually, TeamAttendance has this EXACT block twice:
    block = """              <input
                type="month"
                value={`${new Date(selectedDate).getFullYear()}-${String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(`${e.target.value}-01`);
                  }
                }}
                className="appearance-none px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none focus:border-[#7B0099] focus:ring-1 focus:ring-[#7B0099] uppercase tracking-widest h-[34px]"
              />"""
              
    replacement = """              <MonthPicker
                monthYear={`${new Date(selectedDate).getFullYear()}-${String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}`}
                onSelectMonthYear={(val) => {
                  setSelectedDate(`${val}-01`);
                }}
                className="appearance-none flex items-center justify-between min-w-[120px] px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none focus:border-[#7B0099] focus:ring-1 focus:ring-[#7B0099] uppercase tracking-widest h-[34px]"
              />"""
    
    # Replace \n with \r\n to match windows if needed
    if block not in content and block.replace('\n', '\r\n') in content:
        block = block.replace('\n', '\r\n')
        replacement = replacement.replace('\n', '\r\n')
        
    if block in content:
        content = content.replace(block, replacement)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Replaced in", path)

fix_file("src/pages/TeamAttendance.tsx")
