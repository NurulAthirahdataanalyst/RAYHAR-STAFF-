import re

with open("src/pages/outstation/MyOutstation.tsx", "r", encoding="utf-8") as f:
    content = f.read()

card_pattern = r'\{\/\* Main Content Card \*\/\}\s*<Card className="border-none shadow-\[0_20px_50px_rgba\(0,0,0,0\.04\)\] dark:shadow-\[0_20px_50px_rgba\(0,0,0,0\.2\)\] bg-card/80 backdrop-blur-md rounded-\[24px\] sm:rounded-\[32px\] overflow-hidden">\s*\{\/\* Filters Row \*\/\}\s*<div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50">'

new_tabs_html = r'''{/* Main Content Card */}
      <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] overflow-hidden">
        
        {/* Tabs & Export inside Card Header */}
        <div className="px-6 pt-6 border-b border-gray-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex items-center gap-6 w-full sm:w-auto overflow-x-auto scrollbar-none">
            {(["Upcoming", "Active", "Completed", "Cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setTab(s)}
                className={`text-sm font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] whitespace-nowrap ${
                  tab === s 
                    ? (s === "Upcoming" ? "text-amber-500 border-amber-500" :
                       s === "Active" ? "text-pink-500 border-pink-500" :
                       s === "Completed" ? "text-emerald-500 border-emerald-500" :
                       "text-red-500 border-red-500")
                    : "text-muted-foreground border-transparent hover:text-yellow-500 hover:border-yellow-500"
                }`}
              >
                {s}
                {counts[s] > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                    tab === s 
                      ? (s === "Upcoming" ? "bg-amber-500 text-white" :
                         s === "Active" ? "bg-pink-500 text-white" :
                         s === "Completed" ? "bg-emerald-500 text-white" :
                         "bg-red-500 text-white")
                      : "bg-muted-foreground/20 text-muted-foreground transition-colors group-hover:bg-yellow-500 group-hover:text-white"
                  }`}>
                    {counts[s]}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="pb-3 flex gap-2">
            <ExportDropdown onExportCSV={() => exportToCSV(filtered, `My_Outstations_${tab}`)} />
          </div>
        </div>

        {/* Filters Row */}
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50">'''

new_content = re.sub(card_pattern, new_tabs_html, content, flags=re.DOTALL)

with open("src/pages/outstation/MyOutstation.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("MyOutstation tabs inserted")
