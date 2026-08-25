import re

with open('src/pages/outstation/OutstationDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for active outstations
content = re.sub(
    r'<span className="text-\[12px\] text-foreground dark:text-foreground font-medium">Showing \{activeNowGrouped\.length > 0 \? 1 : 0\}-\{activeNowGrouped\.length\} of \{activeNowGrouped\.length\} Active Outstations</span>',
    r'''<div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                      <span>TOTAL SHOWING {activeNowGrouped.length > 0 ? 1 : 0} TO {activeNowGrouped.length} OF {activeNowGrouped.length} ENTRIES</span>
                    </div>''',
    content
)

# Pattern for upcoming outstations
content = re.sub(
    r'<span className="text-\[12px\] text-foreground dark:text-foreground font-medium">Showing \{upcomingGrouped\.length > 0 \? 1 : 0\}-\{upcomingGrouped\.length\} of \{upcomingGrouped\.length\} Upcoming Outstations</span>',
    r'''<div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                      <span>TOTAL SHOWING {upcomingGrouped.length > 0 ? 1 : 0} TO {upcomingGrouped.length} OF {upcomingGrouped.length} ENTRIES</span>
                    </div>''',
    content
)

# Update Previous/Next buttons to ChevronLeft/Right
content = re.sub(
    r'<div className="flex items-center gap-2">\s*<Button variant="outline" size="sm"[^>]*>Previous</Button>\s*<Button variant="outline" size="sm"[^>]*>Next</Button>\s*</div>',
    r'''<div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" disabled className="h-7 px-2 text-[10px] font-bold rounded">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] sm:max-w-none scrollbar-hide">
                        <Button variant="default" size="sm" className="h-7 w-7 p-0 text-[10px] font-bold rounded bg-pink-500 text-white border-pink-500 hover:bg-pink-600">1</Button>
                      </div>
                      <Button variant="outline" size="sm" disabled className="h-7 px-2 text-[10px] font-bold rounded">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>''',
    content
)

if 'ChevronLeft' not in content:
    content = content.replace('from "lucide-react";', ', ChevronLeft, ChevronRight } from "lucide-react";')

with open('src/pages/outstation/OutstationDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated OutstationDashboard.tsx")
