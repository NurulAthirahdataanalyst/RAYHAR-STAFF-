import codecs
import re

with codecs.open('src/pages/Attendance.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Base standard card style
standard_card = "border border-slate-100 dark:border-slate-700 bg-white dark:bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px]"

# Top stats 4 cards (Lines 616, 624, 632, etc.)
content = content.replace(
    'bg-card dark:bg-card border border-border/40 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden',
    f'{standard_card} p-4 flex flex-col items-center justify-center relative overflow-hidden'
)

# Clock in card (Line 1177)
content = content.replace(
    'bg-card dark:bg-card w-full max-w-[340px] sm:max-w-md lg:flex-1 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-4 sm:p-5 md:p-6 flex flex-col items-center relative overflow-hidden border border-border lg:self-start',
    f'{standard_card} w-full max-w-[340px] sm:max-w-md lg:flex-1 hover:shadow-lg transition-shadow duration-300 p-4 sm:p-5 md:p-6 flex flex-col items-center relative overflow-hidden lg:self-start'
)

# 4 monthly breakdown cards (Line 1421+)
content = content.replace(
    'bg-card dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md hover:border-purple-300 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors p-4 flex flex-col items-center justify-center relative overflow-hidden group',
    f'{standard_card} hover:border-purple-300 dark:hover:border-purple-700 transition-colors p-4 flex flex-col items-center justify-center relative overflow-hidden group'
)

# Monthly attendance breakdown container (Line 1487)
content = content.replace(
    'bg-card dark:bg-card border border-border shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl p-5 sm:p-6 flex flex-col relative overflow-hidden min-h-[220px]',
    f'{standard_card} hover:shadow-lg transition-shadow duration-300 p-5 sm:p-6 flex flex-col relative overflow-hidden min-h-[220px]'
)

# Temporary history card (Line 1605)
content = content.replace(
    'bg-card dark:bg-card border border-border shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl p-5 sm:p-6 flex flex-col relative overflow-hidden',
    f'{standard_card} hover:shadow-lg transition-shadow duration-300 p-5 sm:p-6 flex flex-col relative overflow-hidden'
)

# Table Card (Line 1696)
content = content.replace(
    'border-border shadow-sm overflow-hidden bg-card/60 backdrop-blur-md min-h-[400px]',
    f'{standard_card} overflow-hidden backdrop-blur-md min-h-[400px]'
)


with codecs.open('src/pages/Attendance.tsx', 'w', 'utf-8') as f:
    f.write(content)

print("Updated Attendance.tsx cards")
