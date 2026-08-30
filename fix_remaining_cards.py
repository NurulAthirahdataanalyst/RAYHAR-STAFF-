import codecs
import re

standard_card = "border border-slate-100 dark:border-slate-700 bg-white dark:bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px]"

files = [
    'src/pages/LeaveOverview.tsx',
    'src/pages/CompanyLeaveCalendar.tsx',
    'src/pages/outstation/OutstationCalendar.tsx',
    'src/pages/LeaveManagement.tsx'
]

for file_path in files:
    try:
        with codecs.open(file_path, 'r', 'utf-8') as f:
            content = f.read()
            
        orig = content
        
        # 1. LeaveOverview.tsx
        # The Leave Balance cards
        content = re.sub(
            r'className="relative overflow-hidden border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 border-l-\[\#7B0099\] bg-white/90 dark:bg-card/80 backdrop-blur-md rounded-xl',
            r'className="relative overflow-hidden ' + standard_card + r' border-l-4 border-l-[#7B0099]',
            content
        )
        content = re.sub(
            r'className="bg-card border border-border shadow-sm rounded-lg overflow-hidden"',
            r'className="' + standard_card + r' overflow-hidden"',
            content
        )

        # 2. CompanyLeaveCalendar.tsx
        content = re.sub(
            r'className="max-w-md p-0 overflow-hidden border-none shadow-2xl bg-card rounded-2xl',
            r'className="max-w-md p-0 overflow-hidden border-none shadow-2xl bg-card rounded-[24px]',
            content
        )
        # Any other bg-card in CompanyLeaveCalendar? Wait, what about the main table container?
        content = re.sub(
            r'className="border-none shadow-\[0_20px_50px_rgba\(0,0,0,0.04\)\] dark:shadow-\[0_20px_50px_rgba\(0,0,0,0.2\)\] bg-card/80 backdrop-blur-md rounded-\[32px\] overflow-hidden"',
            r'className="' + standard_card + r' backdrop-blur-md overflow-hidden"',
            content
        )
        content = re.sub(
            r'className="bg-card border border-slate-200 dark:border-slate-800/80 shadow-sm rounded-lg overflow-hidden"',
            r'className="' + standard_card + r' overflow-hidden"',
            content
        )
        
        # 3. OutstationCalendar.tsx
        content = re.sub(
            r'<Card className="border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden rounded-2xl">',
            r'<Card className="' + standard_card + r' overflow-hidden">',
            content
        )

        # 4. LeaveManagement.tsx
        content = re.sub(
            r'className="border-none shadow-\[0_20px_50px_rgba\(0,0,0,0.04\)\] dark:shadow-\[0_20px_50px_rgba\(0,0,0,0.2\)\] bg-card/80 backdrop-blur-md rounded-\[32px\] overflow-hidden"',
            r'className="' + standard_card + r' backdrop-blur-md overflow-hidden"',
            content
        )

        if content != orig:
            with codecs.open(file_path, 'w', 'utf-8') as f:
                f.write(content)
            print(f"Updated {file_path}")
        else:
            print(f"No match found in {file_path}")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

