import re

with open("src/pages/outstation/MyOutstation.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove the old Top Bar
top_bar_pattern = r'\{\/\* Top Bar with Tabs and Export \*\/\}\s*<div className="mb-4">.*?</div>\s*</div>'
content = re.sub(top_bar_pattern, '', content, flags=re.DOTALL)

# Let's verify we matched top_bar_pattern
if 'Top Bar with Tabs and Export' in content:
    print("Warning: top bar not removed")
else:
    print("Top bar removed")

# 2. Re-insert the tabs inside the Card
card_pattern = r'\{\/\* Main List Card \*\/\}\s*<Card className="border-border/60 bg-card/77 backdrop-blur-sm shadow-sm overflow-hidden">\s*\{\/\* Controls \*\/\}\s*<div className="p-4 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">'

new_tabs_html = r'''{/* Main List Card */}
        <Card className="border-border/60 bg-card/77 backdrop-blur-sm shadow-sm overflow-hidden">
          {/* Tabs & Export inside Card Header */}
          <div className="px-4 sm:px-6 pt-4 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
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
              <Button variant="outline" className="h-8 text-xs font-bold gap-2 bg-white/50 dark:bg-black/20">
                <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 border-b border-border/50 bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">'''

content = content.replace(
    '{/* Main List Card */}\n        <Card className="border-border/60 bg-card/77 backdrop-blur-sm shadow-sm overflow-hidden">\n          {/* Controls */}\n          <div className="p-4 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">',
    new_tabs_html
)

with open("src/pages/outstation/MyOutstation.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("MyOutstation done")
