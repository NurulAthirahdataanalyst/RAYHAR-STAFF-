import codecs
import re

standard_card = "border border-slate-100 dark:border-slate-700 bg-white dark:bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px]"

files = [
    'src/pages/LeaveManagement.tsx',
    'src/pages/outstation/OutstationAssignment.tsx',
    'src/pages/CompanyLeaveCalendar.tsx',
    'src/pages/outstation/OutstationCalendar.tsx'
]

for file_path in files:
    try:
        with codecs.open(file_path, 'r', 'utf-8') as f:
            content = f.read()
            
        orig = content
        
        # 1. LeaveManagement.tsx
        # The Leave Balance cards
        content = re.sub(
            r'className=\{g-card border border-border shadow-sm rounded-lg overflow-hidden border-l-4 flex flex-col justify-between \$\{card\.borderColor\} min-h-\[160px\] transform transition-all duration-300 hover:shadow-md\}',
            r'className={' + standard_card + r' overflow-hidden border-l-4 flex flex-col justify-between  min-h-[160px] transform transition-all duration-300 hover:shadow-lg}',
            content
        )
        
        # 2. OutstationAssignment.tsx
        # The main wrapper is a Card
        content = re.sub(
            r'<Card className="border border-gray-200 dark:border-slate-800 dark:border-gray-500/30/80 shadow-sm overflow-hidden">',
            r'<Card className="' + standard_card + r' overflow-hidden">',
            content
        )
        
        # 3. CompanyLeaveCalendar.tsx
        # Let's find the main wrapper
        content = re.sub(
            r'className="bg-card border border-border shadow-sm rounded-lg overflow-hidden"',
            r'className="' + standard_card + r' overflow-hidden"',
            content
        )
        
        # 4. OutstationCalendar.tsx
        content = re.sub(
            r'className="bg-card border border-border shadow-sm rounded-lg p-6 mb-6"',
            r'className="' + standard_card + r' p-6 mb-6"',
            content
        )
        content = re.sub(
            r'className="bg-card border border-border shadow-sm rounded-lg p-4 sm:p-6 mb-6 overflow-hidden"',
            r'className="' + standard_card + r' p-4 sm:p-6 mb-6 overflow-hidden"',
            content
        )

        if content != orig:
            with codecs.open(file_path, 'w', 'utf-8') as f:
                f.write(content)
            print(f"Updated {file_path}")
        else:
            print(f"No match found in {file_path} (maybe already updated or string differs)")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

