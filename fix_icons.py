import re

with open('src/components/shared/StaffProfileDialog.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add icons to imports if needed
if 'RefreshCw' not in content:
    content = content.replace('Printer\n} from "lucide-react";', 'Printer,\n    RefreshCw,\n    Wallet,\n    Stethoscope\n} from "lucide-react";')

# Replace Replacement Leave header
content = content.replace(
    '<p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1">Replacement Leave</p>',
    '<p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span><RefreshCw className="w-3 h-3 text-muted-foreground" />Replacement Leave</p>'
)

# Replace Unpaid Leave header
content = content.replace(
    '<p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1">Unpaid Leave</p>',
    '<p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span><Wallet className="w-3 h-3 text-muted-foreground" />Unpaid Leave</p>'
)

# Replace Medical Leave header
content = content.replace(
    '<p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1">Medical Leave (Sick Leave)</p>',
    '<p className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span><Stethoscope className="w-3 h-3 text-muted-foreground" />Medical Leave (Sick Leave)</p>'
)

with open('src/components/shared/StaffProfileDialog.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done StaffProfileDialog")