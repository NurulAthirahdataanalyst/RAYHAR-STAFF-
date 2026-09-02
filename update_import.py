with open('src/pages/outstation/OutstationAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'import { YearPopover } from "@/components/shared/YearPopover";',
    'import { MonthPicker } from "@/components/shared/MonthPicker";'
)

with open('src/pages/outstation/OutstationAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)