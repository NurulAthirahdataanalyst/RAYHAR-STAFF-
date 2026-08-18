import os

files = [
    r"src\pages\reports\LeaveReports.tsx",
    r"src\pages\reports\AttendanceReports.tsx"
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The block to find:
    import re
    # We will just find from `<div className="inline-flex items-center bg-slate-100...`
    # up to the end of the `</div>` that closes it.
    
    start_idx = content.find('<div className="inline-flex items-center bg-slate-100')
    if start_idx == -1:
        print(f"Start not found in {path}")
        continue
        
    end_idx = content.find('</div>', start_idx)
    end_idx = content.find('</div>', end_idx + 1)
    end_idx = content.find('</div>', end_idx + 1)
    end_idx = content.find('</div>', end_idx + 1) + 6
    
    old_block = content[start_idx:end_idx]
    
    new_block = """<div className="flex items-center gap-4 sm:gap-6 border-b border-gray-200 dark:border-slate-800 w-full sm:w-auto">
              <button
                onClick={() => setViewType("day")}
                className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${
                  viewType === "day"
                    ? "text-[#7B0099] border-[#7B0099]"
                    : "text-gray-500 hover:text-yellow-500 border-transparent hover:border-yellow-500"
                }`}
              >
                DAY
              </button>
              <button
                onClick={() => setViewType("month")}
                className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${
                  viewType === "month"
                    ? "text-[#7B0099] border-[#7B0099]"
                    : "text-gray-500 hover:text-yellow-500 border-transparent hover:border-yellow-500"
                }`}
              >
                MONTH
              </button>
              <button
                onClick={() => setViewType("year")}
                className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${
                  viewType === "year"
                    ? "text-[#7B0099] border-[#7B0099]"
                    : "text-gray-500 hover:text-yellow-500 border-transparent hover:border-yellow-500"
                }`}
              >
                YEAR
              </button>
            </div>"""
    
    content = content[:start_idx] + new_block + content[end_idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced toggles in", path)
