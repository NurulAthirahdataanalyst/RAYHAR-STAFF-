import re

with open('src/components/shared/MonthPicker.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''          <button
            type="button"
            className={
              className ||
              "appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-9 sm:h-10 gap-3 hover:border-[#942392]/40 min-w-[120px]"
            }
          >'''

replacement = '''          <button
            type="button"
            className={cn(
              "appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-9 sm:h-10 gap-3 hover:border-[#942392]/40 min-w-[120px]",
              className
            )}
          >'''

content = content.replace(target, replacement)

with open('src/components/shared/MonthPicker.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
